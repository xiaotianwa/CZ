-- CreateTable
CREATE TABLE "Meme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "example" TEXT,
    "image" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FanWork" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'image',
    "cover" TEXT NOT NULL,
    "contentUrl" TEXT,
    "images" TEXT NOT NULL DEFAULT '[]',
    "authorName" TEXT NOT NULL,
    "authorAvatar" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Meme_isActive_idx" ON "Meme"("isActive");

-- CreateIndex
CREATE INDEX "Meme_popularity_idx" ON "Meme"("popularity");

-- CreateIndex
CREATE INDEX "Meme_sortOrder_idx" ON "Meme"("sortOrder");

-- CreateIndex
CREATE INDEX "FanWork_type_idx" ON "FanWork"("type");

-- CreateIndex
CREATE INDEX "FanWork_isActive_idx" ON "FanWork"("isActive");

-- CreateIndex
CREATE INDEX "FanWork_isFeatured_idx" ON "FanWork"("isFeatured");

-- CreateIndex
CREATE INDEX "FanWork_sortOrder_idx" ON "FanWork"("sortOrder");
