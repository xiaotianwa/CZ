-- 表情猜猜猜题库
CREATE TABLE "GameEmojiPuzzle" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "emoji" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "hints" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT '日常',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "GameEmojiPuzzle_isActive_idx" ON "GameEmojiPuzzle"("isActive");

INSERT INTO "GameEmojiPuzzle" ("id", "emoji", "answer", "hints", "category", "sortOrder") VALUES
('gep_1',  '🎮🎙️📺',   '直播', '["游戏","主播","屏幕"]', '日常', 1),
('gep_2',  '👨‍💼📱💰',   '老板', '["上班","手机","赚钱"]', '身份', 2),
('gep_3',  '🔥🔥🔥💪', '火力全开', '["激烈","使劲","爆发"]', '成语', 3),
('gep_4',  '😎🎤🎵',   '唱歌', '["帅气","话筒","音乐"]', '活动', 4),
('gep_5',  '🐔🍗🥤',   '吃鸡', '["鸡","食物","游戏"]', '游戏', 5),
('gep_6',  '👊💥⭐',   '暴击', '["拳头","爆炸","伤害"]', '游戏', 6),
('gep_7',  '🏃‍♂️💨🏆',   '冲刺', '["跑步","速度","冠军"]', '运动', 7),
('gep_8',  '😂🤣😹',   '笑死', '["搞笑","哈哈","乐"]', '表情', 8),
('gep_9',  '🎯🎪🤹',   '整活', '["精准","表演","技术"]', '日常', 9),
('gep_10', '👑👸🏰',   '公主', '["皇冠","女孩","城堡"]', '身份', 10),
('gep_11', '⚔️🛡️🐉',   '打怪', '["武器","防御","怪兽"]', '游戏', 11),
('gep_12', '🌙⭐💤',   '晚安', '["月亮","星星","睡觉"]', '问候', 12),
('gep_13', '🎁🎂🎉',   '生日', '["礼物","蛋糕","庆祝"]', '节日', 13),
('gep_14', '📱💬❤️',   '点赞', '["手机","评论","爱心"]', '社交', 14),
('gep_15', '🏠🛋️📺',   '宅家', '["房子","沙发","看电视"]', '日常', 15),
('gep_16', '🚀🌟💫',   '起飞', '["火箭","星星","闪耀"]', '弹幕', 16),
('gep_17', '🐂🍺👍',   '牛逼', '["牛","啤酒","厉害"]', '弹幕', 17),
('gep_18', '💀☠️😵',   '寄了', '["骷髅","死亡","晕"]', '弹幕', 18),
('gep_19', '🤝👥💪',   '团队', '["握手","人群","力量"]', '日常', 19),
('gep_20', '🎶🎧🎹',   '音乐', '["音符","耳机","钢琴"]', '娱乐', 20),
('gep_21', '🌊🏄‍♂️☀️',   '冲浪', '["海浪","运动","阳光"]', '运动', 21),
('gep_22', '🍜🥢🔥',   '火锅', '["面条","筷子","辣"]', '美食', 22),
('gep_23', '📸✨🖼️',   '拍照', '["相机","闪光","照片"]', '日常', 23),
('gep_24', '🎭🃏😈',   '小丑', '["面具","扑克","恶魔"]', '身份', 24);

-- 打字赛词库
CREATE TABLE "GameTypingSentence" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "content" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT '弹幕',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "GameTypingSentence_isActive_idx" ON "GameTypingSentence"("isActive");

INSERT INTO "GameTypingSentence" ("id", "content", "category", "sortOrder") VALUES
('gts_1',  '兄弟们把一切交给我', '弹幕', 1),
('gts_2',  '这把稳了兄弟们', '弹幕', 2),
('gts_3',  '我陈泽没有输过', '弹幕', 3),
('gts_4',  '不要慌问题不大', '弹幕', 4),
('gts_5',  '这个操作可以的', '弹幕', 5),
('gts_6',  '秀啊兄弟秀啊', '弹幕', 6),
('gts_7',  '老铁们双击关注一下', '弹幕', 7),
('gts_8',  '感谢榜一大哥', '弹幕', 8),
('gts_9',  '来了来了他来了', '弹幕', 9),
('gts_10', '这个必须安排上', '弹幕', 10),
('gts_11', '我直接一个起飞', '弹幕', 11),
('gts_12', '有没有人看我直播', '弹幕', 12),
('gts_13', '家人们谁懂啊', '弹幕', 13),
('gts_14', '好好好这很合理', '弹幕', 14),
('gts_15', '啊这也太离谱了', '弹幕', 15),
('gts_16', '兄弟们冲冲冲', '弹幕', 16),
('gts_17', '芜湖起飞咯', '弹幕', 17),
('gts_18', '这波操作六六六', '弹幕', 18),
('gts_19', '整活整活赶紧整活', '弹幕', 19),
('gts_20', '经典永流传', '金句', 20),
('gts_21', '直播间的老铁们', '弹幕', 21),
('gts_22', '这个游戏真好玩', '弹幕', 22),
('gts_23', '今天也是元气满满的一天', '金句', 23),
('gts_24', '你们觉得怎么样', '弹幕', 24),
('gts_25', '下次一定下次一定', '弹幕', 25),
('gts_26', '我宣布这很重要', '弹幕', 26),
('gts_27', '格局打开格局打开', '金句', 27),
('gts_28', '咱就是说这谁顶得住', '弹幕', 28),
('gts_29', '绝了这真的绝了', '弹幕', 29),
('gts_30', '我佛了我真的佛了', '弹幕', 30);
