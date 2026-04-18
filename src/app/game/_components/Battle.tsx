'use client';

/**
 * Battle 组件：通用对战 UI（hotseat 与 vs AI 共享）
 * - hotseat: 不传 perspective / aiPlayer，视角跟随 activePlayer
 * - vs AI:   传 perspective='P1' + aiPlayer='P2'，AI 自动出招
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import CardFrame from '@/components/game/CardFrame';
import { CARD_PRESETS } from '@/data/cardPresets';
import { useCardPresets } from '@/lib/tcg/useCardPresets';
import { useGame } from '@/game/useGame';
import { HERO_ATTACKER_ID, getCardDef, MAX_TURNS } from '@/game/engine';
import { mergeLivePresetsIntoEngine } from '@/game/cardLoader';
import { nextAction as aiNextAction, type AIDifficulty } from '@/game/ai';
import type { CardInstance, EventCard, GameState, Minion, PlayerId, CardDef } from '@/game/types';
import * as Icons from '@/components/game/GameIcons';
import { sfx, isMuted as isSfxMuted, setMuted as setSfxMuted, unlockAudio as unlockSfx } from '@/game/sound';

// defId → preset（含 imagePath）
// 列表在模块顶层静态初始化，主组件在 mount 后会从 /api/tcg/public/cards 拉到 live 数据并 merge 进来，
// 让运营后台改动在下一次对战重开时生效（对战中不干扰 state）。
const PRESET_MAP: Record<string, import('@/data/cardPresets').CardPreset> = {};
for (const p of CARD_PRESETS) PRESET_MAP[p.id] = p;
function getPreset(defId: string) { return PRESET_MAP[defId]; }

// ============ 常量 ============

const RARITY_COLOR: Record<string, string> = {
  N: 'border-slate-400',
  R: 'border-sky-400',
  SR: 'border-fuchsia-400',
  SSR: 'border-amber-400',
};
const RARITY_GLOW: Record<string, string> = {
  N: '',
  R: 'shadow-[0_0_10px_rgba(56,189,248,0.4)]',
  SR: 'shadow-[0_0_12px_rgba(232,121,249,0.5)]',
  SSR: 'shadow-[0_0_18px_rgba(251,191,36,0.7)]',
};
// 关键字图标（场上角色徽章）—— MCN 化命名；SVG 组件从 GameIcons 导入
type KwIconInfo = {
  Icon: React.ComponentType<{ className?: string; size?: number }>;
  zh: string;
  color: string;
};
const KW_ICON: Record<string, KwIconInfo> = {
  taunt:        { Icon: Icons.TauntIcon,        zh: '挡枪',     color: 'text-slate-300' },
  charge:       { Icon: Icons.ChargeIcon,       zh: '紧急通告', color: 'text-yellow-300' },
  rush:         { Icon: Icons.RushIcon,         zh: '试水',     color: 'text-sky-300' },
  windfury:     { Icon: Icons.WindfuryIcon,     zh: '双开',     color: 'text-teal-300' },
  stealth:      { Icon: Icons.StealthIcon,      zh: '潜水',     color: 'text-violet-300' },
  poisonous:    { Icon: Icons.PoisonousIcon,    zh: '封杀',     color: 'text-lime-400' },
  lifesteal:    { Icon: Icons.LifestealIcon,    zh: '吸粉',     color: 'text-rose-300' },
  divineShield: { Icon: Icons.DivineShieldIcon, zh: '粉丝盾',   color: 'text-yellow-200' },
  reborn:       { Icon: Icons.RebornIcon,       zh: '复出',     color: 'text-emerald-300' },
};

// 需要选目标的特殊效果 effectId 集合
const TARGETED_EFFECTS = new Set([
  'damage_target', 'silence_target', 'transform_target_1_1', 'combo_damage_with_chenze',
]);

type Point = { x: number; y: number };

// ============ 术语词典（给新手解释卡牌描述里的【XXX】） ============
// 所有关键字命名 MCN 化，不再使用炉石传说术语
type DictEntry = {
  Icon: React.ComponentType<{ className?: string; size?: number }>;
  name: string;
  desc: string;
};
const KEYWORD_DICT: Record<string, DictEntry> = {
  taunt:        { Icon: Icons.TauntIcon,        name: '挡枪',     desc: '对方攻击时必须优先攻击带「挡枪」的角色；玩家与其它角色受到保护。' },
  charge:       { Icon: Icons.ChargeIcon,       name: '紧急通告', desc: '登场当回合即可攻击（角色或玩家皆可）。' },
  rush:         { Icon: Icons.RushIcon,         name: '试水',     desc: '登场当回合只能攻击对方角色，不能直接打玩家。' },
  windfury:     { Icon: Icons.WindfuryIcon,     name: '双开',     desc: '每回合可以攻击两次。' },
  stealth:      { Icon: Icons.StealthIcon,      name: '潜水',     desc: '无法被选为攻击或消耗目标，它攻击后失效。' },
  poisonous:    { Icon: Icons.PoisonousIcon,    name: '封杀',     desc: '只要造成一点伤害，对方角色立即死亡（对玩家无额外效果）。' },
  lifesteal:    { Icon: Icons.LifestealIcon,    name: '吸粉',     desc: '造成伤害时，己方玩家恢复等量流量。' },
  divineShield: { Icon: Icons.DivineShieldIcon, name: '粉丝盾',   desc: '第一次受到任何伤害免除，之后失效。' },
  reborn:       { Icon: Icons.RebornIcon,       name: '复出',     desc: '死亡后以 1 流量复活一次（只触发一次）。' },
};
// 描述文案里用中文 tag 标注的机制（卡面描述 【xxx】）
const MECHANIC_DICT: Record<string, DictEntry> = {
  '登场':   { Icon: Icons.BattlecryIcon,   name: '登场',   desc: '打出这张牌时立即触发一次效果（原「战吼」）。' },
  '退场':   { Icon: Icons.DeathrattleIcon, name: '退场',   desc: '这张牌死亡时触发效果（原「亡语」）。' },
  '联动':   { Icon: Icons.ComboIcon,       name: '联动',   desc: '本回合已经打过其它牌时，这张再打会触发额外效果（原「连招」）。' },
  '重播':   { Icon: Icons.EchoIcon,        name: '重播',   desc: '这张牌本回合内仍留在手牌中，可重复打出；回合结束消失（原「回响」）。' },
  '暗箱':   { Icon: Icons.SecretIcon,      name: '暗箱',   desc: '秘密部署在玩家事件槽，对手不可见；满足条件时自动触发（原「奥秘」）。' },
  '即时':   { Icon: Icons.InstantIcon,     name: '即时',   desc: '道具被使用后立即触发效果，不占装备槽。' },
  '延时':   { Icon: Icons.DelayedIcon,     name: '延时',   desc: '道具带有倒计时，到期后自动结算（场地类）。' },
  '装备时': { Icon: Icons.OnEquipIcon,     name: '装备时', desc: '装备到玩家槽位时立即触发一次效果。' },
  '场地':   { Icon: Icons.LocationIcon,    name: '场地',   desc: '延时事件，在己方事件槽按回合倒数，到 0 自动结算。' },
  // 关键字 tag 同名引用
  '挡枪':     KEYWORD_DICT.taunt,
  '紧急通告': KEYWORD_DICT.charge,
  '试水':     KEYWORD_DICT.rush,
  '双开':     KEYWORD_DICT.windfury,
  '潜水':     KEYWORD_DICT.stealth,
  '封杀':     KEYWORD_DICT.poisonous,
  '吸粉':     KEYWORD_DICT.lifesteal,
  '粉丝盾':   KEYWORD_DICT.divineShield,
  '复出':     KEYWORD_DICT.reborn,
};

// 从描述里提取【xxx】tag
function extractMechanicTags(desc: string | undefined): string[] {
  if (!desc) return [];
  const tags: string[] = [];
  const re = /【([^】]+)】/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(desc)) !== null) {
    const tag = m[1].trim();
    if (!tags.includes(tag) && MECHANIC_DICT[tag]) tags.push(tag);
  }
  return tags;
}

function defNeedsTarget(def: CardDef | undefined): boolean {
  if (!def) return false;
  if (def.type !== 'effect') return false;
  return (def.effects ?? []).some((e) => TARGETED_EFFECTS.has(e.effectId));
}

function rectCenter(el: Element | null | undefined): Point | undefined {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// ============ 伤害飘字系统 ============

type Floater = {
  id: string;
  x: number;
  y: number;
  text: string;
  tone: 'damage' | 'heal' | 'combo' | 'shield';
};

/** 监听 state 前后 HP 变化，生成浮动数字 */
function useDamageFloaters(state: GameState): Floater[] {
  const prevRef = useRef<GameState>(state);
  const [floaters, setFloaters] = useState<Floater[]>([]);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = state;
    if (prev === state) return;

    const additions: Floater[] = [];
    const now = Date.now();

    // Hero HP 变化
    for (const p of ['P1', 'P2'] as PlayerId[]) {
      const before = prev.players[p].hp;
      const after = state.players[p].hp;
      if (after !== before) {
        const el = typeof document !== 'undefined'
          ? document.querySelector(`[data-hero-id="${p}"]`)
          : null;
        if (el) {
          const r = (el as HTMLElement).getBoundingClientRect();
          additions.push({
            id: `fh_${p}_${now}_${Math.random().toString(36).slice(2, 7)}`,
            x: r.left + r.width / 2,
            y: r.top + r.height / 2,
            text: after < before ? `-${before - after}` : `+${after - before}`,
            tone: after < before ? 'damage' : 'heal',
          });
        }
      }
    }

    // Minion HP 变化（仅存活单位，死亡单位 DOM 已移除）
    for (const p of ['P1', 'P2'] as PlayerId[]) {
      const prevMap = new Map(prev.players[p].minions.map((m) => [m.instanceId, m]));
      for (const m of state.players[p].minions) {
        const b = prevMap.get(m.instanceId);
        if (!b) continue;
        if (m.health === b.health && m.divineShieldActive === b.divineShieldActive) continue;
        const el = typeof document !== 'undefined'
          ? document.querySelector(`[data-minion-id="${m.instanceId}"]`)
          : null;
        if (!el) continue;
        const r = (el as HTMLElement).getBoundingClientRect();
        if (b.divineShieldActive && !m.divineShieldActive && m.health === b.health) {
          additions.push({
            id: `fs_${m.instanceId}_${now}`,
            x: r.left + r.width / 2,
            y: r.top + r.height / 2,
            text: '盾!',
            tone: 'shield',
          });
        } else if (m.health !== b.health) {
          additions.push({
            id: `fm_${m.instanceId}_${now}_${Math.random().toString(36).slice(2, 7)}`,
            x: r.left + r.width / 2,
            y: r.top + r.height / 2,
            text: m.health < b.health ? `-${b.health - m.health}` : `+${m.health - b.health}`,
            tone: m.health < b.health ? 'damage' : 'heal',
          });
        }
      }
    }

    // 新 log 中包含 combo 的，视作连击反馈
    const newLogs = state.log.slice(prev.log.length);
    for (const l of newLogs) {
      if (l.kind === 'combo') {
        // combo 飘字放屏幕中央上方
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
        additions.push({
          id: `fc_${now}_${Math.random().toString(36).slice(2, 7)}`,
          x: vw / 2,
          y: 160,
          text: '✦ COMBO ✦',
          tone: 'combo',
        });
      }
    }

    if (additions.length > 0) {
      setFloaters((xs) => [...xs, ...additions]);
      const ids = additions.map((a) => a.id);
      setTimeout(() => {
        setFloaters((xs) => xs.filter((f) => !ids.includes(f.id)));
      }, 1400);
    }
  }, [state]);

  return floaters;
}

