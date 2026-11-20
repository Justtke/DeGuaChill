import React, { useMemo, useRef, useState } from 'react';
import {
  ALL_PETAL_VARIANTS,
  DeGuaCreature,
  FlowerShapeStyle,
  getPetalVariantMeta,
  PetalColor,
  PetalVariantMeta
} from '../types/game';
import { getPlantingFootprintForSquad } from '../services/flowerPlantingEngine';
import { DeGuaCharacter } from './DeGuaCharacter';
import { WalkingPlayerAvatar } from './WalkingPlayerAvatar';
import { LushFlowerMeadowBackdrop } from './LushFlowerMeadowBackdrop';

interface FlowerPlantingModalProps {
  activeVariantId: string;
  isPlanting: boolean;
  petalInventory: Record<string, number>;
  nectarInventory: Record<string, number>;
  squadCreatures: DeGuaCreature[];
  isWithOthers: boolean;
  onToggleWithOthers: () => void;
  accelCount: number;
  isAccelActive: boolean;
  onToggleAccel: () => void;
  onSelectPetalVariant: (variantId: string) => void;
  onStartPlanting: () => void;
  onStopPlanting: () => void;
  onOpenDetector?: () => void;
  onClose: () => void;
}

const PETAL_COLOR_ORDER: PetalColor[] = ['white', 'yellow', 'red', 'blue'];

const JAR_FLOWER_PALETTES: Record<
  PetalColor,
  { petals: string[]; inner: string; glow: string; nectarDark: string; nectarLight: string }
> = {
  white: {
    petals: ['#FFFFFF', '#F8FAFC', '#EDE9FE'],
    inner: '#FEF08A',
    glow: 'rgba(255,255,255,0.9)',
    nectarDark: '#D6D3D1',
    nectarLight: '#FFFFFF'
  },
  yellow: {
    petals: ['#FACC15', '#FDE047', '#FB923C'],
    inner: '#9A3412',
    glow: 'rgba(254,240,138,0.85)',
    nectarDark: '#EAB308',
    nectarLight: '#FEF9C3'
  },
  red: {
    petals: ['#FB7185', '#EF4444', '#FDA4AF'],
    inner: '#991B1B',
    glow: 'rgba(254,202,202,0.85)',
    nectarDark: '#DC2626',
    nectarLight: '#FEE2E2'
  },
  blue: {
    petals: ['#60A5FA', '#3B82F6', '#93C5FD'],
    inner: '#1E3A8A',
    glow: 'rgba(191,219,254,0.85)',
    nectarDark: '#2563EB',
    nectarLight: '#DBEAFE'
  }
};

