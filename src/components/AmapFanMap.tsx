'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface LocationUser {
  name: string;
  avatar?: string | null;
}

interface LocationItem {
  city: string;
  count: number;
  users?: Array<string | LocationUser>;
  coord: [number, number];
}

type MapStatus = 'loading' | 'ready' | 'error';

interface AMapPixelLike {
  x: number;
  y: number;
}

interface AMapMapOptions {
  zoom: number;
  center: [number, number];
  viewMode?: '2D' | '3D';
  mapStyle?: string;
  lang?: 'zh_cn' | 'en';
  zooms?: [number, number];
  showLabel?: boolean;
  terrain?: boolean;
}

interface AMapMarkerOptions {
  position: [number, number];
  title?: string;
  anchor?: string;
  offset?: AMapPixelLike;
  content?: string;
}

interface AMapInfoWindowOptions {
  anchor?: string;
  offset?: AMapPixelLike;
  closeWhenClickMap?: boolean;
  content?: string;
}

interface AMapOverlayLike {
  setMap(map: AMapMapInstance | null): void;
  on(event: 'click', handler: () => void): void;
}

interface AMapInfoWindowInstance {
  setContent(content: string): void;
  open(map: AMapMapInstance, position: [number, number]): void;
  close(): void;
}

interface AMapControlLike {}

interface AMapMapInstance {
  addControl(control: AMapControlLike): void;
  clearInfoWindow(): void;
  destroy(): void;
  getZoom(): number;
  off(event: 'click', handler: () => void): void;
  on(event: 'click', handler: () => void): void;
  remove(overlays: AMapOverlayLike[]): void;
  setZoomAndCenter(zoom: number, center: [number, number]): void;
}

interface AMapNamespace {
  InfoWindow: new (options: AMapInfoWindowOptions) => AMapInfoWindowInstance;
  Map: new (container: HTMLElement, options: AMapMapOptions) => AMapMapInstance;
  Marker: new (options: AMapMarkerOptions) => AMapOverlayLike;
  Pixel: new (x: number, y: number) => AMapPixelLike;
  Scale: new () => AMapControlLike;
  ToolBar: new () => AMapControlLike;
}

declare global {
  interface Window {
    AMap?: AMapNamespace;
    __amapLoaderPromise?: Promise<AMapNamespace>;
    _AMapSecurityConfig?: {
      securityJsCode?: string;
    };
  }
}

const DEFAULT_CENTER: [number, number] = [104.195397, 35.86166];
const DEFAULT_ZOOM = 4.2;
const MIN_ZOOM = 2;
const MAX_ZOOM = 17;
const PRIMARY_COLOR = '#1890ff';
const SUCCESS_COLOR = '#52c41a';
const WARNING_COLOR = '#faad14';
const DANGER_COLOR = '#ff4d4f';
const REGION_COLORS = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#36cfc9', '#1677ff', '#fa8c16', '#13c2c2'] as const;

interface RegionStyle {
  color: string;
  ring: string;
  label: string;
}

function buildRingColor(color: string): string {
  const colorMap: Record<string, string> = {
    '#1890ff': 'rgba(24,144,255,0.18)',
    '#52c41a': 'rgba(82,196,26,0.18)',
    '#faad14': 'rgba(250,173,20,0.18)',
    '#ff4d4f': 'rgba(255,77,79,0.2)',
    '#36cfc9': 'rgba(54,207,201,0.18)',
    '#1677ff': 'rgba(22,119,255,0.18)',
    '#fa8c16': 'rgba(250,140,22,0.18)',
    '#13c2c2': 'rgba(19,194,194,0.18)',
  };

  return colorMap[color] ?? 'rgba(24,144,255,0.18)';
}

