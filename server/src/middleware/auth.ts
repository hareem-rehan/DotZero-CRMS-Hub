import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/db';

export interface JwtPayload {
  userId: string;
  role: string;
  email: string;
  tokenVersion: number;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res
      .status(401)
      .json({ success: false, data: null, error: 'Access token required', meta: null });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Validate tokenVersion — if role was changed after this token was issued, reject it
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { tokenVersion: true, isActive: true },
    });
    if (!user || !user.isActive || user.tokenVersion !== decoded.tokenVersion) {
      res.status(401).json({
        success: false,
        data: null,
        error: 'Session expired. Please log in again.',
        meta: null,
      });
      return;
    }

    req.user = decoded;
    next();
  } catch {
    res
      .status(401)
      .json({ success: false, data: null, error: 'Invalid or expired token', meta: null });
  }
};
