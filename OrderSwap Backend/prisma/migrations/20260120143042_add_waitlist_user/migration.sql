-- CreateTable
CREATE TABLE "waitlist_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "referredByCode" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "joinedTelegram" BOOLEAN NOT NULL DEFAULT false,
    "followedTwitter" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_users_email_key" ON "waitlist_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_users_walletAddress_key" ON "waitlist_users"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_users_referralCode_key" ON "waitlist_users"("referralCode");

-- CreateIndex
CREATE INDEX "waitlist_users_email_walletAddress_idx" ON "waitlist_users"("email", "walletAddress");
