import { NextRequest, NextResponse } from 'next/server';
import { isAllowedUrl, MAX_PROXY_BYTES } from '@/lib/media-proxy-guard';

/**
 * 媒体资源代理 — 解决浏览器 Private Network Access / CORS 导致的音频/视频加载失败
 * GET /api/media-proxy?url=<COS_URL>
 *
 * 白名单与大小上限等 SSRF 防护逻辑统一在 @/lib/media-proxy-guard 中维护。
 */

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url');
  if (!raw) {
    return NextResponse.json({ code: 400, message: '缺少 url 参数' }, { status: 400 });
  }

  const target = isAllowedUrl(raw);
  if (!target) {
    return NextResponse.json({ code: 403, message: '不允许代理该域名' }, { status: 403 });
  }

  try {
    // 透传 Range 头以支持 seek
    const headers: Record<string, string> = {};
    const range = req.headers.get('range');
    if (range) headers['Range'] = range;

    const upstream = await fetch(target.toString(), {
      headers,
      // 10 秒超时
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json(
        { code: upstream.status, message: '上游资源请求失败' },
        { status: upstream.status },
      );
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    const acceptRanges = upstream.headers.get('accept-ranges');

    // 大小上限预检：若上游声明的 Content-Length 超限则拒绝转发，防流量放大攻击
    if (contentLength) {
      const size = Number(contentLength);
      if (Number.isFinite(size) && size > MAX_PROXY_BYTES) {
        return NextResponse.json(
          { code: 413, message: '资源过大，无法代理' },
          { status: 413 },
        );
      }
    }

    const resHeaders = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, immutable',
      'Access-Control-Allow-Origin': '*',
    });

    if (contentLength) resHeaders.set('Content-Length', contentLength);
    if (contentRange) resHeaders.set('Content-Range', contentRange);
    if (acceptRanges) resHeaders.set('Accept-Ranges', acceptRanges);

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: resHeaders,
    });
  } catch (err) {
    console.error('[media-proxy] 代理失败:', err);
    return NextResponse.json({ code: 502, message: '代理请求失败' }, { status: 502 });
  }
}
