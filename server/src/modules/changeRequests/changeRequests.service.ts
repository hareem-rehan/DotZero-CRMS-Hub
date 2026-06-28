import { Decimal } from '@prisma/client/runtime/library';
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
  crCancelledEmail,
  statusChangedEmail,
  dmCRSentToClientEmail,
  clientRejectedCREmail,
  poResubmittedEditsEmail,
  dmReviewedEditsEmail,
} from '../../utils/emailTemplates';
import { ALLOWED_TRANSITIONS } from './changeRequests.validation';

import type {
  CreateCRInput,
  UpdateCRInput,
  CreateDMInitiatedCRInput,
  UpdateDMDraftInput,
  ClientConfirmInput,
  ClientReviewEditInput,
  ClientRejectInput,
  POResubmitWithEditsInput,
  DMReviewResubmitInput,
} from './changeRequests.validation';

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
    assignedToMe?: boolean;
    initiatedByDm?: boolean;
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
    // Hide DM-initiated DRAFTs — PO only sees them once DM sends them (PENDING_CLIENT_REVIEW+)
    where.NOT = { AND: [{ initiatedByDm: true }, { status: 'DRAFT' }] };
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
  // SUPER_ADMIN: no restriction, but support "My Project CRs" view
  if (actorRole === 'SUPER_ADMIN' && query.assignedToMe) {
    const [assignments, assignedProjects] = await Promise.all([
      prisma.projectUser.findMany({ where: { userId: actorId }, select: { projectId: true } }),
      prisma.project.findMany({ where: { assignedDmId: actorId }, select: { id: true } }),
    ]);
    const myProjectIds = [
      ...new Set([...assignments.map((a) => a.projectId), ...assignedProjects.map((p) => p.id)]),
    ];
    where.projectId = { in: myProjectIds };
  }

  if (query.projectId) where.projectId = query.projectId;
  if (query.status) where.status = query.status;
  if (query.changeType) where.changeType = query.changeType;
  if (query.priority) where.priority = query.priority;
  if (query.initiatedByDm !== undefined) where.initiatedByDm = query.initiatedByDm;
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
        createdByDm: { select: { id: true, name: true } },
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
      createdByDm: { select: { id: true, name: true } },
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
  // PO cannot view DM-initiated CR until DM sends it
  if (actorRole === 'PRODUCT_OWNER' && cr.initiatedByDm && cr.status === 'DRAFT') {
    throw new AppError(403, 'This CR is not ready for your review yet');
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
      impactAnalysis: { include: { dm: { select: { id: true, name: true } } } },
      attachments: true,
      statusHistory: { orderBy: { changedAt: 'desc' }, take: 10 },
    },
  });
  if (!cr) throw new AppError(404, 'Change request not found');
  if (cr.initiatedByDm) throw new AppError(400, 'DM-initiated CRs cannot be resubmitted');
  if (actorRole === 'PRODUCT_OWNER') {
    const projectIds = await getPOScope(actorId);
    if (!projectIds.includes(cr.projectId)) throw new AppError(403, 'Access denied');
  }
  assertTransition(cr.status, 'RESUBMITTED');

  // ── Resubmission limits (PO only) ──────────────────────────────────────────
  // version 1 = original, version 2 = 1st resubmission, version 3 = 2nd resubmission
  // Max 2 resubmissions (version must stay <= 3)
  const MAX_RESUBMISSIONS = 2;
  const resubmissionCount = cr.version - 1; // how many times already resubmitted
  if (resubmissionCount >= MAX_RESUBMISSIONS) {
    throw new AppError(
      400,
      `This CR has already been resubmitted ${MAX_RESUBMISSIONS} time(s). No further resubmissions are allowed.`,
    );
  }

  // 72-hour window: measured from when the CR last moved into ESTIMATED, DECLINED, or DEFERRED
  const triggerEntry = cr.statusHistory.find((h) =>
    ['ESTIMATED', 'DECLINED', 'DEFERRED'].includes(h.toStatus as string),
  );
  if (triggerEntry) {
    const hoursSinceTrigger =
      (Date.now() - new Date(triggerEntry.changedAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceTrigger > 72) {
      throw new AppError(
        400,
        `The 72-hour resubmission window has expired. This CR can no longer be resubmitted.`,
      );
    }
  }

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
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    include: { project: { select: { name: true, assignedDmId: true } } },
  });
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

  // Notify DM if the CR was in a state where DM action was pending or in progress
  const dmActionStates = ['SUBMITTED', 'UNDER_REVIEW', 'RESUBMITTED'];
  if (dmActionStates.includes(cr.status) && cr.project.assignedDmId) {
    const dm = await prisma.user.findUnique({
      where: { id: cr.project.assignedDmId },
      select: { email: true, name: true },
    });
    if (dm) {
      const tpl = crCancelledEmail(dm.name, cr.crNumber, cr.project.name, reason);
      await sendEmail(dm.email, tpl.subject, tpl.html).catch(() => {});
    }
  }

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

