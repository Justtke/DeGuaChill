export type DeGuaVariety =
  | 'red'      // 紅梅地瓜球 (對應紅皮克敏：抗火、攻擊高)
  | 'yellow'   // 黃金地瓜球 (對應黃皮克敏：抗電)
  | 'blue'     // 蝶豆花藍球 (對應藍皮克敏：抗水)
  | 'purple'   // 紫心地瓜球 (對應紫皮克敏：10倍搬運力、重擊)
  | 'white'    // 白玉地瓜球 (對應白皮克敏：抗毒、速度最快)
  | 'winged'   // 粉紅羽翅球 (對應羽翅皮克敏：飛行最短路徑)
  | 'rock';    // 竹炭岩石球 (對應岩石皮克敏：擊碎水晶)

export type DecorCategory =
  | 'night_market'  // 🏮 餐廳 (主廚帽 / 稀有主廚帽)
  | 'bubble_tea'    // ☕ 咖啡廳 (咖啡杯 / 稀有手搖杯)
  | 'bakery'        // 🥖 麵包店 (法國麵包(稀有) / 法國麵包 / 現烤點心麵包)
  | 'dessert'       // 🧁 甜點店 (馬卡龍 / 甜甜圈)
  | 'cinema'        // 🍿 電影院 (爆米花 & 3D眼鏡)
  | 'pharmacy'      // 🪥 藥局 (牙刷)
  | 'zoo'           // 🦁 動物園 (蒲公英)
  | 'forest'        // 🌲 森林 (獨角仙 / 橡實)
  | 'waterside'     // 🎣 水邊 (路亞假餌(稀有) / 路亞假餌)
  | 'post_office'   // 📮 郵局 (郵票)
  | 'art_gallery'   // 🖼️ 美術館 (名畫相框)
  | 'airport'       // ✈️ 機場 (玩具飛機)
  | 'station'       // 🚉 車站 (紙火車 / 車票票根)
  | 'beach'         // 🐚 海邊 (貝殼)
  | 'hamburger'     // 🍔 漢堡店 (美式漢堡)
  | 'convenience'   // 🏪 便利商店 (瓶蓋 / 零食)
  | 'supermarket'   // 🛒 超市 (蘑菇 / 香蕉)
  | 'hair_salon'    // ✂️ 美髮院 (剪刀與髮梳(稀有) / 剪刀與髮梳)
  | 'clothing'      // 👕 服飾店 (髮圈 / 鈕扣)
  | 'park'          // 🍀 公園 (四葉幸運草(稀有) / 幸運草)
  | 'book'          // 📚 書店・圖書館 (迷你繪本)
  | 'ramen'         // 🍜 拉麵店 (拉麵碗鑰匙圈)
  | 'sushi'         // 🍣 壽司店 (握壽司)
  | 'mountain'      // ⛰️ 山丘 (登山徽章)
  | 'curry'         // 🍛 咖哩店 (香料咖哩碗)
  | 'taco'          // 🌮 墨西哥餐廳 (塔可脆餅)
  | 'roadside'      // 🏷️ 路邊 (路邊貼紙 / 金幣徽章(稀有))
  | 'special';      // 🎊 特別活動 (週年花朵 / 麻將牌 / 金幣節慶)

export type PetalColor = 'white' | 'yellow' | 'red' | 'blue';

export type LeafStage = 'bare' | 'leaf' | 'bud' | 'flower';

export interface VarietyMeta {
  id: DeGuaVariety;
  name: string;
  potName: string;
  bodyColor: string;
  spotColor: string;
  potColor: string;
  baseSteps: number;
  carryStrength: number;
  attackPower: number;
}

export interface DecorMeta {
  id: DecorCategory;
  name: string;
  placeCategory: string;
  icon: string;
}

export interface DecorSetEntry {
  setId: string;
  setName: string;
  emoji: string;
  isRare?: boolean;
  varieties?: DeGuaVariety[];
}

export interface Seedling {
  id: string;
  variety: DeGuaVariety;
  decor: DecorCategory;
  decorSetId?: string;
  isHuge: boolean; // 10,000 步巨大瓜糰（起鍋直接自帶飾品）
  placeName: string;
  lat: number;
  lng: number;
  currentSteps: number;
  targetSteps: number;
  slotIndex: number | null; // 0~1 為預設雙鍋，2~5 為額外欄位，null 代表在背包
  isReady: boolean;
  notified: boolean;
  isFavorite?: boolean;
  discoveredAt: number;
}

export interface DeGuaCreature {
  id: string;
  name: string;
  variety: DeGuaVariety;
  decor: DecorCategory;
  decorSetId?: string;
  placeName: string;
  lat: number;
  lng: number;
  friendship: number; // 0 ~ 800 (0~400 為 1~4 顆紅心；400~800 為 1~4 顆金心)
  hasDecor: boolean;  // 初始巨大苗拔出為 true；一般苗滿 4 顆心完成「禮物探險」後變為 true
  giftExpeditionCreated: boolean;
  leafStage: LeafStage;
  flowerColor: PetalColor;
  pluckCountToday: number;
  feedCount?: number; // 今日餵食階段 (0 ~ 6；達 6/6 採收後變光禿禿)
  lastFedAt?: number | null; // 上次餵食時間（每 2 小時恢復 1 格飢餓度）
  bareAt?: number | null; // 變成光禿禿的時間（等待 6 小時長回葉子）
  bareWalkSteps?: number; // 光禿禿後行走步數（約 2,000 步長回葉子）
  squadWalkSteps?: number; // 隊伍中葉子累積步數（約 1,700~2,000 步變花苞）
  budBonusPending?: boolean; // 由「花苞」開花，採收可得雙倍花瓣 (+2)
  isFavorite?: boolean; // 是否標記為最愛（☆）
  inSquad: boolean;
  busyState: 'free' | 'expedition' | 'mushroom';
  createdAt: number;
}

export type ExtraFryerSlotType = 'standard' | 'fast25';

export interface ActiveExtraFryerSlot {
  slotIndex: number; // 2 ~ 5（上方四個額外洞槽）
  type: ExtraFryerSlotType; // standard: 一般額外欄位；fast25: 金色加速 +25% 欄位
}

export interface ExtraFryerSlotInventory {
  standard: number;
  fast25: number;
}

export type ExpeditionKind = 'seedling' | 'fruit' | 'gift';

