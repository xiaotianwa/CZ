#!/usr/bin/env node
/**
 * 卡图一次性上传到腾讯云 COS
 *
 * 用法：node scripts/upload-cards.js
 *
 * 前置条件：.env 里需要已配置 COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_REGION
 *
 * 上传后通过 COS 图片处理（imageMogr2）动态返回 WebP 压缩图：
 *   https://{domain}/cards/{filename}?imageMogr2/format/webp/quality/85/thumbnail/800x
 *
 * 脚本幂等：已存在同名 key 的会被覆盖（反复跑不会产生重复）。
 */

'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const COS = require('cos-nodejs-sdk-v5');

const CARDS_DIR = path.join(__dirname, '..', 'public', 'cards');
const COS_PREFIX = 'cards/';

const required = ['COS_SECRET_ID', 'COS_SECRET_KEY', 'COS_BUCKET', 'COS_REGION'];
for (const k of required) {
  if (!process.env[k]) {
    console.error(`❌ 缺少环境变量：${k}（请检查 .env）`);
    process.exit(1);
  }
}

const cos = new COS({
  SecretId: process.env.COS_SECRET_ID,
  SecretKey: process.env.COS_SECRET_KEY,
});

const BUCKET = process.env.COS_BUCKET;
const REGION = process.env.COS_REGION;
const CDN_DOMAIN = process.env.COS_CDN_DOMAIN || '';

function mimeOf(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return (
    {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
    }[ext] || 'application/octet-stream'
  );
}

function uploadOne(filename) {
  const localPath = path.join(CARDS_DIR, filename);
  const body = fs.readFileSync(localPath);
  const cosKey = `${COS_PREFIX}${filename}`;
  return new Promise((resolve, reject) => {
    cos.putObject(
      {
        Bucket: BUCKET,
        Region: REGION,
        Key: cosKey,
        Body: body,
        ContentType: mimeOf(filename),
      },
      (err) => (err ? reject(err) : resolve(cosKey))
    );
  });
}

async function main() {
  if (!fs.existsSync(CARDS_DIR)) {
    console.error(`❌ 目录不存在：${CARDS_DIR}`);
    process.exit(1);
  }
  const files = fs
    .readdirSync(CARDS_DIR)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .sort();
  if (files.length === 0) {
    console.log('⚠️  public/cards/ 下没有图片文件');
    return;
  }

  console.log(`📤 准备上传 ${files.length} 张卡图到 COS：${BUCKET} (${REGION})`);
  console.log('');

  let totalSize = 0;
  let ok = 0;
  let fail = 0;

  for (const file of files) {
    const size = fs.statSync(path.join(CARDS_DIR, file)).size;
    const sizeKB = (size / 1024).toFixed(0);
    process.stdout.write(`  ${file.padEnd(40)} ${sizeKB.padStart(6)} KB ... `);
    try {
      const key = await uploadOne(file);
      console.log(`✅  ${key}`);
      totalSize += size;
      ok++;
    } catch (err) {
      console.log(`❌  ${err.message}`);
      fail++;
    }
  }

  console.log('');
  console.log(`🎉 完成：成功 ${ok} / 失败 ${fail} / 合计 ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
  console.log('');

  const baseUrl = CDN_DOMAIN ? `https://${CDN_DOMAIN}` : `https://${BUCKET}.cos.${REGION}.myqcloud.com`;
  const sampleFile = files[0];
  const sampleUrl = `${baseUrl}/${COS_PREFIX}${encodeURI(sampleFile)}?imageMogr2/format/webp/quality/85/thumbnail/800x`;

  console.log('📌 接下来请在 .env 里新增（本地 + 服务器都需要）：');
  console.log('');
  console.log(`    NEXT_PUBLIC_CARDS_CDN=${baseUrl}`);
  console.log('');
  console.log('🔎 示例访问 URL（可在浏览器打开验证）：');
  console.log('');
  console.log(`    ${sampleUrl}`);
  console.log('');
  console.log('完成后重新 npm run build 即可生效。');
}

main().catch((err) => {
  console.error('❌ 未捕获异常：', err);
  process.exit(1);
});
