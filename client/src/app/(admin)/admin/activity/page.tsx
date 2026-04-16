'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { apiClient } from '@/lib/apiClient';

interface AuditEntry {
  id: string;
  event: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; name: string; email: string; role: string } | null;
}

interface AuditLogResult {
  logs: AuditEntry[];
  total: number;
  totalPages: number;
}

const EVENT_LABELS: Record<string, string> = {
  USER_CREATED: 'Created user',
  USER_UPDATED: 'Updated user',
  USER_DEACTIVATED: 'Deactivated user',
  USER_REACTIVATED: 'Reactivated user',
  USER_WELCOME_RESENT: 'Resent welcome email',
  ADMIN_PASSWORD_RESET: 'Reset password',
  PROJECT_CREATED: 'Created project',
  PROJECT_UPDATED: 'Updated project',
  PROJECT_ARCHIVED: 'Archived project',
  PROJECT_UNARCHIVED: 'Unarchived project',
  CR_APPROVED: 'Approved CR',
  CR_DECLINED: 'Declined CR',
  CR_SUBMITTED: 'Submitted CR',
  CR_RESUBMITTED: 'Resubmitted CR',
  CR_CANCELLED: 'Cancelled CR',
  INVITATION_SENT: 'Sent invitation',
  INVITATION_RESENT: 'Resent invitation',
  EXPORT_CRS: 'Exported CRs',
  LOGIN: 'Logged in',
  LOGOUT: 'Logged out',
  FAILED_LOGIN: 'Failed login attempt',
  PASSWORD_CHANGED: 'Changed password',
};

const ENTITY_COLORS: Record<string, string> = {
  User: 'bg-blue-100 text-blue-700',
  Project: 'bg-green-100 text-green-700',
  CR: 'bg-purple-100 text-purple-700',
  Invitation: 'bg-orange-100 text-orange-700',
  Auth: 'bg-gray-100 text-gray-700',
};

function eventLabel(event: string) {
  return EVENT_LABELS[event] ?? event.replace(/_/g, ' ').toLowerCase();
}

function actorInitial(actor: AuditEntry['actor']) {
  return actor?.name?.charAt(0).toUpperCase() ?? 'S';
}

function metaDetail(entry: AuditEntry) {
  const m = entry.metadata as Record<string, string> | null;
  if (!m) return null;
  if (m.name) return <em className="text-[#5D5B5B]"> — {m.name}</em>;
  if (m.crNumber) return <span className="font-mono text-xs text-[#EF323F]"> {m.crNumber}</span>;
  if (m.email) return <em className="text-[#5D5B5B]"> — {m.email}</em>;
  return null;
}

export default function AdminActivityPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useQuery<AuditLogResult>({
    queryKey: ['audit-log', page, search, entityType, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '25' });
      if (search) params.set('search', search);
      if (entityType) params.set('entityType', entityType);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await apiClient.get(`/audit-log?${params}`);
      return res.data.data ?? { logs: [], total: 0, totalPages: 1 };
    },
    refetchInterval: 30000,
  });

  const logs = data?.logs ?? [];

  return (
    <PageWrapper title="Admin Activity">
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 rounded-xl border border-[#E5E5E5] bg-white px-5 py-3 shadow-sm">
          <input
            type="text"
            placeholder="Search actor or event…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-[#D3D3D3] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F] w-52"
          />
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-[#D3D3D3] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
          >
            <option value="">All Types</option>
            <option value="User">User</option>
            <option value="Project">Project</option>
            <option value="CR">CR</option>
            <option value="Invitation">Invitation</option>
            <option value="Auth">Auth</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-[#D3D3D3] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-[#D3D3D3] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
          />
          {(search || entityType || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setSearch('');
                setEntityType('');
                setDateFrom('');
                setDateTo('');
                setPage(1);
              }}
              className="rounded-lg border border-[#D3D3D3] px-3 py-1.5 text-sm text-[#5D5B5B] hover:bg-[#F7F7F7]"
            >
              Clear
            </button>
          )}
          <span className="ml-auto self-center text-sm text-[#5D5B5B]">
            {data?.total ?? 0} entries
          </span>
        </div>

        {/* Activity feed */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white shadow-sm">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-[#5D5B5B]">
              Loading…
            </div>
          ) : logs.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-[#5D5B5B]">No activity found.</div>
          ) : (
            <div className="divide-y divide-[#F0F0F0]">
              {logs.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 px-6 py-3 hover:bg-[#FAFAFA]">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EF323F]/10 text-xs font-bold text-[#EF323F]">
                    {actorInitial(entry.actor)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#2D2D2D]">
                      <span className="font-medium">{entry.actor?.name ?? 'System'}</span>
                      <span className="text-[#9A9A9A]"> · </span>
                      <span className="text-[#5D5B5B]">{eventLabel(entry.event)}</span>
                      {metaDetail(entry)}
                    </p>
                    <p className="mt-0.5 text-xs text-[#9A9A9A]">
                      {entry.actor?.email && <span className="mr-2">{entry.actor.email}</span>}
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${ENTITY_COLORS[entry.entityType] ?? 'bg-[#F3F0E8] text-[#5D5B5B]'}`}
                  >
                    {entry.entityType}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {(data?.totalPages ?? 0) > 1 && (
          <div className="flex items-center justify-between text-sm text-[#5D5B5B]">
            <span>
              Page {page} of {data?.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-[#D3D3D3] px-4 py-1.5 text-sm hover:bg-[#F7F7F7] disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data!.totalPages, p + 1))}
                disabled={page === data?.totalPages}
                className="rounded-lg border border-[#D3D3D3] px-4 py-1.5 text-sm hover:bg-[#F7F7F7] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
