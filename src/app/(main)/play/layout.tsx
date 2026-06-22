import { redirect } from 'next/navigation';
import { getSiteConfig } from '@/lib/site-data';

export const metadata = { title: '游戏中心' };

export default async function Layout({ children }: { children: React.ReactNode }) {
  const cfg = await getSiteConfig();

  if (cfg.feature_play_enabled !== 'true') {
    redirect('/');
  }

  return <>{children}</>;
}
