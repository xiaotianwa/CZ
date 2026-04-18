'use client';

/**
 * 好友房 —— 邀请对战（在线动作同步）
 *
 * 核心机制：
 * 1. 双端用相同 seed + 相同卡组初始化引擎（确定性）
 * 2. 本方动作 dispatch → POST /api/tcg/room/action 上传
 * 3. 轮询 GET /api/tcg/room/status?since=N 拉取对手新动作 → inject 到本地引擎
 * 4. 引擎确定性保证：相同 seed + 相同动作序列 = 相同结果
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Action, Deck, PlayerId } from '@/game/types';
import { Battle } from '../_components/Battle';
import { DeckPicker, useAllDeckOptions, type DeckOptionKey } from '../_components/DeckPicker';
import { CardPicker } from '../_components/CardPicker';
import { unlockAudio as unlockSfx } from '@/game/sound';

type RoomPhase = 'loading' | 'login' | 'menu' | 'waiting' | 'battle';

interface UserInfo {
  id: string;
  name: string;
  avatar?: string | null;
}

interface GameInit {
  seed: number;
  firstPlayer: PlayerId;
  p1Deck: Deck;
  p2Deck: Deck;
  myRole: 'host' | 'guest';
  roomCode: string;
  /** B2 断线重连：挂载后需要回放到最新状态的动作序列（包含我方+对手历史） */
  pendingReplay?: Action[];
}

// B2 断线重连：sessionStorage key / helpers
const ROOM_SESSION_KEY = 'tcg_room_session_v1';
interface RoomSession {
  code: string;
  role: 'host' | 'guest';
}
function loadRoomSession(): RoomSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(ROOM_SESSION_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw) as RoomSession;
    if (!obj?.code || (obj.role !== 'host' && obj.role !== 'guest')) return null;
    return obj;
  } catch {
    return null;
  }
}
function saveRoomSession(s: RoomSession): void {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.setItem(ROOM_SESSION_KEY, JSON.stringify(s)); } catch { /* quota */ }
}
function clearRoomSession(): void {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.removeItem(ROOM_SESSION_KEY); } catch { /* ignore */ }
}

