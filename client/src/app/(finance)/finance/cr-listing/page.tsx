'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { DataTable, Column } from '@/components/ui/DataTable';
import { CRStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useFinanceCRs, FinanceCRSummary } from '@/hooks/useDashboard';
import { useProjects } from '@/hooks/useProjects';
import { apiClient } from '@/lib/apiClient';

const STATUS_OPTIONS = [
  { value: '', label: 'Approved Only' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'ESTIMATED', label: 'Estimated' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function FinanceCrListingPage() {
  const [projectId, setProjectId] = useState('');
  const [clientName, setClientName] = useState('');
  const [status, setStatus] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useFinanceCRs({
    projectId: projectId || undefined,
    clientName: clientName || undefined,
    status: status || undefined,
    showAll,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    pageSize: 25,
  });
  const { data: projectsData } = useProjects({ pageSize: 100 });

  const exportFile = async (format: 'csv' | 'pdf') => {
    const params = new URLSearchParams({ format });
    if (projectId) params.set('projectId', projectId);
    if (clientName) params.set('clientName', clientName);
    if (status) params.set('status', status);
    if (showAll) params.set('showAll', 'true');
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const res = await apiClient.get(`/dashboard/export?${params}`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    const cd = (res.headers['content-disposition'] as string) || '';
    const name = cd.match(/filename="(.+?)"/)?.[1] ?? `export.${format}`;
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<FinanceCRSummary>[] = [
    {
      key: 'crNumber',
      header: 'CR #',
      sortable: true,
      render: (row) => (
        <Link
          href={`/finance/cr-listing/${row.id}`}
          className="font-mono text-sm font-semibold text-[#EF323F] hover:underline"
        >
          {row.crNumber}
        </Link>
      ),
    },
    {
      key: 'project',
      header: 'Project',
      render: (row) => <span className="text-sm">{row.project.name}</span>,
    },
    {
      key: 'client',
      header: 'Client',
      render: (row) => (
        <span className="text-sm text-[#5D5B5B]">{row.project.clientName ?? '—'}</span>
      ),
    },
    {
      key: 'dateOfRequest',
      header: 'Approved Date',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-[#5D5B5B]">
          {row.approval?.approvedAt
            ? new Date(row.approval.approvedAt).toLocaleDateString()
            : row.dateOfRequest
              ? new Date(row.dateOfRequest).toLocaleDateString()
              : '—'}
        </span>
      ),
    },
    {
      key: 'estimatedHours',
      header: 'Hours',
      render: (row) => <span className="text-sm font-medium">{row.estimatedHours}h</span>,
    },
    {
      key: 'hourlyRate',
      header: 'Rate',
      render: (row) => (
        <span className="text-sm text-[#5D5B5B]">
          {fmt(row.hourlyRate, row.project.currency)}/h
        </span>
      ),
    },
    {
      key: 'totalCost',
      header: 'Total Cost',
      render: (row) => (
        <span className="text-sm font-semibold text-[#2D2D2D]">
          {fmt(row.totalCost, row.project.currency)}
        </span>
      ),
    },
    {
      key: 'currency',
      header: 'Currency',
      render: (row) => (
        <span className="text-xs font-mono text-[#5D5B5B]">{row.project.currency}</span>
      ),
    },
    {
      key: 'version',
      header: 'Ver',
      render: (row) => <span className="font-mono text-xs">v{row.version}</span>,
    },
    { key: 'status', header: 'Status', render: (row) => <CRStatusBadge status={row.status} /> },
  ];

  return (
    <PageWrapper
      title="CR Listing"
      actions={
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#5D5B5B]">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => {
                setShowAll(e.target.checked);
                setPage(1);
              }}
              className="accent-[#EF323F]"
            />
            Show All Statuses
          </label>
          <Button variant="secondary" onClick={() => exportFile('csv')}>
            Export CSV
          </Button>
          <Button variant="secondary" onClick={() => exportFile('pdf')}>
            Export PDF
          </Button>
        </div>
      }
    >
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
        >
          <option value="">All Projects</option>
          {(projectsData?.projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Client name…"
          value={clientName}
          onChange={(e) => {
            setClientName(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F] w-40"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.crs ?? []}
        keyField="id"
        loading={isLoading}
        emptyMessage="No change requests found."
      />

      {/* Cumulative Totals */}
      {data && data.totals.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4">
          {data.totals.map((t) => (
            <div
              key={t.currency}
              className="rounded-xl border border-[#E5E5E5] bg-white px-5 py-3 shadow-sm flex gap-6 text-sm"
            >
              <span className="font-mono font-bold text-[#5D5B5B]">{t.currency}</span>
              <span>
                <span className="text-[#5D5B5B]">CRs: </span>
                <strong>{t.totalCRs}</strong>
              </span>
              <span>
                <span className="text-[#5D5B5B]">Hours: </span>
                <strong>{t.totalHours}h</strong>
              </span>
              <span>
                <span className="text-[#5D5B5B]">Cost: </span>
                <strong>{fmt(t.totalCost, t.currency)}</strong>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-[#5D5B5B]">
          <span>
            Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, data.total)} of {data.total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
