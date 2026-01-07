import pinoHttp from 'pino-http';
import { rootLogger } from '../logger';
import { RequestWithId } from './request-id.middleware';
import { AuthRequest } from './auth.middleware';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

export const requestLoggerMiddleware = pinoHttp({
  logger: rootLogger,
  autoLogging: !isTest,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customProps: (req) => {
    const typedReq = req as RequestWithId & AuthRequest;
    return {
      requestId: typedReq.requestId,
      userId: typedReq.userId,
    };
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} failed`;
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.currentPassword',
      'req.body.newPassword',
    ],
    censor: '[REDACTED]',
  },
});
