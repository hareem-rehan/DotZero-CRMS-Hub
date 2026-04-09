'use client';

import { useRouter, useParams } from 'next/navigation';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { UserForm, UserFormValues } from '@/components/users/UserForm';
import { useUser, useUpdateUser, useSetUserActive } from '@/hooks/useUsers';

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: user, isLoading } = useUser(id);
  const updateMutation = useUpdateUser(id);
  const setActiveMutation = useSetUserActive();

  if (isLoading) {
    return (
      <PageWrapper title="Edit User">
        <div className="py-12 text-center text-sm text-[#5D5B5B]">Loading…</div>
      </PageWrapper>
    );
  }

  if (!user) {
    return (
      <PageWrapper title="Edit User">
        <div className="py-12 text-center text-sm text-red-600">User not found.</div>
      </PageWrapper>
    );
  }

  const handleSubmit = async (values: UserFormValues) => {
    // Update name + projects
    await updateMutation.mutateAsync({
      name: values.name,
      role: values.role,
      projectIds: values.projectIds,
    });
    // Update active status if changed
    if (values.isActive !== undefined && values.isActive !== user.isActive) {
      await setActiveMutation.mutateAsync({ id, active: values.isActive });
    }
    router.push('/admin/users');
  };

  const isPending = updateMutation.isPending || setActiveMutation.isPending;
  const error = updateMutation.error || setActiveMutation.error;

  return (
    <PageWrapper title={`Edit — ${user.name}`}>
      <div className="max-w-2xl rounded-lg border border-[#D3D3D3] bg-white p-6">
        <UserForm
          isEdit
          defaultValues={{
            name: user.name,
            email: user.email,
            role: user.role,
            projectIds: user.projectAssignments?.map((pa) => pa.project.id) ?? [],
            isActive: user.isActive,
          }}
          loading={isPending}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/admin/users')}
        />
        {error && (
          <p className="mt-3 text-sm text-red-600">
            {(error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update user'}
          </p>
        )}
      </div>
    </PageWrapper>
  );
}