// ─── DM-initiated: create ─────────────────────────────────────────────────────

export const createDMInitiatedCR = async (input: CreateDMInitiatedCRInput, actorId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { id: true, status: true, sowReference: true, clientName: true, assignedDmId: true },
  });
  if (!project) throw new AppError(404, 'Project not found');
  if (project.status === 'ARCHIVED') throw new AppError(400, 'Cannot create CR for an archived project');

  // Verify actor is DM for this project (assigned or member)
  const [isDmAssigned, isMember] = await Promise.all([
    Promise.resolve(project.assignedDmId === actorId),
    prisma.projectUser.findUnique({
      where: { projectId_userId: { projectId: input.projectId, userId: actorId } },
    }),
  ]);
  if (!isDmAssigned && !isMember) throw new AppError(403, 'You are not assigned to this project');

  // Resolve the PO for this project (one PO per project)
  const poAssignment = await prisma.projectUser.findFirst({
    where: { projectId: input.projectId, user: { role: 'PRODUCT_OWNER' } },
    include: { user: { select: { id: true, name: true, email: true, notifyOnCrSubmitted: true } } },
  });
  if (!poAssignment) throw new AppError(400, 'No Product Owner is assigned to this project');

  const po = poAssignment.user;
  const { crNumber } = await generateCRNumber(input.projectId);

  const cr = await prisma.changeRequest.create({
    data: {
      crNumber,
      projectId: input.projectId,
      submittedById: po.id,
      initiatedByDm: true,
      createdByDmId: actorId,
      title: input.title,
      description: input.description ?? '',
      businessJustification: input.businessJustification ?? '',
      priority: input.priority ?? 'MEDIUM',
      changeType: input.changeType ?? 'SCOPE',
      requestingParty: input.requestingParty ?? project.clientName,
      sowRef: input.sowRef ?? project.sowReference ?? null,
      dmNotes: input.dmNotes ?? null,
      status: 'DRAFT',
    },
  });

  // Save estimation upfront (as draft — finalized when PO confirms)
  await prisma.impactAnalysis.create({
    data: {
      changeRequestId: cr.id,
      dmId: actorId,
      estimatedHours: new Decimal(input.estimatedHours),
      timelineImpact: input.timelineImpact ?? '',
      affectedDeliverables: input.affectedDeliverables ?? '',
      revisedMilestones: input.revisedMilestones ?? null,
      resourcesRequired: input.resourcesRequired ?? null,
      recommendation: input.recommendation ?? '',
      dmSignature: input.dmSignature ?? null,
      isDraft: true,
    },
  });

  await createAuditLog({
    event: 'CR_CREATED',
    actorId,
    entityType: 'ChangeRequest',
    entityId: cr.id,
    metadata: { crNumber, projectId: input.projectId, initiatedByDm: true },
  });

  return prisma.changeRequest.findUnique({
    where: { id: cr.id },
    include: { impactAnalysis: true, project: { select: { id: true, name: true, code: true } } },
  });
};

// ─── DM-initiated: update draft ──────────────────────────────────────────────

