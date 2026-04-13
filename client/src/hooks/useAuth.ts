'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/useAuthStore';

interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface RegisterPayload {
  token: string;
  name: string;
  password: string;
  confirmPassword: string;
}

interface ForgotPasswordPayload {
  email: string;
}

interface ResetPasswordPayload {
  token: string;
  password: string;
  confirmPassword: string;
}

const ROLE_REDIRECT: Record<string, string> = {
  SUPER_ADMIN: '/admin/dashboard',
  PRODUCT_OWNER: '/client/my-crs',
  DELIVERY_MANAGER: '/dm/pending',
  FINANCE: '/finance/cr-listing',
};

export const useLogin = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const res = await apiClient.post('/auth/login', payload);
      return res.data.data as {
        token: string;
        user: { id: string; name: string; email: string; role: string };
      };
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      const redirect = ROLE_REDIRECT[data.user.role] ?? '/';
      router.push(redirect);
    },
  });
};

export const useRegister = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const res = await apiClient.post('/auth/register', payload);
      return res.data.data;
    },
    onSuccess: () => {
      router.push('/login');
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (payload: ForgotPasswordPayload) => {
      const res = await apiClient.post('/auth/forgot-password', payload);
      return res.data.data as { message: string };
    },
  });
};

export const useResetPassword = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (payload: ResetPasswordPayload) => {
      const res = await apiClient.post('/auth/reset-password', payload);
      return res.data.data as { message: string };
    },
    onSuccess: () => {
      router.push('/login');
    },
  });
};
