'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Gamepad2, Star, Monitor, ChevronDown, ExternalLink, Clock, MessageCircle } from 'lucide-react';

interface GameItem {
  id: string;
  name: string;
  cover: string;
  platform: string;
  genre: string;
  status: string;
  lastPlayed: string;
  hours: number;
  rating: number;
  comment: string;
  description: string;
  downloadLinks: string;
}

const statusLabel: Record<string, { text: string; className: string }> = {
  playing: { text: '正在玩', className: 'bg-success text-white' },
  recent: { text: '最近玩过', className: 'bg-primary text-white' },
  favorite: { text: '最爱', className: 'bg-warning text-white' },
};

export default function GamesPage() {
  const [games, setGames] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/public/games')
      .then((r) => r.json())
      .then((res) => { if (res.data) setGames(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="pt-14">
      {/* Header */}
      <section className="bg-gray-900 py-16 sm:py-20 relative overflow-hidden animate-fade-in-up">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[200px] leading-none font-bold text-white select-none"
            style={{ fontFamily: "'Blazed', sans-serif" }}
          >
            1103
          </div>
        </div>
        <div className="container-main px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-full px-4 py-1.5 mb-4">
            <Gamepad2 className="w-4 h-4 text-primary" />
            <span className="text-caption font-medium text-primary">游戏世界</span>
          </div>
          <h1 className="text-heading-lg text-white">最近在玩</h1>
          <p className="text-body text-gray-400 mt-2 max-w-md mx-auto">
            陈泽最近在直播和日常中玩的游戏，看看泽哥又在整什么活儿
          </p>
        </div>
      </section>

      {/* 游戏列表 */}
      <section className="section-block animate-fade-in-up">
        <div className="container-main">
          <div className="flex flex-col gap-3 stagger-children">
            {loading ? (
              <p className="text-body text-text-muted text-center py-12">加载中...</p>
            ) : games.length === 0 ? (
              <p className="text-body text-text-muted text-center py-12">暂无游戏数据</p>
            ) : games.map((game) => (
              <GameCard key={game.id} game={game} expanded={expandedId === game.id} onToggle={() => toggle(game.id)} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function GameCard({ game, expanded, onToggle }: { game: GameItem; expanded: boolean; onToggle: () => void }) {
  const status = statusLabel[game.status] || { text: game.status, className: 'bg-gray-400 text-white' };
  const links: { label: string; url: string }[] = (() => { try { return JSON.parse(game.downloadLinks || '[]'); } catch { return []; } })();
  return (
    <div className="card p-0 overflow-hidden">
      {/* 概要行（可点击） */}
      <div className="flex flex-row cursor-pointer hover:bg-gray-50 transition-colors duration-150" onClick={onToggle}>
        {/* 封面 */}
        <div className="relative w-20 sm:w-24 flex-shrink-0 bg-gray-100">
          <Image src={game.cover} alt={game.name} fill className="object-cover" />
        </div>
        {/* 信息 */}
        <div className="flex-1 flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="text-body font-semibold text-text-title whitespace-nowrap">{game.name}</h3>
            <span className={`tag text-caption flex-shrink-0 ${status.className}`}>{status.text}</span>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 text-caption text-text-muted">
              <Monitor className="w-3.5 h-3.5" />
              {game.platform}
            </span>
            <span className="hidden sm:inline tag-muted">{game.genre}</span>
            <div className="hidden sm:flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${i < game.rating ? 'text-warning fill-warning' : 'text-gray-200'}`}
                />
              ))}
            </div>
            <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div className="border-t border-divider px-5 py-4 bg-gray-50/50">
          {/* 移动端显示平台和评分 */}
          <div className="flex sm:hidden items-center gap-3 mb-3 text-caption text-text-muted">
            <span className="inline-flex items-center gap-1">
              <Monitor className="w-3.5 h-3.5" />
              {game.platform}
            </span>
            <span className="tag-muted">{game.genre}</span>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-3.5 h-3.5 ${i < game.rating ? 'text-warning fill-warning' : 'text-gray-200'}`} />
              ))}
            </div>
          </div>

          {/* 游戏介绍 */}
          <p className="text-body text-text-body leading-relaxed">{game.description}</p>

          {/* 泽哥评价 */}
          <div className="mt-3 flex items-start gap-2 bg-primary-bg rounded-btn px-3 py-2.5">
            <MessageCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-body text-primary">{game.comment}</p>
          </div>

          {/* 游戏时长 + 上次游玩 */}
          <div className="flex items-center gap-4 mt-3 text-caption text-text-muted">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              上次游玩：{game.lastPlayed}
            </span>
            <span>累计 {game.hours >= 1000 ? (game.hours / 1000).toFixed(1) + 'k' : game.hours} 小时</span>
          </div>

          {/* 下载链接 */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-btn text-body font-medium border border-primary text-primary bg-white hover:bg-primary hover:text-white transition-colors duration-150 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
