import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  BigFlowerNode,
  calculateCreatureMushroomPower,
  calculateMushroomBattleDuration,
  DecorCategory,
  DECOR_CATALOG,
  DeGuaCreature,
  ExpeditionItem,
  MIN_SQUAD_BY_MUSHROOM_SIZE,
  MUSHROOM_CATALOG,
  MushroomNode,
  PetalColor,
  PlantedFlowerCell,
  PostcardItem,
  Seedling,
  VARIETY_CATALOG
} from '../types/game';
import {
  fetchNearbyPlaceLabels,
  getNearestRealLandmarkInfo,
  getNearestRealLandmarkName,
  getVisiblePlaceLabels,
  onRealLandmarksUpdated
} from '../services/realMapService';
import { WorldDeltaState } from '../services/worldSyncService';
import {
  ExpeditionDurationEstimate,
  formatExpeditionDurationParts,
  getExpeditionProgressSnapshot,
  isCategoryColorDecorCompleted,
  normalizeExpeditionItem
} from '../services/expeditionService';
import { DeGuaCharacter } from './DeGuaCharacter';
import {
  buildAuthenticPikminMushroomSvg,
  buildDetailHeroPikminMushroomSvg
} from './PikminMushroomVisual';
import { ExpeditionItemArtwork } from './ExpeditionArtwork';
import { ExpeditionDetailAndDispatch } from './ExpeditionDetailAndDispatch';

export type OverviewSheetTab = 'lifelog' | 'degua' | 'seedling' | 'expedition' | 'postcard';

/* ==================== 輔助 SVG：探險卡片與禮物/瓜糰/水果立體圖示 ==================== */
function buildGlowMushroomClusterSvg(capHex: string, spotHex: string): string {
  return `
    <svg width="88" height="64" viewBox="0 0 88 64" style="overflow:visible;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.35));">
      <ellipse cx="44" cy="57" rx="36" ry="6" fill="rgba(0,0,0,0.28)" />
      <!-- 左側小菇群 -->
      <rect x="10" y="40" width="9" height="14" rx="4" fill="#FDE68A" />
      <path d="M 4 42 C 4 28 24 28 24 42 Z" fill="${capHex}" stroke="#FEF08A" stroke-width="1" />
      <circle cx="11" cy="35" r="2" fill="${spotHex}" />
      <rect x="21" y="36" width="11" height="17" rx="5" fill="#FEF3C7" />
      <path d="M 14 39 C 14 23 39 23 39 39 Z" fill="${capHex}" stroke="#FEF08A" stroke-width="1" />
      <circle cx="23" cy="31" r="2.5" fill="${spotHex}" />
      <circle cx="30" cy="33" r="2" fill="${spotHex}" />
      <!-- 右側小菇群 -->
      <rect x="66" y="40" width="9" height="14" rx="4" fill="#FDE68A" />
      <path d="M 60 42 C 60 28 80 28 80 42 Z" fill="${capHex}" stroke="#FEF08A" stroke-width="1" />
      <circle cx="70" cy="35" r="2" fill="${spotHex}" />
      <rect x="54" y="36" width="11" height="17" rx="5" fill="#FEF3C7" />
      <path d="M 47 39 C 47 23 72 23 72 39 Z" fill="${capHex}" stroke="#FEF08A" stroke-width="1" />
      <circle cx="58" cy="31" r="2.5" fill="${spotHex}" />
      <!-- 中央巨型輝煌主菇 -->
      <rect x="33" y="24" width="22" height="31" rx="8" fill="#FEF9C3" stroke="#F59E0B" stroke-width="1.2" />
      <path d="M 16 29 C 16 3 72 3 72 29 Z" fill="${capHex}" stroke="#FEF08A" stroke-width="1.8" />
      <circle cx="35" cy="15" r="4.2" fill="${spotHex}" opacity="0.95" />
      <circle cx="51" cy="14" r="3.6" fill="${spotHex}" opacity="0.95" />
      <circle cx="43" cy="22" r="3.8" fill="${spotHex}" opacity="0.95" />
      <circle cx="27" cy="22" r="2.8" fill="${spotHex}" opacity="0.95" />
      <circle cx="59" cy="22" r="2.8" fill="${spotHex}" opacity="0.95" />
    </svg>
  `;
}

/**
 * 探險頂部區域概覽地圖圖磚（對照參考圖一：乾淨米白陸地、淺藍水系、暖橘省道公路，無雜亂小路名）
 */
export function createRegionalOverviewTileLayer(): L.GridLayer {
  const OverviewGrid = L.GridLayer.extend({
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

      ctx.fillStyle = '#FAFBF9';
      ctx.fillRect(0, 0, 256, 256);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      const subdomains = ['a', 'b', 'c'];
      const sub = subdomains[Math.abs(coords.x + coords.y) % subdomains.length];
      img.src = `https://${sub}.tile.openstreetmap.org/${coords.z}/${coords.x}/${coords.y}.png`;

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
          const src = offCtx.getImageData(0, 0, 256, 256).data;
          const outImg = ctx.createImageData(256, 256);
          const dst = outImg.data;

          // 0 = 米白陸地 (#FAFBF9), 1 = 暖橘公路 (#F5D6A7), 2 = 淺藍水系 (#93CFF2)
          const raw = new Uint8Array(65536);
          const textMask = new Uint8Array(65536);

          for (let i = 0; i < 65536; i++) {
            const p = i << 2;
            const r = src[p];
            const g = src[p + 1];
            const b = src[p + 2];
            const minC = r < g ? (r < b ? r : b) : g < b ? g : b;

            // 水系 (河海 #AAD3DF)
            if (b > r + 14 && b > 172 && g > 162) {
              raw[i] = 2;
              continue;
            }
            // 主幹道公路 (國道/省道/主要道路)
            if (
              r >= 220 &&
              g >= 130 &&
              b <= 215 &&
              (r - b >= 22 || (r >= 235 && g >= 235 && b <= 210))
            ) {
              raw[i] = 1;
              continue;
            }
            // 深色文字核心
            if (minC < 172) {
              textMask[i] = 1;
            }
          }

          for (let y = 0; y < 256; y++) {
            const yOff = y << 8;
            for (let x = 0; x < 256; x++) {
              const idx = yOff + x;
              const p = idx << 2;
              let t = raw[idx];

              if (textMask[idx]) {
                t = 0;
              }

              if (t === 2) {
                dst[p] = 149;
                dst[p + 1] = 209;
                dst[p + 2] = 242;
                dst[p + 3] = 255;
              } else if (t === 1) {
                dst[p] = 246;
                dst[p + 1] = 216;
                dst[p + 2] = 166;
                dst[p + 3] = 255;
              } else {
                dst[p] = 250;
                dst[p + 1] = 251;
                dst[p + 2] = 249;
                dst[p + 3] = 255;
              }
            }
          }

          ctx.putImageData(outImg, 0, 0);
        } catch {
          ctx.drawImage(img, 0, 0, 256, 256);
        }
        done(undefined, tile);
      };

      img.onerror = () => {
        done(undefined, tile);
      };

      return tile;
    }
  });

  return new (OverviewGrid as unknown as new (opts?: L.GridLayerOptions) => L.GridLayer)({
    tileSize: 256,
    updateWhenZooming: false,
    keepBuffer: 3
  });
}

