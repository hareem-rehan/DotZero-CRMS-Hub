import { ProtectedLayout } from '@/components/layouts/ProtectedLayout';

export default function DmLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout allowedRoles={['DELIVERY_MANAGER', 'SUPER_ADMIN']}>{children}</ProtectedLayout>;
}
