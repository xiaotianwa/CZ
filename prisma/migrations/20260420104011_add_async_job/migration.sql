-- CreateTable
CREATE TABLE "AsyncJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "scheduledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AsyncJob_idempotencyKey_key" ON "AsyncJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AsyncJob_status_scheduledAt_idx" ON "AsyncJob"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "AsyncJob_type_idx" ON "AsyncJob"("type");
