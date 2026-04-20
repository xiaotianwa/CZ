/**
 * seed-memes.ts — 为"梗百科"注入模拟数据
 *
 * 使用：
 *   npx tsx scripts/seed-memes.ts
 *
 * 特性：
 *   - 可重复执行：按 title 查找，已存在则 update，不存在则 create（upsert 语义）
 *   - 不会删除其它已有梗
 *   - 只修改 Meme 表，不影响其他表
 */

import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbUrl =
  process.env.DATABASE_URL || `file:${path.join(__dirname, '..', 'prisma', 'dev.db')}`;
const adapter = new PrismaLibSql({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

interface MemeDraft {
  title: string;
  origin: string;
  description: string;
  example: string | null;
  image: string | null;
  tags: string[];
  popularity: number;
}

const MEMES: MemeDraft[] = [
  {
    title: '1103',
    origin: '11 月 3 日 · 陈泽的生日，也是社区的专属纪念日',
    description:
      '「1103」是陈泽生日的数字代号，也是粉丝社区名字的由来。每年这天，铁粉会发起线上生贺、弹幕刷屏、二创投稿等活动。三个数字本身就是社区里的应援符号。',
    example: '「1103 泽日快乐！我们一起奔赴下一个 1103。」',
    image: null,
    tags: ['纪念日', '应援', '粉丝文化'],
    popularity: 99,
  },
  {
    title: '下播了',
    origin: '陈泽每次直播结束时的标志性告别',
    description:
      '陈泽收尾时用慵懒语气说「下播了」，已经成为铁粉最不舍的瞬间。现在粉丝也常用这个词调侃一切「结束」的场景 —— 写完作业、跑完步、一天忙完……',
    example: '「论文写完了吗？」「下播了。」',
    image: null,
    tags: ['直播', '口头禅', '名场面'],
    popularity: 96,
  },
  {
    title: '陈泽传媒',
    origin: '粉丝对陈泽直播团队运营水准的戏称',
    description:
      '直播节奏规整、企划严密、周边同步，粉丝调侃说：这哪里是一个人，这是「陈泽传媒」。现在该词被广泛用于形容陈泽相关的商业化操作，有夸赞也有善意吐槽。',
    example: '「又开播啦？陈泽传媒今日节目预告走起！」',
    image: null,
    tags: ['粉丝文化', '吐槽'],
    popularity: 88,
  },
  {
    title: '四个字，不好说',
    origin: '陈泽回应敏感话题时的万能回答',
    description:
      '每当粉丝问到不便直接作答的话题，陈泽会笑着说「四个字 —— 不好说」。这个句式既化解尴尬又卖萌，被粉丝奉为"泽式太极"，迅速出圈。',
    example: '「你觉得新出的 XX 怎么样？」「四个字，不好说。」',
    image: null,
    tags: ['口头禅', '直播', '名场面'],
    popularity: 92,
  },
  {
    title: '老铁们',
    origin: '陈泽对直播间观众的亲切称呼',
    description:
      '每次开播「欢迎老铁们进直播间」、下播「老铁们下播啦」已是固定仪式。「老铁」在陈泽语境里不是礼貌用词，而是确实当作兄弟姐妹在聊天。',
    example: '「老铁们今天的饭点到啦！」',
    image: null,
    tags: ['直播', '称呼', '口头禅'],
    popularity: 90,
  },
  {
    title: '一键三连',
    origin: 'B 站经典「点赞/投币/关注」召唤术',
    description:
      '陈泽把它玩出了自己的节奏：高能操作后必喊「老铁们来波一键三连」，弹幕就整齐刷屏。是直播间互动气氛最高的瞬间之一。',
    example: '「精彩操作来了，来波一键三连！」',
    image: null,
    tags: ['互动', '直播'],
    popularity: 78,
  },
  {
    title: '名场面',
    origin: '粉丝对陈泽经典直播片段的统称',
    description:
      '任何被粉丝反复剪辑、转发的高光或搞笑时刻都被归类为「名场面」。社区内甚至按时间轴维护了一份「1103 名场面编年史」供新粉考古。',
    example: '「这必须收录进 1103 名场面合集！」',
    image: null,
    tags: ['直播', '二创', '名场面'],
    popularity: 86,
  },
  {
    title: '粉丝剪辑',
    origin: '粉丝自发剪辑直播精彩片段',
    description:
      '陈泽曾公开鼓励二创，只要「别带黑立场」都欢迎。由此诞生了大量高质量混剪作品，形成独特的 1103 二创文化，是新粉入坑的重要入口。',
    example: '「B 站 @XX 的粉丝剪辑哭死我。」',
    image: null,
    tags: ['二创', '粉丝文化'],
    popularity: 74,
  },
  {
    title: '泽哥冲冲冲',
    origin: '直播间弹幕专属应援口号',
    description:
      '当陈泽面对挑战或高能时刻，弹幕会集体刷「泽哥冲冲冲」。在漂浮的粉色弹幕海里，这 5 个字是信仰充值的标志。',
    example: '「泽哥冲冲冲！这把一定赢！」',
    image: null,
    tags: ['应援', '弹幕'],
    popularity: 82,
  },
  {
    title: '真爱粉 / 铁粉 / 路人粉',
    origin: '陈泽社区的粉丝身份分级',
    description:
      '按对陈泽的关注深度划分：刚入坑的「路人粉」、长期关注的「铁粉」、一切应援必参加的「真爱粉」。三个层级也对应了 TCG 卡池中 C02 / C03 / C04 三张卡牌，身份 + 玩法一体化。',
    example: '「我已经从路人粉升级成铁粉啦！」',
    image: null,
    tags: ['粉丝文化', '卡牌'],
    popularity: 83,
  },
  {
    title: '营销号',
    origin: '粉丝对消费陈泽热度博眼球账号的统称',
    description:
      '每当有断章取义的营销号稿件流出，粉丝第一时间抱团辟谣。营销号卡牌也被做成了 TCG 里的一张负面场地卡，打出来会干扰双方节奏，谁抽到谁头大。',
    example: '「这种营销号你也信？」',
    image: null,
    tags: ['吐槽', '粉丝文化'],
    popularity: 66,
  },
  {
    title: '黑粉头子',
    origin: '粉丝互相调侃的自嘲式称呼',
    description:
      '泛指"表面吐槽其实爱得深沉"的那一类粉丝。社区里谁吐槽最多，谁就是当仁不让的黑粉头子。是粉圈里最温柔的自嘲。',
    example: '「我就是黑粉头子，哼！（说完去下单新周边）」',
    image: null,
    tags: ['粉丝文化', '吐槽', '卡牌'],
    popularity: 64,
  },
  {
    title: '破防了',
    origin: '被陈泽或粉丝社区戳中泪点时的弹幕反应',
    description:
      '陈泽一讲真心话、粉丝剪辑一放 BGM，弹幕就整屏「破防了」。是浓度最高的情感梗，出现频率与 yyds 并列。',
    example: '「这段话真的破防了，直接 emo。」',
    image: null,
    tags: ['情绪', '弹幕'],
    popularity: 76,
  },
  {
    title: '陈泽 yyds',
    origin: '泛网络语用法 · 粉丝日常',
    description:
      '「永远滴神」的拼音缩写，被陈泽粉丝用来夸赞高光操作、经典名场面或长情人品。社区内简称「泽 yyds」，是常年霸榜的高频好评。',
    example: '「这波 solo 陈泽 yyds！」',
    image: null,
    tags: ['夸赞', '弹幕'],
    popularity: 70,
  },
  {
    title: '流量密码',
    origin: '粉丝对部分「蹭热度」行为的调侃',
    description:
      '指为了蹭陈泽的热度而刻意设置的话题或标题，带有轻度讽刺。社区内用这个词来识别「真诚创作 vs 刻意蹭流」的分水岭。',
    example: '「又一个蹭泽哥的流量密码。」',
    image: null,
    tags: ['吐槽', '粉丝文化'],
    popularity: 58,
  },
];

async function main() {
  console.log('🌱 Seeding memes...');
  let created = 0;
  let updated = 0;

  for (let i = 0; i < MEMES.length; i++) {
    const m = MEMES[i];
    const existing = await prisma.meme.findFirst({ where: { title: m.title } });
    const data = {
      title: m.title,
      origin: m.origin,
      description: m.description,
      example: m.example,
      image: m.image,
      tags: JSON.stringify(m.tags),
      popularity: m.popularity,
      sortOrder: i,
      isActive: true,
    };
    if (existing) {
      await prisma.meme.update({ where: { id: existing.id }, data });
      updated++;
      console.log(`  ↻ 更新：${m.title}`);
    } else {
      await prisma.meme.create({ data });
      created++;
      console.log(`  + 创建：${m.title}`);
    }
  }

  console.log(`\n✅ 完成：新增 ${created} 条，更新 ${updated} 条（共 ${MEMES.length}）`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ seed-memes 失败：', e);
    await prisma.$disconnect();
    process.exit(1);
  });
