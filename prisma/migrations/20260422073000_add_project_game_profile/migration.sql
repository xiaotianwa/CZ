CREATE TABLE "ProjectGameProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "cover" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "genre" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'playing',
  "lastPlayed" TEXT NOT NULL DEFAULT '',
  "hours" INTEGER NOT NULL DEFAULT 0,
  "rating" INTEGER NOT NULL DEFAULT 5,
  "comment" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '',
  "downloadLinks" TEXT NOT NULL DEFAULT '[]',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "ProjectGameProfile_status_idx" ON "ProjectGameProfile"("status");
