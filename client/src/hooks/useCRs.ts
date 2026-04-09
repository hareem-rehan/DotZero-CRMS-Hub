'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CRAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface CRSummary {
  id: string;
  crNumber: string;
  title: string;
  status: string;
  priority: string;
  changeType: string;
  dateOfRequest: string | null;
  updatedAt: string;
  project: { id: string; name: string; code: string };
  submittedBy: { id: string; name: string };
  _count: { attachments: number };
}

export interface CRDetail extends CRSummary {
  description: string;
  businessJustification: string;
  requestingParty: string;
  sowRef: string | null;
  submittedById: string;
  projectId: string;
  createdAt: string;
  attachments: CRAttachment[];
  impactAnalysis: {
    id: string;
    estimatedHours: string;
    timelineImpact: string | null;
    affectedDeliverables: string | null;
    revisedMilestones: string | null;
    resourcesRequired: string | null;
    recommendation: string | null;
    isDraft: boolean;
    totalCost?: number;
  } | null;
  approval: {
    id: string;
    decision: string;
    decisionNote: string | null;
    decidedAt: string;
  } | null;
  statusHistory: Array<{
    id: string;
    fromStatus: string;
    toStatus: string;
    changedAt: string;
    note: string | null;
    changedBy: { id: string; name: string };
  }>;
  internalNotes?: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: { id: string; name: string };
  }>;
}

export interface CRListResult {
  crs: CRSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateCRPayload {
  projectId: string;
  title: string;
  description?: string;
  businessJustification?: string;
  priority?: string;
  changeType?: string;
  requestingParty?: string;
  sowRef?: string;
}

export interface UpdateCRPayload {
  title?: string;
  description?: string;
  businessJustification?: string;
  priority?: string;
  changeType?: string;
  requestingParty?: string;
  sowRef?: string;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const crKeys = {
  all: ['change-requests'] as const,
  list: (params?: object) => ['change-requests', 'list', params] as const,
  detail: (id: string) => ['change-requests', id] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useCRs = (params?: {
  projectId?: string;
  status?: string;
  changeType?: string;
  priority?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) => {
  return useQuery({
    queryKey: crKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: CRListResult }>(
        '/change-requests',
        { params },
      );
      return data.data;
    },
  });
};

export const useCR = (id: string) => {
  return useQuery({
    queryKey: crKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: CRDetail }>(
        `/change-requests/${id}`,
      );
      return data.data;
    },
    enabled: !!id,
  });
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useCreateCR = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ payload, files }: { payload: CreateCRPayload; files?: File[] }) => {
      const form = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== '') form.append(k, v as string);
      });
      files?.forEach((f) => form.append('attachments', f));
      const { data } = await apiClient.post<{ success: boolean; data: CRDetail }>(
        '/change-requests',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: crKeys.all }),
  });
};

export const useUpdateCR = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ payload, files }: { payload: UpdateCRPayload; files?: File[] }) => {
      const form = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined) form.append(k, v as string);
      });
      files?.forEach((f) => form.append('attachments', f));
      const { data } = await apiClient.patch<{ success: boolean; data: CRDetail }>(
        `/change-requests/${id}`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crKeys.all });
      qc.invalidateQueries({ queryKey: crKeys.detail(id) });
    },
  });
};

export const useSubmitCR = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<{ success: boolean; data: CRDetail }>(
        `/change-requests/${id}/submit`,
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: crKeys.all }),
  });
};

// ─── PO: Approve / Decline / Resubmit / Cancel ───────────────────────────────

export const useApproveCR = (crId: string, callbacks?: { onSuccess?: () => void; onError?: (msg: string) => void }) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { poSignature: string; approvalNotes?: string }) => {
      const { data } = await apiClient.post(`/change-requests/${crId}/approve`, payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crKeys.detail(crId) });
      qc.invalidateQueries({ queryKey: crKeys.all });
      callbacks?.onSuccess?.();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to approve';
      callbacks?.onError?.(msg);
    },
  });
};

export const useDeclineCR = (crId: string, callbacks?: { onSuccess?: () => void; onError?: (msg: string) => void }) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (declineNotes: string) => {
      const { data } = await apiClient.post(`/change-requests/${crId}/decline`, { declineNotes });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crKeys.detail(crId) });
      qc.invalidateQueries({ queryKey: crKeys.all });
      callbacks?.onSuccess?.();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to decline';
      callbacks?.onError?.(msg);
    },
  });
};

export const useResubmitCR = (crId: string, callbacks?: { onSuccess?: () => void; onError?: (msg: string) => void }) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title?: string; description?: string; businessJustification?: string; priority?: string; changeType?: string }) => {
      const { data } = await apiClient.post(`/change-requests/${crId}/resubmit`, payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crKeys.detail(crId) });
      qc.invalidateQueries({ queryKey: crKeys.all });
      callbacks?.onSuccess?.();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to resubmit';
      callbacks?.onError?.(msg);
    },
  });
};

export const useCancelCR = (crId: string, callbacks?: { onSuccess?: () => void; onError?: (msg: string) => void }) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reason?: string) => {
      const { data } = await apiClient.patch(`/change-requests/${crId}/status`, { reason });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crKeys.detail(crId) });
      qc.invalidateQueries({ queryKey: crKeys.all });
      callbacks?.onSuccess?.();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to cancel';
      callbacks?.onError?.(msg);
    },
  });
};

export const useCRVersions = (crId: string) =>
  useQuery({
    queryKey: ['change-requests', crId, 'versions'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/change-requests/${crId}/versions`);
      return data.data as Array<{ id: string; versionNumber: number; snapshotJson: unknown; createdAt: string; createdBy: { id: string; name: string } }>;
    },
    enabled: !!crId,
  });

// ─── DM: Impact Analysis ──────────────────────────────────────────────────────

export interface ImpactAnalysisPayload {
  estimatedHours: number;
  timelineImpact?: string;
  affectedDeliverables?: string;
  revisedMilestones?: string;
  resourcesRequired?: string;
  recommendation?: string;
  dmSignature?: string;
  isDraft: boolean;
}

export const useSaveImpactAnalysis = (crId: string, callbacks?: { onSuccess?: () => void; onError?: (msg: string) => void }) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ImpactAnalysisPayload) => {
      const { data } = await apiClient.post(`/change-requests/${crId}/impact-analysis`, payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crKeys.detail(crId) });
      qc.invalidateQueries({ queryKey: crKeys.all });
      callbacks?.onSuccess?.();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to save estimation';
      callbacks?.onError?.(msg);
    },
  });
};

export const useAddNote = (crId: string, callbacks?: { onSuccess?: () => void; onError?: (msg: string) => void }) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const { data } = await apiClient.post(`/change-requests/${crId}/notes`, { content });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crKeys.detail(crId) });
      callbacks?.onSuccess?.();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to add note';
      callbacks?.onError?.(msg);
    },
  });
};
