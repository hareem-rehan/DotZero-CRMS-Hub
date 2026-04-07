'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { DataTable, Column } from '@/components/ui/DataTable';
import { RoleBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { InviteModal } from '@/components/users/InviteModal';
import { useUsers, useSetUserActive, useResendWelcome, useAdminResetPassword, User } from '@/hooks/useUsers';

const ROLE_FILTER = [
  { value: '', label: 'All Roles' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'PRODUCT_OWNER', label: 'Product Owner' },
  { value: 'DELIVERY_MANAGER', label: 'Delivery Manager' },
  { value: 'FINANCE', label: 'Finance' },
];

const STATUS_FILTER = [
  { value: '', label: 'All Statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

export default function UsersListPage() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [isActive, setIsActive] = useState('');
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);

  const { data, isLoading } = useUsers({
    role: role || undefined,
    isActive: isActive !== '' ? isActive === 'true' : undefined,
    search: search || undefined,
  });

  const setActiveMutation = useSetUserActive();
  const resendMutation = useResendWelcome();
  const resetMutation = useAdminResetPassword();

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => (
        <Link href={`/admin/users/${row.id}/edit`} className="font-medium text-[#2D2D2D] hover:text-[#EF323F]">
          {row.name}
        </Link>
      ),
    },
    { key: 'email', header: 'Email', sortable: true },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <RoleBadge role={row.role} />,
    },
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
      header: 'Password Set',
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
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#5D5B5B]">
          <Link href={`/admin/users/${row.id}/edit`} className="hover:text-[#2D2D2D]">Edit</Link>
          <button
            onClick={() => setToggleTarget(row)}
            className="hover:text-[#2D2D2D]"
          >
            {row.isActive ? 'Deactivate' : 'Reactivate'}
          </button>
          <button
            onClick={() => resendMutation.mutate(row.id)}
            className="hover:text-[#2D2D2D]"
          >
            Resend Email
          </button>
          <button
            onClick={() => resetMutation.mutate(row.id)}
            className="hover:text-[#2D2D2D]"
          >
            Reset Password
          </button>
        </div>
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
      title="Users"
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setInviteOpen(true)}>
            Invite Client
          </Button>
          <Button onClick={() => router.push('/admin/users/new')}>+ New User</Button>
        </div>
      }
    >
      {/* Filters */}
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
        emptyMessage="No users found."
      />

      {/* Deactivate/Reactivate confirmation */}
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

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </PageWrapper>
  );
}
