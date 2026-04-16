'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FinanceCRSummary {
  id: string;
  crNumber: string;
  title: string;
  status: string;
  priority: string;
  changeType: string;
  dateOfRequest: string | null;
  version: number;
  totalCost: number;
  estimatedHours: number;
  hourlyRate: number;
  project: { id: string; name: string; code: string; clientName: string | null; currency: string };
  submittedBy: { id: string; name: string };
  impactAnalysis: { estimatedHours: string; recommendation: string | null } | null;
  approval: { approvalNotes: string | null; approvedAt: string } | null;
}

export interface CurrencyTotals {
  currency: string;
  totalCRs: number;
  totalHours: number;
  totalCost: number;
}

export interface FinanceCRListResult {
  crs: FinanceCRSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totals: CurrencyTotals[];
}

export interface FinanceDashboardData {
  thisPeriod: Array<{ currency: string; count: number; hours: number; cost: number }>;
  lastMonth: Array<{ currency: string; count: number; hours: number; cost: number }>;
  projectBreakdown: Array<{
    projectId: string;
    projectName: string;
    projectCode: string;
    clientName: string | null;
    currency: string;
    count: number;
    hours: number;
    cost: number;
  }>;
}

export interface SADashboardData {
  activeProjects: number;
  usersByRole: Array<{ role: string; count: number }>;
  thisMonthCRs: number;
  thisMonthCost: number;
  lastMonthCost: number;
  costChangePercent: number | null;
  pendingActions: Array<{
    id: string;
    crNumber: string;
    projectName: string;
    submittedBy: string;
    dateOfRequest: string | null;
    hoursStuck: number | null;
  }>;
}

export interface PODashboardData {
  summary: {
    total: number;
    pending: number;
    approvedThisMonth: number;
    declinedOrDeferred: number;
  };
  monthly: Array<{
    month: string;
    total: number;
    approved: number;
    pending: number;
    declined: number;
  }>;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useFinanceCRs = (params?: {
  projectId?: string;
  clientName?: string;
  status?: string;
  showAll?: boolean;
  currency?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) =>
  useQuery({
    queryKey: ['finance-crs', params],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: FinanceCRListResult }>(
        '/dashboard/finance/crs',
        { params },
      );
      return data.data;
    },
  });

export const useFinanceCR = (id: string) =>
  useQuery({
    queryKey: ['finance-cr', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        success: boolean;
        data: FinanceCRSummary & { versions: unknown[]; statusHistory: unknown[] };
      }>(`/dashboard/finance/crs/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

export const useDashboard = (params?: {
  dateFrom?: string;
  dateTo?: string;
  projectId?: string;
  clientName?: string;
}) =>
  useQuery({
    queryKey: ['dashboard', params],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        success: boolean;
        data: FinanceDashboardData | SADashboardData | PODashboardData;
      }>('/dashboard', { params });
      return data.data;
    },
  });
