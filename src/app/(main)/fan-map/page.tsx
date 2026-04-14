'use client';

import { useState, useEffect } from 'react';
import { MapPin, Users, Globe, Crown, Loader2, Check, Navigation } from 'lucide-react';
import dynamic from 'next/dynamic';

const WorldDotMap = dynamic(() => import('@/components/WorldDotMap'), {
  ssr: false,
  loading: () => <div className="aspect-[2/1] bg-slate-900 rounded-2xl animate-pulse" />,
});

interface CityItem {
  city: string;
  count: number;
  users?: string[];
  coord: [number, number] | null;
}

interface FanMapData {
  cities: CityItem[];
  totalFans: number;
  filledCount: number;
}

export default function FanMapPage() {
  const [data, setData] = useState<FanMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [myCity, setMyCity] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 获取地图数据
  const fetchData = () => {
    fetch('/api/public/fan-map')
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0) setData(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    // 获取当前用户信息
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0 && json.data) {
          setIsLoggedIn(true);
          setMyCity(json.data.city || '');
          setCityInput(json.data.city || '');
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveCity = async () => {
    const trimmed = cityInput.trim();
    if (!trimmed || trimmed === myCity) return;
    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: trimmed }),
      });
      const json = await res.json();
      if (json.code === 0) {
        setMyCity(trimmed);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        // 刷新地图数据
        setTimeout(fetchData, 500);
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const maxCount = data?.cities[0]?.count || 1;

  // 有坐标的位置用于地图
  const mapLocations = (data?.cities || []).filter((c) => c.coord !== null) as (CityItem & { coord: [number, number] })[];

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
          <div className="animate-fade-in-up inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-full px-4 py-1.5 mb-4">
            <Globe className="w-4 h-4 text-primary" />
            <span className="text-caption font-medium text-primary">全球泽小将分布</span>
          </div>
          <h1 className="animate-fade-in-up text-heading text-white" style={{ animationDelay: '0.1s' }}>
            泽小将都在哪？
          </h1>
          <p className="animate-fade-in-up text-body text-gray-400 mt-2 max-w-md mx-auto" style={{ animationDelay: '0.2s' }}>
            标记你的位置，看看全球泽小将的分布
          </p>

          {/* 内联定位输入 */}
          {isLoggedIn && (
            <div className="animate-fade-in-up mt-6 max-w-sm mx-auto" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-2 py-1.5">
                <Navigation className="w-4 h-4 text-primary ml-2 flex-shrink-0" />
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => { setCityInput(e.target.value); setSaved(false); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveCity()}
                  placeholder="输入你的位置，如：北京、Tokyo、London"
                  maxLength={50}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none min-w-0"
                />
                <button
                  onClick={handleSaveCity}
                  disabled={saving || !cityInput.trim() || cityInput.trim() === myCity}
                  className="h-8 px-4 rounded-full bg-primary text-white text-caption font-medium hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 flex-shrink-0"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : null}
                  {saving ? '保存中' : saved ? '已保存' : '标记'}
                </button>
              </div>
              {myCity && (
                <p className="text-caption text-white/40 mt-2">
                  当前位置：<span className="text-primary/80">{myCity}</span>
                </p>
              )}
            </div>
          )}

          {/* 统计卡片 */}
          {data && (
            <div className="animate-fade-in-up flex flex-wrap items-center justify-center gap-3 mt-8" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-card px-4 py-3">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-heading-sm text-white">{data.totalFans}</span>
                <span className="text-caption text-gray-400">泽小将</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-card px-4 py-3">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-heading-sm text-white">{data.filledCount}</span>
                <span className="text-caption text-gray-400">已标记</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-card px-4 py-3">
                <Globe className="w-4 h-4 text-primary" />
                <span className="text-heading-sm text-white">{data.cities.length}</span>
                <span className="text-caption text-gray-400">覆盖位置</span>
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
            <div className="aspect-[2/1] bg-slate-900 rounded-2xl animate-pulse" />
          ) : mapLocations.length > 0 ? (
            <div className="animate-fade-in-up">
              <h2 className="section-title mb-6">全球分布地图</h2>
              <WorldDotMap locations={mapLocations} />
            </div>
          ) : null}
        </div>
      </section>

      {/* 位置排行 */}
      <section className="section-block border-t border-divider">
        <div className="container-main">
          {!loading && data && data.cities.length > 0 ? (
            <div className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
              <h2 className="section-title mb-6">位置排行榜</h2>
              <div className="grid lg:grid-cols-2 gap-4">
                {/* 左侧：TOP 排行列表 */}
                <div className="space-y-2">
                  {data.cities.map((item, idx) => {
                    const pct = Math.round((item.count / maxCount) * 100);
                    const isTop3 = idx < 3;
                    return (
                      <div
                        key={item.city}
                        className={`animate-fade-in-up relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors duration-150 ${
                          isTop3
                            ? 'bg-primary/[0.04] border-primary/20'
                            : 'bg-white border-divider hover:border-primary/30'
                        }`}
                        style={{ animationDelay: `${idx * 0.05}s` }}
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

                {/* 右侧：圆环图 */}
                <div className="bg-white rounded-card border border-divider p-6">
                  <h3 className="text-body font-semibold text-text-title mb-4">位置占比</h3>
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
                        <span className="text-caption text-text-muted">其他位置</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : !loading ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-text-disabled" />
              </div>
              <p className="text-body font-medium text-text-body">还没有泽小将标记位置</p>
              <p className="text-caption text-text-muted mt-1">
                {isLoggedIn ? '在上方输入你的位置，成为第一个吧！' : '登录后即可标记你的位置'}
              </p>
              {!isLoggedIn && (
                <a href="/login" className="btn-primary inline-flex items-center justify-center mt-4 h-10 px-6">
                  登录 / 加入
                </a>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {/* CTA */}
      {!isLoggedIn && (
        <section className="section-block border-t border-divider bg-white">
          <div className="container-main text-center max-w-md mx-auto">
            <Globe className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="text-heading-sm text-text-title">标记你的位置</h3>
            <p className="text-body text-text-muted mt-1">
              登录后在页面顶部输入你的位置，即可出现在全球粉丝地图上
            </p>
            <a href="/login" className="btn-primary inline-flex items-center justify-center mt-4 h-10 px-6">
              登录 / 加入
            </a>
          </div>
        </section>
      )}
    </>
  );
}

// ===== 圆环图组件 =====

const CHART_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#06b6d4', '#8b5cf6', '#f97316', '#ec4899',
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
