import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DECOR_CATALOG,
  DeGuaCreature,
  PetalColor,
  VARIETY_CATALOG
} from '../types/game';
import { DeGuaCharacter } from './DeGuaCharacter';
import { LushFlowerMeadowBackdrop } from './LushFlowerMeadowBackdrop';

export interface MeadowFruitDrop {
  id: string;
  emoji: string;
  color: PetalColor;
  nectarAmount: number;
  xPct: number;
  yPct: number;
}

interface RoamPoint {
  xPct: number;
  yPct: number;
  facingRight: boolean;
}

interface FloatingFeedback {
  id: string;
  text: string;
  xPct: number;
  yPct: number;
}

interface GardenWhistleViewProps {
  creatures: DeGuaCreature[];
  coins: number;
  nectarJar: Record<PetalColor, number>;
  petalJar: Record<PetalColor, number>;
  selectedNectar: PetalColor;
  readyFruitExpeditionsCount?: number;
  onSelectNectar: (color: PetalColor) => void;
  onThrowNectarToFeed: (color: PetalColor) => void;
  onSwipePluckSingle: (creatureId: string) => void;
  onWhistleGather: () => void;
  onCollectAllFruits: (meadowFruitsCollected: MeadowFruitDrop[]) => void;
  onToggleInSquad: (creatureId: string) => void;
  onToggleFavorite: (creatureId: string) => void;
  onOpenPlanting: () => void;
  onOpenPlanter: () => void;
  onCloseGarden: () => void;
}

const NECTAR_COLOR_MAP: Record<
  PetalColor,
  { core: string; glow: string; label: string; badge: string }
> = {
  white: {
    core: '#F8FAFC',
    glow: 'radial-gradient(circle at 32% 30%, #FFFFFF, #CBD5E1)',
    label: '白色精華',
    badge: '#64748B'
  },
  yellow: {
    core: '#FDE047',
    glow: 'radial-gradient(circle at 32% 30%, #FEF9C3, #EAB308)',
    label: '黃色精華',
    badge: '#CA8A04'
  },
  red: {
    core: '#FB7185',
    glow: 'radial-gradient(circle at 32% 30%, #FFE4E6, #E11D48)',
    label: '紅色精華',
    badge: '#E11D48'
  },
  blue: {
    core: '#60A5FA',
    glow: 'radial-gradient(circle at 32% 30%, #DBEAFE, #2563EB)',
    label: '藍色精華',
    badge: '#2563EB'
  }
};

const FRUIT_TEMPLATES: Array<{ emoji: string; color: PetalColor; nectarAmount: number }> = [
  { emoji: '🍓', color: 'red', nectarAmount: 3 },
  { emoji: '🍋', color: 'yellow', nectarAmount: 3 },
  { emoji: '🫐', color: 'blue', nectarAmount: 3 },
  { emoji: '🍏', color: 'white', nectarAmount: 3 },
  { emoji: '🍑', color: 'red', nectarAmount: 4 }
];

function createInitialMeadowFruits(): MeadowFruitDrop[] {
  return [
    { id: 'mf_init_1', emoji: '🍓', color: 'red', nectarAmount: 3, xPct: 26, yPct: 36 },
    { id: 'mf_init_2', emoji: '🍋', color: 'yellow', nectarAmount: 3, xPct: 72, yPct: 48 },
    { id: 'mf_init_3', emoji: '🫐', color: 'blue', nectarAmount: 3, xPct: 42, yPct: 60 }
  ];
}

