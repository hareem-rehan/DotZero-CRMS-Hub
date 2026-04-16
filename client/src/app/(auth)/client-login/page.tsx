'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/useAuthStore';

export default function ClientLoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('No login token found in this link.');
      setStatus('error');
      return;
    }

    apiClient
      .post<{
        success: boolean;
        data: { token: string; user: { id: string; name: string; email: string; role: string } };
      }>('/auth/magic-login', { token })
      .then(({ data }) => {
        setAuth(data.data.user, data.data.token);
        router.replace('/client/my-crs');
      })
      .catch((err) => {
        const msg = err?.response?.data?.error ?? 'This login link is invalid or has expired.';
        setError(msg);
        setStatus('error');
      });
  }, [searchParams, setAuth, router]);

  if (status === 'loading') {
    return (
      <div className="text-center space-y-3">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#EF323F] border-t-transparent" />
        <p className="text-sm text-[#5D5B5B]">Signing you in…</p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg
          className="h-6 w-6 text-[#EF323F]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <h2 className="text-base font-semibold text-[#2D2D2D]">Link Invalid</h2>
      <p className="text-sm text-[#5D5B5B]">{error}</p>
      <a href="/login" className="inline-block text-sm font-medium text-[#EF323F] hover:underline">
        Go to login →
      </a>
    </div>
  );
}