function getChinaRegionLabel(coord: [number, number]): string {
  const [lng, lat] = coord;

  if (lng >= 120 && lat >= 40) {
    return '东北';
  }

  if (lat >= 36 && lng >= 108) {
    return '华北';
  }

  if (lng >= 116 && lat >= 24 && lat < 36) {
    return '华东';
  }

  if (lng >= 110 && lng < 116 && lat >= 28 && lat < 36) {
    return '华中';
  }

  if (lat < 28 && lng >= 108) {
    return '华南';
  }

  if (lat < 32 && lng < 110) {
    return '西南';
  }

  return '西北';
}

function getOverseasRegionLabel(coord: [number, number]): string {
  const [lng, lat] = coord;

  if (lng >= -20 && lng <= 60 && lat >= -35 && lat <= 72) {
    return '欧洲';
  }

  if (lng >= -170 && lng <= -20 && lat >= 7) {
    return '北美';
  }

  if (lng >= -90 && lng <= -30 && lat < 7) {
    return '南美';
  }

  if (lng >= 110 && lng <= 180 && lat < -10) {
    return '大洋洲';
  }

  if (lng >= -20 && lng <= 60 && lat < 35) {
    return '非洲';
  }

  return '亚洲';
}

function getRegionStyle(location: LocationItem): RegionStyle {
  const [lng, lat] = location.coord;
  const isInChina = lng >= 73 && lng <= 135 && lat >= 18 && lat <= 54;
  const label = isInChina ? getChinaRegionLabel(location.coord) : getOverseasRegionLabel(location.coord);

  const regionColorMap: Record<string, string> = {
    华北: REGION_COLORS[0],
    东北: REGION_COLORS[1],
    华东: REGION_COLORS[2],
    华中: REGION_COLORS[3],
    华南: REGION_COLORS[4],
    西南: REGION_COLORS[5],
    西北: REGION_COLORS[6],
    亚洲: REGION_COLORS[0],
    欧洲: REGION_COLORS[1],
    北美: REGION_COLORS[2],
    南美: REGION_COLORS[3],
    大洋洲: REGION_COLORS[4],
    非洲: REGION_COLORS[7],
  };

  const color = regionColorMap[label] ?? PRIMARY_COLOR;

  return {
    color,
    ring: buildRingColor(color),
    label,
  };
}

const AMAP_KEY = process.env.NEXT_PUBLIC_AMAP_KEY ?? '';
const AMAP_SECURITY_CODE = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE ?? '';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getUserName(user: string | LocationUser): string {
  return typeof user === 'string' ? user : user.name;
}

function getUserAvatar(user: string | LocationUser): string | null {
  if (typeof user === 'string') {
    return null;
  }

  return user.avatar?.trim() || null;
}

function getSafeAvatarUrl(avatar: string | null): string {
  if (!avatar) {
    return '';
  }

  return /^(https?:\/\/|\/(?!\/)|data:image\/)/i.test(avatar) ? escapeHtml(avatar) : '';
}

function getUserInitial(name: string): string {
  return escapeHtml(name.trim().slice(0, 1) || '泽');
}

function buildUserPreviewHtml(user: string | LocationUser): string {
  const rawName = getUserName(user);
  const name = escapeHtml(rawName);
  const safeAvatarUrl = getSafeAvatarUrl(getUserAvatar(user));
  const avatarContent = safeAvatarUrl
    ? `<img src="${safeAvatarUrl}" alt="${name}" style="display:block;width:100%;height:100%;object-fit:cover;" />`
    : `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:18px;font-weight:700;color:${PRIMARY_COLOR};background:rgba(24,144,255,0.1);">${getUserInitial(rawName)}</span>`;

  return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0;">
    <span style="display:flex;width:52px;height:52px;overflow:hidden;border-radius:999px;border:1px solid #e5e7eb;background:#f5f5f5;box-shadow:0 1px 3px rgba(15,23,42,0.08);">${avatarContent}</span>
    <span style="display:-webkit-box;overflow:hidden;font-size:11px;line-height:1.4;color:#374151;text-align:center;word-break:break-all;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${name}</span>
  </div>`;
}

function buildOverflowPreviewHtml(extraCount: number): string {
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0;">
    <span style="display:flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:999px;border:1px solid #e5e7eb;background:#f5f5f5;font-size:14px;font-weight:700;color:#6b7280;box-shadow:0 1px 3px rgba(15,23,42,0.08);">+${extraCount}</span>
    <span style="font-size:11px;line-height:1.4;color:#6b7280;text-align:center;">更多昵称</span>
  </div>`;
}

