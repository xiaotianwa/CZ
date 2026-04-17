/**
 * 微博抓取配置（PC 端 weibo.com 接口）
 *
 * 目标博主：UID=7795649284
 * 主页：https://weibo.com/u/7795649284
 *
 * 必须在 .env 中配置 WEIBO_COOKIE（登录态 cookie），否则接口返回 -100
 */

export const WEIBO_CONFIG = {
  /** 目标博主 UID（硬编码，如需改动直接修改此处） */
  UID: '7795649284',
  /** PC 端 ajax 接口：获取博主微博列表 */
  getFeedUrl(uid: string, page: number = 1): string {
    return `https://weibo.com/ajax/statuses/mymblog?uid=${uid}&page=${page}&feature=0`;
  },
  /** 长文本完整内容接口 */
  getLongTextUrl(mblogid: string): string {
    return `https://weibo.com/ajax/statuses/longtext?id=${mblogid}`;
  },
  /** 构造微博详情页外链：weibo.com/{uid}/{mblogid} */
  getPostUrl(uid: string, mblogid: string): string {
    return `https://weibo.com/${uid}/${mblogid}`;
  },
  /** 请求超时毫秒 */
  REQUEST_TIMEOUT_MS: 15_000,
  /** 每次同步最多保留多少条（前台展示也只取最新 10 条） */
  MAX_FETCH_PER_SYNC: 10,
  /** 桌面 Chrome UA（多条随机挑选，降低指纹雷同） */
  USER_AGENTS: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  ],
  /** weibo.com 前端版本号（xhr header 要求，版本老会被拒绝） */
  CLIENT_VERSION: 'v2.46.68',
  SERVER_VERSION: 'v2024.03.19.1',
} as const;

export function pickUserAgent(): string {
  const list = WEIBO_CONFIG.USER_AGENTS;
  return list[Math.floor(Math.random() * list.length)];
}
