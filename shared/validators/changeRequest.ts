import { z } from 'zod';

export const createCRSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  businessJustification: z.string().optional().default(''),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  changeType: z.enum(['SCOPE', 'TIMELINE', 'BOTH']).default('SCOPE'),
  requestingParty: z.string().optional().nullable(),
  sowRef: z.string().optional().nullable(),
});

export const updateCRSchema = createCRSchema.partial().omit({ projectId: true });

export const submitCRSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  businessJustification: z.string().min(1, 'Business justification is required'),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  changeType: z.enum(['SCOPE', 'TIMELINE', 'BOTH']),
});

export type CreateCRInput = z.infer<typeof createCRSchema>;
export type UpdateCRInput = z.infer<typeof updateCRSchema>;
export type SubmitCRInput = z.infer<typeof submitCRSchema>;