function buildMarkerHtml(count: number, size: number, regionStyle: RegionStyle, isHot: boolean = false): string {
  const coreSize = Math.max(size - 8, 18);
  const shouldShowCount = count >= 6;
  const pulseSize = size + 16;
  const highlightSize = size + 24;
  const touchTargetSize = Math.max(highlightSize, 48);

  // 所有标记都有一个柔和的脉冲环
  const pulseHtml = `<span style="position:absolute;left:50%;top:50%;width:${pulseSize}px;height:${pulseSize}px;transform:translate(-50%,-50%);border-radius:999px;background:${regionStyle.ring};animation:fanMapPulse 2.5s ease-in-out infinite;"></span>`;

  // 热门标记额外增加一个更大的扩散波纹
  const rippleHtml = isHot
    ? `<span style="position:absolute;left:50%;top:50%;width:${highlightSize}px;height:${highlightSize}px;transform:translate(-50%,-50%);border-radius:999px;border:1.5px solid ${regionStyle.color}40;animation:fanMapRipple 3s ease-out infinite;"></span>`
    : '';

  return `<div style="position:relative;width:${touchTargetSize}px;height:${touchTargetSize}px;z-index:10;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;animation:fanMapBounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both;animation-delay:${Math.random() * 0.6}s;">
    ${rippleHtml}
    ${pulseHtml}
    <span style="position:absolute;left:50%;top:50%;width:${coreSize}px;height:${coreSize}px;transform:translate(-50%,-50%);border-radius:999px;background:${regionStyle.color};border:2px solid #ffffff;box-shadow:0 4px 12px rgba(15,23,42,0.16);display:flex;align-items:center;justify-content:center;">
      ${shouldShowCount ? `<span style="font-size:${Math.min(11, coreSize / 2.1)}px;font-weight:700;color:#ffffff;line-height:1;">${count}</span>` : ''}
    </span>
  </div>`;
}

