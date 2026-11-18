import {
  BigFlowerNode,
  PetalColor,
  PlantedFlowerCell,
  PrivacyZoneSetting
} from '../types/game';
import { latLngToGridCell } from './worldSyncService';

// 隱形細格尺寸：每小方格約 5 公尺 × 5 公尺，冷卻時間嚴格 5 分鐘
export const FINE_CELL_LAT_DEG = 0.000045;
export const FINE_CELL_LNG_DEG = 0.0000496;
export const CELL_COOLDOWN_MS = 5 * 60 * 1000; // 5 分鐘冷卻
export const FLOWERS_PER_COIN = 250; // 單次連續種花每 250 朵賺 1 金幣
export const MAX_DAILY_COINS = 60; // 每日種花金幣上限 60 枚
export const MAX_PLANTING_SPEED_KMH = 24; // 超過約 24 km/h 暫停寫入花朵
export const BIG_FLOWER_PLANT_RADIUS_M = 40; // 大花半徑 40 公尺內貢獻花朵數

export interface SquadPlantingFootprint {
  rows: number; // 南北向格數
  cols: number; // 東西向格數
  totalCells: number;
  intervalSeconds: number;
  petalsPerMinute: number;
}

export interface CellCooldownRecord {
  lastResetAt: number;
  flowersInWindow: number;
}

/**
 * 依據官方《Pikmin Bloom》隊伍人數決定播種矩形面積與花瓣消耗速率：
 * - 1–9 隻：2×1 (2 格), 每 30 秒 1 片 (2 片/分)
 * - 10–19 隻：3×2 (6 格), 每 20 秒 1 片 (3 片/分)
 * - 20–29 隻：4×3 (12 格), 每 15 秒 1 片 (4 片/分)
 * - 30–39 隻：5×4 (20 格), 每 12 秒 1 片 (5 片/分)
 * - 40+ 隻：6×5 (30 格), 每 10 秒 1 片 (6 片/分)
 */
export function getPlantingFootprintForSquad(squadCount: number): SquadPlantingFootprint {
  if (squadCount >= 40) {
    return { rows: 6, cols: 5, totalCells: 30, intervalSeconds: 10, petalsPerMinute: 6 };
  }
  if (squadCount >= 30) {
    return { rows: 5, cols: 4, totalCells: 20, intervalSeconds: 12, petalsPerMinute: 5 };
  }
  if (squadCount >= 20) {
    return { rows: 4, cols: 3, totalCells: 12, intervalSeconds: 15, petalsPerMinute: 4 };
  }
  if (squadCount >= 10) {
    return { rows: 3, cols: 2, totalCells: 6, intervalSeconds: 20, petalsPerMinute: 3 };
  }
  return { rows: 2, cols: 1, totalCells: 2, intervalSeconds: 30, petalsPerMinute: 2 };
}

export function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat1 - lat2) * 111320;
  const avgLatRad = (((lat1 + lat2) / 2) * Math.PI) / 180;
  const dLng = (lng1 - lng2) * 111320 * Math.cos(avgLatRad);
  return Math.hypot(dLat, dLng);
}

export function getFineCellIndices(lat: number, lng: number): {
  latIdx: number;
  lngIdx: number;
} {
  return {
    latIdx: Math.floor(lat / FINE_CELL_LAT_DEG),
    lngIdx: Math.floor(lng / FINE_CELL_LNG_DEG)
  };
}

/**
 * 展開當前位置周圍 rows × cols 的所有 5m × 5m 隱形方格中心座標與 key
 */
