-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "githubHookId" TEXT,
ADD COLUMN     "githubRepo" TEXT;

-- CreateTable
CREATE TABLE "GithubAccount" (
    "userId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GithubAccount_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "GithubAccount" ADD CONSTRAINT "GithubAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