export interface ExpeditionItem {
  id: string;
  kind: ExpeditionKind;
  title: string;
  placeName: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  requiredStrength: number;
  maxCarriers?: number;
  weightGrams?: number;
  discoveredAt?: number;
  expiresAt?: number;
  // 若為花苗探險
  seedlingVariety?: DeGuaVariety;
  seedlingDecor?: DecorCategory;
  seedlingIsHuge?: boolean;
  // 若為水果探險
  fruitEmoji?: string;
  fruitName?: string;
  nectarColor?: PetalColor;
  nectarAmount?: number;
  // 若為滿4心拿禮物探險
  targetCreatureId?: string;
  // 進行中狀態與精確去/回程時間追蹤
  status: 'available' | 'active' | 'completed';
  assignedCreatureIds: string[];
  originLat?: number;
  originLng?: number;
  startedAt?: number;
  outboundDurationMs?: number;
  inboundDurationMs?: number;
  completesAt?: number;
}

export interface PlantedFlowerCell {
  gridId: string;
  lat: number;
  lng: number;
  color: PetalColor;
  count: number;
  updatedAt: number;
}

export interface BigFlowerNode {
  id: string;
  name: string;
  landmarkName?: string;
  photoUrl?: string;
  lat: number;
  lng: number;
  currentFlowers: number;
  requiredFlowers: number; // 300
  colorVotes: Record<PetalColor, number>;
  bloomedColor: PetalColor | null;
  bloomedAt: number | null;
}

export interface MushroomParticipant {
  playerName: string;
  power: number;
  joinedAt: number;
}

export type MushroomElement =
  | 'red'
  | 'yellow'
  | 'blue'
  | 'purple'
  | 'white'
  | 'pink'
  | 'gray'
  | 'ice'
  | 'fire'
  | 'water'
  | 'crystal'
  | 'electric'
  | 'poison'
  | 'bizarre';

export type MushroomSizeLabel = '小' | '一般' | '大' | '巨大';

export type MushroomCategoryKind = 'color' | 'elemental' | 'event';

export const MIN_SQUAD_BY_MUSHROOM_SIZE: Record<MushroomSizeLabel, number> = {
  小: 1,
  一般: 10,
  大: 15,
  巨大: 20
};

export interface MushroomCatalogEntry {
  element: MushroomElement;
  typeLabel: string;
  categoryKind: MushroomCategoryKind;
  categoryLabel: string;
  colorHex: string;
  spotHex: string;
  reward: PetalColor;
  isElementalSpecial: boolean;
  availableSizes: MushroomSizeLabel[];
  favoredVarieties: DeGuaVariety[];
  matchScoreByVariety: Record<DeGuaVariety, number | null>; // null 代表 `-` 不可參戰
  shortModalDesc: string;
  advantageDesc: string;
  hpBySize: Partial<Record<MushroomSizeLabel, number>>;
}

/**
 * 完整導入《皮克敏 Pikmin Bloom》真實蘑菇資料庫（依巴哈姆特與 Pikmin Wiki 2025/03/08 製表）：
 * 1. 種類與大小限制：
 *    - 顏色菇（乾爽的菇）：小 / 一般 / 大
 *    - 元素菇（外圍多一層物質）：一般 / 大（無小，僅限對應屬性上場）
 *    - 活動菇（每月可能不同）：一般 / 巨大（無小）
 * 2. 最低所需皮克敏/地瓜球數量：巨大→20隻 / 大→15隻 / 一般→10隻 / 小→1隻
 * 3. 真實血量表：
 *    - 白、粉紅、冰藍：小 81,000／一般 621,000／大 2,700,000
 *    - 黃、藍色：小 84,200／一般 645,800／大 2,808,000
 *    - 紅色：小 87,400／一般 670,600／大 2,916,000
 *    - 灰色（岩石）：小 90,700／一般 695,500／大 3,024,000
 *    - 紫色：小 93,900／一般 720,300／大 3,132,000
 *    - 活動蘑菇（輝煌蘑菇）：一般 648,000／巨大 3,000,000（視活動調整）
 *    - 毒蘑菇：一般 3,783,200／大 13,424,400
 *    - 水蘑菇 / 電蘑菇：一般 3,816,700／大 13,543,200
 *    - 火蘑菇：一般 3,850,200／大 13,662,000
 *    - 水晶蘑菇：一般 3,883,600／大 13,780,800
 */
