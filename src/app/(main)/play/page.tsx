'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Gamepad2, Swords, Brain, Hash, Keyboard,
  Sparkles, ArrowRight, Star, Zap, Target, Lock
} from 'lucide-react';
import { DEFAULT_GAME_CENTER_ENTRIES, type GameCenterIconKey } from '@/data/gameCenterEntries';

interface GameEntry {
  id: string;
  entryKey: string;
  href: string;
  title: string;
  subtitle: string;
  desc: string;
  iconKey: GameCenterIconKey;
  gradient: string;
  glowColor: string;
  badge?: string;
  isEnabled?: boolean;
}

const ICON_MAP = {
  swords: Swords,
  brain: Brain,
  hash: Hash,
  keyboard: Keyboard,
  sparkles: Sparkles,
  zap: Zap,
} satisfies Record<GameCenterIconKey, React.ElementType>;

export default function PlayPage() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [entries, setEntries] = useState<GameEntry[]>(() =>
    DEFAULT_GAME_CENTER_ENTRIES.map((item) => ({ ...item, id: item.entryKey, isEnabled: true }))
  );

  useEffect(() => {
    fetch('/api/public/game-center-entries')
      .then((r) => r.json())
      .then((res) => {
        if (res.code === 0 && Array.isArray(res.data) && res.data.length > 0) {
          setEntries(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const visibleEntries = entries;
  const openCount = useMemo(
    () => entries.filter((item) => item.isEnabled !== false).length,
    [entries]
  );

  return (
    <div className="pb-16">
      {/* Hero Banner */}
      <section className="relative overflow-hidden mt-14">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-[#0F0F23] to-gray-900" />
        {/* 动态背景装饰
            说明：原本使用 blur-[100px]/[120px] + animate-pulse 的巨型模糊层，
            在 iOS Safari 上会触发超大合成层重绘，导致 /play 页面严重卡顿。
            这里改用较小的 blur-2xl（40px），去掉 animate-pulse，并移除扫描线，
            移动端仍保留视觉层次但性能友好。 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
          <div className="absolute top-10 left-[10%] w-72 h-72 bg-purple-600/20 rounded-full blur-2xl" />
          <div className="absolute bottom-10 right-[15%] w-64 h-64 bg-sky-500/15 rounded-full blur-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10 container-main px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-5 backdrop-blur-sm">
            <Gamepad2 className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">游戏中心</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-tight">
            <span className="font-waterbrush text-purple-400">1103</span> 游戏大厅
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/60 max-w-lg mx-auto leading-relaxed">
            多款小游戏等你来挑战，和老铁们一起比拼、打发时间
          </p>
          {/* 统计数据 */}
          <div className="mt-8 flex items-center justify-center gap-8 sm:gap-12">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white">
                {openCount}
                <span className="text-base sm:text-lg text-white/40 font-medium"> / {visibleEntries.length}</span>
              </div>
              <div className="text-xs sm:text-sm text-white/50 mt-1">款已开放</div>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white">∞</div>
              <div className="text-xs sm:text-sm text-white/50 mt-1">乐趣</div>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white">0</div>
              <div className="text-xs sm:text-sm text-white/50 mt-1">门槛</div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-bg-page to-transparent" />
      </section>

      {/* 游戏网格 */}
      <section className="section-block relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(124,58,237,0.04) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(14,165,233,0.03) 0%, transparent 60%)',
        }} />
        <div className="container-main relative z-10">
          <div className="mb-8">
            <h2 className="section-title">选择游戏</h2>
            <p className="section-desc">点击卡片开始游戏</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleEntries.map((game, idx) => {
              const Icon = ICON_MAP[game.iconKey];
              const isHovered = hoveredIdx === idx;
              const isLocked = game.isEnabled === false;
              const CardTag: any = isLocked ? 'div' : Link;
              const cardProps = isLocked
                ? {
                    role: 'button',
                    'aria-disabled': true,
                    title: '敬请期待',
                  }
                : { href: game.href };
              return (
                <CardTag
                  key={game.id}
                  {...cardProps}
                  className={`group relative block rounded-2xl overflow-hidden transition-all duration-300 ${
                    isLocked ? 'cursor-not-allowed' : 'hover:-translate-y-1'
                  }`}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* 卡片背景
                      注意：原本每张卡片都使用 backdrop-blur-md + blur-3xl 光斑，
                      在 iOS Safari 上多卡片叠加会明显卡顿，这里去掉 backdrop-blur
                      改为实心背景，并且光斑仅在 sm 以上屏幕上渲染。 */}
                  <div className={`relative bg-white/95 dark:bg-[#1e1e22] border border-white/70 dark:border-[#333] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] rounded-2xl p-5 sm:p-6 h-full transition-all duration-300 ${
                    isLocked
                      ? 'opacity-60 grayscale-[0.3]'
                      : 'group-hover:border-purple-300/50 dark:group-hover:border-purple-500/40 group-hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_8px_32px_rgba(0,0,0,0.10)] dark:group-hover:shadow-[0_8px_32px_rgba(124,58,237,0.15)]'
                  }`}>
                    {/* 渐变光斑 */}
                    <div
                      className={`hidden sm:block absolute -top-20 -right-20 w-48 h-48 rounded-full bg-gradient-to-br ${game.gradient} opacity-0 blur-2xl transition-opacity duration-500 ${isHovered ? 'opacity-20' : ''}`}
                    />

                    {/* Badge */}
                    {(isLocked || game.badge) && (
                      <div className="absolute top-4 right-4">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-500/15 text-gray-500 dark:text-gray-300 border border-gray-400/30">
                            <Lock className="w-3 h-3" />
                            敬请期待
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            game.badge === '热门'
                              ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {game.badge === '热门' && <Star className="w-3 h-3" />}
                            {game.badge === '新' && <Sparkles className="w-3 h-3" />}
                            {game.badge}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 图标 */}
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${game.gradient} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}
                      style={{ boxShadow: `0 4px 20px -4px ${game.glowColor}` }}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    {/* 文字 */}
                    <div className="mt-4">
                      <p className="text-[10px] tracking-[0.3em] uppercase text-text-muted dark:text-white/40 font-medium">{game.subtitle}</p>
                      <h3 className="mt-1 text-xl font-bold text-text-title dark:text-white">{game.title}</h3>
                      <p className="mt-2 text-sm text-text-body dark:text-white/60 leading-relaxed line-clamp-2">{game.desc}</p>
                    </div>

                    {/* 底部 */}
                    <div className="mt-5 flex items-center justify-between">
                      <span className={`text-xs font-medium tracking-wider uppercase ${
                        isLocked ? 'text-text-muted dark:text-white/40' : 'text-primary dark:text-purple-400'
                      }`}>
                        {isLocked ? '暂未开放' : '开始游戏'}
                      </span>
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 text-text-muted dark:text-white/60 transition-all duration-200 ${
                        isLocked ? '' : 'group-hover:bg-primary/10 dark:group-hover:bg-white/10 group-hover:text-primary dark:group-hover:text-white'
                      }`}>
                        {isLocked ? <Lock className="w-4 h-4" /> : <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />}
                      </span>
                    </div>
                  </div>
                </CardTag>
              );
            })}
          </div>
        </div>
      </section>

      {/* 底部 CTA */}
      <section className="relative py-12 sm:py-16 overflow-hidden">
        <div className="container-main text-center max-w-lg mx-auto px-4">
          <Target className="w-8 h-8 text-primary mx-auto mb-3" />
          <h2 className="text-heading text-text-title dark:text-white">更多游戏开发中</h2>
          <p className="text-body text-text-muted mt-2">
            有好的游戏创意？欢迎在社区提建议！
          </p>
          <Link
            href="/feedback"
            className="inline-flex items-center justify-center mt-5 h-10 px-6 text-sm rounded-full bg-primary text-white font-semibold hover:bg-primary/90 transition-colors duration-150 active:scale-[0.98]"
          >
            去社区聊聊
          </Link>
        </div>
      </section>
    </div>
  );
}
