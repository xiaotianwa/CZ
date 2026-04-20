-- TcgCard.skillKeys → TcgCard.effectHooks
-- SQLite 3.25+ 原生支持 RENAME COLUMN，完整保留数据
ALTER TABLE "TcgCard" RENAME COLUMN "skillKeys" TO "effectHooks";
