-- CreateTable
CREATE TABLE "site_login_flow" (
    "siteId" TEXT NOT NULL,
    "tokenLogins" INTEGER NOT NULL DEFAULT 0,
    "legacyLogins" INTEGER NOT NULL DEFAULT 0,
    "lastTokenAt" BIGINT,
    "lastLegacyAt" BIGINT,

    CONSTRAINT "site_login_flow_pkey" PRIMARY KEY ("siteId")
);
