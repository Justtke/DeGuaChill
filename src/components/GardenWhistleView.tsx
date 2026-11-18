import React, { useState } from 'react';
import {
  DECOR_CATALOG,
  DeGuaCreature,
  PetalColor,
  PETAL_META,
  VARIETY_CATALOG
} from '../types/game';
import { DeGuaCharacter } from './DeGuaCharacter';

interface GardenWhistleViewProps {
  creatures: DeGuaCreature[];
  nectarJar: Record<PetalColor, number>;
  petalJar: Record<PetalColor, number>;
  selectedNectar: PetalColor;
  onSelectNectar: (c: PetalColor) => void;
  onThrowNectarToFeed: () => void;
  onSwipePluckSingle: (creatureId: string) => void;
  onWhistleGather: () => void;
  onCloseGarden: () => void;
}

export const GardenWhistleView: React.FC<GardenWhistleViewProps> = ({
  creatures,
  nectarJar,
  petalJar,
  selectedNectar,
  onSelectNectar,
  onThrowNectarToFeed,
  onSwipePluckSingle,
  onWhistleGather,
  onCloseGarden
}) => {
  const [isSwiping, setIsSwiping] = useState(false);
  const [nectarThrownAnim, setNectarThrownAnim] = useState(false);
  const [inspectedCreature, setInspectedCreature] = useState<DeGuaCreature | null>(null);
  const [floatingPetals, setFloatingPetals] = useState<
    { id: number; x: number; y: number; color: PetalColor; amount: number }[]
  >([]);

  const squadCreatures = creatures.filter((c) => c.inSquad && c.busyState === 'free');
  const activeMeta = PETAL_META[selectedNectar];

  const handleThrowNectar = () => {
    setNectarThrownAnim(true);
    window.setTimeout(() => {
      onThrowNectarToFeed();
      setNectarThrownAnim(false);
    }, 280);
  };

  const triggerPluckOnCreature = (c: DeGuaCreature, clientX?: number, clientY?: number) => {
    if (c.leafStage !== 'flower') return;
    const gainedAmount = c.budBonusPending ? 2 : 1;
    onSwipePluckSingle(c.id);
    const id = Date.now() + Math.random();
    setFloatingPetals((prev) => [
      ...prev,
      {
        id,
        x: clientX || window.innerWidth / 2,
        y: clientY || window.innerHeight / 2,
        color: c.flowerColor,
        amount: gainedAmount
      }
    ]);
    window.setTimeout(() => {
      setFloatingPetals((prev) => prev.filter((p) => p.id !== id));
    }, 750);
  };

  return (
    <div
      onPointerDown={() => setIsSwiping(true)}
      onPointerUp={() => setIsSwiping(false)}
      onPointerCancel={() => setIsSwiping(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'linear-gradient(180deg, #BAE6FD 0%, #86EFAC 28%, #4ADE80 65%, #22C55E 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        userSelect: 'none',
        touchAction: 'none',
        overflow: 'hidden'
      }}
    >
      {/* 頂部導覽列：左上返回主畫面按鈕 ＋ 花瓣與花蜜數量膠囊 */}
      <div
        style={{
          padding: 'max(14px, env(safe-area-inset-top)) 16px 8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          zIndex: 20
        }}
      >
        <button
          onClick={onCloseGarden}
          style={{
            border: '2px solid #FFFFFF',
            background: '#1E293B',
            color: '#FFFFFF',
            borderRadius: 99,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
          }}
        >
          <span>←</span>
          <span>返回主畫面</span>
        </button>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.94)',
            borderRadius: 99,
            padding: '6px 14px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 18 }}>{activeMeta.emoji}</span>
            <div>
              <div style={{ fontSize: 9, color: '#64748B', fontWeight: 800 }}>{activeMeta.name}</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#0F172A' }}>
                {petalJar[selectedNectar]} <span style={{ fontSize: 10, color: '#94A3B8' }}>/300</span>
              </div>
            </div>
          </div>

          <div style={{ width: 1, height: 22, background: '#E2E8F0' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: activeMeta.hex === '#FFFFFF' ? '#F1F5F9' : activeMeta.hex,
                border: '2px solid #CBD5E1',
                display: 'inline-block'
              }}
            />
            <div>
              <div style={{ fontSize: 9, color: '#64748B', fontWeight: 800 }}>{activeMeta.nectarName}</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#0F172A' }}>
                {nectarJar[selectedNectar]}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 中央陽光草地：地瓜球小隊互動區（保持皮克敏乾淨草原，不放多餘教學長文字） */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '8px 16px',
          zIndex: 10,
          overflowY: 'auto'
        }}
      >
        {squadCreatures.map((c) => {
          const hearts = Math.floor(c.friendship / 100);
          return (
            <div
              key={c.id}
              onPointerEnter={(e) => {
                if (isSwiping && c.leafStage === 'flower') {
                  triggerPluckOnCreature(c, e.clientX, e.clientY);
                }
              }}
              onClick={(e) => {
                if (c.leafStage === 'flower') {
                  triggerPluckOnCreature(c, e.clientX, e.clientY);
                } else {
                  setInspectedCreature(c);
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                padding: 4
              }}
            >
              <DeGuaCharacter
                variety={c.variety}
                decor={c.decor}
                leafStage={c.leafStage}
                flowerColor={c.flowerColor}
                showDecor={c.hasDecor}
                size={92}
              />
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setInspectedCreature(c);
                }}
                style={{
                  background: 'rgba(255,255,255,0.88)',
                  borderRadius: 99,
                  padding: '2px 8px',
                  fontSize: 10,
                  fontWeight: 900,
                  color: '#1F2937',
                  marginTop: -4,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span>{'❤️'.repeat(hearts)}{'🤍'.repeat(Math.max(0, 4 - hearts))} {c.name}</span>
                {(c.feedCount ?? 0) > 0 && c.leafStage !== 'bare' && (
                  <span
                    style={{
                      background: (c.feedCount ?? 0) >= 5 ? '#FEF3C7' : '#E2E8F0',
                      color: (c.feedCount ?? 0) >= 5 ? '#B45309' : '#475569',
                      borderRadius: 99,
                      padding: '0 5px',
                      fontSize: 9.5,
                      fontWeight: 900
                    }}
                  >
                    {c.feedCount}/6
                  </span>
                )}
                {c.leafStage === 'bare' && (
                  <span
                    style={{
                      background: '#FEE2E2',
                      color: '#B91C1C',
                      borderRadius: 99,
                      padding: '0 5px',
                      fontSize: 9.5,
                      fontWeight: 900
                    }}
                  >
                    6/6
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {nectarThrownAnim && (
          <div
            style={{
              position: 'absolute',
              bottom: '35%',
              left: '50%',
              transform: 'translate(-50%, -50%) scale(1.4)',
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: activeMeta.hex,
              boxShadow: `0 0 28px ${activeMeta.hex}`,
              pointerEvents: 'none'
            }}
          />
        )}
      </div>

      {/* 採收花瓣粒子 */}
      {floatingPetals.map((fp) => (
        <div
          key={fp.id}
          style={{
            position: 'fixed',
            left: fp.x - 20,
            top: fp.y - 30,
            fontSize: 22,
            fontWeight: 900,
            color: '#FFF',
            textShadow: '0 2px 6px rgba(0,0,0,0.45)',
            pointerEvents: 'none',
            zIndex: 1200,
            animation: 'floatUpPetal 0.75s ease-out forwards'
          }}
        >
          {PETAL_META[fp.color].emoji} +{fp.amount}
        </div>
      ))}

      {/* 底部花蜜拋投與哨子控制區 */}
      <div
        style={{
          padding: '10px 18px max(22px, env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          zIndex: 20,
          background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.28) 100%)'
        }}
      >
        {/* 中央晶瑩花蜜球 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div
            onClick={handleThrowNectar}
            style={{
              width: 70,
              height: 70,
              borderRadius: '50%',
              background: `radial-gradient(circle at 32% 30%, #FFFFFF 0%, ${activeMeta.hex === '#FFFFFF' ? '#E2E8F0' : activeMeta.hex} 65%, rgba(0,0,0,0.2) 100%)`,
              boxShadow: '0 8px 24px rgba(0,0,0,0.32), inset 0 4px 10px rgba(255,255,255,0.8)',
              border: '3px solid rgba(255,255,255,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              transform: nectarThrownAnim ? 'translateY(-90px) scale(0.6)' : 'scale(1)',
              transition: 'transform 0.25s ease-out'
            }}
          >
            <span
              style={{
                position: 'absolute',
                bottom: -6,
                background: '#0F172A',
                color: '#FFF',
                fontSize: 11,
                fontWeight: 900,
                padding: '1px 8px',
                borderRadius: 99
              }}
            >
              x{nectarJar[selectedNectar]}
            </span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 900, color: '#FFFFFF', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            {activeMeta.nectarName}
          </span>
        </div>

        {/* 下方控制列：關閉返回鈕 + 4色花蜜切換 + 吹哨子集合 */}
        <div
          style={{
            width: '100%',
            maxWidth: 440,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10
          }}
        >
          <button
            onClick={onCloseGarden}
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              border: '3px solid #FFFFFF',
              background: '#1E293B',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
              fontSize: 20,
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="關閉花園返回主畫面"
          >
            ✕
          </button>

          <div
            style={{
              background: 'rgba(255,255,255,0.94)',
              borderRadius: 99,
              padding: '6px 12px',
              display: 'flex',
              gap: 10,
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
            }}
          >
            {(['white', 'yellow', 'red', 'blue'] as PetalColor[]).map((color) => {
              const m = PETAL_META[color];
              const isSel = selectedNectar === color;
              return (
                <button
                  key={color}
                  onClick={() => onSelectNectar(color)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    border: isSel ? '3px solid #0F172A' : '2px solid #CBD5E1',
                    background: m.hex === '#FFFFFF' ? '#F8FAFC' : m.hex,
                    cursor: 'pointer',
                    position: 'relative',
                    transform: isSel ? 'scale(1.12)' : 'scale(1)'
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      bottom: -4,
                      right: -4,
                      background: '#0F172A',
                      color: '#FFF',
                      fontSize: 9,
                      fontWeight: 900,
                      padding: '0 4px',
                      borderRadius: 99
                    }}
                  >
                    {nectarJar[color]}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={onWhistleGather}
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              border: '3px solid #FFFFFF',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#FFF',
              boxShadow: '0 6px 16px rgba(5,150,105,0.45)',
              fontSize: 22,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="吹口哨集合！"
          >
            😗
          </button>
        </div>
      </div>

      {/* 單隻地瓜球詳細檔案卡 */}
      {inspectedCreature && (
        <div
          onClick={() => setInspectedCreature(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: 28,
              padding: '22px 20px',
              width: '100%',
              maxWidth: 350,
              textAlign: 'center',
              boxShadow: '0 16px 40px rgba(0,0,0,0.35)'
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: '#64748B' }}>
              {VARIETY_CATALOG[inspectedCreature.variety].name}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', marginTop: 2 }}>
              {inspectedCreature.name}
            </div>

            <div style={{ margin: '10px 0', display: 'flex', justifyContent: 'center' }}>
              <DeGuaCharacter
                variety={inspectedCreature.variety}
                decor={inspectedCreature.decor}
                leafStage={inspectedCreature.leafStage}
                flowerColor={inspectedCreature.flowerColor}
                showDecor={inspectedCreature.hasDecor}
                size={125}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', marginBottom: 4 }}>
                友好度 ({Math.floor(inspectedCreature.friendship / 100)} / 4 顆心)
              </div>
              <div style={{ fontSize: 22, letterSpacing: 4 }}>
                {'❤️'.repeat(Math.floor(inspectedCreature.friendship / 100))}
                {'🤍'.repeat(Math.max(0, 4 - Math.floor(inspectedCreature.friendship / 100)))}
              </div>
            </div>

            <div
              style={{
                background: '#F8FAFC',
                borderRadius: 16,
                padding: '10px 12px',
                fontSize: 12,
                color: '#334155',
                textAlign: 'left',
                lineHeight: 1.6,
                marginBottom: 14
              }}
            >
              <div>
                🌱 <strong>頭頂狀態：</strong>
                {inspectedCreature.leafStage === 'leaf'
                  ? '葉子'
                  : inspectedCreature.leafStage === 'bud'
                    ? '花苞（餵精華採收 ×2）'
                    : inspectedCreature.leafStage === 'flower'
                      ? `開花中（${PETAL_META[inspectedCreature.flowerColor].name}）`
                      : `光禿禿（${inspectedCreature.bareWalkSteps ?? 0} / 2,000 步）`}
              </div>
              <div>
                🍯 <strong>餵食進度：</strong>{inspectedCreature.feedCount ?? 0} / 6
              </div>
              <div>📍 <strong>發現地點：</strong>{inspectedCreature.placeName}</div>
              <div>
                🏷️ <strong>場所分類：</strong>
                {DECOR_CATALOG[inspectedCreature.decor].icon}{' '}
                {DECOR_CATALOG[inspectedCreature.decor].placeCategory}
              </div>
              <div>
                🎁 <strong>飾品狀態：</strong>
                {inspectedCreature.hasDecor
                  ? `已穿戴【${DECOR_CATALOG[inspectedCreature.decor].name}】`
                  : inspectedCreature.friendship >= 400
                    ? '🎉 已滿 4 顆心'
                    : '滿 4 顆心解鎖飾品'}
              </div>
            </div>

            <button
              onClick={() => setInspectedCreature(null)}
              style={{
                width: '100%',
                border: 'none',
                background: '#10B981',
                color: '#FFF',
                fontWeight: 900,
                fontSize: 14,
                padding: '12px',
                borderRadius: 99,
                cursor: 'pointer'
              }}
            >
              關閉
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
