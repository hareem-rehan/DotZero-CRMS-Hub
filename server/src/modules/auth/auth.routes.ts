import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authRateLimiter } from '../../middleware/rateLimiter';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  registerSchema,
} from './auth.validation';

export const authRouter = Router();

authRouter.use(authRateLimiter);

authRouter.post('/login', validate(loginSchema), authController.login);
authRouter.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
authRouter.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
authRouter.post('/register', validate(registerSchema), authController.register);
