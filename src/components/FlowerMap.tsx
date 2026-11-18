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

interface FlowerMapProps {
  mode: 'mini_footprint' | 'interactive';
  cameraPerspective?: 'surround' | 'overhead';
  cameraBearing?: number;
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

// 記憶體圖磚快取：將已解碼分類完成的 256x256 街廓矩陣快取於記憶體中，切換視角或重開地圖時 0ms 瞬間渲染，絕不重複請求或漏塊！
const cachedFinalTileTypes = new Map<string, Uint8Array>();

const TILE_CDN_MIRRORS = [
  (z: number, x: number, y: number) => `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`,
  (z: number, x: number, y: number) => `https://b.tile.openstreetmap.org/${z}/${x}/${y}.png`,
  (z: number, x: number, y: number) => `https://c.tile.openstreetmap.org/${z}/${x}/${y}.png`,
  (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
];

function paintFinalTypeToCanvas(
  ctx: CanvasRenderingContext2D,
  finalType: Uint8Array,
  coords: L.Coords,
  isMini: boolean,
  isSurround: boolean
) {
  const outImg = ctx.createImageData(256, 256);
  const dst = outImg.data;

  for (let y = 0; y < 256; y++) {
    const yOff = y << 8;
    for (let x = 0; x < 256; x++) {
      const idx = yOff + x;
      const p = idx << 2;
      const t = finalType[idx];

      if (t === 2) {
        // 水域 (#7DD3FC)
        dst[p] = 125;
        dst[p + 1] = 211;
        dst[p + 2] = 252;
        dst[p + 3] = 255;
      } else if (t === 1) {
        // 奶油米白道路 (#F4F0D6) 與柔和路緣 (#C8C49E)
        const isEdge =
          (x > 0 && finalType[idx - 1] !== 1) ||
          (x < 255 && finalType[idx + 1] !== 1) ||
          (y > 0 && finalType[idx - 256] !== 1) ||
          (y < 255 && finalType[idx + 256] !== 1);
        if (isEdge) {
          dst[p] = 200;
          dst[p + 1] = 196;
          dst[p + 2] = 158;
          dst[p + 3] = 255;
        } else {
          dst[p] = 244;
          dst[p + 1] = 240;
          dst[p + 2] = 214;
          dst[p + 3] = 255;
        }
      } else {
        // 乾淨平整的皮克敏翠綠街廓 (#60B354)，緊貼道路內側繪製平滑亮綠街廓輪廓線 (#82CC78)
        const nearRoad =
          (x > 1 && finalType[idx - 2] === 1) ||
          (x < 254 && finalType[idx + 2] === 1) ||
          (y > 1 && finalType[idx - 512] === 1) ||
          (y < 254 && finalType[idx + 512] === 1);
        if (nearRoad && !isMini) {
          dst[p] = 130;
          dst[p + 1] = 204;
          dst[p + 2] = 120;
          dst[p + 3] = 255;
        } else {
          dst[p] = 96;
          dst[p + 1] = 179;
          dst[p + 2] = 84;
          dst[p + 3] = 255;
        }
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

    for (let f = 0; f < 85; f++) {
      const fh = tileSeedHash(coords.x * 31 + f, coords.y * 37 + f, f + 99);
      const fx = 8 + (fh % 240);
      const fy = 8 + ((fh >>> 8) % 240);
      const t = finalType[(fy << 8) + fx];
      if (t === 1 || t === 2) continue;

      const pal = (fh & 3) === 0 ? palB : palA;
      const radius = 3.5 + (fh % 3) * 0.7;

      ctx.fillStyle = '#3E8E34';
      ctx.beginPath();
      ctx.arc(fx + 1, fy + 1.2, radius * 0.9, 0, Math.PI * 2);
      ctx.fill();

      drawCanvasGroundFlower(ctx, fx, fy, radius, pal.petal, pal.center);
    }
  }
}

/**
 * 即時 OpenStreetMap 像素著色與去文字圖磚引擎 (Real-Time OSM Pixel-Shader & Text-Eraser)
 * - 內建多 CDN 備援重試 + 記憶體快取，確保畫面四周與邊緣的所有圖磚 100% 完整載入，絕不缺塊！
 */
export function createPikminOsmShaderTileLayer(
  getState: () => {
    isMini: boolean;
    cameraPerspective: 'surround' | 'overhead';
  }
): L.GridLayer {
  const PikminShaderGrid = L.GridLayer.extend({
    createTile: function (coords: L.Coords, done: L.DoneCallback) {
      const tile = document.createElement('canvas');
      tile.width = 256;
      tile.height = 256;
      tile.style.width = '256px';
      tile.style.height = '256px';

      const ctx = tile.getContext('2d');
      if (!ctx) {
        done(undefined, tile);
        return tile;
      }

      ctx.fillStyle = '#60B354';
      ctx.fillRect(0, 0, 256, 256);

      const cacheKey = `${coords.z}_${coords.x}_${coords.y}`;
      const cached = cachedFinalTileTypes.get(cacheKey);
      if (cached) {
        const { isMini, cameraPerspective } = getState();
        paintFinalTypeToCanvas(
          ctx,
          cached,
          coords,
          isMini,
          !isMini && cameraPerspective === 'surround'
        );
        window.setTimeout(() => done(undefined, tile), 0);
        return tile;
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

            const rawType = new Uint8Array(65536);
            const isTextCore = new Uint8Array(65536);

            for (let i = 0; i < 65536; i++) {
              const p = i << 2;
              const r = srcData[p];
              const g = srcData[p + 1];
              const b = srcData[p + 2];
              const minC = r < g ? (r < b ? r : b) : g < b ? g : b;
              const maxC = r > g ? (r > b ? r : b) : g > b ? g : b;

              // 水域 (河川、湖泊、海洋)
              if (b > r + 14 && b > 172 && g > 162) {
                rawType[i] = 2;
                continue;
              }

              // 橘黃粉紅主幹道 (國道、省道、主要幹道)
              if (
                r >= 220 &&
                g >= 132 &&
                b <= 218 &&
                (r - b >= 22 || (r >= 234 && g >= 234 && b <= 212))
              ) {
                rawType[i] = 1;
                continue;
              }

              // 公園與森林綠地
              if (g > r + 8 && g > b + 6 && g >= 148) {
                rawType[i] = 4;
                continue;
              }

              // 偵測文字筆畫與小圖示
              if (minC < 176 || (maxC - minC > 36 && r < 228)) {
                isTextCore[i] = 1;
                continue;
              }

              // 白色街巷道路
              if (r >= 246 && g >= 246 && b >= 242) {
                rawType[i] = 1;
                continue;
              }
            }

            const healType = new Uint8Array(65536);
            for (let y = 0; y < 256; y++) {
              const yOff = y << 8;
              for (let x = 0; x < 256; x++) {
                const idx = yOff + x;

                let nearText = false;
                const yMin = y > 3 ? y - 3 : 0;
                const yMax = y < 252 ? y + 3 : 255;
                const xMin = x > 3 ? x - 3 : 0;
                const xMax = x < 252 ? x + 3 : 255;

                for (let ny = yMin; ny <= yMax; ny++) {
                  const nyOff = ny << 8;
                  for (let nx = xMin; nx <= xMax; nx++) {
                    if (isTextCore[nyOff + nx]) {
                      nearText = true;
                      break;
                    }
                  }
                  if (nearText) break;
                }

                if (!nearText) {
                  healType[idx] = rawType[idx];
                } else {
                  let roadVotes = 0;
                  let waterVotes = 0;
                  const offsets = [
                    [-5, 0],
                    [5, 0],
                    [0, -5],
                    [0, 5],
                    [-4, -4],
                    [4, -4],
                    [-4, 4],
                    [4, 4]
                  ];
                  for (let k = 0; k < 8; k++) {
                    const sx = x + offsets[k][0];
                    const sy = y + offsets[k][1];
                    if (sx >= 0 && sx < 256 && sy >= 0 && sy < 256) {
                      const sIdx = (sy << 8) + sx;
                      if (!isTextCore[sIdx]) {
                        const t = rawType[sIdx];
                        if (t === 1) roadVotes++;
                        else if (t === 2) waterVotes++;
                      }
                    }
                  }
                  if (waterVotes >= 3) healType[idx] = 2;
                  else if (roadVotes >= 4) healType[idx] = 1;
                  else healType[idx] = 0;
                }
              }
            }

            const finalType = new Uint8Array(65536);
            for (let y = 0; y < 256; y++) {
              const yOff = y << 8;
              for (let x = 0; x < 256; x++) {
                const idx = yOff + x;
                let rCount = 0;
                let wCount = 0;
                for (let dy = -1; dy <= 1; dy++) {
                  const ny = y + dy;
                  if (ny < 0 || ny > 255) continue;
                  const nyOff = ny << 8;
                  for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    if (nx < 0 || nx > 255) continue;
                    const t = healType[nyOff + nx];
                    if (t === 1) rCount++;
                    else if (t === 2) wCount++;
                  }
                }
                if (wCount >= 5) finalType[idx] = 2;
                else if (rCount >= 4) finalType[idx] = 1;
                else finalType[idx] = 0;
              }
            }

            cachedFinalTileTypes.set(cacheKey, finalType);
            const { isMini, cameraPerspective } = getState();
            paintFinalTypeToCanvas(
              ctx,
              finalType,
              coords,
              isMini,
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
 * 繪製「全身邁步走路的玩家角色」SVG
 */
function buildFullBodyWalkingPlayerSvg(): string {
  return `
    <svg width="56" height="80" viewBox="0 0 56 80" style="overflow:visible;filter:drop-shadow(0 5px 7px rgba(0,0,0,0.32));">
      <ellipse cx="28" cy="73" rx="14" ry="5" fill="rgba(0,0,0,0.26)" />
      <g class="pikmin-walker-leg-l">
        <rect x="19" y="50" width="7" height="17" rx="3.5" fill="#1E3A8A" />
        <ellipse cx="22.5" cy="68" rx="5.5" ry="3.5" fill="#EF4444" stroke="#FFFFFF" stroke-width="1.2" />
      </g>
      <g class="pikmin-walker-leg-r">
        <rect x="30" y="50" width="7" height="17" rx="3.5" fill="#1E40AF" />
        <ellipse cx="33.5" cy="68" rx="5.5" ry="3.5" fill="#EF4444" stroke="#FFFFFF" stroke-width="1.2" />
      </g>
      <g class="pikmin-walker-body">
        <rect x="15" y="29" width="26" height="20" rx="6" fill="#D97706" stroke="#92400E" stroke-width="1.2" />
        <rect x="11" y="32" width="6" height="16" rx="3" transform="rotate(14 14 32)" fill="#38BDF8" stroke="#0284C7" stroke-width="1" />
        <circle cx="12" cy="48" r="3" fill="#FDE68A" />
        <rect x="39" y="32" width="6" height="16" rx="3" transform="rotate(-14 42 32)" fill="#38BDF8" stroke="#0284C7" stroke-width="1" />
        <circle cx="44" cy="48" r="3" fill="#FDE68A" />
        <path d="M 17 31 C 17 27 39 27 39 31 L 40 52 L 16 52 Z" fill="#38BDF8" stroke="#0284C7" stroke-width="1.2" />
        <rect x="24" y="30" width="8" height="22" fill="#FFFFFF" />
        <rect x="19" y="30" width="3" height="18" rx="1" fill="#92400E" />
        <rect x="34" y="30" width="3" height="18" rx="1" fill="#92400E" />
        <circle cx="28" cy="17" r="12" fill="#FDE68A" stroke="#D97706" stroke-width="1" />
        <path d="M 16 16 C 16 5 40 5 40 16 C 37 11 32 10 28 11 C 23 10 19 12 16 16 Z" fill="#27272A" />
        <circle cx="23.5" cy="17.5" r="1.8" fill="#1E293B" />
        <circle cx="32.5" cy="17.5" r="1.8" fill="#1E293B" />
        <circle cx="20.5" cy="20" r="2.2" fill="#FDA4AF" opacity="0.7" />
        <circle cx="35.5" cy="20" r="2.2" fill="#FDA4AF" opacity="0.7" />
        <path d="M 25 22 Q 28 24.5 31 22" stroke="#9A3412" stroke-width="1.5" stroke-linecap="round" fill="none" />
      </g>
    </svg>
  `;
}

/**
 * 繪製跟著玩家一起走的「立體地瓜球小隊成員」SVG
 */
function buildFollowingDeGuaCreatureSvg(
  variety: DeGuaVariety,
  leafStage: DeGuaCreature['leafStage'],
  flowerHex: string
): string {
  const vMeta = VARIETY_CATALOG[variety];
  const topSprout =
    leafStage === 'flower'
      ? `<g transform="translate(18, 6)">
           <circle cx="0" cy="-4" r="3" fill="${flowerHex}" />
           <circle cx="0" cy="4" r="3" fill="${flowerHex}" />
           <circle cx="-4" cy="0" r="3" fill="${flowerHex}" />
           <circle cx="4" cy="0" r="3" fill="${flowerHex}" />
           <circle cx="0" cy="0" r="2.3" fill="#FACC15" />
         </g>`
      : leafStage === 'bud'
      ? `<circle cx="18" cy="6" r="4" fill="#F8FAFC" stroke="#C084FC" stroke-width="1.3" />`
      : `<path d="M 18 9 C 11 3 10 11 18 11 C 26 11 25 3 18 9 Z" fill="#4ADE80" stroke="#15803D" stroke-width="1" />`;

  return `
    <svg width="36" height="44" viewBox="0 0 36 44" style="overflow:visible;filter:drop-shadow(0 3px 4px rgba(0,0,0,0.28));">
      <ellipse cx="18" cy="40" rx="9" ry="3" fill="rgba(0,0,0,0.22)" />
      <path d="M 18 17 Q 17 11 18 7" stroke="#15803D" stroke-width="2" stroke-linecap="round" fill="none" />
      ${topSprout}
      <ellipse cx="13.5" cy="37" rx="3" ry="2.2" fill="${vMeta.bodyColor}" stroke="#1E293B" stroke-width="0.9" />
      <ellipse cx="22.5" cy="37" rx="3" ry="2.2" fill="${vMeta.bodyColor}" stroke="#1E293B" stroke-width="0.9" />
      <ellipse cx="18" cy="26" rx="11.5" ry="10.5" fill="${vMeta.bodyColor}" stroke="#1E293B" stroke-width="1.1" />
      <ellipse cx="14.5" cy="22" rx="4.5" ry="2.8" fill="${vMeta.spotColor}" opacity="0.55" />
      <ellipse cx="6" cy="26" rx="2.5" ry="1.8" fill="${vMeta.bodyColor}" stroke="#1E293B" stroke-width="0.8" />
      <ellipse cx="30" cy="26" rx="2.5" ry="1.8" fill="${vMeta.bodyColor}" stroke="#1E293B" stroke-width="0.8" />
      <circle cx="14" cy="25.5" r="2.6" fill="#FFFFFF" stroke="#1E293B" stroke-width="0.9" />
      <circle cx="22" cy="25.5" r="2.6" fill="#FFFFFF" stroke="#1E293B" stroke-width="0.9" />
      <circle cx="14.3" cy="25.5" r="1.3" fill="#0F172A" />
      <circle cx="22.3" cy="25.5" r="1.3" fill="#0F172A" />
      <path d="M 16 29.5 Q 18 31.2 20 29.5" stroke="#1E293B" stroke-width="1.1" stroke-linecap="round" fill="none" />
    </svg>
  `;
}

/**
 * 繪製「長莖立體大花 / 花苞」SVG
 */
function buildTallBigFlowerSvg(isBloomed: boolean, isBud: boolean, colorHex: string): string {
  if (isBloomed) {
    return `
      <svg width="74" height="96" viewBox="0 0 74 96" style="overflow:visible;filter:drop-shadow(0 6px 8px rgba(0,0,0,0.28));">
        <ellipse cx="37" cy="88" rx="14" ry="5" fill="rgba(0,0,0,0.22)" />
        <path d="M 37 88 Q 34 62 37 32" stroke="#4ADE80" stroke-width="5.5" stroke-linecap="round" fill="none" />
        <path d="M 36 66 C 22 60 18 70 35 72" fill="#22C55E" />
        <path d="M 38 58 C 52 52 56 62 39 64" fill="#22C55E" />
        <g transform="translate(37, 26)">
          <ellipse cx="0" cy="-16" rx="7" ry="13" fill="${colorHex}" stroke="#CBD5E1" stroke-width="1" />
          <ellipse cx="0" cy="16" rx="7" ry="13" fill="${colorHex}" stroke="#CBD5E1" stroke-width="1" />
          <ellipse cx="-16" cy="0" rx="13" ry="7" fill="${colorHex}" stroke="#CBD5E1" stroke-width="1" />
          <ellipse cx="16" cy="0" rx="13" ry="7" fill="${colorHex}" stroke="#CBD5E1" stroke-width="1" />
          <ellipse cx="-11" cy="-11" rx="11" ry="6.5" transform="rotate(45 -11 -11)" fill="${colorHex}" />
          <ellipse cx="11" cy="-11" rx="11" ry="6.5" transform="rotate(-45 11 -11)" fill="${colorHex}" />
          <ellipse cx="-11" cy="11" rx="11" ry="6.5" transform="rotate(-45 -11 11)" fill="${colorHex}" />
          <ellipse cx="11" cy="11" rx="11" ry="6.5" transform="rotate(45 11 11)" fill="${colorHex}" />
          <circle cx="0" cy="0" r="9.5" fill="#FACC15" stroke="#CA8A04" stroke-width="1.5" />
        </g>
      </svg>
    `;
  }

  if (isBud) {
    return `
      <svg width="64" height="86" viewBox="0 0 64 86" style="overflow:visible;filter:drop-shadow(0 5px 7px rgba(0,0,0,0.25));">
        <ellipse cx="32" cy="78" rx="12" ry="4.5" fill="rgba(0,0,0,0.2)" />
        <path d="M 32 78 C 28 52 26 22 40 20 C 46 20 48 26 46 30" stroke="#34D399" stroke-width="5" stroke-linecap="round" fill="none" />
        <path d="M 30 62 C 18 56 16 66 30 67" fill="#10B981" />
        <g transform="translate(46, 32) rotate(20)">
          <ellipse cx="0" cy="0" rx="9" ry="11" fill="#F8FAFC" stroke="#C084FC" stroke-width="2" />
          <path d="M -7 -4 Q 0 -12 7 -4" fill="#86EFAC" />
        </g>
      </svg>
    `;
  }

  return `
    <svg width="56" height="72" viewBox="0 0 56 72" style="overflow:visible;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.22));">
      <ellipse cx="28" cy="64" rx="11" ry="4" fill="rgba(0,0,0,0.2)" />
      <path d="M 28 64 Q 27 46 28 32" stroke="#22C55E" stroke-width="4.5" stroke-linecap="round" fill="none" />
      <path d="M 28 36 C 12 24 10 42 28 42" fill="#4ADE80" stroke="#15803D" stroke-width="1.5" />
      <path d="M 28 36 C 44 24 46 42 28 42" fill="#22C55E" stroke="#15803D" stroke-width="1.5" />
    </svg>
  `;
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

export const FlowerMap: React.FC<FlowerMapProps> = ({
  mode,
  cameraPerspective = 'surround',
  cameraBearing = 0,
  recenterSeq = 0,
  focusedTarget = null,
  onBearingChange,
  onPerspectiveChange,
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
  const [activeCalloutId, setActiveCalloutId] = useState<string | null>(null);
  const [surroundZoom, setSurroundZoom] = useState<number>(17.0);
  const [overheadZoom, setOverheadZoom] = useState<number>(15);

  const surroundZoomRef = useRef<number>(17.0);
  const overheadZoomRef = useRef<number>(15);
  const hasPannedOverheadRef = useRef<boolean>(false);
  const wheelAccumRef = useRef<number>(0);
  const perspectiveSwitchCooldownRef = useRef<number>(0);
  const pinchRef = useRef<{
    active: boolean;
    startDist: number;
    startSurroundZoom: number;
    startOverheadZoom: number;
  }>({
    active: false,
    startDist: 0,
    startSurroundZoom: 17.0,
    startOverheadZoom: 15
  });
  const playerCoordRef = useRef<{ lat: number; lng: number }>({ lat: myLat, lng: myLng });
  playerCoordRef.current = { lat: myLat, lng: myLng };
  const activePerspectiveRef = useRef<'surround' | 'overhead'>(cameraPerspective);
  activePerspectiveRef.current = cameraPerspective;
  const onPerspectiveChangeRef = useRef(onPerspectiveChange);
  onPerspectiveChangeRef.current = onPerspectiveChange;

  const activeBearing = onBearingChange ? cameraBearing : internalBearing;

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

    const targetZoom = isMini ? 15 : cameraPerspective === 'surround' ? Math.round(surroundZoomRef.current) : overheadZoomRef.current;
    const map = L.map(containerRef.current, {
      center: [myLat, myLng],
      zoom: targetZoom,
      minZoom: 13,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
      dragging: !isMini && cameraPerspective === 'overhead',
      // 禁用 Leaflet 原生游標縮放與 CSS zoomAnimation，改由皮克敏中心鎖定縮放引擎接管
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
    mapRef.current = map;
    layerGroupRef.current = group;

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
      map.on('dragstart', () => {
        if (activePerspectiveRef.current === 'overhead') {
          hasPannedOverheadRef.current = true;
        }
      });
      map.on('moveend', () => {
        const c = map.getCenter();
        setViewCenter({ lat: c.lat, lng: c.lng });
      });
      map.on('click', () => {
        if (orbitDragRef.current.moved) return;
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

  // 皮克敏式中心鎖定滾輪縮放：周圍視角永遠以玩家為中心平滑縮放並自適應切換俯瞰；俯瞰視角亦保持置中縮放不偏移！
  useEffect(() => {
    const el = outerRef.current;
    if (!el || isMini) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const map = mapRef.current;
      if (!map) return;

      const now = Date.now();
      const p = playerCoordRef.current;

      if (activePerspectiveRef.current === 'surround') {
        const rawStep = e.deltaY < 0 ? 0.22 : -0.22;
        const nextZoom = surroundZoomRef.current + rawStep;

        if (nextZoom < 15.8 && onPerspectiveChangeRef.current) {
          if (now - perspectiveSwitchCooldownRef.current > 350) {
            perspectiveSwitchCooldownRef.current = now;
            hasPannedOverheadRef.current = false;
            overheadZoomRef.current = 15;
            setOverheadZoom(15);
            onPerspectiveChangeRef.current('overhead');
          }
          return;
        }

        const clamped = Math.max(15.8, Math.min(18.2, Number(nextZoom.toFixed(2))));
        const prevBase = Math.round(surroundZoomRef.current);
        const nextBase = Math.round(clamped);
        surroundZoomRef.current = clamped;
        setSurroundZoom(clamped);
        if (nextBase !== prevBase) {
          map.setView([p.lat, p.lng], nextBase, { animate: false });
          setViewCenter({ lat: p.lat, lng: p.lng });
        }
      } else {
        wheelAccumRef.current += e.deltaY;
        if (Math.abs(wheelAccumRef.current) < 42) return;
        const dir = wheelAccumRef.current < 0 ? 1 : -1;
        wheelAccumRef.current = 0;

        const nextZoom = overheadZoomRef.current + dir;
        if (nextZoom > 17 && onPerspectiveChangeRef.current) {
          if (now - perspectiveSwitchCooldownRef.current > 350) {
            perspectiveSwitchCooldownRef.current = now;
            hasPannedOverheadRef.current = false;
            surroundZoomRef.current = 16.5;
            setSurroundZoom(16.5);
            onPerspectiveChangeRef.current('surround');
          }
          return;
        }

        const clamped = Math.max(13, Math.min(17, nextZoom));
        if (clamped === overheadZoomRef.current) return;
        overheadZoomRef.current = clamped;
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
      if (e.touches.length !== 2) return;
      const map = mapRef.current;
      orbitDragRef.current.active = false;
      setIsDraggingOrbit(false);
      if (map && activePerspectiveRef.current === 'overhead') {
        map.dragging.disable();
      }
      const d = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      pinchRef.current = {
        active: true,
        startDist: Math.max(12, d),
        startSurroundZoom: surroundZoomRef.current,
        startOverheadZoom: overheadZoomRef.current
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pinchRef.current.active || e.touches.length !== 2) return;
      e.preventDefault();
      e.stopPropagation();
      const map = mapRef.current;
      if (!map) return;

      const d = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      const scaleRatio = Math.max(0.25, Math.min(4, d / pinchRef.current.startDist));
      const zoomDelta = Math.log2(scaleRatio);
      const now = Date.now();
      const p = playerCoordRef.current;

      if (activePerspectiveRef.current === 'surround') {
        const nextZoom = pinchRef.current.startSurroundZoom + zoomDelta;
        if (nextZoom < 15.8 && onPerspectiveChangeRef.current) {
          if (now - perspectiveSwitchCooldownRef.current > 350) {
            perspectiveSwitchCooldownRef.current = now;
            pinchRef.current.active = false;
            hasPannedOverheadRef.current = false;
            overheadZoomRef.current = 15;
            setOverheadZoom(15);
            onPerspectiveChangeRef.current('overhead');
          }
          return;
        }
        const clamped = Math.max(15.8, Math.min(18.2, Number(nextZoom.toFixed(2))));
        const prevBase = Math.round(surroundZoomRef.current);
        const nextBase = Math.round(clamped);
        surroundZoomRef.current = clamped;
        setSurroundZoom(clamped);
        if (nextBase !== prevBase) {
          map.setView([p.lat, p.lng], nextBase, { animate: false });
          setViewCenter({ lat: p.lat, lng: p.lng });
        }
      } else {
        const targetFloat = pinchRef.current.startOverheadZoom + zoomDelta;
        if (targetFloat > 17.35 && onPerspectiveChangeRef.current) {
          if (now - perspectiveSwitchCooldownRef.current > 350) {
            perspectiveSwitchCooldownRef.current = now;
            pinchRef.current.active = false;
            hasPannedOverheadRef.current = false;
            surroundZoomRef.current = 16.5;
            setSurroundZoom(16.5);
            onPerspectiveChangeRef.current('surround');
          }
          return;
        }
        const clamped = Math.max(13, Math.min(17, Math.round(targetFloat)));
        if (clamped === overheadZoomRef.current) return;
        overheadZoomRef.current = clamped;
        setOverheadZoom(clamped);
        if (!hasPannedOverheadRef.current) {
          map.setView([p.lat, p.lng], clamped, { animate: false });
          setViewCenter({ lat: p.lat, lng: p.lng });
        } else {
          map.setZoom(clamped, { animate: false });
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2 && pinchRef.current.active) {
        pinchRef.current.active = false;
        const map = mapRef.current;
        if (map && activePerspectiveRef.current === 'overhead') {
          map.dragging.enable();
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isMini]);

  // 僅在使用者實際切換視角模式 (surround <-> overhead) 時重新調整容器尺寸與圖磚樣式
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (isMini) {
      map.dragging.disable();
    } else if (cameraPerspective === 'surround') {
      map.dragging.disable();
    } else {
      map.dragging.enable();
      setBearingValue(0);
    }

    const perspectiveChanged = prevPerspectiveRef.current !== cameraPerspective;
    prevPerspectiveRef.current = cameraPerspective;
    if (!perspectiveChanged) return;

    hasPannedOverheadRef.current = false;
    const targetZoom = isMini
      ? 15
      : cameraPerspective === 'surround'
      ? Math.round(surroundZoomRef.current)
      : overheadZoomRef.current;

    map.invalidateSize({ animate: false });
    map.setView([myLat, myLng], targetZoom, { animate: false });
    setViewCenter({ lat: myLat, lng: myLng });

    const timer = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
      map.setView([myLat, myLng], targetZoom, { animate: false });
      setViewCenter({ lat: myLat, lng: myLng });
      if (shaderLayerRef.current) {
        shaderLayerRef.current.redraw();
      }
    }, 45);

    return () => window.clearTimeout(timer);
  }, [cameraPerspective, isMini]);

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
        surroundZoomRef.current = 17.0;
        setSurroundZoom(17.0);
      } else {
        overheadZoomRef.current = 15;
        setOverheadZoom(15);
      }
      const targetZoom = isMini ? 15 : cameraPerspective === 'surround' ? 17 : 15;
      map.invalidateSize({ animate: false });
      map.setView([myLat, myLng], targetZoom, { animate: false });
      setViewCenter({ lat: myLat, lng: myLng });
      return;
    }

    if (distMeters > 2500) {
      const targetZoom = isMini
        ? 15
        : cameraPerspective === 'surround'
        ? Math.round(surroundZoomRef.current)
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
    const targetZoom = cameraPerspective === 'surround' ? 17 : Math.max(15, overheadZoomRef.current);
    map.invalidateSize({ animate: false });
    map.setView([focusedTarget.lat, focusedTarget.lng], targetZoom, { animate: false });
    setViewCenter({ lat: focusedTarget.lat, lng: focusedTarget.lng });
    if (focusedTarget.mushroomId) {
      setActiveCalloutId(focusedTarget.mushroomId);
    }
  }, [focusedTarget?.seq]);

  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    // ==================== 模式 A：主畫面紅框靜態「今日足跡概覽地圖」 ====================
    if (isMini) {
      L.circle([myLat, myLng], {
        radius: 260,
        color: '#22C55E',
        weight: 0,
        fillColor: '#4ADE80',
        fillOpacity: 0.34,
        interactive: false
      }).addTo(group);

      const plantedList = Object.values(flowers);
      const trailPoints: [number, number][] =
        plantedList.length >= 3
          ? plantedList.slice(-9).map((c) => [c.lat, c.lng])
          : [
              [myLat - 0.0014, myLng - 0.0011],
              [myLat - 0.001, myLng - 0.0008],
              [myLat - 0.0006, myLng - 0.0005],
              [myLat - 0.0003, myLng - 0.0002],
              [myLat, myLng],
              [myLat + 0.0003, myLng + 0.0003],
              [myLat + 0.0007, myLng + 0.0006]
            ];

      trailPoints.forEach(([tLat, tLng], idx) => {
        const isCurrent = idx === Math.floor(trailPoints.length / 2);
        const fpIcon = L.divIcon({
          className: 'mini-footprint-dot',
          html: `<div style="
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #10B981;
            border: 2.5px solid #FFFFFF;
            box-shadow: 0 0 8px rgba(16,185,129,0.65);
            transform: scale(${isCurrent ? 1.35 : 0.95});
          "></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
        L.marker([tLat, tLng], { icon: fpIcon, interactive: false }).addTo(group);
      });

      return;
    }

    // ==================== 模式 B：互動地圖（圖一：周圍視角 360° 環景 vs 圖二：俯瞰視角） ====================
    const overheadMushScale = Math.max(
      0.24,
      Math.min(0.76, 0.50 * Math.pow(0.70, 15 - overheadZoom))
    );
    const overheadBfScale = overheadMushScale / 0.50;
    const uprightBillboardTransform = isSurround
      ? 'rotate(var(--neg-camera-bearing, 0deg)) scaleY(1.36) scale(var(--surround-node-scale, 1))'
      : `scale(${(0.68 * overheadBfScale).toFixed(2)})`;

    // 0. 在「俯瞰視角 (圖二)」下，顯示稀疏、清楚的大致真實地名（白邊黑字，如：雙連、中山、板橋、新埔等）
    if (!isSurround && placeLabels.length > 0) {
      placeLabels.forEach((p) => {
        const lblIcon = L.divIcon({
          className: 'pikmin-district-label',
          html: `<div style="
            font-size: 15px;
            font-weight: 900;
            color: #1E293B;
            white-space: nowrap;
            text-align: center;
            text-shadow: -1.5px -1.5px 0 #FFF, 1.5px -1.5px 0 #FFF, -1.5px 1.5px 0 #FFF, 1.5px 1.5px 0 #FFF, 0 2px 4px rgba(0,0,0,0.3);
            pointer-events: none;
          ">${p.name}</div>`,
          iconSize: [80, 22],
          iconAnchor: [40, 11]
        });
        L.marker([p.lat, p.lng], { icon: lblIcon, interactive: false }).addTo(group);
      });
    }

    // 1. 玩家實際種下的花海軌跡（俯瞰縮到過遠時自動隱藏以免密密麻麻蓋住街道）
    if (isSurround || overheadZoom >= 15) {
      Object.values(flowers).forEach((cell) => {
        const meta = PETAL_META[cell.color];
        const icon = L.divIcon({
          className: 'pikmin-flower-patch',
          html: `<div style="
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${isSurround ? 19 : 13}px;
            letter-spacing: -4px;
            filter: drop-shadow(0 2px 3px rgba(0,0,0,0.22));
            transform: ${isSurround ? 'rotate(var(--neg-camera-bearing, 0deg)) scaleY(1.35)' : 'none'};
            pointer-events: none;
            white-space: nowrap;
          ">${meta.emoji}${meta.emoji}${cell.count >= 4 ? meta.emoji : ''}</div>`,
          iconSize: [40, 28],
          iconAnchor: [20, 14]
        });
        L.marker([cell.lat, cell.lng], { icon, interactive: false }).addTo(group);
      });
    }

    // 2. 立體長莖大花與彎頸花苞（隨縮放比例自適應大小，絕不互相擠疊）
    mergedNodes.allBigFlowers.forEach((bf, idx) => {
      const isBloomed = bf.currentFlowers >= bf.requiredFlowers || bf.bloomedColor !== null || idx % 3 === 0;
      const isBud = !isBloomed && (bf.currentFlowers >= 45 || idx % 2 === 1);
      const colorChoices = ['#FFFFFF', '#FACC15', '#FB7185'];
      const flowerHex = bf.bloomedColor
        ? PETAL_META[bf.bloomedColor].hex
        : colorChoices[idx % colorChoices.length];

      L.circle([bf.lat, bf.lng], {
        radius: isSurround ? 28 : Math.round(42 * overheadBfScale),
        color: '#67E8F9',
        weight: overheadZoom <= 13 && !isSurround ? 1.2 : 2,
        fillColor: '#A5F3FC',
        fillOpacity: 0.25
      }).addTo(group);

      const svgHtml = buildTallBigFlowerSvg(isBloomed, isBud, flowerHex);

      const bfIcon = L.divIcon({
        className: 'pikmin-clean-big-flower',
        html: `<div style="
          width: 74px;
          height: 96px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          transform: ${uprightBillboardTransform};
          transform-origin: 50% 88%;
          cursor: pointer;
        ">
          ${svgHtml}
        </div>`,
        iconSize: [74, 96],
        iconAnchor: [37, 88]
      });

      const marker = L.marker([bf.lat, bf.lng], { icon: bfIcon }).addTo(group);
      if (onSelectBigFlower) {
        marker.on('click', () => {
          if (orbitDragRef.current.moved) return;
          onSelectBigFlower(bf);
        });
      }
    });

    // 3. 叢生蘑菇群：
    // - 依真實大小（小 / 一般 / 大）呈現清晰高低與寬度比例，並隨縮放比例縮小不堆疊
    // - 無玩家參戰時「不顯示人數與多餘紅點」
    // - 平時「不直接顯示文字」；點擊蘑菇先彈出黑色名字泡泡框，點擊泡泡框才進入全螢幕詳情畫面！
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
      const viewScale = isSurround ? 0.82 : overheadMushScale;
      const boxW = Math.round(dim.w * viewScale);
      const boxH = Math.round(dim.h * viewScale);

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
          transform: ${isSurround ? 'rotate(var(--neg-camera-bearing, 0deg)) scaleY(1.24) scale(var(--surround-node-scale, 1))' : 'none'};
          transform-origin: 50% 85%;
          cursor: pointer;
        ">
          ${calloutHtml}
          ${topBadgeHtml}
          <div style="width: ${boxW}px; height: ${boxH}px; display: flex; align-items: flex-end; justify-content: center;">
            <div style="transform: scale(${viewScale}); transform-origin: 50% 100%;">
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
        if (orbitDragRef.current.moved) return;
        L.DomEvent.stopPropagation(ev);
        const targetEl = ev.originalEvent?.target as HTMLElement | null;
        if (targetEl?.closest?.('[data-mushroom-callout="true"]')) {
          if (onSelectMushroom) onSelectMushroom(m);
        } else {
          setActiveCalloutId(m.id);
        }
      });
    });

    // 4. 玩家角色標記（移除重複的 translate(-50%) 偏移，讓玩家與隨行地瓜球 100% 精準站在畫面正中央 [myLat, myLng]！）
    if (isPlanting) {
      L.circle([myLat, myLng], {
        radius: 26,
        color: '#FFFFFF',
        fillColor: PETAL_META[activePetalColor].hex,
        fillOpacity: 0.28,
        weight: 2
      }).addTo(group);
    }

    if (isSurround) {
      const followerOffsets = [
        { dx: -34, dy: 12 },
        { dx: 34, dy: 12 },
        { dx: -22, dy: 28 },
        { dx: 22, dy: 28 },
        { dx: -46, dy: 24 },
        { dx: 46, dy: 24 },
        { dx: -12, dy: 38 },
        { dx: 12, dy: 38 }
      ];

      const followersHtml = squad
        .slice(0, 8)
        .map((c, idx) => {
          const pos = followerOffsets[idx % followerOffsets.length];
          const fHex = PETAL_META[c.flowerColor].hex;
          const deguaSvg = buildFollowingDeGuaCreatureSvg(c.variety, c.leafStage, fHex);
          return `<div
            class="degua-bounce"
            style="
              position: absolute;
              left: calc(50% + ${pos.dx}px);
              top: calc(50% + ${pos.dy}px);
              transform: translate(-50%, -85%);
              animation-delay: ${(idx * 0.16).toFixed(2)}s;
              pointer-events: none;
              z-index: ${pos.dy > 18 ? 30 : 10};
            "
          >${deguaSvg}</div>`;
        })
        .join('');

      const walkerSvg = buildFullBodyWalkingPlayerSvg();

      const surroundPlayerIcon = L.divIcon({
        className: 'pikmin-surround-player',
        html: `<div style="
          position: relative;
          width: 140px;
          height: 120px;
          transform: rotate(var(--neg-camera-bearing, 0deg)) scaleY(1.36) scale(var(--surround-inv-scale, 1));
          transform-origin: 50% 60%;
          pointer-events: none;
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
        </div>`,
        iconSize: [140, 120],
        iconAnchor: [70, 66]
      });

      L.marker([myLat, myLng], { icon: surroundPlayerIcon, interactive: false }).addTo(group);
    } else {
      const overheadPlayerIcon = L.divIcon({
        className: 'pikmin-overhead-player',
        html: `<div style="
          position: relative;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        ">
          <div style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #FFFFFF;
            border: 3px solid #E2E8F0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.28);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
          ">🧑🏻</div>
          <div style="
            position: absolute;
            bottom: -4px;
            right: -2px;
            width: 0;
            height: 0;
            border-left: 7px solid transparent;
            border-right: 7px solid transparent;
            border-top: 12px solid #FFFFFF;
            transform: rotate(-35deg);
            filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25));
          "></div>
        </div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });

      L.marker([myLat, myLng], { icon: overheadPlayerIcon, interactive: false }).addTo(group);
    }
  }, [
    flowers,
    mergedNodes,
    placeLabels,
    squad,
    myLat,
    myLng,
    isPlanting,
    activePetalColor,
    isMini,
    cameraPerspective,
    overheadZoom,
    activeCalloutId
  ]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSurround || !e.isPrimary || pinchRef.current.active) return;
    orbitDragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startBearing: activeBearing,
      moved: false
    };
    setIsDraggingOrbit(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSurround || !orbitDragRef.current.active) return;
    const dx = e.clientX - orbitDragRef.current.startX;
    const dy = e.clientY - orbitDragRef.current.startY;
    if (Math.hypot(dx, dy) > 5) {
      orbitDragRef.current.moved = true;
    }
    const nextBearing = orbitDragRef.current.startBearing + dx * 0.55;
    setBearingValue(nextBearing);
  };

  const handlePointerUpOrCancel = () => {
    if (!orbitDragRef.current.active) return;
    orbitDragRef.current.active = false;
    setIsDraggingOrbit(false);
    window.setTimeout(() => {
      orbitDragRef.current.moved = false;
    }, 60);
  };

  // 使用 2400×2400 超大對稱正方形畫布（中心精準對齊 50%, 50%，半徑 1200px），
  // 無論鏡頭 0°~360° 旋轉或滾輪拉近拉遠，四周與角落邊緣街廓 100% 滿版顯示，徹底杜絕綠邊截斷與玩家歪掉！
  const surroundBaseZoom = Math.round(surroundZoom);
  const surroundFracScale = Math.pow(2, surroundZoom - surroundBaseZoom);
  const surroundTiltDeg = Math.max(24, Math.min(35, 32 - (surroundZoom - 17) * 2.5));
  const surroundTotalScale = 1.18 * surroundFracScale;
  const surroundInvScale = 1 / surroundFracScale;
  const surroundNodeScale =
    Math.max(0.42, Math.min(1.12, 0.82 * Math.pow(2, (surroundZoom - 17) * 0.6) / surroundFracScale)) /
    0.82;

  const mapTransformStyle: React.CSSProperties = isSurround
    ? {
        position: 'absolute',
        width: '2400px',
        height: '2400px',
        left: 'calc(50% - 1200px)',
        top: 'calc(50% - 1200px)',
        transform: `perspective(900px) rotateX(${surroundTiltDeg.toFixed(1)}deg) rotateZ(${activeBearing.toFixed(1)}deg) scale(${surroundTotalScale.toFixed(3)})`,
        transformOrigin: '50% 50%',
        transition: isDraggingOrbit ? 'none' : 'transform 0.16s cubic-bezier(0.22, 1, 0.36, 1)'
      }
    : {
        position: 'absolute',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        transform: 'none',
        transition: 'none'
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
          background: '#60B354',
          cursor: isSurround ? (isDraggingOrbit ? 'grabbing' : 'grab') : 'default',
          touchAction: isSurround ? 'none' : 'auto',
          '--camera-bearing': `${activeBearing.toFixed(1)}deg`,
          '--neg-camera-bearing': `${(-activeBearing).toFixed(1)}deg`,
          '--surround-inv-scale': `${surroundInvScale.toFixed(3)}`,
          '--surround-node-scale': `${surroundNodeScale.toFixed(3)}`
        } as React.CSSProperties
      }
    >
      <div
        ref={containerRef}
        className={isMini ? 'pikmin-mini-footprint-map' : 'pikmin-clean-street-map'}
        style={mapTransformStyle}
      />
    </div>
  );
};
