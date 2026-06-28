import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import { upload } from '../../utils/fileUpload';
import {
  createCRSchema,
  updateCRSchema,
  createDMInitiatedCRSchema,
  updateDMDraftSchema,
  clientConfirmSchema,
  clientReviewEditSchema,
  clientRejectSchema,
  poResubmitWithEditsSchema,
  dmReviewResubmitSchema,
} from './changeRequests.validation';
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
changeRequestsRouter.post('/:id/submit', roleGuard(['PRODUCT_OWNER']), ctrl.submit);

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

// POST /api/v1/change-requests/:id/defer — PO defers with mandatory reason
changeRequestsRouter.post('/:id/defer', roleGuard(['PRODUCT_OWNER', 'SUPER_ADMIN']), ctrl.defer);

// POST /api/v1/change-requests/:id/resubmit — PO resubmits, creates new version
changeRequestsRouter.post(
  '/:id/resubmit',
  roleGuard(['PRODUCT_OWNER', 'SUPER_ADMIN']),
  ctrl.resubmit,
);

// PATCH /api/v1/change-requests/:id/status — cancel only (PO or SA)
changeRequestsRouter.patch('/:id/status', roleGuard(['PRODUCT_OWNER', 'SUPER_ADMIN']), ctrl.cancel);

// GET /api/v1/change-requests/:id/versions — version history
changeRequestsRouter.get('/:id/versions', ctrl.versions);

// ─── DM-initiated CR flow ─────────────────────────────────────────────────────

// POST /api/v1/change-requests/dm-initiated — DM creates CR on behalf of PO
changeRequestsRouter.post(
  '/dm-initiated',
  roleGuard(['DELIVERY_MANAGER', 'SUPER_ADMIN']),
  validate(createDMInitiatedCRSchema),
  ctrl.createDMInitiated,
);

// PATCH /api/v1/change-requests/:id/dm-draft — DM edits their own DM-initiated DRAFT
changeRequestsRouter.patch(
  '/:id/dm-draft',
  roleGuard(['DELIVERY_MANAGER', 'SUPER_ADMIN']),
  validate(updateDMDraftSchema),
  ctrl.dmEditDraft,
);

// POST /api/v1/change-requests/:id/send-to-client — DM sends DRAFT to PO for review
changeRequestsRouter.post(
  '/:id/send-to-client',
  roleGuard(['DELIVERY_MANAGER', 'SUPER_ADMIN']),
  ctrl.sendToClient,
);

// PATCH /api/v1/change-requests/:id/client-review-edit — PO edits description/bizJustification while in PENDING_CLIENT_REVIEW
changeRequestsRouter.patch(
  '/:id/client-review-edit',
  roleGuard(['PRODUCT_OWNER', 'SUPER_ADMIN']),
  validate(clientReviewEditSchema),
  ctrl.clientReviewEdit,
);

// POST /api/v1/change-requests/:id/client-confirm — PO confirms DM-created CR → ESTIMATED
changeRequestsRouter.post(
  '/:id/client-confirm',
  roleGuard(['PRODUCT_OWNER', 'SUPER_ADMIN']),
  validate(clientConfirmSchema),
  ctrl.clientConfirm,
);

// POST /api/v1/change-requests/:id/client-reject — PO rejects DM-created CR → DRAFT
changeRequestsRouter.post(
  '/:id/client-reject',
  roleGuard(['PRODUCT_OWNER', 'SUPER_ADMIN']),
  validate(clientRejectSchema),
  ctrl.clientReject,
);

// POST /api/v1/change-requests/:id/po-resubmit-edits — PO re-submits with edits → CLIENT_REVISION
changeRequestsRouter.post(
  '/:id/po-resubmit-edits',
  roleGuard(['PRODUCT_OWNER', 'SUPER_ADMIN']),
  validate(poResubmitWithEditsSchema),
  ctrl.poResubmitWithEdits,
);

// POST /api/v1/change-requests/:id/dm-review-resubmit — DM reviews edits → ESTIMATED (locked)
changeRequestsRouter.post(
  '/:id/dm-review-resubmit',
  roleGuard(['DELIVERY_MANAGER', 'SUPER_ADMIN']),
  validate(dmReviewResubmitSchema),
  ctrl.dmReviewResubmit,
);

// POST /api/v1/change-requests/:id/mark-in-progress — Finance marks APPROVED → IN_PROGRESS
changeRequestsRouter.post(
  '/:id/mark-in-progress',
  roleGuard(['FINANCE', 'SUPER_ADMIN']),
  ctrl.markInProgress,
);

// POST /api/v1/change-requests/:id/mark-completed — Finance marks IN_PROGRESS → COMPLETED
changeRequestsRouter.post(
  '/:id/mark-completed',
  roleGuard(['FINANCE', 'SUPER_ADMIN']),
  ctrl.markCompleted,
);

// POST /api/v1/change-requests/:id/recall-from-client — DM recalls PENDING_CLIENT_REVIEW → DRAFT
changeRequestsRouter.post(
  '/:id/recall-from-client',
  roleGuard(['DELIVERY_MANAGER', 'SUPER_ADMIN']),
  ctrl.recallFromClient,
);
