'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { Button } from '@/components/ui/Button';
import { CRStatusBadge, CRPriorityBadge } from '@/components/ui/Badge';
import { useFinanceCR } from '@/hooks/useDashboard';

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-[#5D5B5B]">{label}</p>
      <div className="mt-0.5 text-sm text-[#2D2D2D]">{value ?? '—'}</div>
    </div>
  );
}

export default function FinanceCRDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: cr, isLoading } = useFinanceCR(id);

  if (isLoading) return (
    <PageWrapper title="CR Detail">
      <div className="flex h-40 items-center justify-center text-sm text-[#5D5B5B]">Loading…</div>
    </PageWrapper>
  );
  if (!cr) return null;

  return (
    <PageWrapper title={cr.crNumber}>
      <div className="mb-5 flex items-center gap-2 text-sm text-[#5D5B5B]">
        <Link href="/finance/cr-listing" className="hover:text-[#EF323F]">CR Listing</Link>
        <span>/</span>
        <span className="font-medium text-[#2D2D2D]">{cr.crNumber}</span>
      </div>

      <div className="space-y-6 max-w-3xl">

        {/* Overview */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#2D2D2D]">{cr.title}</h2>
              <p className="mt-1 text-sm text-[#5D5B5B]">{cr.project.name} · {cr.project.code}</p>
            </div>
            <CRStatusBadge status={cr.status} />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Client" value={cr.project.clientName} />
            <Field label="Priority" value={<CRPriorityBadge priority={cr.priority} />} />
            <Field label="Change Type" value={cr.changeType} />
            <Field label="Submitted By" value={cr.submittedBy.name} />
            <Field label="Date Submitted" value={cr.dateOfRequest ? new Date(cr.dateOfRequest).toLocaleDateString() : null} />
            <Field label="Version" value={`v${cr.version}`} />
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="rounded-xl border border-green-100 bg-green-50 p-6">
          <h3 className="mb-4 text-sm font-semibold text-green-900">Cost Breakdown</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-white border border-green-100 p-4">
              <p className="text-xs text-green-700">Estimated Hours</p>
              <p className="text-2xl font-bold text-green-900">{cr.estimatedHours}h</p>
            </div>
            <div className="rounded-lg bg-white border border-green-100 p-4">
              <p className="text-xs text-green-700">Hourly Rate</p>
              <p className="text-2xl font-bold text-green-900">{fmt(cr.hourlyRate, cr.project.currency)}</p>
            </div>
            <div className="rounded-lg bg-white border border-green-200 p-4">
              <p className="text-xs text-green-700">Total Cost</p>
              <p className="text-2xl font-bold text-[#EF323F]">{fmt(cr.totalCost, cr.project.currency)}</p>
            </div>
          </div>
        </div>

        {/* DM Estimation */}
        {cr.impactAnalysis && (
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-[#2D2D2D]">DM Estimation</h3>
            <div className="grid grid-cols-2 gap-4">
              {(cr.impactAnalysis as { timelineImpact?: string; affectedDeliverables?: string; revisedMilestones?: string; resourcesRequired?: string; recommendation?: string }).timelineImpact && (
                <Field label="Timeline Impact" value={(cr.impactAnalysis as { timelineImpact?: string }).timelineImpact} />
              )}
              {(cr.impactAnalysis as { recommendation?: string }).recommendation && (
                <Field label="Recommendation" value={(cr.impactAnalysis as { recommendation?: string }).recommendation} />
              )}
            </div>
          </div>
        )}

        {/* Approval */}
        {cr.approval && (
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-[#2D2D2D]">Approval</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Approved Date" value={new Date(cr.approval.approvedAt).toLocaleDateString()} />
              {cr.approval.approvalNotes && <Field label="Approval Notes" value={cr.approval.approvalNotes} />}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => router.back()}>Back to Listing</Button>
        </div>
      </div>
    </PageWrapper>
  );
}
