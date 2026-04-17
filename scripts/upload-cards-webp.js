#!/usr/bin/env node
/**
 * 把 public/cards/*.{png,jpg,jpeg} 用 sharp 压成 WebP 后上传到 COS。
 *
 * 与 upload-cards.js 的区别：
 *   - upload-cards.js 上传原始 PNG/JPG，依赖 COS 数据万象 imageMogr2 做动态压缩
 *   - 本脚本先在本地压缩成 WebP 再上传，不依赖数据万象
 *
 * 用法：
 *   npm install --no-save sharp   # 若尚未安装
 *   node scripts/upload-cards-webp.js
 *
 * 前置条件：.env 里需要已配置 COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_REGION
 *
 * 压缩参数：
 *   - 最大宽度 800px（保持比例，不放大）
 *   - WebP quality = 85
 *
 * 生成的 COS key：`cards/{原文件名去扩展名}.webp`
 */

'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const COS = require('cos-nodejs-sdk-v5');

let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('❌ 缺少 sharp 依赖。请先执行：');
  console.error('');
  console.error('    npm install --no-save sharp');
  console.error('');
  process.exit(1);
}

const CARDS_DIR = path.join(__dirname, '..', 'public', 'cards');
const COS_PREFIX = 'cards/';
const WEBP_WIDTH = 800;
const WEBP_QUALITY = 85;

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

function basenameNoExt(filename) {
  const ext = path.extname(filename);
  return filename.slice(0, filename.length - ext.length);
}

async function compressOne(localPath) {
  return await sharp(localPath)
    .resize({ width: WEBP_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

function uploadBuffer(cosKey, buffer) {
  return new Promise((resolve, reject) => {
    cos.putObject(
      {
        Bucket: BUCKET,
        Region: REGION,
        Key: cosKey,
        Body: buffer,
        ContentType: 'image/webp',
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
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .sort();
  if (files.length === 0) {
    console.log('⚠️  public/cards/ 下没有 png/jpg/jpeg 文件');
    return;
  }

  console.log(`📤 准备压缩并上传 ${files.length} 张卡图到 COS：${BUCKET} (${REGION})`);
  console.log(`   压缩参数：max-width=${WEBP_WIDTH}px，WebP quality=${WEBP_QUALITY}`);
  console.log('');

  let totalOrig = 0;
  let totalWebp = 0;
  let ok = 0;
  let fail = 0;

  for (const file of files) {
    const localPath = path.join(CARDS_DIR, file);
    const origSize = fs.statSync(localPath).size;
    const webpName = `${basenameNoExt(file)}.webp`;
    const cosKey = `${COS_PREFIX}${webpName}`;

    process.stdout.write(`  ${file.padEnd(42)} ${(origSize / 1024).toFixed(0).padStart(5)} KB → `);

    try {
      const buf = await compressOne(localPath);
      await uploadBuffer(cosKey, buf);
      const webpSize = buf.length;
      totalOrig += origSize;
      totalWebp += webpSize;
      ok++;
      const ratio = ((1 - webpSize / origSize) * 100).toFixed(0);
      console.log(`${(webpSize / 1024).toFixed(0).padStart(5)} KB (-${ratio}%)  ✅  ${cosKey}`);
    } catch (err) {
      fail++;
      console.log(`❌  ${err.message}`);
    }
  }

  console.log('');
  console.log(`🎉 完成：成功 ${ok} / 失败 ${fail}`);
  console.log(
    `   原始体积 ${(totalOrig / 1024 / 1024).toFixed(1)} MB → WebP 体积 ${(totalWebp / 1024 / 1024).toFixed(1)} MB` +
      `（节省 ${((1 - totalWebp / totalOrig) * 100).toFixed(0)}%）`
  );
  console.log('');

  const baseUrl = CDN_DOMAIN ? `https://${CDN_DOMAIN}` : `https://${BUCKET}.cos.${REGION}.myqcloud.com`;
  const sampleFile = files[0];
  const sampleWebp = `${basenameNoExt(sampleFile)}.webp`;
  const sampleUrl = `${baseUrl}/${COS_PREFIX}${encodeURI(sampleWebp)}`;

  console.log('📌 环境变量（本地 + 服务器都需要）：');
  console.log('');
  console.log(`    NEXT_PUBLIC_CARDS_CDN=${baseUrl}`);
  console.log('');
  console.log('🔎 示例访问 URL（可在浏览器打开验证）：');
  console.log('');
  console.log(`    ${sampleUrl}`);
  console.log('');
  console.log('前端代码（cardPresets.ts）已同步改为直接访问 WebP，无需额外参数。');
}

main().catch((err) => {
  console.error('❌ 未捕获异常：', err);
  process.exit(1);
});
