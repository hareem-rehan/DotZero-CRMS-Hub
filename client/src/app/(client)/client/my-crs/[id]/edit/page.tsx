'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { FileUpload } from '@/components/ui/FileUpload';
import { useCR, useUpdateCR, useSubmitCR } from '@/hooks/useCRs';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().optional(),
  businessJustification: z.string().optional(),
  priority: z.string().optional(),
  changeType: z.string().optional(),
  requestingParty: z.string().optional(),
  sowRef: z.string().optional(),
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

export default function EditCRPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [submitError, setSubmitError] = useState('');
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: cr, isLoading, isError } = useCR(id);
  const updateCR = useUpdateCR(id);
  const submitCR = useSubmitCR();

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      businessJustification: '',
      priority: 'MEDIUM',
      changeType: 'SCOPE',
      requestingParty: '',
      sowRef: '',
    },
  });

  // Populate form once CR loads
  useEffect(() => {
    if (!cr) return;
    reset({
      title: cr.title,
      description: cr.description,
      businessJustification: cr.businessJustification,
      priority: cr.priority,
      changeType: cr.changeType,
      requestingParty: cr.requestingParty,
      sowRef: cr.sowRef ?? '',
    });
  }, [cr, reset]);

  // Guard: only DRAFT is editable
  useEffect(() => {
    if (cr && cr.status !== 'DRAFT') {
      router.replace(`/client/my-crs/${id}`);
    }
  }, [cr, id, router]);

  // ── Auto-save every 60s ──────────────────────────────────────────────────────
  const formValues = watch();

  const autoSave = useCallback(async () => {
    if (!formValues.title) return;
    setAutoSaveStatus('saving');
    try {
      await updateCR.mutateAsync({ payload: formValues, files });
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch {
      setAutoSaveStatus('idle');
    }
  }, [formValues, files, updateCR]);

  useEffect(() => {
    if (!isDirty) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(autoSave, 60_000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [formValues, isDirty, autoSave]);

  // ── Save draft ────────────────────────────────────────────────────────────────
  const onSaveDraft = handleSubmit(async (values) => {
    setSubmitError('');
    try {
      await updateCR.mutateAsync({ payload: values, files });
      router.push(`/client/my-crs/${id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setSubmitError(msg ?? 'Failed to save');
    }
  });

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = handleSubmit(async (values) => {
    setSubmitError('');
    try {
      await updateCR.mutateAsync({ payload: values, files });
      await submitCR.mutateAsync(id);
      router.push('/client/my-crs');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setSubmitError(msg ?? 'Failed to submit');
      setConfirmSubmit(false);
    }
  });

  const isActionLoading = updateCR.isPending || submitCR.isPending;

  if (isLoading) {
    return (
      <PageWrapper title="Edit Change Request">
        <div className="flex items-center justify-center py-20 text-sm text-[#5D5B5B]">
          Loading...
        </div>
      </PageWrapper>
    );
  }

  if (isError || !cr) {
    return (
      <PageWrapper title="Edit Change Request">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-sm text-red-600">Change request not found.</p>
          <Button variant="secondary" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={`Edit — ${cr.crNumber}`}>
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-[#5D5B5B]">
        <Link href="/client/my-crs" className="hover:text-[#EF323F]">
          My Change Requests
        </Link>
        <span>/</span>
        <Link href={`/client/my-crs/${id}`} className="hover:text-[#EF323F]">
          {cr.crNumber}
        </Link>
        <span>/</span>
        <span className="text-[#2D2D2D] font-medium">Edit</span>
      </div>

      {/* Auto-save indicator */}
      <div className="mb-4 flex items-center justify-between text-xs text-[#5D5B5B]">
        <span>
          Project: <strong className="text-[#2D2D2D]">{cr.project.name}</strong>
        </span>
        {autoSaveStatus === 'saving' && <span>Saving draft...</span>}
        {autoSaveStatus === 'saved' && <span className="text-green-600">Draft saved</span>}
        {autoSaveStatus === 'idle' && <span>Auto-saves every 60 seconds</span>}
      </div>

      {/* Confirm submit banner */}
      {confirmSubmit && (
        <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-orange-800">
            Save changes and submit this CR to the Delivery Manager for review?
          </p>
          <div className="flex gap-2 ml-4 shrink-0">
            <Button variant="secondary" onClick={() => setConfirmSubmit(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmit} loading={isActionLoading}>
              Confirm
            </Button>
          </div>
        </div>
      )}

      <form className="mx-auto max-w-3xl space-y-6">
        {/* Basic info */}
        <div className="rounded-lg border border-[#D3D3D3] bg-white p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#2D2D2D]">Basic Information</h2>

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

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Requesting Party"
              placeholder="Who is requesting this change?"
              {...register('requestingParty')}
            />
            <Input label="SOW Reference" placeholder="e.g. SOW-2024-001" {...register('sowRef')} />
          </div>
        </div>

        {/* Details */}
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

        {/* Existing attachments */}
        {cr.attachments && cr.attachments.length > 0 && (
          <div className="rounded-lg border border-[#D3D3D3] bg-white p-6">
            <h2 className="mb-3 text-sm font-semibold text-[#2D2D2D]">
              Existing Attachments ({cr.attachments.length})
            </h2>
            <ul className="space-y-2">
              {cr.attachments.map((att) => (
                <li key={att.id} className="flex items-center gap-2 text-sm text-[#5D5B5B]">
                  <svg
                    className="h-4 w-4 shrink-0 text-[#EF323F]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <a
                    href={att.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#EF323F] hover:underline truncate"
                  >
                    {att.fileName}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* New attachments */}
        <div className="rounded-lg border border-[#D3D3D3] bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-[#2D2D2D]">Add Attachments</h2>
          <FileUpload files={files} onFilesChange={setFiles} label="Upload additional documents" />
        </div>

        {/* Error */}
        {submitError && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pb-6">
          <Button
            variant="secondary"
            type="button"
            onClick={() => router.push(`/client/my-crs/${id}`)}
          >
            Cancel
          </Button>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              type="button"
              onClick={onSaveDraft}
              loading={updateCR.isPending && !submitCR.isPending}
              disabled={isActionLoading}
            >
              Save Draft
            </Button>
            <Button type="button" onClick={() => setConfirmSubmit(true)} disabled={isActionLoading}>
              Submit for Review
            </Button>
          </div>
        </div>
      </form>
    </PageWrapper>
  );
}
