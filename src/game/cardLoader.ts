/**
 * 前台卡池 live 加载器
 *
 * 职责：
 * 1. 确保硬编码 ALL_CARDS（fallback）已注册到 engine CARD_DB
 * 2. 把后台 `/api/tcg/public/cards` 的 live 卡合并进 CARD_DB（覆盖同 id）
 * 3. 提供 `ensureLiveCardsReady` —— Battle 组件可 await 它确保 engine 数据最新
 *
 * 合并策略（DB 为权威源）：
 *   - name / cost / attack / health / description / flavor → DB 优先
 *   - effects / keywords → DB 优先（非空时）
 *   - 硬编码里有但 DB 没同 id 的卡（如硬编码 40 张，DB 只有 30 张）→ 保留硬编码
 *   - DB 新增的卡（硬编码没有）→ 直接追加
 *
 * 性能：
 *   - sessionStorage 缓存 5 分钟（useCardPresets 已实现）
 *   - `ensureLiveCardsReady` 幂等，二次调用直接 resolve 已解析结果
 *   - fetch 失败时降级到硬编码卡池，不阻塞游戏
 */

import { ALL_CARDS, registerAllCards } from './cards';
import { registerCard, getCardDef } from './engine';
import type { CardDef, EffectHook, Keyword } from './types';
import type { CardPreset } from '@/data/cardPresets';

// ================== 硬编码注册（等价于原 useGame.ensureRegistered） ==================

let hardcodedRegistered = false;
function ensureHardcodedRegistered(): void {
  if (hardcodedRegistered) return;
  try { registerAllCards(); } catch { /* 已注册会抛，忽略 */ }
  hardcodedRegistered = true;
}

// ================== live 合并 ==================

let liveReadyPromise: Promise<void> | null = null;
let liveMerged = false;

/** 可用于外部查询 live 是否已就绪（控制 UI loading） */
export function isLiveCardsReady(): boolean {
  return liveMerged;
}

/**
 * 保证 engine CARD_DB 至少有硬编码卡 + 尽量拿到 live 覆盖。
 *
 * 返回的 Promise：
 *  - 立即注册硬编码（同步）
 *  - 异步 fetch live，拿到后合并（覆盖）
 *  - 最长等待 3 秒：超时则 resolve 并 flag merged=false（后续仍会后台继续尝试）
 */
export function ensureLiveCardsReady(timeoutMs = 3000): Promise<void> {
  // 同步部分：硬编码一定要先进 CARD_DB（保证 engine 最小可用）
  ensureHardcodedRegistered();

  if (liveReadyPromise) return liveReadyPromise;

  liveReadyPromise = (async () => {
    // SSR 环境不 fetch
    if (typeof window === 'undefined') return;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch('/api/tcg/public/cards', {
        cache: 'force-cache',
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return;
      const json = await res.json();
      if (!json || json.code !== 0) return;
      const livePresets = (json.data?.cards ?? []) as CardPreset[];
      if (livePresets.length === 0) return;
      mergeLivePresetsIntoEngine(livePresets);
      liveMerged = true;
    } catch {
      clearTimeout(timer);
      // 静默降级：ALL_CARDS 已注册，游戏可用
    }
  })();

  return liveReadyPromise;
}

/**
 * 把一批 live CardPreset 合并进 engine CARD_DB。
 *
 * 同步执行 —— 外部调用方可手动在需要时 merge（如 Battle 的 livePresets 变化时 hot-merge）。
 */
export function mergeLivePresetsIntoEngine(livePresets: CardPreset[]): void {
  ensureHardcodedRegistered();

  for (const preset of livePresets) {
    const existing = getCardDef(preset.id);
    const merged: CardDef = {
      // 先铺硬编码（若存在）
      ...(existing ?? emptyCardDefFallback(preset)),
      // 再用 live 覆盖（保留 existing 没覆盖的字段，如 countdown/secretTrigger 等）
      id: preset.id,
      name: preset.name || existing?.name || preset.id,
      type: preset.type,
      subtype: preset.subtype ?? existing?.subtype,
      rarity: preset.rarity,
      cost: preset.cost ?? existing?.cost ?? 0,
      attack: preset.attack ?? existing?.attack,
      health: preset.health ?? existing?.health,
      description: preset.description ?? existing?.description,
      flavor: preset.flavor ?? existing?.flavor,
      // effects / keywords / synergies：DB 非空时覆盖；DB 为空/未提供则保留硬编码
      effects: preset.effects && preset.effects.length > 0
        ? (preset.effects as EffectHook[])
        : existing?.effects,
      keywords: preset.keywords && preset.keywords.length > 0
        ? (preset.keywords as Keyword[])
        : existing?.keywords,
      synergies: preset.synergies && preset.synergies.length > 0
        ? preset.synergies
        : existing?.synergies,
    };
    registerCard(merged);
  }
}

/**
 * 当 CARD_DB 没有对应 id 的硬编码 fallback 时，构造一个最小可用 CardDef。
 * 目的：让 live-only 的新卡（硬编码没有）也能被 engine 识别。
 */
function emptyCardDefFallback(preset: CardPreset): CardDef {
  return {
    id: preset.id,
    name: preset.name,
    type: preset.type,
    rarity: preset.rarity,
    cost: preset.cost ?? 0,
  };
}

// 导出硬编码数组让消费者可以检查（调试用）
export { ALL_CARDS };
