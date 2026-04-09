import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../utils/auditLog';
import { sendEmail } from '../../utils/email';
import { estimationReturnedEmail } from '../../utils/emailTemplates';

export interface ImpactAnalysisInput {
  estimatedHours: number;
  timelineImpact?: string;
  affectedDeliverables?: string;
  revisedMilestones?: string;
  resourcesRequired?: string;
  recommendation?: string;
  dmSignature?: string;
  isDraft: boolean;
}

export const saveImpactAnalysis = async (
  crId: string,
  actorId: string,
  input: ImpactAnalysisInput,
) => {
  const cr = await prisma.changeRequest.findUnique({
    where: { id: crId },
    include: {
      project: { select: { assignedDmId: true, name: true } },
      submittedBy: { select: { id: true, email: true, name: true } },
    },
  });
  if (!cr) throw new AppError(404, 'Change request not found');

  if (!['UNDER_REVIEW', 'RESUBMITTED'].includes(cr.status)) {
    throw new AppError(400, `Cannot save estimation on a CR with status ${cr.status}`);
  }

  // Ensure only the assigned DM (or SA) can estimate
  if (cr.project.assignedDmId && cr.project.assignedDmId !== actorId) {
    // Allow SUPER_ADMIN through regardless
    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
    if (actor?.role !== 'SUPER_ADMIN') throw new AppError(403, 'Only the assigned DM can estimate this CR');
  }

  // When submitting final (isDraft=false), signature is required
  if (!input.isDraft && !input.dmSignature?.trim()) {
    throw new AppError(400, 'DM signature is required before returning to PO');
  }

  const existing = await prisma.impactAnalysis.findUnique({ where: { changeRequestId: crId } });

  const data = {
    dmId: actorId,
    estimatedHours: new Decimal(input.estimatedHours),
    timelineImpact: input.timelineImpact ?? '',
    affectedDeliverables: input.affectedDeliverables ?? '',
    revisedMilestones: input.revisedMilestones ?? '',
    resourcesRequired: input.resourcesRequired ?? '',
    recommendation: input.recommendation ?? '',
    dmSignature: input.dmSignature ?? null,
    isDraft: input.isDraft,
    submittedAt: input.isDraft ? null : new Date(),
  };

  const analysis = existing
    ? await prisma.impactAnalysis.update({ where: { changeRequestId: crId }, data })
    : await prisma.impactAnalysis.create({ data: { changeRequestId: crId, ...data } });

  // If submitting final estimation → transition CR to ESTIMATED
  if (!input.isDraft) {
    await prisma.$transaction([
      prisma.changeRequest.update({ where: { id: crId }, data: { status: 'ESTIMATED' } }),
      prisma.statusHistory.create({
        data: {
          changeRequestId: crId,
          fromStatus: cr.status as never,
          toStatus: 'ESTIMATED',
          changedById: actorId,
        },
      }),
    ]);

    await createAuditLog({
      event: 'CR_ESTIMATED',
      actorId,
      entityType: 'ChangeRequest',
      entityId: crId,
      metadata: { crNumber: cr.crNumber, estimatedHours: input.estimatedHours },
    });

    // Email PO (respects notifyOnCrReturned preference)
    if (cr.submittedBy?.email) {
      const po = await prisma.user.findUnique({ where: { id: cr.submittedBy.id }, select: { notifyOnCrReturned: true } });
      if (po?.notifyOnCrReturned) {
        const tpl = estimationReturnedEmail(cr.submittedBy.name, cr.crNumber, cr.project.name, crId, Number(input.estimatedHours));
        await sendEmail(cr.submittedBy.email, tpl.subject, tpl.html).catch(() => {});
      }
    }
  }

  // Return without financial data (no hourlyRate or totalCost — those are server-side only)
  return analysis;
};
