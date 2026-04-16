import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error & { statusCode?: number },
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // AppError (explicit) or plain Error with a statusCode property attached
  const statusCode = err instanceof AppError ? err.statusCode : (err.statusCode ?? 0);

  if (statusCode >= 400 && statusCode < 600) {
    if (statusCode >= 500) logger.error({ err }, 'Unhandled error');
    res.status(statusCode).json({
      success: false,
      data: null,
      error: err.message,
      meta: null,
    });
    return;
  }

  logger.error({ err }, 'Unhandled error');

  res.status(500).json({
    success: false,
    data: null,
    error: 'Internal server error',
    meta: null,
  });
};
