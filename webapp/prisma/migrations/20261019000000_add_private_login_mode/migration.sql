-- AlterTable
ALTER TABLE "auth_challenges" ADD COLUMN "loginHost" TEXT,
ADD COLUMN "entropy" TEXT,
ADD COLUMN "pubkey" TEXT,
ADD COLUMN "sig" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "loginMode" TEXT NOT NULL DEFAULT 'standard';

-- CreateTable
CREATE TABLE "login_domains" (
    "siteId" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" BIGINT NOT NULL,
    "verifiedAt" BIGINT,

    CONSTRAINT "login_domains_pkey" PRIMARY KEY ("siteId")
);

-- CreateIndex
CREATE UNIQUE INDEX "login_domains_host_key" ON "login_domains"("host");
