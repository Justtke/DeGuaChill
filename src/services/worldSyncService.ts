import {
  BigFlowerNode,
  DecorCategory,
  DeGuaVariety,
  ExpeditionItem,
  MUSHROOM_CATALOG,
  MushroomElement,
  MushroomNode,
  MushroomSizeLabel,
  PetalColor,
  PlantedFlowerCell
} from '../types/game';
import { getNearestRealLandmarkInfo } from './realMapService';
import {
  formatDistrictOnlyPlaceName,
  getFruitExpeditionSpecs,
  getSeedlingExpeditionSpecs,
  getSeedlingPotTitle
} from './expeditionService';

export interface WorldDeltaState {
  flowers: Record<string, PlantedFlowerCell>;
  bigFlowerStates: Record<
    string,
    {
      currentFlowers: number;
      colorVotes: Record<PetalColor, number>;
      bloomedColor: PetalColor | null;
      bloomedAt: number | null;
    }
  >;
  mushroomStates: Record<
    string,
    {
      currentHp: number;
      participants: { playerName: string; power: number; joinedAt: number }[];
    }
  >;
  updatedAt: number;
}

const WORLD_STORAGE_KEY = 'deguachill_world_state_v6';

/**
 * 確定性雜湊函式：確保兩支 iPhone 在相同經緯度網格永遠算出 100% 相同的大花與蘑菇配置
 */
function deterministicHash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function latLngToGridCell(lat: number, lng: number): {
  gridId: string;
  centerLat: number;
  centerLng: number;
} {
  const step = 0.00009; // 約 10 公尺網格
  const qLat = Math.round(lat / step) * step;
  const qLng = Math.round(lng / step) * step;
  const fixedLat = Number(qLat.toFixed(5));
  const fixedLng = Number(qLng.toFixed(5));
  return {
    gridId: `${fixedLat}_${fixedLng}`,
    centerLat: fixedLat,
    centerLng: fixedLng
  };
}

// 完整涵蓋「一般色菇、小色菇、全部 5 種元素菇（火/水/電/毒/水晶 一般與大）、大色菇」（雙人遊玩版不含活動輝煌蘑菇）
const SHOWCASE_MUSHROOM_PRESETS: { element: MushroomElement; sizeLabel: MushroomSizeLabel }[] = [
  { element: 'red', sizeLabel: '一般' },
  { element: 'fire', sizeLabel: '大' },
  { element: 'water', sizeLabel: '一般' },
  { element: 'electric', sizeLabel: '一般' },
  { element: 'poison', sizeLabel: '一般' },
  { element: 'crystal', sizeLabel: '大' },
  { element: 'yellow', sizeLabel: '小' },
  { element: 'blue', sizeLabel: '一般' },
  { element: 'purple', sizeLabel: '一般' },
  { element: 'red', sizeLabel: '小' },
  { element: 'blue', sizeLabel: '小' },
  { element: 'purple', sizeLabel: '小' },
  { element: 'white', sizeLabel: '一般' },
  { element: 'white', sizeLabel: '小' },
  { element: 'pink', sizeLabel: '小' },
  { element: 'ice', sizeLabel: '小' },
  { element: 'gray', sizeLabel: '小' },
  { element: 'gray', sizeLabel: '一般' },
  { element: 'fire', sizeLabel: '一般' },
  { element: 'water', sizeLabel: '大' },
  { element: 'electric', sizeLabel: '大' },
  { element: 'poison', sizeLabel: '大' },
  { element: 'crystal', sizeLabel: '一般' },
  { element: 'yellow', sizeLabel: '一般' },
  { element: 'pink', sizeLabel: '一般' },
  { element: 'ice', sizeLabel: '一般' },
  { element: 'yellow', sizeLabel: '大' },
  { element: 'red', sizeLabel: '大' },
  { element: 'blue', sizeLabel: '大' },
  { element: 'purple', sizeLabel: '大' }
];

/**
 * 依據經緯度確定性生成周圍的大花 (Big Flowers) 與蘑菇 (Mushrooms)，並套用世界同步狀態
 * 不論哪支手機、何時打開，相同座標永遠長出完全相同的蘑菇與大花！
 */
