-- CreateEnum
CREATE TYPE "WorkspaceKind" AS ENUM ('TEAM', 'STUDENT');

-- CreateEnum
CREATE TYPE "UserMode" AS ENUM ('PROFESSIONAL', 'STUDENT');

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'TEAM_JOINED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.
ALTER TYPE "Role" ADD VALUE 'MANAGER';
ALTER TYPE "Role" ADD VALUE 'VIEWER';

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "WorkspaceKind" NOT NULL DEFAULT 'TEAM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- Everyone already on this install becomes one workspace, so nothing changes for them.
INSERT INTO "Workspace" ("id", "name", "kind")
SELECT 'wks_default', 'My team', 'TEAM'
WHERE EXISTS (SELECT 1 FROM "User") OR EXISTS (SELECT 1 FROM "Project") OR EXISTS (SELECT 1 FROM "Invite") OR EXISTS (SELECT 1 FROM "LabelColor");

-- DropIndex
DROP INDEX "Issue_key_key";

-- DropIndex
DROP INDEX "Project_key_key";

-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "workspaceId" TEXT;
UPDATE "Invite" SET "workspaceId" = 'wks_default';
ALTER TABLE "Invite" ALTER COLUMN "workspaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "LabelColor" DROP CONSTRAINT "LabelColor_pkey",
ADD COLUMN     "workspaceId" TEXT;
UPDATE "LabelColor" SET "workspaceId" = 'wks_default';
ALTER TABLE "LabelColor" ALTER COLUMN "workspaceId" SET NOT NULL,
ADD CONSTRAINT "LabelColor_pkey" PRIMARY KEY ("workspaceId", "name");

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "link" TEXT,
ALTER COLUMN "issueId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "githubLastEventAt" TIMESTAMP(3),
ADD COLUMN     "githubLastEventType" TEXT,
ADD COLUMN     "githubSecret" TEXT,
ADD COLUMN     "joinCode" TEXT,
ADD COLUMN     "template" TEXT,
ADD COLUMN     "workspaceId" TEXT;
UPDATE "Project" SET "workspaceId" = 'wks_default';
ALTER TABLE "Project" ALTER COLUMN "workspaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mode" "UserMode" NOT NULL DEFAULT 'PROFESSIONAL',
ADD COLUMN     "workspaceId" TEXT;
UPDATE "User" SET "workspaceId" = 'wks_default';
ALTER TABLE "User" ALTER COLUMN "workspaceId" SET NOT NULL;

-- CreateTable
CREATE TABLE "ProjectMember" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("projectId","userId")
);

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- CreateIndex
CREATE INDEX "Issue_key_idx" ON "Issue"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Project_joinCode_key" ON "Project"("joinCode");

-- CreateIndex
CREATE UNIQUE INDEX "Project_workspaceId_key_key" ON "Project"("workspaceId", "key");

-- CreateIndex
CREATE INDEX "User_workspaceId_idx" ON "User"("workspaceId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelColor" ADD CONSTRAINT "LabelColor_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
