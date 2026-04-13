import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../utils/auditLog';
import type {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.validation';

const MAX_FAILED_ATTEMPTS = 5;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const JWT_EXPIRY_DEFAULT = '8h';
const JWT_EXPIRY_REMEMBER = '30d';

export const authService = {
  async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    // Multiple accounts can share the same email (different roles) — find the one whose password matches
    const candidates = await prisma.user.findMany({ where: { email: input.email } });

    // Generic error — never reveal which field is wrong
    const invalidCredentialsError = new AppError(401, 'Invalid email or password');

    if (candidates.length === 0) {
      await createAuditLog({
        event: 'FAILED_LOGIN_ATTEMPT',
        entityType: 'User',
        entityId: input.email,
        metadata: { reason: 'user_not_found' },
        ipAddress,
        userAgent,
      });
      throw invalidCredentialsError;
    }

    // Find the account whose password matches
    let user = null;
    for (const candidate of candidates) {
      const matches = await bcrypt.compare(input.password, candidate.passwordHash);
      if (matches) {
        user = candidate;
        break;
      }
    }

    if (!user) {
      // Increment failed attempts on all matching accounts
      for (const candidate of candidates) {
        const newCount = candidate.failedLoginAttempts + 1;
        await prisma.user.update({
          where: { id: candidate.id },
          data: { failedLoginAttempts: newCount, isLocked: newCount >= MAX_FAILED_ATTEMPTS },
        });
      }
      await createAuditLog({
        event: 'FAILED_LOGIN_ATTEMPT',
        entityType: 'User',
        entityId: input.email,
        metadata: { reason: 'wrong_password' },
        ipAddress,
        userAgent,
      });
      throw invalidCredentialsError;
    }

    if (user.isLocked) {
      throw new AppError(
        403,
        'Account is locked. Please check your email to unlock or contact support.',
      );
    }

    if (!user.isActive) {
      throw new AppError(403, 'Account is deactivated. Please contact your administrator.');
    }

    // Successful login — reset failed attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLogin: new Date(),
      },
    });

    const expiresIn = input.rememberMe ? JWT_EXPIRY_REMEMBER : JWT_EXPIRY_DEFAULT;
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email, tokenVersion: user.tokenVersion },
      env.JWT_SECRET,
      { expiresIn } as jwt.SignOptions,
    );

    await createAuditLog({
      event: 'USER_LOGIN',
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    const { passwordHash: _, ...safeUser } = user;
    return { token, user: safeUser };
  },

  async forgotPassword(input: ForgotPasswordInput) {
    // Multiple accounts can share the same email — send a reset link for each
    const users = await prisma.user.findMany({ where: { email: input.email } });

    // Always respond with success — never reveal if email exists
    if (!users.length) return { message: 'If that email exists, a reset link has been sent.' };

    for (const user of users) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      await prisma.user.update({ where: { id: user.id }, data: { passwordSetAt: expiresAt } });

      await prisma.auditLog.create({
        data: {
          event: 'PASSWORD_RESET_TOKEN',
          actorId: user.id,
          entityType: 'User',
          entityId: user.id,
          metadata: { tokenHash, expiresAt: expiresAt.toISOString() },
        },
      });

      // Email is sent by the controller after this returns — handle per-user here
      const resetLink = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
      const { passwordResetEmail } = await import('../../utils/emailTemplates');
      const { sendEmail } = await import('../../utils/email');
      const tpl = passwordResetEmail(user.name, resetLink);
      await sendEmail(user.email, tpl.subject, tpl.html).catch(() => {});
    }

    return { message: 'If that email exists, a reset link has been sent.' };
  },

  async resetPassword(input: ResetPasswordInput) {
    const tokenHash = crypto.createHash('sha256').update(input.token).digest('hex');

    // Find the reset token in audit log
    const tokenRecord = await prisma.auditLog.findFirst({
      where: {
        event: 'PASSWORD_RESET_TOKEN',
        metadata: { path: ['tokenHash'], equals: tokenHash },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!tokenRecord) throw new AppError(400, 'Invalid or expired reset token');

    const metadata = tokenRecord.metadata as { tokenHash: string; expiresAt: string };
    if (new Date(metadata.expiresAt) < new Date()) {
      throw new AppError(400, 'Reset token has expired. Please request a new one.');
    }

    const user = await prisma.user.findUnique({ where: { id: tokenRecord.entityId } });
    if (!user) throw new AppError(400, 'Invalid reset token');

    const newHash = await bcrypt.hash(input.password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        passwordSetAt: new Date(),
        failedLoginAttempts: 0,
        isLocked: false,
      },
    });

    // Invalidate the token by deleting it from audit log metadata (mark as used)
    await prisma.auditLog.create({
      data: {
        event: 'PASSWORD_RESET_TOKEN_USED',
        actorId: user.id,
        entityType: 'User',
        entityId: user.id,
        metadata: { tokenHash },
      },
    });

    await createAuditLog({
      event: 'PASSWORD_RESET',
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
    });

    return { message: 'Password reset successfully.' };
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found');
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  },

  async updateMe(
    userId: string,
    input: {
      name?: string;
      phone?: string;
      timezone?: string;
      notifyOnCrSubmitted?: boolean;
      notifyOnCrReturned?: boolean;
      notifyOnCrApproved?: boolean;
      notifyOnCrDeclined?: boolean;
    },
  ) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: input,
    });
    await createAuditLog({
      event: 'USER_UPDATED',
      actorId: userId,
      entityType: 'User',
      entityId: userId,
      metadata: { fields: Object.keys(input) },
    });
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new AppError(400, 'Current password is incorrect');
    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash, passwordSetAt: new Date() },
    });
    await createAuditLog({
      event: 'PASSWORD_RESET',
      actorId: userId,
      entityType: 'User',
      entityId: userId,
      metadata: { source: 'self' },
    });
    return { message: 'Password changed successfully.' };
  },

  async getStats() {
    const [users, projects, changeRequests, pendingCRs] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.changeRequest.count(),
      prisma.changeRequest.count({
        where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'RESUBMITTED'] } },
      }),
    ]);
    return { users, projects, changeRequests, pendingCRs };
  },

  async magicLogin(token: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const tokenRecord = await prisma.auditLog.findFirst({
      where: {
        event: 'CLIENT_LOGIN_TOKEN',
        metadata: { path: ['tokenHash'], equals: tokenHash },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!tokenRecord) throw new AppError(400, 'Invalid or expired login link');

    const metadata = tokenRecord.metadata as {
      tokenHash: string;
      expiresAt: string;
      usedAt?: string;
    };
    if (metadata.usedAt) throw new AppError(400, 'This login link has already been used');
    if (new Date(metadata.expiresAt) < new Date())
      throw new AppError(400, 'Login link has expired');

    const user = await prisma.user.findUnique({ where: { id: tokenRecord.entityId } });
    if (!user || !user.isActive) throw new AppError(400, 'Invalid login link');

    // Mark token as used
    await prisma.auditLog.update({
      where: { id: tokenRecord.id },
      data: { metadata: { ...metadata, usedAt: new Date().toISOString() } },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    await createAuditLog({
      event: 'USER_LOGIN',
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
      metadata: { source: 'magic_link' },
    });

    const jwtToken = jwt.sign(
      { userId: user.id, role: user.role, email: user.email, tokenVersion: user.tokenVersion },
      env.JWT_SECRET,
      { expiresIn: '8h' } as jwt.SignOptions,
    );

    const { passwordHash: _, ...safeUser } = user;
    return { token: jwtToken, user: safeUser };
  },

  async register(input: RegisterInput, ipAddress?: string) {
    // Find invite by token
    const invite = await prisma.invitation.findUnique({ where: { token: input.token } });

    if (!invite) throw new AppError(400, 'Invalid or expired invitation token');
    if (invite.usedAt) throw new AppError(400, 'This invitation has already been used');
    if (invite.expiresAt < new Date()) throw new AppError(400, 'Invitation has expired');

    // Check if this email+role combination is already registered
    const existing = await prisma.user.findFirst({
      where: { email: invite.email, role: invite.role },
    });
    if (existing) throw new AppError(409, 'An account with this email and role already exists');

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: invite.email,
        passwordHash,
        role: invite.role,
        isActive: true,
        passwordSetAt: new Date(),
        projectAssignments: {
          create: { projectId: invite.projectId },
        },
      },
    });

    // Mark invite as used
    await prisma.invitation.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });

    await createAuditLog({
      event: 'USER_REGISTERED',
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
      metadata: { inviteId: invite.id },
      ipAddress,
    });

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  },
};
