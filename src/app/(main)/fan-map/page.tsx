'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertCircle, Check, ChevronLeft, ChevronRight, Globe2, Loader2, LocateFixed, MapPin, RefreshCw, Route, Sparkles } from 'lucide-react';
import { getCityDisplayName } from '@/data/city-coords';
import type { LocationItem } from '@/components/ThreeFanGlobe';
import MapLoadingOverlay from '@/components/MapLoadingOverlay';
import AmapDetailMap from '@/components/AmapDetailMap';

const ThreeFanGlobe = dynamic(() => import('@/components/ThreeFanGlobe'), {
  ssr: false,
  loading: () => <div className="relative h-full min-h-[640px] bg-slate-950"><MapLoadingOverlay label="正在加载 3D 地球" /></div>,
});

interface CityUserPreview {
  name: string;
  avatar?: string | null;
}

interface CityItem {
  city: string;
  count: number;
  users?: Array<string | CityUserPreview>;
  coord: [number, number] | null;
}

interface RegionItem {
  name: string;
  count: number;
  cityCount: number;
  topCities: Array<{ city: string; count: number }>;
}

interface FanMapData {
  cities: CityItem[];
  regions?: RegionItem[];
  totalFans: number;
  filledCount: number;
  mappedCount: number;
  mappedCityCount: number;
  unmappedCount: number;
  unmappedCities: Array<{ city: string; count: number }>;
  coverageRate: number;
  updatedAt?: string;
}

interface ReverseGeocodeApiResponse {
  code?: number;
  message?: string;
  data?: {
    city?: string;
    district?: string;
  } | null;
}

interface LocateRuntimeContext {
  permissionState: PermissionState | 'unsupported' | 'unknown';
  isSecureContext: boolean;
  protocol: string;
  hostname: string;
}

function buildLocationValue(city: string, district: string): string {
  const nextCity = city.trim();
  const nextDistrict = district.trim();
  if (!nextCity) return '';
  return nextDistrict ? `${nextCity}/${nextDistrict}` : nextCity;
}

function parseLocationValue(value: string): { city: string; district: string } {
  const rawValue = value.trim();
  if (!rawValue) return { city: '', district: '' };

  const normalizedValue = rawValue.replace(/[，、]/g, ',').replace(/[－—]/g, '/');
  const parts = normalizedValue.split(/[,/]/).map((part) => part.trim()).filter(Boolean);
  const resolvedCity = getCityDisplayName(rawValue);
  const cityIndex = parts.findIndex((part) => getCityDisplayName(part) === resolvedCity || part === resolvedCity);
  const districtParts = cityIndex >= 0 ? parts.slice(cityIndex + 1) : parts.slice(1);

  return {
    city: resolvedCity || parts[0] || rawValue,
    district: districtParts.join('/'),
  };
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    });
  });
}

async function reverseGeocodeLocation(longitude: number, latitude: number): Promise<{ city: string; district: string }> {
  const url = new URL('/api/public/geocodes/reverse', window.location.origin);
  url.searchParams.set('location', `${longitude},${latitude}`);

  const response = await fetch(url.toString(), { cache: 'no-store' });
  const data = await response.json() as ReverseGeocodeApiResponse;

  if (!response.ok || data.code !== 0 || !data.data?.city) {
    throw new Error(data.message || 'reverse-geocode-failed');
  }

  return {
    city: data.data.city,
    district: data.data.district?.trim() || '',
  };
}

async function getLocateRuntimeContext(): Promise<LocateRuntimeContext> {
  const fallbackContext: LocateRuntimeContext = {
    permissionState: 'unsupported',
    isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
    protocol: typeof window !== 'undefined' ? window.location.protocol : '',
    hostname: typeof window !== 'undefined' ? window.location.hostname : '',
  };

  if (typeof navigator === 'undefined' || !(navigator.permissions && navigator.permissions.query)) {
    return fallbackContext;
  }

  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return { ...fallbackContext, permissionState: status.state };
  } catch {
    return { ...fallbackContext, permissionState: 'unknown' };
  }
}

function isLocalhostHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function getLocateErrorCode(error: unknown): number | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return typeof (error as { code?: unknown }).code === 'number' ? (error as { code: number }).code : null;
  }
  return null;
}

function formatPermissionState(state: LocateRuntimeContext['permissionState']): string {
  if (state === 'granted') return '已允许';
  if (state === 'prompt') return '待确认';
  if (state === 'denied') return '已拒绝';
  if (state === 'unknown') return '未知';
  return '不支持检测';
}

