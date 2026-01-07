import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { AuthService, AuthProvider } from '../modules/auth/auth.service';
import { createLogger } from '../common/logger';

const logger = createLogger('passport');

export function configurePassport(): void {
  const authService = new AuthService();

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/v1/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email found in Google profile'), false);
            }

            const result = await authService.findOrCreateOAuthUser({
              email,
              displayName: profile.displayName || email.split('@')[0],
              authProvider: AuthProvider.GOOGLE,
              authProviderId: profile.id,
              profilePictureUrl: profile.photos?.[0]?.value,
            });

            logger.info({ action: 'googleOAuth', userId: result.userId, isNew: result.isNew }, 'Google OAuth completed');
            return done(null, { userId: result.userId });
          } catch (error) {
            logger.error({ err: error }, 'Google OAuth error');
            return done(error as Error, false);
          }
        }
      )
    );
  } else {
    logger.warn('Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
  }

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user as Express.User);
  });
}
