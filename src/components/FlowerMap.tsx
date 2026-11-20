import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  BigFlowerNode,
  DeGuaCreature,
  DeGuaVariety,
  ExpeditionItem,
  MUSHROOM_CATALOG,
  MushroomNode,
  PetalColor,
  PETAL_META,
  PlantedFlowerCell,
  VARIETY_CATALOG
} from '../types/game';
import {
  fetchNearbyPlaceLabels,
  getVisiblePlaceLabels,
  onRealLandmarksUpdated,
  RealPlaceLabel
} from '../services/realMapService';
import {
  getDeterministicWorldAround,
  WorldDeltaState
} from '../services/worldSyncService';
import {
  buildAuthenticPikminMushroomSvg,
  MUSHROOM_CARD_SVG_DIMS
} from './PikminMushroomVisual';
import { buildDirectionalWalkingPlayerSvg } from './WalkingPlayerAvatar';

interface FlowerMapProps {
  mode: 'mini_footprint' | 'interactive';
  cameraPerspective?: 'surround' | 'overhead';
  cameraBearing?: number;
  playerHeadingDeg?: number;
  recenterSeq?: number;
  focusedTarget?: { lat: number; lng: number; mushroomId?: string; seq: number } | null;
  onBearingChange?: (bearing: number) => void;
  onPerspectiveChange?: (perspective: 'surround' | 'overhead') => void;
  myLat: number;
  myLng: number;
  isPlanting: boolean;
  activePetalColor: PetalColor;
  squad: DeGuaCreature[];
  flowers: Record<string, PlantedFlowerCell>;
  worldDelta?: WorldDeltaState;
  bigFlowers: BigFlowerNode[];
  mushrooms: MushroomNode[];
  activeExpeditions: ExpeditionItem[];
  onWalkTo?: (lat: number, lng: number) => void;
  onSelectBigFlower?: (bf: BigFlowerNode) => void;
  onSelectMushroom?: (m: MushroomNode) => void;
}

function tileSeedHash(a: number, b: number, c: number): number {
  let h = (2166136261 ^ c) >>> 0;
  h = Math.imul(h ^ a, 16777619);
  h = Math.imul(h ^ b, 16777619);
  return (h ^ (h >>> 13)) >>> 0;
}

/**
 * 繪製單朵地面 5 瓣小花於 Canvas 上
 */
function drawCanvasGroundFlower(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  petalHex: string,
  centerHex: string
) {
  ctx.fillStyle = petalHex;
  for (let i = 0; i < 5; i++) {
    const ang = (i * Math.PI * 2) / 5;
    const px = cx + Math.cos(ang) * (radius * 0.68);
    const py = cy + Math.sin(ang) * (radius * 0.68);
    ctx.beginPath();
    ctx.arc(px, py, radius * 0.56, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = centerHex;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.42, 0, Math.PI * 2);
  ctx.fill();
}

interface InteractiveTileFields {
  roadCrisp: Uint8Array;
  waterCrisp: Uint8Array;
  parkMask: Uint8Array;
}

// 記憶體圖磚快取：將已解碼去文字且邊界銳利的 256x256 街廓密度場快取於記憶體中
const cachedInteractiveFields = new Map<string, InteractiveTileFields>();
const cachedMiniTileImages = new Map<string, ImageData>();

function extractSmoothInteractiveFields(srcData: Uint8ClampedArray): InteractiveTileFields {
  const roadProb = new Uint8Array(65536);
  const waterProb = new Uint8Array(65536);
  const parkMask = new Uint8Array(65536);
  const isText = new Uint8Array(65536);

  for (let i = 0; i < 65536; i++) {
    const p = i << 2;
    const r = srcData[p];
    const g = srcData[p + 1];
    const b = srcData[p + 2];
    const minC = r < g ? (r < b ? r : b) : g < b ? g : b;
    const maxC = r > g ? (r > b ? r : b) : g > b ? g : b;
    const sat = maxC - minC;

    if (b > r + 10 && b > 160 && g > 148) {
      waterProb[i] = Math.min(255, (((b - r - 8) / 26) * 255) | 0);
      continue;
    }

    if (r >= 210 && g >= 120 && r - b >= 14) {
      roadProb[i] = Math.min(255, (((r - b - 8) / 22) * 255) | 0);
      continue;
    }

    if (g > r + 6 && g > b + 6 && g >= 145) {
      parkMask[i] = 1;
      continue;
    }

    if (maxC < 175 && sat < 36) {
      isText[i] = 1;
      continue;
    }

    if (minC >= 249 && maxC >= 251) {
      roadProb[i] = Math.min(255, (((minC - 247) / 6) * 255) | 0);
    }
  }

  // 精準修補壓在道路／河川上的地名筆畫（不開方形孔洞）
  const healedRoad = new Uint8Array(roadProb);
  const healedWater = new Uint8Array(waterProb);
  const ringOffsets = [
    [-4, 0], [4, 0], [0, -4], [0, 4],
    [-3, -3], [3, -3], [-3, 3], [3, 3]
  ];

  for (let y = 0; y < 256; y++) {
    const yOff = y << 8;
    for (let x = 0; x < 256; x++) {
      const idx = yOff + x;
      if (!isText[idx]) continue;
      let rSum = 0;
      let wSum = 0;
      let valid = 0;
      for (let k = 0; k < 8; k++) {
        const sx = x + ringOffsets[k][0];
        const sy = y + ringOffsets[k][1];
        if (sx >= 0 && sx < 256 && sy >= 0 && sy < 256) {
          const sIdx = (sy << 8) + sx;
          if (!isText[sIdx]) {
            rSum += roadProb[sIdx];
            wSum += waterProb[sIdx];
            valid++;
          }
        }
      }
      if (valid > 0) {
        if (wSum / valid >= 115) healedWater[idx] = 255;
        else if (rSum / valid >= 125) healedRoad[idx] = 255;
      }
    }
  }

  // 僅剔除 1~2px 孤立白點雜訊，完整保留所有直角轉彎與細街巷銳利邊界！
  const roadDespeckled = new Uint8Array(healedRoad);
  const waterDespeckled = new Uint8Array(healedWater);
  for (let y = 1; y < 255; y++) {
    const yOff = y << 8;
    for (let x = 1; x < 255; x++) {
      const idx = yOff + x;
      if (healedRoad[idx] > 110) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const nyOff = (y + dy) << 8;
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (healedRoad[nyOff + x + dx] > 96) n++;
          }
        }
        if (n <= 2) roadDespeckled[idx] = 0;
      }
      if (healedWater[idx] > 110) {
        let wn = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const nyOff = (y + dy) << 8;
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (healedWater[nyOff + x + dx] > 96) wn++;
          }
        }
        if (wn <= 2) waterDespeckled[idx] = 0;
      }
    }
  }

  // 極輕微十字柔化 (權重 2:1) 消除樓梯鋸齒感但不糊掉線條
  const roadCrisp = new Uint8Array(65536);
  const waterCrisp = new Uint8Array(65536);
  for (let y = 0; y < 256; y++) {
    const ym = y > 0 ? y - 1 : 0;
    const yp = y < 255 ? y + 1 : 255;
    const r0 = ym << 8;
    const r1 = y << 8;
    const r2 = yp << 8;
    for (let x = 0; x < 256; x++) {
      const xm = x > 0 ? x - 1 : 0;
      const xp = x < 255 ? x + 1 : 255;
      const idx = r1 + x;
      roadCrisp[idx] =
        ((roadDespeckled[idx] * 2 +
          roadDespeckled[r1 + xm] +
          roadDespeckled[r1 + xp] +
          roadDespeckled[r0 + x] +
          roadDespeckled[r2 + x]) /
          6) |
        0;
      waterCrisp[idx] =
        ((waterDespeckled[idx] * 2 +
          waterDespeckled[r1 + xm] +
          waterDespeckled[r1 + xp] +
          waterDespeckled[r0 + x] +
          waterDespeckled[r2 + x]) /
          6) |
        0;
    }
  }

  return { roadCrisp, waterCrisp, parkMask };
}

/**
 * 首頁小地圖專用平滑向量風著色器（保留抗鋸齒弧線與清晰行政區地名，絕不產生破碎鋸齒或建築碎塊）
 */
function paintPikminMiniTileToCanvas(
  ctx: CanvasRenderingContext2D,
  srcData: Uint8ClampedArray
): ImageData {
  const outImg = ctx.createImageData(256, 256);
  const dst = outImg.data;

  for (let i = 0; i < 65536; i++) {
    const p = i << 2;
    const r = srcData[p];
    const g = srcData[p + 1];
    const b = srcData[p + 2];
    const minC = r < g ? (r < b ? r : b) : g < b ? g : b;
    const maxC = r > g ? (r > b ? r : b) : g > b ? g : b;
    const sat = maxC - minC;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // 1. 水域（河川 / 海洋）平滑轉為皮克敏粉彩水藍 (#A6D7FA)
    if (b > r + 10 && b >= 156 && g >= 142) {
      const wMix = Math.min(1, (b - r) / 36);
      dst[p] = Math.round(244 * (1 - wMix) + 166 * wMix);
      dst[p + 1] = Math.round(246 * (1 - wMix) + 215 * wMix);
      dst[p + 2] = Math.round(242 * (1 - wMix) + 250 * wMix);
      dst[p + 3] = 255;
      continue;
    }

    // 2. 高速公路 / 省道 / 幹道：平滑連續奶油黃道路 (#FCE79C)，含抗鋸齒柔邊
    if (r >= 205 && g >= 120 && r - b >= 14) {
      const roadMix = Math.min(1, (r - b) / 42);
      dst[p] = Math.round(246 * (1 - roadMix) + 252 * roadMix);
      dst[p + 1] = Math.round(245 * (1 - roadMix) + 231 * roadMix);
      dst[p + 2] = Math.round(238 * (1 - roadMix) + 156 * roadMix);
      dst[p + 3] = 255;
      continue;
    }

    // 3. 公園綠地：極淡柔霧淺綠，不搶眼也不蓋過足跡雲霧
    if (g > r + 6 && g > b + 6 && g >= 140) {
      dst[p] = 240;
      dst[p + 1] = 247;
      dst[p + 2] = 237;
      dst[p + 3] = 255;
      continue;
    }

    // 4. 保留清晰行政區中文地名（臺北市 / 新北市等深色筆畫），過濾灰線雜訊
    if (maxC < 155 && sat < 36) {
      const ink = Math.max(0, Math.min(1, (155 - lum) / 115));
      dst[p] = Math.round(245 * (1 - ink) + 88 * ink);
      dst[p + 1] = Math.round(246 * (1 - ink) + 96 * ink);
      dst[p + 2] = Math.round(241 * (1 - ink) + 108 * ink);
      dst[p + 3] = 255;
      continue;
    }

    // 5. 平滑內插一般陸地 (#F5F6F1) 與白色市區細道路 (#FCF1C4)，零硬邊破碎感
    const streetMix = Math.max(0, Math.min(1, (lum - 245) / 10));
    dst[p] = Math.round(245 * (1 - streetMix) + 252 * streetMix);
    dst[p + 1] = Math.round(246 * (1 - streetMix) + 241 * streetMix);
    dst[p + 2] = Math.round(241 * (1 - streetMix) + 196 * streetMix);
    dst[p + 3] = 255;
  }

  ctx.putImageData(outImg, 0, 0);
  return outImg;
}

