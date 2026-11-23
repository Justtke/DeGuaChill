import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DECOR_CATALOG,
  DECOR_SUBSETS_CATALOG,
  DeGuaCreature,
  ExpeditionItem,
  PetalColor,
  VARIETY_CATALOG
} from '../types/game';
import {
  formatDistrictOnlyPlaceName,
  formatExpeditionDurationParts
} from '../services/expeditionService';
import {
  getRarePointsRequiredForNextLevel,
  RareDecorProgressMap
} from '../services/rareDecorService';
import { DeGuaCharacter } from './DeGuaCharacter';
import { CreatureHeartsRow, ExpeditionGiftBoxSvg } from './ExpeditionArtwork';
import { Garden3DScene, MagnifierCircleRect } from './Garden3DScene';
import { CreatureDetailModal, CreatureTurntable3D } from './CreatureDetailModal';

export interface MeadowFruitDrop {
  id: string;
  emoji: string;
  color: PetalColor;
  nectarAmount: number;
  xPct: number;
  yPct: number;
}

interface GardenWhistleViewProps {
  creatures: DeGuaCreature[];
  squadLimit: number;
  coins: number;
  nectarJar: Record<PetalColor, number>;
  petalJar: Record<PetalColor, number>;
  selectedNectar: PetalColor;
  rareProgressMap?: RareDecorProgressMap;
  readyFruitExpeditionsCount?: number;
  completedExpeditions?: ExpeditionItem[];
  activeExpeditions?: ExpeditionItem[];
  onSelectNectar: (color: PetalColor) => void;
  onThrowNectarToFeed: (color: PetalColor) => void;
  onSwipePluckSingle: (creatureId: string) => void;
  onWhistleGather: () => void;
  onCollectAllFruits: (meadowFruitsCollected: MeadowFruitDrop[]) => void;
  onClaimReturnedExpedition?: (expId: string) => void;
  onOpenGiftExpedition?: (creature: DeGuaCreature) => void;
  onToggleInSquad: (creatureId: string) => void;
  onToggleFavorite: (creatureId: string) => void;
  onRenameCreature: (creatureId: string, newName: string) => void;
  onReleaseCreature: (creatureId: string) => void;
  onKeepPostcard?: (exp: ExpeditionItem) => void;
  onOpenRoster: () => void;
  onOpenPlanting: () => void;
  onOpenPlanter: () => void;
  onOpenArCamera: () => void;
  onCloseGarden: () => void;
}

const NECTAR_COLOR_MAP: Record<
  PetalColor,
  { core: string; glow: string; label: string; badge: string }
> = {
  white: {
    core: '#F8FAFC',
    glow: 'radial-gradient(circle at 32% 30%, #FFFFFF, #E2E8F0 72%, #CBD5E1)',
    label: '白色精華',
    badge: '#64748B'
  },
  yellow: {
    core: '#FDE047',
    glow: 'radial-gradient(circle at 32% 30%, #FEF9C3, #FACC15 70%, #CA8A04)',
    label: '黃色精華',
    badge: '#CA8A04'
  },
  red: {
    core: '#FB7185',
    glow: 'radial-gradient(circle at 32% 30%, #FFE4E6, #FB7185 70%, #E11D48)',
    label: '紅色精華',
    badge: '#E11D48'
  },
  blue: {
    core: '#60A5FA',
    glow: 'radial-gradient(circle at 32% 30%, #DBEAFE, #60A5FA 70%, #2563EB)',
    label: '藍色精華',
    badge: '#2563EB'
  }
};

const WhistleIconSvg: React.FC = () => (
  <svg width="86%" height="86%" viewBox="0 0 36 32" fill="none" style={{ filter: 'drop-shadow(0 1.5px 2px rgba(0,0,0,0.22))' }}>
    <path
      d="M 11 10 L 31 10 C 33 10, 34 12.2, 33 14.5 L 25 18 C 24 23, 19.5 27, 13.5 27 C 7.5 27, 3 22.5, 3 16.5 C 3 12, 6.5 10, 11 10 Z"
      fill="#F8FAFC"
      stroke="#CBD5E1"
      strokeWidth="1.2"
    />
    <ellipse cx="12.5" cy="18" rx="4.2" ry="4.6" fill="#06B6D4" />
    <ellipse cx="12.5" cy="18" rx="2.4" ry="2.6" fill="#0891B2" />
    <rect x="24" y="10.2" width="5.5" height="2.4" rx="1" fill="#38BDF8" />
    <circle cx="5.5" cy="15.5" r="2.2" fill="none" stroke="#94A3B8" strokeWidth="1.2" />
  </svg>
);

