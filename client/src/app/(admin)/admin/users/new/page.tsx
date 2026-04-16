'use client';

import { useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { UserForm, UserFormValues } from '@/components/users/UserForm';
import { useCreateUser } from '@/hooks/useUsers';

export default function NewUserPage() {
  const router = useRouter();
  const createMutation = useCreateUser();

  const handleSubmit = async (values: UserFormValues) => {
    await createMutation.mutateAsync(values);
    router.push('/admin/users');
  };

  return (
    <PageWrapper title="New User">
      <div className="max-w-2xl rounded-lg border border-[#D3D3D3] bg-white p-6">
        <UserForm
          loading={createMutation.isPending}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/admin/users')}
        />
        {createMutation.isError && (
          <p className="mt-3 text-sm text-red-600">
            {(createMutation.error as { response?: { data?: { error?: string } } })?.response?.data
              ?.error ?? 'Failed to create user'}
          </p>
        )}
      </div>
    </PageWrapper>
  );
}
