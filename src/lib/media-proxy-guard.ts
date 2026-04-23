/**
 * 媒体代理 SSRF 防护白名单
 *
 * 与 /api/media-proxy 路由配套。抽出为独立 lib 便于单元测试与其他可能的代理入口复用。
 *
 * 白名单策略：
 *  1. 仅 https
 *  2. 拒绝 IP 字面量（IPv4/IPv6），避免指向内网/元数据服务
 *  3. 腾讯云 COS：按 `.cos.<region>.myqcloud.com` 后缀匹配
 *  4. CDN 域名：必须 hostname === COS_CDN_DOMAIN 或 `.{domain}` 严格子域匹配
 *     —— 防御 evilcdn.target.com 这种 endsWith 误匹配绕过
 */

// COS 已知区域后缀（前导点保证只匹配 *.cos.<region>.myqcloud.com 子域）
const COS_HOST_SUFFIXES = [
  '.cos.ap-chongqing.myqcloud.com',
  '.cos.ap-guangzhou.myqcloud.com',
  '.cos.ap-shanghai.myqcloud.com',
  '.cos.ap-beijing.myqcloud.com',
];

// 兜底：其他未显式列出的区域（格式固定），仍限定在 myqcloud 命名空间
const COS_GENERIC_PATTERN = /\.cos\.[a-z0-9-]+\.myqcloud\.com$/i;

/** 代理响应大小上限，超过即拒绝（单位字节）。100 MB。 */
export const MAX_PROXY_BYTES = 100 * 1024 * 1024;

/** 判断 hostname 是否是 IPv4/IPv6 字面量（SSRF 常见绕过面） */
export function isIpLiteral(host: string): boolean {
  // IPv6：带方括号或含冒号
  if (host.startsWith('[') && host.endsWith(']')) return true;
  if (host.includes(':')) return true;
  // IPv4：纯数字 + 点（不严格校验 0-255 范围，超范围也直接按 IP 拒绝即可）
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return true;
  return false;
}

/** 判断 hostname 是否命中代理白名单 */
export function isAllowedHost(hostname: string): boolean {
  if (!hostname) return false;
  if (isIpLiteral(hostname)) return false;

  // CDN：精确匹配或严格子域匹配
  const cdn = process.env.COS_CDN_DOMAIN;
  if (cdn) {
    if (hostname === cdn) return true;
    if (hostname.endsWith('.' + cdn)) return true;
  }

  // COS 已知区域
  if (COS_HOST_SUFFIXES.some((s) => hostname.endsWith(s))) return true;
  // COS 其他区域（格式兜底）
  if (COS_GENERIC_PATTERN.test(hostname)) return true;

  return false;
}

/** 校验并解析传入 URL，不合法或不在白名单内则返回 null */
export function isAllowedUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return null;
    if (!isAllowedHost(u.hostname)) return null;
    return u;
  } catch {
    return null;
  }
}
