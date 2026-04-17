'use client';

// React Hook 封装：对接纯函数引擎
// 管理 GameState + 提供 action dispatcher

import { useCallback, useMemo, useRef, useState } from 'react';
import { applyAction, initGame, InitOptions } from './engine';
import { registerAllCards } from './cards';
import type { Action, GameState } from './types';

// 模块首次加载时注册卡牌
let registered = false;
function ensureRegistered() {
  if (registered) return;
  try { registerAllCards(); registered = true; } catch { registered = true; }
}

export function useGame(opts: InitOptions) {
  ensureRegistered();
  const initialRef = useRef<InitOptions>(opts);
  const [state, setState] = useState<GameState>(() => initGame({ ...initialRef.current, skipMulligan: false }));

  const dispatch = useCallback((action: Action) => {
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

  return { state, dispatch, reset, ...helpers };
}