/* ==================== 1. 皮克敏風格「探險與多功能總覽畫面」（完全仿照圖一！） ==================== */
interface ExpeditionsModalProps {
  myLat: number;
  myLng: number;
  todaySteps?: number;
  dailyMoods?: Record<number, string>;
  expeditions: ExpeditionItem[];
  mushrooms: MushroomNode[];
  creatures: DeGuaCreature[];
  seedlings?: Seedling[];
  postcards?: PostcardItem[];
  flowers?: Record<string, PlantedFlowerCell>;
  worldDelta?: WorldDeltaState;
  bigFlowers?: BigFlowerNode[];
  isPlanting?: boolean;
  activePetalColor?: PetalColor;
  initialTab?: OverviewSheetTab;
  initialSelectedExpeditionId?: string | null;
  onSelectMushroom: (mushroom: MushroomNode) => void;
  onDispatchExpedition: (
    expId: string,
    assignedIds: string[],
    estimate: ExpeditionDurationEstimate
  ) => void;
  onCancelExpedition: (expId: string) => void;
  onClaimCompletedExpedition: (expId: string) => void;
  onOpenDecorModal?: () => void;
  onOpenPlanterModal?: () => void;
  onOpenGardenModal?: () => void;
  onClose: () => void;
}

export const ExpeditionsModal: React.FC<ExpeditionsModalProps> = ({
  myLat,
  myLng,
  todaySteps = 3953,
  dailyMoods = {},
  expeditions,
  mushrooms,
  creatures,
  seedlings = [],
  postcards = [],
  flowers = {},
  worldDelta,
  bigFlowers = [],
  isPlanting = false,
  activePetalColor = 'white',
  initialTab = 'expedition',
  initialSelectedExpeditionId = null,
  onSelectMushroom,
  onDispatchExpedition,
  onCancelExpedition,
  onClaimCompletedExpedition,
  onOpenDecorModal,
  onOpenPlanterModal,
  onOpenGardenModal,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<OverviewSheetTab>(initialTab);
  // 底部面板高度百分比：預設 62%，支援自由無段平滑拉動 (45% ~ 92%)
  const [sheetHeightPct, setSheetHeightPct] = useState<number>(62);
  const [isDraggingSheet, setIsDraggingSheet] = useState<boolean>(false);
  const [activeMushroomIndex, setActiveMushroomIndex] = useState<number>(0);
  const [scrollProgressPct, setScrollProgressPct] = useState<number>(12);
  const [landmarkTick, setLandmarkTick] = useState<number>(0);
  const [inspectingExpId, setInspectingExpId] = useState<string | null>(initialSelectedExpeditionId);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (initialSelectedExpeditionId) {
      setInspectingExpId(initialSelectedExpeditionId);
    }
  }, [initialSelectedExpeditionId]);

  useEffect(() => {
    const hasActive = expeditions.some((e) => e.status === 'active');
    if (!hasActive) return;
    const tid = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(tid);
  }, [expeditions]);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const mushroomScrollRef = useRef<HTMLDivElement | null>(null);
  const inertiaRafRef = useRef<number | null>(null);

  useEffect(() => {
    fetchNearbyPlaceLabels(myLat, myLng);
    return onRealLandmarksUpdated(() => {
      setLandmarkTick((t) => t + 1);
    });
  }, [myLat, myLng]);

  const sheetDragRef = useRef<{
    active: boolean;
    startY: number;
    startPct: number;
  }>({
    active: false,
    startY: 0,
    startPct: 62
  });

  // 絲滑慣性橫向滑動狀態（支援滑鼠與觸控無段連續滑動 + 放開後的慣性滑行，絕不一格一格跳！）
  const carouselDragRef = useRef<{
    isDown: boolean;
    lastX: number;
    velocity: number;
    moved: boolean;
  }>({
    isDown: false,
    lastX: 0,
    velocity: 0,
    moved: false
  });

  const stopCarouselInertia = () => {
    if (inertiaRafRef.current !== null) {
      window.cancelAnimationFrame(inertiaRafRef.current);
      inertiaRafRef.current = null;
    }
  };

  const startCarouselInertia = () => {
    stopCarouselInertia();
    const step = () => {
      const el = mushroomScrollRef.current;
      if (!el) return;
      carouselDragRef.current.velocity *= 0.93; // 平滑摩擦衰減
      if (Math.abs(carouselDragRef.current.velocity) < 0.4) {
        inertiaRafRef.current = null;
        return;
      }
      el.scrollLeft -= carouselDragRef.current.velocity;
      inertiaRafRef.current = window.requestAnimationFrame(step);
    };
    inertiaRafRef.current = window.requestAnimationFrame(step);
  };

  useEffect(() => {
    return () => stopCarouselInertia();
  }, []);

  // 保留真實地標名稱與完整皮克敏探險屬性，確保每一筆都可點擊查看／派出／追蹤／中止／收成
  const enrichedExpeditions = useMemo(() => {
    const used = new Set<string>();
    return expeditions.map((e, i) => {
      const normalized = normalizeExpeditionItem(e, creatures, nowMs);
      const lm = getNearestRealLandmarkInfo(normalized.lat, normalized.lng, i + 10, used);
      return {
        ...normalized,
        placeName:
          normalized.placeName && !normalized.placeName.includes('附近')
            ? normalized.placeName
            : normalized.placeName || lm.name
      };
    });
  }, [expeditions, creatures, landmarkTick]);

  const inspectingExp = useMemo(
    () => (inspectingExpId ? enrichedExpeditions.find((e) => e.id === inspectingExpId) || null : null),
    [inspectingExpId, enrichedExpeditions]
  );

  // 確保每一顆蘑菇在圖資載入完成後，100% 即時擁有不重複的真實地標名稱與真實地標實景照片 (photoUrl)
  const enrichedMushrooms = useMemo(() => {
    const usedNames = new Set<string>();
    const usedPhotos = new Set<string>();

    const firstPass = mushrooms.map((m, idx) => {
      const lmInfo = getNearestRealLandmarkInfo(m.lat, m.lng, idx, usedNames, usedPhotos);
      const photoUrl = m.photoUrl || lmInfo.photoUrl;
      if (photoUrl) usedPhotos.add(photoUrl);
      const landmarkName = m.landmarkName || lmInfo.name;
      usedNames.add(landmarkName);
      return {
        ...m,
        landmarkName,
        photoUrl
      };
    });

    // 若仍有個別蘑菇尚未配到照片，而同批已有載入成功的真實地標照片池，自動補齊確保每一張卡片都有真實風景照
    const availablePhotos = firstPass.map((m) => m.photoUrl).filter((u): u is string => Boolean(u));
    if (availablePhotos.length > 0) {
      return firstPass.map((m, idx) => ({
        ...m,
        photoUrl: m.photoUrl || availablePhotos[idx % availablePhotos.length]
      }));
    }
    return firstPass;
  }, [mushrooms, landmarkTick]);

  // 初始化上方區域概覽地圖
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [myLat - 0.008, myLng - 0.01],
      zoom: 12,
      zoomControl: false,
      attributionControl: false
    });

    createRegionalOverviewTileLayer().addTo(map);
    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    markerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      markerGroupRef.current = null;
    };
  }, []);

  // 在上方概覽地圖繪製：1. 綠色散步足跡霧氣團、2. 稀疏行政區名、3. 藍點定位與黃花叢、4. 桃子與瓜糰圖示
  useEffect(() => {
    const group = markerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    // 1. 綠色散步探索雲霧圓團（完全對照圖一地圖上的兩團柔邊翠綠區域）
    const fogCenters = [
      { lat: myLat, lng: myLng, size: 120 },
      { lat: myLat - 0.016, lng: myLng - 0.024, size: 110 }
    ];
    fogCenters.forEach((f) => {
      const fogIcon = L.divIcon({
        className: 'exp-overview-fog',
        html: `<div style="
          width: ${f.size}px;
          height: ${f.size}px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(104, 196, 86, 0.72) 0%, rgba(104, 196, 86, 0.42) 48%, rgba(104, 196, 86, 0) 72%);
          transform: translate(-50%, -50%);
          pointer-events: none;
        "></div>`,
        iconSize: [f.size, f.size],
        iconAnchor: [f.size / 2, f.size / 2]
      });
      L.marker([f.lat, f.lng], { icon: fogIcon, interactive: false }).addTo(group);
    });

    // 2. 稀疏區域地名標籤（白邊灰黑字）
    const areaLabels = getVisiblePlaceLabels(myLat, myLng).slice(0, 6);
    areaLabels.forEach((pl) => {
      const lblIcon = L.divIcon({
        className: 'exp-overview-label',
        html: `<div style="
          font-size: 12px;
          font-weight: 800;
          color: #475569;
          white-space: nowrap;
          text-shadow: -1.5px -1.5px 0 #FFF, 1.5px -1.5px 0 #FFF, -1.5px 1.5px 0 #FFF, 1.5px 1.5px 0 #FFF;
          transform: translate(-50%, -50%);
          pointer-events: none;
        ">${pl.name}</div>`,
        iconSize: [60, 18],
        iconAnchor: [30, 9]
      });
      L.marker([pl.lat, pl.lng], { icon: lblIcon, interactive: false }).addTo(group);
    });

    // 3. 地圖上即時繪製所有待派出與行進中的探險物品與小隊點位
    enrichedExpeditions.forEach((exp) => {
      const emoji = exp.kind === 'gift' ? '🎁' : exp.kind === 'fruit' ? exp.fruitEmoji || '🍏' : '🪴';
      if (exp.status === 'active') {
        const snap = getExpeditionProgressSnapshot(exp, myLat, myLng, nowMs);
        const pIcon = L.divIcon({
          className: 'exp-map-pin',
          html: `<div style="
            display:flex;align-items:center;gap:2px;
            background:rgba(255,255,255,0.92);border-radius:99px;padding:2px 6px;
            border:1.5px solid #10B981;box-shadow:0 3px 6px rgba(0,0,0,0.22);
            transform:translate(-50%,-50%);font-size:16px;pointer-events:none;
          "><span>🍠</span><span>${emoji}</span></div>`,
          iconSize: [44, 28],
          iconAnchor: [22, 14]
        });
        L.marker([snap.currentLat, snap.currentLng], { icon: pIcon, interactive: false }).addTo(group);
      } else {
        const pIcon = L.divIcon({
          className: 'exp-map-pin',
          html: `<div style="
            font-size: 22px;
            filter: drop-shadow(0 3px 5px rgba(0,0,0,0.25));
            transform: translate(-50%, -50%);
            white-space: nowrap;
            pointer-events: none;
          ">${emoji}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });
        L.marker([exp.lat, exp.lng], { icon: pIcon, interactive: false }).addTo(group);
      }
    });

    // 4. 玩家目前所在位置的「黃色花叢 ＋ 藍白圓點定位標記」（對照圖一右上角臺北市旁的藍色定位圓點）
    const myPinIcon = L.divIcon({
      className: 'exp-my-blue-dot',
      html: `<div style="
        position: relative;
        width: 58px;
        height: 46px;
        transform: translate(-50%, -50%);
        pointer-events: none;
      ">
        <div style="
          position: absolute;
          left: 50%;
          top: 58%;
          transform: translate(-50%, -50%);
          font-size: 16px;
          letter-spacing: -4px;
          filter: drop-shadow(0 2px 3px rgba(0,0,0,0.2));
        ">🌼🌼🌼</div>
        <div style="
          position: absolute;
          left: 50%;
          top: 38%;
          transform: translate(-50%, -50%);
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #3B82F6;
          border: 3.5px solid #FFFFFF;
          box-shadow: 0 3px 8px rgba(0,0,0,0.3);
        "></div>
      </div>`,
      iconSize: [58, 46],
      iconAnchor: [29, 23]
    });
    L.marker([myLat, myLng], { icon: myPinIcon, interactive: false }).addTo(group);
  }, [myLat, myLng, enrichedExpeditions]);

  // 處理底部面板往上拉變大 / 往下拉縮小的手勢
  const handleSheetPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    sheetDragRef.current = {
      active: true,
      startY: e.clientY,
      startPct: sheetHeightPct
    };
    setIsDraggingSheet(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleSheetPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!sheetDragRef.current.active) return;
    const deltaY = sheetDragRef.current.startY - e.clientY;
    const deltaPct = (deltaY / window.innerHeight) * 100;
    const nextPct = Math.max(42, Math.min(92, sheetDragRef.current.startPct + deltaPct));
    setSheetHeightPct(nextPct);
  };

  const handleSheetPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!sheetDragRef.current.active) return;
    const deltaY = Math.abs(e.clientY - sheetDragRef.current.startY);
    sheetDragRef.current.active = false;
    setIsDraggingSheet(false);

    // 若只是單純輕點頂部拉桿 (<5px)，在「標準 62%」與「放大 88%」之間平滑切換；
    // 若為手指/滑鼠拖曳拉動，則無段自由停留在拉動後的高度，不會生硬跳格！
    if (deltaY < 5) {
      setSheetHeightPct((prev) => (prev > 75 ? 62 : 88));
    }
  };

  // 蘑菇橫向卷軸連續平滑滾動時更新進度條與「蘑菇：X / N」指示
  const handleMushroomScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const maxScroll = Math.max(1, el.scrollWidth - el.clientWidth);
    const ratio = Math.min(1, Math.max(0, el.scrollLeft / maxScroll));
    setScrollProgressPct(Math.max(10, ratio * 100));

    const idx = Math.min(
      Math.max(0, Math.round(ratio * Math.max(0, mushrooms.length - 1))),
      Math.max(0, mushrooms.length - 1)
    );
    setActiveMushroomIndex(idx);
  };

  // 地標風景氛圍背景色組（模擬地標明信片照片質感）
  const landmarkPhotoGradients = [
    'linear-gradient(135deg, #334155 0%, #475569 45%, #1E293B 100%)',
    'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 55%, #1D4ED8 100%)',
    'linear-gradient(135deg, #14532D 0%, #15803D 55%, #166534 100%)',
    'linear-gradient(135deg, #7C2D12 0%, #B45309 55%, #92400E 100%)',
    'linear-gradient(135deg, #4C1D95 0%, #6D28D9 55%, #5B21B6 100%)'
  ];

  const tabs: { id: OverviewSheetTab; label: string }[] = [
    { id: 'lifelog', label: '紀錄' },
    { id: 'degua', label: '地瓜球' },
    { id: 'seedling', label: '瓜糰' },
    { id: 'expedition', label: '探險' },
    { id: 'postcard', label: '明信片' }
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: '#FAFBF9',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* ==================== 上半部：區域概覽地圖 (隨下方拉動面板自適應露出的高度) ==================== */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `${Math.max(15, 104 - sheetHeightPct)}%`,
          zIndex: 1
        }}
      >
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* 地圖右下角（面板上方）：白色圓形定位準星按鈕（完全對照圖一地圖右下角的準星鈕） */}
        <button
          onClick={() => {
            if (mapRef.current) {
              mapRef.current.panTo([myLat - 0.006, myLng - 0.008], { animate: true });
            }
          }}
          style={{
            position: 'absolute',
            right: 16,
            bottom: 24,
            zIndex: 420,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            background: '#FFFFFF',
            color: '#334155',
            fontSize: 20,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.16)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="重新置中概覽地圖"
        >
          ⌖
        </button>
      </div>

      {/* ==================== 下半部：可往上拉變大的白色圓角抽屜面板 ==================== */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: `${sheetHeightPct}%`,
          zIndex: 10,
          background: '#FFFFFF',
          borderRadius: '26px 26px 0 0',
          boxShadow: '0 -6px 24px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          transition: isDraggingSheet ? 'none' : 'height 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
          overflow: 'hidden'
        }}
      >
        {/* 頂部可上下拖曳拉桿區 ＋ 五大功能切換標籤列 (紀錄 | 地瓜球 | 瓜糰 | 探險 | 明信片) */}
        <div
          onPointerDown={handleSheetPointerDown}
          onPointerMove={handleSheetPointerMove}
          onPointerUp={handleSheetPointerUp}
          onPointerCancel={handleSheetPointerUp}
          style={{
            padding: '10px 12px 12px',
            cursor: isDraggingSheet ? 'grabbing' : 'grab',
            touchAction: 'none',
            userSelect: 'none',
            borderBottom: '1px solid #F1F5F9',
            background: '#FFFFFF',
            flexShrink: 0
          }}
        >
          {/* 灰色橫向拖曳短槓（可按住往上拉讓介面變大！） */}
          <div
            style={{
              width: 38,
              height: 5,
              borderRadius: 99,
              background: '#D1D5DB',
              margin: '0 auto 12px'
            }}
            title="按住往上拉可放大面板"
          />

          {/* 中間五大功能切換列（完全對照圖一：紀錄 | 地瓜球 | 瓜糰 | 探險 | 明信片） */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              gap: 4
            }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    border: 'none',
                    background: isActive ? '#489E7A' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#475569',
                    fontWeight: isActive ? 900 : 700,
                    fontSize: 14,
                    padding: '6px 15px',
                    borderRadius: 99,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ==================== 面板內部可捲動內容區 ==================== */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 18px 90px'
          }}
        >
          {/* -------------------- 分頁 1：【探險】（完全對照圖一！） -------------------- */}
          {activeTab === 'expedition' && (
            <div>
              {/* 蘑菇標題列 ＋ 大聲公與挑戰券徽章 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: 12
                }}
              >
                <div>
                  <div style={{ fontSize: 19, fontWeight: 900, color: '#1E293B' }}>蘑菇</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginTop: 2 }}>
                    今天還剩下 3 次
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* 📢 大聲公數量徽章 */}
                  <div
                    style={{
                      background: '#F1F5F9',
                      borderRadius: 99,
                      padding: '4px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 13,
                      fontWeight: 900,
                      color: '#334155',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
                    }}
                  >
                    <span style={{ fontSize: 16 }}>📢</span>
                    <span>1</span>
                  </div>

                  {/* 🎟️ 蘑菇挑戰券數量徽章 */}
                  <div
                    style={{
                      background: '#F1F5F9',
                      borderRadius: 99,
                      padding: '4px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 13,
                      fontWeight: 900,
                      color: '#334155',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
                    }}
                  >
                    <span style={{ fontSize: 16 }}>🎟️</span>
                    <span>6</span>
                  </div>
                </div>
              </div>

              {/* 絲滑無段連續滑動的打蘑菇橫向卡片區 (移除強制卡格的 scroll-snap，加入慣性滑行與滾輪橫移支援！) */}
              <div
                ref={mushroomScrollRef}
                onScroll={handleMushroomScroll}
                onWheel={(e) => {
                  if (!mushroomScrollRef.current) return;
                  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    e.preventDefault();
                    mushroomScrollRef.current.scrollLeft += e.deltaY * 0.85;
                  }
                }}
                onPointerDown={(e) => {
                  if (!mushroomScrollRef.current) return;
                  stopCarouselInertia();
                  carouselDragRef.current = {
                    isDown: true,
                    lastX: e.clientX,
                    velocity: 0,
                    moved: false
                  };
                }}
                onPointerMove={(e) => {
                  if (!carouselDragRef.current.isDown || !mushroomScrollRef.current) return;
                  const dx = e.clientX - carouselDragRef.current.lastX;
                  carouselDragRef.current.lastX = e.clientX;
                  carouselDragRef.current.velocity = dx * 1.15;
                  if (Math.abs(dx) > 2) {
                    carouselDragRef.current.moved = true;
                  }
                  mushroomScrollRef.current.scrollLeft -= dx;
                }}
                onPointerUp={() => {
                  if (!carouselDragRef.current.isDown) return;
                  carouselDragRef.current.isDown = false;
                  startCarouselInertia();
                }}
                onPointerLeave={() => {
                  if (!carouselDragRef.current.isDown) return;
                  carouselDragRef.current.isDown = false;
                  startCarouselInertia();
                }}
                style={{
                  display: 'flex',
                  gap: 14,
                  overflowX: 'auto',
                  paddingBottom: 10,
                  cursor: 'grab',
                  userSelect: 'none',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none'
                }}
              >
                {enrichedMushrooms.map((m, idx) => {
                  const catalogEntry = MUSHROOM_CATALOG[m.element] || MUSHROOM_CATALOG.red;
                  const landmarkOnly =
                    m.landmarkName || m.name.replace(/的(小型|一般|大型|巨大).*$/, '');
                  const typeTitle = `${m.sizeLabel} ${catalogEntry.typeLabel}`;
                  // 嚴格確保：沒人打的蘑菇 (m.participants.length === 0) 血量必定 100% 滿血 (m.maxHp)，圓圈 100% 填滿！
                  const hasParticipants = m.participants.length > 0;
                  const effectiveCurrentHp = hasParticipants ? m.currentHp : m.maxHp;
                  const hpPct = hasParticipants
                    ? Math.max(5, Math.round((effectiveCurrentHp / m.maxHp) * 100))
                    : 100;
                  const displayHp = effectiveCurrentHp.toLocaleString();
                  const clusterSvg = buildAuthenticPikminMushroomSvg(
                    m.element,
                    m.sizeLabel,
                    `card_${m.id}`
                  );

                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        if (carouselDragRef.current.moved) {
                          carouselDragRef.current.moved = false;
                          return;
                        }
                        onSelectMushroom(m);
                      }}
                      style={{
                        minWidth: 272,
                        maxWidth: 272,
                        background: '#FFFFFF',
                        borderRadius: 18,
                        overflow: 'hidden',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                        border: '1px solid #F1F5F9',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      {/* 卡片上半部：真實地標實景照片 ＋ 依真實比例縮放的左下角發光蘑菇群（對照圖一比例） */}
                      <div
                        style={{
                          position: 'relative',
                          height: 120,
                          background: m.photoUrl
                            ? `url("${m.photoUrl}") center/cover no-repeat`
                            : landmarkPhotoGradients[idx % landmarkPhotoGradients.length],
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background:
                              'radial-gradient(circle at 75% 25%, rgba(255,255,255,0.18) 0%, transparent 50%), linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.34) 100%)'
                          }}
                        />
                        {!m.photoUrl && (
                          <div
                            style={{
                              position: 'absolute',
                              right: 14,
                              top: 12,
                              fontSize: 38,
                              opacity: 0.35,
                              filter: 'blur(0.5px)'
                            }}
                          >
                            {idx % 3 === 0 ? '🗽🌳' : idx % 3 === 1 ? '🏛️🌿' : '⛩️🌲'}
                          </div>
                        )}

                        {/* 左下角立體發光蘑菇叢：一般佔照片一半以上，大/巨大更寬大高聳 */}
                        <div
                          style={{
                            position: 'absolute',
                            left: 4,
                            bottom: -6,
                            pointerEvents: 'none'
                          }}
                        >
                          <div dangerouslySetInnerHTML={{ __html: clusterSvg }} />
                        </div>
                      </div>

                      {/* 卡片下半部：蘑菇類型名稱、紅色圓餅 + 真實血量、📍真實地標名稱、（有參戰者時才顯示頭像列，無人參戰絕不放假人頭！） */}
                      <div style={{ padding: '12px 14px 14px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 12
                          }}
                        >
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 900,
                              color: '#E11D48'
                            }}
                          >
                            {typeTitle}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            <span
                              title={
                                hasParticipants
                                  ? `剩餘血量 ${hpPct}%`
                                  : '100% 滿血（尚無人開打）'
                              }
                              style={{
                                display: 'inline-block',
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                background:
                                  hpPct >= 100
                                    ? '#EF4444'
                                    : `conic-gradient(#EF4444 ${hpPct}%, #FEE2E2 0)`
                              }}
                            />
                            <span
                              style={{
                                fontSize: 19,
                                fontWeight: 800,
                                color: '#EF4444',
                                letterSpacing: 0.3
                              }}
                            >
                              {displayHp}
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            minHeight: 24
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#475569',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: m.participants.length > 0 ? 150 : 240
                            }}
                          >
                            📍 {landmarkOnly}
                          </div>

                          {/* 僅在確實有玩家參戰 (m.participants.length > 0) 時顯示參戰玩家頭像，無人打時不顯示任何假人頭！ */}
                          {m.participants.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              {m.participants.map((p, aIdx) => (
                                <div
                                  key={aIdx}
                                  title={p.playerName}
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    background: '#ECFDF5',
                                    border: '1.5px solid #10B981',
                                    marginLeft: aIdx === 0 ? 0 : -5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 12,
                                    fontWeight: 900,
                                    color: '#065F46',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                                  }}
                                >
                                  {p.playerName.slice(0, 1)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 蘑菇連續平滑進度條與「蘑菇：X / N」指示膠囊 */}
              <div style={{ margin: '6px 0 20px', textAlign: 'center' }}>
                <div
                  style={{
                    width: '100%',
                    height: 4,
                    background: '#E2E8F0',
                    borderRadius: 99,
                    overflow: 'hidden',
                    marginBottom: 8
                  }}
                >
                  <div
                    style={{
                      width: `${scrollProgressPct}%`,
                      height: '100%',
                      background: '#A5B4FC',
                      borderRadius: 99
                    }}
                  />
                </div>

                <span
                  style={{
                    display: 'inline-block',
                    background: '#F1F5F9',
                    color: '#334155',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 14px',
                    borderRadius: 99
                  }}
                >
                  蘑菇：{Math.min(activeMushroomIndex + 1, mushrooms.length)} / {mushrooms.length}
                </span>
              </div>

              {/* -------------------- 下方區塊：禮物、瓜糰、水果三欄列表（完全對照圖一底部！） -------------------- */}
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: '#1E293B',
                  marginBottom: 14
                }}
              >
                瓜糰和水果
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 12
                }}
              >
                {enrichedExpeditions.map((exp) => {
                  const isGift = exp.kind === 'gift';
                  const isFruit = exp.kind === 'fruit';
                  const snap =
                    exp.status !== 'available'
                      ? getExpeditionProgressSnapshot(exp, myLat, myLng, nowMs)
                      : null;
                  const isDone =
                    exp.status === 'completed' || (snap !== null && snap.phase === 'completed');
                  const isActive = exp.status === 'active' && !isDone;
                  const leadCreature =
                    exp.assignedCreatureIds.length > 0
                      ? creatures.find((c) => c.id === exp.assignedCreatureIds[0])
                      : exp.targetCreatureId
                        ? creatures.find((c) => c.id === exp.targetCreatureId)
                        : undefined;
                  const isDecorCompleted =
                    !isFruit && exp.seedlingDecor
                      ? isCategoryColorDecorCompleted(
                          creatures,
                          exp.seedlingDecor,
                          exp.seedlingVariety,
                          exp.seedlingIsHuge
                        )
                      : false;
                  const timeParts = snap ? formatExpeditionDurationParts(snap.remainingMs) : null;

                  if (isActive || isDone) {
                    const pct = snap ? Math.round(snap.overallPct * 100) : 100;
                    return (
                      <div
                        key={exp.id}
                        onClick={() => {
                          if (isDone) {
                            onClaimCompletedExpedition(exp.id);
                          } else {
                            setInspectingExpId(exp.id);
                          }
                        }}
                        style={{
                          background: '#FFFFFF',
                          borderRadius: 16,
                          padding: '10px 8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          cursor: 'pointer',
                          border: isDone ? '2px solid #10B981' : '1.5px solid #F1F5F9',
                          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
                        }}
                      >
                        <div style={{ fontSize: 13.5, fontWeight: 900, color: isDone ? '#059669' : '#1E293B', lineHeight: 1.2 }}>
                          {isDone ? (
                            '回來了！'
                          ) : timeParts && timeParts.hours > 0 ? (
                            <>
                              {timeParts.hours}
                              <span style={{ fontSize: 9.5, fontWeight: 700, margin: '0 1px' }}>小時</span>
                              {timeParts.minutes}
                              <span style={{ fontSize: 9.5, fontWeight: 700, marginLeft: 1 }}>分</span>
                            </>
                          ) : (
                            <>
                              {timeParts?.minutes || 1}
                              <span style={{ fontSize: 9.5, fontWeight: 700, marginLeft: 1 }}>分</span>
                            </>
                          )}
                        </div>

                        <div
                          style={{
                            width: '92%',
                            height: 3.5,
                            borderRadius: 99,
                            background: '#E2E8F0',
                            margin: '6px 0 8px',
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: isDone ? '#10B981' : '#EF4444'
                            }}
                          />
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            height: 52,
                            marginBottom: 4
                          }}
                        >
                          {leadCreature && (
                            <DeGuaCharacter
                              variety={leadCreature.variety}
                              decor={leadCreature.decor}
                              leafStage={leadCreature.leafStage}
                              flowerColor={leadCreature.flowerColor}
                              showDecor={leadCreature.hasDecor}
                              size={42}
                              isBouncing={true}
                            />
                          )}
                          <ExpeditionItemArtwork
                            exp={exp}
                            isDecorCompleted={isDecorCompleted}
                            size={44}
                            showDecorBadge={false}
                          />
                        </div>

                        <div
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: isDone ? '#059669' : '#64748B',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%'
                          }}
                        >
                          {isDone ? '點此去花園收下' : exp.placeName}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={exp.id}
                      onClick={() => setInspectingExpId(exp.id)}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: 16,
                        padding: '10px 6px 9px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        position: 'relative',
                        cursor: 'pointer',
                        border: '1px solid #F1F5F9',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
                      }}
                    >
                      <div
                        style={{
                          height: 62,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 5
                        }}
                      >
                        <ExpeditionItemArtwork
                          exp={exp}
                          isDecorCompleted={isDecorCompleted}
                          size={56}
                          showDecorBadge={!isFruit}
                        />
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: '#1E293B',
                          lineHeight: 1.25,
                          marginBottom: 2
                        }}
                      >
                        {isGift ? `${exp.title.replace(/的飾品禮物|專屬飾品禮物/g, '') || '專屬禮品'}` : exp.title}
                      </div>

                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#64748B',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%'
                        }}
                      >
                        {exp.placeName}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* -------------------- 分頁 2：【紀錄】 -------------------- */}
          {activeTab === 'lifelog' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>
                📅 每日散步與心情紀錄
              </div>
              <div
                style={{
                  background: '#ECFDF5',
                  borderRadius: 20,
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#059669' }}>今日累計步數</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#065F46' }}>
                    {todaySteps.toLocaleString()} 步
                  </div>
                </div>
                <div style={{ fontSize: 42 }}>{dailyMoods[1] || '😊'}</div>
              </div>
            </div>
          )}

          {/* -------------------- 分頁 3：【地瓜球】 -------------------- */}
          {activeTab === 'degua' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>
                  🍠 我的地瓜球小隊 ({creatures.length})
                </div>
                {onOpenGardenModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenGardenModal();
                    }}
                    style={{
                      border: 'none',
                      background: '#10B981',
                      color: '#FFF',
                      borderRadius: 99,
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    前往花園餵食 →
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {creatures.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: '#F8FAFC',
                      borderRadius: 18,
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <DeGuaCharacter
                      variety={c.variety}
                      decor={c.decor}
                      leafStage={c.leafStage}
                      flowerColor={c.flowerColor}
                      showDecor={c.hasDecor}
                      size={58}
                    />
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#1E293B' }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700 }}>
                      📍 {c.placeName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* -------------------- 分頁 4：【瓜糰】 -------------------- */}
          {activeTab === 'seedling' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>
                  🍳 黃金油鍋與瓜糰背包 ({seedlings.length})
                </div>
                {onOpenPlanterModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenPlanterModal();
                    }}
                    style={{
                      border: 'none',
                      background: '#F59E0B',
                      color: '#FFF',
                      borderRadius: 99,
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    打開黃金油鍋撈起 →
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {seedlings.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      if (onOpenPlanterModal) {
                        onClose();
                        onOpenPlanterModal();
                      }
                    }}
                    style={{
                      background: s.isReady ? '#FEF3C7' : '#F8FAFC',
                      border: s.isReady ? '2px solid #F59E0B' : '1px solid #E2E8F0',
                      borderRadius: 18,
                      padding: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: 26, marginBottom: 4 }}>{s.isReady ? '笊✨' : '🍠'}</div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: '#1E293B' }}>
                      {s.isHuge ? '巨大瓜糰' : VARIETY_CATALOG[s.variety].potName}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, marginTop: 2 }}>
                      {s.currentSteps} / {s.targetSteps} 步 {s.isReady ? '（可從鍋裡撈起！）' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* -------------------- 分頁 5：【明信片】 -------------------- */}
          {activeTab === 'postcard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>
                💌 地標紀念明信片冊 ({postcards.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {postcards.map((pc) => (
                  <div
                    key={pc.id}
                    style={{
                      background: '#FFFBEB',
                      border: '1.5px solid #FDE68A',
                      borderRadius: 18,
                      padding: '12px'
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 4 }}>🏞️</div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: '#1E293B' }}>
                      {pc.placeName}
                    </div>
                    <div style={{ fontSize: 11, color: '#D97706', fontWeight: 800, marginTop: 2 }}>
                      {'⭐'.repeat(pc.stars)} ・ {pc.createdAt}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ==================== 底部懸浮關閉按鈕 (✕) 與「🎖️ 飾品一覽」膠囊 ==================== */}
        <button
          className="pikmin-glass-circle-btn"
          onClick={onClose}
          style={{
            position: 'absolute',
            left: 'clamp(14px, 4vw, 18px)',
            bottom: 'max(2.1lvh, env(safe-area-inset-bottom) + 6px)',
            zIndex: 50,
            width: 'clamp(48px, 6.2lvh, 56px)',
            height: 'clamp(48px, 6.2lvh, 56px)'
          }}
          title="關閉返回"
        >
          <svg width="58%" height="58%" viewBox="0 0 24 24" fill="none">
            <path d="M5.5 5.5L18.5 18.5M18.5 5.5L5.5 18.5" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" />
          </svg>
        </button>

        <button
          onClick={() => {
            if (onOpenDecorModal) {
              onClose();
              onOpenDecorModal();
            }
          }}
          style={{
            position: 'absolute',
            right: 18,
            bottom: 'max(18px, env(safe-area-inset-bottom))',
            zIndex: 50,
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 99,
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            fontWeight: 900,
            color: '#1E293B',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)'
          }}
        >
          <span style={{ fontSize: 20 }}>🎖️</span>
          <span>飾品一覽</span>
        </button>
      </div>

      {/* 點選某項待出發／進行中探險後的完整圖卡、隊伍選擇、GO 目送與實景追蹤流程 */}
      {inspectingExp && (
        <ExpeditionDetailAndDispatch
          expedition={inspectingExp}
          creatures={creatures}
          myLat={myLat}
          myLng={myLng}
          isPlanting={isPlanting}
          activePetalColor={activePetalColor}
          flowers={flowers}
          worldDelta={worldDelta}
          bigFlowers={bigFlowers}
          mushrooms={mushrooms}
          onDispatchCommit={onDispatchExpedition}
          onCancelExpedition={onCancelExpedition}
          onClaimCompletedExpedition={(expId) => {
            setInspectingExpId(null);
            onClaimCompletedExpedition(expId);
          }}
          onClose={() => setInspectingExpId(null)}
        />
      )}
    </div>
  );
};

/* ==================== 2. 探測器畫面 (Detector Radar Modal) ==================== */
interface DetectorModalProps {
  nearbyDecors: DecorCategory[];
  isScanning: boolean;
  onFireDetector: () => void;
  onClose: () => void;
}

export const DetectorModal: React.FC<DetectorModalProps> = ({
  nearbyDecors,
  isScanning,
  onFireDetector,
  onClose
}) => {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: 32,
          padding: '26px 22px',
          width: '100%',
          maxWidth: 360,
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#0F172A' }}>📡 探測器</div>
        </div>
        <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700, marginTop: 4 }}>
          探測目前位置周圍的水果與野生瓜糰
        </div>

        <button
          className="pikmin-glass-circle-btn pikmin-glass-close-fab"
          onClick={onClose}
          title="返回主畫面"
        >
          <svg width="58%" height="58%" viewBox="0 0 24 24" fill="none">
            <path d="M5.5 5.5L18.5 18.5M18.5 5.5L5.5 18.5" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" />
          </svg>
        </button>

        <div
          style={{
            width: 145,
            height: 145,
            margin: '18px auto',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, rgba(16,185,129,0.05) 70%)',
            border: '3px solid #10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div style={{ fontSize: 50 }}>📡</div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 8 }}>
          附近偵測到的場所分類：
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            flexWrap: 'wrap',
            background: '#F8FAFC',
            padding: '10px',
            borderRadius: 18,
            marginBottom: 18
          }}
        >
          {nearbyDecors.map((d) => (
            <div
              key={d}
              style={{
                background: '#FFFFFF',
                border: '1.5px solid #E2E8F0',
                borderRadius: 12,
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontWeight: 800,
                color: '#1E293B'
              }}
            >
              <span>{DECOR_CATALOG[d].icon}</span>
              <span>{DECOR_CATALOG[d].placeCategory}</span>
            </div>
          ))}
        </div>

        <button
          disabled={isScanning}
          onClick={onFireDetector}
          style={{
            width: '100%',
            border: 'none',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#FFF',
            fontWeight: 900,
            fontSize: 15,
            padding: '14px',
            borderRadius: 99,
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(16,185,129,0.35)'
          }}
        >
          {isScanning ? '📡 正在發射電波掃描...' : '使用探測器'}
        </button>
      </div>
    </div>
  );
};

