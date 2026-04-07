import { Request, Response, NextFunction } from 'express';

export const roleGuard = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, data: null, error: 'Unauthorized', meta: null });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, data: null, error: 'Forbidden', meta: null });
      return;
    }

    next();
  };
};
