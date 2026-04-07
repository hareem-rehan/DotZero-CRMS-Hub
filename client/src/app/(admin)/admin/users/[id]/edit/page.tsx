'use client';

import { useRouter, useParams } from 'next/navigation';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { UserForm, UserFormValues } from '@/components/users/UserForm';
import { useUser, useUpdateUser } from '@/hooks/useUsers';

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: user, isLoading } = useUser(id);
  const updateMutation = useUpdateUser(id);

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
    await updateMutation.mutateAsync({
      name: values.name,
      role: values.role,
      projectIds: values.projectIds,
    });
    router.push('/admin/users');
  };

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
          }}
          loading={updateMutation.isPending}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/admin/users')}
        />
        {updateMutation.isError && (
          <p className="mt-3 text-sm text-red-600">
            {(updateMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
              'Failed to update user'}
          </p>
        )}
      </div>
    </PageWrapper>
  );
}
