/**
 * 违禁词过滤模块
 * - 支持从数据库动态加载 + 默认兜底词
 * - 可通过环境变量 BANNED_WORDS 追加（逗号分隔）
 * - 自动缓存，增删改后调用 resetBannedWordsCache 刷新
 */

import { prisma } from '@/lib/db';

const DEFAULT_BANNED_WORDS = [
  // 政治敏感
  '习近平', '共产党', '法轮功', '六四', '天安门事件', '台独', '藏独', '疆独',
  // 色情
  '操你妈', '你妈逼', '草泥马', '傻逼', '他妈的', '妈的', 'fuck', 'shit',
  '色情', '裸体', '一夜情', '约炮', '嫖娼', '卖淫',
  // 赌博诈骗
  '赌博', '网赌', '博彩', '代刷', '刷单', '兼职日赚', '免费领取', '加微信',
  // 暴力
  '杀人', '自杀', '跳楼',
  // 广告/垃圾
  '加QQ', '加群', '私聊领', '免费送', '代购', '代理', '推广赚钱',
  // 人身攻击
  '脑残', '智障', '废物', '去死', '滚蛋',
];

let cachedWords: string[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 60秒缓存

async function getWordList(): Promise<string[]> {
  const now = Date.now();
  if (cachedWords && now - cacheTime < CACHE_TTL) return cachedWords;

  try {
    const dbWords = await prisma.bannedWord.findMany({
      where: { isActive: true },
      select: { word: true },
    });
    const dbWordList = dbWords.map((w) => w.word);

    const extra = process.env.BANNED_WORDS;
    const extraWords = extra
      ? extra.split(',').map((w) => w.trim()).filter(Boolean)
      : [];

    // 合并：数据库词 + 环境变量词 + 默认兜底词，去重
    const all = [...new Set([...dbWordList, ...extraWords, ...DEFAULT_BANNED_WORDS])];
    cachedWords = all;
    cacheTime = now;
    return all;
  } catch {
    // 数据库读取失败时使用默认词
    const extra = process.env.BANNED_WORDS;
    const extraWords = extra
      ? extra.split(',').map((w) => w.trim()).filter(Boolean)
      : [];
    return [...DEFAULT_BANNED_WORDS, ...extraWords];
  }
}

/**
 * 检查文本是否包含违禁词
 * @returns 匹配到的第一个违禁词，没有则返回 null
 */
export async function checkBannedWords(text: string): Promise<string | null> {
  if (!text) return null;
  const lower = text.toLowerCase();
  const words = await getWordList();

  for (const word of words) {
    if (lower.includes(word.toLowerCase())) {
      return word;
    }
  }
  return null;
}

/**
 * 检查文本并返回所有匹配的违禁词
 */
export async function findAllBannedWords(text: string): Promise<string[]> {
  if (!text) return [];
  const lower = text.toLowerCase();
  const words = await getWordList();
  return words.filter((word) => lower.includes(word.toLowerCase()));
}

/**
 * 重置缓存（用于测试或动态更新 — 管理后台增删改后调用）
 */
export function resetBannedWordsCache(): void {
  cachedWords = null;
  cacheTime = 0;
}
