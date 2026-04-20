import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AnnouncementPopup from '@/components/AnnouncementPopup';
import MusicPlayer from '@/components/MusicPlayer';
import SplashScreen from '@/components/SplashScreen';
import MobileUXEnhancer from '@/components/MobileUXEnhancer';
import ToastProvider from '@/components/ToastProvider';
import PageViewTracker from '@/components/PageViewTracker';
import { getSiteConfig } from '@/lib/site-data';

export const dynamic = 'force-dynamic';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cfg = await getSiteConfig();
  const profileName = cfg.profile_name || '陈泽';
  const siteDescription = cfg.site_description || `${profileName}的专属粉丝社区`;

  return (
    <ToastProvider>
      <Navbar profileName={profileName} />
      <main className="relative isolate bg-bg-page pb-20 md:pb-0">
        <div className="pointer-events-none fixed inset-0 overflow-hidden select-none z-0" aria-hidden="true">
          {/* 亮色模式：1103 水印（带 primary 色调） */}
          <span
            className="font-waterbrush absolute -left-10 top-24 text-[200px] leading-none text-primary/[0.06] dark:hidden"
          >
            1103
          </span>
          <span
            className="font-waterbrush absolute left-[12%] top-[50%] text-[240px] leading-none text-primary/[0.05] rotate-6 dark:hidden"
          >
            1103
          </span>
          <span
            className="font-waterbrush absolute bottom-16 right-[-20px] text-[180px] leading-none text-primary/[0.06] -rotate-12 dark:hidden"
          >
            1103
          </span>
          {/* 暗色模式：ChenZe 水印（带 primary 色调） */}
          <span
            className="font-waterbrush absolute right-[-36px] top-[18%] text-[128px] leading-none text-primary/[0.12] rotate-[-8deg] tracking-[0.12em] hidden dark:block"
          >
            ChenZe
          </span>
          <span
            className="font-waterbrush absolute bottom-16 right-[8%] text-[120px] leading-none text-primary/[0.10] tracking-[0.14em] hidden dark:block"
          >
            ChenZe
          </span>
        </div>
        <div className="relative z-10">{children}</div>
      </main>
      <MobileUXEnhancer />
      <Footer profileName={profileName} siteDescription={siteDescription} />
      <AnnouncementPopup />
      <MusicPlayer />
      <SplashScreen />
      <PageViewTracker />
    </ToastProvider>
  );
}
