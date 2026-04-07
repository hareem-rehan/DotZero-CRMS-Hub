import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import { createInvitationSchema } from './invitations.validation';
import * as ctrl from './invitations.controller';

export const invitationsRouter = Router();

invitationsRouter.use(authenticateToken, roleGuard(['SUPER_ADMIN']));

// POST /api/v1/invitations — send invite to client email
invitationsRouter.post('/', validate(createInvitationSchema), ctrl.send);

// GET /api/v1/invitations — list all invitations (optional ?projectId=)
invitationsRouter.get('/', ctrl.list);
