'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const iconClass = 'h-5 w-5';

const icons = {
  dashboard: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  projects: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
  users: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  crs: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  audit: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  activity: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  settings: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  queue: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  profile: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  finance: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
};

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  SUPER_ADMIN: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: icons.dashboard },
    { label: 'Projects', href: '/admin/projects', icon: icons.projects },
    { label: 'Users', href: '/admin/users', icon: icons.users },
    { label: 'All CRs', href: '/admin/change-requests', icon: icons.crs },
    { label: 'Activity', href: '/admin/activity', icon: icons.activity },
    { label: 'Audit Log', href: '/admin/audit-log', icon: icons.audit },
    { label: 'Settings', href: '/admin/settings', icon: icons.settings },
  ],
  PRODUCT_OWNER: [
    { label: 'My CRs', href: '/client/my-crs', icon: icons.crs },
    { label: 'Profile', href: '/profile', icon: icons.profile },
  ],
  DELIVERY_MANAGER: [
    { label: 'Pending Queue', href: '/dm/pending', icon: icons.queue },
    { label: 'All CRs', href: '/dm/all-crs', icon: icons.crs },
    { label: 'Profile', href: '/profile', icon: icons.profile },
  ],
  FINANCE: [
    { label: 'CR Listing', href: '/finance/cr-listing', icon: icons.finance },
    { label: 'Dashboard', href: '/finance/dashboard', icon: icons.dashboard },
    { label: 'Profile', href: '/profile', icon: icons.profile },
  ],
};

export function Sidebar() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role ?? '');
  const navItems = NAV_BY_ROLE[role] ?? [];

  return (
    <aside className="flex h-full w-60 flex-col bg-[#2D2D2D]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
        {/* Icon mark */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#EF323F]">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="12" width="4" height="4" rx="1" fill="white"/>
            <rect x="8" y="2" width="10" height="16" rx="3" fill="white"/>
            <rect x="11" y="5" width="4" height="10" rx="1.5" fill="#EF323F"/>
          </svg>
        </div>
        {/* Wordmark */}
        <span className="text-lg font-black tracking-tight text-white">DotZero</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-[#EF323F] text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
