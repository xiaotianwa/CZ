'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { LocationItem } from '@/components/ThreeFanGlobe';
import MapLoadingOverlay from '@/components/MapLoadingOverlay';

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
  off(event: 'click' | 'zoomchange', handler: () => void): void;
  on(event: 'click' | 'zoomchange', handler: () => void): void;
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

type AMapWindow = Window & Record<string, unknown>;

const AMAP_KEY = process.env.NEXT_PUBLIC_AMAP_KEY ?? '';
const AMAP_SECURITY_CODE = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE ?? '';
const DEFAULT_CENTER: [number, number] = [104.195397, 35.86166];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loadAmapSdk(): Promise<AMapNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('amap-browser-only'));
  }

  const amapWindow = window as unknown as AMapWindow;

  const existingAmap = amapWindow.AMap as AMapNamespace | undefined;
  if (existingAmap) {
    return Promise.resolve(existingAmap);
  }

  const existingPromise = amapWindow.__amapDetailLoaderPromise as Promise<AMapNamespace> | undefined;
  if (existingPromise) {
    return existingPromise;
  }

  if (!AMAP_KEY) {
    return Promise.reject(new Error('amap-key-missing'));
  }

  if (AMAP_SECURITY_CODE) {
    amapWindow._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE };
  }

  amapWindow.__amapDetailLoaderPromise = new Promise<AMapNamespace>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(AMAP_KEY)}&plugin=AMap.ToolBar,AMap.Scale`;
    script.async = true;
    script.defer = true;
    script.dataset.amapSdk = 'true';
    script.onload = () => {
      const loadedAmap = amapWindow.AMap as AMapNamespace | undefined;
      if (loadedAmap) {
        resolve(loadedAmap);
        return;
      }
      reject(new Error('amap-sdk-unavailable'));
    };
    script.onerror = () => reject(new Error('amap-sdk-load-failed'));
    document.head.appendChild(script);
  });

  return amapWindow.__amapDetailLoaderPromise as Promise<AMapNamespace>;
}

function buildMarkerHtml(location: LocationItem, active: boolean): string {
  const size = active ? 44 : 34;
  return `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${active ? '#1890ff' : '#f59e0b'};border:3px solid white;box-shadow:0 10px 24px rgba(15,23,42,0.24);display:flex;align-items:center;justify-content:center;color:white;font:700 13px sans-serif;">${location.count}</div>`;
}

