export interface StarProfile {
  name: string;
  englishName: string;
  avatar: string;
  cover: string;
  birthday: string;
  constellation: string;
  birthplace: string;
  height: string;
  intro: string;
  tags: string[];
  socialLinks: { platform: string; url: string; followers: string; desc: string; accountName: string; accountId: string; qrcode: string }[];
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'debut' | 'award' | 'release' | 'milestone' | 'event';
}

export interface Album {
  id: string;
  title: string;
  category: string;
  cover: string;
  photoCount: number;
  photos: Photo[];
}

export interface Photo {
  id: string;
  url: string;
  description: string;
}

export interface Post {
  id: string;
  author: {
    name: string;
    avatar: string;
    role: 'fan' | 'star' | 'assistant' | 'admin';
    level?: number;
    badge?: string;
  };
  content: string;
  images: string[];
  tags: string[];
  likes: number;
  comments: Comment[];
  isPinned: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  author: {
    name: string;
    avatar: string;
    role: 'fan' | 'star' | 'assistant' | 'admin';
  };
  content: string;
  likes: number;
  createdAt: string;
}

export interface FanRanking {
  rank: number;
  name: string;
  avatar: string;
  points: number;
  level: number;
  badge: string;
  postCount: number;
  commentCount: number;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  cover: string;
  startTime: string;
  endTime: string;
  location: string;
  status: 'upcoming' | 'ongoing' | 'ended';
  participants: number;
}

export interface GameItem {
  id: string;
  name: string;
  cover: string;
  platform: string;
  genre: string;
  status: 'playing' | 'recent' | 'favorite';
  lastPlayed: string;
  hours: number;
  rating: number;
  comment: string;
  description: string;
  downloadLinks: { label: string; url: string }[];
}

// ============ Mock Data ============

const PLACEHOLDER = (w: number, h: number, text: string) =>
  `https://placehold.co/${w}x${h}/1890ff/ffffff?text=${encodeURIComponent(text)}`;

export const starProfile: StarProfile = {
  name: '陈泽',
  englishName: 'ChenZe',
  avatar: PLACEHOLDER(200, 200, 'ChenZe'),
  cover: PLACEHOLDER(1920, 600, 'CHENZE+COMMUNITY'),
  birthday: '黑龙江绥棱',
  constellation: '英雄联盟主播',
  birthplace: '黑龙江省绥化市绥棱县',
  height: '未公开',
  intro: '英雄联盟主播、游戏领域自媒体创作者。2019年开始在抖音和快手平台发布作品，以独特的直播风格和真实的东北人格魅力圈粉无数。2024年1月入驻抖音直播，首播吸引3950万观看、3.64亿点赞，开播仅3秒即突破10万观众。截至2026年3月，抖音拥有2209.6万粉丝，获赞6589.2万。',
  tags: ['英雄联盟', '游戏主播', '抖音达人', '东北老铁'],
  socialLinks: [
    { platform: '抖音', url: '#', followers: '2209.6万', desc: '英雄联盟主播、游戏领域自媒体创作者。日常直播、游戏精彩集锦分享。', accountName: '陈泽', accountId: 'chenze1103', qrcode: '' },
    { platform: '微博', url: '#', followers: '500万+', desc: '英雄联盟主播 | 动态更新、粉丝互动、生活分享。', accountName: '陈泽ChenZe', accountId: 'chenze_official', qrcode: '' },
  ],
};