export const updateDMDraft = async (id: string, input: UpdateDMDraftInput, actorId: string) => {
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    include: { impactAnalysis: true },
  });
  if (!cr) throw new AppError(404, 'Change request not found');
  if (!cr.initiatedByDm) throw new AppError(400, 'Not a DM-initiated CR');
  if (cr.createdByDmId !== actorId) throw new AppError(403, 'Access denied');
  if (!['DRAFT', 'CLIENT_REVISION'].includes(cr.status)) throw new AppError(400, 'Only DRAFT or returned CRs can be edited');

  await prisma.changeRequest.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.businessJustification !== undefined && { businessJustification: input.businessJustification }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.changeType !== undefined && { changeType: input.changeType }),
      ...(input.requestingParty !== undefined && { requestingParty: input.requestingParty }),
      ...(input.sowRef !== undefined && { sowRef: input.sowRef }),
      ...(input.dmNotes !== undefined && { dmNotes: input.dmNotes }),
    },
  });

  // Update estimation if provided
  const hasEstimationUpdate = input.estimatedHours !== undefined || input.timelineImpact !== undefined ||
    input.affectedDeliverables !== undefined || input.revisedMilestones !== undefined ||
    input.resourcesRequired !== undefined || input.recommendation !== undefined || input.dmSignature !== undefined;

  if (hasEstimationUpdate && cr.impactAnalysis) {
    await prisma.impactAnalysis.update({
      where: { changeRequestId: id },
      data: {
        ...(input.estimatedHours !== undefined && { estimatedHours: new Decimal(input.estimatedHours) }),
        ...(input.timelineImpact !== undefined && { timelineImpact: input.timelineImpact }),
        ...(input.affectedDeliverables !== undefined && { affectedDeliverables: input.affectedDeliverables }),
        ...(input.revisedMilestones !== undefined && { revisedMilestones: input.revisedMilestones }),
        ...(input.resourcesRequired !== undefined && { resourcesRequired: input.resourcesRequired }),
        ...(input.recommendation !== undefined && { recommendation: input.recommendation }),
        ...(input.dmSignature !== undefined && { dmSignature: input.dmSignature }),
      },
    });
  }

  return prisma.changeRequest.findUnique({
    where: { id },
    include: { impactAnalysis: true, project: { select: { id: true, name: true, code: true } } },
  });
};

// ─── DM-initiated: send to client ────────────────────────────────────────────

export const sendToClient = async (id: string, actorId: string) => {
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    include: {
      impactAnalysis: true,
      project: { select: { name: true } },
      submittedBy: { select: { id: true, name: true, email: true, notifyOnCrSubmitted: true } },
    },
  });
  if (!cr) throw new AppError(404, 'Change request not found');
  if (!cr.initiatedByDm) throw new AppError(400, 'Not a DM-initiated CR');
  if (cr.createdByDmId !== actorId) throw new AppError(403, 'Only the DM who created this CR can send it');
  assertTransition(cr.status, 'PENDING_CLIENT_REVIEW');

  if (!cr.title?.trim()) throw new AppError(400, 'Title is required before sending to client');
  if (!cr.impactAnalysis) throw new AppError(400, 'Estimation is required before sending to client');
  if (!cr.impactAnalysis.estimatedHours) throw new AppError(400, 'Estimated hours are required');

  const dm = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });

  await prisma.$transaction([
    prisma.changeRequest.update({
      where: { id },
      data: { status: 'PENDING_CLIENT_REVIEW', dateOfRequest: new Date() },
    }),
    prisma.statusHistory.create({
      data: {
        changeRequestId: id,
        fromStatus: cr.status as never,
        toStatus: 'PENDING_CLIENT_REVIEW',
        changedById: actorId,
      },
    }),
  ]);

  await createAuditLog({
    event: 'CR_SENT_TO_CLIENT',
    actorId,
    entityType: 'ChangeRequest',
    entityId: id,
    metadata: { crNumber: cr.crNumber },
  });

  if (cr.submittedBy?.email) {
    const tpl = dmCRSentToClientEmail(
      cr.submittedBy.name,
      cr.crNumber,
      cr.project.name,
      id,
      dm?.name ?? 'Your DM',
    );
    await sendEmail(cr.submittedBy.email, tpl.subject, tpl.html).catch(() => {});
  }

  return prisma.changeRequest.findUnique({ where: { id } });
};

// ─── DM-initiated: client confirm ────────────────────────────────────────────

