-- CreateEnum
CREATE TYPE "DevKind" AS ENUM ('BRANCH', 'COMMIT', 'PULL_REQUEST');

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "gitAutomation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "staleDays" INTEGER NOT NULL DEFAULT 3,
ALTER COLUMN "color" SET DEFAULT '#0e7c66';

-- AlterTable
ALTER TABLE "Status" ADD COLUMN     "wipLimit" INTEGER;

-- CreateTable
CREATE TABLE "DevActivity" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "kind" "DevKind" NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'open',
    "author" TEXT NOT NULL DEFAULT '',
    "repo" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DevActivity_issueId_kind_externalId_key" ON "DevActivity"("issueId", "kind", "externalId");

-- AddForeignKey
ALTER TABLE "DevActivity" ADD CONSTRAINT "DevActivity_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill time-in-status from the latest status change in history.
UPDATE "Issue" i SET "statusChangedAt" = COALESCE(
  (SELECT max(a."createdAt") FROM "Activity" a WHERE a."issueId" = i.id AND a.field = 'statusId'), i."createdAt");
UPDATE "Issue" i SET "startedAt" = COALESCE(
  (SELECT min(a."createdAt") FROM "Activity" a WHERE a."issueId" = i.id AND a.field = 'statusId'), i."createdAt")
FROM "Status" s WHERE s.id = i."statusId" AND s.category <> 'TODO';
