-- CreateTable
CREATE TABLE "monitored_wallets" (
    "address" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastSignature" TEXT,
    "txCount" INTEGER NOT NULL DEFAULT 0,
    "failedTxCount" INTEGER NOT NULL DEFAULT 0,
    "burstCount" INTEGER NOT NULL DEFAULT 0,
    "avgTps" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "circularCount" INTEGER NOT NULL DEFAULT 0,
    "lastScannedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitored_wallets_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "transaction_graph" (
    "id" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "walletAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_graph_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monitored_wallets_riskScore_idx" ON "monitored_wallets"("riskScore");

-- CreateIndex
CREATE INDEX "monitored_wallets_lastScannedAt_idx" ON "monitored_wallets"("lastScannedAt");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_graph_signature_key" ON "transaction_graph"("signature");

-- CreateIndex
CREATE INDEX "transaction_graph_fromAddress_idx" ON "transaction_graph"("fromAddress");

-- CreateIndex
CREATE INDEX "transaction_graph_toAddress_idx" ON "transaction_graph"("toAddress");

-- CreateIndex
CREATE INDEX "transaction_graph_walletAddress_idx" ON "transaction_graph"("walletAddress");

-- CreateIndex
CREATE INDEX "transaction_graph_timestamp_idx" ON "transaction_graph"("timestamp");

-- AddForeignKey
ALTER TABLE "transaction_graph" ADD CONSTRAINT "transaction_graph_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "monitored_wallets"("address") ON DELETE CASCADE ON UPDATE CASCADE;
