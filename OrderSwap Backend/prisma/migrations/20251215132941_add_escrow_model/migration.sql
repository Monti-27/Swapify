/*
  Warnings:

  - You are about to drop the column `authorizationExpiresAt` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `authorizationKey` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `privyUserId` on the `wallets` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[pdaStrategy]` on the table `strategies` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "wallets_authorizationExpiresAt_idx";

-- DropIndex
DROP INDEX "wallets_privyUserId_idx";

-- AlterTable
ALTER TABLE "strategies" ADD COLUMN     "depositedAt" TIMESTAMP(3),
ADD COLUMN     "pdaEscrow" TEXT,
ADD COLUMN     "pdaStrategy" TEXT,
ADD COLUMN     "programId" TEXT,
ADD COLUMN     "strategyIndex" INTEGER,
ALTER COLUMN "status" SET DEFAULT 'created';

-- AlterTable
ALTER TABLE "trades" ADD COLUMN     "txType" TEXT NOT NULL DEFAULT 'execution';

-- AlterTable
ALTER TABLE "wallets" DROP COLUMN "authorizationExpiresAt",
DROP COLUMN "authorizationKey",
DROP COLUMN "privyUserId",
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "escrows" (
    "id" TEXT NOT NULL,
    "pdaStrategy" TEXT NOT NULL,
    "pdaEscrow" TEXT,
    "owner" TEXT NOT NULL,
    "tokenMint" TEXT NOT NULL,
    "deposited" TEXT NOT NULL DEFAULT '0',
    "withdrawn" TEXT NOT NULL DEFAULT '0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escrows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "escrows_pdaStrategy_key" ON "escrows"("pdaStrategy");

-- CreateIndex
CREATE INDEX "escrows_pdaStrategy_idx" ON "escrows"("pdaStrategy");

-- CreateIndex
CREATE INDEX "escrows_owner_idx" ON "escrows"("owner");

-- CreateIndex
CREATE UNIQUE INDEX "strategies_pdaStrategy_key" ON "strategies"("pdaStrategy");

-- CreateIndex
CREATE INDEX "strategies_pdaStrategy_idx" ON "strategies"("pdaStrategy");
