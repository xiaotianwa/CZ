import { redirect } from 'next/navigation';
import { getSiteConfig } from '@/lib/site-data';

export const metadata = { title: '社区' };

export default async function Layout({ children }: { children: React.ReactNode }) {
  const cfg = await getSiteConfig();

  if (cfg.feature_community_enabled === 'false') {
    redirect('/');
  }

  return <>{children}</>;
}