export const clientConfirmCR = async (id: string, actorId: string, input: ClientConfirmInput) => {
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    include: {
      impactAnalysis: true,
      project: { select: { name: true } },
      submittedBy: { select: { id: true } },
    },
  });
  if (!cr) throw new AppError(404, 'Change request not found');
  if (!cr.initiatedByDm) throw new AppError(400, 'Not a DM-initiated CR');
  if (cr.submittedById !== actorId) throw new AppError(403, 'Access denied');
  assertTransition(cr.status, 'ESTIMATED');

  if (!cr.impactAnalysis) throw new AppError(500, 'Estimation data is missing');

  const updateData: Record<string, unknown> = { status: 'ESTIMATED' };
  if (input.clientNotes !== undefined) updateData.clientNotes = input.clientNotes;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.businessJustification !== undefined) updateData.businessJustification = input.businessJustification;

  await prisma.$transaction([
    prisma.changeRequest.update({ where: { id }, data: updateData }),
    prisma.impactAnalysis.update({
      where: { changeRequestId: id },
      data: { isDraft: false, submittedAt: new Date() },
    }),
    prisma.statusHistory.create({
      data: {
        changeRequestId: id,
        fromStatus: 'PENDING_CLIENT_REVIEW',
        toStatus: 'ESTIMATED',
        changedById: actorId,
      },
    }),
  ]);

  await createAuditLog({
    event: 'CR_ESTIMATED',
    actorId,
    entityType: 'ChangeRequest',
    entityId: id,
    metadata: { crNumber: cr.crNumber, confirmedByClient: true },
  });

  return prisma.changeRequest.findUnique({ where: { id }, include: { impactAnalysis: true } });
};

// ─── DM-initiated: client edits description / business justification ─────────

export const clientReviewEditCR = async (id: string, actorId: string, input: ClientReviewEditInput) => {
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    select: { status: true, initiatedByDm: true, submittedById: true },
  });
  if (!cr) throw new AppError(404, 'Change request not found');
  if (!cr.initiatedByDm) throw new AppError(400, 'Not a DM-initiated CR');
  if (cr.submittedById !== actorId) throw new AppError(403, 'Access denied');
  if (cr.status !== 'PENDING_CLIENT_REVIEW')
    throw new AppError(400, 'CR is not in PENDING_CLIENT_REVIEW status');

  const updateData: Record<string, unknown> = {};
  if (input.description !== undefined) updateData.description = input.description;
  if (input.businessJustification !== undefined) updateData.businessJustification = input.businessJustification;

  return prisma.changeRequest.update({ where: { id }, data: updateData });
};

// ─── DM-initiated: client reject ─────────────────────────────────────────────

export const clientRejectCR = async (id: string, actorId: string, input: ClientRejectInput) => {
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    include: {
      project: { select: { name: true } },
      submittedBy: { select: { id: true } },
    },
  });
  if (!cr) throw new AppError(404, 'Change request not found');
  if (!cr.initiatedByDm) throw new AppError(400, 'Not a DM-initiated CR');
  if (cr.submittedById !== actorId) throw new AppError(403, 'Access denied');
  assertTransition(cr.status, 'CLIENT_REVISION');

  await prisma.$transaction([
    prisma.changeRequest.update({
      where: { id },
      data: { status: 'CLIENT_REVISION', clientNotes: input.reason },
    }),
    prisma.statusHistory.create({
      data: {
        changeRequestId: id,
        fromStatus: 'PENDING_CLIENT_REVIEW',
        toStatus: 'CLIENT_REVISION',
        changedById: actorId,
        reason: input.reason,
      },
    }),
  ]);

  await createAuditLog({
    event: 'CR_CLIENT_REJECTED',
    actorId,
    entityType: 'ChangeRequest',
    entityId: id,
    metadata: { crNumber: cr.crNumber },
  });

  // Notify DM
  if (cr.createdByDmId) {
    const dm = await prisma.user.findUnique({
      where: { id: cr.createdByDmId },
      select: { email: true, name: true },
    });
    if (dm) {
      const tpl = clientRejectedCREmail(dm.name, cr.crNumber, cr.project.name, id, input.reason);
      await sendEmail(dm.email, tpl.subject, tpl.html).catch(() => {});
    }
  }

  return prisma.changeRequest.findUnique({ where: { id } });
};

