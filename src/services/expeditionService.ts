import {
  DECOR_SUBSETS_CATALOG,
  DecorCategory,
  DeGuaCreature,
  DeGuaVariety,
  ExpeditionItem,
  PetalColor,
  VARIETY_CATALOG
} from '../types/game';

/**
 * 依據《Pikmin Bloom》探險搬運公式實作：
 * 1. 四種速度體系（混合時羽翅喪失飛行倍率降為標準 1.0 倍）：
 *    - 疾速組（粉紅 winged 純色）：speedFactor = 0.2（去程 20.0 m/s、基礎搬運 5.0 m/s）
 *    - 快速組（白玉 white）：speedFactor = 0.5（去程 8.0 m/s、基礎搬運 2.0 m/s）
 *    - 標準組（紅/黃/藍）：speedFactor = 1.0（去程 4.0 m/s、基礎搬運 1.0 m/s）
 *    - 重裝組（紫/岩石）：speedFactor = 1.25（去程 3.2 m/s、基礎搬運 0.8 m/s）
 * 2. 單隻力量（carryStrength）：紫 5、岩石 3、其餘 1。
 * 3. 去程時間 = ceil((單程距離 / 去程均速) / 60) 分鐘；回程時間 = ceil((單程距離 / (基礎搬運均速 × 總力量 / 需求力量)) / 60) 分鐘。
 */
export function getMemberSpeedFactor(variety: DeGuaVariety, allWinged: boolean): number {
  if (variety === 'winged') {
    return allWinged ? 0.2 : 1.0;
  }
  if (variety === 'white') return 0.5;
  if (variety === 'purple' || variety === 'rock') return 1.25;
  return 1.0;
}

export interface ExpeditionDurationEstimate {
  outboundMs: number;
  inboundMs: number;
  totalMs: number;
  outboundMinutes: number;
  inboundMinutes: number;
  totalMinutes: number;
  totalStrength: number;
  allWinged: boolean;
  isValid: boolean;
}

export function calculateExpeditionDuration(
  distanceMeters: number,
  requiredStrength: number,
  squadCreatures: DeGuaCreature[]
): ExpeditionDurationEstimate {
  const safeDist = Math.max(10, distanceMeters);
  const safeReq = Math.max(1, requiredStrength);

  if (squadCreatures.length === 0) {
    return {
      outboundMs: 0,
      inboundMs: 0,
      totalMs: 0,
      outboundMinutes: 0,
      inboundMinutes: 0,
      totalMinutes: 0,
      totalStrength: 0,
      allWinged: false,
      isValid: false
    };
  }

  const allWinged = squadCreatures.every((c) => c.variety === 'winged');
  const totalStrength = squadCreatures.reduce(
    (sum, c) => sum + VARIETY_CATALOG[c.variety].carryStrength,
    0
  );
  const sumFactor = squadCreatures.reduce(
    (sum, c) => sum + getMemberSpeedFactor(c.variety, allWinged),
    0
  );
  const sAvg = Math.max(0.2, sumFactor / squadCreatures.length);

  const outboundSpeedMps = 4.0 / sAvg;
  const carryBaseMps = 1.0 / sAvg;
  const carryActualMps = carryBaseMps * (totalStrength / safeReq);

  const outboundMinutes = Math.max(1, Math.ceil(safeDist / outboundSpeedMps / 60));
  const inboundMinutes = Math.max(1, Math.ceil(safeDist / Math.max(0.05, carryActualMps) / 60));
  const totalMinutes = outboundMinutes + inboundMinutes;

  return {
    outboundMs: outboundMinutes * 60_000,
    inboundMs: inboundMinutes * 60_000,
    totalMs: totalMinutes * 60_000,
    outboundMinutes,
    inboundMinutes,
    totalMinutes,
    totalStrength,
    allWinged,
    isValid: totalStrength >= safeReq
  };
}

export function getSeedlingExpeditionSpecs(
  variety: DeGuaVariety,
  isHuge: boolean,
  seedHint = 1
): { requiredStrength: number; maxCarriers: number; weightGrams: number } {
  const jitter = Math.abs(seedHint) % 45;
  if (isHuge) {
    return { requiredStrength: 5, maxCarriers: 12, weightGrams: 245 + (jitter % 75) };
  }
  if (variety === 'white') {
    return { requiredStrength: 3, maxCarriers: 6, weightGrams: 60 + jitter };
  }
  if (variety === 'purple') {
    return { requiredStrength: 3, maxCarriers: 6, weightGrams: 210 + jitter };
  }
  if (variety === 'winged') {
    return { requiredStrength: 5, maxCarriers: 10, weightGrams: 70 + jitter };
  }
  if (variety === 'rock') {
    return { requiredStrength: 5, maxCarriers: 10, weightGrams: 220 + jitter };
  }
  return { requiredStrength: 1, maxCarriers: 2, weightGrams: 65 + jitter };
}

