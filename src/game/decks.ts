// 预设练习卡组：35 张，五类齐全，单卡最多 2 张，SSR 单卡最多 1 张。

import type { Deck } from './types';

/** 防御控场：治疗技能 + 挡枪墙，拖到高血量角色站场反打。 */
export const DECK_TAUNT: Deck = {
  heroName: '玩家·挡枪流',
  heroPowerId: 'hp_heal2',
  cards: [
    'C01', 'C01',
    'C03', 'C03',
    'C04', 'C04',
    'C06', 'C06',
    'C10', 'C10',
    'C17', 'C17',
    'C19',
    'C13',
    'C14',
    'C20',
    'I01', 'I01',
    'I02',
    'I03', 'I03',
    'I05',
    'I07',
    'E02', 'E02',
    'E04',
    'E06',
    'E08',
    'E16',
    'E17',
    'E19',
    'V01',
    'V04',
    'V06',
    'V08',
  ],
};

/** 快攻压血：低费角色 + 武器 + 直接伤害，尽快制造斩杀窗口。 */
export const DECK_RUSH: Deck = {
  heroName: '玩家·快攻流',
  heroPowerId: 'hp_draw1',
  cards: [
    'C15', 'C15',
    'C01', 'C01',
    'C05', 'C05',
    'C08', 'C08',
    'C09', 'C09',
    'C16', 'C16',
    'C18',
    'C12',
    'I01', 'I01',
    'I02', 'I02',
    'I04', 'I04',
    'I06',
    'I08',
    'E01', 'E01',
    'E03', 'E03',
    'E05', 'E05',
    'E13',
    'E14',
    'E15',
    'E18',
    'V02', 'V02',
    'V08',
  ],
};

/** 事件控制：召唤技能填场，暗箱与场地拖节奏，靠倒计时和解牌滚优势。 */
export const DECK_EVENT: Deck = {
  heroName: '玩家·事件流',
  heroPowerId: 'hp_recruit',
  cards: [
    'C02', 'C02',
    'C03', 'C03',
    'C04', 'C04',
    'C07', 'C07',
    'C10',
    'C20',
    'I01', 'I01',
    'I02',
    'I03',
    'I05',
    'I07',
    'E02',
    'E05', 'E05',
    'E06', 'E06',
    'E07',
    'E09',
    'E11',
    'E16',
    'E18',
    'E19',
    'V01', 'V01',
    'V02', 'V02',
    'V03',
    'V04',
    'V05',
    'V06',
  ],
};

/** 中速资源：更像正式对局的节奏套牌，铺场、过牌、解场都有。 */
export const DECK_TEMPO: Deck = {
  heroName: '玩家·中速资源',
  heroPowerId: 'hp_draw1',
  cards: [
    'C15', 'C15',
    'C01', 'C01',
    'C02', 'C02',
    'C16', 'C16',
    'C18', 'C18',
    'C20', 'C20',
    'C12',
    'C14',
    'C19',
    'I01',
    'I02', 'I02',
    'I03',
    'I04',
    'I06',
    'I07',
    'E01',
    'E03',
    'E05',
    'E10',
    'E11',
    'E15', 'E15',
    'E17',
    'E18',
    'V02',
    'V03',
    'V08',
    'V09',
  ],
};

/** 后期控制：高治疗、高解场和复活，练习资源管理与疲劳前终结。 */
export const DECK_CONTROL: Deck = {
  heroName: '玩家·后期控制',
  heroPowerId: 'hp_heal2',
  cards: [
    'C03', 'C03',
    'C04', 'C04',
    'C06',
    'C10', 'C10',
    'C17', 'C17',
    'C19',
    'C13',
    'C20',
    'I01', 'I01',
    'I02', 'I02',
    'I03',
    'I05',
    'I07',
    'E02', 'E02',
    'E04',
    'E06', 'E06',
    'E07',
    'E08',
    'E16',
    'E17',
    'E19',
    'V01',
    'V03',
    'V04',
    'V06',
    'V08',
    'V09',
  ],
};

export const ALL_DECKS = [
  { key: 'taunt', label: '🛡 铁粉挡枪（防御）', deck: DECK_TAUNT },
  { key: 'rush', label: '⚡ 联动快攻（速攻）', deck: DECK_RUSH },
  { key: 'event', label: '🎭 事件发酵（控制）', deck: DECK_EVENT },
  { key: 'tempo', label: '🎬 中速资源（均衡）', deck: DECK_TEMPO },
  { key: 'control', label: '🧊 后期控制（资源）', deck: DECK_CONTROL },
] as const;

for (const { key, deck } of ALL_DECKS) {
  if (deck.cards.length !== 35) {
    throw new Error(`Deck ${key} has ${deck.cards.length} cards, need 35`);
  }
}
