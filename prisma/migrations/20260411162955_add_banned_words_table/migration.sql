-- CreateTable
CREATE TABLE "BannedWord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "word" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'custom',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "BannedWord_word_key" ON "BannedWord"("word");

-- CreateIndex
CREATE INDEX "BannedWord_isActive_idx" ON "BannedWord"("isActive");

-- CreateIndex
CREATE INDEX "BannedWord_category_idx" ON "BannedWord"("category");
