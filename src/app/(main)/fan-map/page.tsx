'use client';

import { useState, useEffect, useMemo } from 'react';
import { MapPin, Users, Globe, Loader2, Check, RefreshCw, AlertCircle, Compass, LocateFixed } from 'lucide-react';
import dynamic from 'next/dynamic';
import { getCityDisplayName } from '@/data/city-coords';

const AmapFanMap = dynamic(() => import('@/components/AmapFanMap'), {
  ssr: false,
  loading: () => <div className="h-[560px] rounded-card bg-gray-100 animate-pulse" />,
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

interface FanMapData {
  cities: CityItem[];
  totalFans: number;
  filledCount: number;
  mappedCount: number;
  mappedCityCount: number;
  unmappedCount: number;
  unmappedCities: Array<{ city: string; count: number }>;
  coverageRate: number;
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

  if (!nextCity) {
    return '';
  }

  return nextDistrict ? `${nextCity}/${nextDistrict}` : nextCity;
}

function parseLocationValue(value: string): { city: string; district: string } {
  const rawValue = value.trim();

  if (!rawValue) {
    return { city: '', district: '' };
  }

  const normalizedValue = rawValue.replace(/[，]/g, ',').replace(/[｜|]/g, '/');
  const parts = normalizedValue.split(/[,/]/).map((part) => part.trim()).filter(Boolean);
  const resolvedCity = getCityDisplayName(rawValue);
  const cityIndex = parts.findIndex((part) => getCityDisplayName(part) === resolvedCity || part === resolvedCity);
  const districtParts = cityIndex >= 0 ? parts.slice(cityIndex + 1) : parts.slice(1);
  const district = districtParts.join('/');
  const city = resolvedCity || parts[0] || rawValue;

  return {
    city,
    district,
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
    return {
      ...fallbackContext,
      permissionState: status.state,
    };
  } catch {
    return {
      ...fallbackContext,
      permissionState: 'unknown',
    };
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
  if (state === 'granted') {
    return '已允许';
  }

  if (state === 'prompt') {
    return '待确认';
  }

  if (state === 'denied') {
    return '已拒绝';
  }

  if (state === 'unknown') {
    return '未知';
  }

  return '不支持检测';
}

function buildLocateDiagnostic(error: unknown, context: LocateRuntimeContext): string {
  const parts = [
    `权限状态：${formatPermissionState(context.permissionState)}`,
    `安全上下文：${context.isSecureContext ? '是' : '否'}`,
    `协议：${context.protocol || '未知'}`,
  ];
  const errorCode = getLocateErrorCode(error);

  if (errorCode !== null) {
    parts.push(`错误码：${errorCode}`);
  }

  if (error instanceof Error && error.message) {
    parts.push(`原因：${error.message}`);
  }

  return parts.join(' · ');
}

function getLocateErrorMessage(error: unknown, context: LocateRuntimeContext): string {
  const code = getLocateErrorCode(error);

  if (code === 1) {
    if (!context.isSecureContext && !isLocalhostHost(context.hostname)) {
      return '当前页面不是安全上下文，浏览器不会放行定位。请使用 localhost 或 HTTPS 访问后再重试。';
    }

    if (context.permissionState === 'denied') {
      return '当前站点的定位权限仍被浏览器标记为已拒绝，请修改站点设置后刷新页面再试。';
    }

    if (context.permissionState === 'granted') {
      return '浏览器站点权限已允许，但定位接口仍返回拒绝。这通常是系统定位服务、企业安全策略，或当前页面运行环境拦截导致。';
    }

    return '浏览器返回了定位拒绝。若你已开启权限，请优先确认当前页面是否通过 HTTPS 或 localhost 访问。';
  }

  if (code === 2) {
    return '当前设备暂时无法获取定位信息，请检查系统定位服务是否真的可用，或稍后重试。';
  }

  if (code === 3) {
    return '定位请求超时，请检查网络、代理环境或系统定位服务后再试。';
  }

  if (error instanceof Error) {
    if (error.message === 'location-city-empty') {
      return '暂时无法解析当前位置对应的城市，请稍后重试。';
    }

    if (error.message === 'geolocation-unsupported') {
      return '当前浏览器不支持定位，请更换浏览器后重试。';
    }

    if (error.message === 'geolocation-insecure-context') {
      return '当前页面不是安全上下文，浏览器不会提供定位。请改用 localhost 或 HTTPS 地址访问。';
    }

    if (error.message === 'geolocation-permission-denied') {
      return '浏览器权限状态仍显示为已拒绝，请修改站点定位权限后刷新页面再试。';
    }

    if (error.message) {
      return error.message;
    }
  }

  return '自动定位失败，请稍后再试。';
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

  // 获取地图数据
  const fetchData = async (showLoading: boolean = true) => {
    if (showLoading) {
      setLoading(true);
    }

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
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void fetchData();
    // 获取当前用户信息
    void fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0 && json.data) {
          setIsLoggedIn(true);
          const currentCity = typeof json.data.city === 'string' ? json.data.city : '';
          setMyCity(currentCity);
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
        // 刷新地图数据
        await fetchData(false);
      }
    } catch { /* ignore */ }
    setSaving(false);
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
      setLocationFeedback(`已识别为 ${nextLocation}，确认无误后可直接更新。`);
      setLocationFeedbackType('success');
    } catch (error) {
      runtimeContext = await getLocateRuntimeContext();
      setLocationDiagnostic(buildLocateDiagnostic(error, runtimeContext));
      setLocationFeedback(getLocateErrorMessage(error, runtimeContext));
      setLocationFeedbackType('error');
    } finally {
      setLocating(false);
    }
  };

  const mapLocations = useMemo(
    () => (data?.cities || []).filter((c) => c.coord !== null) as (CityItem & { coord: [number, number] })[],
    [data]
  );
  const unmappedPreview = useMemo(() => data?.unmappedCities.slice(0, 6) || [], [data]);
  const draftLocationDisplay = useMemo(() => {
    if (!locationDraft) {
      return '';
    }

    const parsed = parseLocationValue(locationDraft);
    const displayCity = getCityDisplayName(parsed.city) || parsed.city;
    return parsed.district ? `${displayCity}/${parsed.district}` : displayCity;
  }, [locationDraft]);
  const myCityDisplay = useMemo(() => {
    if (!myCity) {
      return '';
    }

    const parsed = parseLocationValue(myCity);
    const displayCity = getCityDisplayName(parsed.city) || parsed.city;
    return parsed.district ? `${displayCity}/${parsed.district}` : displayCity;
  }, [myCity]);
  const canSaveLocatedDraft = useMemo(() => Boolean(locationDraft.trim()) && locationDraft.trim() !== myCity, [locationDraft, myCity]);

  return (
    <>
      {/* Cover Banner */}
      <section className="relative h-48 sm:h-56 bg-gray-900 overflow-hidden mt-14">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute inset-0 flex items-center justify-center gap-4 sm:gap-6 select-none pointer-events-none">
          <span className="font-waterbrush text-[56px] sm:text-[80px] leading-none text-white/10">1103</span>
          <span className="font-waterbrush text-[28px] sm:text-[40px] leading-none text-primary/50 tracking-[0.15em]">ChenZe</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-bg-page to-transparent" />
        <div className="container-main px-4 sm:px-6 lg:px-8 relative z-10 h-full flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-full px-4 py-1.5 mb-3">
            <Globe className="h-4 w-4 text-primary" />
            <span className="text-caption font-medium text-primary">全球粉丝地图</span>
          </div>
          <h1 className="text-heading-lg text-white">看看泽小将都落在了世界的哪些角落</h1>
          <p className="text-body text-gray-400 mt-1.5 max-w-md mx-auto">
            用一张更清爽的地图查看当前已点亮的城市分布。
          </p>
        </div>
      </section>

      {/* 地图区域 */}
      <section className="section-block relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(24,144,255,0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(250,173,20,0.05) 0%, transparent 60%)',
        }} />
        <div className="container-main relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-card bg-white/40 backdrop-blur-md border border-white/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_4px_24px_rgba(0,0,0,0.06)] p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <h2 className="section-title mb-0">全球分布地图</h2>
                <p className="mt-2 text-caption leading-6 text-text-muted">支持拖拽、缩放与点击点位查看位置详情。点位越大，代表当前位置记录的粉丝越多。</p>
              </div>
              <button
                type="button"
                onClick={() => setMapResetToken((value) => value + 1)}
                className="inline-flex h-9 items-center justify-center rounded-full border border-divider bg-white dark:bg-[#1e1e22] dark:border-[#37373c] px-4 text-caption text-text-body transition-colors hover:bg-[#fafafa] dark:hover:bg-[#2a2a2e]"
              >
                重置视角
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-divider bg-[#fafafa] dark:bg-[#232326]/80 dark:border-[#37373c] px-4 py-3 text-caption text-text-muted">
              <span className="font-medium text-text-title">地图说明</span>
              <span>拖拽查看区域</span>
              <span>点击城市看详情</span>
              <span>已上图 {loading ? '--' : mapLocations.length} 个位置</span>
            </div>

            {loading ? (
              <div className="h-[560px] rounded-card bg-gray-100 animate-pulse" />
            ) : error ? (
              <div className="flex h-[560px] flex-col items-center justify-center rounded-card border border-dashed border-divider bg-[#fafafa] dark:bg-[#1e1e22] dark:border-[#37373c] px-6 text-center">
                <AlertCircle className="h-10 w-10 text-[#ff4d4f]" />
                <p className="mt-4 text-body font-medium text-text-title">粉丝地图加载失败</p>
                <p className="mt-2 max-w-md text-caption text-text-muted">{error}</p>
                <button
                  onClick={() => void fetchData()}
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-caption font-medium text-white transition-colors hover:bg-primary/90"
                >
                  <RefreshCw className="h-4 w-4" />
                  重新加载
                </button>
              </div>
            ) : mapLocations.length > 0 ? (
              <AmapFanMap locations={mapLocations} resetToken={mapResetToken} />
            ) : (
              <div className="flex h-[560px] flex-col items-center justify-center rounded-card border border-dashed border-divider bg-[#fafafa] dark:bg-[#1e1e22] dark:border-[#37373c] px-6 text-center">
                <MapPin className="h-10 w-10 text-text-disabled" />
                <p className="mt-4 text-body font-medium text-text-title">还没有可显示的位置</p>
                <p className="mt-2 max-w-md text-caption text-text-muted">
                  {isLoggedIn ? '先在右侧填写你的城市，成为第一个出现在地图上的泽小将。' : '登录后填写你的位置，就能出现在全球地图上。'}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-card bg-white/40 backdrop-blur-md border border-white/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_4px_24px_rgba(0,0,0,0.06)] p-5">
              <h3 className="text-body font-semibold text-text-title">标记我的位置</h3>
              <p className="mt-1 text-caption leading-6 text-text-muted">当前仅支持自动定位识别当前位置。识别成功后，你可以直接更新到粉丝地图。</p>

              {isLoggedIn ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleAutoLocate()}
                    disabled={locating || saving}
                    className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-caption font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                    <span>{locating ? '定位中' : '自动定位当前位置'}</span>
                  </button>

                  <div className="mt-4 rounded-xl bg-[#fafafa] dark:bg-[#232326]/80 p-4">
                    <p className="text-caption text-text-muted">最近识别结果</p>
                    <p className={`mt-1 text-body font-medium ${draftLocationDisplay ? 'text-text-title' : 'text-text-muted'}`}>
                      {draftLocationDisplay || '尚未成功识别位置，请点击上方按钮开始定位。'}
                    </p>
                    <p className="mt-2 text-caption leading-6 text-text-muted">
                      {draftLocationDisplay ? '识别成功后会按 城市/区县 的格式保存。' : '如果浏览器仍然拒绝定位，当前页面将无法继续自动识别。'}
                    </p>
                  </div>

                  {locationFeedback ? (
                    <p className={`mt-3 text-caption leading-6 ${locationFeedbackType === 'error' ? 'text-danger' : locationFeedbackType === 'success' ? 'text-primary' : 'text-text-muted'}`}>
                      {locationFeedback}
                    </p>
                  ) : null}
                  {locationDiagnostic ? (
                    <p className="mt-1 text-caption leading-6 text-text-muted">
                      {locationDiagnostic}
                    </p>
                  ) : null}

                  <button
                    onClick={handleSaveCity}
                    disabled={saving || !canSaveLocatedDraft}
                    className="mt-4 inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-caption font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : null}
                    {saving ? '保存中' : saved ? '已保存' : '更新'}
                  </button>
                  <p className="mt-3 text-caption text-text-muted">
                    当前填写：<span className="text-primary">{myCity ? myCityDisplay || myCity : '未填写'}</span>
                  </p>
                </>
              ) : (
                <a href="/login" className="btn-primary mt-4 inline-flex h-10 items-center justify-center px-5">
                  登录后标记位置
                </a>
              )}
            </div>

            <div className="rounded-card bg-white/40 backdrop-blur-md border border-white/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_4px_24px_rgba(0,0,0,0.06)] p-5">
              <h3 className="text-body font-semibold text-text-title">地图概览</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#fafafa] dark:bg-[#232326]/80 px-4 py-3">
                  <p className="text-caption text-text-muted">覆盖率</p>
                  <p className="mt-1 text-body font-semibold text-text-title">{loading ? '--' : `${data?.coverageRate ?? 0}%`}</p>
                </div>
                <div className="rounded-xl bg-[#fafafa] dark:bg-[#232326]/80 px-4 py-3">
                  <p className="text-caption text-text-muted">已上图城市</p>
                  <p className="mt-1 text-body font-semibold text-text-title">{loading ? '--' : data?.mappedCityCount ?? 0}</p>
                </div>
                <div className="rounded-xl bg-[#fafafa] dark:bg-[#232326]/80 px-4 py-3">
                  <p className="text-caption text-text-muted">已上图人数</p>
                  <p className="mt-1 text-body font-semibold text-text-title">{loading ? '--' : data?.mappedCount ?? 0}</p>
                </div>
                <div className="rounded-xl bg-[#fafafa] dark:bg-[#232326]/80 px-4 py-3">
                  <p className="text-caption text-text-muted">待补充解析</p>
                  <p className="mt-1 text-body font-semibold text-text-title">{loading ? '--' : data?.unmappedCount ?? 0}</p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${data?.coverageRate ?? 0}%` }}
                />
              </div>
              <p className="mt-3 text-caption leading-6 text-text-muted">
                {data?.mappedCount ? `当前已有 ${data.mappedCount} 位粉丝显示在地图中。` : '当前还没有已显示在地图中的粉丝位置。'}
              </p>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