export function getFootprintCellsAround(
  lat: number,
  lng: number,
  footprint: SquadPlantingFootprint
): { key: string; lat: number; lng: number }[] {
  const { latIdx, lngIdx } = getFineCellIndices(lat, lng);
  const startRow = -Math.floor((footprint.rows - 1) / 2);
  const endRow = startRow + footprint.rows - 1;
  const startCol = -Math.floor((footprint.cols - 1) / 2);
  const endCol = startCol + footprint.cols - 1;

  const cells: { key: string; lat: number; lng: number }[] = [];
  for (let dr = startRow; dr <= endRow; dr++) {
    const rIdx = latIdx + dr;
    const cellLat = Number(((rIdx + 0.5) * FINE_CELL_LAT_DEG).toFixed(6));
    for (let dc = startCol; dc <= endCol; dc++) {
      const cIdx = lngIdx + dc;
      const cellLng = Number(((cIdx + 0.5) * FINE_CELL_LNG_DEG).toFixed(6));
      cells.push({
        key: `${rIdx}_${cIdx}`,
        lat: cellLat,
        lng: cellLng
      });
    }
  }
  return cells;
}

/**
 * 單次連續種花階段內，每達 250 朵賺取 1 金幣，每日上限 60 枚
 */
export function computeEarnedCoinDelta(
  prevSessionFlowers: number,
  newSessionFlowers: number,
  dailyCoinsEarned: number
): number {
  const prevCoins = Math.floor(prevSessionFlowers / FLOWERS_PER_COIN);
  const nextCoins = Math.floor(newSessionFlowers / FLOWERS_PER_COIN);
  const rawGain = Math.max(0, nextCoins - prevCoins);
  const remainingDailyCap = Math.max(0, MAX_DAILY_COINS - dailyCoinsEarned);
  return Math.min(rawGain, remainingDailyCap);
}

/**
 * 執行一次種花蓋章（依照 5m×5m 網格、5 分鐘冷卻、加速器同格種 2 朵、隱私區域與速限規則）
 */
