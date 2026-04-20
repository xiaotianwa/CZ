-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TcgCard" (
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
    "synergies" TEXT NOT NULL DEFAULT '[]',
    "seasonId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_TcgCard" ("attack", "cost", "createdAt", "description", "flavor", "health", "id", "imagePath", "keywords", "name", "rarity", "seasonId", "skillKeys", "sortOrder", "status", "subtype", "type", "updatedAt") SELECT "attack", "cost", "createdAt", "description", "flavor", "health", "id", "imagePath", "keywords", "name", "rarity", "seasonId", "skillKeys", "sortOrder", "status", "subtype", "type", "updatedAt" FROM "TcgCard";
DROP TABLE "TcgCard";
ALTER TABLE "new_TcgCard" RENAME TO "TcgCard";
CREATE INDEX "TcgCard_type_idx" ON "TcgCard"("type");
CREATE INDEX "TcgCard_rarity_idx" ON "TcgCard"("rarity");
CREATE INDEX "TcgCard_status_idx" ON "TcgCard"("status");
CREATE INDEX "TcgCard_seasonId_idx" ON "TcgCard"("seasonId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
