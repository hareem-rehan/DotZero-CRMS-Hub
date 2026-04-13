'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { Button } from '@/components/ui/Button';
import { CRStatusBadge, CRPriorityBadge } from '@/components/ui/Badge';
import { useCR, useCRVersions } from '@/hooks/useCRs';

export default function AdminCRDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: cr, isLoading } = useCR(id);
  const { data: versions } = useCRVersions(id);

  if (isLoading) {
    return (
      <PageWrapper title="Change Request">
        <div className="flex h-40 items-center justify-center text-sm text-[#5D5B5B]">Loading…</div>
      </PageWrapper>
    );
  }

  if (!cr) return null;

  const ia = cr.impactAnalysis;

  return (
    <PageWrapper
      title={cr.crNumber}
      actions={
        <Link href="/admin/change-requests">
          <Button variant="secondary">← Back</Button>
        </Link>
      }
    >
      <div className="space-y-6">

        {/* CR Details */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-[#5D5B5B] uppercase tracking-wide">Change Request Details</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-[#5D5B5B]">CR Number</p>
              <p className="font-mono text-sm font-semibold text-[#2D2D2D]">{cr.crNumber}</p>
            </div>
            <div>
              <p className="text-xs text-[#5D5B5B]">Project</p>
              <p className="text-sm text-[#2D2D2D]">{cr.project.name}</p>
            </div>
            <div>
              <p className="text-xs text-[#5D5B5B]">Status</p>
              <CRStatusBadge status={cr.status} />
            </div>
            <div>
              <p className="text-xs text-[#5D5B5B]">Priority</p>
              <CRPriorityBadge priority={cr.priority} />
            </div>
            <div>
              <p className="text-xs text-[#5D5B5B]">Change Type</p>
              <p className="text-sm text-[#2D2D2D]">{cr.changeType ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-[#5D5B5B]">Submitted By</p>
              <p className="text-sm text-[#2D2D2D]">{cr.submittedBy?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-[#5D5B5B]">Date Submitted</p>
              <p className="text-sm text-[#2D2D2D]">{cr.dateOfRequest ? new Date(cr.dateOfRequest).toLocaleDateString() : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-[#5D5B5B]">Requesting Party</p>
              <p className="text-sm text-[#2D2D2D]">{cr.requestingParty ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-[#5D5B5B]">SOW Reference</p>
              <p className="text-sm text-[#2D2D2D]">{cr.sowRef ?? '—'}</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-[#5D5B5B]">Title</p>
            <p className="mt-1 text-sm font-medium text-[#2D2D2D]">{cr.title}</p>
          </div>

          {cr.description && (
            <div className="mt-4">
              <p className="text-xs text-[#5D5B5B]">Description</p>
              <div className="mt-1 rounded-lg border border-[#E5E5E5] bg-[#F7F7F7] p-3 prose prose-sm max-w-none text-[#2D2D2D]"
                dangerouslySetInnerHTML={{ __html: cr.description }} />
            </div>
          )}

          {cr.businessJustification && (
            <div className="mt-4">
              <p className="text-xs text-[#5D5B5B]">Business Justification</p>
              <div className="mt-1 rounded-lg border border-[#E5E5E5] bg-[#F7F7F7] p-3 prose prose-sm max-w-none text-[#2D2D2D]"
                dangerouslySetInnerHTML={{ __html: cr.businessJustification }} />
            </div>
          )}

          {cr.attachments?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-[#5D5B5B] mb-2">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {cr.attachments.map((a: { id: string; fileUrl: string; fileName: string }) => (
                  <a key={a.id} href={a.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="rounded-md border border-[#D3D3D3] bg-white px-3 py-1.5 text-xs text-[#2D2D2D] hover:bg-gray-50">
                    {a.fileName}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Impact Analysis */}
        {ia && (
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-[#5D5B5B] uppercase tracking-wide">DM Estimation</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-[#5D5B5B]">Delivery Manager</p>
                <p className="text-sm font-semibold text-[#2D2D2D]">{ia.dm?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[#5D5B5B]">Estimated Hours</p>
                <p className="text-sm font-semibold text-[#2D2D2D]">{ia.estimatedHours ?? '—'}</p>
              </div>
              {cr.project?.hourlyRate && (
                <div>
                  <p className="text-xs text-[#5D5B5B]">Estimated Cost</p>
                  <p className="text-sm font-semibold text-[#2D2D2D]">
                    {cr.project.currency ?? '$'}{((ia.estimatedHours ?? 0) * Number(cr.project.hourlyRate)).toFixed(2)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-[#5D5B5B]">Timeline Impact</p>
                <p className="text-sm text-[#2D2D2D]">{ia.timelineImpact ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[#5D5B5B]">Affected Deliverables</p>
                <p className="text-sm text-[#2D2D2D]">{ia.affectedDeliverables ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[#5D5B5B]">Revised Milestones</p>
                <p className="text-sm text-[#2D2D2D]">{ia.revisedMilestones ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[#5D5B5B]">Resources Required</p>
                <p className="text-sm text-[#2D2D2D]">{ia.resourcesRequired ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[#5D5B5B]">Recommendation</p>
                <p className="text-sm text-[#2D2D2D]">{ia.recommendation ?? '—'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Status History */}
        {cr.statusHistory?.length > 0 && (
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-[#5D5B5B] uppercase tracking-wide">Status History</h2>
            <ol className="space-y-3">
              {cr.statusHistory.map((h: { id: string; changedAt: string; changedBy: { name: string }; fromStatus: string; toStatus: string }) => (
                <li key={h.id} className="flex items-center gap-3 text-sm">
                  <span className="text-xs text-[#5D5B5B] w-24 shrink-0">{new Date(h.changedAt).toLocaleDateString()}</span>
                  <span className="text-[#5D5B5B]">{h.changedBy?.name}</span>
                  <CRStatusBadge status={h.fromStatus} />
                  <span className="text-[#5D5B5B]">→</span>
                  <CRStatusBadge status={h.toStatus} />
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Version History */}
        {versions && versions.length > 0 && (
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-[#5D5B5B] uppercase tracking-wide">Version History</h2>
            <div className="space-y-2">
              {versions.map((v: { id: string; versionNumber: number; createdAt: string; createdBy: { name: string } }) => (
                <div key={v.id} className="flex items-center justify-between rounded-lg border border-[#E5E5E5] px-4 py-2 text-sm">
                  <span className="font-medium text-[#2D2D2D]">v{v.versionNumber}</span>
                  <span className="text-[#5D5B5B]">{v.createdBy?.name}</span>
                  <span className="text-xs text-[#5D5B5B]">{new Date(v.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </PageWrapper>
  );
}
