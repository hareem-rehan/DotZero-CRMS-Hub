'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { DataTable, Column } from '@/components/ui/DataTable';
import { CRStatusBadge, CRPriorityBadge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { useCRs, CRSummary } from '@/hooks/useCRs';
import { useProjects } from '@/hooks/useProjects';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'ESTIMATED', label: 'Estimated' },
  { value: 'RESUBMITTED', label: 'Resubmitted' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

export default function DmAllCRsPage() {
  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useCRs({ search: search || undefined, projectId: projectId || undefined, status: status || undefined, priority: priority || undefined, page, pageSize: 20 });
  const { data: projectsData } = useProjects({ pageSize: 100 });

  const projectOptions = [
    { value: '', label: 'All Projects' },
    ...(projectsData?.projects ?? []).map((p) => ({ value: p.id, label: p.name })),
  ];

  const columns: Column<CRSummary>[] = [
    {
      key: 'crNumber',
      header: 'CR #',
      sortable: true,
      render: (row) => (
        <Link href={`/dm/all-crs/${row.id}`} className="font-mono text-sm font-medium text-[#EF323F] hover:underline">
          {row.crNumber}
        </Link>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <Link href={`/dm/all-crs/${row.id}`} className="text-sm text-[#2D2D2D] hover:text-[#EF323F] line-clamp-1">
          {row.title}
        </Link>
      ),
    },
    {
      key: 'project',
      header: 'Project',
      render: (row) => <span className="text-sm text-[#5D5B5B]">{row.project.name}</span>,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => <CRPriorityBadge priority={row.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <CRStatusBadge status={row.status} />,
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      sortable: true,
      render: (row) => <span className="text-sm text-[#5D5B5B]">{new Date(row.updatedAt).toLocaleDateString()}</span>,
    },
  ];

  return (
    <PageWrapper title="All Change Requests">
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by CR# or title…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F] w-52"
        />
        <Select value={projectId} onChange={(e) => { setProjectId(e.target.value); setPage(1); }} options={projectOptions} className="w-44" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={STATUS_OPTIONS} className="w-40" />
        <Select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} options={PRIORITY_OPTIONS} className="w-36" />
      </div>

      <DataTable columns={columns} data={data?.crs ?? []} keyField="id" loading={isLoading} emptyMessage="No change requests found." />

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-[#5D5B5B]">
          <span>Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, data.total)} of {data.total}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border border-[#D3D3D3] px-3 py-1 text-xs disabled:opacity-40 hover:bg-gray-50">Previous</button>
            <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="rounded-md border border-[#D3D3D3] px-3 py-1 text-xs disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
