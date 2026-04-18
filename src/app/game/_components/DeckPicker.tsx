'use client';

/**
 * 共享卡组选择器：同时展示预设卡组（ALL_DECKS）和玩家自建卡组（localStorage）
 * - 用 DeckOptionKey 区分 `preset:<id>` / `custom:<index>`
 * - 自建卡组若非法（未通过 validateDeck）将显示红色角标，且选中后 Battle 自动取合法长度（已校验不让选）
 */

import React, { useMemo } from 'react';
import { useDeckPresets, type DeckOption } from '@/lib/tcg/useCardPresets';
import { useCustomDecks } from '@/lib/tcg/useCustomDecks';
import {
  validateDeck,
  toEngineDeck,
  type StoredDeck,
} from '@/game/deck-builder';
import type { Deck } from '@/game/types';

export type DeckOptionKey =
  | { kind: 'preset'; key: string }
  | { kind: 'custom'; index: number };

export function sameKey(a: DeckOptionKey, b: DeckOptionKey): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'preset' && b.kind === 'preset') return a.key === b.key;
  if (a.kind === 'custom' && b.kind === 'custom') return a.index === b.index;
  return false;
}

export interface DeckOptions {
  /** 解析 key 到实际 Deck；自建卡组非法时回退到首个预设 */
  resolve: (key: DeckOptionKey) => Deck;
  presets: readonly DeckOption[];
  customs: StoredDeck[];
  customValidations: boolean[];
}

/** Hook：加载所有可用卡组（后台预设 + 用户自建）
 *
 * B3：用户自建卡组自动按登录态决定来源：
 *  - 已登录 → /api/tcg/decks（服务端）
 *  - 未登录 → localStorage
 */
export function useAllDeckOptions(): DeckOptions {
  const presets = useDeckPresets();
  const { decks: customs } = useCustomDecks();

  const customValidations = useMemo(
    () => customs.map((d) => validateDeck(d.cards).ok),
    [customs],
  );

  const resolve = useMemo(() => (key: DeckOptionKey): Deck => {
    if (key.kind === 'preset') {
      const found = presets.find((d) => d.key === key.key);
      return found?.deck ?? presets[0]?.deck ?? { heroName: '玩家', heroPowerId: 'hp_draw1', cards: [] };
    }
    const stored = customs[key.index];
    const fallback = presets[0]?.deck ?? { heroName: '玩家', heroPowerId: 'hp_draw1', cards: [] };
    if (!stored) return fallback;
    if (!validateDeck(stored.cards).ok) return fallback;
    return toEngineDeck(stored);
  }, [customs, presets]);

  return { resolve, presets, customs, customValidations };
}

export interface DeckPickerProps {
  label: string;
  value: DeckOptionKey;
  onChange: (next: DeckOptionKey) => void;
  options: DeckOptions;
}

export function DeckPicker({ label, value, onChange, options }: DeckPickerProps) {
  const hasCustoms = options.customs.length > 0;
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-white/85 font-semibold mb-3 text-sm tracking-wide">{label}</div>
      <div className="space-y-2">
        {options.presets.map((d) => {
          const key: DeckOptionKey = { kind: 'preset', key: d.key };
          const active = sameKey(value, key);
          return (
            <DeckOptionRow
              key={`p-${d.key}`}
              label={d.label}
              active={active}
              onClick={() => onChange(key)}
            />
          );
        })}
        {hasCustoms && (
          <div className="pt-1 mt-1 border-t border-white/10">
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/45 mb-1.5 px-1">
              自建卡组
            </div>
            {options.customs.map((d, i) => {
              const key: DeckOptionKey = { kind: 'custom', index: i };
              const active = sameKey(value, key);
              const legal = options.customValidations[i];
              return (
                <DeckOptionRow
                  key={`c-${i}`}
                  label={`📦 ${d.name}（${d.cards.length}）`}
                  active={active}
                  disabled={!legal}
                  disabledHint="卡组不合法"
                  onClick={() => {
                    if (!legal) return;
                    onChange(key);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DeckOptionRow({ label, active, disabled, disabledHint, onClick }: {
  label: string;
  active: boolean;
  disabled?: boolean;
  disabledHint?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={disabled ? disabledHint : undefined}
      className={[
        'w-full text-left px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors duration-200 border flex items-center justify-between',
        active
          ? 'bg-gradient-to-r from-[#7C3AED]/80 to-[#A855F7]/70 text-white border-[#A78BFA]/50 shadow-[0_0_14px_-4px_rgba(124,58,237,0.7)] font-bold'
          : 'bg-white/[0.04] hover:bg-[#7C3AED]/10 text-white/70 hover:text-white border-white/5 hover:border-[#A78BFA]/30',
        disabled ? 'opacity-40 cursor-not-allowed hover:bg-white/[0.04]' : '',
      ].join(' ')}
    >
      <span className="truncate">{label}</span>
      {disabled && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-200 border border-rose-500/40 whitespace-nowrap ml-2">
          非法
        </span>
      )}
    </button>
  );
}
