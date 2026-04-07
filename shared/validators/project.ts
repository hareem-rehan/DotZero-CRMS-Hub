import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  clientName: z.string().min(1, 'Client name is required'),
  code: z.string().min(1, 'Project code is required').max(20).toUpperCase(),
  hourlyRate: z.number().positive('Hourly rate must be positive'),
  currency: z.enum(['USD', 'EUR', 'GBP', 'AED', 'PKR', 'SAR']).default('USD'),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'DELIVERED', 'ARCHIVED']).default('ACTIVE'),
  startDate: z.string().datetime().optional().nullable(),
  assignedDmId: z.string().optional().nullable(),
  showRateToDm: z.boolean().default(false),
  sowReference: z.string().optional().nullable(),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