const WhistleIconSvg: React.FC = () => (
  <svg width="86%" height="86%" viewBox="0 0 42 32" fill="none" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))' }}>
    <path
      d="M7 9.5H27C32.5 9.5 36.5 13.8 36.5 19.5C36.5 25.2 31.8 29 26 29C21 29 17.5 25.8 16.5 21.5H6.5C5 21.5 4 20.4 4 19V12.5C4 10.8 5.3 9.5 7 9.5Z"
      fill="#F8FAFC"
      stroke="#334155"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="26" cy="19.5" r="4.8" fill="#94A3B8" stroke="#334155" strokeWidth="1.5" />
    <path d="M36.5 15.5C39.2 15.5 40.8 17.3 40.8 19.6C40.8 22 39.2 23.8 36.5 23.8" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" />
    <rect x="7.5" y="13" width="6.5" height="3.2" rx="1.6" fill="#38BDF8" />
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
  coins,
  nectarJar,
  petalJar,
  selectedNectar,
  readyFruitExpeditionsCount = 0,
  onSelectNectar,
  onThrowNectarToFeed,
  onSwipePluckSingle,
  onWhistleGather,
  onCollectAllFruits,
  onToggleInSquad,
  onToggleFavorite,
  onOpenPlanting,
  onOpenPlanter,
  onCloseGarden
}) => {
  const squadCreatures = useMemo(
    () => creatures.filter((c) => c.inSquad),
    [creatures]
  );

  const [roamPositions, setRoamPositions] = useState<Record<string, RoamPoint>>({});
  const [meadowFruits, setMeadowFruits] = useState<MeadowFruitDrop[]>(createInitialMeadowFruits);
  const [isGathered, setIsGathered] = useState<boolean>(false);
  const [whistlePulseCount, setWhistlePulseCount] = useState<number>(0);
  const [whistleModeLabel, setWhistleModeLabel] = useState<'single' | 'double' | null>(null);
  const [isNectarDrawerOpen, setIsNectarDrawerOpen] = useState<boolean>(false);
  const [isCrewSheetOpen, setIsCrewSheetOpen] = useState<boolean>(false);
  const [crewFilter, setCrewFilter] = useState<'all' | 'squad' | 'favorite'>('all');
  const [floatingFX, setFloatingFX] = useState<FloatingFeedback[]>([]);
  const [nectarThrowWave, setNectarThrowWave] = useState<number>(0);

  const lastWhistleTapRef = useRef<number>(0);
  const gatherTimerRef = useRef<number | null>(null);
  const singleWhistleTimerRef = useRef<number | null>(null);
  const pluckLockRef = useRef<Record<string, number>>({});

  // 初始化＆持續更新每隻地瓜球在花草原上的漫步位置
  useEffect(() => {
    setRoamPositions((prev) => {
      const next = { ...prev };
      squadCreatures.forEach((c, idx) => {
        if (!next[c.id]) {
          const cols = Math.min(4, Math.max(2, squadCreatures.length));
          const row = Math.floor(idx / cols);
          const col = idx % cols;
          next[c.id] = {
            xPct: 22 + col * (56 / Math.max(1, cols - 1)) + ((idx % 2) * 5 - 2.5),
            yPct: 28 + row * 15 + (idx % 3) * 3,
            facingRight: idx % 2 === 0
          };
        }
      });
      return next;
    });
  }, [squadCreatures]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (isGathered) return;
      setRoamPositions((prev) => {
        const next: Record<string, RoamPoint> = {};
        squadCreatures.forEach((c) => {
          const cur = prev[c.id] || { xPct: 50, yPct: 44, facingRight: true };
          const dx = (Math.random() - 0.5) * 26;
          const dy = (Math.random() - 0.5) * 18;
          const nextX = Math.max(15, Math.min(82, cur.xPct + dx));
          const nextY = Math.max(24, Math.min(64, cur.yPct + dy));
          next[c.id] = {
            xPct: nextX,
            yPct: nextY,
            facingRight: nextX >= cur.xPct
          };
        });
        return next;
      });
    }, 2300);

    return () => window.clearInterval(timer);
  }, [squadCreatures, isGathered]);

  const spawnFloatingText = (text: string, xPct: number, yPct: number) => {
    const id = `fx_${Date.now()}_${Math.random()}`;
    setFloatingFX((prev) => [...prev, { id, text, xPct, yPct }]);
    window.setTimeout(() => {
      setFloatingFX((prev) => prev.filter((item) => item.id !== id));
    }, 1100);
  };

  // 散開重新逛草原
  const scatterCreatures = () => {
    setIsGathered(false);
    setRoamPositions((prev) => {
      const next = { ...prev };
      squadCreatures.forEach((c) => {
        const targetX = 18 + Math.random() * 64;
        next[c.id] = {
          xPct: targetX,
          yPct: 25 + Math.random() * 38,
          facingRight: targetX > 50
        };
      });
      return next;
    });
  };

  // 吹口哨集合（單擊集合 / 雙擊一次收齊草原與探險果實）
  const executeGatherAll = () => {
    setIsGathered(true);
    setWhistlePulseCount((n) => n + 1);
    setWhistleModeLabel('single');

    const total = squadCreatures.length;
    setRoamPositions(() => {
      const next: Record<string, RoamPoint> = {};
      squadCreatures.forEach((c, idx) => {
        const ring = Math.floor(idx / 5);
        const slot = idx % 5;
        const angle = ((slot - 2) * 0.42);
        const xPct = 50 + Math.sin(angle) * (16 + ring * 9);
        const yPct = 44 + ring * 11 + Math.cos(angle) * 4;
        next[c.id] = {
          xPct: Math.max(22, Math.min(78, xPct)),
          yPct: Math.max(36, Math.min(62, yPct)),
          facingRight: xPct < 50
        };
      });
      return next;
    });

    onWhistleGather();

    if (gatherTimerRef.current) window.clearTimeout(gatherTimerRef.current);
    gatherTimerRef.current = window.setTimeout(() => {
      setIsGathered(false);
      setWhistleModeLabel(null);
    }, 4500);

    if (total > 0) {
      spawnFloatingText('😗 小隊集合！', 50, 32);
    }
  };

  const executeDoubleWhistleCollectFruits = () => {
    setWhistlePulseCount((n) => n + 1);
    setWhistleModeLabel('double');
    executeGatherAll();

    const collected = meadowFruits;
    if (collected.length > 0 || readyFruitExpeditionsCount > 0) {
      onCollectAllFruits(collected);
      collected.forEach((f) => {
        spawnFloatingText(`${f.emoji} +${f.nectarAmount}`, f.xPct, f.yPct - 4);
      });
      setMeadowFruits([]);
    } else {
      onCollectAllFruits([]);
      spawnFloatingText('🍎 果實已全部收齊！', 50, 26);
    }

    // 2.6 秒後草原會悄悄再開出 1 顆新的野生水果驚喜
    window.setTimeout(() => {
      const tpl = FRUIT_TEMPLATES[Math.floor(Math.random() * FRUIT_TEMPLATES.length)];
      setMeadowFruits((prev) =>
        prev.length >= 3
          ? prev
          : [
              ...prev,
              {
                id: `mf_${Date.now()}`,
                emoji: tpl.emoji,
                color: tpl.color,
                nectarAmount: tpl.nectarAmount,
                xPct: 24 + Math.random() * 52,
                yPct: 34 + Math.random() * 26
              }
            ]
      );
    }, 2600);
  };

  const handleWhistleButtonTap = () => {
    const now = Date.now();
    const diff = now - lastWhistleTapRef.current;
    if (diff > 0 && diff < 420) {
      lastWhistleTapRef.current = 0;
      if (singleWhistleTimerRef.current) {
        window.clearTimeout(singleWhistleTimerRef.current);
        singleWhistleTimerRef.current = null;
      }
      executeDoubleWhistleCollectFruits();
      return;
    }

    lastWhistleTapRef.current = now;
    if (singleWhistleTimerRef.current) window.clearTimeout(singleWhistleTimerRef.current);
    singleWhistleTimerRef.current = window.setTimeout(() => {
      singleWhistleTimerRef.current = null;
      executeGatherAll();
    }, 240);
  };

  const handleThrowNectar = (targetXPct = 50, targetYPct = 50) => {
    setNectarThrowWave((n) => n + 1);
    onThrowNectarToFeed(selectedNectar);
    spawnFloatingText('💧 餵食花蜜！', targetXPct, Math.max(24, targetYPct - 8));

    // 餵完花蜜有機會掉出 1 顆果實到草原
    if (meadowFruits.length < 4 && Math.random() < 0.45) {
      const tpl = FRUIT_TEMPLATES[Math.floor(Math.random() * FRUIT_TEMPLATES.length)];
      setMeadowFruits((prev) => [
        ...prev,
        {
          id: `mf_drop_${Date.now()}`,
          emoji: tpl.emoji,
          color: tpl.color,
          nectarAmount: tpl.nectarAmount,
          xPct: Math.max(18, Math.min(82, targetXPct + (Math.random() - 0.5) * 20)),
          yPct: Math.max(30, Math.min(62, targetYPct + (Math.random() - 0.5) * 14))
        }
      ]);
    }
  };

  const handleCreatureFlowerSwipe = (c: DeGuaCreature, e: React.SyntheticEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - (pluckLockRef.current[c.id] || 0) < 350) return;
    pluckLockRef.current[c.id] = now;

    if (c.leafStage === 'flower') {
      const pos = roamPositions[c.id] || { xPct: 50, yPct: 45, facingRight: true };
      const bonus = c.budBonusPending ? 2 : 1;
      onSwipePluckSingle(c.id);
      spawnFloatingText(`🌸 +${bonus}`, pos.xPct, pos.yPct - 8);
    } else if (c.leafStage === 'leaf' || c.leafStage === 'bud') {
      const pos = roamPositions[c.id] || { xPct: 50, yPct: 45, facingRight: true };
      handleThrowNectar(pos.xPct, pos.yPct);
    }
  };

  const handleCollectSingleMeadowFruit = (fruit: MeadowFruitDrop, e: React.MouseEvent) => {
    e.stopPropagation();
    onCollectAllFruits([fruit]);
    setMeadowFruits((prev) => prev.filter((f) => f.id !== fruit.id));
    spawnFloatingText(`${fruit.emoji} +${fruit.nectarAmount} 花蜜`, fruit.xPct, fruit.yPct - 5);
  };

  const nectarMeta = NECTAR_COLOR_MAP[selectedNectar];
  const currentNectarCount = nectarJar[selectedNectar] ?? 0;
  const totalFruitPending = meadowFruits.length + readyFruitExpeditionsCount;

  const filteredCrew = useMemo(() => {
    return [...creatures]
      .sort((a, b) => {
        if (Boolean(b.isFavorite) !== Boolean(a.isFavorite)) return b.isFavorite ? 1 : -1;
        if (b.inSquad !== a.inSquad) return b.inSquad ? 1 : -1;
        return b.friendship - a.friendship;
      })
      .filter((c) => {
        if (crewFilter === 'squad') return c.inSquad;
        if (crewFilter === 'favorite') return Boolean(c.isFavorite);
        return true;
      });
  }, [creatures, crewFilter]);

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
        zIndex: 1060,
        background:
          'linear-gradient(180deg, #4B9B36 0%, #5DB845 24%, #6AC851 56%, #53AD3B 84%, #408C2B 100%)',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none'
      }}
    >
      {/* 陽光百花草原動態背景（遠近花叢與草簇隨風搖曳） */}
      <LushFlowerMeadowBackdrop variant="garden" animateBurst={isGathered} />

      {/* 頂部左右懸浮玻璃膠囊（使用 --top-safe-hud 避開 iOS 頂部模糊區） */}
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
          onClick={scatterCreatures}
          style={{
            pointerEvents: 'auto',
            width: 42,
            height: 42,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.65)',
            background: 'rgba(15, 23, 42, 0.28)',
            backdropFilter: 'blur(8px)',
            color: '#FFFFFF',
            fontSize: 18,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)'
          }}
          title="讓地瓜球分散自由散步"
        >
          🌿
        </button>

        <div
          style={{
            pointerEvents: 'auto',
            background: 'rgba(15, 23, 42, 0.34)',
            backdropFilter: 'blur(8px)',
            border: '1.5px solid rgba(255,255,255,0.5)',
            borderRadius: 99,
            padding: '6px 14px',
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

      {totalFruitPending > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(var(--top-safe-hud) + 50px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 28,
            background: 'rgba(15, 23, 42, 0.36)',
            backdropFilter: 'blur(8px)',
            color: '#FEF9C3',
            padding: '5px 14px',
            borderRadius: 99,
            fontSize: 11.5,
            fontWeight: 900,
            border: '1px solid rgba(255,255,255,0.35)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none'
          }}
        >
          🍎 草原有 {totalFruitPending} 顆果實，點兩下口哨一次收！
        </div>
      )}

      {/* 口哨集合波紋動畫 */}
      {whistlePulseCount > 0 && (
        <div
          key={whistlePulseCount}
          style={{
            position: 'absolute',
            left: '50%',
            top: '48%',
            width: 140,
            height: 140,
            marginLeft: -70,
            marginTop: -70,
            borderRadius: '50%',
            border:
              whistleModeLabel === 'double'
                ? '4px solid rgba(253, 224, 71, 0.85)'
                : '4px solid rgba(255, 255, 255, 0.78)',
            boxShadow:
              whistleModeLabel === 'double'
                ? '0 0 28px rgba(253, 224, 71, 0.7)'
                : '0 0 24px rgba(255, 255, 255, 0.6)',
            animation: 'deguaWhistleRing 0.75s ease-out forwards',
            pointerEvents: 'none',
            zIndex: 5
          }}
        />
      )}

      {/* 自由散步的隊伍地瓜球（每一隻都會在花草原上走，滑花瓣可採收） */}
      {squadCreatures.map((c) => {
        const pt = roamPositions[c.id] || { xPct: 50, yPct: 45, facingRight: true };
        const canPluck = c.leafStage === 'flower';
        return (
          <div
            key={c.id}
            onClick={(e) => handleCreatureFlowerSwipe(c, e)}
            onTouchMove={(e) => {
              if (canPluck) handleCreatureFlowerSwipe(c, e);
            }}
            style={{
              position: 'absolute',
              left: `${pt.xPct}%`,
              top: `${pt.yPct}%`,
              transform: `translate(-50%, -50%) scaleX(${pt.facingRight ? 1 : -1})`,
              transition: isGathered
                ? 'left 0.45s cubic-bezier(0.22, 1, 0.36, 1), top 0.45s cubic-bezier(0.22, 1, 0.36, 1)'
                : 'left 2.1s ease-in-out, top 2.1s ease-in-out',
              zIndex: Math.round(pt.yPct) + 10,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            {c.isFavorite && (
              <div
                style={{
                  transform: `scaleX(${pt.facingRight ? 1 : -1})`,
                  fontSize: 12,
                  marginBottom: -4,
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))'
                }}
              >
                ⭐
              </div>
            )}
            <DeGuaCharacter
              variety={c.variety}
              decor={c.decor}
              leafStage={c.leafStage}
              flowerColor={c.flowerColor}
              showDecor={c.hasDecor}
              size={60}
              isBouncing={!isGathered || nectarThrowWave > 0}
            />
            {canPluck && (
              <div
                style={{
                  transform: `scaleX(${pt.facingRight ? 1 : -1})`,
                  marginTop: -6,
                  background: 'rgba(255,255,255,0.9)',
                  color: '#059669',
                  fontSize: 10,
                  fontWeight: 900,
                  padding: '1px 6px',
                  borderRadius: 99,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.18)'
                }}
              >
                滑動採瓣
              </div>
            )}
          </div>
        );
      })}

      {/* 花草原上等待採收的小果實 */}
      {meadowFruits.map((fruit) => (
        <button
          key={fruit.id}
          onClick={(e) => handleCollectSingleMeadowFruit(fruit, e)}
          style={{
            position: 'absolute',
            left: `${fruit.xPct}%`,
            top: `${fruit.yPct}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: Math.round(fruit.yPct) + 15,
            border: '2px solid rgba(255,255,255,0.85)',
            background: 'radial-gradient(circle at 30% 30%, rgba(254,249,195,0.96), rgba(250,204,21,0.88))',
            width: 44,
            height: 44,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            cursor: 'pointer',
            boxShadow: '0 6px 16px rgba(0,0,0,0.24), 0 0 14px rgba(254,240,138,0.8)'
          }}
          className="degua-bounce"
          title="點擊或雙擊口哨一次收取果實花蜜"
        >
          {fruit.emoji}
        </button>
      ))}

      {/* 飄浮回饋文字 */}
      {floatingFX.map((fx) => (
        <div
          key={fx.id}
          style={{
            position: 'absolute',
            left: `${fx.xPct}%`,
            top: `${fx.yPct}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 95,
            background: 'rgba(255,255,255,0.94)',
            color: '#0F172A',
            padding: '4px 10px',
            borderRadius: 99,
            fontSize: 12,
            fontWeight: 900,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            pointerEvents: 'none'
          }}
        >
          {fx.text}
        </div>
      ))}

      {/* ==================== 底部操作列（完全對照圖 5 皮克敏花園） ==================== */}
      {/* 左下角：統一透明立體光澤 ✕ 返回主畫面 */}
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

      {/* 中央下方：精華花蜜玻璃球（點擊投餵 / 點下方角標切換四色花蜜） */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 'max(16px, env(safe-area-inset-bottom))',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10
        }}
      >
        {isNectarDrawerOpen && (
          <div
            style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: 99,
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.24)'
            }}
          >
            {(['white', 'yellow', 'red', 'blue'] as PetalColor[]).map((c) => {
              const active = c === selectedNectar;
              return (
                <button
                  key={c}
                  onClick={() => {
                    onSelectNectar(c);
                    setIsNectarDrawerOpen(false);
                  }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: active ? '3px solid #0F172A' : '1.5px solid #CBD5E1',
                    background: NECTAR_COLOR_MAP[c].glow,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: 2,
                    cursor: 'pointer'
                  }}
                >
                  <span
                    style={{
                      background: '#0F172A',
                      color: '#FFF',
                      fontSize: 9.5,
                      fontWeight: 900,
                      padding: '1px 5px',
                      borderRadius: 99
                    }}
                  >
                    {nectarJar[c] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => handleThrowNectar(50, 46)}
            style={{
              width: 78,
              height: 78,
              borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.92)',
              background: nectarMeta.glow,
              boxShadow:
                '0 10px 24px rgba(0,0,0,0.26), inset 0 4px 12px rgba(255,255,255,0.75)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={`點擊投餵 ${nectarMeta.label}`}
          >
            <span style={{ fontSize: 11, fontWeight: 900, color: '#1E293B', opacity: 0.72 }}>
              投餵
            </span>
          </button>

          {/* 切換花蜜種類膠囊角標 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsNectarDrawerOpen((v) => !v);
            }}
            style={{
              position: 'absolute',
              right: -10,
              bottom: -2,
              background: 'rgba(15, 23, 42, 0.78)',
              color: '#FFFFFF',
              border: '2px solid rgba(255,255,255,0.85)',
              borderRadius: 99,
              padding: '2px 9px',
              fontSize: 12,
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 3px 8px rgba(0,0,0,0.25)'
            }}
            title="切換花蜜顏色"
          >
            {currentNectarCount} ▾
          </button>
        </div>
      </div>

      {/* 右側垂直玻璃圓鈕群：切換隊伍(含最愛篩選) ｜ 🌼 種花 ｜ 🍳 油鍋 ｜ 😗 口哨（雙擊收水果） */}
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
        {/* 切換隊伍 / 地瓜球總數與最愛管理 */}
        <button
          className="pikmin-glass-circle-btn"
          onClick={() => setIsCrewSheetOpen(true)}
          style={{
            position: 'relative',
            width: 'clamp(50px, 6.4lvh, 58px)',
            height: 'clamp(50px, 6.4lvh, 58px)'
          }}
          title="切換隊伍 / 標記最愛地瓜球"
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
              background: 'rgba(15, 23, 42, 0.8)',
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

        {/* 開啟種花 */}
        <button
          className="pikmin-glass-circle-btn"
          onClick={onOpenPlanting}
          style={{
            width: 'clamp(50px, 6.4lvh, 58px)',
            height: 'clamp(50px, 6.4lvh, 58px)'
          }}
          title="開啟種花花瓣庫"
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

        {/* 前往油鍋 */}
        <button
          className="pikmin-glass-circle-btn"
          onClick={onOpenPlanter}
          style={{
            width: 'clamp(50px, 6.4lvh, 58px)',
            height: 'clamp(50px, 6.4lvh, 58px)'
          }}
          title="查看油鍋瓜糰"
        >
          <FryerPotIconSvg />
        </button>

        {/* 吹口哨（點一下集合 / 點兩下一次收所有果實） */}
        <button
          className="pikmin-glass-circle-btn"
          onClick={handleWhistleButtonTap}
          style={{
            position: 'relative',
            width: 'clamp(58px, 7.6lvh, 68px)',
            height: 'clamp(58px, 7.6lvh, 68px)'
          }}
          title="點一下集合，點兩下一次收果實！"
        >
          <WhistleIconSvg />
          {petalJar && totalFruitPending > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                background: '#F59E0B',
                color: '#FFFFFF',
                fontSize: 10.5,
                fontWeight: 900,
                padding: '1px 6px',
                borderRadius: 99,
                border: '2px solid #FFFFFF'
              }}
            >
              ×2收
            </span>
          )}
        </button>
      </div>

      {/* ==================== 切換隊伍 & 最愛地瓜球(⭐可標記)上拉抽屜 ==================== */}
      {isCrewSheetOpen && (
        <div
          onClick={() => setIsCrewSheetOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex',
            alignItems: 'flex-end'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxHeight: '78lvh',
              background: '#FFFFFF',
              borderRadius: '26px 26px 0 0',
              padding: '14px 16px max(18px, env(safe-area-inset-bottom))',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              boxShadow: '0 -8px 28px rgba(0,0,0,0.22)'
            }}
          >
            <div style={{ width: 42, height: 5, borderRadius: 99, background: '#CBD5E1', margin: '0 auto' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#0F172A' }}>
                  🍠 切換散步隊伍 ＆ 最愛地瓜球
                </div>
                <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 700, marginTop: 2 }}>
                  目前隊伍 {squadCreatures.length} / 10 隻・點右上角 ⭐ 可標記最愛
                </div>
              </div>
              <button
                onClick={() => setIsCrewSheetOpen(false)}
                style={{
                  border: 'none',
                  background: '#F1F5F9',
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {(
                [
                  { id: 'all', label: `全部 (${creatures.length})` },
                  { id: 'squad', label: `隊伍中 (${squadCreatures.length})` },
                  {
                    id: 'favorite',
                    label: `⭐ 最愛 (${creatures.filter((c) => c.isFavorite).length})`
                  }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCrewFilter(tab.id)}
                  style={{
                    border: 'none',
                    borderRadius: 99,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: 'pointer',
                    background: crewFilter === tab.id ? '#10B981' : '#F1F5F9',
                    color: crewFilter === tab.id ? '#FFFFFF' : '#475569'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div
              style={{
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                paddingBottom: 6
              }}
            >
              {filteredCrew.map((c) => (
                <div
                  key={c.id}
                  style={{
                    position: 'relative',
                    background: c.inSquad ? '#ECFDF5' : '#F8FAFC',
                    border: c.inSquad ? '2px solid #10B981' : '1.5px solid #E2E8F0',
                    borderRadius: 16,
                    padding: '10px 6px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <button
                    onClick={() => onToggleFavorite(c.id)}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      border: 'none',
                      background: 'rgba(255,255,255,0.85)',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="標記最愛地瓜球"
                  >
                    {c.isFavorite ? '⭐' : '☆'}
                  </button>

                  <div onClick={() => onToggleInSquad(c.id)} style={{ cursor: 'pointer' }}>
                    <DeGuaCharacter
                      variety={c.variety}
                      decor={c.decor}
                      leafStage={c.leafStage}
                      flowerColor={c.flowerColor}
                      showDecor={c.hasDecor}
                      size={52}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      color: '#0F172A',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {c.name}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700 }}>
                    {DECOR_CATALOG[c.decor]?.icon || '🍠'} {VARIETY_CATALOG[c.variety].name}
                  </div>
                  <button
                    onClick={() => onToggleInSquad(c.id)}
                    style={{
                      width: '100%',
                      border: 'none',
                      borderRadius: 99,
                      padding: '4px 6px',
                      marginTop: 2,
                      fontSize: 10.5,
                      fontWeight: 900,
                      cursor: 'pointer',
                      background: c.inSquad ? '#10B981' : '#E2E8F0',
                      color: c.inSquad ? '#FFFFFF' : '#334155'
                    }}
                  >
                    {c.inSquad ? '✓ 隊伍中' : '加入隊伍'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes deguaWhistleRing {
          0% { transform: scale(0.4); opacity: 0.95; }
          100% { transform: scale(2.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
