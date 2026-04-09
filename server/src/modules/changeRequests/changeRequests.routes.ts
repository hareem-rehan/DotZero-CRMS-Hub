import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import { upload } from '../../utils/fileUpload';
import { createCRSchema, updateCRSchema } from './changeRequests.validation';
import * as ctrl from './changeRequests.controller';
import { impactAnalysisController } from '../impactAnalysis/impactAnalysis.controller';

export const changeRequestsRouter = Router();

// All CR routes require authentication
changeRequestsRouter.use(authenticateToken);

// GET /api/v1/change-requests — list (role-scoped)
changeRequestsRouter.get('/', ctrl.list);

// GET /api/v1/change-requests/:id — detail (role-scoped)
changeRequestsRouter.get('/:id', ctrl.detail);

// POST /api/v1/change-requests — create draft (PO only)
changeRequestsRouter.post(
  '/',
  roleGuard(['PRODUCT_OWNER', 'SUPER_ADMIN']),
  upload.array('attachments', 5),
  validate(createCRSchema),
  ctrl.create,
);

// PATCH /api/v1/change-requests/:id — update draft (PO or SA)
changeRequestsRouter.patch(
  '/:id',
  roleGuard(['PRODUCT_OWNER', 'SUPER_ADMIN']),
  upload.array('attachments', 5),
  validate(updateCRSchema),
  ctrl.update,
);

// POST /api/v1/change-requests/:id/submit — submit draft (PO only)
changeRequestsRouter.post(
  '/:id/submit',
  roleGuard(['PRODUCT_OWNER']),
  ctrl.submit,
);

// POST /api/v1/change-requests/:id/impact-analysis — save/submit estimation (DM + SA)
changeRequestsRouter.post(
  '/:id/impact-analysis',
  roleGuard(['DELIVERY_MANAGER', 'SUPER_ADMIN']),
  impactAnalysisController.save,
);

// POST /api/v1/change-requests/:id/notes — internal note (DM + SA only)
changeRequestsRouter.post(
  '/:id/notes',
  roleGuard(['DELIVERY_MANAGER', 'SUPER_ADMIN']),
  impactAnalysisController.addNote,
);

// POST /api/v1/change-requests/:id/approve — PO approves with signature
changeRequestsRouter.post(
  '/:id/approve',
  roleGuard(['PRODUCT_OWNER', 'SUPER_ADMIN']),
  ctrl.approve,
);

// POST /api/v1/change-requests/:id/decline — PO declines with mandatory notes
changeRequestsRouter.post(
  '/:id/decline',
  roleGuard(['PRODUCT_OWNER', 'SUPER_ADMIN']),
  ctrl.decline,
);

// POST /api/v1/change-requests/:id/resubmit — PO resubmits, creates new version
changeRequestsRouter.post(
  '/:id/resubmit',
  roleGuard(['PRODUCT_OWNER', 'SUPER_ADMIN']),
  ctrl.resubmit,
);

// PATCH /api/v1/change-requests/:id/status — cancel only (PO or SA)
changeRequestsRouter.patch(
  '/:id/status',
  roleGuard(['PRODUCT_OWNER', 'SUPER_ADMIN']),
  ctrl.cancel,
);

// GET /api/v1/change-requests/:id/versions — version history
changeRequestsRouter.get(
  '/:id/versions',
  ctrl.versions,
);