export function getSeedlingPotTitle(variety: DeGuaVariety, isHuge?: boolean): string {
  if (isHuge) return '大瓜糰';
  return VARIETY_CATALOG[variety]?.potName || '白色瓜糰';
}

export function formatDistrictOnlyPlaceName(
  rawPlaceName?: string,
  lat?: number,
  lng?: number
): string {
  const cleaned = (rawPlaceName || '')
    .replace(/附近/g, '')
    .replace(/^(台灣|臺灣|臺北市|台北市|新北市|桃園市|臺中市|台中市|臺南市|台南市|高雄市)\s*/, '')
    .trim();

  // 優先抽取「XX區」
  const districtMatch = cleaned.match(/([\u4e00-\u9fa5]{1,4}區)/);
  if (districtMatch) return districtMatch[1];

  // 次之抽取「XX市 / XX鎮 / XX鄉」
  const cityMatch = cleaned.match(/([\u4e00-\u9fa5]{2,4}[市鎮鄉])/);
  if (cityMatch) return cityMatch[1];

  // 若原字串只是門市／景點名（例如「街角手搖茶飲店 附近」、「散步公園步道 附近」），依座標轉為所屬行政區
  if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
    if (lat >= 25.042 && lat <= 25.085 && lng >= 121.502 && lng < 121.525) return '大同區';
    if (lat >= 25.042 && lat <= 25.090 && lng >= 121.525 && lng <= 121.560) return '中山區';
    if (lat >= 25.015 && lat < 25.046 && lng >= 121.520 && lng < 121.555) return '大安區';
    if (lat >= 25.015 && lat < 25.055 && lng >= 121.555 && lng <= 121.590) return '信義區';
    if (lat >= 25.025 && lat < 25.046 && lng >= 121.495 && lng < 121.520) return '中正區';
    if (lat >= 24.93 && lat <= 24.98 && lng >= 121.32 && lng <= 121.38) return '鶯歌區';
    if (lat >= 24.98 && lat <= 25.02 && lng >= 121.49 && lng <= 121.53) return '中和區';
    return '大安區';
  }

  return cleaned || '大安區';
}

export function getFruitExpeditionSpecs(
  nectarColor: PetalColor,
  weightGrams: number
): { requiredStrength: number; maxCarriers: number; nectarAmount: number } {
  // 白/黃/紅水果：重量 / 10；藍色系水果：重量 / 8
  const divisor = nectarColor === 'blue' ? 8 : 10;
  const nectarAmount = Math.max(3, Math.floor(weightGrams / divisor));
  const requiredStrength = weightGrams >= 160 ? 6 : 3;
  const maxCarriers = weightGrams >= 160 ? 12 : 6;
  return { requiredStrength, maxCarriers, nectarAmount };
}