function buildInfoHtml(location: LocationItem): string {
  const users = (location.users ?? [])
    .slice(0, 8)
    .map((user) => `<span style="display:inline-flex;max-width:96px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-radius:999px;background:#f1f5f9;padding:4px 8px;color:#334155;font-size:12px;">${escapeHtml(typeof user === 'string' ? user : user.name)}</span>`)
    .join('');

  return `<div style="min-width:260px;max-width:340px;padding:16px;border-radius:16px;background:white;box-shadow:0 16px 40px rgba(15,23,42,0.18);">
    <div style="font-size:17px;font-weight:800;color:#0f172a;">${escapeHtml(location.city)}</div>
    <div style="margin-top:6px;font-size:13px;color:#64748b;line-height:1.6;">城市级大概位置：${location.coord[1].toFixed(4)}°N / ${location.coord[0].toFixed(4)}°E</div>
    <div style="margin-top:10px;font-size:14px;font-weight:700;color:#0f172a;">${location.count} 位泽小将已点亮这里</div>
    ${users ? `<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px;">${users}</div>` : ''}
  </div>`;
}

export default function AmapDetailMap({
  locations,
  focusLocation,
  onBackToGlobe,
}: {
  locations: LocationItem[];
  focusLocation?: LocationItem | null;
  onBackToGlobe: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMapMapInstance | null>(null);
  const infoWindowRef = useRef<AMapInfoWindowInstance | null>(null);
  const markersRef = useRef<AMapOverlayLike[]>([]);
  const zoomHandlerRef = useRef<(() => void) | null>(null);
  const backToGlobeRef = useRef(onBackToGlobe);
  const [status, setStatus] = useState<MapStatus>('loading');
  const [message, setMessage] = useState('');

  const sortedLocations = useMemo(() => [...locations].sort((a, b) => b.count - a.count), [locations]);
  const resolvedFocus = focusLocation ?? sortedLocations[0] ?? null;

  useEffect(() => {
    backToGlobeRef.current = onBackToGlobe;
  }, [onBackToGlobe]);

  useEffect(() => {
    let disposed = false;

    const init = async (): Promise<void> => {
      if (!containerRef.current) return;

      try {
        const AMap = await loadAmapSdk();
        if (disposed || !containerRef.current) return;

        const map = new AMap.Map(containerRef.current, {
          zoom: resolvedFocus ? 11 : 4,
          center: resolvedFocus?.coord ?? DEFAULT_CENTER,
          viewMode: '2D',
          mapStyle: 'amap://styles/darkblue',
          lang: 'zh_cn',
          zooms: [3, 18],
          showLabel: true,
        });

        map.addControl(new AMap.Scale());
        map.addControl(new AMap.ToolBar());

        const handleZoomChange = (): void => {
          if (map.getZoom() <= 5.2) {
            backToGlobeRef.current();
          }
        };
        map.on('zoomchange', handleZoomChange);
        zoomHandlerRef.current = handleZoomChange;

        mapRef.current = map;
        infoWindowRef.current = new AMap.InfoWindow({
          anchor: 'bottom-center',
          offset: new AMap.Pixel(0, -24),
          closeWhenClickMap: true,
        });
        setStatus('ready');
      } catch (error) {
        if (disposed) return;
        setStatus('error');
        setMessage(error instanceof Error && error.message === 'amap-key-missing'
          ? '缺少 NEXT_PUBLIC_AMAP_KEY，无法加载高德地图。'
          : '高德地图加载失败，请检查 JSAPI Key、域名白名单或网络。');
      }
    };

    void init();

    return () => {
      disposed = true;
      if (mapRef.current && markersRef.current.length > 0) {
        mapRef.current.remove(markersRef.current);
      }
      if (mapRef.current && zoomHandlerRef.current) {
        mapRef.current.off('zoomchange', zoomHandlerRef.current);
      }
      infoWindowRef.current?.close();
      mapRef.current?.destroy();
      mapRef.current = null;
      infoWindowRef.current = null;
      markersRef.current = [];
      zoomHandlerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const amapWindow = window as unknown as AMapWindow;
    const AMap = amapWindow.AMap as AMapNamespace | undefined;
    if (status !== 'ready' || !mapRef.current || !infoWindowRef.current || !AMap) return;

    const map = mapRef.current;
    const infoWindow = infoWindowRef.current;
    if (markersRef.current.length > 0) {
      map.remove(markersRef.current);
      markersRef.current = [];
    }

    const markers = sortedLocations.map((location) => {
      const active = resolvedFocus?.city === location.city;
      const marker = new AMap.Marker({
        position: location.coord,
        title: location.city,
        anchor: 'bottom-center',
        offset: new AMap.Pixel(0, -6),
        content: buildMarkerHtml(location, active),
      });

      marker.on('click', () => {
        map.setZoomAndCenter(Math.max(map.getZoom(), 12), location.coord);
        infoWindow.setContent(buildInfoHtml(location));
        infoWindow.open(map, location.coord);
      });
      marker.setMap(map);
      return marker;
    });

    markersRef.current = markers;

    if (resolvedFocus) {
      map.setZoomAndCenter(12, resolvedFocus.coord);
      infoWindow.setContent(buildInfoHtml(resolvedFocus));
      infoWindow.open(map, resolvedFocus.coord);
    }
  }, [resolvedFocus, sortedLocations, status]);

  return (
    <div className="relative h-full min-h-[640px] overflow-hidden bg-[#020817] text-white">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="absolute left-4 top-24 z-20 rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl backdrop-blur-xl lg:left-8">
        <p className="text-caption font-semibold text-white">城市地图模式</p>
        <p className="mt-1 max-w-xs text-[12px] leading-5 text-white/55">已切换到高德地图，可继续滚轮缩放查看道路、商圈和城市级大概位置。</p>
        <button
          type="button"
          onClick={onBackToGlobe}
          className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-full bg-white px-4 text-caption font-semibold text-slate-950 transition-colors hover:bg-slate-100"
        >
          <RotateCcw className="h-4 w-4" />
          返回地球
        </button>
      </div>

      {status === 'loading' ? (
        <MapLoadingOverlay label="正在加载高德地图" />
      ) : null}

      {status === 'error' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 px-6 text-center">
          <p className="text-body font-semibold text-white">高德地图加载失败</p>
          <p className="mt-2 max-w-md text-caption leading-6 text-white/55">{message}</p>
          <button
            type="button"
            onClick={onBackToGlobe}
            className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-caption font-medium text-white"
          >
            返回地球
          </button>
        </div>
      ) : null}
    </div>
  );
}
