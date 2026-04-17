/**
 * 微博抓取验证脚本
 *
 * 用途：
 *   1. 验证 WEIBO_COOKIE 是否有效
 *   2. 快速预览将要抓取的内容
 *
 * 运行（自动读取根目录 .env）：
 *   npx tsx scripts/test-weibo-fetch.ts
 *
 * 或临时指定 cookie（PowerShell）：
 *   $env:WEIBO_COOKIE="整行cookie"; npx tsx scripts/test-weibo-fetch.ts
 */
import 'dotenv/config';
import { fetchLatestWeibo } from '../src/lib/weibo/fetcher';
import { WEIBO_CONFIG } from '../src/lib/weibo/config';

async function main() {
  console.log(`[test] 目标博主 UID=${WEIBO_CONFIG.UID}`);
  console.log(`[test] Feed URL: ${WEIBO_CONFIG.getFeedUrl(WEIBO_CONFIG.UID)}`);
  console.log(`[test] WEIBO_COOKIE 环境变量: ${process.env.WEIBO_COOKIE ? '已配置 ✅' : '未配置（将自动获取匿名 cookie）'}`);
  console.log('');

  try {
    const t0 = Date.now();
    const posts = await fetchLatestWeibo(WEIBO_CONFIG.UID, { includeFiltered: true });
    const dt = Date.now() - t0;

    const originals = posts.filter((p) => p.isOriginal);
    console.log(`[test] ✅ 抓取成功！耗时 ${dt}ms`);
    console.log(`[test]   总条数：${posts.length}`);
    console.log(`[test]   原创：${originals.length}`);
    console.log(`[test]   被过滤：${posts.length - originals.length}`);
    console.log('');

    posts.slice(0, 3).forEach((p, i) => {
      console.log(`--- #${i + 1} [${p.isOriginal ? '✓ 原创' : '✗ 过滤: ' + p.filterReason}] ---`);
      console.log(`  mid: ${p.mid}`);
      console.log(`  时间: ${p.publishedAt.toISOString()}`);
      console.log(`  来源: ${p.source || '-'}`);
      console.log(`  图片: ${p.images.length} 张`);
      console.log(`  文字: ${p.text.slice(0, 80)}${p.text.length > 80 ? '...' : ''}`);
    });
  } catch (err) {
    console.error(`[test] ❌ 抓取失败:`, err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
