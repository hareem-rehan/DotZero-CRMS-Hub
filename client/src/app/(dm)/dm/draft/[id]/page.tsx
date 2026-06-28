'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { CRStatusBadge, CRPriorityBadge } from '@/components/ui/Badge';
import { useCR, useSendToClient, useUpdateDMDraft } from '@/hooks/useCRs';

export default function DmDraftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: cr, isLoading } = useCR(id);
  const sendToClient = useSendToClient(id, {
    onSuccess: () => router.push('/dm/pending'),
    onError: (msg) => setError(msg),
  });
  const updateDraft = useUpdateDMDraft(id, { onError: (msg) => setError(msg) });

  const [editingNotes, setEditingNotes] = useState(false);
  const [dmNotes, setDmNotes] = useState('');
  const [confirmSend, setConfirmSend] = useState(false);
  const [error, setError] = useState('');

  if (isLoading) return <PageWrapper title="Loading…"><div className="text-sm text-[#5D5B5B]">Loading…</div></PageWrapper>;
  if (!cr) return <PageWrapper title="Not Found"><div className="text-sm text-[#5D5B5B]">CR not found.</div></PageWrapper>;
  if (!cr.initiatedByDm) return <PageWrapper title="Not Found"><div className="text-sm text-[#5D5B5B]">Not a DM-initiated CR.</div></PageWrapper>;

  // CLIENT_REVISION or a DRAFT with clientNotes (returned by PO) — send to the correct page
  if (cr.status === 'CLIENT_REVISION' || (cr.status === 'DRAFT' && cr.clientNotes)) {
    router.replace(`/dm/client-revision/${id}`);
    return null;
  }

  const ia = cr.impactAnalysis;
  const fieldRow = (label: string, value: string | number | null | undefined) =>
    value ? (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#5D5B5B]">{label}</p>
        <p className="mt-0.5 text-sm text-[#2D2D2D]">{String(value)}</p>
      </div>
    ) : null;

  const handleSaveNotes = () => {
    updateDraft.mutate({ dmNotes });
    setEditingNotes(false);
  };

  return (
    <PageWrapper
      title={`Draft CR — ${cr.crNumber}`}
      actions={
        cr.status === 'DRAFT' ? (
          <button
            onClick={() => setConfirmSend(true)}
            className="rounded-lg bg-[#EF323F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d42b37]"
          >
            Send to Client
          </button>
        ) : undefined
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Banner */}
      <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        This CR will be sent to <strong>{cr.submittedBy?.name}</strong> for review before entering the approval cycle.
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main details */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-[#2D2D2D]">{cr.title}</h2>
              <div className="flex items-center gap-2">
                <CRPriorityBadge priority={cr.priority} />
                <CRStatusBadge status={cr.status} overrides={{ DRAFT: { label: 'Draft', variant: 'gray' } }} />
              </div>
            </div>
            <div className="space-y-3">
              {fieldRow('Project', cr.project.name)}
              {fieldRow('Change Type', cr.changeType)}
              {fieldRow('Description', cr.description)}
              {fieldRow('Business Justification', cr.businessJustification)}
              {fieldRow('Requesting Party', cr.requestingParty)}
              {fieldRow('SOW Reference', cr.sowRef)}
            </div>
          </div>

          {/* Estimation */}
          {ia && (
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-6">
              <p className="mb-4 text-sm font-semibold text-[#2D2D2D]">Estimation</p>
              <div className="grid grid-cols-2 gap-4">
                {fieldRow('Estimated Hours', `${ia.estimatedHours}h`)}
                {fieldRow('Timeline Impact', ia.timelineImpact)}
                {fieldRow('Affected Deliverables', ia.affectedDeliverables)}
                {fieldRow('Revised Milestones', ia.revisedMilestones)}
                {fieldRow('Resources Required', ia.resourcesRequired)}
                {fieldRow('Recommendation', ia.recommendation)}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* DM Notes */}
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#2D2D2D]">DM Notes</p>
              {!editingNotes && (
                <button
                  onClick={() => { setDmNotes(cr.dmNotes ?? ''); setEditingNotes(true); }}
                  className="text-xs text-[#EF323F] hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={dmNotes}
                  onChange={(e) => setDmNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:border-[#EF323F] focus:outline-none"
                  placeholder="Internal notes (not visible to client)…"
                />
                <div className="flex gap-2">
                  <button onClick={handleSaveNotes} className="rounded-lg bg-[#EF323F] px-3 py-1.5 text-xs font-semibold text-white">Save</button>
                  <button onClick={() => setEditingNotes(false)} className="rounded-lg border border-[#D3D3D3] px-3 py-1.5 text-xs text-[#5D5B5B]">Cancel</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#5D5B5B]">{cr.dmNotes || <span className="italic text-[#D3D3D3]">No notes</span>}</p>
            )}
          </div>

          {/* Actions */}
          {cr.status === 'DRAFT' && (
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
                  onClick={() => setConfirmSend(true)}
                  className="w-full rounded-lg bg-[#EF323F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d42b37]"
                >
                  Send to Client
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm send modal */}
      {confirmSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-semibold text-[#2D2D2D]">Send to Client?</h3>
            <p className="mb-6 text-sm text-[#5D5B5B]">
              This will notify <strong>{cr.submittedBy?.name}</strong> to review the CR. They can confirm or reject it back to you.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmSend(false)} className="rounded-lg border border-[#D3D3D3] px-4 py-2 text-sm font-medium text-[#5D5B5B]">Cancel</button>
              <button
                onClick={() => { setConfirmSend(false); sendToClient.mutate(); }}
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
