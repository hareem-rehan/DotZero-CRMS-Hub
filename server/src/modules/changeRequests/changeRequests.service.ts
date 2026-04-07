import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../utils/auditLog';
import { uploadToS3 } from '../../utils/fileUpload';
import { sendEmail } from '../../utils/email';
import { ALLOWED_TRANSITIONS } from './changeRequests.validation';
import type { CreateCRInput, UpdateCRInput } from './changeRequests.validation';

// ─── CR number generation ─────────────────────────────────────────────────────
// Atomically increment project.crSequence and return the new crNumber

const generateCRNumber = async (projectId: string): Promise<{ crNumber: string; project: { code: string; name: string; assignedDmId: string | null; hourlyRate: unknown; showRateToDm: boolean } }> => {
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { crSequence: { increment: 1 } },
    select: { code: true, name: true, crSequence: true, assignedDmId: true, hourlyRate: true, showRateToDm: true },
  });
  const crNumber = `${project.code}-CO-${String(project.crSequence).padStart(3, '0')}`;
  return { crNumber, project };
};

// ─── Status transition guard ──────────────────────────────────────────────────

const assertTransition = (from: string, to: string) => {
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(403, `Cannot transition from ${from} to ${to}`);
  }
};

// ─── Scope helpers ────────────────────────────────────────────────────────────

const getPOScope = async (userId: string) => {
  const assignments = await prisma.projectUser.findMany({
    where: { userId },
    select: { projectId: true },
  });
  return assignments.map((a) => a.projectId);
};

// ─── List ─────────────────────────────────────────────────────────────────────

export const listCRs = async (
  actorId: string,
  actorRole: string,
  query: {
    projectId?: string;
    status?: string;
    changeType?: string;
    priority?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  },
) => {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, query.pageSize ?? 20);
  const skip = (page - 1) * pageSize;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  // Role-based scoping
  if (actorRole === 'PRODUCT_OWNER') {
    const projectIds = await getPOScope(actorId);
    where.projectId = { in: projectIds };
    where.submittedById = actorId; // PO only sees their own CRs
  } else if (actorRole === 'DELIVERY_MANAGER') {
    const assignments = await prisma.projectUser.findMany({
      where: { userId: actorId },
      select: { projectId: true },
    });
    where.projectId = { in: assignments.map((a) => a.projectId) };
    where.status = { in: ['SUBMITTED', 'UNDER_REVIEW', 'ESTIMATED', 'RESUBMITTED'] };
  } else if (actorRole === 'FINANCE') {
    where.status = { in: ['APPROVED', 'IN_PROGRESS', 'COMPLETED'] };
  }
  // SUPER_ADMIN: no restriction

  if (query.projectId) where.projectId = query.projectId;
  if (query.status) where.status = query.status;
  if (query.changeType) where.changeType = query.changeType;
  if (query.priority) where.priority = query.priority;
  if (query.search) {
    where.OR = [
      { crNumber: { contains: query.search, mode: 'insensitive' } },
      { title: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [crs, total] = await Promise.all([
    prisma.changeRequest.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
      include: {
        project: { select: { id: true, name: true, code: true } },
        submittedBy: { select: { id: true, name: true } },
        _count: { select: { attachments: true } },
      },
    }),
    prisma.changeRequest.count({ where }),
  ]);

  return { crs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
};

// ─── Detail ───────────────────────────────────────────────────────────────────

export const getCRById = async (id: string, actorId: string, actorRole: string) => {
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true, code: true, hourlyRate: true, currency: true, assignedDmId: true, showRateToDm: true } },
      submittedBy: { select: { id: true, name: true, email: true } },
      attachments: true,
      impactAnalysis: true,
      approval: true,
      statusHistory: { orderBy: { changedAt: 'asc' }, include: { changedBy: { select: { id: true, name: true } } } },
      internalNotes: actorRole === 'PRODUCT_OWNER' ? false : {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });

  if (!cr) return null;

  // Scope checks
  if (actorRole === 'PRODUCT_OWNER' && cr.submittedById !== actorId) {
    throw new AppError(403, 'Access denied');
  }

  // Strip financial data from DM responses
  if (actorRole === 'DELIVERY_MANAGER') {
    const { impactAnalysis, ...rest } = cr;
    return {
      ...rest,
      project: { ...cr.project, hourlyRate: undefined, showRateToDm: cr.project.showRateToDm },
      impactAnalysis: impactAnalysis ? {
        id: impactAnalysis.id,
        changeRequestId: impactAnalysis.changeRequestId,
        dmId: impactAnalysis.dmId,
        estimatedHours: impactAnalysis.estimatedHours,
        timelineImpact: impactAnalysis.timelineImpact,
        affectedDeliverables: impactAnalysis.affectedDeliverables,
        revisedMilestones: impactAnalysis.revisedMilestones,
        resourcesRequired: impactAnalysis.resourcesRequired,
        recommendation: impactAnalysis.recommendation,
        isDraft: impactAnalysis.isDraft,
        // totalCost intentionally omitted — calculated from hours × rate, never sent to DM
      } : null,
    };
  }

  // Calculate totalCost for SA/Finance (hours × hourlyRate)
  if (cr.impactAnalysis && (actorRole === 'SUPER_ADMIN' || actorRole === 'FINANCE')) {
    const hours = Number(cr.impactAnalysis.estimatedHours);
    const rate = Number(cr.project.hourlyRate);
    return { ...cr, impactAnalysis: { ...cr.impactAnalysis, totalCost: hours * rate } };
  }

  return cr;
};

