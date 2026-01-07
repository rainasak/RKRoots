import rateLimit from 'express-rate-limit';

const isTestEnv = process.env.NODE_ENV === 'test';

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 1000 : 100,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 1000 : 10,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many authentication attempts, please try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
});

export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTestEnv ? 1000 : 30,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many search requests, please try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
});
