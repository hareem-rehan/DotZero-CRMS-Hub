import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import { createUserSchema, updateUserSchema } from './users.validation';
import * as ctrl from './users.controller';

export const usersRouter = Router();

usersRouter.use(authenticateToken, roleGuard(['SUPER_ADMIN']));

// GET /api/v1/users
usersRouter.get('/', ctrl.list);

// GET /api/v1/users/:id
usersRouter.get('/:id', ctrl.detail);

// POST /api/v1/users — create user + send welcome email
usersRouter.post('/', validate(createUserSchema), ctrl.create);

// PATCH /api/v1/users/:id — update name/role/projects
usersRouter.patch('/:id', validate(updateUserSchema), ctrl.update);

// PATCH /api/v1/users/:id/deactivate
usersRouter.patch('/:id/deactivate', ctrl.deactivate);

// PATCH /api/v1/users/:id/reactivate
usersRouter.patch('/:id/reactivate', ctrl.reactivate);

// POST /api/v1/users/:id/resend-invite
usersRouter.post('/:id/resend-invite', ctrl.resendWelcome);

// POST /api/v1/users/:id/reset-password
usersRouter.post('/:id/reset-password', ctrl.resetPassword);

// DELETE /api/v1/users/:id
usersRouter.delete('/:id', ctrl.deleteUser);
