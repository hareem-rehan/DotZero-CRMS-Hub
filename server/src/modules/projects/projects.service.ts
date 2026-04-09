import crypto from 'crypto';
import { prisma } from '../../config/db';
import { createAuditLog } from '../../utils/auditLog';
import { uploadToS3 } from '../../utils/fileUpload';
import { sendEmail } from '../../utils/email';
import { dmAssignedEmail } from '../../utils/emailTemplates';
import { sendInvitationIfNotExists } from '../invitations/invitations.service';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import type { CreateProjectInput, UpdateProjectInput } from './projects.validation';

// ─── Auto-generate project code ──────────────────────────────────────────────

const generateCode = async (): Promise<string> => {
  const count = await prisma.project.count();
  const base = `PROJ${String(count + 1).padStart(3, '0')}`;
  const existing = await prisma.project.findUnique({ where: { code: base } });
  if (existing) return `PROJ${String(count + 100).padStart(3, '0')}`;
  return base;
};

// ─── List ─────────────────────────────────────────────────────────────────────

export const listProjects = async (query: {
  status?: string;
  search?: string;
  clientName?: string;
  page?: number;
  pageSize?: number;
}) => {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, query.pageSize ?? 20);
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;
  if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
  if (query.clientName) where.clientName = { contains: query.clientName, mode: 'insensitive' };

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedDm: { select: { id: true, name: true, email: true } },
        _count: { select: { changeRequests: true, userAssignments: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return { projects, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
};

// ─── Detail ───────────────────────────────────────────────────────────────────

export const getProjectById = async (id: string) => {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      assignedDm: { select: { id: true, name: true, email: true, role: true } },
      userAssignments: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
        },
      },
      attachments: true,
      _count: { select: { changeRequests: true } },
    },
  });

  if (!project) return null;

  const approvedHoursResult = await prisma.impactAnalysis.aggregate({
    where: { changeRequest: { projectId: id, status: 'APPROVED' } },
    _sum: { estimatedHours: true },
  });

  const totalApprovedHours = Number(approvedHoursResult._sum?.estimatedHours ?? 0);
  const totalApprovedCost = totalApprovedHours * Number(project.hourlyRate);

  return { ...project, totalApprovedHours, totalApprovedCost };
};

// ─── Distinct client names (for filter dropdown) ──────────────────────────────

export const getClientNames = async (): Promise<string[]> => {
  const results = await prisma.project.findMany({
    select: { clientName: true },
    distinct: ['clientName'],
    orderBy: { clientName: 'asc' },
  });
  return results.map((r) => r.clientName);
};

// ─── Create ───────────────────────────────────────────────────────────────────

export const createProject = async (
  input: CreateProjectInput,
  actorId: string,
  files?: Express.Multer.File[],
) => {
  const code = input.code ?? (await generateCode());

  const existing = await prisma.project.findUnique({ where: { code } });
  if (existing) {
    throw Object.assign(new Error(`Project code "${code}" is already in use`), { statusCode: 409 });
  }

  const project = await prisma.project.create({
    data: {
      name: input.name,
      clientName: input.clientName,
      code,
      hourlyRate: input.hourlyRate,
      currency: input.currency ?? 'USD',
      status: input.status ?? 'ACTIVE',
      startDate: input.startDate ? new Date(input.startDate) : null,
      assignedDmId: input.assignedDmId ?? null,
      showRateToDm: input.showRateToDm ?? false,
      sowReference: null,
      clientEmail: input.clientEmail ?? null,
      clientMemberEmails: input.clientMemberEmails ?? [],
    },
  });

  if (files && files.length > 0) {
    const uploads = await Promise.all(files.map((f) => uploadToS3(f, `projects/${project.id}`)));
    await prisma.projectAttachment.createMany({
      data: uploads.map((u) => ({
        projectId: project.id,
        fileName: u.fileName,
        fileUrl: u.url,
        fileSize: u.fileSize,
        mimeType: u.mimeType,
      })),
    });
  }

  await createAuditLog({
    event: 'PROJECT_CREATED',
    actorId,
    entityType: 'Project',
    entityId: project.id,
    metadata: { name: project.name, code: project.code },
  });

  // Notify assigned DM
  if (input.assignedDmId) {
    const dm = await prisma.user.findUnique({ where: { id: input.assignedDmId }, select: { email: true, name: true } });
    if (dm) {
      const tpl = dmAssignedEmail(dm.name, project.name, `${env.CLIENT_URL}/dm/pending`);
      await sendEmail(dm.email, tpl.subject, tpl.html).catch(() => {});
    }
  }

  // Auto-invite clientEmail + all clientMemberEmails as PRODUCT_OWNER
  const inviteTargets = new Set<string>();
  if (input.clientEmail) inviteTargets.add(input.clientEmail.toLowerCase());
  (input.clientMemberEmails ?? []).forEach((e) => inviteTargets.add(e.toLowerCase()));
  for (const email of inviteTargets) {
    await sendInvitationIfNotExists(email, project.id, actorId);
  }

  return project;
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateProject = async (
  id: string,
  input: UpdateProjectInput,
  actorId: string,
  files?: Express.Multer.File[],
) => {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw Object.assign(new Error('Project not found'), { statusCode: 404 });

  // Capture previous emails before update (for diff)
  const prevClientEmail = project.clientEmail ?? null;
  const prevMemberEmails = new Set<string>(
    Array.isArray(project.clientMemberEmails) ? (project.clientMemberEmails as string[]) : [],
  );

  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.clientName !== undefined && { clientName: input.clientName }),
      ...(input.hourlyRate !== undefined && { hourlyRate: input.hourlyRate }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.startDate !== undefined && { startDate: input.startDate ? new Date(input.startDate) : null }),
      ...(input.assignedDmId !== undefined && { assignedDmId: input.assignedDmId }),
      ...(input.showRateToDm !== undefined && { showRateToDm: input.showRateToDm }),
      ...(input.clientEmail !== undefined && { clientEmail: input.clientEmail }),
      ...(input.clientMemberEmails !== undefined && { clientMemberEmails: input.clientMemberEmails }),
    },
  });

  if (files && files.length > 0) {
    const uploads = await Promise.all(files.map((f) => uploadToS3(f, `projects/${id}`)));
    await prisma.projectAttachment.createMany({
      data: uploads.map((u) => ({
        projectId: id,
        fileName: u.fileName,
        fileUrl: u.url,
        fileSize: u.fileSize,
        mimeType: u.mimeType,
      })),
    });
  }

  await createAuditLog({
    event: 'PROJECT_UPDATED',
    actorId,
    entityType: 'Project',
    entityId: id,
    metadata: { changes: input },
  });

  // Notify newly assigned DM
  if (input.assignedDmId && input.assignedDmId !== project.assignedDmId) {
    const dm = await prisma.user.findUnique({ where: { id: input.assignedDmId }, select: { email: true, name: true } });
    if (dm) {
      const tpl = dmAssignedEmail(dm.name, updated.name, `${env.CLIENT_URL}/dm/pending`);
      await sendEmail(dm.email, tpl.subject, tpl.html).catch(() => {});
    }
  }

  // Auto-invite: always run sendInvitationIfNotExists for clientEmail (handles
  // re-invites after user deletion) and for newly added clientMemberEmails.
  const inviteTargets = new Set<string>();
  if (input.clientEmail) inviteTargets.add(input.clientEmail.toLowerCase());
  if (input.clientMemberEmails) {
    input.clientMemberEmails.forEach((e) => {
      if (!prevMemberEmails.has(e.toLowerCase())) inviteTargets.add(e.toLowerCase());
    });
  }
  for (const email of inviteTargets) {
    await sendInvitationIfNotExists(email, id, actorId);
  }

  return updated;
};

