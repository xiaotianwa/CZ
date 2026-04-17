-- CreateTable
CREATE TABLE "WeiboPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mid" TEXT NOT NULL,
    "bid" TEXT,
    "uid" TEXT NOT NULL,
    "screenName" TEXT NOT NULL,
    "avatar" TEXT,
    "text" TEXT NOT NULL,
    "textRaw" TEXT,
    "images" TEXT NOT NULL DEFAULT '[]',
    "videoUrl" TEXT,
    "videoCover" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "repostCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" DATETIME NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isVisible" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE UNIQUE INDEX "WeiboPost_mid_key" ON "WeiboPost"("mid");

-- CreateIndex
CREATE INDEX "WeiboPost_uid_idx" ON "WeiboPost"("uid");

-- CreateIndex
CREATE INDEX "WeiboPost_publishedAt_idx" ON "WeiboPost"("publishedAt");

-- CreateIndex
CREATE INDEX "WeiboPost_isVisible_publishedAt_idx" ON "WeiboPost"("isVisible", "publishedAt");
