'use client';

/**
 * BattleOverlay 覆盖层与弹窗组件集合：
 *  - CardHoverPreview：固定定位的卡牌悬浮预览 + 关键字说明
 *  - AimArrow：攻击 / 消耗目标选中时的瞄准箭头
 *  - MulliganOverlay：换牌阶段弹窗
 *  - HelpModal：术语词典帮助弹窗
 *  - SpeakerOnIcon / SpeakerOffIcon：音量按钮图标
 *
 * 从 Battle.tsx 抽出（D2 剩余拆分 · 5/5）；保持渲染结构与样式不变。
 */

import React, { useEffect, useState } from 'react';
import CardFrame from '@/components/game/CardFrame';
import * as Icons from '@/components/game/GameIcons';
import { getCardDef } from '@/game/engine';
import type { CardInstance, PlayerId } from '@/game/types';
import {
  getPreset,
  KEYWORD_DICT, MECHANIC_DICT,
  extractMechanicTags,
  type DictEntry, type Point,
} from './shared';

// ============ 卡牌悬浮预览 ============

// 固定位置的卡牌悬浮预览（避开容器裁切）
export function CardHoverPreview({ card }: { card: { defId: string; cost: number; rect: DOMRect } | null }) {
  if (!card) return null;
  const preset = getPreset(card.defId);
  if (!preset) return null;
  const def = getCardDef(card.defId);
  const tags = extractMechanicTags(preset.description);
  const extraKeywords = (def?.keywords ?? []).filter((k) => KEYWORD_DICT[k]);
  const hasGlossary = tags.length > 0 || extraKeywords.length > 0;

  const PREVIEW_W = 240;
  const CARD_H = Math.round(PREVIEW_W * (4 / 3));
  // 词典面板预计高度（每条 ~44px + padding）
  const glossaryH = hasGlossary ? 36 + (tags.length + extraKeywords.length) * 42 : 0;
  const totalH = CARD_H + (hasGlossary ? glossaryH + 4 : 0);

  const gap = 8;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  // 尝试上方；不够则下方；都不够则靠右
  const showAbove = card.rect.top > totalH + gap + 16;
  const showBelow = !showAbove && vh - card.rect.bottom > totalH + gap + 16;
  let top: number;
  if (showAbove) top = card.rect.top - totalH - gap;
  else if (showBelow) top = card.rect.bottom + gap;
  else top = Math.max(8, vh - totalH - 8);

  let left = card.rect.left + card.rect.width / 2 - PREVIEW_W / 2;
  // 如果不能上/下只能侧边
  if (!showAbove && !showBelow) {
    // 右侧放
    left = Math.min(vw - PREVIEW_W - 8, card.rect.right + gap);
  }
  left = Math.max(8, Math.min(left, vw - PREVIEW_W - 8));

  return (
    <div className="pointer-events-none fixed z-[9999] drop-shadow-2xl"
         style={{ top, left, width: PREVIEW_W }}>
      <CardFrame
        name={preset.name}
        image={preset.imagePath ?? ''}
        type={preset.type}
        rarity={preset.rarity}
        cost={card.cost}
        attack={preset.attack}
        health={preset.health}
        description={preset.description}
        flavor={preset.flavor}
        width={PREVIEW_W}
        interactive={false}
      />
      {hasGlossary && (
        <div className="mt-1 bg-slate-950/95 border border-[#A78BFA]/40 rounded-lg p-2 text-xs text-white/90 shadow-xl">
          <div className="text-[#A78BFA] font-bold mb-1.5 text-[11px] tracking-wider uppercase">关键字说明</div>
          <div className="space-y-1.5">
            {tags.map((t) => {
              const info = MECHANIC_DICT[t];
              const Ico = info.Icon;
              return (
                <div key={t} className="leading-snug flex gap-1.5 items-start">
                  <Ico size={12} className="text-[#A78BFA] mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-[#C4B5FD]">【{t}】</span>
                    <span className="text-white/75"> {info.desc}</span>
                  </div>
                </div>
              );
            })}
            {extraKeywords.map((k) => {
              const info = KEYWORD_DICT[k];
              const Ico = info.Icon;
              return (
                <div key={k} className="leading-snug flex gap-1.5 items-start">
                  <Ico size={12} className="text-emerald-300 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-200">{info.name}</span>
                    <span className="text-white/75"> {info.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ 瞄准箭头 ============

// 瞄准箭头（炉石风） - 从 from 到 to 绘制贝塞尔曲线箭头
export function AimArrow({ from, to, mode }: { from: Point; to: Point; mode: 'attack' | 'cast' }) {
  // 两端控制点：起点稍微向上拱起形成弧线
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 8) return null;
  // 控制点：中点向上方偏移 (垂直于主方向)
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const perpX = -dy / dist;
  const perpY = dx / dist;
  const bulge = Math.min(80, dist * 0.25);
  const ctrlX = midX + perpX * bulge;
  const ctrlY = midY + perpY * bulge;

  // 箭头方向（切线）
  const tangentX = to.x - ctrlX;
  const tangentY = to.y - ctrlY;
  const tangentLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY) || 1;
  const tx = tangentX / tangentLen;
  const ty = tangentY / tangentLen;
  const arrowSize = 18;
  const baseX = to.x - tx * arrowSize;
  const baseY = to.y - ty * arrowSize;
  const leftX = baseX + ty * (arrowSize * 0.6);
  const leftY = baseY - tx * (arrowSize * 0.6);
  const rightX = baseX - ty * (arrowSize * 0.6);
  const rightY = baseY + tx * (arrowSize * 0.6);

  const color = mode === 'attack' ? '#f43f5e' : '#a855f7';
  const glow = mode === 'attack' ? 'rgba(244,63,94,0.6)' : 'rgba(168,85,247,0.6)';

  return (
    <svg className="pointer-events-none fixed inset-0 z-[9998]"
         width="100%" height="100%"
         viewBox={`0 0 ${typeof window !== 'undefined' ? window.innerWidth : 1024} ${typeof window !== 'undefined' ? window.innerHeight : 768}`}
         preserveAspectRatio="none">
      <defs>
        <filter id="arrowGlow">
          <feGaussianBlur stdDeviation="3" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* 外发光底色 */}
      <path d={`M ${from.x} ${from.y} Q ${ctrlX} ${ctrlY} ${to.x} ${to.y}`}
            stroke={glow} strokeWidth={14} fill="none" strokeLinecap="round" />
      {/* 主线 */}
      <path d={`M ${from.x} ${from.y} Q ${ctrlX} ${ctrlY} ${to.x} ${to.y}`}
            stroke={color} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray="14 8">
        <animate attributeName="stroke-dashoffset" from="0" to="-22" dur="0.6s" repeatCount="indefinite" />
      </path>
      {/* 箭头 */}
      <polygon points={`${to.x},${to.y} ${leftX},${leftY} ${rightX},${rightY}`} fill={color} filter="url(#arrowGlow)" />
      {/* 起点光圈 */}
      <circle cx={from.x} cy={from.y} r={10} fill="none" stroke={color} strokeWidth={3} opacity={0.8}>
        <animate attributeName="r" from="8" to="18" dur="1s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.8" to="0" dur="1s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

// ============ 换牌阶段 overlay ============

// 换牌阶段 overlay：玩家选择要换掉的起始手牌
export function MulliganOverlay({ player, hand, onConfirm }: {
  player: PlayerId; hand: CardInstance[]; onConfirm: (replaceIds: string[]) => void;
}) {
  const [marked, setMarked] = useState<Set<string>>(new Set());
  // 切换玩家时清空
  useEffect(() => { setMarked(new Set()); }, [player]);

  const toggle = (id: string) => {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const markedCount = marked.size;

  return (
    <div className="fixed inset-0 z-[99998] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl max-w-4xl w-full p-6 shadow-2xl">
        <div className="text-center mb-3">
          <h2 className="inline-flex items-center gap-2 text-2xl sm:text-3xl font-black text-amber-300 mb-1 tracking-wider">
            <Icons.RebornIcon size={26} />
            {player === 'P1' ? '玩家 1' : '玩家 2'} · 换牌阶段
          </h2>
          <p className="text-white/70 text-sm">
            点击需要<span className="text-amber-300 font-bold">换掉</span>的手牌（将洗回牌库并补抽同等数量）；满意直接确认。
          </p>
        </div>

        <div className="flex justify-center gap-3 flex-wrap my-5 min-h-[200px]">
          {hand.map((c) => {
            const preset = getPreset(c.defId);
            const def = getCardDef(c.defId);
            if (!preset || !def) return null;
            const isMarked = marked.has(c.instanceId);
            return (
              <button key={c.instanceId} onClick={() => toggle(c.instanceId)}
                      className={`relative transition-transform ${isMarked ? 'scale-95 opacity-50 grayscale' : 'hover:-translate-y-2'}`}>
                <CardFrame
                  name={preset.name}
                  image={preset.imagePath ?? ''}
                  type={preset.type}
                  rarity={preset.rarity}
                  cost={c.currentCost}
                  attack={preset.attack}
                  health={preset.health}
                  description={preset.description}
                  flavor={preset.flavor}
                  width={140}
                  interactive={false}
                />
                {isMarked && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-rose-500 text-white font-black text-2xl px-4 py-1 rounded-full border-4 border-white shadow-2xl rotate-[-10deg]">
                      换掉
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="text-white/60 text-sm">
            已标记 <span className="text-amber-300 font-bold text-base">{markedCount}</span> / {hand.length} 张
          </div>
          <div className="flex gap-2">
            <button onClick={() => setMarked(new Set())}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">
              清空选择
            </button>
            <button onClick={() => onConfirm(Array.from(marked))}
                    className="inline-flex items-center gap-1.5 px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-lg shadow-lg cursor-pointer transition-colors">
              <Icons.CheckIcon size={14} /> 确认{markedCount > 0 ? `换 ${markedCount} 张` : '（不换）'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ 帮助弹窗 ============

// 帮助弹窗：完整术语词典 + 基础玩法
export function HelpModal({ onClose }: { onClose: () => void }) {
  const mechanicEntries: Array<[string, DictEntry]> = [
    ['登场', MECHANIC_DICT['登场']], ['退场', MECHANIC_DICT['退场']],
    ['联动', MECHANIC_DICT['联动']], ['重播', MECHANIC_DICT['重播']],
    ['暗箱', MECHANIC_DICT['暗箱']],
    ['即时', MECHANIC_DICT['即时']], ['装备时', MECHANIC_DICT['装备时']],
    ['场地', MECHANIC_DICT['场地']],
  ];
  const keywordEntries = Object.values(KEYWORD_DICT);
  const typeCards: Array<{ Icon: React.ComponentType<{ className?: string; size?: number }>; label: string; desc: string; color: string }> = [
    { Icon: Icons.CharacterIcon, label: '角色', desc: '上场单位，自带攻击与生命',   color: 'text-pink-200' },
    { Icon: Icons.ItemIcon,      label: '道具', desc: '即时 / 延时消耗品',            color: 'text-emerald-200' },
    { Icon: Icons.EquipmentIcon, label: '装备', desc: '武器 / 防具，装备到玩家槽位',  color: 'text-sky-200' },
    { Icon: Icons.EffectIcon,    label: '消耗', desc: '一次性效果牌',                 color: 'text-amber-200' },
    { Icon: Icons.EventIcon,     label: '事件', desc: '场地倒计时 / 暗箱触发',        color: 'text-violet-200' },
  ];
  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto"
         onClick={onClose}>
      <div className="bg-slate-900 border-2 border-[#A78BFA]/40 rounded-xl max-w-3xl w-full p-3 sm:p-4 shadow-2xl max-h-[90vh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 sticky top-0 bg-slate-900 pb-2 border-b border-white/10">
          <h2 className="text-base sm:text-lg font-black text-[#A78BFA] tracking-wider uppercase">卡牌与术语说明</h2>
          <button onClick={onClose} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-white text-xs cursor-pointer transition-colors">
            <Icons.CloseIcon size={12} /> 关闭
          </button>
        </div>

        {/* 基本玩法 */}
        <section className="mb-3">
          <h3 className="text-lime-300 font-bold text-sm mb-1.5 tracking-wider uppercase">基本玩法</h3>
          <ul className="space-y-0.5 text-xs text-white/80 leading-snug">
            <li>· 每回合开始抽 1 张牌，流量上限 +1（最高 10）；流量每回合自动回满。</li>
            <li>· <span className="text-cyan-300 font-bold">打出手牌</span>：点击手牌；需要目标的消耗牌再选一个目标。</li>
            <li>· <span className="text-rose-300 font-bold">发动攻击</span>：点击己方角色 → 再点击对方角色或玩家。</li>
            <li>· 有<span className="text-stone-300 font-bold">挡枪</span>的敌方角色必须先被清除才能打其它目标。</li>
            <li>· 让对方玩家流量降到 0 即获胜。</li>
          </ul>
        </section>

        {/* 卡牌类型 */}
        <section className="mb-3">
          <h3 className="text-cyan-300 font-bold text-sm mb-1.5 tracking-wider uppercase">卡牌 5 大类</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
            {typeCards.map(({ Icon, label, desc, color }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded p-1.5 flex gap-1.5 items-start">
                <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                <div>
                  <div className={`font-bold ${color}`}>{label}</div>
                  <div className="text-white/70 mt-0.5 leading-tight">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 机制关键字 */}
        <section className="mb-3">
          <h3 className="text-[#A78BFA] font-bold text-sm mb-1.5 tracking-wider uppercase">机制关键字（描述中的【XXX】）</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {mechanicEntries.map(([name, info]) => {
              const Ico = info.Icon;
              return (
                <div key={name} className="bg-white/5 border border-white/10 rounded p-1.5 flex gap-1.5 items-start">
                  <Ico className="w-3.5 h-3.5 shrink-0 text-[#C4B5FD] mt-0.5" />
                  <div>
                    <div className="font-bold text-[#C4B5FD] text-xs">【{name}】</div>
                    <div className="text-white/70 text-[11px] mt-0.5 leading-tight">{info.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 角色关键字 */}
        <section>
          <h3 className="text-emerald-300 font-bold text-sm mb-1.5 tracking-wider uppercase">角色属性关键字</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {keywordEntries.map((k) => {
              const Ico = k.Icon;
              return (
                <div key={k.name} className="bg-white/5 border border-white/10 rounded p-1.5 flex gap-1.5 items-start">
                  <Ico className="w-3.5 h-3.5 shrink-0 text-emerald-300 mt-0.5" />
                  <div>
                    <div className="font-bold text-emerald-200 text-xs">{k.name}</div>
                    <div className="text-white/70 text-[11px] mt-0.5 leading-tight">{k.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mt-3 text-[11px] text-white/40 text-center">
          想知道具体某张牌？把鼠标放到卡牌上会自动弹出详情 + 关键字解释。
        </div>
      </div>
    </div>
  );
}

// ============ Speaker 图标（静音切换按钮使用） ============

export function SpeakerOnIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  );
}
export function SpeakerOffIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <line x1="22" y1="9" x2="16" y2="15"/>
      <line x1="16" y1="9" x2="22" y2="15"/>
    </svg>
  );
}
