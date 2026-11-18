import React, { useMemo, useState } from 'react';
import {
  ActiveExtraFryerSlot,
  DECOR_CATALOG,
  DeGuaVariety,
  ExtraFryerSlotInventory,
  ExtraFryerSlotType,
  Seedling,
  VARIETY_CATALOG
} from '../types/game';

interface PlanterPackModalProps {
  seedlings: Seedling[];
  coins: number;
  isPlanting: boolean;
  extraSlotInventory: ExtraFryerSlotInventory;
  activeExtraSlots: ActiveExtraFryerSlot[];
  onAssignToSlot: (seedlingId: string, slotIndex: number) => void;
  onPluckSeedling: (seedling: Seedling) => void;
  onActivateExtraSlot: (type: ExtraFryerSlotType) => void;
  onOpenDecorModal: () => void;
  onOpenMap: () => void;
  onClose: () => void;
}

/** 繪製可愛 3D 感炸鍋裡的「瓜糰」SVG */
const GuatuanBallSvg: React.FC<{
  variety: DeGuaVariety;
  isHuge?: boolean;
  size?: number;
  isReady?: boolean;
}> = ({ variety, isHuge = false, size = 56, isReady = false }) => {
  const meta = VARIETY_CATALOG[variety];
  const fill = isHuge ? '#F59E0B' : meta.bodyColor;
  const stroke = isHuge ? '#B45309' : meta.potColor;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{
        overflow: 'visible',
        filter: isReady
          ? 'drop-shadow(0 0 12px rgba(251,113,133,0.92)) drop-shadow(0 0 18px rgba(255,255,255,0.95))'
          : 'drop-shadow(0 4px 6px rgba(0,0,0,0.18))'
      }}
    >
      {/* 頂部嫩綠新芽 */}
      <path d="M32 28 C32 18 33 14 36 10" stroke="#4D7C0F" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path
        d="M35 12 C42 5 52 8 49 16 C45 20 36 17 35 12 Z"
        fill={isReady ? '#D9F99D' : '#65A30D'}
        stroke="#3F6212"
        strokeWidth="1.2"
      />
      <path
        d="M32 18 C25 13 19 16 21 21 C24 24 30 22 32 18 Z"
        fill={isReady ? '#ECFCCB' : '#84CC16'}
        stroke="#3F6212"
        strokeWidth="1.1"
      />
      {/* 圓潤可口地瓜麵糰本體 */}
      <circle cx="32" cy="40" r={isHuge ? 20 : 17} fill={fill} stroke={stroke} strokeWidth="2" />
      <ellipse cx="26" cy="33" rx="6" ry="3.5" fill="rgba(255,255,255,0.45)" transform="rotate(-18 26 33)" />
      {isHuge && (
        <>
          <circle cx="24" cy="44" r="2.2" fill="#FEF08A" opacity="0.85" />
          <circle cx="39" cy="43" r="2" fill="#FEF08A" opacity="0.85" />
          <circle cx="32" cy="49" r="1.8" fill="#FEF08A" opacity="0.85" />
        </>
      )}
    </svg>
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
  coins,
  isPlanting,
  extraSlotInventory,
  activeExtraSlots,
  onAssignToSlot,
  onPluckSeedling,
  onActivateExtraSlot,
  onOpenDecorModal,
  onOpenMap,
  onClose
}) => {
  const [isBagDrawerOpen, setIsBagDrawerOpen] = useState<boolean>(false);
  const [isExtraDrawerOpen, setIsExtraDrawerOpen] = useState<boolean>(false);
  const [preselectedSlot, setPreselectedSlot] = useState<number | null>(null);
  const [selectedExtraType, setSelectedExtraType] = useState<ExtraFryerSlotType>('standard');
  const [colorFilter, setColorFilter] = useState<DeGuaVariety | 'huge' | null>(null);
  const [sortMode, setSortMode] = useState<'decor' | 'steps'>('decor');
  const [bagNotice, setBagNotice] = useState<string | null>(null);

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
    setIsBagDrawerOpen(true);
  };

  const handleSeedlingCardTap = (seed: Seedling) => {
    const freeSlot = findNextAvailableSlot();
    if (freeSlot === null) {
      setBagNotice('目前油鍋欄位已滿！關閉抽屜後可點右下使用「額外欄位」擴充。');
      return;
    }
    onAssignToSlot(seed.id, freeSlot);
    setPreselectedSlot(null);
    setIsBagDrawerOpen(false);
  };

  const handleSlotTap = (slotIdx: number, slotType: ExtraFryerSlotType = 'standard') => {
    const s = occupiedSlots[slotIdx];
    if (s) {
      if (s.isReady) {
        onPluckSeedling(s);
      }
      return;
    }
    const isUnlocked = slotIdx < 2 || Boolean(unlockedExtraMap[slotIdx]);
    if (!isUnlocked) {
      setIsBagDrawerOpen(false);
      setSelectedExtraType(
        extraSlotInventory.fast25 > 0 && extraSlotInventory.standard === 0 ? 'fast25' : slotType
      );
      setIsExtraDrawerOpen(true);
      return;
    }
    handleOpenBagForSlot(slotIdx);
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

  // 上排 4 個凹槽孔洞視覺偏移，還原圖 6 柔和弧形平台排列
  const upperHoleSpecs = [
    { slotIndex: 2, yOffset: 10 },
    { slotIndex: 3, yOffset: 0 },
    { slotIndex: 4, yOffset: 0 },
    { slotIndex: 5, yOffset: 10 }
  ];

  const renderFryerPot = (slotIdx: number, variant: ExtraFryerSlotType = 'standard', size: 'lg' | 'sm' = 'lg') => {
    const s = occupiedSlots[slotIdx];
    const isGold = variant === 'fast25';
    const pct = s ? Math.min(100, Math.round((s.currentSteps / s.targetSteps) * 100)) : 0;
    const remaining = s ? Math.max(0, s.targetSteps - s.currentSteps) : 0;
    const potWidth = size === 'lg' ? 116 : 74;

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
        {/* 步數顯示 ＋ 進度條（完全對照圖 6 簡潔排版：僅步數與綠條，不塞多餘文字） */}
        {s ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 4, zIndex: 5 }}>
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
              {s.isReady ? s.targetSteps : remaining}
            </div>
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

        {/* 炸鍋 ＋ 瓜糰嫩芽 */}
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
          {/* 炸鍋底座圓盤 */}
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
            {/* 鍋體碗 */}
            <div
              style={{
                width: size === 'lg' ? 76 : 50,
                height: size === 'lg' ? 36 : 24,
                borderRadius: '50%',
                background: s
                  ? 'radial-gradient(circle at 50% 38%, #78350F, #451A03)'
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
                bottom: size === 'lg' ? 20 : 12,
                zIndex: 4,
                pointerEvents: 'none'
              }}
            >
              <GuatuanBallSvg
                variety={s.variety}
                isHuge={s.isHuge}
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
      {/* 右上角：透亮金幣膠囊（完全對照圖 6，不放冗餘文字與橫幅） */}
      <div
        style={{
          padding: 'max(14px, env(safe-area-inset-top)) 16px 0',
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

      {/* 中央潔淨廚房工作台：上排 4 個額外欄位凹洞 ＋ 預設 2 個主油鍋 */}
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
        {/* 柔和純白檯面光暈 */}
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

        {/* 上排 4 個預留凹槽孔（使用「額外欄位」道具即可開啟為青藍鍋或金黃 +25% 加速鍋） */}
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

        {/* 中央：擁有瓜糰圖示 + 數量徽章 */}
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
          <GuatuanBallSvg variety="yellow" isHuge={true} size={74} />
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

        {/* 右下：額外欄位道具圖示 + 數量徽章 */}
        <button
          onClick={() => {
            setIsBagDrawerOpen(false);
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

      {/* ==================== 圖 7：點下方瓜糰後，可上拉的純白瓜糰背包卡片（正體中文） ==================== */}
      {isBagDrawerOpen && (
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
            {/* 頂部把手 ＋ 20 / 35 ＋ 飾品類型 ▼ */}
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

              {/* 8 色瓜糰圓點篩選列 */}
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

            {/* 三欄式瓜糰格線卡片（正體中文：步數 / ○○瓜糰 / 地點 ＋ 右上飾品分類水印） */}
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
                    onClick={() => handleSeedlingCardTap(s)}
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

            {/* 底部導航列：< ｜ 🎖️ 飾品一覽 ｜ 🗺️ 地圖 */}
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

      {/* ==================== 圖 8：額外欄位卡片（一般欄位 ＆ 金黃加速+25%欄位） ==================== */}
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
            {/* 雙道具切換展示區：主選中大圖 ＋ 另一款旁側小圖 */}
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
                onClick={() =>
                  setSelectedExtraType((t) => (t === 'standard' ? 'standard' : 'standard'))
                }
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

            {/* 使用按鈕 ＋ 說明文案 */}
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

            {/* 左下返回鈕 < */}
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
