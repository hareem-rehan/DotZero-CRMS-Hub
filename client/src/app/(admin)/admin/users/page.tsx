'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { DataTable, Column } from '@/components/ui/DataTable';
import { RoleBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';
import {
  useUsers,
  useSetUserActive,
  useResendWelcome,
  useAdminResetPassword,
  useDeleteUser,
  User,
} from '@/hooks/useUsers';

// Only DotZero team roles — PO (external clients) excluded
const ROLE_FILTER = [
  { value: '', label: 'All Roles' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'DELIVERY_MANAGER', label: 'Delivery Manager' },
  { value: 'FINANCE', label: 'Finance' },
];

const STATUS_FILTER = [
  { value: '', label: 'All Statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

function ActionsDropdown({
  row,
  onToggle,
  onDelete,
  onResend,
  onReset,
}: {
  row: User;
  onToggle: () => void;
  onDelete: () => void;
  onResend: () => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-md border border-[#D3D3D3] bg-white px-2.5 py-1.5 text-xs font-medium text-[#2D2D2D] hover:bg-[#F7F7F7] transition-colors"
      >
        Actions
        <svg
          className="h-3.5 w-3.5 text-[#5D5B5B]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-44 rounded-lg border border-[#E5E5E5] bg-white shadow-lg">
          <Link
            href={`/admin/users/${row.id}/edit`}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#2D2D2D] hover:bg-[#F7F7F7]"
            onClick={() => setOpen(false)}
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

          <button
            onClick={() => {
              setOpen(false);
              onToggle();
            }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[#F7F7F7] ${row.isActive ? 'text-amber-600' : 'text-green-700'}`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {row.isActive ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              )}
            </svg>
            {row.isActive ? 'Deactivate' : 'Activate'}
          </button>

          <button
            onClick={() => {
              setOpen(false);
              onResend();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#2D2D2D] hover:bg-[#F7F7F7]"
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
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Resend Welcome
          </button>

          <button
            onClick={() => {
              setOpen(false);
              onReset();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#2D2D2D] hover:bg-[#F7F7F7]"
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
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            Reset Password
          </button>

          <div className="border-t border-[#F0F0F0]" />

          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
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

export default function UsersListPage() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [isActive, setIsActive] = useState('');
  const [search, setSearch] = useState('');
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const { data, isLoading } = useUsers({
    role: role || undefined,
    isActive: isActive !== '' ? isActive === 'true' : undefined,
    search: search || undefined,
  });

  const setActiveMutation = useSetUserActive();
  const deleteMutation = useDeleteUser({
    onSuccess: () => {
      toast.success('User deleted');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete user'),
  });
  const resendMutation = useResendWelcome({
    onSuccess: () => toast.success('Welcome email sent'),
    onError: () => toast.error('Failed to send email'),
  });
  const resetMutation = useAdminResetPassword({
    onSuccess: () => toast.success('Password reset email sent'),
    onError: () => toast.error('Failed to send reset email'),
  });

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => (
        <Link
          href={`/admin/users/${row.id}/edit`}
          className="font-medium text-[#2D2D2D] hover:text-[#EF323F]"
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (row) => <span className="text-sm text-[#5D5B5B]">{row.email}</span>,
    },
    { key: 'role', header: 'Role', render: (row) => <RoleBadge role={row.role} /> },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => (
        <Badge
          label={row.isActive ? 'Active' : 'Inactive'}
          variant={row.isActive ? 'green' : 'gray'}
        />
      ),
    },
    {
      key: 'passwordSetAt',
      header: 'Password',
      render: (row) =>
        row.passwordSetAt ? (
          <Badge label="Set" variant="green" />
        ) : (
          <Badge label="Pending" variant="yellow" />
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <ActionsDropdown
          row={row}
          onToggle={() => setToggleTarget(row)}
          onDelete={() => setDeleteTarget(row)}
          onResend={() => resendMutation.mutate(row.id)}
          onReset={() => resetMutation.mutate(row.id)}
        />
      ),
    },
  ];

  const handleToggleConfirm = async () => {
    if (!toggleTarget) return;
    await setActiveMutation.mutateAsync({ id: toggleTarget.id, active: !toggleTarget.isActive });
    setToggleTarget(null);
  };

  return (
    <PageWrapper
      title="Team Members"
      actions={<Button onClick={() => router.push('/admin/users/new')}>+ New User</Button>}
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F] w-56"
        />
        <Select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={ROLE_FILTER}
          className="w-44"
        />
        <Select
          value={isActive}
          onChange={(e) => setIsActive(e.target.value)}
          options={STATUS_FILTER}
          className="w-36"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.users ?? []}
        keyField="id"
        loading={isLoading}
        emptyMessage="No team members found."
      />

      <Modal
        open={!!toggleTarget}
        title={toggleTarget?.isActive ? 'Deactivate User' : 'Reactivate User'}
        description={
          toggleTarget?.isActive
            ? `Deactivate "${toggleTarget?.name}"? They will not be able to log in.`
            : `Reactivate "${toggleTarget?.name}"? They will regain full access.`
        }
        confirmLabel={toggleTarget?.isActive ? 'Deactivate' : 'Reactivate'}
        loading={setActiveMutation.isPending}
        onConfirm={handleToggleConfirm}
        onCancel={() => setToggleTarget(null)}
      />

      <Modal
        open={!!deleteTarget}
        title="Delete User"
        description={`Permanently delete "${deleteTarget?.name}" (${deleteTarget?.email})? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageWrapper>
  );
}
