'use client';

import { useState, useEffect, useMemo } from 'react';
import { MapPin, Users, TrendingUp, Crown } from 'lucide-react';
import { getCityCoord } from '@/data/city-coords';

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

      {/* 地图区域 */}
      <section className="section-block">
        <div className="container-main">
          {loading ? (
            <div className="aspect-[6/5] max-w-3xl mx-auto bg-gray-100 rounded-2xl animate-pulse" />
          ) : data && data.cities.length > 0 ? (
            <>
              <h2 className="section-title mb-6">粉丝分布地图</h2>
              <div className="card p-4 sm:p-6">
                <ChinaMapBubble cities={data.cities} />
              </div>
            </>
          ) : null}
        </div>
      </section>

      {/* 城市排行 */}
      <section className="section-block border-t border-divider">
        <div className="container-main">
          {!loading && data && data.cities.length > 0 ? (
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
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-caption font-bold ${
                          idx === 0 ? 'bg-amber-400 text-white' :
                          idx === 1 ? 'bg-gray-300 text-white' :
                          idx === 2 ? 'bg-orange-400 text-white' :
                          'bg-gray-100 text-text-muted'
                        }`}>
                          {idx < 3 ? <Crown className="w-3.5 h-3.5" /> : idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-body font-medium ${isTop3 ? 'text-text-title' : 'text-text-body'}`}>
                              {item.city}
                            </span>
                            <span className={`text-caption font-medium ${isTop3 ? 'text-primary' : 'text-text-muted'}`}>
                              {item.count} 人
                            </span>
                          </div>
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
                  <h3 className="text-body font-semibold text-text-title mb-4">城市占比</h3>
                  <div className="flex items-center justify-center py-4">
                    <CityDonut cities={data.cities.slice(0, 8)} total={data.filledCount} />
                  </div>
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
          ) : !loading ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-text-disabled" />
              </div>
              <p className="text-body font-medium text-text-body">还没有老铁标记城市</p>
              <p className="text-caption text-text-muted mt-1">去个人中心设置你的城市，成为第一个吧！</p>
            </div>
          ) : null}
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

// ===== 中国地图气泡组件 =====

const CHINA_OUTLINE = "M 135 175 L 155 155 L 175 135 L 200 130 L 225 120 L 240 105 L 255 95 L 275 85 L 290 75 L 310 70 L 330 65 L 345 60 L 365 55 L 380 50 L 395 52 L 410 58 L 425 62 L 440 70 L 450 80 L 462 90 L 470 100 L 478 110 L 485 125 L 490 140 L 492 155 L 495 170 L 498 185 L 500 200 L 502 215 L 500 230 L 495 245 L 488 258 L 480 268 L 470 278 L 460 290 L 450 298 L 438 305 L 425 312 L 415 320 L 405 330 L 395 338 L 388 345 L 380 355 L 372 365 L 365 372 L 355 378 L 345 382 L 340 390 L 342 400 L 348 408 L 355 415 L 350 420 L 340 418 L 330 412 L 322 405 L 315 398 L 305 395 L 295 400 L 285 405 L 275 402 L 265 395 L 255 390 L 245 385 L 238 378 L 230 370 L 222 365 L 212 368 L 202 372 L 192 375 L 182 370 L 175 362 L 168 352 L 162 342 L 155 335 L 148 328 L 140 322 L 132 318 L 125 312 L 118 305 L 112 295 L 108 285 L 105 275 L 100 262 L 95 250 L 90 240 L 88 228 L 90 218 L 95 208 L 102 198 L 110 190 L 120 182 Z";

