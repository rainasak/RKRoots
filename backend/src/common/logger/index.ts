import pino, { Logger } from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const baseLogger = pino({
  level: isTest ? 'silent' : (process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug')),
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'authorization',
      'req.headers.authorization',
      'res.headers["set-cookie"]',
      'body.password',
      'body.currentPassword',
      'body.newPassword',
    ],
    censor: '[REDACTED]',
  },
  transport: !isProduction && !isTest
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

export const createLogger = (service: string): Logger => {
  return baseLogger.child({ service });
};

export const rootLogger = baseLogger;

export type { Logger };
