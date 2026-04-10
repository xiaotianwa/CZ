import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AnnouncementPopup from '@/components/AnnouncementPopup';
import MusicPlayer from '@/components/MusicPlayer';
import SplashScreen from '@/components/SplashScreen';
import { getSiteConfig } from '@/lib/site-data';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cfg = await getSiteConfig();
  const profileName = cfg.profile_name || '陈泽';
  const siteDescription = cfg.site_description || `${profileName}的专属粉丝社区`;

  return (
    <>
      <Navbar profileName={profileName} />
      <main>{children}</main>
      <Footer profileName={profileName} siteDescription={siteDescription} />
      <AnnouncementPopup />
      <MusicPlayer />
      <SplashScreen />
    </>
  );
}