function renderFlowerBlossom(
  cx: number,
  cy: number,
  scale: number,
  shape: FlowerShapeStyle,
  pal: { petals: string[]; inner: string }
): string {
  if (shape === 'tulip') {
    return `
      <g transform="translate(${cx}, ${cy}) scale(${scale})">
        <path d="M -6 3 C -7 -4, -3 -9, 0 -9 C 3 -9, 7 -4, 6 3 C 3 6, -3 6, -6 3 Z" fill="${pal.petals[1]}" stroke="${pal.petals[2]}" stroke-width="0.6" />
        <path d="M -3 3 C -3 -3, 0 -8, 0 -9 C 1 -4, 3 0, 3 3 Z" fill="${pal.petals[0]}" opacity="0.85" />
      </g>
    `;
  }
  if (shape === 'rose') {
    return `
      <g transform="translate(${cx}, ${cy}) scale(${scale})">
        <circle cx="0" cy="0" r="6.8" fill="${pal.petals[1]}" />
        <circle cx="-1" cy="-0.5" r="4.8" fill="${pal.petals[2]}" />
        <circle cx="0.6" cy="0.5" r="3" fill="${pal.petals[0]}" />
        <path d="M -2 -1 C 0 -3, 3 -1, 1 2" stroke="${pal.inner}" stroke-width="0.9" fill="none" />
      </g>
    `;
  }
  if (shape === 'cluster') {
    return `
      <g transform="translate(${cx}, ${cy}) scale(${scale})">
        <circle cx="-4" cy="-2" r="3.4" fill="${pal.petals[0]}" />
        <circle cx="4" cy="-2" r="3.4" fill="${pal.petals[1]}" />
        <circle cx="0" cy="-5" r="3.4" fill="${pal.petals[2]}" />
        <circle cx="-3" cy="3" r="3.4" fill="${pal.petals[1]}" />
        <circle cx="3" cy="3" r="3.4" fill="${pal.petals[0]}" />
        <circle cx="0" cy="0" r="2.6" fill="${pal.petals[2]}" />
      </g>
    `;
  }
  if (shape === 'sunflower') {
    return `
      <g transform="translate(${cx}, ${cy}) scale(${scale})">
        <circle cx="0" cy="-6" r="3.2" fill="${pal.petals[0]}" />
        <circle cx="5.5" cy="-2.5" r="3.2" fill="${pal.petals[1]}" />
        <circle cx="4.5" cy="4.5" r="3.2" fill="${pal.petals[0]}" />
        <circle cx="-4.5" cy="4.5" r="3.2" fill="${pal.petals[1]}" />
        <circle cx="-5.5" cy="-2.5" r="3.2" fill="${pal.petals[0]}" />
        <circle cx="0" cy="0" r="3.6" fill="#78350F" />
      </g>
    `;
  }
  // daisy / sakura
  return `
    <g transform="translate(${cx}, ${cy}) scale(${scale})">
      <circle cx="-4.5" cy="-1.5" r="4.3" fill="${pal.petals[1]}" />
      <circle cx="4.5" cy="-1.5" r="4.3" fill="${pal.petals[1]}" />
      <circle cx="0" cy="-5.5" r="4.3" fill="${pal.petals[0]}" />
      <circle cx="-3" cy="3.8" r="4.3" fill="${pal.petals[2]}" />
      <circle cx="3" cy="3.8" r="4.3" fill="${pal.petals[2]}" />
      <circle cx="0" cy="0" r="2.6" fill="${pal.inner}" />
    </g>
  `;
}

/**
 * 依持有花瓣數量比例 (petalCount / 300) 真實填裝花瓣的玻璃木塞瓶 SVG
 */
