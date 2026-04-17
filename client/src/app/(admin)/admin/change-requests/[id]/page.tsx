'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { Button } from '@/components/ui/Button';
import { CRStatusBadge, CRPriorityBadge } from '@/components/ui/Badge';
import { useCR, useCRVersions } from '@/hooks/useCRs';
import { sanitizeHtml } from '@/lib/sanitize';

// ─── Version snapshot shape ───────────────────────────────────────────────────

interface VersionSnapshot {
  version: number;
  title: string;
  description: string | null;
  businessJustification: string | null;
  priority: string | null;
  changeType: string | null;
  requestingParty: string | null;
  sowRef: string | null;
  status: string;
  attachments?: Array<{ id: string; fileName: string; fileUrl: string }>;
  snapshotAt: string;
}

interface CRVersionRow {
  id: string;
  versionNumber: number;
  snapshotJson: unknown;
  createdAt: string;
  createdBy: { id: string; name: string };
}

// ─── Version Modal ────────────────────────────────────────────────────────────

function VersionModal({
  version,
  onClose,
}: {
  version: CRVersionRow;
  onClose: () => void;
}) {
  const snap = version.snapshotJson as VersionSnapshot;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E5E5] bg-white px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[#2D2D2D]">
              Version {version.versionNumber} Snapshot
            </h2>
            <p className="mt-0.5 text-xs text-[#5D5B5B]">
              Saved by {version.createdBy?.name} on{' '}
              {new Date(version.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#5D5B5B] hover:bg-[#F7F7F7] transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5 p-6">
          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <SnapField label="Status">
              <CRStatusBadge status={snap.status} />
            </SnapField>
            {snap.priority && (
              <SnapField label="Priority">
                <CRPriorityBadge priority={snap.priority} />
              </SnapField>
            )}
            {snap.changeType && (
              <SnapField label="Change Type" value={snap.changeType} />
            )}
            {snap.requestingParty && (
              <SnapField label="Requesting Party" value={snap.requestingParty} />
            )}
            {snap.sowRef && (
              <SnapField label="SOW Reference" value={snap.sowRef} />
            )}
            <SnapField
              label="Snapshot Date"
              value={new Date(snap.snapshotAt).toLocaleString()}
            />
          </div>

          {/* Title */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#5D5B5B]">Title</p>
            <p className="mt-1 text-sm font-medium text-[#2D2D2D]">{snap.title}</p>
          </div>

          {/* Description */}
          {snap.description && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#5D5B5B]">Description</p>
              <div
                className="mt-1 rounded-lg border border-[#E5E5E5] bg-[#F7F7F7] p-3 prose prose-sm max-w-none text-[#2D2D2D]"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(snap.description) }}
              />
            </div>
          )}

          {/* Business Justification */}
          {snap.businessJustification && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#5D5B5B]">
                Business Justification
              </p>
              <div
                className="mt-1 rounded-lg border border-[#E5E5E5] bg-[#F7F7F7] p-3 prose prose-sm max-w-none text-[#2D2D2D]"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(snap.businessJustification) }}
              />
            </div>
          )}

          {/* Attachments */}
          {snap.attachments && snap.attachments.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#5D5B5B] mb-2">
                Attachments
              </p>
              <div className="flex flex-wrap gap-2">
                {snap.attachments.map((a) => (
                  <a
                    key={a.id}
                    href={a.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-[#D3D3D3] bg-white px-3 py-1.5 text-xs text-[#2D2D2D] hover:bg-gray-50"
                  >
                    {a.fileName}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-[#E5E5E5] bg-white px-6 py-3 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function SnapField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[#5D5B5B]">{label}</p>
      <div className="mt-1 text-sm text-[#2D2D2D]">{children ?? value}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminCRDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: cr, isLoading } = useCR(id);
  const { data: versions } = useCRVersions(id);
  const [selectedVersion, setSelectedVersion] = useState<CRVersionRow | null>(null);

  if (isLoading) {
    return (
      <PageWrapper title="Change Request">
        <div className="flex h-40 items-center justify-center text-sm text-[#5D5B5B]">Loading…</div>
      </PageWrapper>
    );
  }

  if (!cr) return null;

  const ia = cr.impactAnalysis;

  // Find the most recent DECLINED status history entry to show the reason
  const declinedEntry =
    cr.status === 'DECLINED'
      ? [...(cr.statusHistory ?? [])].reverse().find((h) => h.toStatus === 'DECLINED')
      : null;

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
        {/* Declined reason banner */}
        {declinedEntry && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M12 3a9 9 0 110 18A9 9 0 0112 3z"
              />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-800">
                This CR was declined
                {declinedEntry.changedBy?.name ? ` by ${declinedEntry.changedBy.name}` : ''}
                {' '}on {new Date(declinedEntry.changedAt).toLocaleDateString()}
              </p>
              {declinedEntry.reason && (
                <p className="mt-1 text-sm text-red-700 whitespace-pre-wrap">
                  {declinedEntry.reason}
                </p>
              )}
            </div>
          </div>
        )}

        {/* CR Details */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-[#5D5B5B] uppercase tracking-wide">
            Change Request Details
          </h2>
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
              <p className="text-sm text-[#2D2D2D]">
                {cr.dateOfRequest ? new Date(cr.dateOfRequest).toLocaleDateString() : '—'}
              </p>
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
              <div
                className="mt-1 rounded-lg border border-[#E5E5E5] bg-[#F7F7F7] p-3 prose prose-sm max-w-none text-[#2D2D2D]"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(cr.description) }}
              />
            </div>
          )}

          {cr.businessJustification && (
            <div className="mt-4">
              <p className="text-xs text-[#5D5B5B]">Business Justification</p>
              <div
                className="mt-1 rounded-lg border border-[#E5E5E5] bg-[#F7F7F7] p-3 prose prose-sm max-w-none text-[#2D2D2D]"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(cr.businessJustification) }}
              />
            </div>
          )}

          {cr.attachments?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-[#5D5B5B] mb-2">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {cr.attachments.map((a: { id: string; fileUrl: string; fileName: string }) => (
                  <a
                    key={a.id}
                    href={a.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-[#D3D3D3] bg-white px-3 py-1.5 text-xs text-[#2D2D2D] hover:bg-gray-50"
                  >
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
            <h2 className="mb-4 text-sm font-semibold text-[#5D5B5B] uppercase tracking-wide">
              DM Estimation
            </h2>
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
                    {cr.project.currency ?? '$'}
                    {(Number(ia.estimatedHours ?? 0) * Number(cr.project.hourlyRate)).toFixed(2)}
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
            <h2 className="mb-4 text-sm font-semibold text-[#5D5B5B] uppercase tracking-wide">
              Status History
            </h2>
            <ol className="space-y-3">
              {cr.statusHistory.map(
                (h: {
                  id: string;
                  changedAt: string;
                  changedBy: { name: string };
                  fromStatus: string;
                  toStatus: string;
                  reason: string | null;
                }) => (
                  <li key={h.id} className="space-y-1">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-xs text-[#5D5B5B] w-24 shrink-0">
                        {new Date(h.changedAt).toLocaleDateString()}
                      </span>
                      <span className="text-[#5D5B5B]">{h.changedBy?.name}</span>
                      <CRStatusBadge status={h.fromStatus} />
                      <span className="text-[#5D5B5B]">→</span>
                      <CRStatusBadge status={h.toStatus} />
                    </div>
                    {h.reason && (
                      <p className="ml-28 text-xs text-[#5D5B5B] italic">"{h.reason}"</p>
                    )}
                  </li>
                ),
              )}
            </ol>
          </div>
        )}

        {/* Version History */}
        {versions && versions.length > 0 && (
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-[#5D5B5B] uppercase tracking-wide">
              Version History
            </h2>
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-lg border border-[#E5E5E5] px-4 py-2.5 text-sm hover:bg-[#FAFAFA] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[#2D2D2D]">v{v.versionNumber}</span>
                    <span className="text-[#5D5B5B]">{v.createdBy?.name}</span>
                    <span className="text-xs text-[#5D5B5B]">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedVersion(v as CRVersionRow)}
                    className="rounded-lg border border-[#D3D3D3] bg-white px-3 py-1 text-xs font-medium text-[#2D2D2D] hover:bg-[#F7F7F7] transition-colors"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Version snapshot modal */}
      {selectedVersion && (
        <VersionModal version={selectedVersion} onClose={() => setSelectedVersion(null)} />
      )}
    </PageWrapper>
  );
}
