import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../utils/auditLog';
import { uploadToS3 } from '../../utils/fileUpload';
import { sendEmail } from '../../utils/email';
import {
  crSubmittedEmail,
  crApprovedEmail,
  crDeclinedEmail,
  crResubmittedEmail,
  statusChangedEmail,
} from '../../utils/emailTemplates';
import { ALLOWED_TRANSITIONS } from './changeRequests.validation';

import type { CreateCRInput, UpdateCRInput } from './changeRequests.validation';

// ─── CR number generation ─────────────────────────────────────────────────────
// Atomically increment project.crSequence and return the new crNumber

const generateCRNumber = async (
  projectId: string,
): Promise<{
  crNumber: string;
  project: {
    code: string;
    name: string;
    assignedDmId: string | null;
    hourlyRate: unknown;
    showRateToDm: boolean;
  };
}> => {
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { crSequence: { increment: 1 } },
    select: {
      code: true,
      name: true,
      crSequence: true,
      assignedDmId: true,
      hourlyRate: true,
      showRateToDm: true,
    },
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
    const [assignments, assignedProjects] = await Promise.all([
      prisma.projectUser.findMany({
        where: { userId: actorId },
        select: { projectId: true },
      }),
      prisma.project.findMany({
        where: { assignedDmId: actorId },
        select: { id: true },
      }),
    ]);
    const projectIds = [
      ...new Set([...assignments.map((a) => a.projectId), ...assignedProjects.map((p) => p.id)]),
    ];
    where.projectId = { in: projectIds };
    // No status restriction — DM All CRs shows full history across all statuses
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
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          hourlyRate: true,
          currency: true,
          assignedDmId: true,
          showRateToDm: true,
        },
      },
      submittedBy: { select: { id: true, name: true, email: true } },
      attachments: true,
      impactAnalysis: { include: { dm: { select: { id: true, name: true } } } },
      approval: true,
      statusHistory: {
        orderBy: { changedAt: 'asc' },
        include: { changedBy: { select: { id: true, name: true, role: true } } },
      },
      internalNotes:
        actorRole === 'PRODUCT_OWNER'
          ? false
          : {
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

  // Auto-transition SUBMITTED → UNDER_REVIEW when DM first opens the CR
  if (actorRole === 'DELIVERY_MANAGER' && cr.status === 'SUBMITTED') {
    await prisma.$transaction([
      prisma.changeRequest.update({ where: { id }, data: { status: 'UNDER_REVIEW' } }),
      prisma.statusHistory.create({
        data: {
          changeRequestId: id,
          fromStatus: 'SUBMITTED',
          toStatus: 'UNDER_REVIEW',
          changedById: actorId,
        },
      }),
    ]);
    await createAuditLog({
      event: 'CR_UNDER_REVIEW',
      actorId,
      entityType: 'ChangeRequest',
      entityId: id,
    });
    cr.status = 'UNDER_REVIEW';
  }

  // Strip financial data from DM responses
  if (actorRole === 'DELIVERY_MANAGER') {
    const { impactAnalysis, ...rest } = cr;
    return {
      ...rest,
      project: { ...cr.project, hourlyRate: undefined, showRateToDm: cr.project.showRateToDm },
      impactAnalysis: impactAnalysis
        ? {
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
          }
        : null,
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
  if (project.status === 'ARCHIVED')
    throw new AppError(400, 'Cannot create CR for an archived project');

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
  if (actorRole === 'PRODUCT_OWNER' && cr.submittedById !== actorId)
    throw new AppError(403, 'Access denied');

  const updated = await prisma.changeRequest.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.businessJustification !== undefined && {
        businessJustification: input.businessJustification,
      }),
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

// ─── Approve ──────────────────────────────────────────────────────────────────

export const approveCR = async (
  id: string,
  actorId: string,
  actorRole: string,
  poSignature: string,
  approvalNotes?: string,
) => {
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    include: {
      project: { select: { name: true, hourlyRate: true, assignedDmId: true } },
      impactAnalysis: { select: { estimatedHours: true } },
      submittedBy: { select: { id: true } },
    },
  });
  if (!cr) throw new AppError(404, 'Change request not found');
  if (actorRole === 'PRODUCT_OWNER' && cr.submittedById !== actorId)
    throw new AppError(403, 'Access denied');
  assertTransition(cr.status, 'APPROVED');
  if (!poSignature?.trim()) throw new AppError(400, 'PO signature is required to approve');

  // Compute totalCost (stored for SA/Finance) = estimatedHours × hourlyRate
  const totalCost = cr.impactAnalysis
    ? Number(cr.impactAnalysis.estimatedHours) * Number(cr.project.hourlyRate)
    : null;

  await prisma.$transaction([
    prisma.changeRequest.update({
      where: { id },
      data: { status: 'APPROVED' },
    }),
    prisma.cRApproval.create({
      data: {
        changeRequestId: id,
        approvedById: actorId,
        poSignature,
        approvalNotes: approvalNotes ?? null,
      },
    }),
    prisma.statusHistory.create({
      data: {
        changeRequestId: id,
        fromStatus: cr.status as never,
        toStatus: 'APPROVED',
        changedById: actorId,
        reason: approvalNotes ?? null,
      },
    }),
  ]);

  await createAuditLog({
    event: 'CR_APPROVED',
    actorId,
    entityType: 'ChangeRequest',
    entityId: id,
    metadata: { crNumber: cr.crNumber, totalCost },
  });

  // Email DM
  if (cr.project.assignedDmId) {
    const dm = await prisma.user.findUnique({
      where: { id: cr.project.assignedDmId },
      select: { email: true, name: true, notifyOnCrApproved: true },
    });
    if (dm?.notifyOnCrApproved) {
      const tpl = crApprovedEmail(dm.name, cr.crNumber, cr.project.name, approvalNotes);
      await sendEmail(dm.email, tpl.subject, tpl.html).catch(() => {});
    }
  }

  return prisma.changeRequest.findUnique({ where: { id }, include: { approval: true } });
};

