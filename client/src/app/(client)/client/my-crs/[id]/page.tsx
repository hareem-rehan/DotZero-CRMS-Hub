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
import {
  useCR,
  useSubmitCR,
  useApproveCR,
  useDeclineCR,
  useDeferCR,
  useResubmitCR,
  useCancelCR,
  useCRVersions,
  useClientRejectCR,
  useClientReviewEdit,
  usePOResubmitWithEdits,
} from '@/hooks/useCRs';

// ─── Role label helper ────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'SA',
  PRODUCT_OWNER: 'PO',
  DELIVERY_MANAGER: 'DM',
  FINANCE: 'Finance',
};

function RoleTag({ role }: { role: string }) {
  const label = ROLE_LABEL[role] ?? role;
  const colours: Record<string, string> = {
    PO: 'bg-blue-100 text-blue-700',
    DM: 'bg-amber-100 text-amber-700',
    SA: 'bg-purple-100 text-purple-700',
    Finance: 'bg-green-100 text-green-700',
  };
  return (
    <span
      className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${colours[label] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {label}
    </span>
  );
}

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
      <div className="flex w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl max-h-[90vh]">
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5E5E5] px-6 py-4">
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
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Result modal ─────────────────────────────────────────────────────────────

function ResultModal({
  type,
  message,
  onClose,
}: {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}) {
  const isSuccess = type === 'success';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
        <div className={`flex items-center justify-between border-b border-[#E5E5E5] px-6 py-4`}>
          <h3 className={`text-base font-semibold ${isSuccess ? 'text-green-700' : 'text-red-600'}`}>
            {isSuccess ? 'Success' : 'Error'}
          </h3>
          <button onClick={onClose} className="text-[#5D5B5B] hover:text-[#2D2D2D]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-[#2D2D2D]">{message}</p>
        </div>
        <div className="flex justify-end border-t border-[#E5E5E5] px-6 py-4">
          <Button onClick={onClose}>{isSuccess ? 'OK' : 'Close'}</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Version snapshot types & modal ──────────────────────────────────────────

interface VersionSnapshot {
  version: number;
  title: string;
  description: string | null;
  businessJustification: string | null;
  priority: string | null;
  changeType: string | null;
  requestingParty: string | null;
  sowRef: string | null;
  status: string;
  attachments?: Array<{ id: string; fileName: string; fileUrl: string }>;
  snapshotAt: string;
  impactAnalysis?: {
    estimatedHours: string | number | null;
    timelineImpact: string | null;
    affectedDeliverables: string | null;
    revisedMilestones: string | null;
    resourcesRequired: string | null;
    recommendation: string | null;
    dm?: { name: string } | null;
  } | null;
}

interface CRVersionRow {
  id: string;
  versionNumber: number;
  snapshotJson: unknown;
  createdAt: string;
  createdBy: { id: string; name: string };
}

function VersionModal({ version, onClose }: { version: CRVersionRow; onClose: () => void }) {
  const snap = version.snapshotJson as VersionSnapshot;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl max-h-[90vh]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-[#E5E5E5] bg-white px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[#2D2D2D]">Version {version.versionNumber} Snapshot</h2>
            <p className="mt-0.5 text-xs text-[#5D5B5B]">
              Saved on {new Date(version.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#5D5B5B] hover:bg-[#F7F7F7]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto space-y-5 p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <SnapField label="Status"><CRStatusBadge status={snap.status} /></SnapField>
            {snap.priority && <SnapField label="Priority"><CRPriorityBadge priority={snap.priority} /></SnapField>}
            {snap.changeType && <SnapField label="Change Type" value={snap.changeType} />}
            {snap.requestingParty && <SnapField label="Requesting Party" value={snap.requestingParty} />}
            <SnapField label="Snapshot Date" value={new Date(snap.snapshotAt).toLocaleString()} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#5D5B5B]">Title</p>
            <p className="mt-1 text-sm font-medium text-[#2D2D2D]">{snap.title}</p>
          </div>
          {snap.description && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#5D5B5B]">Description</p>
              <div
                className="mt-1 rounded-lg border border-[#E5E5E5] bg-[#F7F7F7] p-3 prose prose-sm max-w-none text-[#2D2D2D]"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(snap.description) }}
              />
            </div>
          )}
          {snap.businessJustification && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#5D5B5B]">Business Justification</p>
              <div
                className="mt-1 rounded-lg border border-[#E5E5E5] bg-[#F7F7F7] p-3 prose prose-sm max-w-none text-[#2D2D2D]"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(snap.businessJustification) }}
              />
            </div>
          )}
          {snap.attachments && snap.attachments.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#5D5B5B] mb-2">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {snap.attachments.map((a) => (
                  <a key={a.id} href={a.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="rounded-md border border-[#D3D3D3] bg-white px-3 py-1.5 text-xs text-[#2D2D2D] hover:bg-gray-50">
                    {a.fileName}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* DM Estimation at time of this version */}
          {snap.impactAnalysis && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-800">
                DM Estimation (at this version)
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {snap.impactAnalysis.dm?.name && (
                  <SnapField label="Delivery Manager" value={snap.impactAnalysis.dm.name} />
                )}
                {snap.impactAnalysis.estimatedHours != null && (
                  <SnapField label="Estimated Hours">
                    <span className="text-xl font-bold text-blue-900">
                      {snap.impactAnalysis.estimatedHours}h
                    </span>
                  </SnapField>
                )}
                {snap.impactAnalysis.timelineImpact && (
                  <SnapField label="Timeline Impact" value={snap.impactAnalysis.timelineImpact} />
                )}
                {snap.impactAnalysis.affectedDeliverables && (
                  <SnapField label="Affected Deliverables" value={snap.impactAnalysis.affectedDeliverables} />
                )}
                {snap.impactAnalysis.revisedMilestones && (
                  <SnapField label="Revised Milestones" value={snap.impactAnalysis.revisedMilestones} />
                )}
                {snap.impactAnalysis.resourcesRequired && (
                  <SnapField label="Resources Required" value={snap.impactAnalysis.resourcesRequired} />
                )}
                {snap.impactAnalysis.recommendation && (
                  <div className="col-span-2">
                    <SnapField label="DM Recommendation" value={snap.impactAnalysis.recommendation} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="sticky bottom-0 shrink-0 border-t border-[#E5E5E5] bg-white px-6 py-3 flex justify-end">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

function SnapField({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[#5D5B5B]">{label}</p>
      <div className="mt-1 text-sm text-[#2D2D2D]">{children ?? value}</div>
    </div>
  );
}

// ─── ResubmitButton ───────────────────────────────────────────────────────────

function ResubmitButton({
  canResubmit,
  disabledReason,
  onResubmit,
  label = 'Resubmit',
  className = '',
}: {
  canResubmit: boolean;
  disabledReason: string | null;
  onResubmit: () => void;
  label?: string;
  className?: string;
}) {
  if (canResubmit) {
    return (
      <Button variant="secondary" onClick={onResubmit} className={className}>
        {label}
      </Button>
    );
  }
  return (
    <div className={`relative group inline-flex ${className}`}>
      <Button variant="secondary" disabled className="cursor-not-allowed opacity-50">
        {label}
      </Button>
      {disabledReason && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block z-10 w-56 rounded-lg bg-[#2D2D2D] px-3 py-2 text-xs text-white text-center shadow-lg">
          {disabledReason}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-[#2D2D2D]" />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CRDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: cr, isLoading, isError } = useCR(id);
  const { data: versions } = useCRVersions(id);

  // Result modal (replaces toast notifications)
  const [resultModal, setResultModal] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showResult = (type: 'success' | 'error', message: string) => setResultModal({ type, message });

  // Submit
  const submitCR = useSubmitCR();
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  // Approve flow: step 1 = confirm modal, step 2 = signature modal
  const [approveStep, setApproveStep] = useState<null | 'confirm' | 'sign'>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [poSignature, setPoSignature] = useState('');
  const approveCR = useApproveCR(id, {
    onSuccess: () => {
      showResult('success', 'CR approved');
      setApproveStep(null);
    },
    onError: (msg) => showResult('error', msg),
  });

  // Decline flow
  const [showDecline, setShowDecline] = useState(false);
  const [declineNotes, setDeclineNotes] = useState('');
  const declineCR = useDeclineCR(id, {
    onSuccess: () => {
      showResult('success', 'CR declined');
      setShowDecline(false);
    },
    onError: (msg) => showResult('error', msg),
  });

  // Defer flow
  const [showDefer, setShowDefer] = useState(false);
  const [deferReason, setDeferReason] = useState('');
  const deferCR = useDeferCR(id, {
    onSuccess: () => {
      showResult('success', 'CR deferred');
      setShowDefer(false);
      setDeferReason('');
    },
    onError: (msg) => showResult('error', msg),
  });

  // Resubmit flow
  const [showResubmit, setShowResubmit] = useState(false);
  const [resubTitle, setResubTitle] = useState('');
  const [resubDescription, setResubDescription] = useState('');
  const [resubJustification, setResubJustification] = useState('');
  const [resubPriority, setResubPriority] = useState('');
  const [resubChangeType, setResubChangeType] = useState('');
  const resubmitCR = useResubmitCR(id, {
    onSuccess: () => {
      showResult('success', 'CR resubmitted as new version');
      setShowResubmit(false);
    },
    onError: (msg) => showResult('error', msg),
  });

  // Cancel flow
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const cancelCR = useCancelCR(id, {
    onSuccess: () => {
      showResult('success', 'CR cancelled successfully');
      setShowCancel(false);
      setCancelReason('');
      setTimeout(() => router.push('/client/my-crs'), 1500);
    },
    onError: (msg) => showResult('error', msg),
  });

  // Version history panel
  const [showVersions, setShowVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<CRVersionRow | null>(null);

  // DM-initiated: inline edit of description + business justification
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editBizJustification, setEditBizJustification] = useState('');
  const clientReviewEdit = useClientReviewEdit(id, {
    onSuccess: () => { showResult('success', 'Changes saved'); setIsEditing(false); },
    onError: (msg) => showResult('error', msg),
  });

  // DM-initiated: Reject back to DM flow
  const [showClientReject, setShowClientReject] = useState(false);
  const [clientRejectReason, setClientRejectReason] = useState('');
  const clientRejectCR = useClientRejectCR(id, {
    onSuccess: () => {
      setShowClientReject(false);
      setClientRejectReason('');
      showResult('success', 'CR returned to DM successfully');
      setTimeout(() => router.push('/client/my-crs'), 1500);
    },
    onError: (msg) => showResult('error', msg),
  });

  // DM-initiated: PO re-submit with edits (one-shot)
  const [showPOResubmit, setShowPOResubmit] = useState(false);
  const [poResubDescription, setPoResubDescription] = useState('');
  const [poResubClientNotes, setPoResubClientNotes] = useState('');
  const [poResubReason, setPoResubReason] = useState('');
  const poResubmitWithEdits = usePOResubmitWithEdits(id, {
    onSuccess: () => { showResult('success', 'Edits submitted to DM'); setShowPOResubmit(false); },
    onError: (msg) => showResult('error', msg),
  });

  // ── Open resubmit form pre-filled ──
  const openResubmit = () => {
    if (cr) {
      setResubTitle(cr.title);
      setResubDescription(cr.description);
      setResubJustification(cr.businessJustification);
      setResubPriority(cr.priority ?? 'MEDIUM');
      setResubChangeType(cr.changeType ?? 'SCOPE');
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
  const isApproved = cr.status === 'APPROVED';
  const isDeclined = cr.status === 'DECLINED';
  const isDeferred = cr.status === 'DEFERRED';
  const isDraft = cr.status === 'DRAFT';
  const isPendingClientReview = cr.status === 'PENDING_CLIENT_REVIEW';
  const isCancellable = !['APPROVED', 'DECLINED', 'CANCELLED', 'COMPLETED'].includes(cr.status);

  const isDmInitiated = cr.initiatedByDm;
  const canPOResubmitWithEdits =
    isDmInitiated && isEstimated && !cr.clientRevisionUsed;

  // ── Resubmission limit checks (mirrors backend rules) ──
  const MAX_RESUBMISSIONS = 2;
  const crVersion = (cr as unknown as { version: number }).version ?? 1;
  const resubmissionCount = crVersion - 1;
  const resubLimitReached = resubmissionCount >= MAX_RESUBMISSIONS;

  // 72-hour window from last ESTIMATED / DECLINED / DEFERRED status change
  const triggerEntry = [...(cr.statusHistory ?? [])]
    .reverse()
    .find((h) => ['ESTIMATED', 'DECLINED', 'DEFERRED'].includes(h.toStatus));
  const hoursSinceTrigger = triggerEntry
    ? (Date.now() - new Date(triggerEntry.changedAt).getTime()) / (1000 * 60 * 60)
    : 0;
  const resubWindowExpired = !!triggerEntry && hoursSinceTrigger > 72;

  const canResubmit = !resubLimitReached && !resubWindowExpired;
  const resubDisabledReason = resubLimitReached
    ? `Maximum ${MAX_RESUBMISSIONS} resubmissions reached`
    : resubWindowExpired
    ? '72-hour resubmission window has expired'
    : null;
  const resubHoursRemaining = !resubWindowExpired && triggerEntry
    ? Math.ceil(72 - hoursSinceTrigger)
    : null;

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
          {isDraft && !isDmInitiated && (
            <>
              <Button variant="secondary" onClick={() => router.push(`/client/my-crs/${id}/edit`)}>
                Edit Draft
              </Button>
              <Button onClick={() => setConfirmSubmit(true)} loading={submitCR.isPending}>
                Submit for Estimation
              </Button>
            </>
          )}
          {isPendingClientReview && isDmInitiated && (
            <>
              <Button variant="secondary" onClick={() => setShowClientReject(true)}>
                Return to DM
              </Button>
              <Button variant="secondary" onClick={() => setShowDecline(true)}>
                Decline
              </Button>
              <Button onClick={() => setApproveStep('confirm')}>Approve</Button>
            </>
          )}
          {isEstimated && (
            <>
              {!isDmInitiated && (
                <>
                  <Button variant="secondary" onClick={() => setShowDefer(true)}>
                    Defer
                  </Button>
                  <ResubmitButton canResubmit={canResubmit} disabledReason={resubDisabledReason} onResubmit={openResubmit} />
                </>
              )}
              {canPOResubmitWithEdits && (
                <Button variant="secondary" onClick={() => { setPoResubDescription(cr.description ?? ''); setPoResubClientNotes(cr.clientNotes ?? ''); setPoResubReason(''); setShowPOResubmit(true); }}>
                  Submit Edits
                </Button>
              )}
              <Button variant="secondary" onClick={() => setShowDecline(true)}>
                Decline
              </Button>
              <Button onClick={() => setApproveStep('confirm')}>Approve</Button>
            </>
          )}
          {isApproved && !isDmInitiated && (
            <ResubmitButton canResubmit={canResubmit} disabledReason={resubDisabledReason} onResubmit={openResubmit} label="Resubmit CR" />
          )}
          {isDeclined && !isDmInitiated && (
            <ResubmitButton canResubmit={canResubmit} disabledReason={resubDisabledReason} onResubmit={openResubmit} label="Resubmit CR" />
          )}
          {isDeferred && !isDmInitiated && (
            <ResubmitButton canResubmit={canResubmit} disabledReason={resubDisabledReason} onResubmit={openResubmit} label="Resubmit CR" />
          )}
          {isCancellable && !isDraft && !isEstimated && !(isPendingClientReview && isDmInitiated) && (
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
                  showResult(
                    'error',
                    (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                      'Failed to submit CR',
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
                <span className="text-xs text-[#5D5B5B]">
                  {new Date(v.createdAt).toLocaleString()}
                </span>
                <button
                  onClick={() => setSelectedVersion(v as CRVersionRow)}
                  className="ml-auto rounded-lg border border-[#D3D3D3] bg-white px-3 py-1 text-xs font-medium text-[#2D2D2D] hover:bg-[#F7F7F7] transition-colors"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DM-initiated banner */}
      {isDmInitiated && (
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <strong>Created by your Delivery Manager on your behalf.</strong>
          {isPendingClientReview && ' Please review and approve, decline, or return it to the DM.'}
          {isEstimated && canPOResubmitWithEdits && (
            <span> You have <strong>1 round of edits</strong> remaining — use it to send changes back to your DM for review.</span>
          )}
          {isEstimated && !canPOResubmitWithEdits && cr.clientRevisionUsed && (
            <span> Your edit round has been used. Please approve or decline this CR.</span>
          )}
        </div>
      )}
      {/* Resubmit countdown banner (standard CRs only) */}
      {!isDmInitiated && resubHoursRemaining !== null && (isDeclined || isDeferred || isEstimated) && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Resubmission window closes in <strong className="mx-1">{resubHoursRemaining}h</strong>
          {resubmissionCount > 0 && <span className="text-amber-600">· {MAX_RESUBMISSIONS - resubmissionCount} of {MAX_RESUBMISSIONS} resubmissions remaining</span>}
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
              <CRStatusBadge status={cr.status} overrides={{ CLIENT_REVISION: { label: 'Resubmitted', variant: 'orange' } }} />
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
          {(cr.description || (isPendingClientReview && isDmInitiated)) && (
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#2D2D2D]">Description</h3>
                {isPendingClientReview && isDmInitiated && !isEditing && (
                  <button
                    onClick={() => { setEditDescription(cr.description ?? ''); setEditBizJustification(cr.businessJustification ?? ''); setIsEditing(true); }}
                    className="text-xs font-medium text-[#EF323F] hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
              {isEditing && isPendingClientReview && isDmInitiated ? (
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
                />
              ) : cr.description ? (
                <div
                  className="prose prose-sm max-w-none text-[#2D2D2D]"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(cr.description) }}
                />
              ) : (
                <p className="text-sm italic text-[#D3D3D3]">No description</p>
              )}
            </div>
          )}

          {/* Business Justification */}
          {(cr.businessJustification || (isPendingClientReview && isDmInitiated)) && (
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#2D2D2D]">Business Justification</h3>
                {isPendingClientReview && isDmInitiated && !isEditing && (
                  <button
                    onClick={() => { setEditDescription(cr.description ?? ''); setEditBizJustification(cr.businessJustification ?? ''); setIsEditing(true); }}
                    className="text-xs font-medium text-[#EF323F] hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
              {isEditing && isPendingClientReview && isDmInitiated ? (
                <>
                  <textarea
                    value={editBizJustification}
                    onChange={(e) => setEditBizJustification(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
                  />
                  <div className="mt-3 flex gap-2">
                    <Button
                      onClick={() => clientReviewEdit.mutate({ description: editDescription, businessJustification: editBizJustification })}
                      loading={clientReviewEdit.isPending}
                    >
                      Save Changes
                    </Button>
                    <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                  </div>
                </>
              ) : cr.businessJustification ? (
                <div
                  className="prose prose-sm max-w-none text-[#2D2D2D]"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(cr.businessJustification) }}
                />
              ) : (
                <p className="text-sm italic text-[#D3D3D3]">No business justification</p>
              )}
            </div>
          )}

          {/* DM Notes (read-only) — shown for DM-initiated CRs */}
          {isDmInitiated && cr.dmNotes && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-5">
              <h3 className="mb-2 text-sm font-semibold text-amber-800">DM Notes</h3>
              <p className="whitespace-pre-wrap text-sm text-amber-900">{cr.dmNotes}</p>
            </div>
          )}

          {/* Client Notes — shown for DM-initiated CRs (read-only when not in PENDING_CLIENT_REVIEW) */}
          {isDmInitiated && cr.clientNotes && (
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-5">
              <h3 className="mb-2 text-sm font-semibold text-[#2D2D2D]">Your Notes (submitted)</h3>
              <p className="whitespace-pre-wrap text-sm text-[#5D5B5B]">{cr.clientNotes}</p>
            </div>
          )}

          {/* Impact Analysis — shown for DM-initiated CRs in PENDING_CLIENT_REVIEW (always visible, isDraft=true) */}
          {isDmInitiated && isPendingClientReview && cr.impactAnalysis && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-6">
              <h3 className="mb-4 text-sm font-semibold text-blue-900">DM Estimation</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-blue-700">Estimated Hours</dt>
                  <dd className="mt-0.5 text-xl font-bold text-blue-900">{cr.impactAnalysis.estimatedHours}h</dd>
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
                    <dd className="mt-0.5 text-blue-900">{cr.impactAnalysis.affectedDeliverables}</dd>
                  </div>
                )}
                {cr.impactAnalysis.recommendation && (
                  <div className="col-span-2">
                    <dt className="text-blue-700">DM Recommendation</dt>
                    <dd className="mt-0.5 font-medium text-blue-900">{cr.impactAnalysis.recommendation}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" onClick={() => setShowClientReject(true)}>Return to DM</Button>
                <Button variant="secondary" onClick={() => setShowDecline(true)}>Decline</Button>
                <Button onClick={() => setApproveStep('confirm')}>Approve</Button>
              </div>
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
                  {!isDmInitiated && (
                    <ResubmitButton canResubmit={canResubmit} disabledReason={resubDisabledReason} onResubmit={openResubmit} />
                  )}
                  <Button onClick={() => setApproveStep('confirm')}>Approve</Button>
                </div>
              )}
            </div>
          )}

          {/* Approval result */}
          {cr.approval && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-green-800">Approved</h3>
                  {cr.approval.approvalNotes && (
                    <p className="text-sm text-green-700">{cr.approval.approvalNotes}</p>
                  )}
                  <p className="mt-1 text-xs text-green-600">
                    {new Date(cr.approval.approvedAt).toLocaleDateString()}
                  </p>
                </div>
                {isApproved && !isDmInitiated && (
                  <ResubmitButton canResubmit={canResubmit} disabledReason={resubDisabledReason} onResubmit={openResubmit} label="Resubmit CR" className="shrink-0" />
                )}
              </div>
            </div>
          )}

          {/* Deferred result */}
          {isDeferred &&
            (() => {
              const deferEntry = [...(cr.statusHistory ?? [])]
                .reverse()
                .find((h) => h.toStatus === 'DEFERRED');
              return (
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-purple-800">Deferred</h3>
                      {deferEntry?.reason && (
                        <p className="text-sm text-purple-700">{deferEntry.reason}</p>
                      )}
                      {deferEntry && (
                        <p className="mt-1 text-xs text-purple-600 flex items-center">
                          {new Date(deferEntry.changedAt).toLocaleDateString()} ·{' '}
                          {deferEntry.changedBy.name}
                          <RoleTag role={deferEntry.changedBy.role} />
                        </p>
                      )}
                    </div>
                    {!isDmInitiated && (
                      <ResubmitButton canResubmit={canResubmit} disabledReason={resubDisabledReason} onResubmit={openResubmit} label="Resubmit CR" className="shrink-0" />
                    )}
                  </div>
                </div>
              );
            })()}

          {/* Declined result */}
          {isDeclined &&
            (() => {
              const declineEntry = [...(cr.statusHistory ?? [])]
                .reverse()
                .find((h) => h.toStatus === 'DECLINED');
              return (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-red-800">Declined</h3>
                      {declineEntry?.reason && (
                        <p className="text-sm text-red-700">{declineEntry.reason}</p>
                      )}
                      {declineEntry && (
                        <p className="mt-1 text-xs text-red-600 flex items-center">
                          {new Date(declineEntry.changedAt).toLocaleDateString()} ·{' '}
                          {declineEntry.changedBy.name}
                          <RoleTag role={declineEntry.changedBy.role} />
                        </p>
                      )}
                    </div>
                    {!isDmInitiated && (
                      <ResubmitButton canResubmit={canResubmit} disabledReason={resubDisabledReason} onResubmit={openResubmit} label="Resubmit CR" className="shrink-0" />
                    )}
                  </div>
                </div>
              );
            })()}
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
                    <div className="text-xs text-[#5D5B5B] flex items-center">
                      {new Date(h.changedAt).toLocaleDateString()} · {h.changedBy.name}
                      <RoleTag role={h.changedBy.role} />
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

      {/* ── Defer Modal ── */}
      {showDefer && (
        <Modal
          title="Defer Change Request"
          onClose={() => {
            setShowDefer(false);
            setDeferReason('');
          }}
        >
          <div className="space-y-4">
            <p className="text-sm text-[#5D5B5B]">
              Please provide a reason for deferring <strong>{cr.crNumber}</strong>. The CR will be
              placed on hold for future review.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">
                Reason <span className="text-[#EF323F]">*</span>
              </label>
              <textarea
                rows={4}
                value={deferReason}
                onChange={(e) => setDeferReason(e.target.value)}
                placeholder="Explain why this CR is being deferred…"
                className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDefer(false);
                  setDeferReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => deferCR.mutate(deferReason)}
                loading={deferCR.isPending}
                disabled={!deferReason.trim()}
              >
                Defer CR
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
            {(isApproved || isDeclined || isDeferred) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                This CR is currently{' '}
                <strong>{isApproved ? 'Approved' : isDeclined ? 'Declined' : 'Deferred'}</strong>.
                Resubmitting will create a new version and send it back to the Delivery Manager for
                re-estimation with your updated changes.
              </div>
            )}
            <p className="text-sm text-[#5D5B5B]">
              Edit the fields below and resubmit. A version snapshot will be saved before changes.
            </p>
            <Input
              label="Title"
              value={resubTitle}
              onChange={(e) => setResubTitle(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Priority</label>
                <select
                  value={resubPriority}
                  onChange={(e) => setResubPriority(e.target.value)}
                  className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Change Type</label>
                <select
                  value={resubChangeType}
                  onChange={(e) => setResubChangeType(e.target.value)}
                  className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
                >
                  <option value="SCOPE">Scope</option>
                  <option value="TIMELINE">Timeline</option>
                  <option value="BUDGET">Budget</option>
                  <option value="RESOURCE">Resource</option>
                  <option value="TECHNICAL">Technical</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
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
                    priority: resubPriority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
                    changeType: resubChangeType as 'SCOPE' | 'TIMELINE' | 'BUDGET' | 'RESOURCE' | 'TECHNICAL' | 'OTHER',
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

      {/* Version snapshot modal */}
      {selectedVersion && (
        <VersionModal version={selectedVersion} onClose={() => setSelectedVersion(null)} />
      )}

      {/* ── DM-initiated: Reject to DM modal ── */}
      {showClientReject && (
        <Modal title="Return CR to DM" onClose={() => setShowClientReject(false)}>
          <div className="space-y-4">
            <p className="text-sm text-[#5D5B5B]">
              This will send <strong>{cr.crNumber}</strong> back to the Delivery Manager. They will be notified and can revise and re-send it.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Reason <span className="text-[#EF323F]">*</span></label>
              <textarea
                rows={4}
                value={clientRejectReason}
                onChange={(e) => setClientRejectReason(e.target.value)}
                placeholder="Explain why you are returning this CR…"
                className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowClientReject(false)}>Cancel</Button>
              <Button
                onClick={() => clientRejectCR.mutate(clientRejectReason)}
                loading={clientRejectCR.isPending}
                disabled={!clientRejectReason.trim()}
              >
                Return to DM
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── DM-initiated: PO submit edits modal ── */}
      {showPOResubmit && (
        <Modal title="Submit Your Edits to DM" onClose={() => setShowPOResubmit(false)}>
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              You can make one round of edits. After the DM reviews them, you will only be able to approve or decline.
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Updated Description</label>
              <textarea
                rows={5}
                value={poResubDescription}
                onChange={(e) => setPoResubDescription(e.target.value)}
                placeholder="Update the description…"
                className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Your Notes to DM</label>
              <textarea
                rows={3}
                value={poResubClientNotes}
                onChange={(e) => setPoResubClientNotes(e.target.value)}
                placeholder="Explain the changes you made…"
                className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Reason for Edits <span className="text-[#EF323F]">*</span></label>
              <textarea
                rows={2}
                value={poResubReason}
                onChange={(e) => setPoResubReason(e.target.value)}
                placeholder="Briefly state why you are submitting edits…"
                className="w-full rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowPOResubmit(false)}>Cancel</Button>
              <Button
                onClick={() => poResubmitWithEdits.mutate({ description: poResubDescription || undefined, clientNotes: poResubClientNotes || undefined, reason: poResubReason })}
                loading={poResubmitWithEdits.isPending}
                disabled={!poResubReason.trim()}
              >
                Submit Edits
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {resultModal && (
        <ResultModal
          type={resultModal.type}
          message={resultModal.message}
          onClose={() => setResultModal(null)}
        />
      )}
    </PageWrapper>
  );
}