// ============ 攻击冲击特效 ============

interface Strike {
  id: string;
  from: Point;
  to: Point;
}

/** 监听 state.log 中的 attack，驱动冲击线 + 攻击者冲刺 + 目标抖动 */
function useAttackFx(state: GameState): Strike[] {
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const prevLogLenRef = useRef(state.log.length);

  useEffect(() => {
    const prevLen = prevLogLenRef.current;
    prevLogLenRef.current = state.log.length;
    const newLogs = state.log.slice(prevLen);
    if (newLogs.length === 0) return;

    const adds: Strike[] = [];
    const now = Date.now();
    let idx = 0;

    for (const l of newLogs) {
      if (l.kind !== 'attack' || !l.data) continue;
      const d = l.data as {
        attackerKind?: string; attackerId?: string; attackerOwner?: string;
        targetKind?: string; targetId?: string; targetPlayer?: string;
      };
      if (typeof document === 'undefined') continue;

      const attackerEl =
        d.attackerKind === 'hero'
          ? document.querySelector(`[data-hero-id="${d.attackerOwner}"]`)
          : d.attackerId
            ? document.querySelector(`[data-minion-id="${d.attackerId}"]`)
            : null;
      const targetEl =
        d.targetKind === 'hero'
          ? document.querySelector(`[data-hero-id="${d.targetPlayer}"]`)
          : d.targetKind === 'minion' && d.targetId
            ? document.querySelector(`[data-minion-id="${d.targetId}"]`)
            : null;
      if (!attackerEl || !targetEl) continue;

      const aRect = (attackerEl as HTMLElement).getBoundingClientRect();
      const tRect = (targetEl as HTMLElement).getBoundingClientRect();
      const from = { x: aRect.left + aRect.width / 2, y: aRect.top + aRect.height / 2 };
      const to   = { x: tRect.left + tRect.width / 2, y: tRect.top + tRect.height / 2 };

      adds.push({ id: `strike_${now}_${idx++}`, from, to });

      // 攻击者：冲刺到目标方向 0.4s
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const aEl = attackerEl as HTMLElement;
      aEl.style.setProperty('--strike-dx', `${dx}px`);
      aEl.style.setProperty('--strike-dy', `${dy}px`);
      aEl.classList.remove('is-striking');
      // 强制重排以让动画重新开始
      void aEl.offsetWidth;
      aEl.classList.add('is-striking');
      window.setTimeout(() => aEl.classList.remove('is-striking'), 460);

      // 目标：等攻击者冲到位时再抖动
      const tEl = targetEl as HTMLElement;
      window.setTimeout(() => {
        tEl.classList.remove('is-hit');
        void tEl.offsetWidth;
        tEl.classList.add('is-hit');
        window.setTimeout(() => tEl.classList.remove('is-hit'), 420);
      }, 160);
    }

    if (adds.length === 0) return;
    setStrikes((xs) => [...xs, ...adds]);
    const ids = adds.map((a) => a.id);
    window.setTimeout(() => {
      setStrikes((xs) => xs.filter((x) => !ids.includes(x.id)));
    }, 620);
  }, [state]);

  return strikes;
}

/** 全屏 SVG 冲击线 + 爆发圆环（自动淡出） */
function AttackFxLayer({ strikes }: { strikes: Strike[] }) {
  if (strikes.length === 0) return null;
  return (
    <svg className="pointer-events-none fixed inset-0 z-[9550]" width="100%" height="100%" aria-hidden>
      <defs>
        <filter id="attackStrikeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {strikes.map((s) => (
        <g key={s.id} className="attack-strike">
          {/* 外层黄色光晕 */}
          <line x1={s.from.x} y1={s.from.y} x2={s.to.x} y2={s.to.y}
                stroke="#fde047" strokeWidth="6" strokeLinecap="round"
                filter="url(#attackStrikeGlow)" opacity="0.9" />
          {/* 内层白色锐线 */}
          <line x1={s.from.x} y1={s.from.y} x2={s.to.x} y2={s.to.y}
                stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.95" />
          {/* 目标处爆发圆环 */}
          <circle cx={s.to.x} cy={s.to.y} r="8" fill="none"
                  stroke="#fde047" strokeWidth="3" className="attack-burst"
                  filter="url(#attackStrikeGlow)" />
          <circle cx={s.to.x} cy={s.to.y} r="14" fill="none"
                  stroke="#fb923c" strokeWidth="2" className="attack-burst-outer" />
        </g>
      ))}
    </svg>
  );
}

/** 监听 state.log 增量，派发音效 */
function useSfxFromState(state: GameState, perspective: PlayerId | undefined): void {
  const prevLogLenRef = useRef(state.log.length);
  const prevEndedRef = useRef(state.ended);

  useEffect(() => {
    const prevLen = prevLogLenRef.current;
    prevLogLenRef.current = state.log.length;
    const newLogs = state.log.slice(prevLen);
    if (newLogs.length === 0) return;

    // 聚合本批次出现过的 kind（忽略 damage：让 attack/play 代表击打声）
    const kinds = new Set(newLogs.map((l) => l.kind));

    if (kinds.has('combo')) sfx.combo();
    if (kinds.has('turnStart')) sfx.turnStart();
    if (kinds.has('mulligan')) sfx.click();
    if (kinds.has('draw')) sfx.coin();
    if (kinds.has('play')) sfx.play();
    if (kinds.has('attack')) sfx.attack();
    // 仅治疗没有攻击时响（否则被 attack 压过去）
    if (kinds.has('heal') && !kinds.has('attack')) sfx.heal();
    // 死亡延迟播放，让 attack 的金属声先过去
    if (kinds.has('death')) {
      setTimeout(() => sfx.death(), 180);
    }
    if (kinds.has('battlecry') || kinds.has('deathrattle') || kinds.has('secret')) {
      // 这些在 play/death 之后会有，用 buff 做一个小叮铃叠加
      setTimeout(() => sfx.buff(), 60);
    }
  }, [state.log]);

  // 胜负：仅在 ended 从 false→true 的那一次触发
  useEffect(() => {
    if (!prevEndedRef.current && state.ended) {
      const winner = state.winner;
      if (!winner || winner === 'draw') {
        sfx.lose();
      } else if (perspective) {
        if (winner === perspective) sfx.win(); else sfx.lose();
      } else {
        sfx.win();
      }
    }
    prevEndedRef.current = state.ended;
  }, [state.ended, state.winner, perspective]);
}

