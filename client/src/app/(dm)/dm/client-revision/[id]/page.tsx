'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { CRStatusBadge, CRPriorityBadge } from '@/components/ui/Badge';
import { useCR, useDMReviewResubmit, useSendToClient } from '@/hooks/useCRs';

export default function DmClientRevisionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: cr, isLoading } = useCR(id);

  // Path 1: PO submitted edits (ESTIMATED → CLIENT_REVISION → ESTIMATED)
  const dmReviewResubmit = useDMReviewResubmit(id, {
    onSuccess: () => router.push('/dm/pending'),
    onError: (msg) => setError(msg),
  });

  // Path 2: PO returned CR (PENDING_CLIENT_REVIEW → CLIENT_REVISION → PENDING_CLIENT_REVIEW)
  const sendToClient = useSendToClient(id, {
    onSuccess: () => router.push('/dm/pending'),
    onError: (msg) => setError(msg),
  });

  const [dmNotes, setDmNotes] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [timelineImpact, setTimelineImpact] = useState('');
  const [affectedDeliverables, setAffectedDeliverables] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading) return <PageWrapper title="Loading…"><div className="text-sm text-[#5D5B5B]">Loading…</div></PageWrapper>;
  // A DRAFT with clientNotes was returned by the PO before the status was changed to CLIENT_REVISION
  const isReturnedDraft = cr?.status === 'DRAFT' && !!cr.clientNotes;

  if (!cr || !cr.initiatedByDm || (cr.status !== 'CLIENT_REVISION' && !isReturnedDraft))
    return <PageWrapper title="Not Found"><div className="text-sm text-[#5D5B5B]">CR not found or not in client revision state.</div></PageWrapper>;

  // Determine which path we're in by checking if PO returned this CR
  const wasReturnedByPo = isReturnedDraft || (cr.statusHistory ?? []).some(
    (h) => h.fromStatus === 'PENDING_CLIENT_REVIEW' && h.toStatus === 'CLIENT_REVISION',
  );

  const ia = cr.impactAnalysis;
  const inputCls = 'w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm text-[#2D2D2D] focus:border-[#EF323F] focus:outline-none focus:ring-1 focus:ring-[#EF323F]';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-[#5D5B5B] mb-1';

  const handleResubmit = () => {
    setError('');
    dmReviewResubmit.mutate({
      dmNotes: dmNotes || undefined,
      estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
      timelineImpact: timelineImpact || undefined,
      affectedDeliverables: affectedDeliverables || undefined,
      recommendation: recommendation || undefined,
    });
  };

  // ── Returned by PO layout ────────────────────────────────────────────────────
  if (wasReturnedByPo) {
    return (
      <PageWrapper title={`Returned by Client — ${cr.crNumber}`}>
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Banner */}
        <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>{cr.submittedBy?.name}</strong> returned this CR for revision. Review their notes, make any necessary edits, then send it back for their approval.
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* CR summary */}
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-[#2D2D2D]">{cr.title}</h2>
                <div className="flex gap-2">
                  <CRPriorityBadge priority={cr.priority} />
                  <CRStatusBadge status={cr.status} />
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#5D5B5B]">Project</p>
                  <p className="mt-0.5 text-[#2D2D2D]">{cr.project.name}</p>
                </div>
                {cr.description && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#5D5B5B]">Description</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-[#2D2D2D]">{cr.description}</p>
                  </div>
                )}
                {cr.businessJustification && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#5D5B5B]">Business Justification</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-[#2D2D2D]">{cr.businessJustification}</p>
                  </div>
                )}
              </div>
            </div>

            {/* PO return notes */}
            {cr.clientNotes && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-700">
                  Reason for Return (from {cr.submittedBy?.name})
                </p>
                <p className="whitespace-pre-wrap text-sm text-red-900">{cr.clientNotes}</p>
              </div>
            )}

            {/* Estimation summary */}
            {ia && (
              <div className="rounded-xl border border-[#E5E5E5] bg-white p-6">
                <p className="mb-3 text-sm font-semibold text-[#2D2D2D]">Current Estimation</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-[#5D5B5B]">Estimated Hours</p><p className="font-semibold text-[#2D2D2D]">{ia.estimatedHours}h</p></div>
                  {ia.timelineImpact && <div><p className="text-xs text-[#5D5B5B]">Timeline Impact</p><p className="text-[#2D2D2D]">{ia.timelineImpact}</p></div>}
                  {ia.recommendation && <div className="col-span-2"><p className="text-xs text-[#5D5B5B]">Recommendation</p><p className="text-[#2D2D2D]">{ia.recommendation}</p></div>}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-5">
              <p className="mb-3 text-sm font-semibold text-[#2D2D2D]">Actions</p>
              <div className="space-y-2">
                <button
                  onClick={() => router.push(`/dm/create-cr?edit=${id}`)}
                  className="w-full rounded-lg border border-[#D3D3D3] px-4 py-2 text-sm font-medium text-[#5D5B5B] hover:bg-gray-50"
                >
                  Edit CR
                </button>
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="w-full rounded-lg bg-[#EF323F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d42b37]"
                >
                  Send to Client
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Confirm send modal */}
        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
              <h3 className="mb-2 text-base font-semibold text-[#2D2D2D]">Send Back to Client?</h3>
              <p className="mb-6 text-sm text-[#5D5B5B]">
                This will notify <strong>{cr.submittedBy?.name}</strong> to review the updated CR. They can approve, decline, or return it again.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmOpen(false)} className="rounded-lg border border-[#D3D3D3] px-4 py-2 text-sm text-[#5D5B5B]">Cancel</button>
                <button
                  onClick={() => { setConfirmOpen(false); sendToClient.mutate(); }}
                  disabled={sendToClient.isPending}
                  className="rounded-lg bg-[#EF323F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d42b37] disabled:opacity-60"
                >
                  {sendToClient.isPending ? 'Sending…' : 'Yes, Send'}
                </button>
              </div>
            </div>
          </div>
        )}
      </PageWrapper>
    );
  }

  // ── PO submitted edits layout (existing flow) ────────────────────────────────
  return (
    <PageWrapper title={`Client Revision — ${cr.crNumber}`}>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Banner */}
      <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>{cr.submittedBy?.name}</strong> has submitted edits. Review their changes below, update estimation if needed, and re-submit for final approval.
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* CR Details — PO may have edited description */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-[#2D2D2D]">{cr.title}</h2>
              <div className="flex gap-2">
                <CRPriorityBadge priority={cr.priority} />
                <CRStatusBadge status={cr.status} />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#5D5B5B]">Project</p>
                <p className="mt-0.5 text-sm text-[#2D2D2D]">{cr.project.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#5D5B5B]">Description (PO may have edited)</p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-[#2D2D2D]">{cr.description || <span className="italic text-[#D3D3D3]">No description</span>}</p>
              </div>
              {cr.businessJustification && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#5D5B5B]">Business Justification</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-[#2D2D2D]">{cr.businessJustification}</p>
                </div>
              )}
            </div>
          </div>

          {/* Client Notes */}
          {cr.clientNotes && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-700">Client Notes (from {cr.submittedBy?.name})</p>
              <p className="whitespace-pre-wrap text-sm text-blue-900">{cr.clientNotes}</p>
            </div>
          )}

          {/* DM Response Form */}
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-6">
            <p className="mb-4 text-sm font-semibold text-[#2D2D2D]">Your Response</p>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>DM Notes / Comments on Edits</label>
                <textarea value={dmNotes} onChange={(e) => setDmNotes(e.target.value)} rows={3} className={inputCls} placeholder="Add any comments about the client's edits…" />
              </div>
            </div>
          </div>

          {/* Updated Estimation (optional) */}
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-6">
            <p className="mb-1 text-sm font-semibold text-[#2D2D2D]">Update Estimation</p>
            <p className="mb-4 text-xs text-[#5D5B5B]">Leave blank to keep existing values</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Estimated Hours <span className="text-[#D3D3D3]">(current: {ia?.estimatedHours}h)</span></label>
                  <input type="number" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} className={inputCls} placeholder={String(ia?.estimatedHours ?? 0)} min="0" step="0.5" />
                </div>
                <div>
                  <label className={labelCls}>Timeline Impact <span className="text-[#D3D3D3]">(current)</span></label>
                  <input type="text" value={timelineImpact} onChange={(e) => setTimelineImpact(e.target.value)} className={inputCls} placeholder={ia?.timelineImpact || ''} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Affected Deliverables</label>
                <textarea value={affectedDeliverables} onChange={(e) => setAffectedDeliverables(e.target.value)} rows={2} className={inputCls} placeholder={ia?.affectedDeliverables || ''} />
              </div>
              <div>
                <label className={labelCls}>Recommendation</label>
                <textarea value={recommendation} onChange={(e) => setRecommendation(e.target.value)} rows={2} className={inputCls} placeholder={ia?.recommendation || ''} />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-5">
            <p className="mb-2 text-sm font-semibold text-[#2D2D2D]">Current Estimation</p>
            {ia ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[#5D5B5B]">Hours</span><span className="font-medium">{ia.estimatedHours}h</span></div>
                {ia.timelineImpact && <div><span className="text-[#5D5B5B] text-xs">Timeline:</span><p className="text-xs">{ia.timelineImpact}</p></div>}
              </div>
            ) : <p className="text-sm text-[#5D5B5B]">No estimation</p>}
          </div>

          <div className="rounded-xl border border-[#E5E5E5] bg-white p-5">
            <p className="mb-3 text-sm font-semibold text-[#2D2D2D]">Action</p>
            <p className="mb-4 text-xs text-[#5D5B5B]">After re-submitting, the client can only approve or decline — no further revisions.</p>
            <button
              onClick={() => setConfirmOpen(true)}
              className="w-full rounded-lg bg-[#EF323F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d42b37]"
            >
              Re-submit to Client
            </button>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-semibold text-[#2D2D2D]">Re-submit to Client?</h3>
            <p className="mb-6 text-sm text-[#5D5B5B]">
              This will send the CR back to <strong>{cr.submittedBy?.name}</strong> for final approval. They will not be able to make further revisions.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmOpen(false)} className="rounded-lg border border-[#D3D3D3] px-4 py-2 text-sm text-[#5D5B5B]">Cancel</button>
              <button
                onClick={() => { setConfirmOpen(false); handleResubmit(); }}
                disabled={dmReviewResubmit.isPending}
                className="rounded-lg bg-[#EF323F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d42b37] disabled:opacity-60"
              >
                {dmReviewResubmit.isPending ? 'Submitting…' : 'Yes, Re-submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
