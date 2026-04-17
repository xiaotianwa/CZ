'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import CardFrame, { CardRarity, CardType, CardSubtype } from '@/components/game/CardFrame';
import { drawCard, fileToImage } from '@/lib/game/drawCard';
import { CARD_PRESETS, CardPreset, findPreset } from '@/data/cardPresets';
import * as Icons from '@/components/game/GameIcons';

// ============ 类型 ============

interface CardDraft {
  name: string;
  type: CardType;
  subtype?: CardSubtype;
  rarity: CardRarity;
  cost: number | '';
  attack: number | '';
  health: number | '';
  description: string;
  flavor: string;
}

const DEFAULT_DRAFT: CardDraft = {
  name: '陈泽',
  type: 'character',
  rarity: 'SSR',
  cost: 8,
  attack: 7,
  health: 9,
  description: '【登场】对方所有角色 -1/-0；联动：与「典中典」同场攻击 +3',
  flavor: '流量的尽头，是陈泽',
};

// 根据类型推算可选 subtype 选项（UI 用）
const SUBTYPE_OPTIONS: Record<CardType, Array<{ v: CardSubtype; l: string }>> = {
  character: [],
  item:      [{ v: 'instant', l: '即时' }, { v: 'delayed', l: '延时' }],
  equipment: [{ v: 'weapon',  l: '武器' }, { v: 'armor',   l: '防具' }],
  effect:    [],
  event:     [],
};

// ============ 页面 ============