function DamageFloaters({ floaters }: { floaters: Floater[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[9500]" aria-hidden>
      {floaters.map((f) => (
        <span
          key={f.id}
          className={[
            'absolute font-black drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]',
            'damage-floater',
            f.tone === 'damage' ? 'text-rose-300'
              : f.tone === 'heal' ? 'text-emerald-300'
              : f.tone === 'combo' ? 'text-pink-200 tracking-widest'
              : 'text-amber-300',
            f.tone === 'combo' ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl',
          ].join(' ')}
          style={{ left: f.x, top: f.y }}
        >
          {f.text}
        </span>
      ))}
      <style jsx>{`
        .damage-floater {
          transform: translate(-50%, -50%);
          animation: damageFloat 1.4s cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
        }
        @keyframes damageFloat {
          0%   { transform: translate(-50%, -50%)  scale(0.4); opacity: 0; }
          12%  { transform: translate(-50%, -90%)  scale(1.25); opacity: 1; }
          55%  { transform: translate(-50%, -160%) scale(1.05); opacity: 1; }
          100% { transform: translate(-50%, -260%) scale(0.92); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ============ Battle ============

export interface BattleProps {
  p1Deck: import('@/game/types').Deck;
  p2Deck: import('@/game/types').Deck;
  firstPlayer: PlayerId;
  onQuit: () => void;
  /** 锁定视角（hotseat 默认不传，单人模式传 'P1'） */
  perspective?: PlayerId;
  /** 哪一侧由 AI 控制（单人模式传 'P2'） */
  aiPlayer?: PlayerId;
  /** AI 每步之间的延迟（ms），默认 750 */
  aiStepDelayMs?: number;
  /** AI 难度（C1）。easy = 随机贪心；normal = 原贪心；hard = 1 步前瞻打分。默认 normal */
  aiDifficulty?: AIDifficulty;
  /** 在线模式：本方玩家每次 dispatch 后回调（用于上传到服务器） */
  onAction?: (action: import('@/game/types').Action) => void;
  /** 在线模式：父组件通过此 ref 获取 inject 函数，用于注入对手动作 */
  injectRef?: React.MutableRefObject<((a: import('@/game/types').Action) => void) | null>;
  /** 在线模式：固定随机种子（双端一致） */
  seed?: number;
}

type PendingPlay = { instanceId: string; needsTarget: boolean; origin: Point } | null;
type PendingAttack = { attackerId: string; origin: Point } | null;

export function Battle({ p1Deck, p2Deck, firstPlayer, onQuit, perspective, aiPlayer, aiStepDelayMs = 750, aiDifficulty = 'normal', onAction, injectRef, seed: fixedSeed }: BattleProps) {
  const { state, dispatch: rawDispatch, reset, injectAction } = useGame({
    seed: fixedSeed ?? (Date.now() % 2147483647),
    p1Deck,
    p2Deck,
    firstPlayer,
  });

  // 在线模式：暴露 inject 函数给父组件
  useEffect(() => {
    if (injectRef) injectRef.current = injectAction;
    return () => { if (injectRef) injectRef.current = null; };
  }, [injectRef, injectAction]);

  // C1：对局耗时（从组件挂载到首次 state.ended 变 true 之间）
  const startAtRef = useRef<number>(Date.now());
  const [endedDurationMs, setEndedDurationMs] = useState<number | null>(null);
  useEffect(() => {
    if (state.ended && endedDurationMs === null) {
      setEndedDurationMs(Date.now() - startAtRef.current);
    }
    // reset 后重新计时（state.ended=false 时清空并重置起点）
    if (!state.ended && endedDurationMs !== null) {
      startAtRef.current = Date.now();
      setEndedDurationMs(null);
    }
  }, [state.ended, endedDurationMs]);

  // 包装 dispatch：本方操作时触发 onAction 回调
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;
  const dispatch = useCallback((action: import('@/game/types').Action) => {
    rawDispatch(action);
    onActionRef.current?.(action);
  }, [rawDispatch]);

  // 进入对战：隐藏全局顶部导航（由 GameNav 监听 body 属性）
  useEffect(() => {
    document.body.dataset.inBattle = '1';
    return () => { delete document.body.dataset.inBattle; };
  }, []);

  // live 卡池同步：
  //  1. UI 层：merge 进模块级 PRESET_MAP（imagePath / flavor / description）
  //  2. 引擎层：merge 到 CARD_DB（effects / keywords / cost / attack / health）
  //     → 运营后台修改的战斗数值 / 效果钩子立即被 engine 消费
  // 对战中 CardInstance.currentCost 已在初始化时固化，不会动态变化；
  // 但后续打出该卡时的登场查询 effects、结算数值查询 attack，都走 getCardDef → 拿到 live 版本。
  const livePresets = useCardPresets();
  useEffect(() => {
    for (const p of livePresets) PRESET_MAP[p.id] = p;
    mergeLivePresetsIntoEngine(livePresets);
  }, [livePresets]);

  // me = 玩家视角。hotseat 下跟随 activePlayer，vs AI 下固定为 perspective
  const me: PlayerId = perspective ?? state.activePlayer;
  const opp: PlayerId = me === 'P1' ? 'P2' : 'P1';
  const mePlayer = state.players[me];
  const oppPlayer = state.players[opp];
  const isAIMode = !!aiPlayer;
  const isAITurn = isAIMode && state.activePlayer === aiPlayer;
  // 在线模式：仅在自己回合才能操作；hotseat 模式：始终可操作
  const isOnline = !!onAction;
  const isMyTurn = !perspective || state.activePlayer === perspective;
  const isHumanTurn = isOnline ? isMyTurn : (!isAIMode || state.activePlayer === me);

  const [pendingPlay, setPendingPlay] = useState<PendingPlay>(null);
  const [pendingAttack, setPendingAttack] = useState<PendingAttack>(null);
  const [hoverCard, setHoverCard] = useState<{ defId: string; cost: number; rect: DOMRect } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const onHandHover = useCallback((c: CardInstance | null, rect?: DOMRect) => {
    setHoverCard(c && rect ? { defId: c.defId, cost: c.currentCost, rect } : null);
  }, []);
  const onMinionHover = useCallback((m: Minion | null, rect?: DOMRect) => {
    if (!m || !rect) { setHoverCard(null); return; }
    const def = getCardDef(m.defId);
    setHoverCard({ defId: m.defId, cost: def?.cost ?? 0, rect });
  }, []);
  // 鼠标位置（用于绘制瞄准箭头）
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const isSelectingRef = useRef(false);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (isSelectingRef.current) setMousePos({ x: e.clientX, y: e.clientY }); };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  // 移动端触屏无 mouseleave：凡是点到非卡牌锚点（按钮、空白、日志等）就关闭浮动预览
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (!t.closest('[data-hover-anchor]')) setHoverCard(null);
    };
    window.addEventListener('pointerdown', handler);
    return () => window.removeEventListener('pointerdown', handler);
  }, []);

  // 切换回合时清除选中态
  const lastTurnRef = useRef(state.turn + '_' + state.activePlayer);
  useEffect(() => {
    const k = state.turn + '_' + state.activePlayer;
    if (k !== lastTurnRef.current) {
      lastTurnRef.current = k;
      setPendingPlay(null);
      setPendingAttack(null);
    }
  }, [state.turn, state.activePlayer]);

  // ====== 合法目标计算 ======
  const legalTargets = useMemo(() => {
    // 返回 { heroes: Set<PlayerId>, minions: Set<string> }
    const heroes = new Set<PlayerId>();
    const minions = new Set<string>();

    const oppHasTaunt = oppPlayer.minions.some((m) => m.keywords.has('taunt') && !m.silenced);

    if (pendingAttack) {
      // 攻击可选目标：敌方 hero（仅当无挡枪）+ 敌方随从（有挡枪则只挡枪、潜水不可选）
      for (const m of oppPlayer.minions) {
        const isStealth = m.keywords.has('stealth') && !m.silenced;
        if (isStealth) continue;
        if (oppHasTaunt) {
          if (m.keywords.has('taunt') && !m.silenced) minions.add(m.instanceId);
        } else {
          minions.add(m.instanceId);
        }
      }
      if (!oppHasTaunt) heroes.add(opp);
      return { heroes, minions };
    }

    if (pendingPlay) {
      // 特殊效果可选目标：所有人物 + 两英雄（不区分敌我，由引擎校验）
      for (const m of mePlayer.minions) minions.add(m.instanceId);
      for (const m of oppPlayer.minions) {
        const isStealth = m.keywords.has('stealth') && !m.silenced;
        if (!isStealth) minions.add(m.instanceId);
      }
      heroes.add(me);
      heroes.add(opp);
      return { heroes, minions };
    }
    return { heroes, minions };
  }, [pendingAttack, pendingPlay, mePlayer, oppPlayer, me, opp]);

  // 可攻击的己方随从
  const attackableMyMinions = useMemo(() => {
    const s = new Set<string>();
    for (const m of mePlayer.minions) {
      if (m.attacksLeftThisTurn > 0 && !m.summoningSickness && m.attack > 0) s.add(m.instanceId);
    }
    return s;
  }, [mePlayer]);

  // ====== HP 变化动画 ======
  const [flashPlayer, setFlashPlayer] = useState<Record<PlayerId, number>>({ P1: 0, P2: 0 });
  const lastHpRef = useRef({ P1: state.players.P1.hp, P2: state.players.P2.hp });
  useEffect(() => {
    for (const p of ['P1', 'P2'] as PlayerId[]) {
      if (state.players[p].hp !== lastHpRef.current[p]) {
        lastHpRef.current[p] = state.players[p].hp;
        setFlashPlayer((f) => ({ ...f, [p]: f[p] + 1 }));
      }
    }
  }, [state.players.P1.hp, state.players.P2.hp]);

  // ====== 事件处理 ======

  const onHandCardClick = useCallback((card: CardInstance, e?: React.MouseEvent<HTMLElement>) => {
    if (state.ended || !isHumanTurn) return;
    if (card.currentCost > mePlayer.mana) return;
    const def = getCardDef(card.defId);
    if (!def) return;
    if (defNeedsTarget(def)) {
      const origin = rectCenter(e?.currentTarget) ?? { x: 0, y: 0 };
      setPendingPlay({ instanceId: card.instanceId, needsTarget: true, origin });
      setPendingAttack(null);
    } else {
      dispatch({ type: 'PLAY_CARD', player: me, instanceId: card.instanceId });
      setPendingPlay(null);
    }
  }, [state.ended, isHumanTurn, me, mePlayer.mana, dispatch]);

  const onMinionClick = useCallback((owner: PlayerId, minion: Minion, e?: React.MouseEvent<HTMLElement>) => {
    if (state.ended || !isHumanTurn) return;
    // 若当前有 pendingAttack 且点的是合法目标
    if (pendingAttack) {
      if (legalTargets.minions.has(minion.instanceId)) {
        dispatch({
          type: 'ATTACK', player: me, attackerId: pendingAttack.attackerId,
          target: { kind: 'minion', player: owner, instanceId: minion.instanceId },
        });
        setPendingAttack(null);
      }
      return;
    }
    if (pendingPlay) {
      if (legalTargets.minions.has(minion.instanceId)) {
        dispatch({
          type: 'PLAY_CARD', player: me, instanceId: pendingPlay.instanceId,
          target: { kind: 'minion', player: owner, instanceId: minion.instanceId },
        });
        setPendingPlay(null);
      }
      return;
    }
    // 无选中态 → 自己随从进入攻击选择
    if (owner === me && attackableMyMinions.has(minion.instanceId)) {
      const origin = rectCenter(e?.currentTarget) ?? { x: 0, y: 0 };
      setPendingAttack({ attackerId: minion.instanceId, origin });
    }
  }, [state.ended, isHumanTurn, me, pendingAttack, pendingPlay, legalTargets, attackableMyMinions, dispatch]);

  const onHeroClick = useCallback((player: PlayerId) => {
    if (state.ended || !isHumanTurn) return;
    if (pendingAttack && legalTargets.heroes.has(player)) {
      dispatch({
        type: 'ATTACK', player: me, attackerId: pendingAttack.attackerId,
        target: { kind: 'hero', player },
      });
      setPendingAttack(null);
      return;
    }
    if (pendingPlay && legalTargets.heroes.has(player)) {
      dispatch({
        type: 'PLAY_CARD', player: me, instanceId: pendingPlay.instanceId,
        target: { kind: 'hero', player },
      });
      setPendingPlay(null);
    }
  }, [state.ended, isHumanTurn, pendingAttack, pendingPlay, legalTargets, me, dispatch]);

  const onHeroAttack = useCallback((e?: React.MouseEvent<HTMLElement>) => {
    if (!isHumanTurn) return;
    if (!mePlayer.equipped) return;
    if (mePlayer.heroAttacksLeftThisTurn <= 0) return;
    const origin = rectCenter(e?.currentTarget) ?? { x: 0, y: 0 };
    setPendingAttack({ attackerId: HERO_ATTACKER_ID, origin });
  }, [isHumanTurn, mePlayer]);

  const cancelSelection = useCallback(() => {
    setPendingPlay(null);
    setPendingAttack(null);
  }, []);

  const endTurn = useCallback(() => {
    if (!isHumanTurn) return;
    dispatch({ type: 'END_TURN', player: me });
  }, [dispatch, isHumanTurn, me]);

  const onSurrender = useCallback(() => {
    if (state.ended) return;
    if (!window.confirm(`确定投降吗？对方（${opp}）将获胜。`)) return;
    dispatch({ type: 'SURRENDER', player: me });
  }, [dispatch, me, opp, state.ended]);

  const onHeroPower = useCallback(() => {
    if (!isHumanTurn) return;
    dispatch({ type: 'HERO_POWER', player: me });
  }, [dispatch, isHumanTurn, me]);

  // ====== 60 秒回合计时器 ======
  const TURN_SECONDS = 60;
  const [secondsLeft, setSecondsLeft] = useState(TURN_SECONDS);
  useEffect(() => {
    // 换牌阶段或结束时不计时；AI 回合 / 在线对手回合不计时
    const skipTimer = state.phase !== 'main' || state.ended || isAITurn || (isOnline && !isMyTurn);
    if (skipTimer) { setSecondsLeft(TURN_SECONDS); return; }
    setSecondsLeft(TURN_SECONDS);
    const tick = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(tick);
          // 自动结束回合
          dispatch({ type: 'END_TURN', player: state.activePlayer });
          return TURN_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [state.turn, state.activePlayer, state.phase, state.ended, isAITurn, isOnline, isMyTurn, dispatch]);

  // ====== AI 自动出招（单人模式） ======
  useEffect(() => {
    if (!aiPlayer || state.ended) return;
    // 换牌阶段：AI 需要主动换牌
    if (state.phase === 'mulligan') {
      if (state.mulliganPending[0] !== aiPlayer) return;
      const timer = setTimeout(() => {
        dispatch(aiNextAction(state, aiPlayer, aiDifficulty));
      }, aiStepDelayMs);
      return () => clearTimeout(timer);
    }
    // 主阶段：仅当 AI 回合才出招
    if (state.activePlayer !== aiPlayer) return;
    const timer = setTimeout(() => {
      const action = aiNextAction(state, aiPlayer, aiDifficulty);
      dispatch(action);
    }, aiStepDelayMs);
    return () => clearTimeout(timer);
  }, [state, aiPlayer, aiStepDelayMs, aiDifficulty, dispatch]);

  // ESC 取消
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelSelection(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [cancelSelection]);

  // ====== 飘字 & 音效 & 攻击冲击 ======
  const floaters = useDamageFloaters(state);
  const strikes = useAttackFx(state);
  useSfxFromState(state, perspective);

  // 静音状态（SSR 下默认 false，挂载后同步 localStorage）
  const [muted, setMutedState] = useState(false);
  useEffect(() => { setMutedState(isSfxMuted()); }, []);

  // 横屏引导：仅在移动端窄屏首次对战显示，用户可关闭
  const [rotateHintDismissed, setRotateHintDismissed] = useState(true);
  useEffect(() => {
    try { setRotateHintDismissed(localStorage.getItem('battle-rotate-hint') === 'dismissed'); }
    catch { setRotateHintDismissed(false); }
  }, []);
  const dismissRotateHint = useCallback(() => {
    try { localStorage.setItem('battle-rotate-hint', 'dismissed'); } catch { /* ignore */ }
    setRotateHintDismissed(true);
  }, []);
  const toggleMute = useCallback(() => {
    unlockSfx();
    const next = !isSfxMuted();
    setSfxMuted(next);
    setMutedState(next);
    if (!next) sfx.click();
  }, []);

  // ====== 渲染 ======

  const isSelecting = !!(pendingAttack || pendingPlay);
  isSelectingRef.current = isSelecting;
  const pendingCardDef = pendingPlay ? getCardDef(mePlayer.hand.find((c) => c.instanceId === pendingPlay.instanceId)?.defId ?? '') : undefined;
  const attackerOrigin = pendingAttack?.origin ?? pendingPlay?.origin ?? null;
  const attackerName = pendingAttack ? (() => {
    if (pendingAttack.attackerId === HERO_ATTACKER_ID) return '英雄武器';
    const m = mePlayer.minions.find((x) => x.instanceId === pendingAttack.attackerId);
    return m ? (getCardDef(m.defId)?.name ?? m.defId) : '';
  })() : '';

  return (
    <div
      className="relative pt-2 pb-2 px-2 sm:pt-3 sm:pb-3 sm:px-4 [@media(max-height:520px)]:!pt-1 [@media(max-height:520px)]:!pb-1 [@media(max-height:520px)]:!px-2 flex flex-col gap-1.5 sm:gap-2 [@media(max-height:520px)]:!gap-1 sm:h-[calc(100dvh-24px)] sm:min-h-0 sm:overflow-hidden [@media(max-height:520px)]:!h-auto [@media(max-height:520px)]:!min-h-0 [@media(max-height:520px)]:!overflow-visible"
      onClickCapture={unlockSfx}
    >
      {/* 背景光效装饰 */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[#7C3AED] opacity-[0.08] blur-[140px]" />
        <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] rounded-full bg-cyan-500 opacity-[0.06] blur-[120px]" />
        <div className="absolute -bottom-40 right-0 w-[600px] h-[600px] rounded-full bg-rose-500 opacity-[0.06] blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(15,15,35,0.6)_80%)]" />
      </div>
      {/* 主内容保持在光效之上：移动端竖屏自然高度可滚动，sm+ 与短视窗（手机横屏）占满视窗 */}
      <div className="relative z-10 flex flex-col gap-1.5 sm:gap-2 [@media(max-height:520px)]:!gap-1 sm:flex-1 sm:min-h-0 [@media(max-height:520px)]:!flex-none [@media(max-height:520px)]:!min-h-0">
      {/* 顶部状态栏：移动端换行布局 */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap min-w-0">
          {/* 品牌 logo：整合自原顶部导航 */}
          <Link href="/game/gallery" aria-label="返回卡池"
                className="group flex items-center gap-1.5 select-none cursor-pointer pr-2 mr-0.5 sm:mr-1 border-r border-white/10">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-gradient-to-br from-[#7C3AED] to-[#F43F5E] text-white text-[11px] font-black shadow-[0_0_14px_rgba(124,58,237,0.55)]">
              1103
            </span>
            <span className="hidden sm:flex flex-col leading-none">
              <span className="font-display text-[12px] tracking-[0.18em] text-white">卡牌对战</span>
              <span className="text-[9px] tracking-[0.28em] text-[#A78BFA]/80">CHENZE · TCG</span>
            </span>
          </Link>
          <button onClick={onQuit} aria-label="返回" className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 btn-ghost rounded-lg text-sm cursor-pointer">
            <Icons.BackIcon size={14} /><span className="hidden sm:inline">返回</span>
          </button>
          <button onClick={() => reset()} aria-label="重开" className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 btn-ghost rounded-lg text-sm cursor-pointer">
            <Icons.RestartIcon size={14} /><span className="hidden sm:inline">重开</span>
          </button>
          <button onClick={() => setHelpOpen(true)} aria-label="卡牌说明" className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer bg-[#7C3AED]/20 hover:bg-[#7C3AED]/35 border border-[#A78BFA]/40 text-[#E9D5FF] transition-colors duration-200">
            <Icons.HelpIcon size={14} /><span className="hidden sm:inline">卡牌说明</span>
          </button>
          <button onClick={onSurrender} disabled={state.ended || state.phase === 'mulligan'} aria-label="投降"
                  className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer bg-[#F43F5E]/20 hover:bg-[#F43F5E]/40 disabled:opacity-30 disabled:cursor-not-allowed border border-[#FB7185]/40 text-[#FECDD3] transition-colors duration-200">
            <Icons.SurrenderIcon size={14} /><span className="hidden sm:inline">投降</span>
          </button>
          {!state.ended && isAIMode && isAITurn && (
            <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-rose-500/20 border border-rose-500/40 rounded text-rose-100 text-xs sm:text-sm font-semibold">
              <span className="inline-block w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              AI 思考中<span className="tracking-widest">…</span>
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3 text-white font-bold flex-wrap justify-end">
          {state.phase === 'main' && !state.ended && (
            <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg font-black text-base sm:text-lg tabular-nums ${
              secondsLeft <= 10 ? 'bg-rose-500/30 text-rose-100 animate-pulse ring-1 ring-rose-500/50' : 'bg-slate-800/70 text-cyan-200 ring-1 ring-cyan-500/30'
            }`}>
              <Icons.TimerIcon size={14} />
              {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
            </span>
          )}
          <span className="text-xs sm:text-sm">
            <span className="hidden sm:inline">回合 </span>
            <span className="sm:hidden">T</span>
            <span className={state.turn >= MAX_TURNS - 2 ? 'text-rose-300 font-bold' : 'text-amber-200'}>{state.turn}</span>
            <span className="text-white/35">/{MAX_TURNS}</span>
            <span className="text-white/40 mx-1">·</span>
            <span className="hidden sm:inline text-white/60">行动方 </span>
            <span className="text-amber-300">{state.activePlayer}</span>
          </span>
          {state.phase === 'mulligan' && <span className="text-amber-300 text-xs sm:text-sm">· 换牌阶段</span>}
          {state.ended && (
            <span className="inline-flex items-center gap-1 text-lime-400 text-xs sm:text-sm">
              <Icons.TrophyIcon size={14} />
              {state.winner === 'draw' ? '平局' : state.winner + ' 胜！'}
            </span>
          )}
          <button
            onClick={toggleMute}
            aria-pressed={muted}
            title={muted ? '音效已关闭（点击开启）' : '音效已开启（点击关闭）'}
            className={[
              'inline-flex items-center justify-center w-8 h-8 rounded-lg border cursor-pointer transition-colors',
              muted
                ? 'bg-slate-800/70 text-slate-400 border-slate-600/60 hover:text-slate-200'
                : 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 hover:bg-cyan-500/30',
            ].join(' ')}
          >
            {muted ? <SpeakerOffIcon size={16} /> : <SpeakerOnIcon size={16} />}
          </button>
        </div>
      </div>

      {/* 独占一行的提示条：选中目标 / 新手引导（避免移动端挤压变成竖排文字） */}
      {isSelecting && (
        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-amber-500/20 border border-amber-500/60 rounded-lg text-amber-100 text-xs sm:text-sm font-semibold shadow-lg shrink-0">
          <span className="inline-flex w-5 h-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-amber-900 font-black animate-bounce">2</span>
          <span className="flex-1 leading-snug">
            {pendingAttack && <>点击<span className="text-emerald-300 font-black">绿框目标</span>以让「{attackerName}」发起攻击</>}
            {pendingPlay && <>为「{pendingCardDef?.name ?? ''}」选择<span className="text-emerald-300 font-black">绿框目标</span></>}
          </span>
          <button onClick={cancelSelection} className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/40 hover:bg-rose-500/60 rounded text-white text-xs cursor-pointer">
            <Icons.CloseIcon size={10} /> 取消<span className="hidden sm:inline"> (ESC)</span>
          </button>
        </div>
      )}
      {!isSelecting && !state.ended && isHumanTurn && (
        <div className="hidden sm:flex [@media(max-height:520px)]:!hidden items-center gap-2 px-3 py-1 bg-sky-500/15 border border-sky-500/40 rounded text-sky-200 text-xs shrink-0">
          <span className="inline-flex w-4 h-4 items-center justify-center rounded-full bg-sky-400 text-sky-900 font-black text-[10px]">1</span>
          <span><span className="font-bold">点击手牌</span>出牌，或<span className="font-bold">点击己方角色</span>发动攻击</span>
        </div>
      )}
      {/* 移动端竖屏引导：横屏体验更佳（localStorage 一次性关闭） */}
      {!rotateHintDismissed && (
        <div className="sm:hidden flex items-center gap-2 px-2.5 py-1.5 bg-cyan-500/15 border border-cyan-500/40 rounded-lg text-cyan-100 text-xs shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-cyan-300" aria-hidden>
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <path d="M12 18h.01" />
            <path d="M20 10l2 2-2 2" />
            <path d="M22 12h-6" />
          </svg>
          <span className="flex-1 leading-snug">横屏玩更顺畅，战场会自动铺开；竖屏下可上下滑动查看。</span>
          <button onClick={dismissRotateHint} className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-white text-xs cursor-pointer">
            <Icons.CloseIcon size={10} /> 知道了
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-3 [@media(max-height:520px)]:!gap-1.5 sm:flex-1 sm:min-h-0 sm:overflow-hidden [@media(max-height:520px)]:!flex-none [@media(max-height:520px)]:!min-h-0 [@media(max-height:520px)]:!overflow-visible">
        {/* 主战场 */}
        <div className="flex flex-col gap-1.5 [@media(max-height:520px)]:!gap-1 min-w-0 sm:flex-1 sm:min-h-0 sm:overflow-hidden [@media(max-height:520px)]:!flex-none [@media(max-height:520px)]:!min-h-0 [@media(max-height:520px)]:!overflow-visible">
          {/* HeroBar + BoardRow 行（对手）*/}
          <div className="shrink-0">
            <HeroBar player={oppPlayer} side="opp" onClick={() => onHeroClick(opp)}
                     targetable={legalTargets.heroes.has(opp)}
                     flashKey={flashPlayer[opp]} />
          </div>
          <div className="h-[132px] sm:h-auto sm:flex-1 sm:min-h-0 sm:overflow-hidden [@media(max-height:520px)]:!h-[96px] [@media(max-height:520px)]:!flex-none [@media(max-height:520px)]:!min-h-0 [@media(max-height:520px)]:!overflow-hidden">
            <BoardRow minions={oppPlayer.minions} owner={opp} onClick={(m, e) => onMinionClick(opp, m, e)}
                      onHover={onMinionHover}
                      legalMinions={legalTargets.minions} isSelecting={isSelecting} />
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent shrink-0" />
          <div className="h-[132px] sm:h-auto sm:flex-1 sm:min-h-0 sm:overflow-hidden [@media(max-height:520px)]:!h-[96px] [@media(max-height:520px)]:!flex-none [@media(max-height:520px)]:!min-h-0 [@media(max-height:520px)]:!overflow-hidden">
            <BoardRow minions={mePlayer.minions} owner={me} onClick={(m, e) => onMinionClick(me, m, e)}
                      onHover={onMinionHover}
                      legalMinions={legalTargets.minions} isSelecting={isSelecting}
                      selectedId={pendingAttack?.attackerId}
                      attackableSet={!isSelecting ? attackableMyMinions : undefined} />
          </div>
          <div className="shrink-0">
            <HeroBar player={mePlayer} side="me" onClick={() => onHeroClick(me)}
                     targetable={legalTargets.heroes.has(me)}
                     onHeroAttack={onHeroAttack}
                     onHeroPower={onHeroPower}
                     heroPowerAvailable={!mePlayer.heroPowerUsed && mePlayer.mana >= 2 && !state.ended}
                     flashKey={flashPlayer[me]} />
          </div>
          {/* 手牌 + 结束回合 横排（固定高度）*/}
          <div className="flex gap-1.5 sm:gap-2 shrink-0">
            <div className="relative flex-1 rounded-xl p-1.5 sm:p-2 h-[138px] sm:h-[168px] [@media(max-height:520px)]:h-[110px] [@media(max-height:520px)]:p-1 bg-gradient-to-t from-[#7C3AED]/[0.08] via-slate-900/30 to-slate-900/10 border border-[#A78BFA]/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] min-w-0">
              <div className="absolute -top-2 left-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900/95 border border-[#A78BFA]/25 text-[10px] font-bold text-[#A78BFA] tracking-[0.25em] uppercase z-10">
                <Icons.CharacterIcon size={10} /> Hand · {mePlayer.hand.length}
              </div>
              <div className="flex gap-2 overflow-x-auto items-end h-full pt-1.5">
                {mePlayer.hand.length === 0 && (
                  <div className="m-auto inline-flex items-center gap-2 text-white/30 text-xs">
                    <Icons.CharacterIcon size={14} className="text-white/25" />
                    <span className="tracking-[0.3em] uppercase">no hand</span>
                  </div>
                )}
                {mePlayer.hand.map((c) => (
                  <HandCard key={c.instanceId} card={c}
                            playable={c.currentCost <= mePlayer.mana && !state.ended && !isSelecting && isHumanTurn}
                            selected={pendingPlay?.instanceId === c.instanceId}
                            onClick={(e) => onHandCardClick(c, e)}
                            onHover={onHandHover} />
                ))}
              </div>
            </div>
            <button onClick={endTurn} disabled={state.ended || !isHumanTurn}
                    className="inline-flex flex-col items-center justify-center gap-0.5 sm:gap-1 shrink-0 w-16 sm:w-24 [@media(max-height:520px)]:w-14 h-[138px] sm:h-[168px] [@media(max-height:520px)]:h-[110px] bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-black rounded-xl shadow-[0_6px_24px_-6px_rgba(245,158,11,0.6)] cursor-pointer transition-transform hover:-translate-y-0.5">
              <Icons.RestartIcon size={20} className="sm:[&]:w-[22px] sm:[&]:h-[22px]" />
              <span className="text-xs sm:text-sm leading-tight">结束回合</span>
              <span className="text-[9px] sm:text-[10px] opacity-70 tracking-[0.2em]">END</span>
            </button>
          </div>
        </div>

        {/* 日志面板 */}
        <LogPanel state={state} />
      </div>

      {/* 攻击冲击线 + 爆发圆环（位于飘字之下） */}
      <AttackFxLayer strikes={strikes} />

      {/* 伤害/治疗飘字层 */}
      <DamageFloaters floaters={floaters} />

      {/* 卡牌悬浮预览（固定位置，避开容器裁切） */}
      <CardHoverPreview card={hoverCard} />

      {/* 瞄准箭头 */}
      {isSelecting && attackerOrigin && (
        <AimArrow from={attackerOrigin} to={mousePos} mode={pendingAttack ? 'attack' : 'cast'} />
      )}

      {/* 帮助弹窗 */}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}

      {/* 胜利 / 失败 全屏弹窗 */}
      {state.ended && (
        <GameOverOverlay
          winner={state.winner}
          me={me}
          onRestart={() => reset()}
          onQuit={onQuit}
          isOnline={isOnline}
          aiDifficulty={isAIMode ? aiDifficulty : undefined}
          durationMs={endedDurationMs ?? undefined}
          turns={state.turn}
        />
      )}

      {/* 换牌阶段弹窗：AI/在线模式下仅对本方玩家显示 */}
      {state.phase === 'mulligan' && state.mulliganPending.length > 0 && (() => {
        const cur = state.mulliganPending[0];
        // AI 模式下只对 perspective 侧玩家显示；AI 侧由 useEffect 自动 dispatch
        if (isAIMode && cur !== me) return null;
        // 在线模式下只显示自己的换牌，对手的由轮询同步
        if (isOnline && cur !== me) return null;
        return (
          <MulliganOverlay
            player={cur}
            hand={state.players[cur].hand}
            onConfirm={(replaceIds) => dispatch({ type: 'MULLIGAN', player: cur, replaceInstanceIds: replaceIds })}
          />
        );
      })()}
      </div>
    </div>
  );
}

// ============ 子组件 ============

function HeroBar({ player, side, onClick, targetable, onHeroAttack, onHeroPower, heroPowerAvailable, flashKey }: {
  player: import('@/game/types').PlayerState;
  side: 'me' | 'opp';
  onClick: () => void;
  targetable: boolean;
  onHeroAttack?: (e?: React.MouseEvent<HTMLElement>) => void;
  onHeroPower?: () => void;
  heroPowerAvailable?: boolean;
  flashKey: number;
}) {
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
            牌库 <b className="text-white/70 tabular-nums">{player.deck.length}</b>
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

function EventBadge({ ev, hideForOpp }: { ev: EventCard; hideForOpp: boolean }) {
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

function BoardRow({ minions, owner, onClick, onHover, legalMinions, isSelecting, selectedId, attackableSet }: {
  minions: Minion[]; owner: PlayerId; onClick: (m: Minion, e: React.MouseEvent<HTMLElement>) => void;
  onHover: (m: Minion | null, rect?: DOMRect) => void;
  legalMinions: Set<string>; isSelecting: boolean;
  selectedId?: string; attackableSet?: Set<string>;
}) {
  return (
    <div className={`relative flex gap-1.5 sm:gap-3 h-full min-h-[92px] sm:min-h-[100px] [@media(max-height:520px)]:min-h-0 rounded-xl p-1.5 sm:p-3 [@media(max-height:520px)]:p-1 overflow-x-auto overflow-y-hidden transition-all ${
      minions.length === 0
        ? 'bg-gradient-to-b from-white/[0.02] via-white/[0.04] to-white/[0.02] border border-dashed border-white/10'
        : 'bg-gradient-to-b from-white/[0.04] via-white/[0.06] to-white/[0.04] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
    } ${isSelecting ? 'ring-1 ring-white/20' : ''}`}>
      {/* 场地纹理线 */}
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-[0.08] bg-[linear-gradient(90deg,transparent_0,transparent_calc(16.66%_-_1px),rgba(255,255,255,0.5)_calc(16.66%),transparent_calc(16.66%_+_1px))] bg-[length:16.66%_100%]" />
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

function MinionCard({ minion, onClick, onHover, selected, targetable, dimmed, attackable }: {
  minion: Minion; owner: PlayerId; onClick: (e: React.MouseEvent<HTMLElement>) => void;
  onHover: (m: Minion | null, rect?: DOMRect) => void;
  selected: boolean; targetable: boolean; dimmed: boolean; attackable?: boolean;
}) {
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
            className={`relative w-[96px] h-[124px] sm:w-[116px] sm:h-[148px] [@media(max-height:520px)]:w-[70px] [@media(max-height:520px)]:h-[88px] rounded-lg overflow-hidden border-[3px] animate-summon-in ${RARITY_COLOR[rarity]} ${RARITY_GLOW[rarity]} transition-all ${
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

function HandCard({ card, playable, selected, onClick, onHover }: {
  card: CardInstance; playable: boolean; selected: boolean;
  onClick: (e: React.MouseEvent<HTMLElement>) => void;
  onHover: (card: CardInstance | null, rect?: DOMRect) => void;
}) {
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

// 固定位置的卡牌悬浮预览（避开容器裁切）
function CardHoverPreview({ card }: { card: { defId: string; cost: number; rect: DOMRect } | null }) {
  if (!card) return null;
  const preset = getPreset(card.defId);
  if (!preset) return null;
  const def = getCardDef(card.defId);
  const tags = extractMechanicTags(preset.description);
  const extraKeywords = (def?.keywords ?? []).filter((k) => KEYWORD_DICT[k]);
  const hasGlossary = tags.length > 0 || extraKeywords.length > 0;

  const PREVIEW_W = 240;
  const CARD_H = Math.round(PREVIEW_W * (4 / 3));
  // 词典面板预计高度（每条 ~44px + padding）
  const glossaryH = hasGlossary ? 36 + (tags.length + extraKeywords.length) * 42 : 0;
  const totalH = CARD_H + (hasGlossary ? glossaryH + 4 : 0);

  const gap = 8;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  // 尝试上方；不够则下方；都不够则靠右
  const showAbove = card.rect.top > totalH + gap + 16;
  const showBelow = !showAbove && vh - card.rect.bottom > totalH + gap + 16;
  let top: number;
  if (showAbove) top = card.rect.top - totalH - gap;
  else if (showBelow) top = card.rect.bottom + gap;
  else top = Math.max(8, vh - totalH - 8);

  let left = card.rect.left + card.rect.width / 2 - PREVIEW_W / 2;
  // 如果不能上/下只能侧边
  if (!showAbove && !showBelow) {
    // 右侧放
    left = Math.min(vw - PREVIEW_W - 8, card.rect.right + gap);
  }
  left = Math.max(8, Math.min(left, vw - PREVIEW_W - 8));

  return (
    <div className="pointer-events-none fixed z-[9999] drop-shadow-2xl"
         style={{ top, left, width: PREVIEW_W }}>
      <CardFrame
        name={preset.name}
        image={preset.imagePath ?? ''}
        type={preset.type}
        rarity={preset.rarity}
        cost={card.cost}
        attack={preset.attack}
        health={preset.health}
        description={preset.description}
        flavor={preset.flavor}
        width={PREVIEW_W}
        interactive={false}
      />
      {hasGlossary && (
        <div className="mt-1 bg-slate-950/95 border border-[#A78BFA]/40 rounded-lg p-2 text-xs text-white/90 shadow-xl">
          <div className="text-[#A78BFA] font-bold mb-1.5 text-[11px] tracking-wider uppercase">关键字说明</div>
          <div className="space-y-1.5">
            {tags.map((t) => {
              const info = MECHANIC_DICT[t];
              const Ico = info.Icon;
              return (
                <div key={t} className="leading-snug flex gap-1.5 items-start">
                  <Ico size={12} className="text-[#A78BFA] mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-[#C4B5FD]">【{t}】</span>
                    <span className="text-white/75"> {info.desc}</span>
                  </div>
                </div>
              );
            })}
            {extraKeywords.map((k) => {
              const info = KEYWORD_DICT[k];
              const Ico = info.Icon;
              return (
                <div key={k} className="leading-snug flex gap-1.5 items-start">
                  <Ico size={12} className="text-emerald-300 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-200">{info.name}</span>
                    <span className="text-white/75"> {info.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// 瞄准箭头（炉石风） - 从 from 到 to 绘制贝塞尔曲线箭头
function AimArrow({ from, to, mode }: { from: Point; to: Point; mode: 'attack' | 'cast' }) {
  // 两端控制点：起点稍微向上拱起形成弧线
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 8) return null;
  // 控制点：中点向上方偏移 (垂直于主方向)
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const perpX = -dy / dist;
  const perpY = dx / dist;
  const bulge = Math.min(80, dist * 0.25);
  const ctrlX = midX + perpX * bulge;
  const ctrlY = midY + perpY * bulge;

  // 箭头方向（切线）
  const tangentX = to.x - ctrlX;
  const tangentY = to.y - ctrlY;
  const tangentLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY) || 1;
  const tx = tangentX / tangentLen;
  const ty = tangentY / tangentLen;
  const arrowSize = 18;
  const baseX = to.x - tx * arrowSize;
  const baseY = to.y - ty * arrowSize;
  const leftX = baseX + ty * (arrowSize * 0.6);
  const leftY = baseY - tx * (arrowSize * 0.6);
  const rightX = baseX - ty * (arrowSize * 0.6);
  const rightY = baseY + tx * (arrowSize * 0.6);

  const color = mode === 'attack' ? '#f43f5e' : '#a855f7';
  const glow = mode === 'attack' ? 'rgba(244,63,94,0.6)' : 'rgba(168,85,247,0.6)';

  return (
    <svg className="pointer-events-none fixed inset-0 z-[9998]"
         width="100%" height="100%"
         viewBox={`0 0 ${typeof window !== 'undefined' ? window.innerWidth : 1024} ${typeof window !== 'undefined' ? window.innerHeight : 768}`}
         preserveAspectRatio="none">
      <defs>
        <filter id="arrowGlow">
          <feGaussianBlur stdDeviation="3" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* 外发光底色 */}
      <path d={`M ${from.x} ${from.y} Q ${ctrlX} ${ctrlY} ${to.x} ${to.y}`}
            stroke={glow} strokeWidth={14} fill="none" strokeLinecap="round" />
      {/* 主线 */}
      <path d={`M ${from.x} ${from.y} Q ${ctrlX} ${ctrlY} ${to.x} ${to.y}`}
            stroke={color} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray="14 8">
        <animate attributeName="stroke-dashoffset" from="0" to="-22" dur="0.6s" repeatCount="indefinite" />
      </path>
      {/* 箭头 */}
      <polygon points={`${to.x},${to.y} ${leftX},${leftY} ${rightX},${rightY}`} fill={color} filter="url(#arrowGlow)" />
      {/* 起点光圈 */}
      <circle cx={from.x} cy={from.y} r={10} fill="none" stroke={color} strokeWidth={3} opacity={0.8}>
        <animate attributeName="r" from="8" to="18" dur="1s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.8" to="0" dur="1s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

// 换牌阶段 overlay：玩家选择要换掉的起始手牌
function MulliganOverlay({ player, hand, onConfirm }: {
  player: PlayerId; hand: CardInstance[]; onConfirm: (replaceIds: string[]) => void;
}) {
  const [marked, setMarked] = useState<Set<string>>(new Set());
  // 切换玩家时清空
  useEffect(() => { setMarked(new Set()); }, [player]);

  const toggle = (id: string) => {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const markedCount = marked.size;

  return (
    <div className="fixed inset-0 z-[99998] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl max-w-4xl w-full p-6 shadow-2xl">
        <div className="text-center mb-3">
          <h2 className="inline-flex items-center gap-2 text-2xl sm:text-3xl font-black text-amber-300 mb-1 tracking-wider">
            <Icons.RebornIcon size={26} />
            {player === 'P1' ? '玩家 1' : '玩家 2'} · 换牌阶段
          </h2>
          <p className="text-white/70 text-sm">
            点击需要<span className="text-amber-300 font-bold">换掉</span>的手牌（将洗回牌库并补抽同等数量）；满意直接确认。
          </p>
        </div>

        <div className="flex justify-center gap-3 flex-wrap my-5 min-h-[200px]">
          {hand.map((c) => {
            const preset = getPreset(c.defId);
            const def = getCardDef(c.defId);
            if (!preset || !def) return null;
            const isMarked = marked.has(c.instanceId);
            return (
              <button key={c.instanceId} onClick={() => toggle(c.instanceId)}
                      className={`relative transition-transform ${isMarked ? 'scale-95 opacity-50 grayscale' : 'hover:-translate-y-2'}`}>
                <CardFrame
                  name={preset.name}
                  image={preset.imagePath ?? ''}
                  type={preset.type}
                  rarity={preset.rarity}
                  cost={c.currentCost}
                  attack={preset.attack}
                  health={preset.health}
                  description={preset.description}
                  flavor={preset.flavor}
                  width={140}
                  interactive={false}
                />
                {isMarked && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-rose-500 text-white font-black text-2xl px-4 py-1 rounded-full border-4 border-white shadow-2xl rotate-[-10deg]">
                      换掉
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="text-white/60 text-sm">
            已标记 <span className="text-amber-300 font-bold text-base">{markedCount}</span> / {hand.length} 张
          </div>
          <div className="flex gap-2">
            <button onClick={() => setMarked(new Set())}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">
              清空选择
            </button>
            <button onClick={() => onConfirm(Array.from(marked))}
                    className="inline-flex items-center gap-1.5 px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-lg shadow-lg cursor-pointer transition-colors">
              <Icons.CheckIcon size={14} /> 确认{markedCount > 0 ? `换 ${markedCount} 张` : '（不换）'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 帮助弹窗：完整术语词典 + 基础玩法
function HelpModal({ onClose }: { onClose: () => void }) {
  const mechanicEntries: Array<[string, DictEntry]> = [
    ['登场', MECHANIC_DICT['登场']], ['退场', MECHANIC_DICT['退场']],
    ['联动', MECHANIC_DICT['联动']], ['重播', MECHANIC_DICT['重播']],
    ['暗箱', MECHANIC_DICT['暗箱']],
    ['即时', MECHANIC_DICT['即时']], ['装备时', MECHANIC_DICT['装备时']],
    ['场地', MECHANIC_DICT['场地']],
  ];
  const keywordEntries = Object.values(KEYWORD_DICT);
  const typeCards: Array<{ Icon: React.ComponentType<{ className?: string; size?: number }>; label: string; desc: string; color: string }> = [
    { Icon: Icons.CharacterIcon, label: '角色', desc: '上场单位，自带攻击与生命',   color: 'text-pink-200' },
    { Icon: Icons.ItemIcon,      label: '道具', desc: '即时 / 延时消耗品',            color: 'text-emerald-200' },
    { Icon: Icons.EquipmentIcon, label: '装备', desc: '武器 / 防具，装备到玩家槽位',  color: 'text-sky-200' },
    { Icon: Icons.EffectIcon,    label: '消耗', desc: '一次性效果牌',                 color: 'text-amber-200' },
    { Icon: Icons.EventIcon,     label: '事件', desc: '场地倒计时 / 暗箱触发',        color: 'text-violet-200' },
  ];
  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto"
         onClick={onClose}>
      <div className="bg-slate-900 border-2 border-[#A78BFA]/40 rounded-xl max-w-3xl w-full p-3 sm:p-4 shadow-2xl max-h-[90vh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 sticky top-0 bg-slate-900 pb-2 border-b border-white/10">
          <h2 className="text-base sm:text-lg font-black text-[#A78BFA] tracking-wider uppercase">卡牌与术语说明</h2>
          <button onClick={onClose} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-white text-xs cursor-pointer transition-colors">
            <Icons.CloseIcon size={12} /> 关闭
          </button>
        </div>

        {/* 基本玩法 */}
        <section className="mb-3">
          <h3 className="text-lime-300 font-bold text-sm mb-1.5 tracking-wider uppercase">基本玩法</h3>
          <ul className="space-y-0.5 text-xs text-white/80 leading-snug">
            <li>· 每回合开始抽 1 张牌，流量上限 +1（最高 10）；流量每回合自动回满。</li>
            <li>· <span className="text-cyan-300 font-bold">打出手牌</span>：点击手牌；需要目标的消耗牌再选一个目标。</li>
            <li>· <span className="text-rose-300 font-bold">发动攻击</span>：点击己方角色 → 再点击对方角色或玩家。</li>
            <li>· 有<span className="text-stone-300 font-bold">挡枪</span>的敌方角色必须先被清除才能打其它目标。</li>
            <li>· 让对方玩家流量降到 0 即获胜。</li>
          </ul>
        </section>

        {/* 卡牌类型 */}
        <section className="mb-3">
          <h3 className="text-cyan-300 font-bold text-sm mb-1.5 tracking-wider uppercase">卡牌 5 大类</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
            {typeCards.map(({ Icon, label, desc, color }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded p-1.5 flex gap-1.5 items-start">
                <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                <div>
                  <div className={`font-bold ${color}`}>{label}</div>
                  <div className="text-white/70 mt-0.5 leading-tight">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 机制关键字 */}
        <section className="mb-3">
          <h3 className="text-[#A78BFA] font-bold text-sm mb-1.5 tracking-wider uppercase">机制关键字（描述中的【XXX】）</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {mechanicEntries.map(([name, info]) => {
              const Ico = info.Icon;
              return (
                <div key={name} className="bg-white/5 border border-white/10 rounded p-1.5 flex gap-1.5 items-start">
                  <Ico className="w-3.5 h-3.5 shrink-0 text-[#C4B5FD] mt-0.5" />
                  <div>
                    <div className="font-bold text-[#C4B5FD] text-xs">【{name}】</div>
                    <div className="text-white/70 text-[11px] mt-0.5 leading-tight">{info.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 角色关键字 */}
        <section>
          <h3 className="text-emerald-300 font-bold text-sm mb-1.5 tracking-wider uppercase">角色属性关键字</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {keywordEntries.map((k) => {
              const Ico = k.Icon;
              return (
                <div key={k.name} className="bg-white/5 border border-white/10 rounded p-1.5 flex gap-1.5 items-start">
                  <Ico className="w-3.5 h-3.5 shrink-0 text-emerald-300 mt-0.5" />
                  <div>
                    <div className="font-bold text-emerald-200 text-xs">{k.name}</div>
                    <div className="text-white/70 text-[11px] mt-0.5 leading-tight">{k.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mt-3 text-[11px] text-white/40 text-center">
          想知道具体某张牌？把鼠标放到卡牌上会自动弹出详情 + 关键字解释。
        </div>
      </div>
    </div>
  );
}

// 胜负全屏弹窗
function GameOverOverlay({
  winner, me, onRestart, onQuit, isOnline = false, aiDifficulty, durationMs, turns,
}: {
  winner: PlayerId | 'draw' | null | undefined;
  me: PlayerId;
  onRestart: () => void;
  onQuit: () => void;
  /** 在线模式不允许本地 reset（对手无法同步），隐藏"再来一局" */
  isOnline?: boolean;
  /** C1：AI 模式下显示难度 */
  aiDifficulty?: AIDifficulty;
  /** C1：对局耗时（毫秒） */
  durationMs?: number;
  /** C1：对局回合数 */
  turns?: number;
}) {
  const isDraw = winner === 'draw';
  const isWin = !isDraw && winner === me;
  const title = isDraw ? '平 局' : isWin ? '胜 利' : '失 败';
  const difficultyLabel = aiDifficulty === 'easy' ? '轻松'
    : aiDifficulty === 'hard' ? '高压'
    : aiDifficulty === 'normal' ? '标准'
    : null;
  const durationText = (() => {
    if (typeof durationMs !== 'number') return null;
    const total = Math.round(durationMs / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m > 0 ? `${m}分${s.toString().padStart(2, '0')}秒` : `${s}秒`;
  })();
  const ResultIcon = isDraw ? Icons.HandshakeIcon : isWin ? Icons.TrophyIcon : Icons.SkullIcon;
  const subtitle = isDraw
    ? '双方玩家同归于尽'
    : isWin
      ? '对方玩家流量归零，恭喜你拿下这一局！'
      : '你的玩家流量归零，再接再厉！';
  const accent = isDraw
    ? 'from-slate-400 to-slate-600 text-slate-100'
    : isWin
      ? 'from-amber-300 via-yellow-400 to-amber-500 text-amber-950'
      : 'from-rose-500 via-rose-600 to-rose-800 text-rose-50';
  const ring = isDraw ? 'ring-slate-400/40' : isWin ? 'ring-amber-400/60' : 'ring-rose-500/60';

  return (
    <div className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className={`relative max-w-md w-full bg-slate-900 border-2 rounded-3xl p-8 sm:p-10 text-center shadow-2xl ring-8 ${ring} ${isWin ? 'border-amber-400/60' : isDraw ? 'border-slate-500/40' : 'border-rose-500/60'}`}>
        <div className="mb-4 flex justify-center animate-bounce-slow">
          <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br ${accent} flex items-center justify-center shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]`}>
            <ResultIcon size={56} className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
          </div>
        </div>
        <div className={`inline-block text-4xl sm:text-5xl font-black tracking-[0.3em] px-6 py-2 rounded-xl bg-gradient-to-br ${accent} mb-4 shadow-lg`}>
          {title}
        </div>
        <div className="text-white/80 text-sm sm:text-base mb-3">{subtitle}</div>
        {(difficultyLabel || durationText || turns) && (
          <div className="mb-5 flex flex-wrap items-center justify-center gap-2 text-xs text-white/70">
            {difficultyLabel && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/15">
                难度 <span className="text-amber-200 font-semibold">{difficultyLabel}</span>
              </span>
            )}
            {typeof turns === 'number' && turns > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/15">
                回合 <span className="text-cyan-200 font-semibold">{turns}</span>
              </span>
            )}
            {durationText && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/15">
                耗时 <span className="text-emerald-200 font-semibold">{durationText}</span>
              </span>
            )}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {!isOnline && (
            <button
              onClick={onRestart}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 font-bold rounded-xl shadow-lg transition-transform hover:scale-105 cursor-pointer"
            >
              <Icons.RestartIcon size={16} /> 再来一局
            </button>
          )}
          <button
            onClick={onQuit}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl transition-transform hover:scale-105 cursor-pointer"
          >
            <Icons.BackIcon size={16} /> {isOnline ? '返回好友房' : '返回大厅'}
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes bounce-slow { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }
        .animate-fade-in { animation: fade-in 0.3s ease-out }
        .animate-bounce-slow { animation: bounce-slow 1.8s ease-in-out infinite }
      `}</style>
    </div>
  );
}

function LogPanel({ state }: { state: GameState }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // 移动端默认折叠，避免占用宝贵垂直空间；lg 以上始终展示
  const [open, setOpen] = useState(false);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [state.log.length]);
  return (
    <div className="lg:w-72 shrink-0 flex flex-col min-h-0 max-h-full">
      <button onClick={() => setOpen(!open)}
              className="lg:hidden mb-2 px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded text-white text-sm font-bold flex items-center justify-between cursor-pointer shrink-0">
        <span className="inline-flex items-center gap-1.5">
          <Icons.LogIcon size={14} /> 战斗日志 ({state.log.length})
        </span>
        <Icons.ChevronIcon size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      <div ref={scrollRef}
           className={`bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white/70 overflow-y-auto flex-1 min-h-0 ${
             open ? 'max-h-[240px] lg:max-h-none' : 'hidden lg:block'
           }`}>
        <div className="hidden lg:flex sticky top-0 bg-slate-900/80 pb-2 font-bold text-white items-center gap-1.5">
          <Icons.LogIcon size={14} /> 战斗日志
        </div>
        <div className="space-y-0.5">
          {state.log.slice(-100).map((l, i) => (
            <div key={i} className={KIND_COLOR[l.kind] ?? 'text-white/60'}>
              <span className="text-white/30">T{l.turn}·{l.player}</span> {l.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SpeakerOnIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  );
}
function SpeakerOffIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <line x1="22" y1="9" x2="16" y2="15"/>
      <line x1="16" y1="9" x2="22" y2="15"/>
    </svg>
  );
}

const KIND_COLOR: Record<string, string> = {
  damage: 'text-rose-300',
  heal: 'text-emerald-300',
  death: 'text-slate-400',
  play: 'text-sky-300',
  attack: 'text-amber-200',
  battlecry: 'text-fuchsia-300',
  deathrattle: 'text-rose-400',
  secret: 'text-amber-400 font-bold',
  countdown: 'text-indigo-300',
  invalid: 'text-red-500',
  gameOver: 'text-lime-400 font-bold',
  draw: 'text-white/40',
  fatigue: 'text-red-400',
  turnStart: 'text-white font-semibold border-t border-white/10 pt-1 mt-1',
  turnEnd: 'text-white/30',
  combo: 'text-pink-300 font-bold',
};
