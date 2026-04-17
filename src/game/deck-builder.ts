// 卡组构筑工具：规则校验 + localStorage 持久化
// 规则参考《对战规则.md》2.1 节：
//   - 每套 25 张
//   - 五大类至少各 1 张（character / item / equipment / effect / event）
//   - 单卡最多 2 张
//   - SSR 单卡最多 1 张

import type { CardDef, Deck } from './types';
import { ALL_CARDS } from './cards';

export const DECK_RULES = {
  SIZE: 25,
  SINGLE_CARD_MAX: 2,
  SSR_CARD_MAX: 1,
  TYPES_REQUIRED: ['character', 'item', 'equipment', 'effect', 'event'] as const,
};

export type DeckValidationError =
  | { code: 'size'; expected: number; actual: number }
  | { code: 'duplicate'; defId: string; max: number; actual: number }
  | { code: 'ssr_exceeded'; defId: string; max: number; actual: number }
  | { code: 'missing_type'; type: string };

export interface DeckValidationResult {
  ok: boolean;
  errors: DeckValidationError[];
}

/** 校验卡组是否合法 */
export function validateDeck(cards: string[], defLookup: (id: string) => CardDef | undefined = (id) => ALL_CARDS.find((c) => c.id === id)): DeckValidationResult {
  const errors: DeckValidationError[] = [];

  // 1) 数量
  if (cards.length !== DECK_RULES.SIZE) {
    errors.push({ code: 'size', expected: DECK_RULES.SIZE, actual: cards.length });
  }

  // 2) 单卡 ≤2 / SSR ≤1
  const count = new Map<string, number>();
  for (const id of cards) count.set(id, (count.get(id) ?? 0) + 1);
  for (const [defId, n] of Array.from(count.entries())) {
    const def = defLookup(defId);
    if (!def) continue;
    const isSSR = def.rarity === 'SSR';
    const cap = isSSR ? DECK_RULES.SSR_CARD_MAX : DECK_RULES.SINGLE_CARD_MAX;
    if (n > cap) {
      if (isSSR) errors.push({ code: 'ssr_exceeded', defId, max: cap, actual: n });
      else errors.push({ code: 'duplicate', defId, max: cap, actual: n });
    }
  }

  // 3) 五类至少各 1
  const typeSet = new Set<string>();
  for (const id of cards) {
    const def = defLookup(id);
    if (def) typeSet.add(def.type);
  }
  for (const t of DECK_RULES.TYPES_REQUIRED) {
    if (!typeSet.has(t)) errors.push({ code: 'missing_type', type: t });
  }

  return { ok: errors.length === 0, errors };
}

/** 错误码 → 中文 */
export function errorText(e: DeckValidationError): string {
  switch (e.code) {
    case 'size':        return `卡组需 ${e.expected} 张，当前 ${e.actual} 张`;
    case 'duplicate':   return `${e.defId} 同名超过 ${e.max} 张（当前 ${e.actual}）`;
    case 'ssr_exceeded':return `${e.defId} 为 SSR，最多 ${e.max} 张（当前 ${e.actual}）`;
    case 'missing_type':
      return `缺少「${
        { character: '角色', item: '道具', equipment: '装备', effect: '消耗', event: '事件' }[e.type] ?? e.type
      }」类型`;
  }
}

// ============ localStorage 持久化 ============

const STORAGE_KEY = 'chenze_tcg_custom_decks_v1';

export interface StoredDeck {
  /** 用户自定义名称，如「速攻压制」 */
  name: string;
  /** 25 张卡 id 列表（可乱序） */
  cards: string[];
  /** 自动填充的元信息 */
  createdAt: number;
  updatedAt: number;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadCustomDecks(): StoredDeck[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is StoredDeck =>
      !!x &&
      typeof x === 'object' &&
      typeof (x as StoredDeck).name === 'string' &&
      Array.isArray((x as StoredDeck).cards) &&
      (x as StoredDeck).cards.every((c) => typeof c === 'string'),
    );
  } catch {
    return [];
  }
}

export function saveCustomDecks(decks: StoredDeck[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
  } catch {
    // quota exceeded 等忽略
  }
}

/** 将 StoredDeck 转为引擎所需 Deck（加上 hero 默认值） */
export function toEngineDeck(stored: StoredDeck): Deck {
  return {
    heroName: stored.name,
    heroPowerId: 'hp_draw1',
    cards: stored.cards,
  };
}

/** 生成新 StoredDeck 默认骨架（空） */
export function makeEmptyDeck(name: string): StoredDeck {
  return { name, cards: [], createdAt: Date.now(), updatedAt: Date.now() };
}
