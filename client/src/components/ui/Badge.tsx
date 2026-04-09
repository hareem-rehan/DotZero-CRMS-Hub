'use client';

interface BadgeProps {
  label: string;
  variant?: 'red' | 'green' | 'yellow' | 'blue' | 'purple' | 'gray' | 'orange';
  className?: string;
}

const VARIANT_STYLES: Record<NonNullable<BadgeProps['variant']>, string> = {
  red: 'bg-red-100 text-red-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  gray: 'bg-gray-100 text-gray-600',
  orange: 'bg-orange-100 text-orange-700',
};

export function Badge({ label, variant = 'gray', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANT_STYLES[variant]} ${className}`}
    >
      {label}
    </span>
  );
}

// ─── Project status badge ─────────────────────────────────────────────────────

const PROJECT_STATUS_MAP: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  ACTIVE: { label: 'Active', variant: 'green' },
  ON_HOLD: { label: 'On Hold', variant: 'yellow' },
  DELIVERED: { label: 'Delivered', variant: 'blue' },
  ARCHIVED: { label: 'Archived', variant: 'gray' },
};

export function ProjectStatusBadge({ status }: { status: string }) {
  const config = PROJECT_STATUS_MAP[status] ?? { label: status, variant: 'gray' as const };
  return <Badge label={config.label} variant={config.variant} />;
}

// ─── CR status badge ──────────────────────────────────────────────────────────

const CR_STATUS_MAP: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  DRAFT: { label: 'Draft', variant: 'gray' },
  SUBMITTED: { label: 'Submitted', variant: 'blue' },
  UNDER_REVIEW: { label: 'Under Review', variant: 'yellow' },
  ESTIMATED: { label: 'Estimated', variant: 'orange' },
  RESUBMITTED: { label: 'Resubmitted', variant: 'blue' },
  APPROVED: { label: 'Approved', variant: 'green' },
  DECLINED: { label: 'Declined', variant: 'red' },
  IN_PROGRESS: { label: 'In Progress', variant: 'purple' },
  COMPLETED: { label: 'Completed', variant: 'green' },
  CANCELLED: { label: 'Cancelled', variant: 'gray' },
};

export function CRStatusBadge({ status }: { status: string }) {
  const config = CR_STATUS_MAP[status] ?? { label: status, variant: 'gray' as const };
  return <Badge label={config.label} variant={config.variant} />;
}

// ─── CR priority badge ────────────────────────────────────────────────────────

const CR_PRIORITY_MAP: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  LOW: { label: 'Low', variant: 'gray' },
  MEDIUM: { label: 'Medium', variant: 'blue' },
  HIGH: { label: 'High', variant: 'orange' },
  CRITICAL: { label: 'Critical', variant: 'red' },
};

export function CRPriorityBadge({ priority }: { priority: string }) {
  const config = CR_PRIORITY_MAP[priority] ?? { label: priority, variant: 'gray' as const };
  return <Badge label={config.label} variant={config.variant} />;
}

// ─── Role badge ───────────────────────────────────────────────────────────────

const ROLE_MAP: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  SUPER_ADMIN: { label: 'Super Admin', variant: 'purple' },
  PRODUCT_OWNER: { label: 'Product Owner', variant: 'blue' },
  DELIVERY_MANAGER: { label: 'Delivery Manager', variant: 'green' },
  FINANCE: { label: 'Finance', variant: 'yellow' },
};

export function RoleBadge({ role }: { role: string }) {
  const config = ROLE_MAP[role] ?? { label: role, variant: 'gray' as const };
  return <Badge label={config.label} variant={config.variant} />;
}
