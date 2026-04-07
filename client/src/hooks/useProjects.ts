'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface Project {
  id: string;
  name: string;
  clientName: string;
  code: string;
  hourlyRate: string;
  currency: string;
  status: string;
  startDate: string | null;
  assignedDmId: string | null;
  showRateToDm: boolean;
  sowReference: string | null;
  crSequence: number;
  createdAt: string;
  updatedAt: string;
  assignedDm?: { id: string; name: string; email: string } | null;
  _count?: { changeRequests: number; userAssignments: number };
}

export interface ProjectDetail extends Project {
  userAssignments: Array<{
    user: { id: string; name: string; email: string; role: string; isActive: boolean };
  }>;
  attachments: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
  totalApprovedHours: number;
  totalApprovedCost: number;
}

export interface ProjectsListResult {
  projects: Project[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DmUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useProjects = (params?: { status?: string; search?: string; page?: number }) => {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: ProjectsListResult }>(
        '/projects',
        { params },
      );
      return data.data;
    },
  });
};

export const useProject = (id: string) => {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: ProjectDetail }>(
        `/projects/${id}`,
      );
      return data.data;
    },
    enabled: !!id,
  });
};

export const useDmUsers = () => {
  return useQuery({
    queryKey: ['projects', 'dm-users'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: DmUser[] }>(
        '/projects/dm-users',
      );
      return data.data;
    },
  });
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useCreateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await apiClient.post<{ success: boolean; data: Project }>('/projects', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
};

export const useUpdateProject = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await apiClient.patch<{ success: boolean; data: Project }>(
        `/projects/${id}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['projects', id] });
    },
  });
};

export const useArchiveProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch<{ success: boolean; data: Project }>(
        `/projects/${id}/archive`,
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
};

export const useUnarchiveProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch<{ success: boolean; data: Project }>(
        `/projects/${id}/unarchive`,
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
};
