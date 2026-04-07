import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { globalRateLimiter } from './middleware/rateLimiter';
import { authRouter } from './modules/auth/auth.routes';
import { projectsRouter } from './modules/projects/projects.routes';
import { usersRouter } from './modules/users/users.routes';
import { invitationsRouter } from './modules/invitations/invitations.routes';
import { changeRequestsRouter } from './modules/changeRequests/changeRequests.routes';

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

  // Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/projects', projectsRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/invitations', invitationsRouter);
  app.use('/api/v1/change-requests', changeRequestsRouter);
  // app.use('/api/v1/change-requests', changeRequestRoutes);
  // app.use('/api/v1/invitations', invitationRoutes);
  // app.use('/api/v1/dashboard', dashboardRoutes);
  // app.use('/api/v1/audit-log', auditLogRoutes);

  // Global error handler — must be last
  app.use(errorHandler);

  return app;
};