const TILE_CDN_MIRRORS = [
  (z: number, x: number, y: number) => `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`,
  (z: number, x: number, y: number) => `https://b.tile.openstreetmap.org/${z}/${x}/${y}.png`,
  (z: number, x: number, y: number) => `https://c.tile.openstreetmap.org/${z}/${x}/${y}.png`,
  (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
];

function paintSmoothInteractiveTileToCanvas(
  ctx: CanvasRenderingContext2D,
  fields: InteractiveTileFields,
  coords: L.Coords,
  isSurround: boolean
) {
  const { roadCrisp, waterCrisp, parkMask } = fields;
  const outImg = ctx.createImageData(512, 512);
  const dst = outImg.data;

  for (let oy = 0; oy < 512; oy++) {
    const sy = oy * 0.5;
    const y0 = sy | 0;
    const y1 = y0 < 255 ? y0 + 1 : 255;
    const wy = sy - y0;
    const row0 = y0 << 8;
    const row1 = y1 << 8;
    const outRow = oy * 512;

    for (let ox = 0; ox < 512; ox++) {
      const sx = ox * 0.5;
      const x0 = sx | 0;
      const x1 = x0 < 255 ? x0 + 1 : 255;
      const wx = sx - x0;

      const i00 = row0 + x0;
      const i10 = row0 + x1;
      const i01 = row1 + x0;
      const i11 = row1 + x1;

      const isPark = parkMask[i00];
      const baseR = isPark ? 84 : 98;
      const baseG = isPark ? 168 : 182;
      const baseB = isPark ? 74 : 86;

      const wVal =
        (waterCrisp[i00] * (1 - wx) + waterCrisp[i10] * wx) * (1 - wy) +
        (waterCrisp[i01] * (1 - wx) + waterCrisp[i11] * wx) * wy;

      const p = (outRow + ox) << 2;
      if (wVal >= 112) {
        const wT = Math.min(1, (wVal - 112) / 36);
        dst[p] = Math.round(baseR * (1 - wT) + 122 * wT);
        dst[p + 1] = Math.round(baseG * (1 - wT) + 208 * wT);
        dst[p + 2] = Math.round(baseB * (1 - wT) + 252 * wT);
        dst[p + 3] = 255;
        continue;
      }

      const rVal =
        (roadCrisp[i00] * (1 - wx) + roadCrisp[i10] * wx) * (1 - wy) +
        (roadCrisp[i01] * (1 - wx) + roadCrisp[i11] * wx) * wy;

      if (rVal < 72) {
        // 銳利乾淨的皮克敏草地街廓，貼道路 2px 處保留細緻亮綠草緣
        const ym2 = y0 > 1 ? y0 - 2 : 0;
        const yp2 = y0 < 254 ? y0 + 2 : 255;
        const xm2 = x0 > 1 ? x0 - 2 : 0;
        const xp2 = x0 < 254 ? x0 + 2 : 255;
        const nearRoad =
          roadCrisp[row0 + xm2] > 135 ||
          roadCrisp[row0 + xp2] > 135 ||
          roadCrisp[(ym2 << 8) + x0] > 135 ||
          roadCrisp[(yp2 << 8) + x0] > 135;
        if (nearRoad) {
          dst[p] = 132;
          dst[p + 1] = 204;
          dst[p + 2] = 120;
        } else {
          dst[p] = baseR;
          dst[p + 1] = baseG;
          dst[p + 2] = baseB;
        }
        dst[p + 3] = 255;
      } else if (rVal < 126) {
        // 極窄細緻路緣線（約 0.6 CSS px 反鋸齒銜接）
        const edgeT = (rVal - 72) / 54;
        dst[p] = Math.round(132 * (1 - edgeT) + 216 * edgeT);
        dst[p + 1] = Math.round(204 * (1 - edgeT) + 212 * edgeT);
        dst[p + 2] = Math.round(120 * (1 - edgeT) + 174 * edgeT);
        dst[p + 3] = 255;
      } else {
        const roadT = Math.min(1, (rVal - 126) / 28);
        dst[p] = Math.round(216 * (1 - roadT) + 246 * roadT);
        dst[p + 1] = Math.round(212 * (1 - roadT) + 242 * roadT);
        dst[p + 2] = Math.round(174 * (1 - roadT) + 218 * roadT);
        dst[p + 3] = 255;
      }
    }
  }

  ctx.putImageData(outImg, 0, 0);

  if (isSurround) {
    const palettes = [
      { petal: '#FFFFFF', center: '#FACC15' },
      { petal: '#FDE047', center: '#CA8A04' },
      { petal: '#FB7185', center: '#FEF08A' },
      { petal: '#EF4444', center: '#FDE047' },
      { petal: '#60A5FA', center: '#FEF9C3' },
      { petal: '#C084FC', center: '#FEF08A' }
    ];
    const tileHash = tileSeedHash(coords.x, coords.y, coords.z);
    const palA = palettes[tileHash % palettes.length];
    const palB = palettes[(tileHash >>> 4) % palettes.length];

    ctx.save();
    ctx.scale(2, 2);
    for (let f = 0; f < 68; f++) {
      const fh = tileSeedHash(coords.x * 31 + f, coords.y * 37 + f, f + 99);
      const fx = 10 + (fh % 236);
      const fy = 10 + ((fh >>> 8) % 236);
      const idx = (fy << 8) + fx;
      if (roadCrisp[idx] > 40 || waterCrisp[idx] > 40) continue;

      const pal = (fh & 3) === 0 ? palB : palA;
      const radius = 2.8 + (fh % 3) * 0.55;

      ctx.fillStyle = '#429639';
      ctx.beginPath();
      ctx.arc(fx + 0.8, fy + 1.0, radius * 0.85, 0, Math.PI * 2);
      ctx.fill();

      drawCanvasGroundFlower(ctx, fx, fy, radius, pal.petal, pal.center);
    }
    ctx.restore();
  }
}

/**
 * 即時 OpenStreetMap 像素著色與去文字圖磚引擎 (Real-Time OSM Retina-Crisp Shader)
 * - 互動地圖採用 512×512 Retina 超採樣銳利繪製，徹底告別模糊感！
 */
export function createPikminOsmShaderTileLayer(
  getState: () => {
    isMini: boolean;
    cameraPerspective: 'surround' | 'overhead';
  }
): L.GridLayer {
  const PikminShaderGrid = L.GridLayer.extend({
    createTile: function (coords: L.Coords, done: L.DoneCallback) {
      const { isMini: initIsMini } = getState();
      const tile = document.createElement('canvas');
      tile.width = initIsMini ? 256 : 512;
      tile.height = initIsMini ? 256 : 512;
      tile.style.width = '256px';
      tile.style.height = '256px';

      const ctx = tile.getContext('2d');
      if (!ctx) {
        done(undefined, tile);
        return tile;
      }

      ctx.fillStyle = initIsMini ? '#F5F6F1' : '#62B656';
      ctx.fillRect(0, 0, tile.width, tile.height);

      const cacheKey = `${coords.z}_${coords.x}_${coords.y}`;
      if (initIsMini) {
        const cachedMini = cachedMiniTileImages.get(cacheKey);
        if (cachedMini) {
          ctx.putImageData(cachedMini, 0, 0);
          window.setTimeout(() => done(undefined, tile), 0);
          return tile;
        }
      } else {
        const cached = cachedInteractiveFields.get(cacheKey);
        if (cached) {
          const { isMini, cameraPerspective } = getState();
          paintSmoothInteractiveTileToCanvas(
            ctx,
            cached,
            coords,
            !isMini && cameraPerspective === 'surround'
          );
          window.setTimeout(() => done(undefined, tile), 0);
          return tile;
        }
      }

      let attempt = 0;

      const loadFromMirror = () => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        const mirrorIdx =
          Math.abs(coords.x + coords.y * 3 + attempt) % TILE_CDN_MIRRORS.length;
        const tileUrl = TILE_CDN_MIRRORS[mirrorIdx](coords.z, coords.x, coords.y);
        img.src = tileUrl;

        img.onload = () => {
          try {
            const off = document.createElement('canvas');
            off.width = 256;
            off.height = 256;
            const offCtx = off.getContext('2d');
            if (!offCtx) {
              done(undefined, tile);
              return;
            }

            offCtx.drawImage(img, 0, 0, 256, 256);
            const srcData = offCtx.getImageData(0, 0, 256, 256).data;

            const { isMini: curIsMini } = getState();
            if (curIsMini) {
              const rendered = paintPikminMiniTileToCanvas(ctx, srcData);
              cachedMiniTileImages.set(cacheKey, rendered);
              done(undefined, tile);
              return;
            }

            const fields = extractSmoothInteractiveFields(srcData);
            cachedInteractiveFields.set(cacheKey, fields);
            const { isMini, cameraPerspective } = getState();
            paintSmoothInteractiveTileToCanvas(
              ctx,
              fields,
              coords,
              !isMini && cameraPerspective === 'surround'
            );
          } catch {
            ctx.drawImage(img, 0, 0, 256, 256);
          }
          done(undefined, tile);
        };

        img.onerror = () => {
          attempt++;
          if (attempt < TILE_CDN_MIRRORS.length) {
            window.setTimeout(loadFromMirror, 120 * attempt);
          } else {
            done(undefined, tile);
          }
        };
      };

      loadFromMirror();
      return tile;
    }
  });

  return new (PikminShaderGrid as unknown as new (opts?: L.GridLayerOptions) => L.GridLayer)({
    tileSize: 256,
    updateWhenZooming: false,
    updateWhenIdle: true,
    keepBuffer: 2
  });
}

/**
 * 繪製跟著玩家一起走的「精緻迷你立體地瓜球小隊成員」SVG（比例依皮克敏地圖縮小至 20x25px，並依面向切換正反面）
 */
