-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FanWork" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'image',
    "cover" TEXT NOT NULL,
    "contentUrl" TEXT,
    "images" TEXT NOT NULL DEFAULT '[]',
    "authorName" TEXT NOT NULL,
    "authorAvatar" TEXT,
    "userId" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectReason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FanWork_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FanWork" ("authorAvatar", "authorName", "contentUrl", "cover", "createdAt", "description", "id", "images", "isActive", "isFeatured", "likes", "sortOrder", "source", "sourceUrl", "title", "type", "updatedAt") SELECT "authorAvatar", "authorName", "contentUrl", "cover", "createdAt", "description", "id", "images", "isActive", "isFeatured", "likes", "sortOrder", "source", "sourceUrl", "title", "type", "updatedAt" FROM "FanWork";
DROP TABLE "FanWork";
ALTER TABLE "new_FanWork" RENAME TO "FanWork";
CREATE INDEX "FanWork_type_idx" ON "FanWork"("type");
CREATE INDEX "FanWork_status_idx" ON "FanWork"("status");
CREATE INDEX "FanWork_isActive_idx" ON "FanWork"("isActive");
CREATE INDEX "FanWork_isFeatured_idx" ON "FanWork"("isFeatured");
CREATE INDEX "FanWork_sortOrder_idx" ON "FanWork"("sortOrder");
CREATE INDEX "FanWork_userId_idx" ON "FanWork"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
