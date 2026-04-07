'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { ProjectStatusBadge, RoleBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useProject } from '@/hooks/useProjects';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading, isError } = useProject(id);

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
        <Link href={`/admin/projects/${id}/edit`}>
          <Button>Edit Project</Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Project info card */}
        <div className="rounded-lg border border-[#D3D3D3] bg-white p-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 text-sm">
            <InfoRow label="Client" value={project.clientName} />
            <InfoRow label="Code" value={project.code} />
            <InfoRow label="Status" value={<ProjectStatusBadge status={project.status} />} />
            <InfoRow label="Hourly Rate" value={`${currency} ${rate}`} />
            <InfoRow
              label="Start Date"
              value={project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'}
            />
            <InfoRow
              label="Assigned DM"
              value={project.assignedDm ? `${project.assignedDm.name} (${project.assignedDm.email})` : '—'}
            />
            <InfoRow label="Show Rate to DM" value={project.showRateToDm ? 'Yes' : 'No'} />
            <InfoRow label="SOW Reference" value={project.sowReference ?? '—'} />
          </div>
        </div>

        {/* Approved CR totals */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Total Approved Hours" value={`${project.totalApprovedHours.toFixed(1)} hrs`} />
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
                    <RoleBadge role={user.role} />
                    {!user.isActive && (
                      <span className="text-xs text-[#5D5B5B]">(Inactive)</span>
                    )}
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
