#!/usr/bin/env node
/**
 * 微博定时同步 Worker
 *
 * 职责：每隔 N 分钟调用一次本地 Next.js 的 /api/cron/weibo-sync 接口
 *
 * 环境变量：
 *   - WEIBO_CRON_URL       目标 URL，默认 http://127.0.0.1:3000/api/cron/weibo-sync
 *   - CRON_SECRET          鉴权密钥（与 Next.js 端一致）
 *   - WEIBO_CRON_INTERVAL  轮询间隔（毫秒），默认 180000（3分钟）
 *   - WEIBO_CRON_INITIAL_DELAY  首次启动延迟（毫秒），默认 30000（避免应用未就绪）
 *
 * 运行方式：
 *   pm2 start ecosystem.config.js --only chenze-weibo-cron
 *   node scripts/weibo-cron.js   （手动调试）
 */

'use strict';

const DEFAULT_URL = 'http://127.0.0.1:3000/api/cron/weibo-sync';
const DEFAULT_INTERVAL = 3 * 60 * 1000; // 3 分钟
const DEFAULT_INITIAL_DELAY = 30 * 1000; // 30 秒

const targetUrl = process.env.WEIBO_CRON_URL || DEFAULT_URL;
const interval = Number(process.env.WEIBO_CRON_INTERVAL) || DEFAULT_INTERVAL;
const initialDelay = Number(process.env.WEIBO_CRON_INITIAL_DELAY) || DEFAULT_INITIAL_DELAY;
const cronSecret = process.env.CRON_SECRET || '';

function log(level, msg, extra) {
  const ts = new Date().toISOString();
  const payload = extra !== undefined ? ` ${JSON.stringify(extra)}` : '';
  // 使用标准 I/O，便于 PM2 日志收集
  const line = `[${ts}] [weibo-cron] [${level}] ${msg}${payload}`;
  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
}

async function triggerSync() {
  const headers = {};
  if (cronSecret) headers['Authorization'] = `Bearer ${cronSecret}`;

  try {
    const res = await fetch(targetUrl, { method: 'GET', headers });
    const text = await res.text();
    if (!res.ok) {
      log('ERROR', `同步请求失败 HTTP ${res.status}`, { body: text.slice(0, 300) });
      return;
    }
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      log('WARN', '返回非 JSON', { body: text.slice(0, 300) });
      return;
    }
    if (json.ok === true) {
      log('INFO', '同步完成', {
        inserted: json.inserted,
        skipped: json.skipped,
        filtered: json.filtered,
        fetched: json.fetched,
        durationMs: json.durationMs,
      });
    } else {
      log('WARN', '同步返回异常', json);
    }
  } catch (err) {
    log('ERROR', '请求异常', { error: err instanceof Error ? err.message : String(err) });
  }
}

function scheduleNext() {
  setTimeout(async () => {
    await triggerSync();
    scheduleNext();
  }, interval);
}

// ======================= 入口 =======================

log('INFO', 'worker 启动', {
  targetUrl,
  intervalMs: interval,
  initialDelayMs: initialDelay,
  hasSecret: !!cronSecret,
});

// 初次延迟后触发一次，然后每隔 interval 执行一次
setTimeout(async () => {
  await triggerSync();
  scheduleNext();
}, initialDelay);

// 优雅退出
process.on('SIGINT', () => {
  log('INFO', '收到 SIGINT，退出');
  process.exit(0);
});
process.on('SIGTERM', () => {
  log('INFO', '收到 SIGTERM，退出');
  process.exit(0);
});
