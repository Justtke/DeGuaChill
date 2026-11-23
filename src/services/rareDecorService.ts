import {
  DecorCategory,
  DECOR_SUBSETS_CATALOG,
  DeGuaCreature,
  DeGuaVariety,
  ExpeditionItem,
  RareDecorCategoryProgress
} from '../types/game';
import { formatDistrictOnlyPlaceName, getSeedlingPotTitle } from './expeditionService';

/**
 * 具備《Pikmin Bloom》稀有飾品點數升級制的 12 種飾品類別：
 * 餐廳、咖啡廳、麵包店、水邊、美髮院、超市、路邊、公園、藥局、體育館、車站、森林
 */
export const RARE_DECOR_ELIGIBLE_CATEGORIES: DecorCategory[] = [
  'night_market',
  'bubble_tea',
  'bakery',
  'waterside',
  'hair_salon',
  'supermarket',
  'roadside',
  'park',
  'pharmacy',
  'stadium',
  'station',
  'forest'
];

export const RARE_POINTS_PLUCK_NORMAL = 30;
export const RARE_POINTS_PLUCK_HUGE = 200;
export const RARE_POINTS_EARN_REGULAR_DECOR = 200;
export const RARE_POINTS_RELEASE_WITH_DECOR = 20;
export const RARE_POINTS_RELEASE_NO_DECOR = 5;

const ALL_SEVEN_VARIETIES: DeGuaVariety[] = [
  'red',
  'yellow',
  'blue',
  'purple',
  'white',
  'winged',
  'rock'
];

export function isCategoryRareEligible(category: DecorCategory): boolean {
  return RARE_DECOR_ELIGIBLE_CATEGORIES.includes(category);
}

/**
 * 各稀有飾品等級升下一級所需點數：
 * - Lv.1 -> Lv.2（解鎖首批稀有禮物）：800 點
 * - Lv.2 -> Lv.3：1,200 點
 * - Lv.3 -> Lv.4：3,000 點
 * - Lv.4 起每級：5,000 點
 */
export function getRarePointsRequiredForNextLevel(currentLevel: number): number {
  const lv = Math.max(1, currentLevel);
  if (lv === 1) return 800;
  if (lv === 2) return 1200;
  if (lv === 3) return 3000;
  return 5000;
}

/**
 * 檢查指定分類下所有「一般系列與顏色」飾品是否均已收集完畢：
 * 全部集滿後才開啟該分類的「稀有飾品等級進度條」。
 */
export function isRegularCategoryCatalogComplete(
  creatures: DeGuaCreature[],
  category: DecorCategory
): boolean {
  const subsets = (DECOR_SUBSETS_CATALOG[category] || []).filter((s) => !s.isRare);
  if (subsets.length === 0) return false;
  const unlocked = creatures.filter((c) => c.hasDecor && c.decor === category);

  return subsets.every((sub) => {
    const reqVars = sub.varieties || ALL_SEVEN_VARIETIES;
    return reqVars.every((v) =>
      unlocked.some(
        (c) => c.variety === v && (!c.decorSetId || c.decorSetId === sub.setId)
      )
    );
  });
}

export type RareDecorProgressMap = Partial<Record<DecorCategory, RareDecorCategoryProgress>>;

/**
 * 根據全體圖鑑重算已解鎖的稀有類別狀態（若集滿一般圖鑑但尚未建檔，預設開啟為 Lv.1、0 點）
 */
export function syncUnlockedRareProgressMap(
  currentMap: RareDecorProgressMap,
  creatures: DeGuaCreature[]
): RareDecorProgressMap {
  let changed = false;
  const next: RareDecorProgressMap = { ...currentMap };
  for (const cat of RARE_DECOR_ELIGIBLE_CATEGORIES) {
    if (isRegularCategoryCatalogComplete(creatures, cat) && !next[cat]) {
      next[cat] = { level: 1, points: 0, pendingGifts: 0 };
      changed = true;
    }
  }
  return changed ? next : currentMap;
}

/**
 * 累加指定分類的稀有飾品點數；必須在該分類已集齊一般飾品後才會累計並自動升等發放稀有禮物機會。
 */
export function awardRareDecorPoints(
  currentMap: RareDecorProgressMap,
  creatures: DeGuaCreature[],
  category: DecorCategory,
  deltaPoints: number
): {
  nextMap: RareDecorProgressMap;
  leveledUpTo: number | null;
  pointsAdded: number;
} {
  if (deltaPoints <= 0 || !isCategoryRareEligible(category)) {
    return { nextMap: currentMap, leveledUpTo: null, pointsAdded: 0 };
  }
  const unlocked = isRegularCategoryCatalogComplete(creatures, category);
  if (!unlocked) {
    return { nextMap: currentMap, leveledUpTo: null, pointsAdded: 0 };
  }

  const prev = currentMap[category] || { level: 1, points: 0, pendingGifts: 0 };
  let level = Math.max(1, prev.level);
  let points = prev.points + deltaPoints;
  let pendingGifts = prev.pendingGifts;
  let leveledUpTo: number | null = null;

  while (points >= getRarePointsRequiredForNextLevel(level)) {
    points -= getRarePointsRequiredForNextLevel(level);
    level += 1;
    pendingGifts += 1;
    leveledUpTo = level;
  }

  return {
    nextMap: {
      ...currentMap,
      [category]: { level, points, pendingGifts }
    },
    leveledUpTo,
    pointsAdded: deltaPoints
  };
}

/**
 * 取得指定分類中尚未取得該稀有飾品、可供指派去領取稀有禮物的同類別一般飾品地瓜球
 */
export function getEligibleCreaturesForRareGift(
  creatures: DeGuaCreature[],
  category: DecorCategory
): DeGuaCreature[] {
  const rareSub = (DECOR_SUBSETS_CATALOG[category] || []).find((s) => s.isRare);
  const allowedVars = rareSub?.varieties;
  return creatures.filter(
    (c) =>
      c.decor === category &&
      c.hasDecor &&
      !c.isRareDecor &&
      c.busyState === 'free' &&
      (!allowedVars || allowedVars.includes(c.variety))
  );
}

/**
 * 建立金色「稀有飾品特殊探險」項目
 */
export function buildRareGiftExpeditionItem(
  creature: DeGuaCreature,
  playerLat: number,
  playerLng: number
): ExpeditionItem {
  const rareSub = (DECOR_SUBSETS_CATALOG[creature.decor] || []).find((s) => s.isRare);
  const dist = Math.max(
    180,
    Math.round(
      Math.hypot((creature.lat - playerLat) * 111_000, (creature.lng - playerLng) * 102_000)
    )
  );
  return {
    id: `exp_rare_${creature.id}_${Date.now()}`,
    kind: 'gift',
    title: `${getSeedlingPotTitle(creature.variety, false).replace('瓜糰', '')}稀有禮品`,
    placeName: formatDistrictOnlyPlaceName(creature.placeName, creature.lat, creature.lng),
    lat: creature.lat,
    lng: creature.lng,
    distanceMeters: dist,
    requiredStrength: 1,
    maxCarriers: 1,
    weightGrams: 50,
    discoveredAt: creature.createdAt,
    seedlingVariety: creature.variety,
    seedlingDecor: creature.decor,
    targetCreatureId: creature.id,
    isRareGift: true,
    rareDecorSetId: rareSub?.setId,
    status: 'available',
    assignedCreatureIds: [creature.id]
  };
}
