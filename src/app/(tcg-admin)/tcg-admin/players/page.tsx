'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search, AlertCircle, RefreshCw, Shield, ShieldAlert, ShieldBan, ChevronRight,
} from 'lucide-react';

interface Player {
  userId: string;
  rating: number;
  tier: 'iron' | 'silver' | 'gold' | 'diamond' | 'master';
  energy: number;
  wins: number;
  losses: number;
  banStatus: 'normal' | 'warned' | 'banned';
  banUntil: string | null;
  banReason: string | null;
  lastPlayAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
    level: number;
    isActive: boolean;
  } | null;
}

const TIER_LABEL: Record<Player['tier'], string> = {
  iron: '铁粉',
  silver: '真爱粉',
  gold: '超级粉',
  diamond: '死忠粉',
  master: '破圈王者',
};

const TIER_STYLE: Record<Player['tier'], string> = {
  iron: 'bg-white/5 text-white/60 border-white/10',
  silver: 'bg-slate-400/15 text-slate-300 border-slate-400/30',
  gold: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  diamond: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  master: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

const BAN_META: Record<Player['banStatus'], { label: string; cls: string; Icon: typeof Shield }> = {
  normal: { label: '正常', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', Icon: Shield },
  warned: { label: '警告中', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30', Icon: ShieldAlert },
  banned: { label: '已封禁', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30', Icon: ShieldBan },
};

export default function TcgPlayersListPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [tier, setTier] = useState('');
  const [banStatus, setBanStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (keyword) params.set('keyword', keyword);
    if (tier) params.set('tier', tier);
    if (banStatus) params.set('banStatus', banStatus);
    fetch(`/api/tcg/admin/players?${params}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => {
        if (json.code !== 0) { setError(json.message || '加载失败'); return; }
        setPlayers(json.data.list);
        setTotal(json.data.pagination.total);
      })
      .catch(() => setError('网络错误'))
      .finally(() => setLoading(false));
  }, [keyword, tier, banStatus, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Russo One', 'Chakra Petch', sans-serif" }}>
            玩家管理
          </h2>
          <p className="text-sm text-white/50 mt-0.5">共 {total} 名玩家 · 按最近对战时间倒序</p>
        </div>
        <button
          onClick={load}
          className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> 刷新
        </button>
      </div>

      {/* 搜索 + 筛选 */}
      <div className="rounded-xl border border-white/10 bg-[#141432]/50 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            placeholder="搜索玩家 ID / 昵称 / 邮箱"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#A78BFA]/50"
          />
        </div>
        <select
          value={tier}
          onChange={(e) => { setTier(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#A78BFA]/50"
        >
          <option value="">全部段位</option>
          <option value="iron">铁粉</option>
          <option value="silver">真爱粉</option>
          <option value="gold">超级粉</option>
          <option value="diamond">死忠粉</option>
          <option value="master">破圈王者</option>
        </select>
        <select
          value={banStatus}
          onChange={(e) => { setBanStatus(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#A78BFA]/50"
        >
          <option value="">全部状态</option>
          <option value="normal">正常</option>
          <option value="warned">警告中</option>
          <option value="banned">已封禁</option>
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
                <th className="px-4 py-3">玩家</th>
                <th className="px-3 py-3 w-24">段位</th>
                <th className="px-3 py-3 w-20">ELO</th>
                <th className="px-3 py-3 w-28">胜负 / 能量</th>
                <th className="px-3 py-3 w-24">状态</th>
                <th className="px-3 py-3 w-32">最近对战</th>
                <th className="px-3 py-3 w-16 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && players.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-white/40 text-sm">加载中 · · ·</td></tr>
              )}
              {!loading && players.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-white/40 text-sm">
                    <div className="mb-1">暂无 TCG 玩家数据</div>
                    <div className="text-[11px] text-white/25">玩家第一次参与对战时会自动生成档案</div>
                  </td>
                </tr>
              )}
              {players.map((p) => {
                const banMeta = BAN_META[p.banStatus];
                return (
                  <tr key={p.userId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-[#A78BFA] font-bold text-sm shrink-0">
                          {p.user?.name?.[0] ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">{p.user?.name ?? '（用户已删除）'}</div>
                          <div className="text-[11px] text-white/40 truncate">{p.user?.email ?? p.userId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] border ${TIER_STYLE[p.tier]}`}>
                        {TIER_LABEL[p.tier]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm font-mono text-white/70">{p.rating}</td>
                    <td className="px-3 py-3 text-xs text-white/60">
                      <div>{p.wins}胜 / {p.losses}负</div>
                      <div className="text-[11px] text-white/40">能量 {p.energy}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${banMeta.cls}`}>
                        <banMeta.Icon className="w-3 h-3" />
                        {banMeta.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[11px] text-white/45">
                      {p.lastPlayAt ? new Date(p.lastPlayAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '未开战'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        href={`/tcg-admin/players/${encodeURIComponent(p.userId)}`}
                        className="inline-flex items-center gap-1 text-[#A78BFA] hover:text-white text-xs transition-colors"
                      >
                        详情 <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-white/50">第 <span className="text-white">{page}</span> / {totalPages} 页 · 共 {total} 名玩家</div>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="h-9 px-4 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
              上一页
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="h-9 px-4 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
