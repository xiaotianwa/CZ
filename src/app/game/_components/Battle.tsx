'use client';

/**
 * Battle 组件：通用对战 UI（hotseat 与 vs AI 共享）
 * - hotseat: 不传 perspective / aiPlayer，视角跟随 activePlayer
 * - vs AI:   传 perspective='P1' + aiPlayer='P2'，AI 自动出招
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useCardPresets } from '@/lib/tcg/useCardPresets';
import { useGame } from '@/game/useGame';
import { HERO_ATTACKER_ID, getCardDef, MAX_TURNS } from '@/game/engine';
import { mergeLivePresetsIntoEngine } from '@/game/cardLoader';
import { nextAction as aiNextAction, type AIDifficulty } from '@/game/ai';
import type { CardInstance, Minion, PlayerId } from '@/game/types';
import * as Icons from '@/components/game/GameIcons';
import { sfx, isMuted as isSfxMuted, setMuted as setSfxMuted, unlockAudio as unlockSfx } from '@/game/sound';
// D2 部分拆分：低耦合子组件外移
import { GameOverOverlay } from './battle/GameOverOverlay';
import { LogPanel } from './battle/LogPanel';
import { HeroBar } from './battle/HeroBar';
import { BoardRow } from './battle/BattleStage';
import { HandArea } from './battle/HandArea';
import {
  CardHoverPreview, AimArrow, MulliganOverlay, HelpModal,
  SpeakerOnIcon, SpeakerOffIcon,
} from './battle/BattleOverlay';
import {
  useDamageFloaters, DamageFloaters,
  useAttackFx, AttackFxLayer,
  useSfxFromState,
} from './battle/effects';
import {
  PRESET_MAP, getPreset,
  defNeedsTarget, rectCenter,
  type Point,
} from './battle/shared';

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
          <HandArea
            hand={mePlayer.hand}
            mana={mePlayer.mana}
            ended={state.ended}
            isSelecting={isSelecting}
            isHumanTurn={isHumanTurn}
            pendingPlayId={pendingPlay?.instanceId}
            onCardClick={onHandCardClick}
            onCardHover={onHandHover}
            onEndTurn={endTurn}
          />
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

// ============ 子组件已全部抽出至 battle/ 子目录（D2 完成） ============