export function getDeterministicWorldAround(
  lat: number,
  lng: number,
  worldDelta: WorldDeltaState
): {
  bigFlowers: BigFlowerNode[];
  mushrooms: MushroomNode[];
} {
  const sectorStep = 0.0029; // 約 320 公尺一個世界區塊，確保縮放地圖時蘑菇間距寬敞不重疊
  const baseSectorLat = Math.round(lat / sectorStep);
  const baseSectorLng = Math.round(lng / sectorStep);
  const todayKey = new Date().toISOString().slice(0, 10); // 每日蘑菇配置全服一致

  const bigFlowers: BigFlowerNode[] = [];
  const mushrooms: MushroomNode[] = [];
  const usedNames = new Set<string>();
  const usedPhotos = new Set<string>();

  // 依距離玩家由近到遠排序區塊，讓身邊與探險列表直接涵蓋小色菇、所有元素菇與大菇
  const offsets: { dLat: number; dLng: number; dist: number }[] = [];
  for (let dLat = -3; dLat <= 3; dLat++) {
    for (let dLng = -3; dLng <= 3; dLng++) {
      offsets.push({ dLat, dLng, dist: Math.hypot(dLat, dLng) });
    }
  }
  offsets.sort((a, b) => a.dist - b.dist);

  let mushSlotIndex = 0;

  for (const { dLat, dLng } of offsets) {
    const sLat = baseSectorLat + dLat;
    const sLng = baseSectorLng + dLng;
    const sectorId = `sec_${sLat}_${sLng}`;
    const h = deterministicHash(sectorId);

    const offsetLat = ((h % 1000) / 1000 - 0.5) * 0.0012;
    const offsetLng = (((h >>> 10) % 1000) / 1000 - 0.5) * 0.0012;

    const nodeLat = Number((sLat * sectorStep + offsetLat).toFixed(5));
    const nodeLng = Number((sLng * sectorStep + offsetLng).toFixed(5));
    const lmInfo = getNearestRealLandmarkInfo(nodeLat, nodeLng, h, usedNames, usedPhotos);

    if ((h % 5) !== 0 && (sLat + sLng) % 2 === 0) {
      const bfId = `bf_${sLat}_${sLng}`;
      const saved = worldDelta.bigFlowerStates[bfId];
      const defaultInitial = (h % 6) * 45;
      bigFlowers.push({
        id: bfId,
        name: lmInfo.name,
        landmarkName: lmInfo.name,
        photoUrl: lmInfo.photoUrl,
        lat: nodeLat,
        lng: nodeLng,
        currentFlowers: saved ? saved.currentFlowers : defaultInitial,
        requiredFlowers: 300,
        colorVotes: saved
          ? saved.colorVotes
          : { white: defaultInitial, yellow: 0, red: 0, blue: 0 },
        bloomedColor: saved ? saved.bloomedColor : null,
        bloomedAt: saved ? saved.bloomedAt : null
      });
    } else if ((h % 2) === 0 || mushSlotIndex < SHOWCASE_MUSHROOM_PRESETS.length) {
      const mushId = `mush_${sLat}_${sLng}_${todayKey}`;
      const preset =
        mushSlotIndex < SHOWCASE_MUSHROOM_PRESETS.length
          ? SHOWCASE_MUSHROOM_PRESETS[mushSlotIndex]
          : SHOWCASE_MUSHROOM_PRESETS[deterministicHash(mushId) % SHOWCASE_MUSHROOM_PRESETS.length];
      mushSlotIndex++;

      const element = preset.element;
      const catalogEntry = MUSHROOM_CATALOG[element];
      const sizeLabel: MushroomSizeLabel = preset.sizeLabel;
      const maxHp = catalogEntry.hpBySize[sizeLabel] || 648000;
      const saved = worldDelta.mushroomStates[mushId];
      const hasParticipants = Boolean(
        saved && Array.isArray(saved.participants) && saved.participants.length > 0
      );
      const currentHp = hasParticipants
        ? Math.max(0, Math.min(maxHp, saved!.currentHp))
        : maxHp;

      mushrooms.push({
        id: mushId,
        name: `${sizeLabel} ${catalogEntry.typeLabel}`,
        landmarkName: lmInfo.name,
        photoUrl: lmInfo.photoUrl,
        sizeLabel,
        element,
        colorHex: catalogEntry.colorHex,
        lat: nodeLat,
        lng: nodeLng,
        maxHp,
        currentHp,
        participants: hasParticipants ? saved!.participants : [],
        rewardColor: catalogEntry.reward
      });
    }
  }

  return { bigFlowers, mushrooms };
}

