'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import * as Icons from '@/components/game/GameIcons';
import { ALL_CARDS } from '@/game/cards';
import { getHeroPowerDef } from '@/game/heroPowers';
import type { AIDifficulty } from '@/game/ai';
import type { CardDef, CardRarity, CardType, Deck, Keyword, PlayerId } from '@/game/types';
import { unlockAudio as unlockSfx } from '@/game/sound';
import { Battle } from '../_components/Battle';
import { DeckPicker, useAllDeckOptions, type DeckOptionKey } from '../_components/DeckPicker';

const DIFFICULTY_META: Record<AIDifficulty, {
  label: string;
  desc: string;
  delay: number;
  tone: string;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
}> = {
  easy: {
    label: '轻松',
    desc: '随机出牌和攻击，适合熟悉卡池、词条和基础节奏。',
    delay: 1100,
    tone: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100',
    Icon: Icons.SparkleIcon,
  },
  normal: {
    label: '标准',
    desc: '优先大牌、斩杀和高收益交换，接近普通玩家决策。',
    delay: 750,
    tone: 'border-cyan-300/35 bg-cyan-400/10 text-cyan-100',
    Icon: Icons.AttackIcon,
  },
  hard: {
    label: '高压',
    desc: '枚举单步行动并评分，更重视压血线和场面收益。',
    delay: 400,
    tone: 'border-rose-300/35 bg-rose-400/10 text-rose-100',
    Icon: Icons.FireIcon,
  },
};

const TYPE_ORDER: CardType[] = ['character', 'item', 'equipment', 'effect', 'event'];
const TYPE_LABEL: Record<CardType, string> = {
  character: '角色',
  item: '道具',
  equipment: '装备',
  effect: '消耗',
  event: '事件',
};
const TYPE_ICON: Record<CardType, React.ComponentType<{ className?: string; size?: number }>> = {
  character: Icons.CharacterIcon,
  item: Icons.ItemIcon,
  equipment: Icons.EquipmentIcon,
  effect: Icons.EffectIcon,
  event: Icons.EventIcon,
};

const RARITY_ORDER: CardRarity[] = ['N', 'R', 'SR', 'SSR'];
const CARD_LOOKUP = new Map<string, CardDef>(ALL_CARDS.map((card) => [card.id, card]));

const DECK_GUIDES: Record<string, {
  role: string;
  tempo: string;
  plan: string;
  mulligan: string;
  warning: string;
  accent: string;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
}> = {
  taunt: {
    role: '防御控场',
    tempo: '中速偏厚',
    plan: '用挡枪和治疗稳住前期，等高血量角色站场后再反打。',
    mulligan: '优先留 1-3 费角色、治疗和低费挡枪，9 费核心一般换掉。',
    warning: '前期伤害不足，别把解牌浪费在低威胁目标上。',
    accent: 'from-stone-300/25 to-cyan-300/10',
    Icon: Icons.TauntIcon,
  },
  rush: {
    role: '快攻压血',
    tempo: '前期爆发',
    plan: '持续铺场、武器打脸和过牌补资源，逼 AI 先解场。',
    mulligan: '找 1-2 费随从、低费过牌和武器，保留能直接抢节奏的牌。',
    warning: '手牌消耗快，没把握斩杀时要保留一次补牌手段。',
    accent: 'from-amber-300/25 to-rose-300/10',
    Icon: Icons.ChargeIcon,
  },
  event: {
    role: '事件控制',
    tempo: '后发制人',
    plan: '利用暗箱、沉默和群体伤害拖慢对手，再靠事件倒计时滚资源。',
    mulligan: '留低费暗箱、沉默和解场牌，确保前两回合不空过。',
    warning: '事件槽最多 3 个，别过早塞满影响关键暗箱。',
    accent: 'from-cyan-300/25 to-fuchsia-300/10',
    Icon: Icons.EventIcon,
  },
  tempo: {
    role: '中速资源',
    tempo: '攻守均衡',
    plan: '前期站场，中期用过牌和费用减免保持手牌，靠联动和高质量角色压住场面。',
    mulligan: '优先留 1-3 费角色、节奏复盘和可过牌单位，避免起手全是高费终结牌。',
    warning: '不要只打脸，场面被清后需要靠补牌重建节奏。',
    accent: 'from-sky-300/25 to-amber-300/10',
    Icon: Icons.ComboIcon,
  },
  control: {
    role: '后期控制',
    tempo: '资源消耗',
    plan: '用治疗、挡枪和弹回拖住对手，等对方资源见底后用复活和高费角色收尾。',
    mulligan: '留治疗、挡枪和 3-4 费解场牌，高费牌通常换掉。',
    warning: '别把所有解牌交给小角色，留一张处理对方核心威胁。',
    accent: 'from-slate-300/25 to-cyan-300/10',
    Icon: Icons.DivineShieldIcon,
  },
};

