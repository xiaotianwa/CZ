CREATE TABLE "GameQuizQuestion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "question" TEXT NOT NULL,
  "options" TEXT NOT NULL,
  "answer" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "GameQuizQuestion_isActive_idx" ON "GameQuizQuestion"("isActive");

INSERT INTO "GameQuizQuestion" ("id", "question", "options", "answer", "isActive", "sortOrder") VALUES
('gqq_1', '陈泽的生日是哪一天？', '["10月3日","11月3日","12月3日","1月3日"]', 1, true, 1),
('gqq_2', '"1103"这个数字代表什么？', '["粉丝数","陈泽生日","直播间号","车牌号"]', 1, true, 2),
('gqq_3', '陈泽最常直播的游戏类型是？', '["音游","FPS","MOBA","RPG"]', 2, true, 3),
('gqq_4', '陈泽的粉丝名是？', '["泽宝","老铁","家人","小陈"]', 1, true, 4),
('gqq_5', '以下哪个是陈泽传媒卡牌游戏中的关键词？', '["冲锋","挡枪","嘲讽","突袭"]', 1, true, 5),
('gqq_6', '社区签到一次可以获得多少积分？', '["10","20","30","50"]', 3, true, 6),
('gqq_7', '陈泽传媒卡牌游戏中，SSR 卡牌最多放几张？', '["1","2","3","不限"]', 0, true, 7),
('gqq_8', '社区积分每多少分升一级？', '["50","100","200","500"]', 1, true, 8);