function buildFollowingDeGuaCreatureSvg(
  variety: DeGuaVariety,
  leafStage: DeGuaCreature['leafStage'],
  flowerHex: string,
  showBack = false
): string {
  const vMeta = VARIETY_CATALOG[variety];
  const topSprout =
    leafStage === 'flower'
      ? `<g transform="translate(18, 6)">
           <circle cx="0" cy="-4.2" r="3.2" fill="${flowerHex}" stroke="#94A3B8" stroke-width="0.6" />
           <circle cx="0" cy="4.2" r="3.2" fill="${flowerHex}" stroke="#94A3B8" stroke-width="0.6" />
           <circle cx="-4.2" cy="0" r="3.2" fill="${flowerHex}" stroke="#94A3B8" stroke-width="0.6" />
           <circle cx="4.2" cy="0" r="3.2" fill="${flowerHex}" stroke="#94A3B8" stroke-width="0.6" />
           <circle cx="0" cy="0" r="2.3" fill="#FACC15" />
         </g>`
      : leafStage === 'bud'
        ? `<circle cx="18" cy="6" r="4.2" fill="#F8FAFC" stroke="#C084FC" stroke-width="1.3" />`
        : leafStage === 'bare'
          ? `<circle cx="18" cy="7.5" r="2" fill="#65A30D" />`
          : `<path d="M 18 9 C 10 2 9 11 18 11 C 27 11 26 2 18 9 Z" fill="#4ADE80" stroke="#15803D" stroke-width="1.1" />`;

  const faceHtml = showBack
    ? ''
    : `
      <circle cx="14" cy="25.5" r="2.6" fill="#FFFFFF" stroke="#1E293B" stroke-width="0.9" />
      <circle cx="22" cy="25.5" r="2.6" fill="#FFFFFF" stroke="#1E293B" stroke-width="0.9" />
      <circle cx="14.3" cy="25.5" r="1.3" fill="#0F172A" />
      <circle cx="22.3" cy="25.5" r="1.3" fill="#0F172A" />
      <path d="M 16 29.5 Q 18 31.2 20 29.5" stroke="#1E293B" stroke-width="1.1" stroke-linecap="round" fill="none" />
    `;

  return `
    <svg width="20" height="25" viewBox="0 0 36 44" style="overflow:visible;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.28));">
      <ellipse cx="18" cy="40" rx="9" ry="3" fill="rgba(0,0,0,0.22)" />
      <path d="M 18 17 Q 17 11 18 7" stroke="#15803D" stroke-width="2" stroke-linecap="round" fill="none" />
      ${topSprout}
      <ellipse cx="13.5" cy="37" rx="3" ry="2.2" fill="${vMeta.bodyColor}" stroke="#1E293B" stroke-width="0.9" />
      <ellipse cx="22.5" cy="37" rx="3" ry="2.2" fill="${vMeta.bodyColor}" stroke="#1E293B" stroke-width="0.9" />
      <ellipse cx="18" cy="26" rx="11.5" ry="10.5" fill="${vMeta.bodyColor}" stroke="#1E293B" stroke-width="1.1" />
      <ellipse cx="14.5" cy="22" rx="4.5" ry="2.8" fill="${vMeta.spotColor}" opacity="0.55" />
      <ellipse cx="6" cy="26" rx="2.5" ry="1.8" fill="${vMeta.bodyColor}" stroke="#1E293B" stroke-width="0.8" />
      <ellipse cx="30" cy="26" rx="2.5" ry="1.8" fill="${vMeta.bodyColor}" stroke="#1E293B" stroke-width="0.8" />
      ${faceHtml}
    </svg>
  `;
}

/**
 * 繪製「長莖立體大花 / 花苞」SVG
 */
function buildTallBigFlowerSvg(isBloomed: boolean, isBud: boolean, colorHex: string): string {
  if (isBloomed) {
    return `
      <svg width="56" height="82" viewBox="0 0 60 88" style="overflow:visible;filter:drop-shadow(0 5px 7px rgba(0,0,0,0.26));">
        <ellipse cx="30" cy="82" rx="11" ry="4" fill="rgba(0,0,0,0.2)" />
        <path d="M 30 82 Q 28 54 30 24" stroke="#6EE7B7" stroke-width="4" stroke-linecap="round" fill="none" />
        <path d="M 29 63 C 17 57 14 66 28 67" fill="#34D399" />
        <path d="M 31 55 C 43 49 46 58 32 59" fill="#34D399" />
        <g transform="translate(30, 21)">
          <circle cx="0" cy="0" r="21" fill="${colorHex}" opacity="0.22" />
          <ellipse cx="0" cy="-12" rx="5.5" ry="10.5" fill="${colorHex}" stroke="#94A3B8" stroke-width="0.9" />
          <ellipse cx="0" cy="12" rx="5.5" ry="10.5" fill="${colorHex}" stroke="#94A3B8" stroke-width="0.9" />
          <ellipse cx="-12" cy="0" rx="10.5" ry="5.5" fill="${colorHex}" stroke="#94A3B8" stroke-width="0.9" />
          <ellipse cx="12" cy="0" rx="10.5" ry="5.5" fill="${colorHex}" stroke="#94A3B8" stroke-width="0.9" />
          <ellipse cx="-8.5" cy="-8.5" rx="9" ry="5" transform="rotate(45 -8.5 -8.5)" fill="${colorHex}" stroke="#CBD5E1" stroke-width="0.6" />
          <ellipse cx="8.5" cy="-8.5" rx="9" ry="5" transform="rotate(-45 8.5 -8.5)" fill="${colorHex}" stroke="#CBD5E1" stroke-width="0.6" />
          <ellipse cx="-8.5" cy="8.5" rx="9" ry="5" transform="rotate(-45 -8.5 8.5)" fill="${colorHex}" stroke="#CBD5E1" stroke-width="0.6" />
          <ellipse cx="8.5" cy="8.5" rx="9" ry="5" transform="rotate(45 8.5 8.5)" fill="${colorHex}" stroke="#CBD5E1" stroke-width="0.6" />
          <circle cx="0" cy="0" r="7.5" fill="#FACC15" stroke="#CA8A04" stroke-width="1.2" />
        </g>
      </svg>
    `;
  }

  if (isBud) {
    return `
      <svg width="48" height="72" viewBox="0 0 54 80" style="overflow:visible;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.22));">
        <ellipse cx="27" cy="74" rx="9.5" ry="3.6" fill="rgba(0,0,0,0.18)" />
        <path d="M 27 74 C 24 49 23 21 34 19 C 39 19 41 24 39 28" stroke="#34D399" stroke-width="4" stroke-linecap="round" fill="none" />
        <path d="M 26 58 C 16 53 14 61 26 62" fill="#10B981" />
        <g transform="translate(39, 29) rotate(20)">
          <ellipse cx="0" cy="0" rx="7.5" ry="9.5" fill="#F8FAFC" stroke="#C084FC" stroke-width="1.8" />
          <path d="M -6 -3 Q 0 -10 6 -3" fill="#86EFAC" />
        </g>
      </svg>
    `;
  }

  return `
    <svg width="44" height="62" viewBox="0 0 50 70" style="overflow:visible;filter:drop-shadow(0 3px 5px rgba(0,0,0,0.2));">
      <ellipse cx="25" cy="64" rx="9" ry="3.4" fill="rgba(0,0,0,0.18)" />
      <path d="M 25 64 Q 24 46 25 32" stroke="#22C55E" stroke-width="3.8" stroke-linecap="round" fill="none" />
      <path d="M 25 36 C 12 26 10 41 25 41" fill="#4ADE80" stroke="#15803D" stroke-width="1.3" />
      <path d="M 25 36 C 38 26 40 41 25 41" fill="#22C55E" stroke="#15803D" stroke-width="1.3" />
    </svg>
  `;
}

function buildMicroPlantedFlowersSvg(petalHex: string, count: number, isSurround: boolean): string {
  const dots = count >= 4 ? 5 : 3;
  const spots = [
    { x: 6, y: 12, r: 2.5 },
    { x: 16, y: 8, r: 2.8 },
    { x: 25, y: 13, r: 2.4 },
    { x: 11, y: 17, r: 2.2 },
    { x: 21, y: 18, r: 2.3 }
  ].slice(0, dots);
  const w = isSurround ? 30 : 18;
  const h = isSurround ? 22 : 14;
  const blossoms = spots
    .map(
      (s) => `
      <g transform="translate(${s.x}, ${s.y})">
        <circle cx="0" cy="-${s.r * 0.85}" r="${s.r * 0.72}" fill="${petalHex}" stroke="#94A3B8" stroke-width="0.35"/>
        <circle cx="${s.r * 0.8}" cy="${s.r * 0.25}" r="${s.r * 0.72}" fill="${petalHex}" stroke="#94A3B8" stroke-width="0.35"/>
        <circle cx="-${s.r * 0.8}" cy="${s.r * 0.25}" r="${s.r * 0.72}" fill="${petalHex}" stroke="#94A3B8" stroke-width="0.35"/>
        <circle cx="0" cy="0" r="${s.r * 0.45}" fill="#FACC15"/>
      </g>`
    )
    .join('');
  return `<svg width="${w}" height="${h}" viewBox="0 0 32 24" style="overflow:visible;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,0.22));">${blossoms}</svg>`;
}

/**
 * 繪製「叢生蘑菇群」SVG
 */
function buildMushroomClusterSvg(capHex: string, spotHex: string): string {
  return `
    <svg width="76" height="62" viewBox="0 0 76 62" style="overflow:visible;filter:drop-shadow(0 5px 8px rgba(0,0,0,0.3));">
      <ellipse cx="38" cy="55" rx="30" ry="7" fill="rgba(0,0,0,0.22)" />
      <rect x="13" y="36" width="11" height="16" rx="5" fill="#FDE68A" />
      <path d="M 6 38 Q 18.5 18 31 38 Z" fill="${capHex}" />
      <circle cx="15" cy="31" r="2.5" fill="${spotHex}" />
      <circle cx="22" cy="34" r="2" fill="${spotHex}" />
      <rect x="52" y="38" width="10" height="14" rx="4.5" fill="#FDE68A" />
      <path d="M 45 40 Q 57 22 69 40 Z" fill="${capHex}" />
      <circle cx="55" cy="34" r="2.2" fill="${spotHex}" />
      <rect x="29" y="26" width="18" height="27" rx="7" fill="#FEF3C7" stroke="#D97706" stroke-width="1.2" />
      <path d="M 15 30 C 15 6 61 6 61 30 Z" fill="${capHex}" stroke="rgba(255,255,255,0.5)" stroke-width="1.5" />
      <circle cx="31" cy="18" r="4" fill="${spotHex}" opacity="0.9" />
      <circle cx="45" cy="16" r="3.2" fill="${spotHex}" opacity="0.9" />
      <circle cx="38" cy="24" r="3.5" fill="${spotHex}" opacity="0.9" />
      <circle cx="24" cy="25" r="2.5" fill="${spotHex}" opacity="0.9" />
      <circle cx="52" cy="24" r="2.5" fill="${spotHex}" opacity="0.9" />
    </svg>
  `;
}

const SURROUND_LEAFLET_ZOOM = 17;
const SURROUND_MIN_ZOOM = 16.05;
const SURROUND_DEFAULT_ZOOM = 17.0;
const SURROUND_ARROW_THRESHOLD = 16.55;
const SURROUND_MAX_ZOOM = 18.65;

