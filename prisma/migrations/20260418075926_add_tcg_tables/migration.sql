-- CreateTable
CREATE TABLE "TcgCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subtype" TEXT,
    "rarity" TEXT NOT NULL,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "attack" INTEGER,
    "health" INTEGER,
    "description" TEXT NOT NULL,
    "flavor" TEXT,
    "imagePath" TEXT,
    "skillKeys" TEXT NOT NULL DEFAULT '[]',
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "seasonId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TcgDeckPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "archetype" TEXT NOT NULL,
    "cardIds" TEXT NOT NULL,
    "isStarter" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TcgPlayer" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "rating" INTEGER NOT NULL DEFAULT 1000,
    "tier" TEXT NOT NULL DEFAULT 'iron',
    "energy" INTEGER NOT NULL DEFAULT 5,
    "energyDate" TEXT NOT NULL DEFAULT '',
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "banStatus" TEXT NOT NULL DEFAULT 'normal',
    "banUntil" DATETIME,
    "banReason" TEXT,
    "lastPlayAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TcgCollection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "shards" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TcgDeck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cardIds" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TcgMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL,
    "seasonId" TEXT,
    "playerAId" TEXT NOT NULL,
    "playerBId" TEXT,
    "deckA" TEXT NOT NULL,
    "deckB" TEXT NOT NULL,
    "replay" TEXT NOT NULL,
    "winnerId" TEXT,
    "ratingDelta" INTEGER NOT NULL DEFAULT 0,
    "turns" INTEGER NOT NULL DEFAULT 0,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "endedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TcgSeason" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "rewardRules" TEXT NOT NULL DEFAULT '{}',
    "featuredCards" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TcgOperator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "role" TEXT NOT NULL DEFAULT 'tcg_editor',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TcgAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operatorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "before" TEXT,
    "after" TEXT,
    "note" TEXT,
    "ip" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "TcgCard_type_idx" ON "TcgCard"("type");

-- CreateIndex
CREATE INDEX "TcgCard_rarity_idx" ON "TcgCard"("rarity");

-- CreateIndex
CREATE INDEX "TcgCard_status_idx" ON "TcgCard"("status");

-- CreateIndex
CREATE INDEX "TcgCard_seasonId_idx" ON "TcgCard"("seasonId");

-- CreateIndex
CREATE INDEX "TcgDeckPreset_isStarter_idx" ON "TcgDeckPreset"("isStarter");

-- CreateIndex
CREATE INDEX "TcgDeckPreset_status_idx" ON "TcgDeckPreset"("status");

-- CreateIndex
CREATE INDEX "TcgPlayer_tier_idx" ON "TcgPlayer"("tier");

-- CreateIndex
CREATE INDEX "TcgPlayer_banStatus_idx" ON "TcgPlayer"("banStatus");

-- CreateIndex
CREATE INDEX "TcgPlayer_lastPlayAt_idx" ON "TcgPlayer"("lastPlayAt");

-- CreateIndex
CREATE INDEX "TcgCollection_userId_idx" ON "TcgCollection"("userId");

-- CreateIndex
CREATE INDEX "TcgCollection_cardId_idx" ON "TcgCollection"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "TcgCollection_userId_cardId_key" ON "TcgCollection"("userId", "cardId");

-- CreateIndex
CREATE INDEX "TcgDeck_userId_idx" ON "TcgDeck"("userId");

-- CreateIndex
CREATE INDEX "TcgDeck_userId_isActive_idx" ON "TcgDeck"("userId", "isActive");

-- CreateIndex
CREATE INDEX "TcgMatch_playerAId_createdAt_idx" ON "TcgMatch"("playerAId", "createdAt");

-- CreateIndex
CREATE INDEX "TcgMatch_playerBId_createdAt_idx" ON "TcgMatch"("playerBId", "createdAt");

-- CreateIndex
CREATE INDEX "TcgMatch_seasonId_idx" ON "TcgMatch"("seasonId");

-- CreateIndex
CREATE INDEX "TcgMatch_mode_idx" ON "TcgMatch"("mode");

-- CreateIndex
CREATE INDEX "TcgMatch_createdAt_idx" ON "TcgMatch"("createdAt");

-- CreateIndex
CREATE INDEX "TcgSeason_status_idx" ON "TcgSeason"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TcgOperator_email_key" ON "TcgOperator"("email");

-- CreateIndex
CREATE INDEX "TcgOperator_role_idx" ON "TcgOperator"("role");

-- CreateIndex
CREATE INDEX "TcgOperator_isActive_idx" ON "TcgOperator"("isActive");

-- CreateIndex
CREATE INDEX "TcgAuditLog_operatorId_createdAt_idx" ON "TcgAuditLog"("operatorId", "createdAt");

-- CreateIndex
CREATE INDEX "TcgAuditLog_action_idx" ON "TcgAuditLog"("action");

-- CreateIndex
CREATE INDEX "TcgAuditLog_targetType_targetId_idx" ON "TcgAuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "TcgAuditLog_createdAt_idx" ON "TcgAuditLog"("createdAt");
