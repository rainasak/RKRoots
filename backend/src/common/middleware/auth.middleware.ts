import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createLogger } from '../logger';
import { RequestWithId } from './request-id.middleware';

const logger = createLogger('auth-middleware');

export interface AuthRequest extends RequestWithId {
  userId?: string;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const typedReq = req as AuthRequest;
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.debug({ requestId: typedReq.requestId }, 'No token provided');
      res.status(401).json({ error: { code: 'NO_TOKEN', message: 'No token provided' } });
      return;
    }

    const token = authHeader.substring(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
    typedReq.userId = payload.userId;
    
    logger.debug({ requestId: typedReq.requestId, userId: payload.userId }, 'Token verified');
    next();
  } catch (error) {
    logger.warn({ requestId: typedReq.requestId, err: error }, 'Invalid token');
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
  }
};
