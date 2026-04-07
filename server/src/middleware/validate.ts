import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate =
  (schema: ZodSchema, source: 'body' | 'params' | 'query' = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      res.status(400).json({
        success: false,
        data: null,
        error: 'Validation failed',
        meta: { issues: result.error.flatten().fieldErrors },
      });
      return;
    }
    req[source] = result.data;
    next();
  };
