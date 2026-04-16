'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CRStatusBadge, CRPriorityBadge } from '@/components/ui/Badge';
import { useCRs } from '@/hooks/useCRs';
import { useMyProjects, MyProject } from '@/hooks/useProjects';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'ESTIMATED', label: 'Estimated' },
  { value: 'RESUBMITTED', label: 'Resubmitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'DEFERRED', label: 'Deferred' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'SCOPE', label: 'Scope' },
  { value: 'TIMELINE', label: 'Timeline' },
  { value: 'BUDGET', label: 'Budget' },
  { value: 'RESOURCE', label: 'Resource' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'OTHER', label: 'Other' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

export default function MyCRsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [changeType, setChangeType] = useState('');
  const [priority, setPriority] = useState('');
  const [projectId, setProjectId] = useState('');
  const [page, setPage] = useState(1);

  const { data: myProjects } = useMyProjects();
  const projectOptions = [
    { value: '', label: 'All Projects' },
    ...(myProjects ?? []).map((p) => ({ value: p.id, label: p.name })),
  ];

  const { data, isLoading, isError } = useCRs({
    search: search || undefined,
    status: status || undefined,
    changeType: changeType || undefined,
    priority: priority || undefined,
    projectId: projectId || undefined,
    page,
    pageSize: 20,
  });

  const handleFilterChange =
    (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(1);
    };

  return (
    <PageWrapper title="My Change Requests">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search CR number or title..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-64"
          />
          <Select
            options={projectOptions}
            value={projectId}
            onChange={handleFilterChange(setProjectId)}
            className="w-44"
          />
          <Select
            options={STATUS_OPTIONS}
            value={status}
            onChange={handleFilterChange(setStatus)}
            className="w-44"
          />
          <Select
            options={TYPE_OPTIONS}
            value={changeType}
            onChange={handleFilterChange(setChangeType)}
            className="w-40"
          />
          <Select
            options={PRIORITY_OPTIONS}
            value={priority}
            onChange={handleFilterChange(setPriority)}
            className="w-36"
          />
        </div>
        <Button onClick={() => router.push('/client/my-crs/new')}>+ New Change Request</Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#D3D3D3] bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-[#5D5B5B]">
            Loading change requests...
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-16 text-sm text-red-600">
            Failed to load change requests. Please try again.
          </div>
        ) : !data || data.crs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg
              className="h-12 w-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm text-[#5D5B5B]">No change requests found</p>
            <Button variant="secondary" onClick={() => router.push('/client/my-crs/new')}>
              Create your first CR
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#D3D3D3] bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#5D5B5B]">
                    CR Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#5D5B5B]">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#5D5B5B]">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#5D5B5B]">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#5D5B5B]">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#5D5B5B]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#5D5B5B]">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#5D5B5B]">
                    Last Updated
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#5D5B5B]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {data.crs.map((cr) => (
                  <tr key={cr.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#2D2D2D]">{cr.crNumber}</span>
                        {cr.status === 'ESTIMATED' && (
                          <span className="inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
                            Action Required
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <span className="block truncate text-[#2D2D2D]" title={cr.title}>
                        {cr.title}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#5D5B5B]">{cr.project.name}</td>
                    <td className="px-4 py-3 text-[#5D5B5B] capitalize">
                      {cr.changeType.toLowerCase()}
                    </td>
                    <td className="px-4 py-3">
                      <CRPriorityBadge priority={cr.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <CRStatusBadge status={cr.status} />
                    </td>
                    <td className="px-4 py-3 text-[#5D5B5B] text-xs">
                      {cr.dateOfRequest ? new Date(cr.dateOfRequest).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-[#5D5B5B] text-xs">
                      {new Date(cr.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/client/my-crs/${cr.id}`}
                          className="text-xs font-medium text-[#EF323F] hover:underline"
                        >
                          View
                        </Link>
                        {cr.status === 'DRAFT' && (
                          <Link
                            href={`/client/my-crs/${cr.id}/edit`}
                            className="text-xs font-medium text-[#5D5B5B] hover:text-[#2D2D2D] hover:underline"
                          >
                            Edit
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Project Documents */}
      {(myProjects ?? []).some((p) => p.attachments?.length > 0) && (
        <div className="mt-8 space-y-4">
          <h2 className="text-sm font-semibold text-[#2D2D2D]">Project Documents</h2>
          {(myProjects ?? [])
            .filter((p: MyProject) => p.attachments?.length > 0)
            .map((p: MyProject) => (
              <div
                key={p.id}
                className="rounded-lg border border-[#D3D3D3] bg-white overflow-hidden"
              >
                <div className="border-b border-[#E5E5E5] bg-[#FAFAFA] px-4 py-2.5">
                  <p className="text-xs font-semibold text-[#2D2D2D]">
                    {p.name} <span className="font-normal text-[#9A9A9A]">({p.code})</span>
                  </p>
                </div>
                <ul className="divide-y divide-[#F0F0F0]">
                  {p.attachments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <svg
                          className="h-4 w-4 shrink-0 text-[#5D5B5B]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span className="truncate text-sm text-[#2D2D2D]">{a.fileName}</span>
                        <span className="shrink-0 text-xs text-[#9A9A9A]">
                          ({(a.fileSize / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <a
                        href={a.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 shrink-0 text-xs font-medium text-[#EF323F] hover:underline"
                      >
                        Download
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-[#5D5B5B]">
          <span>
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total} results
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={page === data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
