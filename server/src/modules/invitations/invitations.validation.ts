import { z } from 'zod';

export const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  projectId: z.string().cuid('Invalid project ID'),
  role: z
    .enum(['PRODUCT_OWNER', 'DELIVERY_MANAGER', 'FINANCE', 'SUPER_ADMIN'])
    .default('PRODUCT_OWNER'),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
