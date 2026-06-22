import { prisma } from '@/lib/db';

export async function getSiteConfig(): Promise<Record<string, string>> {
  const configs = await prisma.siteConfig.findMany();
  const result: Record<string, string> = {};
  for (const c of configs) {
    result[c.key] = c.value;
  }
  return result;
}

export function extractProfile(cfg: Record<string, string>) {
  const socialLinks: {
    platform: string;
    url: string;
    followers: string;
    desc: string;
    accountName: string;
    accountId: string;
    qrcode: string;
  }[] = [];

  if (cfg.social_douyin) {
    socialLinks.push({
      platform: '抖音',
      url: cfg.social_douyin,
      followers: cfg.social_douyin_followers || '',
      desc: cfg.social_douyin_desc || '',
      accountName: cfg.social_douyin_account_name || '',
      accountId: cfg.social_douyin_account_id || '',
      qrcode: cfg.social_douyin_qrcode || '',
    });
  }
  if (cfg.social_weibo) {
    socialLinks.push({
      platform: '微博',
      url: cfg.social_weibo,
      followers: cfg.social_weibo_followers || '',
      desc: cfg.social_weibo_desc || '',
      accountName: cfg.social_weibo_account_name || '',
      accountId: cfg.social_weibo_account_id || '',
      qrcode: cfg.social_weibo_qrcode || '',
    });
  }

  return {
    name: cfg.profile_name || '陈泽',
    englishName: cfg.profile_english_name || 'ChenZe',
    avatar: cfg.profile_avatar || '',
    cover: cfg.profile_cover || '',
    birthday: cfg.profile_birthday || '',
    identity: cfg.profile_identity || '',
    birthplace: cfg.profile_birthplace || '',
    height: cfg.profile_height || '',
    intro: cfg.profile_intro || '',
    tags: (cfg.profile_tags || '').split(',').map((s) => s.trim()).filter(Boolean),
    socialLinks,
  };
}

export async function getAutoStats() {
  const recentThreshold = new Date(Date.now() - 30 * 60 * 1000);

  const [totalFans, recentActiveLogs] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.pointLog.findMany({
      where: { createdAt: { gte: recentThreshold } },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ]);

  return {
    totalFans,
    onlineNow: recentActiveLogs.length,
  };
}

export async function getHomePageData() {
  const [slides, cfg] = await Promise.all([
    prisma.heroSlide.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    getSiteConfig(),
  ]);

  return {
    slides,
    profile: extractProfile(cfg),
    featureFlags: extractFeatureFlags(cfg),
    communityStats: await getAutoStats(),
  };
}

export async function getProfilePageData() {
  const [cfg, timeline] = await Promise.all([
    getSiteConfig(),
    prisma.timelineEvent.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);

  return {
    profile: extractProfile(cfg),
    timeline,
  };
}

export function extractFeatureFlags(cfg: Record<string, string>) {
  return {
    memesEnabled: cfg.feature_memes_enabled === 'true',
  };
}

export type FeatureFlags = ReturnType<typeof extractFeatureFlags>;

export function getGroupFromKey(key: string): string {
  if (key.startsWith('profile_')) return 'profile';
  if (key.startsWith('social_')) return 'social';
  if (key.startsWith('stats_')) return 'stats';
  if (key.startsWith('feature_')) return 'feature';
  return 'general';
}
