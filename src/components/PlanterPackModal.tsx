import React, { useMemo, useRef, useState } from 'react';
import {
  ActiveExtraFryerSlot,
  DECOR_CATALOG,
  DECOR_SUBSETS_CATALOG,
  DeGuaCreature,
  DeGuaVariety,
  ExtraFryerSlotInventory,
  ExtraFryerSlotType,
  Seedling,
  VARIETY_CATALOG
} from '../types/game';
import { DeGuaCharacter } from './DeGuaCharacter';

interface PlanterPackModalProps {
  seedlings: Seedling[];
  creatures: DeGuaCreature[];
  coins: number;
  isPlanting: boolean;
  extraSlotInventory: ExtraFryerSlotInventory;
  activeExtraSlots: ActiveExtraFryerSlot[];
  onAssignToSlot: (seedlingId: string, slotIndex: number) => void;
  onPluckSeedling: (seedling: Seedling) => void;
  onToggleFavoriteSeedling: (seedlingId: string) => void;
  onActivateExtraSlot: (type: ExtraFryerSlotType) => void;
  onOpenDecorModal: () => void;
  onOpenMap: () => void;
  onClose: () => void;
}

function formatDiscoveredDateZh(ms: number): string {
  const d = new Date(ms || Date.now());
  const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日，${weekdays[d.getDay()]}`;
}

/**
 * 繪製可愛 3D 感炸鍋裡的「瓜糰」SVG（無綠葉新芽！依油炸步數進度動態呈現膨脹金黃度與冒煙熱氣比例）
 */
const GuatuanBallSvg: React.FC<{
  variety: DeGuaVariety;
  isHuge?: boolean;
  inPot?: boolean;
  progressPct?: number; // 0 ~ 1
  isReady?: boolean;
  size?: number;
}> = ({
  variety,
  isHuge = false,
  inPot = false,
  progressPct = 0,
  isReady = false,
  size = 56
}) => {
  const meta = VARIETY_CATALOG[variety];
  const pct = isReady ? 1 : Math.max(0, Math.min(1, progressPct));
  const fill = isHuge ? '#F59E0B' : meta.bodyColor;
  const stroke = isHuge ? '#B45309' : meta.potColor;

  // 依據油炸快要起鍋的比例，決定熱氣煙霧縷數與大小
  const steamCount = !inPot ? 0 : pct < 0.25 ? 1 : pct < 0.65 ? 2 : pct < 0.99 ? 3 : 4;
  const steamOpacity = Math.min(0.95, 0.35 + pct * 0.6);
  const puffRadius = (isHuge ? 21 : 17.5) + (inPot ? pct * 2.4 : 0);

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* 冒煙熱氣（只於油鍋油炸時依快要起鍋的比例升起） */}
      {inPot && steamCount > 0 && (
        <div
          style={{
            position: 'absolute',
            top: -Math.round(size * 0.34),
            left: '50%',
            transform: 'translateX(-50%)',
            width: size,
            height: Math.round(size * 0.65),
            pointerEvents: 'none',
            zIndex: 6
          }}
        >
          {[
            { left: '34%', delay: '0s', scale: 0.78 },
            { left: '54%', delay: '0.45s', scale: 0.95 },
            { left: '22%', delay: '0.85s', scale: 0.85 },
            { left: '68%', delay: '1.2s', scale: 1.05 }
          ]
            .slice(0, steamCount)
            .map((wisp, idx) => (
              <svg
                key={idx}
                width="20"
                height="32"
                viewBox="0 0 20 32"
                style={{
                  position: 'absolute',
                  left: wisp.left,
                  bottom: 0,
                  marginLeft: -10,
                  opacity: steamOpacity,
                  transform: `scale(${wisp.scale})`,
                  animation: `deguaSteamRise ${pct > 0.75 ? '1.35s' : '2.1s'} ease-out ${wisp.delay} infinite`
                }}
              >
                <path
                  d="M10 30 C4 22 15 16 9 9 C6 5 11 2 12 1"
                  stroke={isReady ? '#FEF08A' : '#FFFFFF'}
                  strokeWidth={pct > 0.7 ? '3.4' : '2.4'}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            ))}
        </div>
      )}

      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        style={{
          overflow: 'visible',
          animation: inPot && pct >= 0.65 ? 'deguaSizzleBob 1.1s ease-in-out infinite' : undefined,
          filter: isReady
            ? 'drop-shadow(0 0 12px rgba(251,191,36,0.92)) drop-shadow(0 0 18px rgba(255,255,255,0.95))'
            : inPot && pct >= 0.7
              ? 'drop-shadow(0 0 8px rgba(253,224,71,0.55)) drop-shadow(0 4px 6px rgba(0,0,0,0.18))'
              : 'drop-shadow(0 4px 6px rgba(0,0,0,0.18))'
        }}
      >
        {/* 鍋內沸騰小油泡 */}
        {inPot && (
          <g>
            <circle
              cx="14"
              cy="48"
              r={pct > 0.6 ? 2.4 : 1.6}
              fill="#FEF08A"
              style={{ animation: 'deguaOilBubble 1.1s ease-out infinite' }}
            />
            <circle
              cx="50"
              cy="47"
              r={pct > 0.6 ? 2.2 : 1.5}
              fill="#FDE047"
              style={{ animation: 'deguaOilBubble 1.3s ease-out 0.45s infinite' }}
            />
            {pct >= 0.5 && (
              <circle
                cx="39"
                cy="52"
                r="2"
                fill="#FFFFFF"
                style={{ animation: 'deguaOilBubble 0.95s ease-out 0.7s infinite' }}
              />
            )}
          </g>
        )}

        {/* 圓潤酥香的地瓜麵糰本體（完全沒有綠葉與枝芽！） */}
        <circle
          cx="32"
          cy={inPot ? 38 - pct * 2.5 : 37}
          r={puffRadius}
          fill={fill}
          stroke={stroke}
          strokeWidth="2.2"
        />
        {/* 隨油炸比例增加的金黃酥脆油光暈 */}
        {inPot && pct > 0.25 && (
          <circle
            cx="32"
            cy={38 - pct * 2.5}
            r={puffRadius - 2}
            fill="rgba(253, 224, 71, 0.28)"
            opacity={pct * 0.65}
          />
        )}
        {/* 酥脆高光弧與焦糖斑點 */}
        <ellipse
          cx="25"
          cy={(inPot ? 38 - pct * 2.5 : 37) - puffRadius * 0.4}
          rx={puffRadius * 0.36}
          ry={puffRadius * 0.2}
          fill="rgba(255,255,255,0.48)"
          transform={`rotate(-20 25 ${(inPot ? 38 - pct * 2.5 : 37) - puffRadius * 0.4})`}
        />
        <circle cx="24" cy="43" r="1.9" fill={isHuge ? '#FEF08A' : 'rgba(255,255,255,0.45)'} />
        <circle cx="40" cy="41" r="1.7" fill={isHuge ? '#FEF08A' : 'rgba(255,255,255,0.38)'} />
        {isHuge && <circle cx="33" cy="47" r="2.1" fill="#FEF08A" />}
      </svg>
    </div>
  );
};

/** 繪製額外欄位環狀托盤 SVG（青藍一般 / 金黃加速+25%） */
const ExtraSlotSaucerSvg: React.FC<{
  type: ExtraFryerSlotType;
  size?: number;
}> = ({ type, size = 76 }) => {
  const isGold = type === 'fast25';
  const rim = isGold ? '#FBBF24' : '#5EEAD4';
  const body = isGold ? '#D97706' : '#0D9488';
  const hole = isGold ? '#78350F' : '#115E59';
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 96 68" style={{ filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.16))' }}>
      <ellipse cx="48" cy="42" rx="42" ry="19" fill={body} />
      <ellipse cx="48" cy="36" rx="42" ry="18" fill={rim} />
      <ellipse cx="48" cy="35" rx="22" ry="9.5" fill={hole} />
      <ellipse cx="48" cy="37" rx="18" ry="6.5" fill="rgba(0,0,0,0.28)" />
    </svg>
  );
};

export const PlanterPackModal: React.FC<PlanterPackModalProps> = ({
  seedlings,
  creatures,
  coins,
  isPlanting,
  extraSlotInventory,
  activeExtraSlots,
  onAssignToSlot,
  onPluckSeedling,
  onToggleFavoriteSeedling,
  onActivateExtraSlot,
  onOpenDecorModal,
  onOpenMap,
  onClose
}) => {
  const [isBagDrawerOpen, setIsBagDrawerOpen] = useState<boolean>(false);
  const [isExtraDrawerOpen, setIsExtraDrawerOpen] = useState<boolean>(false);
  const [inspectedSeedlingId, setInspectedSeedlingId] = useState<string | null>(null);
  const [detailSheetPct, setDetailSheetPct] = useState<number>(58); // 圖5 (58%) <-> 圖6/7 (90%)
  const [showDetailHelp, setShowDetailHelp] = useState<boolean>(false);
  const [preselectedSlot, setPreselectedSlot] = useState<number | null>(null);
  const [selectedExtraType, setSelectedExtraType] = useState<ExtraFryerSlotType>('standard');
  const [colorFilter, setColorFilter] = useState<DeGuaVariety | 'huge' | null>(null);
  const [sortMode, setSortMode] = useState<'decor' | 'steps'>('decor');
  const [bagNotice, setBagNotice] = useState<string | null>(null);

  const detailDragRef = useRef<{ active: boolean; startY: number; startPct: number; moved: boolean }>({
    active: false,
    startY: 0,
    startPct: 58,
    moved: false
  });
  const detailScrollRef = useRef<HTMLDivElement | null>(null);

  const inspectedSeedling = useMemo(
    () => seedlings.find((s) => s.id === inspectedSeedlingId) ?? null,
    [seedlings, inspectedSeedlingId]
  );

  const bagSeedlings = useMemo(
    () => seedlings.filter((s) => s.slotIndex === null),
    [seedlings]
  );

  const filteredBagSeedlings = useMemo(() => {
    const base = bagSeedlings.filter((s) => {
      if (!colorFilter) return true;
      if (colorFilter === 'huge') return s.isHuge;
      return s.variety === colorFilter;
    });
    return [...base].sort((a, b) => {
      if (sortMode === 'steps') return a.targetSteps - b.targetSteps;
      return a.decor.localeCompare(b.decor);
    });
  }, [bagSeedlings, colorFilter, sortMode]);

  const unlockedExtraMap = useMemo(() => {
    const map: Record<number, ActiveExtraFryerSlot> = {};
    activeExtraSlots.forEach((slot) => {
      map[slot.slotIndex] = slot;
    });
    return map;
  }, [activeExtraSlots]);

  const activeSlotCount = 2 + activeExtraSlots.length;
  const occupiedSlots = useMemo(() => {
    const map: Record<number, Seedling> = {};
    seedlings.forEach((s) => {
      if (s.slotIndex !== null) map[s.slotIndex] = s;
    });
    return map;
  }, [seedlings]);

  const findNextAvailableSlot = (): number | null => {
    if (preselectedSlot !== null && !occupiedSlots[preselectedSlot]) {
      const isDefault = preselectedSlot < 2;
      if (isDefault || unlockedExtraMap[preselectedSlot]) return preselectedSlot;
    }
    const candidateIndices = [0, 1, ...activeExtraSlots.map((a) => a.slotIndex).sort((a, b) => a - b)];
    for (const idx of candidateIndices) {
      if (!occupiedSlots[idx]) return idx;
    }
    return null;
  };

  const handleOpenBagForSlot = (slotIdx: number | null) => {
    setPreselectedSlot(slotIdx);
    setBagNotice(null);
    setIsExtraDrawerOpen(false);
    setInspectedSeedlingId(null);
    setIsBagDrawerOpen(true);
  };

  const handleInspectSeedling = (seed: Seedling) => {
    setIsExtraDrawerOpen(false);
    setShowDetailHelp(false);
    setDetailSheetPct(58);
    setInspectedSeedlingId(seed.id);
  };

  const handlePutSeedlingInSlot = (seed: Seedling) => {
    const freeSlot = findNextAvailableSlot();
    if (freeSlot === null) {
      setBagNotice('目前油鍋欄位已滿！關閉後點右下使用「額外欄位」擴充。');
      return;
    }
    onAssignToSlot(seed.id, freeSlot);
    setPreselectedSlot(null);
    setInspectedSeedlingId(null);
    setIsBagDrawerOpen(false);
  };

  const handleSlotTap = (slotIdx: number, slotType: ExtraFryerSlotType = 'standard') => {
    const s = occupiedSlots[slotIdx];
    if (s) {
      // 點在炸中的瓜糰 -> 打開圖5/6/7可上拉細節與同分類圖鑑抽屜！
      handleInspectSeedling(s);
      return;
    }
    const isUnlocked = slotIdx < 2 || Boolean(unlockedExtraMap[slotIdx]);
    if (!isUnlocked) {
      setIsBagDrawerOpen(false);
      setInspectedSeedlingId(null);
      setSelectedExtraType(
        extraSlotInventory.fast25 > 0 && extraSlotInventory.standard === 0 ? 'fast25' : slotType
      );
      setIsExtraDrawerOpen(true);
      return;
    }
    handleOpenBagForSlot(slotIdx);
  };

  // 圖5/6/7 瓜糰細節卡拖曳伸縮手勢
  const handleDetailPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    detailDragRef.current = {
      active: true,
      startY: e.clientY,
      startPct: detailSheetPct,
      moved: false
    };
  };

  const handleDetailPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!detailDragRef.current.active) return;
    const dy = detailDragRef.current.startY - e.clientY;
    const scrollTop = detailScrollRef.current?.scrollTop ?? 0;
    if (detailDragRef.current.startPct >= 85 && scrollTop > 2 && dy < 0) return;
    if (Math.abs(dy) > 8) detailDragRef.current.moved = true;
    else return;
    const vh = window.innerHeight || 800;
    const clamped = Math.max(52, Math.min(91, detailDragRef.current.startPct + (dy / vh) * 100));
    setDetailSheetPct(clamped);
  };

  const handleDetailPointerUp = () => {
    if (!detailDragRef.current.active) return;
    const wasMoved = detailDragRef.current.moved;
    detailDragRef.current.active = false;
    if (!wasMoved) return;
    setDetailSheetPct((prev) => (prev >= 72 ? 90 : 58));
    window.setTimeout(() => {
      detailDragRef.current.moved = false;
    }, 80);
  };

  const totalExtraItems = extraSlotInventory.standard + extraSlotInventory.fast25;

  const COLOR_FILTERS: Array<{ id: DeGuaVariety | 'huge'; hex: string; border?: string }> = [
    { id: 'red', hex: '#EF4444' },
    { id: 'yellow', hex: '#FACC15' },
    { id: 'blue', hex: '#3B82F6' },
    { id: 'purple', hex: '#9333EA' },
    { id: 'white', hex: '#E2E8F0', border: '#CBD5E1' },
    { id: 'rock', hex: '#4B5563' },
    { id: 'winged', hex: '#38BDF8' },
    { id: 'huge', hex: 'linear-gradient(135deg, #FDE047 50%, #CA8A04 50%)' }
  ];

  const upperHoleSpecs = [
    { slotIndex: 2, yOffset: 10 },
    { slotIndex: 3, yOffset: 0 },
    { slotIndex: 4, yOffset: 0 },
    { slotIndex: 5, yOffset: 10 }
  ];

  const renderFryerPot = (slotIdx: number, variant: ExtraFryerSlotType = 'standard', size: 'lg' | 'sm' = 'lg') => {
    const s = occupiedSlots[slotIdx];
    const isGold = variant === 'fast25';
    const progressRatio = s ? Math.min(1, s.currentSteps / Math.max(1, s.targetSteps)) : 0;
    const pct = Math.round(progressRatio * 100);
    const remaining = s ? Math.max(0, s.targetSteps - s.currentSteps) : 0;
    const potWidth = size === 'lg' ? 118 : 76;

    return (
      <div
        key={`pot_${slotIdx}`}
        onClick={() => handleSlotTap(slotIdx, variant)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: 'pointer',
          position: 'relative',
          width: potWidth
        }}
      >
        {/* 步數顯示 ＋ 進度條 ＋ 可起鍋快速按鈕 */}
        {s ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 4, zIndex: 8 }}>
            {s.isReady ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPluckSeedling(s);
                }}
                style={{
                  border: '1.5px solid #FFFFFF',
                  background: 'linear-gradient(135deg, #F59E0B, #EA580C)',
                  color: '#FFFFFF',
                  fontSize: size === 'lg' ? 11.5 : 9.5,
                  fontWeight: 900,
                  padding: '2px 9px',
                  borderRadius: 99,
                  cursor: 'pointer',
                  marginBottom: 2,
                  boxShadow: '0 4px 10px rgba(234,88,12,0.4)'
                }}
              >
                🥄 起鍋！
              </button>
            ) : (
              <div
                style={{
                  fontSize: size === 'lg' ? 20 : 14,
                  fontWeight: 900,
                  color: '#FFFFFF',
                  textShadow: '0 2px 6px rgba(15,118,110,0.45)',
                  WebkitTextStroke: '1px rgba(21,128,61,0.55)',
                  letterSpacing: -0.5,
                  lineHeight: 1.05
                }}
              >
                {remaining}
              </div>
            )}
            <div
              style={{
                width: size === 'lg' ? 84 : 56,
                height: size === 'lg' ? 7 : 5,
                borderRadius: 99,
                background: 'rgba(255,255,255,0.9)',
                border: '1px solid #94A3B8',
                overflow: 'hidden',
                marginTop: 2
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: isGold
                    ? 'linear-gradient(90deg, #F59E0B, #FACC15)'
                    : 'linear-gradient(90deg, #34D399, #10B981)',
                  transition: 'width 0.35s ease'
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ height: size === 'lg' ? 32 : 20 }} />
        )}

        {/* 油鍋 ＋ 冒煙油炸中的瓜糰 */}
        <div
          style={{
            position: 'relative',
            width: potWidth,
            height: size === 'lg' ? 84 : 58,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              width: potWidth,
              height: size === 'lg' ? 48 : 34,
              borderRadius: '50%',
              background: isGold
                ? 'radial-gradient(circle at 50% 35%, #FDE047, #EAB308)'
                : 'radial-gradient(circle at 50% 35%, #5EEAD4, #14B8A6)',
              boxShadow: isGold
                ? '0 10px 18px rgba(180,83,9,0.28), inset 0 -4px 8px rgba(146,64,14,0.35)'
                : '0 10px 18px rgba(15,118,110,0.25), inset 0 -4px 8px rgba(13,148,136,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div
              style={{
                width: size === 'lg' ? 76 : 50,
                height: size === 'lg' ? 36 : 24,
                borderRadius: '50%',
                background: s
                  ? 'radial-gradient(circle at 50% 38%, #B45309, #451A03)'
                  : 'rgba(15,23,42,0.16)',
                border: s ? '3px solid #D97706' : '2px dashed rgba(255,255,255,0.6)',
                marginTop: size === 'lg' ? -10 : -6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {!s && (
                <span style={{ fontSize: size === 'lg' ? 16 : 12, fontWeight: 900, color: '#FFFFFF', opacity: 0.9 }}>
                  +
                </span>
              )}
            </div>
          </div>

          {s && (
            <div
              className={s.isReady ? 'degua-bounce' : undefined}
              style={{
                position: 'absolute',
                bottom: size === 'lg' ? 18 : 11,
                zIndex: 4,
                pointerEvents: 'none'
              }}
            >
              <GuatuanBallSvg
                variety={s.variety}
                isHuge={s.isHuge}
                inPot={true}
                progressPct={progressRatio}
                size={size === 'lg' ? 66 : 44}
                isReady={s.isReady}
              />
            </div>
          )}

          {isGold && (
            <div
              style={{
                position: 'absolute',
                bottom: -6,
                background: '#B45309',
                color: '#FEF08A',
                fontSize: 9.5,
                fontWeight: 900,
                padding: '1px 6px',
                borderRadius: 99,
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
            >
              ⚡ +25%
            </div>
          )}
        </div>
      </div>
    );
  };

  const detailMeta = inspectedSeedling ? DECOR_CATALOG[inspectedSeedling.decor] : null;
  const detailSubsets = inspectedSeedling ? DECOR_SUBSETS_CATALOG[inspectedSeedling.decor] || [] : [];

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
        zIndex: 1080,
        background:
          'linear-gradient(180deg, #D5E8DC 0%, #E7F2EC 38%, #F8FAFC 70%, #EEF2F5 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* 右上角：透亮金幣膠囊（使用 --top-safe-hud 避開 iOS 頂部模糊區） */}
      <div
        style={{
          padding: 'var(--top-safe-hud) 16px 0',
          display: 'flex',
          justifyContent: 'flex-end',
          zIndex: 20
        }}
      >
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(165,216,221,0.92), rgba(116,185,194,0.92))',
            border: '2px solid rgba(255,255,255,0.85)',
            borderRadius: 99,
            padding: '5px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: '#FFFFFF',
            fontWeight: 900,
            fontSize: 15,
            boxShadow: '0 4px 12px rgba(15,23,42,0.12)'
          }}
        >
          <span>🪙</span>
          <span>{coins}</span>
        </div>
      </div>

      {/* 中央工作台：上排 4 個額外欄位凹洞 ＋ 預設 2 個主油鍋 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 26,
          position: 'relative'
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '120%',
            height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, #FFFFFF 45%, rgba(255,255,255,0) 75%)',
            transform: 'translateY(12px)',
            pointerEvents: 'none'
          }}
        />

        {/* 上排 4 個額外欄位凹洞 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
            marginBottom: 8,
            zIndex: 4
          }}
        >
          {upperHoleSpecs.map(({ slotIndex, yOffset }) => {
            const activeExtra = unlockedExtraMap[slotIndex];
            if (activeExtra) {
              return (
                <div key={slotIndex} style={{ transform: `translateY(${yOffset}px)` }}>
                  {renderFryerPot(slotIndex, activeExtra.type, 'sm')}
                </div>
              );
            }
            return (
              <button
                key={slotIndex}
                onClick={() => handleSlotTap(slotIndex)}
                style={{
                  transform: `translateY(${yOffset}px)`,
                  width: 66,
                  height: 30,
                  borderRadius: '50%',
                  border: '1px solid rgba(203,213,225,0.7)',
                  background:
                    'radial-gradient(ellipse at 50% 65%, #CBD5E1 0%, #94A3B8 58%, #E2E8F0 100%)',
                  boxShadow: 'inset 0 6px 10px rgba(71,85,105,0.34)',
                  cursor: 'pointer'
                }}
                title="點擊使用「額外欄位」開啟新油鍋"
              />
            );
          })}
        </div>

        {/* 下排預設 2 口大油鍋 (slotIndex 0, 1) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: 18,
            zIndex: 8
          }}
        >
          {renderFryerPot(0, 'standard', 'lg')}
          {renderFryerPot(1, 'standard', 'lg')}
        </div>

        {isPlanting && (
          <div
            style={{
              marginTop: 18,
              background: 'rgba(16,185,129,0.12)',
              color: '#047857',
              fontSize: 11.5,
              fontWeight: 900,
              padding: '4px 12px',
              borderRadius: 99,
              zIndex: 8
            }}
          >
            🌼 種花加速油炸中 ({activeSlotCount} 鍋運作中)
          </div>
        )}
      </div>

      {/* 底部操作列：左下 ✕ ｜ 中央 瓜糰背包(數字) ｜ 右下 額外欄位(數字) */}
      <div
        style={{
          padding: '0 20px max(22px, env(safe-area-inset-bottom))',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          zIndex: 20
        }}
      >
        <button
          onClick={onClose}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.9)',
            background: 'radial-gradient(circle at 30% 30%, #BCE3DE, #7AC3BD)',
            color: '#FFFFFF',
            fontSize: 20,
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: '0 6px 16px rgba(15,23,42,0.16)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="關閉油鍋"
        >
          ✕
        </button>

        <button
          onClick={() => handleOpenBagForSlot(null)}
          style={{
            position: 'relative',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
            marginBottom: -4
          }}
          title="打開瓜糰背包"
        >
          <GuatuanBallSvg variety="yellow" isHuge={true} size={72} />
          <span
            style={{
              position: 'absolute',
              right: -4,
              bottom: 6,
              background: 'linear-gradient(180deg, #B9E2E5, #7AC3CA)',
              color: '#FFFFFF',
              border: '2px solid #FFFFFF',
              borderRadius: '50%',
              minWidth: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 900,
              boxShadow: '0 3px 8px rgba(0,0,0,0.2)'
            }}
          >
            {bagSeedlings.length}
          </span>
        </button>

        <button
          onClick={() => {
            setIsBagDrawerOpen(false);
            setInspectedSeedlingId(null);
            setIsExtraDrawerOpen(true);
          }}
          style={{
            position: 'relative',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
            marginBottom: 4
          }}
          title="使用額外欄位道具"
        >
          <ExtraSlotSaucerSvg
            type={extraSlotInventory.fast25 > 0 && extraSlotInventory.standard === 0 ? 'fast25' : 'standard'}
            size={60}
          />
          <span
            style={{
              position: 'absolute',
              right: -4,
              bottom: -4,
              background: 'linear-gradient(180deg, #B9E2E5, #7AC3CA)',
              color: '#FFFFFF',
              border: '2px solid #FFFFFF',
              borderRadius: '50%',
              minWidth: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 900,
              boxShadow: '0 3px 8px rgba(0,0,0,0.2)'
            }}
          >
            {totalExtraItems}
          </span>
        </button>
      </div>

      {/* ==================== 瓜糰背包抽屜（正體中文，點擊任一瓜糰可放進鍋中或先查看詳情） ==================== */}
      {isBagDrawerOpen && !inspectedSeedling && (
        <div
          onClick={() => setIsBagDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(15,23,42,0.28)',
            display: 'flex',
            alignItems: 'flex-end'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              height: '86lvh',
              background: '#FFFFFF',
              borderRadius: '28px 28px 0 0',
              boxShadow: '0 -8px 28px rgba(0,0,0,0.16)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '10px 18px 8px' }}>
              <div
                style={{
                  width: 44,
                  height: 5,
                  borderRadius: 99,
                  background: '#CBD5E1',
                  margin: '0 auto 12px'
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#475569' }}>
                  {bagSeedlings.length} / 35
                </div>
                <button
                  onClick={() => setSortMode((m) => (m === 'decor' ? 'steps' : 'decor'))}
                  style={{
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#334155',
                    borderRadius: 99,
                    padding: '6px 14px',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {sortMode === 'decor' ? '飾品類型 ▼' : '步數排序 ▼'}
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 14,
                  padding: '0 2px'
                }}
              >
                {COLOR_FILTERS.map((cf) => {
                  const selected = colorFilter === cf.id;
                  return (
                    <button
                      key={cf.id}
                      onClick={() => setColorFilter((cur) => (cur === cf.id ? null : cf.id))}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: cf.hex,
                        border: selected
                          ? '3px solid #0F172A'
                          : `1.5px solid ${cf.border || 'transparent'}`,
                        cursor: 'pointer',
                        transform: selected ? 'scale(1.16)' : 'scale(1)'
                      }}
                    />
                  );
                })}
              </div>

              {bagNotice && (
                <div
                  style={{
                    marginTop: 10,
                    background: '#FEF3C7',
                    color: '#92400E',
                    borderRadius: 12,
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 800,
                    textAlign: 'center'
                  }}
                >
                  {bagNotice}
                </div>
              )}
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '6px 14px 18px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 14,
                alignContent: 'start'
              }}
            >
              {filteredBagSeedlings.map((s) => {
                const potLabel = s.isHuge ? '巨大瓜糰' : VARIETY_CATALOG[s.variety].potName;
                const decorIcon = DECOR_CATALOG[s.decor]?.icon || '📍';
                return (
                  <button
                    key={s.id}
                    onClick={() => handleInspectSeedling(s)}
                    style={{
                      position: 'relative',
                      border: 'none',
                      background: 'transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '8px 4px',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 6,
                        fontSize: 22,
                        opacity: 0.24,
                        pointerEvents: 'none'
                      }}
                    >
                      {decorIcon}
                    </span>

                    <GuatuanBallSvg
                      variety={s.variety}
                      isHuge={s.isHuge}
                      inPot={false}
                      size={s.isHuge ? 62 : 52}
                    />
                    <div style={{ fontSize: 13.5, fontWeight: 900, color: '#334155', marginTop: 4 }}>
                      {s.targetSteps.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#475569', marginTop: 1 }}>
                      {potLabel}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#94A3B8',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: 1
                      }}
                    >
                      {s.placeName}
                    </div>
                  </button>
                );
              })}

              {filteredBagSeedlings.length === 0 && (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    textAlign: 'center',
                    padding: '44px 12px',
                    color: '#94A3B8',
                    fontSize: 13,
                    fontWeight: 800
                  }}
                >
                  此分類目前沒有瓜糰，快去散步探險吧！
                </div>
              )}
            </div>

            <div
              style={{
                padding: '10px 16px max(18px, env(safe-area-inset-bottom))',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.85), #FFFFFF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10
              }}
            >
              <button
                onClick={() => setIsBagDrawerOpen(false)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: '1.5px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#334155',
                  fontSize: 18,
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}
              >
                &lt;
              </button>

              <button
                onClick={() => {
                  setIsBagDrawerOpen(false);
                  onOpenDecorModal();
                }}
                style={{
                  flex: 1,
                  border: '1.5px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#334155',
                  borderRadius: 99,
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}
              >
                🎖️ 飾品一覽
              </button>

              <button
                onClick={() => {
                  setIsBagDrawerOpen(false);
                  onOpenMap();
                }}
                style={{
                  border: '1.5px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#334155',
                  borderRadius: 99,
                  padding: '10px 18px',
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}
              >
                🗺️ 地圖
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 圖 5、6、7：點擊瓜糰彈出「細節 ＆ 上拉看更多細節與該分類飾品圖鑑」白卡 ==================== */}
      {inspectedSeedling && detailMeta && (
        <div
          onClick={() => setInspectedSeedlingId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 70,
            background: 'rgba(15,23,42,0.18)',
            display: 'flex',
            alignItems: 'flex-end'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onPointerDown={handleDetailPointerDown}
            onPointerMove={handleDetailPointerMove}
            onPointerUp={handleDetailPointerUp}
            onPointerCancel={handleDetailPointerUp}
            style={{
              width: '100%',
              height: `${detailSheetPct}lvh`,
              background: '#FFFFFF',
              borderRadius: '28px 28px 0 0',
              boxShadow: '0 -8px 28px rgba(0,0,0,0.18)',
              display: 'flex',
              flexDirection: 'column',
              transition: detailDragRef.current.active
                ? 'none'
                : 'height 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
              overflow: 'hidden'
            }}
          >
            {/* 頂部把手 ＋ ? 說明鈕 */}
            <div
              onClick={() => setDetailSheetPct((p) => (p >= 75 ? 58 : 90))}
              style={{
                padding: '10px 16px 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                cursor: 'pointer'
              }}
            >
              <div style={{ width: 44, height: 5, borderRadius: 99, background: '#CBD5E1' }} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetailHelp((v) => !v);
                }}
                style={{
                  position: 'absolute',
                  right: 16,
                  top: 10,
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  border: '1.5px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#334155',
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
                title="瓜糰與飾品圖鑑說明"
              >
                ?
              </button>
            </div>

            {showDetailHelp && (
              <div
                style={{
                  margin: '4px 18px 6px',
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: 14,
                  padding: '8px 12px',
                  fontSize: 12,
                  color: '#166534',
                  fontWeight: 700,
                  lineHeight: 1.5
                }}
              >
                散步累積步數會讓瓜糰逐漸蓬鬆並冒出熱氣香煙；炸熟後即可用網勺撈起！向上滑動此白卡可查看該地點的完整飾品分類圖鑑。
              </div>
            )}

            {/* 可捲動主內容區（展開看圖 6 發現資訊 ＋ 圖 7 分類完整圖鑑） */}
            <div
              ref={detailScrollRef}
              onScroll={(e) => {
                if ((e.currentTarget.scrollTop || 0) > 12 && detailSheetPct < 85) {
                  setDetailSheetPct(90);
                }
              }}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '6px 18px 18px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14
              }}
            >
              {/* 圖 5 頂部展示：油鍋中的冒煙瓜糰 ＋ 右側淡分類水印 */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  paddingTop: 14
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    right: 44,
                    top: 6,
                    fontSize: 74,
                    opacity: 0.16,
                    transform: 'rotate(24deg)',
                    pointerEvents: 'none'
                  }}
                >
                  {detailMeta.icon}
                </span>

                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ marginBottom: -14, zIndex: 3 }}>
                    <GuatuanBallSvg
                      variety={inspectedSeedling.variety}
                      isHuge={inspectedSeedling.isHuge}
                      inPot={inspectedSeedling.slotIndex !== null}
                      progressPct={
                        inspectedSeedling.slotIndex !== null
                          ? inspectedSeedling.currentSteps / Math.max(1, inspectedSeedling.targetSteps)
                          : 0
                      }
                      isReady={inspectedSeedling.isReady}
                      size={78}
                    />
                  </div>
                  <ExtraSlotSaucerSvg
                    type={
                      inspectedSeedling.slotIndex !== null &&
                      unlockedExtraMap[inspectedSeedling.slotIndex]?.type === 'fast25'
                        ? 'fast25'
                        : 'standard'
                    }
                    size={96}
                  />
                </div>

                {/* 名稱 ＋ ☆ 最愛 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <div style={{ fontSize: 23, fontWeight: 900, color: '#334155' }}>
                    {inspectedSeedling.isHuge
                      ? '巨大瓜糰'
                      : VARIETY_CATALOG[inspectedSeedling.variety].potName}
                  </div>
                  <button
                    onClick={() => onToggleFavoriteSeedling(inspectedSeedling.id)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontSize: 22,
                      cursor: 'pointer',
                      color: inspectedSeedling.isFavorite ? '#F59E0B' : '#CBD5E1',
                      padding: 0
                    }}
                    title="標記最愛瓜糰"
                  >
                    {inspectedSeedling.isFavorite ? '★' : '☆'}
                  </button>
                </div>

                {/* 步數比例進度條 */}
                <div style={{ fontSize: 15, fontWeight: 800, color: '#64748B', marginTop: 4 }}>
                  {inspectedSeedling.currentSteps.toLocaleString()} /{' '}
                  {inspectedSeedling.targetSteps.toLocaleString()}步
                </div>
                <div
                  style={{
                    width: 140,
                    height: 6,
                    borderRadius: 99,
                    background: '#E2E8F0',
                    overflow: 'hidden',
                    marginTop: 8
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (inspectedSeedling.currentSteps /
                            Math.max(1, inspectedSeedling.targetSteps)) *
                            100
                        )
                      )}%`,
                      height: '100%',
                      background: '#3E9A8C',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>

                {/* 操作按紐：在油鍋且炸熟 -> 起鍋；在背包 -> 下鍋炸 */}
                {inspectedSeedling.slotIndex !== null && inspectedSeedling.isReady && (
                  <button
                    onClick={() => {
                      onPluckSeedling(inspectedSeedling);
                      setInspectedSeedlingId(null);
                    }}
                    style={{
                      marginTop: 12,
                      border: 'none',
                      background: 'linear-gradient(135deg, #F59E0B, #EA580C)',
                      color: '#FFFFFF',
                      fontSize: 14,
                      fontWeight: 900,
                      padding: '10px 26px',
                      borderRadius: 99,
                      cursor: 'pointer',
                      boxShadow: '0 6px 16px rgba(234,88,12,0.3)'
                    }}
                  >
                    🥄 用網勺從鍋裡撈起！
                  </button>
                )}

                {inspectedSeedling.slotIndex === null && (
                  <button
                    onClick={() => handlePutSeedlingInSlot(inspectedSeedling)}
                    style={{
                      marginTop: 12,
                      border: 'none',
                      background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
                      color: '#FFFFFF',
                      fontSize: 14,
                      fontWeight: 900,
                      padding: '10px 26px',
                      borderRadius: 99,
                      cursor: 'pointer',
                      boxShadow: '0 6px 16px rgba(13,148,136,0.28)'
                    }}
                  >
                    🍳 放進油鍋開始炸！
                  </button>
                )}
              </div>

              {/* 圖 6 發現資訊卡片 */}
              <div
                style={{
                  width: '100%',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: 16,
                  padding: '14px 14px',
                  background: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50% 50% 50% 0',
                      transform: 'rotate(-45deg)',
                      background: '#DF6D6D',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <span style={{ transform: 'rotate(45deg)', fontSize: 15 }}>{detailMeta.icon}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 900 }}>
                      <span style={{ color: '#DC2626' }}>{detailMeta.placeCategory}</span>
                      <span style={{ color: '#94A3B8', margin: '0 5px' }}>/</span>
                      <span style={{ color: '#84A341' }}>
                        {detailSubsets[0]?.setName || detailMeta.name}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: '#334155',
                        marginTop: 2
                      }}
                    >
                      {inspectedSeedling.placeName}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 4 }}>
                  <span style={{ fontSize: 18, color: '#64748B' }}>📅</span>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>
                    發現日：{formatDiscoveredDateZh(inspectedSeedling.discoveredAt)}
                  </div>
                </div>
              </div>

              {/* 圖 6 下方 & 圖 7：該分類完整飾品圖鑑卡片（含稀有＆標準多系列！上拉即可滑動瀏覽） */}
              <div
                style={{
                  width: '100%',
                  border: '2px solid #EFE4BA',
                  borderRadius: 18,
                  padding: '14px 12px 18px',
                  background: '#FFFDF7',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle at 30% 30%, #FEF9C3, #EAB308)',
                      border: '2px solid #D97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18
                    }}
                  >
                    {detailMeta.icon}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#334155' }}>
                    {detailMeta.placeCategory}
                  </div>
                </div>

                {detailSubsets.map((sub) => {
                  const list = sub.varieties || [
                    'red',
                    'yellow',
                    'blue',
                    'purple',
                    'white',
                    'winged',
                    'rock'
                  ];
                  return (
                    <div key={sub.setId} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: 8,
                          justifyItems: 'center'
                        }}
                      >
                        {list.map((v) => {
                          const unlocked = creatures.some(
                            (c) =>
                              c.hasDecor &&
                              c.decor === inspectedSeedling.decor &&
                              c.variety === v &&
                              (!c.decorSetId || c.decorSetId === sub.setId || !sub.isRare)
                          );
                          return (
                            <div
                              key={`${sub.setId}_${v}`}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                filter: unlocked
                                  ? 'drop-shadow(0 2px 6px rgba(245,158,11,0.28))'
                                  : 'grayscale(1) contrast(0.35) brightness(1.42)',
                                opacity: unlocked ? 1 : 0.44
                              }}
                            >
                              <DeGuaCharacter
                                variety={v}
                                decor={inspectedSeedling.decor}
                                leafStage="flower"
                                flowerColor="yellow"
                                showDecor={true}
                                size={52}
                                isBouncing={false}
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div
                        style={{
                          textAlign: 'center',
                          fontSize: 13,
                          fontWeight: 900,
                          color: sub.isRare ? '#D97706' : '#7C9442',
                          marginTop: 2,
                          marginBottom: 4
                        }}
                      >
                        {sub.setName}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 底部固定列：< ｜ 🎖️ 飾品一覽 ｜ 🗺️ 地圖 */}
            <div
              style={{
                padding: '10px 16px max(18px, env(safe-area-inset-bottom))',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.85), #FFFFFF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10
              }}
            >
              <button
                onClick={() => setInspectedSeedlingId(null)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: '1.5px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#334155',
                  fontSize: 18,
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}
              >
                &lt;
              </button>

              <button
                onClick={() => {
                  setInspectedSeedlingId(null);
                  onOpenDecorModal();
                }}
                style={{
                  flex: 1,
                  border: '1.5px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#334155',
                  borderRadius: 99,
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}
              >
                🎖️ 飾品一覽
              </button>

              <button
                onClick={() => {
                  setInspectedSeedlingId(null);
                  onOpenMap();
                }}
                style={{
                  border: '1.5px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#334155',
                  borderRadius: 99,
                  padding: '10px 18px',
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}
              >
                🗺️ 地圖
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 額外欄位卡片（一般欄位 ＆ 金黃加速+25%欄位） ==================== */}
      {isExtraDrawerOpen && (
        <div
          onClick={() => setIsExtraDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(15,23,42,0.18)',
            display: 'flex',
            alignItems: 'flex-end'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              height: '62lvh',
              background: '#FFFFFF',
              borderRadius: '28px 28px 0 0',
              boxShadow: '0 -8px 28px rgba(0,0,0,0.16)',
              padding: '24px 24px max(22px, env(safe-area-inset-bottom))',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                minHeight: 112
              }}
            >
              <button
                onClick={() => setSelectedExtraType('standard')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  position: 'relative',
                  cursor: 'pointer',
                  transform: selectedExtraType === 'standard' ? 'scale(1.15)' : 'scale(0.8)',
                  opacity: selectedExtraType === 'standard' ? 1 : 0.65,
                  transition: 'all 0.2s ease'
                }}
              >
                <ExtraSlotSaucerSvg type="standard" size={96} />
                <span
                  style={{
                    position: 'absolute',
                    right: 4,
                    bottom: 0,
                    background: '#FFFFFF',
                    color: '#0F172A',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: 13,
                    boxShadow: '0 3px 10px rgba(0,0,0,0.18)'
                  }}
                >
                  {extraSlotInventory.standard}
                </span>
              </button>

              <button
                onClick={() => setSelectedExtraType('fast25')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  position: 'relative',
                  cursor: 'pointer',
                  marginLeft: 14,
                  transform: selectedExtraType === 'fast25' ? 'scale(1.15)' : 'scale(0.82)',
                  opacity: selectedExtraType === 'fast25' ? 1 : 0.72,
                  transition: 'all 0.2s ease'
                }}
              >
                <ExtraSlotSaucerSvg type="fast25" size={92} />
                <span
                  style={{
                    position: 'absolute',
                    right: 2,
                    bottom: 0,
                    background: '#FFFFFF',
                    color: '#0F172A',
                    borderRadius: '50%',
                    width: 26,
                    height: 26,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: 12.5,
                    boxShadow: '0 3px 10px rgba(0,0,0,0.18)'
                  }}
                >
                  {extraSlotInventory.fast25}
                </span>
              </button>
            </div>

            <div>
              <button
                onClick={() => {
                  onActivateExtraSlot(selectedExtraType);
                  setIsExtraDrawerOpen(false);
                }}
                disabled={
                  extraSlotInventory[selectedExtraType] <= 0 || activeExtraSlots.length >= 4
                }
                style={{
                  border: `2px solid ${selectedExtraType === 'fast25' ? '#D97706' : '#65B7A8'}`,
                  background: '#FFFFFF',
                  color:
                    extraSlotInventory[selectedExtraType] <= 0 || activeExtraSlots.length >= 4
                      ? '#94A3B8'
                      : selectedExtraType === 'fast25'
                        ? '#B45309'
                        : '#3E9A8C',
                  borderRadius: 99,
                  padding: '9px 38px',
                  fontSize: 15,
                  fontWeight: 900,
                  cursor:
                    extraSlotInventory[selectedExtraType] <= 0 || activeExtraSlots.length >= 4
                      ? 'not-allowed'
                      : 'pointer',
                  marginBottom: 16
                }}
              >
                {activeExtraSlots.length >= 4 ? '已達 4 格上限' : '使用'}
              </button>

              <div style={{ fontSize: 18, fontWeight: 900, color: '#334155', marginBottom: 8 }}>
                {selectedExtraType === 'fast25' ? '加速 25% 額外欄位' : '額外欄位'}
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: '#475569',
                  lineHeight: 1.6,
                  maxWidth: 320,
                  margin: '0 auto'
                }}
              >
                {selectedExtraType === 'fast25'
                  ? '使用金黃額外欄位後，放入此欄位油炸的瓜糰步數成長速度提升 +25%。把地瓜球從鍋裡撈起來後就會消耗欄位。'
                  : '使用額外欄位後，油炸瓜糰的欄位數量將會增加。把地瓜球從鍋裡撈起來後就會消耗欄位。'}
              </div>
              <div style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 700, marginTop: 8 }}>
                可透過【商店】購買或完成【蘑菇任務】獲得更多額外欄位
              </div>
            </div>

            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
              <button
                onClick={() => setIsExtraDrawerOpen(false)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: '1.5px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#334155',
                  fontSize: 18,
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}
              >
                &lt;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
