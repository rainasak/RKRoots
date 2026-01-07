import request from 'supertest';
import jwt from 'jsonwebtoken';

const mockQuery = jest.fn();
const mockClosePool = jest.fn();

jest.mock('../../config/database', () => ({
  pool: { query: () => mockQuery() },
  query: (...args: unknown[]) => mockQuery(...args),
  closePool: () => mockClosePool(),
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../config/redis', () => ({
  connectRedis: jest.fn().mockResolvedValue(undefined),
  getRedisClient: jest.fn().mockReturnValue(null),
}));

import app from '../../app';
import bcrypt from 'bcrypt';

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should create new user with valid password', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ userId: 'user123' }] });

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'ValidPass1!',
          displayName: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('userId');
    });

    it('should reject password shorter than 8 characters', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'Short1!',
          displayName: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('8 characters');
    });

    it('should reject password without uppercase letter', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'lowercase1!',
          displayName: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('uppercase');
    });

    it('should reject password without lowercase letter', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'UPPERCASE1!',
          displayName: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('lowercase');
    });

    it('should reject password without number', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'NoNumber!@',
          displayName: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('number');
    });

    it('should reject password without special character', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'NoSpecial1',
          displayName: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('special character');
    });

    it('should reject duplicate email', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ userId: 'existing' }] });

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'existing@example.com',
          password: 'ValidPass1!',
          displayName: 'User',
        });

      expect(response.status).toBe(409);
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials and return JWT tokens', async () => {
      const hashedPassword = await bcrypt.hash('ValidPass1!', 12);
      mockQuery.mockResolvedValueOnce({
        rows: [{ userId: 'user123', passwordHash: hashedPassword }],
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPass1!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      const decoded = jwt.decode(response.body.accessToken) as { userId: string; exp: number };
      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('exp');
    });

    it('should reject invalid password', async () => {
      const hashedPassword = await bcrypt.hash('ValidPass1!', 12);
      mockQuery.mockResolvedValueOnce({
        rows: [{ userId: 'user123', passwordHash: hashedPassword }],
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPass1!',
        });

      expect(response.status).toBe(401);
    });

    it('should reject non-existent email', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'ValidPass1!',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const refreshToken = jwt.sign(
        { userId: 'user123' },
        process.env.JWT_REFRESH_SECRET || 'refresh-secret',
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    it('should return user profile without password_hash', async () => {
      const accessToken = jwt.sign(
        { userId: 'user123' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1h' }
      );

      mockQuery.mockResolvedValueOnce({
        rows: [{
          userId: 'user123',
          email: 'test@example.com',
          authProvider: 'email',
          displayName: 'Test User',
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      });

      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId', 'user123');
      expect(response.body).toHaveProperty('email', 'test@example.com');
      expect(response.body).toHaveProperty('displayName', 'Test User');
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('password_hash');
    });

    it('should reject request without token', async () => {
      const response = await request(app).get('/api/v1/auth/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/v1/auth/profile', () => {
    it('should update display name', async () => {
      const accessToken = jwt.sign(
        { userId: 'user123' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1h' }
      );

      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{
            userId: 'user123',
            email: 'test@example.com',
            displayName: 'New Display Name',
            authProvider: 'email',
            createdAt: new Date(),
            updatedAt: new Date(),
          }],
        });

      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ displayName: 'New Display Name' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('displayName', 'New Display Name');
    });

    it('should update password with current password verification', async () => {
      const accessToken = jwt.sign(
        { userId: 'user123' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1h' }
      );

      const currentHash = await bcrypt.hash('ValidPass1!', 12);
      mockQuery
        .mockResolvedValueOnce({ rows: [{ passwordHash: currentHash }] })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{
            userId: 'user123',
            email: 'test@example.com',
            displayName: 'Test User',
            authProvider: 'email',
            createdAt: new Date(),
            updatedAt: new Date(),
          }],
        });

      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'ValidPass1!',
          newPassword: 'NewValidPass2@',
        });

      expect(response.status).toBe(200);
    });

    it('should reject password update without current password', async () => {
      const accessToken = jwt.sign(
        { userId: 'user123' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newPassword: 'NewValidPass2@' });

      expect(response.status).toBe(400);
      expect(response.body.error.toLowerCase()).toContain('current password');
    });

    it('should reject password update with wrong current password', async () => {
      const accessToken = jwt.sign(
        { userId: 'user123' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1h' }
      );

      const currentHash = await bcrypt.hash('ValidPass1!', 12);
      mockQuery.mockResolvedValueOnce({ rows: [{ passwordHash: currentHash }] });

      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongPass1!',
          newPassword: 'NewValidPass2@',
        });

      expect(response.status).toBe(401);
    });

    it('should reject new password that does not meet requirements', async () => {
      const accessToken = jwt.sign(
        { userId: 'user123' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1h' }
      );

      const currentHash = await bcrypt.hash('ValidPass1!', 12);
      mockQuery.mockResolvedValueOnce({ rows: [{ passwordHash: currentHash }] });

      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'ValidPass1!',
          newPassword: 'weak',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('OAuth Flows (Mocked)', () => {
    describe('GET /api/v1/auth/google', () => {
      it('should handle Google OAuth endpoint', async () => {
        const response = await request(app)
          .get('/api/v1/auth/google')
          .redirects(0);

        expect([302, 500]).toContain(response.status);
      });
    });

    describe('POST /api/v1/auth/apple', () => {
      it('should handle Apple OAuth with valid identity token', async () => {
        const payload = { sub: 'apple123', email: 'apple@example.com' };
        const mockToken = `header.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;

        mockQuery
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ userId: 'new123' }] })
          .mockResolvedValueOnce({ rows: [{ userId: 'new123', email: 'apple@example.com', displayName: 'Apple User' }] });

        const response = await request(app)
          .post('/api/v1/auth/apple')
          .send({
            identityToken: mockToken,
            user: {
              email: 'apple@example.com',
              name: { firstName: 'Apple', lastName: 'User' },
            },
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.userId).toBe('new123');
      });

      it('should reject missing identity token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/apple')
          .send({
            user: { email: 'apple@example.com' },
          });

        expect(response.status).toBe(400);
      });

      it('should reject invalid identity token format', async () => {
        const response = await request(app)
          .post('/api/v1/auth/apple')
          .send({
            identityToken: 'invalid-token',
          });

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/v1/auth/google/mobile', () => {
      it('should handle Google mobile OAuth with valid ID token', async () => {
        const payload = { sub: 'google123', email: 'google@example.com', name: 'Google User' };
        const mockToken = `header.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;

        mockQuery
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ userId: 'new123' }] })
          .mockResolvedValueOnce({ rows: [{ userId: 'new123', email: 'google@example.com', displayName: 'Google User' }] });

        const response = await request(app)
          .post('/api/v1/auth/google/mobile')
          .send({ idToken: mockToken });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.userId).toBe('new123');
      });

      it('should reject missing ID token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/google/mobile')
          .send({});

        expect(response.status).toBe(400);
      });

      it('should reject invalid ID token format', async () => {
        const response = await request(app)
          .post('/api/v1/auth/google/mobile')
          .send({ idToken: 'invalid-token' });

        expect(response.status).toBe(401);
      });
    });
  });
});
