import type { Metadata } from 'next';
import Image from 'next/image';
import { MapPin, Cake, Ruler, Star, ExternalLink, Users, AtSign, Heart } from 'lucide-react';
import { getProfilePageData, getSiteConfig } from '@/lib/site-data';
import StickyTimeline from '@/components/StickyTimeline';

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig();
  const profileName = cfg.profile_name || '陈泽';
  return { title: `关于${profileName}` };
}

function DouyinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M25.5 2C25.5 2 25.8 9.5 33.3 10.3V16.5C33.3 16.5 29.5 16.3 25.5 13.5V30C25.5 42 11 44 6 36.5C1 29 5.5 19.5 16 19.5V26C16 26 11.5 25.5 10 29.5C8.5 33.5 11 37 15 37.5C19 38 21 35 21 31V2H25.5Z" fill="currentColor"/>
    </svg>
  );
}

function WeiboIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1024 1024" fill="none" className={className}>
      <path d="M440.6 649.5c-85.7 4.5-159.6-42.5-165.1-104.8-5.5-62.4 59.7-119.6 145.4-124.1 85.7-4.5 159.6 42.5 165.1 104.8 5.5 62.3-59.7 119.6-145.4 124.1z" fill="currentColor" opacity="0.5"/>
      <path d="M858.9 382.8c-8.4-27.4-36.8-42.8-63.5-34.4-26.7 8.4-41.3 36-32.9 63.4 22 72-4.7 135.2-78.1 181.7-72.9 46.2-159.3 52.3-238.5 38.5-30.5-5.3-56.8-15.1-80.8-28.2-115.3-62.5-182.2-191.9-121.2-303.9C307.8 181.7 465.3 91.7 601.4 112c68 10.2 118.3 45.5 146.1 82.2 17.2 22.7 49.6 27.1 72.3 9.9 22.7-17.2 27.1-49.6 9.9-72.3-44.3-58.5-120.2-112-221-127.2C430.5-22.1 232.2 91.3 148 248.5c-89.5 167.1 4.2 365.7 171.3 456.3 36.9 20 77.6 34.4 120.3 42.5 105.9 20.1 225.1 8.9 324.3-54 107-67.8 141.3-177.1 95-310.5z" fill="currentColor"/>
      <path d="M731.3 264.4c-3.5-11.2-15.3-17.5-26.3-14-11 3.5-17.1 14.8-13.6 26 9.8 31.3-0.8 59.4-30.5 78.3-29.3 18.6-68.6 18.6-99.3 8.1-12.5-4.3-25.3 2.5-29.6 14.7-4.3 12.3 2.6 24.6 15 28.9 47.2 16.2 108.6 14.1 156.7-16.4 48.5-30.8 46.1-78.5 27.6-125.6z" fill="currentColor"/>
    </svg>
  );
}

const platformMeta: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  '抖音': { color: '#FE2C55', bg: 'bg-gray-50 dark:bg-[#28282c]', icon: <DouyinIcon className="w-6 h-6 text-[#FE2C55]" /> },
  '微博': { color: '#E6162D', bg: 'bg-gray-50 dark:bg-[#28282c]', icon: <WeiboIcon className="w-6 h-6 text-[#E6162D]" /> },
};