const OVERHEAD_MIN_ZOOM = 15.90;
const OVERHEAD_DEFAULT_ZOOM = 16.45;
const OVERHEAD_MAX_ZOOM = 17.10;

function getTouchAngleDeg(t0: Touch, t1: Touch): number {
  return (Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX) * 180) / Math.PI;
}

function normalizeAngleDeltaDeg(deg: number): number {
  return ((deg + 180) % 360 + 360) % 360 - 180;
}

function computeSurroundMetrics(z: number) {
  const fracScale = Math.pow(2, z - SURROUND_LEAFLET_ZOOM);
  const tiltDeg = Math.max(25, Math.min(39, 32 + (z - 17) * 4.2));
  const totalScale = 1.18 * fracScale;
  const desiredPlayerScale = Math.max(
    0.78,
    Math.min(2.45, 1.12 * Math.pow(2, (z - 17) * 0.68))
  );
  const invScale = desiredPlayerScale / totalScale;
  const desiredNodeScale = Math.max(
    0.68,
    Math.min(1.95, 1.05 * Math.pow(2, (z - 17) * 0.54))
  );
  const nodeScale = desiredNodeScale / totalScale;
  const showArrowLod = z <= SURROUND_ARROW_THRESHOLD;
  return { fracScale, tiltDeg, totalScale, invScale, nodeScale, showArrowLod };
}

function computeOverheadNodeMetrics(z: number) {
  const bfScale = Math.max(0.32, Math.min(0.88, 0.56 * Math.pow(0.76, OVERHEAD_DEFAULT_ZOOM - z)));
  const mushRelScale = Math.max(0.72, Math.min(1.85, 1.15 * Math.pow(0.78, OVERHEAD_DEFAULT_ZOOM - z)));
  return { bfScale, mushRelScale };
}