/* ==================== 3. 全螢幕蘑菇詳情與開打畫面 (100% 對照圖三 & 圖四！) ==================== */
interface MushroomBattleModalProps {
  mushroom: MushroomNode;
  creatures: DeGuaCreature[];
  onJoinMushroomBattle: (mushroomId: string) => void;
  onNavigateToMap?: (mushroom: MushroomNode) => void;
  onClose: () => void;
}

export const MushroomBattleModal: React.FC<MushroomBattleModalProps> = ({
  mushroom,
  creatures,
  onJoinMushroomBattle,
  onNavigateToMap,
  onClose
}) => {
  const [isSelectingSquad, setIsSelectingSquad] = useState<boolean>(false);
  const catalogEntry = MUSHROOM_CATALOG[mushroom.element] || MUSHROOM_CATALOG.red;
  const availableSquad = creatures.filter((c) => c.busyState === 'free');
  const eligibleSquad = availableSquad.filter(
    (c) => calculateCreatureMushroomPower(c, mushroom.element).canJoin
  );
  const mySquadPower = eligibleSquad.reduce(
    (sum, c) => sum + calculateCreatureMushroomPower(c, mushroom.element).power,
    0
  );

  const hasParticipants = mushroom.participants.length > 0;
  const effectiveCurrentHp = hasParticipants ? mushroom.currentHp : mushroom.maxHp;
  const hpPct = hasParticipants
    ? Math.max(5, Math.round((effectiveCurrentHp / mushroom.maxHp) * 100))
    : 100;

  const existingJoinedPower = mushroom.participants.reduce((s, p) => s + p.power, 0);
  const displayCombinedPower = hasParticipants ? existingJoinedPower : 0;
  const durationInfo = calculateMushroomBattleDuration(
    effectiveCurrentHp,
    Math.max(1, existingJoinedPower + mySquadPower)
  );

  const resolvedPhotoUrl =
    mushroom.photoUrl || getNearestRealLandmarkInfo(mushroom.lat, mushroom.lng, 0).photoUrl;
  const heroSvg = buildDetailHeroPikminMushroomSvg(
    mushroom.element,
    mushroom.sizeLabel,
    `hero_${mushroom.id}`
  );
  const isFull = mushroom.participants.length >= 5;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* ==================== 上半部：全螢幕地標實景照片 ＋ 花毯 ＋ 依大小比例擋住照片的真實蘑菇（對照圖三 & 圖四） ==================== */}
      <div
        style={{
          position: 'relative',
          height: '49%',
          minHeight: 290,
          width: '100%',
          background: resolvedPhotoUrl
            ? `url("${resolvedPhotoUrl}") center/cover no-repeat`
            : 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 60%, #1D4ED8 100%)',
          overflow: 'hidden',
          flexShrink: 0
        }}
      >
        {/* 頂部至底部的柔順遮罩（讓上方地標膠囊與左下/右下白色數值清楚易讀） */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.04) 42%, rgba(0,0,0,0.34) 100%)'
          }}
        />

        {/* 地標底部繽紛花毯草地條（對照圖三 & 圖四蘑菇腳下的彩色花海） */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 68,
            background: 'linear-gradient(180deg, rgba(101, 183, 65, 0) 0%, #5CAE50 38%, #4D9B41 100%)',
            pointerEvents: 'none',
            zIndex: 1
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: -8,
            right: -8,
            bottom: 14,
            height: 44,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-around',
            alignItems: 'center',
            fontSize: 16,
            opacity: 0.92,
            pointerEvents: 'none',
            zIndex: 2
          }}
        >
          <span>🌼</span><span>🌸</span><span>💮</span><span>🌻</span><span>🌺</span>
          <span>🌼</span><span>🌺</span><span>💮</span><span>🌸</span><span>🌻</span>
          <span>🌼</span><span>🌸</span><span>🌺</span><span>💮</span>
        </div>

        {/* 主角蘑菇特寫圖層：大蘑菇幾乎擋滿整張照片；一般蘑菇約佔 65%；小蘑菇較嬌小露出大片風景 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            bottom: 18,
            zIndex: 3,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
          }}
        >
          <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: heroSvg }} />
        </div>

        {/* 上方中央：半透明深灰地標名稱膠囊 (點擊定位至地圖查看) */}
        <button
          onClick={() => {
            if (onNavigateToMap) onNavigateToMap(mushroom);
          }}
          style={{
            position: 'absolute',
            top: 'max(16px, env(safe-area-inset-top))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 8,
            maxWidth: '88%',
            background: 'rgba(15, 23, 42, 0.56)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.28)',
            color: '#FFFFFF',
            borderRadius: 99,
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13.5,
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.22)'
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {mushroom.landmarkName || mushroom.name}
          </span>
          <span style={{ opacity: 0.9 }}>&gt;</span>
        </button>

        {/* 左下角：紅色血量圓餅 ＋ 剩餘血量 ＋ 預估/剩餘時間（對照圖三 & 圖四左下角） */}
        <div
          style={{
            position: 'absolute',
            left: 16,
            bottom: 30,
            zIndex: 8,
            pointerEvents: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                display: 'inline-block',
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: '2px solid #FFFFFF',
                background:
                  hpPct >= 100
                    ? '#EF4444'
                    : `conic-gradient(#EF4444 ${hpPct}%, #FECACA 0)`,
                boxShadow: '0 2px 6px rgba(0,0,0,0.32)'
              }}
            />
            <span
              style={{
                fontSize: 25,
                fontWeight: 900,
                color: '#FFFFFF',
                letterSpacing: 0.3,
                WebkitTextStroke: '1px rgba(190, 18, 60, 0.85)',
                textShadow: '0 2px 6px rgba(0,0,0,0.45)'
              }}
            >
              {effectiveCurrentHp.toLocaleString()}
            </span>
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: '#FFFFFF',
              marginTop: 2,
              textShadow: '0 1px 4px rgba(0,0,0,0.7)'
            }}
          >
            {hasParticipants ? `戰鬥中・目前進度 ${hpPct}%` : '尚無人開打（100% 滿血）'}
          </div>
        </div>

        {/* 右下角：大家合計工作力（對照圖三 & 圖四右下角） */}
        <div
          style={{
            position: 'absolute',
            right: 16,
            bottom: 30,
            zIndex: 8,
            textAlign: 'right',
            pointerEvents: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
            <span style={{ fontSize: 18, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}>
              ✨
            </span>
            <span
              style={{
                fontSize: 25,
                fontWeight: 900,
                color: '#FDE047',
                WebkitTextStroke: '1px rgba(146, 64, 14, 0.85)',
                textShadow: '0 2px 6px rgba(0,0,0,0.45)'
              }}
            >
              {displayCombinedPower.toLocaleString()}
            </span>
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: '#FFFFFF',
              marginTop: 2,
              textShadow: '0 1px 4px rgba(0,0,0,0.7)'
            }}
          >
            大家的合計工作力
          </div>
        </div>
      </div>

      {/* ==================== 下半部：純白圓角底部卡片（乾淨顯示名稱、一句簡短說明、參加鈕與 5 格玩家欄） ==================== */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          marginTop: -22,
          zIndex: 10,
          background: '#FFFFFF',
          borderRadius: '26px 26px 0 0',
          boxShadow: '0 -6px 20px rgba(0,0,0,0.12)',
          padding: '12px 20px 88px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <div
          style={{
            width: 38,
            height: 4,
            borderRadius: 99,
            background: '#D1D5DB',
            marginBottom: 16,
            flexShrink: 0
          }}
        />

        {/* 標題（如：大 火蘑菇 / 一般 輝煌蘑菇 / 小 紅色蘑菇） */}
        <div
          style={{
            fontSize: 23,
            fontWeight: 900,
            color: '#1E293B',
            textAlign: 'center'
          }}
        >
          {mushroom.sizeLabel} {catalogEntry.typeLabel}
        </div>

        {/* 簡潔一句話蘑菇說明 */}
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: '#334155',
            textAlign: 'center',
            lineHeight: 1.55,
            marginTop: 8,
            maxWidth: 320,
            whiteSpace: 'pre-line'
          }}
        >
          {catalogEntry.shortModalDesc}
        </div>

        {!isSelectingSquad ? (
          <>
            {/* 【🎟️ 參加】圓角鈕（對照圖三 & 圖四中央按鈕） */}
            <button
              disabled={isFull}
              onClick={() => setIsSelectingSquad(true)}
              style={{
                marginTop: 18,
                background: '#FFFFFF',
                border: `1.5px solid ${isFull ? '#E2E8F0' : '#86EFAC'}`,
                color: isFull ? '#94A3B8' : '#15803D',
                borderRadius: 99,
                padding: '9px 32px',
                fontSize: 15,
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: isFull ? 'not-allowed' : 'pointer',
                boxShadow: '0 3px 10px rgba(0,0,0,0.07)'
              }}
            >
              <span style={{ fontSize: 18 }}>🎟️</span>
              <span>{isFull ? '參加（額滿）' : '參加'}</span>
            </button>

            {/* 參與玩家框（5 格純灰圓形空位，無人參戰不放人臉；有參戰才顯示真實玩家） */}
            <div
              style={{
                marginTop: 16,
                width: '100%',
                border: '1.5px solid #E2E8F0',
                borderRadius: 20,
                padding: '14px 12px 16px',
                background: '#FFFFFF'
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 900,
                  color: isFull ? '#EF4444' : '#64748B',
                  marginBottom: 12
                }}
              >
                {isFull
                  ? '額滿'
                  : hasParticipants
                  ? `參戰玩家 (${mushroom.participants.length} / 5)`
                  : '尚無玩家參加（最多 5 位）'}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: 8,
                  justifyItems: 'center'
                }}
              >
                {[0, 1, 2, 3, 4].map((slotIdx) => {
                  const p = mushroom.participants[slotIdx];
                  if (p) {
                    return (
                      <div
                        key={slotIdx}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: '#ECFDF5',
                            border: '2px solid #10B981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18,
                            fontWeight: 900,
                            color: '#065F46'
                          }}
                        >
                          {p.playerName.slice(0, 1)}
                        </div>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 800,
                            color: '#334155',
                            maxWidth: 54,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {p.playerName}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={slotIdx}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: '#CBD5E1',
                        opacity: 0.65
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* 點擊【🎟️ 參加】後的輕量小隊出戰確認區 */
          <div
            style={{
              marginTop: 14,
              width: '100%',
              background: '#F8FAFC',
              borderRadius: 20,
              padding: '14px',
              border: '1.5px solid #E2E8F0'
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 900, color: '#0F172A', marginBottom: 8, textAlign: 'center' }}>
              🍠 我方出戰地瓜球小隊（合計工作力 ⚡{mySquadPower.toLocaleString()}）
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
              {availableSquad.slice(0, 5).map((c) => {
                const pInfo = calculateCreatureMushroomPower(c, mushroom.element);
                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      opacity: pInfo.canJoin ? 1 : 0.42,
                      background: pInfo.isFavored ? '#FEF3C7' : '#FFFFFF',
                      border: pInfo.isFavored ? '1.5px solid #F59E0B' : '1px solid #E2E8F0',
                      borderRadius: 12,
                      padding: '4px 6px'
                    }}
                  >
                    <DeGuaCharacter
                      variety={c.variety}
                      decor={c.decor}
                      leafStage={c.leafStage}
                      flowerColor={c.flowerColor}
                      showDecor={c.hasDecor}
                      size={44}
                    />
                    <span style={{ fontSize: 10, fontWeight: 900, color: pInfo.canJoin ? '#1E293B' : '#94A3B8' }}>
                      {pInfo.canJoin ? `⚡${pInfo.power}` : '不可上場'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: 11.5, fontWeight: 800, color: '#059669', textAlign: 'center', marginBottom: 12 }}>
              ⏱️ 預估討伐耗時：{durationInfo.formattedText}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setIsSelectingSquad(false)}
                style={{
                  flex: 1,
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 900,
                  fontSize: 13.5,
                  padding: '11px',
                  borderRadius: 99,
                  cursor: 'pointer'
                }}
              >
                取消
              </button>
              <button
                disabled={mySquadPower <= 0}
                onClick={() => onJoinMushroomBattle(mushroom.id)}
                style={{
                  flex: 2,
                  border: 'none',
                  background:
                    mySquadPower > 0
                      ? 'linear-gradient(135deg, #EC4899, #DB2777)'
                      : '#CBD5E1',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: 14,
                  padding: '11px',
                  borderRadius: 99,
                  cursor: mySquadPower > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                {mySquadPower > 0 ? '⚔️ 派出小隊開打！' : '沒有對應屬性地瓜球'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================== 底部懸浮導覽鈕：統一透明光澤 ✕ 返回 ｜ 📍 前往這裡 ==================== */}
      <button
        className="pikmin-glass-circle-btn pikmin-glass-close-fab"
        onClick={onClose}
        style={{ zIndex: 1320 }}
        title="關閉返回"
      >
        <svg width="58%" height="58%" viewBox="0 0 24 24" fill="none">
          <path d="M5.5 5.5L18.5 18.5M18.5 5.5L5.5 18.5" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      </button>

      {onNavigateToMap && (
        <button
          onClick={() => onNavigateToMap(mushroom)}
          style={{
            position: 'fixed',
            right: 18,
            bottom: 'max(18px, env(safe-area-inset-bottom))',
            zIndex: 1320,
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 99,
            padding: '11px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13.5,
            fontWeight: 900,
            color: '#1E293B',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.16)'
          }}
        >
          <span>📍</span>
          <span>前往這裡</span>
        </button>
      )}
    </div>
  );
};