export function normalizeExpeditionItem(
  exp: ExpeditionItem,
  creatures: DeGuaCreature[],
  fallbackNowMs: number = Date.now()
): ExpeditionItem {
  const cleanArea = formatDistrictOnlyPlaceName(exp.placeName, exp.lat, exp.lng);

  if (exp.kind === 'gift') {
    const target = exp.targetCreatureId
      ? creatures.find((c) => c.id === exp.targetCreatureId)
      : undefined;
    const variety = exp.seedlingVariety ?? target?.variety ?? 'red';
    return {
      ...exp,
      title: `${getSeedlingPotTitle(variety, false).replace('瓜糰', '')}禮品`,
      placeName: cleanArea,
      requiredStrength: 1,
      maxCarriers: 1,
      weightGrams: exp.weightGrams ?? 50,
      discoveredAt: exp.discoveredAt ?? target?.createdAt ?? fallbackNowMs,
      seedlingVariety: variety,
      seedlingDecor: exp.seedlingDecor ?? target?.decor ?? 'roadside'
    };
  }

  if (exp.kind === 'fruit') {
    const defaultWeight = exp.nectarColor === 'blue' ? 144 : exp.fruitEmoji === '🍋' ? 268 : 321;
    const weightGrams = exp.weightGrams ?? defaultWeight;
    const specs = getFruitExpeditionSpecs(exp.nectarColor || 'white', weightGrams);
    const shortFruitTitle = (exp.fruitName || exp.title || '青蘋果')
      .replace(/^屏東四季/, '')
      .replace(/^梨山蜜/, '')
      .replace(/^拉拉山/, '')
      .replace(/^高山(.*)串$/, '$1')
      .replace(/^大花盛開大/, '');
    return {
      ...exp,
      title: shortFruitTitle,
      fruitName: shortFruitTitle,
      placeName: cleanArea,
      weightGrams,
      requiredStrength: Math.max(specs.requiredStrength, exp.requiredStrength || specs.requiredStrength),
      maxCarriers: exp.maxCarriers || specs.maxCarriers,
      nectarAmount: exp.nectarAmount ?? specs.nectarAmount,
      discoveredAt: exp.discoveredAt ?? fallbackNowMs,
      expiresAt: exp.expiresAt ?? fallbackNowMs + 3 * 86400_000
    };
  }

  // 若是舊版「野生瓜糰」殘留資料，依預設轉成對應顏色（白色）或保留色種
  const rawWasWild = exp.title === '野生瓜糰' || exp.title === '野生花苗';
  const variety: DeGuaVariety = rawWasWild && !exp.seedlingVariety ? 'white' : (exp.seedlingVariety || 'white');
  const isHuge = Boolean(exp.seedlingIsHuge);
  const hashSeed = exp.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const specs = getSeedlingExpeditionSpecs(variety, isHuge, hashSeed);
  return {
    ...exp,
    title: getSeedlingPotTitle(variety, isHuge),
    placeName: cleanArea,
    seedlingVariety: variety,
    seedlingDecor: exp.seedlingDecor || 'roadside',
    weightGrams: exp.weightGrams ?? specs.weightGrams,
    requiredStrength: specs.requiredStrength,
    maxCarriers: specs.maxCarriers,
    discoveredAt: exp.discoveredAt ?? fallbackNowMs,
    expiresAt: exp.expiresAt ?? fallbackNowMs + 3 * 86400_000
  };
}

/**
 * 自動選取達到最低需求力量、且最快完成的最小隻數組合（上限 maxCarriers）：
 * 優先嘗試純粉紅羽翅小隊，否則挑選兼顧力量與高速的地瓜球。
 */
export function autoSelectMinimumSquad(
  freeCreatures: DeGuaCreature[],
  requiredStrength: number,
  maxCarriers: number
): string[] {
  const req = Math.max(1, requiredStrength);
  const cap = Math.max(1, maxCarriers);
  if (freeCreatures.length === 0) return [];

  // 1. 若有足夠的純粉紅羽翅（需每隻力量1，共 req 隻 <= cap），純粉紅永遠最快！
  const wingedPool = freeCreatures.filter((c) => c.variety === 'winged');
  if (req <= cap && wingedPool.length >= req) {
    return wingedPool.slice(0, req).map((c) => c.id);
  }

  // 2. 次優：純白色（2倍速、每隻力量1）
  const whitePool = freeCreatures.filter((c) => c.variety === 'white');
  if (req <= cap && whitePool.length >= req) {
    return whitePool.slice(0, req).map((c) => c.id);
  }

  // 3. 一般／重裝最速組合：先依「單隻速度權重 / 力量效率」排序，若標準高於需求則選最快，否則補重裝力量
  const bySpeedThenStrength = [...freeCreatures].sort((a, b) => {
    const sa = getMemberSpeedFactor(a.variety, false);
    const sb = getMemberSpeedFactor(b.variety, false);
    const pa = VARIETY_CATALOG[a.variety].carryStrength;
    const pb = VARIETY_CATALOG[b.variety].carryStrength;
    if (Math.abs(sa - sb) > 0.05) return sa - sb;
    return pb - pa;
  });

  // 檢查純依速度優先湊到 cap 隻是否能達標；若不夠則改以力量降序補齊
  const fastPick: string[] = [];
  let fastStr = 0;
  for (const c of bySpeedThenStrength) {
    if (fastPick.length >= cap || fastStr >= req) break;
    fastPick.push(c.id);
    fastStr += VARIETY_CATALOG[c.variety].carryStrength;
  }
  if (fastStr >= req) return fastPick;

  const byPower = [...freeCreatures].sort((a, b) => {
    const pa = VARIETY_CATALOG[a.variety].carryStrength;
    const pb = VARIETY_CATALOG[b.variety].carryStrength;
    if (pb !== pa) return pb - pa;
    return (
      getMemberSpeedFactor(a.variety, false) -
      getMemberSpeedFactor(b.variety, false)
    );
  });

  const powerPick: string[] = [];
  let powerStr = 0;
  for (const c of byPower) {
    if (powerPick.length >= cap || powerStr >= req) break;
    powerPick.push(c.id);
    powerStr += VARIETY_CATALOG[c.variety].carryStrength;
  }
  return powerPick;
}

