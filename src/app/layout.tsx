import type { Metadata } from 'next';
import { Inter, Caveat } from 'next/font/google';
import './globals.css';
import { getSiteConfig } from '@/lib/site-data';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
  variable: '--font-caveat',
});

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig();
  const siteName = cfg.site_name || '1103社区';
  const profileName = cfg.profile_name || '陈泽';
  const siteDescription = cfg.site_description || `${profileName}的专属粉丝社区 — 看直播、聊游戏、东北老铁团`;

  return {
    title: {
      default: '幺幺零叁',
      template: '幺幺零叁 - %s',
    },
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
    <html lang="zh-CN" className={`${inter.variable} ${caveat.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.cdnfonts.com" />
        <link rel="stylesheet" href="https://fonts.cdnfonts.com/css/blazed" />
      </head>
      <body className="min-h-screen bg-bg-page text-text-title antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
