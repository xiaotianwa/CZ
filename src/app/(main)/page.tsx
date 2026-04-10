import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Calendar } from 'lucide-react';
import HeroCarousel from '@/components/HeroCarousel';
import { getHomePageData } from '@/lib/site-data';

function formatNum(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toLocaleString();
}

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

export default async function HomePage() {
  const { slides, posts, events, profile, communityStats } = await getHomePageData();

  return (
    <>
      <HeroCarousel slides={slides} profile={profile} communityStats={communityStats} />

      {/* 最新动态 */}
      <section className="section-block border-t border-divider relative overflow-hidden animate-fade-in-up">
        <div
          className="absolute top-1/2 right-0 -translate-y-1/2 text-[220px] leading-none font-bold text-primary/[0.03] select-none pointer-events-none"
          style={{ fontFamily: "'Blazed', sans-serif" }}
        >
          1103
        </div>
        <div className="container-main relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title">最新动态</h2>
            <Link href="/community" className="text-body text-primary font-medium inline-flex items-center gap-0.5 cursor-pointer hover:underline">
              查看全部 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {posts.length === 0 ? (
            <p className="text-body text-text-muted text-center py-12">暂无动态</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 stagger-children">
              {posts.map((post: any) => {
                const mediaUrls: string[] = (() => { try { return JSON.parse(post.images || '[]'); } catch { return []; } })();
                const imageUrls = mediaUrls.filter((u) => !u.match(/\.(mp4|webm|mov)$/i));
                const videoUrls = mediaUrls.filter((u) => u.match(/\.(mp4|webm|mov)$/i));
                return (
                  <article key={post.id} className="card">
                    <div className="flex items-start gap-3">
                      <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                        {post.author?.avatar && <Image src={post.author.avatar} alt={post.author.name} fill className="object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-body font-medium text-text-title">{post.author?.name}</span>
                          {post.author?.role === 'star' && <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[11px] font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm">★ 董事长</span>}
                          {post.author?.role === 'assistant' && <span className="tag-primary">传媒成员</span>}
                          {post.isPinned && <span className="tag bg-red-50 text-danger">置顶</span>}
                        </div>
                        <p className="text-body text-text-body mt-1.5 line-clamp-2">{post.content}</p>

                        {videoUrls.length > 0 && (
                          <div className="mt-3 rounded-btn overflow-hidden bg-black">
                            <video src={videoUrls[0]} controls className="w-full max-h-64 rounded-btn" />
                          </div>
                        )}

                        {videoUrls.length === 0 && imageUrls.length > 0 && (
                          <div className="mt-3 rounded-btn overflow-hidden relative aspect-video bg-gray-100">
                            <Image src={imageUrls[0]} alt="" fill className="object-cover" />
                          </div>
                        )}

                        <div className="flex items-center gap-4 mt-3 text-caption text-text-muted">
                          <span>{timeAgo(post.createdAt)}</span>
                          <span>{formatNum(post.likes)} 赞</span>
                          <span>{post._count?.comments ?? 0} 评论</span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 近期活动 */}
      <section className="section-block border-t border-divider animate-fade-in-up">
        <div className="container-main">
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title">近期活动</h2>
            <Link href="/events" className="text-body text-primary font-medium inline-flex items-center gap-0.5 cursor-pointer hover:underline">
              查看全部 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {events.length === 0 ? (
            <p className="text-body text-text-muted text-center py-12">暂无活动</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-4 stagger-children">
              {events.map((event: any) => (
                <div key={event.id} className="card p-0 overflow-hidden">
                  <div className="relative aspect-video bg-gray-100">
                    <Image src={event.cover} alt={event.title} fill className="object-cover" />
                    <div className="absolute top-2 left-2">
                      <span className={`tag text-white ${event.status === 'upcoming' ? 'bg-primary' : event.status === 'ongoing' ? 'bg-success' : 'bg-gray-400'}`}>
                        {event.status === 'upcoming' ? '即将开始' : event.status === 'ongoing' ? '进行中' : '已结束'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-body font-medium text-text-title line-clamp-1">{event.title}</p>
                    <div className="flex items-center gap-1.5 mt-2 text-caption text-text-muted">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(event.startTime).toLocaleDateString('zh-CN')}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-divider">
                      <span className="text-caption text-text-muted">{formatNum(event.participants)} 人感兴趣</span>
                      <span className="text-caption text-primary font-medium cursor-pointer hover:underline">详情</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 py-16 sm:py-20 relative overflow-hidden animate-fade-in-up">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[300px] leading-none font-bold text-white/[0.04] select-none pointer-events-none"
          style={{ fontFamily: "'Blazed', sans-serif" }}
        >
          1103
        </div>
        <div className="container-main text-center max-w-lg mx-auto px-4 relative z-10">
          <h2 className="text-heading text-white">加入<span style={{ fontFamily: "'Blazed', sans-serif" }}>1103</span>老铁大家庭</h2>
          <p className="text-body text-gray-400 mt-2">
            与 {formatNum(communityStats.totalFans)} 位老铁一起，看直播、聊游戏、整活儿
          </p>
          <Link href="/join" className="btn-primary inline-flex items-center justify-center mt-6 h-11 px-8 text-base">
            加入社区
          </Link>
        </div>
      </section>
    </>
  );
}
