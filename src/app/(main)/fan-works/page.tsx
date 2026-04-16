'use client';

import { useState, useEffect, useMemo } from 'react';
import { Palette, Play, Image as ImageIcon, FileText, Music, Star, ExternalLink, User } from 'lucide-react';
import SafeImage from '@/components/SafeImage';

interface FanWorkItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  cover: string;
  contentUrl: string | null;
  images: string;
  authorName: string;
  authorAvatar: string | null;
  source: string | null;
  sourceUrl: string | null;
  likes: number;
  isFeatured: boolean;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Palette; color: string }> = {
  image: { label: '绘画/图片', icon: ImageIcon, color: 'text-primary bg-primary/10' },
  video: { label: '视频', icon: Play, color: 'text-success bg-green-50 dark:bg-green-900/20' },
  audio: { label: '音频', icon: Music, color: 'text-warning bg-orange-50 dark:bg-orange-900/20' },
  text: { label: '文字', icon: FileText, color: 'text-text-body bg-gray-100 dark:bg-[#28282c]' },
  other: { label: '其他', icon: Palette, color: 'text-text-muted bg-gray-100 dark:bg-[#28282c]' },
};

const TYPE_TABS = [
  { key: 'all', label: '全部' },
  { key: 'image', label: '绘画/图片' },
  { key: 'video', label: '视频' },
  { key: 'audio', label: '音频' },
  { key: 'text', label: '文字' },
];

