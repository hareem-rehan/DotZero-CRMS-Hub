'use client';

import { useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { useCreateProject } from '@/hooks/useProjects';

export default function NewProjectPage() {
  const router = useRouter();
  const createMutation = useCreateProject();

  const handleSubmit = async (formData: FormData) => {
    await createMutation.mutateAsync(formData);
    router.push('/admin/projects');
  };

  return (
    <PageWrapper title="New Project">
      <div className="max-w-3xl rounded-lg border border-[#D3D3D3] bg-white p-6">
        <ProjectForm
          loading={createMutation.isPending}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/admin/projects')}
        />
        {createMutation.isError && (
          <p className="mt-3 text-sm text-red-600">
            {(createMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create project'}
          </p>
        )}
      </div>
    </PageWrapper>
  );
}
