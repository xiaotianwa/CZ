-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "scene" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "ip" TEXT,
    "uaHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sendCount" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QuizPassToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT,
    "ip" TEXT,
    "uaHash" TEXT,
    "questionSet" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "ip" TEXT,
    "uaHash" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "result" TEXT NOT NULL DEFAULT 'success',
    "reason" TEXT,
    "meta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "VerificationCode_email_scene_createdAt_idx" ON "VerificationCode"("email", "scene", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationCode_status_expiresAt_idx" ON "VerificationCode"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuizPassToken_tokenHash_key" ON "QuizPassToken"("tokenHash");

-- CreateIndex
CREATE INDEX "QuizPassToken_status_expiresAt_idx" ON "QuizPassToken"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "QuizPassToken_email_createdAt_idx" ON "QuizPassToken"("email", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_eventType_createdAt_idx" ON "SecurityEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_email_createdAt_idx" ON "SecurityEvent"("email", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_ip_createdAt_idx" ON "SecurityEvent"("ip", "createdAt");
