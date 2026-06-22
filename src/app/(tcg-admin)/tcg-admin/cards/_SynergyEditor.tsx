'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Link2,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import {
  type CardSynergy,
  type CardSynergyEffect,
  type SynergyEffectKind,
  SYNERGY_EFFECT_KINDS,
  createEmptySynergy,
  createEmptyEffect,
  describeEffect,
} from '@/lib/tcg/synergy';

interface CardRow {
  id: string;
  name: string;
  type: string;
  rarity: string;
  imagePath: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  character: '角色',
  item: '道具',
  equipment: '装备',
  effect: '消耗',
  event: '事件',
};

const TRIGGER_COPY: Record<CardSynergy['trigger'], { label: string; hint: string }> = {
  both_in_play: {
    label: '本卡和搭档同时在场',
    hint: '最常用。谁后上场都可以触发一次。',
  },
  partner_equipped: {
    label: '搭档装备上场',
    hint: '用于专属武器、专属装备这类组合。',
  },
  partner_in_hand: {
    label: '搭档在手牌里',
    hint: '当前主要作为提示型条件，谨慎使用。',
  },
};

const SCOPE_COPY: Record<CardSynergy['scope'], { label: string; hint: string }> = {
  self: { label: '只给本卡', hint: '例如：本卡攻击 +2。' },
  partner: { label: '只给搭档', hint: '例如：搭档获得护盾。' },
  both: { label: '本卡和搭档都给', hint: '例如：双方攻击 +1。' },
  all_allies: { label: '己方全体', hint: '例如：己方所有角色攻击 +1。' },
};

const DURATION_COPY: Record<CardSynergyEffect['duration'], { label: string; hint: string }> = {
  permanent: { label: '永久', hint: '推荐。触发后直接结算。' },
  turn: { label: '本回合', hint: '当前引擎会按触发结算处理。' },
  while_paired: { label: '联动期间', hint: '当前引擎会按触发结算处理。' },
};

const KEYWORD_OPTIONS = [
  { value: 'taunt', label: '挡枪' },
  { value: 'charge', label: '紧急通告' },
  { value: 'rush', label: '试水' },
  { value: 'stealth', label: '潜水' },
  { value: 'divineShield', label: '粉丝盾' },
  { value: 'lifesteal', label: '吸粉' },
  { value: 'windfury', label: '双开' },
  { value: 'poisonous', label: '封杀' },
];

const EFFECT_TEMPLATES: Array<{
  label: string;
  description: string;
  scope: CardSynergy['scope'];
  effect: CardSynergyEffect;
}> = [
  {
    label: '双方攻击 +1',
    description: '适合人物组合，简单好理解。',
    scope: 'both',
    effect: { kind: 'attack_buff', amount: 1, duration: 'permanent' },
  },
  {
    label: '本卡攻击 +2',
    description: '适合核心人物吃加成。',
    scope: 'self',
    effect: { kind: 'attack_buff', amount: 2, duration: 'permanent' },
  },
  {
    label: '搭档获得护盾',
    description: '适合保护搭档。',
    scope: 'partner',
    effect: { kind: 'shield', duration: 'permanent' },
  },
  {
    label: '触发后抽 1 张',
    description: '适合轻量补牌。',
    scope: 'self',
    effect: { kind: 'draw_card', amount: 1, duration: 'permanent' },
  },
];

