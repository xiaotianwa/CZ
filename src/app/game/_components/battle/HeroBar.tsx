'use client';

/**
 * HeroBar 玩家栏（头像 / HP / 流量 / 装备 / 技能 / 事件槽）。
 * 从 Battle.tsx 抽出（D2 剩余拆分 · 2/5）；保持渲染结构与所有样式不变。
 *
 * 对应 TODO 里的 "PlayerBar.tsx（头像 / 流量 / 技能）"，
 * 为延续既有命名约定（Battle.tsx 里叫 HeroBar），此处沿用 HeroBar。
 */

import React from 'react';
import * as Icons from '@/components/game/GameIcons';
import CardBack from '@/components/game/CardBack';
import { getCardDef } from '@/game/engine';
import type { EventCard, PlayerState } from '@/game/types';

export interface HeroBarProps {
  player: PlayerState;
  side: 'me' | 'opp';
  onClick: () => void;
  targetable: boolean;
  onHeroAttack?: (e?: React.MouseEvent<HTMLElement>) => void;
  onHeroPower?: () => void;
  heroPowerAvailable?: boolean;
  flashKey: number;
  /** 布局变体。bar=原横向条（默认，用于 hotseat 等旧布局）；corner=左上/左下角落紧凑竖排版 */
  variant?: 'bar' | 'corner';
}

export function HeroBar(props: HeroBarProps) {
  if (props.variant === 'corner') return <HeroCorner {...props} />;
  return <HeroStrip {...props} />;
}