export const GlassPetalJarSvg: React.FC<{
  color: PetalColor;
  petalCount: number;
  maxCapacity?: number;
  shape?: FlowerShapeStyle;
  size?: number;
  uid?: string;
}> = ({
  color,
  petalCount,
  maxCapacity = 300,
  shape = 'daisy',
  size = 76,
  uid = 'jar'
}) => {
  const pal = JAR_FLOWER_PALETTES[color];
  const gid = `wood_${uid}_${color}`;
  const glassId = `glass_${uid}_${color}`;
  const clipId = `clip_${uid}_${color}`;

  const ratio = petalCount <= 0 ? 0 : Math.max(0.06, Math.min(1, petalCount / maxCapacity));
  // 瓶內可用垂直範圍：底碗頂緣 y=64 至 瓶頸下緣 y=23
  const fillTopY = 64 - ratio * 38;
  const slots: { cx: number; dy: number; s: number }[] = [
    { cx: 31, dy: 60, s: 0.92 },
    { cx: 49, dy: 60, s: 0.94 },
    { cx: 40, dy: 55, s: 1.02 },
    { cx: 28, dy: 49, s: 0.96 },
    { cx: 51, dy: 48, s: 0.95 },
    { cx: 39, dy: 42, s: 1.04 },
    { cx: 32, dy: 34, s: 0.9 },
    { cx: 47, dy: 33, s: 0.88 },
    { cx: 40, dy: 27, s: 0.86 }
  ];

  // 僅顯示落於當前花瓣高度水位以下的植物與花朵，使不同數量呈現真實高低落差
  const visibleSlots = slots.filter((sl) => sl.dy >= fillTopY);
  const blossomsSvg =
    petalCount <= 0
      ? ''
      : visibleSlots.map((sl) => renderFlowerBlossom(sl.cx, sl.dy, sl.s, shape, pal)).join('');

  return (
    <svg
      width={size}
      height={Math.round(size * 1.15)}
      viewBox="0 0 80 92"
      style={{
        overflow: 'visible',
        opacity: petalCount <= 0 ? 0.52 : 1,
        filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.16))'
      }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A16207" />
          <stop offset="55%" stopColor="#78350F" />
          <stop offset="100%" stopColor="#451A03" />
        </linearGradient>
        <linearGradient id={glassId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.88" />
          <stop offset="50%" stopColor="#F1F5F9" stopOpacity="0.52" />
          <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.42" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d="M 35 17 C 28 24, 15 44, 15 58 C 15 74, 26 83, 40 83 C 54 83, 65 74, 65 58 C 65 44, 52 24, 45 17 Z" />
        </clipPath>
      </defs>

      {/* 上方木塞瓶蓋 */}
      <polygon points="33,4 47,4 43,18 37,18" fill={`url(#${gid})`} stroke="#451A03" strokeWidth="1" />
      <ellipse cx="40" cy="4" rx="7" ry="2.2" fill="#B45309" />

      {/* 玻璃瓶身外輪廓 */}
      <path
        d="M 35 17 C 28 24, 15 44, 15 58 C 15 74, 26 83, 40 83 C 54 83, 65 74, 65 58 C 65 44, 52 24, 45 17 Z"
        fill={`url(#${glassId})`}
        stroke="#94A3B8"
        strokeWidth="1.2"
      />

      {/* 依數量比例填裝的花瓣層＋花朵（裁切於玻璃瓶內壁） */}
      {petalCount > 0 && (
        <g clipPath={`url(#${clipId})`}>
          <rect
            x="12"
            y={Math.max(20, fillTopY - 2)}
            width="56"
            height={74 - Math.max(20, fillTopY - 2)}
            fill={pal.glow}
            opacity="0.55"
          />
          {ratio >= 0.15 && (
            <>
              <ellipse cx="28" cy={Math.max(36, fillTopY + 8)} rx="9" ry="5" transform="rotate(-24 28 58)" fill="#4ADE80" />
              <ellipse cx="52" cy={Math.max(36, fillTopY + 7)} rx="9" ry="5" transform="rotate(24 52 57)" fill="#22C55E" />
            </>
          )}
          <g dangerouslySetInnerHTML={{ __html: blossomsSvg }} />
        </g>
      )}

      {/* 底部木質底座 */}
      <path
        d="M 15 62 C 17 77, 27 85, 40 85 C 53 85, 63 77, 65 62 C 56 67, 24 67, 15 62 Z"
        fill={`url(#${gid})`}
      />
      <ellipse cx="40" cy="62" rx="25" ry="3.5" fill="#78350F" opacity="0.45" />

      {/* 左側玻璃反光 */}
      <path
        d="M 27 32 C 21 42, 19 50, 20 59"
        stroke="#FFFFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
      <ellipse cx="33" cy="24" rx="2.4" ry="4.5" transform="rotate(28 33 24)" fill="#FFFFFF" opacity="0.7" />
    </svg>
  );
};

/**
 * 圖卡左上角「對應精華球」SVG（光澤晶瑩圓珠）
 */
const NectarOrbBadgeSvg: React.FC<{ color: PetalColor; size?: number }> = ({ color, size = 17 }) => {
  const pal = JAR_FLOWER_PALETTES[color];
  const gradId = `orb_${color}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <defs>
        <radialGradient id={gradId} cx="35%" cy="32%" r="68%">
          <stop offset="0%" stopColor={pal.nectarLight} />
          <stop offset="65%" stopColor={pal.nectarDark} />
          <stop offset="100%" stopColor={pal.nectarDark} stopOpacity="0.9" />
        </radialGradient>
      </defs>
      <circle
        cx="12"
        cy="12"
        r="10"
        fill={`url(#${gradId})`}
        stroke={color === 'white' ? '#CBD5E1' : '#FFFFFF'}
        strokeWidth="1.2"
      />
      <ellipse cx="8.8" cy="8.2" rx="3.4" ry="2.2" transform="rotate(-25 8.8 8.2)" fill="#FFFFFF" opacity="0.88" />
    </svg>
  );
};

