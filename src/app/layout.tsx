import type { Metadata } from 'next';
import './globals.css';
import { getSiteConfig } from '@/lib/site-data';

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig();
  const siteName = cfg.site_name || '1103社区';
  const profileName = cfg.profile_name || '陈泽';
  const siteDescription = cfg.site_description || `${profileName}的专属粉丝社区 — 看直播、聊游戏、东北老铁团`;

  return {
    title: siteName,
    description: siteDescription,
    icons: {
      icon: '/favicon.svg',
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-bg-page text-text-title antialiased">
        {children}
      </body>
    </html>
  );
}