function HeroStrip({
  player, side, onClick, targetable, onHeroAttack, onHeroPower, heroPowerAvailable, flashKey,
}: HeroBarProps) {
  // 配色：己方冷色、对方暖色
  const accent = side === 'me'
    ? 'from-emerald-500 via-emerald-600 to-teal-800'
    : 'from-rose-500 via-rose-600 to-rose-900';
  const hpMax = player.hpMax || 40;
  const hpPct = Math.max(0, Math.min(100, (player.hp / hpMax) * 100));
  const manaPct = player.manaMax > 0 ? (player.mana / player.manaMax) * 100 : 0;
  return (
    <div className={`relative flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-slate-900/85 via-slate-900/70 to-slate-900/85 rounded-xl p-1.5 sm:p-2 [@media(max-height:520px)]:p-1 [@media(max-height:520px)]:gap-1.5 border transition-all ${
      targetable
        ? 'border-emerald-400 shadow-[0_0_28px_rgba(52,211,153,0.55)] animate-pulse'
        : side === 'me'
          ? 'border-emerald-500/25 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.08)]'
          : 'border-rose-500/25 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.08)]'
    }`}>
      {/* 玩家头像 + HP */}
      <button onClick={onClick}
              data-hero-id={player.id}
              className={`group relative w-12 h-12 sm:w-14 sm:h-14 [@media(max-height:520px)]:w-10 [@media(max-height:520px)]:h-10 shrink-0 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-white border-2 border-white/25 transition-transform cursor-pointer ${targetable ? 'scale-110 ring-4 ring-emerald-400/50' : 'hover:scale-105'}`}
              title={`${player.id === 'P1' ? '玩家 1' : '玩家 2'}  HP ${player.hp}/${hpMax}`}>
        {/* 头像符号 */}
        <span className="font-display tracking-tight text-lg sm:text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{player.id}</span>
        {/* HP 徽章 */}
        <span key={flashKey}
              className="absolute -bottom-1.5 -right-1.5 inline-flex items-center gap-0.5 bg-slate-900 rounded-full px-1 py-0 text-[10px] sm:text-xs font-black text-white border border-white/90 shadow-lg animate-[hppulse_0.5s_ease]">
          <Icons.HealthIcon size={10} className="text-rose-400" />
          <span className="tabular-nums">{player.hp}</span>
        </span>
      </button>

      {/* 信息区 */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        {/* 第一行：玩家信息 + 数值 pill 群 */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-white font-bold text-sm sm:text-base tracking-wide mr-1">
            {player.id === 'P1' ? '玩家 1' : '玩家 2'}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-white/50 font-medium">
            <MiniDeckStack count={player.deck.length} />
            <span className="text-white/20">·</span>
            手牌 <b className="text-white/70 tabular-nums">{player.hand.length}</b>
          </span>
          {player.overloadNext > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-200 font-semibold" title="下回合流量会被扣减">
              透支 {player.overloadNext}
            </span>
          )}
          {/* 间隔符 */}
          <span className="flex-1" />
          {/* Mana */}
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/70 border border-cyan-500/25" title={`流量 ${player.mana}/${player.manaMax}`}>
            <Icons.ManaIcon size={12} className="text-cyan-300" />
            <span className="font-black text-cyan-200 tabular-nums">{player.mana}</span>
            <span className="text-white/40 tabular-nums">/ {player.manaMax}</span>
          </div>
          {/* 装备 */}
          {side === 'me' && player.equipped && (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/35 text-amber-100">
              <Icons.EquipmentIcon size={12} />
              <span className="inline-flex items-center gap-0.5"><Icons.AttackIcon size={10} className="text-rose-300" /><b className="tabular-nums">{player.equipped.attack}</b></span>
              <span className="inline-flex items-center gap-0.5"><Icons.DurabilityIcon size={10} className="text-emerald-300" /><b className="tabular-nums">{player.equipped.durability}</b></span>
              {player.heroAttacksLeftThisTurn > 0 && (
                <button onClick={(e) => { e.stopPropagation(); onHeroAttack?.(e); }}
                        className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500 hover:bg-rose-400 rounded text-white text-[10px] font-bold cursor-pointer transition-colors">
                  <Icons.AttackIcon size={10} /> 挥击
                </button>
              )}
            </div>
          )}
          {/* 技能 */}
          {side === 'me' && onHeroPower && (
            <button onClick={(e) => { e.stopPropagation(); onHeroPower(); }}
                    disabled={!heroPowerAvailable}
                    title={player.heroPowerUsed ? '本回合已用过' : player.mana < 2 ? '流量不足（2）' : '玩家技能：2 费抽 1 张牌'}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      heroPowerAvailable
                        ? 'bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:from-[#8B5CF6] hover:to-[#C084FC] text-white shadow-[0_0_14px_rgba(124,58,237,0.55)]'
                        : 'bg-slate-700 text-white/35 cursor-not-allowed'
                    }`}>
              <Icons.EffectIcon size={12} /> 技能
              <span className="inline-flex items-center gap-0.5 pl-1 border-l border-white/30 ml-0.5">
                <Icons.ManaIcon size={10} className="text-cyan-200" /><span className="text-cyan-100">2</span>
              </span>
            </button>
          )}
        </div>
        {/* 第二行：HP bar + 数值 */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 h-1.5 bg-slate-800/80 rounded-full overflow-hidden border border-white/5">
            <div className={`h-full rounded-full transition-all duration-300 ${
              hpPct > 50 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
              : hpPct > 25 ? 'bg-gradient-to-r from-amber-400 to-orange-500'
              : 'bg-gradient-to-r from-rose-500 to-red-600'
            }`} style={{ width: `${hpPct}%` }} />
            {/* 刻度 */}
            <div className="absolute inset-0 flex justify-between px-[2px] pointer-events-none">
              {[1, 2, 3].map((i) => (
                <span key={i} className="w-px h-full bg-slate-950/40" style={{ marginLeft: `${25 * i}%` }} />
              ))}
            </div>
          </div>
          <span className="text-[11px] text-white/55 tabular-nums whitespace-nowrap">
            <b className="text-white/85">{player.hp}</b>
            <span className="text-white/30"> / {hpMax}</span>
          </span>
          {/* Mana 进度小条 */}
          <div className="hidden sm:flex items-center gap-1" title="流量条">
            <span className="relative w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-cyan-500/20">
              <span className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-sky-500" style={{ width: `${manaPct}%` }} />
            </span>
          </div>
        </div>
        {player.events.length > 0 && (
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {player.events.map((e) => <EventBadge key={e.instanceId} ev={e} hideForOpp={side === 'opp'} />)}
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes hppulse {
          0% { transform: scale(1.8); background: #fb7185; }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); background: #f43f5e; }
        }
      `}</style>
    </div>
  );
}

function HeroCorner({
  player, side, onClick, targetable, onHeroAttack, onHeroPower, heroPowerAvailable, flashKey,
}: HeroBarProps) {
  const hpMax = player.hpMax || 40;
  const hpPct = Math.max(0, Math.min(100, (player.hp / hpMax) * 100));
  const manaPct = player.manaMax > 0 ? (player.mana / player.manaMax) * 100 : 0;
  const accent = side === 'me'
    ? 'from-emerald-500 via-emerald-600 to-teal-800'
    : 'from-rose-500 via-rose-600 to-rose-900';
  const frameBorder = targetable
    ? 'border-emerald-400 shadow-[0_0_28px_rgba(52,211,153,0.55)] animate-pulse'
    : side === 'me'
      ? 'border-emerald-500/30'
      : 'border-rose-500/30';
  return (
    <div className={`relative w-[186px] [@media(max-height:640px)]:w-[168px] flex flex-col gap-2 p-3 [@media(max-height:640px)]:p-2.5 rounded-2xl bg-gradient-to-b from-slate-900/85 via-slate-900/65 to-slate-900/85 border ${frameBorder} shadow-[0_16px_32px_rgba(0,0,0,0.35)] backdrop-blur-[2px]`}>
      {/* 头像 + 名称 + 状态 */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button onClick={onClick}
                data-hero-id={player.id}
                className={`group relative w-12 h-12 [@media(max-height:640px)]:w-11 [@media(max-height:640px)]:h-11 shrink-0 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-white border-2 border-white/25 cursor-pointer transition-transform ${targetable ? 'scale-110 ring-4 ring-emerald-400/60' : 'hover:scale-105'}`}
                title={`${player.id === 'P1' ? '玩家 1' : '玩家 2'}  HP ${player.hp}/${hpMax}`}>
          <span className="font-display tracking-tight text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{player.id}</span>
          <span key={flashKey}
                className="absolute -bottom-1.5 -right-1.5 inline-flex items-center gap-0.5 bg-slate-900 rounded-full px-1 py-0 text-[10px] font-black text-white border border-white/90 shadow-lg animate-[hppulse_0.5s_ease]">
            <Icons.HealthIcon size={10} className="text-rose-400" />
            <span className="tabular-nums">{player.hp}</span>
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-white font-bold text-sm leading-tight truncate">
            {player.id === 'P1' ? '玩家 1' : '玩家 2'}
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-white/55">
            <MiniDeckStack count={player.deck.length} />
          </div>
        </div>
      </div>

      {/* HP 条 + 数字 */}
      <div className="flex flex-col gap-0.5">
        <div className="relative h-1.5 bg-slate-800/80 rounded-full overflow-hidden border border-white/5">
          <div className={`h-full rounded-full transition-all duration-300 ${
            hpPct > 50 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
              : hpPct > 25 ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                : 'bg-gradient-to-r from-rose-500 to-red-600'
          }`} style={{ width: `${hpPct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[10px] text-white/55 tabular-nums">
          <span className="inline-flex items-center gap-1 text-white/60">
            <Icons.HealthIcon size={10} className="text-rose-400" />
            <b className="text-white/85">{player.hp}</b>
            <span className="text-white/30">/ {hpMax}</span>
          </span>
          <span>手牌 <b className="text-white/70 tabular-nums">{player.hand.length}</b></span>
        </div>
      </div>

      {/* 流量条 + 数字 */}
      <div className="flex flex-col gap-0.5">
        <div className="relative h-1.5 bg-slate-800 rounded-full overflow-hidden border border-cyan-500/25">
          <span className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-sky-500" style={{ width: `${manaPct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[10px] text-white/55 tabular-nums">
          <span className="inline-flex items-center gap-1">
            <Icons.ManaIcon size={10} className="text-cyan-300" />
            <b className="text-cyan-200">{player.mana}</b>
            <span className="text-white/40">/ {player.manaMax}</span>
          </span>
          {player.overloadNext > 0 && (
            <span className="inline-flex items-center gap-0.5 px-1 rounded bg-rose-500/20 border border-rose-500/40 text-rose-200 font-semibold" title="下回合流量会被扣减">
              透支 {player.overloadNext}
            </span>
          )}
        </div>
      </div>

      {/* 装备 + 技能（仅己方） */}
      {side === 'me' && (
        <div className="flex flex-wrap gap-1.5">
          {player.equipped && (
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/35 text-amber-100 text-[10px]">
              <Icons.EquipmentIcon size={10} />
              <span className="inline-flex items-center gap-0.5"><Icons.AttackIcon size={9} className="text-rose-300" /><b className="tabular-nums">{player.equipped.attack}</b></span>
              <span className="inline-flex items-center gap-0.5"><Icons.DurabilityIcon size={9} className="text-emerald-300" /><b className="tabular-nums">{player.equipped.durability}</b></span>
              {player.heroAttacksLeftThisTurn > 0 && onHeroAttack && (
                <button onClick={(e) => { e.stopPropagation(); onHeroAttack(e); }}
                        className="ml-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-500 hover:bg-rose-400 rounded text-white text-[9px] font-bold cursor-pointer">
                  <Icons.AttackIcon size={9} /> 挥击
                </button>
              )}
            </div>
          )}
          {onHeroPower && (
            <button onClick={(e) => { e.stopPropagation(); onHeroPower(); }}
                    disabled={!heroPowerAvailable}
                    title={player.heroPowerUsed ? '本回合已用过' : player.mana < 2 ? '流量不足（2）' : '玩家技能：2 费抽 1 张牌'}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      heroPowerAvailable
                        ? 'bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:from-[#8B5CF6] hover:to-[#C084FC] text-white shadow-[0_0_12px_rgba(124,58,237,0.55)]'
                        : 'bg-slate-700 text-white/35 cursor-not-allowed'
                    }`}>
              <Icons.EffectIcon size={10} /> 技能
              <span className="inline-flex items-center gap-0.5 pl-0.5 border-l border-white/30">
                <Icons.ManaIcon size={9} className="text-cyan-200" /><span className="text-cyan-100">2</span>
              </span>
            </button>
          )}
        </div>
      )}

      {/* 事件槽（暗箱 / 场地） */}
      {player.events.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {player.events.map((e) => <EventBadge key={e.instanceId} ev={e} hideForOpp={side === 'opp'} />)}
        </div>
      )}

      <style jsx>{`
        @keyframes hppulse {
          0% { transform: scale(1.8); background: #fb7185; }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); background: #f43f5e; }
        }
      `}</style>
    </div>
  );
}

export function EventBadge({ ev, hideForOpp }: { ev: EventCard; hideForOpp: boolean }) {
  const def = getCardDef(ev.defId);
  if (ev.kind === 'secret' && hideForOpp) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/25 text-amber-200 text-xs rounded-full border border-amber-500/50">
        <Icons.SecretIcon size={10} /> 暗箱
      </span>
    );
  }
  if (ev.kind === 'secret') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/25 text-amber-200 text-xs rounded-full border border-amber-500/50">
        <Icons.SecretIcon size={10} /> {def?.name ?? ev.defId}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/25 text-indigo-200 text-xs rounded-full border border-indigo-500/50">
      <Icons.LocationIcon size={10} /> {def?.name ?? ev.defId}
      <span className="inline-flex items-center gap-0.5 pl-1 border-l border-indigo-400/40 text-amber-300 font-bold">
        <Icons.DelayedIcon size={9} />{ev.countdownRemaining}
      </span>
    </span>
  );
}

function MiniDeckStack({ count }: { count: number }) {
  const empty = count <= 0;
  const layers = empty ? 1 : Math.min(3, Math.ceil(count / 10));

  return (
    <span className="inline-flex items-center gap-1" title={`牌库 ${count} 张`}>
      <span className="relative inline-flex w-[22px] h-[28px] align-middle">
        {Array.from({ length: layers }).map((_, i) => (
          <span
            key={i}
            className="absolute inset-0"
            style={{
              transform: `translate(${i * 2}px, ${i}px)`,
              zIndex: i + 1,
            }}
          >
            <CardBack width={18} variant="mini" faded={empty} />
          </span>
        ))}
      </span>
      <span className="text-white/55">牌库</span>
      <b className="text-white/70 tabular-nums">{count}</b>
    </span>
  );
}
