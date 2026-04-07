import type { CRStatus } from '../types';

export const CR_STATUSES: CRStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'ESTIMATED',
  'RESUBMITTED',
  'APPROVED',
  'DECLINED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

export const CR_STATUS_DISPLAY: Record<CRStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  ESTIMATED: 'Estimated',
  RESUBMITTED: 'Resubmitted',
  APPROVED: 'Approved',
  DECLINED: 'Declined',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const CR_STATUS_BADGE_COLORS: Record<CRStatus, string> = {
  DRAFT: 'bg-neutral-silver text-neutral-ash',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  ESTIMATED: 'bg-orange-100 text-orange-700',
  RESUBMITTED: 'bg-purple-100 text-purple-700',
  APPROVED: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-200 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export const CR_STATUS_TRANSITIONS: Record<CRStatus, CRStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['UNDER_REVIEW', 'CANCELLED'],
  UNDER_REVIEW: ['ESTIMATED', 'CANCELLED'],
  ESTIMATED: ['APPROVED', 'DECLINED', 'RESUBMITTED'],
  RESUBMITTED: ['UNDER_REVIEW'],
  APPROVED: ['IN_PROGRESS'],
  DECLINED: [],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};
