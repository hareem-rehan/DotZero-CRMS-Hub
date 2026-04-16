import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';
import { dashboardController } from './dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.use(authenticateToken);

// GET /api/v1/dashboard — SA + Finance
dashboardRouter.get('/', roleGuard(['SUPER_ADMIN', 'FINANCE']), dashboardController.getDashboard);

// GET /api/v1/dashboard/finance/crs — Finance CR listing with cost data
dashboardRouter.get(
  '/finance/crs',
  roleGuard(['FINANCE', 'SUPER_ADMIN']),
  dashboardController.listFinanceCRs,
);

// GET /api/v1/dashboard/finance/crs/:id — Finance CR detail
dashboardRouter.get(
  '/finance/crs/:id',
  roleGuard(['FINANCE', 'SUPER_ADMIN']),
  dashboardController.getFinanceCR,
);

// GET /api/v1/dashboard/export?format=csv|pdf
dashboardRouter.get(
  '/export',
  roleGuard(['FINANCE', 'SUPER_ADMIN']),
  dashboardController.exportCRs,
);
