'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface RankingItem {
  rank: number;
  id: string;
  name: string;
  avatar: string;
  level: number;
  badge: string;
  points: number;
  postCount: number;
  commentCount: number;
}

function formatNum(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  return num.toLocaleString();
}

export default function RankingPage() {
  const [fanRankings, setFanRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('total');

  useEffect(() => {
    fetch('/api/public/ranking')
      .then((r) => r.json())
      .then((res) => { if (res.data) setFanRankings(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="section-block pb-6 pt-20 animate-fade-in-up">
        <div className="container-main">
          <h1 className="section-title">粉丝排行榜</h1>
          <p className="section-desc">活跃互动，争当铁粉</p>

          <div className="flex gap-1.5 mt-6">
            {[
              { key: 'daily', label: '今日榜' },
              { key: 'weekly', label: '本周榜' },
              { key: 'total', label: '总榜' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`h-8 px-3 rounded-btn text-body font-medium transition-colors duration-150 cursor-pointer ${
                  activeTab === tab.key ? 'bg-primary text-white' : 'bg-white border border-divider text-text-body hover:border-primary hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="container-main px-4 sm:px-6 lg:px-8 pb-16 max-w-3xl">
        {loading ? (
          <p className="text-body text-text-muted text-center py-12">加载中...</p>
        ) : fanRankings.length === 0 ? (
          <p className="text-body text-text-muted text-center py-12">暂无排行数据</p>
        ) : (
        <>
        {/* Top 3 */}
        {fanRankings.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[fanRankings[1], fanRankings[0], fanRankings[2]].map((fan, idx) => {
            const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
            return (
              <div key={fan.rank} className={`card text-center ${rank === 1 ? 'border-primary' : ''}`}>
                <div className={`text-caption font-bold mb-2 ${rank === 1 ? 'text-primary' : 'text-text-muted'}`}>#{rank}</div>
                <div className="relative w-14 h-14 rounded-full overflow-hidden mx-auto bg-gray-100">
                  <Image src={fan.avatar} alt={fan.name} fill className="object-cover" />
                </div>
                <p className="text-body font-medium text-text-title mt-2">{fan.name}</p>
                <p className="tag-primary mt-1.5 mx-auto">Lv.{fan.level}</p>
                <p className="text-caption text-text-muted mt-1">{formatNum(fan.points)} 积分</p>
              </div>
            );
          })}
        </div>
        )}

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <div className="grid grid-cols-[48px_1fr_80px_72px_72px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-divider text-caption font-medium text-text-muted">
            <span>#</span>
            <span>用户</span>
            <span className="text-right">积分</span>
            <span className="text-right hidden sm:block">帖子</span>
            <span className="text-right hidden sm:block">评论</span>
          </div>

          {fanRankings.map((fan) => (
            <div
              key={fan.rank}
              className={`grid grid-cols-[48px_1fr_80px_72px_72px] gap-3 px-4 py-3 items-center border-b border-divider last:border-b-0 hover:bg-gray-50 transition-colors duration-150 cursor-pointer ${fan.rank <= 3 ? 'bg-primary-bg/30' : ''}`}
            >
              <span className={`text-body font-bold ${fan.rank <= 3 ? 'text-primary' : 'text-text-muted'}`}>{fan.rank}</span>

              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                  <Image src={fan.avatar} alt={fan.name} fill className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-body font-medium text-text-title truncate">{fan.name}</p>
                  <p className="text-caption text-text-muted">Lv.{fan.level} {fan.badge}</p>
                </div>
              </div>

              <span className="text-body font-semibold text-text-title text-right">{formatNum(fan.points)}</span>
              <span className="text-body text-text-muted text-right hidden sm:block">{fan.postCount}</span>
              <span className="text-body text-text-muted text-right hidden sm:block">{fan.commentCount}</span>
            </div>
          ))}
        </div>

        {/* Level Explanation */}
        <div className="card mt-6">
          <h3 className="text-body font-semibold text-text-title mb-3">等级说明</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: '铁粉', range: 'Lv.1-6' },
              { name: '真爱粉', range: 'Lv.7-8' },
              { name: '超级粉', range: 'Lv.9' },
              { name: '传奇粉', range: 'Lv.10' },
            ].map((b) => (
              <div key={b.name} className="flex items-center gap-2 p-2.5 rounded-card bg-gray-50">
                <span className="tag-primary">{b.name}</span>
                <span className="text-caption text-text-muted">{b.range}</span>
              </div>
            ))}
          </div>
          <p className="text-caption text-text-muted mt-3">
            积分规则：发帖 +10、评论 +5、获赞 +2、签到 +5
          </p>
        </div>
        </>
        )}
      </div>
    </>
  );
}
