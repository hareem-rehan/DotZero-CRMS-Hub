import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendEmail } from '../../utils/email';
import { env } from '../../config/env';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(
        req.body,
        req.ip,
        req.headers['user-agent'],
      );
      res.json({ success: true, data: result, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.forgotPassword(req.body);

      // Send reset email if a token was generated
      if (result.resetToken && result.email) {
        const resetUrl = `${env.CLIENT_URL}/reset-password?token=${result.resetToken}`;
        await sendEmail(
          result.email,
          'Reset your DotZero password',
          `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <div style="background:#EF323F;padding:20px;text-align:center">
                <h1 style="color:#fff;margin:0">DotZero CR Portal</h1>
              </div>
              <div style="padding:30px;background:#fff">
                <p>Hi ${result.name ?? 'there'},</p>
                <p>You requested a password reset. This link expires in <strong>1 hour</strong>.</p>
                <div style="text-align:center;margin:30px 0">
                  <a href="${resetUrl}" style="background:#EF323F;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
                    Reset Password
                  </a>
                </div>
                <p style="color:#5D5B5B;font-size:13px">If you didn't request this, ignore this email.</p>
              </div>
            </div>
          `,
        );
      }

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

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.register(req.body, req.ip);
      res.status(201).json({ success: true, data: user, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
};