export const MUSHROOM_CATALOG: Record<MushroomElement, MushroomCatalogEntry> = {
  white: {
    element: 'white',
    typeLabel: '白色蘑菇',
    categoryKind: 'color',
    categoryLabel: '顏色菇（乾爽的菇）',
    colorHex: '#94A3B8',
    spotHex: '#FFFFFF',
    reward: 'white',
    isElementalSpecial: false,
    availableSizes: ['小', '一般', '大'],
    favoredVarieties: ['white'],
    matchScoreByVariety: {
      red: 0,
      yellow: 0,
      blue: 0,
      purple: 0,
      white: 12,
      winged: 0,
      rock: 0
    },
    shortModalDesc: '白玉地瓜球很擅長摧毀這種蘑菇！',
    advantageDesc: '打菇加分：白 +12｜紅/黃/藍/紫/粉/灰 +0（非白色受毒減免）',
    hpBySize: { 小: 81000, 一般: 621000, 大: 2700000 }
  },
  pink: {
    element: 'pink',
    typeLabel: '粉紅蘑菇',
    categoryKind: 'color',
    categoryLabel: '顏色菇（乾爽的菇）',
    colorHex: '#EC4899',
    spotHex: '#FCE7F3',
    reward: 'red',
    isElementalSpecial: false,
    availableSizes: ['小', '一般', '大'],
    favoredVarieties: ['winged'],
    matchScoreByVariety: {
      red: 3,
      yellow: 3,
      blue: 3,
      purple: 3,
      white: 3,
      winged: 12,
      rock: 3
    },
    shortModalDesc: '粉紅羽翅地瓜球很擅長摧毀這種蘑菇！',
    advantageDesc: '打菇加分：粉 +12｜紅/黃/藍/紫/白/灰 +3',
    hpBySize: { 小: 81000, 一般: 621000, 大: 2700000 }
  },
  ice: {
    element: 'ice',
    typeLabel: '冰藍蘑菇',
    categoryKind: 'color',
    categoryLabel: '顏色菇（乾爽的菇）',
    colorHex: '#38BDF8',
    spotHex: '#E0F2FE',
    reward: 'blue',
    isElementalSpecial: false,
    availableSizes: ['小', '一般', '大'],
    favoredVarieties: ['blue'],
    matchScoreByVariety: {
      red: 3,
      yellow: 3,
      blue: 12,
      purple: 3,
      white: 3,
      winged: 3,
      rock: 3
    },
    shortModalDesc: '冰藍與藍色地瓜球很擅長摧毀這種蘑菇！',
    advantageDesc: '打菇加分：冰藍/藍 +12｜其他色系 +3',
    hpBySize: { 小: 81000, 一般: 621000, 大: 2700000 }
  },
  yellow: {
    element: 'yellow',
    typeLabel: '黃色蘑菇',
    categoryKind: 'color',
    categoryLabel: '顏色菇（乾爽的菇）',
    colorHex: '#F59E0B',
    spotHex: '#FEF9C3',
    reward: 'yellow',
    isElementalSpecial: false,
    availableSizes: ['小', '一般', '大'],
    favoredVarieties: ['yellow'],
    matchScoreByVariety: {
      red: 3,
      yellow: 12,
      blue: 3,
      purple: 3,
      white: 3,
      winged: 3,
      rock: 3
    },
    shortModalDesc: '黃金地瓜球很擅長摧毀這種蘑菇！',
    advantageDesc: '打菇加分：黃 +12｜紅/藍/紫/白/粉/灰 +3',
    hpBySize: { 小: 84200, 一般: 645800, 大: 2808000 }
  },
  blue: {
    element: 'blue',
    typeLabel: '藍色蘑菇',
    categoryKind: 'color',
    categoryLabel: '顏色菇（乾爽的菇）',
    colorHex: '#3B82F6',
    spotHex: '#E0F2FE',
    reward: 'blue',
    isElementalSpecial: false,
    availableSizes: ['小', '一般', '大'],
    favoredVarieties: ['blue'],
    matchScoreByVariety: {
      red: 0,
      yellow: 0,
      blue: 12,
      purple: 0,
      white: 0,
      winged: 3,
      rock: 0
    },
    shortModalDesc: '蝶豆花藍色地瓜球很擅長摧毀這種蘑菇！',
    advantageDesc: '打菇加分：藍 +12｜粉 +3｜紅/黃/紫/白/灰 +0',
    hpBySize: { 小: 84200, 一般: 645800, 大: 2808000 }
  },
  red: {
    element: 'red',
    typeLabel: '紅色蘑菇',
    categoryKind: 'color',
    categoryLabel: '顏色菇（乾爽的菇）',
    colorHex: '#EF4444',
    spotHex: '#FEF08A',
    reward: 'red',
    isElementalSpecial: false,
    availableSizes: ['小', '一般', '大'],
    favoredVarieties: ['red'],
    matchScoreByVariety: {
      red: 12,
      yellow: 3,
      blue: 0,
      purple: 3,
      white: 3,
      winged: 3,
      rock: 3
    },
    shortModalDesc: '紅梅地瓜球很擅長摧毀這種蘑菇！',
    advantageDesc: '打菇加分：紅 +12｜黃/紫/白/粉/灰 +3｜藍 +0',
    hpBySize: { 小: 87400, 一般: 670600, 大: 2916000 }
  },
  gray: {
    element: 'gray',
    typeLabel: '灰色蘑菇',
    categoryKind: 'color',
    categoryLabel: '顏色菇（乾爽的菇）',
    colorHex: '#475569',
    spotHex: '#E2E8F0',
    reward: 'white',
    isElementalSpecial: false,
    availableSizes: ['小', '一般', '大'],
    favoredVarieties: ['rock'],
    matchScoreByVariety: {
      red: 0,
      yellow: 3,
      blue: 3,
      purple: 3,
      white: 0,
      winged: 0,
      rock: 12
    },
    shortModalDesc: '竹炭岩石地瓜球很擅長摧毀這種蘑菇！',
    advantageDesc: '打菇加分：灰(岩石) +12｜黃/藍/紫 +3｜紅/白/粉 +0',
    hpBySize: { 小: 90700, 一般: 695500, 大: 3024000 }
  },
  purple: {
    element: 'purple',
    typeLabel: '紫色蘑菇',
    categoryKind: 'color',
    categoryLabel: '顏色菇（乾爽的菇）',
    colorHex: '#9333EA',
    spotHex: '#F3E8FF',
    reward: 'red',
    isElementalSpecial: false,
    availableSizes: ['小', '一般', '大'],
    favoredVarieties: ['purple'],
    matchScoreByVariety: {
      red: 3,
      yellow: 3,
      blue: 3,
      purple: 12,
      white: 3,
      winged: 3,
      rock: 3
    },
    shortModalDesc: '紫心地瓜球很擅長摧毀這種蘑菇！',
    advantageDesc: '打菇加分：紫 +12｜紅/黃/藍/白/粉/灰 +3',
    hpBySize: { 小: 93900, 一般: 720300, 大: 3132000 }
  },
  bizarre: {
    element: 'bizarre',
    typeLabel: '輝煌蘑菇',
    categoryKind: 'event',
    categoryLabel: '活動菇（每月可能不同）',
    colorHex: '#F59E0B',
    spotHex: '#FEF08A',
    reward: 'yellow',
    isElementalSpecial: false,
    availableSizes: ['一般', '巨大'],
    favoredVarieties: ['red', 'yellow', 'blue', 'purple', 'white', 'winged', 'rock'],
    matchScoreByVariety: {
      red: 0,
      yellow: 0,
      blue: 0,
      purple: 0,
      white: 0,
      winged: 0,
      rock: 0
    },
    shortModalDesc: '輝煌蘑菇僅在活動期間出現。\n穿戴當月專屬活動飾品的地瓜球很擅長摧毀這種蘑菇！',
    advantageDesc: '活動菇加分：基礎 +0｜有當月新活動飾品的皮克敏在此項直接 +300！',
    hpBySize: { 一般: 648000, 巨大: 3000000 }
  },
  poison: {
    element: 'poison',
    typeLabel: '毒蘑菇',
    categoryKind: 'elemental',
    categoryLabel: '元素菇（外圍多一層物質）',
    colorHex: '#7E22CE',
    spotHex: '#E9D5FF',
    reward: 'white',
    isElementalSpecial: true,
    availableSizes: ['一般', '大'],
    favoredVarieties: ['white'],
    matchScoreByVariety: {
      red: null,
      yellow: null,
      blue: null,
      purple: null,
      white: 100,
      winged: null,
      rock: null
    },
    shortModalDesc: '只有不怕毒的白色地瓜球可以摧毀毒蘑菇。',
    advantageDesc: '☠️ 元素相剋：僅限「白」可上場（打菇加分 +100），其他種類不可參戰 (-)',
    hpBySize: { 一般: 3783200, 大: 13424400 }
  },
  water: {
    element: 'water',
    typeLabel: '水蘑菇',
    categoryKind: 'elemental',
    categoryLabel: '元素菇（外圍多一層物質）',
    colorHex: '#0284C7',
    spotHex: '#BAE6FD',
    reward: 'blue',
    isElementalSpecial: true,
    availableSizes: ['一般', '大'],
    favoredVarieties: ['blue'],
    matchScoreByVariety: {
      red: null,
      yellow: null,
      blue: 100,
      purple: null,
      white: null,
      winged: null,
      rock: null
    },
    shortModalDesc: '只有不怕水的藍色地瓜球可以摧毀水蘑菇。',
    advantageDesc: '💧 元素相剋：僅限「藍」可上場（打菇加分 +100），其他種類不可參戰 (-)',
    hpBySize: { 一般: 3816700, 大: 13543200 }
  },
  electric: {
    element: 'electric',
    typeLabel: '電蘑菇',
    categoryKind: 'elemental',
    categoryLabel: '元素菇（外圍多一層物質）',
    colorHex: '#EAB308',
    spotHex: '#FEF08A',
    reward: 'yellow',
    isElementalSpecial: true,
    availableSizes: ['一般', '大'],
    favoredVarieties: ['yellow'],
    matchScoreByVariety: {
      red: null,
      yellow: 100,
      blue: null,
      purple: null,
      white: null,
      winged: null,
      rock: null
    },
    shortModalDesc: '只有不怕電的黃色地瓜球可以摧毀電蘑菇。',
    advantageDesc: '⚡ 元素相剋：僅限「黃」可上場（打菇加分 +100），其他種類不可參戰 (-)',
    hpBySize: { 一般: 3816700, 大: 13543200 }
  },
  fire: {
    element: 'fire',
    typeLabel: '火蘑菇',
    categoryKind: 'elemental',
    categoryLabel: '元素菇（外圍多一層物質）',
    colorHex: '#DC2626',
    spotHex: '#FDE047',
    reward: 'red',
    isElementalSpecial: true,
    availableSizes: ['一般', '大'],
    favoredVarieties: ['red'],
    matchScoreByVariety: {
      red: 100,
      yellow: null,
      blue: null,
      purple: null,
      white: null,
      winged: null,
      rock: null
    },
    shortModalDesc: '只有不怕火的紅色地瓜球可以摧毀火蘑菇。',
    advantageDesc: '🔥 元素相剋：僅限「紅」可上場（打菇加分 +100），其他種類不可參戰 (-)',
    hpBySize: { 一般: 3850200, 大: 13662000 }
  },
  crystal: {
    element: 'crystal',
    typeLabel: '水晶蘑菇',
    categoryKind: 'elemental',
    categoryLabel: '元素菇（外圍多一層物質）',
    colorHex: '#06B6D4',
    spotHex: '#CFFAFE',
    reward: 'white',
    isElementalSpecial: true,
    availableSizes: ['一般', '大'],
    favoredVarieties: ['rock'],
    matchScoreByVariety: {
      red: null,
      yellow: null,
      blue: null,
      purple: null,
      white: null,
      winged: null,
      rock: 100
    },
    shortModalDesc: '只有堅硬的灰色岩石地瓜球可以摧毀水晶蘑菇。',
    advantageDesc: '💎 元素相剋：僅限「灰(岩石)」可上場（打菇加分 +100），其他種類不可參戰 (-)',
    hpBySize: { 一般: 3883600, 大: 13780800 }
  }
};

