import Link from 'next/link';
import { Gamepad2, MapPinned, MessageSquarePlus, UserRound } from 'lucide-react';
import HeroCarousel from '@/components/HeroCarousel';
import { getHomePageData } from '@/lib/site-data';

export const dynamic = 'force-dynamic';

function formatNum(num: number): string {
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toLocaleString();
}

export default async function HomePage() {
  const { slides, profile, communityStats } = await getHomePageData();

  const quickLinks = [
    { href: '/profile', label: `关于${profile.name}`, desc: '资料、经历与社交账号', icon: UserRound },
    { href: '/games', label: '最近在玩', desc: '直播常玩游戏与推荐', icon: Gamepad2 },
    { href: '/fan-map', label: '粉丝地图', desc: '看看大家来自哪里', icon: MapPinned },
    { href: '/feedback', label: '反馈答疑', desc: '提交建议与问题', icon: MessageSquarePlus },
  ];

  return (
    <>
      <HeroCarousel slides={slides} profile={profile} />

      <section className="section-block bg-white">
        <div className="container-main">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((item) => (
              <Link key={item.href} href={item.href} className="card p-5 hover:-translate-y-0.5 transition-all duration-200">
                <item.icon className="w-5 h-5 text-primary mb-4" />
                <p className="text-body font-medium text-text-title">{item.label}</p>
                <p className="text-caption text-text-muted mt-1">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-16 sm:py-20 overflow-hidden animate-fade-in-up bg-[#0a0a0a]">
        <div className="font-waterbrush absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[300px] leading-none text-white/[0.04] select-none pointer-events-none">
          1103
        </div>
        <div className="container-main text-center max-w-lg mx-auto px-4 relative z-10">
          <h2 className="text-heading text-white">加入 <span className="font-waterbrush">1103</span></h2>
          <p className="text-body text-gray-400 mt-2">
            和 {formatNum(communityStats.totalFans)} 位老铁一起，看直播、聊游戏、整活儿。
          </p>
          <Link href="/join" className="inline-flex items-center justify-center mt-6 h-11 px-8 text-base rounded-full bg-white text-[#1a1a1a] font-semibold hover:bg-white/90 transition-colors duration-150 active:scale-[0.98]">
            加入
          </Link>
        </div>
      </section>
    </>
  );
}
