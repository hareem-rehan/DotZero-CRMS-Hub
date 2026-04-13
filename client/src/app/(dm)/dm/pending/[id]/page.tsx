'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CRStatusBadge, CRPriorityBadge } from '@/components/ui/Badge';
import { SignatureCanvas } from '@/components/ui/SignatureCanvas';
import { toast } from 'sonner';
import { useCR, useSaveImpactAnalysis } from '@/hooks/useCRs';

export default function DmCREstimatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: cr, isLoading } = useCR(id);

  const ia = cr?.impactAnalysis;

  const [hours, setHours] = useState('');
  const [timelineImpact, setTimelineImpact] = useState('');
  const [affectedDeliverables, setAffectedDeliverables] = useState('');
  const [revisedMilestones, setRevisedMilestones] = useState('');
  const [resourcesRequired, setResourcesRequired] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [dmSignature, setDmSignature] = useState('');

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

  return (
    <PageWrapper title={`${cr.crNumber} — Estimation`}>
      <div className="space-y-6">
        {/* PO Section — read-only, grey background */}
        <div className="rounded-xl border border-[#E5E5E5] bg-[#F7F7F7] p-6">
          <h2 className="mb-4 text-sm font-semibold text-[#5D5B5B] uppercase tracking-wide">
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
              <CRStatusBadge status={cr.status} />
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
              dangerouslySetInnerHTML={{ __html: cr.description }}
            />
          </div>
          <div className="mt-4">
            <p className="text-xs text-[#5D5B5B]">Business Justification</p>
            <div
              className="mt-1 rounded-lg border border-[#E5E5E5] bg-white p-3 text-sm text-[#2D2D2D]"
              dangerouslySetInnerHTML={{ __html: cr.businessJustification }}
            />
          </div>
          {cr.attachments.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-[#5D5B5B] mb-2">Attachments</p>
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

        {/* DM Estimation Form */}
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
