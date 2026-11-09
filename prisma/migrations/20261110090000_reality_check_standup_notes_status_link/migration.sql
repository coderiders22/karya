-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "githubCloseOnDone" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "statusToken" TEXT;

-- CreateTable
CREATE TABLE "UntrackedWork" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT '',
    "mergedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UntrackedWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandupNote" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "blocker" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StandupNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UntrackedWork_projectId_externalId_key" ON "UntrackedWork"("projectId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "StandupNote_projectId_userId_day_key" ON "StandupNote"("projectId", "userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "Project_statusToken_key" ON "Project"("statusToken");

-- AddForeignKey
ALTER TABLE "UntrackedWork" ADD CONSTRAINT "UntrackedWork_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandupNote" ADD CONSTRAINT "StandupNote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandupNote" ADD CONSTRAINT "StandupNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

