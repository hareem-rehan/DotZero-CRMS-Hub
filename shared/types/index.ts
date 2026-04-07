export type Role = 'SUPER_ADMIN' | 'PRODUCT_OWNER' | 'DELIVERY_MANAGER' | 'FINANCE';

export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'DELIVERED' | 'ARCHIVED';

export type CRStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ESTIMATED'
  | 'RESUBMITTED'
  | 'APPROVED'
  | 'DECLINED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ChangeType = 'SCOPE' | 'TIMELINE' | 'BOTH';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'AED' | 'PKR' | 'SAR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  timezone?: string | null;
  isActive: boolean;
  isLocked: boolean;
  lastLogin?: string | null;
  notifyOnCrSubmitted: boolean;
  notifyOnCrReturned: boolean;
  notifyOnCrApproved: boolean;
  notifyOnCrDeclined: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  code: string;
  hourlyRate: number;
  currency: Currency;
  status: ProjectStatus;
  startDate?: string | null;
  showRateToDm: boolean;
  sowReference?: string | null;
  crSequence: number;
  assignedDmId?: string | null;
  assignedDm?: Pick<User, 'id' | 'name' | 'email'> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAttachment {
  id: string;
  projectId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface ChangeRequest {
  id: string;
  crNumber: string;
  projectId: string;
  project?: Pick<Project, 'id' | 'name' | 'clientName' | 'code'>;
  submittedById: string;
  submittedBy?: Pick<User, 'id' | 'name' | 'email'>;
  title: string;
  description: string;
  businessJustification: string;
  priority: Priority;
  changeType: ChangeType;
  requestingParty?: string | null;
  status: CRStatus;
  version: number;
  sowRef?: string | null;
  dateOfRequest?: string | null;
  attachments?: CRAttachment[];
  impactAnalysis?: ImpactAnalysis | null;
  approval?: CRApproval | null;
  createdAt: string;
  updatedAt: string;
}

export interface CRAttachment {
  id: string;
  changeRequestId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface ImpactAnalysis {
  id: string;
  changeRequestId: string;
  dmId: string;
  dm?: Pick<User, 'id' | 'name' | 'email'>;
  estimatedHours: number;
  timelineImpact: string;
  affectedDeliverables: string;
  revisedMilestones?: string | null;
  resourcesRequired?: string | null;
  recommendation: string;
  dmSignature?: string | null;
  isDraft: boolean;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CRApproval {
  id: string;
  changeRequestId: string;
  approvedById: string;
  approvedBy?: Pick<User, 'id' | 'name' | 'email'>;
  approvalNotes?: string | null;
  poSignature: string;
  approvedAt: string;
}

export interface CRVersion {
  id: string;
  changeRequestId: string;
  versionNumber: number;
  snapshotJson: unknown;
  createdById: string;
  createdBy?: Pick<User, 'id' | 'name' | 'email'>;
  createdAt: string;
}

export interface StatusHistory {
  id: string;
  changeRequestId: string;
  fromStatus: CRStatus;
  toStatus: CRStatus;
  changedById: string;
  changedBy?: Pick<User, 'id' | 'name' | 'email'>;
  reason?: string | null;
  changedAt: string;
}

export interface InternalNote {
  id: string;
  changeRequestId: string;
  authorId: string;
  author?: Pick<User, 'id' | 'name' | 'email'>;
  content: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  event: string;
  actorId?: string | null;
  actor?: Pick<User, 'id' | 'name' | 'email'> | null;
  entityType: string;
  entityId: string;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}
