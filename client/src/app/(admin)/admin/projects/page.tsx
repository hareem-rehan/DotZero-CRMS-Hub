'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { DataTable, Column } from '@/components/ui/DataTable';
import { ProjectStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import {
  useProjects,
  useArchiveProject,
  useUnarchiveProject,
  useDeleteProject,
  useClientNames,
  Project,
} from '@/hooks/useProjects';
import { toast } from 'sonner';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'ARCHIVED', label: 'Archived' },
];

// ─── Row Actions Dropdown ─────────────────────────────────────────────────────

function ActionsMenu({
  row,
  onArchive,
  onDelete,
}: {
  row: Project;
  onArchive: (row: Project) => void;
  onDelete: (row: Project) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      // Flip upward if less than 200px below the button to the bottom of viewport
      setDropUp(window.innerHeight - rect.bottom < 200);
    }
    setOpen((v) => !v);
  };

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        onClick={handleOpen}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Project actions"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[#D3D3D3] bg-white text-[#5D5B5B] hover:bg-[#F7F7F7] hover:border-[#2D2D2D] hover:text-[#2D2D2D] transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Project actions"
          className={`absolute right-0 z-50 w-44 rounded-xl border border-[#E5E5E5] bg-white shadow-lg py-1 ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          {/* View */}
          <Link
            href={`/admin/projects/${row.id}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#2D2D2D] hover:bg-[#F7F7F7] transition-colors"
          >
            <svg
              className="h-4 w-4 text-[#5D5B5B]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            View
          </Link>

          {/* Edit */}
          <Link
            href={`/admin/projects/${row.id}/edit`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#2D2D2D] hover:bg-[#F7F7F7] transition-colors"
          >
            <svg
              className="h-4 w-4 text-[#5D5B5B]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit
          </Link>

          <div className="my-1 border-t border-[#F0F0F0]" />

          {/* Archive / Unarchive */}
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onArchive(row);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-[#F7F7F7] transition-colors text-amber-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
              />
            </svg>
            {row.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}
          </button>

          {/* Delete */}
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete(row);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectsListPage() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [clientName, setClientName] = useState('');
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const { data, isLoading } = useProjects({
    status: status || undefined,
    search: search || undefined,
    clientName: clientName || undefined,
  });
  const { data: clientNames = [] } = useClientNames();
  const archiveMutation = useArchiveProject();
  const unarchiveMutation = useUnarchiveProject();
  const deleteMutation = useDeleteProject();

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
        <Link
          href={`/admin/projects/${row.id}`}
          className="font-medium text-[#EF323F] hover:underline"
        >
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
        <ActionsMenu row={row} onArchive={setArchiveTarget} onDelete={setDeleteTarget} />
      ),
    },
  ];

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      if (archiveTarget.status === 'ARCHIVED') {
        await unarchiveMutation.mutateAsync(archiveTarget.id);
        toast.success(`"${archiveTarget.name}" restored to active`);
      } else {
        await archiveMutation.mutateAsync(archiveTarget.id);
        toast.success(`"${archiveTarget.name}" archived`);
      }
    } catch {
      toast.error('Action failed. Please try again.');
    } finally {
      setArchiveTarget(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Delete failed. Projects with CRs cannot be deleted.';
      toast.error(msg);
    } finally {
      setDeleteTarget(null);
    }
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

      {/* Archive / Unarchive confirmation */}
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

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        title="Delete Project"
        description={`Permanently delete "${deleteTarget?.name}"? This cannot be undone. Projects with existing CRs cannot be deleted.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageWrapper>
  );
}
