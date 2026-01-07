import * as Sentry from '@sentry/node';
import { Express, Request, Response, NextFunction } from 'express';
import { createLogger } from '../logger';

const logger = createLogger('sentry');

export const initSentry = (app: Express): void => {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    logger.warn('SENTRY_DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.httpIntegration(),
    ],
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
  });

  logger.info('Sentry initialized');
};

export const sentryRequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  Sentry.setContext('request', {
    method: req.method,
    url: req.url,
    headers: req.headers,
  });
  next();
};

export const sentryErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  Sentry.captureException(err);
  next(err);
};

export const captureException = (error: Error, context?: Record<string, unknown>): void => {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
};