/**
 * 依據《Pikmin Bloom 打菇戰力(工作力)計算》5 項加總公式（參考資料：https://www.pikminwiki.com/Mushroom_battle）：
 * 把下列 5 項的得分加在一起就可以得到這隻皮克敏的工作力！
 * 1. 皮克敏種類：紅 4 / 黃 3 / 藍 3 / 紫 6 / 白 2 / 粉 2 / 灰 5
 * 2. 是否有飾品：有 4 / 沒有 0
 * 3. 頭上是什麼：葉子 1 / 花苞 2 / 普通花 3 / 當月副花 4 / 當月主花 5 / 禿了 0
 * 4. 友好度愛心：<1心 0 / 1~4紅心 1,2,3,4 / 1~4金心 8,12,16,20
 * 5. 打什麼菇：同色 +12、一般非零色 +3、相剋色 0；元素菇對應色 +100（非對應色 `-` 不可上場）；活動菇當月新活動飾品 +300
 */
export function calculateCreatureMushroomPower(
  creature: DeGuaCreature,
  mushroomElement: MushroomElement
): {
  power: number;
  canJoin: boolean;
  isFavored: boolean;
  isWeakened: boolean;
  breakdown: {
    varietyScore: number;
    decorScore: number;
    headScore: number;
    heartScore: number;
    mushroomMatchScore: number;
  };
} {
  const entry = MUSHROOM_CATALOG[mushroomElement] || MUSHROOM_CATALOG.red;

  // 1. 皮克敏種類得分：紅 4, 黃 3, 藍 3, 紫 6, 白 2, 粉 2, 灰 5
  const varietyScoreMap: Record<DeGuaVariety, number> = {
    red: 4,
    yellow: 3,
    blue: 3,
    purple: 6,
    white: 2,
    winged: 2,
    rock: 5
  };
  const varietyScore = varietyScoreMap[creature.variety];

  // 2. 是否有飾品：有 4, 沒有 0
  const decorScore = creature.hasDecor ? 4 : 0;

  // 3. 頭上是什麼：葉子 1, 花苞 2, 普通花 3, 當月副花 4, 當月主花 5, 禿了 0
  const headScore =
    creature.leafStage === 'bare'
      ? 0
      : creature.leafStage === 'leaf'
      ? 1
      : creature.leafStage === 'bud'
      ? 2
      : creature.flowerColor === 'red' || creature.flowerColor === 'yellow'
      ? 5 // 當月主花
      : creature.flowerColor === 'blue'
      ? 4 // 當月副花
      : 3; // 普通花

  // 4. 友好度愛心：<1顆心=0, 1~4紅心=1~4, 1~4金心=8/12/16/20
  let heartScore = 0;
  if (creature.friendship >= 800) heartScore = 20;
  else if (creature.friendship >= 700) heartScore = 16;
  else if (creature.friendship >= 600) heartScore = 12;
  else if (creature.friendship >= 500) heartScore = 8;
  else if (creature.friendship >= 100) {
    heartScore = Math.min(4, Math.floor(creature.friendship / 100));
  }

  // 5. 打什麼菇得分
  const rawMatch = entry.matchScoreByVariety[creature.variety];
  if (rawMatch === null) {
    // 元素菇非對應屬性顯示 `-`（不可上場）
    return {
      power: 0,
      canJoin: false,
      isFavored: false,
      isWeakened: true,
      breakdown: {
        varietyScore,
        decorScore,
        headScore,
        heartScore,
        mushroomMatchScore: 0
      }
    };
  }

  let mushroomMatchScore = rawMatch;
  // 活動菇：有當月新活動飾品的皮克敏在此項可加 300！
  if (mushroomElement === 'bizarre' && creature.hasDecor) {
    mushroomMatchScore = 300;
  }

  const totalPower =
    varietyScore + decorScore + headScore + heartScore + mushroomMatchScore;
  const isFavored =
    entry.favoredVarieties.includes(creature.variety) &&
    (mushroomMatchScore >= 12 || (mushroomElement === 'bizarre' && creature.hasDecor));

  return {
    power: totalPower,
    canJoin: true,
    isFavored,
    isWeakened: !isFavored && mushroomMatchScore === 0 && mushroomElement !== 'bizarre',
    breakdown: {
      varietyScore,
      decorScore,
      headScore,
      heartScore,
      mushroomMatchScore
    }
  };
}

