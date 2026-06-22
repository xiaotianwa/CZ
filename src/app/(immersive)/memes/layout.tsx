import { redirect } from 'next/navigation';
import { getSiteConfig } from '@/lib/site-data';

export const metadata = { title: '梗百科' };

export default async function Layout({ children }: { children: React.ReactNode }) {
  const cfg = await getSiteConfig();

  if (cfg.feature_memes_enabled !== 'true') {
    redirect('/');
  }

  return <>{children}</>;
}