export default function RoomPage() {
  const options = useAllDeckOptions();
  const [phase, setPhase] = useState<RoomPhase>('loading');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [deckMode, setDeckMode] = useState<'preset' | 'custom'>('preset');
  const [presetKey, setPresetKey] = useState<DeckOptionKey>({ kind: 'preset', key: 'taunt' });
  const [customDeck, setCustomDeck] = useState<Deck | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [gameInit, setGameInit] = useState<GameInit | null>(null);

  // 登录检查（并尝试 B2 断线重连）
  // 注意：具体恢复逻辑依赖 startWaitPolling / startActionPolling，其定义在下方，
  // 这里通过 ref 把 restoreFromSession 暴露给下方的 useEffect 调度。
  const restoreFromSessionRef = useRef<(s: RoomSession) => Promise<boolean>>(
    async () => false,
  );
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        const json = await res.json();
        if (!(json.code === 0 && json.data?.id)) {
          if (!cancelled) setPhase('login');
          return;
        }
        if (cancelled) return;
        setUser(json.data);
        // B2: 若存在本地 session，尝试恢复房间
        const session = loadRoomSession();
        if (session) {
          const restored = await restoreFromSessionRef.current(session);
          if (cancelled) return;
          if (restored) return;
        }
        setPhase('menu');
      } catch {
        if (!cancelled) setPhase('login');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 动作同步相关
  const injectRef = useRef<((a: Action) => void) | null>(null);
  const actionCountRef = useRef(0);                                 // 本地已知的动作总数
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollActiveRef = useRef(false);                              // 轮询是否仍需继续
  const pollDelayRef = useRef(1000);                                // 当前轮询延迟（ms，指数退避）
  const roomCodeRef = useRef('');
  const waitStartRef = useRef(0);                                   // 等待阶段开始时间戳
  const WAIT_TIMEOUT_MS = 10 * 60 * 1000;                           // 等待对手超时 10 分钟

  const stopPolling = useCallback(() => {
    pollActiveRef.current = false;
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // 页面隐藏时暂停轮询；恢复时重置为快速轮询
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        if (pollTimerRef.current) {
          clearTimeout(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      } else if (pollActiveRef.current && !pollTimerRef.current) {
        pollDelayRef.current = 1000;  // 恢复可见时立即快速轮询
        // 让轮询 loop 自行重启：触发一次 schedulePoll
        const ev = new CustomEvent('tcg-room-resume-poll');
        window.dispatchEvent(ev);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const getMyDeck = (): Deck => {
    if (deckMode === 'custom' && customDeck) return customDeck;
    return options.resolve(presetKey);
  };

  // ====== 上传动作到服务器 ======
  const handleOnAction = useCallback((action: Action) => {
    const code = roomCodeRef.current;
    if (!code) return;
    const idx = actionCountRef.current;
    actionCountRef.current = idx + 1;
    fetch('/api/tcg/room/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: code, action, actionIndex: idx }),
    }).catch(() => { /* 重试在下次轮询兜底 */ });
  }, []);

  // ====== 通用：递归 setTimeout 轮询（支持指数退避） ======
  const schedulePoll = useCallback((fn: () => Promise<void>, initialDelay: number) => {
    const loop = async () => {
      if (!pollActiveRef.current || document.hidden) return;
      try { await fn(); } catch { /* ignore */ }
      if (pollActiveRef.current && !document.hidden) {
        pollTimerRef.current = setTimeout(loop, pollDelayRef.current);
      }
    };
    pollDelayRef.current = initialDelay;
    pollActiveRef.current = true;
    pollTimerRef.current = setTimeout(loop, 0);
  }, []);

  // ====== 轮询对手动作（指数退避：1s → 2s → 4s → 5s 封顶） ======
  const startActionPolling = useCallback((code: string) => {
    stopPolling();
    roomCodeRef.current = code;
    const MIN_DELAY = 1000;
    const MAX_DELAY = 5000;
    const poll = async () => {
      try {
        const since = actionCountRef.current;
        const res = await fetch(`/api/tcg/room/status?code=${code}&since=${since}`);
        const json = await res.json();
        if (json.code !== 0) {
          pollDelayRef.current = Math.min(pollDelayRef.current * 2, MAX_DELAY);
          return;
        }
        const d = json.data;
        if (d.newActions && d.newActions.length > 0) {
          for (const a of d.newActions) {
            injectRef.current?.(a as Action);
            actionCountRef.current += 1;
          }
          pollDelayRef.current = MIN_DELAY;   // 有新动作，下次立即 1s
        } else {
          pollDelayRef.current = Math.min(pollDelayRef.current * 1.5, MAX_DELAY);
        }
        if (d.status === 'finished') {
          stopPolling();
          // B2: 对局结束时清空 session，避免下次进来再尝试恢复已结束对局
          clearRoomSession();
        }
      } catch {
        pollDelayRef.current = Math.min(pollDelayRef.current * 2, MAX_DELAY);
      }
    };
    schedulePoll(poll, MIN_DELAY);
  }, [stopPolling, schedulePoll]);

  // ====== 等待对手加入（创建房间后轮询） ======
  const startWaitPolling = useCallback((code: string, myDeck: Deck, seed: number, firstPlayer: string) => {
    stopPolling();
    waitStartRef.current = Date.now();
    const poll = async () => {
      // 超时检查
      if (Date.now() - waitStartRef.current > WAIT_TIMEOUT_MS) {
        stopPolling();
        // B2: 超时也清会话
        clearRoomSession();
        setError('等待超时，请重新创建房间');
        setPhase('menu');
        setRoomCode('');
        return;
      }
      try {
        const res = await fetch(`/api/tcg/room/status?code=${code}&since=0`);
        const json = await res.json();
        if (json.code !== 0) return;
        const d = json.data;
        if (d.status === 'ready' && d.guestDeck) {
          stopPolling();
          setStatusMsg('对手已加入！开始对战...');
          const guestDeck: Deck = typeof d.guestDeck === 'string' ? JSON.parse(d.guestDeck) : d.guestDeck;
          const init: GameInit = {
            seed,
            firstPlayer: firstPlayer as PlayerId,
            p1Deck: myDeck,
            p2Deck: guestDeck,
            myRole: 'host',
            roomCode: code,
          };
          setGameInit(init);
          actionCountRef.current = 0;
          setTimeout(() => {
            unlockSfx();
            setPhase('battle');
            startActionPolling(code);
          }, 800);
        }
      } catch { /* ignore */ }
    };
    schedulePoll(poll, 1500);
  }, [stopPolling, startActionPolling, schedulePoll, WAIT_TIMEOUT_MS]);

  // ====== B2：从 sessionStorage 恢复房间 ======
  const restoreFromSession = useCallback(async (session: RoomSession): Promise<boolean> => {
    try {
      const res = await fetch(`/api/tcg/room/status?code=${session.code}&since=0`);
      const json = await res.json();
      if (json.code !== 0) {
        // 404 / 500 等 → 房间不存在/过期，清空
        clearRoomSession();
        if (json.code === 404) setError('之前的房间已过期，已清理');
        return false;
      }
      const d = json.data;
      // 对局已结束（已落 TcgMatch）
      if (d.status === 'finished') {
        clearRoomSession();
        setError('上一局对战已结束，战绩已记录');
        return false;
      }
      const hostDeck: Deck | null = d.hostDeck
        ? (typeof d.hostDeck === 'string' ? JSON.parse(d.hostDeck) : d.hostDeck)
        : null;
      const guestDeck: Deck | null = d.guestDeck
        ? (typeof d.guestDeck === 'string' ? JSON.parse(d.guestDeck) : d.guestDeck)
        : null;

      // host 在等对手阶段
      if (d.status === 'waiting') {
        if (session.role !== 'host' || !hostDeck) {
          clearRoomSession();
          return false;
        }
        setRoomCode(session.code);
        setStatusMsg('继续等待对手加入...');
        setPhase('waiting');
        startWaitPolling(session.code, hostDeck, d.seed, d.firstPlayer);
        return true;
      }

      // ready / playing → 进入 battle + 用 newActions（since=0 即全部历史）回放
      if (!hostDeck || !guestDeck) {
        clearRoomSession();
        return false;
      }
      const historyActions: Action[] = Array.isArray(d.newActions) ? (d.newActions as Action[]) : [];
      const init: GameInit = {
        seed: d.seed,
        firstPlayer: d.firstPlayer as PlayerId,
        p1Deck: hostDeck,
        p2Deck: guestDeck,
        myRole: session.role,
        roomCode: session.code,
        pendingReplay: historyActions,
      };
      setGameInit(init);
      setRoomCode(session.code);
      actionCountRef.current = historyActions.length;
      unlockSfx();
      setPhase('battle');
      startActionPolling(session.code);
      return true;
    } catch {
      clearRoomSession();
      return false;
    }
  }, [startActionPolling, startWaitPolling]);

  // 把最新 restoreFromSession 同步给挂载时使用的 ref
  useEffect(() => {
    restoreFromSessionRef.current = restoreFromSession;
  }, [restoreFromSession]);

  // B2: Battle phase 挂载后，把历史动作注入到本地引擎
  const replayAppliedRef = useRef(false);
  useEffect(() => {
    // 离开 battle 时重置，下次进入可再次注入
    if (phase !== 'battle') {
      replayAppliedRef.current = false;
      return;
    }
    if (!gameInit?.pendingReplay || gameInit.pendingReplay.length === 0) return;
    if (replayAppliedRef.current) return;
    replayAppliedRef.current = true;
    const actions = gameInit.pendingReplay;
    // 下一帧：子 Battle 已 mount，injectRef.current 已挂上
    const timer = setTimeout(() => {
      for (const a of actions) {
        injectRef.current?.(a);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [phase, gameInit]);

  // ====== 创建房间 ======
  const handleCreate = async () => {
    setError('');
    const deck = getMyDeck();
    try {
      const res = await fetch('/api/tcg/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostDeck: deck }),
      });
      const json = await res.json();
      if (json.code !== 0) { setError(json.message); return; }
      const { roomCode: code, seed, firstPlayer } = json.data;
      setRoomCode(code);
      setPhase('waiting');
      setStatusMsg('等待对手加入...');
      // B2: 记录会话以支持断线重连
      saveRoomSession({ code, role: 'host' });
      startWaitPolling(code, deck, seed, firstPlayer);
    } catch {
      setError('网络错误，请重试');
    }
  };

  // ====== 加入房间 ======
  const handleJoin = async () => {
    setError('');
    const deck = getMyDeck();
    try {
      const res = await fetch('/api/tcg/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: joinCode,
          guestDeck: deck,
        }),
      });
      const json = await res.json();
      if (json.code !== 0) { setError(json.message); return; }
      const { roomCode: code, seed, firstPlayer, hostDeck } = json.data;
      const hostDeckObj: Deck = typeof hostDeck === 'string' ? JSON.parse(hostDeck) : hostDeck;
      const init: GameInit = {
        seed,
        firstPlayer: firstPlayer as PlayerId,
        p1Deck: hostDeckObj,
        p2Deck: deck,
        myRole: 'guest',
        roomCode: code,
      };
      setRoomCode(code);
      setGameInit(init);
      actionCountRef.current = 0;
      // B2: 记录会话以支持断线重连
      saveRoomSession({ code, role: 'guest' });
      unlockSfx();
      setPhase('battle');
      startActionPolling(code);
    } catch {
      setError('网络错误，请重试');
    }
  };

  // ====== 加载中 ======
  if (phase === 'loading') {
    return (
      <div className="pt-6 pb-14 px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="flex items-center justify-center gap-2 text-white/60 text-sm py-20">
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83" />
            </svg>
            <span>加载中...</span>
          </div>
        </div>
      </div>
    );
  }

  // ====== 未登录 ======
  if (phase === 'login') {
    return (
      <div className="pt-6 pb-14 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] text-[#A78BFA]/80 mb-2">
            <span className="inline-block w-6 h-px bg-[#A78BFA]/60" /> FRIEND ROOM
          </div>
          <h1 className="neon-heading text-3xl mb-4">好友对战</h1>
          <div className="glass-card rounded-xl p-8 mb-6">
            <div className="text-5xl mb-4">🔒</div>
            <p className="text-white/70 text-sm mb-6">好友对战需要登录账号，请先登录后再进行对战。</p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/login"
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] text-white shadow-[0_0_16px_rgba(124,58,237,0.4)] hover:shadow-[0_0_24px_rgba(124,58,237,0.6)] transition-all"
              >
                登录
              </Link>
              <Link
                href="/join"
                className="px-6 py-2.5 rounded-xl text-sm font-bold border border-[#A78BFA]/40 text-[#A78BFA] hover:bg-[#7C3AED]/20 transition-colors"
              >
                注册
              </Link>
            </div>
          </div>
          <Link href="/game" className="text-white/40 text-xs hover:text-white/70 transition-colors">
            ← 返回游戏大厅
          </Link>
        </div>
      </div>
    );
  }

  // ====== 自选卡牌 ======
  if (showPicker) {
    return (
      <div className="pt-6 pb-14 px-4">
        <div className="mb-4">
          <h2 className="neon-heading text-2xl mb-1">自选卡牌</h2>
          <p className="text-white/50 text-sm">从全卡池选择 35 张卡牌组建套牌</p>
        </div>
        <CardPicker
          onConfirm={(d) => { setCustomDeck(d); setDeckMode('custom'); setShowPicker(false); }}
          onCancel={() => setShowPicker(false)}
        />
      </div>
    );
  }

  // ====== 对战阶段 ======
  if (phase === 'battle' && gameInit) {
    const perspective: PlayerId = gameInit.myRole === 'host' ? 'P1' : 'P2';
    return (
      <Battle
        p1Deck={gameInit.p1Deck}
        p2Deck={gameInit.p2Deck}
        firstPlayer={gameInit.firstPlayer}
        seed={gameInit.seed}
        perspective={perspective}
        onAction={handleOnAction}
        injectRef={injectRef}
        onQuit={() => {
          stopPolling();
          // B2: 主动退出清会话
          clearRoomSession();
          setPhase('menu');
          setRoomCode('');
          setGameInit(null);
          actionCountRef.current = 0;
        }}
      />
    );
  }

  // ====== 等待阶段 ======
  if (phase === 'waiting') {
    return (
      <div className="pt-6 pb-14 px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] text-[#A78BFA]/80 mb-2">
            <span className="inline-block w-6 h-px bg-[#A78BFA]/60" /> FRIEND ROOM
          </div>
          <h1 className="neon-heading text-3xl mb-6">等待对手加入</h1>

          <div className="glass-card rounded-xl p-6 mb-6">
            <p className="text-white/60 text-sm mb-3">将房间码分享给好友</p>
            <div className="text-5xl font-black tracking-[0.3em] text-[#A78BFA] mb-4 select-all">
              {roomCode}
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(roomCode);
                setStatusMsg('已复制房间码！');
                setTimeout(() => setStatusMsg('等待对手加入...'), 2000);
              }}
              className="px-4 py-2 rounded-lg text-sm bg-[#7C3AED]/30 text-[#A78BFA] hover:bg-[#7C3AED]/50 transition-colors cursor-pointer"
            >
              复制房间码
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-white/60 text-sm">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83" />
            </svg>
            <span>{statusMsg}</span>
          </div>
clearRoomSession(); 
          <button
            onClick={() => { stopPolling(); setPhase('menu'); setRoomCode(''); }}
            className="mt-6 px-4 py-2 rounded-lg text-sm border border-white/20 text-white/60 hover:text-white cursor-pointer transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  // ====== 菜单阶段 ======
  return (
    <div className="pt-6 pb-14 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] text-[#A78BFA]/80 mb-2">
          <span className="inline-block w-6 h-px bg-[#A78BFA]/60" /> FRIEND ROOM
        </div>
        <h1 className="neon-heading text-3xl sm:text-4xl mb-3">好友对战</h1>
        <p className="text-white/60 mb-6 text-sm">
          创建房间或输入邀请码加入好友的房间，进行 1v1 对战。
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-sm">
            {error}
          </div>
        )}

        {/* 已登录用户 */}
        <div className="glass-card rounded-xl p-4 mb-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#7C3AED]/30 flex items-center justify-center text-[#A78BFA] font-bold text-sm">
            {user?.name?.[0] || '?'}
          </div>
          <div>
            <div className="text-white font-semibold text-sm">{user?.name}</div>
            <div className="text-white/40 text-xs">已登录</div>
          </div>
        </div>

        {/* 卡组选择 */}
        <div className="glass-card rounded-xl p-4 mb-4">
          <div className="text-white/85 font-semibold text-sm tracking-wide mb-3">选择卡组</div>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setDeckMode('preset')}
              className={[
                'px-3 py-1 rounded-lg text-xs cursor-pointer transition-colors border',
                deckMode === 'preset'
                  ? 'bg-[#7C3AED]/30 border-[#A78BFA]/50 text-white font-bold'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white',
              ].join(' ')}
            >
              预设卡组
            </button>
            <button
              onClick={() => setShowPicker(true)}
              className={[
                'px-3 py-1 rounded-lg text-xs cursor-pointer transition-colors border',
                deckMode === 'custom'
                  ? 'bg-[#F43F5E]/30 border-[#F43F5E]/50 text-white font-bold'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white',
              ].join(' ')}
            >
              {customDeck ? '✅ 已自选' : '自选卡牌'}
            </button>
          </div>
          {deckMode === 'preset' && (
            <DeckPicker label="" value={presetKey} onChange={setPresetKey} options={options} />
          )}
          {deckMode === 'custom' && customDeck && (
            <div className="text-sm text-emerald-300 flex items-center gap-2">
              <span>✅</span>
              <span>已选 {customDeck.cards.length} 张卡牌</span>
              <button onClick={() => setShowPicker(true)} className="text-[#A78BFA] text-xs underline cursor-pointer">
                重新选择
              </button>
            </div>
          )}
        </div>

        {/* 创建 / 加入 */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-white font-bold text-lg mb-2">创建房间</h3>
            <p className="text-white/50 text-sm mb-4">生成邀请码，分享给好友</p>
            <button
              onClick={handleCreate}
              className="w-full btn-neon-primary px-4 py-3 font-bold rounded-xl cursor-pointer text-sm"
            >
              创建好友房
            </button>
          </div>

          <div className="glass-card rounded-xl p-5">
            <h3 className="text-white font-bold text-lg mb-2">加入房间</h3>
            <p className="text-white/50 text-sm mb-3">输入好友的 6 位房间码</p>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="输入房间码"
              maxLength={6}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-white text-center text-lg font-mono tracking-[0.3em] placeholder:text-white/30 focus:outline-none focus:border-[#A78BFA]/50 mb-3 uppercase"
            />
            <button
              onClick={handleJoin}
              disabled={joinCode.length !== 6}
              className={[
                'w-full px-4 py-3 font-bold rounded-xl cursor-pointer text-sm transition-all',
                joinCode.length === 6
                  ? 'bg-gradient-to-r from-[#38BDF8] to-[#7C3AED] text-white shadow-[0_0_16px_rgba(56,189,248,0.4)]'
                  : 'bg-white/10 text-white/30 cursor-not-allowed',
              ].join(' ')}
            >
              加入对战
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/game" className="text-white/40 text-xs hover:text-white/70 transition-colors">
            ← 返回游戏大厅
          </Link>
        </div>
      </div>
    </div>
  );
}