/**
 * 依據《Pikmin Bloom》官方戰鬥消耗時間公式計算：
 * 耗時（分鐘） = ((蘑菇血量 / 總攻擊強度) * 100) / 60
 */
export function calculateMushroomBattleDuration(
  mushroomHp: number,
  totalAttackPower: number
): {
  totalSeconds: number;
  totalMinutes: number;
  formattedText: string;
} {
  if (totalAttackPower <= 0) {
    return {
      totalSeconds: 0,
      totalMinutes: 0,
      formattedText: '無法挑戰（無對應屬性隊員）'
    };
  }
  const totalSeconds = Math.round((mushroomHp / totalAttackPower) * 100);
  const totalMinutes = Number((totalSeconds / 60).toFixed(1));
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const formattedText =
    hours > 0
      ? `${hours} 小時 ${mins} 分 ${secs} 秒（${totalMinutes.toLocaleString()} 分鐘）`
      : `${mins} 分 ${secs} 秒（${totalMinutes.toLocaleString()} 分鐘）`;

  return {
    totalSeconds,
    totalMinutes,
    formattedText
  };
}

export interface MushroomNode {
  id: string;
  name: string;
  landmarkName?: string;
  photoUrl?: string;
  sizeLabel: MushroomSizeLabel;
  element: MushroomElement;
  colorHex: string;
  lat: number;
  lng: number;
  maxHp: number;
  currentHp: number;
  participants: MushroomParticipant[];
  rewardColor: PetalColor;
}

export interface PostcardItem {
  id: string;
  placeName: string;
  mushroomName: string;
  stars: number;
  senderName: string;
  creatures: { variety: DeGuaVariety; decor: DecorCategory; hasDecor: boolean }[];
  createdAt: string;
}

export const VARIETY_CATALOG: Record<DeGuaVariety, VarietyMeta> = {
  red: {
    id: 'red',
    name: '紅梅地瓜球',
    potName: '紅色瓜糰',
    bodyColor: '#EF4444',
    spotColor: '#B91C1C',
    potColor: '#EF4444',
    baseSteps: 1000,
    carryStrength: 1,
    attackPower: 4
  },
  yellow: {
    id: 'yellow',
    name: '黃金地瓜球',
    potName: '黃色瓜糰',
    bodyColor: '#F59E0B',
    spotColor: '#B45309',
    potColor: '#FACC15',
    baseSteps: 1000,
    carryStrength: 1,
    attackPower: 3
  },
  blue: {
    id: 'blue',
    name: '蝶豆花藍球',
    potName: '藍色瓜糰',
    bodyColor: '#3B82F6',
    spotColor: '#1D4ED8',
    potColor: '#3B82F6',
    baseSteps: 1000,
    carryStrength: 1,
    attackPower: 3
  },
  purple: {
    id: 'purple',
    name: '紫心地瓜球',
    potName: '紫色瓜糰',
    bodyColor: '#9333EA',
    spotColor: '#581C87',
    potColor: '#9333EA',
    baseSteps: 3000,
    carryStrength: 5,
    attackPower: 6
  },
  white: {
    id: 'white',
    name: '白玉地瓜球',
    potName: '白色瓜糰',
    bodyColor: '#F3F4F6',
    spotColor: '#9CA3AF',
    potColor: '#E5E7EB',
    baseSteps: 3000,
    carryStrength: 1,
    attackPower: 2
  },
  winged: {
    id: 'winged',
    name: '粉紅羽翅球',
    potName: '粉紅瓜糰',
    bodyColor: '#F472B6',
    spotColor: '#DB2777',
    potColor: '#F472B6',
    baseSteps: 5000,
    carryStrength: 1,
    attackPower: 2
  },
  rock: {
    id: 'rock',
    name: '竹炭岩石球',
    potName: '灰色瓜糰',
    bodyColor: '#374151',
    spotColor: '#111827',
    potColor: '#4B5563',
    baseSteps: 5000,
    carryStrength: 3,
    attackPower: 5
  }
};

export const DECOR_CATALOG: Record<DecorCategory, DecorMeta> = {
  night_market: { id: 'night_market', name: '主廚帽', placeCategory: '餐廳', icon: '👨‍🍳' },
  bubble_tea: { id: 'bubble_tea', name: '咖啡與手搖飲', placeCategory: '咖啡廳', icon: '🧋' },
  bakery: { id: 'bakery', name: '法國麵包與點心', placeCategory: '麵包店', icon: '🥖' },
  dessert: { id: 'dessert', name: '馬卡龍與甜甜圈', placeCategory: '甜點店', icon: '🧁' },
  cinema: { id: 'cinema', name: '爆米花與立體眼鏡', placeCategory: '電影院', icon: '🍿' },
  pharmacy: { id: 'pharmacy', name: '可愛牙刷組', placeCategory: '藥局', icon: '🪥' },
  zoo: { id: 'zoo', name: '草原蒲公英', placeCategory: '動物園', icon: '🦁' },
  forest: { id: 'forest', name: '獨角仙與橡實', placeCategory: '森林', icon: '🌲' },
  waterside: { id: 'waterside', name: '路亞假餌', placeCategory: '水邊', icon: '🎣' },
  post_office: { id: 'post_office', name: '紀念郵票', placeCategory: '郵局', icon: '📮' },
  art_gallery: { id: 'art_gallery', name: '典藏名畫相框', placeCategory: '美術館', icon: '🖼️' },
  airport: { id: 'airport', name: '迷你玩具飛機', placeCategory: '機場', icon: '✈️' },
  station: { id: 'station', name: '紙火車與車票', placeCategory: '車站', icon: '🚉' },
  beach: { id: 'beach', name: '繽紛貝殼', placeCategory: '海邊', icon: '🐚' },
  hamburger: { id: 'hamburger', name: '豪華漢堡堡', placeCategory: '漢堡店', icon: '🍔' },
  convenience: { id: 'convenience', name: '瓶蓋與超商零食', placeCategory: '便利商店', icon: '🏪' },
  supermarket: { id: 'supermarket', name: '蘑菇與水果籃', placeCategory: '超市', icon: '🛒' },
  hair_salon: { id: 'hair_salon', name: '理髮剪刀與髮梳', placeCategory: '美髮院', icon: '✂️' },
  clothing: { id: 'clothing', name: '髮圈與服飾鈕扣', placeCategory: '服飾店', icon: '👕' },
  park: { id: 'park', name: '幸運草葉冠', placeCategory: '公園', icon: '🍀' },
  book: { id: 'book', name: '迷你立體繪本', placeCategory: '書店・圖書館', icon: '📚' },
  ramen: { id: 'ramen', name: '熱呼呼拉麵碗', placeCategory: '拉麵店', icon: '🍜' },
  sushi: { id: 'sushi', name: '壽司師傅手捏壽司', placeCategory: '壽司店', icon: '🍣' },
  mountain: { id: 'mountain', name: '山頂登頂徽章', placeCategory: '山丘', icon: '⛰️' },
  curry: { id: 'curry', name: '濃郁香料咖哩碗', placeCategory: '咖哩店', icon: '🍛' },
  taco: { id: 'taco', name: '脆皮塔可夾餅', placeCategory: '墨西哥餐廳', icon: '🌮' },
  roadside: { id: 'roadside', name: '地標貼紙與金幣', placeCategory: '路邊', icon: '🏷️' },
  special: { id: 'special', name: '週年花朵與節慶紀念', placeCategory: '特別活動', icon: '🎊' }
};

