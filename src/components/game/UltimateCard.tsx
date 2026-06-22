'use client';

import React from 'react';
import Image from 'next/image';
import { Crown, Target, Star as StarIcon, Hexagon } from 'lucide-react';

// ============ 类型定义 ============

export interface UltimateStat {
  label: string;
  value: number | string;
}

export interface UltimateSkill {
  /** 内置图标：皇冠 / 靶心 / 星爆 */
  icon?: 'crown' | 'target' | 'burst';
  /** 技能名称（4 字最佳） */
  name: string;
  /** 分类标签：主动技 / 被动技 / 终结技 */
  tag: string;
  /** 效果描述 */
  desc: string;
}

export interface UltimateCardProps {
  /** 稀有度代号，大字显示在左上（如 "UR" / "SSR+" ） */
  rarity?: string;
  /** 星数（0-7） */
  stars?: number;
  /** 费用数值 */
  cost?: number | string;
  /** 中文名 */
  name?: string;
  /** 英文名 */
  nameEn?: string;
  /** 称号 / 副标题 */
  title?: string;
  /** 属性表 */
  stats?: UltimateStat[];
  /** 技能列表（建议 3 条） */
  skills?: UltimateSkill[];
  /** 等级数值 */
  level?: number | string;
  /** 进度文字（如 "MAX / MAX"） */
  progress?: string;
  /** 角色立绘图片路径 */
  image?: string;
  /** 右下签名文本 */
  signature?: string;
  /** 底部右侧名言 / 台词 */
  quote?: string;
  /** 底部左侧小字版权 / 编号 */
  footer?: string;
  /** 右下稀有度英文标签（默认 ULTIMATE RARE） */
  rarityLabel?: string;
  /** 卡片宽度（px），高度按约 1.1 比例推导 */
  width?: number;
  /** 额外类名 */
  className?: string;
}

// ============ 默认数据：陈泽签名卡 ============

export const CHENZE_SIGNATURE: Required<Omit<UltimateCardProps, 'width' | 'className'>> = {
  rarity: 'UR',
  stars: 6,
  cost: 1103,
  name: '陈泽',
  nameEn: 'CHENZE',
  title: '策略掌控者',
  stats: [
    { label: 'ATK', value: 1103 },
    { label: 'DEF', value: 952 },
    { label: 'HP', value: 14000 },
    { label: 'SPD', value: 115 },
    { label: 'INT', value: 1310 },
  ],
  skills: [
    { icon: 'crown', name: '运筹帷幄', tag: '主动技', desc: '抽取 3 张卡，本回合所有卡牌效果提升 50%。' },
    { icon: 'target', name: '精准预判', tag: '被动技', desc: '对手每回合使用的第一张卡无效。' },
    { icon: 'burst', name: '逆风翻盘', tag: '终结技', desc: '当 HP 低于 30% 时，重置战场并恢复 50% HP，抽 5 张卡。' },
  ],
  level: 1103,
  progress: 'MAX / MAX',
  image: '/12.png',
  signature: 'chenze1103',
  quote: '“真正的胜利，\n不是击败对手，\n而是掌控全局。”',
  footer: 'CHENZE 1103\n© 2024 CHENZE ALL RIGHTS RESERVED.',
  rarityLabel: 'ULTIMATE RARE',
};

// ============ 子组件 ============

function Stars({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-[3px]">
      {Array.from({ length: n }).map((_, i) => (
        <StarIcon
          key={i}
          size={14}
          className="text-amber-300 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]"
          fill="currentColor"
          strokeWidth={0}
        />
      ))}
    </div>
  );
}

const SKILL_ICON: Record<NonNullable<UltimateSkill['icon']>, React.ElementType> = {
  crown: Crown,
  target: Target,
  burst: StarIcon,
};

// ============ 主组件 ============

