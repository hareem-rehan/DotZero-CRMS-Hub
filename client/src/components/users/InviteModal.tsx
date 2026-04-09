'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useProjects } from '@/hooks/useProjects';
import { useSendInvitation } from '@/hooks/useUsers';

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
}

const ROLE_OPTIONS = [
  { value: 'PRODUCT_OWNER', label: 'Product Owner (Client)' },
  { value: 'DELIVERY_MANAGER', label: 'Delivery Manager' },
  { value: 'FINANCE', label: 'Finance' },
];

export function InviteModal({ open, onClose }: InviteModalProps) {
  const { data: projectsData } = useProjects({ pageSize: 100 });
  const projectOptions = [
    { value: '', label: 'Select a project…' },
    ...(projectsData?.projects ?? [])
      .filter((p) => p.status !== 'ARCHIVED')
      .map((p) => ({ value: p.id, label: `${p.name} (${p.code})` })),
  ];

  const [email, setEmail] = useState('');
  const [projectId, setProjectId] = useState('');
  const [role, setRole] = useState('PRODUCT_OWNER');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const mutation = useSendInvitation();

  const handleConfirm = async () => {
    setError('');
    if (!email.trim() || !projectId) {
      setError('Email and project are required');
      return;
    }
    try {
      const result = await mutation.mutateAsync({ email, projectId, role });
      setSuccess(result.message);
      setEmail('');
      setProjectId('');
      setRole('PRODUCT_OWNER');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Failed to send invitation');
    }
  };

  const handleClose = () => {
    setEmail('');
    setProjectId('');
    setRole('PRODUCT_OWNER');
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Invite User"
      confirmLabel="Send Invite"
      loading={mutation.isPending}
      onConfirm={handleConfirm}
      onCancel={handleClose}
    >
      <div className="space-y-4">
        {success ? (
          <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{success}</p>
        ) : (
          <>
            <Input
              label="Email Address *"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
            />
            <Select
              label="Project *"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              options={projectOptions}
            />
            <Select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={ROLE_OPTIONS}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </>
        )}
      </div>
    </Modal>
  );
}
