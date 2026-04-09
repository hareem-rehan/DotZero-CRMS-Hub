import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address'),
  role: z.enum(['SUPER_ADMIN', 'PRODUCT_OWNER', 'DELIVERY_MANAGER', 'FINANCE']),
  projectIds: z.array(z.string().cuid()).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.enum(['SUPER_ADMIN', 'PRODUCT_OWNER', 'DELIVERY_MANAGER', 'FINANCE']).optional(),
  projectIds: z.array(z.string().cuid()).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
