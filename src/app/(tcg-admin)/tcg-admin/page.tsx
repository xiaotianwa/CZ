'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Users, Gamepad2, FileBox, AlertCircle, TrendingUp, Swords } from 'lucide-react';

interface OverviewStats {
  cards: { total: number; active: number; byRarity: Array<{ rarity: string; count: number }> };
  players: { total: number; banned: number };
  matches: {
    total: number;
    today: number;
    trend: Array<{ date: string; count: number }>;
  };
  decks: { total: number };
  recentMatches: Array<{
    id: string; mode: string; playerAId: string; playerBId: string | null;
    winnerId: string | null; turns: number; durationSec: number; endedReason: string | null; createdAt: string;
    playerA: { id: string; name: string } | null;
    playerB: { id: string; name: string } | null;
  }>;
}

export default function TcgAdminDashboardPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/tcg/admin/stats', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((json) => {
        if (json.code === 0) {
          setStats(json.data);
        } else {
          setError(json.message || '加载失败');
        }
      })
      .catch(() => setError('网络错误'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Russo One', 'Chakra Petch', sans-serif" }}>
          运营总览
        </h2>
        <p className="text-sm text-white/50">卡牌对战系统数据速览 · P0 MVP 版本</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="卡池总量"
          subtitle="启用 / 总数"
          value={stats ? `${stats.cards.active} / ${stats.cards.total}` : '—'}
          icon={Sparkles}
          accent="from-[#7C3AED] to-[#A78BFA]"
          href="/tcg-admin/cards"
          loading={loading}
        />
        <StatCard
          label="玩家总数"
          subtitle="封禁账号"
          value={stats ? stats.players.total.toString() : '—'}
          extra={stats ? `封禁 ${stats.players.banned}` : undefined}
          icon={Users}
          accent="from-[#38BDF8] to-[#7C3AED]"
          href="/tcg-admin/players"
          loading={loading}
        />
        <StatCard
          label="总对局"
          subtitle="今日新增"
          value={stats ? stats.matches.total.toString() : '—'}
          extra={stats ? `今日 ${stats.matches.today}` : undefined}
          icon={Gamepad2}
          accent="from-[#F43F5E] to-[#7C3AED]"
          href="/tcg-admin/matches"
          loading={loading}
        />
        <StatCard
          label="预设卡组"
          subtitle="官方起步套牌"
          value={stats ? stats.decks.total.toString() : '—'}
          icon={FileBox}
          accent="from-[#F59E0B] to-[#F43F5E]"
          href="/tcg-admin/deck-presets"
          loading={loading}
        />
      </div>

      {/* 近 7 天对局趋势 + 卡池稀有度分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#141432]/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#A78BFA]" />
            <h3 className="text-sm font-semibold text-white">近 7 天对局趋势</h3>
          </div>
          {stats?.matches.trend && stats.matches.trend.length > 0 ? (
            <TrendBars data={stats.matches.trend} />
          ) : (
            <div className="text-xs text-white/40 py-8 text-center">暂无对局数据</div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#141432]/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#A78BFA]" />
            <h3 className="text-sm font-semibold text-white">卡池稀有度</h3>
          </div>
          {stats?.cards.byRarity && stats.cards.byRarity.length > 0 ? (
            <RarityBars data={stats.cards.byRarity} total={stats.cards.active} />
          ) : (
            <div className="text-xs text-white/40 py-6 text-center">无数据</div>
          )}
        </div>
      </div>

      {/* 近期战报 + P0 版本说明 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#141432]/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-[#A78BFA]" />
              <h3 className="text-sm font-semibold text-white">最近战报</h3>
            </div>
            <Link href="/tcg-admin/matches" className="text-[11px] text-[#A78BFA] hover:text-white transition-colors">查看全部 →</Link>
          </div>
          {stats?.recentMatches && stats.recentMatches.length > 0 ? (
            <div className="space-y-1.5">
              {stats.recentMatches.map((m) => (
                <Link
                  key={m.id}
                  href={`/tcg-admin/matches/${m.id}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-xs"
                >
                  <span className="text-white/70 truncate flex-1">{m.playerA?.name ?? 'A'}</span>
                  <span className="text-white/30">vs</span>
                  <span className="text-white/70 truncate flex-1">{m.playerB?.name ?? (m.playerBId ? 'B' : 'AI')}</span>
                  <span className="text-white/40">{m.turns} 回合</span>
                  <span className="text-[10px] text-white/30 w-16 text-right">
                    {new Date(m.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-xs text-white/40 py-6 text-center">暂无战报</div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#141432]/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-3">📌 P0 版本说明</h3>
          <ul className="text-xs text-white/70 space-y-1.5 list-disc pl-4">
            <li>本后台与社区 <code className="px-1 py-0.5 rounded bg-white/5 text-[#A78BFA]">/admin</code> 完全隔离，独立 cookie & JWT secret</li>
            <li>卡池已从代码 <code className="px-1 py-0.5 rounded bg-white/5 text-[#A78BFA]">cardPresets.ts</code> 迁入数据库</li>
            <li>战报支持逐帧回放（<code className="px-1 py-0.5 rounded bg-white/5 text-[#A78BFA]">actions</code> 序列）</li>
            <li>所有写操作落 <code className="px-1 py-0.5 rounded bg-white/5 text-[#A78BFA]">TcgAuditLog</code> 审计</li>
            <li>P1：赛季 / 平衡看板 / 举报 · P2：系统参数 / 运营账号 / 审计</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function TrendBars({ data }: { data: Array<{ date: string; count: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end gap-2 h-28">
      {data.map((d) => {
        const h = (d.count / max) * 100;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="relative w-full flex-1 flex items-end">
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${Math.max(2, h)}%`,
                  background: 'linear-gradient(to top, rgba(124,58,237,0.8), rgba(167,139,250,0.5))',
                  boxShadow: d.count > 0 ? '0 0 12px -4px rgba(124,58,237,0.6)' : undefined,
                }}
                title={`${d.date}: ${d.count} 场`}
              />
            </div>
            <div className="text-[10px] text-white/40 text-center leading-tight">
              <div>{d.date.slice(5)}</div>
              <div className="text-white/70 font-mono">{d.count}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const RARITY_COLOR: Record<string, string> = {
  N: 'bg-white/50',
  R: 'bg-sky-400',
  SR: 'bg-violet-400',
  SSR: 'bg-amber-400',
};

function RarityBars({ data, total }: { data: Array<{ rarity: string; count: number }>; total: number }) {
  const order = ['N', 'R', 'SR', 'SSR'];
  const sorted = [...data].sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity));
  return (
    <div className="space-y-3">
      {sorted.map((r) => {
        const pct = total > 0 ? (r.count / total) * 100 : 0;
        return (
          <div key={r.rarity}>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="font-semibold text-white/80">{r.rarity}</span>
              <span className="text-white/40">{r.count}</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full ${RARITY_COLOR[r.rarity] || 'bg-white/40'} transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({
  label, subtitle, value, extra, icon: Icon, accent, href, loading,
}: {
  label: string;
  subtitle: string;
  value: string;
  extra?: string;
  icon: typeof Sparkles;
  accent: string;
  href: string;
  loading: boolean;
}) {
  return (
    <Link
      href={href}
      className="group relative block rounded-2xl border border-white/10 bg-[#141432]/50 p-5 overflow-hidden transition-colors hover:border-[#A78BFA]/40 hover:bg-[#1A1A3F]/60"
    >
      <div aria-hidden className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${accent} opacity-15 blur-3xl transition-opacity group-hover:opacity-30`} />

      <div className="relative flex items-start gap-3">
        <span className={`inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br ${accent} text-white shadow-[0_0_20px_-4px_rgba(124,58,237,0.5)]`}>
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] tracking-[0.2em] text-white/40 uppercase">{label}</p>
          <p className="mt-1 text-2xl font-bold text-white" style={{ fontFamily: "'Russo One', 'Chakra Petch', sans-serif" }}>
            {loading ? <span className="text-white/30">—</span> : value}
          </p>
          <p className="text-[11px] text-white/40 mt-0.5">{extra ?? subtitle}</p>
        </div>
      </div>
    </Link>
  );
}