export const ALL_DECOR_CATEGORIES: DecorCategory[] = [
  'night_market',
  'bubble_tea',
  'bakery',
  'dessert',
  'cinema',
  'pharmacy',
  'zoo',
  'forest',
  'waterside',
  'post_office',
  'art_gallery',
  'airport',
  'station',
  'beach',
  'hamburger',
  'convenience',
  'supermarket',
  'hair_salon',
  'clothing',
  'park',
  'book',
  'ramen',
  'sushi',
  'mountain',
  'curry',
  'taco',
  'roadside',
  'special'
];

const SEVEN_COLORS: DeGuaVariety[] = ['red', 'yellow', 'blue', 'purple', 'white', 'winged', 'rock'];
const THREE_COLORS: DeGuaVariety[] = ['red', 'yellow', 'blue'];

export const DECOR_SUBSETS_CATALOG: Record<DecorCategory, DecorSetEntry[]> = {
  night_market: [
    { setId: 'nm_chef_rare', setName: '主廚帽（稀有）', emoji: '👨‍🍳✨', isRare: true, varieties: ['red', 'yellow', 'blue', 'purple'] },
    { setId: 'nm_chef', setName: '主廚帽', emoji: '👨‍🍳', varieties: SEVEN_COLORS },
    { setId: 'nm_plum', setName: '夜市竹籤梅粉袋', emoji: '🏮', varieties: SEVEN_COLORS }
  ],
  bubble_tea: [
    { setId: 'bt_cafe_rare', setName: '咖啡杯（稀有）', emoji: '☕✨', isRare: true, varieties: THREE_COLORS },
    { setId: 'bt_cafe', setName: '咖啡杯＆手搖珍奶', emoji: '🧋', varieties: SEVEN_COLORS }
  ],
  bakery: [
    { setId: 'bk_baguette_rare', setName: '法國麵包（稀有）', emoji: '🥖✨', isRare: true, varieties: ['red', 'yellow', 'blue', 'purple', 'white', 'winged', 'rock'] },
    { setId: 'bk_baguette', setName: '法國麵包', emoji: '🥖', varieties: SEVEN_COLORS },
    { setId: 'bk_pastry', setName: '可頌・丹麥・蝴蝶餅・肉桂捲', emoji: '🥐', varieties: SEVEN_COLORS }
  ],
  dessert: [
    { setId: 'ds_macaron', setName: '繽紛馬卡龍', emoji: '🧁', varieties: SEVEN_COLORS },
    { setId: 'ds_donut', setName: '糖霜甜甜圈', emoji: '🍩', varieties: SEVEN_COLORS }
  ],
  cinema: [{ setId: 'cn_popcorn', setName: '電影爆米花・飲料', emoji: '🍿', varieties: SEVEN_COLORS }],
  pharmacy: [{ setId: 'ph_brush', setName: '日常牙刷組', emoji: '🪥', varieties: SEVEN_COLORS }],
  zoo: [{ setId: 'zo_dandelion', setName: '蒲公英絮花', emoji: '🦁', varieties: SEVEN_COLORS }],
  forest: [
    { setId: 'fr_beetle', setName: '獨角仙', emoji: '🪲', varieties: SEVEN_COLORS },
    { setId: 'fr_acorn', setName: '森林橡實', emoji: '🌰', varieties: SEVEN_COLORS }
  ],
  waterside: [
    { setId: 'wt_lure_rare', setName: '路亞假餌（稀有）', emoji: '🎣✨', isRare: true, varieties: THREE_COLORS },
    { setId: 'wt_lure', setName: '路亞假餌', emoji: '🎣', varieties: SEVEN_COLORS }
  ],
  post_office: [{ setId: 'po_stamp', setName: '明信片郵票', emoji: '📮', varieties: SEVEN_COLORS }],
  art_gallery: [{ setId: 'ag_frame', setName: '美術館典藏相框', emoji: '🖼️', varieties: SEVEN_COLORS }],
  airport: [{ setId: 'ap_plane', setName: '玩具螺旋槳飛機', emoji: '✈️', varieties: SEVEN_COLORS }],
  station: [
    { setId: 'st_train', setName: '紙火車', emoji: '🚂', varieties: SEVEN_COLORS },
    { setId: 'st_ticket', setName: '立體站長車票', emoji: '🎫', varieties: SEVEN_COLORS }
  ],
  beach: [{ setId: 'bc_shell', setName: '陽光海邊貝殼', emoji: '🐚', varieties: SEVEN_COLORS }],
  hamburger: [{ setId: 'hb_burger', setName: '起司雙層漢堡', emoji: '🍔', varieties: SEVEN_COLORS }],
  convenience: [
    { setId: 'cv_cap', setName: '超商瓶蓋', emoji: '🧢', varieties: SEVEN_COLORS },
    { setId: 'cv_snack', setName: '超商零食・茶葉蛋', emoji: '🏪', varieties: SEVEN_COLORS }
  ],
  supermarket: [
    { setId: 'sm_mushroom', setName: '生鮮蘑菇袋', emoji: '🍄', varieties: SEVEN_COLORS },
    { setId: 'sm_banana', setName: '香蕉水果串', emoji: '🍌', varieties: SEVEN_COLORS }
  ],
  hair_salon: [
    { setId: 'hs_scissors_rare', setName: '剪刀與髮梳（稀有）', emoji: '✂️✨', isRare: true, varieties: THREE_COLORS },
    { setId: 'hs_scissors', setName: '剪刀與髮梳', emoji: '✂️', varieties: SEVEN_COLORS }
  ],
  clothing: [{ setId: 'cl_hairtie', setName: '蝴蝶結髮圈＆鈕扣', emoji: '👕', varieties: SEVEN_COLORS }],
  park: [
    { setId: 'pk_clover_rare', setName: '四葉幸運草', emoji: '🍀✨', isRare: true, varieties: SEVEN_COLORS },
    { setId: 'pk_clover', setName: '三葉幸運草', emoji: '☘️', varieties: SEVEN_COLORS }
  ],
  book: [{ setId: 'bk_book', setName: '迷你故事繪本', emoji: '📚', varieties: SEVEN_COLORS }],
  ramen: [{ setId: 'rm_noodle', setName: '拉麵碗鑰匙圈', emoji: '🍜', varieties: ['red', 'yellow', 'blue'] }],
  sushi: [{ setId: 'ss_sushi', setName: '現捏生魚片壽司', emoji: '🍣', varieties: THREE_COLORS }],
  mountain: [{ setId: 'mt_badge', setName: '三角點登山別針', emoji: '⛰️', varieties: THREE_COLORS }],
  curry: [{ setId: 'cr_curry', setName: '香料咖哩飯碗', emoji: '🍛', varieties: SEVEN_COLORS }],
  taco: [{ setId: 'tc_taco', setName: '墨西哥塔可脆餅', emoji: '🌮', varieties: SEVEN_COLORS }],
  roadside: [
    { setId: 'rd_coin_rare', setName: '金幣徽章', emoji: '🪙', isRare: true, varieties: SEVEN_COLORS },
    { setId: 'rd_sticker', setName: '路邊字母貼紙（綠／藍／橙）', emoji: '🏷️', varieties: SEVEN_COLORS }
  ],
  special: [
    { setId: 'sp_anniv', setName: '週年慶紀念花飾', emoji: '🎊', varieties: SEVEN_COLORS },
    { setId: 'sp_mahjong', setName: '節慶麻將牌', emoji: '🀄', varieties: SEVEN_COLORS }
  ]
};

