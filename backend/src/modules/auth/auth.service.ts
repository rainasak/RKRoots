import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../../config/database';
import { User, AuthProvider } from '../../database/interfaces';
import { AppError } from '../../common/errors/app-error';
import { createLogger } from '../../common/logger';

export { AuthProvider };

const logger = createLogger('auth-service');

interface SignupDto {
  email: string;
  password: string;
  displayName: string;
}

interface LoginDto {
  email: string;
  password: string;
}

interface UpdateProfileDto {
  displayName?: string;
  profilePictureUrl?: string;
  currentPassword?: string;
  newPassword?: string;
}

interface OAuthUserDto {
  email: string;
  displayName: string;
  authProvider: AuthProvider;
  authProviderId: string;
  profilePictureUrl?: string;
}

const BCRYPT_COST_FACTOR = 12;

const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
};

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    return { valid: false, error: `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters` };
  }
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (PASSWORD_REQUIREMENTS.requireNumber && !/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  if (PASSWORD_REQUIREMENTS.requireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }
  return { valid: true };
}

export class AuthService {
  async signup(dto: SignupDto): Promise<{ userId: string; accessToken: string; refreshToken: string; user: User }> {
    if (!dto.email || !dto.password || !dto.displayName) {
      throw new AppError('Email, password, and display name are required', 400);
    }

    const passwordValidation = validatePassword(dto.password);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.error!, 400);
    }

    const existingResult = await query<User>(
      'SELECT user_id as "userId" FROM users WHERE email = $1',
      [dto.email]
    );

    if (existingResult.rows.length > 0) {
      throw new AppError('Email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST_FACTOR);

    const result = await query<User>(
      `INSERT INTO users (email, password_hash, display_name, auth_provider)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id as "userId", email, display_name as "displayName", profile_picture_url as "profilePictureUrl"`,
      [dto.email, passwordHash, dto.displayName, AuthProvider.EMAIL]
    );

    const user = result.rows[0];
    const accessToken = this.generateAccessToken(user.userId);
    const refreshToken = this.generateRefreshToken(user.userId);

    logger.info({ action: 'signup', userId: user.userId }, 'User registered');
    return { userId: user.userId, accessToken, refreshToken, user };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const result = await query<User & { passwordHash: string }>(
      `SELECT user_id as "userId", email, display_name as "displayName", 
              profile_picture_url as "profilePictureUrl", password_hash as "passwordHash" 
       FROM users WHERE email = $1`,
      [dto.email]
    );

    if (result.rows.length === 0 || !result.rows[0].passwordHash) {
      throw new AppError('Invalid credentials', 401);
    }

    const { passwordHash, ...user } = result.rows[0];
    const valid = await bcrypt.compare(dto.password, passwordHash);

    if (!valid) {
      throw new AppError('Invalid credentials', 401);
    }

    const accessToken = this.generateAccessToken(user.userId);
    const refreshToken = this.generateRefreshToken(user.userId);

    logger.info({ action: 'login', userId: user.userId }, 'User logged in');
    return { accessToken, refreshToken, user };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh-secret') as { userId: string };
      const accessToken = this.generateAccessToken(payload.userId);
      const newRefreshToken = this.generateRefreshToken(payload.userId);
      return { accessToken, refreshToken: newRefreshToken };
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }
  }

  private generateAccessToken(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
  }

  private generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET || 'refresh-secret', { expiresIn: '7d' });
  }

  async validateToken(token: string): Promise<string> {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
      return payload.userId;
    } catch {
      throw new AppError('Invalid token', 401);
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    const result = await query<User>(
      `SELECT user_id as "userId", email, auth_provider as "authProvider", 
              auth_provider_id as "authProviderId", display_name as "displayName", 
              profile_picture_url as "profilePictureUrl", created_at as "createdAt", 
              updated_at as "updatedAt"
       FROM users WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  }

  async updateProfile(userId: string, updates: UpdateProfileDto): Promise<User> {
    if (updates.newPassword) {
      if (!updates.currentPassword) {
        throw new AppError('Current password is required to update password', 400);
      }

      const userResult = await query<{ passwordHash: string }>(
        'SELECT password_hash as "passwordHash" FROM users WHERE user_id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new AppError('User not found', 404);
      }

      const valid = await bcrypt.compare(updates.currentPassword, userResult.rows[0].passwordHash);
      if (!valid) {
        throw new AppError('Current password is incorrect', 401);
      }

      const passwordValidation = validatePassword(updates.newPassword);
      if (!passwordValidation.valid) {
        throw new AppError(passwordValidation.error!, 400);
      }

      const newPasswordHash = await bcrypt.hash(updates.newPassword, BCRYPT_COST_FACTOR);
      await query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2',
        [newPasswordHash, userId]
      );

      logger.info({ action: 'updatePassword', userId }, 'Password updated');
    }

    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.displayName !== undefined) {
      updateFields.push(`display_name = $${paramIndex++}`);
      values.push(updates.displayName);
    }
    if (updates.profilePictureUrl !== undefined) {
      updateFields.push(`profile_picture_url = $${paramIndex++}`);
      values.push(updates.profilePictureUrl);
    }

    if (updateFields.length > 0) {
      updateFields.push(`updated_at = NOW()`);
      values.push(userId);

      await query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = $${paramIndex}`,
        values
      );
    }

    const user = await this.getUserById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async findOrCreateOAuthUser(dto: OAuthUserDto): Promise<{ userId: string; isNew: boolean }> {
    const existingResult = await query<User>(
      `SELECT user_id as "userId" FROM users 
       WHERE auth_provider = $1 AND auth_provider_id = $2`,
      [dto.authProvider, dto.authProviderId]
    );

    if (existingResult.rows.length > 0) {
      return { userId: existingResult.rows[0].userId, isNew: false };
    }

    const emailResult = await query<User>(
      'SELECT user_id as "userId" FROM users WHERE email = $1',
      [dto.email]
    );

    if (emailResult.rows.length > 0) {
      await query(
        `UPDATE users SET auth_provider = $1, auth_provider_id = $2, updated_at = NOW() 
         WHERE user_id = $3`,
        [dto.authProvider, dto.authProviderId, emailResult.rows[0].userId]
      );
      return { userId: emailResult.rows[0].userId, isNew: false };
    }

    const result = await query<User>(
      `INSERT INTO users (email, display_name, auth_provider, auth_provider_id, profile_picture_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id as "userId"`,
      [dto.email, dto.displayName, dto.authProvider, dto.authProviderId, dto.profilePictureUrl]
    );

    logger.info({ action: 'oauthSignup', userId: result.rows[0].userId, provider: dto.authProvider }, 'OAuth user created');
    return { userId: result.rows[0].userId, isNew: true };
  }

  generateTokensForUser(userId: string): { accessToken: string; refreshToken: string } {
    return {
      accessToken: this.generateAccessToken(userId),
      refreshToken: this.generateRefreshToken(userId),
    };
  }
}
