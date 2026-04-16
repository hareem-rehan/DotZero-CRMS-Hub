import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authRateLimiter } from '../../middleware/rateLimiter';
import { authenticateToken } from '../../middleware/auth';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  registerSchema,
} from './auth.validation';

export const authRouter = Router();

// Public auth endpoints (rate-limited)
authRouter.post('/login', authRateLimiter, validate(loginSchema), authController.login);
authRouter.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
authRouter.post(
  '/reset-password',
  authRateLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);
authRouter.post('/register', authRateLimiter, validate(registerSchema), authController.register);
authRouter.post('/magic-login', authRateLimiter, authController.magicLogin);

// Authenticated profile endpoints
authRouter.get('/me', authenticateToken, authController.getMe);
authRouter.patch('/me', authenticateToken, authController.updateMe);
authRouter.post('/me/change-password', authenticateToken, authController.changePassword);
authRouter.get('/me/stats', authenticateToken, authController.getStats);
