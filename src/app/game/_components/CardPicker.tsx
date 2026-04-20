'use client';

/**
 * 自选卡牌组件：从全卡池选牌组建 35 张卡组
 * 用于对战/练习前选卡
 */

import React, { useCallback, useMemo, useState } from 'react';
import { ALL_CARDS } from '@/game/cards';
import { DECK_RULES } from '@/game/deck-builder';
import type { CardDef, CardType, Deck } from '@/game/types';

const TYPE_LABELS: Record<CardType, string> = {
  character: '🎤 角色',
  item: '🥤 道具',
  equipment: '⚔️ 装备',
  effect: '✨ 消耗',
  event: '⚡ 事件',
};
const TYPE_COLORS: Record<CardType, string> = {
  character: 'bg-violet-500/20 border-violet-500/40 text-violet-300',
  item: 'bg-sky-500/20 border-sky-500/40 text-sky-300',
  equipment: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
  effect: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
  event: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
};
const RARITY_COLORS: Record<string, string> = {
  N: 'text-slate-400',
  R: 'text-sky-400',
  SR: 'text-fuchsia-400',
  SSR: 'text-amber-400',
};

export interface CardPickerProps {
  /** 当选牌完成后的回调 */
  onConfirm: (deck: Deck) => void;
  onCancel: () => void;
}

export function CardPicker({ onConfirm, onCancel }: CardPickerProps) {
  const [selected, setSelected] = useState<Map<string, number>>(new Map());
  const [filterType, setFilterType] = useState<CardType | 'all'>('all');

  const totalCards = useMemo(() => {
    let sum = 0;
    Array.from(selected.values()).forEach((n) => { sum += n; });
    return sum;
  }, [selected]);

  const filteredCards = useMemo(() => {
    if (filterType === 'all') return ALL_CARDS;
    return ALL_CARDS.filter((c) => c.type === filterType);
  }, [filterType]);

  const addCard = useCallback((card: CardDef) => {
    setSelected((prev) => {
      const cur = prev.get(card.id) ?? 0;
      const max = card.rarity === 'SSR' ? DECK_RULES.SSR_CARD_MAX : DECK_RULES.SINGLE_CARD_MAX;
      if (cur >= max) return prev;
      let total = 0;
      Array.from(prev.values()).forEach((n) => { total += n; });
      if (total >= DECK_RULES.SIZE) return prev;
      const next = new Map(prev);
      next.set(card.id, cur + 1);
      return next;
    });
  }, []);

  const removeCard = useCallback((cardId: string) => {
    setSelected((prev) => {
      const cur = prev.get(cardId) ?? 0;
      if (cur <= 0) return prev;
      const next = new Map(prev);
      if (cur === 1) next.delete(cardId);
      else next.set(cardId, cur - 1);
      return next;
    });
  }, []);

  const handleConfirm = () => {
    const cards: string[] = [];
    Array.from(selected.entries()).forEach(([id, count]) => {
      for (let i = 0; i < count; i++) cards.push(id);
    });
    onConfirm({
      heroName: '自选卡组',
      heroPowerId: 'hp_draw1',
      cards,
    });
  };

  // 按类型统计
  const typeCount = useMemo(() => {
    const tc: Partial<Record<CardType, number>> = {};
    Array.from(selected.entries()).forEach(([id, count]) => {
      const card = ALL_CARDS.find((c) => c.id === id);
      if (card) tc[card.type] = (tc[card.type] ?? 0) + count;
    });
    return tc;
  }, [selected]);

  return (
    <div className="max-w-5xl mx-auto">
      {/* 顶部状态栏 */}
      <div className="sticky top-16 z-30 glass-card rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-lg">
            {totalCards} / {DECK_RULES.SIZE}
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {(Object.keys(TYPE_LABELS) as CardType[]).map((t) => (
              <span key={t} className="text-[10px] text-white/50">
                {TYPE_LABELS[t].slice(2)}: {typeCount[t] ?? 0}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg text-sm border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors cursor-pointer"
          >
            返回
          </button>
          <button
            onClick={handleConfirm}
            disabled={totalCards !== DECK_RULES.SIZE}
            className={[
              'px-4 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer',
              totalCards === DECK_RULES.SIZE
                ? 'bg-gradient-to-r from-[#7C3AED] to-[#F43F5E] text-white shadow-[0_0_16px_rgba(124,58,237,0.5)]'
                : 'bg-white/10 text-white/30 cursor-not-allowed',
            ].join(' ')}
          >
            确认卡组
          </button>
        </div>
      </div>

      {/* 类型筛选 */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        <button
          onClick={() => setFilterType('all')}
          className={[
            'px-3 py-1 rounded-lg text-xs cursor-pointer transition-colors border',
            filterType === 'all'
              ? 'bg-white/15 border-white/30 text-white font-bold'
              : 'bg-white/5 border-white/10 text-white/60 hover:text-white',
          ].join(' ')}
        >
          全部
        </button>
        {(Object.keys(TYPE_LABELS) as CardType[]).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={[
              'px-3 py-1 rounded-lg text-xs cursor-pointer transition-colors border',
              filterType === t
                ? `${TYPE_COLORS[t]} font-bold`
                : 'bg-white/5 border-white/10 text-white/60 hover:text-white',
            ].join(' ')}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* 卡牌网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {filteredCards.map((card) => {
          const count = selected.get(card.id) ?? 0;
          const max = card.rarity === 'SSR' ? DECK_RULES.SSR_CARD_MAX : DECK_RULES.SINGLE_CARD_MAX;
          const isFull = count >= max || totalCards >= DECK_RULES.SIZE;
          return (
            <div
              key={card.id}
              className={[
                'relative rounded-xl border p-3 transition-all duration-150',
                count > 0
                  ? 'border-[#A78BFA]/60 bg-[#7C3AED]/15 shadow-[0_0_12px_-4px_rgba(124,58,237,0.5)]'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]',
              ].join(' ')}
            >
              {/* 选中数量徽章 */}
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#7C3AED] text-white text-[10px] font-bold flex items-center justify-center shadow-lg">
                  {count}
                </span>
              )}

              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold ${RARITY_COLORS[card.rarity]}`}>
                  {card.rarity}
                </span>
                <span className="text-[10px] text-white/40">{card.id}</span>
              </div>

              <h4 className="text-sm font-semibold text-white truncate mb-1">{card.name}</h4>

              <div className="flex items-center gap-2 text-[10px] text-white/50 mb-2">
                <span className={`px-1.5 py-0.5 rounded border ${TYPE_COLORS[card.type]}`}>
                  {TYPE_LABELS[card.type].slice(2)}
                </span>
                <span>💧{card.cost}</span>
                {card.attack != null && <span>⚔️{card.attack}</span>}
                {card.health != null && <span>❤️{card.health}</span>}
              </div>

              {card.description && (
                <p className="text-[10px] text-white/40 line-clamp-2 mb-2">{card.description}</p>
              )}

              <div className="flex gap-1">
                <button
                  onClick={() => addCard(card)}
                  disabled={isFull && count < max}
                  className={[
                    'flex-1 py-1 rounded text-xs font-bold cursor-pointer transition-colors',
                    !isFull || count < max
                      ? 'bg-[#7C3AED]/30 text-[#A78BFA] hover:bg-[#7C3AED]/50'
                      : 'bg-white/5 text-white/20 cursor-not-allowed',
                  ].join(' ')}
                >
                  +
                </button>
                {count > 0 && (
                  <button
                    onClick={() => removeCard(card.id)}
                    className="flex-1 py-1 rounded text-xs font-bold cursor-pointer bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors"
                  >
                    −
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
