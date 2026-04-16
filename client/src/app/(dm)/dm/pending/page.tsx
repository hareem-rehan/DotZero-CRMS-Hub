'use client';

import Link from 'next/link';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { DataTable, Column } from '@/components/ui/DataTable';
import { CRPriorityBadge, CRStatusBadge } from '@/components/ui/Badge';
import { useCRs, CRSummary } from '@/hooks/useCRs';

function DaysPending({ dateStr }: { dateStr: string | null }) {
  if (!dateStr) return <span className="text-xs text-[#D3D3D3]">—</span>;
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  const cls =
    days >= 5
      ? 'text-red-600 font-semibold'
      : days >= 2
        ? 'text-amber-600 font-medium'
        : 'text-[#5D5B5B]';
  return <span className={`text-xs ${cls}`}>{days}d</span>;
}

export default function DmPendingPage() {
  const { data, isLoading } = useCRs({ pageSize: 100 });

  const pending = (data?.crs ?? [])
    .filter((cr) => ['SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW'].includes(cr.status))
    .sort(
      (a, b) =>
        new Date(a.dateOfRequest ?? a.updatedAt).getTime() -
        new Date(b.dateOfRequest ?? b.updatedAt).getTime(),
    );

  const columns: Column<CRSummary>[] = [
    {
      key: 'crNumber',
      header: 'CR #',
      sortable: true,
      render: (row) => (
        <Link
          href={`/dm/pending/${row.id}`}
          className="font-mono text-sm font-medium text-[#EF323F] hover:underline"
        >
          {row.crNumber}
        </Link>
      ),
    },
    {
      key: 'project',
      header: 'Project',
      render: (row) => <span className="text-sm text-[#2D2D2D]">{row.project.name}</span>,
    },
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <Link
          href={`/dm/pending/${row.id}`}
          className="text-sm text-[#2D2D2D] hover:text-[#EF323F] line-clamp-1"
        >
          {row.title}
        </Link>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => <CRPriorityBadge priority={row.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <CRStatusBadge
          status={row.status}
          overrides={{ SUBMITTED: { label: 'Pending Estimation', variant: 'blue' } }}
        />
      ),
    },
    {
      key: 'dateOfRequest',
      header: 'Submitted',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-[#5D5B5B]">
          {row.dateOfRequest ? new Date(row.dateOfRequest).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Days Pending',
      render: (row) => <DaysPending dateStr={row.dateOfRequest} />,
    },
  ];

  return (
    <PageWrapper title="Pending Queue">
      <DataTable
        columns={columns}
        data={pending}
        keyField="id"
        loading={isLoading}
        emptyMessage="No pending change requests."
      />
    </PageWrapper>
  );
}