// ─── DM-initiated: PO re-submit with edits ───────────────────────────────────

export const poResubmitWithEdits = async (
  id: string,
  actorId: string,
  input: POResubmitWithEditsInput,
) => {
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    include: { project: { select: { name: true } }, submittedBy: { select: { id: true } } },
  });
  if (!cr) throw new AppError(404, 'Change request not found');
  if (!cr.initiatedByDm) throw new AppError(400, 'Not a DM-initiated CR');
  if (cr.submittedById !== actorId) throw new AppError(403, 'Access denied');
  if (cr.clientRevisionUsed) throw new AppError(400, 'You have already used your one revision on this CR');
  assertTransition(cr.status, 'CLIENT_REVISION');

  await prisma.$transaction([
    prisma.changeRequest.update({
      where: { id },
      data: {
        status: 'CLIENT_REVISION',
        ...(input.description !== undefined && { description: input.description }),
        ...(input.businessJustification !== undefined && { businessJustification: input.businessJustification }),
        ...(input.clientNotes !== undefined && { clientNotes: input.clientNotes }),
      },
    }),
    prisma.statusHistory.create({
      data: {
        changeRequestId: id,
        fromStatus: 'ESTIMATED',
        toStatus: 'CLIENT_REVISION',
        changedById: actorId,
        reason: input.reason,
      },
    }),
  ]);

  await createAuditLog({
    event: 'CR_PO_RESUBMIT_WITH_EDITS',
    actorId,
    entityType: 'ChangeRequest',
    entityId: id,
    metadata: { crNumber: cr.crNumber },
  });

  // Notify DM
  if (cr.createdByDmId) {
    const dm = await prisma.user.findUnique({
      where: { id: cr.createdByDmId },
      select: { email: true, name: true },
    });
    if (dm) {
      const tpl = poResubmittedEditsEmail(dm.name, cr.crNumber, cr.project.name, id);
      await sendEmail(dm.email, tpl.subject, tpl.html).catch(() => {});
    }
  }

  return prisma.changeRequest.findUnique({ where: { id } });
};

// ─── DM-initiated: DM review & re-submit ─────────────────────────────────────

export const dmReviewResubmit = async (
  id: string,
  actorId: string,
  input: DMReviewResubmitInput,
) => {
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    include: {
      impactAnalysis: true,
      project: { select: { name: true } },
      submittedBy: { select: { id: true, name: true, email: true, notifyOnCrReturned: true } },
    },
  });
  if (!cr) throw new AppError(404, 'Change request not found');
  if (!cr.initiatedByDm) throw new AppError(400, 'Not a DM-initiated CR');
  if (cr.createdByDmId !== actorId) throw new AppError(403, 'Only the DM who created this CR can review it');
  assertTransition(cr.status, 'ESTIMATED');

  if (!cr.impactAnalysis) throw new AppError(500, 'Estimation data is missing');

  // Update CR + mark revision used + update estimation
  await prisma.$transaction([
    prisma.changeRequest.update({
      where: { id },
      data: {
        status: 'ESTIMATED',
        clientRevisionUsed: true,
        ...(input.dmNotes !== undefined && { dmNotes: input.dmNotes }),
      },
    }),
    prisma.impactAnalysis.update({
      where: { changeRequestId: id },
      data: {
        isDraft: false,
        submittedAt: new Date(),
        ...(input.estimatedHours !== undefined && { estimatedHours: new Decimal(input.estimatedHours) }),
        ...(input.timelineImpact !== undefined && { timelineImpact: input.timelineImpact }),
        ...(input.affectedDeliverables !== undefined && { affectedDeliverables: input.affectedDeliverables }),
        ...(input.revisedMilestones !== undefined && { revisedMilestones: input.revisedMilestones }),
        ...(input.resourcesRequired !== undefined && { resourcesRequired: input.resourcesRequired }),
        ...(input.recommendation !== undefined && { recommendation: input.recommendation }),
        ...(input.dmSignature !== undefined && { dmSignature: input.dmSignature }),
      },
    }),
    prisma.statusHistory.create({
      data: {
        changeRequestId: id,
        fromStatus: 'CLIENT_REVISION',
        toStatus: 'ESTIMATED',
        changedById: actorId,
      },
    }),
  ]);

  await createAuditLog({
    event: 'CR_DM_REVIEW_RESUBMIT',
    actorId,
    entityType: 'ChangeRequest',
    entityId: id,
    metadata: { crNumber: cr.crNumber },
  });

  // Notify PO
  if (cr.submittedBy?.email && cr.submittedBy.notifyOnCrReturned) {
    const tpl = dmReviewedEditsEmail(cr.submittedBy.name, cr.crNumber, cr.project.name, id);
    await sendEmail(cr.submittedBy.email, tpl.subject, tpl.html).catch(() => {});
  }

  return prisma.changeRequest.findUnique({ where: { id }, include: { impactAnalysis: true } });
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
  if (cr.initiatedByDm) throw new AppError(400, 'This CR was created by your DM. Use the review flow to confirm or reject it.');

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

