import React, { useState } from 'react';
import {
  DECOR_CATALOG,
  Seedling,
  VARIETY_CATALOG
} from '../types/game';

interface PlanterPackModalProps {
  seedlings: Seedling[];
  isPlanting: boolean;
  onAssignToSlot: (seedlingId: string, slotIndex: number) => void;
  onPluckSeedling: (seedling: Seedling) => void;
  onDebugAddSteps: (steps: number) => void;
  onClose: () => void;
}

export const PlanterPackModal: React.FC<PlanterPackModalProps> = ({
  seedlings,
  isPlanting,
  onAssignToSlot,
  onPluckSeedling,
  onDebugAddSteps,
  onClose
}) => {
  const [scoopingTarget, setScoopingTarget] = useState<Seedling | null>(null);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [pullOffset, setPullOffset] = useState<number>(0);

  const slot0 = seedlings.find((s) => s.slotIndex === 0) || null;
  const slot1 = seedlings.find((s) => s.slotIndex === 1) || null;
  const bagSeedlings = seedlings.filter((s) => s.slotIndex === null);

  const handleSelectSeedlingForEmptySlot = (seedlingId: string) => {
    if (!slot0) {
      onAssignToSlot(seedlingId, 0);
    } else if (!slot1) {
      onAssignToSlot(seedlingId, 1);
    }
  };

  // 🥄 從油鍋裡用網勺向上撈起炸熟地瓜球的互動畫面
  if (scoopingTarget) {
    const vMeta = VARIETY_CATALOG[scoopingTarget.variety];

    return (
      <div
        onPointerDown={(e) => setDragStartY(e.clientY)}
        onPointerMove={(e) => {
          if (dragStartY !== null) {
            const dy = Math.max(0, dragStartY - e.clientY);
            setPullOffset(dy);
            if (dy > 90) {
              const target = scoopingTarget;
              setDragStartY(null);
              setPullOffset(0);
              setScoopingTarget(null);
              onPluckSeedling(target);
            }
          }
        }}
        onPointerUp={() => {
          if (pullOffset > 45) {
            const target = scoopingTarget;
            setDragStartY(null);
            setPullOffset(0);
            setScoopingTarget(null);
            onPluckSeedling(target);
          } else {
            setDragStartY(null);
            setPullOffset(0);
          }
        }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1150,
          background: 'radial-gradient(circle at 50% 65%, #FEF08A 0%, #FDE68A 48%, #F59E0B 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '44px 20px 36px',
          userSelect: 'none',
          touchAction: 'none'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.95)',
              padding: '10px 22px',
              borderRadius: 99,
              fontSize: 15,
              fontWeight: 900,
              color: '#B45309',
              boxShadow: '0 4px 16px rgba(0,0,0,0.14)'
            }}
          >
            ⬆️ 按住網勺向上滑動，從油鍋撈起地瓜球！
          </div>
          <div style={{ fontSize: 12, color: '#78350F', fontWeight: 800, marginTop: 8 }}>
            📍 {scoopingTarget.placeName} ({DECOR_CATALOG[scoopingTarget.decor].icon}{' '}
            {DECOR_CATALOG[scoopingTarget.decor].placeCategory})
          </div>
        </div>

        {/* 中央：滾燙黃金油鍋 ＋ 可被向上拉起瀝油的網勺與膨脹地瓜球 */}
        <div
          onClick={() => {
            const target = scoopingTarget;
            setScoopingTarget(null);
            onPluckSeedling(target);
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'grab',
            position: 'relative'
          }}
        >
          {/* 隨手指往上撈起的金屬濾網勺 + 炸熟膨脹地瓜球 */}
          <div
            style={{
              transform: `translateY(${-pullOffset * 0.85}px) scale(${1 + Math.min(0.25, pullOffset / 300)})`,
              transition: dragStartY === null ? 'transform 0.22s ease' : 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 10
            }}
          >
            {/* 網勺裡的金黃膨脹地瓜球 */}
            <div
              style={{
                width: scoopingTarget.isHuge ? 96 : 78,
                height: scoopingTarget.isHuge ? 88 : 72,
                borderRadius: '50%',
                background: vMeta.bodyColor,
                border: `4px solid ${vMeta.spotColor}`,
                boxShadow: '0 8px 20px rgba(0,0,0,0.28), inset -8px -8px 14px rgba(0,0,0,0.18), inset 10px 10px 16px rgba(255,255,255,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                position: 'relative'
              }}
            >
              <span>{DECOR_CATALOG[scoopingTarget.decor].icon}</span>
            </div>

            {/* 不鏽鋼濾網勺本體與握柄 */}
            <svg width="160" height="75" viewBox="0 0 160 75" style={{ marginTop: -18 }}>
              {/* 網勺弧形濾網 */}
              <path
                d="M 25 12 Q 80 52 135 12"
                fill="rgba(226,232,240,0.65)"
                stroke="#64748B"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path d="M 42 20 Q 80 42 118 20" fill="none" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4,4" />
              {/* 網勺長柄 */}
              <line x1="130" y1="14" x2="158" y2="-16" stroke="#475569" strokeWidth="7" strokeLinecap="round" />
              {/* 瀝油油滴 */}
              <circle cx="65" cy="44" r="3.5" fill="#F59E0B" />
              <circle cx="82" cy="52" r="4" fill="#F59E0B" />
              <circle cx="96" cy="46" r="3" fill="#F59E0B" />
            </svg>
          </div>

          {/* 下方滾燙冒泡的大油鍋 */}
          <div
            style={{
              width: 210,
              height: 115,
              marginTop: -26,
              background: 'linear-gradient(180deg, #334155 0%, #0F172A 100%)',
              borderRadius: '16px 16px 75px 75px',
              border: '5px solid #475569',
              boxShadow: '0 18px 36px rgba(0,0,0,0.35)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              overflow: 'hidden'
            }}
          >
            {/* 金黃滾燙油面與油泡 */}
            <div
              style={{
                width: '100%',
                height: 36,
                background: 'linear-gradient(90deg, #F59E0B, #FACC15, #F59E0B)',
                borderBottom: '3px solid #D97706',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                fontSize: 14
              }}
            >
              <span>🫧</span>
              <span>✨</span>
              <span>🫧</span>
              <span>🫧</span>
            </div>
            <div style={{ color: '#FDE047', fontWeight: 900, fontSize: 13, marginTop: 18 }}>
              🍳 黃金大油鍋・滋滋作響中
            </div>
            <div style={{ color: '#94A3B8', fontSize: 11, fontWeight: 700, marginTop: 2 }}>
              {scoopingTarget.isHuge ? '巨大瓜糰已炸熟' : `${vMeta.potName}已炸熟`}
            </div>
          </div>
        </div>

        <button
          onClick={() => setScoopingTarget(null)}
          style={{
            border: 'none',
            background: 'rgba(255,255,255,0.92)',
            color: '#78350F',
            fontWeight: 900,
            fontSize: 14,
            padding: '10px 28px',
            borderRadius: 99,
            cursor: 'pointer'
          }}
        >
          稍後再撈
        </button>
      </div>
    );
  }

  const renderFryerSlotCard = (slotSeedling: Seedling | null, idx: number) => {
    if (!slotSeedling) {
      return (
        <div
          key={idx}
          style={{
            background: '#FFFBEB',
            border: '2.5px dashed #F59E0B',
            borderRadius: 24,
            padding: '18px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 180,
            color: '#B45309',
            fontWeight: 800,
            fontSize: 13
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 6 }}>🍳</div>
          <div>油鍋 {idx + 1} 空閒中</div>
          <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>點選下方生瓜糰下鍋油炸</div>
        </div>
      );
    }

    const vMeta = VARIETY_CATALOG[slotSeedling.variety];
    const dMeta = DECOR_CATALOG[slotSeedling.decor];
    const pct = Math.min(100, Math.round((slotSeedling.currentSteps / slotSeedling.targetSteps) * 100));

    return (
      <div
        key={idx}
        onClick={() => {
          if (slotSeedling.isReady) {
            setScoopingTarget(slotSeedling);
          }
        }}
        className={slotSeedling.isReady ? 'seedling-ready-card' : ''}
        style={{
          background: slotSeedling.isReady
            ? 'linear-gradient(180deg, #FEF08A 0%, #FEF3C7 100%)'
            : '#FFFFFF',
          border: slotSeedling.isReady ? '3px solid #D97706' : '2px solid #FDE68A',
          borderRadius: 24,
          padding: '14px 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 180,
          cursor: slotSeedling.isReady ? 'pointer' : 'default',
          boxShadow: '0 6px 16px rgba(0,0,0,0.06)'
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 900, color: '#92400E' }}>
          {dMeta.icon} {dMeta.placeCategory}
        </div>

        {/* 油鍋裡的瓜糰視覺 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '6px 0' }}>
          <div
            style={{
              width: slotSeedling.isReady ? 56 : 44,
              height: slotSeedling.isReady ? 52 : 38,
              borderRadius: slotSeedling.isReady ? '50%' : '42% 45% 40% 44%',
              background: slotSeedling.isHuge
                ? 'linear-gradient(135deg, #FDE047, #CA8A04)'
                : vMeta.potColor,
              border: '3px solid #FFF',
              boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              zIndex: 2
            }}
          >
            {dMeta.icon}
          </div>
          {/* 油鍋底座 */}
          <div
            style={{
              width: 74,
              height: 28,
              marginTop: -10,
              background: '#1E293B',
              borderRadius: '4px 4px 28px 28px',
              borderTop: '4px solid #FACC15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: '#FDE047',
              fontWeight: 900
            }}
          >
            {slotSeedling.isReady ? '🔥已浮起' : '🫧油炸中'}
          </div>
        </div>

        <div style={{ width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#1E293B' }}>
            {slotSeedling.isHuge ? '巨大瓜糰' : vMeta.potName}
          </div>
          <div style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>
            {slotSeedling.placeName}
          </div>

          {slotSeedling.isReady ? (
            <div
              style={{
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                color: '#FFF',
                fontWeight: 900,
                fontSize: 12,
                padding: '6px 10px',
                borderRadius: 99
              }}
            >
              🥄 點此從鍋裡撈起！
            </div>
          ) : (
            <>
              <div
                style={{
                  width: '100%',
                  height: 8,
                  background: '#F1F5F9',
                  borderRadius: 99,
                  overflow: 'hidden',
                  marginBottom: 3
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #FBBF24, #D97706)'
                  }}
                />
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#78350F' }}>
                {slotSeedling.currentSteps.toLocaleString()} / {slotSeedling.targetSteps.toLocaleString()} 步
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFBEB',
          borderRadius: '32px 32px 0 0',
          height: '88%',
          padding: '20px 18px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: '#1E293B',
              color: '#FFFFFF',
              borderRadius: 99,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>←</span>
            <span>返回主畫面</span>
          </button>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#78350F' }}>
              🍳 黃金油鍋與瓜糰背包
            </div>
            <div style={{ fontSize: 11, color: '#92400E', fontWeight: 700 }}>
              {isPlanting ? '🌸 種花加速 x1.2 油炸中' : '點選下方生瓜糰即可丟入油鍋'}
            </div>
          </div>

          <button
            onClick={() => onDebugAddSteps(500)}
            style={{
              border: '1.5px solid #D97706',
              background: '#FEF3C7',
              color: '#92400E',
              fontSize: 11,
              fontWeight: 900,
              padding: '6px 10px',
              borderRadius: 99,
              cursor: 'pointer'
            }}
          >
            👣 +500 步
          </button>
        </div>

        {/* 頂部兩個油鍋槽 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {renderFryerSlotCard(slot0, 0)}
          {renderFryerSlotCard(slot1, 1)}
        </div>

        {/* 下方生瓜糰背包清單 */}
        <div style={{ fontSize: 14, fontWeight: 900, color: '#78350F', marginTop: 4 }}>
          待下鍋的生瓜糰 ({bagSeedlings.length} / 30)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, flex: 1 }}>
          {bagSeedlings.map((s) => {
            const vMeta = VARIETY_CATALOG[s.variety];
            const dMeta = DECOR_CATALOG[s.decor];
            return (
              <div
                key={s.id}
                onClick={() => handleSelectSeedlingForEmptySlot(s.id)}
                style={{
                  background: '#FFFFFF',
                  border: '1.5px solid #FDE68A',
                  borderRadius: 20,
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer'
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 36,
                    borderRadius: '44% 46% 42% 45%',
                    background: s.isHuge ? 'linear-gradient(135deg,#FDE047,#CA8A04)' : vMeta.potColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    flexShrink: 0,
                    border: '2px solid rgba(0,0,0,0.12)'
                  }}
                >
                  {dMeta.icon}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#1E293B', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {s.isHuge ? '巨大瓜糰' : vMeta.potName}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700 }}>
                    {dMeta.placeCategory}
                  </div>
                  <div style={{ fontSize: 10, color: '#D97706', fontWeight: 800 }}>
                    👣 {s.targetSteps.toLocaleString()} 步炸熟
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          style={{
            alignSelf: 'center',
            width: 52,
            height: 52,
            borderRadius: '50%',
            border: 'none',
            background: '#1E293B',
            color: '#FFF',
            fontSize: 20,
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};
