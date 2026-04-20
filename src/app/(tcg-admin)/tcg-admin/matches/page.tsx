'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, ChevronRight, Swords } from 'lucide-react';

interface Match {
  id: string;
  mode: string;
  seasonId: string | null;
  playerAId: string;
  playerBId: string | null;
  winnerId: string | null;
  ratingDelta: number;
  turns: number;
  durationSec: number;
  endedReason: string | null;
  createdAt: string;
  playerA: { id: string; name: string; avatar: string | null } | null;
  playerB: { id: string; name: string; avatar: string | null } | null;
}

const MODE_LABEL: Record<string, string> = {
  practice: '训练',
  ranked: '排位',
  friend: '好友房',
  boss: 'Boss',
};

const REASON_LABEL: Record<string, string> = {
  hp_zero: '击杀',
  turn_15: '15 回合',
  surrender: '投降',
  timeout: '超时',
};

export default function TcgMatchesListPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('');
  const [endedReason, setEndedReason] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 30;

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (mode) params.set('mode', mode);
    if (endedReason) params.set('endedReason', endedReason);
    if (playerId) params.set('playerId', playerId);
    fetch(`/api/tcg/admin/matches?${params}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => {
        if (json.code !== 0) { setError(json.message || '加载失败'); return; }
        setMatches(json.data.list);
        setTotal(json.data.pagination.total);
      })
      .catch(() => setError('网络错误'))
      .finally(() => setLoading(false));
  }, [mode, endedReason, playerId, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Russo One', 'Chakra Petch', sans-serif" }}>
            战报中心
          </h2>
          <p className="text-sm text-white/50 mt-0.5">共 {total} 场对战 · 按对战时间倒序</p>
        </div>
        <button onClick={load} className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white text-sm flex items-center gap-1.5 transition-colors cursor-pointer">
          <RefreshCw className="w-4 h-4" /> 刷新
        </button>
      </div>

      {/* 筛选 */}
      <div className="rounded-xl border border-white/10 bg-[#141432]/50 p-4 flex flex-wrap gap-3">
        <select value={mode} onChange={(e) => { setMode(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#A78BFA]/50">
          <option value="">全部模式</option>
          <option value="practice">训练</option>
          <option value="ranked">排位</option>
          <option value="friend">好友房</option>
          <option value="boss">Boss</option>
        </select>
        <select value={endedReason} onChange={(e) => { setEndedReason(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#A78BFA]/50">
          <option value="">全部结束原因</option>
          <option value="hp_zero">HP 归零</option>
          <option value="turn_15">15 回合</option>
          <option value="surrender">投降</option>
          <option value="timeout">超时</option>
        </select>
        <input
          value={playerId}
          onChange={(e) => { setPlayerId(e.target.value); setPage(1); }}
          placeholder="玩家 ID（精确匹配）"
          className="flex-1 min-w-[180px] h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#A78BFA]/50"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* 战报列表 */}
      <div className="space-y-2">
        {loading && matches.length === 0 && (
          <div className="text-center py-8 text-white/40 text-sm">加载中 · · ·</div>
        )}
        {!loading && matches.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-[#141432]/30 text-center py-16">
            <Swords className="w-10 h-10 mx-auto text-white/20 mb-3" />
            <div className="text-white/40 text-sm mb-1">暂无战报</div>
            <div className="text-[11px] text-white/25">玩家对战后战报会自动入库</div>
          </div>
        )}
        {matches.map((m) => (
          <Link
            key={m.id}
            href={`/tcg-admin/matches/${m.id}`}
            className="block rounded-xl border border-white/10 bg-[#141432]/40 p-4 hover:bg-[#141432]/70 hover:border-[#A78BFA]/30 transition-colors"
          >
            <div className="flex items-center gap-4">
              {/* 左玩家 */}
              <div className="flex items-center gap-2 w-[180px] min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-[#A78BFA] text-sm font-bold shrink-0">
                  {m.playerA?.name?.[0] ?? 'A'}
                </div>
                <div className="min-w-0">
                  <div className={`text-sm truncate ${m.winnerId === m.playerAId ? 'text-emerald-300 font-semibold' : 'text-white/85'}`}>
                    {m.playerA?.name ?? 'Player A'}
                  </div>
                  <div className="text-[10px] text-white/35 font-mono truncate">{m.playerAId.slice(0, 8)}</div>
                </div>
              </div>

              {/* VS */}
              <div className="text-center w-14 shrink-0">
                <Swords className="w-4 h-4 mx-auto text-white/40" />
              </div>

              {/* 右玩家 */}
              <div className="flex items-center gap-2 w-[180px] min-w-0">
                <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300 text-sm font-bold shrink-0">
                  {m.playerB?.name?.[0] ?? (m.playerBId ? 'B' : 'AI')}
                </div>
                <div className="min-w-0">
                  <div className={`text-sm truncate ${m.winnerId === m.playerBId ? 'text-emerald-300 font-semibold' : 'text-white/85'}`}>
                    {m.playerB?.name ?? (m.playerBId ? 'Player B' : 'AI / Boss')}
                  </div>
                  {m.playerBId && <div className="text-[10px] text-white/35 font-mono truncate">{m.playerBId.slice(0, 8)}</div>}
                </div>
              </div>

              {/* 摘要 */}
              <div className="flex-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-[#7C3AED]/15 border border-[#7C3AED]/30 text-[#A78BFA]">
                  {MODE_LABEL[m.mode] || m.mode}
                </span>
                <span className="text-white/60">{m.turns} 回合</span>
                <span className="text-white/50">{Math.round(m.durationSec / 60)} 分</span>
                {m.endedReason && (
                  <span className="text-white/40">{REASON_LABEL[m.endedReason] || m.endedReason}</span>
                )}
                {m.ratingDelta !== 0 && (
                  <span className={`font-mono ${m.ratingDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {m.ratingDelta > 0 ? '+' : ''}{m.ratingDelta}
                  </span>
                )}
              </div>

              <div className="text-[11px] text-white/35 w-28 text-right">
                {new Date(m.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>

              <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
            </div>
          </Link>
        ))}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-white/50">第 <span className="text-white">{page}</span> / {totalPages} 页 · 共 {total} 场</div>
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
