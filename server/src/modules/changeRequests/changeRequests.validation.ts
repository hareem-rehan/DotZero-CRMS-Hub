import { z } from 'zod';

// ─── Valid status transitions ─────────────────────────────────────────────────

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED', 'PENDING_CLIENT_REVIEW'],
  SUBMITTED: ['UNDER_REVIEW', 'CANCELLED'],
  UNDER_REVIEW: ['ESTIMATED', 'CANCELLED'],
  ESTIMATED: ['APPROVED', 'DECLINED', 'DEFERRED', 'RESUBMITTED', 'CLIENT_REVISION'],
  RESUBMITTED: ['UNDER_REVIEW', 'CANCELLED'],
  APPROVED: ['IN_PROGRESS', 'RESUBMITTED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  DECLINED: ['RESUBMITTED'],
  DEFERRED: ['RESUBMITTED'],
  CANCELLED: [],
  PENDING_CLIENT_REVIEW: ['DRAFT', 'APPROVED', 'DECLINED', 'CANCELLED', 'CLIENT_REVISION'],
  CLIENT_REVISION: ['ESTIMATED', 'PENDING_CLIENT_REVIEW', 'CANCELLED'],
};

// ─── Zod schemas ──────────────────────────────────────────────────────────────

export const createCRSchema = z.object({
  projectId: z.string().cuid('Invalid project ID'),
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional().default(''),
  businessJustification: z.string().optional().default(''),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional().default('MEDIUM'),
  changeType: z.enum(['SCOPE', 'TIMELINE', 'BOTH']).optional().default('SCOPE'),
  requestingParty: z.string().max(255).optional(),
  sowRef: z.string().max(255).optional(),
});

export const updateCRSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  businessJustification: z.string().optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  changeType: z.enum(['SCOPE', 'TIMELINE', 'BOTH']).optional(),
  requestingParty: z.string().max(255).optional(),
  sowRef: z.string().max(255).optional(),
});

export type CreateCRInput = z.infer<typeof createCRSchema>;
export type UpdateCRInput = z.infer<typeof updateCRSchema>;

// ─── DM-initiated CR schemas ──────────────────────────────────────────────────

export const createDMInitiatedCRSchema = z.object({
  projectId: z.string().cuid('Invalid project ID'),
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional().default(''),
  businessJustification: z.string().optional().default(''),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional().default('MEDIUM'),
  changeType: z.enum(['SCOPE', 'TIMELINE', 'BOTH']).optional().default('SCOPE'),
  requestingParty: z.string().max(255).optional(),
  sowRef: z.string().max(255).optional(),
  dmNotes: z.string().optional(),
  estimatedHours: z.coerce.number().positive('Estimated hours must be positive'),
  timelineImpact: z.string().optional().default(''),
  affectedDeliverables: z.string().optional().default(''),
  revisedMilestones: z.string().optional(),
  resourcesRequired: z.string().optional(),
  recommendation: z.string().optional().default(''),
  dmSignature: z.string().optional(),
});

export const updateDMDraftSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  businessJustification: z.string().optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  changeType: z.enum(['SCOPE', 'TIMELINE', 'BOTH']).optional(),
  requestingParty: z.string().max(255).optional(),
  sowRef: z.string().max(255).optional(),
  dmNotes: z.string().optional(),
  estimatedHours: z.coerce.number().positive().optional(),
  timelineImpact: z.string().optional(),
  affectedDeliverables: z.string().optional(),
  revisedMilestones: z.string().optional(),
  resourcesRequired: z.string().optional(),
  recommendation: z.string().optional(),
  dmSignature: z.string().optional(),
});

export const clientConfirmSchema = z.object({
  clientNotes: z.string().optional(),
  description: z.string().optional(),
  businessJustification: z.string().optional(),
});

export const clientReviewEditSchema = z.object({
  description: z.string().optional(),
  businessJustification: z.string().optional(),
});

export const clientRejectSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

export const poResubmitWithEditsSchema = z.object({
  description: z.string().optional(),
  businessJustification: z.string().optional(),
  clientNotes: z.string().optional(),
  reason: z.string().min(1, 'Please provide a reason for re-submitting with edits'),
});

export const dmReviewResubmitSchema = z.object({
  dmNotes: z.string().optional(),
  estimatedHours: z.coerce.number().positive().optional(),
  timelineImpact: z.string().optional(),
  affectedDeliverables: z.string().optional(),
  revisedMilestones: z.string().optional(),
  resourcesRequired: z.string().optional(),
  recommendation: z.string().optional(),
  dmSignature: z.string().optional(),
});

export type CreateDMInitiatedCRInput = z.infer<typeof createDMInitiatedCRSchema>;
export type UpdateDMDraftInput = z.infer<typeof updateDMDraftSchema>;
export type ClientConfirmInput = z.infer<typeof clientConfirmSchema>;
export type ClientReviewEditInput = z.infer<typeof clientReviewEditSchema>;
export type ClientRejectInput = z.infer<typeof clientRejectSchema>;
export type POResubmitWithEditsInput = z.infer<typeof poResubmitWithEditsSchema>;
export type DMReviewResubmitInput = z.infer<typeof dmReviewResubmitSchema>;