/**
 * 判斷指定飾品分類＋顏色是否已於圖鑑集滿：
 * 後方分類圖示亮起黃色 = 該分類一般系列裡此顏色已集滿（巨型瓜糰則需該分類一般系列全收集）；灰色 = 尚未集滿。
 */
export function isCategoryColorDecorCompleted(
  creatures: DeGuaCreature[],
  decor: DecorCategory,
  variety?: DeGuaVariety,
  isHuge = false
): boolean {
  const subsets = (DECOR_SUBSETS_CATALOG[decor] || []).filter((s) => !s.isRare);
  if (subsets.length === 0) return false;

  const decorated = creatures.filter((c) => c.hasDecor && c.decor === decor);
  const hasMatch = (v: DeGuaVariety, setId: string) =>
    decorated.some((c) => c.variety === v && (!c.decorSetId || c.decorSetId === setId));

  if (isHuge || !variety) {
    return subsets.every((sub) => {
      const targetVarieties = sub.varieties || [
        'red',
        'yellow',
        'blue',
        'purple',
        'white',
        'winged',
        'rock'
      ];
      return targetVarieties.every((v) => hasMatch(v, sub.setId));
    });
  }

  const relevantSubsets = subsets.filter(
    (sub) => !sub.varieties || sub.varieties.includes(variety)
  );
  if (relevantSubsets.length === 0) return false;
  return relevantSubsets.every((sub) => hasMatch(variety, sub.setId));
}

export interface ExpeditionProgressSnapshot {
  phase: 'outbound' | 'inbound' | 'completed';
  overallPct: number; // 0 ~ 1
  remainingMs: number;
  elapsedMs: number;
  currentLat: number;
  currentLng: number;
}

export function getExpeditionProgressSnapshot(
  exp: ExpeditionItem,
  fallbackLat: number,
  fallbackLng: number,
  nowMs: number = Date.now()
): ExpeditionProgressSnapshot {
  const oLat = exp.originLat ?? fallbackLat;
  const oLng = exp.originLng ?? fallbackLng;
  const startedAt = exp.startedAt ?? nowMs;
  const completesAt = exp.completesAt ?? startedAt + 60_000;
  const totalMs = Math.max(1000, completesAt - startedAt);
  const outMs = Math.max(500, exp.outboundDurationMs ?? Math.round(totalMs * 0.25));
  const inMs = Math.max(500, totalMs - outMs);

  const elapsedMs = Math.max(0, nowMs - startedAt);
  const remainingMs = Math.max(0, completesAt - nowMs);
  const overallPct = Math.max(0, Math.min(1, elapsedMs / totalMs));

  if (nowMs >= completesAt || exp.status === 'completed') {
    return {
      phase: 'completed',
      overallPct: 1,
      remainingMs: 0,
      elapsedMs: totalMs,
      currentLat: oLat,
      currentLng: oLng
    };
  }

  if (elapsedMs <= outMs) {
    const p = Math.max(0, Math.min(1, elapsedMs / outMs));
    return {
      phase: 'outbound',
      overallPct,
      remainingMs,
      elapsedMs,
      currentLat: oLat + (exp.lat - oLat) * p,
      currentLng: oLng + (exp.lng - oLng) * p
    };
  }

  const pIn = Math.max(0, Math.min(1, (elapsedMs - outMs) / inMs));
  return {
    phase: 'inbound',
    overallPct,
    remainingMs,
    elapsedMs,
    currentLat: exp.lat + (oLat - exp.lat) * pIn,
    currentLng: exp.lng + (oLng - exp.lng) * pIn
  };
}

export function formatExpeditionDurationParts(ms: number): {
  hours: number;
  minutes: number;
  compactText: string;
} {
  const totalMins = Math.max(1, Math.ceil(Math.max(0, ms) / 60_000));
  const hours = Math.floor(totalMins / 60);
  const minutes = totalMins % 60;
  const compactText = hours > 0 ? `${hours} 小時 ${minutes} 分` : `${minutes} 分`;
  return { hours, minutes, compactText };
}

