/**
 * 微博抓取器
 *
 * 职责：
 * 1. 调用 m.weibo.cn 公开 API 获取目标博主的微博列表
 * 2. 解析卡片（card_type=9 为微博卡片）
 * 3. 过滤非原创（转发、含 //@、"转发" 开头）
 * 4. 归一化为统一的 NormalizedWeiboPost 结构
 */

import { WEIBO_CONFIG, pickUserAgent } from './config';

// ==================== 类型定义 ====================

export interface NormalizedWeiboPost {
  mid: string;
  bid: string | null;
  uid: string;
  screenName: string;
  avatar: string | null;
  text: string;
  textRaw: string | null;
  images: string[];
  videoUrl: string | null;
  videoCover: string | null;
  source: string | null;
  sourceUrl: string;
  repostCount: number;
  commentCount: number;
  likeCount: number;
  publishedAt: Date;
  isOriginal: boolean;
  /** 如果被过滤，给出原因 */
  filterReason?: string;
}

/** weibo.com PC 端 /ajax/statuses/mymblog 返回结构 */
interface WeiboUser {
  id?: number;
  idstr?: string;
  screen_name?: string;
  profile_image_url?: string;
  avatar_hd?: string;
  avatar_large?: string;
}

interface WeiboPicInfoItem {
  url?: string;
  large?: { url?: string };
  original?: { url?: string };
  largest?: { url?: string };
}

interface WeiboPageInfo {
  type?: string; // "video" 等
  page_pic?: { url?: string } | string;
  media_info?: {
    stream_url_hd?: string;
    stream_url?: string;
    mp4_hd_url?: string;
    mp4_sd_url?: string;
    playback_list?: Array<{ play_info?: { url?: string; mp4_hd_url?: string } }>;
  };
  urls?: Record<string, string>;
}

/** PC 端单条微博（ajax/statuses/mymblog 返回的 data.list[] 元素） */
interface WeiboMblog {
  id?: string | number;
  idstr?: string;
  mid?: string;
  mblogid?: string; // PC 端用这个替代 bid
  created_at?: string;
  text?: string; // HTML 格式
  text_raw?: string; // 纯文本（PC 端独有）
  source?: string;
  user?: WeiboUser;
  retweeted_status?: unknown;
  pic_ids?: string[];
  pic_infos?: Record<string, WeiboPicInfoItem>;
  page_info?: WeiboPageInfo;
  reposts_count?: number;
  comments_count?: number;
  attitudes_count?: number;
  isLongText?: boolean;
  isTop?: number; // 置顶标志（1=置顶）
  pic_num?: number;
  continue_tag?: { title?: string; pic_infos?: unknown };
}

interface WeiboFeedResponse {
  ok?: number;
  msg?: string;
  data?: {
    list?: WeiboMblog[];
    total?: number;
    since_id?: string;
  };
  /** ok != 1 时可能返回 url 字段提示重定向登录 */
  url?: string;
}

// ==================== 工具函数 ====================

/** 去除 HTML 标签，仅保留纯文本（简单实现，保留换行） */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/** 微博 created_at 格式兼容解析 */
export function parseCreatedAt(raw?: string): Date {
  if (!raw) return new Date();
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d;
  // 形如 "Tue Apr 16 12:00:00 +0800 2026"
  return new Date(raw.replace(/^\w+ /, ''));
}

/**
 * 清理微博图床 URL 的时效签名（Expires / ssig / KID 等 query 参数）
 *
 * 原因：sinaimg.cn 的签名通常只有 30 分钟 ~ 几小时有效期，过期后图片 403。
 * 去掉 query string 后，资源路径仍然是公开可访问的静态图。
 */
export function sanitizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // 仅对微博图床域名清理签名；其他来源（如 COS）保持原样
    if (/\.sinaimg\.cn$|\.weibocdn\.com$|\.miaopai\.com$/.test(u.host)) {
      u.search = '';
    }
    return u.toString();
  } catch {
    return url;
  }
}

