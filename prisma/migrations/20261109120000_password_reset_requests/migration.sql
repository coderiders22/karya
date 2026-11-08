-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'PASSWORD_REQUEST';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "siteOwner" BOOLEAN NOT NULL DEFAULT false;

-- Whoever set this install up runs it: the first admin ever created.
UPDATE "User" SET "siteOwner" = true
WHERE "id" = (SELECT "id" FROM "User" WHERE "role" = 'ADMIN' ORDER BY "createdAt" ASC, "id" ASC LIMIT 1);

-- CreateTable
CREATE TABLE "PasswordResetRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkCreatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PasswordResetRequest_userId_idx" ON "PasswordResetRequest"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetRequest_resolvedAt_linkCreatedAt_idx" ON "PasswordResetRequest"("resolvedAt", "linkCreatedAt");

-- AddForeignKey
ALTER TABLE "PasswordResetRequest" ADD CONSTRAINT "PasswordResetRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
