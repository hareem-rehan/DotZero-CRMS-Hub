'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { DataTable, Column } from '@/components/ui/DataTable';
import { CRPriorityBadge, CRStatusBadge } from '@/components/ui/Badge';
import { useCRs, useRecallFromClient, CRSummary } from '@/hooks/useCRs';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';

function RecallButton({ crId }: { crId: string }) {
  const recall = useRecallFromClient(crId, {
    onSuccess: () => toast.success('CR recalled to your drafts'),
    onError: (msg) => toast.error(msg),
  });
  return (
    <button
      onClick={() => recall.mutate()}
      disabled={recall.isPending}
      className="text-xs font-medium text-amber-600 hover:underline disabled:opacity-50"
    >
      {recall.isPending ? 'Recalling…' : 'Recall'}
    </button>
  );
}

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

type Tab = 'estimation' | 'drafts' | 'sent' | 'revision';

export default function DmPendingPage() {
  const { data, isLoading } = useCRs({ pageSize: 100 });
  const [tab, setTab] = useState<Tab>('estimation');

  const all = data?.crs ?? [];

  const estimation = all
    .filter((cr) => ['SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW'].includes(cr.status))
    .sort(
      (a, b) =>
        new Date(a.dateOfRequest ?? a.updatedAt).getTime() -
        new Date(b.dateOfRequest ?? b.updatedAt).getTime(),
    );

  // A DM-initiated DRAFT with clientNotes was returned by the PO — show it in revision, not drafts
  const isReturnedDraft = (cr: CRSummary) =>
    cr.initiatedByDm && cr.status === 'DRAFT' && !!cr.clientNotes;
  const drafts = all.filter((cr) => cr.initiatedByDm && cr.status === 'DRAFT' && !cr.clientNotes);
  const sent = all.filter((cr) => cr.status === 'PENDING_CLIENT_REVIEW');
  const revision = all.filter((cr) => cr.status === 'CLIENT_REVISION' || isReturnedDraft(cr));

  const allTabs: { key: Tab; label: string; count: number; alwaysShow?: boolean }[] = [
    { key: 'estimation', label: 'To Estimate', count: estimation.length, alwaysShow: true },
    { key: 'drafts', label: 'My Drafts', count: drafts.length },
    { key: 'sent', label: 'Sent to Client', count: sent.length },
    { key: 'revision', label: 'Client Revision', count: revision.length },
  ];
  const tabs = allTabs.filter((t) => t.alwaysShow || t.count > 0);

  // If active tab becomes hidden (count dropped to 0), fall back to estimation
  useEffect(() => {
    if (!tabs.find((t) => t.key === tab)) setTab('estimation');
  }, [tabs, tab]);

  const estimationColumns: Column<CRSummary>[] = [
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

  const draftColumns: Column<CRSummary>[] = [
    {
      key: 'crNumber',
      header: 'CR #',
      render: (row) => (
        <Link
          href={`/dm/draft/${row.id}`}
          className="font-mono text-sm font-medium text-[#EF323F] hover:underline"
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
      key: 'title',
      header: 'Title',
      render: (row) => (
        <Link
          href={`/dm/draft/${row.id}`}
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
      key: 'submittedBy',
      header: 'On Behalf Of',
      render: (row) => (
        <span className="text-sm text-[#5D5B5B]">{row.submittedBy?.name ?? '—'}</span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      render: (row) => (
        <span className="text-xs text-[#5D5B5B]">
          {new Date(row.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const sentColumns: Column<CRSummary>[] = [
    {
      key: 'crNumber',
      header: 'CR #',
      render: (row) => (
        <Link
          href={`/dm/draft/${row.id}`}
          className="font-mono text-sm font-medium text-[#EF323F] hover:underline"
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
      key: 'title',
      header: 'Title',
      render: (row) => <span className="text-sm text-[#2D2D2D] line-clamp-1">{row.title}</span>,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => <CRPriorityBadge priority={row.priority} />,
    },
    {
      key: 'submittedBy',
      header: 'Client',
      render: (row) => (
        <span className="text-sm text-[#5D5B5B]">{row.submittedBy?.name ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <CRStatusBadge
          status={row.status}
          overrides={
            row.status === 'PENDING_CLIENT_REVIEW' && row.clientNotes
              ? { PENDING_CLIENT_REVIEW: { label: 'Resubmitted to PO', variant: 'blue' } }
              : {}
          }
        />
      ),
    },
    {
      key: 'dateOfRequest',
      header: 'Sent',
      render: (row) => (
        <span className="text-xs text-[#5D5B5B]">
          {row.dateOfRequest ? new Date(row.dateOfRequest).toLocaleDateString() : '—'}
        </span>
      ),
    },
    { key: 'id', header: '', render: (row) => <RecallButton crId={row.id} /> },
  ];

  const revisionColumns: Column<CRSummary>[] = [
    {
      key: 'crNumber',
      header: 'CR #',
      render: (row) => (
        <Link
          href={`/dm/client-revision/${row.id}`}
          className="font-mono text-sm font-medium text-[#EF323F] hover:underline"
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
      key: 'title',
      header: 'Title',
      render: (row) => (
        <Link
          href={`/dm/client-revision/${row.id}`}
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
      key: 'submittedBy',
      header: 'Client',
      render: (row) => (
        <span className="text-sm text-[#5D5B5B]">{row.submittedBy?.name ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) =>
        isReturnedDraft(row) ? (
          <Badge label="Resubmitted by PO" variant="orange" />
        ) : (
          <CRStatusBadge status={row.status} />
        ),
    },
    {
      key: 'updatedAt',
      header: 'Revised',
      render: (row) => (
        <span className="text-xs text-[#5D5B5B]">
          {new Date(row.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const activeData =
    tab === 'estimation'
      ? estimation
      : tab === 'drafts'
        ? drafts
        : tab === 'sent'
          ? sent
          : revision;
  const activeColumns =
    tab === 'estimation'
      ? estimationColumns
      : tab === 'drafts'
        ? draftColumns
        : tab === 'sent'
          ? sentColumns
          : revisionColumns;
  const emptyMessages = {
    estimation: 'No pending change requests.',
    drafts: 'No draft CRs.',
    sent: 'No CRs sent to client.',
    revision: 'No CRs in client revision.',
  };

  return (
    <PageWrapper
      title="Pending Queue"
      actions={
        <Link
          href="/dm/create-cr"
          className="rounded-lg bg-[#EF323F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d42b37]"
        >
          + Create CR for Client
        </Link>
      }
    >
      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-[#E5E5E5]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-b-2 border-[#EF323F] text-[#EF323F]'
                : 'text-[#5D5B5B] hover:text-[#2D2D2D]'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  tab === t.key ? 'bg-[#EF323F] text-white' : 'bg-gray-100 text-[#5D5B5B]'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <DataTable
        columns={activeColumns as Column<CRSummary>[]}
        data={activeData}
        keyField="id"
        loading={isLoading}
        emptyMessage={emptyMessages[tab]}
      />
    </PageWrapper>
  );
}
