'use client';

/**
 * 排行榜页面 —— 展示玩家 ELO 排名、段位、胜率
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string | null;
  rating: number;
  tier: string;
  wins: number;
  losses: number;
  winRate: number;
}

const TIER_META: Record<string, { label: string; color: string; bg: string }> = {
  iron:    { label: '黑铁', color: 'text-slate-400',   bg: 'bg-slate-500/20' },
  silver:  { label: '白银', color: 'text-gray-300',    bg: 'bg-gray-400/20' },
  gold:    { label: '黄金', color: 'text-amber-400',   bg: 'bg-amber-500/20' },
  diamond: { label: '钻石', color: 'text-sky-400',     bg: 'bg-sky-500/20' },
  master:  { label: '大师', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/20' },
};

const RANK_COLORS = ['text-amber-400', 'text-gray-300', 'text-amber-600'];

export default function RankPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/tcg/public/leaderboard?limit=50')
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0 && json.data?.leaderboard) {
          setData(json.data.leaderboard);
        } else {
          setError(json.message || '加载失败');
        }
      })
      .catch(() => setError('网络错误'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pt-6 pb-14 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] text-[#A78BFA]/80 mb-2">
          <span className="inline-block w-6 h-px bg-[#A78BFA]/60" /> LEADERBOARD
        </div>
        <h1 className="neon-heading text-3xl sm:text-4xl mb-3">排行榜</h1>
        <p className="text-white/60 mb-6 text-sm">
          查看当季玩家 ELO 排名与战绩统计。段位越高越难，胜场决定一切。
        </p>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2 text-white/50">
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83" />
              </svg>
              加载中...
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-white/50 mb-2">{error}</p>
            <p className="text-white/30 text-sm">暂无排行数据，快去对战刷分吧！</p>
            <Link
              href="/game/room"
              className="inline-block mt-4 px-4 py-2 rounded-lg bg-[#7C3AED]/30 text-[#A78BFA] text-sm hover:bg-[#7C3AED]/50 transition-colors"
            >
              去对战
            </Link>
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-white/50 text-lg mb-2">暂无排行数据</p>
            <p className="text-white/30 text-sm">成为第一个上榜的玩家吧！</p>
            <Link
              href="/game/room"
              className="inline-block mt-4 px-4 py-2 rounded-lg bg-[#7C3AED]/30 text-[#A78BFA] text-sm hover:bg-[#7C3AED]/50 transition-colors"
            >
              去对战
            </Link>
          </div>
        )}

        {!loading && data.length > 0 && (
          <div className="space-y-2">
            {/* 表头 */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] tracking-[0.2em] text-white/40 uppercase">
              <div className="col-span-1">#</div>
              <div className="col-span-4">玩家</div>
              <div className="col-span-2 text-center">段位</div>
              <div className="col-span-2 text-center">ELO</div>
              <div className="col-span-1 text-center">胜</div>
              <div className="col-span-1 text-center">负</div>
              <div className="col-span-1 text-center">胜率</div>
            </div>

            {data.map((entry) => {
              const tier = TIER_META[entry.tier] || TIER_META.iron;
              return (
                <div
                  key={entry.userId}
                  className={[
                    'grid grid-cols-12 gap-2 items-center px-4 py-3 rounded-xl transition-colors',
                    entry.rank <= 3
                      ? 'glass-card border border-[#A78BFA]/20 bg-[#7C3AED]/[0.08]'
                      : 'bg-white/[0.02] hover:bg-white/[0.05]',
                  ].join(' ')}
                >
                  {/* 排名 */}
                  <div className="col-span-1">
                    <span className={[
                      'text-lg font-black',
                      entry.rank <= 3 ? (RANK_COLORS[entry.rank - 1] || 'text-white') : 'text-white/40',
                    ].join(' ')}>
                      {entry.rank}
                    </span>
                  </div>

                  {/* 玩家名 */}
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm shrink-0">
                      {entry.avatar ? (
                        <img src={entry.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-white/40">{entry.name[0]}</span>
                      )}
                    </div>
                    <span className="text-white text-sm font-semibold truncate">{entry.name}</span>
                  </div>

                  {/* 段位 */}
                  <div className="col-span-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${tier.color} ${tier.bg}`}>
                      {tier.label}
                    </span>
                  </div>

                  {/* ELO */}
                  <div className="col-span-2 text-center">
                    <span className="text-white font-bold text-sm">{entry.rating}</span>
                  </div>

                  {/* 胜 */}
                  <div className="col-span-1 text-center text-emerald-400 text-sm">{entry.wins}</div>

                  {/* 负 */}
                  <div className="col-span-1 text-center text-rose-400 text-sm">{entry.losses}</div>

                  {/* 胜率 */}
                  <div className="col-span-1 text-center">
                    <span className={[
                      'text-sm font-semibold',
                      entry.winRate >= 60 ? 'text-emerald-400' : entry.winRate >= 40 ? 'text-white/60' : 'text-rose-400',
                    ].join(' ')}>
                      {entry.winRate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/game"
            className="text-white/40 text-xs hover:text-white/70 transition-colors"
          >
            ← 返回游戏大厅
          </Link>
        </div>
      </div>
    </div>
  );
}
