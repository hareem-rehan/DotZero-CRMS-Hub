'use client';

import { useRouter, useParams } from 'next/navigation';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { useProject, useUpdateProject } from '@/hooks/useProjects';

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: project, isLoading } = useProject(id);
  const updateMutation = useUpdateProject(id);

  if (isLoading) {
    return (
      <PageWrapper title="Edit Project">
        <div className="py-12 text-center text-sm text-[#5D5B5B]">Loading…</div>
      </PageWrapper>
    );
  }

  if (!project) {
    return (
      <PageWrapper title="Edit Project">
        <div className="py-12 text-center text-sm text-red-600">Project not found.</div>
      </PageWrapper>
    );
  }

  const handleSubmit = async (formData: FormData) => {
    await updateMutation.mutateAsync(formData);
    router.push(`/admin/projects/${id}`);
  };

  return (
    <PageWrapper title={`Edit — ${project.name}`}>
      <div className="max-w-3xl rounded-lg border border-[#D3D3D3] bg-white p-6">
        <ProjectForm
          isEdit
          defaultValues={{
            name: project.name,
            clientName: project.clientName,
            code: project.code,
            hourlyRate: String(project.hourlyRate),
            currency: project.currency,
            startDate: project.startDate ? project.startDate.slice(0, 10) : '',
            assignedDmId: project.assignedDmId ?? '',
            showRateToDm: project.showRateToDm,
            sowReference: project.sowReference ?? '',
            status: project.status,
          }}
          loading={updateMutation.isPending}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/admin/projects/${id}`)}
        />
        {updateMutation.isError && (
          <p className="mt-3 text-sm text-red-600">
            {(updateMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update project'}
          </p>
        )}
      </div>
    </PageWrapper>
  );
}
