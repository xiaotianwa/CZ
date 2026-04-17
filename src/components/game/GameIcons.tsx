// 集中管理 /game/* 使用的 SVG 图标，替换所有 emoji
// 规范：24×24 viewBox，stroke-width 2，支持 className 自由设色
// 参考 ui-ux-pro-max skill：No emoji icons — Use SVG (Lucide-style)

import React from 'react';

type IconProps = {
  className?: string;
  size?: number;
  strokeWidth?: number;
};

const base = (
  size: number | undefined,
  className: string | undefined,
  strokeWidth: number | undefined,
  children: React.ReactNode,
) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth ?? 2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    {children}
  </svg>
);

// ============ 类型图标（Character / Item / Equipment / Effect / Event） ============

export const CharacterIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </>
  ));

export const ItemIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M8 4h8l1 4H7Z" />
      <path d="M7 8v8a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4V8" />
      <path d="M9 12h6" />
    </>
  ));

export const EquipmentIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M14.5 3 21 3v6.5L10 20.5 3.5 14Z" />
      <path d="M14.5 3 9 8.5" />
      <path d="M14 11 8.5 16.5" />
    </>
  ));

export const EffectIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="m12 3 2.5 6 6 2.5-6 2.5L12 20l-2.5-6-6-2.5 6-2.5Z" />
    </>
  ));

export const EventIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M13 2 3 14h8l-1 8 10-12h-8Z" />
    </>
  ));

// ============ 数值图标（Mana / Attack / Health / Durability） ============

export const ManaIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M12 3c-4 5-6 8-6 11a6 6 0 0 0 12 0c0-3-2-6-6-11Z" />
    </>
  ));

export const AttackIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
      <path d="m13 19 6-6" />
      <path d="m16 16 4 4" />
      <path d="m19 21 2-2" />
    </>
  ));

export const HealthIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M12 21c-4.5-3.5-9-7-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5-4.5 8.5-9 12Z" />
    </>
  ));

export const DurabilityIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M12 3 4 6v6c0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9V6Z" />
    </>
  ));

// ============ 关键字图标（MCN 化命名） ============

// 挡枪 taunt：盾
export const TauntIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M12 3 4 6v6c0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9V6Z" />
      <path d="M9 12h6M12 9v6" />
    </>
  ));

// 紧急通告 charge：闪电
export const ChargeIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M13 2 3 14h8l-1 8 10-12h-8Z" />
    </>
  ));

// 试水 rush：脚印（攻击移动）
export const RushIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ));

// 双开 windfury：两个圈
export const WindfuryIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M5 12a3 3 0 1 1 6 0 3 3 0 1 1-6 0" />
      <path d="M13 12a3 3 0 1 1 6 0 3 3 0 1 1-6 0" />
    </>
  ));

// 潜水 stealth：眼睛-斜线
export const StealthIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="m2 2 20 20" />
      <path d="M6.7 6.7C3.7 9 2 12 2 12s4 7 10 7a11.3 11.3 0 0 0 5.3-1.3" />
      <path d="M22 12s-1.7-3-4.7-5.3A11 11 0 0 0 12 5" />
      <circle cx="12" cy="12" r="3" />
    </>
  ));

// 封杀 poisonous：骷髅简化
export const PoisonousIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <circle cx="12" cy="10" r="7" />
      <circle cx="9" cy="10" r="1.2" fill="currentColor" />
      <circle cx="15" cy="10" r="1.2" fill="currentColor" />
      <path d="M10 17h4" />
      <path d="M10 20h4" />
    </>
  ));

// 吸粉 lifesteal：心+向下箭头
export const LifestealIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M12 21c-4.5-3.5-9-7-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5-4.5 8.5-9 12Z" />
      <path d="M9 11h6" />
      <path d="m12 8 3 3-3 3" />
    </>
  ));

// 粉丝盾 divineShield：盾+星
export const DivineShieldIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M12 3 4 6v6c0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9V6Z" />
      <path d="m12 8 1.5 3 3 .5-2 2 .5 3L12 15l-3 1.5.5-3-2-2 3-.5Z" fill="currentColor" fillOpacity="0.15" />
    </>
  ));

// 复出 reborn：回旋箭头
export const RebornIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 3v5h-5" />
    </>
  ));

// ============ 机制图标（Battlecry / Deathrattle / Combo / Echo / Secret） ============

// 登场 battlecry：喇叭
export const BattlecryIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M16 9a4 4 0 0 1 0 6" />
      <path d="M19 6a8 8 0 0 1 0 12" />
    </>
  ));

// 退场 deathrattle：墓碑
export const DeathrattleIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M6 20V11a6 6 0 0 1 12 0v9" />
      <path d="M4 20h16" />
      <path d="M10 13h4M12 11v6" />
    </>
  ));

