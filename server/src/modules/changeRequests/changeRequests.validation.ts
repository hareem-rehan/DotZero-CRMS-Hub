import { z } from 'zod';

// ─── Valid status transitions ─────────────────────────────────────────────────

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['UNDER_REVIEW', 'CANCELLED'],
  UNDER_REVIEW: ['ESTIMATED', 'CANCELLED'],
  ESTIMATED: ['APPROVED', 'DECLINED', 'DEFERRED', 'RESUBMITTED'],
  RESUBMITTED: ['UNDER_REVIEW', 'CANCELLED'],
  APPROVED: ['IN_PROGRESS', 'RESUBMITTED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  DECLINED: ['RESUBMITTED'],
  DEFERRED: ['RESUBMITTED'],
  CANCELLED: [],
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