// ─── Create draft ─────────────────────────────────────────────────────────────

export const createCR = async (
  input: CreateCRInput,
  actorId: string,
  files?: Express.Multer.File[],
) => {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { id: true, status: true, sowReference: true, clientName: true },
  });
  if (!project) throw new AppError(404, 'Project not found');
  if (project.status === 'ARCHIVED') throw new AppError(400, 'Cannot create CR for an archived project');

  // Verify PO is assigned to this project
  const assignment = await prisma.projectUser.findUnique({
    where: { projectId_userId: { projectId: input.projectId, userId: actorId } },
  });
  if (!assignment) throw new AppError(403, 'You are not assigned to this project');

  const { crNumber } = await generateCRNumber(input.projectId);

  const cr = await prisma.changeRequest.create({
    data: {
      crNumber,
      projectId: input.projectId,
      submittedById: actorId,
      title: input.title,
      description: input.description ?? '',
      businessJustification: input.businessJustification ?? '',
      priority: input.priority ?? 'MEDIUM',
      changeType: input.changeType ?? 'SCOPE',
      requestingParty: input.requestingParty ?? project.clientName,
      sowRef: input.sowRef ?? project.sowReference ?? null,
      status: 'DRAFT',
    },
  });

  if (files && files.length > 0) {
    const uploads = await Promise.all(files.map((f) => uploadToS3(f, `crs/${cr.id}`)));
    await prisma.cRAttachment.createMany({
      data: uploads.map((u) => ({
        changeRequestId: cr.id,
        fileName: u.fileName,
        fileUrl: u.url,
        fileSize: u.fileSize,
        mimeType: u.mimeType,
      })),
    });
  }

  await createAuditLog({
    event: 'CR_CREATED',
    actorId,
    entityType: 'ChangeRequest',
    entityId: cr.id,
    metadata: { crNumber, projectId: input.projectId },
  });

  return cr;
};

// ─── Update draft ─────────────────────────────────────────────────────────────

export const updateCR = async (
  id: string,
  input: UpdateCRInput,
  actorId: string,
  actorRole: string,
  files?: Express.Multer.File[],
) => {
  const cr = await prisma.changeRequest.findUnique({ where: { id } });
  if (!cr) throw new AppError(404, 'Change request not found');
  if (cr.status !== 'DRAFT') throw new AppError(400, 'Only DRAFT change requests can be updated');
  if (actorRole === 'PRODUCT_OWNER' && cr.submittedById !== actorId) throw new AppError(403, 'Access denied');

  const updated = await prisma.changeRequest.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.businessJustification !== undefined && { businessJustification: input.businessJustification }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.changeType !== undefined && { changeType: input.changeType }),
      ...(input.requestingParty !== undefined && { requestingParty: input.requestingParty }),
      ...(input.sowRef !== undefined && { sowRef: input.sowRef }),
    },
  });

  if (files && files.length > 0) {
    const uploads = await Promise.all(files.map((f) => uploadToS3(f, `crs/${id}`)));
    await prisma.cRAttachment.createMany({
      data: uploads.map((u) => ({
        changeRequestId: id,
        fileName: u.fileName,
        fileUrl: u.url,
        fileSize: u.fileSize,
        mimeType: u.mimeType,
      })),
    });
  }

  return updated;
};

// ─── Submit ───────────────────────────────────────────────────────────────────

export const submitCR = async (id: string, actorId: string) => {
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    include: {
      project: { select: { assignedDmId: true, name: true } },
    },
  });
  if (!cr) throw new AppError(404, 'Change request not found');
  if (cr.submittedById !== actorId) throw new AppError(403, 'Access denied');

  assertTransition(cr.status, 'SUBMITTED');

  // Validate required fields
  const errors: string[] = [];
  if (!cr.description?.trim()) errors.push('Description is required');
  if (!cr.businessJustification?.trim()) errors.push('Business justification is required');
  if (!cr.priority) errors.push('Priority is required');
  if (!cr.changeType) errors.push('Change type is required');
  if (errors.length > 0) throw new AppError(400, errors.join('; '));

  const [updated] = await prisma.$transaction([
    prisma.changeRequest.update({
      where: { id },
      data: { status: 'SUBMITTED', dateOfRequest: new Date() },
    }),
    prisma.statusHistory.create({
      data: {
        changeRequestId: id,
        fromStatus: cr.status as never,
        toStatus: 'SUBMITTED',
        changedById: actorId,
      },
    }),
  ]);

  await createAuditLog({
    event: 'CR_SUBMITTED',
    actorId,
    entityType: 'ChangeRequest',
    entityId: id,
    metadata: { crNumber: cr.crNumber },
  });

  // Email assigned DM
  if (cr.project.assignedDmId) {
    const dm = await prisma.user.findUnique({
      where: { id: cr.project.assignedDmId },
      select: { email: true, name: true },
    });
    if (dm) {
      await sendEmail(
        dm.email,
        `New Change Request Submitted — ${cr.crNumber}`,
        `<p>Hi ${dm.name},</p>
         <p>A new change request <strong>${cr.crNumber}</strong> has been submitted for project <strong>${cr.project.name}</strong>.</p>
         <p>Please log in to the DotZero CR Portal to review and estimate.</p>`,
      );
    }
  }

  return updated;
};
