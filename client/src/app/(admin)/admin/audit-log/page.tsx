'use client';

import { useState } from 'react';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { DataTable, Column } from '@/components/ui/DataTable';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

interface AuditEntry {
  id: string;
  event: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  actor: { id: string; name: string; email: string; role: string } | null;
}

interface AuditLogResult {
  logs: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const EVENT_COLORS: Record<string, string> = {
  USER_LOGIN: 'bg-blue-50 text-blue-700',
  USER_CREATED: 'bg-green-50 text-green-700',
  USER_UPDATED: 'bg-yellow-50 text-yellow-700',
  USER_DEACTIVATED: 'bg-red-50 text-red-700',
  USER_REACTIVATED: 'bg-green-50 text-green-700',
  PROJECT_CREATED: 'bg-green-50 text-green-700',
  PROJECT_UPDATED: 'bg-yellow-50 text-yellow-700',
  PROJECT_ARCHIVED: 'bg-orange-50 text-orange-700',
  PROJECT_UNARCHIVED: 'bg-green-50 text-green-700',
  CR_CREATED: 'bg-blue-50 text-blue-700',
  CR_SUBMITTED: 'bg-purple-50 text-purple-700',
  INVITATION_SENT: 'bg-indigo-50 text-indigo-700',
  FAILED_LOGIN_ATTEMPT: 'bg-red-50 text-red-700',
  PASSWORD_RESET: 'bg-orange-50 text-orange-700',
  ADMIN_PASSWORD_RESET: 'bg-orange-50 text-orange-700',
};

export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', { search, entityType, page }],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: AuditLogResult }>(
        '/audit-log',
        { params: { search: search || undefined, entityType: entityType || undefined, page, pageSize: 50 } },
      );
      return data.data;
    },
  });

  const ENTITY_OPTIONS = [
    { value: '', label: 'All Entities' },
    { value: 'User', label: 'User' },
    { value: 'Project', label: 'Project' },
    { value: 'ChangeRequest', label: 'Change Request' },
    { value: 'Invitation', label: 'Invitation' },
  ];

  const columns: Column<AuditEntry>[] = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (row) => (
        <span className="text-xs text-[#5D5B5B] whitespace-nowrap">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'event',
      header: 'Event',
      render: (row) => {
        const cls = EVENT_COLORS[row.event] ?? 'bg-gray-100 text-gray-700';
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
            {row.event.replace(/_/g, ' ')}
          </span>
        );
      },
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (row) =>
        row.actor ? (
          <div className="text-sm">
            <p className="font-medium text-[#2D2D2D]">{row.actor.name}</p>
            <p className="text-xs text-[#5D5B5B]">{row.actor.email}</p>
          </div>
        ) : (
          <span className="text-xs text-[#5D5B5B]">System</span>
        ),
    },
    {
      key: 'entityType',
      header: 'Entity',
      render: (row) => (
        <div className="text-xs">
          <span className="font-medium text-[#2D2D2D]">{row.entityType}</span>
          <p className="text-[#5D5B5B] font-mono truncate max-w-[120px]">{row.entityId}</p>
        </div>
      ),
    },
    {
      key: 'metadata',
      header: 'Details',
      render: (row) =>
        row.metadata ? (
          <span className="text-xs text-[#5D5B5B] font-mono truncate max-w-[200px] block">
            {JSON.stringify(row.metadata)}
          </span>
        ) : (
          <span className="text-xs text-[#D3D3D3]">—</span>
        ),
    },
    {
      key: 'ipAddress',
      header: 'IP',
      render: (row) => (
        <span className="text-xs text-[#5D5B5B]">{row.ipAddress ?? '—'}</span>
      ),
    },
  ];

  return (
    <PageWrapper title="Audit Log">
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search events…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F] w-52"
        />
        <select
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          className="rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F] w-44"
        >
          {ENTITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {data && (
          <span className="flex items-center text-sm text-[#5D5B5B]">
            {data.total} entries
          </span>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.logs ?? []}
        keyField="id"
        loading={isLoading}
        emptyMessage="No audit entries found."
      />

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-[#5D5B5B]">
          <span>Page {page} of {data.totalPages}</span>
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
    </PageWrapper>
  );
}