/** 判断是否为原创 */
export function isOriginalPost(mblog: WeiboMblog): { original: boolean; reason?: string } {
  // 规则 1：存在 retweeted_status 一定是转发
  if (mblog.retweeted_status) {
    return { original: false, reason: '转发微博 (retweeted_status)' };
  }
  const text = stripHtml(mblog.text || '');
  // PC 端优先用 text_raw（纯文本），移动端用 raw_text
  const rawText = mblog.text_raw || (mblog as { raw_text?: string }).raw_text || text;
  // 规则 2：文本以 "转发" 开头
  if (/^转发/.test(rawText)) {
    return { original: false, reason: '"转发"开头' };
  }
  // 规则 3：包含 //@ （转发串联标志）
  if (/\/\/@/.test(rawText)) {
    return { original: false, reason: '包含 //@ 标志' };
  }
  return { original: true };
}

// ==================== HTTP 调用 ====================

/**
 * 从 WEIBO_COOKIE 中提取 XSRF-TOKEN（weibo.com 某些接口会校验 x-xsrf-token header）
 */
function extractXsrfToken(cookie: string): string | null {
  const m = cookie.match(/XSRF-TOKEN=([^;]+)/);
  return m ? m[1] : null;
}

/**
 * 必须配置 WEIBO_COOKIE 才能访问 weibo.com PC 端接口
 */
function requireCookie(): string {
  const cookie = process.env.WEIBO_COOKIE?.trim();
  if (!cookie) {
    throw new Error(
      '未配置 WEIBO_COOKIE 环境变量。请在 .env 中配置登录态 cookie（参见 deploy/weibo-cookie-guide.md）',
    );
  }
  return cookie;
}

/**
 * 带超时的 fetch 包装（自带 cookie + 桌面浏览器指纹 header）
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  refererUid: string = WEIBO_CONFIG.UID,
): Promise<Response> {
  const cookie = requireCookie();
  const ua = pickUserAgent();
  const xsrf = extractXsrfToken(cookie);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {
      'User-Agent': ua,
      'Referer': `https://weibo.com/u/${refererUid}`,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Cookie': cookie,
      'X-Requested-With': 'XMLHttpRequest',
      'Client-Version': WEIBO_CONFIG.CLIENT_VERSION,
      'Server-Version': WEIBO_CONFIG.SERVER_VERSION,
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    };
    if (xsrf) headers['X-Xsrf-Token'] = xsrf;

    return await fetch(url, {
      signal: controller.signal,
      headers,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timer);
  }
}

/** 把 HTTP 状态码翻译成人类可读的风控提示 */
function explainWeiboStatus(status: number): string {
  if (status === 418 || status === 432 || status === 403) {
    return `HTTP ${status}（微博风控拦截。建议：1) 检查 WEIBO_COOKIE 是否过期；2) 降低抓取频率至 ≥ 5 分钟；3) 检查服务器 IP 是否在黑名单）`;
  }
  if (status === 404) return `HTTP 404（博主不存在或主页已被清空）`;
  if (status >= 500) return `HTTP ${status}（微博服务端异常，稍后重试）`;
  return `HTTP ${status}`;
}

/**
 * 获取完整长文（超过 140 字的微博 text 会被截断）
 * PC 端接口：/ajax/statuses/longtext?id={mblogid}
 */
export async function fetchLongText(mblogid: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(WEIBO_CONFIG.getLongTextUrl(mblogid), WEIBO_CONFIG.REQUEST_TIMEOUT_MS);
    if (!res.ok) return null;
    const json = await res.json();
    // PC 端返回 { ok: 1, data: { longTextContent: "..." } }
    const longText = json?.data?.longTextContent;
    return typeof longText === 'string' && longText ? longText : null;
  } catch {
    return null;
  }
}

// ==================== 解析函数 ====================

/** 从 pic_infos 中提取图片 URL（按 pic_ids 顺序保证有序，并清理时效签名） */
function extractImages(mblog: WeiboMblog): string[] {
  const urls: string[] = [];
  if (!mblog.pic_infos) return urls;

  const push = (raw?: string) => {
    const cleaned = sanitizeImageUrl(raw);
    if (cleaned) urls.push(cleaned);
  };

  // 优先按 pic_ids 顺序取（保证多图顺序和原微博一致）
  if (Array.isArray(mblog.pic_ids) && mblog.pic_ids.length > 0) {
    for (const pid of mblog.pic_ids) {
      const info = mblog.pic_infos[pid];
      push(info?.largest?.url || info?.large?.url || info?.original?.url || info?.url);
    }
    return urls;
  }

  // 兜底：按 pic_infos 自身顺序
  for (const info of Object.values(mblog.pic_infos)) {
    push(info?.largest?.url || info?.large?.url || info?.original?.url || info?.url);
  }
  return urls;
}