export const FlowerPlantingModal: React.FC<FlowerPlantingModalProps> = ({
  activeVariantId,
  isPlanting,
  petalInventory,
  nectarInventory,
  squadCreatures,
  isWithOthers,
  onToggleWithOthers,
  accelCount,
  isAccelActive,
  onToggleAccel,
  onSelectPetalVariant,
  onStartPlanting,
  onStopPlanting,
  onOpenDetector,
  onClose
}) => {
  // 底部白色面板高度比例：56% (預設對照圖) <-> 86% (往上拉展開看全部花瓣圖卡)
  const [sheetHeightPct, setSheetHeightPct] = useState<number>(56);
  const [colorFilter, setColorFilter] = useState<PetalColor | 'all'>('all');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showTipBubble, setShowTipBubble] = useState<boolean>(false);
  const [showKebabMenu, setShowKebabMenu] = useState<boolean>(false);
  const gridScrollRef = useRef<HTMLDivElement | null>(null);

  const dragRef = useRef<{
    active: boolean;
    startY: number;
    startPct: number;
    moved: boolean;
  }>({ active: false, startY: 0, startPct: 56, moved: false });

  const activeVariant: PetalVariantMeta = getPetalVariantMeta(activeVariantId);
  const activePetals = petalInventory[activeVariant.id] || 0;

  // 依據皮克敏真實隊伍人數決定消耗速度與預估距離/剩餘時間
  const footprint = getPlantingFootprintForSquad(Math.max(1, squadCreatures.length));
  const intervalSec = isAccelActive ? footprint.intervalSeconds / 2 : footprint.intervalSeconds;
  const estMinutes = activePetals <= 0 ? 0 : Math.max(1, Math.round((activePetals * intervalSec) / 60));
  const estFlowers =
    activePetals <= 0
      ? 0
      : Math.round(activePetals * 17 * (footprint.totalCells / 30) * (isAccelActive ? 2 : 1) + activePetals * 11);

  const displayedVariants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ALL_PETAL_VARIANTS.filter((v) => {
      if (colorFilter !== 'all' && v.color !== colorFilter) return false;
      const count = petalInventory[v.id] || 0;
      if (q) {
        return (
          v.displayName.toLowerCase().includes(q) ||
          v.speciesNameZh.toLowerCase().includes(q)
        );
      }
      // 未搜尋時僅顯示目前擁有的所有花瓣，搜尋時可查閱完整皮克敏花瓣目錄
      return count > 0;
    }).sort((a, b) => {
      if (a.isBase !== b.isBase) return a.isBase ? -1 : 1;
      const diff = (petalInventory[b.id] || 0) - (petalInventory[a.id] || 0);
      return diff !== 0 ? diff : 0;
    });
  }, [colorFilter, searchQuery, petalInventory]);

  const handleSheetPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const targetEl = e.target as HTMLElement | null;
    if (targetEl?.closest('button, input')) return;
    dragRef.current = {
      active: true,
      startY: e.clientY,
      startPct: sheetHeightPct,
      moved: false
    };
  };

  const handleSheetPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dy = dragRef.current.startY - e.clientY;
    const gridScrollTop = gridScrollRef.current?.scrollTop ?? 0;
    if (dragRef.current.startPct >= 80 && gridScrollTop > 2 && dy < 0) return;
    if (Math.abs(dy) > 8) {
      dragRef.current.moved = true;
    } else {
      return;
    }
    const vh = window.innerHeight || 800;
    const deltaPct = (dy / vh) * 100;
    const clamped = Math.max(48, Math.min(88, dragRef.current.startPct + deltaPct));
    setSheetHeightPct(clamped);
  };

  const handleSheetPointerUp = () => {
    if (!dragRef.current.active) return;
    const wasMoved = dragRef.current.moved;
    dragRef.current.active = false;
    if (!wasMoved) return;
    setSheetHeightPct((prev) => (prev >= 68 ? 86 : 56));
    window.setTimeout(() => {
      dragRef.current.moved = false;
    }, 80);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        height: '100lvh',
        minHeight: '100lvh',
        zIndex: 1050,
        background: '#4EA732',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* ==================== 上半部：會動的百花草原、飄舞花瓣與主角腳邊跑動的夥伴 ==================== */}
      <div
        style={{
          position: 'absolute',
          inset: '0 0 auto 0',
          height: `${100 - sheetHeightPct + 8}%`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: dragRef.current.active ? 'none' : 'height 0.25s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        <LushFlowerMeadowBackdrop variant="planting" animateBurst={isPlanting} />

        <div
          style={{
            position: 'absolute',
            top: 'var(--top-safe-hud)',
            left: 14,
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.34)',
            border: '1.5px solid rgba(255,255,255,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            backdropFilter: 'blur(4px)',
            zIndex: 10
          }}
        >
          ⛅
        </div>
        <div
          style={{
            position: 'absolute',
            top: 'var(--top-safe-hud)',
            right: 14,
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'rgba(15,23,42,0.28)',
            border: '1.5px solid rgba(255,255,255,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            backdropFilter: 'blur(4px)',
            zIndex: 10
          }}
        >
          🧭
        </div>

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 28,
            zIndex: 5
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', position: 'relative' }}>
            <WalkingPlayerAvatar height={78} isWalking={true} />
            <div style={{ marginLeft: -8, marginBottom: 24, transform: 'rotate(8deg)' }}>
              <GlassPetalJarSvg
                color={activeVariant.color}
                petalCount={activePetals}
                shape={activeVariant.shape}
                size={38}
                uid="hero_hand"
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, marginTop: -20 }}>
            {squadCreatures.slice(0, 6).map((c, i) => (
              <div
                key={c.id}
                style={{
                  animation: `deguaRoamPace ${2.4 + (i % 3) * 0.45}s ease-in-out infinite`,
                  animationDelay: `${i * 0.35}s`,
                  marginTop: i % 2 === 0 ? 0 : -5
                }}
              >
                <DeGuaCharacter
                  variety={c.variety}
                  decor={c.decor}
                  leafStage={c.leafStage}
                  flowerColor={c.flowerColor}
                  showDecor={c.hasDecor}
                  size={30}
                  isBouncing={true}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== 下半部：可往上拉的皮克敏白色花瓣瓶選單 ==================== */}
      <div
        onPointerDown={handleSheetPointerDown}
        onPointerMove={handleSheetPointerMove}
        onPointerUp={handleSheetPointerUp}
        onPointerCancel={handleSheetPointerUp}
        style={{
          position: 'relative',
          height: `${sheetHeightPct}%`,
          width: '100%',
          background: '#FFFFFF',
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -8px 28px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          transition: dragRef.current.active ? 'none' : 'height 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
          zIndex: 10
        }}
      >
        {/* 頂部可拖曳把手區 */}
        <div
          style={{
            padding: '10px 18px 4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            touchAction: 'none',
            cursor: 'grab',
            flexShrink: 0,
            position: 'relative'
          }}
        >
          <div
            onClick={() => setSheetHeightPct((p) => (p >= 68 ? 56 : 86))}
            style={{
              width: 40,
              height: 4,
              borderRadius: 99,
              background: '#D1D5DB',
              cursor: 'pointer'
            }}
          />

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowKebabMenu((v) => !v);
            }}
            style={{
              position: 'absolute',
              right: 12,
              top: 6,
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: '#475569',
              fontSize: 18,
              fontWeight: 900,
              cursor: 'pointer'
            }}
          >
            ⋮
          </button>

          {showKebabMenu && onOpenDetector && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setShowKebabMenu(false);
                onOpenDetector();
              }}
              style={{
                position: 'absolute',
                right: 16,
                top: 38,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 14,
                padding: '9px 14px',
                fontSize: 12.5,
                fontWeight: 800,
                color: '#0F172A',
                boxShadow: '0 8px 20px rgba(0,0,0,0.14)',
                zIndex: 50,
                cursor: 'pointer'
              }}
            >
              📡 開啟探測器
            </div>
          )}
        </div>

        {/* 中央控制區：左「加速」・中「玻璃花瓣瓶 + ▶/■ 鈕」・右「大家一起」 */}
        <div
          style={{
            padding: '4px 20px 6px',
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0
          }}
        >
          {/* 左：加速 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <button
              onClick={onToggleAccel}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: isAccelActive ? '2.5px solid #0EA5E9' : '2px solid #99F6E4',
                background: isAccelActive
                  ? 'linear-gradient(135deg, #06B6D4, #0284C7)'
                  : 'linear-gradient(135deg, #E0F2FE, #CCFBF1)',
                color: isAccelActive ? '#FFFFFF' : '#0F766E',
                fontSize: 16,
                fontWeight: 900,
                position: 'relative',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 3px 10px rgba(0,0,0,0.1)'
              }}
            >
              ⏩
              <span
                style={{
                  position: 'absolute',
                  right: -6,
                  bottom: -2,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 99,
                  background: '#64748B',
                  color: '#FFFFFF',
                  fontSize: 10,
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  border: '1.5px solid #FFFFFF'
                }}
              >
                {accelCount}
              </span>
            </button>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: '#334155' }}>加速</span>
          </div>

          {/* 中：大玻璃花瓣瓶 + 播放 ▶ / 停止 ■ 圓鈕 + 右下數量膠囊 */}
          <div style={{ position: 'relative', width: 98, height: 92, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <GlassPetalJarSvg
              color={activeVariant.color}
              petalCount={activePetals}
              shape={activeVariant.shape}
              size={76}
              uid="main_center"
            />

            <button
              onClick={isPlanting ? onStopPlanting : onStartPlanting}
              style={{
                position: 'absolute',
                left: -6,
                bottom: 6,
                width: 46,
                height: 46,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.9)',
                background: isPlanting
                  ? 'radial-gradient(circle at 32% 30%, #FB7185, #EF4444)'
                  : 'radial-gradient(circle at 32% 30%, #86EFAC, #22C55E)',
                color: '#FFFFFF',
                fontSize: 17,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isPlanting
                  ? '0 4px 14px rgba(239,68,68,0.45)'
                  : '0 4px 14px rgba(34,197,94,0.45)'
              }}
              title={isPlanting ? '停止種花' : '開始種花'}
            >
              {isPlanting ? '■' : '▶'}
            </button>

            <div
              style={{
                position: 'absolute',
                right: 0,
                bottom: 6,
                background: '#52525B',
                color: '#FFFFFF',
                fontSize: 11.5,
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: 99,
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
            >
              {activePetals}
            </div>
          </div>

          {/* 右：大家一起 Switch */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <button
              onClick={onToggleWithOthers}
              style={{
                width: 58,
                height: 30,
                borderRadius: 99,
                border: 'none',
                background: isWithOthers ? '#4ADE80' : '#E2E8F0',
                padding: 3,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isWithOthers ? 'flex-end' : 'flex-start',
                transition: 'background 0.2s'
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: isWithOthers ? '#FFFFFF' : '#94A3B8',
                  color: isWithOthers ? '#16A34A' : '#FFFFFF',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.18)'
                }}
              >
                🏃
              </div>
            </button>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: '#334155' }}>大家一起</span>
          </div>
        </div>

        {/* 預計花朵距離與剩餘分鐘數（單行潔淨顯示） */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingBottom: 8,
            position: 'relative',
            flexShrink: 0
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 800, color: '#475569' }}>
            約 {estFlowers.toLocaleString()} 朵花的步行距離／還剩 {estMinutes} 分鐘
          </span>
          <button
            onClick={() => setShowTipBubble((v) => !v)}
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: '1.2px solid #94A3B8',
              background: '#FFFFFF',
              color: '#64748B',
              fontSize: 11,
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
          >
            ?
          </button>

          {showTipBubble && (
            <div
              onClick={() => setShowTipBubble(false)}
              style={{
                position: 'absolute',
                top: 24,
                background: '#0F172A',
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: 10,
                zIndex: 40,
                boxShadow: '0 6px 16px rgba(0,0,0,0.22)'
              }}
            >
              {activeVariant.displayName}・每格冷卻 5 分鐘（加速 15 分鐘內可種 2 朵）
            </div>
          )}
        </div>

        {/* 顏色圓點篩選列 ＋ 放大鏡搜尋框切換 */}
        <div
          style={{
            padding: '0 18px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {PETAL_COLOR_ORDER.map((color) => {
                const isFiltered = colorFilter === color;
                const dotColor =
                  color === 'white'
                    ? '#E2E8F0'
                    : color === 'yellow'
                    ? '#FACC15'
                    : color === 'red'
                    ? '#EF4444'
                    : '#3B82F6';
                return (
                  <button
                    key={color}
                    onClick={() => setColorFilter((prev) => (prev === color ? 'all' : color))}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: isFiltered ? '2.5px solid #0F172A' : '1px solid #CBD5E1',
                      background: dotColor,
                      cursor: 'pointer',
                      padding: 0,
                      transform: isFiltered ? 'scale(1.18)' : 'scale(1)'
                    }}
                  />
                );
              })}
            </div>

            <button
              onClick={() => {
                setIsSearchOpen((open) => {
                  const nextOpen = !open;
                  if (nextOpen) {
                    setSheetHeightPct(86);
                  } else {
                    setSearchQuery('');
                  }
                  return nextOpen;
                });
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: isSearchOpen ? '1.8px solid #16A34A' : '1px solid #CBD5E1',
                background: isSearchOpen ? '#F0FDF4' : '#FFFFFF',
                color: '#475569',
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="搜尋花瓣名稱"
            >
              🔍
            </button>
          </div>

          {isSearchOpen && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#F1F5F9',
                borderRadius: 99,
                padding: '6px 12px',
                border: '1px solid #CBD5E1'
              }}
            >
              <span style={{ fontSize: 13 }}>🔍</span>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋花瓣名稱（如：櫻花、玫瑰、天竺葵）"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#0F172A'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    border: 'none',
                    background: '#94A3B8',
                    color: '#FFFFFF',
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    fontSize: 11,
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* 花瓣圖卡列表區（左上角：對應精華與數量；中央：按數量填裝的花瓶；花瓶下方：花瓣名稱；右下角：花瓣數） */}
        <div
          ref={gridScrollRef}
          style={{
            flex: 1,
            overflowY: sheetHeightPct >= 74 ? 'auto' : 'hidden',
            touchAction: sheetHeightPct >= 74 ? 'pan-y' : 'none',
            padding: '6px 14px 88px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            alignContent: 'start',
            background: '#F8FAFC'
          }}
        >
          {displayedVariants.map((variant) => {
            const isSelected = activeVariant.id === variant.id;
            const petals = petalInventory[variant.id] || 0;
            const nectar = nectarInventory[variant.id] || 0;
            return (
              <div
                key={variant.id}
                onClick={() => {
                  if (dragRef.current.moved) return;
                  onSelectPetalVariant(variant.id);
                }}
                style={{
                  position: 'relative',
                  background: '#FFFFFF',
                  borderRadius: 16,
                  padding: '8px 6px 9px',
                  border: isSelected ? '2px solid #22C55E' : '1px solid #E2E8F0',
                  boxShadow: isSelected
                    ? '0 4px 12px rgba(34,197,94,0.18)'
                    : '0 2px 8px rgba(15,23,42,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 128,
                  cursor: 'pointer'
                }}
              >
                {/* 左上角：對應精華球與目前精華數 */}
                <div
                  style={{
                    position: 'absolute',
                    top: 7,
                    left: 7,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3
                  }}
                >
                  <NectarOrbBadgeSvg color={variant.color} size={16} />
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: '#94A3B8' }}>{nectar}</span>
                </div>

                {/* 中央玻璃花瓣瓶（內部花瓣依數量比例顯示高低與疏密） */}
                <div style={{ marginTop: 15 }}>
                  <GlassPetalJarSvg
                    color={variant.color}
                    petalCount={petals}
                    shape={variant.shape}
                    size={56}
                    uid={`card_${variant.id}`}
                  />
                </div>

                {/* 右下角：純花瓣數量膠囊（浮於瓶底右緣，不含商店 + 號） */}
                <div
                  style={{
                    position: 'absolute',
                    right: 6,
                    bottom: 28,
                    background: '#3F3F46',
                    color: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 900,
                    padding: '1.5px 7px',
                    borderRadius: 99,
                    minWidth: 26,
                    textAlign: 'center',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                  }}
                >
                  {petals}
                </div>

                {/* 花瓶正下方：皮克敏花瓣真實名稱 */}
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11.5,
                    fontWeight: 900,
                    color: petals > 0 ? '#1E293B' : '#94A3B8',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {variant.displayName}
                </div>
              </div>
            );
          })}

          {displayedVariants.length === 0 && (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '28px 12px',
                textAlign: 'center',
                fontSize: 13,
                fontWeight: 800,
                color: '#94A3B8'
              }}
            >
              找不到符合的花瓣
            </div>
          )}
        </div>
      </div>

      {/* 左下角統一透明光澤 ✕ 關閉鈕 */}
      <button
        className="pikmin-glass-circle-btn pikmin-glass-close-fab"
        onClick={onClose}
        style={{ zIndex: 25 }}
        title="返回主畫面"
      >
        <svg width="58%" height="58%" viewBox="0 0 24 24" fill="none">
          <path d="M5.5 5.5L18.5 18.5M18.5 5.5L5.5 18.5" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
};
