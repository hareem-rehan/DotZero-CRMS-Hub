'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { useMyProjects } from '@/hooks/useProjects';
import { useCreateDMInitiatedCR, useUpdateDMDraft, useCR } from '@/hooks/useCRs';

const PRIORITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
const CHANGE_TYPE_OPTIONS = ['SCOPE', 'TIMELINE', 'BOTH'] as const;

function DmCreateCRForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit') ?? '';
  const isEditing = !!editId;

  const { data: projects = [], isLoading: projectsLoading } = useMyProjects();
  const { data: existingCR, isLoading: crLoading } = useCR(editId);

  const createCR = useCreateDMInitiatedCR({
    onSuccess: (cr) => router.push(`/dm/draft/${cr.id}`),
    onError: (msg) => setError(msg),
  });

  const updateDraft = useUpdateDMDraft(editId, {
    onSuccess: () => router.push(`/dm/draft/${editId}`),
    onError: (msg) => setError(msg),
  });

  const [form, setForm] = useState({
    projectId: '',
    title: '',
    description: '',
    businessJustification: '',
    priority: 'HIGH' as string,
    changeType: 'SCOPE' as string,
    requestingParty: '',
    dmNotes: '',
    estimatedHours: '',
    timelineImpact: '',
    affectedDeliverables: '',
    revisedMilestones: '',
    recommendation: '',
  });
  const [prefilled, setPrefilled] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill form when editing an existing draft
  useEffect(() => {
    if (!existingCR || prefilled) return;
    const ia = existingCR.impactAnalysis;
    setForm({
      projectId: existingCR.projectId,
      title: existingCR.title,
      description: existingCR.description ?? '',
      businessJustification: existingCR.businessJustification ?? '',
      priority: existingCR.priority ?? 'HIGH',
      changeType: existingCR.changeType ?? 'SCOPE',
      requestingParty: existingCR.requestingParty ?? '',
      dmNotes: existingCR.dmNotes ?? '',
      estimatedHours: ia?.estimatedHours ? String(ia.estimatedHours) : '',
      timelineImpact: ia?.timelineImpact ?? '',
      affectedDeliverables: ia?.affectedDeliverables ?? '',
      revisedMilestones: ia?.revisedMilestones ?? '',
      recommendation: ia?.recommendation ?? '',
    });
    setPrefilled(true);
  }, [existingCR, prefilled]);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.projectId) return setError('Please select a project');
    if (!form.title.trim()) return setError('Title is required');
    if (!form.estimatedHours || isNaN(Number(form.estimatedHours)) || Number(form.estimatedHours) <= 0)
      return setError('Valid estimated hours are required');

    const payload = {
      title: form.title.trim(),
      description: form.description,
      businessJustification: form.businessJustification,
      priority: form.priority,
      changeType: form.changeType,
      requestingParty: form.requestingParty || undefined,
      dmNotes: form.dmNotes || undefined,
      estimatedHours: Number(form.estimatedHours),
      timelineImpact: form.timelineImpact || undefined,
      affectedDeliverables: form.affectedDeliverables || undefined,
      revisedMilestones: form.revisedMilestones || undefined,
      recommendation: form.recommendation || undefined,
    };

    if (isEditing) {
      updateDraft.mutate(payload);
    } else {
      createCR.mutate({ projectId: form.projectId, ...payload });
    }
  };

  const isBusy = createCR.isPending || updateDraft.isPending;

  const inputCls = 'w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm text-[#2D2D2D] focus:border-[#EF323F] focus:outline-none focus:ring-1 focus:ring-[#EF323F]';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-[#5D5B5B] mb-1';
  const sectionTitle = 'text-sm font-semibold text-[#2D2D2D] mb-4 pb-2 border-b border-[#E5E5E5]';

  if (isEditing && crLoading) {
    return (
      <PageWrapper title="Edit CR">
        <div className="flex h-40 items-center justify-center text-sm text-[#5D5B5B]">Loading…</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={isEditing ? 'Edit CR' : 'Create CR on Behalf of Client'}>
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* CR Details */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-6">
          <p className={sectionTitle}>Change Request Details</p>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Project *</label>
              <select
                value={form.projectId}
                onChange={set('projectId')}
                className={inputCls}
                disabled={projectsLoading || isEditing}
              >
                <option value="">Select project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
              {isEditing && (
                <p className="mt-1 text-xs text-[#5D5B5B]">Project cannot be changed when editing a draft.</p>
              )}
            </div>

            <div>
              <label className={labelCls}>Title *</label>
              <input type="text" value={form.title} onChange={set('title')} className={inputCls} placeholder="Brief title of the change request" maxLength={500} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Priority</label>
                <select value={form.priority} onChange={set('priority')} className={inputCls}>
                  {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Change Type</label>
                <select value={form.changeType} onChange={set('changeType')} className={inputCls}>
                  {CHANGE_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Description</label>
              <textarea value={form.description} onChange={set('description')} rows={4} className={inputCls} placeholder="Describe the change in detail…" />
            </div>

            <div>
              <label className={labelCls}>Business Justification</label>
              <textarea value={form.businessJustification} onChange={set('businessJustification')} rows={3} className={inputCls} placeholder="Why is this change needed?" />
            </div>

            <div>
              <label className={labelCls}>Requesting Party</label>
              <input type="text" value={form.requestingParty} onChange={set('requestingParty')} className={inputCls} placeholder="Auto-filled from project" />
            </div>

            <div>
              <label className={labelCls}>DM Notes</label>
              <textarea value={form.dmNotes} onChange={set('dmNotes')} rows={2} className={inputCls} placeholder="Internal notes for the DM (not visible to client)…" />
            </div>
          </div>
        </div>

        {/* Estimation */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-6">
          <p className={sectionTitle}>Estimation (Upfront)</p>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Estimated Hours *</label>
              <input
                type="number"
                value={form.estimatedHours}
                onChange={set('estimatedHours')}
                onWheel={(e) => e.currentTarget.blur()}
                className={inputCls}
                placeholder="0"
                min="0"
                step="0.5"
              />
            </div>

            <div>
              <label className={labelCls}>Timeline Impact</label>
              <input type="text" value={form.timelineImpact} onChange={set('timelineImpact')} className={inputCls} placeholder="e.g. +3 days to Milestone 3" />
            </div>

            <div>
              <label className={labelCls}>Affected Deliverables</label>
              <textarea value={form.affectedDeliverables} onChange={set('affectedDeliverables')} rows={2} className={inputCls} placeholder="Which deliverables are impacted?" />
            </div>

            <div>
              <label className={labelCls}>Revised Milestones</label>
              <textarea value={form.revisedMilestones} onChange={set('revisedMilestones')} rows={2} className={inputCls} placeholder="Any milestone changes?" />
            </div>

            <div>
              <label className={labelCls}>Recommendation</label>
              <textarea value={form.recommendation} onChange={set('recommendation')} rows={2} className={inputCls} placeholder="Your overall recommendation…" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pb-6">
          <button type="button" onClick={() => router.back()} className="rounded-lg border border-[#D3D3D3] px-5 py-2 text-sm font-medium text-[#5D5B5B] hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isBusy}
            className="rounded-lg bg-[#EF323F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#d42b37] disabled:opacity-60"
          >
            {isBusy ? 'Saving…' : isEditing ? 'Update CR' : 'Review'}
          </button>
        </div>
      </form>
    </PageWrapper>
  );
}

export default function DmCreateCRPage() {
  return (
    <Suspense fallback={<PageWrapper title="Loading…"><div className="flex h-40 items-center justify-center text-sm text-[#5D5B5B]">Loading…</div></PageWrapper>}>
      <DmCreateCRForm />
    </Suspense>
  );
}
