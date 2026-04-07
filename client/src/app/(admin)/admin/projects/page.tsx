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
import { useProjects, useArchiveProject, useUnarchiveProject, Project } from '@/hooks/useProjects';

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
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null);

  const { data, isLoading } = useProjects({ status: status || undefined, search: search || undefined });
  const archiveMutation = useArchiveProject();
  const unarchiveMutation = useUnarchiveProject();

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
      key: 'userAssignments',
      header: '# Users',
      render: (row) => String(row._count?.userAssignments ?? 0),
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
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/projects/${row.id}/edit`}
            className="text-xs font-medium text-[#5D5B5B] hover:text-[#2D2D2D]"
          >
            Edit
          </Link>
          <button
            onClick={() => setArchiveTarget(row)}
            className="text-xs font-medium text-[#5D5B5B] hover:text-[#2D2D2D]"
          >
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

  const isArchiving = archiveMutation.isPending || unarchiveMutation.isPending;

  return (
    <PageWrapper
      title="Projects"
      actions={
        <Button onClick={() => router.push('/admin/projects/new')}>
          + New Project
        </Button>
      }
    >
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F] w-56"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={STATUS_FILTER_OPTIONS}
          className="w-44"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.projects ?? []}
        keyField="id"
        loading={isLoading}
        emptyMessage="No projects found."
      />

      {/* Archive/Unarchive confirmation modal */}
      <Modal
        open={!!archiveTarget}
        title={archiveTarget?.status === 'ARCHIVED' ? 'Unarchive Project' : 'Archive Project'}
        description={
          archiveTarget?.status === 'ARCHIVED'
            ? `Restore "${archiveTarget?.name}" to active status?`
            : `Archive "${archiveTarget?.name}"? No new CRs can be raised while archived.`
        }
        confirmLabel={archiveTarget?.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}
        loading={isArchiving}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setArchiveTarget(null)}
      />
    </PageWrapper>
  );
}
