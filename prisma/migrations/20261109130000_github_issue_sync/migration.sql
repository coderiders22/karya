-- AlterEnum
ALTER TYPE "DevKind" ADD VALUE 'ISSUE';

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'GITHUB_ISSUE';

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "githubNumber" INTEGER,
ADD COLUMN     "githubSeenHash" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "githubIssueSync" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "githubIssuesSyncedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Issue_projectId_githubNumber_key" ON "Issue"("projectId", "githubNumber");
