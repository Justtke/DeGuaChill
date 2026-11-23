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
  if (exp.kind === 'gift') {
    const target = exp.targetCreatureId
      ? creatures.find((c) => c.id === exp.targetCreatureId)
      : undefined;
    return {
      ...exp,
      requiredStrength: 1,
      maxCarriers: 1,
      weightGrams: exp.weightGrams ?? 50,
      discoveredAt: exp.discoveredAt ?? target?.createdAt ?? fallbackNowMs,
      seedlingVariety: exp.seedlingVariety ?? target?.variety,
      seedlingDecor: exp.seedlingDecor ?? target?.decor
    };
  }

  if (exp.kind === 'fruit') {
    const defaultWeight = exp.nectarColor === 'blue' ? 144 : exp.fruitEmoji === '🍋' ? 210 : 321;
    const weightGrams = exp.weightGrams ?? defaultWeight;
    const specs = getFruitExpeditionSpecs(exp.nectarColor || 'white', weightGrams);
    return {
      ...exp,
      weightGrams,
      requiredStrength: exp.requiredStrength || specs.requiredStrength,
      maxCarriers: exp.maxCarriers || specs.maxCarriers,
      nectarAmount: exp.nectarAmount ?? specs.nectarAmount,
      discoveredAt: exp.discoveredAt ?? fallbackNowMs,
      expiresAt: exp.expiresAt ?? fallbackNowMs + 3 * 86400_000
    };
  }

  const variety = exp.seedlingVariety || 'white';
  const isHuge = Boolean(exp.seedlingIsHuge);
  const hashSeed = exp.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const specs = getSeedlingExpeditionSpecs(variety, isHuge, hashSeed);
  return {
    ...exp,
    seedlingVariety: variety,
    seedlingDecor: exp.seedlingDecor || 'roadside',
    weightGrams: exp.weightGrams ?? specs.weightGrams,
    requiredStrength: exp.requiredStrength > 1 || specs.requiredStrength === 1 ? (exp.requiredStrength || specs.requiredStrength) : specs.requiredStrength,
    maxCarriers: exp.maxCarriers ?? specs.maxCarriers,
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
    title: `${VARIETY_CATALOG[creature.variety].potName.replace('瓜糰', '')}禮品`,
    placeName: creature.placeName,
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
