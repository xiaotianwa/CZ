'use client';

// React Hook 封装：对接纯函数引擎
// 管理 GameState + 提供 action dispatcher

import { useCallback, useMemo, useRef, useState } from 'react';
import { applyAction, initGame, InitOptions } from './engine';
import { ensureLiveCardsReady } from './cardLoader';
import type { Action, GameState } from './types';

// 模块首次加载时：注册硬编码卡 + 启动 live fetch（不阻塞）
// 保证即使没等 `ensureLiveCardsReady` 就调用 initGame，engine 也有硬编码 fallback 可用。
ensureLiveCardsReady().catch(() => { /* 静默降级 */ });

export function useGame(opts: InitOptions) {
  const initialRef = useRef<InitOptions>(opts);
  const [state, setState] = useState<GameState>(() => initGame({ ...initialRef.current, skipMulligan: false }));

  const dispatch = useCallback((action: Action) => {
    setState((prev) => applyAction(prev, action));
  }, []);

  /** 注入外部动作（在线模式：接收对手动作，不触发 onAction 回调） */
  const injectAction = useCallback((action: Action) => {
    setState((prev) => applyAction(prev, action));
  }, []);

  const reset = useCallback((newOpts?: InitOptions) => {
    const next = newOpts ?? initialRef.current;
    initialRef.current = next;
    setState(initGame({ ...next, skipMulligan: false }));
  }, []);

  const helpers = useMemo(() => ({
    getMe: (me: 'P1' | 'P2') => state.players[me],
    getOpp: (me: 'P1' | 'P2') => state.players[me === 'P1' ? 'P2' : 'P1'],
    canAct: (me: 'P1' | 'P2') => state.activePlayer === me && !state.ended,
  }), [state]);

  return { state, dispatch, reset, injectAction, ...helpers };
}
