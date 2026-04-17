// 首发 40 张卡牌预设（对应「卡池清单.md」）
// 制作器可通过下拉选择一键加载数据与图片

import type { CardRarity, CardType, CardSubtype } from '@/components/game/CardFrame';

export interface CardPreset {
  id: string;               // 编号如 C14 / I08
  name: string;
  type: CardType;
  /** 子分类：道具 instant/delayed；装备 weapon/armor */
  subtype?: CardSubtype;
  rarity: CardRarity;
  cost?: number;
  attack?: number;
  health?: number;
  description?: string;
  flavor?: string;
  /** 图片地址：
   *  - 数据定义里用本地路径 `/cards/xxx.png`（供开发环境 / 兜底）
   *  - 构建 / 运行时若环境变量 `NEXT_PUBLIC_CARDS_CDN` 存在，
   *    会自动替换为 `{CDN}/cards/xxx.png?imageMogr2/format/webp/quality/85/thumbnail/800x`
   *    走腾讯云 COS 图片处理动态压缩，首屏体积 60MB → ~3MB
   */
  imagePath?: string;
}

const _PRESETS: CardPreset[] = [
  // ========== 🎤 角色 Character × 14 ==========
  {
    id: 'C01', name: '搭档小助理', type: 'character', rarity: 'N',
    cost: 1, attack: 1, health: 2,
    description: '【登场】抽 1 张牌',
    flavor: '哥，你说的都安排好了',
    imagePath: '/cards/C01 · 搭档小助理.png',
  },
  {
    id: 'C02', name: '路人粉', type: 'character', rarity: 'N',
    cost: 2, attack: 2, health: 3,
    description: '普通粉丝，无特殊效果',
    flavor: '哎这谁啊，挺有意思',
    imagePath: '/cards/C02 · 路人粉.png',
  },
  {
    id: 'C03', name: '铁粉', type: 'character', rarity: 'N',
    cost: 3, attack: 2, health: 4,
    description: '【挡枪】',
    flavor: '老大，我已经准备就绪',
    imagePath: '/cards/C03 · 铁粉.png',
  },
  {
    id: 'C04', name: '真爱粉', type: 'character', rarity: 'N',
    cost: 2, attack: 2, health: 3,
    description: '【登场】己方玩家回 2 流量',
    flavor: '他今天又营业了，我可以',
    imagePath: '/cards/C04 · 真爱粉.png',
  },
  {
    id: 'C05', name: '4哥', type: 'character', rarity: 'SR',
    cost: 1, attack: 5, health: 2,
    description: '【紧急通告】登场当回合即可攻击',
    flavor: '泽，你放心',
    imagePath: '/cards/C05 · 4哥.jpg',
  },
  {
    id: 'C06', name: '黑粉头子', type: 'character', rarity: 'R',
    cost: 4, attack: 3, health: 5,
    description: '【挡枪】；【退场】对敌方玩家造成 2 伤害',
    flavor: '典，太典了',
    imagePath: '/cards/C06 · 黑粉头子.png',
  },
  {
    id: 'C07', name: '营销号', type: 'character', rarity: 'R',
    cost: 3, attack: 2, health: 3,
    description: '【登场】挖掘 1 张消耗牌加入手牌',
    flavor: '震惊！陈泽竟然...',
    imagePath: '/cards/C07 · 营销号.png',
  },
  {
    id: 'C08', name: '卡特', type: 'character', rarity: 'R',
    cost: 5, attack: 4, health: 5,
    description: '【紧急通告】登场当回合即可攻击',
    flavor: '你记住，规矩是死的，卡特也是',
    imagePath: '/cards/C08 · 卡特.jpg',
  },
  {
    id: 'C09', name: '烟波', type: 'character', rarity: 'R',
    cost: 4, attack: 3, health: 4,
    description: '【双开】每回合可攻击 2 次',
    flavor: '—',
    imagePath: '/cards/C09 · 烟波.png',
  },
  {
    id: 'C10', name: '李哥', type: 'character', rarity: 'R',
    cost: 4, attack: 2, health: 6,
    description: '【挡枪】；【登场】摧毁敌方 1 张事件牌',
    flavor: '我方已保留一切追诉权利',
    imagePath: '/cards/C10 · 李哥.png',
  },
  {
    id: 'C11', name: '荣一鸣', type: 'character', rarity: 'SR',
    cost: 6, attack: 6, health: 4,
    description: '【试水】【封杀】对角色造成伤害即必杀',
    flavor: '你会吹葫芦丝嘛？',
    imagePath: '/cards/C11 · 荣一鸣.jpg',
  },
  {
    id: 'C12', name: '刘军', type: 'character', rarity: 'SR',
    cost: 5, attack: 4, health: 6,
    description: '【登场】己方所有角色 +1/+1',
    flavor: '丁，小别胜是谁啊？',
    imagePath: '/cards/C12 · 刘军.jpg',
  },
  {
    id: 'C13', name: '黑白', type: 'character', rarity: 'SR',
    cost: 7, attack: 5, health: 7,
    description: '【挡枪】【粉丝盾】首次受到伤害免除',
    flavor: '白门在打在',
    imagePath: '/cards/C13 · 黑白.jpg',
  },
  {
    id: 'C14', name: '主播·陈泽', type: 'character', rarity: 'SSR',
    cost: 9, attack: 8, health: 9,
    description: '【登场】对方所有角色 -1/-0；联动：与「典中典」同场 ⚔ +3',
    flavor: '家人们谁懂啊，这波操作直接炸裂',
    imagePath: '/cards/C14 主播·陈泽.jpeg',
  },

  // ========== 🥤 道具 Item × 2（即时消耗品） ==========
  {
    id: 'I01', name: '酸马奶', type: 'item', subtype: 'instant', rarity: 'N',
    cost: 1,
    description: '【即时】己方玩家回 3 流量',
    flavor: '来一口',
  },
  {
    id: 'I02', name: '黑蒜', type: 'item', subtype: 'instant', rarity: 'N',
    cost: 2,
    description: '【即时】抽 1 张牌',
    flavor: '来一口',
  },

  // ========== ⚔️ 装备 Equipment × 6（武器 / 防具） ==========
  {
    id: 'I03', name: '应援灯牌', type: 'equipment', subtype: 'armor', rarity: 'N',
    cost: 2, attack: 1, health: 3,
    description: '【装备时】己方玩家流量 +3（防具：承担伤害）',
    flavor: '陈泽，宇宙最帅',
    imagePath: '/cards/I03 · 应援灯牌.png',
  },
  {
    id: 'I04', name: '金色话筒', type: 'equipment', subtype: 'weapon', rarity: 'R',
    cost: 2, attack: 3, health: 2,
    description: '每次攻击后抽 1 张牌',
    flavor: '家人们，咱们开播了',
    imagePath: '/cards/I04 · 金色话筒.png',
  },
  {
    id: 'I05', name: '老铁们下播', type: 'equipment', subtype: 'weapon', rarity: 'R',
    cost: 3, attack: 4, health: 2,
    description: '【装备时】令敌方 1 名角色失去【潜水】',
    flavor: '今天就到这儿，咱们明晚见',
    imagePath: '/cards/I05 · 老铁们下播.png',
  },
  {
    id: 'I06', name: '流量加持礼包', type: 'equipment', subtype: 'weapon', rarity: 'R',
    cost: 4, attack: 4, health: 3,
    description: '【装备时】己方所有角色本回合 ⚔ +1',
    flavor: '推流上 Push 拉满',
    imagePath: '/cards/I06 · 流量加持礼包.png',
  },
  {
    id: 'I07', name: '直播打赏王座', type: 'equipment', subtype: 'weapon', rarity: 'SR',
    cost: 6, attack: 5, health: 4,
    description: '每次攻击后己方玩家回 2 流量',
    flavor: '今晚的榜一大哥是...',
    imagePath: '/cards/I07 · 直播打赏王座.png',
  },
  {
    id: 'I08', name: '黑料爆料单', type: 'equipment', subtype: 'weapon', rarity: 'SSR',
    cost: 7, attack: 6, health: 2,
    description: '【装备时】摧毁对方 1 张事件；本回合消耗牌 -1 费',
    flavor: '瓜保熟，爆裂新鲜',
    imagePath: '/cards/I08 · 黑料爆料单 ⭐.png',
  },

  // ========== ✨ 消耗 Effect × 12（原"特殊效果"） ==========
  {
    id: 'E01', name: '上热搜', type: 'effect', rarity: 'N',
    cost: 2,
    description: '对目标造成 3 点流量伤害',
    flavor: '# 陈泽 # 又双叒上榜了',
  },
  {
    id: 'E02', name: '粉丝应援', type: 'effect', rarity: 'N',
    cost: 1,
    description: '己方玩家回 4 流量',
    flavor: '陈泽我们永远爱你',
  },
  {
    id: 'E03', name: '流量密码', type: 'effect', rarity: 'N',
    cost: 2,
    description: '抽 2 张牌',
    flavor: '这视频稳了，信我',
  },
  {
    id: 'E04', name: '塑料兄弟情', type: 'effect', rarity: 'N',
    cost: 1,
    description: '沉默目标角色（清除所有技能）',
    flavor: '哥，你先上',
  },
  {
    id: 'E05', name: '下次一定', type: 'effect', rarity: 'N',
    cost: 1,
    description: '抽 1 张牌（后手玩家开局自动获得）',
    flavor: '下次一定，下次一定',
  },
  {
    id: 'E06', name: '全网热议', type: 'effect', rarity: 'R',
    cost: 4,
    description: '对所有敌方角色造成 2 伤害（全场 AOE）',
    flavor: '建议冲上热搜！',
  },
  {
    id: 'E07', name: '塌房', type: 'effect', rarity: 'R',
    cost: 3,
    description: '将对方 1 名角色变为 1/1 并清空技能',
    flavor: '没想到吧，他居然...',
  },
  {
    id: 'E08', name: '反黑作战', type: 'effect', rarity: 'R',
    cost: 3,
    description: '摧毁敌方装备；本回合己方受到的伤害 -1',
    flavor: '举报三连，走你！',
  },
  {
    id: 'E09', name: '替身艺人', type: 'effect', rarity: 'R',
    cost: 4,
    description: '复制己方 1 名角色（变为 1/1）',
    flavor: '他走了，他没走，他又走了',
  },
  {
    id: 'E10', name: 'OK了老铁', type: 'effect', rarity: 'SR',
    cost: 5,
    description: '对目标造成 5 伤害；场上有陈泽时 +3',
    flavor: 'OK 了老铁，这波稳了',
  },
  {
    id: 'E11', name: '百万赞名场面', type: 'effect', rarity: 'SR',
    cost: 6,
    description: '己方所有角色 ⚔+2 / ❤+2（永久）',
    flavor: '一键三连，感谢支持',
  },
  {
    id: 'E12', name: '究极无敌人气卡', type: 'effect', rarity: 'SSR',
    cost: 8,
    description: '抽 3 张；本回合所有手牌 -2 费；回合末己方玩家回 5 流量',
    flavor: '究极无敌，全场沸腾',
  },

  // ========== ⚡ 事件 Event × 6 ==========
  {
    id: 'V01', name: '辣椒水', type: 'event', rarity: 'N',
    cost: 2,
    description: '【场地·⏳3】倒计时归零时对敌方玩家造成 3 伤害',
    flavor: '辣的是嘴，爆的是热搜',
  },
  {
    id: 'V02', name: '路透流出', type: 'event', rarity: 'N',
    cost: 1,
    description: '【暗箱】对方召唤角色时，该角色本回合不能攻击',
    flavor: '嘘，先别说出去',
  },
  {
    id: 'V03', name: '直播预告', type: 'event', rarity: 'R',
    cost: 3,
    description: '【场地·⏳2】倒计时归零时己方抽 1 张牌；期间己方装备耐久 +2',
    flavor: '明晚 8 点，家人们锁定直播间',
  },
  {
    id: 'V04', name: '塑料奥秘', type: 'event', rarity: 'R',
    cost: 2,
    description: '【暗箱】对方召唤 ⚔≥5 的角色时将其沉默',
    flavor: '我和他不熟。',
  },
  {
    id: 'V05', name: '官号转发', type: 'event', rarity: 'SR',
    cost: 5,
    description: '【场地·⏳3】倒计时归零：己方角色 ⚔+2（永久）+ 玩家回 5 流量',
    flavor: '@陈泽传媒 转发并评论',
  },
  {
    id: 'V06', name: '危机公关', type: 'event', rarity: 'SSR',
    cost: 5,
    description: '【暗箱】己方玩家首次受到 ≥5 伤害时改为 1，并抽 2 张牌',
    flavor: '回应来得又稳又狠',
  },
];

