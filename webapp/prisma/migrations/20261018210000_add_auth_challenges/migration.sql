-- CreateTable
CREATE TABLE "auth_challenges" (
    "id" TEXT NOT NULL,
    "k1" TEXT NOT NULL,
    "siteId" TEXT,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" BIGINT NOT NULL,
    "expiresAt" BIGINT NOT NULL,

    CONSTRAINT "auth_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_challenges_k1_key" ON "auth_challenges"("k1");

-- CreateIndex
CREATE INDEX "auth_challenges_expiresAt_idx" ON "auth_challenges"("expiresAt");
