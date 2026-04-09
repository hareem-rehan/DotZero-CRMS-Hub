'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { Button } from '@/components/ui/Button';
import { CRStatusBadge, CRPriorityBadge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { useCR, useAddNote } from '@/hooks/useCRs';

export default function DmCRDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: cr, isLoading } = useCR(id);
  const [noteText, setNoteText] = useState('');

  const addNote = useAddNote(id, {
    onSuccess: () => { toast.success('Note added'); setNoteText(''); },
    onError: (msg) => toast.error(msg),
  });

  if (isLoading) return (
    <PageWrapper title="CR Detail">
      <div className="flex h-40 items-center justify-center text-sm text-[#5D5B5B]">Loading…</div>
    </PageWrapper>
  );
  if (!cr) return null;

  const ia = cr.impactAnalysis;

  return (
    <PageWrapper title={`${cr.crNumber} — Detail`}>
      <div className="space-y-6">

        {/* Header info */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div><p className="text-xs text-[#5D5B5B]">CR Number</p><p className="font-mono font-semibold text-[#2D2D2D]">{cr.crNumber}</p></div>
            <div><p className="text-xs text-[#5D5B5B]">Project</p><p className="text-sm text-[#2D2D2D]">{cr.project.name}</p></div>
            <div><p className="text-xs text-[#5D5B5B]">Priority</p><CRPriorityBadge priority={cr.priority} /></div>
            <div><p className="text-xs text-[#5D5B5B]">Status</p><CRStatusBadge status={cr.status} /></div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-[#5D5B5B]">Title</p>
            <p className="text-sm font-medium text-[#2D2D2D]">{cr.title}</p>
          </div>
          <div className="mt-4">
            <p className="text-xs text-[#5D5B5B]">Description</p>
            <div className="mt-1 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-3 text-sm text-[#2D2D2D]"
              dangerouslySetInnerHTML={{ __html: cr.description }} />
          </div>
          <div className="mt-4">
            <p className="text-xs text-[#5D5B5B]">Business Justification</p>
            <div className="mt-1 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-3 text-sm text-[#2D2D2D]"
              dangerouslySetInnerHTML={{ __html: cr.businessJustification }} />
          </div>
        </div>

        {/* Estimation — read-only */}
        {ia && (
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-[#2D2D2D]">Estimation</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div><p className="text-xs text-[#5D5B5B]">Estimated Hours</p><p className="text-lg font-bold text-[#2D2D2D]">{ia.estimatedHours}h</p></div>
              {ia.timelineImpact && <div><p className="text-xs text-[#5D5B5B]">Timeline Impact</p><p className="text-sm text-[#2D2D2D]">{ia.timelineImpact}</p></div>}
              {ia.recommendation && <div><p className="text-xs text-[#5D5B5B]">Recommendation</p><p className="text-sm text-[#2D2D2D]">{ia.recommendation}</p></div>}
              {ia.affectedDeliverables && <div className="col-span-2"><p className="text-xs text-[#5D5B5B]">Affected Deliverables</p><p className="text-sm text-[#2D2D2D]">{ia.affectedDeliverables}</p></div>}
              {ia.revisedMilestones && <div className="col-span-2"><p className="text-xs text-[#5D5B5B]">Revised Milestones</p><p className="text-sm text-[#2D2D2D]">{ia.revisedMilestones}</p></div>}
            </div>
          </div>
        )}

        {/* Internal Notes */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-[#2D2D2D]">Internal Notes <span className="text-xs font-normal text-[#5D5B5B]">(DM & SA only)</span></h2>
          <div className="space-y-3 mb-4">
            {(cr.internalNotes ?? []).length === 0 && (
              <p className="text-sm text-[#D3D3D3]">No notes yet.</p>
            )}
            {(cr.internalNotes ?? []).map((note) => (
              <div key={note.id} className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[#2D2D2D]">{note.author.name}</span>
                  <span className="text-xs text-[#5D5B5B]">{new Date(note.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-[#2D2D2D] whitespace-pre-wrap">{note.content}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <textarea
              rows={2}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add an internal note…"
              className="flex-1 rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
            />
            <Button
              onClick={() => addNote.mutate(noteText)}
              loading={addNote.isPending}
              disabled={!noteText.trim()}
              className="self-end"
            >
              Add
            </Button>
          </div>
        </div>

        {/* Status History */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-[#2D2D2D]">Status History</h2>
          <div className="space-y-2">
            {cr.statusHistory.map((h) => (
              <div key={h.id} className="flex items-center gap-3 text-sm">
                <span className="text-xs text-[#5D5B5B] whitespace-nowrap">{new Date(h.changedAt).toLocaleString()}</span>
                <span className="text-[#D3D3D3]">→</span>
                <CRStatusBadge status={h.toStatus} />
                <span className="text-xs text-[#5D5B5B]">by {h.changedBy.name}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </PageWrapper>
  );
}
