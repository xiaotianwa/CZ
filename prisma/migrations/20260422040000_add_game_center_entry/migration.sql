CREATE TABLE "GameCenterEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entryKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "GameCenterEntry_entryKey_key" ON "GameCenterEntry"("entryKey");
CREATE INDEX "GameCenterEntry_sortOrder_idx" ON "GameCenterEntry"("sortOrder");

INSERT INTO "GameCenterEntry" ("id", "entryKey", "title", "href", "isEnabled", "sortOrder") VALUES
('gce_tcg', 'tcg', '卡牌对战', '/game', true, 0),
('gce_quiz', 'quiz', '1103 知识问答', '/play/quiz', true, 1),
('gce_guess_number', 'guess-number', '猜数字', '/play/guess-number', true, 2),
('gce_typing', 'typing', '弹幕打字赛', '/play/typing', true, 3),
('gce_emoji_guess', 'emoji-guess', '表情猜猜猜', '/play/emoji-guess', true, 4),
('gce_reaction', 'reaction', '反应速度测试', '/play/reaction', true, 5);
