import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Calendar, MessageCircle, Users } from 'lucide-react';
import HeroCarousel from '@/components/HeroCarousel';
import { getHomePageData } from '@/lib/site-data';

export const dynamic = 'force-dynamic';

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

function formatDateCN(date: string | Date): string {
  const d = new Date(date);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default async function HomePage() {
  const { slides, posts, events, profile, communityStats } = await getHomePageData();

  return (
    <>
      <HeroCarousel slides={slides} profile={profile} communityStats={communityStats} />

      {/* 最新动态 */}
      <section className="section-block relative overflow-hidden animate-fade-in-up">
        {/* 玻璃效果底层：柔和渐变背景 */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(24,144,255,0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(250,173,20,0.05) 0%, transparent 60%)',
        }} />
        <div className="container-main relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="section-title">最新动态</h2>
              <p className="section-desc">社区热帖与公告</p>
            </div>
            <Link href="/community" className="text-body text-primary font-medium inline-flex items-center gap-0.5 cursor-pointer hover:underline transition-colors duration-150">
              查看全部 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-16">
              <MessageCircle className="w-10 h-10 text-text-disabled mx-auto mb-3" />
              <p className="text-body text-text-muted">暂无动态</p>
              <Link href="/community" className="text-caption text-primary mt-2 inline-block hover:underline">去社区看看</Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-5 stagger-children">
              {posts.map((post: any) => {
                const mediaUrls: string[] = (() => { try { return JSON.parse(post.images || '[]'); } catch { return []; } })();
                const imageUrls = mediaUrls.filter((u) => !u.match(/\.(mp4|webm|mov)$/i));
                const videoUrls = mediaUrls.filter((u) => u.match(/\.(mp4|webm|mov)$/i));
                return (
                  <Link key={post.id} href={`/community/${post.id}`} className="block">
                    <article className="rounded-card p-5 bg-white/40 dark:bg-[#1e1e22]/80 backdrop-blur-md border border-white/70 dark:border-[#333] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] cursor-pointer hover:-translate-y-0.5 hover:bg-white/50 dark:hover:bg-[#1e1e22] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_8px_32px_rgba(0,0,0,0.10)] transition-all duration-200">
                      <div className="flex items-start gap-3">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-[#28282c]">
                          {post.author?.avatar && <Image src={post.author.avatar} alt={post.author.name} fill className="object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-body font-medium text-text-title">{post.author?.name}</span>
                            {post.author?.role === 'star' && <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[11px] font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm">★ 董事长</span>}
                            {post.author?.role === 'assistant' && <span className="tag-primary">传媒成员</span>}
                            {post.isPinned && <span className="tag bg-red-50 text-danger">置顶</span>}
                          </div>
                          <p className="text-body text-text-body mt-2 line-clamp-2 leading-relaxed">{post.content}</p>

                          {videoUrls.length > 0 && (
                            <div className="mt-3 rounded-card overflow-hidden bg-black">
                              <video src={videoUrls[0]} controls className="w-full max-h-64 rounded-card" />
                            </div>
                          )}

                          {videoUrls.length === 0 && imageUrls.length > 0 && (
                            <div className="mt-3 rounded-card overflow-hidden relative aspect-video bg-gray-100 dark:bg-[#28282c]">
                              <Image src={imageUrls[0]} alt="帖子预览图" fill className="object-cover" />
                            </div>
                          )}

                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-black/[0.06] dark:border-[#333] text-caption text-text-muted">
                            <span>{timeAgo(post.createdAt)}</span>
                            <span>{formatNum(post.likes)} 赞</span>
                            <span>{post._count?.comments ?? 0} 评论</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 近期活动 */}
      <section className="section-block border-t border-divider animate-fade-in-up">
        <div className="container-main">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="section-title">近期活动</h2>
              <p className="section-desc">直播与线下联动</p>
            </div>
            <Link href="/events" className="text-body text-primary font-medium inline-flex items-center gap-0.5 cursor-pointer hover:underline transition-colors duration-150">
              查看全部 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="w-10 h-10 text-text-disabled mx-auto mb-3" />
              <p className="text-body text-text-muted">暂无活动</p>
              <Link href="/events" className="text-caption text-primary mt-2 inline-block hover:underline">查看活动日历</Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-5 stagger-children">
              {events.map((event: any) => (
                <Link key={event.id} href={`/events/${event.id}`} className="block">
                  <div className="card p-0 overflow-hidden cursor-pointer hover:-translate-y-0.5 transition-all duration-200">
                    <div className="relative aspect-video bg-gray-100 dark:bg-[#28282c]">
                      <Image src={event.cover} alt={event.title} fill className="object-cover" />
                      <div className="absolute top-3 left-3">
                        <span className={`tag text-white ${event.status === 'upcoming' ? 'bg-primary' : event.status === 'ongoing' ? 'bg-success' : 'bg-gray-400'}`}>
                          {event.status === 'upcoming' ? '即将开始' : event.status === 'ongoing' ? '进行中' : '已结束'}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-body font-medium text-text-title line-clamp-1">{event.title}</p>
                      <div className="flex items-center gap-1.5 mt-2 text-caption text-text-muted">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDateCN(event.startTime)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-divider">
                        <div className="flex items-center gap-1 text-caption text-text-muted">
                          <Users className="w-3.5 h-3.5" />
                          <span>{formatNum(event.participants)} 人感兴趣</span>
                        </div>
                        <span className="text-caption text-primary font-medium">详情 →</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-16 sm:py-20 overflow-hidden animate-fade-in-up bg-[#0a0a0a]">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[300px] leading-none font-bold text-white/[0.04] select-none pointer-events-none font-blazed"
        >
          1103
        </div>
        <div className="container-main text-center max-w-lg mx-auto px-4 relative z-10">
          <h2 className="text-heading text-white">加入<span className="font-blazed"> 1103 </span>老铁大家庭</h2>
          <p className="text-body text-gray-400 mt-2">
            与 {formatNum(communityStats.totalFans)} 位老铁一起，看直播、聊游戏、整活儿
          </p>
          <Link href="/join" className="inline-flex items-center justify-center mt-6 h-11 px-8 text-base rounded-full bg-white text-[#1a1a1a] font-semibold hover:bg-white/90 transition-colors duration-150 active:scale-[0.98]">
            加入社区
          </Link>
        </div>
      </section>
    </>
  );
}
