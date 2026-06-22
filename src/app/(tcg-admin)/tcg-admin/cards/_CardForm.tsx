'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, AlertCircle, BookOpen, ListChecks } from 'lucide-react';
import SynergyEditor from './_SynergyEditor';
import ImageUploader from './_ImageUploader';
import EffectHookEditor from './_EffectHookEditor';
import CardPreview from './_CardPreview';
import type { CardSynergy } from '@/lib/tcg/synergy';
import type { CardEffectHook } from '@/lib/tcg/effectHooks';

export interface CardFormData {
  id: string;
  name: string;
  type: 'character' | 'item' | 'equipment' | 'effect' | 'event';
  subtype: string | null;
  rarity: 'N' | 'R' | 'SR' | 'SSR';
  cost: number;
  attack: number | null;
  health: number | null;
  description: string;
  flavor: string | null;
  imagePath: string | null;
  effectHooks: CardEffectHook[];
  keywords: string[];
  synergies: CardSynergy[];
  seasonId: string | null;
  status: 'active' | 'disabled' | 'draft';
  sortOrder: number;
}

export const DEFAULT_FORM: CardFormData = {
  id: '',
  name: '',
  type: 'character',
  subtype: null,
  rarity: 'N',
  cost: 1,
  attack: null,
  health: null,
  description: '',
  flavor: null,
  imagePath: null,
  effectHooks: [],
  keywords: [],
  synergies: [],
  seasonId: null,
  status: 'active',
  sortOrder: 0,
};

// 注意：只列 engine `Keyword` 类型枚举（src/game/types.ts:24-38）真实存在的关键字。
// battlecry / deathrattle / onEquip / secret 是 EffectTrigger 或事件卡 kind，不是 Keyword。
const KEYWORD_OPTIONS = [
  { value: 'taunt', label: '挡枪' },
  { value: 'charge', label: '紧急通告' },
  { value: 'rush', label: '试水' },
  { value: 'windfury', label: '双开' },
  { value: 'stealth', label: '潜水' },
  { value: 'poisonous', label: '封杀' },
  { value: 'lifesteal', label: '吸粉' },
  { value: 'divineShield', label: '粉丝盾' },
  { value: 'reborn', label: '复出' },
  { value: 'overload', label: '透支' },
  { value: 'discover', label: '挖掘' },
  { value: 'swap', label: '换号' },
  { value: 'combo', label: '联动' },
  { value: 'echo', label: '重播' },
];

