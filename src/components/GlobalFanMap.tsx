'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts/core';
import { EffectScatterChart, MapChart, ScatterChart } from 'echarts/charts';
import { GeoComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([MapChart, ScatterChart, EffectScatterChart, GeoComponent, TooltipComponent, CanvasRenderer]);

interface LocationItem {
  city: string;
  count: number;
  users?: string[];
  coord: [number, number];
}

interface ScatterPoint {
  name: string;
  value: [number, number, number];
  itemStyle: {
    color: string;
    shadowBlur?: number;
    shadowColor?: string;
  };
}

interface GeoJsonLike {
  features?: unknown[];
  geometries?: unknown[];
}

interface ApiEnvelope<T> {
  code: number;
  data: T;
  message?: string;
}

type ViewLevel = 'global' | 'country' | 'city';

const WORLD_MAP_NAME = 'fan-map-world';
const WORLD_MAP_SOURCES = [
  '/api/public/world-map',
  'https://fastly.jsdelivr.net/npm/echarts@5/map/json/world.json',
  'https://cdn.jsdelivr.net/npm/echarts@5/map/json/world.json',
  'https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries.geo.json',
];
const WIDTH = 960;
const HEIGHT = 480;
const PADDING = 20;
const DEFAULT_ZOOM = 1;
const DEFAULT_CENTER: [number, number] = [0, 20];
const COUNTRY_LABEL_ZOOM = 1.35;
const CITY_LABEL_ZOOM = 2.2;
const CITY_FOCUS_ZOOM = 4;
const HOTSPOT_LIMIT = 8;
const MAX_CITY_LABELS = 48;
const VIEWPORT_LABEL_PADDING = 24;
const COLORS = [
  '#1890ff', '#52c41a', '#faad14', '#ff4d4f',
  '#36cfc9', '#1677ff', '#fa8c16', '#13c2c2',
];
const COUNTRY_NAME_MAP: Record<string, string> = {
  Afghanistan: '阿富汗',
  Albania: '阿尔巴尼亚',
  Algeria: '阿尔及利亚',
  Angola: '安哥拉',
  Argentina: '阿根廷',
  Armenia: '亚美尼亚',
  Australia: '澳大利亚',
  Austria: '奥地利',
  Azerbaijan: '阿塞拜疆',
  'The Bahamas': '巴哈马',
  Bahrain: '巴林',
  Bangladesh: '孟加拉国',
  Belarus: '白俄罗斯',
  Belgium: '比利时',
  Belize: '伯利兹',
  Benin: '贝宁',
  Bhutan: '不丹',
  Bolivia: '玻利维亚',
  'Bosnia and Herz.': '波黑',
  'Bosnia and Herzegovina': '波黑',
  Botswana: '博茨瓦纳',
  Brazil: '巴西',
  Brunei: '文莱',
  Bulgaria: '保加利亚',
  'Burkina Faso': '布基纳法索',
  Burundi: '布隆迪',
  Cambodia: '柬埔寨',
  Cameroon: '喀麦隆',
  Canada: '加拿大',
  'Central African Rep.': '中非共和国',
  'Central African Republic': '中非共和国',
  Chad: '乍得',
  Chile: '智利',
  China: '中国',
  Colombia: '哥伦比亚',
  Congo: '刚果（布）',
  'Costa Rica': '哥斯达黎加',
  Croatia: '克罗地亚',
  Cuba: '古巴',
  Cyprus: '塞浦路斯',
  Czechia: '捷克',
  'Czech Rep.': '捷克',
  'Czech Republic': '捷克',
  'Dem. Rep. Congo': '刚果（金）',
  'Democratic Republic of the Congo': '刚果（金）',
  Denmark: '丹麦',
  Djibouti: '吉布提',
  'Dominican Rep.': '多米尼加',
  'Dominican Republic': '多米尼加',
  Ecuador: '厄瓜多尔',
  Egypt: '埃及',
  'El Salvador': '萨尔瓦多',
  Eritrea: '厄立特里亚',
  Estonia: '爱沙尼亚',
  Ethiopia: '埃塞俄比亚',
  Fiji: '斐济',
  Finland: '芬兰',
  France: '法国',
  Gabon: '加蓬',
  Gambia: '冈比亚',
  Georgia: '格鲁吉亚',
  Germany: '德国',
  Ghana: '加纳',
  Greece: '希腊',
  Greenland: '格陵兰',
  Guatemala: '危地马拉',
  Guinea: '几内亚',
  'Guinea-Bissau': '几内亚比绍',
  Guyana: '圭亚那',
  Haiti: '海地',
  Honduras: '洪都拉斯',
  Hungary: '匈牙利',
  Iceland: '冰岛',
  India: '印度',
  Indonesia: '印度尼西亚',
  Iran: '伊朗',
  Iraq: '伊拉克',
  Ireland: '爱尔兰',
  Israel: '以色列',
  Italy: '意大利',
  Jamaica: '牙买加',
  Japan: '日本',
  Jordan: '约旦',
  Kazakhstan: '哈萨克斯坦',
  Kenya: '肯尼亚',
  Kosovo: '科索沃',
  Kuwait: '科威特',
  Kyrgyzstan: '吉尔吉斯斯坦',
  Laos: '老挝',
  Latvia: '拉脱维亚',
  Lebanon: '黎巴嫩',
  Lesotho: '莱索托',
  Liberia: '利比里亚',
  Libya: '利比亚',
  Lithuania: '立陶宛',
  Luxembourg: '卢森堡',
  Madagascar: '马达加斯加',
  Malawi: '马拉维',
  Malaysia: '马来西亚',
  Mali: '马里',
  Mauritania: '毛里塔尼亚',
  Mexico: '墨西哥',
  Moldova: '摩尔多瓦',
  Mongolia: '蒙古',
  Montenegro: '黑山',
  Morocco: '摩洛哥',
  Mozambique: '莫桑比克',
  Myanmar: '缅甸',
  Namibia: '纳米比亚',
  Nepal: '尼泊尔',
  Netherlands: '荷兰',
  'New Zealand': '新西兰',
  Nicaragua: '尼加拉瓜',
  Niger: '尼日尔',
  Nigeria: '尼日利亚',
  'North Korea': '朝鲜',
  Norway: '挪威',
  Oman: '阿曼',
  Pakistan: '巴基斯坦',
  Panama: '巴拿马',
  'Papua New Guinea': '巴布亚新几内亚',
  Paraguay: '巴拉圭',
  Peru: '秘鲁',
  Philippines: '菲律宾',
  Poland: '波兰',
  Portugal: '葡萄牙',
  Qatar: '卡塔尔',
  Romania: '罗马尼亚',
  Russia: '俄罗斯',
  Rwanda: '卢旺达',
  'S. Sudan': '南苏丹',
  'Saudi Arabia': '沙特阿拉伯',
  Senegal: '塞内加尔',
  Serbia: '塞尔维亚',
  'Sierra Leone': '塞拉利昂',
  Slovakia: '斯洛伐克',
  Slovenia: '斯洛文尼亚',
  Somalia: '索马里',
  'South Africa': '南非',
  'South Korea': '韩国',
  Spain: '西班牙',
  'Sri Lanka': '斯里兰卡',
  Sudan: '苏丹',
  Suriname: '苏里南',
  Sweden: '瑞典',
  Switzerland: '瑞士',
  Syria: '叙利亚',
  Taiwan: '中国台湾',
  Tajikistan: '塔吉克斯坦',
  Tanzania: '坦桑尼亚',
  Thailand: '泰国',
  'Timor-Leste': '东帝汶',
  Togo: '多哥',
  Tunisia: '突尼斯',
  Turkey: '土耳其',
  Turkmenistan: '土库曼斯坦',
  Uganda: '乌干达',
  Ukraine: '乌克兰',
  'United Arab Emirates': '阿联酋',
  'United Kingdom': '英国',
  'United States': '美国',
  'United States of America': '美国',
  Uruguay: '乌拉圭',
  Uzbekistan: '乌兹别克斯坦',
  Venezuela: '委内瑞拉',
  Vietnam: '越南',
  'Western Sahara': '西撒哈拉',
  Yemen: '也门',
  Zambia: '赞比亚',
  Zimbabwe: '津巴布韦',
};

let worldMapPromise: Promise<void> | null = null;

function translateCountryName(name: string): string {
  return COUNTRY_NAME_MAP[name] ?? name;
}

function getVisibleLabelLimit(level: ViewLevel, total: number): number {
  if (level === 'city') {
    return Math.min(MAX_CITY_LABELS, total);
  }

  if (level === 'country') {
    return Math.min(18, total);
  }

  return Math.min(8, total);
}

function getViewLevel(zoom: number): ViewLevel {
  if (zoom >= CITY_LABEL_ZOOM) {
    return 'city';
  }

  if (zoom >= COUNTRY_LABEL_ZOOM) {
    return 'country';
  }

  return 'global';
}

function getGeoView(option: unknown): { zoom: number; center: [number, number]; level: ViewLevel } {
  if (typeof option !== 'object' || option === null || !('geo' in option)) {
    return { zoom: DEFAULT_ZOOM, center: DEFAULT_CENTER, level: 'global' };
  }

  const geo = (option as { geo?: unknown }).geo;
  const geoOption = Array.isArray(geo) ? geo[0] : geo;

  if (typeof geoOption !== 'object' || geoOption === null) {
    return { zoom: DEFAULT_ZOOM, center: DEFAULT_CENTER, level: 'global' };
  }

  const rawZoom = 'zoom' in geoOption ? (geoOption as { zoom?: unknown }).zoom : undefined;
  const rawCenter = 'center' in geoOption ? (geoOption as { center?: unknown }).center : undefined;

  const zoom = typeof rawZoom === 'number' ? rawZoom : DEFAULT_ZOOM;
  const center = Array.isArray(rawCenter)
    && rawCenter.length === 2
    && typeof rawCenter[0] === 'number'
    && typeof rawCenter[1] === 'number'
    ? [rawCenter[0], rawCenter[1]] as [number, number]
    : DEFAULT_CENTER;

  return { zoom, center, level: getViewLevel(zoom) };
}

function getCountryLabel(name: string): string {
  const translated = translateCountryName(name);

  if (translated.length <= 18) {
    return translated;
  }

  return `${translated.slice(0, 18)}...`;
}

function isGeoJsonLike(value: unknown): value is GeoJsonLike {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const geoJson = value as GeoJsonLike;
  return Array.isArray(geoJson.features) || Array.isArray(geoJson.geometries);
}

function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return typeof value === 'object' && value !== null && 'code' in value && 'data' in value;
}

