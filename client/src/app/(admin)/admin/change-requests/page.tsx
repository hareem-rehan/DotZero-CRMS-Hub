'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { DataTable, Column } from '@/components/ui/DataTable';
import { CRStatusBadge, CRPriorityBadge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { useCRs, CRSummary } from '@/hooks/useCRs';
import { useProjects, useMyProjects } from '@/hooks/useProjects';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'ESTIMATED', label: 'Estimated' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'DEFERRED', label: 'Deferred' },
  { value: 'RESUBMITTED', label: 'Resubmitted' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'SCOPE', label: 'Scope' },
  { value: 'TIMELINE', label: 'Timeline' },
  { value: 'BOTH', label: 'Both' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

// ─── Shared CRs table ────────────────────────────────────────────────────────

function CRsTable({
  assignedToMe = false,
  projectOptions,
}: {
  assignedToMe?: boolean;
  projectOptions: { value: string; label: string }[];
}) {
  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState('');
  const [changeType, setChangeType] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useCRs({
    search: search || undefined,
    projectId: projectId || undefined,
    status: status || undefined,
    changeType: changeType || undefined,
    priority: priority || undefined,
    page,
    pageSize: 20,
    assignedToMe: assignedToMe || undefined,
  });

  const columns: Column<CRSummary>[] = [
    {
      key: 'crNumber',
      header: 'CR #',
      sortable: true,
      render: (row) => (
        <Link
          href={`/admin/change-requests/${row.id}`}
          className="font-mono text-sm font-medium text-[#EF323F] hover:underline"
        >
          {row.crNumber}
        </Link>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (row) => (
        <Link
          href={`/admin/change-requests/${row.id}`}
          className="text-sm text-[#2D2D2D] hover:text-[#EF323F] line-clamp-1"
        >
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
      key: 'submittedBy',
      header: 'Submitted By',
      render: (row) => <span className="text-sm text-[#5D5B5B]">{row.submittedBy.name}</span>,
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
      render: (row) => (
        <span className="text-sm text-[#5D5B5B]">
          {new Date(row.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by CR# or title…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F] w-52"
        />
        <Select
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setPage(1);
          }}
          options={projectOptions}
          className="w-48"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          options={STATUS_OPTIONS}
          className="w-40"
        />
        <Select
          value={changeType}
          onChange={(e) => {
            setChangeType(e.target.value);
            setPage(1);
          }}
          options={TYPE_OPTIONS}
          className="w-36"
        />
        <Select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setPage(1);
          }}
          options={PRIORITY_OPTIONS}
          className="w-36"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.crs ?? []}
        keyField="id"
        loading={isLoading}
        emptyMessage="No change requests found."
      />

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-[#5D5B5B]">
          <span>
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-[#D3D3D3] px-3 py-1 text-xs disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="rounded-md border border-[#D3D3D3] px-3 py-1 text-xs disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AllCRsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');

  const { data: projectsData } = useProjects({ pageSize: 100 });
  const { data: myProjects } = useMyProjects();

  const hasMyProjects = (myProjects ?? []).length > 0;

  const allProjectOptions = [
    { value: '', label: 'All Projects' },
    ...(projectsData?.projects ?? []).map((p) => ({ value: p.id, label: `${p.name} (${p.code})` })),
  ];

  const myProjectOptions = [
    { value: '', label: 'All My Projects' },
    ...(myProjects ?? []).map((p) => ({ value: p.id, label: p.name })),
  ];

  const tabs = [
    { key: 'all' as const, label: 'All CRs' },
    ...(hasMyProjects ? [{ key: 'mine' as const, label: 'My Project CRs' }] : []),
  ];

  return (
    <PageWrapper title="All Change Requests">
      {/* Tabs — only rendered when SA has DM-assigned projects */}
      {hasMyProjects && (
        <div className="mb-5 flex gap-1 border-b border-[#E5E5E5]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-[#EF323F] text-[#EF323F]'
                  : 'border-transparent text-[#5D5B5B] hover:text-[#2D2D2D]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'all' ? (
        <CRsTable projectOptions={allProjectOptions} />
      ) : (
        <CRsTable assignedToMe projectOptions={myProjectOptions} />
      )}
    </PageWrapper>
  );
}
