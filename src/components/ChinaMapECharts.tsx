'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getCityLngLat } from '@/data/city-coords';
import * as echarts from 'echarts/core';
import { MapChart, EffectScatterChart } from 'echarts/charts';
import { TooltipComponent, GeoComponent, VisualMapComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([MapChart, EffectScatterChart, TooltipComponent, GeoComponent, VisualMapComponent, CanvasRenderer]);

// 城市气泡颜色调色板
const BUBBLE_COLORS = [
  '#1890ff', '#52c41a', '#faad14', '#ff4d4f',
  '#36cfc9', '#597ef7', '#ff7a45', '#9254de',
  '#f759ab', '#13c2c2', '#2f54eb', '#eb2f96',
];

interface CityItem {
  city: string;
  count: number;
  users?: string[];
}

let mapRegistered = false;

export default function ChinaMapECharts({ cities }: { cities: CityItem[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // 注册中国地图 GeoJSON
  useEffect(() => {
    if (mapRegistered) {
      setMapReady(true);
      return;
    }
    fetch('/china.json')
      .then(r => r.json())
      .then(geoJson => {
        echarts.registerMap('china', geoJson);
        mapRegistered = true;
        setMapReady(true);
      })
      .catch(() => {});
  }, []);

  // 渲染 ECharts
  const renderChart = useCallback(() => {
    if (!chartRef.current || !mapReady) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }
    const chart = chartInstance.current;

    const maxCount = cities[0]?.count || 1;

    // 构建城市用户名映射，供 tooltip 使用
    const cityUsersMap: Record<string, string[]> = {};
    cities.forEach(item => {
      cityUsersMap[item.city] = item.users || [];
    });

    // 转换城市数据为散点图数据，每个城市带独立颜色
    const scatterData = cities
      .map((item, idx) => {
        const coord = getCityLngLat(item.city);
        if (!coord) return null;
        return {
          name: item.city,
          value: [...coord, item.count],
          itemStyle: {
            color: BUBBLE_COLORS[idx % BUBBLE_COLORS.length],
            shadowBlur: 6,
            shadowColor: BUBBLE_COLORS[idx % BUBBLE_COLORS.length] + '40',
          },
        };
      })
      .filter(Boolean);

    chart.setOption({
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: '#333', fontSize: 13 },
        extraCssText: 'max-width:260px;white-space:normal;',
        formatter: (params: { name: string; value: number[]; color: string }) => {
          const users = cityUsersMap[params.name] || [];
          const count = params.value[2];
          let html = `<div style="font-weight:600;font-size:14px;margin-bottom:4px">${params.name}</div>`;
          html += `<div style="color:${params.color};font-weight:500;margin-bottom:6px">${count} 位老铁</div>`;
          if (users.length > 0) {
            const shown = users.slice(0, 10);
            html += `<div style="color:#666;font-size:12px;line-height:1.6">`;
            html += shown.join('、');
            if (users.length > 10) html += `<span style="color:#999"> 等${count}人</span>`;
            html += `</div>`;
          }
          return html;
        },
      },
      geo: {
        map: 'china',
        roam: false,
        zoom: 1.2,
        center: [104.5, 35.5],
        itemStyle: {
          areaColor: '#e8f0fa',
          borderColor: '#b8cce4',
          borderWidth: 1,
        },
        emphasis: {
          itemStyle: {
            areaColor: '#d4e4f7',
          },
          label: { show: false },
        },
        regions: [
          { name: '南海诸岛', itemStyle: { opacity: 0 }, label: { show: false } },
        ],
      },
      series: [
        {
          type: 'effectScatter',
          coordinateSystem: 'geo',
          data: scatterData,
          symbolSize: (val: number[]) => {
            const ratio = val[2] / maxCount;
            return 6 + ratio * 14;
          },
          showEffectOn: 'render',
          rippleEffect: {
            brushType: 'stroke',
            scale: 2.5,
            period: 5,
          },
          label: {
            show: true,
            formatter: '{b}',
            position: 'right',
            fontSize: 10,
            color: '#666',
          },
          labelLayout: { hideOverlap: true },
          encode: { value: 2 },
        },
      ],
    });
  }, [cities, mapReady]);

  useEffect(() => {
    renderChart();
  }, [renderChart]);

  // 窗口 resize
  useEffect(() => {
    const onResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  return (
    <div>
      {!mapReady && (
        <div className="aspect-[6/5] flex items-center justify-center">
          <div className="text-text-muted text-body">地图加载中...</div>
        </div>
      )}
      <div
        ref={chartRef}
        style={{ width: '100%', height: mapReady ? '520px' : '0px' }}
      />
    </div>
  );
}
