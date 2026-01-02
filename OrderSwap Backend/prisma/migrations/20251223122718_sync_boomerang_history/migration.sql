-- AlterTable
ALTER TABLE "strategies" ADD COLUMN     "boomerangLeg" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "boomerangMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "entryExecutedAt" TIMESTAMP(3),
ADD COLUMN     "entryPrice" DOUBLE PRECISION,
ADD COLUMN     "entryTokensReceived" DOUBLE PRECISION,
ADD COLUMN     "exitExecutedAt" TIMESTAMP(3),
ADD COLUMN     "exitPrice" DOUBLE PRECISION,
ADD COLUMN     "exitTokensReceived" DOUBLE PRECISION,
ADD COLUMN     "exitType" TEXT,
ADD COLUMN     "orderDirection" TEXT NOT NULL DEFAULT 'buy',
ADD COLUMN     "originalFromToken" TEXT,
ADD COLUMN     "originalToToken" TEXT;