// ─── Decline ──────────────────────────────────────────────────────────────────

export const declineCR = async (
  id: string,
  actorId: string,
  actorRole: string,
  declineNotes: string,
) => {
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    include: {
      project: { select: { name: true, assignedDmId: true } },
      submittedBy: { select: { id: true } },
    },
  });
  if (!cr) throw new AppError(404, 'Change request not found');
  if (actorRole === 'PRODUCT_OWNER' && cr.submittedById !== actorId)
    throw new AppError(403, 'Access denied');
  assertTransition(cr.status, 'DECLINED');
  if (!declineNotes?.trim()) throw new AppError(400, 'Decline notes are required');

  await prisma.$transaction([
    prisma.changeRequest.update({ where: { id }, data: { status: 'DECLINED' } }),
    prisma.statusHistory.create({
      data: {
        changeRequestId: id,
        fromStatus: cr.status as never,
        toStatus: 'DECLINED',
        changedById: actorId,
        reason: declineNotes,
      },
    }),
  ]);

  await createAuditLog({
    event: 'CR_DECLINED',
    actorId,
    entityType: 'ChangeRequest',
    entityId: id,
    metadata: { crNumber: cr.crNumber },
  });

  // Email DM with reason
  if (cr.project.assignedDmId) {
    const dm = await prisma.user.findUnique({
      where: { id: cr.project.assignedDmId },
      select: { email: true, name: true, notifyOnCrDeclined: true },
    });
    if (dm?.notifyOnCrDeclined) {
      const tpl = crDeclinedEmail(dm.name, cr.crNumber, cr.project.name, declineNotes);
      await sendEmail(dm.email, tpl.subject, tpl.html).catch(() => {});
    }
  }

  return prisma.changeRequest.findUnique({ where: { id } });
};

// ─── Defer ────────────────────────────────────────────────────────────────────

export const deferCR = async (
  id: string,
  actorId: string,
  actorRole: string,
  deferReason: string,
) => {
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    include: {
      project: { select: { name: true, assignedDmId: true } },
      submittedBy: { select: { id: true } },
    },
  });
  if (!cr) throw new AppError(404, 'Change request not found');
  if (actorRole === 'PRODUCT_OWNER' && cr.submittedById !== actorId)
    throw new AppError(403, 'Access denied');
  assertTransition(cr.status, 'DEFERRED');
  if (!deferReason?.trim()) throw new AppError(400, 'Defer reason is required');

  await prisma.$transaction([
    prisma.changeRequest.update({ where: { id }, data: { status: 'DEFERRED' } }),
    prisma.statusHistory.create({
      data: {
        changeRequestId: id,
        fromStatus: cr.status as never,
        toStatus: 'DEFERRED',
        changedById: actorId,
        reason: deferReason,
      },
    }),
  ]);

  await createAuditLog({
    event: 'CR_DEFERRED',
    actorId,
    entityType: 'ChangeRequest',
    entityId: id,
    metadata: { crNumber: cr.crNumber },
  });

  return prisma.changeRequest.findUnique({ where: { id } });
};

// ─── Resubmit ─────────────────────────────────────────────────────────────────

