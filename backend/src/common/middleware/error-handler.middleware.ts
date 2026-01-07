import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../logger';
import { captureException } from '../sentry';
import { RequestWithId } from './request-id.middleware';
import { AuthRequest } from './auth.middleware';
import { AppError } from '../errors/app-error';

const logger = createLogger('error-handler');

export { AppError };

export const errorHandlerMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const typedReq = req as RequestWithId & AuthRequest;
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : undefined;
  const isServerError = statusCode >= 500;

  const logContext = {
    requestId: typedReq.requestId,
    userId: typedReq.userId,
    method: req.method,
    path: req.path,
    statusCode,
    errorCode: code,
  };

  if (isServerError) {
    logger.error({ ...logContext, err }, 'Server error occurred');
    captureException(err, logContext);
  } else {
    logger.warn(logContext, err.message);
  }

  res.status(statusCode).json({
    error: {
      code: code || 'INTERNAL_ERROR',
      message: isServerError && process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
    },
  });
};