export const FlowerMap: React.FC<FlowerMapProps> = ({
  mode,
  cameraPerspective = 'surround',
  cameraBearing = 0,
  playerHeadingDeg = 0,
  recenterSeq = 0,
  focusedTarget = null,
  onBearingChange,
  myLat,
  myLng,
  isPlanting,
  activePetalColor,
  squad,
  flowers,
  worldDelta,
  bigFlowers,
  mushrooms,
  onSelectBigFlower,
  onSelectMushroom
}) => {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const shaderLayerRef = useRef<L.GridLayer | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const playerGroupRef = useRef<L.LayerGroup | null>(null);

  const isMini = mode === 'mini_footprint';
  const isSurround = !isMini && cameraPerspective === 'surround';

  const [viewCenter, setViewCenter] = useState<{ lat: number; lng: number }>({
    lat: myLat,
    lng: myLng
  });
  const [placeLabels, setPlaceLabels] = useState<RealPlaceLabel[]>(() =>
    getVisiblePlaceLabels(myLat, myLng)
  );
  const [landmarkTick, setLandmarkTick] = useState<number>(0);
  const [internalBearing, setInternalBearing] = useState<number>(cameraBearing);
  const [isDraggingOrbit, setIsDraggingOrbit] = useState<boolean>(false);
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const [activeCalloutId, setActiveCalloutId] = useState<string | null>(null);
  const [surroundZoom, setSurroundZoom] = useState<number>(SURROUND_DEFAULT_ZOOM);
  const [overheadZoom, setOverheadZoom] = useState<number>(OVERHEAD_DEFAULT_ZOOM);

  const surroundZoomRef = useRef<number>(SURROUND_DEFAULT_ZOOM);
  const overheadZoomRef = useRef<number>(OVERHEAD_DEFAULT_ZOOM);
  const hasPannedOverheadRef = useRef<boolean>(false);
  const pinchRef = useRef<{
    active: boolean;
    startDist: number;
    lastAngle: number;
    cumAngleDelta: number;
    twistOffset: number;
    unlockedRotate: boolean;
    startBearing: number;
    lastReportedBearing: number;
    startSurroundZoom: number;
    startOverheadZoom: number;
    committedOverheadZoom: number;
  }>({
    active: false,
    startDist: 0,
    lastAngle: 0,
    cumAngleDelta: 0,
    twistOffset: 0,
    unlockedRotate: false,
    startBearing: 0,
    lastReportedBearing: 0,
    startSurroundZoom: SURROUND_DEFAULT_ZOOM,
    startOverheadZoom: OVERHEAD_DEFAULT_ZOOM,
    committedOverheadZoom: OVERHEAD_DEFAULT_ZOOM
  });
  const overheadPanRef = useRef<{
    active: boolean;
    blockedUntilLift: boolean;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  }>({
    active: false,
    blockedUntilLift: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    moved: false
  });
  const playerCoordRef = useRef<{ lat: number; lng: number }>({ lat: myLat, lng: myLng });
  playerCoordRef.current = { lat: myLat, lng: myLng };
  const activePerspectiveRef = useRef<'surround' | 'overhead'>(cameraPerspective);
  activePerspectiveRef.current = cameraPerspective;

  const activeBearing = onBearingChange ? cameraBearing : internalBearing;
  const activeBearingRef = useRef<number>(activeBearing);
  activeBearingRef.current = activeBearing;

  const applySurroundDomTransform = (z: number, bearingDeg = activeBearingRef.current) => {
    const m = computeSurroundMetrics(z);
    const el = containerRef.current;
    if (el) {
      el.style.transition = 'none';
      el.style.transform = `perspective(900px) rotateX(${m.tiltDeg.toFixed(1)}deg) rotateZ(${bearingDeg.toFixed(1)}deg) scale(${m.totalScale.toFixed(3)})`;
    }
    const outer = outerRef.current;
    if (outer) {
      outer.style.setProperty('--camera-bearing', `${bearingDeg.toFixed(1)}deg`);
      outer.style.setProperty('--neg-camera-bearing', `${(-bearingDeg).toFixed(1)}deg`);
      outer.style.setProperty('--surround-inv-scale', m.invScale.toFixed(3));
      outer.style.setProperty('--surround-node-scale', m.nodeScale.toFixed(3));
      outer.style.setProperty('--surround-walker-opacity', m.showArrowLod ? '0' : '1');
      outer.style.setProperty('--surround-arrow-opacity', m.showArrowLod ? '1' : '0');
    }
  };

  const applyOverheadDomTransform = (
    targetZ: number,
    committedZ: number,
    bearingDeg = activeBearingRef.current
  ) => {
    const pinchScale = Math.pow(2, targetZ - committedZ);
    const el = containerRef.current;
    if (el) {
      el.style.transition = 'none';
      el.style.transform =
        Math.abs(pinchScale - 1) < 0.0005
          ? `rotate(${bearingDeg.toFixed(1)}deg) scale(1)`
          : `rotate(${bearingDeg.toFixed(1)}deg) scale(${pinchScale.toFixed(4)})`;
    }
    const { bfScale, mushRelScale } = computeOverheadNodeMetrics(targetZ);
    const outer = outerRef.current;
    if (outer) {
      outer.style.setProperty('--camera-bearing', `${bearingDeg.toFixed(1)}deg`);
      outer.style.setProperty('--neg-camera-bearing', `${(-bearingDeg).toFixed(1)}deg`);
      outer.style.setProperty('--overhead-bf-scale', (bfScale / pinchScale).toFixed(3));
      outer.style.setProperty('--overhead-mush-rel-scale', (mushRelScale / pinchScale).toFixed(3));
    }
  };

  const panOverheadByScreenDelta = (map: L.Map, dx: number, dy: number) => {
    const rad = (activeBearingRef.current * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const mx = dx * cos + dy * sin;
    const my = -dx * sin + dy * cos;
    map.panBy([-mx, -my], { animate: false, noMoveStart: true });
  };

  useEffect(() => {
    return onRealLandmarksUpdated(() => {
      setLandmarkTick((t) => t + 1);
    });
  }, []);

  const setBearingValue = (next: number) => {
    const normalized = ((next % 360) + 360) % 360;
    setInternalBearing(normalized);
    if (onBearingChange) {
      onBearingChange(normalized);
    }
  };

  const orbitDragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startBearing: number;
    moved: boolean;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    startBearing: 0,
    moved: false
  });

  const stateRef = useRef<{
    isMini: boolean;
    cameraPerspective: 'surround' | 'overhead';
  }>({
    isMini,
    cameraPerspective
  });

  stateRef.current = {
    isMini,
    cameraPerspective
  };

  // 以 App 傳入的身邊真實圖資節點 (bigFlowers / mushrooms) 為主體，平移至遠處時再即時補充該區節點，確保探險列表與地圖 100% 一致！
  const mergedNodes = useMemo(() => {
    const fallbackDelta: WorldDeltaState = worldDelta || {
      flowers,
      bigFlowerStates: {},
      mushroomStates: {},
      updatedAt: Date.now()
    };

    const bfMap = new Map<string, BigFlowerNode>();
    bigFlowers.forEach((b) => bfMap.set(b.id, b));

    const mMap = new Map<string, MushroomNode>();
    mushrooms.forEach((m) => mMap.set(m.id, m));

    const panDistMeters = Math.hypot(
      (viewCenter.lat - myLat) * 111000,
      (viewCenter.lng - myLng) * 102000
    );
    if (panDistMeters > 280) {
      const pannedWorld = getDeterministicWorldAround(viewCenter.lat, viewCenter.lng, fallbackDelta);
      pannedWorld.bigFlowers.forEach((b) => {
        if (!bfMap.has(b.id)) bfMap.set(b.id, b);
      });
      pannedWorld.mushrooms.forEach((m) => {
        if (!mMap.has(m.id)) mMap.set(m.id, m);
      });
    }

    return {
      allBigFlowers: Array.from(bfMap.values()),
      allMushrooms: Array.from(mMap.values())
    };
  }, [bigFlowers, mushrooms, myLat, myLng, viewCenter.lat, viewCenter.lng, worldDelta, flowers, landmarkTick]);

  // 更新俯瞰地圖的大致地名與周邊真實地標名稱
  useEffect(() => {
    setPlaceLabels(getVisiblePlaceLabels(viewCenter.lat, viewCenter.lng));
    let cancelled = false;
    fetchNearbyPlaceLabels(viewCenter.lat, viewCenter.lng).then((labels) => {
      if (!cancelled) {
        setPlaceLabels(labels);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [viewCenter.lat, viewCenter.lng]);

  const prevPerspectiveRef = useRef<'surround' | 'overhead'>(cameraPerspective);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const targetZoom = isMini ? 13 : cameraPerspective === 'surround' ? SURROUND_LEAFLET_ZOOM : overheadZoomRef.current;
    const map = L.map(containerRef.current, {
      center: [myLat, myLng],
      zoom: targetZoom,
      minZoom: isMini ? 12 : OVERHEAD_MIN_ZOOM,
      maxZoom: 18,
      zoomSnap: 0,
      zoomDelta: 0.1,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      // 禁用 Leaflet 原生游標縮放、拖曳與 CSS zoomAnimation，改由散步/鳥瞰獨立雙手勢模組接管
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
      boxZoom: false,
      keyboard: false
    });

    const shaderLayer = createPikminOsmShaderTileLayer(() => stateRef.current);
    shaderLayer.addTo(map);
    shaderLayerRef.current = shaderLayer;

    const group = L.layerGroup().addTo(map);
    const pGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;
    playerGroupRef.current = pGroup;

    // 監聽地圖容器尺寸變化，確保開啟或旋轉切換視角時四周與邊緣圖磚 100% 即時補齊，不會出現空白綠邊
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => {
        map.invalidateSize({ animate: false });
        if (activePerspectiveRef.current === 'surround' || isMini) {
          map.setView([playerCoordRef.current.lat, playerCoordRef.current.lng], map.getZoom(), { animate: false });
        }
      });
      ro.observe(containerRef.current);
    }

    const t1 = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
      map.setView([playerCoordRef.current.lat, playerCoordRef.current.lng], targetZoom, { animate: false });
    }, 40);
    const t2 = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
      map.setView([playerCoordRef.current.lat, playerCoordRef.current.lng], targetZoom, { animate: false });
    }, 200);

    if (!isMini) {
      map.on('moveend', () => {
        if (pinchRef.current.active || overheadPanRef.current.active) return;
        const c = map.getCenter();
        setViewCenter({ lat: c.lat, lng: c.lng });
      });
      map.on('click', () => {
        if (orbitDragRef.current.moved || overheadPanRef.current.moved) return;
        setActiveCalloutId(null);
      });
    }

    return () => {
      if (ro) ro.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      map.remove();
      mapRef.current = null;
      shaderLayerRef.current = null;
    };
  }, []);

  // 散步（3D 周圍）與鳥瞰（2D 俯瞰）兩套獨立相機模組：各自分別縮放與平移/旋轉，絕不在縮放時互相跨模式切換！
  useEffect(() => {
    const el = outerRef.current;
    if (!el || isMini) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const map = mapRef.current;
      if (!map) return;

      const p = playerCoordRef.current;

      if (activePerspectiveRef.current === 'surround') {
        const rawStep = e.deltaY < 0 ? 0.18 : -0.18;
        const clamped = Math.max(
          SURROUND_MIN_ZOOM,
          Math.min(SURROUND_MAX_ZOOM, Number((surroundZoomRef.current + rawStep).toFixed(3)))
        );
        surroundZoomRef.current = clamped;
        applySurroundDomTransform(clamped, activeBearingRef.current);
        setSurroundZoom(clamped);
      } else {
        const rawStep = e.deltaY < 0 ? 0.16 : -0.16;
        const clamped = Math.max(
          OVERHEAD_MIN_ZOOM,
          Math.min(OVERHEAD_MAX_ZOOM, Number((overheadZoomRef.current + rawStep).toFixed(3)))
        );
        overheadZoomRef.current = clamped;
        applyOverheadDomTransform(clamped, clamped, activeBearingRef.current);
        setOverheadZoom(clamped);

        if (!hasPannedOverheadRef.current) {
          map.setView([p.lat, p.lng], clamped, { animate: false });
          setViewCenter({ lat: p.lat, lng: p.lng });
        } else {
          map.setZoom(clamped, { animate: false });
        }
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        e.stopPropagation();
        orbitDragRef.current.active = false;
        overheadPanRef.current.active = false;
        overheadPanRef.current.blockedUntilLift = true;
        if (containerRef.current) {
          containerRef.current.style.transition = 'none';
        }
        setIsDraggingOrbit(false);
        setIsPinching(true);
        const d = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
        const angle = getTouchAngleDeg(e.touches[0], e.touches[1]);
        pinchRef.current = {
          active: true,
          startDist: Math.max(12, d),
          lastAngle: angle,
          cumAngleDelta: 0,
          twistOffset: 0,
          unlockedRotate: false,
          startBearing: activeBearingRef.current,
          lastReportedBearing: activeBearingRef.current,
          startSurroundZoom: surroundZoomRef.current,
          startOverheadZoom: overheadZoomRef.current,
          committedOverheadZoom: overheadZoomRef.current
        };
      } else if (
        e.touches.length === 1 &&
        activePerspectiveRef.current === 'overhead' &&
        !pinchRef.current.active &&
        !overheadPanRef.current.blockedUntilLift
      ) {
        const t = e.touches[0];
        overheadPanRef.current = {
          active: true,
          blockedUntilLift: false,
          startX: t.clientX,
          startY: t.clientY,
          lastX: t.clientX,
          lastY: t.clientY,
          moved: false
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const map = mapRef.current;
      if (!map) return;

      if (pinchRef.current.active && e.touches.length === 2) {
        e.preventDefault();
        e.stopPropagation();

        const d = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
        const scaleRatio = Math.max(0.25, Math.min(4, d / pinchRef.current.startDist));
        const zoomDelta = Math.log2(scaleRatio);

        const angle = getTouchAngleDeg(e.touches[0], e.touches[1]);
        pinchRef.current.cumAngleDelta += normalizeAngleDeltaDeg(angle - pinchRef.current.lastAngle);
        pinchRef.current.lastAngle = angle;

        if (!pinchRef.current.unlockedRotate && Math.abs(pinchRef.current.cumAngleDelta) > 5.5) {
          pinchRef.current.unlockedRotate = true;
          pinchRef.current.twistOffset = pinchRef.current.cumAngleDelta;
        }
        const effectiveTwist = pinchRef.current.unlockedRotate
          ? pinchRef.current.cumAngleDelta - pinchRef.current.twistOffset
          : 0;
        const nextBearing =
          (((pinchRef.current.startBearing + effectiveTwist) % 360) + 360) % 360;
        activeBearingRef.current = nextBearing;

        const p = playerCoordRef.current;

        if (activePerspectiveRef.current === 'surround') {
          const clamped = Math.max(
            SURROUND_MIN_ZOOM,
            Math.min(SURROUND_MAX_ZOOM, Number((pinchRef.current.startSurroundZoom + zoomDelta).toFixed(3)))
          );
          surroundZoomRef.current = clamped;
          applySurroundDomTransform(clamped, nextBearing);
        } else {
          const clamped = Math.max(
            OVERHEAD_MIN_ZOOM,
            Math.min(OVERHEAD_MAX_ZOOM, Number((pinchRef.current.startOverheadZoom + zoomDelta).toFixed(3)))
          );
          overheadZoomRef.current = clamped;
          const pinchScale = Math.pow(2, clamped - pinchRef.current.committedOverheadZoom);
          if (pinchScale < 0.7) {
            pinchRef.current.committedOverheadZoom = clamped;
            pinchRef.current.startOverheadZoom = clamped;
            pinchRef.current.startDist = Math.max(12, d);
            applyOverheadDomTransform(clamped, clamped, nextBearing);
            if (!hasPannedOverheadRef.current) {
              map.setView([p.lat, p.lng], clamped, { animate: false });
            } else {
              map.setZoom(clamped, { animate: false });
            }
          } else {
            applyOverheadDomTransform(clamped, pinchRef.current.committedOverheadZoom, nextBearing);
          }
        }

        if (
          pinchRef.current.unlockedRotate &&
          Math.abs(normalizeAngleDeltaDeg(nextBearing - pinchRef.current.lastReportedBearing)) >= 1.0
        ) {
          pinchRef.current.lastReportedBearing = nextBearing;
          setBearingValue(nextBearing);
        }
        return;
      }

      if (
        activePerspectiveRef.current === 'overhead' &&
        overheadPanRef.current.active &&
        e.touches.length === 1
      ) {
        const t = e.touches[0];
        if (
          !overheadPanRef.current.moved &&
          Math.hypot(t.clientX - overheadPanRef.current.startX, t.clientY - overheadPanRef.current.startY) > 4
        ) {
          overheadPanRef.current.moved = true;
          hasPannedOverheadRef.current = true;
        }
        if (overheadPanRef.current.moved) {
          e.preventDefault();
          e.stopPropagation();
          const dx = t.clientX - overheadPanRef.current.lastX;
          const dy = t.clientY - overheadPanRef.current.lastY;
          overheadPanRef.current.lastX = t.clientX;
          overheadPanRef.current.lastY = t.clientY;
          panOverheadByScreenDelta(map, dx, dy);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const map = mapRef.current;
      const p = playerCoordRef.current;

      if (e.touches.length < 2 && pinchRef.current.active) {
        const rotated = pinchRef.current.unlockedRotate;
        pinchRef.current.active = false;
        setIsPinching(false);

        if (activePerspectiveRef.current === 'surround') {
          const finalZoom = Number(surroundZoomRef.current.toFixed(3));
          applySurroundDomTransform(finalZoom, activeBearingRef.current);
          setSurroundZoom(finalZoom);
        } else {
          const finalZoom = Number(overheadZoomRef.current.toFixed(3));
          applyOverheadDomTransform(finalZoom, finalZoom, activeBearingRef.current);
          if (map) {
            if (!hasPannedOverheadRef.current) {
              map.setView([p.lat, p.lng], finalZoom, { animate: false });
              setViewCenter({ lat: p.lat, lng: p.lng });
            } else {
              map.setZoom(finalZoom, { animate: false });
            }
          }
          setOverheadZoom(finalZoom);
        }

        if (rotated) {
          setBearingValue(activeBearingRef.current);
        }
      }

      if (e.touches.length === 0) {
        const wasMoved = overheadPanRef.current.moved;
        overheadPanRef.current.active = false;
        overheadPanRef.current.blockedUntilLift = false;
        if (wasMoved && map) {
          const c = map.getCenter();
          setViewCenter({ lat: c.lat, lng: c.lng });
          window.setTimeout(() => {
            overheadPanRef.current.moved = false;
          }, 60);
        } else {
          overheadPanRef.current.moved = false;
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: false, capture: true });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchstart', handleTouchStart, { capture: true });
      el.removeEventListener('touchmove', handleTouchMove, { capture: true });
      el.removeEventListener('touchend', handleTouchEnd, { capture: true });
      el.removeEventListener('touchcancel', handleTouchEnd, { capture: true });
    };
  }, [isMini]);

  // 僅在使用者實際切換視角模式 (surround <-> overhead) 時重新調整容器尺寸與圖磚樣式
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.dragging.disable();

    const perspectiveChanged = prevPerspectiveRef.current !== cameraPerspective;
    prevPerspectiveRef.current = cameraPerspective;
    if (!perspectiveChanged) return;

    hasPannedOverheadRef.current = false;
    const targetZoom = isMini
      ? 13
      : cameraPerspective === 'surround'
      ? SURROUND_LEAFLET_ZOOM
      : overheadZoomRef.current;

    if (cameraPerspective === 'surround') {
      applySurroundDomTransform(surroundZoomRef.current, activeBearingRef.current);
    } else if (!isMini) {
      applyOverheadDomTransform(overheadZoomRef.current, overheadZoomRef.current, activeBearingRef.current);
      if (pinchRef.current.active) {
        pinchRef.current.committedOverheadZoom = overheadZoomRef.current;
      }
    } else if (containerRef.current) {
      containerRef.current.style.transform = 'none';
    }

    map.invalidateSize({ animate: false });
    map.setView([myLat, myLng], targetZoom, { animate: false });
    setViewCenter({ lat: myLat, lng: myLng });

    const timer = window.setTimeout(() => {
      const liveZoom = isMini
        ? 13
        : activePerspectiveRef.current === 'surround'
        ? SURROUND_LEAFLET_ZOOM
        : overheadZoomRef.current;
      map.invalidateSize({ animate: false });
      if (!pinchRef.current.active) {
        map.setView([playerCoordRef.current.lat, playerCoordRef.current.lng], liveZoom, { animate: false });
        setViewCenter({ lat: playerCoordRef.current.lat, lng: playerCoordRef.current.lng });
      }
      if (shaderLayerRef.current) {
        shaderLayerRef.current.redraw();
      }
    }, 45);

    return () => window.clearTimeout(timer);
  }, [cameraPerspective, isMini]);

  // 點擊右上角指北針回正北方 (0°) 或外部變更 bearing 時同步 DOM 變形
  useEffect(() => {
    if (isMini || pinchRef.current.active || orbitDragRef.current.active) return;
    if (isSurround) {
      applySurroundDomTransform(surroundZoomRef.current, activeBearing);
    } else {
      applyOverheadDomTransform(overheadZoomRef.current, overheadZoomRef.current, activeBearing);
    }
  }, [activeBearing, isSurround, isMini]);

  // 當玩家實際移動座標或按下 🎯 定位回正時，平滑移動鏡頭（不清空、不重繪既有圖磚，完全仿照皮克敏無閃爍體驗）
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentCenter = map.getCenter();
    const distMeters = Math.hypot(
      (currentCenter.lat - myLat) * 111000,
      (currentCenter.lng - myLng) * 102000
    );

    if (recenterSeq > 0) {
      hasPannedOverheadRef.current = false;
      if (cameraPerspective === 'surround') {
        surroundZoomRef.current = SURROUND_DEFAULT_ZOOM;
        applySurroundDomTransform(SURROUND_DEFAULT_ZOOM, activeBearingRef.current);
        setSurroundZoom(SURROUND_DEFAULT_ZOOM);
      } else {
        overheadZoomRef.current = OVERHEAD_DEFAULT_ZOOM;
        if (!isMini) {
          applyOverheadDomTransform(OVERHEAD_DEFAULT_ZOOM, OVERHEAD_DEFAULT_ZOOM, activeBearingRef.current);
        }
        setOverheadZoom(OVERHEAD_DEFAULT_ZOOM);
      }
      const targetZoom = isMini ? 13 : cameraPerspective === 'surround' ? SURROUND_LEAFLET_ZOOM : OVERHEAD_DEFAULT_ZOOM;
      map.invalidateSize({ animate: false });
      map.setView([myLat, myLng], targetZoom, { animate: false });
      setViewCenter({ lat: myLat, lng: myLng });
      return;
    }

    if (cameraPerspective === 'overhead' && hasPannedOverheadRef.current) {
      return;
    }

    if (distMeters > 2500) {
      const targetZoom = isMini
        ? 13
        : cameraPerspective === 'surround'
        ? SURROUND_LEAFLET_ZOOM
        : overheadZoomRef.current;
      map.invalidateSize({ animate: false });
      map.setView([myLat, myLng], targetZoom, { animate: false });
    } else if (distMeters >= 2) {
      map.panTo([myLat, myLng], { animate: !isMini, duration: 0.45 });
    }
    setViewCenter({ lat: myLat, lng: myLng });
  }, [myLat, myLng, recenterSeq]);

  // 當使用者在蘑菇詳情點擊「📍 前往這裡」時，移動地圖焦點至該蘑菇並顯示名字氣泡框
  useEffect(() => {
    if (!focusedTarget || !mapRef.current || isMini) return;
    const map = mapRef.current;
    hasPannedOverheadRef.current = true;
    const targetZoom =
      cameraPerspective === 'surround' ? SURROUND_LEAFLET_ZOOM : Math.max(OVERHEAD_DEFAULT_ZOOM, overheadZoomRef.current);
    map.invalidateSize({ animate: false });
    map.setView([focusedTarget.lat, focusedTarget.lng], targetZoom, { animate: false });
    setViewCenter({ lat: focusedTarget.lat, lng: focusedTarget.lng });
    if (focusedTarget.mushroomId) {
      setActiveCalloutId(focusedTarget.mushroomId);
    }
  }, [focusedTarget?.seq]);

  const showOverheadFlowers = !isSurround;
  const relYawDeg = (((playerHeadingDeg ?? 0) + activeBearing) % 360 + 360) % 360;
  const quantizedRelYaw = Math.round(relYawDeg / 8) * 8;
  const quantizedHeading = Math.round((((playerHeadingDeg ?? 0) % 360) + 360) % 360 / 6) * 6;

  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    // ==================== 模式 A：主畫面紅框靜態「今日足跡概覽地圖」（完全對照皮克敏圖二：柔和綠霧雲＋白邊雙腳腳印＋頂端花與頭像） ====================
    if (isMini) {
      const plantedList = Object.values(flowers);
      let minLat = 90,
        maxLat = -90,
        minLng = 180,
        maxLng = -180;
      plantedList.forEach((c) => {
        if (c.lat < minLat) minLat = c.lat;
        if (c.lat > maxLat) maxLat = c.lat;
        if (c.lng < minLng) minLng = c.lng;
        if (c.lng > maxLng) maxLng = c.lng;
      });
      const realSpan = plantedList.length >= 4 ? Math.hypot(maxLat - minLat, maxLng - minLng) : 0;

      let trailPoints: [number, number][];
      if (realSpan >= 0.008) {
        const sampled: [number, number][] = [];
        for (const c of plantedList) {
          const prev = sampled[sampled.length - 1];
          if (!prev || Math.hypot(c.lat - prev[0], c.lng - prev[1]) >= 0.0028) {
            sampled.push([c.lat, c.lng]);
          }
        }
        trailPoints = sampled.slice(-6);
      } else {
        trailPoints = [
          [myLat - 0.0075, myLng - 0.011],
          [myLat - 0.0042, myLng - 0.0065],
          [myLat - 0.001, myLng - 0.0015],
          [myLat + 0.0022, myLng + 0.0035],
          [myLat + 0.0052, myLng + 0.0082],
          [myLat + 0.0078, myLng + 0.0115]
        ];
      }

      trailPoints.forEach(([tLat, tLng], idx) => {
        const mistSize = idx === Math.floor(trailPoints.length / 2) ? 155 : 120;
        const mistIcon = L.divIcon({
          className: 'mini-footprint-mist',
          html: `<div style="
            width:${mistSize}px;
            height:${mistSize}px;
            border-radius:50%;
            background:radial-gradient(circle, rgba(74,185,96,0.36) 0%, rgba(105,202,122,0.18) 46%, rgba(105,202,122,0) 74%);
            pointer-events:none;
          "></div>`,
          iconSize: [mistSize, mistSize],
          iconAnchor: [mistSize / 2, mistSize / 2]
        });
        L.marker([tLat, tLng], { icon: mistIcon, interactive: false }).addTo(group);
      });

      trailPoints.forEach(([tLat, tLng], idx) => {
        const nextPt = trailPoints[Math.min(trailPoints.length - 1, idx + 1)];
        const prevPt = trailPoints[Math.max(0, idx - 1)];
        const dLat = nextPt[0] - prevPt[0];
        const dLng = nextPt[1] - prevPt[1];
        const angleDeg = (Math.atan2(dLng, dLat) * 180) / Math.PI;
        const isLast = idx === trailPoints.length - 1;

        if (isLast) {
          const destIcon = L.divIcon({
            className: 'mini-footprint-head',
            html: `<div style="position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">
              <svg width="26" height="26" viewBox="0 0 28 28" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,0.22));">
                <circle cx="14" cy="7" r="4.5" fill="#F43F5E" stroke="#FFFFFF" stroke-width="1.3"/>
                <circle cx="20" cy="12" r="4.5" fill="#F43F5E" stroke="#FFFFFF" stroke-width="1.3"/>
                <circle cx="18" cy="19" r="4.5" fill="#F43F5E" stroke="#FFFFFF" stroke-width="1.3"/>
                <circle cx="10" cy="19" r="4.5" fill="#F43F5E" stroke="#FFFFFF" stroke-width="1.3"/>
                <circle cx="8" cy="12" r="4.5" fill="#F43F5E" stroke="#FFFFFF" stroke-width="1.3"/>
                <circle cx="14" cy="13.5" r="3.4" fill="#FDE047"/>
              </svg>
              <div style="
                position:absolute;
                top:-4px;
                right:-4px;
                width:18px;
                height:18px;
                border-radius:50%;
                background:#3B82F6;
                border:2.2px solid #FFFFFF;
                box-shadow:0 2px 5px rgba(0,0,0,0.28);
              "></div>
            </div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });
          L.marker([tLat, tLng], { icon: destIcon, interactive: false }).addTo(group);
          return;
        }

        const isLeftLead = idx % 2 === 0;
        const fpIcon = L.divIcon({
          className: 'mini-footprint-step',
          html: `<div style="transform: rotate(${angleDeg.toFixed(1)}deg);filter: drop-shadow(0 1px 2px rgba(0,0,0,0.18));">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <g transform="translate(0, ${isLeftLead ? -1.5 : 1.5})">
                <ellipse cx="8" cy="9" rx="2.6" ry="4" fill="#2BB673" stroke="#FFFFFF" stroke-width="1.5"/>
                <circle cx="8" cy="15.2" r="1.8" fill="#2BB673" stroke="#FFFFFF" stroke-width="1.3"/>
              </g>
              <g transform="translate(0, ${isLeftLead ? 1.5 : -1.5})">
                <ellipse cx="16" cy="9" rx="2.6" ry="4" fill="#2BB673" stroke="#FFFFFF" stroke-width="1.5"/>
                <circle cx="16" cy="15.2" r="1.8" fill="#2BB673" stroke="#FFFFFF" stroke-width="1.3"/>
              </g>
            </svg>
          </div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        L.marker([tLat, tLng], { icon: fpIcon, interactive: false }).addTo(group);
      });

      return;
    }

    // ==================== 模式 B：互動地圖節點（大花 / 蘑菇 / 精緻種花叢 / 行政地名，隨 CSS 無段變數 60fps 滑順縮放與旋轉） ====================
    const uprightBillboardTransform = isSurround
      ? 'rotate(var(--neg-camera-bearing, 0deg)) scaleY(1.36) scale(var(--surround-node-scale, 1))'
      : 'rotate(var(--neg-camera-bearing, 0deg)) scale(var(--overhead-bf-scale, 0.56))';

    // 0. 俯瞰視角稀疏地名（雙指旋轉時維持文字正立可讀）
    if (!isSurround && placeLabels.length > 0) {
      placeLabels.forEach((p) => {
        const lblIcon = L.divIcon({
          className: 'pikmin-district-label',
          html: `<div style="
            font-size: 13px;
            font-weight: 700;
            color: #1E293B;
            white-space: nowrap;
            text-align: center;
            transform: rotate(var(--neg-camera-bearing, 0deg));
            text-shadow: -1.5px -1.5px 0 #FFF, 1.5px -1.5px 0 #FFF, -1.5px 1.5px 0 #FFF, 1.5px 1.5px 0 #FFF, 0 1px 3px rgba(0,0,0,0.28);
            pointer-events: none;
          ">${p.name}</div>`,
          iconSize: [80, 20],
          iconAnchor: [40, 10]
        });
        L.marker([p.lat, p.lng], { icon: lblIcon, interactive: false }).addTo(group);
      });
    }

    // 1. 精緻小花軌跡（以微縮多瓣野花 SVG 代替大顆 Emoji，貼近皮克敏路面繁花毯質感）
    if (isSurround || showOverheadFlowers) {
      Object.values(flowers).forEach((cell) => {
        const meta = PETAL_META[cell.color];
        const microHtml = buildMicroPlantedFlowersSvg(meta.hex, cell.count, isSurround);
        const icon = L.divIcon({
          className: 'pikmin-flower-patch',
          html: `<div style="
            display: flex;
            align-items: center;
            justify-content: center;
            transform: ${isSurround ? 'rotate(var(--neg-camera-bearing, 0deg)) scaleY(1.35)' : 'none'};
            pointer-events: none;
          ">${microHtml}</div>`,
          iconSize: isSurround ? [30, 22] : [18, 14],
          iconAnchor: isSurround ? [15, 11] : [9, 7]
        });
        L.marker([cell.lat, cell.lng], { icon, interactive: false }).addTo(group);
      });
    }

    // 2. 修長細緻大花與彎頸花苞（依皮克敏地圖真實建築尺度縮放）
    mergedNodes.allBigFlowers.forEach((bf, idx) => {
      const isBloomed = bf.currentFlowers >= bf.requiredFlowers || bf.bloomedColor !== null || idx % 3 === 0;
      const isBud = !isBloomed && (bf.currentFlowers >= 45 || idx % 2 === 1);
      const colorChoices = ['#FFFFFF', '#FACC15', '#FB7185'];
      const flowerHex = bf.bloomedColor
        ? PETAL_META[bf.bloomedColor].hex
        : colorChoices[idx % colorChoices.length];

      L.circle([bf.lat, bf.lng], {
        radius: isSurround ? 22 : 24,
        color: '#67E8F9',
        weight: 1.5,
        fillColor: '#A5F3FC',
        fillOpacity: 0.22
      }).addTo(group);

      const svgHtml = buildTallBigFlowerSvg(isBloomed, isBud, flowerHex);

      const bfIcon = L.divIcon({
        className: 'pikmin-clean-big-flower',
        html: `<div style="
          width: 56px;
          height: 82px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          transform: ${uprightBillboardTransform};
          transform-origin: 50% 92%;
          cursor: pointer;
        ">
          ${svgHtml}
        </div>`,
        iconSize: [56, 82],
        iconAnchor: [28, 75]
      });

      const marker = L.marker([bf.lat, bf.lng], { icon: bfIcon }).addTo(group);
      if (onSelectBigFlower) {
        marker.on('click', () => {
          if (orbitDragRef.current.moved || overheadPanRef.current.moved) return;
          onSelectBigFlower(bf);
        });
      }
    });

    // 3. 叢生蘑菇群（細緻對齊皮克敏尺度，俯瞰時隨 --overhead-mush-scale 無段縮小）
    mergedNodes.allMushrooms.forEach((m) => {
      const participantCount = m.participants.length;
      const hpPct =
        participantCount > 0
          ? Math.max(5, Math.round((m.currentHp / m.maxHp) * 100))
          : 100;
      const catalogEntry = MUSHROOM_CATALOG[m.element] || MUSHROOM_CATALOG.red;
      const isSelectedCallout = activeCalloutId === m.id;

      const mushSvg = buildAuthenticPikminMushroomSvg(m.element, m.sizeLabel, m.id);

      const dim = MUSHROOM_CARD_SVG_DIMS[m.sizeLabel] || MUSHROOM_CARD_SVG_DIMS['一般'];
      const baseScale = isSurround ? 0.56 : 0.28;
      const boxW = Math.round(dim.w * baseScale);
      const boxH = Math.round(dim.h * baseScale);

      const topBadgeHtml =
        participantCount > 0
          ? `<div style="
              position: absolute;
              bottom: 100%;
              left: 50%;
              transform: translateX(-50%);
              margin-bottom: 2px;
              display: flex;
              align-items: center;
              gap: 4px;
              pointer-events: none;
            ">
              <div style="
                width: 17px;
                height: 17px;
                border-radius: 50%;
                border: 2px solid #FFFFFF;
                background: conic-gradient(#F87171 ${hpPct}%, #FFFFFF 0);
                box-shadow: 0 2px 5px rgba(0,0,0,0.25);
              "></div>
              <div style="
                background: rgba(6, 95, 70, 0.92);
                color: #FFFFFF;
                border-radius: 99px;
                padding: 1px 7px;
                font-size: 11px;
                font-weight: 900;
                display: flex;
                align-items: center;
                gap: 2px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.22);
              ">
                <span>👤</span>
                <span>${participantCount}</span>
              </div>
            </div>`
          : '';

      const calloutHtml = isSelectedCallout
        ? `<div
            data-mushroom-callout="true"
            style="
              position: absolute;
              bottom: 100%;
              left: 50%;
              transform: translateX(-50%);
              margin-bottom: ${participantCount > 0 ? 28 : 8}px;
              background: rgba(17, 24, 39, 0.92);
              backdrop-filter: blur(8px);
              color: #FFFFFF;
              border: 1.2px solid rgba(255,255,255,0.3);
              border-radius: 14px;
              padding: 7px 11px;
              min-width: 170px;
              max-width: 225px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              box-shadow: 0 8px 22px rgba(0,0,0,0.42);
              cursor: pointer;
              pointer-events: auto;
              z-index: 200;
            "
          >
            <div style="text-align: center; flex: 1; min-width: 0;">
              <div style="font-size: 11px; font-weight: 800; color: #CBD5E1; line-height: 1.2; white-space: nowrap;">
                ${m.sizeLabel} ${catalogEntry.typeLabel}
              </div>
              <div style="font-size: 12.5px; font-weight: 900; color: #FFFFFF; line-height: 1.3; margin-top: 2px; word-break: break-word;">
                ${m.landmarkName || m.name}
              </div>
            </div>
            <div style="font-size: 15px; font-weight: 900; color: #E2E8F0; flex-shrink: 0;">&gt;</div>
          </div>`
        : '';

      const mushIcon = L.divIcon({
        className: 'pikmin-clean-mushroom',
        html: `<div style="
          position: relative;
          width: ${boxW}px;
          height: ${boxH}px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          overflow: visible;
          transform: ${isSurround ? 'rotate(var(--neg-camera-bearing, 0deg)) scaleY(1.24) scale(var(--surround-node-scale, 1))' : 'rotate(var(--neg-camera-bearing, 0deg)) scale(var(--overhead-mush-rel-scale, 1))'};
          transform-origin: 50% 85%;
          cursor: pointer;
        ">
          ${calloutHtml}
          ${topBadgeHtml}
          <div style="width: ${boxW}px; height: ${boxH}px; display: flex; align-items: flex-end; justify-content: center;">
            <div style="transform: scale(${baseScale}); transform-origin: 50% 100%;">
              ${mushSvg}
            </div>
          </div>
        </div>`,
        iconSize: [boxW, boxH],
        iconAnchor: [Math.round(boxW / 2), Math.round(boxH * 0.85)]
      });

      const marker = L.marker([m.lat, m.lng], {
        icon: mushIcon,
        zIndexOffset: isSelectedCallout ? 1800 : 100
      }).addTo(group);

      marker.on('click', (ev) => {
        if (orbitDragRef.current.moved || overheadPanRef.current.moved) return;
        L.DomEvent.stopPropagation(ev);
        const targetEl = ev.originalEvent?.target as HTMLElement | null;
        if (targetEl?.closest?.('[data-mushroom-callout="true"]')) {
          if (onSelectMushroom) onSelectMushroom(m);
        } else {
          setActiveCalloutId(m.id);
        }
      });
    });
  }, [
    flowers,
    mergedNodes,
    placeLabels,
    myLat,
    myLng,
    isMini,
    isSurround,
    showOverheadFlowers,
    activeCalloutId
  ]);

  // 獨立圖層渲染玩家與地瓜球小隊（依據手機即時指南針方向與鏡頭 360° 旋轉，不重繪周圍花菇）
  useEffect(() => {
    const pGroup = playerGroupRef.current;
    if (!pGroup) return;
    pGroup.clearLayers();
    if (isMini) return;

    if (isPlanting) {
      L.circle([myLat, myLng], {
        radius: 22,
        color: '#FFFFFF',
        fillColor: PETAL_META[activePetalColor].hex,
        fillOpacity: 0.25,
        weight: 1.8
      }).addTo(pGroup);
    }

    if (isSurround) {
      // 計算小隊跟隨向量（永遠緊跟在玩家背後半圓！）
      const yawRad = ((quantizedRelYaw + 180) * Math.PI) / 180;
      const bx = Math.sin(yawRad);
      const by = -Math.cos(yawRad);
      const rx = -by;
      const ry = bx;
      const showBack = quantizedRelYaw < 65 || quantizedRelYaw > 295;

      const trailSlots = [
        { behind: 16, lat: -15 },
        { behind: 16, lat: 15 },
        { behind: 26, lat: -8 },
        { behind: 26, lat: 8 },
        { behind: 23, lat: -26 },
        { behind: 23, lat: 26 },
        { behind: 36, lat: -16 },
        { behind: 36, lat: 16 }
      ];

      const followersHtml = squad
        .slice(0, 8)
        .map((c, idx) => {
          const slot = trailSlots[idx % trailSlots.length];
          const dx = bx * slot.behind + rx * slot.lat;
          const dy = by * slot.behind + ry * slot.lat;
          const fHex = PETAL_META[c.flowerColor].hex;
          const deguaSvg = buildFollowingDeGuaCreatureSvg(c.variety, c.leafStage, fHex, showBack);
          return `<div
            class="degua-bounce"
            style="
              position: absolute;
              left: calc(50% + ${dx.toFixed(1)}px);
              top: calc(50% + ${dy.toFixed(1)}px);
              transform: translate(-50%, -85%);
              animation-delay: ${(idx * 0.16).toFixed(2)}s;
              pointer-events: none;
              z-index: ${dy > 0 ? 30 : 12};
            "
          >${deguaSvg}</div>`;
        })
        .join('');

      const walkerSvg = buildDirectionalWalkingPlayerSvg(quantizedRelYaw, 42, 60);
      const compactArrowSvg = `
        <svg width="34" height="34" viewBox="0 0 36 36" style="overflow:visible;filter:drop-shadow(0 3px 5px rgba(0,0,0,0.44));">
          <path d="M 18 3 L 30 30 L 18 23.5 L 6 30 Z" fill="#FFFFFF" stroke="#64748B" stroke-width="1.35" stroke-linejoin="round" />
          <path d="M 18 3 L 18 23.5 L 6 30 Z" fill="rgba(226,232,240,0.44)" />
        </svg>
      `;

      const surroundPlayerIcon = L.divIcon({
        className: 'pikmin-surround-player',
        html: `<div style="
          position: relative;
          width: 110px;
          height: 100px;
          pointer-events: none;
        ">
          <div style="
            position: absolute;
            inset: 0;
            transform: rotate(var(--neg-camera-bearing, 0deg)) scaleY(1.36) scale(var(--surround-inv-scale, 1));
            transform-origin: 50% 60%;
            opacity: var(--surround-walker-opacity, 1);
            transition: opacity 0.14s ease;
          ">
            ${followersHtml}
            <div style="
              position: absolute;
              left: 50%;
              top: 50%;
              transform: translate(-50%, -78%);
              z-index: 20;
            ">
              ${walkerSvg}
            </div>
          </div>
          <div style="
            position: absolute;
            left: 55px;
            top: 58px;
            width: 34px;
            height: 34px;
            transform: translate(-50%, -50%) scale(calc(var(--surround-inv-scale, 1) * 1.15)) rotate(var(--player-heading, 0deg));
            transform-origin: 50% 50%;
            opacity: var(--surround-arrow-opacity, 0);
            transition: opacity 0.14s ease;
            z-index: 25;
          ">
            ${compactArrowSvg}
          </div>
        </div>`,
        iconSize: [110, 100],
        iconAnchor: [55, 58]
      });

      L.marker([myLat, myLng], { icon: surroundPlayerIcon, interactive: false, zIndexOffset: 900 }).addTo(pGroup);
    } else {
      const overheadPlayerIcon = L.divIcon({
        className: 'pikmin-overhead-player',
        html: `<div style="
          position: relative;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        ">
          <div style="
            position: absolute;
            inset: 0;
            transform: rotate(var(--player-heading, ${quantizedHeading}deg));
            display: flex;
            align-items: flex-start;
            justify-content: center;
          ">
            <div style="
              width: 0;
              height: 0;
              margin-top: -4px;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-bottom: 10px solid #FFFFFF;
              filter: drop-shadow(0 1px 2px rgba(0,0,0,0.28));
            "></div>
          </div>
          <div style="
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: #DBEAFE;
            border: 2.5px solid #FFFFFF;
            box-shadow: 0 3px 10px rgba(0,0,0,0.3);
            overflow: hidden;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            transform: rotate(var(--neg-camera-bearing, 0deg));
          ">
            <svg width="26" height="26" viewBox="0 0 48 48">
              <path d="M9 48 C10 34 38 34 39 48 Z" fill="#38BDF8" />
              <circle cx="24" cy="21" r="13.5" fill="#FDE68A" />
              <path d="M 10.5 20 C 10.5 7 37.5 7 37.5 20 C 34 13.5 29 12.5 24 13.5 C 18.5 12.5 14 14 10.5 20 Z" fill="#27272A" />
              <circle cx="19" cy="21.5" r="2" fill="#1E293B" />
              <circle cx="29" cy="21.5" r="2" fill="#1E293B" />
              <path d="M 20.5 27 Q 24 29.8 27.5 27" stroke="#9A3412" stroke-width="1.8" stroke-linecap="round" fill="none" />
            </svg>
          </div>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      L.marker([myLat, myLng], { icon: overheadPlayerIcon, interactive: false, zIndexOffset: 900 }).addTo(pGroup);
    }
  }, [
    myLat,
    myLng,
    isMini,
    isSurround,
    isPlanting,
    activePetalColor,
    squad,
    quantizedRelYaw,
    quantizedHeading
  ]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMini || pinchRef.current.active) return;
    if (isSurround && e.isPrimary) {
      orbitDragRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        startBearing: activeBearingRef.current,
        moved: false
      };
      setIsDraggingOrbit(true);
    } else if (!isSurround && e.pointerType === 'mouse' && e.button === 0) {
      overheadPanRef.current = {
        active: true,
        blockedUntilLift: false,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        moved: false
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isSurround && orbitDragRef.current.active) {
      const dx = e.clientX - orbitDragRef.current.startX;
      const dy = e.clientY - orbitDragRef.current.startY;
      if (Math.hypot(dx, dy) > 5) {
        orbitDragRef.current.moved = true;
      }
      const nextBearing = (((orbitDragRef.current.startBearing + dx * 0.55) % 360) + 360) % 360;
      activeBearingRef.current = nextBearing;
      applySurroundDomTransform(surroundZoomRef.current, nextBearing);
      setBearingValue(nextBearing);
    } else if (!isSurround && e.pointerType === 'mouse' && overheadPanRef.current.active) {
      const map = mapRef.current;
      if (!map) return;
      if (
        !overheadPanRef.current.moved &&
        Math.hypot(e.clientX - overheadPanRef.current.startX, e.clientY - overheadPanRef.current.startY) > 4
      ) {
        overheadPanRef.current.moved = true;
        hasPannedOverheadRef.current = true;
      }
      if (overheadPanRef.current.moved) {
        const dx = e.clientX - overheadPanRef.current.lastX;
        const dy = e.clientY - overheadPanRef.current.lastY;
        overheadPanRef.current.lastX = e.clientX;
        overheadPanRef.current.lastY = e.clientY;
        panOverheadByScreenDelta(map, dx, dy);
      }
    }
  };

  const handlePointerUpOrCancel = () => {
    if (orbitDragRef.current.active) {
      orbitDragRef.current.active = false;
      setIsDraggingOrbit(false);
      window.setTimeout(() => {
        orbitDragRef.current.moved = false;
      }, 60);
    }
    if (overheadPanRef.current.active) {
      const wasMoved = overheadPanRef.current.moved;
      overheadPanRef.current.active = false;
      if (wasMoved && mapRef.current) {
        const c = mapRef.current.getCenter();
        setViewCenter({ lat: c.lat, lng: c.lng });
      }
      window.setTimeout(() => {
        overheadPanRef.current.moved = false;
      }, 60);
    }
  };

  // 散步模組：3400×3400 正方形畫布錨定 (50%, 67%)，Leaflet 鎖定 17 層並以純 GPU 伸縮；縮小至最小段時平滑切換為指向箭頭
  // 鳥瞰模組：1536×1536 正方形畫布錨定 (50%, 50%)，同時支援雙指無段縮放 ([15.90, 17.10]) 與雙指 360° 旋轉
  const surroundMetrics = computeSurroundMetrics(surroundZoom);
  const { bfScale: overheadBfScale, mushRelScale: overheadMushRelScale } = computeOverheadNodeMetrics(overheadZoom);

  const mapTransformStyle: React.CSSProperties = isSurround
    ? {
        position: 'absolute',
        width: '3400px',
        height: '3400px',
        left: 'calc(50% - 1700px)',
        top: 'calc(67% - 1700px)',
        transform: `perspective(900px) rotateX(${surroundMetrics.tiltDeg.toFixed(1)}deg) rotateZ(${activeBearing.toFixed(1)}deg) scale(${surroundMetrics.totalScale.toFixed(3)})`,
        transformOrigin: '50% 50%',
        transition:
          isDraggingOrbit || isPinching
            ? 'none'
            : 'transform 0.16s cubic-bezier(0.22, 1, 0.36, 1)'
      }
    : isMini
    ? {
        position: 'absolute',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        transform: 'none',
        transition: 'none'
      }
    : {
        position: 'absolute',
        width: '1536px',
        height: '1536px',
        left: 'calc(50% - 768px)',
        top: 'calc(50% - 768px)',
        transform: `rotate(${activeBearing.toFixed(1)}deg) scale(1)`,
        transformOrigin: '50% 50%',
        transition:
          isPinching
            ? 'none'
            : 'transform 0.16s cubic-bezier(0.22, 1, 0.36, 1)'
      };

  return (
    <div
      ref={outerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      onPointerLeave={handlePointerUpOrCancel}
      style={
        {
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          background: isMini ? '#F5F6F1' : '#62B656',
          cursor: isSurround ? (isDraggingOrbit ? 'grabbing' : 'grab') : 'default',
          touchAction: isMini ? 'auto' : 'none',
          '--camera-bearing': `${activeBearing.toFixed(1)}deg`,
          '--neg-camera-bearing': `${(-activeBearing).toFixed(1)}deg`,
          '--player-heading': `${quantizedHeading}deg`,
          '--surround-inv-scale': `${surroundMetrics.invScale.toFixed(3)}`,
          '--surround-node-scale': `${surroundMetrics.nodeScale.toFixed(3)}`,
          '--surround-walker-opacity': surroundMetrics.showArrowLod ? '0' : '1',
          '--surround-arrow-opacity': surroundMetrics.showArrowLod ? '1' : '0',
          '--overhead-bf-scale': `${overheadBfScale.toFixed(3)}`,
          '--overhead-mush-rel-scale': `${overheadMushRelScale.toFixed(3)}`
        } as React.CSSProperties
      }
    >
      <div
        ref={containerRef}
        className={isMini ? 'pikmin-mini-footprint-map' : 'pikmin-clean-street-map'}
        style={mapTransformStyle}
      />
      {/* 周圍 3D 模式頂端藍天遠景霧氣漸層（完全對照皮克敏圖三/四地平線氛圍，兼顧最小縮放角落遮罩） */}
      {isSurround && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: '23%',
            background:
              'linear-gradient(180deg, rgba(138, 198, 240, 0.98) 0%, rgba(154, 212, 238, 0.92) 38%, rgba(164, 218, 236, 0.42) 66%, rgba(164, 218, 236, 0) 100%)',
            pointerEvents: 'none',
            zIndex: 420
          }}
        />
      )}
    </div>
  );
};
