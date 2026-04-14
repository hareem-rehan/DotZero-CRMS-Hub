'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { FileUpload } from '@/components/ui/FileUpload';
import { apiClient } from '@/lib/apiClient';
import { useMyProjects } from '@/hooks/useProjects';
import { useCreateCR, useSubmitCR } from '@/hooks/useCRs';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().optional(),
  businessJustification: z.string().optional(),
  priority: z.string().optional(),
  changeType: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const TYPE_OPTIONS = [
  { value: 'SCOPE', label: 'Scope' },
  { value: 'TIMELINE', label: 'Timeline' },
  { value: 'BUDGET', label: 'Budget' },
  { value: 'RESOURCE', label: 'Resource' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'OTHER', label: 'Other' },
];

// ─── Auto-save storage key ─────────────────────────────────────────────────────
const DRAFT_KEY = 'cr_draft_new';

export default function NewCRPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [submitError, setSubmitError] = useState('');
  const [hasDraftBanner, setHasDraftBanner] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftIdRef = useRef<string | null>(null);

  const { data: myProjects } = useMyProjects();
  const projectOptions = (myProjects ?? []).map((p) => ({
    value: p.id,
    label: `${p.name} (${p.code})`,
  }));

  const createCR = useCreateCR();
  const submitCR = useSubmitCR();

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId: '',
      title: '',
      description: '',
      businessJustification: '',
      priority: 'MEDIUM',
      changeType: 'SCOPE',
    },
  });

  // ── Restore draft from localStorage ──────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.values) {
          reset(parsed.values);
          setHasDraftBanner(true);
        }
        if (parsed.crId) draftIdRef.current = parsed.crId;
      }
    } catch {
      // ignore
    }
  }, [reset]);

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    draftIdRef.current = null;
    setHasDraftBanner(false);
    reset({
      projectId: '',
      title: '',
      description: '',
      businessJustification: '',
      priority: 'MEDIUM',
      changeType: 'SCOPE',
    });
  };

  // ── Auto-save every 60s ──────────────────────────────────────────────────────
  const formValues = watch();

  const autoSave = useCallback(async () => {
    if (!formValues.title || !formValues.projectId) return;
    setAutoSaveStatus('saving');
    try {
      let crId = draftIdRef.current;
      if (!crId) {
        const cr = await createCR.mutateAsync({
          payload: {
            projectId: formValues.projectId,
            title: formValues.title,
            description: formValues.description,
            businessJustification: formValues.businessJustification,
            priority: formValues.priority,
            changeType: formValues.changeType,
          },
          files,
        });
        crId = cr.id;
        draftIdRef.current = crId;
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ values: formValues, crId }));
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch {
      setAutoSaveStatus('idle');
    }
  }, [formValues, files, createCR]);

  useEffect(() => {
    if (!isDirty) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(autoSave, 60_000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [formValues, isDirty, autoSave]);

  // ── Save draft manually ───────────────────────────────────────────────────────
  const onSaveDraft = handleSubmit(async (values) => {
    setSubmitError('');
    try {
      const cr = await createCR.mutateAsync({
        payload: {
          projectId: values.projectId,
          title: values.title,
          description: values.description,
          businessJustification: values.businessJustification,
          priority: values.priority,
          changeType: values.changeType,
        },
        files,
      });
      localStorage.removeItem(DRAFT_KEY);
      router.push(`/client/my-crs/${cr.id}/edit`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setSubmitError(msg ?? 'Failed to save draft');
    }
  });

  // ── Submit ────────────────────────────────────────────────────────────────────
  const onSubmit = handleSubmit(async (values) => {
    setSubmitError('');
    try {
      let crId = draftIdRef.current;
      if (!crId) {
        // No draft yet — create it now
        const cr = await createCR.mutateAsync({
          payload: {
            projectId: values.projectId,
            title: values.title,
            description: values.description,
            businessJustification: values.businessJustification,
            priority: values.priority,
            changeType: values.changeType,
          },
          files,
        });
        crId = cr.id;
      } else {
        // Draft exists — always update with latest values before submitting
        await apiClient.patch(`/change-requests/${crId}`, {
          title: values.title,
          description: values.description,
          businessJustification: values.businessJustification,
          priority: values.priority,
          changeType: values.changeType,
        });
      }
      await submitCR.mutateAsync(crId);
      localStorage.removeItem(DRAFT_KEY);
      router.push('/client/my-crs');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setSubmitError(msg ?? 'Failed to submit change request');
    }
  });

  const isLoading = createCR.isPending || submitCR.isPending;

  return (
    <PageWrapper title="New Change Request">
      <form className="mx-auto max-w-3xl space-y-6">
        {/* Draft restored banner */}
        {hasDraftBanner && (
          <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <span className="text-sm text-amber-800">
              📝 A previous draft was restored. Continue editing or discard it to start fresh.
            </span>
            <button
              type="button"
              onClick={discardDraft}
              className="ml-4 text-sm font-medium text-amber-700 underline hover:text-amber-900"
            >
              Discard &amp; Start Fresh
            </button>
          </div>
        )}

        {/* Auto-save indicator */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#5D5B5B]">Auto-saves every 60 seconds</p>
          {autoSaveStatus === 'saving' && (
            <span className="text-xs text-[#5D5B5B]">Saving draft...</span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="text-xs text-green-600">Draft saved</span>
          )}
        </div>

        {/* Project + Title */}
        <div className="rounded-lg border border-[#D3D3D3] bg-white p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#2D2D2D]">Basic Information</h2>

          <Controller
            name="projectId"
            control={control}
            render={({ field }) => (
              <Select
                label="Project *"
                options={projectOptions}
                placeholder="Select a project..."
                value={field.value}
                onChange={field.onChange}
                error={errors.projectId?.message}
              />
            )}
          />

          <Input
            label="Title *"
            placeholder="Brief title for this change request"
            error={errors.title?.message}
            {...register('title')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Select
                  label="Priority"
                  options={PRIORITY_OPTIONS}
                  value={field.value ?? 'MEDIUM'}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name="changeType"
              control={control}
              render={({ field }) => (
                <Select
                  label="Change Type"
                  options={TYPE_OPTIONS}
                  value={field.value ?? 'SCOPE'}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </div>

        {/* Description + Justification */}
        <div className="rounded-lg border border-[#D3D3D3] bg-white p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#2D2D2D]">Details</h2>

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <RichTextEditor
                label="Description"
                placeholder="Describe the change in detail..."
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.description?.message}
              />
            )}
          />

          <Controller
            name="businessJustification"
            control={control}
            render={({ field }) => (
              <RichTextEditor
                label="Business Justification"
                placeholder="Why is this change necessary?"
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.businessJustification?.message}
              />
            )}
          />
        </div>

        {/* Attachments */}
        <div className="rounded-lg border border-[#D3D3D3] bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-[#2D2D2D]">Attachments</h2>
          <FileUpload files={files} onFilesChange={setFiles} label="Supporting documents" />
        </div>

        {/* Error */}
        {submitError && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pb-6">
          <Button variant="secondary" type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              type="button"
              onClick={onSaveDraft}
              loading={createCR.isPending && !submitCR.isPending}
              disabled={isLoading}
            >
              Save Draft
            </Button>
            <Button
              type="button"
              onClick={onSubmit}
              loading={submitCR.isPending}
              disabled={isLoading}
            >
              Submit for Review
            </Button>
          </div>
        </div>
      </form>
    </PageWrapper>
  );
}