export const timelineEvents: TimelineEvent[] = [
  { id: '1', date: '2018年', title: '英雄联盟七周年', description: '在舞剑仙战队参加英雄联盟七周年庆狂欢盛典', type: 'event' },
  { id: '2', date: '2019年', title: '开始自媒体之路', description: '在抖音和快手平台发布作品，开启主播生涯', type: 'debut' },
  { id: '3', date: '2023年7月', title: '爆火出圈', description: '抖音发布视频《还有我 我也是》，获赞473.1万，成为现象级内容', type: 'milestone' },
  { id: '4', date: '2023年12月', title: '宣布停播', description: '因快手合同问题宣布停播，引发粉丝广泛关注', type: 'event' },
  { id: '5', date: '2024年1月', title: '入驻抖音直播', description: '首播吸引3950.2万观看，3.64亿点赞，新增粉丝147.2万', type: 'milestone' },
  { id: '6', date: '2024年1月', title: '公益捐款', description: '向家乡绥棱县第一中学捐款十万元', type: 'event' },
  { id: '7', date: '2024年2月', title: '电竞春晚', description: '参与2024英雄联盟电竞春晚表演赛', type: 'event' },
  { id: '8', date: '2024年7月', title: '陈泽杯', description: '联合英雄联盟官方举办"英雄联盟陈泽杯"比赛，奖金超百万元', type: 'milestone' },
];

export const albums: Album[] = [
  {
    id: '1', title: '直播精彩瞬间', category: '直播',
    cover: PLACEHOLDER(400, 300, 'Live'), photoCount: 24,
    photos: Array.from({ length: 6 }, (_, i) => ({
      id: `1-${i}`, url: PLACEHOLDER(600, 400, `Live+${i + 1}`), description: `直播高光时刻 ${i + 1}`,
    })),
  },
  {
    id: '2', title: '英雄联盟赛事', category: '电竞',
    cover: PLACEHOLDER(400, 300, 'LOL'), photoCount: 18,
    photos: Array.from({ length: 6 }, (_, i) => ({
      id: `2-${i}`, url: PLACEHOLDER(600, 400, `LOL+${i + 1}`), description: `电竞赛事 ${i + 1}`,
    })),
  },
  {
    id: '3', title: '日常生活', category: '日常',
    cover: PLACEHOLDER(400, 300, 'Daily'), photoCount: 32,
    photos: Array.from({ length: 6 }, (_, i) => ({
      id: `3-${i}`, url: PLACEHOLDER(600, 400, `Daily+${i + 1}`), description: `日常分享 ${i + 1}`,
    })),
  },
  {
    id: '4', title: '粉丝投稿', category: '粉丝',
    cover: PLACEHOLDER(400, 300, 'Fan+Art'), photoCount: 56,
    photos: Array.from({ length: 6 }, (_, i) => ({
      id: `4-${i}`, url: PLACEHOLDER(600, 400, `Fan+${i + 1}`), description: `粉丝创作 ${i + 1}`,
    })),
  },
  {
    id: '5', title: '活动现场', category: '活动',
    cover: PLACEHOLDER(400, 300, 'Event'), photoCount: 20,
    photos: Array.from({ length: 6 }, (_, i) => ({
      id: `5-${i}`, url: PLACEHOLDER(600, 400, `Event+${i + 1}`), description: `活动现场 ${i + 1}`,
    })),
  },
  {
    id: '6', title: '陈泽杯比赛', category: '电竞',
    cover: PLACEHOLDER(400, 300, 'ChenZe+Cup'), photoCount: 15,
    photos: Array.from({ length: 6 }, (_, i) => ({
      id: `6-${i}`, url: PLACEHOLDER(600, 400, `Cup+${i + 1}`), description: `陈泽杯精彩 ${i + 1}`,
    })),
  },
];

