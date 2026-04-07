import { ProtectedLayout } from '@/components/layouts/ProtectedLayout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout allowedRoles={['SUPER_ADMIN']}>{children}</ProtectedLayout>;
}