async function loadWorldGeoJson(): Promise<GeoJsonLike> {
  for (const source of WORLD_MAP_SOURCES) {
    try {
      const response = await fetch(source, { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const payload: unknown = await response.json();
      const geoJson = isApiEnvelope<unknown>(payload) ? payload.data : payload;

      if (isGeoJsonLike(geoJson)) {
        return geoJson;
      }
    } catch {}
  }

  throw new Error('world-map-load-failed');
}

function ensureWorldMap(): Promise<void> {
  if (echarts.getMap(WORLD_MAP_NAME)) {
    return Promise.resolve();
  }

  if (!worldMapPromise) {
    worldMapPromise = loadWorldGeoJson()
      .then((geoJson: unknown) => {
        echarts.registerMap(
          WORLD_MAP_NAME,
          geoJson as Parameters<typeof echarts.registerMap>[1]
        );
      })
      .catch((error) => {
        worldMapPromise = null;
        throw error;
      });
  }

  return worldMapPromise;
}

function lngLatToXY(lng: number, lat: number): [number, number] {
  const x = PADDING + ((lng + 180) / 360) * (WIDTH - 2 * PADDING);
  const y = PADDING + ((90 - lat) / 180) * (HEIGHT - 2 * PADDING);
  return [x, y];
}

export default function GlobalFanMap({ locations }: { locations: LocationItem[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const roamFrameRef = useRef<number | null>(null);
  const chartViewRef = useRef<{ zoom: number; center: [number, number]; level: ViewLevel }>({
    zoom: DEFAULT_ZOOM,
    center: DEFAULT_CENTER,
    level: 'global',
  });
  const viewLevelRef = useRef<ViewLevel>('global');
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [viewLevel, setViewLevel] = useState<ViewLevel>('global');

  const maxCount = useMemo(
    () => Math.max(...locations.map((location) => location.count), 1),
    [locations]
  );

  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => b.count - a.count),
    [locations]
  );

  const scatterData = useMemo<ScatterPoint[]>(
    () => sortedLocations.map((location, index) => ({
      name: location.city,
      value: [location.coord[0], location.coord[1], location.count],
      itemStyle: {
        color: COLORS[index % COLORS.length],
      },
    })),
    [sortedLocations]
  );

  const hotspotData = useMemo<ScatterPoint[]>(
    () => scatterData.slice(0, HOTSPOT_LIMIT).map((item) => ({
      ...item,
      itemStyle: {
        ...item.itemStyle,
        shadowBlur: 10,
        shadowColor: `${item.itemStyle.color}33`,
      },
    })),
    [scatterData]
  );

  const cityUsersMap = useMemo<Record<string, string[]>>(
    () => sortedLocations.reduce<Record<string, string[]>>((result, location) => {
      result[location.city] = location.users ?? [];
      return result;
    }, {}),
    [sortedLocations]
  );

  const viewDescription = useMemo(() => {
    if (viewLevel === 'city') {
      return '城市层级';
    }

    if (viewLevel === 'country') {
      return '国家层级';
    }

    return '全球总览';
  }, [viewLevel]);

  useEffect(() => {
    let cancelled = false;

    ensureWorldMap()
      .then(() => {
        if (!cancelled) {
          chartViewRef.current = { zoom: DEFAULT_ZOOM, center: DEFAULT_CENTER, level: 'global' };
          viewLevelRef.current = 'global';
          setViewLevel('global');
          setMapStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMapStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const applyViewport = useCallback((zoom: number, center: [number, number]) => {
    const nextLevel = getViewLevel(zoom);

    chartViewRef.current = {
      zoom,
      center,
      level: nextLevel,
    };

    viewLevelRef.current = nextLevel;
    setViewLevel((current) => (current === nextLevel ? current : nextLevel));

    chartInstance.current?.setOption(
      {
        geo: {
          zoom,
          center,
        },
      },
      { lazyUpdate: true }
    );
  }, []);

  const resetView = useCallback(() => {
    applyViewport(DEFAULT_ZOOM, DEFAULT_CENTER);
  }, [applyViewport]);

  const updateVisibleLabels = useCallback((level: ViewLevel = viewLevelRef.current) => {
    const chart = chartInstance.current;
    if (!chart) {
      return;
    }

    const limit = getVisibleLabelLimit(level, scatterData.length);
    const width = chart.getWidth();
    const height = chart.getHeight();
    const visibleLabels: ScatterPoint[] = [];

    for (const point of scatterData) {
      const pixel = chart.convertToPixel({ geoIndex: 0 }, [point.value[0], point.value[1]]);
      if (!Array.isArray(pixel) || pixel.length < 2) {
        continue;
      }

      const [x, y] = pixel;
      if (typeof x !== 'number' || typeof y !== 'number') {
        continue;
      }

      if (
        x < VIEWPORT_LABEL_PADDING
        || x > width - VIEWPORT_LABEL_PADDING
        || y < VIEWPORT_LABEL_PADDING
        || y > height - VIEWPORT_LABEL_PADDING
      ) {
        continue;
      }

      visibleLabels.push(point);
      if (visibleLabels.length >= limit) {
        break;
      }
    }

    chart.setOption(
      {
        series: [
          {
            id: 'city-visible-labels',
            data: visibleLabels,
            label: {
              distance: level === 'city' ? 6 : 8,
              fontSize: level === 'city' ? 11 : 10,
            },
          },
        ],
      },
      { lazyUpdate: true }
    );
  }, [scatterData]);

  const renderChart = useCallback(() => {
    if (mapStatus !== 'ready' || !chartRef.current) {
      return;
    }

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chart = chartInstance.current;
    const { zoom, center } = chartViewRef.current;

    chart.setOption(
      {
        animationDuration: 160,
        animationDurationUpdate: 0,
        animationEasing: 'cubicOut',
        animationEasingUpdate: 'linear',
        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          padding: [10, 12],
          textStyle: { color: '#374151', fontSize: 12 },
          extraCssText: 'max-width:260px;white-space:normal;box-shadow:0 10px 30px rgba(15,23,42,0.12);',
          formatter: (params: { name?: string; value?: number[] | string | number; color?: string }) => {
            const name = params.name ?? '';
            const value = Array.isArray(params.value) ? params.value : [];

            if (!Array.isArray(params.value)) {
              return `<div style="font-weight:600;font-size:14px;color:#111827">${translateCountryName(name)}</div><div style="margin-top:4px;color:#6b7280">继续放大可查看更具体的城市分布</div>`;
            }

            const count = typeof value[2] === 'number' ? value[2] : 0;
            const users = cityUsersMap[name] ?? [];
            const color = typeof params.color === 'string' ? params.color : '#1890ff';
            const userText = users.length > 0
              ? `<div style="margin-top:6px;color:#6b7280;line-height:1.6">${users.slice(0, 8).join('、')}${users.length > 8 ? ` 等${count}人` : ''}</div>`
              : '';

            return `<div style="font-weight:600;font-size:14px;color:#111827">${name}</div><div style="margin-top:4px;color:${color};font-weight:500">${count} 位泽小将</div>${userText}`;
          },
        },
        geo: {
          map: WORLD_MAP_NAME,
          roam: true,
          scaleLimit: { min: DEFAULT_ZOOM, max: 20 },
          zoom,
          center,
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          itemStyle: {
            areaColor: '#edf3fa',
            borderColor: '#cbd5e1',
            borderWidth: viewLevel === 'global' ? 0.7 : 0.9,
          },
          label: {
            show: viewLevel === 'country',
            color: '#475569',
            fontSize: 9,
            formatter: (params: { name?: string }) => getCountryLabel(params.name ?? ''),
          },
          emphasis: {
            disabled: false,
            label: {
              show: viewLevel === 'country',
              color: '#0f172a',
            },
            itemStyle: {
              areaColor: '#dbeafe',
              borderColor: '#94a3b8',
            },
          },
          select: { disabled: true },
        },
        series: [
          {
            id: 'city-points',
            type: 'scatter',
            coordinateSystem: 'geo',
            data: scatterData,
            progressive: 200,
            progressiveThreshold: 400,
            symbolSize: (value: number[]) => {
              const ratio = value[2] / maxCount;
              return 4 + ratio * 8;
            },
            itemStyle: { opacity: 0.92 },
            emphasis: {
              scale: true,
            },
            z: 3,
          },
          {
            id: 'city-hotspots',
            type: 'effectScatter',
            coordinateSystem: 'geo',
            data: viewLevel === 'city' ? [] : hotspotData,
            symbolSize: (value: number[]) => {
              const ratio = value[2] / maxCount;
              return 7 + ratio * 10;
            },
            showEffectOn: 'render',
            rippleEffect: {
              brushType: 'stroke',
              scale: viewLevel === 'global' ? 2.4 : 1.8,
              period: 6,
            },
            tooltip: { show: false },
            silent: true,
            z: 4,
          },
          {
            id: 'city-visible-labels',
            type: 'scatter',
            coordinateSystem: 'geo',
            data: [],
            symbolSize: 6,
            silent: true,
            tooltip: { show: false },
            itemStyle: {
              color: 'rgba(15,23,42,0.01)',
            },
            label: {
              show: true,
              formatter: (params: { name?: string }) => {
                return params.name ?? '';
              },
              position: 'right',
              distance: 8,
              fontSize: 10,
              color: '#4b5563',
            },
            labelLayout: { hideOverlap: true },
            emphasis: { disabled: true },
            z: 5,
          },
        ],
      },
      true
    );

    updateVisibleLabels(viewLevel);
  }, [cityUsersMap, hotspotData, mapStatus, maxCount, scatterData, updateVisibleLabels, viewLevel]);

  useEffect(() => {
    renderChart();
  }, [renderChart]);

  useEffect(() => {
    if (mapStatus !== 'ready' || !chartInstance.current) {
      return;
    }

    const chart = chartInstance.current;

    const syncViewState = () => {
      if (roamFrameRef.current !== null) {
        cancelAnimationFrame(roamFrameRef.current);
      }

      roamFrameRef.current = window.requestAnimationFrame(() => {
        roamFrameRef.current = null;

        const nextView = getGeoView(chart.getOption());
        chartViewRef.current = nextView;
        updateVisibleLabels(nextView.level);

        if (viewLevelRef.current !== nextView.level) {
          viewLevelRef.current = nextView.level;
          setViewLevel(nextView.level);
        }
      });
    };

    const handleClick = (params: { value?: unknown }) => {
      if (!Array.isArray(params.value)) {
        return;
      }

      const [lng, lat] = params.value;
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        return;
      }

      const nextZoom = Math.max(chartViewRef.current.zoom, CITY_FOCUS_ZOOM);
      applyViewport(nextZoom, [lng, lat]);
      window.requestAnimationFrame(() => {
        updateVisibleLabels(getViewLevel(nextZoom));
      });
    };

    chart.on('georoam', syncViewState);
    chart.on('click', handleClick);

    return () => {
      if (roamFrameRef.current !== null) {
        cancelAnimationFrame(roamFrameRef.current);
        roamFrameRef.current = null;
      }
      chart.off('georoam', syncViewState);
      chart.off('click', handleClick);
    };
  }, [applyViewport, mapStatus, updateVisibleLabels]);

  useEffect(() => {
    if (mapStatus !== 'ready') {
      return;
    }

    const resize = () => {
      chartInstance.current?.resize();
      updateVisibleLabels();
    };
    const observer = typeof ResizeObserver !== 'undefined' && chartRef.current
      ? new ResizeObserver(() => resize())
      : null;

    window.addEventListener('resize', resize);
    if (observer && chartRef.current) {
      observer.observe(chartRef.current);
    }

    return () => {
      window.removeEventListener('resize', resize);
      observer?.disconnect();
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, [mapStatus, updateVisibleLabels]);

  return (
    <div className="relative overflow-hidden rounded-card border border-divider bg-[#f8fafc]">
      {mapStatus === 'ready' ? (
        <div ref={chartRef} className="h-[560px] w-full" />
      ) : null}

      {mapStatus === 'loading' ? (
        <div className="flex h-[560px] items-center justify-center text-body text-text-muted">
          正在加载世界地图...
        </div>
      ) : null}

      {mapStatus === 'error' ? (
        <FallbackProjectionMap locations={locations} maxCount={maxCount} />
      ) : null}

      <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-caption text-text-body backdrop-blur-sm">
        {mapStatus === 'ready' ? `当前：${viewDescription} · 滚轮缩放查看国家与城市` : mapStatus === 'loading' ? '正在初始化世界底图' : '世界底图加载失败，已切换备用视图'}
      </div>

      {mapStatus === 'ready' ? (
        <button
          type="button"
          onClick={resetView}
          className="absolute right-4 top-4 rounded-full bg-white/92 px-3 py-1.5 text-caption text-text-body shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
        >
          重置全球视角
        </button>
      ) : null}

      <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-3 rounded-full bg-white/88 px-3 py-1.5 text-caption text-text-muted backdrop-blur-sm">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#1890ff]" /> 少
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-[#1890ff]" /> 多
        </span>
      </div>
    </div>
  );
}

function FallbackProjectionMap({ locations, maxCount }: { locations: LocationItem[]; maxCount: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const latLines = [-60, -30, 0, 30, 60];
  const lngLines = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];

  return (
    <div className="relative overflow-hidden bg-slate-900">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-[560px] w-full" style={{ display: 'block' }}>
        {latLines.map((lat) => {
          const [, y] = lngLatToXY(0, lat);
          return (
            <line
              key={`lat-${lat}`}
              x1={PADDING}
              y1={y}
              x2={WIDTH - PADDING}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={0.5}
            />
          );
        })}
        {lngLines.map((lng) => {
          const [x] = lngLatToXY(lng, 0);
          return (
            <line
              key={`lng-${lng}`}
              x1={x}
              y1={PADDING}
              x2={x}
              y2={HEIGHT - PADDING}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={0.5}
            />
          );
        })}
        {locations.map((location, index) => {
          const [x, y] = lngLatToXY(location.coord[0], location.coord[1]);
          const ratio = location.count / maxCount;
          const radius = 4 + ratio * 10;
          const color = COLORS[index % COLORS.length];
          const active = hovered === index;

          return (
            <g
              key={`${location.city}-${index}`}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              <circle cx={x} cy={y} r={radius * 2.6} fill={color} opacity={0.12} />
              <circle cx={x} cy={y} r={active ? radius * 1.25 : radius} fill={color} opacity={0.9} />
              {(index < 8 || active) ? (
                <text
                  x={x + radius + 4}
                  y={y + 3}
                  fill="rgba(255,255,255,0.8)"
                  fontSize={active ? 11 : 9}
                  className="pointer-events-none select-none"
                >
                  {location.city}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {hovered !== null && locations[hovered] ? (() => {
        const location = locations[hovered];
        const [x, y] = lngLatToXY(location.coord[0], location.coord[1]);
        const pctX = (x / WIDTH) * 100;
        const pctY = (y / HEIGHT) * 100;

        return (
          <div
            className="absolute z-10 max-w-[220px] rounded-lg border border-gray-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm"
            style={{
              left: `${pctX}%`,
              top: `${pctY}%`,
              transform: `translate(${pctX > 70 ? '-100%' : '10px'}, ${pctY > 70 ? '-100%' : '10px'})`,
            }}
          >
            <p className="text-sm font-semibold text-gray-900">{location.city}</p>
            <p className="mt-0.5 text-xs font-medium text-[#1890ff]">{location.count} 位泽小将</p>
            {location.users && location.users.length > 0 ? (
              <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                {location.users.slice(0, 8).join('、')}
                {location.users.length > 8 ? ` 等${location.count}人` : ''}
              </p>
            ) : null}
          </div>
        );
      })() : null}
    </div>
  );
}
