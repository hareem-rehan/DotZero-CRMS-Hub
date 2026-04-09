import { ProtectedLayout } from '@/components/layouts/ProtectedLayout';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedLayout allowedRoles={['DELIVERY_MANAGER', 'PRODUCT_OWNER', 'FINANCE', 'SUPER_ADMIN']}>
      {children}
    </ProtectedLayout>
  );
}