function buildInfoWindowHtml(location: LocationItem): string {
  const users = (location.users ?? []).slice(0, 6);
  const regionStyle = getRegionStyle(location);
  const cityName = escapeHtml(location.city);
  const userLine = users.length > 0
    ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #f0f0f0;">
      <div style="font-size:11px;color:#9ca3af;margin-bottom:10px;font-weight:500;">已记录昵称 (${location.users?.length ?? 0})</div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 10px;">
        ${users.map((user) => buildUserPreviewHtml(user)).join('')}
        ${(location.users?.length ?? 0) > 6 ? buildOverflowPreviewHtml((location.users?.length ?? 0) - 6) : ''}
      </div>
    </div>`
    : '';

  return `<div style="min-width:220px;max-width:300px;padding:16px;background:#ffffff;border-radius:16px;box-shadow:0 14px 32px rgba(15,23,42,0.12);border:1px solid #e5e7eb;">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
      <div>
        <div style="font-size:16px;font-weight:700;color:#111827;line-height:1.35;">${cityName}</div>
        <div style="margin-top:4px;font-size:12px;color:#6b7280;">当前已记录的位置详情</div>
      </div>
      <span style="padding:4px 10px;background:${regionStyle.ring};border-radius:999px;font-size:11px;font-weight:600;color:${regionStyle.color};">${regionStyle.label}</span>
    </div>
    <div style="margin-top:12px;display:flex;align-items:center;gap:10px;">
      <span style="width:10px;height:10px;border-radius:50%;background:${regionStyle.color};"></span>
      <span style="font-size:15px;font-weight:700;color:#111827;">${location.count} 位泽小将</span>
    </div>
    <div style="margin-top:8px;font-size:12px;color:#6b7280;line-height:1.6;">
      点击地图其他点位，可继续查看不同城市的分布详情。
    </div>
    ${userLine}
  </div>`;
}

function getMarkerSize(count: number, maxCount: number): number {
  const ratio = maxCount > 0 ? count / maxCount : 0;
  return Math.round(24 + ratio * 18);
}

function loadAmapSdk(): Promise<AMapNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('amap-browser-only'));
  }

  if (window.AMap) {
    return Promise.resolve(window.AMap);
  }

  if (window.__amapLoaderPromise) {
    return window.__amapLoaderPromise;
  }

  if (!AMAP_KEY) {
    return Promise.reject(new Error('amap-key-missing'));
  }

  if (AMAP_SECURITY_CODE) {
    window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE };
  }

  window.__amapLoaderPromise = new Promise<AMapNamespace>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-amap-sdk="true"]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.AMap) {
          resolve(window.AMap);
          return;
        }
        reject(new Error('amap-sdk-unavailable'));
      }, { once: true });
      existing.addEventListener('error', () => reject(new Error('amap-sdk-load-failed')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(AMAP_KEY)}&plugin=AMap.ToolBar,AMap.Scale`;
    script.async = true;
    script.defer = true;
    script.dataset.amapSdk = 'true';
    script.onload = () => {
      if (window.AMap) {
        resolve(window.AMap);
        return;
      }
      reject(new Error('amap-sdk-unavailable'));
    };
    script.onerror = () => reject(new Error('amap-sdk-load-failed'));
    document.head.appendChild(script);
  });

  return window.__amapLoaderPromise;
}