const TRAINING_PRESETS: Array<{
  label: string;
  desc: string;
  player: DeckOptionKey;
  ai: DeckOptionKey;
  difficulty: AIDifficulty;
  first: PlayerId;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
}> = [
  {
    label: '快攻抢血',
    desc: '练习起手留牌、费用铺满和斩杀判断。',
    player: { kind: 'preset', key: 'rush' },
    ai: { kind: 'preset', key: 'taunt' },
    difficulty: 'normal',
    first: 'P1',
    Icon: Icons.ChargeIcon,
  },
  {
    label: '防守反打',
    desc: '用挡枪和治疗拖过爆发期，再用大随从返场。',
    player: { kind: 'preset', key: 'taunt' },
    ai: { kind: 'preset', key: 'rush' },
    difficulty: 'hard',
    first: 'P2',
    Icon: Icons.TauntIcon,
  },
  {
    label: '控制读牌',
    desc: '熟悉暗箱、事件槽和消耗牌的目标选择。',
    player: { kind: 'preset', key: 'event' },
    ai: { kind: 'preset', key: 'event' },
    difficulty: 'normal',
    first: 'P1',
    Icon: Icons.SecretIcon,
  },
  {
    label: '中速换场',
    desc: '练习随从交换、补牌和中期资源滚动。',
    player: { kind: 'preset', key: 'tempo' },
    ai: { kind: 'preset', key: 'rush' },
    difficulty: 'normal',
    first: 'P1',
    Icon: Icons.ComboIcon,
  },
  {
    label: '后期防线',
    desc: '练习治疗、弹回和复活，拖过对手爆发。',
    player: { kind: 'preset', key: 'control' },
    ai: { kind: 'preset', key: 'tempo' },
    difficulty: 'hard',
    first: 'P2',
    Icon: Icons.DivineShieldIcon,
  },
];

interface DeckSummary {
  size: number;
  known: number;
  avgCost: string;
  curve: number[];
  typeCounts: Record<CardType, number>;
  rarityCounts: Record<CardRarity, number>;
  characterCount: number;
  avgAttack: string;
  avgHealth: string;
  tauntCount: number;
  directDamageCount: number;
  drawCount: number;
}

function summarizeDeck(deck: Deck): DeckSummary {
  const typeCounts = Object.fromEntries(TYPE_ORDER.map((type) => [type, 0])) as Record<CardType, number>;
  const rarityCounts = Object.fromEntries(RARITY_ORDER.map((rarity) => [rarity, 0])) as Record<CardRarity, number>;
  const curve = Array.from({ length: 8 }, () => 0);
  let known = 0;
  let totalCost = 0;
  let characterCount = 0;
  let totalAttack = 0;
  let totalHealth = 0;
  let tauntCount = 0;
  let directDamageCount = 0;
  let drawCount = 0;

  for (const id of deck.cards) {
    const def = CARD_LOOKUP.get(id);
    if (!def) continue;
    known += 1;
    totalCost += def.cost;
    curve[Math.min(def.cost, 7)] += 1;
    typeCounts[def.type] += 1;
    rarityCounts[def.rarity] += 1;

    if (def.type === 'character') {
      characterCount += 1;
      totalAttack += def.attack ?? 0;
      totalHealth += def.health ?? 0;
    }
    if ((def.keywords ?? []).includes('taunt' as Keyword)) tauntCount += 1;

    const effects = JSON.stringify(def.effects ?? []);
    if (effects.includes('damage_')) directDamageCount += 1;
    if (effects.includes('draw_cards')) drawCount += 1;
  }

  return {
    size: deck.cards.length,
    known,
    avgCost: known > 0 ? (totalCost / known).toFixed(1) : '-',
    curve,
    typeCounts,
    rarityCounts,
    characterCount,
    avgAttack: characterCount > 0 ? (totalAttack / characterCount).toFixed(1) : '-',
    avgHealth: characterCount > 0 ? (totalHealth / characterCount).toFixed(1) : '-',
    tauntCount,
    directDamageCount,
    drawCount,
  };
}

