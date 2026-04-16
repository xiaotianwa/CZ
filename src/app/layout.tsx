import type { Metadata } from 'next';
import { Inter, Caveat } from 'next/font/google';
import './globals.css';
import { getSiteConfig } from '@/lib/site-data';

function resolveMetadataBase() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (!raw) return undefined;
  try {
    return new URL(raw);
  } catch {
    return undefined;
  }
}

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
  const metadataBase = resolveMetadataBase();
  const siteUrl = metadataBase?.toString().replace(/\/$/, '');

  const metadata: Metadata = {
    title: {
      default: '幺幺零叁',
      template: '幺幺零叁 - %s',
    },
    applicationName: siteName,
    description: siteDescription,
    keywords: ['陈泽', '1103', '幺幺零叁', '粉丝社区', '游戏直播', '社区互动'],
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: 'zh_CN',
      siteName,
      title: `${siteName} - 幺幺零叁`,
      description: siteDescription,
      url: siteUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${siteName} - 幺幺零叁`,
      description: siteDescription,
    },
    icons: {
      icon: '/favicon.svg',
    },
  };

  if (metadataBase) metadata.metadataBase = metadataBase;
  return metadata;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cfg = await getSiteConfig();
  const siteName = cfg.site_name || '1103社区';
  const profileName = cfg.profile_name || '陈泽';
  const siteDescription = cfg.site_description || `${profileName}的专属粉丝社区 — 看直播、聊游戏、东北老铁团`;
  const metadataBase = resolveMetadataBase();
  const siteUrl = metadataBase?.toString().replace(/\/$/, '');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: siteName,
        description: siteDescription,
        url: siteUrl,
        inLanguage: 'zh-CN',
        potentialAction: siteUrl
          ? {
            '@type': 'SearchAction',
            target: `${siteUrl}/search?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          }
          : undefined,
      },
      {
        '@type': 'Organization',
        name: siteName,
        url: siteUrl,
      },
    ],
  };

  return (
    <html lang="zh-CN" className={`${inter.variable} ${caveat.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.cdnfonts.com" />
        <link rel="stylesheet" href="https://fonts.cdnfonts.com/css/blazed" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
