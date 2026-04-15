import crypto from 'crypto';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../utils/auditLog';
import { sendEmail } from '../../utils/email';
import { inviteEmail, projectAssignedEmail } from '../../utils/emailTemplates';
import type { CreateInvitationInput } from './invitations.validation';

const INVITE_TOKEN_EXPIRY_MS = 72 * 60 * 60 * 1000; // 72 hours

export const sendInvitation = async (input: CreateInvitationInput, actorId: string) => {
  // Check project exists
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { id: true, name: true, status: true },
  });
  if (!project) throw new AppError(404, 'Project not found');
  if (project.status === 'ARCHIVED')
    throw new AppError(400, 'Cannot invite to an archived project');

  const rawToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_TOKEN_EXPIRY_MS);

  // Wrap check+insert in a serializable transaction to prevent duplicate invitations
  // from concurrent requests
  let invitation: Awaited<ReturnType<typeof prisma.invitation.create>>;
  try {
    invitation = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.invitation.findFirst({
          where: {
            email: input.email,
            projectId: input.projectId,
            usedAt: null,
            expiresAt: { gt: new Date() },
          },
        });
        if (existing)
          throw new AppError(409, 'An active invitation already exists for this email and project');

        return tx.invitation.create({
          data: {
            email: input.email,
            projectId: input.projectId,
            role: input.role,
            token: rawToken,
            expiresAt,
            sentById: actorId,
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  } catch (err) {
    // Re-throw AppError directly; wrap unexpected DB errors
    if (err instanceof AppError) throw err;
    throw new AppError(409, 'An active invitation already exists for this email and project');
  }

  const registerLink = `${env.CLIENT_URL}/register?token=${rawToken}`;

  const tpl = inviteEmail(input.email, registerLink, project.name);
  await sendEmail(input.email, tpl.subject, tpl.html);

  await createAuditLog({
    event: 'INVITATION_SENT',
    actorId,
    entityType: 'Invitation',
    entityId: invitation.id,
    metadata: { email: input.email, projectId: input.projectId, role: input.role },
  });

  return { message: 'Invitation sent successfully.', invitationId: invitation.id };
};

/**
 * Assign a PRODUCT_OWNER to a project silently — handles two cases:
 * 1. User already registered → create ProjectUser assignment directly (no invite needed)
 * 2. User not yet registered → send invitation so they can register and get assigned
 *
 * Skips silently if:
 * - active invitation already pending for this email + project
 * - user already assigned to this project
 */
export const sendInvitationIfNotExists = async (
  email: string,
  projectId: string,
  actorId: string,
): Promise<void> => {
  // Case 1: User already exists as a PRODUCT_OWNER
  const existingUser = await prisma.user.findFirst({ where: { email, role: 'PRODUCT_OWNER' } });
  if (existingUser) {
    const assignment = await prisma.projectUser.findUnique({
      where: { projectId_userId: { projectId, userId: existingUser.id } },
    });
    if (assignment) return; // Already assigned — nothing to do

    // Registered PO not yet on this project → assign directly, no invitation needed
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });

    await prisma.projectUser.create({ data: { projectId, userId: existingUser.id } });

    await createAuditLog({
      event: 'PROJECT_MEMBER_ADDED',
      actorId,
      entityType: 'Project',
      entityId: projectId,
      metadata: { email, userId: existingUser.id, method: 'auto-assign' },
    });

    // Notify the PO that a new project has been assigned to them
    if (project) {
      const newCrUrl = `${env.CLIENT_URL}/login?redirect=${encodeURIComponent('/client/my-crs/new')}`;
      const tpl = projectAssignedEmail(existingUser.name, project.name, newCrUrl);
      await sendEmail(existingUser.email, tpl.subject, tpl.html).catch(() => {});
    }

    return;
  }

  // Case 2: User not yet registered — skip if active invitation already pending
  const existingInvite = await prisma.invitation.findFirst({
    where: { email, projectId, usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (existingInvite) return;

  await sendInvitation({ email, projectId, role: 'PRODUCT_OWNER' }, actorId);
};

export const listInvitations = async (projectId?: string) => {
  return prisma.invitation.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      project: { select: { id: true, name: true, code: true } },
      sentBy: { select: { id: true, name: true } },
    },
  });
};

export const resendInvitation = async (id: string, actorId: string) => {
  const invitation = await prisma.invitation.findUnique({
    where: { id },
    include: { project: { select: { name: true } } },
  });
  if (!invitation) throw new AppError(404, 'Invitation not found');
  if (invitation.usedAt) throw new AppError(400, 'This invitation has already been used');

  // Regenerate token + extend expiry
  const rawToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_TOKEN_EXPIRY_MS);

  await prisma.invitation.update({
    where: { id },
    data: { token: rawToken, expiresAt },
  });

  const registerLink = `${env.CLIENT_URL}/register?token=${rawToken}`;
  const tpl = inviteEmail(invitation.email, registerLink, invitation.project.name);
  await sendEmail(invitation.email, tpl.subject, tpl.html);

  await createAuditLog({
    event: 'INVITATION_RESENT',
    actorId,
    entityType: 'Invitation',
    entityId: id,
    metadata: { email: invitation.email },
  });

  return { message: 'Invitation resent.', token: rawToken };
};
