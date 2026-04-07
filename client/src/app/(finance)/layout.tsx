import { ProtectedLayout } from '@/components/layouts/ProtectedLayout';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout allowedRoles={['FINANCE', 'SUPER_ADMIN']}>{children}</ProtectedLayout>;
}
