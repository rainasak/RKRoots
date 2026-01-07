import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';

type ValidationSchema = {
  [key: string]: {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
    minLength?: number;
    maxLength?: number;
    enum?: string[];
    pattern?: RegExp;
  };
};

export const validateBody = (schema: ValidationSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: string[] = [];
    const body = req.body || {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value === undefined || value === null) continue;

      if (rules.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rules.type) {
          errors.push(`${field} must be of type ${rules.type}`);
          continue;
        }
      }

      if (rules.type === 'string' && typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} must be at most ${rules.maxLength} characters`);
        }
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${field} has invalid format`);
        }
      }
    }

    if (errors.length > 0) {
      next(new AppError(errors.join('; '), 400, 'VALIDATION_ERROR'));
      return;
    }

    next();
  };
};

export const validateParams = (schema: ValidationSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: string[] = [];
    const params = req.params || {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = params[field];

      if (rules.required && !value) {
        errors.push(`${field} parameter is required`);
        continue;
      }

      if (!value) continue;

      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} has invalid format`);
      }
    }

    if (errors.length > 0) {
      next(new AppError(errors.join('; '), 400, 'VALIDATION_ERROR'));
      return;
    }

    next();
  };
};

export const validateQuery = (schema: ValidationSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: string[] = [];
    const queryParams = req.query || {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = queryParams[field] as string | undefined;

      if (rules.required && !value) {
        errors.push(`${field} query parameter is required`);
        continue;
      }

      if (!value) continue;

      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }
    }

    if (errors.length > 0) {
      next(new AppError(errors.join('; '), 400, 'VALIDATION_ERROR'));
      return;
    }

    next();
  };
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uuidSchema = { required: true, pattern: UUID_PATTERN };
