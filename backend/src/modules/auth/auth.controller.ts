import { Request, Response } from 'express';
import passport from 'passport';
import { AuthService, AuthProvider } from './auth.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { AppError } from '../../common/errors/app-error';
import { createLogger } from '../../common/logger';

const logger = createLogger('auth-controller');

export class AuthController {
  constructor(private authService: AuthService) {}

  async signup(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.authService.signup(req.body);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        logger.error({ err: error }, 'Signup error');
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.authService.login(req.body);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        logger.error({ err: error }, 'Login error');
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const result = await this.authService.refresh(refreshToken);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        logger.error({ err: error }, 'Refresh error');
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await this.authService.getUserById(authReq.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json(user);
    } catch (error) {
      logger.error({ err: error }, 'Get profile error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await this.authService.updateProfile(authReq.userId, req.body);
      res.status(200).json(user);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        logger.error({ err: error }, 'Update profile error');
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  googleAuth(req: Request, res: Response): void {
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res);
  }

  async googleCallback(req: Request, res: Response): Promise<void> {
    passport.authenticate('google', { session: false }, async (err: Error | null, user: { userId: string } | false) => {
      if (err || !user) {
        logger.warn({ err }, 'Google OAuth failed');
        res.redirect(`${process.env.FRONTEND_URL || ''}/auth/error?message=oauth_failed`);
        return;
      }

      const tokens = this.authService.generateTokensForUser(user.userId);
      res.redirect(`${process.env.FRONTEND_URL || ''}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
    })(req, res);
  }

  async appleAuth(req: Request, res: Response): Promise<void> {
    try {
      const { identityToken, user } = req.body;

      if (!identityToken) {
        res.status(400).json({ error: 'Identity token is required' });
        return;
      }

      const appleUser = await this.verifyAppleToken(identityToken, user);
      if (!appleUser) {
        res.status(401).json({ error: 'Invalid Apple identity token' });
        return;
      }

      const result = await this.authService.findOrCreateOAuthUser({
        email: appleUser.email,
        displayName: appleUser.displayName,
        authProvider: AuthProvider.APPLE,
        authProviderId: appleUser.sub,
      });

      const tokens = this.authService.generateTokensForUser(result.userId);
      const user_data = await this.authService.getUserById(result.userId);
      res.status(200).json({ ...tokens, user: user_data, isNew: result.isNew });
    } catch (error) {
      logger.error({ err: error }, 'Apple auth error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async googleMobileAuth(req: Request, res: Response): Promise<void> {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        res.status(400).json({ error: 'ID token is required' });
        return;
      }

      const googleUser = await this.verifyGoogleIdToken(idToken);
      if (!googleUser) {
        res.status(401).json({ error: 'Invalid Google ID token' });
        return;
      }

      const result = await this.authService.findOrCreateOAuthUser({
        email: googleUser.email,
        displayName: googleUser.displayName,
        authProvider: AuthProvider.GOOGLE,
        authProviderId: googleUser.sub,
        profilePictureUrl: googleUser.picture,
      });

      const tokens = this.authService.generateTokensForUser(result.userId);
      const user = await this.authService.getUserById(result.userId);
      res.status(200).json({ ...tokens, user, isNew: result.isNew });
    } catch (error) {
      logger.error({ err: error }, 'Google mobile auth error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async verifyGoogleIdToken(
    idToken: string
  ): Promise<{ email: string; displayName: string; sub: string; picture?: string } | null> {
    try {
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      if (!payload.sub || !payload.email) {
        return null;
      }

      return {
        email: payload.email,
        displayName: payload.name || payload.email.split('@')[0],
        sub: payload.sub,
        picture: payload.picture,
      };
    } catch {
      return null;
    }
  }

  private async verifyAppleToken(
    identityToken: string,
    userData?: { email?: string; name?: { firstName?: string; lastName?: string } }
  ): Promise<{ email: string; displayName: string; sub: string } | null> {
    try {
      const parts = identityToken.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      if (!payload.sub) {
        return null;
      }

      const email = payload.email || userData?.email || `${payload.sub}@privaterelay.appleid.com`;
      const displayName = userData?.name 
        ? `${userData.name.firstName || ''} ${userData.name.lastName || ''}`.trim() || 'Apple User'
        : 'Apple User';

      return {
        email,
        displayName,
        sub: payload.sub,
      };
    } catch {
      return null;
    }
  }
}
