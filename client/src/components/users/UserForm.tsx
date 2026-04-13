'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { RoleBadge } from '@/components/ui/Badge';

const ROLE_OPTIONS = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'DELIVERY_MANAGER', label: 'Delivery Manager' },
  { value: 'FINANCE', label: 'Finance' },
];

const STATUS_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

export interface UserFormValues {
  name: string;
  email: string;
  role: string;
  projectIds: string[];
  isActive?: boolean;
}

interface UserFormProps {
  defaultValues?: Partial<UserFormValues>;
  isEdit?: boolean;
  loading?: boolean;
  onSubmit: (values: UserFormValues) => void;
  onCancel: () => void;
}

export function UserForm({ defaultValues, isEdit, loading, onSubmit, onCancel }: UserFormProps) {
  const [values, setValues] = useState<UserFormValues>({
    name: defaultValues?.name ?? '',
    email: defaultValues?.email ?? '',
    role: defaultValues?.role ?? 'DELIVERY_MANAGER',
    projectIds: [],
    isActive: defaultValues?.isActive ?? true,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormValues, string>>>({});

  const set = (field: keyof UserFormValues, value: string | boolean) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  const validate = () => {
    const errs: Partial<Record<keyof UserFormValues, string>> = {};
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
        placeholder="jane@dotzero.com"
        disabled={isEdit}
      />
      {isEdit && (
        <p className="text-xs text-[#5D5B5B] -mt-3">Email cannot be changed after creation.</p>
      )}

      {/* Role — dropdown on create, read-only badge on edit */}
      <div>
        <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Role</label>
        {isEdit ? (
          <div className="flex items-center gap-2 rounded-lg border border-[#D3D3D3] bg-[#F7F7F7] px-3 py-2">
            <RoleBadge role={values.role} />
            <span className="text-xs text-[#5D5B5B] ml-1">
              Role cannot be changed after creation.
            </span>
          </div>
        ) : (
          <Select
            value={values.role}
            onChange={(e) => set('role', e.target.value)}
            options={ROLE_OPTIONS}
          />
        )}
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Status</label>
        <Select
          value={values.isActive ? 'true' : 'false'}
          onChange={(e) => set('isActive', e.target.value === 'true')}
          options={STATUS_OPTIONS}
        />
        <p className="mt-1 text-xs text-[#5D5B5B]">Inactive users cannot log in.</p>
      </div>

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