export default function SynergyEditor({
  selfId,
  value,
  onChange,
}: {
  selfId: string;
  value: CardSynergy[];
  onChange: (next: CardSynergy[]) => void;
}) {
  const [allCards, setAllCards] = useState<CardRow[]>([]);
  const [loadingPool, setLoadingPool] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetch('/api/tcg/admin/cards?pageSize=200', { credentials: 'same-origin' })
      .then((response) => response.json())
      .then((json) => {
        if (json.code === 0) {
          setAllCards((json.data?.list ?? []) as CardRow[]);
        }
      })
      .finally(() => setLoadingPool(false));
  }, []);

  const cardMap = useMemo(() => {
    const map = new Map<string, CardRow>();
    for (const card of allCards) map.set(card.id, card);
    return map;
  }, [allCards]);

  const addSynergy = () => {
    const synergy: CardSynergy = {
      ...createEmptySynergy(),
      name: '新联动',
      scope: 'both',
      effects: [{ kind: 'attack_buff', amount: 1, duration: 'permanent' }],
    };
    onChange([...value, synergy]);
    setExpandedId(synergy.id);
  };

  const updateSynergy = (id: string, patch: Partial<CardSynergy>) => {
    onChange(value.map((synergy) => (synergy.id === id ? { ...synergy, ...patch } : synergy)));
  };

  const removeSynergy = (id: string) => {
    if (!confirm('确认删除这条联动？')) return;
    onChange(value.filter((synergy) => synergy.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MiniGuide index="1" title="选搭档" text="这张卡要和哪张卡组成组合。" />
        <MiniGuide index="2" title="选时机" text="默认用“同时在场”，最不容易出错。" />
        <MiniGuide index="3" title="选效果" text="写清楚谁吃效果、吃什么效果。" />
      </div>

      {value.length === 0 && (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-6 text-center">
          <Link2 className="w-6 h-6 text-[#A78BFA]/70 mx-auto mb-2" />
          <p className="text-sm text-white/60">还没有联动</p>
          <p className="text-[11px] text-white/35 mt-1">
            不需要组合技就可以留空；需要组合技就添加一条。
          </p>
        </div>
      )}

      {value.map((synergy) => {
        const isOpen = expandedId === synergy.id;
        const partnerNames = synergy.partners
          .map((id) => formatCardName(id, cardMap))
          .join('、');
        return (
          <div
            key={synergy.id}
            className={`rounded-lg border transition-colors ${
              isOpen
                ? 'border-[#7C3AED]/40 bg-[#7C3AED]/[0.05]'
                : 'border-white/10 bg-white/[0.02] hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <Link2 className={`w-4 h-4 flex-shrink-0 ${isOpen ? 'text-[#A78BFA]' : 'text-white/40'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">
                    {synergy.name || <span className="text-white/40">未命名联动</span>}
                  </span>
                  {synergy.partners.length === 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-px rounded-sm bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      未选搭档
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-white/45 mt-0.5 truncate">
                  {partnerNames || '搭档未设置'} · {TRIGGER_COPY[synergy.trigger].label} · {synergy.effects.map(describeEffect).join(' / ')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : synergy.id)}
                className="h-7 px-2 rounded-md text-xs text-white/65 hover:bg-white/10 flex items-center gap-1"
              >
                {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {isOpen ? '收起' : '编辑'}
              </button>
              <button
                type="button"
                onClick={() => removeSynergy(synergy.id)}
                className="h-7 w-7 rounded-md text-white/40 hover:bg-rose-500/15 hover:text-rose-300 flex items-center justify-center"
                title="删除联动"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {isOpen && (
              <SynergyDetail
                syn={synergy}
                selfId={selfId}
                allCards={allCards}
                cardMap={cardMap}
                loadingPool={loadingPool}
                onChange={(patch) => updateSynergy(synergy.id, patch)}
              />
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-white/40">
          已配置 <span className="text-white/70 font-semibold">{value.length}</span> / 10 条
        </span>
        <button
          type="button"
          onClick={addSynergy}
          disabled={value.length >= 10}
          className="h-8 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 bg-[#7C3AED]/20 border border-[#7C3AED]/40 text-[#C4B5FD] hover:bg-[#7C3AED]/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          新增联动
        </button>
      </div>
    </div>
  );
}

function MiniGuide({ index, title, text }: { index: string; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-2">
        <span className="h-5 w-5 rounded-full bg-[#7C3AED]/25 border border-[#7C3AED]/40 text-[#C4B5FD] text-[11px] font-semibold flex items-center justify-center">
          {index}
        </span>
        <span className="text-xs font-semibold text-white/85">{title}</span>
      </div>
      <p className="text-[11px] text-white/45 leading-relaxed mt-1.5">{text}</p>
    </div>
  );
}

function SynergyDetail({
  syn,
  selfId,
  allCards,
  cardMap,
  loadingPool,
  onChange,
}: {
  syn: CardSynergy;
  selfId: string;
  allCards: CardRow[];
  cardMap: Map<string, CardRow>;
  loadingPool: boolean;
  onChange: (patch: Partial<CardSynergy>) => void;
}) {
  const addPartner = (id: string) => {
    if (!id || syn.partners.includes(id)) return;
    onChange({ partners: [...syn.partners, id] });
  };

  const removePartner = (id: string) => {
    onChange({ partners: syn.partners.filter((partnerId) => partnerId !== id) });
  };

  const updateEffect = (idx: number, patch: Partial<CardSynergyEffect>) => {
    onChange({
      effects: syn.effects.map((effect, i) => (i === idx ? { ...effect, ...patch } : effect)),
    });
  };

  const addEffect = () => {
    if (syn.effects.length >= 5) return;
    onChange({ effects: [...syn.effects, { ...createEmptyEffect(), duration: 'permanent' }] });
  };

  const removeEffect = (idx: number) => {
    if (syn.effects.length <= 1) return;
    onChange({ effects: syn.effects.filter((_, i) => i !== idx) });
  };

  const applyTemplate = (template: typeof EFFECT_TEMPLATES[number]) => {
    onChange({
      scope: template.scope,
      effects: [{ ...template.effect }],
    });
  };

  return (
    <div className="border-t border-white/10 px-4 py-4 space-y-5">
      <div className="rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/[0.04] p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C4B5FD]">
          <Sparkles className="w-3.5 h-3.5" />
          当前规则预览
        </div>
        <p className="text-sm text-white/75 mt-1.5 leading-relaxed">
          {buildRulePreview(syn, cardMap)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-white/85 mb-1 block">给这个组合起个名字 *</span>
          <input
            value={syn.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="默契开播"
            maxLength={40}
            className="input-tcg"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-white/85 mb-1 block">玩家看到的说明</span>
          <input
            value={syn.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="和搭档同时在场时，双方攻击 +1"
            maxLength={200}
            className="input-tcg"
          />
        </label>
      </div>

      <div>
        <label className="text-xs font-medium text-white/85 mb-1.5 block">
          选择搭档卡 *
          <span className="text-white/45 font-normal"> 至少选 1 张</span>
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
          {syn.partners.length === 0 && (
            <span className="text-[11px] text-white/35 italic">还没有选搭档卡</span>
          )}
          {syn.partners.map((id) => {
            const card = cardMap.get(id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-md bg-[#7C3AED]/20 border border-[#7C3AED]/40 text-xs text-white"
              >
                <span className="font-mono text-[10px] text-[#A78BFA]">{id}</span>
                <span>{card?.name || '未找到'}</span>
                <button
                  type="button"
                  onClick={() => removePartner(id)}
                  className="w-4 h-4 rounded-sm hover:bg-rose-500/30 hover:text-rose-200 flex items-center justify-center"
                  aria-label={`移除搭档 ${id}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
        <select
          value=""
          onChange={(e) => {
            addPartner(e.target.value);
            e.currentTarget.value = '';
          }}
          disabled={loadingPool}
          className="input-tcg"
        >
          <option value="">{loadingPool ? '加载卡池中...' : '添加一张搭档卡'}</option>
          {allCards
            .filter((card) => card.id !== selfId && !syn.partners.includes(card.id))
            .map((card) => (
              <option key={card.id} value={card.id}>
                {card.id} · {card.name}（{TYPE_LABELS[card.type] ?? card.type} · {card.rarity}）
              </option>
            ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-white/85 mb-1 block">什么时候触发</span>
          <select
            value={syn.trigger}
            onChange={(e) => onChange({ trigger: e.target.value as CardSynergy['trigger'] })}
            className="input-tcg"
          >
            {Object.entries(TRIGGER_COPY).map(([value, copy]) => (
              <option key={value} value={value}>
                {copy.label}
              </option>
            ))}
          </select>
          <span className="tcg-hint mt-1 block">{TRIGGER_COPY[syn.trigger].hint}</span>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-white/85 mb-1 block">谁吃这个效果</span>
          <select
            value={syn.scope}
            onChange={(e) => onChange({ scope: e.target.value as CardSynergy['scope'] })}
            className="input-tcg"
          >
            {Object.entries(SCOPE_COPY).map(([value, copy]) => (
              <option key={value} value={value}>
                {copy.label}
              </option>
            ))}
          </select>
          <span className="tcg-hint mt-1 block">{SCOPE_COPY[syn.scope].hint}</span>
        </label>
      </div>

      <div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#C4B5FD] font-semibold mb-2">
          <Wand2 className="w-3.5 h-3.5" />
          常用联动模板
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {EFFECT_TEMPLATES.map((template) => (
            <button
              key={template.label}
              type="button"
              onClick={() => applyTemplate(template)}
              className="text-left rounded-md border border-white/10 bg-white/[0.02] hover:bg-[#7C3AED]/15 hover:border-[#7C3AED]/30 px-3 py-2 transition-colors"
            >
              <div className="text-xs text-white/85 font-medium">{template.label}</div>
              <div className="text-[10px] text-white/40 mt-0.5">{template.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-white/85">
            触发后发生什么 *
            <span className="text-white/45 font-normal"> 最多 5 条</span>
          </label>
          <button
            type="button"
            onClick={addEffect}
            disabled={syn.effects.length >= 5}
            className="h-7 px-2 rounded-md text-[11px] font-medium bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-40 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            添加一条
          </button>
        </div>
        <div className="space-y-2">
          {syn.effects.map((effect, i) => (
            <EffectRow
              key={i}
              effect={effect}
              onChange={(patch) => updateEffect(i, patch)}
              onRemove={syn.effects.length > 1 ? () => removeEffect(i) : null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EffectRow({
  effect,
  onChange,
  onRemove,
}: {
  effect: CardSynergyEffect;
  onChange: (patch: Partial<CardSynergyEffect>) => void;
  onRemove: (() => void) | null;
}) {
  const def = SYNERGY_EFFECT_KINDS.find((kind) => kind.value === effect.kind);
  const showAmount = def?.needsAmount ?? false;
  const showKeyword = def?.needsKeyword ?? false;

  return (
    <div className="rounded-md bg-[#0f0f23]/60 border border-white/10 p-2.5">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_150px_150px_32px] gap-2 items-end">
        <label className="block">
          <span className="block text-[10px] text-white/45 mb-1">效果类型</span>
          <select
            value={effect.kind}
            onChange={(e) => {
              const nextKind = e.target.value as SynergyEffectKind;
              const nextDef = SYNERGY_EFFECT_KINDS.find((kind) => kind.value === nextKind);
              const patch: Partial<CardSynergyEffect> = { kind: nextKind };
              if (nextDef?.needsAmount && effect.amount == null) patch.amount = 1;
              if (!nextDef?.needsAmount) patch.amount = undefined;
              if (nextDef?.needsKeyword && !effect.keyword) patch.keyword = 'taunt';
              if (!nextDef?.needsKeyword) patch.keyword = undefined;
              onChange(patch);
            }}
            className="input-tcg !h-8 !text-xs"
          >
            {SYNERGY_EFFECT_KINDS.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </select>
        </label>

        {showAmount ? (
          <label className="block">
            <span className="block text-[10px] text-white/45 mb-1">数值</span>
            <input
              type="number"
              min={-99}
              max={99}
              value={effect.amount ?? 0}
              onChange={(e) => onChange({ amount: Number(e.target.value) })}
              className="input-tcg !h-8 !text-xs text-center"
            />
          </label>
        ) : showKeyword ? (
          <label className="block">
            <span className="block text-[10px] text-white/45 mb-1">关键字</span>
            <select
              value={effect.keyword ?? ''}
              onChange={(e) => onChange({ keyword: e.target.value })}
              className="input-tcg !h-8 !text-xs"
            >
              {KEYWORD_OPTIONS.map((keyword) => (
                <option key={keyword.value} value={keyword.value}>
                  {keyword.label}（{keyword.value}）
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="hidden md:block" />
        )}

        <label className="block">
          <span className="block text-[10px] text-white/45 mb-1">持续时间</span>
          <select
            value={effect.duration}
            onChange={(e) => onChange({ duration: e.target.value as CardSynergyEffect['duration'] })}
            className="input-tcg !h-8 !text-xs"
          >
            {Object.entries(DURATION_COPY).map(([value, copy]) => (
              <option key={value} value={value}>
                {copy.label}
              </option>
            ))}
          </select>
        </label>

        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="h-8 w-8 rounded-md text-white/40 hover:bg-rose-500/15 hover:text-rose-300 flex items-center justify-center"
            title="删除这条效果"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="hidden md:block" />
        )}
      </div>
      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-white/35">
        <Target className="w-3 h-3" />
        {describeEffect(effect)} · {DURATION_COPY[effect.duration].hint}
      </div>
    </div>
  );
}

function formatCardName(id: string, cardMap: Map<string, CardRow>): string {
  const card = cardMap.get(id);
  return card ? `${card.name}（${id}）` : id;
}

function buildRulePreview(syn: CardSynergy, cardMap: Map<string, CardRow>): string {
  const partners = syn.partners.length > 0
    ? syn.partners.map((id) => formatCardName(id, cardMap)).join('、')
    : '未选择搭档';
  const effects = syn.effects.length > 0
    ? syn.effects.map(describeEffect).join('，')
    : '未设置效果';
  return `当本卡与 ${partners} 满足“${TRIGGER_COPY[syn.trigger].label}”时，对“${SCOPE_COPY[syn.scope].label}”执行：${effects}。`;
}
