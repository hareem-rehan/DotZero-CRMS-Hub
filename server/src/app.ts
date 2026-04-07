import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { globalRateLimiter } from './middleware/rateLimiter';

export const createApp = () => {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS — restricted to frontend origin
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    }),
  );

  // Global rate limiter
  app.use(globalRateLimiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' }, error: null, meta: null });
  });

  // Routes will be mounted here in subsequent phases
  // app.use('/api/v1/auth', authRoutes);
  // app.use('/api/v1/users', userRoutes);
  // app.use('/api/v1/projects', projectRoutes);
  // app.use('/api/v1/change-requests', changeRequestRoutes);
  // app.use('/api/v1/invitations', invitationRoutes);
  // app.use('/api/v1/dashboard', dashboardRoutes);
  // app.use('/api/v1/audit-log', auditLogRoutes);

  // Global error handler — must be last
  app.use(errorHandler);

  return app;
};