const FryerPotIconSvg: React.FC = () => (
  <svg width="84%" height="84%" viewBox="0 0 36 32" fill="none" style={{ filter: 'drop-shadow(0 1.5px 2px rgba(0,0,0,0.24))' }}>
    <ellipse cx="18" cy="24" rx="14" ry="5.5" fill="#14B8A6" stroke="#FFFFFF" strokeWidth="1.5" />
    <ellipse cx="18" cy="19" rx="10" ry="6" fill="#92400E" stroke="#FDE68A" strokeWidth="1.4" />
    <circle cx="18" cy="15.5" r="5" fill="#FBBF24" stroke="#B45309" strokeWidth="1.2" />
    <path d="M18 10C15 6 22 6 19.5 10" stroke="#4ADE80" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const GardenWhistleView: React.FC<GardenWhistleViewProps> = ({
  creatures,
  squadLimit,
  coins,
  nectarJar,
  selectedNectar,
  rareProgressMap = {},
  completedExpeditions = [],
  activeExpeditions = [],
  onSelectNectar,
  onThrowNectarToFeed,
  onSwipePluckSingle,
  onWhistleGather,
  onCollectAllFruits,
  onClaimReturnedExpedition,
  onOpenGiftExpedition,
  onToggleInSquad,
  onToggleFavorite,
  onRenameCreature,
  onReleaseCreature,
  onKeepPostcard,
  onOpenRoster,
  onOpenPlanting,
  onOpenPlanter,
  onOpenArCamera,
  onCloseGarden
}) => {
  const squadCreatures = useMemo(
    () => creatures.filter((c) => c.inSquad),
    [creatures]
  );

  const [whistlePulseSeq, setWhistlePulseSeq] = useState<number>(0);
  const [throwNectarSeq, setThrowNectarSeq] = useState<number>(0);
  const [throwTargetNdc, setThrowTargetNdc] = useState<{ x: number; y: number } | null>(null);
  const [isNectarDrawerOpen, setIsNectarDrawerOpen] = useState<boolean>(false);

  // 長按抓起 ＋ 下方放大鏡（對照圖 3 & 影片 00:15~00:18）
  const [heldCreature, setHeldCreature] = useState<DeGuaCreature | null>(null);
  const [heldInMagnifier, setHeldInMagnifier] = useState<boolean>(false);
  const [inspectedCreatureId, setInspectedCreatureId] = useState<string | null>(null);

  // 精華球往上拋甩（對照影片 00:06 水滴拉伸拋射）
  const [orbDragOffset, setOrbDragOffset] = useState<{ dx: number; dy: number } | null>(null);
  const orbDragStartRef = useRef<{ x: number; y: number } | null>(null);

  // 歸來禮物開箱演出 / 資源收集飛升動畫
  const [collectingReturnId, setCollectingReturnId] = useState<string | null>(null);
  const [unboxingGiftExp, setUnboxingGiftExp] = useState<ExpeditionItem | null>(null);
  const [unboxRenamedDraft, setUnboxRenamedDraft] = useState<string>('');
  const [unboxEditingName, setUnboxEditingName] = useState<boolean>(false);
  const [unboxPostcardHandled, setUnboxPostcardHandled] = useState<boolean>(false);

  // 滿 4 心自動主動要禮物氣泡對話（若玩家點主動泡泡）
  const [giftPromptCreature, setGiftPromptCreature] = useState<DeGuaCreature | null>(null);

  const lastWhistleTapRef = useRef<number>(0);
  const singleWhistleTimerRef = useRef<number | null>(null);
  const collectReturnTimerRef = useRef<number | null>(null);

  // 計算底部放大鏡圓圈命中範圍（供 3D Raycast drag-to-magnify 精準偵測）
  const magnifierRectRef = useRef<MagnifierCircleRect>({
    centerX: typeof window !== 'undefined' ? window.innerWidth / 2 : 195,
    centerY: typeof window !== 'undefined' ? window.innerHeight - 108 : 700,
    radius: 78
  });

  useEffect(() => {
    const updateMagRect = () => {
      magnifierRectRef.current = {
        centerX: window.innerWidth / 2,
        centerY: window.innerHeight - 110,
        radius: 82
      };
    };
    updateMagRect();
    window.addEventListener('resize', updateMagRect);
    return () => {
      window.removeEventListener('resize', updateMagRect);
      if (collectReturnTimerRef.current) window.clearTimeout(collectReturnTimerRef.current);
      if (singleWhistleTimerRef.current) window.clearTimeout(singleWhistleTimerRef.current);
    };
  }, []);

  const inspectedCreature = useMemo(
    () => (inspectedCreatureId ? creatures.find((c) => c.id === inspectedCreatureId) || null : null),
    [inspectedCreatureId, creatures]
  );

  // 若有正在展示的歸來探險（第一筆），呈現於 3D 草原前方＋上方通知卡
  const activeReturnedExp = completedExpeditions.length > 0 ? completedExpeditions[0] : null;
  const pendingGiftCreature = useMemo(
    () =>
      squadCreatures.find(
        (c) =>
          c.friendship >= 400 &&
          !c.hasDecor &&
          c.busyState === 'free' &&
          !activeExpeditions.some((e) => e.kind === 'gift' && e.targetCreatureId === c.id && e.status !== 'available')
      ) || null,
    [squadCreatures, activeExpeditions]
  );

  const executeGatherAll = () => {
    setWhistlePulseSeq((n) => n + 1);
    onWhistleGather();
  };

  const executeDoubleWhistleCollect = () => {
    setWhistlePulseSeq((n) => n + 1);
    onWhistleGather();
    if (completedExpeditions.length > 0 && onClaimReturnedExpedition) {
      completedExpeditions.forEach((exp) => onClaimReturnedExpedition(exp.id));
    }
    onCollectAllFruits([]);
  };

  const handleWhistleButtonTap = () => {
    const now = Date.now();
    const diff = now - lastWhistleTapRef.current;
    if (diff > 0 && diff < 380) {
      lastWhistleTapRef.current = 0;
      if (singleWhistleTimerRef.current) {
        window.clearTimeout(singleWhistleTimerRef.current);
        singleWhistleTimerRef.current = null;
      }
      executeDoubleWhistleCollect();
      return;
    }

    lastWhistleTapRef.current = now;
    if (singleWhistleTimerRef.current) window.clearTimeout(singleWhistleTimerRef.current);
    singleWhistleTimerRef.current = window.setTimeout(() => {
      singleWhistleTimerRef.current = null;
      executeGatherAll();
    }, 220);
  };

  const fireNectarThrow = (clientX?: number, clientY?: number) => {
    if ((nectarJar[selectedNectar] ?? 0) <= 0) return;
    if (typeof clientX === 'number' && typeof clientY === 'number') {
      const nx = Math.max(-0.85, Math.min(0.85, (clientX / window.innerWidth) * 2 - 1));
      const ny = Math.max(-0.6, Math.min(0.75, 1 - (clientY / window.innerHeight) * 2));
      setThrowTargetNdc({ x: nx, y: ny });
    } else {
      setThrowTargetNdc({ x: 0, y: 0.1 });
    }
    setThrowNectarSeq((n) => n + 1);
    onThrowNectarToFeed(selectedNectar);
  };

  const handleTapReturnedExpedition = (retExp: ExpeditionItem) => {
    if (retExp.kind === 'gift') {
      const holder = creatures.find((c) => c.id === retExp.targetCreatureId);
      setUnboxRenamedDraft(holder?.name || retExp.title);
      setUnboxEditingName(false);
      setUnboxPostcardHandled(false);
      setUnboxingGiftExp(retExp);
      return;
    }
    if (collectingReturnId === retExp.id || !onClaimReturnedExpedition) return;
    setCollectingReturnId(retExp.id);
    if (collectReturnTimerRef.current) window.clearTimeout(collectReturnTimerRef.current);
    collectReturnTimerRef.current = window.setTimeout(() => {
      setCollectingReturnId(null);
      onClaimReturnedExpedition(retExp.id);
    }, 1000);
  };

  const nectarMeta = NECTAR_COLOR_MAP[selectedNectar];
  const currentNectarCount = nectarJar[selectedNectar] ?? 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        height: '100lvh',
        minHeight: '100lvh',
        zIndex: 1060,
        background: '#5EBC46',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none'
      }}
    >
      {/* 真實 3D 百花草原與獨立 3D 地瓜球群組（含抓起、放大鏡、滑瓣、口哨波紋與拋蜜） */}
      <Garden3DScene
        creatures={squadCreatures}
        allCreatures={creatures}
        selectedNectar={selectedNectar}
        throwNectarSeq={throwNectarSeq}
        throwNectarTargetNdc={throwTargetNdc}
        whistlePulseSeq={whistlePulseSeq}
        completedExpedition={activeReturnedExp}
        collectingReturnId={collectingReturnId}
        magnifierRectRef={magnifierRectRef}
        onHoldCreatureChange={(c, inMag) => {
          setHeldCreature(c);
          setHeldInMagnifier(inMag);
        }}
        onInspectCreatureDetail={(c) => setInspectedCreatureId(c.id)}
        onSwipePluckSingle={onSwipePluckSingle}
        onTapReturnedExpedition={handleTapReturnedExpedition}
      />

      {/* ==================== 頂部左右懸浮玻璃鈕（圖 5 與影片：左上 AR、右上金幣） ==================== */}
      {!heldCreature && (
        <div
          style={{
            position: 'absolute',
            top: 'var(--top-safe-hud)',
            left: 16,
            right: 16,
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pointerEvents: 'none'
          }}
        >
          <button
            className="pikmin-glass-circle-btn"
            onClick={onOpenArCamera}
            style={{
              pointerEvents: 'auto',
              width: 42,
              height: 42,
              fontSize: 12,
              fontWeight: 900,
              color: '#FFFFFF'
            }}
            title="AR 相機"
          >
            <svg width="68%" height="68%" viewBox="0 0 28 28" fill="none">
              <path
                d="M5 9V6.5C5 5.7 5.7 5 6.5 5H9M19 5H21.5C22.3 5 23 5.7 23 6.5V9M23 19V21.5C23 22.3 22.3 23 21.5 23H19M9 23H6.5C5.7 23 5 22.3 5 21.5V19"
                stroke="#FFFFFF"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <text x="14" y="17.5" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="800" fontFamily="sans-serif">
                AR
              </text>
            </svg>
          </button>

          <div
            style={{
              pointerEvents: 'auto',
              background: 'rgba(15, 23, 42, 0.34)',
              backdropFilter: 'blur(8px)',
              border: '1.5px solid rgba(255,255,255,0.48)',
              borderRadius: 99,
              padding: '5px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#FFFFFF',
              fontWeight: 900,
              fontSize: 15,
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)'
            }}
          >
            <span>🪙</span>
            <span>{coins}</span>
          </div>
        </div>
      )}

      {/* ==================== 探險回來頂部白色提示卡（對照影片 00:02） ==================== */}
      {activeReturnedExp && !heldCreature && !unboxingGiftExp && (() => {
        const totalMs =
          activeReturnedExp.completesAt && activeReturnedExp.startedAt
            ? Math.max(1000, activeReturnedExp.completesAt - activeReturnedExp.startedAt)
            : (activeReturnedExp.outboundDurationMs || 25_000) +
              (activeReturnedExp.inboundDurationMs || 0);
        const durText =
          totalMs < 60_000
            ? `${Math.max(1, Math.round(totalMs / 1000))} 秒`
            : formatExpeditionDurationParts(totalMs).compactText;

        return (
          <div
            onClick={() => handleTapReturnedExpedition(activeReturnedExp)}
            style={{
              position: 'absolute',
              top: 'calc(var(--top-safe-hud) + 52px)',
              left: 24,
              right: 24,
              zIndex: 32,
              background: 'rgba(255,255,255,0.94)',
              backdropFilter: 'blur(10px)',
              borderRadius: 18,
              padding: '13px 16px',
              boxShadow: '0 8px 24px rgba(15,23,42,0.18)',
              color: '#1E293B',
              fontSize: 15,
              fontWeight: 700,
              lineHeight: 1.48,
              cursor: 'pointer',
              opacity: collectingReturnId ? 0.2 : 1,
              transition: 'opacity 0.25s ease'
            }}
          >
            經過 <b style={{ fontWeight: 900 }}>{durText}</b> 後，地瓜球從前往{' '}
            <b style={{ fontWeight: 900 }}>
              {formatDistrictOnlyPlaceName(
                activeReturnedExp.placeName,
                activeReturnedExp.lat,
                activeReturnedExp.lng
              )}
            </b>{' '}
            的探險回來了！
          </div>
        );
      })()}

      {/* 若隊伍裡有剛滿 4 心待領禮物者，顯示可點的小禮物浮泡 */}
      {pendingGiftCreature && !heldCreature && !activeReturnedExp && (
        <button
          onClick={() => setGiftPromptCreature(pendingGiftCreature)}
          className="degua-bounce"
          style={{
            position: 'absolute',
            left: '36%',
            top: '44%',
            zIndex: 35,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '2px solid #FFFFFF',
            background: 'radial-gradient(circle at 32% 30%, #FFFFFF, #E2E8F0)',
            boxShadow: '0 6px 16px rgba(0,0,0,0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <ExpeditionGiftBoxSvg size={28} />
        </button>
      )}

      {/* ==================== 長按抓起時：頂部資料浮卡 ＋ 底部放大鏡（完全對照圖 3 & 影片 00:15） ==================== */}
      {heldCreature && (
        <>
          <div
            style={{
              position: 'absolute',
              top: 'calc(var(--top-safe-hud) + 18px)',
              left: 34,
              right: 34,
              zIndex: 55,
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(10px)',
              borderRadius: 18,
              padding: '14px 16px',
              boxShadow: '0 10px 28px rgba(15,23,42,0.2)',
              pointerEvents: 'none'
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', lineHeight: 1.35 }}>
              {formatDistrictOnlyPlaceName(heldCreature.placeName, heldCreature.lat, heldCreature.lng)}的
              {heldCreature.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#64748B' }}>友好度</span>
              <CreatureHeartsRow friendship={heldCreature.friendship} heartSize={14} />
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', marginTop: 4 }}>
              {formatDistrictOnlyPlaceName(heldCreature.placeName, heldCreature.lat, heldCreature.lng)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13.5, fontWeight: 800, color: '#334155' }}>
              <span>🌺</span>
              <span>已收集的花瓣</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: (heldCreature.feedCount ?? 0) >= 6 ? '#E11D48' : '#0F172A' }}>
                {Math.min(6, heldCreature.feedCount ?? 0)} / 6
              </span>
            </div>
          </div>

          {/* 下方放大鏡圓圈：拖入時發光準備打開詳細圖卡 */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 30,
              transform: `translateX(-50%) scale(${heldInMagnifier ? 1.1 : 1})`,
              transition: 'transform 0.16s ease',
              zIndex: 52,
              width: 158,
              height: 158,
              borderRadius: '50%',
              border: heldInMagnifier
                ? '5px solid rgba(255,255,255,0.98)'
                : '4px solid rgba(255,255,255,0.72)',
              background: heldInMagnifier
                ? 'radial-gradient(circle, rgba(255,255,255,0.28), rgba(167,243,208,0.22))'
                : 'radial-gradient(circle, rgba(255,255,255,0.16), rgba(255,255,255,0.06))',
              boxShadow: heldInMagnifier
                ? '0 0 28px rgba(255,255,255,0.75), inset 0 0 18px rgba(255,255,255,0.35)'
                : '0 8px 26px rgba(0,0,0,0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 18,
              textAlign: 'center',
              pointerEvents: 'none'
            }}
          >
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.45,
                textShadow: '0 1px 4px rgba(0,0,0,0.55)'
              }}
            >
              如果要顯示詳情，請把地瓜球拉到這裡。
            </div>
            {/* 放大鏡手把（對照圖 3 右下方斜柄） */}
            <div
              style={{
                position: 'absolute',
                right: -28,
                bottom: -24,
                width: 18,
                height: 66,
                borderRadius: 9,
                background: 'linear-gradient(180deg, rgba(167,243,208,0.88), rgba(45,212,191,0.92))',
                border: '2px solid rgba(255,255,255,0.7)',
                transform: 'rotate(-42deg)'
              }}
            />
          </div>
        </>
      )}

      {/* ==================== 底部操作列（無「投餵」文字、對照圖 5 & 影片） ==================== */}
      {!heldCreature && (
        <>
          <button
            className="pikmin-glass-circle-btn"
            onClick={onCloseGarden}
            style={{
              position: 'absolute',
              left: 'clamp(14px, 4vw, 18px)',
              bottom: 'max(2.1lvh, env(safe-area-inset-bottom) + 6px)',
              zIndex: 40,
              width: 'clamp(48px, 6.2lvh, 56px)',
              height: 'clamp(48px, 6.2lvh, 56px)'
            }}
            title="返回主畫面"
          >
            <svg width="58%" height="58%" viewBox="0 0 24 24" fill="none">
              <path d="M5.5 5.5L18.5 18.5M18.5 5.5L5.5 18.5" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" />
            </svg>
          </button>

          {/* 中央下方：純粹發光花蜜精華玻璃球（可點也可往上滑拋出！） */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: 'max(16px, env(safe-area-inset-bottom))',
              zIndex: 40,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            {/* 影片 00:06 水滴拉伸拋射視覺 */}
            {orbDragOffset && orbDragOffset.dy < -14 && (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: 36,
                  width: 34,
                  height: Math.min(180, Math.abs(orbDragOffset.dy) + 32),
                  transform: `translate(calc(-50% + ${orbDragOffset.dx * 0.4}px), 0) rotate(${Math.max(-25, Math.min(25, orbDragOffset.dx * 0.12))}deg)`,
                  transformOrigin: 'bottom center',
                  borderRadius: '50% 50% 42% 42%',
                  background: nectarMeta.glow,
                  opacity: 0.9,
                  boxShadow: '0 0 18px rgba(255,255,255,0.75)',
                  pointerEvents: 'none'
                }}
              />
            )}

            <div style={{ position: 'relative' }}>
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  orbDragStartRef.current = { x: e.clientX, y: e.clientY };
                  setOrbDragOffset({ dx: 0, dy: 0 });
                }}
                onPointerMove={(e) => {
                  if (!orbDragStartRef.current) return;
                  setOrbDragOffset({
                    dx: e.clientX - orbDragStartRef.current.x,
                    dy: e.clientY - orbDragStartRef.current.y
                  });
                }}
                onPointerUp={(e) => {
                  if (!orbDragStartRef.current) return;
                  const dy = e.clientY - orbDragStartRef.current.y;
                  orbDragStartRef.current = null;
                  setOrbDragOffset(null);
                  if (dy < -18) {
                    fireNectarThrow(e.clientX, e.clientY);
                  } else {
                    fireNectarThrow();
                  }
                }}
                onPointerCancel={() => {
                  orbDragStartRef.current = null;
                  setOrbDragOffset(null);
                }}
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: '50%',
                  border: '3px solid rgba(255,255,255,0.92)',
                  background: nectarMeta.glow,
                  boxShadow:
                    '0 10px 24px rgba(0,0,0,0.26), inset 0 6px 14px rgba(255,255,255,0.82)',
                  cursor: 'pointer',
                  padding: 0
                }}
                title={nectarMeta.label}
              />

              {/* 右下角精華數量徽章：點此切換花蜜顏色 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsNectarDrawerOpen(true);
                }}
                style={{
                  position: 'absolute',
                  right: -12,
                  bottom: -2,
                  background: 'rgba(15, 23, 42, 0.78)',
                  color: '#FFFFFF',
                  border: '2px solid rgba(255,255,255,0.85)',
                  borderRadius: 99,
                  padding: '2px 9px',
                  fontSize: 12.5,
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.25)'
                }}
              >
                {currentNectarCount}
              </button>
            </div>
          </div>

          {/* 右側垂直玻璃圓鈕群（影片 00:01：地瓜球列表 ｜ 🌼 種花 ｜ 🍳 油鍋 ｜ 😗 口哨） */}
          <div
            style={{
              position: 'absolute',
              right: 16,
              bottom: 'max(18px, env(safe-area-inset-bottom))',
              zIndex: 40,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10
            }}
          >
            <button
              className="pikmin-glass-circle-btn"
              onClick={onOpenRoster}
              style={{
                position: 'relative',
                width: 'clamp(50px, 6.4lvh, 58px)',
                height: 'clamp(50px, 6.4lvh, 58px)'
              }}
              title="查看所有地瓜球清單"
            >
              <DeGuaCharacter
                variety="red"
                decor="roadside"
                leafStage="leaf"
                flowerColor="white"
                showDecor={false}
                size={40}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: -4,
                  right: -6,
                  background: 'rgba(15, 23, 42, 0.82)',
                  color: '#FFFFFF',
                  fontSize: 10,
                  fontWeight: 900,
                  padding: '1px 6px',
                  borderRadius: 99,
                  border: '1.5px solid #FFFFFF'
                }}
              >
                {creatures.length}
              </span>
            </button>

            <button
              className="pikmin-glass-circle-btn"
              onClick={onOpenPlanting}
              style={{
                width: 'clamp(50px, 6.4lvh, 58px)',
                height: 'clamp(50px, 6.4lvh, 58px)'
              }}
              title="種花"
            >
              <svg width="86%" height="86%" viewBox="0 0 36 36" style={{ filter: 'drop-shadow(0 1.5px 2px rgba(0,0,0,0.22))' }}>
                <g transform="translate(13.5, 14)">
                  <circle cx="0" cy="-7" r="4.6" fill="#FFFFFF" />
                  <circle cx="6.5" cy="-2.2" r="4.6" fill="#FFFFFF" />
                  <circle cx="4.1" cy="5.8" r="4.6" fill="#FFFFFF" />
                  <circle cx="-4.1" cy="5.8" r="4.6" fill="#FFFFFF" />
                  <circle cx="-6.5" cy="-2.2" r="4.6" fill="#FFFFFF" />
                  <circle cx="0" cy="0" r="3.4" fill="#FACC15" />
                </g>
                <g transform="translate(24.5, 23.5) scale(0.76)">
                  <circle cx="0" cy="-7" r="4.6" fill="#FFFFFF" />
                  <circle cx="6.5" cy="-2.2" r="4.6" fill="#FFFFFF" />
                  <circle cx="4.1" cy="5.8" r="4.6" fill="#FFFFFF" />
                  <circle cx="-4.1" cy="5.8" r="4.6" fill="#FFFFFF" />
                  <circle cx="-6.5" cy="-2.2" r="4.6" fill="#FFFFFF" />
                  <circle cx="0" cy="0" r="3.4" fill="#FACC15" />
                </g>
              </svg>
            </button>

            <button
              className="pikmin-glass-circle-btn"
              onClick={onOpenPlanter}
              style={{
                width: 'clamp(50px, 6.4lvh, 58px)',
                height: 'clamp(50px, 6.4lvh, 58px)'
              }}
              title="瓜糰"
            >
              <FryerPotIconSvg />
            </button>

            <button
              className="pikmin-glass-circle-btn"
              onClick={handleWhistleButtonTap}
              style={{
                width: 'clamp(58px, 7.6lvh, 68px)',
                height: 'clamp(58px, 7.6lvh, 68px)'
              }}
              title="口哨"
            >
              <WhistleIconSvg />
            </button>
          </div>
        </>
      )}

      {/* ==================== 影片 00:08 精華抽屜（點右下數量打開選擇不同精華） ==================== */}
      {isNectarDrawerOpen && (
        <div
          onClick={() => setIsNectarDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            background: 'rgba(15, 23, 42, 0.42)',
            display: 'flex',
            alignItems: 'flex-end'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              background: '#FFFFFF',
              borderRadius: '26px 26px 0 0',
              padding: '14px 18px max(26px, env(safe-area-inset-bottom))',
              boxShadow: '0 -10px 30px rgba(0,0,0,0.22)'
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#D1D5DB', margin: '0 auto 14px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {(['white', 'yellow', 'red', 'blue'] as PetalColor[]).map((c) => {
                const active = c === selectedNectar;
                const info = NECTAR_COLOR_MAP[c];
                return (
                  <button
                    key={c}
                    onClick={() => {
                      onSelectNectar(c);
                      setIsNectarDrawerOpen(false);
                    }}
                    style={{
                      background: active ? '#F0FDF4' : '#F8FAFC',
                      border: active ? '2px solid #10B981' : '1.5px solid #E2E8F0',
                      borderRadius: 18,
                      padding: '12px 6px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer'
                    }}
                  >
                    <div
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: '50%',
                        background: info.glow,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.16), inset 0 4px 8px rgba(255,255,255,0.8)',
                        position: 'relative'
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          right: -4,
                          bottom: -2,
                          background: 'rgba(15,23,42,0.8)',
                          color: '#FFF',
                          fontSize: 10.5,
                          fontWeight: 900,
                          padding: '1px 6px',
                          borderRadius: 99,
                          border: '1.5px solid #FFF'
                        }}
                      >
                        {nectarJar[c] ?? 0}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#334155' }}>{info.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 長按拖進放大鏡後開啟：圖 4 詳細資訊卡 ==================== */}
      {inspectedCreature && (
        <CreatureDetailModal
          creature={inspectedCreature}
          allCreatures={creatures}
          squadLimit={squadLimit}
          squadCount={squadCreatures.length}
          onToggleInSquad={onToggleInSquad}
          onToggleFavorite={onToggleFavorite}
          onRenameCreature={onRenameCreature}
          onReleaseCreature={onReleaseCreature}
          onOpenArCamera={() => {
            setInspectedCreatureId(null);
            onOpenArCamera();
          }}
          onClose={() => setInspectedCreatureId(null)}
        />
      )}

      {/* ==================== 滿 4 心「出生地禮物」確認框 ==================== */}
      {giftPromptCreature && (
        <div
          onClick={() => setGiftPromptCreature(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 120,
            background: 'rgba(15, 23, 42, 0.62)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 18px'
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', marginBottom: 10 }}>
            友好度已達到4
          </div>
          <div style={{ marginBottom: 14 }} onClick={(e) => e.stopPropagation()}>
            <ExpeditionGiftBoxSvg size={108} />
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 360,
              background: '#FFFFFF',
              borderRadius: 24,
              padding: '22px 20px 18px',
              boxShadow: '0 16px 36px rgba(0,0,0,0.34)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: '#334155', lineHeight: 1.55 }}>
              {giftPromptCreature.name}想要去它的出生地點撿拾道具。
              <br />
              要派它去探險嗎？
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
              <button
                onClick={() => setGiftPromptCreature(null)}
                style={{
                  flex: 1,
                  borderRadius: 99,
                  border: '1.5px solid #94A3B8',
                  background: '#FFFFFF',
                  color: '#334155',
                  padding: '11px 12px',
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                稍後再說
              </button>
              <button
                onClick={() => {
                  const target = giftPromptCreature;
                  setGiftPromptCreature(null);
                  if (onOpenGiftExpedition) onOpenGiftExpedition(target);
                }}
                style={{
                  flex: 1,
                  borderRadius: 99,
                  border: '1.5px solid #3E9A8C',
                  background: '#FFFFFF',
                  color: '#2B8A78',
                  padding: '11px 12px',
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                前往探險
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 影片 00:28~00:46：禮物開箱與稀有飾品圖鑑登場動畫畫面 ==================== */}
      {unboxingGiftExp && (() => {
        const target = creatures.find((c) => c.id === unboxingGiftExp.targetCreatureId);
        const decorCat = unboxingGiftExp.seedlingDecor || target?.decor || 'roadside';
        const dMeta = DECOR_CATALOG[decorCat];
        const previewCreature: DeGuaCreature = {
          ...(target || {
            id: 'preview',
            name: unboxingGiftExp.title,
            variety: unboxingGiftExp.seedlingVariety || 'red',
            decor: decorCat,
            placeName: unboxingGiftExp.placeName,
            lat: unboxingGiftExp.lat,
            lng: unboxingGiftExp.lng,
            friendship: 400,
            giftExpeditionCreated: true,
            leafStage: 'leaf',
            flowerColor: 'white',
            pluckCountToday: 0,
            inSquad: true,
            busyState: 'free',
            createdAt: Date.now()
          }),
          hasDecor: true,
          isRareDecor: Boolean(unboxingGiftExp.isRareGift),
          decorSetId: unboxingGiftExp.rareDecorSetId || target?.decorSetId
        };
        const rareState = rareProgressMap[decorCat];
        const rareSubs = (DECOR_SUBSETS_CATALOG[decorCat] || []).filter((s) => s.isRare);

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 125,
              background: 'linear-gradient(180deg, rgba(16,185,129,0.28) 0%, rgba(254,240,138,0.34) 55%, rgba(15,23,42,0.72) 100%)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'max(48px, env(safe-area-inset-top) + 18px) 18px max(28px, env(safe-area-inset-bottom))'
            }}
          >
            {/* 頂部地點與飾品系列徽章（對照影片 00:29 / 00:36） */}
            <div
              style={{
                width: '100%',
                maxWidth: 340,
                background: 'rgba(255,255,255,0.96)',
                borderRadius: 18,
                padding: '12px 16px',
                textAlign: 'center',
                boxShadow: '0 10px 26px rgba(0,0,0,0.22)'
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 900, color: '#0F172A' }}>
                {formatDistrictOnlyPlaceName(unboxingGiftExp.placeName, unboxingGiftExp.lat, unboxingGiftExp.lng)}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#B45309', marginTop: 2 }}>
                {dMeta.icon} {dMeta.placeCategory} / {unboxingGiftExp.isRareGift ? `${dMeta.name}（稀有）` : dMeta.name}
              </div>
              {rareState && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#D97706' }}>
                    ✨ {dMeta.placeCategory} Lv.{rareState.level}（{rareState.points} / {getRarePointsRequiredForNextLevel(rareState.level)} 點）
                  </div>
                  {rareSubs.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 6 }}>
                      {(rareSubs[0].varieties || []).map((v) => {
                        const got =
                          (previewCreature.isRareDecor && previewCreature.variety === v) ||
                          creatures.some((c) => c.decor === decorCat && c.isRareDecor && c.variety === v);
                        return (
                          <span
                            key={v}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: got ? VARIETY_CATALOG[v].bodyColor : '#E2E8F0',
                              border: got ? '2px solid #F59E0B' : '1px dashed #94A3B8'
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 中央 3D 閃耀開箱登場旋轉舞台 */}
            <div style={{ width: '100%', maxWidth: 320, textAlign: 'center' }}>
              <CreatureTurntable3D creature={previewCreature} zoomed={true} autoSpin={true} height={240} />
              <div
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: 900,
                  textShadow: '0 2px 10px rgba(0,0,0,0.55)',
                  marginTop: -6
                }}
              >
                {previewCreature.name}穿戴了【{dMeta.name}
                {unboxingGiftExp.isRareGift ? '（稀有）' : ''}】！
              </div>
            </div>

            {/* 帶回來的明信片捨棄 / 接收 + 更改名稱 / 確定（對照影片 00:43~00:45） */}
            <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!unboxPostcardHandled && (
                <div
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    borderRadius: 16,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 6px 18px rgba(0,0,0,0.2)'
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: '#334155' }}>
                    ✉️ 帶回了來自「{unboxingGiftExp.placeName}」的明信片
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setUnboxPostcardHandled(true)}
                      style={{
                        border: '1px solid #CBD5E1',
                        background: '#FFF',
                        color: '#E11D48',
                        borderRadius: 99,
                        padding: '4px 10px',
                        fontSize: 11.5,
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      捨棄
                    </button>
                    <button
                      onClick={() => {
                        if (onKeepPostcard) onKeepPostcard(unboxingGiftExp);
                        setUnboxPostcardHandled(true);
                      }}
                      style={{
                        border: 'none',
                        background: '#3E9A8C',
                        color: '#FFF',
                        borderRadius: 99,
                        padding: '4px 10px',
                        fontSize: 11.5,
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      接收
                    </button>
                  </div>
                </div>
              )}

              {unboxEditingName && (
                <input
                  value={unboxRenamedDraft}
                  onChange={(e) => setUnboxRenamedDraft(e.target.value)}
                  maxLength={24}
                  style={{
                    width: '100%',
                    borderRadius: 14,
                    border: '2px solid #F59E0B',
                    padding: '9px 12px',
                    fontSize: 14,
                    fontWeight: 800
                  }}
                />
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setUnboxEditingName((v) => !v)}
                  style={{
                    flex: 1,
                    borderRadius: 99,
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#334155',
                    padding: '12px',
                    fontSize: 14.5,
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  更改名稱
                </button>
                <button
                  onClick={() => {
                    const exp = unboxingGiftExp;
                    if (unboxEditingName && exp.targetCreatureId && unboxRenamedDraft.trim()) {
                      onRenameCreature(exp.targetCreatureId, unboxRenamedDraft.trim());
                    }
                    setUnboxingGiftExp(null);
                    if (onClaimReturnedExpedition) onClaimReturnedExpedition(exp.id);
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 99,
                    border: 'none',
                    background: '#3E9A8C',
                    color: '#FFFFFF',
                    padding: '12px',
                    fontSize: 14.5,
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  確定
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
