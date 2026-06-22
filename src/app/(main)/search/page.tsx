'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Search, Users, X } from 'lucide-react';

interface UserResult {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  level: number;
  badge: string | null;
  bio: string | null;
  city: string | null;
}

const roleLabel: Record<string, string> = {
  star: '董事长',
  assistant: '传媒成员',
  admin: '管理员',
  fan: '粉丝',
};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const q = searchParams.get('q') || '';
  const [query, setQuery] = useState(q);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (keyword: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword.trim()) params.set('q', keyword.trim());
      const res = await fetch(`/api/public/search?${params.toString()}`);
      const json = await res.json();
      if (json.code === 0 && json.data) {
        setUsers(json.data.users || []);
        setUserTotal(json.data.userTotal || 0);
      }
    } catch {
      setUsers([]);
      setUserTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setQuery(q);
    doSearch(q);
  }, [q, doSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const keyword = query.trim();
    router.push(keyword ? `/search?q=${encodeURIComponent(keyword)}` : '/search');
  };

  const handleClear = () => {
    setQuery('');
    router.push('/search');
    inputRef.current?.focus();
  };

  return (
    <div className="pt-14 min-h-screen bg-gray-50/50 dark:bg-[#111113]">
      <section className="bg-white dark:bg-[#1e1e22] border-b border-divider sticky top-14 z-30">
        <div className="container-main px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索用户、城市或简介"
              className="w-full h-12 pl-12 pr-20 rounded-full border border-divider text-body text-text-body placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-gray-50 dark:bg-[#28282c] focus:bg-white dark:focus:bg-[#1e1e22]"
              autoFocus
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {query && (
                <button type="button" onClick={handleClear} className="p-1.5 rounded-full text-text-disabled hover:text-text-muted hover:bg-gray-100 transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              )}
              <button type="submit" className="h-8 px-4 rounded-full bg-primary text-white text-caption font-medium hover:bg-primary/90 transition-colors cursor-pointer">
                搜索
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="container-main px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-primary" />
            <h1 className="text-body font-medium text-text-title">{q ? `用户结果 (${userTotal})` : '活跃用户'}</h1>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-text-muted">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              加载中...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-20">
              <Search className="w-10 h-10 text-text-disabled mx-auto mb-3" />
              <p className="text-body text-text-muted">没有找到相关用户</p>
            </div>
          ) : (
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
                      <span className="text-body font-medium text-text-title truncate">{u.name}</span>
                      <span className="inline-flex items-center h-5 px-2 rounded-full text-[11px] font-bold bg-primary-bg text-primary">{roleLabel[u.role] || u.role}</span>
                    </div>
                    {u.bio && <p className="text-caption text-text-muted mt-0.5 line-clamp-1">{u.bio}</p>}
                    <div className="flex items-center gap-3 mt-1 text-caption text-text-disabled">
                      <span>Lv.{u.level}</span>
                      {u.city && <span>{u.city}</span>}
                      {u.badge && <span>{u.badge}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