// 联动 combo：链环
export const ComboIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M9 12a5 5 0 0 1 5-5h3a5 5 0 0 1 0 10h-3" />
      <path d="M15 12a5 5 0 0 1-5 5H7a5 5 0 0 1 0-10h3" />
    </>
  ));

// 重播 echo：重复
export const EchoIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </>
  ));

// 暗箱 secret：锁
export const SecretIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </>
  ));

// 即时 instant：闪电
export const InstantIcon = ChargeIcon;

// 延时 delayed：沙漏
export const DelayedIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M6 2h12" />
      <path d="M6 22h12" />
      <path d="M6 2v5l6 5-6 5v5" />
      <path d="M18 2v5l-6 5 6 5v5" />
    </>
  ));

// 装备时 onEquip：背包
export const OnEquipIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M5 8h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      <path d="M9 14h6" />
    </>
  ));

// 场地 location：地图
export const LocationIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <circle cx="12" cy="10" r="3" />
      <path d="M12 22s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12Z" />
    </>
  ));

// ============ 功能图标 ============

export const BackIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (<><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>));

export const RestartIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M21 12a9 9 0 1 1-9-9" />
      <path d="M21 3v6h-6" />
    </>
  ));

export const HelpIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.3-1 1-1 1.7" />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" />
    </>
  ));

export const SurrenderIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M4 3v18" />
      <path d="M4 4h14l-3 5 3 5H4" />
    </>
  ));

export const PlayIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (<><polygon points="6 4 20 12 6 20 6 4" /></>));

export const TimerIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M10 2h4" />
    </>
  ));

export const CheckIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (<polyline points="5 13 10 18 19 6" />));

export const CloseIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (<><path d="M6 6 18 18" /><path d="M18 6 6 18" /></>));

export const TrophyIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M7 4h10v4a5 5 0 0 1-10 0Z" />
      <path d="M7 7H4v2a3 3 0 0 0 3 3" />
      <path d="M17 7h3v2a3 3 0 0 1-3 3" />
      <path d="M10 15h4l-1 5h-2Z" />
      <path d="M8 20h8" />
    </>
  ));

export const SkullIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <circle cx="12" cy="10" r="7" />
      <circle cx="9" cy="10" r="1.3" fill="currentColor" />
      <circle cx="15" cy="10" r="1.3" fill="currentColor" />
      <path d="M9 17h6" />
      <path d="M10 17v4M14 17v4" />
    </>
  ));

export const HandshakeIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M3 12h3l3-3 3 3 3-3 3 3h3" />
      <path d="M7 14l4 4 2-2 4 4" />
    </>
  ));

export const FireIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M12 3s4 5 4 9a4 4 0 1 1-8 0c0-2 1-3.5 2-5 0 2 1 3 2 3 0-3 0-5 0-7Z" />
    </>
  ));

export const LogIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
      <path d="M8 13h8M8 17h6M8 9h3" />
    </>
  ));

export const ChevronIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (<polyline points="9 6 15 12 9 18" />));

export const ImageIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="M21 16 16 11 5 20" />
    </>
  ));

export const SparkleIcon = ({ className, size, strokeWidth }: IconProps) =>
  base(size, className, strokeWidth, (
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="m6 6 3 3M15 15l3 3M6 18l3-3M15 9l3-3" />
    </>
  ));

// ============ 关键字映射（用于场上角色徽章） ============

export const KW_ICON_COMPONENT: Record<string, React.ComponentType<IconProps>> = {
  taunt: TauntIcon,
  charge: ChargeIcon,
  rush: RushIcon,
  windfury: WindfuryIcon,
  stealth: StealthIcon,
  poisonous: PoisonousIcon,
  lifesteal: LifestealIcon,
  divineShield: DivineShieldIcon,
  reborn: RebornIcon,
};

// ============ 类型映射 ============

export const TYPE_ICON_COMPONENT: Record<string, React.ComponentType<IconProps>> = {
  character: CharacterIcon,
  item: ItemIcon,
  equipment: EquipmentIcon,
  effect: EffectIcon,
  event: EventIcon,
};

// ============ 机制映射 ============

export const MECHANIC_ICON_COMPONENT: Record<string, React.ComponentType<IconProps>> = {
  登场: BattlecryIcon,
  退场: DeathrattleIcon,
  联动: ComboIcon,
  重播: EchoIcon,
  暗箱: SecretIcon,
  即时: InstantIcon,
  延时: DelayedIcon,
  装备时: OnEquipIcon,
  场地: LocationIcon,
  挡枪: TauntIcon,
  紧急通告: ChargeIcon,
  试水: RushIcon,
  双开: WindfuryIcon,
  潜水: StealthIcon,
  封杀: PoisonousIcon,
  吸粉: LifestealIcon,
  粉丝盾: DivineShieldIcon,
  复出: RebornIcon,
};