export default function CardMakerPage() {
  const [draft, setDraft] = useState<CardDraft>(DEFAULT_DRAFT);
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 上传图片
  const handleFile = useCallback(async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('图片过大（> 10MB），建议压缩后上传');
      return;
    }
    try {
      const img = await fileToImage(file);
      setImageEl(img);
      setImageDataUrl(img.src);
    } catch {
      alert('图片读取失败');
    }
  }, []);

  // 粘贴 URL
  const handleUrl = useCallback(async (url: string) => {
    setImageDataUrl(url);
    if (!url) { setImageEl(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImageEl(img);
    img.onerror = () => setImageEl(null);
    img.src = url;
  }, []);

  // 加载预设卡
  const loadPreset = useCallback((preset: CardPreset | undefined) => {
    if (!preset) return;
    setDraft({
      name: preset.name,
      type: preset.type,
      subtype: preset.subtype,
      rarity: preset.rarity,
      cost: preset.cost ?? '',
      attack: preset.attack ?? '',
      health: preset.health ?? '',
      description: preset.description ?? '',
      flavor: preset.flavor ?? '',
    });
    if (preset.imagePath) {
      // imagePath 已由 cardPresets 的 resolveImagePath 统一编码（本地 or CDN），直接加载
      handleUrl(preset.imagePath);
    } else {
      setImageDataUrl('');
      setImageEl(null);
    }
  }, [handleUrl]);

  // 启动时读取 URL ?preset=C14
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search).get('preset');
    if (p) loadPreset(findPreset(p));
  }, [loadPreset]);

  // Canvas 实时渲染
  useEffect(() => {
    if (!canvasRef.current) return;
    drawCard(canvasRef.current, {
      name: draft.name,
      image: imageEl,
      type: draft.type,
      rarity: draft.rarity,
      cost: draft.cost === '' ? undefined : Number(draft.cost),
      attack: draft.attack === '' ? undefined : Number(draft.attack),
      health: draft.health === '' ? undefined : Number(draft.health),
      description: draft.description,
      flavor: draft.flavor,
    });
  }, [draft, imageEl]);

  // 下载 PNG
  const handleDownload = useCallback(() => {
    if (!canvasRef.current) return;
    setRendering(true);
    try {
      canvasRef.current.toBlob((blob) => {
        setRendering(false);
        if (!blob) {
          alert('导出失败：浏览器未返回图片数据');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeName = (draft.name || 'card').replace(/[\\/:*?"<>|]/g, '_');
        a.download = `${safeName}_${draft.rarity}_750x1050.png`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, 'image/png');
    } catch (e: any) {
      setRendering(false);
      // 跨域图片会导致 canvas tainted，toBlob 抛 SecurityError
      if (e?.name === 'SecurityError') {
        alert('图片跨域受限：请改用「上传本地图片」而非外链 URL');
      } else {
        alert('导出失败：' + (e?.message ?? e));
      }
    }
  }, [draft.name, draft.rarity]);

  // 重置
  const handleReset = () => {
    setDraft(DEFAULT_DRAFT);
    setImageDataUrl('');
    setImageEl(null);
  };

  // 拖拽上传
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div className="relative pt-6 pb-14 px-4">
      {/* 背景光效 */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/3 w-[520px] h-[520px] rounded-full bg-[#7C3AED] opacity-[0.08] blur-[130px]" />
        <div className="absolute top-1/2 right-0 w-[420px] h-[420px] rounded-full bg-cyan-500 opacity-[0.05] blur-[120px]" />
      </div>
      <div className="relative z-10 max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] text-[#A78BFA]/80 mb-2">
            <span className="inline-block w-6 h-px bg-[#A78BFA]/60" /> CARD MAKER <span className="inline-block w-6 h-px bg-[#A78BFA]/60" />
          </div>
          <h1 className="neon-heading text-3xl md:text-4xl">陈泽传媒卡牌制作器</h1>
          <p className="mt-3 text-white/60 text-sm">
            上传图片 · 填写属性 · 一键生成 <b className="text-[#A78BFA]">750×1050 PNG</b>
            <span className="mx-2 text-white/20">·</span>
            Logo: <span className="font-display text-[#A78BFA] tracking-[0.3em]">1103</span>
          </p>
        </header>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* 左：表单 */}
          <div className="glass-card rounded-2xl p-5 space-y-6">
            {/* 预设选择 */}
            <section>
              <SectionHeader step={0} Icon={Icons.LogIcon} title="加载预设卡" subtitle="一键填入数据 + 自动加载图片" />
              <select
                className="input-dark"
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) loadPreset(findPreset(id));
                  e.target.value = '';
                }}
              >
                <option value="">-- 选择一张预设卡 --</option>
                <optgroup label="角色 Character">
                  {CARD_PRESETS.filter((p) => p.type === 'character').map((p) => (
                    <option key={p.id} value={p.id}>{p.id} · {p.name}（{p.rarity}）</option>
                  ))}
                </optgroup>
                <optgroup label="道具 Item">
                  {CARD_PRESETS.filter((p) => p.type === 'item').map((p) => (
                    <option key={p.id} value={p.id}>{p.id} · {p.name}（{p.rarity}）</option>
                  ))}
                </optgroup>
                <optgroup label="装备 Equipment">
                  {CARD_PRESETS.filter((p) => p.type === 'equipment').map((p) => (
                    <option key={p.id} value={p.id}>{p.id} · {p.name}（{p.rarity}）</option>
                  ))}
                </optgroup>
                <optgroup label="消耗 Effect">
                  {CARD_PRESETS.filter((p) => p.type === 'effect').map((p) => (
                    <option key={p.id} value={p.id}>{p.id} · {p.name}（{p.rarity}）</option>
                  ))}
                </optgroup>
                <optgroup label="事件 Event">
                  {CARD_PRESETS.filter((p) => p.type === 'event').map((p) => (
                    <option key={p.id} value={p.id}>{p.id} · {p.name}（{p.rarity}）</option>
                  ))}
                </optgroup>
              </select>
              <p className="text-[11px] text-white/40 mt-1.5">
                直接访问 <code className="text-[#FBBF24]">?preset=C14</code> 也可自动加载
              </p>
            </section>

            <div className="border-t border-white/5" />

            {/* 图片上传区 */}
            <section>
              <SectionHeader step={1} Icon={Icons.ImageIcon} title="上传人物 / 道具图片" subtitle="拖拽 · 文件选择 · 粘贴 URL" />
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="border-2 border-dashed border-white/15 rounded-xl p-4 hover:border-[#A78BFA]/60 hover:bg-[#7C3AED]/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {imageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageDataUrl}
                      alt="preview"
                      className="w-20 h-28 object-cover rounded-lg border border-white/20"
                    />
                  ) : (
                    <div className="w-20 h-28 rounded-lg bg-white/5 flex items-center justify-center text-white/30 border border-white/10">
                      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="M21 16 16 11 6 21" /></svg>
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-xs text-white/80 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[#A78BFA] file:text-[#0F0F23] file:font-bold file:cursor-pointer hover:file:bg-[#C4B5FD] file:transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="或粘贴图片 URL（可选）"
                      value={imageDataUrl.startsWith('data:') ? '' : imageDataUrl}
                      onChange={(e) => handleUrl(e.target.value)}
                      className="input-dark"
                    />
                    <p className="text-[11px] text-white/40">支持拖拽 · 建议 PNG 透明底 3:4 · ≤ 10MB</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 基础信息 */}
            <section>
              <SectionHeader step={2} Icon={Icons.CharacterIcon} title="基础信息" subtitle="名称 · 类型 · 稀有度" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="名称">
                  <input
                    className="input-dark"
                    value={draft.name}
                    maxLength={12}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="4-8 字最佳"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="类型">
                    <select
                      className="input-dark"
                      value={draft.type}
                      onChange={(e) => {
                        const nextType = e.target.value as CardType;
                        // 切换类型时，清掉不适用的 subtype
                        const opts = SUBTYPE_OPTIONS[nextType];
                        const nextSub = opts.find((o) => o.v === draft.subtype)?.v
                          ?? opts[0]?.v;
                        setDraft({ ...draft, type: nextType, subtype: nextSub });
                      }}
                    >
                      <option value="character">角色</option>
                      <option value="item">道具</option>
                      <option value="equipment">装备</option>
                      <option value="effect">消耗</option>
                      <option value="event">事件</option>
                    </select>
                  </Field>
                  <Field label="稀有度">
                    <select
                      className="input-dark"
                      value={draft.rarity}
                      onChange={(e) => setDraft({ ...draft, rarity: e.target.value as CardRarity })}
                    >
                      <option value="N">N 普通</option>
                      <option value="R">R 稀有</option>
                      <option value="SR">SR 史诗</option>
                      <option value="SSR">SSR 传说</option>
                    </select>
                  </Field>
                </div>
              </div>
              {/* 子分类（仅道具 / 装备显示） */}
              {SUBTYPE_OPTIONS[draft.type].length > 0 && (
                <div className="mt-3">
                  <Field label={draft.type === 'item' ? '道具子类' : '装备子类'}>
                    <select
                      className="input-dark"
                      value={draft.subtype ?? ''}
                      onChange={(e) => setDraft({ ...draft, subtype: (e.target.value || undefined) as CardSubtype })}
                    >
                      {SUBTYPE_OPTIONS[draft.type].map((o) => (
                        <option key={o.v} value={o.v}>{o.l}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
            </section>

            {/* 数值 */}
            <section>
              <SectionHeader step={3} Icon={Icons.ManaIcon} title="数值" subtitle="留空则卡面不显示该项" />
              <div className="grid grid-cols-3 gap-3">
                <Field label="能量">
                  <input
                    type="number"
                    className="input-dark"
                    value={draft.cost}
                    onChange={(e) => setDraft({ ...draft, cost: e.target.value === '' ? '' : Number(e.target.value) })}
                  />
                </Field>
                <Field label="攻击">
                  <input
                    type="number"
                    className="input-dark"
                    value={draft.attack}
                    onChange={(e) => setDraft({ ...draft, attack: e.target.value === '' ? '' : Number(e.target.value) })}
                  />
                </Field>
                <Field label="生命">
                  <input
                    type="number"
                    className="input-dark"
                    value={draft.health}
                    onChange={(e) => setDraft({ ...draft, health: e.target.value === '' ? '' : Number(e.target.value) })}
                  />
                </Field>
              </div>
            </section>

            {/* 描述 */}
            <section>
              <SectionHeader step={4} Icon={Icons.EffectIcon} title="卡牌描述" subtitle="支持【XXX】关键字 · ≤ 80 字" />
              <textarea
                className="input-dark min-h-[72px] resize-y"
                value={draft.description}
                maxLength={80}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="如：【登场】对手流量 -2；【联动】与「典中典」同场时伤害 +3"
              />
              <div className="text-right text-[11px] text-white/40 mt-1">{draft.description.length}/80</div>
            </section>

            {/* flavor */}
            <section>
              <SectionHeader step={5} Icon={Icons.StealthIcon} title="台词飘字" subtitle="料网风 · 人设一句话 · ≤ 25 字" />
              <input
                className="input-dark"
                value={draft.flavor}
                maxLength={25}
                onChange={(e) => setDraft({ ...draft, flavor: e.target.value })}
                placeholder="一句话人设台词，可选"
              />
            </section>

            {/* 动作按钮 */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleDownload}
                disabled={rendering}
                className="btn-neon-primary flex-1 py-2.5 rounded-lg font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                {rendering ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    生成中...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    下载 PNG（750×1050）
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                className="btn-ghost px-4 py-2.5 rounded-lg font-bold cursor-pointer"
              >
                重置
              </button>
            </div>
          </div>

          {/* 右：预览 */}
          <div className="space-y-4 lg:sticky lg:top-4 h-fit">
            <div className="relative glass-card rounded-2xl p-4 overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#A78BFA]/60 to-transparent" />
              <div className="flex items-center justify-center gap-2 text-[#A78BFA]/75 text-[10px] tracking-[0.35em] mb-3 uppercase font-bold">
                <span className="inline-block w-6 h-px bg-[#A78BFA]/50" />
                Live Preview
                <span className="inline-block w-6 h-px bg-[#A78BFA]/50" />
              </div>
              <div className="flex justify-center py-1">
                <CardFrame
                  name={draft.name || '未命名'}
                  image={imageDataUrl}
                  type={draft.type}
                  subtype={draft.subtype}
                  rarity={draft.rarity}
                  cost={draft.cost === '' ? undefined : Number(draft.cost)}
                  attack={draft.attack === '' ? undefined : Number(draft.attack)}
                  health={draft.health === '' ? undefined : Number(draft.health)}
                  description={draft.description}
                  flavor={draft.flavor}
                  width={260}
                  interactive={false}
                />
              </div>
            </div>

            <details className="glass-card rounded-2xl">
              <summary className="p-3 cursor-pointer text-white/60 text-[11px] tracking-[0.25em] uppercase text-center hover:text-white transition-colors">
                Canvas 输出源
              </summary>
              <div className="p-3 pt-0 flex justify-center">
                <canvas
                  ref={canvasRef}
                  className="max-w-full h-auto rounded-lg border border-white/10"
                  style={{ width: '280px' }}
                />
              </div>
            </details>
          </div>
        </div>

        <footer className="mt-10 text-center text-white/30 text-[11px] tracking-[0.2em] uppercase">
          © 1103 · Card Maker v1
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-white/60 text-xs mb-1">{label}</span>
      {children}
    </label>
  );
}

function SectionHeader({
  step, Icon, title, subtitle,
}: {
  step: number;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="inline-flex w-7 h-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#A855F7] text-white font-black text-xs tabular-nums shadow-[0_4px_12px_-3px_rgba(124,58,237,0.6)]">
        {step.toString().padStart(2, '0')}
      </span>
      <Icon className="w-4 h-4 text-[#A78BFA]" />
      <div className="flex-1 min-w-0">
        <div className="text-white font-semibold text-sm leading-tight">{title}</div>
        {subtitle && <div className="text-white/40 text-[11px] leading-tight mt-0.5">{subtitle}</div>}
      </div>
      <span className="hidden sm:block flex-1 h-px bg-gradient-to-r from-[#A78BFA]/20 to-transparent" />
    </div>
  );
}