// ─── Finance transitions ──────────────────────────────────────────────────────

export const markInProgress = async (id: string, actorId: string, actorRole: string) => {
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    include: { project: { select: { name: true } } },
  });
  if (!cr) throw new AppError(404, 'Change request not found');
  assertTransition(cr.status, 'IN_PROGRESS');

  const updated = await prisma.$transaction([
    prisma.changeRequest.update({ where: { id }, data: { status: 'IN_PROGRESS' } }),
    prisma.statusHistory.create({
      data: { changeRequestId: id, fromStatus: cr.status, toStatus: 'IN_PROGRESS', changedById: actorId },
    }),
  ]);

  await createAuditLog({
    event: 'CR_STATUS_CHANGED',
    actorId,
    entityType: 'ChangeRequest',
    entityId: id,
    metadata: { crNumber: cr.crNumber, from: cr.status, to: 'IN_PROGRESS' },
  });

  return updated[0];
};

export const markCompleted = async (id: string, actorId: string, actorRole: string) => {
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    include: { project: { select: { name: true } } },
  });
  if (!cr) throw new AppError(404, 'Change request not found');
  assertTransition(cr.status, 'COMPLETED');

  const updated = await prisma.$transaction([
    prisma.changeRequest.update({ where: { id }, data: { status: 'COMPLETED' } }),
    prisma.statusHistory.create({
      data: { changeRequestId: id, fromStatus: cr.status, toStatus: 'COMPLETED', changedById: actorId },
    }),
  ]);

  await createAuditLog({
    event: 'CR_STATUS_CHANGED',
    actorId,
    entityType: 'ChangeRequest',
    entityId: id,
    metadata: { crNumber: cr.crNumber, from: cr.status, to: 'COMPLETED' },
  });

  return updated[0];
};

// ─── DM recall ────────────────────────────────────────────────────────────────

export const recallFromClient = async (id: string, actorId: string) => {
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    include: { project: { select: { name: true } } },
  });
  if (!cr) throw new AppError(404, 'Change request not found');
  if (!cr.initiatedByDm) throw new AppError(400, 'Not a DM-initiated CR');
  if (cr.createdByDmId !== actorId) throw new AppError(403, 'Only the DM who created this CR can recall it');
  if (cr.status !== 'PENDING_CLIENT_REVIEW') throw new AppError(400, 'CR can only be recalled while awaiting client review');

  await prisma.$transaction([
    prisma.changeRequest.update({ where: { id }, data: { status: 'DRAFT' } }),
    prisma.statusHistory.create({
      data: { changeRequestId: id, fromStatus: 'PENDING_CLIENT_REVIEW', toStatus: 'DRAFT', changedById: actorId },
    }),
  ]);

  await createAuditLog({
    event: 'CR_STATUS_CHANGED',
    actorId,
    entityType: 'ChangeRequest',
    entityId: id,
    metadata: { crNumber: cr.crNumber, from: 'PENDING_CLIENT_REVIEW', to: 'DRAFT', reason: 'DM recalled' },
  });

  return prisma.changeRequest.findUnique({ where: { id } });
};
