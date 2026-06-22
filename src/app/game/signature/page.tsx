'use client';

import React, { useState } from 'react';
import UltimateCard from '@/components/game/UltimateCard';

const SIZES = [
  { label: '小', value: 420 },
  { label: '中', value: 560 },
  { label: '大', value: 720 },
  { label: '特大', value: 900 },
];

export default function SignatureCardPage() {
  const [width, setWidth] = useState(720);

  return (
    <div className="min-h-screen w-full py-10 px-4 flex flex-col items-center gap-6">
      <header className="text-center">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wider">
          签名卡 · <span className="font-waterbrush text-amber-300">CHENZE UR</span>
        </h1>
        <p className="mt-2 text-sm text-white/50">
          UltimateCard 组件预览，默认数据为「陈泽 · 策略掌控者」签名卡。
        </p>
      </header>

      <div className="glass-card rounded-xl px-3 py-1.5 flex items-center gap-1.5">
        <span className="text-[11px] text-white/45 font-semibold tracking-wider uppercase mr-1">
          宽度
        </span>
        {SIZES.map((s) => (
          <button
            key={s.value}
            onClick={() => setWidth(s.value)}
            className={[
              'chip',
              width === s.value ? 'chip-active' : '',
            ].filter(Boolean).join(' ')}
          >
            {s.label} · {s.value}px
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center">
        <UltimateCard width={width} />
      </div>

      <footer className="text-[11px] text-white/40 text-center max-w-md">
        组件位于 <code className="text-amber-300">src/components/game/UltimateCard.tsx</code>
        ，所有文案 / 属性 / 技能 / 立绘均可通过 props 覆盖。
      </footer>
    </div>
  );
}
