// 40 张首发卡牌定义
// 将卡名 / 数值 / 关键字 / 效果钩子 一并注册到引擎

import type { CardDef } from './types';
import { registerCards } from './engine';

export const ALL_CARDS: CardDef[] = [
  // ========== 🎤 人物 Character × 14 ==========
  {
    id: 'C01', name: '搭档小助理', type: 'character', rarity: 'N',
    cost: 1, attack: 1, health: 2,
    effects: [
      { trigger: 'battlecry', effectId: 'draw_cards', params: { amount: 1 } },
      // 联动：若己方场上已有主播·陈泽（C14），触发默契开播 —— 双方 +2/+0 并抽 1 张
      {
        trigger: 'battlecry',
        effectId: 'chenze_partner_combo',
        params: { partnerId: 'C14', partnerName: '主播·陈泽', selfName: '搭档小助理', atk: 2, hp: 0, draw: 1 },
      },
    ],
    flavor: '哥，你说的都安排好了',
  },
  {
    id: 'C02', name: '路人粉', type: 'character', rarity: 'N',
    cost: 2, attack: 2, health: 3,
    flavor: '哎这谁啊，挺有意思',
  },
  {
    id: 'C03', name: '铁粉', type: 'character', rarity: 'N',
    cost: 3, attack: 2, health: 4,
    keywords: ['taunt'],
    flavor: '老大，我已经准备就绪',
  },
  {
    id: 'C04', name: '真爱粉', type: 'character', rarity: 'N',
    cost: 2, attack: 2, health: 3,
    effects: [{ trigger: 'battlecry', effectId: 'heal_self_hero', params: { amount: 2 } }],
    flavor: '他今天又营业了，我可以',
  },
  {
    id: 'C05', name: '4哥', type: 'character', rarity: 'SR',
    cost: 1, attack: 5, health: 2,
    keywords: ['charge'],
    flavor: '泽，你放心',
  },
  {
    id: 'C06', name: '黑粉头子', type: 'character', rarity: 'R',
    cost: 4, attack: 3, health: 5,
    keywords: ['taunt'],
    effects: [{ trigger: 'deathrattle', effectId: 'damage_enemy_hero', params: { amount: 2 } }],
    // 亡语设计原文是对己方扣 2，但"反噬黑料"在规则里有两种写法；暂对敌方造成 2 伤害（更具游戏性）
    flavor: '典，太典了',
  },
  {
    id: 'C07', name: '营销号', type: 'character', rarity: 'R',
    cost: 3, attack: 2, health: 3,
    effects: [{ trigger: 'battlecry', effectId: 'discover_effect' }],
    flavor: '震惊！陈泽竟然...',
  },
  {
    id: 'C08', name: '卡特', type: 'character', rarity: 'R',
    cost: 5, attack: 4, health: 5,
    keywords: ['charge'],
    flavor: '你记住，规矩是死的，卡特也是',
  },
  {
    id: 'C09', name: '烟波', type: 'character', rarity: 'R',
    cost: 4, attack: 3, health: 4,
    keywords: ['windfury'],
    flavor: '—',
  },
  {
    id: 'C10', name: '李哥', type: 'character', rarity: 'R',
    cost: 4, attack: 2, health: 6,
    keywords: ['taunt'],
    effects: [{ trigger: 'battlecry', effectId: 'destroy_random_enemy_event' }],
    flavor: '我方已保留一切追诉权利',
  },
  {
    id: 'C11', name: '荣一鸣', type: 'character', rarity: 'SR',
    cost: 6, attack: 6, health: 4,
    keywords: ['rush', 'poisonous'],
    flavor: '你会吹葫芦丝嘛？',
  },
  {
    id: 'C12', name: '刘军', type: 'character', rarity: 'SR',
    cost: 5, attack: 4, health: 6,
    effects: [
      { trigger: 'battlecry', effectId: 'buff_all_friendly', params: { atk: 1, hp: 1 } },
    ],
    flavor: '丁，小别胜是谁啊？',
  },
  {
    id: 'C13', name: '黑白', type: 'character', rarity: 'SR',
    cost: 7, attack: 5, health: 7,
    keywords: ['taunt', 'divineShield'],
    flavor: '白门在打在',
  },
  {
    id: 'C14', name: '主播·陈泽', type: 'character', rarity: 'SSR',
    cost: 9, attack: 8, health: 9,
    effects: [
      { trigger: 'battlecry', effectId: 'debuff_all_enemy_attack', params: { atk: 1 } },
      // 联动：若己方场上已有搭档小助理（C01），触发默契开播 —— 双方 +2/+0 并抽 1 张
      {
        trigger: 'battlecry',
        effectId: 'chenze_partner_combo',
        params: { partnerId: 'C01', partnerName: '搭档小助理', selfName: '主播·陈泽', atk: 2, hp: 0, draw: 1 },
      },
    ],
    flavor: '家人们谁懂啊，这波操作直接炸裂',
  },

  // ========== 🥤 道具 Item × 2（即时消耗品，不占装备槽） ==========
  {
    id: 'I01', name: '酸马奶', type: 'item', subtype: 'instant', rarity: 'N',
    cost: 1,
    effects: [{ trigger: 'battlecry', effectId: 'heal_self_hero', params: { amount: 3 } }],
    flavor: '来一口',
  },
  {
    id: 'I02', name: '黑蒜', type: 'item', subtype: 'instant', rarity: 'N',
    cost: 2,
    effects: [{ trigger: 'battlecry', effectId: 'draw_cards', params: { amount: 1 } }],
    flavor: '来一口',
  },

  // ========== ⚔️ 装备 Equipment × 6（武器/防具，装备到玩家槽位） ==========
  {
    id: 'I03', name: '应援灯牌', type: 'equipment', subtype: 'armor', rarity: 'N',
    cost: 2, attack: 1, health: 3,
    effects: [{ trigger: 'onEquip', effectId: 'heal_self_hero', params: { amount: 3 } }],
    flavor: '陈泽，宇宙最帅',
  },
  {
    id: 'I04', name: '金色话筒', type: 'equipment', subtype: 'weapon', rarity: 'R',
    cost: 2, attack: 3, health: 2,
    effects: [{ trigger: 'onAttack', effectId: 'draw_cards', params: { amount: 1 } }],
    flavor: '家人们，咱们开播了',
  },
  {
    id: 'I05', name: '老铁们下播', type: 'equipment', subtype: 'weapon', rarity: 'R',
    cost: 3, attack: 4, health: 2,
    flavor: '今天就到这儿，咱们明晚见',
  },
  {
    id: 'I06', name: '流量加持礼包', type: 'equipment', subtype: 'weapon', rarity: 'R',
    cost: 4, attack: 4, health: 3,
    effects: [
      { trigger: 'onEquip', effectId: 'buff_all_friendly_attack_turn', params: { atk: 1 } },
    ],
    flavor: '推流上 Push 拉满',
  },
  {
    id: 'I07', name: '直播打赏王座', type: 'equipment', subtype: 'weapon', rarity: 'SR',
    cost: 6, attack: 5, health: 4,
    effects: [{ trigger: 'onAttack', effectId: 'heal_self_hero', params: { amount: 2 } }],
    flavor: '今晚的榜一大哥是...',
  },
  {
    id: 'I08', name: '黑料爆料单', type: 'equipment', subtype: 'weapon', rarity: 'SSR',
    cost: 7, attack: 6, health: 2,
    effects: [{ trigger: 'onEquip', effectId: 'destroy_random_enemy_event' }],
    flavor: '瓜保熟，爆裂新鲜',
  },

  // ========== ✨ 特殊效果 Effect × 12 ==========
  {
    id: 'E01', name: '上热搜', type: 'effect', rarity: 'N',
    cost: 2,
    effects: [{ trigger: 'battlecry', effectId: 'damage_target', params: { amount: 3 } }],
    flavor: '# 陈泽 # 又双叒上榜了',
  },
  {
    id: 'E02', name: '粉丝应援', type: 'effect', rarity: 'N',
    cost: 1,
    effects: [{ trigger: 'battlecry', effectId: 'heal_self_hero', params: { amount: 4 } }],
    flavor: '陈泽我们永远爱你',
  },
  {
    id: 'E03', name: '流量密码', type: 'effect', rarity: 'N',
    cost: 2,
    effects: [{ trigger: 'battlecry', effectId: 'draw_cards', params: { amount: 2 } }],
    flavor: '这视频稳了，信我',
  },
  {
    id: 'E04', name: '塑料兄弟情', type: 'effect', rarity: 'N',
    cost: 1,
    effects: [{ trigger: 'battlecry', effectId: 'silence_target' }],
    flavor: '哥，你先上',
  },
  {
    id: 'E05', name: '下次一定', type: 'effect', rarity: 'N',
    cost: 1,
    effects: [{ trigger: 'battlecry', effectId: 'draw_cards', params: { amount: 1 } }],
    flavor: '下次一定，下次一定',
  },
  {
    id: 'E06', name: '全网热议', type: 'effect', rarity: 'R',
    cost: 4,
    effects: [{ trigger: 'battlecry', effectId: 'damage_all_enemy_minions', params: { amount: 2 } }],
    flavor: '建议冲上热搜！',
  },
  {
    id: 'E07', name: '塌房', type: 'effect', rarity: 'R',
    cost: 3,
    effects: [{ trigger: 'battlecry', effectId: 'transform_target_1_1' }],
    flavor: '没想到吧，他居然...',
  },
  {
    id: 'E08', name: '反黑作战', type: 'effect', rarity: 'R',
    cost: 3,
    effects: [{ trigger: 'battlecry', effectId: 'destroy_enemy_weapon' }],
    flavor: '举报三连，走你！',
  },
  {
    id: 'E09', name: '替身艺人', type: 'effect', rarity: 'R',
    cost: 4,
    effects: [{ trigger: 'battlecry', effectId: 'copy_random_friendly_minion' }],
    flavor: '他走了，他没走，他又走了',
  },
  {
    id: 'E10', name: 'OK了老铁', type: 'effect', rarity: 'SR',
    cost: 5,
    effects: [
      { trigger: 'battlecry', effectId: 'combo_damage_with_chenze', params: { base: 5, bonus: 3 } },
    ],
    flavor: 'OK 了老铁，这波稳了',
  },
  {
    id: 'E11', name: '百万赞名场面', type: 'effect', rarity: 'SR',
    cost: 6,
    effects: [{ trigger: 'battlecry', effectId: 'buff_all_friendly', params: { atk: 2, hp: 2 } }],
    flavor: '一键三连，感谢支持',
  },
  {
    id: 'E12', name: '究极无敌人气卡', type: 'effect', rarity: 'SSR',
    cost: 8,
    effects: [{ trigger: 'battlecry', effectId: 'draw_cards', params: { amount: 3 } }],
    flavor: '究极无敌，全场沸腾',
  },

  // ========== ⚡ 事件 Event × 6 ==========
  {
    id: 'V01', name: '辣椒水', type: 'event', rarity: 'N',
    cost: 2, countdown: 3,
    effects: [{ trigger: 'onCountdown0', effectId: 'damage_enemy_hero', params: { amount: 3 } }],
    flavor: '辣的是嘴，爆的是热搜',
  },
  {
    id: 'V02', name: '路透流出', type: 'event', rarity: 'N',
    cost: 1, secretTrigger: 'enemyPlaysMinion',
    effects: [{ trigger: 'onSecretTrigger', effectId: 'freeze_target_attacks_this_turn' }],
    flavor: '嘘，先别说出去',
  },
  {
    id: 'V03', name: '直播预告', type: 'event', rarity: 'R',
    cost: 3, countdown: 2,
    effects: [{ trigger: 'onCountdown0', effectId: 'draw_cards', params: { amount: 1 } }],
    flavor: '明晚 8 点，家人们锁定直播间',
  },
  {
    id: 'V04', name: '塑料奥秘', type: 'event', rarity: 'R',
    cost: 2, secretTrigger: 'enemyPlaysMinionAtkGte5',
    effects: [{ trigger: 'onSecretTrigger', effectId: 'silence_trigger_minion' }],
    flavor: '我和他不熟。',
  },
  {
    id: 'V05', name: '官号转发', type: 'event', rarity: 'SR',
    cost: 5, countdown: 3,
    effects: [
      { trigger: 'onCountdown0', effectId: 'buff_all_friendly', params: { atk: 2, hp: 0 } },
      { trigger: 'onCountdown0', effectId: 'heal_self_hero', params: { amount: 5 } },
    ],
    flavor: '@陈泽传媒 转发并评论',
  },
  {
    id: 'V06', name: '危机公关', type: 'event', rarity: 'SSR',
    cost: 5, secretTrigger: 'heroTakesDamageGte5',
    effects: [{ trigger: 'onSecretTrigger', effectId: 'crisis_pr' }],
    flavor: '回应来得又稳又狠',
  },
];

export function registerAllCards(): void {
  registerCards(ALL_CARDS);
}
