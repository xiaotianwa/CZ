'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Search, FileText, Users, Loader2, MessageCircle, Heart, Star, ImageIcon } from 'lucide-react';

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
  const [query, setQuery] = useState(q);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [postTotal, setPostTotal] = useState(0);
  const [userTotal, setUserTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (keyword: string, type: TabKey) => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: keyword.trim(), type, pageSize: '30' });
      const res = await fetch(`/api/public/search?${params}`);
      const json = await res.json();
      if (json.code === 0 && json.data) {
        if (json.data.posts) setPosts(json.data.posts);
        if (json.data.users) setUsers(json.data.users);
        if (json.data.postTotal !== undefined) setPostTotal(json.data.postTotal);
        if (json.data.userTotal !== undefined) setUserTotal(json.data.userTotal);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (q) {
      setQuery(q);
      doSearch(q, activeTab);
    }
  }, [q, activeTab, doSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setPosts([]);
    setUsers([]);
  };

  const showPosts = activeTab === 'all' || activeTab === 'posts';
  const showUsers = activeTab === 'all' || activeTab === 'users';

  return (
    <div className="pt-14">
      {/* 搜索头部 */}
      <section className="bg-white border-b border-divider sticky top-14 z-30">
        <div className="container-main px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索帖子、用户..."
              className="w-full h-11 pl-11 pr-4 rounded-full border border-divider text-body text-text-body placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors bg-gray-50"
              autoFocus
            />
          </form>

          {q && (
            <div className="flex gap-1 mt-3 max-w-2xl mx-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`h-8 px-4 rounded-btn text-body font-medium transition-colors duration-150 cursor-pointer inline-flex items-center gap-1.5 ${
                    activeTab === tab.key
                      ? 'bg-primary text-white'
                      : 'bg-gray-50 text-text-body hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.key === 'posts' && postTotal > 0 && <span className="text-caption">({postTotal})</span>}
                  {tab.key === 'users' && userTotal > 0 && <span className="text-caption">({userTotal})</span>}
                  {tab.key === 'all' && (postTotal + userTotal) > 0 && <span className="text-caption">({postTotal + userTotal})</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 搜索结果 */}
      <div className="container-main px-4 sm:px-6 lg:px-8 py-6">
        {!q ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-text-disabled mx-auto mb-4" />
            <p className="text-body text-text-muted">输入关键词搜索帖子或用户</p>
          </div>
        ) : loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
            <p className="text-body text-text-muted mt-3">搜索中...</p>
          </div>
        ) : (postTotal === 0 && userTotal === 0) ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-text-disabled mx-auto mb-4" />
            <p className="text-body text-text-muted">没有找到 "<span className="text-primary font-medium">{q}</span>" 相关结果</p>
            <p className="text-caption text-text-disabled mt-1">换个关键词试试</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-8">
            {/* 帖子结果 */}
            {showPosts && posts.length > 0 && (
              <div>
                {activeTab === 'all' && (
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-heading-sm text-text-title flex items-center gap-2">
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
                      <Link key={post.id} href={`/community/${post.id}`} className="card block hover:shadow-card transition-shadow">
                        <div className="flex items-start gap-3">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                            {post.author.avatar && <Image src={post.author.avatar} alt={post.author.name} fill className="object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-body font-medium text-text-title">{post.author.name}</span>
                              {roleLabel[post.author.role] && (
                                <span className={`inline-flex items-center h-5 px-2 rounded-full text-[11px] font-bold ${roleLabel[post.author.role].cls}`}>
                                  {post.author.role === 'star' && '★ '}{roleLabel[post.author.role].text}
                                </span>
                              )}
                            </div>
                            <p className="text-body text-text-body mt-1.5 line-clamp-3">
                              {highlightText(post.content, q)}
                            </p>
                            {imageUrls.length > 0 && (
                              <div className="flex gap-2 mt-2">
                                {imageUrls.slice(0, 3).map((url, i) => (
                                  <div key={i} className="relative w-16 h-16 rounded-btn overflow-hidden bg-gray-100 flex-shrink-0">
                                    <Image src={url} alt="" fill className="object-cover" />
                                  </div>
                                ))}
                                {imageUrls.length > 3 && (
                                  <div className="w-16 h-16 rounded-btn bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-caption text-text-muted">+{imageUrls.length - 3}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-caption text-text-muted">
                              <span>{timeAgo(post.createdAt)}</span>
                              <span className="inline-flex items-center gap-1"><Heart className="w-3 h-3" /> {post.likes}</span>
                              <span className="inline-flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {post._count.comments}</span>
                              {post.postTags.length > 0 && post.postTags.map((pt) => (
                                <span key={pt.tag.id} className="tag-primary">{pt.tag.name}</span>
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
              <div>
                {activeTab === 'all' && (
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-heading-sm text-text-title flex items-center gap-2">
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
                  {users.map((user) => (
                    <div key={user.id} className="card flex items-center gap-3">
                      <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                        {user.avatar ? (
                          <Image src={user.avatar} alt={user.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary-bg">
                            <span className="text-body font-bold text-primary">{user.name[0]}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-body font-medium text-text-title">{highlightText(user.name, q)}</span>
                          {roleLabel[user.role] && (
                            <span className={`inline-flex items-center h-5 px-2 rounded-full text-[11px] font-bold ${roleLabel[user.role].cls}`}>
                              {roleLabel[user.role].text}
                            </span>
                          )}
                          {user.badge && <span className="tag bg-primary-bg text-primary">{user.badge}</span>}
                        </div>
                        {user.bio && (
                          <p className="text-caption text-text-muted mt-0.5 line-clamp-1">{highlightText(user.bio, q)}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-caption text-text-disabled">
                          <span>Lv.{user.level}</span>
                          <span>{user._count.posts} 帖子</span>
                          <span>{user._count.comments} 评论</span>
                          {user.city && <span>{user.city}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