export default function UltimateCard({
  rarity = CHENZE_SIGNATURE.rarity,
  stars = CHENZE_SIGNATURE.stars,
  cost = CHENZE_SIGNATURE.cost,
  name = CHENZE_SIGNATURE.name,
  nameEn = CHENZE_SIGNATURE.nameEn,
  title = CHENZE_SIGNATURE.title,
  stats = CHENZE_SIGNATURE.stats,
  skills = CHENZE_SIGNATURE.skills,
  level = CHENZE_SIGNATURE.level,
  progress = CHENZE_SIGNATURE.progress,
  image = CHENZE_SIGNATURE.image,
  signature = CHENZE_SIGNATURE.signature,
  quote = CHENZE_SIGNATURE.quote,
  footer = CHENZE_SIGNATURE.footer,
  rarityLabel = CHENZE_SIGNATURE.rarityLabel,
  width = 640,
  className,
}: UltimateCardProps) {
  const height = Math.round(width * 1.1);

  return (
    <div
      className={['uc-root relative select-none', className ?? ''].join(' ')}
      style={{ width, height }}
    >
      {/* 最外层：金色双描边 */}
      <div className="absolute inset-0 rounded-[14px] p-[2px] bg-gradient-to-br from-[#f5d97a] via-[#8a5a12] to-[#f5d97a] shadow-[0_0_40px_rgba(251,191,36,0.35)]">
        <div className="relative w-full h-full rounded-[12px] p-[1.5px] bg-gradient-to-br from-[#2a1d08] via-[#0a0a0f] to-[#2a1d08]">
          <div className="relative w-full h-full rounded-[11px] p-[1.5px] bg-gradient-to-br from-[#f5d97a] via-[#b78a2a] to-[#fff3b0]">
            <div
              className="relative w-full h-full rounded-[10px] overflow-hidden"
              style={{
                background:
                  'radial-gradient(ellipse at 65% 40%, #3a2a0a 0%, #1a1408 45%, #0a0a0f 100%)',
              }}
            >
              {/* 背景立绘 */}
              {image && (
                <div className="absolute inset-0">
                  <Image
                    src={image}
                    alt={name}
                    fill
                    sizes={`${width}px`}
                    className="object-cover object-[60%_center] opacity-95"
                    unoptimized
                    priority
                  />
                  {/* 左侧暗化 */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(90deg, rgba(8,6,2,0.92) 0%, rgba(8,6,2,0.55) 32%, rgba(8,6,2,0.15) 55%, rgba(8,6,2,0) 80%)',
                    }}
                  />
                  {/* 底部渐隐到纯黑 */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-1/3"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(8,6,2,0) 0%, rgba(8,6,2,0.85) 60%, rgba(8,6,2,0.98) 100%)',
                    }}
                  />
                  {/* 金色粒子叠加（暖色光晕） */}
                  <div
                    className="absolute inset-0 mix-blend-screen opacity-60 pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(circle at 68% 38%, rgba(255,200,80,0.35) 0%, rgba(255,140,40,0.15) 25%, transparent 55%)',
                    }}
                  />
                </div>
              )}

              {/* 顶部四角装饰点 */}
              <CornerOrnaments />

              {/* ========== 顶部左：UR + 星星 + 名称 ========== */}
              <div className="absolute top-4 left-5 z-10">
                <div
                  className="font-black leading-none tracking-wider"
                  style={{
                    fontSize: Math.round(width / 8.5),
                    background:
                      'linear-gradient(180deg, #fff6c2 0%, #f5d97a 35%, #b78a2a 70%, #f9e08a 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.7))',
                    letterSpacing: '0.05em',
                  }}
                >
                  {rarity}
                </div>
                <div className="mt-1.5">
                  <Stars n={stars} />
                </div>

                {/* 名称块（在立绘之上左侧） */}
                <div className="mt-7">
                  <div
                    className="font-black leading-none"
                    style={{
                      fontSize: Math.round(width / 14),
                      background:
                        'linear-gradient(180deg, #fff6c2 0%, #f5d97a 50%, #c99326 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.8))',
                    }}
                  >
                    {name}
                  </div>
                  <div
                    className="mt-1 tracking-[0.4em] text-[#d8b366]/80"
                    style={{ fontSize: Math.max(10, Math.round(width / 56)) }}
                  >
                    {nameEn}
                  </div>
                  <div
                    className="mt-2 inline-block px-2.5 py-1 border border-[#b78a2a]/60 bg-black/40 text-[#f5d97a]"
                    style={{ fontSize: Math.max(10, Math.round(width / 50)) }}
                  >
                    {title}
                  </div>
                </div>
              </div>

              {/* ========== 顶部右：COST ========== */}
              <div className="absolute top-4 right-5 z-10 text-right">
                <div
                  className="tracking-[0.35em] text-[#d8b366]/90 leading-none"
                  style={{ fontSize: Math.max(10, Math.round(width / 55)) }}
                >
                  COST
                </div>
                <div
                  className="font-black leading-none mt-1"
                  style={{
                    fontSize: Math.round(width / 11),
                    background:
                      'linear-gradient(180deg, #fff6c2 0%, #f5d97a 45%, #b78a2a 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.7))',
                  }}
                >
                  {cost}
                </div>
                {/* 右上菱形小印章 */}
                <div className="mt-3 flex justify-end">
                  <SealBadge size={Math.round(width / 18)} />
                </div>
              </div>

              {/* ========== 中部左：属性表 ========== */}
              <div
                className="absolute left-5 z-10"
                style={{ top: `${Math.round(height * 0.32)}px`, width: Math.round(width * 0.28) }}
              >
                <div className="border border-[#b78a2a]/70 divide-y divide-[#b78a2a]/40 bg-black/55 backdrop-blur-[2px]">
                  {stats.map((s) => (
                    <div key={s.label} className="flex items-center justify-between px-3 py-1.5">
                      <span
                        className="text-[#d8b366] tracking-widest font-semibold"
                        style={{ fontSize: Math.max(10, Math.round(width / 52)) }}
                      >
                        {s.label}
                      </span>
                      <span
                        className="text-white font-bold tabular-nums"
                        style={{ fontSize: Math.max(11, Math.round(width / 42)) }}
                      >
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ========== 中下部：技能列表 ========== */}
              <div
                className="absolute left-5 right-5 z-10 flex flex-col gap-2"
                style={{ top: `${Math.round(height * 0.57)}px` }}
              >
                {skills.map((sk, i) => {
                  const Ico = SKILL_ICON[sk.icon ?? 'crown'];
                  return (
                    <div
                      key={i}
                      className="relative border border-[#b78a2a]/60 bg-gradient-to-r from-black/75 via-black/55 to-black/30 backdrop-blur-[2px] px-3 py-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full border border-[#f5d97a]/70 bg-[#1a1408] flex items-center justify-center shrink-0 shadow-[inset_0_0_6px_rgba(251,191,36,0.4)]">
                          <Ico size={14} className="text-[#f5d97a]" />
                        </div>
                        <div
                          className="font-bold text-[#f5d97a] tracking-wider"
                          style={{ fontSize: Math.max(12, Math.round(width / 42)) }}
                        >
                          {sk.name}
                        </div>
                        <div
                          className="ml-1 px-2 py-[1px] border border-[#b78a2a]/60 text-[#d8b366] tracking-wider"
                          style={{ fontSize: Math.max(9, Math.round(width / 60)) }}
                        >
                          {sk.tag}
                        </div>
                      </div>
                      <div
                        className="mt-1 text-white/85 leading-snug"
                        style={{ fontSize: Math.max(10, Math.round(width / 50)) }}
                      >
                        {sk.desc}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ========== 右下：签名 + 引述 ========== */}
              <div
                className="absolute right-5 z-10 text-right pointer-events-none"
                style={{ top: `${Math.round(height * 0.52)}px`, maxWidth: Math.round(width * 0.32) }}
              >
                <div
                  className="font-waterbrush text-[#f5d97a]/90 whitespace-nowrap"
                  style={{
                    fontSize: Math.round(width / 22),
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.7))',
                  }}
                >
                  {signature}
                </div>
              </div>

              {quote && (
                <div
                  className="absolute right-5 z-10 text-right text-[#d8b366]/85 italic leading-relaxed whitespace-pre-line"
                  style={{
                    bottom: `${Math.round(height * 0.12)}px`,
                    maxWidth: Math.round(width * 0.3),
                    fontSize: Math.max(10, Math.round(width / 54)),
                  }}
                >
                  {quote}
                </div>
              )}

              {/* ========== 底部：Lv. 进度条 ========== */}
              <div
                className="absolute left-5 right-5 z-10 flex items-center gap-3"
                style={{ bottom: `${Math.round(height * 0.065)}px` }}
              >
                <div className="flex items-baseline gap-2">
                  <span
                    className="tracking-widest text-[#d8b366]"
                    style={{ fontSize: Math.max(10, Math.round(width / 52)) }}
                  >
                    Lv.
                  </span>
                  <span
                    className="font-black"
                    style={{
                      fontSize: Math.round(width / 14),
                      background:
                        'linear-gradient(180deg, #fff6c2 0%, #f5d97a 50%, #c99326 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      lineHeight: 1,
                    }}
                  >
                    {level}
                  </span>
                </div>
                <div className="flex-1 relative h-[6px] bg-black/70 border border-[#b78a2a]/60 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 w-full"
                    style={{
                      background:
                        'linear-gradient(90deg, #b78a2a 0%, #f5d97a 40%, #fff6c2 70%, #f5d97a 100%)',
                      boxShadow: '0 0 8px rgba(251,191,36,0.6)',
                    }}
                  />
                </div>
                <div
                  className="tracking-[0.35em] text-[#d8b366]"
                  style={{ fontSize: Math.max(9, Math.round(width / 60)) }}
                >
                  {progress}
                </div>
              </div>

              {/* ========== 最底部：版权 + ULTIMATE RARE ========== */}
              <div className="absolute left-5 right-5 bottom-2 z-10 flex items-end justify-between gap-3">
                <div
                  className="whitespace-pre-line leading-tight text-[#d8b366]/80"
                  style={{ fontSize: Math.max(8, Math.round(width / 72)) }}
                >
                  {footer}
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="px-3 py-1 border border-[#b78a2a]/70 bg-black/55 tracking-[0.3em] text-[#f5d97a]"
                    style={{ fontSize: Math.max(9, Math.round(width / 62)) }}
                  >
                    {rarityLabel}
                  </div>
                  <SealBadge size={Math.round(width / 18)} />
                </div>
              </div>

              {/* 扫光 */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="uc-shine absolute -inset-x-1/2 -top-1/2 h-full w-[35%] rotate-12 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .uc-shine {
          animation: uc-shine 6s linear infinite;
        }
        @keyframes uc-shine {
          0% { transform: translateX(-60%) rotate(12deg); }
          100% { transform: translateX(260%) rotate(12deg); }
        }
      `}</style>
    </div>
  );
}

// ============ 装饰件 ============

function CornerOrnaments() {
  const common =
    'absolute w-3 h-3 border-[#f5d97a]/80';
  return (
    <>
      <span className={`${common} top-2 left-2 border-t border-l`} />
      <span className={`${common} top-2 right-2 border-t border-r`} />
      <span className={`${common} bottom-2 left-2 border-b border-l`} />
      <span className={`${common} bottom-2 right-2 border-b border-r`} />
    </>
  );
}

function SealBadge({ size = 36 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Hexagon
        size={size}
        className="text-[#1a1408]"
        fill="currentColor"
        strokeWidth={1.5}
        stroke="#f5d97a"
      />
      <Crown
        size={Math.round(size * 0.5)}
        className="absolute text-[#f5d97a]"
        strokeWidth={2}
      />
    </div>
  );
}
