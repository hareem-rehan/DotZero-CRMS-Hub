'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CRStatusBadge, CRPriorityBadge } from '@/components/ui/Badge';
import { SignatureCanvas } from '@/components/ui/SignatureCanvas';
import { toast } from 'sonner';
import { useCR, useSaveImpactAnalysis, useCRVersions } from '@/hooks/useCRs';
import { sanitizeHtml } from '@/lib/sanitize';

// ─── Snapshot type ────────────────────────────────────────────────────────────

interface CRSnapshot {
  version: number;
  title: string;
  description: string;
  businessJustification: string;
  priority: string;
  changeType: string;
  requestingParty: string | null;
  sowRef: string | null;
}

// ─── Diff helpers ─────────────────────────────────────────────────────────────

function DiffField({
  label,
  prev,
  curr,
  isHtml = false,
}: {
  label: string;
  prev: string | null | undefined;
  curr: string | null | undefined;
  isHtml?: boolean;
}) {
  const prevVal = prev ?? '—';
  const currVal = curr ?? '—';
  const changed = prevVal !== currVal;

  return (
    <div className="grid grid-cols-2 gap-0 border-b border-[#E5E5E5] last:border-0">
      {/* Previous */}
      <div className="border-r border-[#E5E5E5] bg-[#F7F7F7] p-4">
        <p className="mb-1 text-xs font-medium text-[#5D5B5B]">{label}</p>
        {isHtml ? (
          <div
            className="prose prose-sm max-w-none text-sm text-[#2D2D2D]"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(prevVal) }}
          />
        ) : (
          <p className="text-sm text-[#2D2D2D]">{prevVal}</p>
        )}
      </div>
      {/* Current — green if changed */}
      <div className={`p-4 ${changed ? 'bg-green-50' : 'bg-white'}`}>
        <p className="mb-1 flex items-center gap-2 text-xs font-medium text-[#5D5B5B]">
          {label}
          {changed && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
              Changed
            </span>
          )}
        </p>
        {isHtml ? (
          <div
            className={`prose prose-sm max-w-none text-sm ${changed ? 'text-green-900' : 'text-[#2D2D2D]'}`}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(currVal) }}
          />
        ) : (
          <p className={`text-sm ${changed ? 'font-medium text-green-800' : 'text-[#2D2D2D]'}`}>
            {currVal}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DmCREstimatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: cr, isLoading } = useCR(id);
  const { data: versions } = useCRVersions(id);

  const ia = cr?.impactAnalysis;

  const [hours, setHours] = useState('');
  const [timelineImpact, setTimelineImpact] = useState('');
  const [affectedDeliverables, setAffectedDeliverables] = useState('');
  const [revisedMilestones, setRevisedMilestones] = useState('');
  const [resourcesRequired, setResourcesRequired] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [dmSignature, setDmSignature] = useState('');
  const [showDiff, setShowDiff] = useState(true);

  // Pre-fill from existing draft
  const [prefilled, setPrefilled] = useState(false);
  if (ia && !prefilled) {
    setHours(ia.estimatedHours ?? '');
    setTimelineImpact(ia.timelineImpact ?? '');
    setAffectedDeliverables(ia.affectedDeliverables ?? '');
    setRevisedMilestones(ia.revisedMilestones ?? '');
    setResourcesRequired(ia.resourcesRequired ?? '');
    setRecommendation(ia.recommendation ?? '');
    setPrefilled(true);
  }

  const saveDraft = useSaveImpactAnalysis(id, {
    onSuccess: () => toast.success('Draft saved'),
    onError: (msg) => toast.error(msg),
  });

  const submitEstimation = useSaveImpactAnalysis(id, {
    onSuccess: () => {
      toast.success('Estimation returned to PO');
      router.push('/dm/pending');
    },
    onError: (msg) => toast.error(msg),
  });

  const payload = {
    estimatedHours: Number(hours),
    timelineImpact,
    affectedDeliverables,
    revisedMilestones,
    resourcesRequired,
    recommendation,
    dmSignature,
  };

  if (isLoading) {
    return (
      <PageWrapper title="CR Estimation">
        <div className="flex h-40 items-center justify-center text-sm text-[#5D5B5B]">Loading…</div>
      </PageWrapper>
    );
  }

  if (!cr) return null;

  const isReadOnly = !['UNDER_REVIEW', 'RESUBMITTED'].includes(cr.status);
  const isResubmitted = cr.status === 'RESUBMITTED';

  // Get the latest snapshot (highest versionNumber) for comparison
  const latestSnapshot =
    versions && versions.length > 0
      ? (versions.reduce((a, b) => (a.versionNumber > b.versionNumber ? a : b))
          .snapshotJson as CRSnapshot)
      : null;

  return (
    <PageWrapper title={`${cr.crNumber} — Estimation`}>
      <div className="space-y-6">
        {/* ── Resubmission Diff Panel ── */}
        {isResubmitted && latestSnapshot && (
          <div className="rounded-xl border border-green-200 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-green-200 bg-green-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
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
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-green-900">
                    Resubmission — Version {latestSnapshot.version} → {cr.version}
                  </h2>
                  <p className="text-xs text-green-700">
                    PO has resubmitted this CR. Green fields indicate what changed.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDiff((v) => !v)}
                className="text-xs font-medium text-green-700 hover:text-green-900 underline"
              >
                {showDiff ? 'Hide comparison' : 'Show comparison'}
              </button>
            </div>

            {showDiff && (
              <>
                {/* Column headers */}
                <div className="grid grid-cols-2 gap-0 border-b border-[#E5E5E5] bg-[#FAFAFA]">
                  <div className="border-r border-[#E5E5E5] px-4 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#5D5B5B]">
                      Previous (v{latestSnapshot.version})
                    </p>
                  </div>
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                      Current (v{cr.version}) — New Changes
                    </p>
                  </div>
                </div>

                {/* Diff rows */}
                <DiffField label="Title" prev={latestSnapshot.title} curr={cr.title} />
                <DiffField label="Priority" prev={latestSnapshot.priority} curr={cr.priority} />
                <DiffField
                  label="Change Type"
                  prev={latestSnapshot.changeType}
                  curr={cr.changeType}
                />
                <DiffField
                  label="Requesting Party"
                  prev={latestSnapshot.requestingParty}
                  curr={cr.requestingParty}
                />
                <DiffField label="SOW Reference" prev={latestSnapshot.sowRef} curr={cr.sowRef} />
                <DiffField
                  label="Description"
                  prev={latestSnapshot.description}
                  curr={cr.description}
                  isHtml
                />
                <DiffField
                  label="Business Justification"
                  prev={latestSnapshot.businessJustification}
                  curr={cr.businessJustification}
                  isHtml
                />
              </>
            )}
          </div>
        )}

        {/* ── CR Details ── */}
        <div className="rounded-xl border border-[#E5E5E5] bg-[#F7F7F7] p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#5D5B5B]">
            Change Request Details
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-[#5D5B5B]">CR Number</p>
              <p className="font-mono text-sm font-semibold text-[#2D2D2D]">{cr.crNumber}</p>
            </div>
            <div>
              <p className="text-xs text-[#5D5B5B]">Project</p>
              <p className="text-sm text-[#2D2D2D]">{cr.project.name}</p>
            </div>
            <div>
              <p className="text-xs text-[#5D5B5B]">Priority</p>
              <CRPriorityBadge priority={cr.priority} />
            </div>
            <div>
              <p className="text-xs text-[#5D5B5B]">Status</p>
              <CRStatusBadge
                status={cr.status}
                overrides={{ SUBMITTED: { label: 'Pending Estimation', variant: 'blue' } }}
              />
            </div>
            <div>
              <p className="text-xs text-[#5D5B5B]">Change Type</p>
              <p className="text-sm text-[#2D2D2D]">{cr.changeType}</p>
            </div>
            <div>
              <p className="text-xs text-[#5D5B5B]">Requesting Party</p>
              <p className="text-sm text-[#2D2D2D]">{cr.requestingParty}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-[#5D5B5B]">Title</p>
            <p className="text-sm font-medium text-[#2D2D2D]">{cr.title}</p>
          </div>
          <div className="mt-4">
            <p className="text-xs text-[#5D5B5B]">Description</p>
            <div
              className="mt-1 rounded-lg border border-[#E5E5E5] bg-white p-3 text-sm text-[#2D2D2D]"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(cr.description) }}
            />
          </div>
          <div className="mt-4">
            <p className="text-xs text-[#5D5B5B]">Business Justification</p>
            <div
              className="mt-1 rounded-lg border border-[#E5E5E5] bg-white p-3 text-sm text-[#2D2D2D]"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(cr.businessJustification) }}
            />
          </div>
          {cr.attachments.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-[#5D5B5B]">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {cr.attachments.map((a) => (
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

        {/* ── DM Estimation Form ── */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-[#2D2D2D]">
            {isReadOnly ? 'Estimation' : 'Estimation Form'}
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Estimated Hours *"
              type="number"
              min="0"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              disabled={isReadOnly}
              placeholder="e.g. 24"
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">
                Timeline Impact
              </label>
              <textarea
                rows={3}
                value={timelineImpact}
                onChange={(e) => setTimelineImpact(e.target.value)}
                disabled={isReadOnly}
                placeholder="e.g. +2 weeks to delivery milestone"
                className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F] disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">
                Affected Deliverables
              </label>
              <textarea
                rows={3}
                value={affectedDeliverables}
                onChange={(e) => setAffectedDeliverables(e.target.value)}
                disabled={isReadOnly}
                placeholder="List the deliverables impacted"
                className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F] disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">
                Revised Milestones
              </label>
              <textarea
                rows={3}
                value={revisedMilestones}
                onChange={(e) => setRevisedMilestones(e.target.value)}
                disabled={isReadOnly}
                placeholder="Updated milestone dates"
                className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F] disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">
                Resources Required
              </label>
              <textarea
                rows={3}
                value={resourcesRequired}
                onChange={(e) => setResourcesRequired(e.target.value)}
                disabled={isReadOnly}
                placeholder="Team members, tools, etc."
                className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F] disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">
                Recommendation
              </label>
              <textarea
                rows={3}
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                disabled={isReadOnly}
                placeholder="Proceed / Proceed with conditions / Decline"
                className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F] disabled:bg-gray-50"
              />
            </div>
          </div>

          {!isReadOnly && (
            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-[#2D2D2D]">
                DM Signature <span className="text-[#EF323F]">*</span> (required to return to PO)
              </label>
              <SignatureCanvas value={dmSignature} onChange={setDmSignature} />
            </div>
          )}

          {!isReadOnly && (
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => saveDraft.mutate({ ...payload, isDraft: true })}
                loading={saveDraft.isPending}
                disabled={!hours}
              >
                Save Draft
              </Button>
              <Button
                onClick={() => submitEstimation.mutate({ ...payload, isDraft: false })}
                loading={submitEstimation.isPending}
                disabled={!hours || !dmSignature}
              >
                Return to PO
              </Button>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
