-- CreateTable
CREATE TABLE "privacy_commitments" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "encryptedNote" TEXT NOT NULL,
    "noteHash" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "isRedeemed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "privacy_commitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privacy_jobs" (
    "id" TEXT NOT NULL,
    "commitmentId" TEXT,
    "userPublicKey" TEXT NOT NULL,
    "bullmqJobId" TEXT,
    "chunkAmount" DOUBLE PRECISION NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "totalChunks" INTEGER NOT NULL,
    "destinationAddress" TEXT NOT NULL,
    "delayMs" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "txSignature" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "privacy_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privacy_transactions" (
    "id" TEXT NOT NULL,
    "commitmentId" TEXT,
    "walletAddress" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "destinationAddress" TEXT,
    "txSignature" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "privacy_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "privacy_commitments_noteHash_key" ON "privacy_commitments"("noteHash");

-- CreateIndex
CREATE INDEX "privacy_commitments_walletAddress_idx" ON "privacy_commitments"("walletAddress");

-- CreateIndex
CREATE INDEX "privacy_commitments_isRedeemed_idx" ON "privacy_commitments"("isRedeemed");

-- CreateIndex
CREATE INDEX "privacy_jobs_userPublicKey_idx" ON "privacy_jobs"("userPublicKey");

-- CreateIndex
CREATE INDEX "privacy_jobs_commitmentId_idx" ON "privacy_jobs"("commitmentId");

-- CreateIndex
CREATE INDEX "privacy_jobs_status_idx" ON "privacy_jobs"("status");

-- CreateIndex
CREATE INDEX "privacy_jobs_scheduledAt_idx" ON "privacy_jobs"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "privacy_transactions_txSignature_key" ON "privacy_transactions"("txSignature");

-- CreateIndex
CREATE INDEX "privacy_transactions_walletAddress_idx" ON "privacy_transactions"("walletAddress");

-- CreateIndex
CREATE INDEX "privacy_transactions_type_idx" ON "privacy_transactions"("type");

-- CreateIndex
CREATE INDEX "privacy_transactions_createdAt_idx" ON "privacy_transactions"("createdAt");

-- AddForeignKey
ALTER TABLE "privacy_jobs" ADD CONSTRAINT "privacy_jobs_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES "privacy_commitments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_transactions" ADD CONSTRAINT "privacy_transactions_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES "privacy_commitments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
