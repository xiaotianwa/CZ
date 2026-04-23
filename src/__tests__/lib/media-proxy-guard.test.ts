import { describe, it, expect, afterEach, vi } from 'vitest';
import { isAllowedHost, isAllowedUrl, isIpLiteral, MAX_PROXY_BYTES } from '@/lib/media-proxy-guard';

describe('media-proxy-guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ========== COS 白名单 ==========
  it('test_isAllowedHost_cosKnownRegion_allowed', () => {
    expect(isAllowedHost('my-bucket.cos.ap-chongqing.myqcloud.com')).toBe(true);
    expect(isAllowedHost('abc.cos.ap-guangzhou.myqcloud.com')).toBe(true);
  });

  it('test_isAllowedHost_cosUnknownRegion_allowedByGenericPattern', () => {
    // 未显式列入但符合 *.cos.<region>.myqcloud.com 格式，仍放行
    expect(isAllowedHost('bucket.cos.na-siliconvalley.myqcloud.com')).toBe(true);
  });

  it('test_isAllowedHost_fakeCosDomain_rejected', () => {
    expect(isAllowedHost('cos.ap-chongqing.myqcloud.com.evil.com')).toBe(false);
    expect(isAllowedHost('my-bucket.cos.myqcloud.com')).toBe(false); // 缺少 region 段
    expect(isAllowedHost('myqcloud.com')).toBe(false);
  });

  // ========== CDN 精确匹配 ==========
  it('test_isAllowedHost_cdnExactMatch_allowed', () => {
    vi.stubEnv('COS_CDN_DOMAIN', 'cdn.my-site.com');
    expect(isAllowedHost('cdn.my-site.com')).toBe(true);
  });

  it('test_isAllowedHost_cdnStrictSubdomain_allowed', () => {
    vi.stubEnv('COS_CDN_DOMAIN', 'cdn.my-site.com');
    expect(isAllowedHost('static.cdn.my-site.com')).toBe(true);
  });

  it('test_isAllowedHost_cdnEndsWithBypass_rejected', () => {
    // 核心修复点：evilcdn.my-site.com 在旧 endsWith 实现下会误匹配 'cdn.my-site.com'
    // 必须被拒绝
    vi.stubEnv('COS_CDN_DOMAIN', 'cdn.my-site.com');
    expect(isAllowedHost('evilcdn.my-site.com')).toBe(false);
    expect(isAllowedHost('attackercdn.my-site.com')).toBe(false);
    expect(isAllowedHost('fakecdn.my-site.com')).toBe(false);
  });

  it('test_isAllowedHost_cdnUnset_onlyCosAllowed', () => {
    vi.stubEnv('COS_CDN_DOMAIN', '');
    expect(isAllowedHost('my.cdn.com')).toBe(false);
    expect(isAllowedHost('bucket.cos.ap-beijing.myqcloud.com')).toBe(true);
  });

  // ========== IP 字面量拒绝（SSRF 防护） ==========
  it('test_isIpLiteral_ipv4_returnsTrue', () => {
    expect(isIpLiteral('127.0.0.1')).toBe(true);
    expect(isIpLiteral('10.0.0.1')).toBe(true);
    expect(isIpLiteral('169.254.169.254')).toBe(true); // 云厂商元数据服务
    expect(isIpLiteral('192.168.1.1')).toBe(true);
  });

  it('test_isIpLiteral_ipv6_returnsTrue', () => {
    expect(isIpLiteral('[::1]')).toBe(true);
    expect(isIpLiteral('[fe80::1]')).toBe(true);
    expect(isIpLiteral('::1')).toBe(true);
    expect(isIpLiteral('fe80::1')).toBe(true);
  });

  it('test_isIpLiteral_hostname_returnsFalse', () => {
    expect(isIpLiteral('my-bucket.cos.ap-chongqing.myqcloud.com')).toBe(false);
    expect(isIpLiteral('example.com')).toBe(false);
  });

  it('test_isAllowedHost_ipLiteral_rejectedEvenIfCdnMatches', () => {
    // 即使 CDN 被配置为 IP（配置错误场景），也拒绝（防 SSRF）
    vi.stubEnv('COS_CDN_DOMAIN', '127.0.0.1');
    expect(isAllowedHost('127.0.0.1')).toBe(false);
    expect(isAllowedHost('169.254.169.254')).toBe(false);
  });

  // ========== isAllowedUrl 完整 URL ==========
  it('test_isAllowedUrl_httpsCos_returnsUrl', () => {
    const u = isAllowedUrl('https://b.cos.ap-chongqing.myqcloud.com/a.mp4');
    expect(u).not.toBeNull();
    expect(u!.pathname).toBe('/a.mp4');
  });

  it('test_isAllowedUrl_httpScheme_rejected', () => {
    expect(isAllowedUrl('http://b.cos.ap-chongqing.myqcloud.com/a.mp4')).toBeNull();
  });

  it('test_isAllowedUrl_fileScheme_rejected', () => {
    expect(isAllowedUrl('file:///etc/passwd')).toBeNull();
  });

  it('test_isAllowedUrl_malformed_returnsNull', () => {
    expect(isAllowedUrl('not-a-url')).toBeNull();
    expect(isAllowedUrl('')).toBeNull();
  });

  it('test_isAllowedUrl_ipTarget_rejected', () => {
    expect(isAllowedUrl('https://169.254.169.254/latest/meta-data/')).toBeNull();
    expect(isAllowedUrl('https://127.0.0.1/')).toBeNull();
  });

  // ========== 常量上限 ==========
  it('test_MAX_PROXY_BYTES_is100MB', () => {
    expect(MAX_PROXY_BYTES).toBe(100 * 1024 * 1024);
  });
});