export default function CardForm({
  mode,
  initial,
}: {
  mode: 'create' | 'edit';
  initial: CardFormData;
}) {
  const router = useRouter();
  const [form, setForm] = useState<CardFormData>(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof CardFormData>(key: K, value: CardFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const toggleKeyword = (k: string) => {
    setForm((f) => ({
      ...f,
      keywords: f.keywords.includes(k)
        ? f.keywords.filter((x) => x !== k)
        : [...f.keywords, k],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const url = mode === 'create'
        ? '/api/tcg/admin/cards'
        : `/api/tcg/admin/cards/${encodeURIComponent(form.id)}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      // PATCH 不传 id
      const body: Partial<CardFormData> = { ...form };
      if (mode === 'edit') delete body.id;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.code !== 0) {
        setError(json.message || '保存失败');
        return;
      }
      router.push('/tcg-admin/cards');
      router.refresh();
    } catch {
      setError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const showAttackHealth = form.type === 'character' || form.type === 'equipment';

  return (
    <div className="grid gap-6 items-start lg:grid-cols-[minmax(0,1fr)_320px]">
    <form onSubmit={handleSubmit} className="space-y-6 min-w-0">
      <div className="flex items-center gap-3">
        <Link
          href="/tcg-admin/cards"
          className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Russo One', 'Chakra Petch', sans-serif" }}>
            {mode === 'create' ? '新建卡牌' : `编辑卡牌 · ${form.id}`}
          </h2>
          <p className="text-sm text-white/50 mt-0.5">
            {mode === 'create' ? '新增卡池卡牌，填写完成后保存即可' : '所有修改会写入审计日志（before/after）'}
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="h-9 px-5 rounded-lg text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
            boxShadow: '0 0 0 1px rgba(124,58,237,0.25), 0 6px 20px -8px rgba(124,58,237,0.6)',
          }}
        >
          <Save className="w-4 h-4" />
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <BookOpen className="w-4 h-4 text-[#A78BFA]" />
          新手填写顺序
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
          <QuickStep index="1" title="基础信息" text="先填 ID、名称、类型和费用。" />
          <QuickStep index="2" title="数值" text="角色和装备再填攻击、生命或耐久。" />
          <QuickStep index="3" title="普通效果" text="这张卡自己什么时候做什么。" />
          <QuickStep index="4" title="卡牌联动" text="和指定搭档同时上场才触发的组合技。" />
        </div>
      </div>

      {/* 基础信息 */}
      <Section title="基础信息">
        <Field label="卡牌 ID" required hint="字母+数字，如 C01 / I08 / E12 / V06，创建后不可修改">
          <input
            value={form.id}
            disabled={mode === 'edit'}
            onChange={(e) => update('id', e.target.value.toUpperCase())}
            placeholder="C01"
            className="input-tcg disabled:opacity-50 disabled:cursor-not-allowed"
            required
            pattern="^[A-Z]\d{2,3}$"
          />
        </Field>
        <Field label="卡牌名称" required>
          <input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="主播·陈泽"
            className="input-tcg"
            maxLength={50}
            required
          />
        </Field>
        <Field label="类型" required>
          <select
            value={form.type}
            onChange={(e) => update('type', e.target.value as CardFormData['type'])}
            className="input-tcg"
          >
            <option value="character">角色 Character</option>
            <option value="item">道具 Item</option>
            <option value="equipment">装备 Equipment</option>
            <option value="effect">消耗 Effect</option>
            <option value="event">事件 Event</option>
          </select>
        </Field>
        <Field label="子分类" hint="仅 道具 / 装备 使用">
          <select
            value={form.subtype ?? ''}
            onChange={(e) => update('subtype', e.target.value || null)}
            className="input-tcg"
          >
            <option value="">—</option>
            <option value="instant">即时 Instant（道具）</option>
            <option value="delayed">延时 Delayed（道具）</option>
            <option value="weapon">武器 Weapon（装备）</option>
            <option value="armor">防具 Armor（装备）</option>
          </select>
        </Field>
        <Field label="稀有度" required>
          <select
            value={form.rarity}
            onChange={(e) => update('rarity', e.target.value as CardFormData['rarity'])}
            className="input-tcg"
          >
            <option value="N">N</option>
            <option value="R">R</option>
            <option value="SR">SR</option>
            <option value="SSR">SSR</option>
          </select>
        </Field>
        <Field label="排序值" hint="升序，数字越小越靠前">
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => update('sortOrder', Number(e.target.value))}
            className="input-tcg"
          />
        </Field>
      </Section>

      {/* 数值 */}
      <Section title="数值">
        <Field label="费用" required>
          <input
            type="number"
            min={0}
            max={99}
            value={form.cost}
            onChange={(e) => update('cost', Number(e.target.value))}
            className="input-tcg"
          />
        </Field>
        {showAttackHealth && (
          <>
            <Field label="攻击">
              <input
                type="number"
                min={0}
                max={99}
                value={form.attack ?? ''}
                onChange={(e) => update('attack', e.target.value === '' ? null : Number(e.target.value))}
                className="input-tcg"
              />
            </Field>
            <Field label="生命 / 耐久">
              <input
                type="number"
                min={0}
                max={99}
                value={form.health ?? ''}
                onChange={(e) => update('health', e.target.value === '' ? null : Number(e.target.value))}
                className="input-tcg"
              />
            </Field>
          </>
        )}
      </Section>

      {/* 文案 */}
      <Section title="文案" cols={1}>
        <Field label="规则描述" required hint="含【关键字】的规则说明">
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={3}
            className="input-tcg resize-none"
            required
          />
        </Field>
        <Field label="Flavor 台词" hint="卡底飘字，≤ 25 字最佳">
          <input
            value={form.flavor ?? ''}
            onChange={(e) => update('flavor', e.target.value || null)}
            className="input-tcg"
            maxLength={50}
          />
        </Field>
      </Section>

      {/* 素材 */}
      <Section title="素材 · 卡牌图" cols={1}>
        <ImageUploader
          value={form.imagePath}
          onChange={(next) => update('imagePath', next)}
          placeholder="JPG / PNG / WebP · 建议 300×420（卡牌竖版比例）· 最大 8MB"
        />
      </Section>

      {/* 卡牌联动 */}
      <Section title="卡牌联动：和谁一起上场会触发" cols={1}>
        <div className="mb-3 px-3 py-2 rounded-md bg-[#7C3AED]/[0.06] border border-[#7C3AED]/15 text-[11px] text-white/60 leading-relaxed">
          <div className="text-[#A78BFA] font-semibold mb-0.5">直白规则</div>
          联动不是普通效果。它只在“本卡 + 搭档卡”满足条件时触发。小白只需要按顺序填：搭档卡、触发条件、谁吃效果、触发后做什么。
          建议同一组联动只配置在一张主卡上，避免重复触发。
        </div>
        <SynergyEditor
          selfId={form.id}
          value={form.synergies}
          onChange={(next) => update('synergies', next)}
        />
      </Section>

      <Section title="关键字" cols={1}>
        <div className="flex flex-wrap gap-2">
          {KEYWORD_OPTIONS.map((k) => {
            const selected = form.keywords.includes(k.value);
            return (
              <button
                key={k.value}
                type="button"
                onClick={() => toggleKeyword(k.value)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-all cursor-pointer ${
                  selected
                    ? 'bg-[#7C3AED]/25 border-[#7C3AED]/50 text-white'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                <span className="font-medium">{k.label}</span>
                <span className="ml-1.5 opacity-50 text-[10px]">{k.value}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* 效果钩子 */}
      <Section title="普通效果：这张卡什么时候做什么" cols={1}>
        <div className="mb-3 px-3 py-2 rounded-md bg-[#7C3AED]/[0.06] border border-[#7C3AED]/15 text-[11px] text-white/60 leading-relaxed">
          <div className="text-[#A78BFA] font-semibold mb-0.5">直白规则</div>
          “钩子”就是触发时机。比如：登场时抽 1 张、死亡时打敌方 2 点、装备时回血。先选技能，再确认什么时候触发。
        </div>
        <EffectHookEditor
          value={form.effectHooks}
          onChange={(next) => update('effectHooks', next)}
        />
      </Section>

      {/* 发布状态 */}
      <Section title="高级">
        <Field label="发布状态">
          <select
            value={form.status}
            onChange={(e) => update('status', e.target.value as CardFormData['status'])}
            className="input-tcg"
          >
            <option value="active">active · 启用</option>
            <option value="draft">draft · 草稿</option>
            <option value="disabled">disabled · 停用</option>
          </select>
        </Field>
      </Section>
      {/* .input-tcg / .tcg-section-title / .tcg-hint 样式已迁移到 globals.css 的 .tcg-shell 作用域 */}
    </form>

    {/* 右侧 sticky 实时预览 —— xl 断点以上显示，以下自动堆叠到下方 */}
    <aside className="lg:sticky lg:top-[4.5rem] lg:self-start">
      <CardPreview form={form} />
    </aside>
    </div>
  );
}

function QuickStep({ index, title, text }: { index: string; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0f0f23]/50 p-3">
      <div className="flex items-center gap-2">
        <span className="h-5 w-5 rounded-full bg-[#7C3AED]/25 border border-[#7C3AED]/40 text-[#C4B5FD] text-[11px] font-semibold flex items-center justify-center">
          {index}
        </span>
        <span className="text-xs font-semibold text-white/85 flex items-center gap-1.5">
          {index === '3' && <ListChecks className="w-3 h-3 text-[#A78BFA]" />}
          {title}
        </span>
      </div>
      <p className="text-[11px] leading-relaxed text-white/45 mt-1.5">{text}</p>
    </div>
  );
}

function Section({ title, children, cols = 2 }: { title: string; children: React.ReactNode; cols?: 1 | 2 | 3 }) {
  const gridCls = cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3';
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-[#141432]/60 to-[#0f0f23]/60 p-5 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.15)]">
      <div className="tcg-section-title">{title}</div>
      <div className={`grid ${gridCls} gap-4`}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-white mb-1.5 block">
        {label}
        {required && <span className="text-rose-400 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="tcg-hint mt-1.5">{hint}</p>}
    </div>
  );
}
