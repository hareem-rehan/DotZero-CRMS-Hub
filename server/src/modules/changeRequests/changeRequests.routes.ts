import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import { upload } from '../../utils/fileUpload';
import { createCRSchema, updateCRSchema } from './changeRequests.validation';
import * as ctrl from './changeRequests.controller';

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
