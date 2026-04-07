'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { useProjects } from '@/hooks/useProjects';

const ROLE_OPTIONS = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'PRODUCT_OWNER', label: 'Product Owner' },
  { value: 'DELIVERY_MANAGER', label: 'Delivery Manager' },
  { value: 'FINANCE', label: 'Finance' },
];

export interface UserFormValues {
  name: string;
  email: string;
  role: string;
  projectIds: string[];
}

interface UserFormProps {
  defaultValues?: Partial<UserFormValues>;
  isEdit?: boolean;
  loading?: boolean;
  onSubmit: (values: UserFormValues) => void;
  onCancel: () => void;
}

export function UserForm({ defaultValues, isEdit, loading, onSubmit, onCancel }: UserFormProps) {
  const { data: projectsData } = useProjects({ status: 'ACTIVE' });
  const projectOptions = (projectsData?.projects ?? []).map((p) => ({
    value: p.id,
    label: `${p.name} (${p.code})`,
  }));

  const [values, setValues] = useState<UserFormValues>({
    name: defaultValues?.name ?? '',
    email: defaultValues?.email ?? '',
    role: defaultValues?.role ?? 'PRODUCT_OWNER',
    projectIds: defaultValues?.projectIds ?? [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormValues, string>>>({});

  const set = (field: keyof UserFormValues, value: string | string[]) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  const validate = () => {
    const errs: typeof errors = {};
    if (!values.name.trim()) errs.name = 'Name is required';
    if (!values.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errs.email = 'Invalid email';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Full Name *"
        value={values.name}
        onChange={(e) => set('name', e.target.value)}
        error={errors.name}
        placeholder="e.g. Jane Smith"
      />
      <Input
        label="Email *"
        type="email"
        value={values.email}
        onChange={(e) => set('email', e.target.value)}
        error={errors.email}
        placeholder="jane@example.com"
        disabled={isEdit} // Email is read-only on edit
      />
      {isEdit && (
        <p className="text-xs text-[#5D5B5B] -mt-3">Email cannot be changed after creation.</p>
      )}
      <Select
        label="Role *"
        value={values.role}
        onChange={(e) => set('role', e.target.value)}
        options={ROLE_OPTIONS}
      />
      <MultiSelect
        label="Assign to Projects"
        options={projectOptions}
        value={values.projectIds}
        onChange={(ids) => set('projectIds', ids)}
        placeholder="Select projects…"
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? 'Save Changes' : 'Create User'}
        </Button>
      </div>
    </form>
  );
}