export function loadLocalWorldState(): WorldDeltaState {
  try {
    const raw = localStorage.getItem(WORLD_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as WorldDeltaState;
    }
  } catch {
    // ignore
  }
  return {
    flowers: {},
    bigFlowerStates: {},
    mushroomStates: {},
    updatedAt: Date.now()
  };
}

export function saveLocalWorldState(state: WorldDeltaState): void {
  try {
    localStorage.setItem(WORLD_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

/**
 * 將世界狀態（花海、大花盛開進度、蘑菇血量與參戰者）與共用雲端資料庫同步
 * 確保兩個人在任何時間打開 App，看到的都是同一個同步的世界！
 */
export async function syncWorldStateWithCloud(
  cloudUrl: string,
  worldKey: string,
  localState: WorldDeltaState
): Promise<WorldDeltaState> {
  saveLocalWorldState(localState);
  const cleanUrl = cloudUrl.trim().replace(/\/+$/, '');
  if (!cleanUrl.startsWith('http')) {
    return localState;
  }

  const endpoint = `${cleanUrl}/worlds/${encodeURIComponent(worldKey)}.json`;
  try {
    const getRes = await fetch(endpoint);
    let merged: WorldDeltaState = { ...localState };

    if (getRes.ok) {
      const remote = (await getRes.json()) as WorldDeltaState | null;
      if (remote && typeof remote === 'object') {
        // 合併花海（取較多花數或較新時間）
        const mergedFlowers: Record<string, PlantedFlowerCell> = { ...(remote.flowers || {}) };
        for (const [k, cell] of Object.entries(localState.flowers)) {
          const rCell = mergedFlowers[k];
          if (!rCell || cell.updatedAt >= rCell.updatedAt || cell.count > rCell.count) {
            mergedFlowers[k] = cell;
          }
        }

        // 合併大花進度（取較高花朵累積數）
        const mergedBF: WorldDeltaState['bigFlowerStates'] = { ...(remote.bigFlowerStates || {}) };
        for (const [k, bf] of Object.entries(localState.bigFlowerStates)) {
          const rBf = mergedBF[k];
          if (!rBf || bf.currentFlowers >= rBf.currentFlowers) {
            mergedBF[k] = bf;
          }
        }

        // 合併蘑菇戰鬥血量（取較低剩餘血量並聯集參戰玩家）
        const mergedMush: WorldDeltaState['mushroomStates'] = { ...(remote.mushroomStates || {}) };
        for (const [k, m] of Object.entries(localState.mushroomStates)) {
          const rM = mergedMush[k];
          if (!rM) {
            mergedMush[k] = m;
          } else {
            const pMap = new Map<string, { playerName: string; power: number; joinedAt: number }>();
            for (const p of [...(rM.participants || []), ...(m.participants || [])]) {
              pMap.set(p.playerName, p);
            }
            mergedMush[k] = {
              currentHp: Math.min(rM.currentHp, m.currentHp),
              participants: Array.from(pMap.values())
            };
          }
        }

        merged = {
          flowers: mergedFlowers,
          bigFlowerStates: mergedBF,
          mushroomStates: mergedMush,
          updatedAt: Date.now()
        };
      }
    }

    await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged)
    });

    saveLocalWorldState(merged);
    return merged;
  } catch {
    return localState;
  }
}