export const posts: Post[] = [
  {
    id: '1',
    author: { name: '陈泽', avatar: PLACEHOLDER(48, 48, 'CZ'), role: 'star' },
    content: '今晚九点直播英雄联盟，新赛季冲分！上赛季差一点上大师，这次必须给安排上。老铁们记得来捧场，不来的都是瓜皮！',
    images: [PLACEHOLDER(600, 400, 'LOL+Stream')],
    tags: ['官方动态', '直播预告'],
    likes: 52800,
    comments: [
      { id: 'c1', author: { name: '东北铁粉', avatar: PLACEHOLDER(32, 32, 'F1'), role: 'fan' }, content: '冲冲冲！泽哥必上大师！', likes: 328, createdAt: '2小时前' },
      { id: 'c2', author: { name: '泽哥助理', avatar: PLACEHOLDER(32, 32, 'A'), role: 'assistant' }, content: '直播间已开启预约，点击主页预约按钮不迷路~', likes: 156, createdAt: '1小时前' },
    ],
    isPinned: true,
    createdAt: '3小时前',
  },
  {
    id: '2',
    author: { name: '绥棱铁粉王', avatar: PLACEHOLDER(48, 48, 'M'), role: 'fan', level: 8, badge: '超级粉' },
    content: '整理了陈泽从快手到抖音的经典名场面合集，每一段都能笑到肚子疼！"还有我，我也是"这个梗到现在还在用哈哈哈哈。泽子的直播真的太有意思了，东北人的DNA动了。',
    images: [PLACEHOLDER(600, 400, 'Highlights+1'), PLACEHOLDER(600, 400, 'Highlights+2')],
    tags: ['追星日记', '名场面'],
    likes: 1890,
    comments: [
      { id: 'c3', author: { name: 'LOL小迷妹', avatar: PLACEHOLDER(32, 32, 'F2'), role: 'fan' }, content: '泽子和宇将军那段太经典了', likes: 45, createdAt: '30分钟前' },
    ],
    isPinned: false,
    createdAt: '5小时前',
  },
  {
    id: '3',
    author: { name: '泽哥助理', avatar: PLACEHOLDER(48, 48, 'A'), role: 'assistant' },
    content: '【陈泽杯预告】第二届英雄联盟陈泽杯即将开赛！面向全网召集选手，奖金池超百万。报名通道即将开放，有实力的召唤师们准备好了吗？',
    images: [PLACEHOLDER(600, 300, 'ChenZe+Cup+S2')],
    tags: ['官方动态', '陈泽杯'],
    likes: 32400,
    comments: [],
    isPinned: true,
    createdAt: '1天前',
  },
  {
    id: '4',
    author: { name: '画手阿泽粉', avatar: PLACEHOLDER(48, 48, 'L'), role: 'fan', level: 6, badge: '真爱粉' },
    content: '花了一周画的陈泽Q版头像，灵感来自泽子直播时经典的表情。第一次画这种风格，感觉还挺像的，希望泽子能看到！',
    images: [PLACEHOLDER(600, 600, 'Fan+Art+CZ')],
    tags: ['同人创作', '绘画'],
    likes: 3420,
    comments: [
      { id: 'c4', author: { name: '陈泽', avatar: PLACEHOLDER(32, 32, 'CZ'), role: 'star' }, content: '可以可以，这也太像了，直接拿去当头像了兄弟！', likes: 8900, createdAt: '2小时前' },
    ],
    isPinned: false,
    createdAt: '8小时前',
  },
];

export const fanRankings: FanRanking[] = [
  { rank: 1, name: '绥棱铁粉王', avatar: PLACEHOLDER(48, 48, '1st'), points: 128600, level: 10, badge: '传奇粉', postCount: 342, commentCount: 1580 },
  { rank: 2, name: '东北铁粉', avatar: PLACEHOLDER(48, 48, '2nd'), points: 96400, level: 9, badge: '超级粉', postCount: 256, commentCount: 1230 },
  { rank: 3, name: 'LOL小迷妹', avatar: PLACEHOLDER(48, 48, '3rd'), points: 82100, level: 9, badge: '超级粉', postCount: 198, commentCount: 980 },
  { rank: 4, name: '画手阿泽粉', avatar: PLACEHOLDER(48, 48, '4th'), points: 67800, level: 8, badge: '真爱粉', postCount: 145, commentCount: 720 },
  { rank: 5, name: '黑龙江老铁', avatar: PLACEHOLDER(48, 48, '5th'), points: 54200, level: 7, badge: '真爱粉', postCount: 120, commentCount: 650 },
  { rank: 6, name: '泽子永远的家', avatar: PLACEHOLDER(48, 48, '6th'), points: 45600, level: 7, badge: '真爱粉', postCount: 98, commentCount: 540 },
  { rank: 7, name: '哈尔滨粉丝团', avatar: PLACEHOLDER(48, 48, '7th'), points: 38900, level: 6, badge: '铁粉', postCount: 86, commentCount: 420 },
  { rank: 8, name: '每日打卡泽', avatar: PLACEHOLDER(48, 48, '8th'), points: 32100, level: 6, badge: '铁粉', postCount: 72, commentCount: 380 },
  { rank: 9, name: '新粉报到', avatar: PLACEHOLDER(48, 48, '9th'), points: 28400, level: 5, badge: '铁粉', postCount: 56, commentCount: 310 },
  { rank: 10, name: '泽子铁杆迷妹', avatar: PLACEHOLDER(48, 48, '10th'), points: 21800, level: 5, badge: '铁粉', postCount: 42, commentCount: 260 },
];

