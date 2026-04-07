import { ProtectedLayout } from '@/components/layouts/ProtectedLayout';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout allowedRoles={['PRODUCT_OWNER']}>{children}</ProtectedLayout>;
}
