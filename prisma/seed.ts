import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import bcrypt from 'bcryptjs';
// 硬编码卡牌定义（含 effects / keywords / synergies）：DB 的单一真相
import { ALL_CARDS } from '../src/game/cards';

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

  await prisma.admin.upsert({
    where: { email: 'mod@chenze.com' },
    update: {},
    create: { email: 'mod@chenze.com', password: adminPwd, name: '社区管理员', role: 'admin', avatar: PH(48, 48, 'MOD') },
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
    prisma.user.upsert({ where: { email: 'fan1@test.com' }, update: {}, create: { email: 'fan1@test.com', password: fanPwd, name: '绥棱铁粉王', role: 'fan', level: 8, badge: '超级粉', points: 128600, avatar: PH(48, 48, 'M'), city: '黑龙江·绥棱', bio: '绥棱老乡，泽子忠实粉丝' } }),
    prisma.user.upsert({ where: { email: 'fan2@test.com' }, update: {}, create: { email: 'fan2@test.com', password: fanPwd, name: '东北铁粉', role: 'fan', level: 9, badge: '超级粉', points: 96400, avatar: PH(48, 48, 'F1'), city: '辽宁·沈阳', bio: '东北人永远支持泽子' } }),
    prisma.user.upsert({ where: { email: 'fan3@test.com' }, update: {}, create: { email: 'fan3@test.com', password: fanPwd, name: 'LOL小迷妹', role: 'fan', level: 9, badge: '超级粉', points: 82100, avatar: PH(48, 48, 'F2'), city: '北京·朝阳', bio: '英雄联盟迷妹一枚' } }),
    prisma.user.upsert({ where: { email: 'fan4@test.com' }, update: {}, create: { email: 'fan4@test.com', password: fanPwd, name: '画手阿泽粉', role: 'fan', level: 6, badge: '真爱粉', points: 67800, avatar: PH(48, 48, 'L'), city: '广东·广州', bio: '画画爱好者，最爱画泽子' } }),
    prisma.user.upsert({ where: { email: 'fan5@test.com' }, update: {}, create: { email: 'fan5@test.com', password: fanPwd, name: '老铁666', role: 'fan', level: 5, badge: '铁粉', points: 45200, avatar: PH(48, 48, 'F5'), city: '吉林·长春', bio: '每天准时蹲直播' } }),
    prisma.user.upsert({ where: { email: 'fan6@test.com' }, update: {}, create: { email: 'fan6@test.com', password: fanPwd, name: '泽泽的小迷弟', role: 'fan', level: 4, badge: '铁粉', points: 32100, avatar: PH(48, 48, 'F6'), city: '浙江·杭州', bio: '南方人也爱看东北主播' } }),
    prisma.user.upsert({ where: { email: 'fan7@test.com' }, update: {}, create: { email: 'fan7@test.com', password: fanPwd, name: '峡谷暴走族', role: 'fan', level: 7, badge: '真爱粉', points: 58900, avatar: PH(48, 48, 'F7'), city: '四川·成都', bio: 'LOL钻石选手，跟泽子学盲僧' } }),
    prisma.user.upsert({ where: { email: 'fan8@test.com' }, update: {}, create: { email: 'fan8@test.com', password: fanPwd, name: '快乐追星人', role: 'fan', level: 3, badge: '活跃粉', points: 18600, avatar: PH(48, 48, 'F8'), city: '上海·浦东', bio: '追泽子一年了，越来越快乐' } }),
    prisma.user.upsert({ where: { email: 'fan9@test.com' }, update: {}, create: { email: 'fan9@test.com', password: fanPwd, name: '视频剪辑小王', role: 'fan', level: 6, badge: '真爱粉', points: 52300, avatar: PH(48, 48, 'F9'), city: '湖南·长沙', bio: '专门给泽子剪辑高能集锦' } }),
    prisma.user.upsert({ where: { email: 'fan10@test.com' }, update: {}, create: { email: 'fan10@test.com', password: fanPwd, name: '新来的小粉丝', role: 'fan', level: 1, badge: undefined, points: 100, avatar: PH(48, 48, 'F10'), city: '河南·郑州', bio: '刚关注泽子，社区新人报到' } }),
    prisma.user.upsert({ where: { email: 'fan11@test.com' }, update: {}, create: { email: 'fan11@test.com', password: fanPwd, name: '永劫无间大佬', role: 'fan', level: 5, badge: '铁粉', points: 41000, avatar: PH(48, 48, 'F11'), city: '山东·济南', bio: '永劫无间天梯前100，等泽子来战' } }),
    prisma.user.upsert({ where: { email: 'fan12@test.com' }, update: {}, create: { email: 'fan12@test.com', password: fanPwd, name: '表情包收集者', role: 'fan', level: 4, badge: '铁粉', points: 28700, avatar: PH(48, 48, 'F12'), city: '江苏·南京', bio: '收集了200+泽子表情包' } }),
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
    { authorId: star.id, content: '今晚九点直播英雄联盟，新赛季冲分！上赛季差一点上大师，这次必须给安排上。老铁们记得来捧场，不来的都是瓜皮！', images: [PH(600, 400, 'LOL+Stream')], tagNames: ['官方动态', '直播预告'], likes: 52800, isPinned: true, status: 'published' },
    { authorId: fans[0].id, content: '整理了陈泽从快手到抖音的经典名场面合集，每一段都能笑到肚子疼！"还有我，我也是"这个梗到现在还在用哈哈哈哈。', images: [PH(600, 400, 'Highlights+1'), PH(600, 400, 'Highlights+2')], tagNames: ['追星日记', '名场面'], likes: 1890, isPinned: false, status: 'published' },
    { authorId: assistant.id, content: '【陈泽杯预告】第二届英雄联盟陈泽杯即将开赛！面向全网召集选手，奖金池超百万。报名通道即将开放，有实力的召唤师们准备好了吗？', images: [PH(600, 300, 'ChenZe+Cup+S2')], tagNames: ['官方动态', '陈泽杯'], likes: 32400, isPinned: true, status: 'published' },
    { authorId: fans[3].id, content: '花了一周画的陈泽Q版头像，灵感来自泽子直播时经典的表情。第一次画这种风格，感觉还挺像的，希望泽子能看到！', images: [PH(600, 600, 'Fan+Art+CZ')], tagNames: ['同人创作', '绘画'], likes: 3420, isPinned: false, status: 'published' },
    { authorId: fans[4].id, content: '有没有老铁今晚开黑的？黄金段位，想冲白金，带个辅助来！泽子教的盲僧我已经练了三天了，虽然回旋踢还是踢不准……', images: [], tagNames: ['开黑组队', '英雄联盟'], likes: 234, isPinned: false, status: 'published' },
    { authorId: fans[6].id, content: '分享一波泽子直播中的经典东北话教学：\n1. "瓜皮" = 笨蛋\n2. "造" = 吃\n3. "嘎哈呢" = 干什么呢\n4. "整挺好" = 弄得挺好\n学会了吗老铁们？', images: [], tagNames: ['东北话教学', '1103语录'], likes: 4560, isPinned: false, status: 'published' },
    { authorId: fans[8].id, content: '给泽子剪了一个永劫无间高能时刻合集！从落地成盒到绝地翻盘，每一刻都是经典。剪了三天三夜，希望大家喜欢~视频链接在评论区！', images: [PH(600, 400, 'Naraka+Clip+1'), PH(600, 400, 'Naraka+Clip+2'), PH(600, 400, 'Naraka+Clip+3')], tagNames: ['名场面', '直播名场面'], likes: 2890, isPinned: false, status: 'published' },
    { authorId: star.id, content: '兄弟们，明天下午两点来个特别直播，带大家打元梦之星！粉丝专场，满人就开车，先到先得！', images: [PH(600, 400, 'YuanMeng+Live')], tagNames: ['官方动态', '直播预告'], likes: 18900, isPinned: false, status: 'published' },
    { authorId: fans[5].id, content: '第一次来社区发帖，作为一个南方人，我是怎么被泽子圈粉的呢？答案就是那句"还有我，我也是"的视频，笑了一晚上，然后就再也没离开过直播间。', images: [], tagNames: ['追星日记', '安利'], likes: 890, isPinned: false, status: 'published' },
    { authorId: fans[10].id, content: '永劫无间排位赛今天打了十把赢了八把！感觉跟着泽子看直播学到了不少操作技巧，特别是空中连招那一套，太帅了。', images: [PH(600, 400, 'Naraka+Rank')], tagNames: ['英雄联盟', '安利'], likes: 567, isPinned: false, status: 'published' },
    { authorId: fans[11].id, content: '新做了一波泽子表情包！"整挺好"系列、"还有我"系列、"瓜皮"系列各六张，需要的老铁评论区扣1，我私发！', images: [PH(600, 400, 'Emoji+1'), PH(600, 400, 'Emoji+2')], tagNames: ['同人创作', '1103语录'], likes: 3210, isPinned: false, status: 'published' },
    { authorId: fans[7].id, content: '请问泽子一般几点开播啊？我刚关注，想看直播但总是错过……有没有大佬告诉一下直播时间表？', images: [], tagNames: ['问答'], likes: 156, isPinned: false, status: 'published' },
    { authorId: assistant.id, content: '这是一篇草稿帖子，还没有发布，正在编辑中...', images: [], tagNames: ['官方动态'], likes: 0, isPinned: false, status: 'draft' },
    { authorId: fans[9].id, content: '这条内容因为包含不适当内容被隐藏了。', images: [], tagNames: [], likes: 12, isPinned: false, status: 'hidden' },
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
        status: p.status,
      },
    });

    if (p.tagNames.length > 0) {
      await prisma.postTag.createMany({
        data: p.tagNames.filter((n) => tags[n]).map((n) => ({ postId: post.id, tagId: tags[n] })),
      });
    }
  }

  // ===== Comments (含嵌套回复) =====
  const allPosts = await prisma.post.findMany({ orderBy: { createdAt: 'asc' }, take: 14 });

  // 帖子1: 直播预告 - 多条评论 + 嵌套回复
  if (allPosts[0]) {
    const cc = await prisma.comment.count({ where: { postId: allPosts[0].id } });
    if (cc === 0) {
      const c1 = await prisma.comment.create({ data: { postId: allPosts[0].id, authorId: fans[1].id, content: '冲冲冲！泽哥必上大师！', likes: 328 } });
      await prisma.comment.create({ data: { postId: allPosts[0].id, authorId: fans[4].id, content: '泽哥稳的，上大师不在话下', likes: 89, parentId: c1.id, replyToName: '东北铁粉' } });
      await prisma.comment.create({ data: { postId: allPosts[0].id, authorId: fans[6].id, content: '大师？直接冲王者吧！', likes: 56, parentId: c1.id, replyToName: '东北铁粉' } });
      await prisma.comment.create({ data: { postId: allPosts[0].id, authorId: assistant.id, content: '直播间已开启预约，点击主页预约按钮不迷路~', likes: 156 } });
      await prisma.comment.create({ data: { postId: allPosts[0].id, authorId: fans[2].id, content: '已预约！今晚准时到', likes: 67 } });
      await prisma.comment.create({ data: { postId: allPosts[0].id, authorId: fans[7].id, content: '新粉第一次看直播，激动！', likes: 23 } });
    }
  }

  // 帖子2: 名场面合集
  if (allPosts[1]) {
    const cc = await prisma.comment.count({ where: { postId: allPosts[1].id } });
    if (cc === 0) {
      await prisma.comment.create({ data: { postId: allPosts[1].id, authorId: fans[2].id, content: '泽子和宇将军那段太经典了', likes: 45 } });
      await prisma.comment.create({ data: { postId: allPosts[1].id, authorId: fans[5].id, content: '"还有我我也是"百看不厌哈哈哈', likes: 112 } });
      await prisma.comment.create({ data: { postId: allPosts[1].id, authorId: fans[8].id, content: '每段都是经典，楼主整理辛苦了！', likes: 78 } });
    }
  }

  // 帖子3: 陈泽杯预告
  if (allPosts[2]) {
    const cc = await prisma.comment.count({ where: { postId: allPosts[2].id } });
    if (cc === 0) {
      await prisma.comment.create({ data: { postId: allPosts[2].id, authorId: fans[6].id, content: '我们五排队已经准备好了，就等报名！', likes: 234 } });
      await prisma.comment.create({ data: { postId: allPosts[2].id, authorId: fans[10].id, content: '奖金超百万？这也太豪了吧', likes: 189 } });
    }
  }

  // 帖子4: 同人绘画
  if (allPosts[3]) {
    const cc = await prisma.comment.count({ where: { postId: allPosts[3].id } });
    if (cc === 0) {
      const c1 = await prisma.comment.create({ data: { postId: allPosts[3].id, authorId: star.id, content: '可以可以，这也太像了，直接拿去当头像了兄弟！', likes: 8900 } });
      await prisma.comment.create({ data: { postId: allPosts[3].id, authorId: fans[3].id, content: '啊啊啊泽子回复我了！！！激动到飞起！', likes: 456, parentId: c1.id, replyToName: '陈泽' } });
      await prisma.comment.create({ data: { postId: allPosts[3].id, authorId: fans[2].id, content: '画得也太好了吧，求教程！', likes: 67 } });
      await prisma.comment.create({ data: { postId: allPosts[3].id, authorId: fans[11].id, content: '可以做成表情包吗？求授权', likes: 34 } });
    }
  }

  // 帖子5: 开黑组队
  if (allPosts[4]) {
    const cc = await prisma.comment.count({ where: { postId: allPosts[4].id } });
    if (cc === 0) {
      await prisma.comment.create({ data: { postId: allPosts[4].id, authorId: fans[6].id, content: '我钻石辅助，加我加我！', likes: 34 } });
      await prisma.comment.create({ data: { postId: allPosts[4].id, authorId: fans[1].id, content: '回旋踢要多练练，先用AI练', likes: 12 } });
    }
  }

  // 帖子6: 东北话教学
  if (allPosts[5]) {
    const cc = await prisma.comment.count({ where: { postId: allPosts[5].id } });
    if (cc === 0) {
      await prisma.comment.create({ data: { postId: allPosts[5].id, authorId: fans[5].id, content: '作为南方人我全学会了哈哈', likes: 89 } });
      await prisma.comment.create({ data: { postId: allPosts[5].id, authorId: fans[7].id, content: '还有"嘎嘎好使"也很经典', likes: 45 } });
      await prisma.comment.create({ data: { postId: allPosts[5].id, authorId: fans[0].id, content: '绥棱人表示这些都是日常用语', likes: 167 } });
    }
  }

  // 帖子8: 元梦之星特别直播
  if (allPosts[7]) {
    const cc = await prisma.comment.count({ where: { postId: allPosts[7].id } });
    if (cc === 0) {
      await prisma.comment.create({ data: { postId: allPosts[7].id, authorId: fans[4].id, content: '泽哥带带我！', likes: 78 } });
      await prisma.comment.create({ data: { postId: allPosts[7].id, authorId: fans[9].id, content: '新人报名！刚下载了元梦之星', likes: 23 } });
    }
  }

  // 帖子12: 问答帖
  if (allPosts[11]) {
    const cc = await prisma.comment.count({ where: { postId: allPosts[11].id } });
    if (cc === 0) {
      await prisma.comment.create({ data: { postId: allPosts[11].id, authorId: fans[0].id, content: '一般晚上8-9点开播，偶尔下午也有，关注社区通知就不会错过', likes: 45 } });
      await prisma.comment.create({ data: { postId: allPosts[11].id, authorId: assistant.id, content: '直播时间一般是每晚8-9点，具体以抖音直播预告为准哦~', likes: 89 } });
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

  // ===== Music Tracks =====
  const musicData = [
    { title: '直播BGM - 热血出征', artist: '陈泽', src: 'https://cos.chenze.com/music/hot-blood.mp3', cover: PH(200, 200, 'BGM+1'), duration: 245, sortOrder: 1 },
    { title: '直播BGM - 轻松时刻', artist: '陈泽', src: 'https://cos.chenze.com/music/chill-time.mp3', cover: PH(200, 200, 'BGM+2'), duration: 198, sortOrder: 2 },
    { title: '陈泽杯主题曲', artist: '陈泽', src: 'https://cos.chenze.com/music/chenze-cup-theme.mp3', cover: PH(200, 200, 'CZCup'), duration: 312, sortOrder: 3 },
    { title: '直播BGM - 峡谷战歌', artist: '陈泽', src: 'https://cos.chenze.com/music/canyon-battle.mp3', cover: PH(200, 200, 'BGM+3'), duration: 267, sortOrder: 4 },
    { title: '直播BGM - 深夜电台', artist: '陈泽', src: 'https://cos.chenze.com/music/late-night.mp3', cover: PH(200, 200, 'BGM+4'), duration: 180, sortOrder: 5 },
    { title: '粉丝应援曲', artist: '1103粉丝团', src: 'https://cos.chenze.com/music/fan-cheer.mp3', cover: PH(200, 200, 'FAN'), duration: 156, sortOrder: 6 },
    { title: '直播BGM - 东北摇', artist: '陈泽', src: 'https://cos.chenze.com/music/dongbei-shake.mp3', cover: PH(200, 200, 'BGM+5'), duration: 210, sortOrder: 7, isActive: false },
  ];

  for (const m of musicData) {
    const existing = await prisma.musicTrack.findFirst({ where: { title: m.title } });
    if (!existing) await prisma.musicTrack.create({ data: m });
  }

  // ===== Media (COS文件管理) =====
  const mediaData = [
    { filename: 'chenze-avatar.jpg', url: PH(200, 200, 'CZ+Avatar'), cosKey: 'avatar/chenze-avatar.jpg', size: 45200, mimeType: 'image/jpeg', width: 200, height: 200, category: 'avatar' },
    { filename: 'post-lol-stream.jpg', url: PH(600, 400, 'LOL+Stream'), cosKey: 'post/lol-stream.jpg', size: 128400, mimeType: 'image/jpeg', width: 600, height: 400, category: 'post' },
    { filename: 'album-live-cover.jpg', url: PH(400, 300, 'Live+Cover'), cosKey: 'album/live-cover.jpg', size: 89600, mimeType: 'image/jpeg', width: 400, height: 300, category: 'album' },
    { filename: 'hero-slide-1.jpg', url: PH(1920, 800, 'Hero+1'), cosKey: 'cover/hero-slide-1.jpg', size: 356800, mimeType: 'image/jpeg', width: 1920, height: 800, category: 'cover' },
    { filename: 'game-lol-cover.jpg', url: PH(400, 540, 'LOL+Cover'), cosKey: 'game/lol-cover.jpg', size: 98700, mimeType: 'image/jpeg', width: 400, height: 540, category: 'game' },
    { filename: 'event-cup-poster.jpg', url: PH(800, 400, 'Cup+Poster'), cosKey: 'event/cup-poster.jpg', size: 245300, mimeType: 'image/jpeg', width: 800, height: 400, category: 'event' },
    { filename: 'fan-art-q.png', url: PH(600, 600, 'Fan+Art'), cosKey: 'post/fan-art-q.png', size: 178900, mimeType: 'image/png', width: 600, height: 600, category: 'post' },
    { filename: 'chenze-banner.jpg', url: PH(1920, 600, 'Banner'), cosKey: 'cover/chenze-banner.jpg', size: 412000, mimeType: 'image/jpeg', width: 1920, height: 600, category: 'cover' },
    { filename: 'bgm-hot-blood.mp3', url: 'https://cos.chenze.com/music/hot-blood.mp3', cosKey: 'music/hot-blood.mp3', size: 4520000, mimeType: 'audio/mpeg', category: 'general' },
    { filename: 'naraka-clip.mp4', url: 'https://cos.chenze.com/video/naraka-clip.mp4', cosKey: 'video/naraka-clip.mp4', size: 15800000, mimeType: 'video/mp4', category: 'general' },
  ];

  for (const m of mediaData) {
    const existing = await prisma.media.findFirst({ where: { cosKey: m.cosKey } });
    if (!existing) await prisma.media.create({ data: m });
  }

  // ===== Banned Words (违禁词) =====
  const bannedWordsData = [
    { word: '赌博', category: 'gambling' },
    { word: '博彩', category: 'gambling' },
    { word: '代充', category: 'ad' },
    { word: '外挂', category: 'ad' },
    { word: '代练', category: 'ad' },
    { word: '色情', category: 'porn' },
    { word: '黄片', category: 'porn' },
    { word: '暴力威胁', category: 'violence' },
    { word: '人肉搜索', category: 'violence' },
    { word: '脑残', category: 'abuse' },
    { word: '智障', category: 'abuse' },
    { word: '去死', category: 'abuse' },
    { word: '反动', category: 'politics' },
    { word: '颠覆', category: 'politics' },
    { word: '加微信', category: 'ad' },
    { word: '免费领取', category: 'ad' },
    { word: '低价代购', category: 'ad' },
    { word: '自定义测试词', category: 'custom', isActive: false },
  ];

  for (const bw of bannedWordsData) {
    const existing = await prisma.bannedWord.findFirst({ where: { word: bw.word } });
    if (!existing) await prisma.bannedWord.create({ data: bw });
  }

  // ===== PostLike (点赞记录) =====
  const publishedPosts = allPosts.filter(p => p.status === 'published');
  const postLikeCount = await prisma.postLike.count();
  if (postLikeCount === 0 && publishedPosts.length > 0) {
    const likesData: { userId: string; postId: string }[] = [];
    // 每个粉丝给前几个帖子点赞
    for (let fi = 0; fi < Math.min(fans.length, 8); fi++) {
      for (let pi = 0; pi < Math.min(publishedPosts.length, 4); pi++) {
        likesData.push({ userId: fans[fi].id, postId: publishedPosts[pi].id });
      }
    }
    // star 和 assistant 也点赞
    if (publishedPosts[3]) likesData.push({ userId: star.id, postId: publishedPosts[3].id });
    if (publishedPosts[1]) likesData.push({ userId: assistant.id, postId: publishedPosts[1].id });

    for (const l of likesData) {
      const existing = await prisma.postLike.findFirst({ where: { userId: l.userId, postId: l.postId } });
      if (!existing) await prisma.postLike.create({ data: l });
    }
  }

  // ===== Bookmark (收藏) =====
  const bookmarkCount = await prisma.bookmark.count();
  if (bookmarkCount === 0 && publishedPosts.length > 0) {
    const bookmarksData: { userId: string; postId: string }[] = [];
    // 粉丝收藏精华帖子
    if (publishedPosts[0]) { bookmarksData.push({ userId: fans[0].id, postId: publishedPosts[0].id }); bookmarksData.push({ userId: fans[1].id, postId: publishedPosts[0].id }); bookmarksData.push({ userId: fans[2].id, postId: publishedPosts[0].id }); }
    if (publishedPosts[2]) { bookmarksData.push({ userId: fans[0].id, postId: publishedPosts[2].id }); bookmarksData.push({ userId: fans[3].id, postId: publishedPosts[2].id }); }
    if (publishedPosts[3]) { bookmarksData.push({ userId: fans[1].id, postId: publishedPosts[3].id }); bookmarksData.push({ userId: fans[2].id, postId: publishedPosts[3].id }); }
    if (publishedPosts[5]) { bookmarksData.push({ userId: fans[5].id, postId: publishedPosts[5].id }); }
    if (publishedPosts[6]) { bookmarksData.push({ userId: fans[8].id, postId: publishedPosts[6].id }); }

    for (const b of bookmarksData) {
      const existing = await prisma.bookmark.findFirst({ where: { userId: b.userId, postId: b.postId } });
      if (!existing) await prisma.bookmark.create({ data: b });
    }
  }

  // ===== PointLog (积分记录) =====
  const pointLogCount = await prisma.pointLog.count();
  if (pointLogCount === 0) {
    const now = new Date();
    const pointLogsData = [
      // fan1 - 高等级用户的丰富积分历史
      { userId: fans[0].id, action: 'daily_login', points: 10, detail: '每日签到', createdAt: new Date(now.getTime() - 86400000 * 1) },
      { userId: fans[0].id, action: 'daily_login', points: 10, detail: '每日签到', createdAt: new Date(now.getTime() - 86400000 * 2) },
      { userId: fans[0].id, action: 'post', points: 20, detail: '发布帖子《经典名场面合集》', createdAt: new Date(now.getTime() - 86400000 * 3) },
      { userId: fans[0].id, action: 'be_liked', points: 5, detail: '帖子被点赞', createdAt: new Date(now.getTime() - 86400000 * 3) },
      { userId: fans[0].id, action: 'comment', points: 5, detail: '发表评论', createdAt: new Date(now.getTime() - 86400000 * 4) },
      { userId: fans[0].id, action: 'event', points: 100, detail: '参加陈泽杯报名', createdAt: new Date(now.getTime() - 86400000 * 10) },
      // fan2
      { userId: fans[1].id, action: 'daily_login', points: 10, detail: '每日签到', createdAt: new Date(now.getTime() - 86400000 * 1) },
      { userId: fans[1].id, action: 'comment', points: 5, detail: '发表评论', createdAt: new Date(now.getTime() - 86400000 * 1) },
      { userId: fans[1].id, action: 'be_liked', points: 5, detail: '评论被点赞', createdAt: new Date(now.getTime() - 86400000 * 2) },
      // fan5 - 中等级用户
      { userId: fans[4].id, action: 'daily_login', points: 10, detail: '每日签到', createdAt: new Date(now.getTime() - 86400000 * 1) },
      { userId: fans[4].id, action: 'post', points: 20, detail: '发布帖子《开黑组队》', createdAt: new Date(now.getTime() - 86400000 * 2) },
      // fan10 - 新用户
      { userId: fans[9].id, action: 'daily_login', points: 10, detail: '首次签到', createdAt: new Date(now.getTime() - 86400000 * 1) },
      // star
      { userId: star.id, action: 'post', points: 20, detail: '发布直播预告', createdAt: new Date(now.getTime() - 86400000 * 1) },
      { userId: star.id, action: 'be_liked', points: 5, detail: '帖子被大量点赞', createdAt: new Date(now.getTime() - 86400000 * 1) },
      // 负数积分示例
      { userId: fans[9].id, action: 'post', points: -10, detail: '违规内容扣分', createdAt: new Date(now.getTime() - 86400000 * 1) },
    ];

    await prisma.pointLog.createMany({ data: pointLogsData });
  }

  // ===== Notification (通知) =====
  const notifCount = await prisma.notification.count();
  if (notifCount === 0) {
    const now = new Date();
    const notifsData = [
      // 评论通知
      { userId: star.id, type: 'comment', title: '新评论', content: '东北铁粉 评论了你的帖子"今晚九点直播英雄联盟"', link: '/community', isRead: false, fromId: fans[1].id, fromName: '东北铁粉', fromAvatar: PH(32, 32, 'F1'), createdAt: new Date(now.getTime() - 3600000) },
      { userId: fans[3].id, type: 'comment', title: '陈泽回复了你', content: '陈泽 回复了你的帖子"花了一周画的陈泽Q版头像"', link: '/community', isRead: true, fromId: star.id, fromName: '陈泽', fromAvatar: PH(32, 32, 'CZ'), createdAt: new Date(now.getTime() - 7200000) },
      // 点赞通知
      { userId: fans[0].id, type: 'like', title: '帖子被点赞', content: 'LOL小迷妹 赞了你的帖子', link: '/community', isRead: false, fromId: fans[2].id, fromName: 'LOL小迷妹', fromAvatar: PH(32, 32, 'F2'), createdAt: new Date(now.getTime() - 1800000) },
      { userId: fans[3].id, type: 'like', title: '帖子被点赞', content: '峡谷暴走族 赞了你的帖子', link: '/community', isRead: false, fromId: fans[6].id, fromName: '峡谷暴走族', fromAvatar: PH(32, 32, 'F7'), createdAt: new Date(now.getTime() - 5400000) },
      // 置顶通知
      { userId: star.id, type: 'pin', title: '帖子被置顶', content: '你的帖子"今晚九点直播英雄联盟"已被管理员置顶', link: '/community', isRead: true, createdAt: new Date(now.getTime() - 86400000) },
      // 系统通知
      { userId: fans[0].id, type: 'system', title: '欢迎来到1103社区', content: '恭喜你成功注册1103社区！快去发布你的第一条动态吧~', isRead: true, createdAt: new Date(now.getTime() - 86400000 * 30) },
      { userId: fans[1].id, type: 'system', title: '等级提升', content: '恭喜你升级到 Lv.9 超级粉！继续互动可以解锁更多特权哦~', isRead: true, createdAt: new Date(now.getTime() - 86400000 * 5) },
      { userId: fans[9].id, type: 'system', title: '欢迎来到1103社区', content: '恭喜你成功注册1103社区！快去发布你的第一条动态吧~', isRead: false, createdAt: new Date(now.getTime() - 86400000) },
      // 给多个用户发系统通知
      { userId: fans[2].id, type: 'system', title: '陈泽杯报名开启', content: '第二届英雄联盟陈泽杯报名已开启，快去查看详情吧！', link: '/events', isRead: false, createdAt: new Date(now.getTime() - 3600000 * 2) },
      { userId: fans[4].id, type: 'system', title: '陈泽杯报名开启', content: '第二届英雄联盟陈泽杯报名已开启，快去查看详情吧！', link: '/events', isRead: false, createdAt: new Date(now.getTime() - 3600000 * 2) },
    ];

    await prisma.notification.createMany({ data: notifsData });
  }

  // ===== Feedback (反馈建议) =====
  const feedbackCount = await prisma.feedback.count();
  if (feedbackCount === 0) {
    const feedbacksData = [
      { type: 'suggestion', content: '建议增加暗黑模式，晚上看直播回放的时候太亮了', contact: 'fan1@test.com', status: 'resolved', reply: '感谢建议！暗黑模式已在开发计划中，预计下个版本上线。', userId: fans[0].id },
      { type: 'suggestion', content: '希望社区能加一个私信功能，方便粉丝之间交流', contact: null, status: 'read', reply: null, userId: fans[2].id },
      { type: 'bug', content: '在手机上打开相册页面时，图片加载很慢，有时候会卡住', contact: 'wechat: fan5_test', status: 'pending', reply: null, userId: fans[4].id },
      { type: 'bug', content: '发帖时上传多张图片偶尔会失败，需要重新选择', contact: null, status: 'resolved', reply: '已修复上传并发限制问题，请更新后重试。', userId: fans[8].id },
      { type: 'other', content: '想问一下社区后续会不会出周边商城？超想买泽子的周边！', contact: 'fan6@qq.com', status: 'read', reply: null, userId: fans[5].id },
      { type: 'suggestion', content: '能不能加个粉丝排行榜，看看谁是最活跃的铁粉', contact: null, status: 'pending', reply: null, userId: fans[6].id },
      { type: 'bug', content: '点赞之后数量没有立即更新，需要刷新页面', contact: null, status: 'pending', reply: null, userId: fans[7].id },
      { type: 'suggestion', content: '建议在个人主页增加粉丝勋章展示区域', contact: null, status: 'pending', reply: null, userId: null },
    ];

    for (const f of feedbacksData) {
      await prisma.feedback.create({ data: f });
    }
  }

  // ===== Report (举报) =====
  const reportCount = await prisma.report.count();
  if (reportCount === 0 && publishedPosts.length > 0) {
    const reportsData = [
      { reporterId: fans[0].id, targetType: 'post', targetId: allPosts.find(p => p.status === 'hidden')?.id || publishedPosts[0].id, reason: 'inappropriate', description: '包含不适当内容', status: 'resolved', adminNote: '已隐藏该帖子' },
      { reporterId: fans[2].id, targetType: 'comment', targetId: 'fake-comment-id-for-test', reason: 'spam', description: '评论区疑似广告', status: 'pending', adminNote: null },
      { reporterId: fans[5].id, targetType: 'user', targetId: fans[9].id, reason: 'abuse', description: '该用户多次发布违规内容', status: 'reviewed', adminNote: '已警告该用户' },
      { reporterId: fans[7].id, targetType: 'post', targetId: publishedPosts[0].id, reason: 'other', description: '误举报，抱歉', status: 'dismissed', adminNote: '误报，已驳回' },
    ];

    for (const r of reportsData) {
      await prisma.report.create({ data: r });
    }
  }

  // ===== 更多 Announcements (扩充公告类型) =====
  const moreAnnouncementsData = [
    { title: '社区规则更新', content: '为了维护良好的社区氛围，我们更新了社区规则：\n\n1. 禁止发布广告\n2. 禁止人身攻击\n3. 禁止搬运他人原创内容\n\n违规者将视情节严重程度进行警告或封禁处理。', type: 'warning', sortOrder: 3 },
    { title: '系统维护通知', content: '2026年4月20日凌晨2:00-6:00将进行系统维护升级，届时社区将暂时无法访问。\n\n维护完成后将带来全新的个人主页和消息功能，敬请期待！', type: 'update', startAt: new Date('2026-04-20T02:00'), endAt: new Date('2026-04-20T06:00'), sortOrder: 4 },
  ];

  for (const a of moreAnnouncementsData) {
    const existing = await prisma.announcement.findFirst({ where: { title: a.title } });
    if (!existing) await prisma.announcement.create({ data: a });
  }

  // ===== 更多 Events (扩充活动状态) =====
  const moreEventsData = [
    { title: '1103社区上线庆典', description: '社区正式上线！在线直播庆祝，抽奖送周边。', cover: PH(800, 400, 'Launch+Party'), startTime: new Date('2026-03-01T20:00'), endTime: new Date('2026-03-01T23:00'), location: '抖音直播间', status: 'ended', participants: 320000 },
    { title: '陈泽x永劫无间联动直播', description: '与永劫无间官方联动特别直播，解锁限定皮肤。', cover: PH(800, 400, 'Naraka+Collab'), startTime: new Date('2026-04-16T20:00'), endTime: new Date('2026-04-16T23:00'), location: '抖音直播间', status: 'ongoing', participants: 480000 },
  ];

  for (const e of moreEventsData) {
    const existing = await prisma.event.findFirst({ where: { title: e.title } });
    if (!existing) await prisma.event.create({ data: e });
  }

  // ===== 更多 SiteConfig (stats 分组) =====
  const statsConfigs = [
    { key: 'stats_total_fans', value: '22096000', group: 'stats', label: '总粉丝数' },
    { key: 'stats_today_posts', value: '3680', group: 'stats', label: '今日发帖' },
    { key: 'stats_total_interactions', value: '65892000', group: 'stats', label: '总互动数' },
    { key: 'stats_online_now', value: '12800', group: 'stats', label: '当前在线' },
  ];

  for (const c of statsConfigs) {
    await prisma.siteConfig.upsert({ where: { key: c.key }, update: { value: c.value }, create: c });
  }

  // ============================================================
  // ===== TCG 卡牌对战系统（独立运营后台 /tcg-admin） =====
  // 首发 40 张卡 + 2 个运营账号 + 3 个预设卡组
  // ============================================================
  const tcgPwd = await bcrypt.hash('tcg123456', 12);

  await prisma.tcgOperator.upsert({
    where: { email: 'tcg-super@chenze.com' },
    update: {},
    create: { email: 'tcg-super@chenze.com', password: tcgPwd, name: 'TCG 超管', role: 'tcg_super', avatar: PH(48, 48, 'TCG') },
  });
  await prisma.tcgOperator.upsert({
    where: { email: 'tcg-ops@chenze.com' },
    update: {},
    create: { email: 'tcg-ops@chenze.com', password: tcgPwd, name: 'TCG 运营', role: 'tcg_ops', avatar: PH(48, 48, 'OPS') },
  });

  // --- 40 张卡池（与 src/data/cardPresets.ts 对齐） ---
  const TCG_CARDS = [
    // 角色 Character × 14
    { id: 'C01', name: '搭档小助理', type: 'character', rarity: 'N', cost: 1, attack: 1, health: 2, description: '【登场】抽 1 张牌', flavor: '哥，你说的都安排好了', imagePath: '/cards/C01 · 搭档小助理.png', keywords: '["battlecry"]', sortOrder: 1 },
    { id: 'C02', name: '路人粉', type: 'character', rarity: 'N', cost: 2, attack: 2, health: 3, description: '普通粉丝，无特殊效果', flavor: '哎这谁啊，挺有意思', imagePath: '/cards/C02 · 路人粉.png', sortOrder: 2 },
    { id: 'C03', name: '铁粉', type: 'character', rarity: 'N', cost: 3, attack: 2, health: 4, description: '【挡枪】', flavor: '老大，我已经准备就绪', imagePath: '/cards/C03 · 铁粉.png', keywords: '["taunt"]', sortOrder: 3 },
    { id: 'C04', name: '真爱粉', type: 'character', rarity: 'N', cost: 2, attack: 2, health: 3, description: '【登场】己方玩家回 2 流量', flavor: '他今天又营业了，我可以', imagePath: '/cards/C04 · 真爱粉.png', keywords: '["battlecry"]', sortOrder: 4 },
    { id: 'C05', name: '4哥', type: 'character', rarity: 'SR', cost: 1, attack: 5, health: 2, description: '【紧急通告】登场当回合即可攻击', flavor: '泽，你放心', imagePath: '/cards/C05 · 4哥.jpg', keywords: '["charge"]', sortOrder: 5 },
    { id: 'C06', name: '黑粉头子', type: 'character', rarity: 'R', cost: 4, attack: 3, health: 5, description: '【挡枪】；【退场】对敌方玩家造成 2 伤害', flavor: '典，太典了', imagePath: '/cards/C06 · 黑粉头子.png', keywords: '["taunt","deathrattle"]', sortOrder: 6 },
    { id: 'C07', name: '营销号', type: 'character', rarity: 'R', cost: 3, attack: 2, health: 3, description: '【登场】挖掘 1 张消耗牌加入手牌', flavor: '震惊！陈泽竟然...', imagePath: '/cards/C07 · 营销号.png', keywords: '["battlecry","discover"]', sortOrder: 7 },
    { id: 'C08', name: '卡特', type: 'character', rarity: 'R', cost: 5, attack: 4, health: 5, description: '【紧急通告】登场当回合即可攻击', flavor: '你记住，规矩是死的，卡特也是', imagePath: '/cards/C08 · 卡特.jpg', keywords: '["charge"]', sortOrder: 8 },
    { id: 'C09', name: '烟波', type: 'character', rarity: 'R', cost: 4, attack: 3, health: 4, description: '【双开】每回合可攻击 2 次', flavor: '—', imagePath: '/cards/C09 · 烟波.png', keywords: '["windfury"]', sortOrder: 9 },
    { id: 'C10', name: '李哥', type: 'character', rarity: 'R', cost: 4, attack: 2, health: 6, description: '【挡枪】；【登场】摧毁敌方 1 张事件牌', flavor: '我方已保留一切追诉权利', imagePath: '/cards/C10 · 李哥.png', keywords: '["taunt","battlecry"]', sortOrder: 10 },
    { id: 'C11', name: '荣一鸣', type: 'character', rarity: 'SR', cost: 6, attack: 6, health: 4, description: '【试水】【封杀】对角色造成伤害即必杀', flavor: '你会吹葫芦丝嘛？', imagePath: '/cards/C11 · 荣一鸣.jpg', keywords: '["rush","poisonous"]', sortOrder: 11 },
    { id: 'C12', name: '刘军', type: 'character', rarity: 'SR', cost: 5, attack: 4, health: 6, description: '【登场】己方所有角色 +1/+1', flavor: '丁，小别胜是谁啊？', imagePath: '/cards/C12 · 刘军.jpg', keywords: '["battlecry"]', sortOrder: 12 },
    { id: 'C13', name: '黑白', type: 'character', rarity: 'SR', cost: 7, attack: 5, health: 7, description: '【挡枪】【粉丝盾】首次受到伤害免除', flavor: '白门在打在', imagePath: '/cards/C13 · 黑白.jpg', keywords: '["taunt","divineShield"]', sortOrder: 13 },
    { id: 'C14', name: '主播·陈泽', type: 'character', rarity: 'SSR', cost: 9, attack: 8, health: 9, description: '【登场】对方所有角色 -1/-0；联动：与「典中典」同场 ⚔ +3', flavor: '家人们谁懂啊，这波操作直接炸裂', imagePath: '/cards/C14 主播·陈泽.jpeg', keywords: '["battlecry","combo"]', sortOrder: 14 },

    // 道具 Item × 2（即时消耗品）
    { id: 'I01', name: '酸马奶', type: 'item', subtype: 'instant', rarity: 'N', cost: 1, description: '【即时】己方玩家回 3 流量', flavor: '来一口', sortOrder: 15 },
    { id: 'I02', name: '黑蒜', type: 'item', subtype: 'instant', rarity: 'N', cost: 2, description: '【即时】抽 1 张牌', flavor: '来一口', sortOrder: 16 },

    // 装备 Equipment × 6（武器 / 防具）
    { id: 'I03', name: '应援灯牌', type: 'equipment', subtype: 'armor', rarity: 'N', cost: 2, attack: 1, health: 3, description: '【装备时】己方玩家流量 +3（防具：承担伤害）', flavor: '陈泽，宇宙最帅', imagePath: '/cards/I03 · 应援灯牌.png', keywords: '["onEquip"]', sortOrder: 17 },
    { id: 'I04', name: '金色话筒', type: 'equipment', subtype: 'weapon', rarity: 'R', cost: 2, attack: 3, health: 2, description: '每次攻击后抽 1 张牌', flavor: '家人们，咱们开播了', imagePath: '/cards/I04 · 金色话筒.png', sortOrder: 18 },
    { id: 'I05', name: '老铁们下播', type: 'equipment', subtype: 'weapon', rarity: 'R', cost: 3, attack: 4, health: 2, description: '【装备时】令敌方 1 名角色失去【潜水】', flavor: '今天就到这儿，咱们明晚见', imagePath: '/cards/I05 · 老铁们下播.png', keywords: '["onEquip"]', sortOrder: 19 },
    { id: 'I06', name: '流量加持礼包', type: 'equipment', subtype: 'weapon', rarity: 'R', cost: 4, attack: 4, health: 3, description: '【装备时】己方所有角色本回合 ⚔ +1', flavor: '推流上 Push 拉满', imagePath: '/cards/I06 · 流量加持礼包.png', keywords: '["onEquip"]', sortOrder: 20 },
    { id: 'I07', name: '直播打赏王座', type: 'equipment', subtype: 'weapon', rarity: 'SR', cost: 6, attack: 5, health: 4, description: '每次攻击后己方玩家回 2 流量', flavor: '今晚的榜一大哥是...', imagePath: '/cards/I07 · 直播打赏王座.png', keywords: '["lifesteal"]', sortOrder: 21 },
    { id: 'I08', name: '黑料爆料单', type: 'equipment', subtype: 'weapon', rarity: 'SSR', cost: 7, attack: 6, health: 2, description: '【装备时】摧毁对方 1 张事件；本回合消耗牌 -1 费', flavor: '瓜保熟，爆裂新鲜', imagePath: '/cards/I08 · 黑料爆料单 ⭐.png', keywords: '["onEquip"]', sortOrder: 22 },

    // 消耗 Effect × 12
    { id: 'E01', name: '上热搜', type: 'effect', rarity: 'N', cost: 2, description: '对目标造成 3 点流量伤害', flavor: '# 陈泽 # 又双叒上榜了', sortOrder: 23 },
    { id: 'E02', name: '粉丝应援', type: 'effect', rarity: 'N', cost: 1, description: '己方玩家回 4 流量', flavor: '陈泽我们永远爱你', sortOrder: 24 },
    { id: 'E03', name: '流量密码', type: 'effect', rarity: 'N', cost: 2, description: '抽 2 张牌', flavor: '这视频稳了，信我', sortOrder: 25 },
    { id: 'E04', name: '塑料兄弟情', type: 'effect', rarity: 'N', cost: 1, description: '沉默目标角色（清除所有技能）', flavor: '哥，你先上', sortOrder: 26 },
    { id: 'E05', name: '下次一定', type: 'effect', rarity: 'N', cost: 1, description: '抽 1 张牌（后手玩家开局自动获得）', flavor: '下次一定，下次一定', sortOrder: 27 },
    { id: 'E06', name: '全网热议', type: 'effect', rarity: 'R', cost: 4, description: '对所有敌方角色造成 2 伤害（全场 AOE）', flavor: '建议冲上热搜！', sortOrder: 28 },
    { id: 'E07', name: '塌房', type: 'effect', rarity: 'R', cost: 3, description: '将对方 1 名角色变为 1/1 并清空技能', flavor: '没想到吧，他居然...', sortOrder: 29 },
    { id: 'E08', name: '反黑作战', type: 'effect', rarity: 'R', cost: 3, description: '摧毁敌方装备；本回合己方受到的伤害 -1', flavor: '举报三连，走你！', sortOrder: 30 },
    { id: 'E09', name: '替身艺人', type: 'effect', rarity: 'R', cost: 4, description: '复制己方 1 名角色（变为 1/1）', flavor: '他走了，他没走，他又走了', sortOrder: 31 },
    { id: 'E10', name: 'OK了老铁', type: 'effect', rarity: 'SR', cost: 5, description: '对目标造成 5 伤害；场上有陈泽时 +3', flavor: 'OK 了老铁，这波稳了', sortOrder: 32 },
    { id: 'E11', name: '百万赞名场面', type: 'effect', rarity: 'SR', cost: 6, description: '己方所有角色 ⚔+2 / ❤+2（永久）', flavor: '一键三连，感谢支持', sortOrder: 33 },
    { id: 'E12', name: '究极无敌人气卡', type: 'effect', rarity: 'SSR', cost: 8, description: '抽 3 张；本回合所有手牌 -2 费；回合末己方玩家回 5 流量', flavor: '究极无敌，全场沸腾', sortOrder: 34 },

    // 事件 Event × 6
    { id: 'V01', name: '辣椒水', type: 'event', rarity: 'N', cost: 2, description: '【场地·⏳3】倒计时归零时对敌方玩家造成 3 伤害', flavor: '辣的是嘴，爆的是热搜', sortOrder: 35 },
    { id: 'V02', name: '路透流出', type: 'event', rarity: 'N', cost: 1, description: '【暗箱】对方召唤角色时，该角色本回合不能攻击', flavor: '嘘，先别说出去', keywords: '["secret"]', sortOrder: 36 },
    { id: 'V03', name: '直播预告', type: 'event', rarity: 'R', cost: 3, description: '【场地·⏳2】倒计时归零时己方抽 1 张牌；期间己方装备耐久 +2', flavor: '明晚 8 点，家人们锁定直播间', sortOrder: 37 },
    { id: 'V04', name: '塑料奥秘', type: 'event', rarity: 'R', cost: 2, description: '【暗箱】对方召唤 ⚔≥5 的角色时将其沉默', flavor: '我和他不熟。', keywords: '["secret"]', sortOrder: 38 },
    { id: 'V05', name: '官号转发', type: 'event', rarity: 'SR', cost: 5, description: '【场地·⏳3】倒计时归零：己方角色 ⚔+2（永久）+ 玩家回 5 流量', flavor: '@陈泽传媒 转发并评论', sortOrder: 39 },
    { id: 'V06', name: '危机公关', type: 'event', rarity: 'SSR', cost: 5, description: '【暗箱】己方玩家首次受到 ≥5 伤害时改为 1，并抽 2 张牌', flavor: '回应来得又稳又狠', keywords: '["secret"]', sortOrder: 40 },
  ] as const;

  // 从硬编码 ALL_CARDS 派生 effectHooks / keywords / synergies（单一真相）
  // 注意：update 分支也会刷新这三个字段，确保每次 seed 都与代码对齐
  //       → 若运营已在后台改过卡技能，重跑 seed 会覆盖（目前仍处开发期，可接受）
  const engineMap = new Map<string, (typeof ALL_CARDS)[number]>();
  for (const c of ALL_CARDS) engineMap.set(c.id, c);

  for (const c of TCG_CARDS) {
    const engineDef = engineMap.get(c.id);
    const effectsJson = JSON.stringify(engineDef?.effects ?? []);
    const keywordsJson = JSON.stringify(engineDef?.keywords ?? []);
    const synergiesJson = JSON.stringify(engineDef?.synergies ?? []);

    await prisma.tcgCard.upsert({
      where: { id: c.id },
      // 刷新运行时三件套，确保"卡池清单 == 硬编码 == DB"三者一致
      update: {
        effectHooks: effectsJson,
        keywords: keywordsJson,
        synergies: synergiesJson,
      },
      create: {
        id: c.id,
        name: c.name,
        type: c.type,
        subtype: 'subtype' in c ? c.subtype : null,
        rarity: c.rarity,
        cost: c.cost ?? 0,
        attack: 'attack' in c ? c.attack : null,
        health: 'health' in c ? c.health : null,
        description: c.description,
        flavor: c.flavor ?? null,
        imagePath: 'imagePath' in c ? c.imagePath : null,
        keywords: keywordsJson,
        effectHooks: effectsJson,
        synergies: synergiesJson,
        status: 'active',
        sortOrder: c.sortOrder,
      },
    });
  }

  // --- 3 套官方预设卡组（起步卡组） ---
  const deckPresets = [
    {
      name: '铁粉嘲讽（防御型）',
      description: '大量【挡枪】+【退场】反伤，稳健推进。适合新手上手。',
      archetype: 'control',
      cardIds: JSON.stringify([
        { id: 'C03', count: 2 }, { id: 'C04', count: 2 }, { id: 'C06', count: 2 },
        { id: 'C10', count: 2 }, { id: 'C13', count: 1 }, { id: 'C14', count: 1 },
        { id: 'E02', count: 2 }, { id: 'E04', count: 2 }, { id: 'E08', count: 2 },
        { id: 'V04', count: 2 }, { id: 'V06', count: 1 }, { id: 'I03', count: 2 },
        { id: 'I01', count: 2 },
      ]),
      isStarter: true, sortOrder: 1,
    },
    {
      name: '连击流量（快攻型）',
      description: '低费高攻 + 冲锋拉节奏，快速打脸。',
      archetype: 'aggro',
      cardIds: JSON.stringify([
        { id: 'C01', count: 2 }, { id: 'C02', count: 2 }, { id: 'C05', count: 2 },
        { id: 'C08', count: 2 }, { id: 'C09', count: 2 }, { id: 'C11', count: 1 },
        { id: 'E01', count: 2 }, { id: 'E03', count: 2 }, { id: 'E10', count: 1 },
        { id: 'I02', count: 2 }, { id: 'I04', count: 2 }, { id: 'I06', count: 2 },
        { id: 'V01', count: 1 }, { id: 'V02', count: 2 },
      ]),
      isStarter: true, sortOrder: 2,
    },
    {
      name: '事件发酵（控制型）',
      description: '铺场事件 + AOE 清场，后期一波带走。',
      archetype: 'combo',
      cardIds: JSON.stringify([
        { id: 'C07', count: 2 }, { id: 'C10', count: 2 }, { id: 'C12', count: 1 },
        { id: 'C14', count: 1 }, { id: 'E03', count: 2 }, { id: 'E06', count: 2 },
        { id: 'E07', count: 2 }, { id: 'E11', count: 1 }, { id: 'E12', count: 1 },
        { id: 'V01', count: 2 }, { id: 'V03', count: 2 }, { id: 'V05', count: 2 },
        { id: 'V06', count: 1 }, { id: 'I08', count: 1 }, { id: 'I07', count: 1 },
      ]),
      isStarter: true, sortOrder: 3,
    },
  ];

  for (const d of deckPresets) {
    const existing = await prisma.tcgDeckPreset.findFirst({ where: { name: d.name } });
    if (!existing) await prisma.tcgDeckPreset.create({ data: d });
  }

  console.log('✅ Seed completed!');
  console.log('');
  console.log('   管理后台: admin@chenze.com / admin123');
  console.log('   编辑账号: editor@chenze.com / admin123');
  console.log('   社区管理: mod@chenze.com / admin123');
  console.log('');
  console.log('   前台用户: fan1@test.com ~ fan12@test.com / fan12345');
  console.log('   明星用户: chenze@chenze.com / fan12345');
  console.log('   助理用户: assistant@chenze.com / fan12345');
  console.log('');
  console.log('   🎴 TCG 后台: tcg-super@chenze.com / tcg123456 (超管)');
  console.log('   🎴 TCG 后台: tcg-ops@chenze.com / tcg123456 (运营)');
  console.log(`   🎴 TCG 卡池: ${TCG_CARDS.length} 张 · 预设卡组: ${deckPresets.length} 套`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
