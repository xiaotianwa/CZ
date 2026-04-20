'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Trash2, Edit3, AlertCircle, RefreshCw,
} from 'lucide-react';

interface Card {
  id: string;
  name: string;
  type: 'character' | 'item' | 'equipment' | 'effect' | 'event';
  subtype: string | null;
  rarity: 'N' | 'R' | 'SR' | 'SSR';
  cost: number;
  attack: number | null;
  health: number | null;
  description: string;
  flavor: string | null;
  imagePath: string | null;
  effectHooks: unknown[];
  keywords: string[];
  status: 'active' | 'disabled' | 'draft';
  sortOrder: number;
}

const TYPE_LABEL: Record<Card['type'], string> = {
  character: '角色',
  item: '道具',
  equipment: '装备',
  effect: '消耗',
  event: '事件',
};

const RARITY_STYLE: Record<Card['rarity'], string> = {
  N: 'bg-white/10 text-white/70 border-white/15',
  R: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  SR: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  SSR: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

const STATUS_STYLE: Record<Card['status'], string> = {
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  draft: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  disabled: 'bg-white/5 text-white/40 border-white/10',
};

export default function TcgCardsListPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('');
  const [rarity, setRarity] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (keyword) params.set('keyword', keyword);
    if (type) params.set('type', type);
    if (rarity) params.set('rarity', rarity);
    if (status) params.set('status', status);

    fetch(`/api/tcg/admin/cards?${params}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => {
        if (json.code !== 0) {
          setError(json.message || '加载失败');
          return;
        }
        setCards(json.data.list);
        setTotal(json.data.pagination.total);
      })
      .catch(() => setError('网络错误'))
      .finally(() => setLoading(false));
  }, [keyword, type, rarity, status, page]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (card: Card) => {
    if (!confirm(`确认停用卡牌「${card.name}」(${card.id})？\n将标记为 disabled，可从审计日志恢复。`)) return;
    const res = await fetch(`/api/tcg/admin/cards/${card.id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    const json = await res.json();
    if (json.code !== 0) {
      alert(json.message || '操作失败');
      return;
    }
    load();
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Russo One', 'Chakra Petch', sans-serif" }}>
            卡池管理
          </h2>
          <p className="text-sm text-white/50 mt-0.5">共 {total} 张卡 · 支持按名称/ID/描述搜索</p>
        </div>
        <button
          onClick={load}
          className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
        <Link
          href="/tcg-admin/cards/new"
          className="h-9 px-4 rounded-lg text-white text-sm font-medium flex items-center gap-1.5 transition-all"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
            boxShadow: '0 0 0 1px rgba(124,58,237,0.25), 0 6px 20px -8px rgba(124,58,237,0.6)',
          }}
        >
          <Plus className="w-4 h-4" />
          新建卡牌
        </Link>
      </div>

      {/* 搜索 + 筛选 */}
      <div className="rounded-xl border border-white/10 bg-[#141432]/50 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            placeholder="搜索卡牌 ID / 名称 / 描述"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#A78BFA]/50"
          />
        </div>
        <select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#A78BFA]/50"
        >
          <option value="">全部类型</option>
          <option value="character">角色</option>
          <option value="item">道具</option>
          <option value="equipment">装备</option>
          <option value="effect">消耗</option>
          <option value="event">事件</option>
        </select>
        <select
          value={rarity}
          onChange={(e) => { setRarity(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#A78BFA]/50"
        >
          <option value="">全部稀有度</option>
          <option value="N">N</option>
          <option value="R">R</option>
          <option value="SR">SR</option>
          <option value="SSR">SSR</option>
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#A78BFA]/50"
        >
          <option value="">全部状态</option>
          <option value="active">已启用</option>
          <option value="draft">草稿</option>
          <option value="disabled">已停用</option>
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* 表格 */}
      <div className="rounded-xl border border-white/10 bg-[#141432]/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-white/5 border-b border-white/5">
              <tr className="text-left text-[11px] font-semibold tracking-wider uppercase text-white/40">
                <th className="px-4 py-3 w-20">ID</th>
                <th className="px-2 py-3 w-16">封面</th>
                <th className="px-3 py-3">名称</th>
                <th className="px-3 py-3 w-16">类型</th>
                <th className="px-3 py-3 w-16">稀有度</th>
                <th className="px-3 py-3 w-24">费/攻/血</th>
                <th className="px-3 py-3">描述</th>
                <th className="px-3 py-3 w-16">状态</th>
                <th className="px-3 py-3 w-28 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && cards.length === 0 && (
                <tr><td colSpan={9} className="text-center py-8 text-white/40 text-sm">加载中 · · ·</td></tr>
              )}
              {!loading && cards.length === 0 && (
                <tr><td colSpan={9} className="text-center py-8 text-white/40 text-sm">暂无匹配的卡牌</td></tr>
              )}
              {cards.map((card) => (
                <tr key={card.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-white/60">{card.id}</td>
                  <td className="px-2 py-3">
                    {card.imagePath ? (
                      <div className="w-10 h-14 rounded overflow-hidden bg-white/5 border border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={encodeURI(card.imagePath)} alt={card.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-14 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-[10px]">无</div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm font-medium text-white">{card.name}</div>
                    {card.flavor && <div className="text-[11px] text-white/40 mt-0.5 truncate max-w-[200px]">{card.flavor}</div>}
                  </td>
                  <td className="px-3 py-3 text-xs text-white/60">
                    {TYPE_LABEL[card.type]}
                    {card.subtype && <span className="text-white/35 ml-1">/ {card.subtype}</span>}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold border ${RARITY_STYLE[card.rarity]}`}>
                      {card.rarity}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm font-mono text-white/70">
                    {card.cost}
                    {card.attack != null && ` / ${card.attack}`}
                    {card.health != null && ` / ${card.health}`}
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-xs text-white/60 line-clamp-2 max-w-[280px]">{card.description}</div>
                    {card.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {card.keywords.slice(0, 3).map((k) => (
                          <span key={k} className="text-[10px] px-1 py-px rounded bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/20">{k}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] border ${STATUS_STYLE[card.status]}`}>
                      {card.status === 'active' ? '启用' : card.status === 'draft' ? '草稿' : '停用'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/tcg-admin/cards/${encodeURIComponent(card.id)}`}
                        className="p-1.5 rounded text-white/60 hover:text-[#A78BFA] hover:bg-white/5 transition-colors"
                        title="编辑"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Link>
                      {card.status !== 'disabled' && (
                        <button
                          onClick={() => handleDelete(card)}
                          className="p-1.5 rounded text-white/50 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="停用"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-white/50">
            第 <span className="text-white">{page}</span> / {totalPages} 页 · 共 {total} 张
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-9 px-4 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              上一页
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-9 px-4 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
