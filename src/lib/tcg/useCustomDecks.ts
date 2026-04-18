'use client';

/**
 * B3 · 自定义卡组 Hook
 *
 * 登录态   → 卡组走 /api/tcg/decks 存服务器
 * 未登录   → 卡组走 localStorage（向后兼容）
 *
 * 返回 API:
 *   decks      当前用户可见的卡组列表
 *   online     true=服务器模式；false=本地模式；null=尚在判定登录态
 *   loading    初次加载未完成
 *   error      最近一次同步错误（失败不阻塞 UI）
 *   createDeck(name, cards=[]) → Promise<StoredDeck | null>
 *   renameDeck(ref, name)        → Promise<boolean>
 *   deleteDeck(ref)              → Promise<boolean>
 *   saveCards(ref, cards)        → Promise<boolean>    提交当前卡组的卡牌数组（本地编辑后调用）
 *   setActive(ref)               → Promise<boolean>    把某个卡组设为出战卡组（仅 online）
 *   refresh()                    → Promise<void>
 *
 * ref 可以是 server id（online 模式）或本地 index（offline 模式），hook 内部自动识别。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadCustomDecks,
  saveCustomDecks,
  makeEmptyDeck,
  type StoredDeck,
} from '@/game/deck-builder';

type DeckRef = string | number;

interface ApiDeckResp {
  id: string;
  name: string;
  cards: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function toStoredDeck(row: ApiDeckResp): StoredDeck {
  return {
    id: row.id,
    name: row.name,
    cards: row.cards,
    isActive: row.isActive,
    createdAt: new Date(row.createdAt).getTime(),
    updatedAt: new Date(row.updatedAt).getTime(),
  };
}

export interface UseCustomDecks {
  decks: StoredDeck[];
  online: boolean | null;
  loading: boolean;
  error: string | null;
  createDeck: (name: string, cards?: string[]) => Promise<StoredDeck | null>;
  renameDeck: (ref: DeckRef, name: string) => Promise<boolean>;
  deleteDeck: (ref: DeckRef) => Promise<boolean>;
  saveCards: (ref: DeckRef, cards: string[]) => Promise<boolean>;
  setActive: (ref: DeckRef) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useCustomDecks(): UseCustomDecks {
  const [decks, setDecks] = useState<StoredDeck[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onlineRef = useRef<boolean | null>(null);
  onlineRef.current = online;

  const refresh = useCallback(async () => {
    if (onlineRef.current !== true) return;
    try {
      const res = await fetch('/api/tcg/decks', { credentials: 'same-origin' });
      const json = await res.json();
      if (json.code === 0 && Array.isArray(json.data?.decks)) {
        setDecks(json.data.decks.map(toStoredDeck));
      }
    } catch {
      // 网络异常不覆盖现有 decks
    }
  }, []);

  // 初次加载：判定登录态 → 选择数据源
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch('/api/auth/me', { credentials: 'same-origin' });
        const meJson = await meRes.json();
        const isLoggedIn = meJson.code === 0 && !!meJson.data?.id;
        if (cancelled) return;
        if (isLoggedIn) {
          setOnline(true);
          const res = await fetch('/api/tcg/decks', { credentials: 'same-origin' });
          const json = await res.json();
          if (cancelled) return;
          if (json.code === 0 && Array.isArray(json.data?.decks)) {
            setDecks(json.data.decks.map(toStoredDeck));
          }
        } else {
          setOnline(false);
          setDecks(loadCustomDecks());
        }
      } catch {
        if (!cancelled) {
          setOnline(false);
          setDecks(loadCustomDecks());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ==== 本地模式工具 ====
  const persistLocal = useCallback((next: StoredDeck[]) => {
    saveCustomDecks(next);
    setDecks(next);
  }, []);

  /** 按 ref 定位一个卡组：online 用 id 匹配；offline 用 index */
  const resolveIndex = useCallback((list: StoredDeck[], ref: DeckRef): number => {
    if (typeof ref === 'number') return ref;
    return list.findIndex((d) => d.id === ref);
  }, []);

  // ==== createDeck ====
  const createDeck = useCallback<UseCustomDecks['createDeck']>(async (name, cards = []) => {
    const trimmed = name.trim() || '未命名';
    if (onlineRef.current === true) {
      try {
        const res = await fetch('/api/tcg/decks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ name: trimmed, cards }),
        });
        const json = await res.json();
        if (json.code !== 0) {
          setError(json.message || '新建卡组失败');
          return null;
        }
        const stored = toStoredDeck(json.data);
        setDecks((arr) => [...arr, stored]);
        setError(null);
        return stored;
      } catch {
        setError('网络错误，新建卡组失败');
        return null;
      }
    } else {
      const stored: StoredDeck = { ...makeEmptyDeck(trimmed), cards: [...cards] };
      setDecks((arr) => {
        const next = [...arr, stored];
        saveCustomDecks(next);
        return next;
      });
      return stored;
    }
  }, []);

  // ==== renameDeck ====
  const renameDeck = useCallback<UseCustomDecks['renameDeck']>(async (ref, name) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (onlineRef.current === true) {
      const idx = resolveIndex(decks, ref);
      const target = idx >= 0 ? decks[idx] : undefined;
      if (!target?.id) return false;
      try {
        const res = await fetch(`/api/tcg/decks/${target.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ name: trimmed }),
        });
        const json = await res.json();
        if (json.code !== 0) {
          setError(json.message || '重命名失败');
          return false;
        }
        setDecks((arr) => arr.map((d) => (d.id === target.id ? toStoredDeck(json.data) : d)));
        setError(null);
        return true;
      } catch {
        setError('网络错误，重命名失败');
        return false;
      }
    } else {
      const idx = typeof ref === 'number' ? ref : -1;
      if (idx < 0) return false;
      setDecks((arr) => {
        const next = arr.map((d, i) => (i === idx
          ? { ...d, name: trimmed, updatedAt: Date.now() }
          : d));
        saveCustomDecks(next);
        return next;
      });
      return true;
    }
  }, [decks, resolveIndex]);

  // ==== deleteDeck ====
  const deleteDeck = useCallback<UseCustomDecks['deleteDeck']>(async (ref) => {
    if (onlineRef.current === true) {
      const idx = resolveIndex(decks, ref);
      const target = idx >= 0 ? decks[idx] : undefined;
      if (!target?.id) return false;
      try {
        const res = await fetch(`/api/tcg/decks/${target.id}`, {
          method: 'DELETE',
          credentials: 'same-origin',
        });
        const json = await res.json();
        if (json.code !== 0) {
          setError(json.message || '删除失败');
          return false;
        }
        setDecks((arr) => arr.filter((d) => d.id !== target.id));
        setError(null);
        return true;
      } catch {
        setError('网络错误，删除失败');
        return false;
      }
    } else {
      const idx = typeof ref === 'number' ? ref : -1;
      if (idx < 0) return false;
      setDecks((arr) => {
        const next = arr.filter((_, i) => i !== idx);
        saveCustomDecks(next);
        return next;
      });
      return true;
    }
  }, [decks, resolveIndex]);

  // ==== saveCards（optimistic update + 失败回滚）====
  const saveCards = useCallback<UseCustomDecks['saveCards']>(async (ref, cards) => {
    if (onlineRef.current === true) {
      const idx = resolveIndex(decks, ref);
      const target = idx >= 0 ? decks[idx] : undefined;
      if (!target?.id) return false;
      const prevCards = [...target.cards];
      const prevUpdated = target.updatedAt;
      // 1) 本地先乐观更新，UI 立即响应
      setDecks((arr) => arr.map((d) => (d.id === target.id
        ? { ...d, cards: [...cards], updatedAt: Date.now() }
        : d)));
      // 2) 异步同步服务器；失败回滚
      try {
        const res = await fetch(`/api/tcg/decks/${target.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ cards }),
        });
        const json = await res.json();
        if (json.code !== 0) {
          setDecks((arr) => arr.map((d) => (d.id === target.id
            ? { ...d, cards: prevCards, updatedAt: prevUpdated }
            : d)));
          setError(json.message || '保存失败');
          return false;
        }
        setDecks((arr) => arr.map((d) => (d.id === target.id ? toStoredDeck(json.data) : d)));
        setError(null);
        return true;
      } catch {
        setDecks((arr) => arr.map((d) => (d.id === target.id
          ? { ...d, cards: prevCards, updatedAt: prevUpdated }
          : d)));
        setError('网络错误，保存失败');
        return false;
      }
    } else {
      const idx = typeof ref === 'number' ? ref : -1;
      if (idx < 0) return false;
      setDecks((arr) => {
        const next = arr.map((d, i) => (i === idx
          ? { ...d, cards: [...cards], updatedAt: Date.now() }
          : d));
        saveCustomDecks(next);
        return next;
      });
      return true;
    }
  }, [decks, resolveIndex]);

  // ==== setActive ====
  const setActive = useCallback<UseCustomDecks['setActive']>(async (ref) => {
    if (onlineRef.current !== true) return false;
    const idx = resolveIndex(decks, ref);
    const target = idx >= 0 ? decks[idx] : undefined;
    if (!target?.id) return false;
    try {
      const res = await fetch(`/api/tcg/decks/${target.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ isActive: true }),
      });
      const json = await res.json();
      if (json.code !== 0) {
        setError(json.message || '设为出战卡组失败');
        return false;
      }
      // 本地把其他的 isActive 关掉
      setDecks((arr) => arr.map((d) => (d.id === target.id
        ? toStoredDeck(json.data)
        : { ...d, isActive: false })));
      setError(null);
      return true;
    } catch {
      setError('网络错误');
      return false;
    }
  }, [decks, resolveIndex]);

  return { decks, online, loading, error, createDeck, renameDeck, deleteDeck, saveCards, setActive, refresh };
}