// ===================== CDN 映射层 =====================
// 统一负责 imagePath 的 URL 编码（含空格 / 中文 / 全角 · 等特殊字符），
// 消费方（gallery / preview / CardFrame / Battle ...）直接使用，无需再次编码。
//
// - 若设置了 NEXT_PUBLIC_CARDS_CDN（例如 COS 加速域名），
//   返回 `{CDN}/cards/{encoded}?imageMogr2/format/webp/quality/85/thumbnail/800x`。
// - 否则 fallback 到本地 `/cards/{encoded}`（仍然编码，避免浏览器字符集问题）。
const CARDS_CDN = process.env.NEXT_PUBLIC_CARDS_CDN || '';
const IMAGE_MOGR = 'imageMogr2/format/webp/quality/85/thumbnail/800x';

function resolveImagePath(p?: string): string | undefined {
  if (!p) return p;
  if (!p.startsWith('/cards/')) return p;
  const filename = p.slice('/cards/'.length);
  const encoded = encodeURI(filename);
  if (CARDS_CDN) {
    return `${CARDS_CDN.replace(/\/$/, '')}/cards/${encoded}?${IMAGE_MOGR}`;
  }
  return `/cards/${encoded}`;
}

export const CARD_PRESETS: CardPreset[] = _PRESETS.map((card) => ({
  ...card,
  imagePath: resolveImagePath(card.imagePath),
}));

export function findPreset(id: string): CardPreset | undefined {
  return CARD_PRESETS.find((p) => p.id.toUpperCase() === id.toUpperCase());
}
