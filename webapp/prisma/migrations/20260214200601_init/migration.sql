-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "xpub" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "subscribed" BOOLEAN NOT NULL DEFAULT true,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'free',
    "integrationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "freeDisclaimerAccepted" BOOLEAN NOT NULL DEFAULT false,
    "freeDisclaimerAcceptedAt" BIGINT,
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domains" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "verificationMethod" TEXT NOT NULL DEFAULT 'dns_txt',
    "verificationToken" TEXT NOT NULL,
    "verifiedAt" BIGINT,
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_stats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "currentMonth" INTEGER NOT NULL DEFAULT 0,
    "yearToDate" INTEGER NOT NULL DEFAULT 0,
    "allTime" INTEGER NOT NULL DEFAULT 0,
    "returningUserLogins" INTEGER NOT NULL DEFAULT 0,
    "uniquePubkeys" JSONB NOT NULL DEFAULT '[]',
    "monthlyPubkeys" JSONB NOT NULL DEFAULT '{}',
    "dailyLogins" JSONB NOT NULL DEFAULT '{}',
    "dailyUniqueUsers" JSONB NOT NULL DEFAULT '{}',
    "domainLogins" JSONB NOT NULL DEFAULT '{}',
    "hourlyLogins" JSONB NOT NULL DEFAULT '{}',
    "loginHistory" JSONB NOT NULL DEFAULT '[]',
    "walletLogins" JSONB NOT NULL DEFAULT '{}',
    "geographicData" JSONB NOT NULL DEFAULT '{}',
    "deviceTypes" JSONB NOT NULL DEFAULT '{}',
    "referrers" JSONB NOT NULL DEFAULT '{}',
    "weeklyLogins" JSONB NOT NULL DEFAULT '{}',
    "monthlyLogins" JSONB NOT NULL DEFAULT '{}',
    "peakHours" JSONB NOT NULL DEFAULT '{}',
    "averageSessionLength" JSONB NOT NULL DEFAULT '{}',
    "bounceRate" JSONB NOT NULL DEFAULT '{}',
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT,

    CONSTRAINT "usage_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xpub" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "k1" TEXT NOT NULL,
    "xpub" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" BIGINT NOT NULL,
    "expiresAt" BIGINT NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featured_wallets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "downloadUrl" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL,
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT NOT NULL,

    CONSTRAINT "featured_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_submissions" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unread',

    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_xpub_key" ON "users"("xpub");

-- CreateIndex
CREATE UNIQUE INDEX "users_siteId_key" ON "users"("siteId");

-- CreateIndex
CREATE INDEX "users_xpub_idx" ON "users"("xpub");

-- CreateIndex
CREATE INDEX "users_siteId_idx" ON "users"("siteId");

-- CreateIndex
CREATE INDEX "domains_userId_idx" ON "domains"("userId");

-- CreateIndex
CREATE INDEX "domains_domain_idx" ON "domains"("domain");

-- CreateIndex
CREATE INDEX "domains_verificationStatus_idx" ON "domains"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "domains_userId_domain_key" ON "domains"("userId", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "usage_stats_userId_key" ON "usage_stats"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "usage_stats_siteId_key" ON "usage_stats"("siteId");

-- CreateIndex
CREATE INDEX "usage_stats_siteId_idx" ON "usage_stats"("siteId");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_xpub_idx" ON "activity_logs"("xpub");

-- CreateIndex
CREATE INDEX "activity_logs_type_idx" ON "activity_logs"("type");

-- CreateIndex
CREATE INDEX "activity_logs_timestamp_idx" ON "activity_logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_k1_key" ON "auth_sessions"("k1");

-- CreateIndex
CREATE INDEX "auth_sessions_k1_idx" ON "auth_sessions"("k1");

-- CreateIndex
CREATE INDEX "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "auth_sessions_used_idx" ON "auth_sessions"("used");

-- CreateIndex
CREATE INDEX "featured_wallets_priority_idx" ON "featured_wallets"("priority");

-- CreateIndex
CREATE INDEX "featured_wallets_enabled_idx" ON "featured_wallets"("enabled");

-- CreateIndex
CREATE INDEX "contact_submissions_status_idx" ON "contact_submissions"("status");

-- CreateIndex
CREATE INDEX "contact_submissions_timestamp_idx" ON "contact_submissions"("timestamp");

-- CreateIndex
CREATE INDEX "contact_submissions_urgent_idx" ON "contact_submissions"("urgent");

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_stats" ADD CONSTRAINT "usage_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
