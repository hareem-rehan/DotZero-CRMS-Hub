'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { CRStatusBadge, CRPriorityBadge } from '@/components/ui/Badge';
import { useDashboard, PODashboardData } from '@/hooks/useDashboard';
import { useMyProjects } from '@/hooks/useProjects';
import { apiClient } from '@/lib/apiClient';
import { CRSummary } from '@/hooks/useCRs';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${accent ? 'border-[#EF323F]/20 bg-[#FFF5F5]' : 'border-[#E5E5E5] bg-white'}`}
    >
      <p className="text-xs uppercase tracking-wide text-[#5D5B5B]">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accent ? 'text-[#EF323F]' : 'text-[#2D2D2D]'}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-[#5D5B5B]">{sub}</p>}
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'ESTIMATED', label: 'Estimated' },
  { value: 'RESUBMITTED', label: 'Resubmitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'DEFERRED', label: 'Deferred' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PODashboardPage() {
  const { data, isLoading, isError } = useDashboard();
  const po = data as PODashboardData | undefined;

  // Filters for CR table
  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const { data: myProjects } = useMyProjects();

  const { data: crData, isLoading: crLoading } = useQuery<{
    crs: CRSummary[];
    total: number;
    totalPages: number;
  }>({
    queryKey: ['po-dashboard-crs', search, projectId, status, dateFrom, dateTo, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '15' });
      if (search) params.set('search', search);
      if (projectId) params.set('projectId', projectId);
      if (status) params.set('status', status);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await apiClient.get(`/change-requests?${params}`);
      return res.data.data;
    },
  });

  const resetFilters = () => {
    setSearch('');
    setProjectId('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilter = search || projectId || status || dateFrom || dateTo;

  // Bar chart max for monthly breakdown
  const maxMonthTotal = useMemo(
    () => Math.max(...(po?.monthly ?? []).map((m) => m.total), 1),
    [po],
  );

  return (
    <PageWrapper title="Dashboard">
      {isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Failed to load dashboard data. Please refresh the page.
        </p>
      ) : isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#5D5B5B]">Loading…</div>
      ) : (
        <div className="space-y-6">
          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total CRs" value={po?.summary?.total ?? 0} />
            <StatCard
              label="Pending"
              value={po?.summary?.pending ?? 0}
              sub="Awaiting action"
              accent={(po?.summary?.pending ?? 0) > 0}
            />
            <StatCard
              label="Approved This Month"
              value={po?.summary?.approvedThisMonth ?? 0}
              sub="Current month"
            />
            <StatCard label="Declined / Deferred" value={po?.summary?.declinedOrDeferred ?? 0} />
          </div>

          {/* ── Monthly Breakdown ── */}
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-base font-semibold text-[#2D2D2D]">
              Monthly Breakdown — Last 6 Months
            </h2>
            <div className="flex items-end gap-3 h-40">
              {(po?.monthly ?? []).map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-col-reverse gap-0.5" style={{ height: '120px' }}>
                    {/* Approved */}
                    {m.approved > 0 && (
                      <div
                        className="w-full rounded-sm bg-green-400"
                        style={{ height: `${(m.approved / maxMonthTotal) * 120}px` }}
                        title={`Approved: ${m.approved}`}
                      />
                    )}
                    {/* Pending */}
                    {m.pending > 0 && (
                      <div
                        className="w-full rounded-sm bg-blue-400"
                        style={{ height: `${(m.pending / maxMonthTotal) * 120}px` }}
                        title={`Pending: ${m.pending}`}
                      />
                    )}
                    {/* Declined/Deferred */}
                    {m.declined > 0 && (
                      <div
                        className="w-full rounded-sm bg-red-400"
                        style={{ height: `${(m.declined / maxMonthTotal) * 120}px` }}
                        title={`Declined/Deferred: ${m.declined}`}
                      />
                    )}
                  </div>
                  <p className="text-xs text-[#5D5B5B] text-center leading-tight">{m.month}</p>
                  <p className="text-xs font-semibold text-[#2D2D2D]">{m.total}</p>
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="mt-4 flex gap-5 text-xs text-[#5D5B5B]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-400" />
                Approved
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-400" />
                Pending
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400" />
                Declined / Deferred
              </span>
            </div>
          </div>

          {/* ── CR Table with Filters ── */}
          <div className="rounded-xl border border-[#E5E5E5] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-4">
              <h2 className="text-base font-semibold text-[#2D2D2D]">All Change Requests</h2>
              <span className="text-sm text-[#5D5B5B]">{crData?.total ?? 0} total</span>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 border-b border-[#E5E5E5] bg-[#FAFAFA] px-6 py-3">
              {/* Search */}
              <input
                type="text"
                placeholder="Search CR # or title…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-48 rounded-lg border border-[#D3D3D3] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              />
              {/* Project */}
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-[#D3D3D3] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              >
                <option value="">All Projects</option>
                {(myProjects ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {/* Status */}
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-[#D3D3D3] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {/* Date From */}
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-[#D3D3D3] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              />
              {/* Date To */}
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-[#D3D3D3] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              />
              {hasActiveFilter && (
                <button onClick={resetFilters} className="text-xs text-[#EF323F] hover:underline">
                  Clear filters
                </button>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E5E5] bg-[#F7F7F7]">
                    {['CR #', 'Title', 'Project', 'Priority', 'Status', 'Date'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5D5B5B]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {crLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#5D5B5B]">
                        Loading…
                      </td>
                    </tr>
                  ) : (crData?.crs ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#5D5B5B]">
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
                            href={`/client/my-crs/${cr.id}`}
                            className="font-mono text-xs font-semibold text-[#EF323F] hover:underline"
                          >
                            {cr.crNumber}
                          </Link>
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-3 font-medium text-[#2D2D2D]">
                          {cr.title}
                        </td>
                        <td className="px-4 py-3 text-[#5D5B5B]">{cr.project.name}</td>
                        <td className="px-4 py-3">
                          <CRPriorityBadge priority={cr.priority} />
                        </td>
                        <td className="px-4 py-3">
                          <CRStatusBadge status={cr.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-[#5D5B5B]">
                          {cr.dateOfRequest ? new Date(cr.dateOfRequest).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {(crData?.totalPages ?? 0) > 1 && (
              <div className="flex items-center justify-between border-t border-[#E5E5E5] px-6 py-3 text-sm text-[#5D5B5B]">
                <span>
                  Page {page} of {crData?.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-[#D3D3D3] px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-[#F7F7F7]"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(crData!.totalPages, p + 1))}
                    disabled={page === crData?.totalPages}
                    className="rounded-lg border border-[#D3D3D3] px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-[#F7F7F7]"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