export function stampFlowerFootprint(params: {
  lat: number;
  lng: number;
  squadCount: number;
  color: PetalColor;
  isAccelActive: boolean;
  speedKmh?: number;
  privacyZone?: PrivacyZoneSetting | null;
  cooldowns: Record<string, CellCooldownRecord>;
  existingFlowers: Record<string, PlantedFlowerCell>;
  bigFlowers: BigFlowerNode[];
  existingBigFlowerStates: Record<
    string,
    {
      currentFlowers: number;
      colorVotes: Record<PetalColor, number>;
      bloomedColor: PetalColor | null;
      bloomedAt: number | null;
    }
  >;
  nowMs?: number;
}): {
  plantedCount: number;
  cooldowns: Record<string, CellCooldownRecord>;
  flowers: Record<string, PlantedFlowerCell>;
  bigFlowerStates: typeof params.existingBigFlowerStates;
  newlyBloomedBigFlowers: { id: string; name: string; lat: number; lng: number; distanceMeters: number }[];
  plantedPoints: { lat: number; lng: number; color: PetalColor }[];
  blockedByPrivacy: boolean;
  blockedBySpeed: boolean;
} {
  const nowMs = params.nowMs ?? Date.now();
  const speedKmh = params.speedKmh ?? 0;

  if (speedKmh > MAX_PLANTING_SPEED_KMH) {
    return {
      plantedCount: 0,
      cooldowns: params.cooldowns,
      flowers: params.existingFlowers,
      bigFlowerStates: params.existingBigFlowerStates,
      newlyBloomedBigFlowers: [],
      plantedPoints: [],
      blockedByPrivacy: false,
      blockedBySpeed: true
    };
  }

  if (
    params.privacyZone?.enabled &&
    getDistanceMeters(params.lat, params.lng, params.privacyZone.lat, params.privacyZone.lng) <=
      params.privacyZone.radiusMeters
  ) {
    return {
      plantedCount: 0,
      cooldowns: params.cooldowns,
      flowers: params.existingFlowers,
      bigFlowerStates: params.existingBigFlowerStates,
      newlyBloomedBigFlowers: [],
      plantedPoints: [],
      blockedByPrivacy: true,
      blockedBySpeed: false
    };
  }

  const footprint = getPlantingFootprintForSquad(Math.max(1, params.squadCount));
  const fineCells = getFootprintCellsAround(params.lat, params.lng, footprint);
  const maxPerWindow = params.isAccelActive ? 2 : 1;

  let nextCooldowns: Record<string, CellCooldownRecord> | null = null;
  let nextFlowers: Record<string, PlantedFlowerCell> | null = null;
  let plantedCount = 0;
  const plantedPoints: { lat: number; lng: number; color: PetalColor }[] = [];

  for (const fc of fineCells) {
    const rec = params.cooldowns[fc.key];
    const windowExpired = !rec || nowMs - rec.lastResetAt >= CELL_COOLDOWN_MS;
    const usedInWindow = windowExpired ? 0 : rec.flowersInWindow;
    const addCount = Math.max(0, maxPerWindow - usedInWindow);

    if (addCount > 0) {
      if (!nextCooldowns) nextCooldowns = { ...params.cooldowns };
      if (!nextFlowers) nextFlowers = { ...params.existingFlowers };

      nextCooldowns[fc.key] = {
        lastResetAt: windowExpired ? nowMs : rec.lastResetAt,
        flowersInWindow: usedInWindow + addCount
      };
      plantedCount += addCount;
      plantedPoints.push({ lat: fc.lat, lng: fc.lng, color: params.color });

      const { gridId, centerLat, centerLng } = latLngToGridCell(fc.lat, fc.lng);
      const prevVisual = nextFlowers[gridId];
      nextFlowers[gridId] = {
        gridId,
        lat: centerLat,
        lng: centerLng,
        color: params.color,
        count: (prevVisual?.count || 0) + addCount,
        updatedAt: nowMs
      };
    }
  }

  // 清除超過 1 小時的舊冷卻紀錄，避免 localStorage 膨脹
  const finalCooldowns = nextCooldowns ?? params.cooldowns;
  const prunedCooldowns: Record<string, CellCooldownRecord> = {};
  for (const [k, v] of Object.entries(finalCooldowns)) {
    if (nowMs - v.lastResetAt < 3600_000) {
      prunedCooldowns[k] = v;
    }
  }

  // 若確實種下花朵，檢查半徑 40 公尺內的大花並累積花朵數
  let nextBFStates = params.existingBigFlowerStates;
  const newlyBloomedBigFlowers: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    distanceMeters: number;
  }[] = [];

  if (plantedCount > 0) {
    let bfModified = false;
    const updatedBF = { ...params.existingBigFlowerStates };
    for (const bf of params.bigFlowers) {
      const dist = getDistanceMeters(bf.lat, bf.lng, params.lat, params.lng);
      if (dist <= BIG_FLOWER_PLANT_RADIUS_M && bf.currentFlowers < bf.requiredFlowers) {
        bfModified = true;
        const nextFlowersCount = Math.min(bf.requiredFlowers, bf.currentFlowers + plantedCount);
        const nextVotes = {
          ...bf.colorVotes,
          [params.color]: (bf.colorVotes[params.color] || 0) + plantedCount
        };
        const justBloomed = nextFlowersCount >= bf.requiredFlowers && !bf.bloomedColor;
        updatedBF[bf.id] = {
          currentFlowers: nextFlowersCount,
          colorVotes: nextVotes,
          bloomedColor: justBloomed ? params.color : bf.bloomedColor,
          bloomedAt: justBloomed ? nowMs : bf.bloomedAt
        };
        if (justBloomed) {
          newlyBloomedBigFlowers.push({
            id: bf.id,
            name: bf.name,
            lat: bf.lat,
            lng: bf.lng,
            distanceMeters: Math.max(10, Math.round(dist))
          });
        }
      }
    }
    if (bfModified) {
      nextBFStates = updatedBF;
    }
  }

  return {
    plantedCount,
    cooldowns: prunedCooldowns,
    flowers: nextFlowers ?? params.existingFlowers,
    bigFlowerStates: nextBFStates,
    newlyBloomedBigFlowers,
    plantedPoints,
    blockedByPrivacy: false,
    blockedBySpeed: false
  };
}
