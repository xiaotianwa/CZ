import type { Metadata } from 'next';
import './game-theme.css';
import GameNav from './_components/GameNav';

export const metadata: Metadata = {
  title: '卡牌对战 · CHENZE TCG',
  description: '1103 陈泽传媒 · 首发卡池 · 卡牌制作器 · 对战 Demo',
};

// 统一所有 /game/* 页面的字体 + 深色霓虹底色
// 配色参考 ui-ux-pro-max skill 的 Retro-Futurism 推荐：
//   primary #7C3AED, secondary #A78BFA, cta #F43F5E, bg #0F0F23, text #E2E8F0
// 字体：Russo One（标题） + Chakra Petch（正文）

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="game-theme min-h-screen text-[#E2E8F0] antialiased">
      {/* 背景层：径向霓虹 + 扫描线纹理 */}
      <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.18),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(244,63,94,0.12),transparent_55%)] bg-[#0F0F23]" />
        <div className="absolute inset-0 opacity-[0.035] mix-blend-overlay bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.6)_3px,rgba(255,255,255,0.6)_4px)]" />
      </div>

      <GameNav />

      <main className="relative">{children}</main>
    </div>
  );
}

// 注：对战页内部使用 h-[calc(100dvh-68px)] + overflow-hidden 实现"固定尺寸不出纵向滚动条"
// 卡池 / 制作器页仍允许自然滚动，因此 layout 不在此处锁定高度。