/** 从 page_info 中提取视频信息（封面图同样清理时效签名） */
function extractVideo(mblog: WeiboMblog): { videoUrl: string | null; videoCover: string | null } {
  const pi = mblog.page_info;
  if (!pi || pi.type !== 'video') return { videoUrl: null, videoCover: null };
  const mi = pi.media_info || {};
  const videoUrl =
    mi.stream_url_hd || mi.stream_url || mi.mp4_hd_url || mi.mp4_sd_url || null;
  const coverRaw =
    typeof pi.page_pic === 'string' ? pi.page_pic : pi.page_pic?.url || null;
  return {
    videoUrl: sanitizeImageUrl(videoUrl),
    videoCover: sanitizeImageUrl(coverRaw),
  };
}

/** 将单条 mblog 归一化 */
function normalizeMblog(mblog: WeiboMblog): NormalizedWeiboPost | null {
  const mid = mblog.mid || mblog.idstr || String(mblog.id || '');
  if (!mid) return null;

  const user = mblog.user || {};
  const uid = user.idstr || String(user.id || WEIBO_CONFIG.UID);
  const mblogid = mblog.mblogid || null; // PC 端 bid 替代字段
  // PC 端 text_raw 是纯文本可直接用；text 是 HTML
  const text = mblog.text_raw || stripHtml(mblog.text || '');
  const { original, reason } = isOriginalPost(mblog);
  const images = extractImages(mblog);
  const { videoUrl, videoCover } = extractVideo(mblog);

  return {
    mid,
    bid: mblogid,
    uid,
    screenName: user.screen_name || '',
    avatar: sanitizeImageUrl(user.avatar_hd || user.avatar_large || user.profile_image_url),
    text,
    textRaw: mblog.text || null,
    images,
    videoUrl,
    videoCover,
    source: mblog.source ? stripHtml(mblog.source) : null,
    sourceUrl: mblogid ? WEIBO_CONFIG.getPostUrl(uid, mblogid) : `https://weibo.com/${uid}`,
    repostCount: mblog.reposts_count ?? 0,
    commentCount: mblog.comments_count ?? 0,
    likeCount: mblog.attitudes_count ?? 0,
    publishedAt: parseCreatedAt(mblog.created_at),
    isOriginal: original,
    filterReason: reason,
  };
}

// ==================== 主入口 ====================

/**
 * 抓取指定博主的最新微博（仅原创）
 *
 * @param uid 博主 UID
 * @param opts.includeFiltered 是否保留被过滤的条目（调试用）
 * @returns 归一化后的微博数组（默认已过滤仅保留原创）
 */
export async function fetchLatestWeibo(
  uid: string = WEIBO_CONFIG.UID,
  opts: { includeFiltered?: boolean } = {},
): Promise<NormalizedWeiboPost[]> {
  const url = WEIBO_CONFIG.getFeedUrl(uid);
  const res = await fetchWithTimeout(url, WEIBO_CONFIG.REQUEST_TIMEOUT_MS, uid);

  if (!res.ok) {
    throw new Error(`微博接口请求失败: ${explainWeiboStatus(res.status)}`);
  }

  const rawBody = await res.text();
  let json: WeiboFeedResponse;
  try {
    json = JSON.parse(rawBody) as WeiboFeedResponse;
  } catch {
    throw new Error(`微博接口返回非 JSON 响应（cookie 可能已失效），body 前 200 字：${rawBody.slice(0, 200)}`);
  }

  if (!json || json.ok !== 1) {
    // ok=-100 通常是 cookie 失效/未登录态
    const hint = json?.url
      ? `，接口要求重定向到：${json.url.slice(0, 80)}...（说明 WEIBO_COOKIE 已过期或无效，请重新获取）`
      : '';
    throw new Error(`微博接口返回异常：ok=${json?.ok ?? 'null'}${json?.msg ? `, msg=${json.msg}` : ''}${hint}`);
  }

  const list = json.data?.list || [];
  const posts: NormalizedWeiboPost[] = [];

  for (const mblog of list) {
    const normalized = normalizeMblog(mblog);
    if (!normalized) continue;

    if (opts.includeFiltered || normalized.isOriginal) {
      posts.push(normalized);
    }
    if (posts.length >= WEIBO_CONFIG.MAX_FETCH_PER_SYNC) break;
  }

  // 按发布时间从新到旧
  posts.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  return posts;
}
