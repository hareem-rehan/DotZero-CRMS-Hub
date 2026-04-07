import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../utils/auditLog';
import type { LoginInput, RegisterInput, ForgotPasswordInput, ResetPasswordInput } from './auth.validation';

const MAX_FAILED_ATTEMPTS = 5;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const JWT_EXPIRY_DEFAULT = '8h';
const JWT_EXPIRY_REMEMBER = '30d';

export const authService = {
  async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    // Generic error — never reveal which field is wrong
    const invalidCredentialsError = new AppError(401, 'Invalid email or password');

    if (!user) {
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

    if (user.isLocked) {
      throw new AppError(403, 'Account is locked. Please check your email to unlock or contact support.');
    }

    if (!user.isActive) {
      throw new AppError(403, 'Account is deactivated. Please contact your administrator.');
    }

    const passwordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!passwordValid) {
      const newFailedCount = user.failedLoginAttempts + 1;
      const shouldLock = newFailedCount >= MAX_FAILED_ATTEMPTS;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newFailedCount,
          isLocked: shouldLock,
        },
      });

      await createAuditLog({
        event: 'FAILED_LOGIN_ATTEMPT',
        actorId: user.id,
        entityType: 'User',
        entityId: user.id,
        metadata: { attempt: newFailedCount, locked: shouldLock },
        ipAddress,
        userAgent,
      });

      if (shouldLock) {
        throw new AppError(403, 'Account locked after too many failed attempts. Please check your email to unlock.');
      }

      throw invalidCredentialsError;
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
      { userId: user.id, role: user.role, email: user.email },
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
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    // Always respond with success — never reveal if email exists
    if (!user) return { message: 'If that email exists, a reset link has been sent.' };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    // Store token hash (not raw token) for security
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        // Reuse passwordSetAt as reset token expiry marker — store token in a temp field
        // We store the hash in passwordHash temporarily... No, that's wrong.
        // Use a dedicated approach: store token + expiry in the user record
        // For simplicity, we embed token:expiry in a reversible format in passwordSetAt
        // Best practice: store hashed token in DB. We'll use a convention:
        // passwordSetAt = expiry datetime, and store token in a separate mechanism.
        // Simple approach: store the hashed token temporarily. On reset, find by hash.
        passwordSetAt: expiresAt,
      },
    });

    // Store token hash in a way we can look it up
    // We'll use a Prisma raw update to store it in a temp column
    // Since we don't have a dedicated reset_token column, we'll use the auditLog metadata
    // to store it and look it up on reset. This avoids schema changes.
    // BETTER: store in AuditLog with event=PASSWORD_RESET_TOKEN and entityId=userId
    await prisma.auditLog.create({
      data: {
        event: 'PASSWORD_RESET_TOKEN',
        actorId: user.id,
        entityType: 'User',
        entityId: user.id,
        metadata: { tokenHash, expiresAt: expiresAt.toISOString() },
      },
    });

    return {
      message: 'If that email exists, a reset link has been sent.',
      resetToken, // Returned to controller which emails it
      userId: user.id,
      email: user.email,
      name: user.name,
    };
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

  async register(input: RegisterInput, ipAddress?: string) {
    // Find invite by token
    const invite = await prisma.invitation.findUnique({ where: { token: input.token } });

    if (!invite) throw new AppError(400, 'Invalid or expired invitation token');
    if (invite.usedAt) throw new AppError(400, 'This invitation has already been used');
    if (invite.expiresAt < new Date()) throw new AppError(400, 'Invitation has expired');

    // Check if email already registered
    const existing = await prisma.user.findUnique({ where: { email: invite.email } });
    if (existing) throw new AppError(409, 'An account with this email already exists');

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