export default function FanWorksPage() {
  const [works, setWorks] = useState<FanWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [lightbox, setLightbox] = useState<{ workId: string; imageIndex: number } | null>(null);

  useEffect(() => {
    fetch('/api/public/fan-works')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setWorks(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (activeType === 'all') return works;
    return works.filter((w) => w.type === activeType);
  }, [works, activeType]);

  // 分离精选和普通作品
  const featured = useMemo(() => filtered.filter((w) => w.isFeatured), [filtered]);
  const regular = useMemo(() => filtered.filter((w) => !w.isFeatured), [filtered]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  // Lightbox 图片浏览
  const currentWork = lightbox ? works.find((w) => w.id === lightbox.workId) : null;
  const currentImages: string[] = currentWork ? (() => { try { return JSON.parse(currentWork.images); } catch { return []; } })() : [];
  const currentImage = currentImages[lightbox?.imageIndex ?? 0];

  return (
    <>
      {/* 页头 */}
      <section className="relative h-48 sm:h-56 bg-gray-900 overflow-hidden mt-14">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute inset-0 flex items-center justify-center gap-4 sm:gap-6 select-none pointer-events-none">
          <span
            className="text-[56px] sm:text-[80px] leading-none font-bold text-white/10"
            style={{ fontFamily: "'Blazed', sans-serif" }}
          >
            1103
          </span>
          <span
            className="text-[28px] sm:text-[40px] leading-none text-primary/50 tracking-[0.15em]"
            style={{ fontFamily: "'Blazed', sans-serif" }}
          >
            ChenZe
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-bg-page to-transparent" />
        <div className="container-main px-4 sm:px-6 lg:px-8 relative z-10 h-full flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-full px-4 py-1.5 mb-3">
            <Palette className="w-4 h-4 text-primary" />
            <span className="text-caption font-medium text-primary">二创作品</span>
          </div>
          <h1 className="text-heading-lg text-white">粉丝二创作品集</h1>
          <p className="text-body text-gray-400 mt-1.5 max-w-md mx-auto">
            绘画、视频、音频、文字... 1103粉丝的才华展示
          </p>
        </div>
      </section>

      {/* 类型筛选 */}
      <section className="section-block pb-0 animate-fade-in-up">
        <div className="container-main">
          <div className="flex flex-wrap gap-2">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveType(tab.key)}
                className={`h-8 px-4 rounded-full text-body font-medium transition-colors duration-150 cursor-pointer ${
                  activeType === tab.key
                    ? 'bg-primary text-white'
                    : 'bg-white dark:bg-[#1e1e22] border border-divider text-text-body hover:border-primary hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 精选作品 */}
      {!loading && featured.length > 0 && (
        <section className="section-block pb-0 animate-fade-in-up">
          <div className="container-main">
            <div className="flex items-center gap-2 mb-5">
              <Star className="w-5 h-5 text-primary" />
              <h2 className="text-heading-sm text-text-title">精选推荐</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
              {featured.map((work) => (
                <WorkCard
                  key={work.id}
                  work={work}
                  featured
                  onImageClick={(idx) => setLightbox({ workId: work.id, imageIndex: idx })}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 作品列表 */}
      <section className="section-block animate-fade-in-up">
        <div className="container-main">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/3] rounded-card bg-gray-200 dark:bg-[#28282c]" />
                  <div className="mt-3 h-4 bg-gray-200 dark:bg-[#28282c] rounded w-3/4" />
                  <div className="mt-1.5 h-3 bg-gray-100 dark:bg-[#1e1e22] rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Palette className="w-10 h-10 text-text-disabled mx-auto mb-3" />
              <p className="text-body text-text-muted">暂无二创作品</p>
            </div>
          ) : (
            <>
              {regular.length > 0 && featured.length > 0 && (
                <div className="flex items-center gap-2 mb-5">
                  <Palette className="w-5 h-5 text-text-muted" />
                  <h2 className="text-heading-sm text-text-title">全部作品</h2>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 stagger-children">
                {(featured.length > 0 ? regular : filtered).map((work) => (
                  <WorkCard
                    key={work.id}
                    work={work}
                    onImageClick={(idx) => setLightbox({ workId: work.id, imageIndex: idx })}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </>
          )}

          {/* 底部统计 */}
          {!loading && filtered.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-caption text-text-muted">
                共 {works.length} 件作品 · 当前显示 {filtered.length} 件
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Lightbox 图片预览 */}
      {lightbox && currentImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors duration-150 cursor-pointer z-10"
            onClick={() => setLightbox(null)}
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {currentImages.length > 1 && lightbox.imageIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white cursor-pointer transition-colors duration-150"
              onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, imageIndex: lightbox.imageIndex - 1 }); }}
              aria-label="上一张"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {currentImages.length > 1 && lightbox.imageIndex < currentImages.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white cursor-pointer transition-colors duration-150"
              onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, imageIndex: lightbox.imageIndex + 1 }); }}
              aria-label="下一张"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <div className="relative max-w-4xl max-h-[85vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-video rounded-card overflow-hidden bg-black">
              <SafeImage
                src={currentImage}
                alt={currentWork?.title || '作品大图'}
                fill
                className="object-contain"
                priority
                sizes="90vw"
              />
            </div>
            <div className="flex items-center justify-between mt-3 px-1">
              <p className="text-white/70 text-body">{currentWork?.title}</p>
              {currentImages.length > 1 && (
                <p className="text-white/40 text-caption flex-shrink-0 ml-4">
                  {lightbox.imageIndex + 1} / {currentImages.length}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 作品卡片组件
function WorkCard({
  work,
  featured,
  onImageClick,
  formatDate,
}: {
  work: FanWorkItem;
  featured?: boolean;
  onImageClick: (index: number) => void;
  formatDate: (d: string) => string;
}) {
  const typeConfig = TYPE_CONFIG[work.type] || TYPE_CONFIG.other;
  const TypeIcon = typeConfig.icon;
  let images: string[] = [];
  try { images = JSON.parse(work.images); } catch { /* ignore */ }

  const handleClick = () => {
    if (work.type === 'video' && work.contentUrl) {
      window.open(work.contentUrl, '_blank', 'noopener,noreferrer');
    } else if (images.length > 0) {
      onImageClick(0);
    } else if (work.sourceUrl) {
      window.open(work.sourceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={`group cursor-pointer rounded-card overflow-hidden bg-white/60 dark:bg-[#1e1e22]/80 backdrop-blur-md border border-white/70 dark:border-[#333] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_8px_32px_rgba(0,0,0,0.10)] transition-all duration-200 ${
        featured ? 'ring-1 ring-primary/20' : ''
      }`}
      onClick={handleClick}
    >
      {/* 封面 */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-[#28282c]">
        <SafeImage
          src={work.cover}
          alt={work.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* 类型标签 */}
        <div className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium ${typeConfig.color}`}>
          <TypeIcon className="w-3 h-3" />
          {typeConfig.label}
        </div>

        {/* 精选角标 */}
        {work.isFeatured && (
          <div className="absolute top-2 right-2 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary text-white text-caption font-medium">
            <Star className="w-3 h-3" />
            精选
          </div>
        )}

        {/* 视频播放指示 */}
        {work.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center group-hover:bg-primary/80 transition-colors duration-200">
              <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
            </div>
          </div>
        )}
      </div>

      {/* 信息 */}
      <div className="p-3.5">
        <h3 className="text-body font-semibold text-text-title truncate">{work.title}</h3>
        {work.description && (
          <p className="text-caption text-text-muted mt-1 line-clamp-2">{work.description}</p>
        )}

        {/* 作者信息 */}
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200 dark:bg-[#28282c] flex-shrink-0 flex items-center justify-center">
              {work.authorAvatar ? (
                <SafeImage src={work.authorAvatar} alt={work.authorName} width={20} height={20} className="object-cover" />
              ) : (
                <User className="w-3 h-3 text-text-muted" />
              )}
            </div>
            <span className="text-caption text-text-muted truncate">{work.authorName}</span>
          </div>

          {/* 来源 */}
          {work.source && work.sourceUrl && (
            <a
              href={work.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-0.5 text-caption text-primary hover:underline cursor-pointer flex-shrink-0"
            >
              {work.source}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <p className="text-caption text-text-disabled mt-1.5">{formatDate(work.createdAt)}</p>
      </div>
    </div>
  );
}
