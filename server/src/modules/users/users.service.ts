import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../utils/auditLog';
import { sendEmail } from '../../utils/email';
import { welcomeEmail, passwordResetEmail } from '../../utils/emailTemplates';
import type { CreateUserInput, UpdateUserInput } from './users.validation';

const WELCOME_TOKEN_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours

// ─── List ─────────────────────────────────────────────────────────────────────

export const listUsers = async (query: {
  role?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}) => {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, query.pageSize ?? 20);
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  // Default: exclude PRODUCT_OWNER (external clients) from the team list
  if (query.role) {
    where.role = query.role;
  } else {
    where.role = { not: 'PRODUCT_OWNER' };
  }
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isLocked: true,
        lastLogin: true,
        passwordSetAt: true,
        createdAt: true,
        projectAssignments: {
          include: { project: { select: { id: true, name: true, code: true } } },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
};

// ─── Detail ───────────────────────────────────────────────────────────────────

export const getUserById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      isLocked: true,
      lastLogin: true,
      passwordSetAt: true,
      createdAt: true,
      updatedAt: true,
      projectAssignments: {
        include: { project: { select: { id: true, name: true, code: true } } },
      },
    },
  });
};

// ─── Create ───────────────────────────────────────────────────────────────────

export const createUser = async (input: CreateUserInput, actorId: string) => {
  // Uniqueness check: same email + same role is not allowed
  const existing = await prisma.user.findFirst({ where: { email: input.email, role: input.role } });
  if (existing) throw new AppError(409, 'A user with this email and role already exists');

  // Create with random placeholder password — user must set via welcome link
  const tempHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: tempHash,
      role: input.role,
      isActive: input.isActive ?? true,
      projectAssignments:
        input.projectIds.length > 0
          ? { create: input.projectIds.map((pid) => ({ projectId: pid })) }
          : undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  // Generate 48-hour welcome / password-setup token (same mechanism as forgotPassword)
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + WELCOME_TOKEN_EXPIRY_MS);

  await prisma.auditLog.create({
    data: {
      event: 'PASSWORD_RESET_TOKEN',
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
      metadata: { tokenHash, expiresAt: expiresAt.toISOString() },
    },
  });

  const setupLink = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;

  const welcomeTpl = welcomeEmail(user.name, setupLink);
  await sendEmail(user.email, welcomeTpl.subject, welcomeTpl.html);

  await createAuditLog({
    event: 'USER_CREATED',
    actorId,
    entityType: 'User',
    entityId: user.id,
    metadata: { role: input.role, projectIds: input.projectIds },
  });

  return user;
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateUser = async (id: string, input: UpdateUserInput, actorId: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'User not found');

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.role !== undefined && { role: input.role }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

  // Sync project assignments if provided
  if (input.projectIds !== undefined) {
    await prisma.projectUser.deleteMany({ where: { userId: id } });
    if (input.projectIds.length > 0) {
      await prisma.projectUser.createMany({
        data: input.projectIds.map((pid) => ({ projectId: pid, userId: id })),
        skipDuplicates: true,
      });
    }
  }

  await createAuditLog({
    event: 'USER_UPDATED',
    actorId,
    entityType: 'User',
    entityId: id,
    metadata: { changes: input },
  });

  return updated;
};

// ─── Deactivate / Reactivate ──────────────────────────────────────────────────

export const setUserActive = async (id: string, isActive: boolean, actorId: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'User not found');

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive },
    select: { id: true, name: true, email: true, isActive: true },
  });

  await createAuditLog({
    event: isActive ? 'USER_REACTIVATED' : 'USER_DEACTIVATED',
    actorId,
    entityType: 'User',
    entityId: id,
  });

  return updated;
};

// ─── Resend welcome email ─────────────────────────────────────────────────────

export const resendWelcomeEmail = async (id: string, actorId: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'User not found');

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + WELCOME_TOKEN_EXPIRY_MS);

  await prisma.auditLog.create({
    data: {
      event: 'PASSWORD_RESET_TOKEN',
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
      metadata: { tokenHash, expiresAt: expiresAt.toISOString() },
    },
  });

  const setupLink = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;

  const resendTpl = welcomeEmail(user.name, setupLink);
  await sendEmail(user.email, resendTpl.subject, resendTpl.html);

  await createAuditLog({
    event: 'USER_WELCOME_RESENT',
    actorId,
    entityType: 'User',
    entityId: id,
  });

  return { message: 'Welcome email resent.' };
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteUser = async (id: string, actorId: string) => {
  if (id === actorId) throw new AppError(400, 'You cannot delete your own account');

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'User not found');

  // Clean up all related records in dependency order before deleting the user.
  // Many FK columns are non-nullable with no onDelete cascade, so we must
  // manually remove them first to avoid FK constraint violations.
  await prisma.$transaction(async (tx) => {
    // 1. Remove this user as author/actor on CR child records
    await tx.internalNote.deleteMany({ where: { authorId: id } });
    await tx.statusHistory.deleteMany({ where: { changedById: id } });
    await tx.cRVersion.deleteMany({ where: { createdById: id } });
    await tx.cRApproval.deleteMany({ where: { approvedById: id } });
    await tx.impactAnalysis.deleteMany({ where: { dmId: id } });

    // 2. Preserve CRs — nullify submittedById so CR history is retained
    await tx.changeRequest.updateMany({
      where: { submittedById: id },
      data: { submittedById: null },
    });

    // 3. Delete invitations sent by this user
    await tx.invitation.deleteMany({ where: { sentById: id } });

    // 4. Finally delete the user (ProjectUser cascades automatically)
    await tx.user.delete({ where: { id } });
  });

  await createAuditLog({
    event: 'USER_DELETED',
    actorId,
    entityType: 'User',
    entityId: id,
    metadata: { name: user.name, email: user.email, role: user.role },
  });

  return { message: 'User deleted.' };
};

// ─── SA-triggered password reset ─────────────────────────────────────────────

export const adminResetPassword = async (id: string, actorId: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'User not found');

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.auditLog.create({
    data: {
      event: 'PASSWORD_RESET_TOKEN',
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
      metadata: { tokenHash, expiresAt: expiresAt.toISOString() },
    },
  });

  const resetLink = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;

  const resetTpl = passwordResetEmail(user.name, resetLink);
  await sendEmail(user.email, resetTpl.subject, resetTpl.html);

  await createAuditLog({
    event: 'ADMIN_PASSWORD_RESET',
    actorId,
    entityType: 'User',
    entityId: id,
  });

  return { message: 'Password reset email sent.' };
};
