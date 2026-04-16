import { z } from 'zod';

// Coerce strings from multipart/form-data to proper types
const coercedNumber = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
  z
    .number({ invalid_type_error: 'Hourly rate must be a number' })
    .nonnegative('Hourly rate must be 0 or positive')
    .optional(),
);

const coercedBoolean = z.preprocess((v) => v === 'true' || v === true, z.boolean());

const coercedEmailArray = z.preprocess(
  (v) => {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      try {
        return JSON.parse(v);
      } catch {
        return [];
      }
    }
    return [];
  },
  z.array(z.string().email('Invalid email address')).default([]),
);

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255),
  clientName: z.string().max(255).optional(),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, numbers, underscores or hyphens')
    .optional(),
  hourlyRate: coercedNumber,
  currency: z.enum(['USD', 'EUR', 'GBP', 'AED', 'PKR', 'SAR']).default('USD'),
  startDate: z.string().datetime().optional().nullable(),
  assignedDmId: z.string().cuid().optional().nullable(),
  showRateToDm: coercedBoolean.default(false),
  status: z.enum(['DRAFT', 'ACTIVE', 'ON_HOLD', 'DELIVERED']).default('ACTIVE'),
  clientEmail: z.string().email('Invalid client email').optional().nullable(),
  clientMemberEmails: coercedEmailArray,
});

export const updateProjectSchema = createProjectSchema
  .omit({ code: true })
  .extend({
    status: z.enum(['DRAFT', 'ACTIVE', 'ON_HOLD', 'DELIVERED', 'ARCHIVED']).optional(),
  })
  .partial();

export const listProjectsSchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  clientName: z.string().optional(),
  page: z.preprocess((v) => (v ? Number(v) : 1), z.number().int().min(1)).optional(),
  pageSize: z.preprocess((v) => (v ? Number(v) : 20), z.number().int().min(1).max(100)).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsSchema>;
