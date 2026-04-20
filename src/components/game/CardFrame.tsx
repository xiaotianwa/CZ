'use client';

import React from 'react';
import Image from 'next/image';
import {
  CharacterIcon, ItemIcon, EquipmentIcon, EffectIcon, EventIcon,
  ManaIcon, AttackIcon, HealthIcon,
} from './GameIcons';
import CardBack from './CardBack';

// ============ 类型定义 ============

export type CardType = 'character' | 'item' | 'equipment' | 'effect' | 'event';
export type CardSubtype = 'instant' | 'delayed' | 'weapon' | 'armor';
export type CardRarity = 'N' | 'R' | 'SR' | 'SSR';

export interface CardFrameProps {
  /** 卡牌名称（角色名/道具名），4-8 字最佳 */
  name: string;
  /** 主图地址（角色/装备形象），建议 PNG 透明底 3:4 */
  image: string;
  /** 卡牌类型：决定左上角图标与色调 */
  type: CardType;
  /** 子分类：道具 instant/delayed、装备 weapon/armor */
  subtype?: CardSubtype;
  /** 稀有度：决定边框发光与背景渐变 */
  rarity?: CardRarity;
  /** 能量消耗（左上蓝钻），不传则不显示 */
  cost?: number;
  /** 攻击力（左下红剑），不传则不显示 */
  attack?: number;
  /** 生命值/流量值（右下绿心），不传则不显示 */
  health?: number;
  /** 卡底飘字（台词 / flavor text），≤ 25 字 */
  flavor?: string;
  /** 角色/道具描述 或 技能效果文案，支持多行，约 ≤ 60 字 */
  description?: string;
  /** 卡牌宽度，单位 px，默认 240（高度按 3:4 自动推导） */
  width?: number;
  /** 是否启用悬浮放大动画，默认 true */
  interactive?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 是否选中态（高亮描边） */
  selected?: boolean;
  faceDown?: boolean;
  flipDurationMs?: number;
}

// ============ 常量配置 ============

const TYPE_META: Record<CardType, { label: string; Icon: React.ComponentType<{ className?: string; size?: number }>; accent: string }> = {
  character: { label: '角色', Icon: CharacterIcon, accent: 'from-pink-500 to-rose-500' },
  item:      { label: '道具', Icon: ItemIcon,      accent: 'from-emerald-400 to-teal-500' },
  equipment: { label: '装备', Icon: EquipmentIcon, accent: 'from-cyan-400 to-sky-600' },
  effect:    { label: '消耗', Icon: EffectIcon,    accent: 'from-amber-400 to-orange-500' },
  event:     { label: '事件', Icon: EventIcon,     accent: 'from-violet-500 to-fuchsia-500' },
};

const SUBTYPE_LABEL: Record<CardSubtype, string> = {
  instant: '即时',
  delayed: '延时',
  weapon:  '武器',
  armor:   '防具',
};

const RARITY_META: Record<CardRarity, {
  frame: string;        // 边框渐变
  glow: string;         // 外发光
  ribbon: string;       // 底部飘带
  label: string;
  labelColor: string;
}> = {
  N: {
    frame: 'from-slate-400 via-slate-300 to-slate-400',
    glow: 'shadow-[0_0_12px_rgba(148,163,184,0.4)]',
    ribbon: 'bg-slate-500',
    label: 'N',
    labelColor: 'text-slate-100',
  },
  R: {
    frame: 'from-sky-400 via-blue-300 to-sky-400',
    glow: 'shadow-[0_0_16px_rgba(56,189,248,0.55)]',
    ribbon: 'bg-sky-600',
    label: 'R',
    labelColor: 'text-sky-50',
  },
  SR: {
    frame: 'from-fuchsia-500 via-purple-400 to-fuchsia-500',
    glow: 'shadow-[0_0_20px_rgba(217,70,239,0.65)]',
    ribbon: 'bg-fuchsia-600',
    label: 'SR',
    labelColor: 'text-fuchsia-50',
  },
  SSR: {
    frame: 'from-amber-400 via-yellow-200 to-amber-400',
    glow: 'shadow-[0_0_28px_rgba(251,191,36,0.85)]',
    ribbon: 'bg-gradient-to-r from-amber-500 to-orange-500',
    label: 'SSR',
    labelColor: 'text-amber-50',
  },
};