function buildLocateDiagnostic(error: unknown, context: LocateRuntimeContext): string {
  const parts = [
    `权限状态：${formatPermissionState(context.permissionState)}`,
    `安全上下文：${context.isSecureContext ? '是' : '否'}`,
    `协议：${context.protocol || '未知'}`,
  ];
  const errorCode = getLocateErrorCode(error);
  if (errorCode !== null) parts.push(`错误码：${errorCode}`);
  if (error instanceof Error && error.message) parts.push(`原因：${error.message}`);
  return parts.join(' · ');
}

function getLocateErrorMessage(error: unknown, context: LocateRuntimeContext): string {
  const code = getLocateErrorCode(error);

  if (code === 1) {
    if (!context.isSecureContext && !isLocalhostHost(context.hostname)) {
      return '当前页面不是安全上下文，浏览器不会放行定位。请使用 localhost 或 HTTPS 访问后再试。';
    }
    if (context.permissionState === 'denied') {
      return '当前站点定位权限已被拒绝，请修改浏览器站点设置后刷新页面。';
    }
    return '浏览器拒绝了定位请求，请确认系统定位服务和站点定位权限可用。';
  }

  if (code === 2) return '当前设备暂时无法获取定位信息，请检查系统定位服务。';
  if (code === 3) return '定位请求超时，请检查网络或稍后重试。';

  if (error instanceof Error) {
    if (error.message === 'geolocation-unsupported') return '当前浏览器不支持定位。';
    if (error.message === 'geolocation-insecure-context') return '当前页面不是 HTTPS 或 localhost，浏览器不会提供定位。';
    if (error.message === 'geolocation-permission-denied') return '浏览器权限状态显示为已拒绝，请修改后刷新页面。';
    if (error.message) return error.message;
  }

  return '自动定位失败，请稍后再试。';
}

