ALTER TABLE "GameCenterEntry" ADD COLUMN "subtitle" TEXT NOT NULL DEFAULT 'GAME ENTRY';
ALTER TABLE "GameCenterEntry" ADD COLUMN "desc" TEXT NOT NULL DEFAULT '点击进入游戏';
ALTER TABLE "GameCenterEntry" ADD COLUMN "iconKey" TEXT NOT NULL DEFAULT 'sparkles';
ALTER TABLE "GameCenterEntry" ADD COLUMN "gradient" TEXT NOT NULL DEFAULT 'from-violet-600 via-purple-600 to-indigo-700';
ALTER TABLE "GameCenterEntry" ADD COLUMN "glowColor" TEXT NOT NULL DEFAULT 'rgba(124,58,237,0.4)';
ALTER TABLE "GameCenterEntry" ADD COLUMN "badge" TEXT;

UPDATE "GameCenterEntry"
SET
  "subtitle" = CASE "entryKey"
    WHEN 'tcg' THEN 'CHENZE TCG'
    WHEN 'quiz' THEN 'QUIZ CHALLENGE'
    WHEN 'guess-number' THEN 'GUESS THE NUMBER'
    WHEN 'typing' THEN 'TYPING RACE'
    WHEN 'emoji-guess' THEN 'EMOJI GUESS'
    WHEN 'reaction' THEN 'REACTION TIME'
    ELSE "subtitle"
  END,
  "desc" = CASE "entryKey"
    WHEN 'tcg' THEN '以陈泽宇宙为题材的回合制集换式卡牌游戏，支持 AI 练习和好友对战'
    WHEN 'quiz' THEN '考验你对陈泽和 1103 的了解程度，答对越多分数越高！'
    WHEN 'guess-number' THEN '经典猜数字游戏，系统随机一个数字，看你几次猜中！'
    WHEN 'typing' THEN '挑战你的打字速度，用直播弹幕金句来一场速度竞赛！'
    WHEN 'emoji-guess' THEN '用 emoji 组合描述一个词语/梗，看你能不能猜出来！'
    WHEN 'reaction' THEN '测测你的反应速度！看到信号立刻点击，挑战最快纪录'
    ELSE "desc"
  END,
  "iconKey" = CASE "entryKey"
    WHEN 'tcg' THEN 'swords'
    WHEN 'quiz' THEN 'brain'
    WHEN 'guess-number' THEN 'hash'
    WHEN 'typing' THEN 'keyboard'
    WHEN 'emoji-guess' THEN 'sparkles'
    WHEN 'reaction' THEN 'zap'
    ELSE "iconKey"
  END,
  "gradient" = CASE "entryKey"
    WHEN 'tcg' THEN 'from-violet-600 via-purple-600 to-indigo-700'
    WHEN 'quiz' THEN 'from-amber-500 via-orange-500 to-red-500'
    WHEN 'guess-number' THEN 'from-emerald-500 via-teal-500 to-cyan-600'
    WHEN 'typing' THEN 'from-sky-500 via-blue-500 to-indigo-600'
    WHEN 'emoji-guess' THEN 'from-pink-500 via-rose-500 to-red-500'
    WHEN 'reaction' THEN 'from-yellow-400 via-amber-500 to-orange-600'
    ELSE "gradient"
  END,
  "glowColor" = CASE "entryKey"
    WHEN 'tcg' THEN 'rgba(124,58,237,0.4)'
    WHEN 'quiz' THEN 'rgba(245,158,11,0.4)'
    WHEN 'guess-number' THEN 'rgba(16,185,129,0.4)'
    WHEN 'typing' THEN 'rgba(14,165,233,0.4)'
    WHEN 'emoji-guess' THEN 'rgba(236,72,153,0.4)'
    WHEN 'reaction' THEN 'rgba(251,191,36,0.4)'
    ELSE "glowColor"
  END,
  "badge" = CASE "entryKey"
    WHEN 'tcg' THEN '热门'
    WHEN 'quiz' THEN '新'
    ELSE NULL
  END
WHERE "entryKey" IN ('tcg', 'quiz', 'guess-number', 'typing', 'emoji-guess', 'reaction');
