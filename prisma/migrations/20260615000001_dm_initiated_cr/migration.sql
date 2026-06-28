-- Add new CRStatus enum values for DM-initiated CR flow
ALTER TYPE "CRStatus" ADD VALUE 'PENDING_CLIENT_REVIEW';
ALTER TYPE "CRStatus" ADD VALUE 'CLIENT_REVISION';

-- Add DM-initiated CR fields to change_requests
ALTER TABLE "change_requests"
  ADD COLUMN "initiatedByDm" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "createdByDmId" TEXT,
  ADD COLUMN "dmNotes" TEXT,
  ADD COLUMN "clientNotes" TEXT,
  ADD COLUMN "clientRevisionUsed" BOOLEAN NOT NULL DEFAULT false;

-- FK: createdByDmId → users.id (SET NULL on user delete)
ALTER TABLE "change_requests"
  ADD CONSTRAINT "change_requests_createdByDmId_fkey"
  FOREIGN KEY ("createdByDmId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "change_requests_createdByDmId_idx" ON "change_requests"("createdByDmId");
CREATE INDEX "change_requests_initiatedByDm_idx" ON "change_requests"("initiatedByDm");