export default function AmapFanMap({ locations, resetToken }: { locations: LocationItem[]; resetToken?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMapMapInstance | null>(null);
  const infoWindowRef = useRef<AMapInfoWindowInstance | null>(null);
  const markersRef = useRef<AMapOverlayLike[]>([]);
  const mapClickHandlerRef = useRef<(() => void) | null>(null);
  const [mapStatus, setMapStatus] = useState<MapStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const maxCount = useMemo(() => Math.max(...locations.map((item) => item.count), 1), [locations]);
  const sortedLocations = useMemo(() => [...locations].sort((a, b) => b.count - a.count), [locations]);

  useEffect(() => {
    let disposed = false;

    const init = async (): Promise<void> => {
      if (!containerRef.current) {
        return;
      }

      try {
        const AMap = await loadAmapSdk();
        if (disposed || !containerRef.current) {
          return;
        }

        const darkActive = document.documentElement.classList.contains('dark');
        const map = new AMap.Map(containerRef.current, {
          zoom: DEFAULT_ZOOM,
          center: DEFAULT_CENTER,
          viewMode: '2D',
          mapStyle: darkActive ? 'amap://styles/dark' : 'amap://styles/normal',
          lang: 'zh_cn',
          zooms: [MIN_ZOOM, MAX_ZOOM],
          showLabel: true,
        });

        map.addControl(new AMap.Scale());
        map.addControl(new AMap.ToolBar());

        const infoWindow = new AMap.InfoWindow({
          anchor: 'bottom-center',
          offset: new AMap.Pixel(0, -18),
          closeWhenClickMap: true,
        });

        const handleMapClick = (): void => {
          infoWindow.close();
        };

        map.on('click', handleMapClick);

        mapRef.current = map;
        infoWindowRef.current = infoWindow;
        mapClickHandlerRef.current = handleMapClick;
        setMapStatus('ready');
      } catch (error) {
        if (disposed) {
          return;
        }

        const nextMessage = error instanceof Error && error.message === 'amap-key-missing'
          ? '缺少高德地图 Key，请在环境变量中配置 NEXT_PUBLIC_AMAP_KEY。'
          : '高德地图底图加载失败，请检查 Key、域名白名单或网络连接。';

        setErrorMessage(nextMessage);
        setMapStatus('error');
      }
    };

    void init();

    return () => {
      disposed = true;

      if (mapRef.current && markersRef.current.length > 0) {
        mapRef.current.remove(markersRef.current);
      }

      if (mapRef.current && mapClickHandlerRef.current) {
        mapRef.current.off('click', mapClickHandlerRef.current);
      }

      infoWindowRef.current?.close();
      mapRef.current?.destroy();
      mapRef.current = null;
      infoWindowRef.current = null;
      markersRef.current = [];
      mapClickHandlerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapStatus !== 'ready' || !mapRef.current || !infoWindowRef.current || typeof window === 'undefined' || !window.AMap) {
      return;
    }

    const AMap = window.AMap;
    const map = mapRef.current;
    const infoWindow = infoWindowRef.current;

    if (markersRef.current.length > 0) {
      map.remove(markersRef.current);
      markersRef.current = [];
    }

    const nextMarkers = sortedLocations.map((location) => {
      const size = getMarkerSize(location.count, maxCount);
      const regionStyle = getRegionStyle(location);
      const isHot = location.count >= 20; // 热门点位添加脉冲动画
      const marker = new AMap.Marker({
        position: location.coord,
        title: location.city,
        anchor: 'bottom-center',
        offset: new AMap.Pixel(0, -6),
        content: buildMarkerHtml(location.count, size, regionStyle, isHot),
      });

      marker.on('click', () => {
        const nextZoom = Math.max(map.getZoom(), 5);
        map.setZoomAndCenter(nextZoom, location.coord);
        infoWindow.setContent(buildInfoWindowHtml(location));
        infoWindow.open(map, location.coord);
      });

      marker.setMap(map);
      return marker;
    });

    markersRef.current = nextMarkers;
  }, [locations, mapStatus, maxCount, sortedLocations]);

  useEffect(() => {
    if (mapStatus !== 'ready' || !mapRef.current) {
      return;
    }

    mapRef.current.setZoomAndCenter(DEFAULT_ZOOM, DEFAULT_CENTER);
    infoWindowRef.current?.close();
  }, [mapStatus, resetToken]);

  return (
    <div className={`relative overflow-hidden rounded-card border border-divider ${isDark ? 'bg-[#1e1e22]' : 'bg-white'}`}>
      <style>{`
        @keyframes fanMapPulse {
          0%, 100% { transform: translate(-50%,-50%) scale(1); opacity: 0.6; }
          50% { transform: translate(-50%,-50%) scale(1.35); opacity: 0.15; }
        }
        @keyframes fanMapRipple {
          0% { transform: translate(-50%,-50%) scale(0.8); opacity: 0.6; }
          100% { transform: translate(-50%,-50%) scale(1.8); opacity: 0; }
        }
        @keyframes fanMapBounceIn {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div ref={containerRef} className="h-[560px] w-full" />

      {mapStatus === 'loading' ? (
        <div className={`absolute inset-0 flex items-center justify-center text-body text-text-muted ${isDark ? 'bg-[#1e1e22]' : 'bg-[#fafafa]'}`}>
          正在初始化高德地图底图...
        </div>
      ) : null}

      {mapStatus === 'error' ? (
        <div className={`absolute inset-0 flex flex-col items-center justify-center px-6 text-center ${isDark ? 'bg-[#1e1e22]' : 'bg-[#fafafa]'}`}>
          <p className="text-body font-medium text-text-title">高德地图初始化失败</p>
          <p className="mt-2 max-w-md text-caption text-text-muted">{errorMessage}</p>
          <p className="mt-3 max-w-md text-caption text-text-muted">如需达到你截图里的网页地图效果，需要可用的高德 JSAPI Key，并将当前域名加入白名单。</p>
        </div>
      ) : null}
    </div>
  );
}
