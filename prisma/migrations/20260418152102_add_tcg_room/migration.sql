-- CreateTable
CREATE TABLE "TcgRoom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "guestId" TEXT,
    "hostDeck" TEXT NOT NULL DEFAULT '[]',
    "guestDeck" TEXT NOT NULL DEFAULT '[]',
    "state" TEXT NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "winnerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TcgRoom_code_key" ON "TcgRoom"("code");

-- CreateIndex
CREATE INDEX "TcgRoom_code_idx" ON "TcgRoom"("code");

-- CreateIndex
CREATE INDEX "TcgRoom_hostId_idx" ON "TcgRoom"("hostId");

-- CreateIndex
CREATE INDEX "TcgRoom_status_idx" ON "TcgRoom"("status");

-- CreateIndex
CREATE INDEX "TcgRoom_createdAt_idx" ON "TcgRoom"("createdAt");
