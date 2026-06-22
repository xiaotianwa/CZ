'use client';

/**
 * HandArea 手牌区 + 结束回合按钮。
 * 从 Battle.tsx 抽出（D2 剩余拆分 · 4/5）；保持渲染结构与样式不变。
 */

import React, { useRef } from 'react';
import Image from 'next/image';
import * as Icons from '@/components/game/GameIcons';
import CardBack from '@/components/game/CardBack';
import { getCardDef } from '@/game/engine';
import type { CardInstance } from '@/game/types';
import { RARITY_COLOR, RARITY_GLOW, getPreset } from './shared';

export interface HandAreaProps {
  hand: CardInstance[];
  /** 当前玩家可用法力（流量），用于判定 playable */
  mana: number;
  /** 对局是否已结束 */
  ended: boolean;
  /** 当前是否处于选中目标中（攻击/消耗牌） */
  isSelecting: boolean;
  /** 当前是否轮到本方操作（hotseat 恒 true；AI/online 视情况） */
  isHumanTurn: boolean;
  /** 当前被选中的手牌 instanceId（pendingPlay），用于高亮 */
  pendingPlayId?: string;
  /** 己方剩余牌库数量；传入则在手牌右端展示卡背 + 数字指示 */
  deckCount?: number;
  /** 是否显示内置结束回合按钮；桌面炉石布局会把按钮放到棋盘右侧 */
  showEndTurn?: boolean;
  onCardClick: (card: CardInstance, e?: React.MouseEvent<HTMLElement>) => void;
  onCardHover: (card: CardInstance | null, rect?: DOMRect) => void;
  onEndTurn: () => void;
}

export function HandArea({
  hand, mana, ended, isSelecting, isHumanTurn, pendingPlayId, deckCount,
  showEndTurn = true,
  onCardClick, onCardHover, onEndTurn,
}: HandAreaProps) {
  return (
    <div data-battle-hand-area="true" className="flex gap-2 shrink-0 sm:gap-3">
      <div className="relative h-[138px] min-w-0 flex-1 rounded-[24px] border border-[#b58b4a]/20 bg-[linear-gradient(180deg,rgba(15,23,42,0.28),rgba(8,12,24,0.86))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_40px_rgba(0,0,0,0.28)] sm:h-[168px] sm:p-2 lg:h-[156px] [@media(max-height:520px)]:h-[110px] [@media(max-height:520px)]:p-1">
        <div className="absolute -top-2 left-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-[#07111f]/95 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.22em] text-cyan-100">
          <Icons.CharacterIcon size={10} /> 手牌 · {hand.length}
        </div>
        <div className="flex h-full items-end justify-center gap-0 overflow-x-auto overflow-y-hidden px-4 pt-2">
          {hand.length === 0 && (
            <div className="m-auto inline-flex items-center gap-2 text-white/30 text-xs">
              <Icons.CharacterIcon size={14} className="text-white/25" />
              <span className="tracking-[0.3em]">没有手牌</span>
            </div>
          )}
          {hand.map((c, index) => {
            const rel = index - (hand.length - 1) / 2;
            const rotate = Math.max(-12, Math.min(12, rel * 3.8));
            const y = Math.abs(rel) * 3;
            return (
              <div
                key={c.instanceId}
                className="shrink-0 first:ml-0 -ml-2 transition-transform duration-200"
                style={{ transform: `rotate(${rotate}deg) translateY(${y}px)`, transformOrigin: '50% 120%' }}
              >
                <HandCard
                  card={c}
                  mana={mana}
                  playable={c.currentCost <= mana && !ended && !isSelecting && isHumanTurn}
                  selected={pendingPlayId === c.instanceId}
                  onClick={(e) => onCardClick(c, e)}
                  onHover={onCardHover}
                />
              </div>
            );
          })}
        </div>
      </div>
      {typeof deckCount === 'number' && (
        <div
          className="hidden h-[138px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[24px] border border-cyan-300/20 bg-black/35 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:h-[168px] lg:flex lg:h-[156px] [@media(max-height:520px)]:h-[110px]"
          title={`牌库剩余 ${deckCount} 张`}
        >
          <CardBack width={96} variant="default" interactive={false} faded={deckCount <= 0} />
          <div className="flex items-baseline gap-1">
            <span className="text-[9px] text-white/50 tracking-[0.25em] font-semibold">牌库</span>
            <b className="text-base text-white/90 tabular-nums leading-none">{deckCount}</b>
          </div>
        </div>
      )}
      {showEndTurn && (
        <button onClick={onEndTurn} disabled={ended || !isHumanTurn}
                className="inline-flex h-[138px] w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-[24px] border border-amber-200/60 bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 font-black text-slate-950 shadow-[0_14px_34px_rgba(245,158,11,0.28),inset_0_1px_0_rgba(255,255,255,0.35)] transition-transform hover:-translate-y-0.5 hover:from-amber-200 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-40 sm:h-[168px] sm:w-24 sm:gap-1 lg:h-[156px] [@media(max-height:520px)]:h-[110px] [@media(max-height:520px)]:w-14">
          <Icons.RestartIcon size={20} className="sm:[&]:w-[22px] sm:[&]:h-[22px]" />
          <span className="text-xs sm:text-sm leading-tight">结束回合</span>
          <span className="text-[9px] sm:text-[10px] opacity-65 tracking-[0.2em]">END</span>
        </button>
      )}
    </div>
  );
}

