-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "aiSummary" TEXT,
ADD COLUMN     "aiSummaryAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "aiEnabled" BOOLEAN NOT NULL DEFAULT true;

