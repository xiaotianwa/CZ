import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbUrl = process.env.DATABASE_URL || `file:${path.join(__dirname, 'dev.db')}`;
const adapter = new PrismaLibSql({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.siteConfig.upsert({
    where: { key: 'site_name' },
    update: { value: '1103' },
    create: { key: 'site_name', value: '1103', group: 'general', label: '站点名称' },
  });

  await prisma.siteConfig.upsert({
    where: { key: 'site_description' },
    update: { value: '1103 陈泽资料与游戏内容站' },
    create: { key: 'site_description', value: '1103 陈泽资料与游戏内容站', group: 'general', label: '站点描述' },
  });

  const profileConfigs = [
    ['profile_name', '陈泽', '姓名'],
    ['profile_english_name', 'ChenZe', '英文名'],
    ['profile_intro', '直播、游戏与个人资料聚合页。', '简介'],
    ['feature_memes_enabled', 'true', '梗百科开关'],
    ['feature_play_enabled', 'true', '游戏中心开关'],
  ] as const;

  for (const [key, value, label] of profileConfigs) {
    await prisma.siteConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value, group: key.startsWith('feature_') ? 'feature' : 'profile', label },
    });
  }

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: '$2a$12$abcdefghijklmnopqrstuuQ1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q',
      name: '管理员',
      role: 'admin',
      isActive: true,
    },
  });

  await prisma.heroSlide.upsert({
    where: { id: 'default-hero' },
    update: { isActive: true, sortOrder: 1 },
    create: {
      id: 'default-hero',
      image: '',
      alt: '默认首页背景',
      isActive: true,
      sortOrder: 1,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