export const PETAL_META: Record<
  PetalColor,
  { name: string; nectarName: string; hex: string; glowHex: string; emoji: string }
> = {
  white: {
    name: '白色花瓣',
    nectarName: '白色精華',
    hex: '#FFFFFF',
    glowHex: '#E2E8F0',
    emoji: '💮'
  },
  yellow: {
    name: '黃色花瓣',
    nectarName: '黃色精華',
    hex: '#FACC15',
    glowHex: '#FEF08A',
    emoji: '🌼'
  },
  red: {
    name: '紅色花瓣',
    nectarName: '紅色精華',
    hex: '#EF4444',
    glowHex: '#FECACA',
    emoji: '🌺'
  },
  blue: {
    name: '藍色花瓣',
    nectarName: '藍色精華',
    hex: '#3B82F6',
    glowHex: '#BFDBFE',
    emoji: '💠'
  }
};

export type FlowerShapeStyle = 'daisy' | 'tulip' | 'sakura' | 'rose' | 'cluster' | 'sunflower';

export interface FlowerSpeciesDef {
  id: string;
  nameZh: string;
  colors: PetalColor[];
  shape: FlowerShapeStyle;
  isBase?: boolean;
}

export interface PetalVariantMeta {
  id: string; // e.g. 'daisy_white', 'sakura_white', 'geranium_blue'
  speciesId: string;
  speciesNameZh: string;
  color: PetalColor;
  displayName: string; // 例如：白色花瓣、藍色天竺葵、紅色彼岸花
  nectarDisplayName: string;
  shape: FlowerShapeStyle;
  isBase: boolean;
}

const COLOR_PREFIX_ZH: Record<PetalColor, string> = {
  white: '白色',
  yellow: '黃色',
  red: '紅色',
  blue: '藍色'
};

/**
 * 完整導入《Pikmin Bloom》歷代一般花瓣與全季節特殊花種資料庫
 */