export const resubmitCR = async (
  id: string,
  actorId: string,
  actorRole: string,
  input: UpdateCRInput,
) => {
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    include: {
      project: { select: { name: true, assignedDmId: true } },
      submittedBy: { select: { id: true } },
      impactAnalysis: true,
      attachments: true,
    },
  });
  if (!cr) throw new AppError(404, 'Change request not found');
  if (actorRole === 'PRODUCT_OWNER') {
    const projectIds = await getPOScope(actorId);
    if (!projectIds.includes(cr.projectId)) throw new AppError(403, 'Access denied');
  }
  assertTransition(cr.status, 'RESUBMITTED');

  const newVersion = cr.version + 1;

  // Snapshot the current CR state before editing
  const snapshot = {
    version: cr.version,
    title: cr.title,
    description: cr.description,
    businessJustification: cr.businessJustification,
    priority: cr.priority,
    changeType: cr.changeType,
    requestingParty: cr.requestingParty,
    sowRef: cr.sowRef,
    status: cr.status,
    impactAnalysis: cr.impactAnalysis,
    attachments: cr.attachments,
    snapshotAt: new Date().toISOString(),
  };

  await prisma.$transaction([
    prisma.cRVersion.create({
      data: {
        changeRequestId: id,
        versionNumber: cr.version,
        snapshotJson: snapshot,
        createdById: actorId,
      },
    }),
    prisma.changeRequest.update({
      where: { id },
      data: {
        status: 'RESUBMITTED',
        version: newVersion,
        dateOfRequest: new Date(),
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.businessJustification !== undefined && {
          businessJustification: input.businessJustification,
        }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.changeType !== undefined && { changeType: input.changeType }),
        ...(input.requestingParty !== undefined && { requestingParty: input.requestingParty }),
        ...(input.sowRef !== undefined && { sowRef: input.sowRef }),
      },
    }),
    prisma.statusHistory.create({
      data: {
        changeRequestId: id,
        fromStatus: cr.status as never,
        toStatus: 'RESUBMITTED',
        changedById: actorId,
      },
    }),
  ]);

  await createAuditLog({
    event: 'CR_RESUBMITTED',
    actorId,
    entityType: 'ChangeRequest',
    entityId: id,
    metadata: { crNumber: cr.crNumber, newVersion },
  });

  // Email DM
  if (cr.project.assignedDmId) {
    const dm = await prisma.user.findUnique({
      where: { id: cr.project.assignedDmId },
      select: { email: true, name: true, notifyOnCrSubmitted: true },
    });
    if (dm?.notifyOnCrSubmitted) {
      const tpl = crResubmittedEmail(dm.name, cr.crNumber, cr.project.name, newVersion, id);
      await sendEmail(dm.email, tpl.subject, tpl.html).catch(() => {});
    }
  }

  return prisma.changeRequest.findUnique({ where: { id } });
};

// ─── Cancel ───────────────────────────────────────────────────────────────────

export const cancelCR = async (id: string, actorId: string, actorRole: string, reason?: string) => {
  const cr = await prisma.changeRequest.findUnique({ where: { id } });
  if (!cr) throw new AppError(404, 'Change request not found');
  if (actorRole === 'PRODUCT_OWNER' && cr.submittedById !== actorId)
    throw new AppError(403, 'Access denied');
  assertTransition(cr.status, 'CANCELLED');

  await prisma.$transaction([
    prisma.changeRequest.update({ where: { id }, data: { status: 'CANCELLED' } }),
    prisma.statusHistory.create({
      data: {
        changeRequestId: id,
        fromStatus: cr.status as never,
        toStatus: 'CANCELLED',
        changedById: actorId,
        reason: reason ?? null,
      },
    }),
  ]);

  await createAuditLog({
    event: 'CR_CANCELLED',
    actorId,
    entityType: 'ChangeRequest',
    entityId: id,
    metadata: { crNumber: cr.crNumber },
  });

  return prisma.changeRequest.findUnique({ where: { id } });
};

// ─── Versions ─────────────────────────────────────────────────────────────────

export const getCRVersions = async (id: string, actorId: string, actorRole: string) => {
  const cr = await prisma.changeRequest.findUnique({ where: { id } });
  if (!cr) throw new AppError(404, 'Change request not found');
  if (actorRole === 'PRODUCT_OWNER' && cr.submittedById !== actorId)
    throw new AppError(403, 'Access denied');

  return prisma.cRVersion.findMany({
    where: { changeRequestId: id },
    orderBy: { versionNumber: 'asc' },
    include: { createdBy: { select: { id: true, name: true } } },
  });
};

// ─── Internal notes ───────────────────────────────────────────────────────────

export const addInternalNote = async (
  crId: string,
  actorId: string,
  actorRole: string,
  content: string,
) => {
  const cr = await prisma.changeRequest.findUnique({ where: { id: crId } });
  if (!cr) throw new AppError(404, 'Change request not found');
  if (!['DELIVERY_MANAGER', 'SUPER_ADMIN'].includes(actorRole))
    throw new AppError(403, 'Access denied');
  if (!content?.trim()) throw new AppError(400, 'Note content is required');

  const note = await prisma.internalNote.create({
    data: { changeRequestId: crId, authorId: actorId, content: content.trim() },
    include: { author: { select: { id: true, name: true } } },
  });
  return note;
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
      const tpl = crSubmittedEmail(dm.name, cr.crNumber, cr.project.name, id);
      await sendEmail(dm.email, tpl.subject, tpl.html).catch(() => {});
    }
  }

  // Trigger #8 — notify PO of status change
  {
    const po = await prisma.user.findUnique({
      where: { id: cr.submittedById },
      select: { id: true, name: true, notifyOnCrSubmitted: true },
    });
    if (po?.notifyOnCrSubmitted) {
      const tpl = statusChangedEmail(
        po.name,
        cr.crNumber,
        cr.project.name,
        'SUBMITTED',
        id,
        'PRODUCT_OWNER',
      );
      await sendEmail(
        (await prisma.user.findUnique({ where: { id: po.id }, select: { email: true } }))!.email,
        tpl.subject,
        tpl.html,
      ).catch(() => {});
    }
  }

  return updated;
};
