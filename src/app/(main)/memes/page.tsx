'use client';

import { useState, useEffect, useMemo } from 'react';
import { BookOpen, Search, Flame, Hash, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface MemeItem {
  id: string;
  title: string;
  origin: string;
  description: string;
  example: string | null;
  image: string | null;
  tags: string;
  popularity: number;
  createdAt: string;
}

export default function MemesPage() {
  const [memes, setMemes] = useState<MemeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('全部');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/public/memes')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setMemes(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // 提取所有标签
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    memes.forEach((m) => {
      try {
        const tags: string[] = JSON.parse(m.tags);
        tags.forEach((t) => tagSet.add(t));
      } catch { /* ignore */ }
    });
    return ['全部', ...Array.from(tagSet)];
  }, [memes]);

  // 筛选
  const filtered = useMemo(() => {
    return memes.filter((m) => {
      const matchSearch = !searchQuery ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.origin.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (activeTag === '全部') return matchSearch;
      try {
        const tags: string[] = JSON.parse(m.tags);
        return matchSearch && tags.includes(activeTag);
      } catch {
        return matchSearch;
      }
    });
  }, [memes, searchQuery, activeTag]);

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
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-caption font-medium text-primary">梗百科</span>
          </div>
          <h1 className="text-heading-lg text-white">1103 梗百科全书</h1>
          <p className="text-body text-gray-400 mt-1.5 max-w-md mx-auto">
            收录陈泽直播间经典语录、名场面、热梗大全
          </p>
        </div>
      </section>

      {/* 搜索 + 筛选 */}
      <section className="section-block pb-0 animate-fade-in-up">
        <div className="container-main">
          {/* 搜索框 */}
          <div className="relative max-w-md mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="搜索梗名、来源、含义..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-white dark:bg-[#1e1e22] border border-divider text-body text-text-body placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-150"
            />
          </div>

          {/* 标签筛选 */}
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`h-8 px-4 rounded-full text-body font-medium transition-colors duration-150 cursor-pointer ${
                  activeTag === tag
                    ? 'bg-primary text-white'
                    : 'bg-white dark:bg-[#1e1e22] border border-divider text-text-body hover:border-primary hover:text-primary'
                }`}
              >
                {tag === '全部' ? tag : `# ${tag}`}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 梗列表 */}
      <section className="section-block animate-fade-in-up">
        <div className="container-main">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-card bg-white dark:bg-[#1e1e22] p-5 border border-divider">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#28282c] flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 dark:bg-[#28282c] rounded w-1/3 mb-2" />
                      <div className="h-4 bg-gray-100 dark:bg-[#1e1e22] rounded w-2/3 mb-1" />
                      <div className="h-4 bg-gray-100 dark:bg-[#1e1e22] rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-10 h-10 text-text-disabled mx-auto mb-3" />
              <p className="text-body text-text-muted">
                {searchQuery ? '没有找到匹配的梗' : '暂无梗百科内容'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setActiveTag('全部'); }}
                  className="mt-3 text-body text-primary hover:underline cursor-pointer"
                >
                  清除筛选
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 stagger-children">
              {filtered.map((meme) => {
                const isExpanded = expandedId === meme.id;
                let tags: string[] = [];
                try { tags = JSON.parse(meme.tags); } catch { /* ignore */ }
                
                return (
                  <div
                    key={meme.id}
                    className="rounded-card bg-white/60 dark:bg-[#1e1e22]/80 backdrop-blur-md border border-white/70 dark:border-[#333] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] transition-all duration-200 overflow-hidden"
                  >
                    {/* 梗头部 — 始终显示 */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : meme.id)}
                      className="w-full flex items-start gap-4 p-5 text-left cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors duration-150"
                    >
                      {/* 热度指示 */}
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Flame className="w-5 h-5 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-heading-sm text-text-title">{meme.title}</h3>
                          {meme.popularity > 50 && (
                            <span className="tag-primary">
                              <Sparkles className="w-3 h-3 mr-0.5" />
                              热梗
                            </span>
                          )}
                        </div>
                        <p className="text-body text-text-muted mt-1 line-clamp-2">{meme.origin}</p>
                        {tags.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {tags.map((tag) => (
                              <span key={tag} className="inline-flex items-center gap-0.5 text-caption text-text-muted bg-gray-100 dark:bg-[#28282c] rounded-tag px-1.5 py-0.5">
                                <Hash className="w-3 h-3" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0 mt-1">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-text-muted" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-text-muted" />
                        )}
                      </div>
                    </button>

                    {/* 展开详情 */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-0 border-t border-divider dark:border-[#333] animate-fade-in-up">
                        <div className="pl-14 space-y-4 mt-4">
                          {/* 详细释义 */}
                          <div>
                            <h4 className="text-body font-semibold text-text-title mb-1.5">释义</h4>
                            <p className="text-body text-text-body leading-relaxed whitespace-pre-wrap">{meme.description}</p>
                          </div>

                          {/* 用法示例 */}
                          {meme.example && (
                            <div>
                              <h4 className="text-body font-semibold text-text-title mb-1.5">用法示例</h4>
                              <div className="bg-gray-50 dark:bg-[#28282c] rounded-card p-3 border border-divider dark:border-[#333]">
                                <p className="text-body text-text-body italic whitespace-pre-wrap">&ldquo;{meme.example}&rdquo;</p>
                              </div>
                            </div>
                          )}

                          {/* 配图 */}
                          {meme.image && (
                            <div>
                              <h4 className="text-body font-semibold text-text-title mb-1.5">相关图片</h4>
                              <div className="relative w-full max-w-sm rounded-card overflow-hidden border border-divider dark:border-[#333]">
                                <img
                                  src={meme.image}
                                  alt={meme.title}
                                  className="w-full h-auto object-cover"
                                  loading="lazy"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 底部统计 */}
          {!loading && filtered.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-caption text-text-muted">
                共收录 {memes.length} 个梗 · 当前显示 {filtered.length} 个
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
