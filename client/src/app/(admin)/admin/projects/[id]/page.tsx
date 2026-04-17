'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { ProjectStatusBadge, RoleBadge, CRStatusBadge, CRPriorityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useProject } from '@/hooks/useProjects';
import { useCRs } from '@/hooks/useCRs';
import { apiClient } from '@/lib/apiClient';

interface ClientLink {
  userId: string;
  name: string;
  email: string;
  link: string;
  expiresAt: string;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading, isError } = useProject(id);
  const { data: crsData } = useCRs({ projectId: id, pageSize: 100 });
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [generatedLinks, setGeneratedLinks] = useState<ClientLink[] | null>(null);

  const generateLinkMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: ClientLink[] }>(
        `/projects/${id}/client-login-link`,
      );
      return data.data;
    },
    onSuccess: (links) => setGeneratedLinks(links),
  });

  const copyLink = (link: string, index: number) => {
    navigator.clipboard.writeText(link);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (isLoading) {
    return (
      <PageWrapper title="Project">
        <div className="py-12 text-center text-sm text-[#5D5B5B]">Loading…</div>
      </PageWrapper>
    );
  }

  if (isError || !project) {
    return (
      <PageWrapper title="Project">
        <div className="py-12 text-center text-sm text-red-600">Project not found.</div>
      </PageWrapper>
    );
  }

  const currency = project.currency;
  const rate = Number(project.hourlyRate).toLocaleString(undefined, { minimumFractionDigits: 2 });

  return (
    <PageWrapper
      title={project.name}
      actions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => generateLinkMutation.mutate()}
            loading={generateLinkMutation.isPending}
          >
            <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            Generate PO Login Link
          </Button>
          <Link href={`/admin/projects/${id}/edit`}>
            <Button>Edit Project</Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Project info card */}
        <div className="rounded-lg border border-[#D3D3D3] bg-white p-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 text-sm">
            <InfoRow label="PO" value={project.clientName} />
            <InfoRow label="Code" value={project.code} />
            <InfoRow label="Status" value={<ProjectStatusBadge status={project.status} />} />
            <InfoRow label="Hourly Rate" value={`${currency} ${rate}`} />
            <InfoRow
              label="Start Date"
              value={project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'}
            />
            <InfoRow
              label="Assigned DM"
              value={
                project.assignedDm
                  ? `${project.assignedDm.name} (${project.assignedDm.email})`
                  : '—'
              }
            />
            <InfoRow label="Show Rate to DM" value={project.showRateToDm ? 'Yes' : 'No'} />
          </div>
        </div>

        {/* Error */}
        {generateLinkMutation.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {(generateLinkMutation.error as { response?: { data?: { error?: string } } })?.response
              ?.data?.error ?? 'Failed to generate login link'}
          </div>
        )}

        {/* Generated client login links */}
        {generatedLinks && generatedLinks.length > 0 && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-sm font-medium text-green-800">
                Login link{generatedLinks.length > 1 ? 's' : ''} generated — valid for 24 hours
              </p>
            </div>
            {generatedLinks.map((item, i) => (
              <div
                key={item.userId}
                className="rounded-lg border border-green-200 bg-white p-3 space-y-2"
              >
                <p className="text-xs font-medium text-[#2D2D2D]">
                  {item.name} <span className="font-normal text-[#5D5B5B]">({item.email})</span>
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-[#F7F7F7] px-2 py-1.5 text-xs text-[#2D2D2D] border border-[#E5E5E5]">
                    {item.link}
                  </code>
                  <button
                    onClick={() => copyLink(item.link, i)}
                    className="shrink-0 rounded-lg border border-[#D3D3D3] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#F7F7F7] transition-colors"
                  >
                    {copiedIndex === i ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Approved CR totals */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Approved Hours"
            value={`${project.totalApprovedHours.toFixed(1)} hrs`}
          />
          <StatCard
            label="Total Approved Cost"
            value={`${currency} ${project.totalApprovedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          />
          <StatCard label="Total CRs" value={String(project._count?.changeRequests ?? 0)} />
        </div>

        {/* Assigned users */}
        <div className="rounded-lg border border-[#D3D3D3] bg-white">
          <div className="border-b border-[#D3D3D3] px-6 py-4">
            <h2 className="text-sm font-semibold text-[#2D2D2D]">Assigned Users</h2>
          </div>
          {project.userAssignments.length === 0 ? (
            <p className="px-6 py-4 text-sm text-[#5D5B5B]">No users assigned.</p>
          ) : (
            <ul className="divide-y divide-[#D3D3D3]">
              {project.userAssignments.map(({ user }) => (
                <li key={user.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#2D2D2D]">{user.name}</p>
                    <p className="text-xs text-[#5D5B5B]">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.email === project.clientEmail ? (
                      <RoleBadge role="PRODUCT_OWNER" />
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                        Team Member
                      </span>
                    )}
                    {!user.isActive && <span className="text-xs text-[#5D5B5B]">(Inactive)</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Attachments */}
        {project.attachments.length > 0 && (
          <div className="rounded-lg border border-[#D3D3D3] bg-white">
            <div className="border-b border-[#D3D3D3] px-6 py-4">
              <h2 className="text-sm font-semibold text-[#2D2D2D]">Attachments</h2>
            </div>
            <ul className="divide-y divide-[#D3D3D3]">
              {project.attachments.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-6 py-3">
                  <span className="text-sm text-[#2D2D2D]">{a.fileName}</span>
                  <a
                    href={a.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-[#EF323F] hover:underline"
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Change Requests */}
        <div className="rounded-lg border border-[#D3D3D3] bg-white">
          <div className="border-b border-[#D3D3D3] px-6 py-4">
            <h2 className="text-sm font-semibold text-[#2D2D2D]">Change Requests</h2>
          </div>
          {!crsData || crsData.crs.length === 0 ? (
            <p className="px-6 py-4 text-sm text-[#5D5B5B]">No change requests for this project.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#D3D3D3] bg-[#F7F7F7]">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#5D5B5B]">CR #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#5D5B5B]">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#5D5B5B]">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#5D5B5B]">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#5D5B5B]">Submitted By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#5D5B5B]">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D3D3D3]">
                  {crsData.crs.map((cr) => (
                    <tr key={cr.id} className="hover:bg-[#F7F7F7] transition-colors">
                      <td className="px-6 py-3">
                        <Link
                          href={`/admin/change-requests/${cr.id}`}
                          className="font-medium text-[#EF323F] hover:underline"
                        >
                          {cr.crNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-[#2D2D2D]">
                        <Link href={`/admin/change-requests/${cr.id}`} className="hover:underline">
                          {cr.title}
                        </Link>
                      </td>
                      <td className="px-6 py-3"><CRStatusBadge status={cr.status} /></td>
                      <td className="px-6 py-3"><CRPriorityBadge priority={cr.priority} /></td>
                      <td className="px-6 py-3 text-[#5D5B5B]">{cr.submittedBy.name}</td>
                      <td className="px-6 py-3 text-[#5D5B5B]">
                        {new Date(cr.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[#5D5B5B]">{label}</p>
      <div className="mt-0.5 text-sm text-[#2D2D2D]">{value}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#D3D3D3] bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[#5D5B5B]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[#2D2D2D]">{value}</p>
    </div>
  );
}
