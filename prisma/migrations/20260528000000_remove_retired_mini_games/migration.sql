DELETE FROM "GameCenterEntry"
WHERE "entryKey" IN ('quiz', 'typing', 'emoji-guess');

DROP TABLE IF EXISTS "GameQuizQuestion";
DROP TABLE IF EXISTS "GameEmojiPuzzle";
DROP TABLE IF EXISTS "GameTypingSentence";
