'use client';

/**
 * 实时卡池 / 预设卡组 hook
 *
 * 设计要点：
 * - **SSR 与首次 render**：返回静态 `CARD_PRESETS` / `ALL_DECKS` 作为 fallback，
 *   保证页面立即可用，无 loading 抖动。
 * - **客户端 mount 后**：异步 fetch `/api/tcg/public/{cards,deck-presets}`，
 *   拿到 live 数据后 setState 替换。
 * - **缓存**：sessionStorage 5 分钟 TTL，避免每次跳页重复请求。
 * - **降级**：fetch 失败保持使用静态 fallback，不阻断游戏。
 *
 * 让运营在 /tcg-admin 改卡，前台在最坏 5 分钟内（HTTP 缓存 + sessionStorage）生效。
 */

import { useEffect, useMemo, useState } from 'react';
import { CARD_PRESETS, type CardPreset } from '@/data/cardPresets';
import { ALL_DECKS } from '@/game/decks';

const CARDS_CACHE_KEY = 'chenze_tcg_live_cards_v1';
const DECKS_CACHE_KEY = 'chenze_tcg_live_decks_v1';
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedPayload<T> {
  data: T;
  ts: number;
}

function readCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload<T>;
    if (!parsed || typeof parsed.ts !== 'number') return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() } satisfies CachedPayload<T>));
  } catch {
    /* 配额满 / 隐私模式下忽略 */
  }
}

// =================== 卡池 ===================

/**
 * 返回**永不为空**的卡池列表。
 * SSR 期间和首屏直接返回静态 CARD_PRESETS；客户端 hydrate 后异步刷新为 live 数据。
 */
export function useCardPresets(): CardPreset[] {
  const [live, setLive] = useState<CardPreset[] | null>(null);

  useEffect(() => {
    // 客户端 mount 后先尝试读取缓存（避免 SSR hydration 不一致）
    const cached = readCache<CardPreset[]>(CARDS_CACHE_KEY);
    if (cached && cached.length > 0) setLive(cached);

    let cancelled = false;
    fetch('/api/tcg/public/cards', { cache: 'force-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled || !json || json.code !== 0) return;
        const fresh = (json.data?.cards ?? []) as CardPreset[];
        if (fresh.length > 0) {
          setLive(fresh);
          writeCache(CARDS_CACHE_KEY, fresh);
        }
      })
      .catch(() => {
        /* 静默降级到 fallback */
      });
    return () => { cancelled = true; };
  }, []);

  return live && live.length > 0 ? live : CARD_PRESETS;
}

/** 等价 findPreset(id)，但作用于 live 列表 */
export function findInPresets(presets: CardPreset[], id: string): CardPreset | undefined {
  const upper = id.toUpperCase();
  return presets.find((p) => p.id.toUpperCase() === upper);
}

/** Hook + 内置 PRESET_MAP（消费方常需要 id → preset 字典） */
export function useCardPresetsWithMap(): { presets: CardPreset[]; map: Record<string, CardPreset> } {
  const presets = useCardPresets();
  const map = useMemo(() => {
    const m: Record<string, CardPreset> = {};
    for (const p of presets) m[p.id] = p;
    return m;
  }, [presets]);
  return { presets, map };
}

// =================== 预设卡组 ===================

export interface DeckOption {
  key: string;
  label: string;
  deck: {
    heroName: string;
    heroPowerId: string;
    cards: string[];
  };
}

/**
 * 返回预设卡组列表。SSR fallback 到静态 ALL_DECKS。
 */
export function useDeckPresets(): readonly DeckOption[] {
  const [live, setLive] = useState<DeckOption[] | null>(null);

  useEffect(() => {
    // 客户端 mount 后先尝试读取缓存（避免 SSR hydration 不一致）
    const cached = readCache<DeckOption[]>(DECKS_CACHE_KEY);
    if (cached && cached.length > 0) setLive(cached);

    let cancelled = false;
    fetch('/api/tcg/public/deck-presets', { cache: 'force-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled || !json || json.code !== 0) return;
        const fresh = (json.data?.presets ?? []) as DeckOption[];
        if (fresh.length > 0) {
          setLive(fresh);
          writeCache(DECKS_CACHE_KEY, fresh);
        }
      })
      .catch(() => {
        /* 静默降级 */
      });
    return () => { cancelled = true; };
  }, []);

  if (live && live.length > 0) return live;
  // ALL_DECKS 是 readonly 元组，TS 兼容 DeckOption[]（结构化）
  return ALL_DECKS as unknown as readonly DeckOption[];
}
