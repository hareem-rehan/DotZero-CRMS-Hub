'use client';

import { useState, useRef } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useDmUsers } from '@/hooks/useProjects';

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'PKR', label: 'PKR — Pakistani Rupee' },
  { value: 'SAR', label: 'SAR — Saudi Riyal' },
];

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'DELIVERED', label: 'Delivered' },
];

export interface ProjectFormValues {
  name: string;
  clientName: string;
  clientEmail: string;
  code?: string;
  hourlyRate: string;
  currency: string;
  startDate: string;
  assignedDmId: string;
  showRateToDm: boolean;
  status: string;
  clientMemberEmails: string[];
}

interface ProjectFormProps {
  defaultValues?: Partial<ProjectFormValues>;
  isEdit?: boolean;
  loading?: boolean;
  draftLoading?: boolean;
  onSubmit: (formData: FormData) => void;
  onDraft?: (formData: FormData) => void;
  onCancel: () => void;
}

export function ProjectForm({
  defaultValues,
  isEdit,
  loading,
  draftLoading,
  onSubmit,
  onDraft,
  onCancel,
}: ProjectFormProps) {
  const { data: dmUsers = [] } = useDmUsers();

  const [values, setValues] = useState<ProjectFormValues>({
    name: defaultValues?.name ?? '',
    clientName: defaultValues?.clientName ?? '',
    clientEmail: defaultValues?.clientEmail ?? '',
    code: defaultValues?.code ?? '',
    hourlyRate: defaultValues?.hourlyRate ?? '',
    currency: defaultValues?.currency ?? 'USD',
    startDate: defaultValues?.startDate ?? '',
    assignedDmId: defaultValues?.assignedDmId ?? '',
    showRateToDm: defaultValues?.showRateToDm ?? false,
    status: defaultValues?.status ?? 'ACTIVE',
    clientMemberEmails: defaultValues?.clientMemberEmails ?? [],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ProjectFormValues, string>>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof ProjectFormValues, value: string | boolean | string[]) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!values.name.trim()) errs.name = 'Project name is required';
    if (!values.clientName.trim()) errs.clientName = 'PO name is required';
    if (values.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.clientEmail)) {
      errs.clientEmail = 'Invalid email address';
    }
    if (!values.hourlyRate || isNaN(Number(values.hourlyRate)) || Number(values.hourlyRate) <= 0) {
      errs.hourlyRate = 'A positive hourly rate is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Invalid email address');
      return;
    }
    if (values.clientMemberEmails.includes(email)) {
      setEmailError('Email already added');
      return;
    }
    set('clientMemberEmails', [...values.clientMemberEmails, email]);
    setEmailInput('');
    setEmailError('');
  };

  const removeEmail = (email: string) => {
    set(
      'clientMemberEmails',
      values.clientMemberEmails.filter((e) => e !== email),
    );
  };

  const buildFormData = (status: string): FormData => {
    const fd = new FormData();
    fd.append('name', values.name);
    if (values.clientName) fd.append('clientName', values.clientName);
    if (values.clientEmail) fd.append('clientEmail', values.clientEmail);
    if (!isEdit && values.code) fd.append('code', values.code.toUpperCase());
    if (values.hourlyRate) fd.append('hourlyRate', values.hourlyRate);
    fd.append('currency', values.currency);
    fd.append('status', status);
    if (values.startDate) fd.append('startDate', new Date(values.startDate).toISOString());
    if (values.assignedDmId) fd.append('assignedDmId', values.assignedDmId);
    fd.append('showRateToDm', String(values.showRateToDm));
    fd.append('clientMemberEmails', JSON.stringify(values.clientMemberEmails));
    files.forEach((f) => fd.append('attachments', f));
    return fd;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(buildFormData(values.status));
  };

  const handleSaveDraft = () => {
    if (!values.name.trim()) {
      setErrors({ name: 'Project name is required to save a draft' });
      return;
    }
    setErrors({});
    onDraft?.(buildFormData('DRAFT'));
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files ?? []).slice(0, 5));
  };

  const dmOptions = [
    { value: '', label: 'None' },
    ...dmUsers.map((u) => ({
      value: u.id,
      label: `${u.name} (${u.role === 'SUPER_ADMIN' ? 'SA' : 'DM'})`,
    })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Row 1: Project Name | Project Code (new only) */}
      {!isEdit ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Project Name *"
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            error={errors.name}
            placeholder="e.g. Customer Portal Redesign"
          />
          <Input
            label="Project Code"
            value={values.code ?? ''}
            onChange={(e) => set('code', e.target.value.toUpperCase())}
            placeholder="Auto-generated if empty"
            maxLength={20}
          />
        </div>
      ) : (
        <Input
          label="Project Name *"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
          placeholder="e.g. Customer Portal Redesign"
        />
      )}

      {/* Row 2: Currency | Hourly Rate */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label="Currency"
          value={values.currency}
          onChange={(e) => set('currency', e.target.value)}
          options={CURRENCY_OPTIONS}
        />
        <Input
          label="Hourly Rate *"
          type="number"
          min="0"
          step="0.01"
          value={values.hourlyRate}
          onChange={(e) => set('hourlyRate', e.target.value)}
          error={errors.hourlyRate}
          placeholder="0.00"
        />
      </div>

      {/* Row 3: PO Name | PO Email */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="PO Name *"
          value={values.clientName}
          onChange={(e) => set('clientName', e.target.value)}
          error={errors.clientName}
          placeholder="e.g. Jane Smith"
        />
        <div>
          <Input
            label="PO Email"
            type="email"
            value={values.clientEmail}
            onChange={(e) => set('clientEmail', e.target.value)}
            error={errors.clientEmail}
            placeholder="e.g. jane@acmecorp.com"
          />
          <p className="mt-1 text-xs text-[#5D5B5B]">
            An invitation link will be sent to this email automatically.
          </p>
        </div>
      </div>

      {/* Row 4: Assigned DM | Start Date */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label="Assigned DM"
          value={values.assignedDmId}
          onChange={(e) => set('assignedDmId', e.target.value)}
          options={dmOptions}
        />
        <Input
          label="Start Date"
          type="date"
          value={values.startDate}
          onChange={(e) => set('startDate', e.target.value)}
        />
      </div>

      {/* Row 5: Status | Show Rate to DM (inline with status label height) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label="Status"
          value={values.status}
          onChange={(e) => set('status', e.target.value)}
          options={STATUS_OPTIONS}
        />
        <label className="flex cursor-pointer items-end gap-3 pb-2">
          <input
            type="checkbox"
            checked={values.showRateToDm}
            onChange={(e) => set('showRateToDm', e.target.checked)}
            className="h-4 w-4 rounded border-[#D3D3D3] accent-[#EF323F] mb-0.5"
          />
          <span className="text-sm text-[#2D2D2D]">Display hourly rate to Delivery Manager</span>
        </label>
      </div>

      {/* Client team members */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-[#2D2D2D]">
          Client Team Members
          <span className="ml-1 font-normal text-[#5D5B5B]">
            — receive CR notifications via email
          </span>
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => {
              setEmailInput(e.target.value);
              setEmailError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addEmail();
              }
            }}
            placeholder="client@company.com"
            className="flex-1 rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
          />
          <Button type="button" variant="secondary" onClick={addEmail}>
            Add
          </Button>
        </div>
        {emailError && <p className="text-xs text-red-600">{emailError}</p>}
        {values.clientMemberEmails.length > 0 && (
          <ul className="flex flex-wrap gap-2 mt-1">
            {values.clientMemberEmails.map((email) => (
              <li
                key={email}
                className="flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs text-blue-700"
              >
                {email}
                <button
                  type="button"
                  onClick={() => removeEmail(email)}
                  className="ml-0.5 text-blue-400 hover:text-red-500 transition-colors"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* File attachments */}
      <div>
        <p className="mb-1 text-sm font-medium text-[#2D2D2D]">
          Attachments{' '}
          <span className="text-[#5D5B5B] font-normal">
            (PDF, XLS, PNG, JPEG — max 5 files, 10 MB each)
          </span>
        </p>
        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#D3D3D3] p-6 text-sm text-[#5D5B5B] hover:border-[#EF323F] transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {files.length > 0 ? (
            <ul className="space-y-1 text-left w-full">
              {files.map((f, i) => (
                <li key={i} className="truncate text-[#2D2D2D]">
                  {f.name} <span className="text-[#5D5B5B]">({(f.size / 1024).toFixed(0)} KB)</span>
                </li>
              ))}
            </ul>
          ) : (
            <span>Click to select files</span>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.xls,.xlsx,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleFiles}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading || draftLoading}>
          Cancel
        </Button>
        {!isEdit && onDraft && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleSaveDraft}
            loading={draftLoading}
            disabled={loading}
          >
            Save as Draft
          </Button>
        )}
        <Button type="submit" loading={loading} disabled={draftLoading}>
          {isEdit ? 'Save Changes' : 'Create Project'}
        </Button>
      </div>
    </form>
  );
}
