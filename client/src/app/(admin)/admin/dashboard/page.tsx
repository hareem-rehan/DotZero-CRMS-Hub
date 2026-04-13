'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { CRStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useDashboard, SADashboardData } from '@/hooks/useDashboard';
import { useProjects } from '@/hooks/useProjects';
import { apiClient } from '@/lib/apiClient';
import { CRSummary } from '@/hooks/useCRs';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

const CR_STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'ESTIMATED', label: 'Estimated' },
  { value: 'RESUBMITTED', label: 'Resubmitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${accent ? 'border-[#EF323F]/20 bg-[#FFF5F5]' : 'border-[#E5E5E5] bg-white'}`}
    >
      <p className="text-xs text-[#5D5B5B] uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accent ? 'text-[#EF323F]' : 'text-[#2D2D2D]'}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-[#5D5B5B]">{sub}</p>}
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admins',
  DELIVERY_MANAGER: 'Delivery Managers',
  PRODUCT_OWNER: 'Product Owners',
  FINANCE: 'Finance',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { data, isLoading } = useDashboard();
  const sa = data as SADashboardData | undefined;

  // CR table filters
  const [crProjectId, setCrProjectId] = useState('');
  const [crStatus, setCrStatus] = useState('');
  const [crClient, setCrClient] = useState('');
  const [crDateFrom, setCrDateFrom] = useState('');
  const [crDateTo, setCrDateTo] = useState('');
  const [crPage, setCrPage] = useState(1);

  const { data: projectsData } = useProjects({ pageSize: 100 });

  const { data: crData, isLoading: crLoading } = useQuery<{
    crs: CRSummary[];
    total: number;
    totalPages: number;
  }>({
    queryKey: ['admin-crs', crProjectId, crStatus, crClient, crDateFrom, crDateTo, crPage],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(crPage), pageSize: '15' });
      if (crProjectId) params.set('projectId', crProjectId);
      if (crStatus) params.set('status', crStatus);
      if (crDateFrom) params.set('dateFrom', crDateFrom);
      if (crDateTo) params.set('dateTo', crDateTo);
      const res = await apiClient.get(`/change-requests?${params}`);
      return res.data.data;
    },
  });

  const costChange = sa?.costChangePercent;
  const costChip =
    costChange !== null && costChange !== undefined ? (
      <span
        className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${costChange >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
      >
        {costChange >= 0 ? '+' : ''}
        {costChange}% vs last month
      </span>
    ) : null;

  return (
    <PageWrapper title="Dashboard">
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#5D5B5B]">Loading…</div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Active Projects" value={sa?.activeProjects ?? 0} />
            <StatCard label="CRs This Month" value={sa?.thisMonthCRs ?? 0} />
            <StatCard
              label="Approved Cost"
              value={
                <>
                  {fmt(sa?.thisMonthCost ?? 0)}
                  {costChip}
                </>
              }
              accent
            />
            <StatCard
              label="Pending Actions"
              value={sa?.pendingActions?.length ?? 0}
              sub={sa?.pendingActions?.length ? 'CRs stuck > 48h' : 'All caught up'}
            />
          </div>

          {/* Users by role */}
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-[#2D2D2D]">Active Users by Role</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(sa?.usersByRole ?? []).map((r) => (
                <div
                  key={r.role}
                  className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-4 text-center"
                >
                  <p className="text-2xl font-bold text-[#2D2D2D]">{r.count}</p>
                  <p className="mt-1 text-xs text-[#5D5B5B]">{ROLE_LABELS[r.role] ?? r.role}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── All CRs Table ── */}
          <div className="rounded-xl border border-[#E5E5E5] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-4">
              <h2 className="text-base font-semibold text-[#2D2D2D]">All Change Requests</h2>
              <span className="text-sm text-[#5D5B5B]">{crData?.total ?? 0} total</span>
            </div>

            {/* CR Filters */}
            <div className="flex flex-wrap gap-3 px-6 py-3 border-b border-[#E5E5E5] bg-[#FAFAFA]">
              <select
                value={crProjectId}
                onChange={(e) => {
                  setCrProjectId(e.target.value);
                  setCrPage(1);
                }}
                className="rounded-lg border border-[#D3D3D3] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              >
                <option value="">All Projects</option>
                {(projectsData?.projects ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                value={crStatus}
                onChange={(e) => {
                  setCrStatus(e.target.value);
                  setCrPage(1);
                }}
                className="rounded-lg border border-[#D3D3D3] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              >
                {CR_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Client name…"
                value={crClient}
                onChange={(e) => {
                  setCrClient(e.target.value);
                  setCrPage(1);
                }}
                className="rounded-lg border border-[#D3D3D3] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F] w-36"
              />
              <input
                type="date"
                value={crDateFrom}
                onChange={(e) => {
                  setCrDateFrom(e.target.value);
                  setCrPage(1);
                }}
                className="rounded-lg border border-[#D3D3D3] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              />
              <input
                type="date"
                value={crDateTo}
                onChange={(e) => {
                  setCrDateTo(e.target.value);
                  setCrPage(1);
                }}
                className="rounded-lg border border-[#D3D3D3] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E5E5] bg-[#F7F7F7]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5D5B5B] uppercase tracking-wide">
                      CR #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5D5B5B] uppercase tracking-wide">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5D5B5B] uppercase tracking-wide">
                      Project
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5D5B5B] uppercase tracking-wide">
                      Submitted By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5D5B5B] uppercase tracking-wide">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5D5B5B] uppercase tracking-wide">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {crLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-[#5D5B5B]">
                        Loading…
                      </td>
                    </tr>
                  ) : (crData?.crs ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-[#5D5B5B]">
                        No change requests found.
                      </td>
                    </tr>
                  ) : (
                    (crData?.crs ?? []).map((cr) => (
                      <tr
                        key={cr.id}
                        className="border-b border-[#E5E5E5] last:border-0 hover:bg-[#FAFAFA]"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/change-requests/${cr.id}`}
                            className="font-mono text-xs font-semibold text-[#EF323F] hover:underline"
                          >
                            {cr.crNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium text-[#2D2D2D] max-w-[200px] truncate">
                          {cr.title}
                        </td>
                        <td className="px-4 py-3 text-[#5D5B5B]">{cr.project.name}</td>
                        <td className="px-4 py-3 text-[#5D5B5B]">{cr.submittedBy.name}</td>
                        <td className="px-4 py-3 text-[#5D5B5B]">
                          {cr.dateOfRequest ? new Date(cr.dateOfRequest).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <CRStatusBadge status={cr.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* CR Pagination */}
            {(crData?.totalPages ?? 0) > 1 && (
              <div className="flex items-center justify-between border-t border-[#E5E5E5] px-6 py-3 text-sm text-[#5D5B5B]">
                <span>
                  Page {crPage} of {crData?.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setCrPage((p) => Math.max(1, p - 1))}
                    disabled={crPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setCrPage((p) => Math.min(crData!.totalPages, p + 1))}
                    disabled={crPage === crData?.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Pending actions alert */}
          {(sa?.pendingActions?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="mb-4 text-base font-semibold text-amber-900">
                CRs Awaiting DM Review (&gt;48h)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-amber-700">
                      <th className="pb-2 pr-4">CR #</th>
                      <th className="pb-2 pr-4">Project</th>
                      <th className="pb-2 pr-4">Submitted By</th>
                      <th className="pb-2 pr-4">Submitted</th>
                      <th className="pb-2">Hours Stuck</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {sa!.pendingActions.map((cr) => (
                      <tr key={cr.id}>
                        <td className="py-2 pr-4 font-mono font-semibold text-[#EF323F]">
                          {cr.crNumber}
                        </td>
                        <td className="py-2 pr-4 text-amber-900">{cr.projectName}</td>
                        <td className="py-2 pr-4 text-amber-800">{cr.submittedBy}</td>
                        <td className="py-2 pr-4 text-amber-700">
                          {cr.dateOfRequest ? new Date(cr.dateOfRequest).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${(cr.hoursStuck ?? 0) >= 120 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
                          >
                            {cr.hoursStuck}h
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
