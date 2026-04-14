'use client';

import { useState, useMemo } from 'react';

interface LocationItem {
  city: string;
  count: number;
  users?: string[];
  coord: [number, number]; // [lng, lat]
}

const WIDTH = 960;
const HEIGHT = 480;
const PADDING = 20;

const COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#06b6d4', '#8b5cf6', '#f97316', '#ec4899',
];

function lngLatToXY(lng: number, lat: number): [number, number] {
  const x = PADDING + ((lng + 180) / 360) * (WIDTH - 2 * PADDING);
  const y = PADDING + ((90 - lat) / 180) * (HEIGHT - 2 * PADDING);
  return [x, y];
}

export default function WorldDotMap({ locations }: { locations: LocationItem[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const maxCount = useMemo(
    () => Math.max(...locations.map((l) => l.count), 1),
    [locations]
  );

  // 纬度网格线
  const latLines = [-60, -30, 0, 30, 60];
  const lngLines = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        style={{ display: 'block' }}
      >
        <defs>
          <radialGradient id="dot-glow">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 网格线 */}
        {latLines.map((lat) => {
          const [, y] = lngLatToXY(0, lat);
          return (
            <line
              key={`lat-${lat}`}
              x1={PADDING} y1={y} x2={WIDTH - PADDING} y2={y}
              stroke="rgba(255,255,255,0.06)" strokeWidth={0.5}
            />
          );
        })}
        {lngLines.map((lng) => {
          const [x] = lngLatToXY(lng, 0);
          return (
            <line
              key={`lng-${lng}`}
              x1={x} y1={PADDING} x2={x} y2={HEIGHT - PADDING}
              stroke="rgba(255,255,255,0.06)" strokeWidth={0.5}
            />
          );
        })}

        {/* 赤道 */}
        {(() => {
          const [, y] = lngLatToXY(0, 0);
          return (
            <line
              x1={PADDING} y1={y} x2={WIDTH - PADDING} y2={y}
              stroke="rgba(255,255,255,0.12)" strokeWidth={0.5} strokeDasharray="4 4"
            />
          );
        })()}

        {/* 位置点 */}
        {locations.map((loc, i) => {
          const [x, y] = lngLatToXY(loc.coord[0], loc.coord[1]);
          const ratio = loc.count / maxCount;
          const r = 3 + ratio * 9;
          const color = COLORS[i % COLORS.length];
          const isHovered = hovered === i;

          return (
            <g
              key={`${loc.city}-${i}`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              {/* 光晕 */}
              <circle cx={x} cy={y} r={r * 3} fill={color} opacity={0.08} />

              {/* 脉冲动画 */}
              <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={0.8} opacity={0.6}>
                <animate attributeName="r" from={String(r)} to={String(r * 2.5)} dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="3s" repeatCount="indefinite" />
              </circle>

              {/* 实心点 */}
              <circle
                cx={x} cy={y} r={isHovered ? r * 1.3 : r}
                fill={color}
                opacity={isHovered ? 1 : 0.85}
                className="transition-all duration-150"
              />

              {/* 城市名（大于一定人数或被hover时显示） */}
              {(loc.count > maxCount * 0.3 || isHovered) && (
                <text
                  x={x + r + 4} y={y + 3}
                  fill="rgba(255,255,255,0.7)"
                  fontSize={isHovered ? 11 : 9}
                  className="pointer-events-none select-none"
                >
                  {loc.city}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered !== null && locations[hovered] && (() => {
        const loc = locations[hovered];
        const [x, y] = lngLatToXY(loc.coord[0], loc.coord[1]);
        const pctX = (x / WIDTH) * 100;
        const pctY = (y / HEIGHT) * 100;
        const flipX = pctX > 70;
        const flipY = pctY > 70;

        return (
          <div
            className="absolute z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 px-3 py-2 pointer-events-none"
            style={{
              left: `${pctX}%`,
              top: `${pctY}%`,
              transform: `translate(${flipX ? '-100%' : '10px'}, ${flipY ? '-100%' : '10px'})`,
              maxWidth: 220,
            }}
          >
            <p className="text-sm font-semibold text-gray-900">{loc.city}</p>
            <p className="text-xs text-blue-600 font-medium mt-0.5">{loc.count} 位泽小将</p>
            {loc.users && loc.users.length > 0 && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {loc.users.slice(0, 8).join('、')}
                {loc.users.length > 8 && ` 等${loc.count}人`}
              </p>
            )}
          </div>
        );
      })()}

      {/* 左下角图例 */}
      <div className="absolute bottom-3 left-3 flex items-center gap-3 text-[10px] text-white/40">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-400/60" /> 少
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-400/80" /> 多
        </span>
      </div>
    </div>
  );
}
