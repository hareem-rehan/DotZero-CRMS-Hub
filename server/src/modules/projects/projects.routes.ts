import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import { upload } from '../../utils/fileUpload';
import { createProjectSchema, updateProjectSchema } from './projects.validation';
import * as ctrl from './projects.controller';

export const projectsRouter = Router();

// GET /api/v1/projects/my-projects — projects assigned to the logged-in user (all roles)
projectsRouter.get('/my-projects', authenticateToken, ctrl.myProjects);

// All project routes below: authenticated + SA only
projectsRouter.use(authenticateToken, roleGuard(['SUPER_ADMIN']));

// GET /api/v1/projects — list with filters
projectsRouter.get('/', ctrl.list);

// GET /api/v1/projects/dm-users — dropdown for assigned DM selection
projectsRouter.get('/dm-users', ctrl.dmDropdown);

// GET /api/v1/projects/client-names — distinct client names for filter dropdown
projectsRouter.get('/client-names', ctrl.clientNames);

// GET /api/v1/projects/:id — project detail
projectsRouter.get('/:id', ctrl.detail);

// POST /api/v1/projects — create project (with optional file attachments)
projectsRouter.post(
  '/',
  upload.array('attachments', 5),
  validate(createProjectSchema),
  ctrl.create,
);

// PATCH /api/v1/projects/:id — update project fields
projectsRouter.patch(
  '/:id',
  upload.array('attachments', 5),
  validate(updateProjectSchema),
  ctrl.update,
);

// POST /api/v1/projects/:id/client-login-link
projectsRouter.post('/:id/client-login-link', ctrl.clientLoginLink);

// PATCH /api/v1/projects/:id/archive
projectsRouter.patch('/:id/archive', ctrl.archive);

// PATCH /api/v1/projects/:id/unarchive
projectsRouter.patch('/:id/unarchive', ctrl.unarchive);
