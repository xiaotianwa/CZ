import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbUrl = process.env.DATABASE_URL || `file:${path.join(__dirname, 'dev.db')}`;
const adapter = new PrismaLibSql({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

const PH = (w: number, h: number, text: string) =>
  `https://placehold.co/${w}x${h}/1890ff/ffffff?text=${encodeURIComponent(text)}`;

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ 禁止在生产环境运行 seed 脚本');
    process.exit(1);
  }
  console.log('🌱 Seeding database...');

  // ===== 管理员 (独立 Admin 表) =====
  const adminPwd = await bcrypt.hash('admin123', 12);

  await prisma.admin.upsert({
    where: { email: 'admin@chenze.com' },
    update: {},
    create: { email: 'admin@chenze.com', password: adminPwd, name: '超级管理员', role: 'super_admin', avatar: PH(48, 48, 'SA') },
  });

  await prisma.admin.upsert({
    where: { email: 'editor@chenze.com' },
    update: {},
    create: { email: 'editor@chenze.com', password: adminPwd, name: '内容编辑', role: 'editor', avatar: PH(48, 48, 'ED') },
  });

  // ===== 前台用户 =====
  const fanPwd = await bcrypt.hash('fan12345', 12);

  const star = await prisma.user.upsert({
    where: { email: 'chenze@chenze.com' },
    update: {},
    create: { email: 'chenze@chenze.com', password: fanPwd, name: '陈泽', role: 'star', avatar: PH(48, 48, 'CZ') },
  });

  const assistant = await prisma.user.upsert({
    where: { email: 'assistant@chenze.com' },
    update: {},
    create: { email: 'assistant@chenze.com', password: fanPwd, name: '泽哥助理', role: 'assistant', avatar: PH(48, 48, 'A') },
  });

  const fans = await Promise.all([
    prisma.user.upsert({ where: { email: 'fan1@test.com' }, update: {}, create: { email: 'fan1@test.com', password: fanPwd, name: '绥棱铁粉王', role: 'fan', level: 8, badge: '超级粉', points: 128600, avatar: PH(48, 48, 'M') } }),
    prisma.user.upsert({ where: { email: 'fan2@test.com' }, update: {}, create: { email: 'fan2@test.com', password: fanPwd, name: '东北铁粉', role: 'fan', level: 9, badge: '超级粉', points: 96400, avatar: PH(48, 48, 'F1') } }),
    prisma.user.upsert({ where: { email: 'fan3@test.com' }, update: {}, create: { email: 'fan3@test.com', password: fanPwd, name: 'LOL小迷妹', role: 'fan', level: 9, badge: '超级粉', points: 82100, avatar: PH(48, 48, 'F2') } }),
    prisma.user.upsert({ where: { email: 'fan4@test.com' }, update: {}, create: { email: 'fan4@test.com', password: fanPwd, name: '画手阿泽粉', role: 'fan', level: 6, badge: '真爱粉', points: 67800, avatar: PH(48, 48, 'L') } }),
  ]);

  // ===== Tags =====
  const tagNames = ['官方动态', '直播预告', '追星日记', '名场面', '同人创作', '绘画', '陈泽杯', '英雄联盟', '开黑组队', '东北话教学', '1103语录', '安利', '问答', '直播名场面'];
  const tags: Record<string, string> = {};
  for (const name of tagNames) {
    const tag = await prisma.tag.upsert({ where: { name }, update: {}, create: { name } });
    tags[name] = tag.id;
  }

  // ===== Posts =====
  const postsData = [
    { authorId: star.id, content: '今晚九点直播英雄联盟，新赛季冲分！上赛季差一点上大师，这次必须给安排上。老铁们记得来捧场，不来的都是瓜皮！', images: [PH(600, 400, 'LOL+Stream')], tagNames: ['官方动态', '直播预告'], likes: 52800, isPinned: true },
    { authorId: fans[0].id, content: '整理了陈泽从快手到抖音的经典名场面合集，每一段都能笑到肚子疼！"还有我，我也是"这个梗到现在还在用哈哈哈哈。', images: [PH(600, 400, 'Highlights+1'), PH(600, 400, 'Highlights+2')], tagNames: ['追星日记', '名场面'], likes: 1890, isPinned: false },
    { authorId: assistant.id, content: '【陈泽杯预告】第二届英雄联盟陈泽杯即将开赛！面向全网召集选手，奖金池超百万。报名通道即将开放，有实力的召唤师们准备好了吗？', images: [PH(600, 300, 'ChenZe+Cup+S2')], tagNames: ['官方动态', '陈泽杯'], likes: 32400, isPinned: true },
    { authorId: fans[3].id, content: '花了一周画的陈泽Q版头像，灵感来自泽子直播时经典的表情。第一次画这种风格，感觉还挺像的，希望泽子能看到！', images: [PH(600, 600, 'Fan+Art+CZ')], tagNames: ['同人创作', '绘画'], likes: 3420, isPinned: false },
  ];

  for (const p of postsData) {
    const existing = await prisma.post.findFirst({ where: { content: p.content.slice(0, 50) } });
    if (existing) continue;

    const post = await prisma.post.create({
      data: {
        authorId: p.authorId,
        content: p.content,
        images: JSON.stringify(p.images),
        likes: p.likes,
        isPinned: p.isPinned,
        status: 'published',
      },
    });

    if (p.tagNames.length > 0) {
      await prisma.postTag.createMany({
        data: p.tagNames.filter((n) => tags[n]).map((n) => ({ postId: post.id, tagId: tags[n] })),
      });
    }
  }

  // ===== Comments =====
  const posts = await prisma.post.findMany({ orderBy: { createdAt: 'asc' }, take: 4 });
  if (posts[0]) {
    const commentCount = await prisma.comment.count({ where: { postId: posts[0].id } });
    if (commentCount === 0) {
      await prisma.comment.createMany({
        data: [
          { postId: posts[0].id, authorId: fans[1].id, content: '冲冲冲！泽哥必上大师！', likes: 328 },
          { postId: posts[0].id, authorId: assistant.id, content: '直播间已开启预约，点击主页预约按钮不迷路~', likes: 156 },
        ],
      });
    }
  }
  if (posts[3]) {
    const commentCount = await prisma.comment.count({ where: { postId: posts[3].id } });
    if (commentCount === 0) {
      await prisma.comment.create({
        data: { postId: posts[3].id, authorId: star.id, content: '可以可以，这也太像了，直接拿去当头像了兄弟！', likes: 8900 },
      });
    }
  }

  // ===== Albums =====
  const albumsData = [
    { title: '直播精彩瞬间', category: '直播', cover: PH(400, 300, 'Live'), sortOrder: 1 },
    { title: '英雄联盟赛事', category: '电竞', cover: PH(400, 300, 'LOL'), sortOrder: 2 },
    { title: '日常生活', category: '日常', cover: PH(400, 300, 'Daily'), sortOrder: 3 },
    { title: '粉丝投稿', category: '粉丝', cover: PH(400, 300, 'Fan+Art'), sortOrder: 4 },
    { title: '活动现场', category: '活动', cover: PH(400, 300, 'Event'), sortOrder: 5 },
    { title: '陈泽杯比赛', category: '电竞', cover: PH(400, 300, 'ChenZe+Cup'), sortOrder: 6 },
  ];

  for (const a of albumsData) {
    const existing = await prisma.album.findFirst({ where: { title: a.title } });
    if (existing) continue;
    const album = await prisma.album.create({ data: a });
    const prefix = a.title.slice(0, 2);
    await prisma.photo.createMany({
      data: Array.from({ length: 6 }, (_, i) => ({
        albumId: album.id,
        url: PH(600, 400, `${prefix}+${i + 1}`),
        description: `${a.title} ${i + 1}`,
        sortOrder: i,
      })),
    });
  }

  // ===== Events =====
  const eventsData = [
    { title: '第二届英雄联盟陈泽杯', description: '陈泽联合英雄联盟官方举办的大型电竞赛事，面向全网召唤师，奖金池超百万，冠军战队将获得城市英雄争霸赛总决赛资格。', cover: PH(800, 400, 'ChenZe+Cup'), startTime: new Date('2026-06-15T14:00'), endTime: new Date('2026-06-15T22:00'), location: '线上赛 + 线下总决赛', status: 'upcoming', participants: 128000 },
    { title: '陈泽抖音直播周年庆', description: '入驻抖音直播一周年特别直播，回顾精彩瞬间，与粉丝连麦互动。', cover: PH(800, 400, 'Anniversary'), startTime: new Date('2026-05-12T20:00'), endTime: new Date('2026-05-12T23:00'), location: '抖音直播间', status: 'upcoming', participants: 560000 },
    { title: '粉丝线下见面会 - 哈尔滨站', description: '陈泽首次线下粉丝见面会！面对面游戏互动、签名合影、抽奖送周边。', cover: PH(800, 400, 'Fan+Meeting'), startTime: new Date('2026-07-20T14:00'), endTime: new Date('2026-07-20T17:00'), location: '哈尔滨万达广场', status: 'upcoming', participants: 5000 },
  ];

  for (const e of eventsData) {
    const existing = await prisma.event.findFirst({ where: { title: e.title } });
    if (!existing) await prisma.event.create({ data: e });
  }

  // ===== Games =====
  const gamesData = [
    { name: '英雄联盟', cover: PH(400, 540, 'LOL'), platform: 'PC', genre: 'MOBA', status: 'playing', lastPlayed: '今天', hours: 12000, rating: 5, comment: '本命游戏，每天直播必玩。', description: '《英雄联盟》是由Riot Games开发的多人在线竞技场游戏。', downloadLinks: JSON.stringify([{ label: '官网下载', url: 'https://lol.qq.com' }]), sortOrder: 1 },
    { name: '永劫无间', cover: PH(400, 540, 'Naraka'), platform: 'PC', genre: '动作竞技', status: 'playing', lastPlayed: '昨天', hours: 860, rating: 4, comment: '最近超爱玩的游戏。', description: '《永劫无间》是网易开发的东方武侠吃鸡游戏。', downloadLinks: JSON.stringify([{ label: 'Steam', url: 'https://store.steampowered.com/app/1203220' }]), sortOrder: 2 },
    { name: '元梦之星', cover: PH(400, 540, 'YuanMeng'), platform: 'PC / 手游', genre: '生存建造', status: 'playing', lastPlayed: '前天', hours: 320, rating: 4, comment: '和老铁们一起玩的生存游戏。', description: '《元梦之星》是腾讯推出的派对游戏。', downloadLinks: JSON.stringify([{ label: '官网下载', url: 'https://ym.qq.com' }]), sortOrder: 3 },
    { name: '金铲大佚', cover: PH(400, 540, 'TFT'), platform: 'PC / 手游', genre: '自动棋', status: 'recent', lastPlayed: '3天前', hours: 580, rating: 5, comment: 'LOL自动棋，排位赛上分贼爽。', description: '《金铲大佚》是英雄联盟官方自动棋游戏。', downloadLinks: JSON.stringify([{ label: '官网下载', url: 'https://tft.qq.com' }]), sortOrder: 4 },
    { name: '流放之路2', cover: PH(400, 540, 'POE2'), platform: 'PC', genre: 'ARPG', status: 'recent', lastPlayed: '1周前', hours: 240, rating: 4, comment: '暗黑风格刷宝游戏。', description: '《流放之路2》是暗黑风格ARPG。', downloadLinks: JSON.stringify([{ label: 'Steam', url: 'https://store.steampowered.com/app/2694490' }]), sortOrder: 5 },
    { name: '马里奥聚会', cover: PH(400, 540, 'Mario+Party'), platform: 'Switch', genre: '派对游戏', status: 'favorite', lastPlayed: '2周前', hours: 150, rating: 5, comment: '和兄弟们一起玩的派对游戏。', description: '《超级马里奥 派对》是经典派对游戏。', downloadLinks: JSON.stringify([{ label: 'Nintendo eShop', url: 'https://www.nintendo.com' }]), sortOrder: 6 },
  ];

  for (const g of gamesData) {
    const existing = await prisma.game.findFirst({ where: { name: g.name } });
    if (!existing) await prisma.game.create({ data: g });
  }

  // ===== Timeline =====
  const timelineData = [
    { date: '2018年', title: '英雄联盟七周年', description: '在舞剑仙战队参加英雄联盟七周年庆狂欢盛典', type: 'event', sortOrder: 1 },
    { date: '2019年', title: '开始自媒体之路', description: '在抖音和快手平台发布作品，开启主播生涯', type: 'debut', sortOrder: 2 },
    { date: '2023年7月', title: '爆火出圈', description: '抖音发布视频《还有我 我也是》，获赞473.1万', type: 'milestone', sortOrder: 3 },
    { date: '2023年12月', title: '宣布停播', description: '因快手合同问题宣布停播', type: 'event', sortOrder: 4 },
    { date: '2024年1月', title: '入驻抖音直播', description: '首播吸引3950.2万观看，3.64亿点赞', type: 'milestone', sortOrder: 5 },
    { date: '2024年1月', title: '公益捐款', description: '向家乡绥棱县第一中学捐款十万元', type: 'event', sortOrder: 6 },
    { date: '2024年2月', title: '电竞春晚', description: '参与2024英雄联盟电竞春晚表演赛', type: 'event', sortOrder: 7 },
    { date: '2024年7月', title: '陈泽杯', description: '联合英雄联盟官方举办"英雄联盟陈泽杯"比赛，奖金超百万元', type: 'milestone', sortOrder: 8 },
  ];

  for (const t of timelineData) {
    const existing = await prisma.timelineEvent.findFirst({ where: { title: t.title } });
    if (!existing) await prisma.timelineEvent.create({ data: t });
  }

  // ===== Hero Slides =====
  const slidesData = [
    { image: PH(1920, 800, 'LIVE+STREAM'), alt: '直播现场', sortOrder: 1 },
    { image: PH(1920, 800, 'LOL+GAMING'), alt: '英雄联盟', sortOrder: 2 },
    { image: PH(1920, 800, 'CHENZE+CUP'), alt: '陈泽杯赛事', sortOrder: 3 },
    { image: PH(1920, 800, 'FAN+MEETING'), alt: '粉丝见面会', sortOrder: 4 },
  ];

  for (const s of slidesData) {
    const existing = await prisma.heroSlide.findFirst({ where: { alt: s.alt } });
    if (!existing) await prisma.heroSlide.create({ data: s });
  }

  // ===== Site Config =====
  const configs = [
    { key: 'site_name', value: '1103社区', group: 'general', label: '站点名称' },
    { key: 'site_description', value: '陈泽的专属粉丝社区', group: 'general', label: '站点描述' },
    { key: 'profile_name', value: '陈泽', group: 'profile', label: '主播名称' },
    { key: 'profile_english_name', value: 'ChenZe', group: 'profile', label: '英文名' },
    { key: 'profile_birthplace', value: '黑龙江省绥化市绥棱县', group: 'profile', label: '籍贯' },
    { key: 'profile_intro', value: '英雄联盟主播、游戏领域自媒体创作者。2019年开始在抖音和快手平台发布作品，以独特的直播风格和真实的东北人格魅力圈粉无数。', group: 'profile', label: '简介' },
    { key: 'profile_tags', value: '英雄联盟,游戏主播,抖音达人,东北老铁', group: 'profile', label: '标签' },
    { key: 'profile_birthday', value: '黑龙江绥棱', group: 'profile', label: '家乡' },
    { key: 'profile_identity', value: '英雄联盟主播', group: 'profile', label: '身份' },
    { key: 'profile_height', value: '未公开', group: 'profile', label: '身高' },
    // 社交平台 - 抖音
    { key: 'social_douyin', value: 'https://www.douyin.com/user/MS4wLjABAAAA', group: 'social', label: '抖音链接' },
    { key: 'social_douyin_followers', value: '2209.6万', group: 'social', label: '抖音粉丝数' },
    { key: 'social_douyin_account_name', value: '陈泽', group: 'social', label: '抖音账号名' },
    { key: 'social_douyin_account_id', value: 'chenze1103', group: 'social', label: '抖音号' },
    { key: 'social_douyin_desc', value: '英雄联盟主播、游戏领域自媒体创作者。日常直播、游戏精彩集锦分享。', group: 'social', label: '抖音简介' },
    // 社交平台 - 微博
    { key: 'social_weibo', value: 'https://weibo.com/chenze', group: 'social', label: '微博链接' },
    { key: 'social_weibo_followers', value: '500万+', group: 'social', label: '微博粉丝数' },
    { key: 'social_weibo_account_name', value: '陈泽ChenZe', group: 'social', label: '微博昵称' },
    { key: 'social_weibo_account_id', value: 'chenze_official', group: 'social', label: '微博ID' },
    { key: 'social_weibo_desc', value: '英雄联盟主播 | 动态更新、粉丝互动、生活分享。', group: 'social', label: '微博简介' },
  ];

  for (const c of configs) {
    await prisma.siteConfig.upsert({
      where: { key: c.key },
      update: { value: c.value },
      create: c,
    });
  }

  // ===== Quiz Questions =====
  const quizData = [
    { question: '陈泽主要直播的游戏是哪款?', options: ['王者荣耀', '英雄联盟', '原神', '和平精英'], answer: 1, sortOrder: 1 },
    { question: '陈泽的家乡在哪个省?', options: ['辽宁省', '吉林省', '黑龙江省', '内蒙古'], answer: 2, sortOrder: 2 },
    { question: '陈泽2024年1月抖音首播吸引了多少观看?', options: ['1000万', '2500万', '3950万', '5000万'], answer: 2, sortOrder: 3 },
    { question: '陈泽举办的电竞赛事叫什么?', options: ['陈泽挑战赛', '陈泽杯', '英雄联盟明星赛', '老铁争霸赛'], answer: 1, sortOrder: 4 },
    { question: '截至2026年3月，陈泽抖音粉丝数约为多少?', options: ['1500万', '1800万', '2209万', '2500万'], answer: 2, sortOrder: 5 },
    { question: '陈泽开播仅几秒就突破10万观众?', options: ['1秒', '3秒', '5秒', '10秒'], answer: 1, sortOrder: 6 },
    { question: '陈泽是从哪一年开始在抖音和快手发布作品的?', options: ['2017年', '2018年', '2019年', '2020年'], answer: 2, sortOrder: 7 },
    { question: '陈泽的粉丝们常被称为什么?', options: ['家人们', '兄弟们', '老铁们', '宝贝们'], answer: 2, sortOrder: 8 },
    { question: '陈泽在哪个平台拥有超过1600万粉丝?', options: ['B站', '微博', '快手', '小红书'], answer: 2, sortOrder: 9 },
    { question: '社区品牌名"1103"中的数字代表什么?', options: ['陈泽的生日', '粉丝团成立日', '首播日期', '出道纪念日'], answer: 0, sortOrder: 10 },
    { question: '陈泽首播获得了多少亿点赞?', options: ['1.5亿', '2.8亿', '3.64亿', '5亿'], answer: 2, sortOrder: 11 },
    { question: '陈泽来自黑龙江省哪个地方?', options: ['哈尔滨', '齐齐哈尔', '绥棱', '大庆'], answer: 2, sortOrder: 12 },
  ];

  for (const q of quizData) {
    const existing = await prisma.quizQuestion.findFirst({ where: { question: q.question } });
    if (!existing) {
      await prisma.quizQuestion.create({
        data: { question: q.question, options: JSON.stringify(q.options), answer: q.answer, sortOrder: q.sortOrder },
      });
    }
  }

  // ===== Announcements =====
  const announcementsData = [
    {
      title: '欢迎来到1103社区',
      content: '1103社区正式上线啦！这里是泽小将们的专属家园，一起看直播、聊游戏、整活儿。\n\n社区功能持续更新中，敬请期待更多精彩内容！',
      type: 'info',
      sortOrder: 1,
    },
    {
      title: '第二届陈泽杯即将开赛',
      content: '英雄联盟陈泽杯S2赛季来了！面向全网召唤师开放报名，奖金池超百万。\n\n赶紧叫上你的兄弟们组队参加吧！',
      type: 'event',
      link: '/events',
      linkText: '查看活动详情',
      sortOrder: 2,
    },
  ];

  for (const a of announcementsData) {
    const existing = await prisma.announcement.findFirst({ where: { title: a.title } });
    if (!existing) {
      await prisma.announcement.create({ data: a });
    }
  }

  console.log('✅ Seed completed!');
  console.log('');
  console.log('   管理后台: admin@chenze.com / admin123');
  console.log('   编辑账号: editor@chenze.com / admin123');
  console.log('');
  console.log('   前台用户: fan1@test.com / fan12345');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
