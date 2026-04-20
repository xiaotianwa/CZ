/**
 * TCG 数据适配器
 *
 * 把数据库 TcgCard 行转换为前台 `@/data/cardPresets` 兼容的 CardPreset 形状，
 * 让运营在后台改的卡可以被 4 个前台页面（Battle / deck / preview / gallery）直接消费。
 *
 * 关键职责：
 * 1. JSON 字段反序列化（effectHooks / keywords / synergies）
 * 2. imagePath 走与前台一致的 CDN/本地路径解析（CDN 模式自动转 webp）
 * 3. null → undefined 收敛（CardPreset 用 ? 而非 | null）
 * 4. effectHooks 直接映射到 engine CardDef.effects（结构完全一致）
 */

import { parseSynergies, type CardSynergy } from './synergy';
import { parseEffectHooks, type CardEffectHook } from './effectHooks';

/** TcgCard DB 行的结构子集（只要字段匹配即可，不依赖 Prisma 生成类型） */
export interface TcgCardRow {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
  rarity: string;
  cost: number;
  attack: number | null;
  health: number | null;
  description: string;
  flavor: string | null;
  imagePath: string | null;
  effectHooks?: string | null; // JSON string
  keywords?: string | null;    // JSON string
  synergies?: string | null;   // JSON string
}

export interface CardPresetDTO {
  id: string;
  name: string;
  type: 'character' | 'item' | 'equipment' | 'effect' | 'event';
  subtype?: 'instant' | 'delayed' | 'weapon' | 'armor';
  rarity: 'N' | 'R' | 'SR' | 'SSR';
  cost?: number;
  attack?: number;
  health?: number;
  description?: string;
  flavor?: string;
  imagePath?: string;
  /** 对应 engine CardDef.effects —— 结构完全兼容 EffectHook[] */
  effects?: CardEffectHook[];
  /** 对应 engine CardDef.keywords */
  keywords?: string[];
  /** TCG 联动系统（engine 通过 cardLoader 消费） */
  synergies?: CardSynergy[];
}

const CARDS_CDN = process.env.NEXT_PUBLIC_CARDS_CDN || '';

/** 与 @/data/cardPresets 内的 resolveImagePath 行为完全一致 —— 共用 CDN 域名 + WebP 后缀替换规则 */
function resolveImagePath(p?: string | null): string | undefined {
  if (!p) return undefined;
  if (!p.startsWith('/cards/')) return p;
  const filename = p.slice('/cards/'.length);
  if (CARDS_CDN) {
    const webpFilename = filename.replace(/\.(png|jpe?g)$/i, '.webp');
    return `${CARDS_CDN.replace(/\/$/, '')}/cards/${encodeURI(webpFilename)}`;
  }
  return `/cards/${encodeURI(filename)}`;
}

/** DB 单行 → 前台 CardPreset */
export function toCardPreset(row: TcgCardRow): CardPresetDTO {
  const synergies = parseSynergies(row.synergies ?? null);
  const effects = parseEffectHooks(row.effectHooks ?? null);
  const keywords = safeParseStringArray(row.keywords ?? null);
  return {
    id: row.id,
    name: row.name,
    type: row.type as CardPresetDTO['type'],
    subtype: (row.subtype as CardPresetDTO['subtype']) || undefined,
    rarity: row.rarity as CardPresetDTO['rarity'],
    cost: row.cost,
    attack: row.attack ?? undefined,
    health: row.health ?? undefined,
    description: row.description || undefined,
    flavor: row.flavor || undefined,
    imagePath: resolveImagePath(row.imagePath),
    effects: effects.length > 0 ? effects : undefined,
    keywords: keywords.length > 0 ? keywords : undefined,
    synergies: synergies.length > 0 ? synergies : undefined,
  };
}

function safeParseStringArray(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** 把 TcgDeckPreset.cardIds JSON ([{id,count}]) 展开为前台 Deck.cards (['C01','C01',...]) */
export function expandDeckCardIds(cardIdsJson: string): string[] {
  try {
    const parsed = JSON.parse(cardIdsJson) as Array<{ id: string; count: number }>;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      if (!entry || typeof entry.id !== 'string') return [];
      const n = Math.max(0, Math.min(99, Number(entry.count) || 0));
      return Array(n).fill(entry.id);
    });
  } catch {
    return [];
  }
}