function formatUpdateTime(value?: string): string {
  if (!value) return '刚刚';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function FanMapPage() {
  const [data, setData] = useState<FanMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myCity, setMyCity] = useState('');
  const [locationDraft, setLocationDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState('');
  const [locationDiagnostic, setLocationDiagnostic] = useState('');
  const [locationFeedbackType, setLocationFeedbackType] = useState<'default' | 'success' | 'error'>('default');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mapResetToken, setMapResetToken] = useState(0);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'globe' | 'amap'>('globe');
  const [mapFocusLocation, setMapFocusLocation] = useState<LocationItem | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const fetchData = async (showLoading: boolean = true) => {
    if (showLoading) setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/public/fan-map', { cache: 'no-store' });
      const json = await response.json();

      if (!response.ok || json.code !== 0) {
        throw new Error(json.msg || '粉丝地图加载失败');
      }

      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '粉丝地图加载失败');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    void fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0 && json.data) {
          setIsLoggedIn(true);
          setMyCity(typeof json.data.city === 'string' ? json.data.city : '');
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveCity = async () => {
    const trimmed = locationDraft.trim();
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
        await fetchData(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAutoLocate = async (): Promise<void> => {
    let runtimeContext = await getLocateRuntimeContext();
    setSaved(false);
    setLocationDiagnostic('');
    setLocationFeedback('正在识别当前位置...');
    setLocationFeedbackType('default');
    setLocating(true);

    try {
      if (!runtimeContext.isSecureContext && !isLocalhostHost(runtimeContext.hostname)) {
        throw new Error('geolocation-insecure-context');
      }
      if (runtimeContext.permissionState === 'denied') {
        throw new Error('geolocation-permission-denied');
      }
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        throw new Error('geolocation-unsupported');
      }

      const position = await getCurrentPosition();
      const detected = await reverseGeocodeLocation(position.coords.longitude, position.coords.latitude);
      const nextLocation = buildLocationValue(detected.city, detected.district);

      setLocationDraft(nextLocation);
      setLocationFeedback(`已识别为 ${nextLocation}，确认无误后可以更新到粉丝地图。`);
      setLocationFeedbackType('success');
    } catch (err) {
      runtimeContext = await getLocateRuntimeContext();
      setLocationDiagnostic(buildLocateDiagnostic(err, runtimeContext));
      setLocationFeedback(getLocateErrorMessage(err, runtimeContext));
      setLocationFeedbackType('error');
    } finally {
      setLocating(false);
    }
  };

  const mapLocations = useMemo(
    () => (data?.cities || []).filter((city) => city.coord !== null) as LocationItem[],
    [data]
  );
  const topCities = useMemo(() => mapLocations.slice(0, 10), [mapLocations]);
  const selectedLocation = useMemo(
    () => mapLocations.find((location) => location.city === selectedCity) ?? null,
    [mapLocations, selectedCity]
  );
  const regions = useMemo(() => data?.regions?.slice(0, 6) ?? [], [data]);
  const maxRegionCount = useMemo(() => Math.max(...regions.map((region) => region.count), 1), [regions]);
  const draftLocationDisplay = useMemo(() => {
    if (!locationDraft) return '';
    const parsed = parseLocationValue(locationDraft);
    const displayCity = getCityDisplayName(parsed.city) || parsed.city;
    return parsed.district ? `${displayCity}/${parsed.district}` : displayCity;
  }, [locationDraft]);
  const myCityDisplay = useMemo(() => {
    if (!myCity) return '';
    const parsed = parseLocationValue(myCity);
    const displayCity = getCityDisplayName(parsed.city) || parsed.city;
    return parsed.district ? `${displayCity}/${parsed.district}` : displayCity;
  }, [myCity]);
  const canSaveLocatedDraft = useMemo(() => Boolean(locationDraft.trim()) && locationDraft.trim() !== myCity, [locationDraft, myCity]);

  return (
    <section className="fixed inset-0 z-0 h-[100dvh] overflow-hidden bg-[#020817] text-white">
      <div className="absolute inset-0">
        {loading ? (
          <MapLoadingOverlay label="正在加载粉丝地图" />
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <AlertCircle className="h-10 w-10 text-[#ff4d4f]" />
            <p className="mt-4 text-body font-medium text-white">粉丝地图加载失败</p>
            <p className="mt-2 max-w-md text-caption text-white/55">{error}</p>
            <button
              onClick={() => void fetchData()}
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-caption font-medium text-white transition-colors hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4" />
              重新加载
            </button>
          </div>
        ) : mapLocations.length > 0 && viewMode === 'amap' ? (
          <AmapDetailMap
            locations={mapLocations}
            focusLocation={mapFocusLocation ?? selectedLocation ?? mapLocations[0]}
            onBackToGlobe={() => setViewMode('globe')}
          />
        ) : mapLocations.length > 0 ? (
          <ThreeFanGlobe
            locations={mapLocations}
            resetToken={mapResetToken}
            selectedCity={selectedCity}
            onSelectLocation={(location) => setSelectedCity(location?.city ?? null)}
            onRequestMapView={(location) => {
              setMapFocusLocation(location);
              setSelectedCity(location?.city ?? null);
              setViewMode('amap');
            }}
            stats={{
              totalFans: data?.totalFans ?? 0,
              mappedCount: data?.mappedCount ?? 0,
              mappedCityCount: data?.mappedCityCount ?? 0,
              coverageRate: data?.coverageRate ?? 0,
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <MapPin className="h-10 w-10 text-white/35" />
            <p className="mt-4 text-body font-medium text-white">还没有可显示的位置</p>
            <p className="mt-2 max-w-md text-caption text-white/55">
              {isLoggedIn ? '先点亮你的城市，成为第一个出现在地图上的泽小将。' : '登录后填写位置，就能出现在全球地图上。'}
            </p>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-36 bg-gradient-to-b from-[#020817] via-[#020817]/70 to-transparent" />

      <div className="absolute left-4 right-4 top-20 z-30 flex flex-col gap-3 lg:left-8 lg:right-auto lg:w-[420px]">
        <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-2xl backdrop-blur-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-400/10 px-3 py-1 text-caption font-medium text-sky-100">
            <Globe2 className="h-4 w-4" />
            全球粉丝地图
          </div>
          <h1 className="mt-3 text-heading-lg text-white">泽小将分布雷达</h1>
          <p className="hidden">
            使用 three-globe 真实 3D 地球模型展示城市点亮、飞线和地区热力。数据只展示城市级别。
          </p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            <div className="rounded-2xl bg-white/8 p-3">
              <p className="text-[11px] text-white/45">粉丝</p>
              <p className="mt-1 text-body font-semibold">{data?.totalFans ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white/8 p-3">
              <p className="text-[11px] text-white/45">已上图</p>
              <p className="mt-1 text-body font-semibold">{data?.mappedCount ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white/8 p-3">
              <p className="text-[11px] text-white/45">城市</p>
              <p className="mt-1 text-body font-semibold">{data?.mappedCityCount ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white/8 p-3">
              <p className="text-[11px] text-white/45">覆盖</p>
              <p className="mt-1 text-body font-semibold">{data?.coverageRate ?? 0}%</p>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setRightPanelOpen((open) => !open)}
        className="absolute right-4 top-[96px] z-40 hidden h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-slate-950/72 text-white shadow-2xl backdrop-blur-xl transition-colors hover:bg-slate-900/90 lg:inline-flex"
        aria-label={rightPanelOpen ? '收起右侧面板' : '展开右侧面板'}
        title={rightPanelOpen ? '收起右侧面板' : '展开右侧面板'}
      >
        {rightPanelOpen ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
      </button>

      <aside className={`absolute bottom-4 right-4 top-[148px] z-30 hidden w-[390px] overflow-y-auto pr-1 transition-all duration-300 ease-out lg:block [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
        rightPanelOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-[calc(100%+32px)] opacity-0'
      }`}>
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-slate-950/62 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-body font-semibold text-white">城市排行榜</h2>
              <span className="text-caption text-white/42">Top 10</span>
            </div>
            <div className="mt-4 space-y-2">
              {topCities.map((item, index) => (
                <button
                  type="button"
                  key={item.city}
                  onClick={() => {
                    setSelectedCity(item.city);
                    setMapFocusLocation(item);
                    if (viewMode === 'amap') {
                      setViewMode('amap');
                    }
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors ${selectedCity === item.city ? 'bg-sky-400/14 text-sky-100' : 'hover:bg-white/8'}`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-caption font-semibold ${index < 3 ? 'bg-primary text-white' : 'bg-white/10 text-white/60'}`}>{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-caption font-medium">{item.city}</span>
                  <span className="text-caption text-white/52">{item.count} 人</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/62 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <h2 className="text-body font-semibold text-white">地区热力</h2>
            </div>
            <div className="mt-4 space-y-3">
              {regions.length > 0 ? regions.map((region) => (
                <div key={region.name}>
                  <div className="flex items-center justify-between text-caption">
                    <span className="font-medium text-white">{region.name}</span>
                    <span className="text-white/50">{region.count} 人 · {region.cityCount} 城</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-amber-300" style={{ width: `${Math.max(8, (region.count / maxRegionCount) * 100)}%` }} />
                  </div>
                </div>
              )) : (
                <p className="text-caption leading-6 text-white/55">有城市被点亮后，这里会展示地区分布热度。</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/62 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-sky-300" />
              <h2 className="text-body font-semibold text-white">当前位置</h2>
            </div>
            {isLoggedIn ? (
              <>
                <p className="mt-2 text-caption leading-6 text-white/55">
                  当前记录：<span className="font-medium text-sky-200">{myCity ? myCityDisplay || myCity : '未填写'}</span>
                </p>
                <button
                  type="button"
                  onClick={() => void handleAutoLocate()}
                  disabled={locating || saving}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-caption font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                  <span>{locating ? '定位中' : '自动识别当前位置'}</span>
                </button>
                <div className="mt-4 rounded-2xl bg-white/8 p-4">
                  <p className="text-caption text-white/45">最近识别结果</p>
                  <p className={`mt-1 text-body font-medium ${draftLocationDisplay ? 'text-white' : 'text-white/45'}`}>
                    {draftLocationDisplay || '尚未识别位置'}
                  </p>
                </div>
                {locationFeedback ? (
                  <p className={`mt-3 text-caption leading-6 ${locationFeedbackType === 'error' ? 'text-red-300' : locationFeedbackType === 'success' ? 'text-sky-200' : 'text-white/55'}`}>
                    {locationFeedback}
                  </p>
                ) : null}
                {locationDiagnostic ? <p className="mt-1 text-caption leading-6 text-white/45">{locationDiagnostic}</p> : null}
                <button
                  onClick={handleSaveCity}
                  disabled={saving || !canSaveLocatedDraft}
                  className="mt-4 inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-white px-5 text-caption font-medium text-slate-950 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : null}
                  {saving ? '保存中' : saved ? '已保存' : '更新到地图'}
                </button>
              </>
            ) : (
              <a href="/login" className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-caption font-medium text-white transition-colors hover:bg-primary/90">
                登录后点亮位置
              </a>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/62 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-body font-semibold text-white">数据状态</h2>
              <button
                type="button"
                onClick={() => {
                  setMapResetToken((value) => value + 1);
                  setViewMode('globe');
                  setMapFocusLocation(null);
                  void fetchData(false);
                }}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-white/8 px-3 text-caption font-medium text-white transition-colors hover:bg-white/12"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                刷新
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white/8 p-3">
                <p className="text-[11px] text-white/45">已填写位置</p>
                <p className="mt-1 text-body font-semibold text-white">{data?.filledCount ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-white/8 p-3">
                <p className="text-[11px] text-white/45">待匹配</p>
                <p className="mt-1 text-body font-semibold text-white">{data?.unmappedCount ?? 0}</p>
              </div>
            </div>
            {data?.unmappedCities?.length ? (
              <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-3 text-caption leading-6 text-amber-100">
                坐标库尚未匹配：{data.unmappedCities.map((item) => item.city).join('、')}
              </div>
            ) : null}
            <p className="mt-3 text-caption text-white/45">更新于 {formatUpdateTime(data?.updatedAt)}</p>
          </div>
        </div>
      </aside>
    </section>
  );
}