// ============ 组件 ============

export default function CardFrame({
  name,
  image,
  type,
  subtype,
  rarity = 'N',
  cost,
  attack,
  health,
  flavor,
  description,
  width = 240,
  interactive = true,
  onClick,
  selected = false,
  faceDown = false,
  flipDurationMs = 600,
}: CardFrameProps) {
  const typeMeta = TYPE_META[type];
  const subLabel = subtype ? SUBTYPE_LABEL[subtype] : null;
  const rarityMeta = RARITY_META[rarity];
  const height = Math.round(width * (4 / 3));

  return (
    <div
      onClick={onClick}
      style={{ width, height, perspective: '1000px' }}
      className={[
        'relative select-none',
        interactive ? 'transition-transform duration-300 hover:-translate-y-2 hover:scale-[1.03]' : '',
        onClick ? 'cursor-pointer' : '',
      ].join(' ')}
    >
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          transition: `transform ${flipDurationMs}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          transform: faceDown ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
      <div
        className="absolute inset-0"
        style={{
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
        }}
        aria-hidden={!faceDown}
      >
        <CardBack width={width} rarity={rarity} variant="default" interactive={false} />
      </div>
      <div
        className="absolute inset-0"
        style={{
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
        aria-hidden={faceDown}
      >
      {/* 外发光 + 渐变边框 */}
      <div
        className={[
          'absolute inset-0 rounded-[14px] p-[3px] bg-gradient-to-br',
          rarityMeta.frame,
          rarityMeta.glow,
          selected ? 'ring-4 ring-primary ring-offset-2 ring-offset-transparent' : '',
        ].join(' ')}
      >
        {/* 内层卡面 */}
        <div className="relative w-full h-full rounded-[11px] overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
          {/* 主图区 */}
          <div className="absolute inset-x-0 top-0 h-[62%] overflow-hidden bg-gradient-to-b from-slate-700/60 to-slate-900/60">
            {image ? (
              <Image
                src={image}
                alt={name}
                fill
                sizes={`${width}px`}
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center relative bg-gradient-to-br ${typeMeta.accent} bg-opacity-10`}>
                {/* 大号淡水印图标 */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none text-white">
                  <typeMeta.Icon size={Math.round(width * 0.8)} />
                </div>
                {/* 卡名主体 */}
                <div className="relative z-10 text-center px-3 flex flex-col items-center gap-1">
                  <div className="text-[9px] tracking-[0.3em] text-white/60 uppercase flex items-center gap-1 justify-center">
                    <typeMeta.Icon className="w-3 h-3" />
                    <span>{typeMeta.label}</span>
                  </div>
                  <div
                    className={`font-black text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]`}
                    style={{ fontSize: Math.max(22, Math.round(width / 7)) }}
                  >
                    {name}
                  </div>
                  <div className={`h-[2px] w-8 bg-gradient-to-r ${typeMeta.accent} rounded-full mt-1`} />
                </div>
              </div>
            )}
            {/* 主图遮罩渐隐（底部过渡到信息区） */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900 to-transparent" />
          </div>

          {/* 左上角：消耗 */}
          {typeof cost === 'number' && (
            <StatPill
              Icon={ManaIcon}
              label="消耗"
              value={cost}
              gradient="from-cyan-400 to-blue-600"
              position="top-1.5 left-1.5"
              width={width}
            />
          )}

          {/* 右上角：稀有度徽章 */}
          <div
            className={[
              'absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider',
              'bg-gradient-to-br',
              rarityMeta.frame,
              rarityMeta.labelColor,
              'shadow',
            ].join(' ')}
          >
            {rarityMeta.label}
          </div>

          {/* 左下：攻击 */}
          {typeof attack === 'number' && (
            <StatPill
              Icon={AttackIcon}
              label="攻击"
              value={attack}
              gradient="from-rose-400 to-red-600"
              position="bottom-1.5 left-1.5"
              width={width}
            />
          )}

          {/* 右下：生命 */}
          {typeof health === 'number' && (
            <StatPill
              Icon={HealthIcon}
              label="生命"
              value={health}
              gradient="from-emerald-400 to-green-600"
              position="bottom-1.5 right-1.5"
              width={width}
            />
          )}

          {/* 类型飘带 */}
          <div className={`absolute left-0 top-[58%] px-2 py-0.5 text-[10px] font-bold text-white ${rarityMeta.ribbon} rounded-r-md shadow flex items-center gap-1`}>
            <typeMeta.Icon className="w-3 h-3" />
            <span>{typeMeta.label}</span>
            {subLabel && (
              <span className="px-1 text-[9px] font-semibold rounded bg-black/35 border border-white/20 tracking-wider">
                {subLabel}
              </span>
            )}
          </div>

          {/* 信息区 */}
          <div className="absolute inset-x-0 bottom-0 h-[38%] px-2.5 pt-2 pb-2 flex flex-col">
            {/* 名称 */}
            <div
              className={`text-center font-black text-white leading-tight bg-gradient-to-r ${typeMeta.accent} bg-clip-text text-transparent`}
              style={{ fontSize: Math.max(14, Math.round(width / 15)) }}
            >
              {name}
            </div>

            {/* 分割线 */}
            <div className={`my-1 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent`} />

            {/* 描述 / 效果 */}
            {description && (
              <div
                className="text-center text-white/85 leading-snug overflow-hidden px-0.5"
                style={{ fontSize: Math.max(10, Math.round(width / 22)) }}
              >
                {description}
              </div>
            )}

            {/* flavor text */}
            {flavor && (
              <div
                className="flex-1 text-center text-white/55 italic leading-snug overflow-hidden mt-0.5"
                style={{ fontSize: Math.max(9, Math.round(width / 26)) }}
              >
                「{flavor}」
              </div>
            )}

            {/* 1103 Logo 水印（右下） */}
            <div className="font-waterbrush absolute bottom-1 right-10 text-[9px] tracking-widest text-white/40 pointer-events-none">
              1103
            </div>
          </div>

          {/* SSR 额外：斜向高光扫动 */}
          {rarity === 'SSR' && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -inset-x-1/2 -top-1/2 h-full w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shine_3s_linear_infinite]" />
            </div>
          )}
        </div>
      </div>
      </div>
      </div>

      {/* 扫光动画 keyframes（局部注入，避免污染全局） */}
      {rarity === 'SSR' && (
        <style jsx>{`
          @keyframes shine {
            0% { transform: translateX(-50%) rotate(12deg); }
            100% { transform: translateX(250%) rotate(12deg); }
          }
        `}</style>
      )}
    </div>
  );
}

// 属性药丸：SVG 图标 + 标签文字 + 数值，一眼看出是什么属性
function StatPill({
  Icon,
  label,
  value,
  gradient,
  position,
  width,
}: {
  Icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  value: number;
  gradient: string;
  position: string;
  width: number;
}) {
  const fsLabel = Math.max(8, Math.round(width / 28));
  const fsValue = Math.max(12, Math.round(width / 17));
  const iconSize = Math.max(12, Math.round(width / 18));
  return (
    <div
      className={`absolute ${position} z-20 flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full bg-gradient-to-br ${gradient} ring-2 ring-white/80 shadow-lg`}
    >
      <Icon size={iconSize} className="text-white/95" />
      <span
        className="font-bold text-white/90 tracking-wide"
        style={{ fontSize: fsLabel, lineHeight: 1 }}
      >
        {label}
      </span>
      <span
        className="font-black text-white"
        style={{ fontSize: fsValue, lineHeight: 1 }}
      >
        {value}
      </span>
    </div>
  );
}
