'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import { useProjects } from '@/hooks/useProjects';

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  magicLink: string | null;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  project: { id: string; name: string; code: string };
  sentBy: { id: string; name: string };
}

function statusLabel(inv: Invitation) {
  if (inv.usedAt) return { label: 'Used', className: 'bg-green-100 text-green-700' };
  if (new Date(inv.expiresAt) < new Date())
    return { label: 'Expired', className: 'bg-gray-100 text-gray-500' };
  return { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' };
}

export default function InvitationsPage() {
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resendResult, setResendResult] = useState<{ id: string; link: string } | null>(null);

  // Send invite form
  const [sendEmail, setSendEmail] = useState('');
  const [sendProject, setSendProject] = useState('');
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');

  const { data, isLoading } = useQuery<Invitation[]>({
    queryKey: ['invitations', projectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.set('projectId', projectId);
      const res = await apiClient.get(`/invitations?${params}`);
      return res.data.data as Invitation[];
    },
  });

  const { data: projectsData } = useProjects({ pageSize: 100 });

  const resendMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/invitations/${id}/resend`),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      setResendResult({ id, link: res.data.data.magicLink });
    },
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      apiClient.post('/invitations', {
        email: sendEmail,
        projectId: sendProject,
        role: 'PRODUCT_OWNER',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      setSendSuccess('Invitation sent.');
      setSendEmail('');
      setSendProject('');
      setSendError('');
      setTimeout(() => setSendSuccess(''), 3000);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to send invitation.';
      setSendError(msg);
    },
  });

  const copyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = () => {
    if (!sendEmail.trim()) {
      setSendError('Email is required.');
      return;
    }
    if (!sendProject) {
      setSendError('Project is required.');
      return;
    }
    setSendError('');
    sendMutation.mutate();
  };

  return (
    <PageWrapper title="Invitations">
      <div className="space-y-6">
        {/* Send new invite */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-5">
          <h3 className="text-sm font-semibold text-[#2D2D2D] mb-4">Send New Invitation</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-[#5D5B5B] mb-1">Email</label>
              <input
                type="email"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                placeholder="client@example.com"
                className="rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F] w-64"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5D5B5B] mb-1">Project</label>
              <select
                value={sendProject}
                onChange={(e) => setSendProject(e.target.value)}
                className="rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              >
                <option value="">Select project…</option>
                {(projectsData?.projects ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={handleSend} disabled={sendMutation.isPending}>
              {sendMutation.isPending ? 'Sending…' : 'Send Invite'}
            </Button>
          </div>
          {sendError && <p className="mt-2 text-sm text-red-600">{sendError}</p>}
          {sendSuccess && <p className="mt-2 text-sm text-green-600">{sendSuccess}</p>}
        </div>

        {/* Resend result (magic link copy) */}
        {resendResult && (
          <div className="rounded-xl border border-[#EF323F]/30 bg-[#EF323F]/5 p-4 flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-[#2D2D2D] mb-1">Invitation link regenerated</p>
              <code className="text-xs text-[#5D5B5B] break-all">{resendResult.link}</code>
            </div>
            <button
              onClick={() => copyLink(resendResult.link, resendResult.id)}
              className="shrink-0 rounded-lg bg-[#EF323F] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#d42b36]"
            >
              {copiedId === resendResult.id ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() => setResendResult(null)}
              className="shrink-0 text-[#5D5B5B] hover:text-[#2D2D2D] text-lg leading-none"
            >
              &times;
            </button>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-3">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
          >
            <option value="">All Projects</option>
            {(projectsData?.projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="text-sm text-[#5D5B5B]">{data?.length ?? 0} invitation(s)</span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="py-10 text-center text-sm text-[#5D5B5B]">Loading…</div>
        ) : (
          <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#F7F7F7]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#5D5B5B] uppercase tracking-wide">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#5D5B5B] uppercase tracking-wide">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#5D5B5B] uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#5D5B5B] uppercase tracking-wide">
                    Sent By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#5D5B5B] uppercase tracking-wide">
                    Expires
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#5D5B5B] uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#5D5B5B]">
                      No invitations found.
                    </td>
                  </tr>
                ) : (
                  (data ?? []).map((inv) => {
                    const status = statusLabel(inv);
                    const isPending = !inv.usedAt && new Date(inv.expiresAt) >= new Date();
                    return (
                      <tr
                        key={inv.id}
                        className="border-b border-[#E5E5E5] last:border-0 hover:bg-[#F7F7F7]"
                      >
                        <td className="px-4 py-3 font-medium text-[#2D2D2D]">{inv.email}</td>
                        <td className="px-4 py-3 text-[#5D5B5B]">
                          <span className="font-mono text-xs text-[#EF323F]">
                            {inv.project.code}
                          </span>
                          <span className="ml-1">{inv.project.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#5D5B5B]">{inv.sentBy.name}</td>
                        <td className="px-4 py-3 text-[#5D5B5B]">
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isPending && inv.magicLink && (
                              <button
                                onClick={() => copyLink(inv.magicLink!, inv.id)}
                                className="rounded-lg border border-[#D3D3D3] px-2.5 py-1 text-xs font-medium text-[#2D2D2D] hover:bg-[#F3F0E8]"
                              >
                                {copiedId === inv.id ? 'Copied!' : 'Copy Link'}
                              </button>
                            )}
                            {!inv.usedAt && (
                              <button
                                onClick={() => resendMutation.mutate(inv.id)}
                                disabled={resendMutation.isPending}
                                className="rounded-lg border border-[#EF323F] px-2.5 py-1 text-xs font-medium text-[#EF323F] hover:bg-[#EF323F]/5"
                              >
                                {resendMutation.isPending ? '…' : 'Resend'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
