export const GAME_CENTER_ICON_KEYS = ['swords', 'brain', 'hash', 'keyboard', 'sparkles', 'zap'] as const;

export type GameCenterIconKey = (typeof GAME_CENTER_ICON_KEYS)[number];

export const GAME_CENTER_ICON_OPTIONS: Array<{ value: GameCenterIconKey; label: string }> = [
  { value: 'swords', label: '交叉剑' },
  { value: 'brain', label: '大脑' },
  { value: 'hash', label: '数字' },
  { value: 'keyboard', label: '键盘' },
  { value: 'sparkles', label: '星光' },
  { value: 'zap', label: '闪电' },
];

export const GAME_CENTER_FALLBACK_META = {
  subtitle: 'GAME ENTRY',
  desc: '点击进入游戏',
  iconKey: 'sparkles' as GameCenterIconKey,
  gradient: 'from-violet-600 via-purple-600 to-indigo-700',
  glowColor: 'rgba(124,58,237,0.4)',
};

export interface GameCenterEntryDefinition {
  entryKey: string;
  href: string;
  title: string;
  subtitle: string;
  desc: string;
  iconKey: GameCenterIconKey;
  gradient: string;
  glowColor: string;
  badge?: string;
  sortOrder: number;
}

export const DEFAULT_GAME_CENTER_ENTRIES: GameCenterEntryDefinition[] = [
  {
    entryKey: 'tcg',
    href: '/game',
    title: '卡牌对战',
    subtitle: 'CHENZE TCG',
    desc: '以陈泽宇宙为题材的回合制集换式卡牌游戏，支持 AI 练习和好友对战',
    iconKey: 'swords',
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    glowColor: 'rgba(124,58,237,0.4)',
    badge: '热门',
    sortOrder: 0,
  },
  {
    entryKey: 'quiz',
    href: '/play/quiz',
    title: '1103 知识问答',
    subtitle: 'QUIZ CHALLENGE',
    desc: '考验你对陈泽和 1103 的了解程度，答对越多分数越高！',
    iconKey: 'brain',
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    glowColor: 'rgba(245,158,11,0.4)',
    badge: '新',
    sortOrder: 1,
  },
  {
    entryKey: 'guess-number',
    href: '/play/guess-number',
    title: '猜数字',
    subtitle: 'GUESS THE NUMBER',
    desc: '经典猜数字游戏，系统随机一个数字，看你几次猜中！',
    iconKey: 'hash',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    glowColor: 'rgba(16,185,129,0.4)',
    sortOrder: 2,
  },
  {
    entryKey: 'typing',
    href: '/play/typing',
    title: '弹幕打字赛',
    subtitle: 'TYPING RACE',
    desc: '挑战你的打字速度，用直播弹幕金句来一场速度竞赛！',
    iconKey: 'keyboard',
    gradient: 'from-sky-500 via-blue-500 to-indigo-600',
    glowColor: 'rgba(14,165,233,0.4)',
    sortOrder: 3,
  },
  {
    entryKey: 'emoji-guess',
    href: '/play/emoji-guess',
    title: '表情猜猜猜',
    subtitle: 'EMOJI GUESS',
    desc: '用 emoji 组合描述一个词语/梗，看你能不能猜出来！',
    iconKey: 'sparkles',
    gradient: 'from-pink-500 via-rose-500 to-red-500',
    glowColor: 'rgba(236,72,153,0.4)',
    sortOrder: 4,
  },
  {
    entryKey: 'reaction',
    href: '/play/reaction',
    title: '反应速度测试',
    subtitle: 'REACTION TIME',
    desc: '测测你的反应速度！看到信号立刻点击，挑战最快纪录',
    iconKey: 'zap',
    gradient: 'from-yellow-400 via-amber-500 to-orange-600',
    glowColor: 'rgba(251,191,36,0.4)',
    sortOrder: 5,
  },
];
