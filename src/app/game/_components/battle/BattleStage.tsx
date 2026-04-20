'use client';

/**
 * BattleStage 战场组件：BoardRow（场地）+ MinionCard（单位卡）。
 * 从 Battle.tsx 抽出（D2 剩余拆分 · 3/5）；保持渲染结构与所有样式不变。
 */

import React from 'react';
import Image from 'next/image';
import * as Icons from '@/components/game/GameIcons';
import { getCardDef } from '@/game/engine';
import type { Minion, PlayerId } from '@/game/types';
import { RARITY_COLOR, RARITY_GLOW, KW_ICON, getPreset } from './shared';

export interface BoardRowProps {
  minions: Minion[];
  owner: PlayerId;
  onClick: (m: Minion, e: React.MouseEvent<HTMLElement>) => void;
  onHover: (m: Minion | null, rect?: DOMRect) => void;
  legalMinions: Set<string>;
  isSelecting: boolean;
  selectedId?: string;
  attackableSet?: Set<string>;
}

export function BoardRow({
  minions, owner, onClick, onHover, legalMinions, isSelecting, selectedId, attackableSet,
}: BoardRowProps) {
  return (
    <div className={`relative flex gap-1.5 sm:gap-3 h-full min-h-[92px] sm:min-h-[100px] [@media(max-height:520px)]:min-h-0 rounded-xl p-1.5 sm:p-3 [@media(max-height:520px)]:p-1 transition-all ${
      minions.length === 0
        ? 'bg-gradient-to-b from-white/[0.02] via-white/[0.04] to-white/[0.02] border border-dashed border-white/10'
        : 'bg-gradient-to-b from-white/[0.04] via-white/[0.06] to-white/[0.04] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
    } ${isSelecting ? 'ring-1 ring-white/20' : ''}`}>
      {minions.length === 0 && (
        <div className="relative m-auto flex flex-col items-center gap-1.5 text-white/25">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full border-2 border-dashed border-white/20 bg-white/[0.02]">
            <Icons.CharacterIcon size={18} className="text-white/30" />
          </div>
          <div className="text-[11px] font-medium tracking-[0.3em] uppercase">no minion</div>
        </div>
      )}
      {minions.map((m) => {
        const targetable = legalMinions.has(m.instanceId);
        const dimmed = isSelecting && !targetable;
        const attackable = attackableSet?.has(m.instanceId);
        return (
          <MinionCard key={m.instanceId} minion={m} owner={owner}
                      onClick={(e) => onClick(m, e)}
                      onHover={onHover}
                      selected={selectedId === m.instanceId}
                      targetable={targetable}
                      dimmed={dimmed}
                      attackable={attackable} />
        );
      })}
    </div>
  );
}

export interface MinionCardProps {
  minion: Minion;
  owner: PlayerId;
  onClick: (e: React.MouseEvent<HTMLElement>) => void;
  onHover: (m: Minion | null, rect?: DOMRect) => void;
  selected: boolean;
  targetable: boolean;
  dimmed: boolean;
  attackable?: boolean;
}

export function MinionCard({
  minion, onClick, onHover, selected, targetable, dimmed, attackable,
}: MinionCardProps) {
  const def = getCardDef(minion.defId);
  const preset = getPreset(minion.defId);
  const rarity = def?.rarity ?? 'N';
  const kwArr = Array.from(minion.keywords);
  const hasTaunt = minion.keywords.has('taunt') && !minion.silenced;

  return (
    <button onClick={(e) => onClick(e)}
            onMouseEnter={(e) => onHover(minion, (e.currentTarget as HTMLElement).getBoundingClientRect())}
            onMouseLeave={() => onHover(null)}
            data-minion-id={minion.instanceId}
            data-hover-anchor="1"
            className={`relative w-[96px] h-[124px] sm:w-[116px] sm:h-[148px] lg:w-[140px] lg:h-[184px] [@media(max-height:720px)]:w-[116px] [@media(max-height:720px)]:h-[148px] [@media(max-height:520px)]:w-[70px] [@media(max-height:520px)]:h-[88px] rounded-lg overflow-hidden border-[3px] animate-summon-in ${RARITY_COLOR[rarity]} ${RARITY_GLOW[rarity]} transition-all ${
              selected ? 'ring-4 ring-amber-400 -translate-y-2 scale-105' : ''
            } ${targetable ? 'ring-4 ring-emerald-400 animate-pulse' : ''} ${
              dimmed ? 'opacity-30 grayscale' : 'hover:-translate-y-1'
            } ${minion.summoningSickness ? 'opacity-60' : ''} ${attackable ? 'ring-2 ring-cyan-400/60' : ''}`}
            title={def ? `${def.name}\n${def.description ?? ''}` : minion.defId}>
      {/* 主图形象 */}
      {preset?.imagePath ? (
        <Image src={preset.imagePath} alt={preset.name} fill sizes="110px" className="object-cover" unoptimized />
      ) : (
        <div className="w-full h-full bg-gradient-to-b from-slate-600 to-slate-800" />
      )}
      {/* 顶部渐变压暗便于显示文字 */}
      <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/70 to-transparent" />
      {/* 底部渐变压暗 */}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/85 via-black/50 to-transparent" />

      {/* 挡枪外圈 */}
      {hasTaunt && (
        <div className="absolute inset-0 rounded-lg border-2 border-stone-300 border-dashed pointer-events-none" />
      )}

      {/* 名称 */}
      <div className="absolute top-0.5 left-1 right-1 text-[10px] sm:text-[11px] font-black text-white truncate drop-shadow">
        {def?.name ?? minion.defId}
      </div>

      {/* 关键字图标 */}
      <div className="absolute top-5 left-1 flex flex-wrap gap-0.5 max-w-[70%]">
        {kwArr.map((k) => {
          const info = KW_ICON[k];
          if (!info) return null;
          const Ico = info.Icon;
          return (
            <span key={k}
                  className={`inline-flex items-center justify-center w-4 h-4 bg-black/60 rounded ${info.color}`}
                  title={info.zh}>
              <Ico size={10} />
            </span>
          );
        })}
      </div>

      {/* 状态图标 */}
      {minion.divineShieldActive && (
        <div className="absolute top-5 right-1 text-yellow-300 animate-pulse drop-shadow" title="粉丝盾">
          <Icons.DivineShieldIcon size={14} />
        </div>
      )}
      {minion.silenced && (
        <div className="absolute top-5 right-1 text-slate-300 drop-shadow" title="沉默">
          <Icons.CloseIcon size={14} />
        </div>
      )}
      {minion.rebornAvailable && !minion.silenced && (
        <div className="absolute top-5 right-1 text-emerald-300" title="复出">
          <Icons.RebornIcon size={13} />
        </div>
      )}

      {/* 攻击/血量 */}
      <div className="absolute bottom-0.5 left-0 right-0 flex justify-between px-1.5 text-base font-black">
        <span className="bg-gradient-to-br from-rose-500 to-red-700 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm border border-white/80 shadow">
          {minion.attack}
        </span>
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-sm border border-white/80 shadow ${
          minion.health < minion.maxHealth
            ? 'bg-gradient-to-br from-orange-500 to-red-800'
            : 'bg-gradient-to-br from-emerald-400 to-green-700'
        }`}>
          {minion.health}
        </span>
      </div>
    </button>
  );
}
