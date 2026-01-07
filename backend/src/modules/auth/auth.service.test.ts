import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthProvider } from '../../database/interfaces';

const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

import { AuthService, validatePassword } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    mockQuery.mockReset();
    authService = new AuthService();
  });

  describe('validatePassword', () => {
    it('should accept valid password with all requirements', () => {
      const result = validatePassword('ValidPass1!');
      expect(result.valid).toBe(true);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePassword('Short1!');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('8 characters');
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePassword('lowercase1!');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('uppercase');
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePassword('UPPERCASE1!');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('lowercase');
    });

    it('should reject password without number', () => {
      const result = validatePassword('NoNumber!@');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('number');
    });

    it('should reject password without special character', () => {
      const result = validatePassword('NoSpecial1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('special character');
    });
  });

  describe('signup', () => {
    it('should create new user with valid credentials', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ userId: 'user123', email: 'test@example.com', displayName: 'Test User' }] });

      const result = await authService.signup({
        email: 'test@example.com',
        password: 'ValidPass1!',
        displayName: 'Test User',
      });

      expect(result.userId).toBe('user123');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(mockQuery).toHaveBeenCalledTimes(2);
      
      const insertCall = mockQuery.mock.calls[1];
      expect(insertCall[0]).toContain('INSERT INTO users');
      expect(insertCall[1][0]).toBe('test@example.com');
      expect(insertCall[1][2]).toBe('Test User');
      expect(insertCall[1][3]).toBe(AuthProvider.EMAIL);
    });

    it('should reject duplicate email', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ userId: 'existing' }] });

      await expect(
        authService.signup({
          email: 'existing@example.com',
          password: 'ValidPass1!',
          displayName: 'Test User',
        })
      ).rejects.toThrow('Email already exists');
    });

    it('should reject invalid password', async () => {
      await expect(
        authService.signup({
          email: 'test@example.com',
          password: 'weak',
          displayName: 'Test User',
        })
      ).rejects.toThrow('8 characters');
    });

    it('should reject missing required fields', async () => {
      await expect(
        authService.signup({
          email: 'test@example.com',
          password: '',
          displayName: 'Test User',
        })
      ).rejects.toThrow('required');
    });

    it('should hash password with bcrypt cost factor 12', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ userId: 'user123', email: 'test@example.com', displayName: 'Test User' }] });

      await authService.signup({
        email: 'test@example.com',
        password: 'ValidPass1!',
        displayName: 'Test User',
      });

      const insertCall = mockQuery.mock.calls[1];
      const hashedPassword = insertCall[1][1];
      
      expect(hashedPassword).toMatch(/^\$2[aby]\$12\$/);
    });
  });

  describe('login', () => {
    it('should return tokens and user for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('ValidPass1!', 12);
      mockQuery.mockResolvedValueOnce({
        rows: [{ userId: 'user123', email: 'test@example.com', displayName: 'Test User', passwordHash: hashedPassword }],
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'ValidPass1!',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.userId).toBe('user123');
      expect(result.user.email).toBe('test@example.com');
      
      const decoded = jwt.decode(result.accessToken) as { userId: string };
      expect(decoded.userId).toBe('user123');
    });

    it('should reject invalid password', async () => {
      const hashedPassword = await bcrypt.hash('ValidPass1!', 12);
      mockQuery.mockResolvedValueOnce({
        rows: [{ userId: 'user123', email: 'test@example.com', displayName: 'Test User', passwordHash: hashedPassword }],
      });

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'WrongPass1!',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'ValidPass1!',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject OAuth user without password', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ userId: 'user123', email: 'oauth@example.com', displayName: 'OAuth User', passwordHash: null }],
      });

      await expect(
        authService.login({
          email: 'oauth@example.com',
          password: 'ValidPass1!',
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refresh', () => {
    it('should return new tokens for valid refresh token', async () => {
      const refreshToken = jwt.sign(
        { userId: 'user123' },
        process.env.JWT_REFRESH_SECRET || 'refresh-secret',
        { expiresIn: '7d' }
      );

      const result = await authService.refresh(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      await expect(authService.refresh('invalid-token')).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('validateToken', () => {
    it('should return userId for valid token', async () => {
      const token = jwt.sign(
        { userId: 'user123' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1h' }
      );

      const userId = await authService.validateToken(token);
      expect(userId).toBe('user123');
    });

    it('should reject invalid token', async () => {
      await expect(authService.validateToken('invalid-token')).rejects.toThrow('Invalid token');
    });
  });

  describe('getUserById', () => {
    it('should return user without password hash', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          userId: 'user123',
          email: 'test@example.com',
          authProvider: AuthProvider.EMAIL,
          displayName: 'Test User',
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      });

      const user = await authService.getUserById('user123');

      expect(user).not.toBeNull();
      expect(user!.userId).toBe('user123');
      expect(user).not.toHaveProperty('passwordHash');
      
      const selectQuery = mockQuery.mock.calls[0][0];
      expect(selectQuery).not.toContain('password_hash');
    });

    it('should return null for non-existent user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const user = await authService.getUserById('nonexistent');
      expect(user).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should update display name', async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{
            userId: 'user123',
            email: 'test@example.com',
            displayName: 'New Name',
            authProvider: AuthProvider.EMAIL,
            createdAt: new Date(),
            updatedAt: new Date(),
          }],
        });

      const result = await authService.updateProfile('user123', {
        displayName: 'New Name',
      });

      expect(result.displayName).toBe('New Name');
    });

    it('should update password with current password verification', async () => {
      const currentHash = await bcrypt.hash('CurrentPass1!', 12);
      
      mockQuery
        .mockResolvedValueOnce({ rows: [{ passwordHash: currentHash }] })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{
            userId: 'user123',
            email: 'test@example.com',
            displayName: 'Test User',
            authProvider: AuthProvider.EMAIL,
            createdAt: new Date(),
            updatedAt: new Date(),
          }],
        });

      const result = await authService.updateProfile('user123', {
        currentPassword: 'CurrentPass1!',
        newPassword: 'NewValidPass2@',
      });

      expect(result.userId).toBe('user123');
      
      const updateCall = mockQuery.mock.calls[1];
      expect(updateCall[0]).toContain('UPDATE users SET password_hash');
    });

    it('should reject password update without current password', async () => {
      await expect(
        authService.updateProfile('user123', {
          newPassword: 'NewValidPass2@',
        })
      ).rejects.toThrow('Current password is required');
    });

    it('should reject password update with wrong current password', async () => {
      const currentHash = await bcrypt.hash('CurrentPass1!', 12);
      mockQuery.mockResolvedValueOnce({ rows: [{ passwordHash: currentHash }] });

      await expect(
        authService.updateProfile('user123', {
          currentPassword: 'WrongPass1!',
          newPassword: 'NewValidPass2@',
        })
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should reject new password that does not meet requirements', async () => {
      const currentHash = await bcrypt.hash('CurrentPass1!', 12);
      mockQuery.mockResolvedValueOnce({ rows: [{ passwordHash: currentHash }] });

      await expect(
        authService.updateProfile('user123', {
          currentPassword: 'CurrentPass1!',
          newPassword: 'weak',
        })
      ).rejects.toThrow('8 characters');
    });
  });

  describe('findOrCreateOAuthUser', () => {
    it('should return existing user by provider ID', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ userId: 'existing123' }] });

      const result = await authService.findOrCreateOAuthUser({
        email: 'oauth@example.com',
        displayName: 'OAuth User',
        authProvider: AuthProvider.GOOGLE,
        authProviderId: 'google123',
      });

      expect(result.userId).toBe('existing123');
      expect(result.isNew).toBe(false);
    });

    it('should link existing email user to OAuth provider', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ userId: 'email123' }] })
        .mockResolvedValueOnce({ rowCount: 1 });

      const result = await authService.findOrCreateOAuthUser({
        email: 'existing@example.com',
        displayName: 'OAuth User',
        authProvider: AuthProvider.GOOGLE,
        authProviderId: 'google123',
      });

      expect(result.userId).toBe('email123');
      expect(result.isNew).toBe(false);
    });

    it('should create new user for new OAuth account', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ userId: 'new123' }] });

      const result = await authService.findOrCreateOAuthUser({
        email: 'new@example.com',
        displayName: 'New OAuth User',
        authProvider: AuthProvider.GOOGLE,
        authProviderId: 'google123',
        profilePictureUrl: 'https://example.com/photo.jpg',
      });

      expect(result.userId).toBe('new123');
      expect(result.isNew).toBe(true);
    });
  });

  describe('generateTokensForUser', () => {
    it('should generate access and refresh tokens', () => {
      const tokens = authService.generateTokensForUser('user123');

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');

      const accessDecoded = jwt.decode(tokens.accessToken) as { userId: string; exp: number };
      expect(accessDecoded.userId).toBe('user123');
      expect(accessDecoded.exp).toBeDefined();

      const refreshDecoded = jwt.decode(tokens.refreshToken) as { userId: string; exp: number };
      expect(refreshDecoded.userId).toBe('user123');
    });
  });
});
