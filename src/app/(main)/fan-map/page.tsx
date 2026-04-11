'use client';

import { useState, useEffect } from 'react';
import { MapPin, Users, TrendingUp, Crown } from 'lucide-react';

interface CityItem {
  city: string;
  count: number;
}

interface FanMapData {
  cities: CityItem[];
  totalFans: number;
  filledCount: number;
}

export default function FanMapPage() {
  const [data, setData] = useState<FanMapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/fan-map')
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0) setData(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxCount = data?.cities[0]?.count || 1;

  return (
    <>
      {/* Hero */}
      <section className="relative bg-gray-900 overflow-hidden pt-14">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-gray-900 to-gray-900" />
        <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
          <span
            className="text-[120px] sm:text-[200px] leading-none font-bold text-white/[0.03]"
            style={{ fontFamily: "'Blazed', sans-serif" }}
          >
            MAP
          </span>
        </div>
        <div className="container-main px-4 sm:px-6 lg:px-8 relative z-10 py-16 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-full px-4 py-1.5 mb-4">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-caption font-medium text-primary">粉丝地图</span>
          </div>
          <h1 className="text-heading text-white">老铁都在哪？</h1>
          <p className="text-body text-gray-400 mt-2 max-w-md mx-auto">
            看看全国各地的老铁分布，在个人中心设置你的城市，加入地图吧！
          </p>

          {/* 统计卡片 */}
          {data && (
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-card px-4 py-3">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-heading-sm text-white">{data.totalFans}</span>
                <span className="text-caption text-gray-400">总粉丝</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-card px-4 py-3">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-heading-sm text-white">{data.filledCount}</span>
                <span className="text-caption text-gray-400">已标记</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-card px-4 py-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-heading-sm text-white">{data.cities.length}</span>
                <span className="text-caption text-gray-400">覆盖城市</span>
              </div>
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#FAFAFA] to-transparent" />
      </section>

      {/* 城市排行 */}
      <section className="section-block">
        <div className="container-main">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !data || data.cities.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-text-disabled" />
              </div>
              <p className="text-body font-medium text-text-body">还没有老铁标记城市</p>
              <p className="text-caption text-text-muted mt-1">去个人中心设置你的城市，成为第一个吧！</p>
            </div>
          ) : (
            <>
              <h2 className="section-title mb-6">城市排行榜</h2>
              <div className="grid lg:grid-cols-2 gap-4">
                {/* 左侧：TOP 排行列表 */}
                <div className="space-y-2">
                  {data.cities.map((item, idx) => {
                    const pct = Math.round((item.count / maxCount) * 100);
                    const isTop3 = idx < 3;
                    return (
                      <div
                        key={item.city}
                        className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors duration-150 ${
                          isTop3
                            ? 'bg-primary/[0.04] border-primary/20'
                            : 'bg-white border-divider hover:border-primary/30'
                        }`}
                      >
                        {/* 排名 */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-caption font-bold ${
                          idx === 0 ? 'bg-amber-400 text-white' :
                          idx === 1 ? 'bg-gray-300 text-white' :
                          idx === 2 ? 'bg-orange-400 text-white' :
                          'bg-gray-100 text-text-muted'
                        }`}>
                          {idx < 3 ? <Crown className="w-3.5 h-3.5" /> : idx + 1}
                        </div>

                        {/* 城市名 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-body font-medium ${isTop3 ? 'text-text-title' : 'text-text-body'}`}>
                              {item.city}
                            </span>
                            <span className={`text-caption font-medium ${isTop3 ? 'text-primary' : 'text-text-muted'}`}>
                              {item.count} 人
                            </span>
                          </div>
                          {/* 进度条 */}
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                idx === 0 ? 'bg-amber-400' :
                                idx === 1 ? 'bg-gray-400' :
                                idx === 2 ? 'bg-orange-400' :
                                'bg-primary/60'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 右侧：可视化饼图 */}
                <div className="card p-6">
                  <h3 className="text-body font-semibold text-text-title mb-4">城市分布</h3>

                  {/* 圆环图 */}
                  <div className="flex items-center justify-center py-4">
                    <CityDonut cities={data.cities.slice(0, 8)} total={data.filledCount} />
                  </div>

                  {/* 图例 */}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {data.cities.slice(0, 8).map((item, idx) => (
                      <div key={item.city} className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                        />
                        <span className="text-caption text-text-body truncate">{item.city}</span>
                        <span className="text-caption text-text-muted ml-auto">{Math.round((item.count / data.filledCount) * 100)}%</span>
                      </div>
                    ))}
                    {data.cities.length > 8 && (
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-gray-200" />
                        <span className="text-caption text-text-muted">其他城市</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="section-block border-t border-divider bg-white">
        <div className="container-main text-center max-w-md mx-auto">
          <MapPin className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="text-heading-sm text-text-title">标记你的城市</h3>
          <p className="text-body text-text-muted mt-1">
            在个人中心 → 个人资料 → 所在城市中设置，即可出现在粉丝地图上
          </p>
          <a href="/me" className="btn-primary inline-flex items-center justify-center mt-4 h-10 px-6">
            前往设置
          </a>
        </div>
      </section>
    </>
  );
}

// ===== 圆环图组件 =====

const CHART_COLORS = [
  '#1890ff', '#52c41a', '#faad14', '#ff4d4f',
  '#36cfc9', '#597ef7', '#ff7a45', '#9254de',
];

function CityDonut({ cities, total }: { cities: CityItem[]; total: number }) {
  const size = 180;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;
  const segments = cities.map((item, idx) => {
    const pct = item.count / total;
    const offset = accumulated;
    accumulated += pct;
    return { ...item, pct, offset, color: CHART_COLORS[idx % CHART_COLORS.length] };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
      {/* 底色环 */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#f0f0f0" strokeWidth={strokeWidth}
      />
      {/* 数据段 */}
      {segments.map((seg) => (
        <circle
          key={seg.city}
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={seg.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${seg.pct * circumference} ${circumference}`}
          strokeDashoffset={-seg.offset * circumference}
          strokeLinecap="butt"
          className="transition-all duration-500"
        />
      ))}
      {/* 中心文字 */}
      <text
        x={size / 2} y={size / 2 - 6}
        textAnchor="middle" dominantBaseline="middle"
        className="fill-[#1a1a1a] text-[24px] font-bold"
        transform={`rotate(90, ${size / 2}, ${size / 2})`}
      >
        {total}
      </text>
      <text
        x={size / 2} y={size / 2 + 16}
        textAnchor="middle" dominantBaseline="middle"
        className="fill-[#999] text-[12px]"
        transform={`rotate(90, ${size / 2}, ${size / 2})`}
      >
        已标记
      </text>
    </svg>
  );
}
