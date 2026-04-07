import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255),
  clientName: z.string().min(1, 'Client name is required').max(255),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, numbers, underscores or hyphens')
    .optional(),
  hourlyRate: z
    .number({ invalid_type_error: 'Hourly rate must be a number' })
    .positive('Hourly rate must be positive'),
  currency: z.enum(['USD', 'EUR', 'GBP', 'AED', 'PKR', 'SAR']).default('USD'),
  startDate: z.string().datetime().optional().nullable(),
  assignedDmId: z.string().cuid().optional().nullable(),
  showRateToDm: z.boolean().default(false),
  sowReference: z.string().max(255).optional().nullable(),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'DELIVERED']).default('ACTIVE'),
});

export const updateProjectSchema = createProjectSchema
  .omit({ code: true }) // code is immutable after creation
  .extend({
    status: z.enum(['ACTIVE', 'ON_HOLD', 'DELIVERED', 'ARCHIVED']).optional(),
  })
  .partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
