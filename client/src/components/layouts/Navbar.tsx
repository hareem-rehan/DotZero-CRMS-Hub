'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700' },
  PRODUCT_OWNER: { label: 'Product Owner', color: 'bg-blue-100 text-blue-700' },
  DELIVERY_MANAGER: { label: 'Delivery Manager', color: 'bg-green-100 text-green-700' },
  FINANCE: { label: 'Finance', color: 'bg-amber-100 text-amber-700' },
};

export function Navbar() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const roleInfo = ROLE_LABELS[user?.role ?? ''];

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-[#D3D3D3] bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        {roleInfo && (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${roleInfo.color}`}>
            {roleInfo.label}
          </span>
        )}
        <span className="text-sm font-medium text-[#2D2D2D]">{user?.name}</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[#5D5B5B] hover:bg-[#F7F7F7] hover:text-[#2D2D2D] transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </header>
  );
}