const FRUITS: { emoji: string; name: string; color: PetalColor; baseWeight: number }[] = [
  { emoji: '🍏', name: '青蘋果', color: 'white', baseWeight: 321 },
  { emoji: '🍋', name: '檸檬', color: 'yellow', baseWeight: 268 },
  { emoji: '🍎', name: '紅蘋果', color: 'red', baseWeight: 346 },
  { emoji: '🍊', name: '橘子', color: 'yellow', baseWeight: 295 },
  { emoji: '🍑', name: '水蜜桃', color: 'red', baseWeight: 312 },
  { emoji: '🫐', name: '藍莓', color: 'blue', baseWeight: 144 }
];

const VARIETY_LIST: DeGuaVariety[] = ['red', 'yellow', 'blue', 'purple', 'white', 'winged', 'rock'];

/**
 * 探測器 (Detector) 掃描目前座標附近的真實 OpenStreetMap 飾品分類與產出「探險 (Expeditions)」項目
 */
export async function triggerDetectorScan(
  lat: number,
  lng: number
): Promise<{
  nearbyDecors: DecorCategory[];
  newExpeditions: ExpeditionItem[];
}> {
  const query = `
    [out:json][timeout:5];
    node(around:180,${lat},${lng})["name"];
    out 15;
  `;

  const discoveredPlaces: { name: string; decor: DecorCategory; lat: number; lng: number }[] = [];

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: `data=${encodeURIComponent(query)}`
    });
    if (res.ok) {
      const data = await res.json();
      for (const el of data.elements || []) {
        const tags = el.tags || {};
        const name = tags.name;
        if (!name) continue;
        let decor: DecorCategory = 'roadside';
        if (tags.amenity === 'cafe' || /茶|飲|咖啡|50嵐|清心|迷客夏|路易莎|星巴克/i.test(name)) {
          decor = 'bubble_tea';
        } else if (tags.shop === 'convenience' || /7-ELEVEN|全家|萊爾富|OK超商/i.test(name)) {
          decor = 'convenience';
        } else if (tags.shop === 'bakery' || /麵包|烘焙|法棍|可頌/i.test(name)) {
          decor = 'bakery';
        } else if (/甜點|蛋糕|馬卡龍|甜甜圈|pastry|dessert/i.test(name) || tags.shop === 'pastry') {
          decor = 'dessert';
        } else if (/拉麵|ramen|豚骨/i.test(name)) {
          decor = 'ramen';
        } else if (/壽司|sushi|爭鮮|藏壽司/i.test(name)) {
          decor = 'sushi';
        } else if (/咖哩|curry/i.test(name)) {
          decor = 'curry';
        } else if (/漢堡|麥當勞|摩斯|burger/i.test(name)) {
          decor = 'hamburger';
        } else if (tags.shop === 'supermarket' || /全聯|家樂福|大潤發|超市/i.test(name)) {
          decor = 'supermarket';
        } else if (tags.amenity === 'pharmacy' || /藥局|屈臣氏|康是美/i.test(name)) {
          decor = 'pharmacy';
        } else if (tags.amenity === 'post_office' || /郵局/i.test(name)) {
          decor = 'post_office';
        } else if (tags.shop === 'hairdresser' || /美髮|髮廊|理髮|小林|曼都/i.test(name)) {
          decor = 'hair_salon';
        } else if (tags.shop === 'clothes' || /服飾|UNIQLO|NET/i.test(name)) {
          decor = 'clothing';
        } else if (tags.shop === 'books' || tags.amenity === 'library' || /書店|圖書館|誠品/i.test(name)) {
          decor = 'book';
        } else if (tags.amenity === 'cinema' || /影城|電影|威秀|國賓/i.test(name)) {
          decor = 'cinema';
        } else if (tags.tourism === 'museum' || /美術館|博物館|展覽/i.test(name)) {
          decor = 'art_gallery';
        } else if (tags.leisure === 'park' || /公園|綠地/i.test(name)) {
          decor = 'park';
        } else if (tags.natural === 'water' || tags.waterway || /河濱|水岸|湖|溪/i.test(name)) {
          decor = 'waterside';
        } else if (/森林|林蔭|植物園/i.test(name)) {
          decor = 'forest';
        } else if (/山|步道|百岳/i.test(name)) {
          decor = 'mountain';
        } else if (/海邊|漁港|沙灘/i.test(name)) {
          decor = 'beach';
        } else if (tags.railway || /捷運|車站|高鐵|台鐵|站/i.test(name)) {
          decor = 'station';
        } else if (tags.aeroway || /機場|航廈/i.test(name)) {
          decor = 'airport';
        } else if (/動物園/i.test(name)) {
          decor = 'zoo';
        } else if (tags.amenity === 'restaurant' || /餐廳|夜市|小吃|麵|飯/i.test(name)) {
          decor = 'night_market';
        }
        discoveredPlaces.push({ name, decor, lat: el.lat || lat, lng: el.lon || lng });
      }
    }
  } catch {
    // fallback if offline
  }

  if (discoveredPlaces.length < 2) {
    discoveredPlaces.push(
      { name: '巷口手搖茶飲店', decor: 'bubble_tea', lat: lat + 0.0006, lng: lng - 0.0004 },
      { name: '轉角便利超商', decor: 'convenience', lat: lat - 0.0005, lng: lng + 0.0006 },
      { name: '街角手工烘焙坊', decor: 'bakery', lat: lat + 0.0004, lng: lng + 0.0005 }
    );
  }

  const uniqueDecors = Array.from(new Set(discoveredPlaces.map((d) => d.decor)));
  const pickedPlace1 = discoveredPlaces[Math.floor(Math.random() * discoveredPlaces.length)];
  const pickedPlace2 = discoveredPlaces[(Math.floor(Math.random() * discoveredPlaces.length) + 1) % discoveredPlaces.length];
  const fruit = FRUITS[Math.floor(Math.random() * FRUITS.length)];
  const variety = VARIETY_LIST[Math.floor(Math.random() * VARIETY_LIST.length)];
  const isHuge = Math.random() < 0.22;
  const now = Date.now();
  const seedSpecs = getSeedlingExpeditionSpecs(variety, isHuge, Math.floor(now % 100));
  const fruitWeight = fruit.baseWeight + Math.floor(Math.random() * 45) - 18;
  const fruitSpecs = getFruitExpeditionSpecs(fruit.color, fruitWeight);

  const newExpeditions: ExpeditionItem[] = [
    {
      id: `exp_seed_${now}_1`,
      kind: 'seedling',
      title: getSeedlingPotTitle(variety, isHuge),
      placeName: formatDistrictOnlyPlaceName(pickedPlace1.name, pickedPlace1.lat, pickedPlace1.lng),
      lat: pickedPlace1.lat,
      lng: pickedPlace1.lng,
      distanceMeters: 85 + Math.floor(Math.random() * 140),
      requiredStrength: seedSpecs.requiredStrength,
      maxCarriers: seedSpecs.maxCarriers,
      weightGrams: seedSpecs.weightGrams,
      discoveredAt: now,
      expiresAt: now + 3 * 86_400_000,
      seedlingVariety: variety,
      seedlingDecor: pickedPlace1.decor,
      seedlingIsHuge: isHuge,
      status: 'available',
      assignedCreatureIds: []
    },
    {
      id: `exp_fruit_${now}_2`,
      kind: 'fruit',
      title: fruit.name,
      placeName: formatDistrictOnlyPlaceName(pickedPlace2.name, pickedPlace2.lat, pickedPlace2.lng),
      lat: pickedPlace2.lat,
      lng: pickedPlace2.lng,
      distanceMeters: 95 + Math.floor(Math.random() * 160),
      requiredStrength: fruitSpecs.requiredStrength,
      maxCarriers: fruitSpecs.maxCarriers,
      weightGrams: fruitWeight,
      discoveredAt: now,
      expiresAt: now + 3 * 86_400_000,
      fruitEmoji: fruit.emoji,
      fruitName: fruit.name,
      nectarColor: fruit.color,
      nectarAmount: fruitSpecs.nectarAmount,
      status: 'available',
      assignedCreatureIds: []
    }
  ];

  return {
    nearbyDecors: uniqueDecors,
    newExpeditions
  };
}