export const events: EventItem[] = [
  {
    id: '1', title: '第二届英雄联盟陈泽杯',
    description: '陈泽联合英雄联盟官方举办的大型电竞赛事，面向全网召唤师，奖金池超百万，冠军战队将获得城市英雄争霸赛总决赛资格。',
    cover: PLACEHOLDER(800, 400, 'ChenZe+Cup'),
    startTime: '2026-06-15 14:00', endTime: '2026-06-15 22:00',
    location: '线上赛 + 线下总决赛', status: 'upcoming', participants: 128000,
  },
  {
    id: '2', title: '陈泽抖音直播周年庆',
    description: '入驻抖音直播一周年特别直播，回顾精彩瞬间，与粉丝连麦互动，超多福利等你来拿！',
    cover: PLACEHOLDER(800, 400, 'Anniversary'),
    startTime: '2026-05-12 20:00', endTime: '2026-05-12 23:00',
    location: '抖音直播间', status: 'upcoming', participants: 560000,
  },
  {
    id: '3', title: '粉丝线下见面会 - 哈尔滨站',
    description: '陈泽首次线下粉丝见面会！面对面游戏互动、签名合影、抽奖送周边。东北老铁们，安排！',
    cover: PLACEHOLDER(800, 400, 'Fan+Meeting'),
    startTime: '2026-07-20 14:00', endTime: '2026-07-20 17:00',
    location: '哈尔滨万达广场', status: 'upcoming', participants: 5000,
  },
];

export const heroSlides = [
  { id: '1', image: PLACEHOLDER(1920, 800, 'LIVE+STREAM'), alt: '直播现场' },
  { id: '2', image: PLACEHOLDER(1920, 800, 'LOL+GAMING'), alt: '英雄联盟' },
  { id: '3', image: PLACEHOLDER(1920, 800, 'CHENZE+CUP'), alt: '陈泽杯赛事' },
  { id: '4', image: PLACEHOLDER(1920, 800, 'FAN+MEETING'), alt: '粉丝见面会' },
];

