-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'PRODUCT_OWNER', 'DELIVERY_MANAGER', 'FINANCE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'DELIVERED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CRStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ESTIMATED', 'RESUBMITTED', 'APPROVED', 'DECLINED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('SCOPE', 'TIMELINE', 'BOTH');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EUR', 'GBP', 'AED', 'PKR', 'SAR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "phone" TEXT,
    "timezone" TEXT DEFAULT 'UTC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastLogin" TIMESTAMP(3),
    "passwordSetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notifyOnCrSubmitted" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnCrReturned" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnCrApproved" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnCrDeclined" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3),
    "showRateToDm" BOOLEAN NOT NULL DEFAULT false,
    "sowReference" TEXT,
    "crSequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assignedDmId" TEXT,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_users" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_attachments" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PRODUCT_OWNER',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "sentById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_requests" (
    "id" TEXT NOT NULL,
    "crNumber" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "businessJustification" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "changeType" "ChangeType" NOT NULL DEFAULT 'SCOPE',
    "requestingParty" TEXT,
    "status" "CRStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "sowRef" TEXT,
    "dateOfRequest" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cr_attachments" (
    "id" TEXT NOT NULL,
    "changeRequestId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cr_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impact_analyses" (
    "id" TEXT NOT NULL,
    "changeRequestId" TEXT NOT NULL,
    "dmId" TEXT NOT NULL,
    "estimatedHours" DECIMAL(10,2) NOT NULL,
    "timelineImpact" TEXT NOT NULL,
    "affectedDeliverables" TEXT NOT NULL,
    "revisedMilestones" TEXT,
    "resourcesRequired" TEXT,
    "recommendation" TEXT NOT NULL,
    "dmSignature" TEXT,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "impact_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cr_approvals" (
    "id" TEXT NOT NULL,
    "changeRequestId" TEXT NOT NULL,
    "approvedById" TEXT NOT NULL,
    "approvalNotes" TEXT,
    "poSignature" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cr_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cr_versions" (
    "id" TEXT NOT NULL,
    "changeRequestId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cr_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_history" (
    "id" TEXT NOT NULL,
    "changeRequestId" TEXT NOT NULL,
    "fromStatus" "CRStatus" NOT NULL,
    "toStatus" "CRStatus" NOT NULL,
    "changedById" TEXT NOT NULL,
    "reason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_notes" (
    "id" TEXT NOT NULL,
    "changeRequestId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "actorId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");

-- CreateIndex
CREATE INDEX "projects_code_idx" ON "projects"("code");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_assignedDmId_idx" ON "projects"("assignedDmId");

-- CreateIndex
CREATE INDEX "project_users_userId_idx" ON "project_users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "project_users_projectId_userId_key" ON "project_users"("projectId", "userId");

-- CreateIndex
CREATE INDEX "project_attachments_projectId_idx" ON "project_attachments"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_token_idx" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "change_requests_crNumber_key" ON "change_requests"("crNumber");

-- CreateIndex
CREATE INDEX "change_requests_projectId_idx" ON "change_requests"("projectId");

-- CreateIndex
CREATE INDEX "change_requests_submittedById_idx" ON "change_requests"("submittedById");

-- CreateIndex
CREATE INDEX "change_requests_status_idx" ON "change_requests"("status");

-- CreateIndex
CREATE INDEX "change_requests_crNumber_idx" ON "change_requests"("crNumber");

-- CreateIndex
CREATE INDEX "change_requests_projectId_status_idx" ON "change_requests"("projectId", "status");

-- CreateIndex
CREATE INDEX "change_requests_createdAt_idx" ON "change_requests"("createdAt");

-- CreateIndex
CREATE INDEX "cr_attachments_changeRequestId_idx" ON "cr_attachments"("changeRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "impact_analyses_changeRequestId_key" ON "impact_analyses"("changeRequestId");

-- CreateIndex
CREATE INDEX "impact_analyses_dmId_idx" ON "impact_analyses"("dmId");

-- CreateIndex
CREATE UNIQUE INDEX "cr_approvals_changeRequestId_key" ON "cr_approvals"("changeRequestId");

-- CreateIndex
CREATE INDEX "cr_versions_changeRequestId_idx" ON "cr_versions"("changeRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "cr_versions_changeRequestId_versionNumber_key" ON "cr_versions"("changeRequestId", "versionNumber");

-- CreateIndex
CREATE INDEX "status_history_changeRequestId_idx" ON "status_history"("changeRequestId");

-- CreateIndex
CREATE INDEX "status_history_changedAt_idx" ON "status_history"("changedAt");

-- CreateIndex
CREATE INDEX "internal_notes_changeRequestId_idx" ON "internal_notes"("changeRequestId");

-- CreateIndex
CREATE INDEX "audit_logs_event_idx" ON "audit_logs"("event");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_assignedDmId_fkey" FOREIGN KEY ("assignedDmId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_users" ADD CONSTRAINT "project_users_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_users" ADD CONSTRAINT "project_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_attachments" ADD CONSTRAINT "project_attachments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cr_attachments" ADD CONSTRAINT "cr_attachments_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "change_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impact_analyses" ADD CONSTRAINT "impact_analyses_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "change_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impact_analyses" ADD CONSTRAINT "impact_analyses_dmId_fkey" FOREIGN KEY ("dmId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cr_approvals" ADD CONSTRAINT "cr_approvals_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "change_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cr_approvals" ADD CONSTRAINT "cr_approvals_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cr_versions" ADD CONSTRAINT "cr_versions_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "change_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cr_versions" ADD CONSTRAINT "cr_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "change_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "change_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
