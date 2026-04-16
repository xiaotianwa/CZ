'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Search, FileText, Users, MessageCircle, Heart, TrendingUp, Hash, X, ArrowRight, Clock, Flame, Loader2 } from 'lucide-react';

interface PostResult {
  id: string;
  content: string;
  images: string;
  likes: number;
  isPinned: boolean;
  createdAt: string;
  author: { id: string; name: string; avatar: string | null; role: string };
  postTags: { tag: { id: string; name: string; color: string | null } }[];
  _count: { comments: number };
}

interface UserResult {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  level: number;
  badge: string | null;
  bio: string | null;
  city: string | null;
  _count: { posts: number; comments: number };
}

interface HotTag {
  id: string;
  name: string;
  color: string | null;
  _count: { postTags: number };
}

interface HotPost {
  id: string;
  content: string;
  likes: number;
  author: { name: string };
}

interface SearchCacheData {
  posts: PostResult[];
  users: UserResult[];
  postTotal: number;
  userTotal: number;
}

type TabKey = 'all' | 'posts' | 'users';

const tabs: { key: TabKey; label: string; icon: typeof Search }[] = [
  { key: 'all', label: '全部', icon: Search },
  { key: 'posts', label: '帖子', icon: FileText },
  { key: 'users', label: '用户', icon: Users },
];

const roleLabel: Record<string, { text: string; cls: string }> = {
  star: { text: '董事长', cls: 'bg-gradient-to-r from-amber-400 to-orange-400 text-white' },
  assistant: { text: '传媒成员', cls: 'bg-primary-bg text-primary' },
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(date).toLocaleDateString('zh-CN');
}