export const recentGames: GameItem[] = [
  {
    id: '1',
    name: '英雄联盟',
    cover: PLACEHOLDER(400, 540, 'LOL'),
    platform: 'PC',
    genre: 'MOBA',
    status: 'playing',
    lastPlayed: '今天',
    hours: 12000,
    rating: 5,
    comment: '本命游戏，每天直播必玩。最喜欢的英雄是盲僧和瓜轮，操作起来贼刺激！',
    description: '《英雄联盟》是由Riot Games开发的多人在线竞技场游戏，拥有数百位独特英雄，是全球最受欢迎的电子竞技游戏之一。陈泽以英雄联盟直播起家，擅长盲僧、火男等英雄，操作狂野、解说搞笑是直播的最大看点。',
    downloadLinks: [
      { label: '官网下载', url: 'https://lol.qq.com' },
      { label: 'WeGame', url: 'https://www.wegame.com.cn/store/2000340' },
    ],
  },
  {
    id: '2',
    name: '永劫无间',
    cover: PLACEHOLDER(400, 540, 'Naraka'),
    platform: 'PC',
    genre: '动作竞技',
    status: 'playing',
    lastPlayed: '昨天',
    hours: 860,
    rating: 4,
    comment: '最近超爱玩的游戏，打架手感太爆了，直播效果也好！',
    description: '《永劫无间》是网易开发的东方武侠吃鸡游戏，融合了武侠格斗和大逃杀玩法。近战格斗手感极佳，角色技能华丽，战斗节奏紧凑刺激，是直播观赏性很高的竞技游戏。',
    downloadLinks: [
      { label: 'Steam', url: 'https://store.steampowered.com/app/1203220' },
      { label: '官网下载', url: 'https://www.naraka.com' },
    ],
  },
  {
    id: '3',
    name: '元梦之星',
    cover: PLACEHOLDER(400, 540, 'YuanMeng'),
    platform: 'PC / 手游',
    genre: '生存建造',
    status: 'playing',
    lastPlayed: '前天',
    hours: 320,
    rating: 4,
    comment: '和老铁们一起玩的生存游戏，建家整活儿太快乐了。',
    description: '《元梦之星》是腾讯推出的派对游戏，支持多人在线合作和对抗，拥有丰富的小游戏和创意玩法。陈泽经常和朋友们组队玩，整活名场面频出，观众缘极佳。',
    downloadLinks: [
      { label: '官网下载', url: 'https://ym.qq.com' },
      { label: 'App Store', url: 'https://apps.apple.com/app/id6450905791' },
    ],
  },
  {
    id: '4',
    name: '金铲大佚',
    cover: PLACEHOLDER(400, 540, 'Erta'),
    platform: 'PC / 手游',
    genre: '自动棋',
    status: 'recent',
    lastPlayed: '3天前',
    hours: 580,
    rating: 5,
    comment: 'LOL自动棋，排位赛上分贼爽，直播时经常穿插来一局。',
    description: '《金铲大佚》是英雄联盟官方自动棋游戏，玩家通过组合英雄阵容进行自动战斗。策略性强，运气与实力并存，是陈泽直播间歇时最爱的“快餐游戏”。',
    downloadLinks: [
      { label: '官网下载', url: 'https://tft.qq.com' },
      { label: 'App Store', url: 'https://apps.apple.com/app/id1459338600' },
    ],
  },
  {
    id: '5',
    name: '流放之路2',
    cover: PLACEHOLDER(400, 540, 'POE2'),
    platform: 'PC',
    genre: 'ARPG',
    status: 'recent',
    lastPlayed: '1周前',
    hours: 240,
    rating: 4,
    comment: '暗黑风格的刷宝游戏，Build研究起来超有意思。',
    description: '《流放之路2》是Grinding Gear Games开发的暗黑风格ARPG，拥有极其深度的技能树和装备系统。刷宝、Build研究、挑战高难度副本是核心乐趣，硬核玩家的最爱。',
    downloadLinks: [
      { label: 'Steam', url: 'https://store.steampowered.com/app/2694490' },
      { label: '官网', url: 'https://www.pathofexile2.com' },
    ],
  },
  {
    id: '6',
    name: '马里奥聚会',
    cover: PLACEHOLDER(400, 540, 'Mario+Party'),
    platform: 'Switch',
    genre: '派对游戏',
    status: 'favorite',
    lastPlayed: '2周前',
    hours: 150,
    rating: 5,
    comment: '和兄弟们一起玩的派对游戏，每次都笑到肘子疼。',
    description: '《超级马里奥 派对》是任天堂Switch平台的经典派对游戏，支持多人本地/在线对战。包含大量小游戏，适合朋友聚会时一起玩，笑料不断。',
    downloadLinks: [
      { label: 'Nintendo eShop', url: 'https://www.nintendo.com/games/detail/super-mario-party-switch' },
    ],
  },
];

export const communityStats = {
  totalFans: 22096000,
  todayPosts: 3680,
  totalInteractions: 65892000,
  onlineNow: 12800,
};
