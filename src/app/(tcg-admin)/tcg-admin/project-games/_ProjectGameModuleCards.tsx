import Link from 'next/link';
import { HelpCircle, Keyboard, Smile, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ModuleItem {
  title: string;
  href: string;
  description: string;
  badge: string;
  badgeClassName: string;
  icon: LucideIcon;
}

const BADGE_SUCCESS = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
const BADGE_PRIMARY = 'bg-[#7C3AED]/15 text-[#A78BFA] border-[#7C3AED]/30';

const moduleItems: ModuleItem[] = [
  {
    title: '1103 知识问答',
    href: '/tcg-admin/project-games/quiz',
    description: '独立维护游戏问答题库，不再复用社区后台注册问答内容。',
    badge: '独立题库',
    badgeClassName: BADGE_SUCCESS,
    icon: HelpCircle,
  },
  {
    title: '表情猜猜猜',
    href: '/tcg-admin/project-games/emoji-guess',
    description: '维护 emoji 题目、提示词和答案内容，驱动 /play/emoji-guess。',
    badge: '题库管理',
    badgeClassName: BADGE_PRIMARY,
    icon: Smile,
  },
  {
    title: '弹幕打字赛',
    href: '/tcg-admin/project-games/typing',
    description: '维护打字赛词库与文案素材，驱动 /play/typing。',
    badge: '词库管理',
    badgeClassName: BADGE_PRIMARY,
    icon: Keyboard,
  },
];

export default function ProjectGameModuleCards() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#141432]/60 p-5 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-white">游戏子模块</h3>
        <p className="mt-1 text-sm text-white/50">每个游戏单独一个管理入口，右侧导航可直接切换到对应子模块。</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {moduleItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-[#7C3AED]/40 hover:bg-white/[0.06]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-[#A78BFA]" />
                </div>
                <ChevronRight className="w-4 h-4 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-[#A78BFA]" />
              </div>
              <div className="mt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] border ${item.badgeClassName}`}>{item.badge}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-white/50">{item.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
