/**
 * 微博同步器
 *
 * 职责：调用 fetcher 抓取 → 去重 → 写入数据库
 * 并发策略：仅允许一个同步任务同时执行，防止重复入库
 */

import { prisma } from '@/lib/db';
import { fetchLatestWeibo, fetchLongText, stripHtml } from './fetcher';
import { WEIBO_CONFIG } from './config';

export interface SyncResult {
  success: boolean;
  /** 抓取到的原创总数（过滤后） */
  fetched: number;
  /** 新增入库条数 */
  inserted: number;
  /** 跳过（已存在）的条数 */
  skipped: number;
  /** 过滤失败原因（非原创） */
  filtered: number;
  /** 耗时毫秒 */
  durationMs: number;
  /** 错误信息（若 success=false） */
  error?: string;
  /** 新增的微博 mid 列表（用于日志/通知） */
  newMids: string[];
}

// 内存锁：防止并发同步重复写入
let isRunning = false;
let lastRunAt: Date | null = null;
let lastResult: SyncResult | null = null;

export function getSyncStatus() {
  return {
    isRunning,
    lastRunAt,
    lastResult,
  };
}

/**
 * 执行一次完整同步
 */
export async function syncWeibo(): Promise<SyncResult> {
  const startedAt = Date.now();

  if (isRunning) {
    return {
      success: false,
      fetched: 0,
      inserted: 0,
      skipped: 0,
      filtered: 0,
      durationMs: 0,
      error: '已有同步任务在执行中，跳过本次',
      newMids: [],
    };
  }

  isRunning = true;
  try {
    // 1. 抓取（默认已过滤仅保留原创）
    const allPosts = await fetchLatestWeibo(WEIBO_CONFIG.UID, { includeFiltered: true });
    const originals = allPosts.filter((p) => p.isOriginal);
    const filtered = allPosts.length - originals.length;

    if (originals.length === 0) {
      const result: SyncResult = {
        success: true,
        fetched: 0,
        inserted: 0,
        skipped: 0,
        filtered,
        durationMs: Date.now() - startedAt,
        newMids: [],
      };
      lastRunAt = new Date();
      lastResult = result;
      return result;
    }

    // 2. 查询已存在的 mid 做去重
    const mids = originals.map((p) => p.mid);
    const existing = await prisma.weiboPost.findMany({
      where: { mid: { in: mids } },
      select: { mid: true },
    });
    const existingSet = new Set(existing.map((e: { mid: string }) => e.mid));

    const toInsert = originals.filter((p) => !existingSet.has(p.mid));

    // 3. 对长微博补全全文（文本末尾有 "全文" 按钮时）
    for (const post of toInsert) {
      if (post.textRaw && /全文<\/a>/.test(post.textRaw)) {
        const longText = await fetchLongText(post.mid);
        if (longText) {
          post.text = stripHtml(longText);
          post.textRaw = longText;
        }
      }
    }

    // 4. 批量插入（使用 createMany 不可，因为 SQLite 在 libsql 下 createMany 支持有限，且我们需要保证字段一致性）
    const newMids: string[] = [];
    for (const post of toInsert) {
      try {
        await prisma.weiboPost.create({
          data: {
            mid: post.mid,
            bid: post.bid,
            uid: post.uid,
            screenName: post.screenName,
            avatar: post.avatar,
            text: post.text,
            textRaw: post.textRaw,
            images: JSON.stringify(post.images),
            videoUrl: post.videoUrl,
            videoCover: post.videoCover,
            source: post.source,
            sourceUrl: post.sourceUrl,
            repostCount: post.repostCount,
            commentCount: post.commentCount,
            likeCount: post.likeCount,
            publishedAt: post.publishedAt,
            isVisible: true,
          },
        });
        newMids.push(post.mid);
      } catch (e) {
        // 并发场景下可能出现 unique 冲突，忽略即可
        console.warn(`[weibo-sync] insert ${post.mid} 失败:`, e instanceof Error ? e.message : e);
      }
    }

    const result: SyncResult = {
      success: true,
      fetched: originals.length,
      inserted: newMids.length,
      skipped: originals.length - newMids.length,
      filtered,
      durationMs: Date.now() - startedAt,
      newMids,
    };
    lastRunAt = new Date();
    lastResult = result;
    return result;
  } catch (err) {
    const result: SyncResult = {
      success: false,
      fetched: 0,
      inserted: 0,
      skipped: 0,
      filtered: 0,
      durationMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : String(err),
      newMids: [],
    };
    lastRunAt = new Date();
    lastResult = result;
    return result;
  } finally {
    isRunning = false;
  }
}