// ─── Archive ──────────────────────────────────────────────────────────────────

export const archiveProject = async (id: string, actorId: string) => {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw Object.assign(new Error('Project not found'), { statusCode: 404 });

  const updated = await prisma.project.update({ where: { id }, data: { status: 'ARCHIVED' } });

  await createAuditLog({
    event: 'PROJECT_ARCHIVED', actorId, entityType: 'Project', entityId: id,
    metadata: { previousStatus: project.status },
  });

  return updated;
};

export const unarchiveProject = async (id: string, actorId: string) => {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw Object.assign(new Error('Project not found'), { statusCode: 404 });

  const updated = await prisma.project.update({ where: { id }, data: { status: 'ACTIVE' } });

  await createAuditLog({ event: 'PROJECT_UNARCHIVED', actorId, entityType: 'Project', entityId: id });

  return updated;
};

// ─── Client Login Link ────────────────────────────────────────────────────────

export const generateClientLoginLinks = async (projectId: string, actorId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      userAssignments: {
        include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true } } },
      },
    },
  });

  if (!project) throw new AppError(404, 'Project not found');

  // Collect POs from userAssignments
  const assignedClients = project.userAssignments
    .map((a) => a.user)
    .filter((u) => u.role === 'PRODUCT_OWNER' && u.isActive);

  // Also try clientEmail directly (covers cases where user was re-invited but not yet in assignments)
  let clients = assignedClients;
  if (clients.length === 0 && project.clientEmail) {
    const poByEmail = await prisma.user.findUnique({
      where: { email: project.clientEmail },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    if (poByEmail && poByEmail.role === 'PRODUCT_OWNER' && poByEmail.isActive) {
      clients = [poByEmail];
    }
  }

  if (clients.length === 0) {
    // Check if there's a pending invitation for this project
    const pendingInvite = await prisma.invitation.findFirst({
      where: { projectId, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (pendingInvite) {
      throw new AppError(400, `No registered PO found. A pending invitation exists for ${pendingInvite.email} — they need to register first using the invitation link.`);
    }
    throw new AppError(404, 'No active Product Owner assigned to this project. Go to Edit Project and add the PO email to send a new invitation.');
  }

  const links = await Promise.all(
    clients.map(async (client) => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prisma.auditLog.create({
        data: {
          event: 'CLIENT_LOGIN_TOKEN',
          actorId,
          entityType: 'User',
          entityId: client.id,
          metadata: { tokenHash, expiresAt: expiresAt.toISOString() },
        },
      });

      return {
        userId: client.id,
        name: client.name,
        email: client.email,
        link: `${env.CLIENT_URL}/client-login?token=${rawToken}`,
        expiresAt: expiresAt.toISOString(),
      };
    }),
  );

  await createAuditLog({
    event: 'CLIENT_LOGIN_LINK_GENERATED',
    actorId,
    entityType: 'Project',
    entityId: projectId,
    metadata: { projectName: project.name, clientEmails: clients.map((c) => c.email) },
  });

  return links;
};

// ─── My Projects (PO / DM scoped) ────────────────────────────────────────────

export const getMyProjects = async (userId: string) => {
  const assignments = await prisma.projectUser.findMany({
    where: { userId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          currency: true,
          attachments: {
            select: { id: true, fileName: true, fileUrl: true, fileSize: true, mimeType: true },
          },
        },
      },
    },
  });

  return assignments
    .map((a) => a.project)
    .filter((p) => p.status === 'ACTIVE');
};

// ─── DM dropdown ──────────────────────────────────────────────────────────────

export const getDmDropdownUsers = async () => {
  return prisma.user.findMany({
    where: { role: { in: ['DELIVERY_MANAGER', 'SUPER_ADMIN'] }, isActive: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  });
};
