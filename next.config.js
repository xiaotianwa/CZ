// COS 相关域名，用于 CSP 和图片优化白名单
const COS_DOMAIN = process.env.COS_BUCKET && process.env.COS_REGION
  ? `${process.env.COS_BUCKET}.cos.${process.env.COS_REGION}.myqcloud.com`
  : '*.cos.*.myqcloud.com';
const CDN_DOMAIN = process.env.COS_CDN_DOMAIN || '';
// 卡图 CDN（客户端可见，用于 /game 卡牌素材走腾讯 COS imageMogr2 压缩）
const CARDS_CDN_HOSTNAME = (process.env.NEXT_PUBLIC_CARDS_CDN || '')
  .replace(/^https?:\/\//, '')
  .split('/')[0];
const MEDIA_SOURCES = [COS_DOMAIN, CDN_DOMAIN, CARDS_CDN_HOSTNAME]
  .filter(Boolean)
  .map(d => `https://${d}`)
  .join(' ');
const MAP_SOURCES = ['https://webapi.amap.com', 'https://*.amap.com', 'https://*.autonavi.com'].join(' ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 开启 Next.js 图片优化（自动 WebP/AVIF 转换 + 尺寸裁剪）
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cos.*.myqcloud.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      // CDN 域名（配置 COS_CDN_DOMAIN 后启用）
      ...(process.env.COS_CDN_DOMAIN ? [{
        protocol: 'https',
        hostname: process.env.COS_CDN_DOMAIN,
      }] : []),
      // 卡图 CDN（NEXT_PUBLIC_CARDS_CDN 指向的域名）
      ...(CARDS_CDN_HOSTNAME ? [{
        protocol: 'https',
        hostname: CARDS_CDN_HOSTNAME,
      }] : []),
    ],
    // 限制优化图片的最大尺寸，节省服务器内存
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24, // 缓存 24 小时
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      // 所有 API 路由禁止缓存（防止 Nginx proxy_cache 缓存认证响应导致用户串号）
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          // HSTS：告诉浏览器未来 2 年只走 https，防中间人降级攻击
          // 注意：首次请求后浏览器才会缓存该策略，所以 Nginx 层的 301 http→https 仍需保留
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${MAP_SOURCES}`,
              `style-src 'self' 'unsafe-inline' ${MAP_SOURCES}`,
              `img-src 'self' data: blob: ${MEDIA_SOURCES} ${MAP_SOURCES}`,
              `media-src 'self' blob: ${MEDIA_SOURCES}`,
              `font-src 'self' https://db.onlinewebfonts.com`,
              `connect-src 'self' ${MEDIA_SOURCES} ${MAP_SOURCES}`,
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
