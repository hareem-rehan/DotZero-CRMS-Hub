import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface MyProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  timezone: string | null;
  role: string;
  isActive: boolean;
  notifyOnCrSubmitted: boolean;
  notifyOnCrReturned: boolean;
  notifyOnCrApproved: boolean;
  notifyOnCrDeclined: boolean;
  createdAt: string;
  lastLogin: string | null;
}

export const useMe = () =>
  useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: MyProfile }>('/auth/me');
      return data.data;
    },
  });

export const useUpdateMe = (callbacks?: {
  onSuccess?: () => void;
  onError?: (msg: string) => void;
}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<MyProfile>) => {
      const { data } = await apiClient.patch<{ success: boolean; data: MyProfile }>(
        '/auth/me',
        payload,
      );
      return data.data;
    },
    onSuccess: (updated) => {
      qc.setQueryData(['me'], updated);
      callbacks?.onSuccess?.();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to save';
      callbacks?.onError?.(msg);
    },
  });
};

export const useChangePassword = (callbacks?: {
  onSuccess?: () => void;
  onError?: (msg: string) => void;
}) =>
  useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      const { data } = await apiClient.post('/auth/me/change-password', payload);
      return data;
    },
    onSuccess: () => callbacks?.onSuccess?.(),
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to change password';
      callbacks?.onError?.(msg);
    },
  });

export const useAdminStats = () =>
  useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        success: boolean;
        data: { users: number; projects: number; changeRequests: number; pendingCRs: number };
      }>('/auth/me/stats');
      return data.data;
    },
  });