function highlightText(text: string, keyword: string) {
  if (!keyword) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className="bg-primary/20 text-primary rounded px-0.5">{part}</mark> : part
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get('q') || '';
  const inputRef = useRef<HTMLInputElement>(null);
  const cacheRef = useRef<Map<string, SearchCacheData>>(new Map());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState(q);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [postTotal, setPostTotal] = useState(0);
  const [userTotal, setUserTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hotTags, setHotTags] = useState<HotTag[]>([]);
  const [hotPosts, setHotPosts] = useState<HotPost[]>([]);
  const [filterTagId, setFilterTagId] = useState<string>('');
  const [filterTagName, setFilterTagName] = useState<string>('');
  const [filterAuthorId, setFilterAuthorId] = useState<string>('');
  const [filterAuthorName, setFilterAuthorName] = useState<string>('');
  const [sortBy, setSortBy] = useState<'relevant' | 'new' | 'hot'>('relevant');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;

  // 加载搜索历史
  useEffect(() => {
    try {
      const stored = localStorage.getItem('search_history_v1');
      if (stored) setSearchHistory(JSON.parse(stored));
    } catch {}
  }, []);

  const saveToHistory = useCallback((keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    setSearchHistory((prev) => {
      const next = [trimmed, ...prev.filter((h) => h !== trimmed)].slice(0, 10);
      localStorage.setItem('search_history_v1', JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem('search_history_v1');
  }, []);

  // 获取热门数据（无关键词时）
  useEffect(() => {
    if (!q) {
      const cachedHot = sessionStorage.getItem('search_hot_cache_v1');
      if (cachedHot) {
        try {
          const parsed = JSON.parse(cachedHot) as { hotTags: HotTag[]; hotPosts: HotPost[] };
          setHotTags(parsed.hotTags || []);
          setHotPosts(parsed.hotPosts || []);
          return;
        } catch {
          sessionStorage.removeItem('search_hot_cache_v1');
        }
      }

      fetch('/api/public/search')
        .then((r) => r.json())
        .then((json) => {
          if (json.code === 0 && json.data) {
            const nextHotTags = json.data.hotTags || [];
            const nextHotPosts = json.data.hotPosts || [];
            setHotTags(nextHotTags);
            setHotPosts(nextHotPosts);
            sessionStorage.setItem('search_hot_cache_v1', JSON.stringify({ hotTags: nextHotTags, hotPosts: nextHotPosts }));
          }
        })
        .catch(() => {});
    }
  }, [q]);

  const doSearch = useCallback(async (keyword: string, type: TabKey, pageNum: number = 1, append: boolean = false) => {
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword && !filterTagId && !filterAuthorId) return;

    const cacheKey = `${normalizedKeyword}__${type}__${filterTagId}__${filterAuthorId}__${sortBy}__${pageNum}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached && !append) {
      setPosts(cached.posts);
      setUsers(cached.users);
      setPostTotal(cached.postTotal);
      setUserTotal(cached.userTotal);
      return;
    }

    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const params = new URLSearchParams({ q: normalizedKeyword, type, pageSize: String(PAGE_SIZE), page: String(pageNum), sort: sortBy });
      if (filterTagId) params.set('tagId', filterTagId);
      if (filterAuthorId) params.set('authorId', filterAuthorId);
      const res = await fetch(`/api/public/search?${params}`);
      const json = await res.json();
      if (json.code === 0 && json.data) {
        const nextPosts = json.data.posts || [];
        const nextUsers = json.data.users || [];
        const nextPostTotal = json.data.postTotal ?? 0;
        const nextUserTotal = json.data.userTotal ?? 0;
        if (append) {
          setPosts((prev) => [...prev, ...nextPosts]);
          setUsers((prev) => [...prev, ...nextUsers]);
        } else {
          setPosts(nextPosts);
          setUsers(nextUsers);
        }
        setPostTotal(nextPostTotal);
        setUserTotal(nextUserTotal);
        cacheRef.current.set(cacheKey, {
          posts: append ? [...posts, ...nextPosts] : nextPosts,
          users: append ? [...users, ...nextUsers] : nextUsers,
          postTotal: nextPostTotal,
          userTotal: nextUserTotal,
        });
      }
    } catch { /* ignore */ }
    setLoading(false);
    setLoadingMore(false);
  }, [filterTagId, filterAuthorId, sortBy, posts, users, PAGE_SIZE]);

  useEffect(() => {
    setQuery(q);
    setPage(1);
    if (q || filterTagId || filterAuthorId) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        doSearch(q, activeTab, 1, false);
      }, 300);
    } else {
      setPosts([]);
      setUsers([]);
      setPostTotal(0);
      setUserTotal(0);
    }
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [q, activeTab, filterTagId, filterAuthorId, sortBy, doSearch]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    doSearch(q, activeTab, nextPage, true);
  }, [page, q, activeTab, doSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      saveToHistory(query.trim());
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleTagClick = (tagName: string) => {
    setQuery(tagName);
    saveToHistory(tagName);
    router.push(`/search?q=${encodeURIComponent(tagName)}`);
  };

  const handleClear = () => {
    setQuery('');
    setPosts([]);
    setUsers([]);
    setPostTotal(0);
    setUserTotal(0);
    setFilterTagId('');
    setFilterTagName('');
    setFilterAuthorId('');
    setFilterAuthorName('');
    router.push('/search');
    inputRef.current?.focus();
  };

  const handleFilterByTag = (tagId: string, tagName: string) => {
    setFilterTagId(tagId);
    setFilterTagName(tagName);
  };

  const clearTagFilter = () => {
    setFilterTagId('');
    setFilterTagName('');
  };

  const handleFilterByAuthor = (authorId: string, authorName: string) => {
    setFilterAuthorId(authorId);
    setFilterAuthorName(authorName);
    setActiveTab('posts');
  };

  const clearAuthorFilter = () => {
    setFilterAuthorId('');
    setFilterAuthorName('');
  };

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setPage(1);
    setPosts([]);
    setUsers([]);
  };

  const hasMorePosts = posts.length < postTotal;
  const hasMoreUsers = users.length < userTotal;
  const hasMore = hasMorePosts || hasMoreUsers;

  const showPosts = activeTab === 'all' || activeTab === 'posts';
  const showUsers = activeTab === 'all' || activeTab === 'users';
  const displayKeyword = q || filterTagName || filterAuthorName;

  return (
    <div className="pt-14 min-h-screen bg-gray-50/50 dark:bg-[#111113]">
      {/* 搜索头部 */}
      <section className="bg-white dark:bg-[#1e1e22] border-b border-divider sticky top-14 z-30">
        <div className="container-main px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSubmit} className="animate-fade-in-up relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索帖子、标签、用户..."
              className="w-full h-12 pl-12 pr-20 rounded-full border border-divider text-body text-text-body placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-gray-50 dark:bg-[#28282c] focus:bg-white dark:focus:bg-[#1e1e22]"
              autoFocus
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 rounded-full text-text-disabled hover:text-text-muted hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="h-8 px-4 rounded-full bg-primary text-white text-caption font-medium hover:bg-primary/90 transition-colors cursor-pointer"
              >
                搜索
              </button>
            </div>
          </form>

          {/* Active filters */}
          {(filterTagId || filterAuthorId) && (
            <div className="flex items-center gap-2 mt-3 max-w-2xl mx-auto flex-wrap">
              <span className="text-caption text-text-muted">筛选：</span>
              {filterTagId && (
                <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-primary/10 text-primary text-caption font-medium">
                  <Hash className="w-3 h-3" />{filterTagName}
                  <button onClick={clearTagFilter} className="ml-0.5 p-0.5 rounded-full hover:bg-primary/20 cursor-pointer"><X className="w-3 h-3" /></button>
                </span>
              )}
              {filterAuthorId && (
                <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-orange-500/10 text-orange-600 text-caption font-medium">
                  <Users className="w-3 h-3" />{filterAuthorName}
                  <button onClick={clearAuthorFilter} className="ml-0.5 p-0.5 rounded-full hover:bg-orange-500/20 cursor-pointer"><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}

          {(q || filterTagId || filterAuthorId) && (
            <div className="flex items-center justify-between mt-3 max-w-2xl mx-auto">
              <div className="flex gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    className={`h-8 px-4 rounded-full text-caption font-medium transition-colors duration-150 cursor-pointer inline-flex items-center gap-1.5 ${
                      activeTab === tab.key
                        ? 'bg-primary text-white'
                        : 'text-text-body hover:bg-gray-100 dark:hover:bg-[#28282c]'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {tab.key === 'posts' && postTotal > 0 && <span className="opacity-70">({postTotal})</span>}
                    {tab.key === 'users' && userTotal > 0 && <span className="opacity-70">({userTotal})</span>}
                    {tab.key === 'all' && (postTotal + userTotal) > 0 && <span className="opacity-70">({postTotal + userTotal})</span>}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 rounded-full bg-gray-50 dark:bg-[#28282c] p-1">
                {([['relevant', '相关'], ['new', '最新'], ['hot', '最热']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key)}
                    className={`h-6 px-2.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                      sortBy === key ? 'bg-white dark:bg-[#1e1e22] text-primary shadow-sm' : 'text-text-muted hover:text-primary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 搜索结果 / 发现页 */}
      <div className="container-main px-4 sm:px-6 lg:px-8 py-6">
        {!q && !filterTagId && !filterAuthorId ? (
          /* ========= 无搜索词：展示发现页 ========= */
          <div className="max-w-2xl mx-auto space-y-8">
            {/* 搜索历史 */}
            {searchHistory.length > 0 && (
              <div className="animate-fade-in-up">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-body font-medium text-text-title flex items-center gap-2">
                    <Clock className="w-4 h-4 text-text-muted" />
                    搜索历史
                  </h2>
                  <button onClick={clearHistory} className="text-caption text-text-disabled hover:text-danger transition-colors cursor-pointer">
                    清空
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((h) => (
                    <button
                      key={h}
                      onClick={() => handleTagClick(h)}
                      className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-white dark:bg-[#1e1e22] border border-divider text-caption text-text-body hover:border-primary hover:text-primary transition-all cursor-pointer"
                    >
                      <Clock className="w-3 h-3 text-text-disabled" />
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 热门标签 */}
            {hotTags.length > 0 && (
              <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <h2 className="text-body font-medium text-text-title flex items-center gap-2 mb-3">
                  <Hash className="w-4 h-4 text-primary" />
                  热门标签
                </h2>
                <div className="flex flex-wrap gap-2">
                  {hotTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagClick(tag.name)}
                      className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-white border border-divider text-caption font-medium text-text-body hover:border-primary hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color || '#1890ff' }} />
                      {tag.name}
                      <span className="text-text-disabled">{tag._count.postTags}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 热门帖子 */}
            {hotPosts.length > 0 && (
              <div className="animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
                <h2 className="text-body font-medium text-text-title flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  热门内容
                </h2>
                <div className="bg-white dark:bg-[#1e1e22] rounded-card border border-divider divide-y divide-divider">
                  {hotPosts.map((post, idx) => (
                    <Link
                      key={post.id}
                      href={`/community/${post.id}`}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors"
                    >
                      <span className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold ${
                        idx < 3 ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-body text-text-body line-clamp-1">{post.content}</p>
                        <div className="flex items-center gap-3 mt-1 text-caption text-text-disabled">
                          <span>{post.author.name}</span>
                          <span className="inline-flex items-center gap-1"><Heart className="w-3 h-3" /> {post.likes}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-text-disabled flex-shrink-0 mt-0.5" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {hotTags.length === 0 && hotPosts.length === 0 && (
              <div className="animate-fade-in-up text-center py-16">
                <Search className="w-10 h-10 text-text-disabled mx-auto mb-3" />
                <p className="text-body text-text-muted">输入关键词搜索帖子、标签或用户</p>
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="max-w-3xl mx-auto space-y-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-card border border-divider bg-white dark:bg-[#1e1e22] p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#2a2a2f] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="h-4 w-36 rounded bg-gray-100 dark:bg-[#2a2a2f]" />
                    <div className="mt-2 h-3 w-full rounded bg-gray-100 dark:bg-[#2a2a2f]" />
                    <div className="mt-2 h-3 w-3/4 rounded bg-gray-100 dark:bg-[#2a2a2f]" />
                    <div className="mt-3 flex gap-2">
                      <div className="w-14 h-14 rounded bg-gray-100 dark:bg-[#2a2a2f]" />
                      <div className="w-14 h-14 rounded bg-gray-100 dark:bg-[#2a2a2f]" />
                      <div className="w-14 h-14 rounded bg-gray-100 dark:bg-[#2a2a2f]" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (postTotal === 0 && userTotal === 0) ? (
          <div className="text-center py-20">
            <Search className="w-10 h-10 text-text-disabled mx-auto mb-3" />
            <p className="text-body text-text-muted">没有找到 &ldquo;<span className="text-primary font-medium">{displayKeyword}</span>&rdquo; 相关结果</p>
            <p className="text-caption text-text-disabled mt-1">换个关键词试试</p>
          </div>
        ) : (
          /* ========= 搜索结果 ========= */
          <div className="max-w-3xl mx-auto space-y-8">
            {/* 帖子结果 */}
            {showPosts && posts.length > 0 && (
              <div className="animate-fade-in-up">
                {activeTab === 'all' && (
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-body font-medium text-text-title flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" /> 帖子 ({postTotal})
                    </h2>
                    {postTotal > posts.length && (
                      <button onClick={() => handleTabChange('posts')} className="text-caption text-primary font-medium cursor-pointer hover:underline">
                        查看全部
                      </button>
                    )}
                  </div>
                )}
                <div className="space-y-3">
                  {posts.map((post) => {
                    const mediaUrls: string[] = (() => { try { return JSON.parse(post.images || '[]'); } catch { return []; } })();
                    const imageUrls = mediaUrls.filter((u) => !u.match(/\.(mp4|webm|mov)$/i));
                    return (
                      <Link key={post.id} href={`/community/${post.id}`} className="block bg-white dark:bg-[#1e1e22] rounded-card border border-divider p-4 hover:shadow-card transition-shadow">
                        <div className="flex items-start gap-3">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                            {post.author.avatar && <Image src={post.author.avatar} alt={post.author.name} fill className="object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-body font-medium text-text-title">{post.author.name}</span>
                              {roleLabel[post.author.role] && (
                                <span className={`inline-flex items-center h-5 px-2 rounded-full text-[11px] font-bold ${roleLabel[post.author.role].cls}`}>
                                  {post.author.role === 'star' && <span className="mr-0.5">&#9733;</span>}{roleLabel[post.author.role].text}
                                </span>
                              )}
                              <span className="text-caption text-text-disabled">{timeAgo(post.createdAt)}</span>
                            </div>
                            <p className="text-body text-text-body mt-1.5 line-clamp-3">
                              {highlightText(post.content, q)}
                            </p>
                            {imageUrls.length > 0 && (
                              <div className="flex gap-2 mt-2.5">
                                {imageUrls.slice(0, 3).map((url, i) => (
                                  <div key={i} className="relative w-16 h-16 rounded-btn overflow-hidden bg-gray-100 flex-shrink-0">
                                    <Image src={url} alt={`搜索结果图片 ${i + 1}`} fill className="object-cover" />
                                  </div>
                                ))}
                                {imageUrls.length > 3 && (
                                  <div className="w-16 h-16 rounded-btn bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-caption text-text-muted">+{imageUrls.length - 3}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-4 mt-2.5 text-caption text-text-muted">
                              <span className="inline-flex items-center gap-1"><Heart className="w-3 h-3" /> {post.likes}</span>
                              <span className="inline-flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {post._count.comments}</span>
                              {post.postTags.length > 0 && post.postTags.map((pt) => (
                                <button
                                  key={pt.tag.id}
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleFilterByTag(pt.tag.id, pt.tag.name); }}
                                  className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer"
                                >
                                  <Hash className="w-3 h-3" />{pt.tag.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 用户结果 */}
            {showUsers && users.length > 0 && (
              <div className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
                {activeTab === 'all' && (
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-body font-medium text-text-title flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" /> 用户 ({userTotal})
                    </h2>
                    {userTotal > users.length && (
                      <button onClick={() => handleTabChange('users')} className="text-caption text-primary font-medium cursor-pointer hover:underline">
                        查看全部
                      </button>
                    )}
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  {users.map((u) => (
                    <div key={u.id} className="bg-white dark:bg-[#1e1e22] rounded-card border border-divider p-4 flex items-center gap-3 hover:shadow-card transition-shadow">
                      <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                        {u.avatar ? (
                          <Image src={u.avatar} alt={u.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary-bg">
                            <span className="text-body font-bold text-primary">{u.name[0]}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-body font-medium text-text-title">{highlightText(u.name, q)}</span>
                          {roleLabel[u.role] && (
                            <span className={`inline-flex items-center h-5 px-2 rounded-full text-[11px] font-bold ${roleLabel[u.role].cls}`}>
                              {roleLabel[u.role].text}
                            </span>
                          )}
                        </div>
                        {u.bio && (
                          <p className="text-caption text-text-muted mt-0.5 line-clamp-1">{highlightText(u.bio, q)}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-caption text-text-disabled">
                          <span>Lv.{u.level}</span>
                          <span>{u._count.posts} 帖子</span>
                          <span>{u._count.comments} 评论</span>
                          {u.city && <span>{u.city}</span>}
                        </div>
                        {u._count.posts > 0 && (
                          <button
                            onClick={() => handleFilterByAuthor(u.id, u.name)}
                            className="mt-1.5 text-caption text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" /> 筛选TA的帖子
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 加载更多 */}
            {hasMore && !loading && (
              <div className="text-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 h-10 px-6 rounded-full border border-divider text-body text-text-body font-medium hover:border-primary hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loadingMore ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> 加载中...</>
                  ) : (
                    '加载更多'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
