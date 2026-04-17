'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Rss, Clock, ExternalLink, Heart, MessageCircle, Repeat, Film, Loader2,
} from 'lucide-react';

/** 前台仅展示最新的 N 条 */
const DISPLAY_LIMIT = 10;

interface WeiboItem {
  id: string;
  mid: string;
  bid: string | null;
  uid: string;
  screenName: string;
  avatar: string | null;
  text: string;
  images: string[];
  videoUrl: string | null;
  videoCover: string | null;
  source: string | null;
  sourceUrl: string;
  repostCount: number;
  commentCount: number;
  likeCount: number;
  publishedAt: string;
}

interface ListResponse {
  list: WeiboItem[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return '刚刚';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function WeiboPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLatest = useCallback(async () => {
    const res = await fetch(`/api/public/weibo?page=1&pageSize=${DISPLAY_LIMIT}`, {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const json = await res.json();
    if (json.code !== 0) throw new Error(json.message || '加载失败');
    return json.data as ListResponse;
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchLatest()
      .then((d) => setData(d))
      .catch(() => setData({ list: [], pagination: { total: 0, page: 1, pageSize: DISPLAY_LIMIT, totalPages: 0 } }))
      .finally(() => setLoading(false));
  }, [fetchLatest]);

  const firstItem = data?.list[0];

  return (
    <>
      {/* ====== 页头 Hero ====== */}
      <section className="relative h-48 sm:h-56 bg-gray-900 overflow-hidden mt-14">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute inset-0 flex items-center justify-center gap-4 sm:gap-6 select-none pointer-events-none">
          <span className="text-[56px] sm:text-[80px] leading-none font-bold text-white/10" style={{ fontFamily: "'Blazed', sans-serif" }}>
            1103
          </span>
          <span className="text-[28px] sm:text-[40px] leading-none text-primary/50 tracking-[0.15em]" style={{ fontFamily: "'Blazed', sans-serif" }}>
            Weibo
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-bg-page to-transparent" />
        <div className="container-main px-4 sm:px-6 lg:px-8 relative z-10 h-full flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-full px-4 py-1.5 mb-3">
            <Rss className="w-4 h-4 text-primary" />
            <span className="text-caption font-medium text-primary">微博动态</span>
          </div>
          <h1 className="text-heading-lg text-white">实时同步陈泽微博</h1>
          <p className="text-body text-gray-400 mt-1.5 max-w-md mx-auto">
            仅展示原创内容，转发/评论自动过滤 · 每 3 分钟自动更新
          </p>
        </div>
      </section>

      {/* ====== 博主信息卡 ====== */}
      <section className="section-block pb-0 animate-fade-in-up">
        <div className="container-main">
          <div className="card !p-4 flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary-bg flex items-center justify-center text-primary font-bold text-heading-sm flex-shrink-0">
              {firstItem?.screenName?.[0] || '陈'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body font-semibold text-text-title">
                {firstItem?.screenName || '陈泽'}
              </p>
              <p className="text-caption text-text-muted">
                共 {data?.pagination.total ?? 0} 条原创动态
              </p>
            </div>
            <a
              href={`https://weibo.com/u/7795649284`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline h-9 px-4 text-caption inline-flex items-center gap-1 flex-shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              去微博主页
            </a>
          </div>
        </div>
      </section>

      {/* ====== 微博列表 ====== */}
      <section className="section-block animate-fade-in-up">
        <div className="container-main">
          {loading && (
            <div className="flex items-center justify-center py-16 text-text-muted">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> 加载中...
            </div>
          )}

          {!loading && data && data.list.length === 0 && (
            <div className="card py-16 text-center">
              <Rss className="w-10 h-10 text-text-disabled mx-auto mb-3" />
              <p className="text-body text-text-muted">暂无微博动态</p>
              <p className="text-caption text-text-muted mt-1">等待首次同步完成后自动显示</p>
            </div>
          )}

          <div className="grid gap-4">
            {data?.list.map((item) => (
              <article key={item.id} className="card hover:shadow-md transition-shadow">
                {/* 头部：头像 + 昵称 + 时间 */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-bg flex items-center justify-center text-primary font-bold flex-shrink-0">
                    {item.screenName[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-text-title">{item.screenName}</p>
                    <p className="text-caption text-text-muted inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(item.publishedAt)}
                      {item.source && <span className="text-text-disabled">· 来自 {item.source}</span>}
                    </p>
                  </div>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-caption text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    查看原微博 <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* 内容 */}
                {item.text && (
                  <p className="mt-3 text-body text-text-body whitespace-pre-wrap break-words leading-relaxed">
                    {item.text}
                  </p>
                )}

                {/* 图片九宫格 */}
                {item.images.length > 0 && (
                  <div
                    className={`mt-3 grid gap-1 ${
                      item.images.length === 1
                        ? 'grid-cols-1 max-w-md'
                        : item.images.length === 2 || item.images.length === 4
                          ? 'grid-cols-2 max-w-md'
                          : 'grid-cols-3'
                    }`}
                  >
                    {item.images.slice(0, 9).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                        <img
                          src={url}
                          alt=""
                          referrerPolicy="no-referrer"
                          className={`w-full rounded-md object-cover border border-border/60 hover:opacity-90 transition-opacity ${
                            item.images.length === 1 ? 'max-h-[480px]' : 'aspect-square'
                          }`}
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                )}

                {/* 视频 */}
                {item.videoCover && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block max-w-md"
                  >
                    <div className="relative rounded-md overflow-hidden border border-border/60">
                      <img
                        src={item.videoCover}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full h-auto object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                          <Film className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                    </div>
                  </a>
                )}

                {/* 互动数据 */}
                <div className="mt-3 pt-3 border-t border-divider flex items-center gap-6 text-caption text-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Repeat className="w-3.5 h-3.5" /> {item.repostCount}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" /> {item.commentCount}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" /> {item.likeCount}
                  </span>
                </div>
              </article>
            ))}
          </div>

          {/* 底部提示：前台仅展示最新 10 条，完整列表引导去原微博主页 */}
          {data && data.list.length > 0 && (
            <div className="mt-8 text-center">
              <a
                href="https://weibo.com/u/7795649284"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline h-10 px-6 text-caption inline-flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                查看更多动态 · 去微博主页
              </a>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
