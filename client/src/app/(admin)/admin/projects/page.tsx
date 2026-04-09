'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { DataTable, Column } from '@/components/ui/DataTable';
import { ProjectStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useProjects, useArchiveProject, useUnarchiveProject, useClientNames, Project } from '@/hooks/useProjects';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function ProjectsListPage() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [clientName, setClientName] = useState('');
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null);

  const { data, isLoading } = useProjects({ status: status || undefined, search: search || undefined, clientName: clientName || undefined });
  const { data: clientNames = [] } = useClientNames();
  const archiveMutation = useArchiveProject();
  const unarchiveMutation = useUnarchiveProject();

  const clientNameOptions = [
    { value: '', label: 'All Clients' },
    ...clientNames.map((n) => ({ value: n, label: n })),
  ];

  const columns: Column<Project>[] = [
    {
      key: 'name',
      header: 'Project Name',
      sortable: true,
      render: (row) => (
        <Link href={`/admin/projects/${row.id}`} className="font-medium text-[#EF323F] hover:underline">
          {row.name}
        </Link>
      ),
    },
    { key: 'clientName', header: 'Client', sortable: true },
    { key: 'code', header: 'Code', sortable: true },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <ProjectStatusBadge status={row.status} />,
    },
    {
      key: '_count',
      header: '# CRs',
      render: (row) => String(row._count?.changeRequests ?? 0),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Link
            href={`/admin/projects/${row.id}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#D3D3D3] px-2 py-1 text-xs font-medium text-[#5D5B5B] hover:border-[#2D2D2D] hover:text-[#2D2D2D] hover:bg-[#F7F7F7] transition-colors"
            title="View project"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            View
          </Link>
          <Link
            href={`/admin/projects/${row.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#D3D3D3] px-2 py-1 text-xs font-medium text-[#5D5B5B] hover:border-[#2D2D2D] hover:text-[#2D2D2D] hover:bg-[#F7F7F7] transition-colors"
            title="Edit project"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Edit
          </Link>
          <button
            onClick={() => setArchiveTarget(row)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
              row.status === 'ARCHIVED'
                ? 'border-green-200 text-green-700 hover:bg-green-50'
                : 'border-orange-200 text-orange-700 hover:bg-orange-50'
            }`}
            title={row.status === 'ARCHIVED' ? 'Unarchive project' : 'Archive project'}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            {row.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}
          </button>
        </div>
      ),
    },
  ];

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    if (archiveTarget.status === 'ARCHIVED') {
      await unarchiveMutation.mutateAsync(archiveTarget.id);
    } else {
      await archiveMutation.mutateAsync(archiveTarget.id);
    }
    setArchiveTarget(null);
  };

  return (
    <PageWrapper
      title="Projects"
      actions={<Button onClick={() => router.push('/admin/projects/new')}>+ New Project</Button>}
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F] w-52"
        />
        <Select
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          options={clientNameOptions}
          className="w-44"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={STATUS_FILTER_OPTIONS}
          className="w-40"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.projects ?? []}
        keyField="id"
        loading={isLoading}
        emptyMessage="No projects found."
      />

      <Modal
        open={!!archiveTarget}
        title={archiveTarget?.status === 'ARCHIVED' ? 'Unarchive Project' : 'Archive Project'}
        description={
          archiveTarget?.status === 'ARCHIVED'
            ? `Restore "${archiveTarget?.name}" to active status?`
            : `Archive "${archiveTarget?.name}"? No new CRs can be raised while archived.`
        }
        confirmLabel={archiveTarget?.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}
        loading={archiveMutation.isPending || unarchiveMutation.isPending}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setArchiveTarget(null)}
      />
    </PageWrapper>
  );
}
