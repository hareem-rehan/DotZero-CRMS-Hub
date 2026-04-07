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
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'DELIVERED', label: 'Delivered' },
];

export interface ProjectFormValues {
  name: string;
  clientName: string;
  code?: string;
  hourlyRate: string;
  currency: string;
  startDate: string;
  assignedDmId: string;
  showRateToDm: boolean;
  sowReference: string;
  status: string;
}

interface ProjectFormProps {
  defaultValues?: Partial<ProjectFormValues>;
  isEdit?: boolean;
  loading?: boolean;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}

export function ProjectForm({ defaultValues, isEdit, loading, onSubmit, onCancel }: ProjectFormProps) {
  const { data: dmUsers = [] } = useDmUsers();

  const [values, setValues] = useState<ProjectFormValues>({
    name: defaultValues?.name ?? '',
    clientName: defaultValues?.clientName ?? '',
    code: defaultValues?.code ?? '',
    hourlyRate: defaultValues?.hourlyRate ?? '',
    currency: defaultValues?.currency ?? 'USD',
    startDate: defaultValues?.startDate ?? '',
    assignedDmId: defaultValues?.assignedDmId ?? '',
    showRateToDm: defaultValues?.showRateToDm ?? false,
    sowReference: defaultValues?.sowReference ?? '',
    status: defaultValues?.status ?? 'ACTIVE',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ProjectFormValues, string>>>({});
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof ProjectFormValues, value: string | boolean) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!values.name.trim()) errs.name = 'Project name is required';
    if (!values.clientName.trim()) errs.clientName = 'Client name is required';
    if (!values.hourlyRate || isNaN(Number(values.hourlyRate)) || Number(values.hourlyRate) <= 0) {
      errs.hourlyRate = 'A positive hourly rate is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const fd = new FormData();
    fd.append('name', values.name);
    fd.append('clientName', values.clientName);
    if (!isEdit && values.code) fd.append('code', values.code.toUpperCase());
    fd.append('hourlyRate', values.hourlyRate);
    fd.append('currency', values.currency);
    fd.append('status', values.status);
    if (values.startDate) fd.append('startDate', new Date(values.startDate).toISOString());
    if (values.assignedDmId) fd.append('assignedDmId', values.assignedDmId);
    fd.append('showRateToDm', String(values.showRateToDm));
    if (values.sowReference) fd.append('sowReference', values.sowReference);
    files.forEach((f) => fd.append('attachments', f));

    onSubmit(fd);
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).slice(0, 5);
    setFiles(picked);
  };

  const dmOptions = [
    { value: '', label: 'None' },
    ...dmUsers.map((u) => ({ value: u.id, label: `${u.name} (${u.role === 'SUPER_ADMIN' ? 'SA' : 'DM'})` })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Project Name *"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
          placeholder="e.g. Customer Portal Redesign"
        />
        <Input
          label="Client Name *"
          value={values.clientName}
          onChange={(e) => set('clientName', e.target.value)}
          error={errors.clientName}
          placeholder="e.g. Acme Corp"
        />
        {!isEdit && (
          <Input
            label="Project Code"
            value={values.code ?? ''}
            onChange={(e) => set('code', e.target.value.toUpperCase())}
            placeholder="Auto-generated if empty (e.g. DZERO)"
            maxLength={20}
          />
        )}
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
        <Select
          label="Currency"
          value={values.currency}
          onChange={(e) => set('currency', e.target.value)}
          options={CURRENCY_OPTIONS}
        />
        <Select
          label="Status"
          value={values.status}
          onChange={(e) => set('status', e.target.value)}
          options={STATUS_OPTIONS}
        />
        <Input
          label="Start Date"
          type="date"
          value={values.startDate}
          onChange={(e) => set('startDate', e.target.value)}
        />
        <Select
          label="Assigned DM"
          value={values.assignedDmId}
          onChange={(e) => set('assignedDmId', e.target.value)}
          options={dmOptions}
        />
        <Input
          label="SOW Reference"
          value={values.sowReference}
          onChange={(e) => set('sowReference', e.target.value)}
          placeholder="Optional"
        />
      </div>

      {/* Show rate to DM */}
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={values.showRateToDm}
          onChange={(e) => set('showRateToDm', e.target.checked)}
          className="h-4 w-4 rounded border-[#D3D3D3] accent-[#EF323F]"
        />
        <span className="text-sm text-[#2D2D2D]">Display hourly rate to Delivery Manager</span>
      </label>

      {/* File attachments */}
      <div>
        <p className="mb-1 text-sm font-medium text-[#2D2D2D]">
          Attachments <span className="text-[#5D5B5B] font-normal">(PDF, XLS, PNG, JPEG — max 5 files, 10 MB each)</span>
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
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? 'Save Changes' : 'Create Project'}
        </Button>
      </div>
    </form>
  );
}
