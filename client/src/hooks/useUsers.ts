'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface UserProject {
  project: { id: string; name: string; code: string };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  isLocked: boolean;
  lastLogin: string | null;
  passwordSetAt: string | null;
  createdAt: string;
  projectAssignments?: UserProject[];
}

export interface UsersListResult {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useUsers = (params?: { role?: string; isActive?: boolean; search?: string }) => {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: UsersListResult }>('/users', {
        params,
      });
      return data.data;
    },
  });
};

export const useUser = (id: string) => {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: User }>(`/users/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      email: string;
      role: string;
      projectIds?: string[];
    }) => {
      const { data } = await apiClient.post<{ success: boolean; data: User }>('/users', payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useUpdateUser = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name?: string; role?: string; projectIds?: string[] }) => {
      const { data } = await apiClient.patch<{ success: boolean; data: User }>(
        `/users/${id}`,
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users', id] });
    },
  });
};

export const useSetUserActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const endpoint = active ? `/users/${id}/reactivate` : `/users/${id}/deactivate`;
      const { data } = await apiClient.patch<{ success: boolean; data: User }>(endpoint);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useResendWelcome = (callbacks?: { onSuccess?: () => void; onError?: () => void }) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<{ success: boolean; data: { message: string } }>(
        `/users/${id}/resend-invite`,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      callbacks?.onSuccess?.();
    },
    onError: () => callbacks?.onError?.(),
  });
};

export const useAdminResetPassword = (callbacks?: {
  onSuccess?: () => void;
  onError?: () => void;
}) => {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<{ success: boolean; data: { message: string } }>(
        `/users/${id}/reset-password`,
      );
      return data.data;
    },
    onSuccess: () => callbacks?.onSuccess?.(),
    onError: () => callbacks?.onError?.(),
  });
};

export const useDeleteUser = (callbacks?: { onSuccess?: () => void; onError?: () => void }) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete<{ success: boolean; data: { message: string } }>(
        `/users/${id}`,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      callbacks?.onSuccess?.();
    },
    onError: () => callbacks?.onError?.(),
  });
};

// ─── Invitations ──────────────────────────────────────────────────────────────

export const useSendInvitation = () => {
  return useMutation({
    mutationFn: async (payload: { email: string; projectId: string; role: string }) => {
      const { data } = await apiClient.post<{ success: boolean; data: { message: string } }>(
        '/invitations',
        payload,
      );
      return data.data;
    },
  });
};