function getDeckTitle(key: DeckOptionKey, options: ReturnType<typeof useAllDeckOptions>): string {
  if (key.kind === 'preset') {
    return options.presets.find((deck) => deck.key === key.key)?.label ?? key.key;
  }
  return options.customs[key.index]?.name ?? '自建卡组';
}

function getGuide(key: DeckOptionKey) {
  if (key.kind === 'preset') return DECK_GUIDES[key.key] ?? null;
  return null;
}

function maxCurveValue(summary: DeckSummary): number {
  return Math.max(1, ...summary.curve);
}

export default function PracticePage() {
  const options = useAllDeckOptions();
  const [playerDeckKey, setPlayerDeckKey] = useState<DeckOptionKey>({ kind: 'preset', key: 'rush' });
  const [aiDeckKey, setAiDeckKey] = useState<DeckOptionKey>({ kind: 'preset', key: 'taunt' });
  const [firstPlayer, setFirstPlayer] = useState<PlayerId>('P1');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('normal');
  const [started, setStarted] = useState(false);

  const playerDeck = options.resolve(playerDeckKey);
  const aiDeck = options.resolve(aiDeckKey);
  const playerSummary = useMemo(() => summarizeDeck(playerDeck), [playerDeck]);
  const aiSummary = useMemo(() => summarizeDeck(aiDeck), [aiDeck]);
  const playerGuide = getGuide(playerDeckKey);
  const aiGuide = getGuide(aiDeckKey);
  const DifficultyIcon = DIFFICULTY_META[difficulty].Icon;

  if (started) {
    return (
      <Battle
        p1Deck={playerDeck}
        p2Deck={aiDeck}
        firstPlayer={firstPlayer}
        onQuit={() => setStarted(false)}
        perspective="P1"
        aiPlayer="P2"
        aiDifficulty={difficulty}
        aiStepDelayMs={DIFFICULTY_META[difficulty].delay}
      />
    );
  }

  return (
    <div className="px-4 pb-16 pt-6 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-100">
              <Icons.PlayIcon size={13} />
              Training Solo
            </div>
            <h1 className="font-display text-4xl font-black tracking-wide text-white sm:text-5xl">
              练习模式
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/62">
              选择双方套牌、先后手和 AI 强度，直接进入一局完整回合制卡牌对战。想和真人打，可以前往
              <Link href="/game/room" className="px-1 font-bold text-cyan-200 transition-colors hover:text-white">
                好友房
              </Link>
              创建房间。
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 shadow-[0_18px_60px_-28px_rgba(56,189,248,0.65)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/42">Match Preview</div>
                <div className="mt-1 text-lg font-black text-white">P1 对 AI</div>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
                <DifficultyIcon size={20} />
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Metric label="你的均费" value={playerSummary.avgCost} />
              <Metric label="AI 均费" value={aiSummary.avgCost} />
              <Metric label="先手" value={firstPlayer === 'P1' ? '你' : 'AI'} />
            </div>
          </div>
        </header>

        <section className="mb-4 grid gap-3 lg:grid-cols-3">
          {TRAINING_PRESETS.map((preset) => {
            const Icon = preset.Icon;
            return (
              <button
                key={preset.label}
                onClick={() => {
                  setPlayerDeckKey(preset.player);
                  setAiDeckKey(preset.ai);
                  setDifficulty(preset.difficulty);
                  setFirstPlayer(preset.first);
                }}
                className="group flex min-h-[92px] items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-left transition-colors duration-200 hover:border-amber-200/45 hover:bg-amber-200/10"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/25 bg-amber-200/10 text-amber-100">
                  <Icon size={19} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-white">{preset.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-white/56">{preset.desc}</span>
                </span>
              </button>
            );
          })}
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <section className="grid gap-4 lg:grid-cols-2">
              <DeckPicker label="你的卡组" value={playerDeckKey} onChange={setPlayerDeckKey} options={options} />
              <DeckPicker label="AI 卡组" value={aiDeckKey} onChange={setAiDeckKey} options={options} />
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <DeckBrief
                eyebrow="P1"
                title={getDeckTitle(playerDeckKey, options)}
                guide={playerGuide}
                summary={playerSummary}
                heroPowerId={playerDeck.heroPowerId}
              />
              <DeckBrief
                eyebrow="AI"
                title={getDeckTitle(aiDeckKey, options)}
                guide={aiGuide}
                summary={aiSummary}
                heroPowerId={aiDeck.heroPowerId}
              />
            </section>

            <section className="glass-card rounded-2xl p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-white">AI 难度</div>
                  <div className="mt-1 text-xs text-white/45">难度会影响决策质量和出牌速度。</div>
                </div>
                <span className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-[11px] font-bold text-white/55 sm:inline-flex">
                  <Icons.TimerIcon size={12} />
                  {DIFFICULTY_META[difficulty].delay}ms / 步
                </span>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {(Object.keys(DIFFICULTY_META) as AIDifficulty[]).map((key) => {
                  const meta = DIFFICULTY_META[key];
                  const Icon = meta.Icon;
                  const active = difficulty === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setDifficulty(key)}
                      aria-pressed={active}
                      className={[
                        'min-h-[112px] rounded-xl border p-3 text-left transition-colors duration-200',
                        active
                          ? meta.tone
                          : 'border-white/8 bg-white/[0.035] text-white/62 hover:border-white/20 hover:bg-white/[0.07]',
                      ].join(' ')}
                    >
                      <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-current/20 bg-current/10">
                        <Icon size={16} />
                      </span>
                      <span className="block text-base font-black text-white">{meta.label}</span>
                      <span className="mt-1 block text-xs leading-5 opacity-80">{meta.desc}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="glass-card rounded-2xl p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
                <Icons.TrophyIcon size={16} className="text-amber-200" />
                对局规则
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Rule label="英雄生命" value="40" Icon={Icons.HealthIcon} />
                <Rule label="费用上限" value="10" Icon={Icons.ManaIcon} />
                <Rule label="战场席位" value="6" Icon={Icons.CharacterIcon} />
                <Rule label="手牌上限" value="10" Icon={Icons.CharacterIcon} />
                <Rule label="事件槽" value="3" Icon={Icons.EventIcon} />
                <Rule label="回合上限" value="30" Icon={Icons.TimerIcon} />
              </div>
              <div className="mt-3 rounded-xl border border-amber-200/18 bg-amber-200/8 p-3 text-xs leading-6 text-amber-50/78">
                开局会进入换牌阶段。牌库抽空后触发疲劳伤害，倒计时事件会在回合开始时结算。
              </div>
            </section>

            <section className="glass-card rounded-2xl p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
                <Icons.SparkleIcon size={16} className="text-cyan-200" />
                起手建议
              </div>
              <div className="space-y-3">
                <OpeningTip label="你的留牌" text={playerGuide?.mulligan ?? '优先留 1-3 费牌，确保前两回合有牌可出。'} />
                <OpeningTip label="对手节奏" text={aiGuide?.warning ?? '观察 AI 费用曲线，尽量保留一个可处理高威胁随从的手段。'} />
              </div>
            </section>

            <section className="glass-card rounded-2xl p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-white">先手选择</div>
                  <div className="mt-1 text-xs text-white/45">先手更容易抢节奏，后手更适合练防守。</div>
                </div>
                <div className="flex rounded-xl border border-white/10 bg-white/[0.035] p-1">
                  {(['P1', 'P2'] as PlayerId[]).map((player) => (
                    <button
                      key={player}
                      onClick={() => setFirstPlayer(player)}
                      aria-pressed={firstPlayer === player}
                      className={[
                        'rounded-lg px-3 py-2 text-sm font-black transition-colors duration-200',
                        firstPlayer === player
                          ? 'bg-cyan-300 text-slate-950'
                          : 'text-white/55 hover:bg-white/8 hover:text-white',
                      ].join(' ')}
                    >
                      {player === 'P1' ? '你' : 'AI'}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  unlockSfx();
                  setStarted(true);
                }}
                className="btn-neon-primary flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-black tracking-wide"
              >
                <Icons.PlayIcon size={20} />
                开始练习
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.045] px-3 py-2">
      <div className="text-[11px] font-bold text-white/42">{label}</div>
      <div className="mt-1 text-lg font-black text-white">{value}</div>
    </div>
  );
}

function DeckBrief({
  eyebrow,
  title,
  guide,
  summary,
  heroPowerId,
}: {
  eyebrow: string;
  title: string;
  guide: ReturnType<typeof getGuide>;
  summary: DeckSummary;
  heroPowerId: string;
}) {
  const Icon = guide?.Icon ?? Icons.CharacterIcon;
  const maxValue = maxCurveValue(summary);
  const heroPower = getHeroPowerDef(heroPowerId);

  return (
    <section className="glass-card rounded-2xl p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/42">{eyebrow}</div>
          <h2 className="mt-1 truncate text-xl font-black text-white">{title}</h2>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-xs font-bold text-white/65">
            <Icon size={13} />
            {guide?.role ?? '自定义构筑'}
            <span className="text-white/25">/</span>
            {guide?.tempo ?? '自由节奏'}
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-cyan-300/18 bg-cyan-300/8 px-2.5 py-1 text-xs font-bold text-cyan-100">
            <Icons.SparkleIcon size={13} />
            技能：{heroPower.name}（{heroPower.cost}费）
          </div>
        </div>
        <div className={`h-12 w-12 shrink-0 rounded-2xl border border-white/10 bg-gradient-to-br ${guide?.accent ?? 'from-cyan-300/20 to-slate-300/5'} flex items-center justify-center text-white`}>
          <Icon size={22} />
        </div>
      </div>

      <p className="min-h-[48px] text-sm leading-6 text-white/64">
        {guide?.plan ?? '使用自建卡组进行练习，系统会按合法卡组规则进入对战。'}
      </p>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <Metric label="卡牌" value={`${summary.size}`} />
        <Metric label="均费" value={summary.avgCost} />
        <Metric label="角色" value={`${summary.characterCount}`} />
        <Metric label="过牌" value={`${summary.drawCount}`} />
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-white/38">
          <span>Mana Curve</span>
          <span>{summary.known}/{summary.size}</span>
        </div>
        <div className="grid h-24 grid-cols-8 items-end gap-1.5 rounded-xl border border-white/8 bg-slate-950/45 p-2">
          {summary.curve.map((value, index) => (
            <div key={index} className="flex h-full flex-col items-center justify-end gap-1">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-cyan-400 to-amber-200 shadow-[0_0_14px_-6px_rgba(56,189,248,0.9)]"
                style={{ height: `${Math.max(10, (value / maxValue) * 100)}%` }}
                title={`${index === 7 ? '7+' : index} 费：${value} 张`}
              />
              <span className="text-[10px] font-black tabular-nums text-white/42">{index === 7 ? '7+' : index}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-5">
        {TYPE_ORDER.map((type) => {
          const TypeIcon = TYPE_ICON[type];
          return (
            <div key={type} className="rounded-lg border border-white/8 bg-white/[0.035] p-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/52">
                <TypeIcon size={12} />
                {TYPE_LABEL[type]}
              </div>
              <div className="mt-1 text-lg font-black text-white">{summary.typeCounts[type]}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Rule({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/45">
        <Icon size={13} />
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-white">{value}</div>
    </div>
  );
}

function OpeningTip({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-cyan-100">
        <Icons.CheckIcon size={13} />
        {label}
      </div>
      <div className="text-xs leading-6 text-white/62">{text}</div>
    </div>
  );
}