export function formatRemainingExpeditionWindow(
  expiresAt: number | undefined,
  nowMs: number = Date.now()
): string {
  if (!expiresAt) return '不限時';
  const diff = Math.max(0, expiresAt - nowMs);
  const days = Math.floor(diff / 86_400_000);
  if (days >= 1) return `${days} 日`;
  const hours = Math.max(1, Math.ceil(diff / 3_600_000));
  return `${hours} 小時`;
}

export function formatExpeditionDateZh(ms?: number): string {
  const d = new Date(ms || Date.now());
  const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日，${weekdays[d.getDay()]}`;
}

export function getCreatureHeartSummary(friendship: number): {
  filledRed: number;
  partialRedPct: number;
  filledGold: number;
  partialGoldPct: number;
} {
  const clamped = Math.max(0, Math.min(800, friendship));
  if (clamped >= 400) {
    const goldVal = clamped - 400; // 0 ~ 400 -> 0 ~ 4 gold
    const filledGold = Math.min(4, Math.floor(goldVal / 100));
    const partialGoldPct = filledGold < 4 ? goldVal % 100 : 0;
    return {
      filledRed: 4,
      partialRedPct: 0,
      filledGold,
      partialGoldPct
    };
  }
  const filledRed = Math.min(4, Math.floor(clamped / 100));
  const partialRedPct = filledRed < 4 ? clamped % 100 : 0;
  return {
    filledRed,
    partialRedPct,
    filledGold: 0,
    partialGoldPct: 0
  };
}

/**
 * 依據達成 4 顆紅心且未穿戴飾品的地瓜球建立唯一專屬出生地禮物探險項目
 */
export function buildGiftExpeditionItem(
  creature: DeGuaCreature,
  playerLat: number,
  playerLng: number
): ExpeditionItem {
  const dist = Math.max(
    150,
    Math.round(
      Math.hypot((creature.lat - playerLat) * 111_000, (creature.lng - playerLng) * 102_000)
    )
  );
  return {
    id: `exp_gift_${creature.id}`,
    kind: 'gift',
    title: `${getSeedlingPotTitle(creature.variety, false).replace('瓜糰', '')}禮品`,
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
    status: 'available',
    assignedCreatureIds: [creature.id]
  };
}

/**
 * 測試期間補齊滿編 40 隻各色地瓜球，以便完整測試各種力量與派出上限組合
 */
export function ensure40TestCreatures(
  existing: DeGuaCreature[],
  baseLat = 25.033,
  baseLng = 121.535
): DeGuaCreature[] {
  if (existing.length >= 40) return existing;
  const order: DeGuaVariety[] = ['winged', 'white', 'purple', 'rock', 'red', 'yellow', 'blue'];
  const decors: DecorCategory[] = [
    'roadside',
    'bubble_tea',
    'convenience',
    'park',
    'bakery',
    'station',
    'night_market'
  ];
  const districts = ['大安區', '中山區', '大同區', '信義區', '中正區', '鶯歌區'];
  const out = [...existing];
  let seq = 1;
  while (out.length < 40) {
    const v = order[(out.length) % order.length];
    const d = decors[(out.length) % decors.length];
    const district = districts[(out.length) % districts.length];
    const isNearGift = seq === 2;
    const isReadyGift = seq === 1;
    out.push({
      id: `dg_test_${seq}_${v}`,
      name: `${VARIETY_CATALOG[v].name.slice(0, 2)}${out.length + 1}`,
      variety: v,
      decor: d,
      placeName: district,
      lat: baseLat + ((seq % 5) - 2) * 0.0012,
      lng: baseLng + ((seq % 7) - 3) * 0.0012,
      friendship: isReadyGift ? 400 : isNearGift ? 399 : 120 + (seq % 4) * 65,
      hasDecor: seq % 4 === 0,
      giftExpeditionCreated: isReadyGift || seq % 4 === 0,
      leafStage: seq % 3 === 0 ? 'flower' : seq % 2 === 0 ? 'bud' : 'leaf',
      flowerColor: (['white', 'yellow', 'red', 'blue'] as PetalColor[])[seq % 4],
      pluckCountToday: 0,
      inSquad: true,
      busyState: 'free',
      createdAt: Date.now() - seq * 3600_000
    });
    seq++;
  }
  return out;
}