export interface HandCardProps {
  card: CardInstance;
  mana: number;
  playable: boolean;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLElement>) => void;
  onHover: (card: CardInstance | null, rect?: DOMRect) => void;
}

export function HandCard({ card, mana, playable, selected, onClick, onHover }: HandCardProps) {
  const def = getCardDef(card.defId);
  const preset = getPreset(card.defId);
  const btnRef = useRef<HTMLButtonElement>(null);
  if (!def || !preset) return null;
  const rarity = def.rarity ?? 'N';
  const isMinionOrItem = def.type === 'character' || def.type === 'item';
  const missingMana = Math.max(0, card.currentCost - mana);

  return (
    <button ref={btnRef} onClick={(e) => onClick(e)} disabled={!playable}
            data-hover-anchor="1"
            onMouseEnter={() => btnRef.current && onHover(card, btnRef.current.getBoundingClientRect())}
            onMouseLeave={() => onHover(null)}
            className={`relative shrink-0 block w-[86px] h-[118px] sm:w-[102px] sm:h-[140px] lg:w-[104px] lg:h-[144px] [@media(max-height:520px)]:w-[74px] [@media(max-height:520px)]:h-[98px] rounded-xl overflow-hidden border-[3px] bg-slate-950 ${RARITY_COLOR[rarity]} ${RARITY_GLOW[rarity]} shadow-[0_12px_24px_rgba(0,0,0,0.32)] transition-transform ${
              !playable ? 'opacity-50 grayscale' : 'hover:-translate-y-3'
            } ${selected ? 'ring-4 ring-amber-400 -translate-y-5 scale-105' : ''}`}>
      {/* 形象图 */}
      {preset.imagePath ? (
        <Image src={preset.imagePath} alt={preset.name} fill sizes="110px" className="object-cover" unoptimized />
      ) : (
        <div className="w-full h-full bg-gradient-to-b from-slate-700 to-slate-900" />
      )}
      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/85 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/85 to-transparent" />
      <span className="absolute top-1 left-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-cyan-400 to-blue-700 border-2 border-white/80 flex items-center justify-center text-white text-xs sm:text-sm font-black shadow-lg">
        {card.currentCost}
      </span>
      <span className="absolute top-1 right-1 px-1 rounded bg-black/60 text-white text-[9px] font-black tracking-wider">
        {rarity}
      </span>
      {selected ? (
        <span className="absolute left-1 right-1 top-[48px] sm:top-[56px] [@media(max-height:520px)]:top-[42px] rounded bg-amber-300 px-1 py-0.5 text-center text-[9px] font-black text-slate-950 shadow">
          选目标
        </span>
      ) : playable ? (
        <span className="absolute left-1 right-1 top-[48px] sm:top-[56px] [@media(max-height:520px)]:top-[42px] rounded bg-emerald-300 px-1 py-0.5 text-center text-[9px] font-black text-slate-950 shadow">
          可出
        </span>
      ) : missingMana > 0 ? (
        <span className="absolute left-1 right-1 top-[48px] sm:top-[56px] [@media(max-height:520px)]:top-[42px] rounded bg-slate-950/75 px-1 py-0.5 text-center text-[9px] font-black text-cyan-100 shadow">
          缺 {missingMana} 费
        </span>
      ) : null}
      <div className="absolute top-8 sm:top-9 left-0 right-0 text-center text-white text-[11px] sm:text-xs font-black drop-shadow-[0_1px_2px_black] px-1 truncate">
        {preset.name}
      </div>
      {isMinionOrItem && (
        <div className="absolute bottom-1 left-1 right-1 flex justify-between">
          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-500 to-red-700 border-2 border-white/80 flex items-center justify-center text-white text-xs font-black">
            {preset.attack ?? '-'}
          </span>
          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-green-700 border-2 border-white/80 flex items-center justify-center text-white text-xs font-black">
            {preset.health ?? '-'}
          </span>
        </div>
      )}
      {!isMinionOrItem && (
        <div className="absolute bottom-1 left-0 right-0 flex items-center justify-center gap-1 text-white/85 text-[10px] font-bold">
          {def.type === 'effect' ? (
            <><Icons.EffectIcon size={11} /> 消耗</>
          ) : def.type === 'item' ? (
            <><Icons.ItemIcon size={11} /> 道具</>
          ) : (
            <><Icons.EventIcon size={11} /> 事件</>
          )}
        </div>
      )}
    </button>
  );
}

