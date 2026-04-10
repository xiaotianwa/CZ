import COS from 'cos-nodejs-sdk-v5';
import { randomBytes } from 'crypto';

const cosClient = new COS({
  SecretId: process.env.COS_SECRET_ID || '',
  SecretKey: process.env.COS_SECRET_KEY || '',
});

const BUCKET = process.env.COS_BUCKET || 'chenze-community-1234567890';
const REGION = process.env.COS_REGION || 'ap-guangzhou';
const CDN_DOMAIN = process.env.COS_CDN_DOMAIN || '';

function getCosUrl(key: string): string {
  if (CDN_DOMAIN) {
    return `https://${CDN_DOMAIN}/${key}`;
  }
  return `https://${BUCKET}.cos.${REGION}.myqcloud.com/${key}`;
}

function generateKey(category: string, filename: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const timestamp = Date.now();
  const random = randomBytes(4).toString('hex');
  const ext = filename.split('.').pop() || 'jpg';
  return `${category}/${year}/${month}/${day}/${timestamp}-${random}.${ext}`;
}

export interface UploadResult {
  url: string;
  cosKey: string;
  size: number;
}

export async function uploadBuffer(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  category: string = 'general'
): Promise<UploadResult> {
  const key = generateKey(category, filename);

  return new Promise((resolve, reject) => {
    cosClient.putObject(
      {
        Bucket: BUCKET,
        Region: REGION,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      },
      (err) => {
        if (err) {
          reject(new Error(`COS上传失败: ${err.message}`));
          return;
        }
        resolve({
          url: getCosUrl(key),
          cosKey: key,
          size: buffer.length,
        });
      }
    );
  });
}

export async function deleteObject(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    cosClient.deleteObject(
      {
        Bucket: BUCKET,
        Region: REGION,
        Key: key,
      },
      (err) => {
        if (err) {
          reject(new Error(`COS删除失败: ${err.message}`));
          return;
        }
        resolve();
      }
    );
  });
}

export async function getPresignedUrl(key: string, expires: number = 3600): Promise<string> {
  return new Promise((resolve, reject) => {
    cosClient.getObjectUrl(
      {
        Bucket: BUCKET,
        Region: REGION,
        Key: key,
        Sign: true,
        Expires: expires,
      },
      (err, data) => {
        if (err) {
          reject(new Error(`COS获取预签名URL失败: ${err.message}`));
          return;
        }
        resolve(data?.Url || '');
      }
    );
  });
}

/**
 * 生成 PUT 预签名 URL，供前端直传 COS
 * 前端拿到 URL 后用 fetch PUT 直接上传文件到 COS
 */
export interface PresignedUploadResult {
  uploadUrl: string;  // 预签名 PUT URL
  cosKey: string;     // 文件在 COS 中的 key
  fileUrl: string;    // 上传完成后的访问 URL
}

export async function getPresignedUploadUrl(
  filename: string,
  mimeType: string,
  category: string = 'general'
): Promise<PresignedUploadResult> {
  const cosKey = generateKey(category, filename);

  return new Promise((resolve, reject) => {
    cosClient.getObjectUrl(
      {
        Bucket: BUCKET,
        Region: REGION,
        Key: cosKey,
        Method: 'PUT',
        Sign: true,
        Expires: 600, // 10 分钟有效
        Headers: {
          'Content-Type': mimeType,
        },
      },
      (err, data) => {
        if (err) {
          reject(new Error(`COS预签名URL生成失败: ${err.message}`));
          return;
        }
        resolve({
          uploadUrl: data?.Url || '',
          cosKey,
          fileUrl: getCosUrl(cosKey),
        });
      }
    );
  });
}

export { getCosUrl, generateKey };