export const FLOWER_SPECIES_CATALOG: FlowerSpeciesDef[] = [
  { id: 'daisy', nameZh: '一般花', colors: ['white', 'yellow', 'red', 'blue'], shape: 'daisy', isBase: true },
  { id: 'pansy', nameZh: '三色堇', colors: ['white', 'yellow', 'red', 'blue'], shape: 'daisy' },
  { id: 'rose', nameZh: '玫瑰', colors: ['white', 'yellow', 'red', 'blue'], shape: 'rose' },
  { id: 'poinsettia', nameZh: '聖誕紅', colors: ['white', 'yellow', 'red'], shape: 'rose' },
  { id: 'camellia', nameZh: '山茶花', colors: ['white', 'yellow', 'red'], shape: 'rose' },
  { id: 'plum', nameZh: '梅花', colors: ['white', 'yellow', 'red'], shape: 'sakura' },
  { id: 'cherry_blossom', nameZh: '櫻花', colors: ['white', 'red', 'blue'], shape: 'sakura' },
  { id: 'tulip', nameZh: '鬱金香', colors: ['white', 'yellow', 'red', 'blue'], shape: 'tulip' },
  { id: 'carnation', nameZh: '康乃馨', colors: ['white', 'yellow', 'red', 'blue'], shape: 'rose' },
  { id: 'hydrangea', nameZh: '繡球花', colors: ['white', 'red', 'blue'], shape: 'cluster' },
  { id: 'lily', nameZh: '百合', colors: ['white', 'yellow', 'red'], shape: 'tulip' },
  { id: 'sunflower', nameZh: '向日葵', colors: ['yellow'], shape: 'sunflower' },
  { id: 'hibiscus', nameZh: '朱槿', colors: ['white', 'yellow', 'red', 'blue'], shape: 'daisy' },
  { id: 'spider_lily', nameZh: '彼岸花', colors: ['white', 'yellow', 'red'], shape: 'cluster' },
  { id: 'cosmos', nameZh: '大波斯菊', colors: ['white', 'yellow', 'red'], shape: 'daisy' },
  { id: 'chrysanthemum', nameZh: '菊花', colors: ['white', 'yellow', 'red', 'blue'], shape: 'sunflower' },
  { id: 'cyclamen', nameZh: '仙客來', colors: ['white', 'red', 'blue'], shape: 'tulip' },
  { id: 'daffodil', nameZh: '水仙花', colors: ['white', 'yellow'], shape: 'daisy' },
  { id: 'hyacinth', nameZh: '風信子', colors: ['white', 'yellow', 'red', 'blue'], shape: 'cluster' },
  { id: 'anemone', nameZh: '銀蓮花', colors: ['white', 'yellow', 'red', 'blue'], shape: 'daisy' },
  { id: 'baby_blue_eyes', nameZh: '粉蝶花', colors: ['white', 'blue'], shape: 'daisy' },
  { id: 'calla_lily', nameZh: '海芋', colors: ['white', 'yellow', 'red'], shape: 'tulip' },
  { id: 'frangipani', nameZh: '雞蛋花', colors: ['white', 'yellow', 'red'], shape: 'daisy' },
  { id: 'gentian', nameZh: '龍膽', colors: ['white', 'blue'], shape: 'tulip' },
  { id: 'cattleya', nameZh: '嘉德麗雅蘭', colors: ['white', 'yellow', 'red'], shape: 'rose' },
  { id: 'lily_of_valley', nameZh: '鈴蘭', colors: ['white', 'red'], shape: 'cluster' },
  { id: 'peony', nameZh: '牡丹', colors: ['white', 'yellow', 'red', 'blue'], shape: 'rose' },
  { id: 'water_lily', nameZh: '睡蓮', colors: ['white', 'yellow', 'red'], shape: 'rose' },
  { id: 'morning_glory', nameZh: '牽牛花', colors: ['white', 'red', 'blue'], shape: 'daisy' },
  { id: 'bougainvillea', nameZh: '九重葛', colors: ['white', 'yellow', 'red'], shape: 'cluster' },
  { id: 'dahlia', nameZh: '大理花', colors: ['white', 'yellow', 'red'], shape: 'sunflower' },
  { id: 'clematis', nameZh: '鐵線蓮', colors: ['white', 'red', 'blue'], shape: 'daisy' },
  { id: 'hellebore', nameZh: '聖誕玫瑰', colors: ['white', 'red'], shape: 'daisy' },
  { id: 'snowdrop', nameZh: '雪花蓮', colors: ['white', 'yellow', 'blue'], shape: 'tulip' },
  { id: 'freesia', nameZh: '小蒼蘭', colors: ['white', 'yellow', 'red'], shape: 'cluster' },
  { id: 'geranium', nameZh: '天竺葵', colors: ['white', 'red', 'blue'], shape: 'cluster' },
  { id: 'iris', nameZh: '鳶尾花', colors: ['white', 'yellow', 'blue'], shape: 'tulip' },
  { id: 'celosia', nameZh: '雞冠花', colors: ['white', 'yellow', 'red'], shape: 'cluster' },
  { id: 'marigold', nameZh: '萬壽菊', colors: ['yellow', 'red'], shape: 'sunflower' },
  { id: 'osmanthus', nameZh: '金木犀', colors: ['yellow'], shape: 'cluster' },
  { id: 'sweet_pea', nameZh: '香豌豆', colors: ['white', 'red', 'blue'], shape: 'daisy' },
  { id: 'salvia', nameZh: '鼠尾草', colors: ['red', 'blue'], shape: 'cluster' },
  { id: 'bird_of_paradise', nameZh: '天堂鳥', colors: ['yellow', 'red'], shape: 'tulip' }
];

export const ALL_PETAL_VARIANTS: PetalVariantMeta[] = FLOWER_SPECIES_CATALOG.flatMap((sp) =>
  sp.colors.map((color) => {
    const id = `${sp.id}_${color}`;
    const prefix = COLOR_PREFIX_ZH[color];
    const displayName = sp.isBase ? `${prefix}花瓣` : `${prefix}${sp.nameZh}`;
    const nectarDisplayName = sp.isBase ? `${prefix}精華` : `${prefix}${sp.nameZh}精華`;
    return {
      id,
      speciesId: sp.id,
      speciesNameZh: sp.nameZh,
      color,
      displayName,
      nectarDisplayName,
      shape: sp.shape,
      isBase: Boolean(sp.isBase)
    };
  })
);

const PETAL_VARIANT_MAP = new Map<string, PetalVariantMeta>(
  ALL_PETAL_VARIANTS.map((v) => [v.id, v])
);

export function getPetalVariantMeta(variantId: string): PetalVariantMeta {
  return PETAL_VARIANT_MAP.get(variantId) || ALL_PETAL_VARIANTS[0];
}

export function createStarterPetalInventory(): Record<string, number> {
  const starterAmounts: Record<string, number> = {
    daisy_white: 191,
    daisy_yellow: 237,
    daisy_red: 277,
    daisy_blue: 96,
    geranium_blue: 145,
    cherry_blossom_white: 264,
    sunflower_yellow: 178,
    spider_lily_red: 118,
    hydrangea_blue: 62,
    lily_of_valley_white: 34,
    rose_red: 215,
    osmanthus_yellow: 84,
    pansy_white: 152,
    hyacinth_blue: 44,
    tulip_red: 135,
    daffodil_yellow: 72,
    anemone_white: 28,
    poinsettia_red: 248,
    cosmos_white: 53,
    gentian_blue: 19,
    peony_red: 108,
    marigold_yellow: 67,
    clematis_blue: 41,
    snowdrop_white: 15
  };
  const inv: Record<string, number> = {};
  for (const v of ALL_PETAL_VARIANTS) {
    inv[v.id] = starterAmounts[v.id] ?? 0;
  }
  return inv;
}

export function createStarterNectarInventory(): Record<string, number> {
  const starterNectar: Record<string, number> = {
    daisy_white: 117,
    daisy_yellow: 114,
    daisy_red: 136,
    daisy_blue: 58,
    geranium_blue: 42,
    cherry_blossom_white: 88,
    sunflower_yellow: 64,
    spider_lily_red: 39,
    hydrangea_blue: 27,
    lily_of_valley_white: 16,
    rose_red: 75,
    osmanthus_yellow: 31,
    pansy_white: 49,
    hyacinth_blue: 22,
    tulip_red: 54,
    daffodil_yellow: 29,
    anemone_white: 14,
    poinsettia_red: 92,
    cosmos_white: 24,
    gentian_blue: 11,
    peony_red: 36,
    marigold_yellow: 25,
    clematis_blue: 18,
    snowdrop_white: 9
  };
  const inv: Record<string, number> = {};
  for (const v of ALL_PETAL_VARIANTS) {
    inv[v.id] = starterNectar[v.id] ?? 0;
  }
  return inv;
}

export interface PrivacyZoneSetting {
  enabled: boolean;
  lat: number;
  lng: number;
  radiusMeters: number; // 50 ~ 300 公尺
}
