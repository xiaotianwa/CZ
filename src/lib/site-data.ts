import { prisma } from '@/lib/db';

/**
 * 获取所有站点配置（KV 格式）
 */
export async function getSiteConfig(): Promise<Record<string, string>> {
  const configs = await prisma.siteConfig.findMany();
  const result: Record<string, string> = {};
  for (const c of configs) {
    result[c.key] = c.value;
  }
  return result;
}

/**
 * 从配置中提取主播 Profile
 */
export function extractProfile(cfg: Record<string, string>) {
  const socialLinks: { platform: string; url: string; followers: string; desc: string; accountName: string; accountId: string; qrcode: string }[] = [];
  if (cfg.social_douyin) socialLinks.push({ platform: '抖音', url: cfg.social_douyin, followers: cfg.social_douyin_followers || '', desc: cfg.social_douyin_desc || '', accountName: cfg.social_douyin_account_name || '', accountId: cfg.social_douyin_account_id || '', qrcode: cfg.social_douyin_qrcode || '' });
  if (cfg.social_weibo) socialLinks.push({ platform: '微博', url: cfg.social_weibo, followers: cfg.social_weibo_followers || '', desc: cfg.social_weibo_desc || '', accountName: cfg.social_weibo_account_name || '', accountId: cfg.social_weibo_account_id || '', qrcode: cfg.social_weibo_qrcode || '' });

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

/**
 * 从数据库自动统计社区数据
 */
export async function getAutoStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalFans, todayPosts, totalPostLikes, totalComments] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.post.count({ where: { status: 'published', createdAt: { gte: todayStart } } }),
    prisma.post.aggregate({ where: { status: 'published' }, _sum: { likes: true } }),
    prisma.comment.count(),
  ]);

  return {
    totalFans,
    todayPosts,
    totalInteractions: (totalPostLikes._sum.likes || 0) + totalComments,
    onlineNow: 0,
  };
}

/**
 * 获取首页所有数据
 */
export async function getHomePageData() {
  const [slides, posts, events, cfg] = await Promise.all([
    prisma.heroSlide.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.post.findMany({
      where: { status: 'published' },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true } },
        postTags: { include: { tag: { select: { name: true } } } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 4,
    }),
    prisma.event.findMany({
      where: { isActive: true },
      orderBy: { startTime: 'desc' },
      take: 3,
    }),
    getSiteConfig(),
  ]);

  return {
    slides,
    posts,
    events,
    profile: extractProfile(cfg),
    communityStats: await getAutoStats(),
  };
}

/**
 * 获取 Profile 页面数据
 */
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

/**
 * 根据 key 前缀推断 group
 */
export function getGroupFromKey(key: string): string {
  if (key.startsWith('profile_')) return 'profile';
  if (key.startsWith('social_')) return 'social';
  if (key.startsWith('stats_')) return 'stats';
  return 'general';
}