export default async function ProfilePage() {
  const { profile, timeline } = await getProfilePageData();

  return (
    <>
      {/* Cover */}
      <section className="relative h-48 sm:h-56 bg-gray-900 overflow-hidden mt-14">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute inset-0 flex items-center justify-center gap-4 sm:gap-6 select-none pointer-events-none">
          <span
            className="font-waterbrush text-[56px] sm:text-[80px] leading-none text-white/10"
          >
            1103
          </span>
          <span
            className="font-waterbrush text-[28px] sm:text-[40px] leading-none text-primary/50 tracking-[0.15em]"
          >
            ChenZe
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-bg-page to-transparent" />
      </section>

      {/* Profile Card */}
      <section className="container-main px-4 sm:px-6 lg:px-8 -mt-16 relative z-10 animate-fade-in-up">
        <div className="card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-card overflow-hidden border-2 border-white dark:border-[#28282c] shadow-card -mt-16 sm:-mt-20 flex-shrink-0 bg-gray-100 dark:bg-[#28282c]">
              {profile.avatar && <Image src={profile.avatar} alt={profile.name} fill className="object-cover" />}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-heading text-text-title">{profile.name}</h1>
                <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm">★ 董事长</span>
              </div>
              <p className="text-caption text-text-muted mt-0.5">{profile.englishName}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-2">
                {profile.tags.map((tag: string) => (
                  <span key={tag} className="tag-muted">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-divider">
            {[
              { label: '家乡', value: profile.birthday, icon: Cake },
              { label: '身份', value: profile.identity, icon: Star },
              { label: '详细地址', value: profile.birthplace, icon: MapPin },
              { label: '身高', value: profile.height, icon: Ruler },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5">
                <item.icon className="w-4 h-4 text-text-muted flex-shrink-0" />
                <div>
                  <div className="text-caption text-text-muted">{item.label}</div>
                  <div className="text-body font-medium text-text-title">{item.value || '—'}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Bio */}
          <div className="mt-6 pt-6 border-t border-divider">
            <h3 className="text-heading-sm text-text-title mb-2">个人简介</h3>
            <p className="text-body text-text-body leading-relaxed max-w-2xl">{profile.intro || '暂无简介'}</p>
          </div>

        </div>
      </section>

      {/* Social Platforms */}
      {profile.socialLinks.length > 0 && (
        <section className="container-main px-4 sm:px-6 lg:px-8 mt-6 animate-fade-in-up relative z-20">
          <h2 className="text-heading text-text-title mb-4">社交平台</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {profile.socialLinks.map((link) => {
              const meta = platformMeta[link.platform] || { color: '#1890ff', bg: 'bg-primary', icon: '🔗' };
              return (
                <div key={link.platform} className="group/card relative">
                  {/* Trigger Card */}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-5 rounded-card border border-divider bg-white dark:bg-[#1e1e22] shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer"
                  >
                    <div className={`w-12 h-12 rounded-xl ${meta.bg} flex items-center justify-center flex-shrink-0`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-body font-semibold text-text-title">{link.platform}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-text-disabled opacity-0 group-hover/card:opacity-100 transition-opacity" />
                      </div>
                      {link.followers && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Users className="w-3.5 h-3.5" style={{ color: meta.color }} />
                          <span className="text-sm font-bold" style={{ color: meta.color }}>{link.followers}</span>
                          <span className="text-caption text-text-muted">粉丝</span>
                        </div>
                      )}
                    </div>
                  </a>

                  {/* Hover Profile Card (名片) */}
                  <div className="absolute left-0 right-0 bottom-full mb-2 z-30 opacity-0 scale-95 -translate-y-1 pointer-events-none group-hover/card:opacity-100 group-hover/card:scale-100 group-hover/card:translate-y-0 group-hover/card:pointer-events-auto transition-all duration-200 ease-out">
                    <div className="rounded-card overflow-hidden shadow-lg border border-divider bg-white dark:bg-[#1e1e22]">
                      {/* Header Banner */}
                      <div className="h-14 bg-gray-900 relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center gap-3 select-none">
                          <span className="font-waterbrush text-[24px] leading-none text-white/10">1103</span>
                          <span className="font-waterbrush text-[13px] leading-none text-white/25 tracking-[0.12em]">ChenZe</span>
                        </div>
                      </div>

                      {/* Card Body: 左账号信息 + 右二维码 */}
                      <div className="flex gap-4 p-4">
                        {/* Left: Account Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center text-lg" style={{ backgroundColor: meta.color + '10' }}>
                              {profile.avatar ? (
                                <Image src={profile.avatar} alt={link.platform} width={40} height={40} className="object-cover w-full h-full" />
                              ) : (
                                <span>{meta.icon}</span>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-text-title">{link.accountName || profile.name}</span>
                                <span className="inline-flex items-center h-[18px] px-1.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: meta.color }}>
                                  {link.platform}
                                </span>
                              </div>
                              {link.accountId && (
                                <div className="flex items-center gap-0.5 mt-0.5">
                                  <AtSign className="w-3 h-3 text-text-disabled" />
                                  <span className="text-caption text-text-muted">{link.accountId}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {link.desc && (
                            <p className="text-caption text-text-body mt-2.5 leading-relaxed line-clamp-2">{link.desc}</p>
                          )}
                        </div>

                        {/* Right: QR Code */}
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <div className="w-20 h-20 rounded-lg border border-divider bg-gray-50 dark:bg-[#28282c] overflow-hidden flex items-center justify-center">
                            {link.qrcode ? (
                              <Image src={link.qrcode} alt={`${link.platform}二维码`} width={80} height={80} className="object-contain w-full h-full" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-text-disabled">
                                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <rect x="3" y="3" width="7" height="7" rx="1" />
                                  <rect x="14" y="3" width="7" height="7" rx="1" />
                                  <rect x="3" y="14" width="7" height="7" rx="1" />
                                  <rect x="14" y="14" width="3" height="3" />
                                  <rect x="18" y="18" width="3" height="3" />
                                  <rect x="14" y="18" width="3" height="3" />
                                  <rect x="18" y="14" width="3" height="3" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-text-muted">扫码关注</span>
                        </div>
                      </div>

                      {/* Footer Stats */}
                      <div className="flex items-center gap-4 px-4 py-3 border-t border-divider">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" style={{ color: meta.color }} />
                          <span className="text-sm font-bold text-text-title">{link.followers || '—'}</span>
                          <span className="text-caption text-text-muted">粉丝</span>
                        </div>
                        <div className="flex items-center gap-1 cursor-pointer hover:opacity-80">
                          <Heart className="w-3.5 h-3.5" style={{ color: meta.color }} />
                          <span className="text-caption" style={{ color: meta.color }}>关注他</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <section className="animate-fade-in-up">
          <StickyTimeline events={timeline as any} />
        </section>
      )}
    </>
  );
}
