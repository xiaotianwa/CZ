-- CreateTable
CREATE TABLE "FanWorkVotePeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FanWorkVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodId" TEXT NOT NULL,
    "fanWorkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FanWorkVote_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "FanWorkVotePeriod" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FanWorkVote_fanWorkId_fkey" FOREIGN KEY ("fanWorkId") REFERENCES "FanWork" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FanWorkVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FanWorkVotePeriod_isActive_idx" ON "FanWorkVotePeriod"("isActive");

-- CreateIndex
CREATE INDEX "FanWorkVotePeriod_startAt_endAt_idx" ON "FanWorkVotePeriod"("startAt", "endAt");

-- CreateIndex
CREATE INDEX "FanWorkVote_periodId_fanWorkId_idx" ON "FanWorkVote"("periodId", "fanWorkId");

-- CreateIndex
CREATE INDEX "FanWorkVote_userId_periodId_idx" ON "FanWorkVote"("userId", "periodId");

-- CreateIndex
CREATE INDEX "FanWorkVote_userId_createdAt_idx" ON "FanWorkVote"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FanWorkVote_fanWorkId_idx" ON "FanWorkVote"("fanWorkId");

-- CreateIndex
CREATE INDEX "FanWorkVote_createdAt_idx" ON "FanWorkVote"("createdAt");
