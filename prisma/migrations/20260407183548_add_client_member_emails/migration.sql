-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "clientMemberEmails" JSONB NOT NULL DEFAULT '[]';
