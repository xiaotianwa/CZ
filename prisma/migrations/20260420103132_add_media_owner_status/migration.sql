-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "cosKey" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "category" TEXT NOT NULL DEFAULT 'general',
    "ownerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "sha256" TEXT,
    "source" TEXT NOT NULL DEFAULT 'server_upload',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Media" ("category", "cosKey", "createdAt", "filename", "height", "id", "mimeType", "size", "url", "width") SELECT "category", "cosKey", "createdAt", "filename", "height", "id", "mimeType", "size", "url", "width" FROM "Media";
DROP TABLE "Media";
ALTER TABLE "new_Media" RENAME TO "Media";
CREATE INDEX "Media_category_idx" ON "Media"("category");
CREATE INDEX "Media_createdAt_idx" ON "Media"("createdAt");
CREATE INDEX "Media_ownerId_idx" ON "Media"("ownerId");
CREATE INDEX "Media_status_idx" ON "Media"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