export interface OpponentHandAreaProps {
  count: number;
  cardWidth?: number;
  maxVisible?: number;
  dim?: boolean;
}

export function OpponentHandArea({
  count,
  cardWidth = 52,
  maxVisible = 8,
  dim = false,
}: OpponentHandAreaProps) {
  const cardHeight = Math.round(cardWidth * (4 / 3));
  const containerH = cardHeight + 10;

  if (count <= 0) {
    return (
      <div
        className="relative flex items-center justify-center gap-2 text-white/25 text-[10px] tracking-[0.3em] uppercase"
        style={{ height: containerH }}
      >
        <Icons.CharacterIcon size={12} className="text-white/20" />
        <span>对手无手牌</span>
      </div>
    );
  }

  const displayCount = Math.min(count, maxVisible);
  const overflow = Math.max(0, count - displayCount);
  const midIdx = (displayCount - 1) / 2;
  const overlap = Math.round(cardWidth * 0.55);
  const angleStep = displayCount > 1 ? 5 : 0;

  return (
    <div
      className={[
        'relative flex items-end justify-center',
        dim ? 'opacity-50 grayscale' : '',
      ].join(' ')}
      style={{ height: containerH }}
      aria-label={`对手手牌 ${count} 张`}
    >
      {Array.from({ length: displayCount }).map((_, i) => {
        const rel = i - midIdx;
        const angle = rel * angleStep;
        const sag = Math.abs(rel) * Math.abs(rel) * 1.5;
        return (
          <div
            key={i}
            className="shrink-0"
            style={{
              marginLeft: i === 0 ? 0 : -overlap,
              transform: `rotate(${angle}deg) translateY(${sag}px)`,
              transformOrigin: '50% 110%',
              zIndex: Math.round(10 - Math.abs(rel) * 2),
            }}
          >
            <CardBack width={cardWidth} variant="default" interactive={false} />
          </div>
        );
      })}
      {overflow > 0 && (
        <div
          className="ml-1 z-20 inline-flex items-center justify-center min-w-[28px] h-[24px] px-1.5 rounded-md bg-slate-950/90 border border-cyan-300/40 text-cyan-100 text-[11px] font-black tabular-nums shadow-lg"
          style={{ alignSelf: 'center' }}
          title={`共 ${count} 张手牌`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
