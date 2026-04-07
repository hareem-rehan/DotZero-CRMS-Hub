import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['SUPER_ADMIN', 'PRODUCT_OWNER', 'DELIVERY_MANAGER', 'FINANCE']),
  projectIds: z.array(z.string()).optional().default([]),
  phone: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
});

export const updateUserSchema = createUserSchema
  .partial()
  .omit({ email: true });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
