'use client';

/**
 * HandArea 手牌区 + 结束回合按钮。
 * 从 Battle.tsx 抽出（D2 剩余拆分 · 4/5）；保持渲染结构与样式不变。
 */

import React, { useRef } from 'react';
import Image from 'next/image';
import * as Icons from '@/components/game/GameIcons';
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
  onCardClick: (card: CardInstance, e?: React.MouseEvent<HTMLElement>) => void;
  onCardHover: (card: CardInstance | null, rect?: DOMRect) => void;
  onEndTurn: () => void;
}

export function HandArea({
  hand, mana, ended, isSelecting, isHumanTurn, pendingPlayId,
  onCardClick, onCardHover, onEndTurn,
}: HandAreaProps) {
  return (
    <div className="flex gap-1.5 sm:gap-2 shrink-0">
      <div className="relative flex-1 rounded-xl p-1.5 sm:p-2 h-[138px] sm:h-[168px] [@media(max-height:520px)]:h-[110px] [@media(max-height:520px)]:p-1 bg-gradient-to-t from-[#7C3AED]/[0.08] via-slate-900/30 to-slate-900/10 border border-[#A78BFA]/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] min-w-0">
        <div className="absolute -top-2 left-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900/95 border border-[#A78BFA]/25 text-[10px] font-bold text-[#A78BFA] tracking-[0.25em] uppercase z-10">
          <Icons.CharacterIcon size={10} /> Hand · {hand.length}
        </div>
        <div className="flex gap-2 overflow-x-auto items-end h-full pt-1.5">
          {hand.length === 0 && (
            <div className="m-auto inline-flex items-center gap-2 text-white/30 text-xs">
              <Icons.CharacterIcon size={14} className="text-white/25" />
              <span className="tracking-[0.3em] uppercase">no hand</span>
            </div>
          )}
          {hand.map((c) => (
            <HandCard key={c.instanceId} card={c}
                      playable={c.currentCost <= mana && !ended && !isSelecting && isHumanTurn}
                      selected={pendingPlayId === c.instanceId}
                      onClick={(e) => onCardClick(c, e)}
                      onHover={onCardHover} />
          ))}
        </div>
      </div>
      <button onClick={onEndTurn} disabled={ended || !isHumanTurn}
              className="inline-flex flex-col items-center justify-center gap-0.5 sm:gap-1 shrink-0 w-16 sm:w-24 [@media(max-height:520px)]:w-14 h-[138px] sm:h-[168px] [@media(max-height:520px)]:h-[110px] bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-black rounded-xl shadow-[0_6px_24px_-6px_rgba(245,158,11,0.6)] cursor-pointer transition-transform hover:-translate-y-0.5">
        <Icons.RestartIcon size={20} className="sm:[&]:w-[22px] sm:[&]:h-[22px]" />
        <span className="text-xs sm:text-sm leading-tight">结束回合</span>
        <span className="text-[9px] sm:text-[10px] opacity-70 tracking-[0.2em]">END</span>
      </button>
    </div>
  );
}

export interface HandCardProps {
  card: CardInstance;
  playable: boolean;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLElement>) => void;
  onHover: (card: CardInstance | null, rect?: DOMRect) => void;
}

export function HandCard({ card, playable, selected, onClick, onHover }: HandCardProps) {
  const def = getCardDef(card.defId);
  const preset = getPreset(card.defId);
  const btnRef = useRef<HTMLButtonElement>(null);
  if (!def || !preset) return null;
  const rarity = def.rarity ?? 'N';
  const isMinionOrItem = def.type === 'character' || def.type === 'item';

  return (
    <button ref={btnRef} onClick={(e) => onClick(e)} disabled={!playable}
            data-hover-anchor="1"
            onMouseEnter={() => btnRef.current && onHover(card, btnRef.current.getBoundingClientRect())}
            onMouseLeave={() => onHover(null)}
            className={`relative shrink-0 block w-[86px] h-[118px] sm:w-[102px] sm:h-[140px] [@media(max-height:520px)]:w-[74px] [@media(max-height:520px)]:h-[98px] rounded-lg overflow-hidden border-[3px] ${RARITY_COLOR[rarity]} ${RARITY_GLOW[rarity]} transition-transform ${
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
