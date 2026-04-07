'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

const INACTIVITY_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: '/admin',
  PRODUCT_OWNER: '/client',
  DELIVERY_MANAGER: '/dm',
  FINANCE: '/finance',
};

interface ProtectedLayoutProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedLayout({ children, allowedRoles }: ProtectedLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, clearAuth } = useAuthStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirect to login if no session
  useEffect(() => {
    if (!token || !user) {
      router.replace('/login');
    }
  }, [token, user, router]);

  // Redirect to role home if accessing wrong route group
  useEffect(() => {
    if (!user) return;
    if (!allowedRoles) return;
    if (!allowedRoles.includes(user.role)) {
      const home = ROLE_HOME[user.role] ?? '/login';
      router.replace(home);
    }
  }, [user, allowedRoles, router, pathname]);

  // Inactivity auto-logout (8 hours)
  useEffect(() => {
    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        clearAuth();
        router.replace('/login');
      }, INACTIVITY_TIMEOUT_MS);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [clearAuth, router]);

  if (!token || !user) return null;
  if (allowedRoles && !allowedRoles.includes(user.role)) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F7F7]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