function ChinaMapBubble({ cities }: { cities: CityItem[] }) {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  const bubbles = useMemo(() => {
    const maxC = cities[0]?.count || 1;
    return cities
      .map(item => {
        const coord = getCityCoord(item.city);
        if (!coord) return null;
        const ratio = item.count / maxC;
        const r = 4 + ratio * 14;
        return { ...item, x: coord[0], y: coord[1], r, ratio };
      })
      .filter(Boolean) as { city: string; count: number; x: number; y: number; r: number; ratio: number }[];
  }, [cities]);

  const hovered = hoveredCity ? bubbles.find(b => b.city === hoveredCity) : null;

  return (
    <div className="relative">
      <svg viewBox="0 0 600 500" className="w-full h-auto" style={{ maxHeight: '520px' }}>
        <defs>
          <radialGradient id="mapBg" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#e8f4fd" />
            <stop offset="100%" stopColor="#f0f5fa" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1" />
          </filter>
        </defs>

        {/* 背景 */}
        <rect width="600" height="500" fill="url(#mapBg)" rx="12" />

        {/* 经纬网格 */}
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <line key={`vg${i}`} x1={i * 100} y1="0" x2={i * 100} y2="500" stroke="#d0dbe8" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
        ))}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <line key={`hg${i}`} x1="0" y1={i * 100} x2="600" y2={i * 100} stroke="#d0dbe8" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
        ))}

        {/* 中国轮廓 */}
        <path
          d={CHINA_OUTLINE}
          fill="#dce8f5"
          stroke="#b0c4de"
          strokeWidth="1.5"
          opacity="0.6"
        />

        {/* 气泡 - 底层光晕 */}
        {bubbles.map(b => (
          <circle
            key={`glow-${b.city}`}
            cx={b.x} cy={b.y} r={b.r + 4}
            fill="#1890ff"
            opacity={0.08 + b.ratio * 0.08}
          />
        ))}

        {/* 气泡 - 主体 */}
        {bubbles.map(b => {
          const isHovered = hoveredCity === b.city;
          return (
            <g key={b.city}>
              <circle
                cx={b.x} cy={b.y}
                r={isHovered ? b.r + 3 : b.r}
                fill={isHovered ? '#096dd9' : '#1890ff'}
                fillOpacity={0.25 + b.ratio * 0.45}
                stroke={isHovered ? '#096dd9' : '#1890ff'}
                strokeWidth={isHovered ? 2 : 1.5}
                strokeOpacity={0.6 + b.ratio * 0.3}
                className="transition-all duration-200 cursor-pointer"
                filter={isHovered ? 'url(#glow)' : undefined}
                onMouseEnter={() => setHoveredCity(b.city)}
                onMouseLeave={() => setHoveredCity(null)}
              />
              {/* 城市名标签（大气泡才显示） */}
              {(b.r > 10 || isHovered) && (
                <text
                  x={b.x} y={b.y + b.r + 12}
                  textAnchor="middle"
                  className="fill-[#333] select-none pointer-events-none"
                  style={{ fontSize: '10px', fontWeight: isHovered ? 600 : 500 }}
                >
                  {b.city}
                </text>
              )}
            </g>
          );
        })}

        {/* 图例 */}
        <g transform="translate(16, 440)">
          <rect x="0" y="0" width="130" height="48" rx="8" fill="white" fillOpacity="0.85" filter="url(#shadow)" />
          <circle cx="20" cy="16" r="4" fill="#1890ff" fillOpacity="0.35" stroke="#1890ff" strokeWidth="1" />
          <text x="30" y="20" className="fill-[#666]" style={{ fontSize: '10px' }}>人数少</text>
          <circle cx="75" cy="16" r="8" fill="#1890ff" fillOpacity="0.65" stroke="#1890ff" strokeWidth="1.5" />
          <text x="89" y="20" className="fill-[#666]" style={{ fontSize: '10px' }}>人数多</text>
          <text x="10" y="40" className="fill-[#999]" style={{ fontSize: '9px' }}>气泡越大表示粉丝越多</text>
        </g>
      </svg>

      {/* 悬浮信息卡 */}
      {hovered && (
        <div
          className="absolute z-10 bg-white/95 backdrop-blur border border-divider rounded-lg shadow-dropdown px-4 py-3 pointer-events-none"
          style={{
            left: `${(hovered.x / 600) * 100}%`,
            top: `${(hovered.y / 500) * 100}%`,
            transform: 'translate(-50%, -120%)',
          }}
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="text-body font-semibold text-text-title">{hovered.city}</span>
          </div>
          <p className="text-caption text-primary font-medium mt-0.5">{hovered.count} 位老铁</p>
        </div>
      )}
    </div>
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
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#f0f0f0" strokeWidth={strokeWidth}
      />
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
