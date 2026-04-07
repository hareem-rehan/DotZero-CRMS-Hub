import crypto from 'crypto';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../utils/auditLog';
import { sendEmail } from '../../utils/email';
import type { CreateInvitationInput } from './invitations.validation';

const INVITE_TOKEN_EXPIRY_MS = 72 * 60 * 60 * 1000; // 72 hours

export const sendInvitation = async (input: CreateInvitationInput, actorId: string) => {
  // Check project exists
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { id: true, name: true, status: true },
  });
  if (!project) throw new AppError(404, 'Project not found');
  if (project.status === 'ARCHIVED') throw new AppError(400, 'Cannot invite to an archived project');

  // Check for pending (unused, unexpired) invitation for same email+project
  const existing = await prisma.invitation.findFirst({
    where: {
      email: input.email,
      projectId: input.projectId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (existing) throw new AppError(409, 'An active invitation already exists for this email and project');

  const rawToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_TOKEN_EXPIRY_MS);

  const invitation = await prisma.invitation.create({
    data: {
      email: input.email,
      projectId: input.projectId,
      role: input.role,
      token: rawToken,
      expiresAt,
      sentById: actorId,
    },
  });

  const registerLink = `${env.CLIENT_URL}/register?token=${rawToken}`;

  await sendEmail(
    input.email,
    `You're invited to the DotZero CR Portal — ${project.name}`,
    `<p>You have been invited to access the DotZero CR Portal for project <strong>${project.name}</strong>.</p>
     <p>Click the link below to create your account:</p>
     <p><a href="${registerLink}">Accept Invitation</a></p>
     <p>This invitation expires in 72 hours.</p>`,
  );

  await createAuditLog({
    event: 'INVITATION_SENT',
    actorId,
    entityType: 'Invitation',
    entityId: invitation.id,
    metadata: { email: input.email, projectId: input.projectId, role: input.role },
  });

  return { message: 'Invitation sent successfully.', invitationId: invitation.id };
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
