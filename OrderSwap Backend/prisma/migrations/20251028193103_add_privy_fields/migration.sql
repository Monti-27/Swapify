-- AlterTable
ALTER TABLE "strategies" ADD COLUMN     "authorizationKey" TEXT,
ADD COLUMN     "network" TEXT NOT NULL DEFAULT 'solana:mainnet';
