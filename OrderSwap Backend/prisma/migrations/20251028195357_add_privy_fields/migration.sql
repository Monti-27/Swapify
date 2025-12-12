/*
  Warnings:

  - You are about to drop the column `authorizationKey` on the `strategies` table. All the data in the column will be lost.
  - You are about to drop the column `network` on the `strategies` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "strategies" DROP COLUMN "authorizationKey",
DROP COLUMN "network";

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "authorizationExpiresAt" TIMESTAMP(3),
ADD COLUMN     "authorizationKey" TEXT,
ADD COLUMN     "privyUserId" TEXT;

-- CreateIndex
CREATE INDEX "wallets_privyUserId_idx" ON "wallets"("privyUserId");

-- CreateIndex
CREATE INDEX "wallets_authorizationExpiresAt_idx" ON "wallets"("authorizationExpiresAt");
