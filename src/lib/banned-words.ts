/**
 * 违禁词过滤模块
 * - 支持从数据库动态加载 + 默认兜底词
 * - 可通过环境变量 BANNED_WORDS 追加（逗号分隔）
 * - 自动缓存，增删改后调用 resetBannedWordsCache 刷新
 * - 支持变体检测：拼音缩写、谐音、中英混写、符号干扰
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

/**
 * 变体词映射 —— 覆盖拼音缩写、谐音、中英混写等绕过方式
 * key: 展示给用户的违禁词名称
 * value: 该词的所有变体正则（大小写不敏感）
 */
const VARIANT_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  // 傻逼 及其变体
  { label: '傻逼', pattern: /傻[b逼比币屄臂笔掰鼻\.\*]+/i },
  { label: '傻逼', pattern: /[s][b](?![a-z])/i },
  { label: '傻逼', pattern: /沙[b逼比币]/i },
  { label: '傻逼', pattern: /煞笔/i },
  // 操/肏 系列
  { label: '操你妈', pattern: /[操肏艹草cao][你尼泥ni][妈马麻嘛吗ma]/i },
  { label: '操', pattern: /(?:^|[^a-z])cao(?:[^a-z]|$)/i },
  // 你妈逼
  { label: '你妈逼', pattern: /[你尼泥ni][妈马麻嘛ma][b逼比币屄]/i },
  { label: '你妈逼', pattern: /nmb(?![a-z])/i },
  // 卧槽
  { label: '卧槽', pattern: /[我卧沃][操槽草艹擦靠cao]/i },
  { label: '卧槽', pattern: /wc(?![a-z])/i },
  // fuck 变体
  { label: 'fuck', pattern: /f[\s._\-*]*u[\s._\-*]*c[\s._\-*]*k/i },
  { label: 'fuck', pattern: /f[u\*@#]ck/i },
  { label: 'fuck', pattern: /fvck/i },
  // shit 变体
  { label: 'shit', pattern: /s[\s._\-*]*h[\s._\-*]*i[\s._\-*]*t/i },
  // 他妈的 变体
  { label: '他妈的', pattern: /[他她它tmd][妈马麻ma][的de地滴]/i },
  { label: '他妈的', pattern: /tmd(?![a-z])/i },
  // 脑残 变体
  { label: '脑残', pattern: /[脑恼闹][残惨婵蚕]/i },
  // 智障 变体
  { label: '智障', pattern: /[智知致][障章彰]/i },
  // 去死 变体
  { label: '去死', pattern: /[去趣取][死屎使si]/i },
  // 滚蛋 变体
  { label: '滚蛋', pattern: /[滚gun][蛋dan旦弹]/i },
  // 废物 变体
  { label: '废物', pattern: /[废费菲飞][物吴悟雾]/i },
  // 垃圾
  { label: '垃圾', pattern: /辣[鸡基机积级几计]/i },
  // 贱人/犯贱
  { label: '贱', pattern: /[犯翻返泛]?[贱践鉴剑健贝戋]/i },
  // 狗/日 系列
  { label: '狗日的', pattern: /[狗苟][日ri][的de地]/i },
  // 低俗人身攻击
  { label: '白痴', pattern: /[白百拜][痴吃迟池持齿耻]/i },
  { label: '弱智', pattern: /[弱ruo][智知致志制zhi]/i },
];

/**
 * 预处理文本：去除常见干扰字符（空格、标点、特殊符号等）
 * 用于增强违禁词的穿透检测
 */
function normalizeText(text: string): string {
  return text
    .replace(/[\s\u200b\u200c\u200d\ufeff]/g, '')   // 零宽字符 + 空格
    .replace(/[._\-~!@#$%^&*()+=|\\{}[\]:;"'<>,?/·。，、；：？！…—""''【】《》「」]/g, '')
    .toLowerCase();
}

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
    const all = Array.from(new Set([...dbWordList, ...extraWords, ...DEFAULT_BANNED_WORDS]));
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
 * 三层检测：1) 原文精确匹配  2) 去符号后精确匹配  3) 变体正则匹配
 * @returns 匹配到的第一个违禁词，没有则返回 null
 */
export async function checkBannedWords(text: string): Promise<string | null> {
  if (!text) return null;
  const lower = text.toLowerCase();
  const normalized = normalizeText(text);
  const words = await getWordList();

  // 1) 原文精确匹配
  for (const word of words) {
    if (lower.includes(word.toLowerCase())) {
      return word;
    }
  }

  // 2) 去符号后精确匹配（防止 "傻 逼"、"傻.逼" 等绕过）
  for (const word of words) {
    if (normalized.includes(word.toLowerCase())) {
      return word;
    }
  }

  // 3) 变体正则匹配（拼音缩写、谐音、中英混写）
  for (const { label, pattern } of VARIANT_PATTERNS) {
    if (pattern.test(lower) || pattern.test(normalized)) {
      return label;
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
  const normalized = normalizeText(text);
  const words = await getWordList();

  const found = new Set<string>();

  // 精确匹配（原文 + 去符号）
  for (const word of words) {
    const wl = word.toLowerCase();
    if (lower.includes(wl) || normalized.includes(wl)) {
      found.add(word);
    }
  }

  // 变体正则匹配
  for (const { label, pattern } of VARIANT_PATTERNS) {
    if (pattern.test(lower) || pattern.test(normalized)) {
      found.add(label);
    }
  }

  return Array.from(found);
}

/**
 * 重置缓存（用于测试或动态更新 — 管理后台增删改后调用）
 */
export function resetBannedWordsCache(): void {
  cachedWords = null;
  cacheTime = 0;
}
