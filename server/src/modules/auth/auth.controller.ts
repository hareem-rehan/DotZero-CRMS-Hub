import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body, req.ip, req.headers['user-agent']);
      res.json({ success: true, data: result, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.forgotPassword(req.body);
      res.json({ success: true, data: { message: result.message }, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.resetPassword(req.body);
      res.json({ success: true, data: result, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },

  async magicLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      if (!token) {
        res
          .status(400)
          .json({ success: false, data: null, error: 'Token is required', meta: null });
        return;
      }
      const result = await authService.magicLogin(token);
      res.json({ success: true, data: result, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.register(req.body, req.ip);
      res.status(201).json({ success: true, data: user, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe(req.user!.userId);
      res.json({ success: true, data: user, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        name,
        phone,
        timezone,
        notifyOnCrSubmitted,
        notifyOnCrReturned,
        notifyOnCrApproved,
        notifyOnCrDeclined,
      } = req.body;
      const user = await authService.updateMe(req.user!.userId, {
        name,
        phone,
        timezone,
        notifyOnCrSubmitted,
        notifyOnCrReturned,
        notifyOnCrApproved,
        notifyOnCrDeclined,
      });
      res.json({ success: true, data: user, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(
        req.user!.userId,
        currentPassword,
        newPassword,
      );
      res.json({ success: true, data: result, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.getStats();
      res.json({ success: true, data: result, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
};
