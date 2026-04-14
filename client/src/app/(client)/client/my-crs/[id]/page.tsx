'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CRStatusBadge, CRPriorityBadge } from '@/components/ui/Badge';
import { SignatureCanvas } from '@/components/ui/SignatureCanvas';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { sanitizeHtml } from '@/lib/sanitize';
import { toast } from 'sonner';
import {
  useCR,
  useSubmitCR,
  useApproveCR,
  useDeclineCR,
  useResubmitCR,
  useCancelCR,
  useCRVersions,
} from '@/hooks/useCRs';

// ─── Modals ───────────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-4">
          <h3 className="text-base font-semibold text-[#2D2D2D]">{title}</h3>
          <button onClick={onClose} className="text-[#5D5B5B] hover:text-[#2D2D2D]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CRDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: cr, isLoading, isError } = useCR(id);
  const { data: versions } = useCRVersions(id);

  // Submit
  const submitCR = useSubmitCR();
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  // Approve flow: step 1 = confirm modal, step 2 = signature modal
  const [approveStep, setApproveStep] = useState<null | 'confirm' | 'sign'>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [poSignature, setPoSignature] = useState('');
  const approveCR = useApproveCR(id, {
    onSuccess: () => {
      toast.success('CR approved');
      setApproveStep(null);
    },
    onError: (msg) => toast.error(msg),
  });

  // Decline flow
  const [showDecline, setShowDecline] = useState(false);
  const [declineNotes, setDeclineNotes] = useState('');
  const declineCR = useDeclineCR(id, {
    onSuccess: () => {
      toast.success('CR declined');
      setShowDecline(false);
    },
    onError: (msg) => toast.error(msg),
  });

  // Resubmit flow
  const [showResubmit, setShowResubmit] = useState(false);
  const [resubTitle, setResubTitle] = useState('');
  const [resubDescription, setResubDescription] = useState('');
  const [resubJustification, setResubJustification] = useState('');
  const resubmitCR = useResubmitCR(id, {
    onSuccess: () => {
      toast.success('CR resubmitted as new version');
      setShowResubmit(false);
    },
    onError: (msg) => toast.error(msg),
  });

  // Cancel flow
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const cancelCR = useCancelCR(id, {
    onSuccess: () => {
      toast.success('CR cancelled');
      setShowCancel(false);
      setCancelReason('');
      router.push('/client/my-crs');
    },
    onError: (msg) => toast.error(msg),
  });

  // Version history panel
  const [showVersions, setShowVersions] = useState(false);

  // ── Open resubmit form pre-filled ──
  const openResubmit = () => {
    if (cr) {
      setResubTitle(cr.title);
      setResubDescription(cr.description);
      setResubJustification(cr.businessJustification);
    }
    setShowResubmit(true);
  };

  if (isLoading)
    return (
      <PageWrapper title="Change Request">
        <div className="flex items-center justify-center py-20 text-sm text-[#5D5B5B]">
          Loading…
        </div>
      </PageWrapper>
    );

  if (isError || !cr)
    return (
      <PageWrapper title="Change Request">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-sm text-red-600">Change request not found or access denied.</p>
          <Button variant="secondary" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </PageWrapper>
    );

  const isEstimated = cr.status === 'ESTIMATED';
  const isDraft = cr.status === 'DRAFT';
  const isCancellable = !['APPROVED', 'DECLINED', 'CANCELLED', 'COMPLETED'].includes(cr.status);

  return (
    <PageWrapper title={cr.crNumber}>
      {/* Breadcrumb + actions */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-[#5D5B5B]">
          <Link href="/client/my-crs" className="hover:text-[#EF323F]">
            My Change Requests
          </Link>
          <span>/</span>
          <span className="font-medium text-[#2D2D2D]">{cr.crNumber}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <>
              <Button variant="secondary" onClick={() => router.push(`/client/my-crs/${id}/edit`)}>
                Edit Draft
              </Button>
              <Button onClick={() => setConfirmSubmit(true)} loading={submitCR.isPending}>
                Submit for Review
              </Button>
            </>
          )}
          {isEstimated && (
            <>
              <Button variant="secondary" onClick={() => setShowDecline(true)}>
                Decline
              </Button>
              <Button variant="secondary" onClick={openResubmit}>
                Resubmit
              </Button>
              <Button onClick={() => setApproveStep('confirm')}>Approve</Button>
            </>
          )}
          {isCancellable && !isDraft && !isEstimated && (
            <Button variant="ghost" onClick={() => setShowCancel(true)}>
              Cancel CR
            </Button>
          )}
          {(versions?.length ?? 0) > 0 && (
            <Button variant="ghost" onClick={() => setShowVersions((v) => !v)}>
              {showVersions ? 'Hide' : 'Version History'} ({versions!.length})
            </Button>
          )}
        </div>
      </div>

      {/* Submit confirm bar */}
      {confirmSubmit && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
          <p className="text-sm text-orange-800">
            Submit this CR to the Delivery Manager for review?
          </p>
          <div className="flex gap-2 ml-4 shrink-0">
            <Button variant="secondary" onClick={() => setConfirmSubmit(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  await submitCR.mutateAsync(id);
                  router.push('/client/my-crs');
                } catch (e: unknown) {
                  toast.error(
                    (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                      'Failed',
                  );
                } finally {
                  setConfirmSubmit(false);
                }
              }}
              loading={submitCR.isPending}
            >
              Confirm Submit
            </Button>
          </div>
        </div>
      )}

      {/* Version History panel */}
      {showVersions && versions && versions.length > 0 && (
        <div className="mb-6 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-5">
          <h3 className="mb-3 text-sm font-semibold text-[#2D2D2D]">Version History</h3>
          <div className="space-y-2">
            {versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-4 rounded-lg border border-[#E5E5E5] bg-white p-3 text-sm"
              >
                <span className="font-mono font-semibold text-[#EF323F]">v{v.versionNumber}</span>
                <span className="text-[#5D5B5B]">Snapshot by {v.createdBy.name}</span>
                <span className="ml-auto text-xs text-[#5D5B5B]">
                  {new Date(v.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#2D2D2D]">{cr.title}</h2>
                <p className="mt-1 text-sm text-[#5D5B5B]">
                  {cr.project.name} · {cr.project.code}
                </p>
              </div>
              <CRStatusBadge status={cr.status} />
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-[#5D5B5B]">Priority</dt>
                <dd className="mt-0.5">
                  <CRPriorityBadge priority={cr.priority} />
                </dd>
              </div>
              <div>
                <dt className="text-[#5D5B5B]">Change Type</dt>
                <dd className="mt-0.5 capitalize text-[#2D2D2D]">{cr.changeType.toLowerCase()}</dd>
              </div>
              <div>
                <dt className="text-[#5D5B5B]">Requesting Party</dt>
                <dd className="mt-0.5 text-[#2D2D2D]">{cr.requestingParty || '—'}</dd>
              </div>
              <div>
                <dt className="text-[#5D5B5B]">SOW Reference</dt>
                <dd className="mt-0.5 text-[#2D2D2D]">{cr.sowRef || '—'}</dd>
              </div>
              <div>
                <dt className="text-[#5D5B5B]">Date Submitted</dt>
                <dd className="mt-0.5 text-[#2D2D2D]">
                  {cr.dateOfRequest ? new Date(cr.dateOfRequest).toLocaleDateString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[#5D5B5B]">Version</dt>
                <dd className="mt-0.5 font-mono text-[#2D2D2D]">
                  v{(cr as unknown as { version: number }).version ?? 1}
                </dd>
              </div>
            </dl>
          </div>

          {/* Description */}
          {cr.description && (
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-[#2D2D2D]">Description</h3>
              <div
                className="prose prose-sm max-w-none text-[#2D2D2D]"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(cr.description) }}
              />
            </div>
          )}

          {/* Business Justification */}
          {cr.businessJustification && (
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-[#2D2D2D]">Business Justification</h3>
              <div
                className="prose prose-sm max-w-none text-[#2D2D2D]"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(cr.businessJustification) }}
              />
            </div>
          )}

          {/* Impact Analysis — NO cost shown to PO */}
          {cr.impactAnalysis && !cr.impactAnalysis.isDraft && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-6">
              <h3 className="mb-4 text-sm font-semibold text-blue-900">
                DM Estimation — Action Required
              </h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-blue-700">Estimated Hours</dt>
                  <dd className="mt-0.5 text-xl font-bold text-blue-900">
                    {cr.impactAnalysis.estimatedHours}h
                  </dd>
                </div>
                {cr.impactAnalysis.timelineImpact && (
                  <div>
                    <dt className="text-blue-700">Timeline Impact</dt>
                    <dd className="mt-0.5 text-blue-900">{cr.impactAnalysis.timelineImpact}</dd>
                  </div>
                )}
                {cr.impactAnalysis.affectedDeliverables && (
                  <div className="col-span-2">
                    <dt className="text-blue-700">Affected Deliverables</dt>
                    <dd className="mt-0.5 text-blue-900">
                      {cr.impactAnalysis.affectedDeliverables}
                    </dd>
                  </div>
                )}
                {cr.impactAnalysis.recommendation && (
                  <div className="col-span-2">
                    <dt className="text-blue-700">DM Recommendation</dt>
                    <dd className="mt-0.5 font-medium text-blue-900">
                      {cr.impactAnalysis.recommendation}
                    </dd>
                  </div>
                )}
              </dl>
              {isEstimated && (
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" onClick={() => setShowDecline(true)}>
                    Decline
                  </Button>
                  <Button variant="secondary" onClick={openResubmit}>
                    Resubmit
                  </Button>
                  <Button onClick={() => setApproveStep('confirm')}>Approve</Button>
                </div>
              )}
            </div>
          )}

          {/* Approval result */}
          {cr.approval && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6">
              <h3 className="mb-2 text-sm font-semibold text-green-800">Approved</h3>
              {cr.approval.decisionNote && (
                <p className="text-sm text-green-700">{cr.approval.decisionNote}</p>
              )}
              <p className="mt-1 text-xs text-green-600">
                {new Date(cr.approval.decidedAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {cr.attachments && cr.attachments.length > 0 && (
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-[#2D2D2D]">
                Attachments ({cr.attachments.length})
              </h3>
              <ul className="space-y-2">
                {cr.attachments.map((att) => (
                  <li key={att.id}>
                    <a
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-[#EF323F] hover:underline"
                    >
                      <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="truncate">{att.fileName}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cr.statusHistory && cr.statusHistory.length > 0 && (
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-[#2D2D2D]">Status History</h3>
              <ol className="relative border-l border-[#D3D3D3]">
                {cr.statusHistory.map((h) => (
                  <li key={h.id} className="mb-4 ml-4">
                    <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border border-white bg-[#EF323F]" />
                    <div className="text-xs text-[#5D5B5B]">
                      {new Date(h.changedAt).toLocaleDateString()} · {h.changedBy.name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-sm">
                      <CRStatusBadge status={h.fromStatus} />
                      <span className="text-[#5D5B5B]">→</span>
                      <CRStatusBadge status={h.toStatus} />
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* ── Approve Step 1: Confirm Modal ── */}
      {approveStep === 'confirm' && cr.impactAnalysis && (
        <Modal title="Confirm Approval" onClose={() => setApproveStep(null)}>
          <div className="space-y-4">
            <div className="rounded-lg bg-[#F7F7F7] p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-[#5D5B5B]">CR Number</span>
                <span className="font-mono font-semibold">{cr.crNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5D5B5B]">Estimated Hours</span>
                <span className="font-semibold">{cr.impactAnalysis.estimatedHours}h</span>
              </div>
              {cr.impactAnalysis.timelineImpact && (
                <div className="flex justify-between">
                  <span className="text-[#5D5B5B]">Timeline Impact</span>
                  <span>{cr.impactAnalysis.timelineImpact}</span>
                </div>
              )}
              {cr.impactAnalysis.recommendation && (
                <div className="flex justify-between">
                  <span className="text-[#5D5B5B]">DM Recommendation</span>
                  <span className="text-right max-w-[60%]">{cr.impactAnalysis.recommendation}</span>
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">
                Approval Notes (optional)
              </label>
              <textarea
                rows={3}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Any notes for the DM…"
                className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setApproveStep(null)}>
                Cancel
              </Button>
              <Button onClick={() => setApproveStep('sign')}>Continue to Signature</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Approve Step 2: Signature Modal ── */}
      {approveStep === 'sign' && (
        <Modal title="Sign to Approve" onClose={() => setApproveStep(null)}>
          <div className="space-y-4">
            <p className="text-sm text-[#5D5B5B]">
              Your signature confirms approval of <strong>{cr.crNumber}</strong>. This action cannot
              be undone.
            </p>
            <SignatureCanvas value={poSignature} onChange={setPoSignature} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setApproveStep('confirm')}>
                Back
              </Button>
              <Button
                onClick={() =>
                  approveCR.mutate({ poSignature, approvalNotes: approvalNotes || undefined })
                }
                loading={approveCR.isPending}
                disabled={!poSignature}
              >
                Confirm Approval
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Decline Modal ── */}
      {showDecline && (
        <Modal title="Decline Change Request" onClose={() => setShowDecline(false)}>
          <div className="space-y-4">
            <p className="text-sm text-[#5D5B5B]">
              Please provide a reason for declining <strong>{cr.crNumber}</strong>. The DM will be
              notified.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">
                Reason <span className="text-[#EF323F]">*</span>
              </label>
              <textarea
                rows={4}
                value={declineNotes}
                onChange={(e) => setDeclineNotes(e.target.value)}
                placeholder="Explain why this CR is being declined…"
                className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowDecline(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => declineCR.mutate(declineNotes)}
                loading={declineCR.isPending}
                disabled={!declineNotes.trim()}
              >
                Decline CR
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Cancel Modal ── */}
      {showCancel && (
        <Modal
          title="Cancel Change Request"
          onClose={() => {
            setShowCancel(false);
            setCancelReason('');
          }}
        >
          <div className="space-y-4">
            <p className="text-sm text-[#5D5B5B]">
              Please provide a reason for cancelling <strong>{cr.crNumber}</strong>. This cannot be
              undone.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">
                Reason <span className="text-[#EF323F]">*</span>
              </label>
              <textarea
                rows={4}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Explain why this CR is being cancelled…"
                className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowCancel(false)}>
                Back
              </Button>
              <Button
                onClick={() => cancelCR.mutate(cancelReason)}
                loading={cancelCR.isPending}
                disabled={!cancelReason.trim()}
              >
                Confirm Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Resubmit Modal ── */}
      {showResubmit && (
        <Modal
          title={`Resubmit CR (will become v${((cr as unknown as { version: number }).version ?? 1) + 1})`}
          onClose={() => setShowResubmit(false)}
        >
          <div className="space-y-4">
            <p className="text-sm text-[#5D5B5B]">
              Edit the fields below and resubmit. A version snapshot will be saved before changes.
            </p>
            <Input
              label="Title"
              value={resubTitle}
              onChange={(e) => setResubTitle(e.target.value)}
            />
            <RichTextEditor
              label="Description"
              value={resubDescription ?? ''}
              onChange={setResubDescription}
            />
            <RichTextEditor
              label="Business Justification"
              value={resubJustification ?? ''}
              onChange={setResubJustification}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowResubmit(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  resubmitCR.mutate({
                    title: resubTitle,
                    description: resubDescription,
                    businessJustification: resubJustification,
                  })
                }
                loading={resubmitCR.isPending}
                disabled={!resubTitle.trim()}
              >
                Resubmit to DM
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageWrapper>
  );
}
