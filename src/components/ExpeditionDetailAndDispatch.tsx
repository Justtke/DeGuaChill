import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  BigFlowerNode,
  DECOR_CATALOG,
  DECOR_SUBSETS_CATALOG,
  DeGuaCreature,
  DeGuaVariety,
  ExpeditionItem,
  MushroomNode,
  PetalColor,
  PlantedFlowerCell,
  VARIETY_CATALOG
} from '../types/game';

const ALL_VARIETIES: DeGuaVariety[] = [
  'red',
  'yellow',
  'blue',
  'purple',
  'white',
  'winged',
  'rock'
];
import { WorldDeltaState } from '../services/worldSyncService';
import {
  autoSelectMinimumSquad,
  calculateExpeditionDuration,
  ExpeditionDurationEstimate,
  formatExpeditionDateZh,
  formatExpeditionDurationParts,
  formatRemainingExpeditionWindow,
  getExpeditionProgressSnapshot,
  getMemberSpeedFactor,
  isCategoryColorDecorCompleted,
  normalizeExpeditionItem
} from '../services/expeditionService';
import { DeGuaCharacter } from './DeGuaCharacter';
import { buildDirectionalWalkingPlayerSvg } from './WalkingPlayerAvatar';
import { FlowerMap } from './FlowerMap';
import {
  CreatureHeartsRow,
  DecorSilhouetteBadge,
  ExpeditionItemArtwork
} from './ExpeditionArtwork';
import { createRegionalOverviewTileLayer } from './ExpeditionAndRaidModals';

export type ExpeditionFlowPhase =
  | 'inspect_available'
  | 'select_squad'
  | 'farewell'
  | 'inspect_active'
  | 'follow_crew';

interface ExpeditionDetailAndDispatchProps {
  expedition: ExpeditionItem;
  creatures: DeGuaCreature[];
  myLat: number;
  myLng: number;
  isPlanting: boolean;
  activePetalColor: PetalColor;
  flowers: Record<string, PlantedFlowerCell>;
  worldDelta?: WorldDeltaState;
  bigFlowers: BigFlowerNode[];
  mushrooms: MushroomNode[];
  initialPhase?: ExpeditionFlowPhase;
  onDispatchCommit: (
    expId: string,
    assignedCreatureIds: string[],
    estimate: ExpeditionDurationEstimate
  ) => void;
  onCancelExpedition: (expId: string) => void;
  onClaimCompletedExpedition: (expId: string) => void;
  onClose: () => void;
}

type SquadSortMode = 'friendship_desc' | 'friendship_asc' | 'strength_desc' | 'speed_desc';

const VARIETY_DOT_COLORS: { id: DeGuaVariety; hex: string }[] = [
  { id: 'red', hex: '#EF4444' },
  { id: 'yellow', hex: '#FACC15' },
  { id: 'blue', hex: '#3B82F6' },
  { id: 'purple', hex: '#9333EA' },
  { id: 'white', hex: '#E5E7EB' },
  { id: 'winged', hex: '#F472B6' },
  { id: 'rock', hex: '#4B5563' }
];

export const ExpeditionDetailAndDispatch: React.FC<ExpeditionDetailAndDispatchProps> = ({
  expedition: rawExpedition,
  creatures,
  myLat,
  myLng,
  isPlanting,
  activePetalColor,
  flowers,
  worldDelta,
  bigFlowers,
  mushrooms,
  initialPhase,
  onDispatchCommit,
  onCancelExpedition,
  onClaimCompletedExpedition,
  onClose
}) => {
  const expedition = useMemo(
    () => normalizeExpeditionItem(rawExpedition, creatures, Date.now()),
    [rawExpedition, creatures]
  );

  const [phase, setPhase] = useState<ExpeditionFlowPhase>(() => {
    if (initialPhase) return initialPhase;
    return expedition.status === 'active' ? 'inspect_active' : 'inspect_available';
  });

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    if (phase !== 'inspect_active' && phase !== 'follow_crew') return;
    const tid = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(tid);
  }, [phase]);

  // 上方地圖 Sheet 展開高度（預設 59%，上滑即展開至 88%）
  const [sheetHeightPct, setSheetHeightPct] = useState<number>(59);
  const [isDraggingSheet, setIsDraggingSheet] = useState<boolean>(false);
  const sheetDragRef = useRef<{ active: boolean; startY: number; startPct: number }>({
    active: false,
    startY: 0,
    startPct: 59
  });

  // 派遣隊伍選擇狀態
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (expedition.kind === 'gift' && expedition.targetCreatureId) {
      return [expedition.targetCreatureId];
    }
    return [];
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [sortMode, setSortMode] = useState<SquadSortMode>('friendship_asc');
  const [filterVariety, setFilterVariety] = useState<DeGuaVariety | null>(null);
  const [limitToast, setLimitToast] = useState<string | null>(null);
  const limitToastTimerRef = useRef<number | null>(null);

  // 實景追蹤鏡頭模式（支援 3D 散步與兩指捏合轉為限定比例鳥瞰）
  const [followPerspective, setFollowPerspective] = useState<'surround' | 'overhead'>('surround');
  const [followBearing, setFollowBearing] = useState<number>(0);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const showLimitToast = (msg: string) => {
    setLimitToast(msg);
    if (limitToastTimerRef.current) window.clearTimeout(limitToastTimerRef.current);
    limitToastTimerRef.current = window.setTimeout(() => setLimitToast(null), 2400);
  };

  useEffect(() => {
    return () => {
      if (limitToastTimerRef.current) window.clearTimeout(limitToastTimerRef.current);
    };
  }, []);

  const isDecorCompleted = useMemo(() => {
    if (expedition.kind === 'fruit' || !expedition.seedlingDecor) return false;
    return isCategoryColorDecorCompleted(
      creatures,
      expedition.seedlingDecor,
      expedition.seedlingVariety,
      expedition.seedlingIsHuge
    );
  }, [creatures, expedition]);

  const targetGiftCreature = useMemo(
    () =>
      expedition.targetCreatureId
        ? creatures.find((c) => c.id === expedition.targetCreatureId)
        : undefined,
    [creatures, expedition.targetCreatureId]
  );

  const freeCreatures = useMemo(
    () => creatures.filter((c) => c.busyState === 'free'),
    [creatures]
  );

  const filteredSortedCreatures = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = creatures.filter((c) => {
      if (filterVariety && c.variety !== filterVariety) return false;
      if (q) {
        const hay = `${c.name} ${c.placeName} ${DECOR_CATALOG[c.decor]?.placeCategory || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      // 可用狀態優先於忙碌中
      if (a.busyState === 'free' && b.busyState !== 'free') return -1;
      if (a.busyState !== 'free' && b.busyState === 'free') return 1;
      if (sortMode === 'friendship_asc') return a.friendship - b.friendship;
      if (sortMode === 'friendship_desc') return b.friendship - a.friendship;
      if (sortMode === 'strength_desc') {
        return VARIETY_CATALOG[b.variety].carryStrength - VARIETY_CATALOG[a.variety].carryStrength;
      }
      return getMemberSpeedFactor(a.variety, false) - getMemberSpeedFactor(b.variety, false);
    });
  }, [creatures, filterVariety, searchQuery, sortMode]);

  const selectedCreatures = useMemo(
    () =>
      selectedIds
        .map((id) => creatures.find((c) => c.id === id))
        .filter((c): c is DeGuaCreature => Boolean(c)),
    [selectedIds, creatures]
  );

  const liveEstimate = useMemo(
    () =>
      calculateExpeditionDuration(
        expedition.distanceMeters,
        expedition.requiredStrength,
        selectedCreatures
      ),
    [expedition.distanceMeters, expedition.requiredStrength, selectedCreatures]
  );

  const activeAssignedCreatures = useMemo(() => {
    const ids =
      expedition.assignedCreatureIds.length > 0
        ? expedition.assignedCreatureIds
        : targetGiftCreature
          ? [targetGiftCreature.id]
          : [];
    return ids
      .map((id) => creatures.find((c) => c.id === id))
      .filter((c): c is DeGuaCreature => Boolean(c));
  }, [expedition.assignedCreatureIds, creatures, targetGiftCreature]);

  const activeSnap = useMemo(
    () => getExpeditionProgressSnapshot(expedition, myLat, myLng, nowMs),
    [expedition, myLat, myLng, nowMs]
  );

  const followStartSnap = useMemo(
    () => getExpeditionProgressSnapshot(expedition, myLat, myLng, Date.now()),
    [phase === 'follow_crew', expedition.id]
  );

  const maxCarriers = expedition.maxCarriers ?? (expedition.kind === 'gift' ? 1 : 6);

  // 初始化上方定位地圖（Step 2 & Step 6A）
  useEffect(() => {
    if (phase !== 'inspect_available' && phase !== 'inspect_active') return;
    if (!mapContainerRef.current) return;

    const focusLat = phase === 'inspect_active' ? activeSnap.currentLat : expedition.lat;
    const focusLng = phase === 'inspect_active' ? activeSnap.currentLng : expedition.lng;

    const map = L.map(mapContainerRef.current, {
      center: [focusLat, focusLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });
    createRegionalOverviewTileLayer().addTo(map);
    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;

    const tid = window.setTimeout(() => map.invalidateSize({ animate: false }), 60);
    return () => {
      window.clearTimeout(tid);
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, [phase]);

  // 繪製地圖上的目標點、玩家定位與行進中的小隊標記
  useEffect(() => {
    const group = layerGroupRef.current;
    const map = mapRef.current;
    if (!group || !map) return;
    group.clearLayers();

    const originLat = expedition.originLat ?? myLat;
    const originLng = expedition.originLng ?? myLng;

    // 玩家起始藍點 + 小黃花
    const originIcon = L.divIcon({
      className: 'exp-detail-origin',
      html: `<div style="position:relative;width:44px;height:40px;transform:translate(-50%,-50%);pointer-events:none;">
        <div style="position:absolute;left:50%;top:64%;transform:translate(-50%,-50%);font-size:13px;letter-spacing:-3px;">🌼🌼</div>
        <div style="position:absolute;left:50%;top:36%;transform:translate(-50%,-50%);width:18px;height:18px;border-radius:50%;background:#3B82F6;border:3px solid #FFF;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
      </div>`,
      iconSize: [44, 40],
      iconAnchor: [22, 20]
    });
    L.marker([originLat, originLng], { icon: originIcon, interactive: false }).addTo(group);

    // 路徑虛線
    L.polyline(
      [
        [originLat, originLng],
        [expedition.lat, expedition.lng]
      ],
      {
        color: '#94A3B8',
        weight: 2.5,
        dashArray: '5 6',
        opacity: 0.85
      }
    ).addTo(group);

    // 目標物件 Pin
    const itemEmoji =
      expedition.kind === 'gift'
        ? '🎁'
        : expedition.kind === 'fruit'
          ? expedition.fruitEmoji || '🍏'
          : '🪴';

    const targetIcon = L.divIcon({
      className: 'exp-detail-target',
      html: `<div style="position:relative;width:46px;height:50px;transform:translate(-50%,-80%);display:flex;align-items:center;justify-content:center;pointer-events:none;">
        <div style="width:42px;height:42px;border-radius:50%;background:radial-gradient(circle, rgba(110,231,183,0.45), rgba(110,231,183,0));position:absolute;inset:0;"></div>
        <span style="font-size:30px;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.28));position:relative;">${itemEmoji}</span>
      </div>`,
      iconSize: [46, 50],
      iconAnchor: [23, 40]
    });
    L.marker([expedition.lat, expedition.lng], { icon: targetIcon, interactive: false }).addTo(group);

    // 若在進行中：繪製隊伍所在位置標記
    if (phase === 'inspect_active') {
      const lead = activeAssignedCreatures[0];
      const dotHex = lead ? VARIETY_CATALOG[lead.variety].bodyColor : '#FACC15';
      const crewPin = L.divIcon({
        className: 'exp-active-crew-pin',
        html: `<div style="width:32px;height:32px;border-radius:50%;background:${dotHex};border:3px solid #FFFFFF;box-shadow:0 3px 10px rgba(0,0,0,0.32);display:flex;align-items:center;justify-content:center;font-size:15px;transform:translate(-50%,-50%);">🍠</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      L.marker([activeSnap.currentLat, activeSnap.currentLng], {
        icon: crewPin,
        interactive: false,
        zIndexOffset: 500
      }).addTo(group);
    }
  }, [phase, expedition, myLat, myLng, activeSnap.currentLat, activeSnap.currentLng, activeAssignedCreatures]);

  const handleRecenterTopMap = () => {
    const map = mapRef.current;
    if (!map) return;
    if (phase === 'inspect_active') {
      map.setView([activeSnap.currentLat, activeSnap.currentLng], 14, { animate: true });
    } else {
      map.setView([expedition.lat, expedition.lng], 14, { animate: true });
    }
  };

  // Step 5 揮手道別自動結束
  useEffect(() => {
    if (phase !== 'farewell') return;
    const tid = window.setTimeout(() => {
      onClose();
    }, 2400);
    return () => window.clearTimeout(tid);
  }, [phase, onClose]);

  const handleToggleSelectCreature = (c: DeGuaCreature) => {
    if (c.busyState !== 'free') {
      showLimitToast('這顆地瓜球正在忙其他任務喔。');
      return;
    }
    if (expedition.kind === 'gift') {
      if (c.id !== expedition.targetCreatureId) {
        showLimitToast('專屬禮物只能由本人親自前往領取！');
      }
      return;
    }

    setSelectedIds((prev) => {
      if (prev.includes(c.id)) {
        return prev.filter((id) => id !== c.id);
      }
      if (prev.length >= maxCarriers) {
        showLimitToast(`這次探險最多可以派出${maxCarriers}顆地瓜球。`);
        return prev;
      }
      return [...prev, c.id];
    });
  };

  const handleAutoSelect = () => {
    if (expedition.kind === 'gift') return;
    const picked = autoSelectMinimumSquad(freeCreatures, expedition.requiredStrength, maxCarriers);
    if (picked.length === 0) {
      showLimitToast('目前沒有空閒的地瓜球可派出！');
      return;
    }
    setSelectedIds(picked);
  };

  const handlePressGo = () => {
    if (!liveEstimate.isValid || selectedIds.length === 0) {
      showLimitToast(`至少需要 ${expedition.requiredStrength} 點搬運力量才能出發！`);
      return;
    }
    if (
      expedition.kind === 'gift' &&
      targetGiftCreature &&
      targetGiftCreature.busyState !== 'free'
    ) {
      showLimitToast(`${targetGiftCreature.name} 目前正在忙碌中！`);
      return;
    }
    onDispatchCommit(expedition.id, selectedIds, liveEstimate);
    setPhase('farewell');
  };

  const decorMeta = expedition.seedlingDecor ? DECOR_CATALOG[expedition.seedlingDecor] : undefined;
  const decorSubsets = expedition.seedlingDecor
    ? DECOR_SUBSETS_CATALOG[expedition.seedlingDecor] || []
    : [];

  // ==================== Step 6B：全螢幕實景追蹤隊伍（散步 3D <-> 鳥瞰切換，與主地圖共享防卡限縮引擎） ====================
  if (phase === 'follow_crew') {
    const countdown = formatExpeditionDurationParts(activeSnap.remainingMs);
    const pct = Math.round(activeSnap.overallPct * 100);
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1320,
          background: '#62B656'
        }}
      >
        <FlowerMap
          mode="interactive"
          cameraPerspective={followPerspective}
          cameraBearing={followBearing}
          onBearingChange={setFollowBearing}
          onPerspectiveChange={setFollowPerspective}
          allowPinchPerspectiveSwitch={true}
          followCrewMode={true}
          followExpedition={expedition}
          followPayload={{
            kind: expedition.kind,
            variety: expedition.seedlingVariety,
            fruitEmoji: expedition.fruitEmoji,
            phase: activeSnap.phase
          }}
          myLat={followStartSnap.currentLat}
          myLng={followStartSnap.currentLng}
          isPlanting={isPlanting}
          activePetalColor={activePetalColor}
          squad={activeAssignedCreatures}
          flowers={flowers}
          worldDelta={worldDelta}
          bigFlowers={bigFlowers}
          mushrooms={mushrooms}
          activeExpeditions={[]}
        />

        {/* 右上角視角切換與指南針 */}
        <div
          style={{
            position: 'absolute',
            top: 'var(--top-safe-hud)',
            right: 16,
            zIndex: 550,
            display: 'flex',
            gap: 8,
            alignItems: 'center'
          }}
        >
          <button
            className="pikmin-glass-circle-btn"
            onClick={() =>
              setFollowPerspective((p) => (p === 'surround' ? 'overhead' : 'surround'))
            }
            style={{ width: 44, height: 44, fontSize: 18 }}
            title="切換散步／鳥瞰追蹤視角"
          >
            {followPerspective === 'surround' ? '🗺️' : '🚶'}
          </button>
        </div>

        {/* 底部白色進度浮卡（對照皮克敏圖 12 與圖 13） */}
        <div
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 'calc(max(2.1lvh, env(safe-area-inset-bottom) + 6px) + 64px)',
            zIndex: 540,
            background: 'rgba(255,255,255,0.96)',
            borderRadius: 18,
            padding: '12px 16px',
            boxShadow: '0 10px 26px rgba(15,23,42,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 14
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <ExpeditionItemArtwork exp={expedition} isDecorCompleted={false} size={52} showDecorBadge={false} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', lineHeight: 1.15 }}>
              {activeSnap.phase === 'completed' ? (
                '已抵達家門口！'
              ) : countdown.hours > 0 ? (
                <>
                  {countdown.hours}{' '}
                  <span style={{ fontSize: 13, fontWeight: 800 }}>小時</span>{' '}
                  {countdown.minutes}{' '}
                  <span style={{ fontSize: 13, fontWeight: 800 }}>分</span>
                </>
              ) : (
                <>
                  {countdown.minutes}{' '}
                  <span style={{ fontSize: 13, fontWeight: 800 }}>分</span>
                </>
              )}
            </div>
            <div
              style={{
                width: '100%',
                height: 4,
                borderRadius: 99,
                background: '#E2E8F0',
                margin: '7px 0 6px',
                position: 'relative',
                overflow: 'visible'
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  borderRadius: 99,
                  background: '#EF4444'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `${pct}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#DC2626'
                }}
              />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {expedition.placeName}（{activeSnap.phase === 'outbound' ? '空手前往中' : activeSnap.phase === 'inbound' ? '正搬運回來中' : '探險完成'}）
            </div>
          </div>
        </div>

        {/* 左下角 ✕ 返回詳細頁 */}
        <button
          className="pikmin-glass-circle-btn"
          onClick={() => setPhase('inspect_active')}
          style={{
            position: 'absolute',
            left: 'clamp(14px, 4vw, 18px)',
            bottom: 'max(2.1lvh, env(safe-area-inset-bottom) + 6px)',
            zIndex: 550,
            width: 'clamp(48px, 6.2lvh, 56px)',
            height: 'clamp(48px, 6.2lvh, 56px)'
          }}
          title="返回進行中探險"
        >
          <svg width="58%" height="58%" viewBox="0 0 24 24" fill="none">
            <path d="M5.5 5.5L18.5 18.5M18.5 5.5L5.5 18.5" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  }

  // ==================== Step 5：按下 GO 後在實景 3D 散步風景中背後目送整群小隊跑向遠方（對照圖 8，無說明文字框） ====================
  if (phase === 'farewell') {
    const walkerBackHtml = buildDirectionalWalkingPlayerSvg(0, 88, 128);
    const angleRad = Math.atan2(expedition.lng - myLng, expedition.lat - myLat);
    const farewellBearing = ((-angleRad * 180) / Math.PI + 360) % 360;
    const flockSlots = [
      { dx: -44, dy: -8, delay: 0.0 },
      { dx: 12, dy: -22, delay: 0.08 },
      { dx: -18, dy: 14, delay: 0.14 },
      { dx: 38, dy: 6, delay: 0.05 },
      { dx: -64, dy: 18, delay: 0.18 },
      { dx: 58, dy: 24, delay: 0.11 },
      { dx: -4, dy: -36, delay: 0.22 },
      { dx: 26, dy: 30, delay: 0.16 }
    ];

    return (
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1320,
          overflow: 'hidden',
          background: '#62B656'
        }}
      >
        {/* 背景直接使用 3D 散步實景街道視角，無頂端多餘文字彈框 */}
        <FlowerMap
          mode="interactive"
          cameraPerspective="surround"
          cameraBearing={farewellBearing}
          hidePlayerAvatar={true}
          myLat={myLat}
          myLng={myLng}
          isPlanting={isPlanting}
          activePetalColor={activePetalColor}
          squad={[]}
          flowers={flowers}
          worldDelta={worldDelta}
          bigFlowers={bigFlowers}
          mushrooms={mushrooms}
          activeExpeditions={[]}
        />

        {/* 一群 3D 透視地瓜球小隊由前景錯落簇擁向前方地平線遠奔（非排成橫線！） */}
        <div
          style={{
            position: 'absolute',
            left: '54%',
            bottom: '28%',
            width: 180,
            height: 220,
            transform: 'translateX(-50%)',
            zIndex: 440,
            pointerEvents: 'none'
          }}
        >
          {selectedCreatures.slice(0, 10).map((c, idx) => {
            const s = flockSlots[idx % flockSlots.length];
            const ringScale = 1 + Math.floor(idx / flockSlots.length) * 0.12;
            const spreadX = Math.round(s.dx * ringScale);
            const spreadY = Math.round(s.dy * ringScale);
            return (
              <div
                key={c.id}
                style={{
                  position: 'absolute',
                  left: `calc(50% + ${spreadX}px)`,
                  bottom: `${Math.max(0, 24 - spreadY)}px`,
                  transform: 'translate(-50%, 0)',
                  animation: `expRunAway3D 2.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${s.delay}s forwards`,
                  zIndex: 20 + Math.round(-spreadY)
                }}
              >
                <div className="degua-bounce" style={{ animationDelay: `${idx * 0.11}s` }}>
                  <DeGuaCharacter
                    variety={c.variety}
                    decor={c.decor}
                    leafStage={c.leafStage}
                    flowerColor={c.flowerColor}
                    showDecor={c.hasDecor}
                    size={54}
                    isBouncing={true}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* 前景左下方背對鏡頭的玩家目送小隊 */}
        <div
          style={{
            position: 'absolute',
            left: '28%',
            bottom: '13%',
            transform: 'translateX(-50%) scale(1.38)',
            zIndex: 450,
            pointerEvents: 'none'
          }}
          dangerouslySetInnerHTML={{ __html: walkerBackHtml }}
        />

        {/* 左下角 ✕ 略過返回 */}
        <button
          className="pikmin-glass-circle-btn"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            position: 'absolute',
            left: 'clamp(14px, 4vw, 18px)',
            bottom: 'max(2.1lvh, env(safe-area-inset-bottom) + 6px)',
            zIndex: 480,
            width: 'clamp(48px, 6.2lvh, 56px)',
            height: 'clamp(48px, 6.2lvh, 56px)'
          }}
          title="完成並返回"
        >
          <svg width="58%" height="58%" viewBox="0 0 24 24" fill="none">
            <path d="M5.5 5.5L18.5 18.5M18.5 5.5L5.5 18.5" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" />
          </svg>
        </button>

        <style>{`
          @keyframes expRunAway3D {
            0% {
              transform: translate(-50%, 0px) scale(1.05);
              opacity: 1;
            }
            65% {
              transform: translate(-50%, -155px) scale(0.54);
              opacity: 0.96;
            }
            100% {
              transform: translate(-50%, -250px) scale(0.28);
              opacity: 0;
            }
          }
        `}</style>
      </div>
    );
  }

  // ==================== Step 4：派出地瓜球選擇名單（對照圖 5 & 圖 7） ====================
  if (phase === 'select_squad') {
    const previewParts = formatExpeditionDurationParts(liveEstimate.totalMs);
    const assignedTotalStr = liveEstimate.totalStrength;
    const isStrengthEnough = assignedTotalStr >= expedition.requiredStrength;

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1310,
          background: 'rgba(226, 232, 240, 0.94)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end'
        }}
      >
        <div
          style={{
            height: '90%',
            background: '#FFFFFF',
            borderRadius: '28px 28px 0 0',
            boxShadow: '0 -12px 32px rgba(15,23,42,0.14)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {/* 頂端時間與行軍虛線預覽區 */}
          <div style={{ padding: '16px 18px 10px', textAlign: 'center', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748B' }}>距離回來還有</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#0F172A', marginTop: 2, lineHeight: 1.15 }}>
              {selectedCreatures.length === 0 ? (
                <span style={{ fontSize: 20, color: '#94A3B8' }}>請選擇要派出的地瓜球</span>
              ) : previewParts.hours > 0 ? (
                <>
                  {previewParts.hours}{' '}
                  <span style={{ fontSize: 14, fontWeight: 800 }}>小時</span>{' '}
                  {previewParts.minutes}{' '}
                  <span style={{ fontSize: 14, fontWeight: 800 }}>分</span>
                </>
              ) : (
                <>
                  {previewParts.minutes}{' '}
                  <span style={{ fontSize: 14, fontWeight: 800 }}>分</span>
                </>
              )}
            </div>

            {/* 選擇中小隊向右奔向目標物品 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                marginTop: 10,
                padding: '4px 6px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 72,
                  height: 44,
                  overflow: 'hidden'
                }}
              >
                {selectedCreatures.slice(0, 6).map((c, i) => (
                  <div key={c.id} style={{ marginLeft: i === 0 ? 0 : -14 }}>
                    <DeGuaCharacter
                      variety={c.variety}
                      decor={c.decor}
                      leafStage={c.leafStage}
                      flowerColor={c.flowerColor}
                      showDecor={c.hasDecor}
                      size={38}
                      isBouncing={true}
                    />
                  </div>
                ))}
              </div>

              <div
                style={{
                  flex: 1,
                  borderBottom: '2.5px dotted #CBD5E1',
                  height: 2
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <ExpeditionItemArtwork
                  exp={expedition}
                  isDecorCompleted={false}
                  size={48}
                  showDecorBadge={false}
                />
                <div style={{ textAlign: 'center', minWidth: 26 }}>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 900,
                      color: isStrengthEnough ? '#EA580C' : '#94A3B8',
                      lineHeight: 1.05
                    }}
                  >
                    {assignedTotalStr}
                  </div>
                  <div style={{ height: 2, background: '#334155', margin: '2px 0' }} />
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', lineHeight: 1.05 }}>
                    {expedition.requiredStrength}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', marginTop: 6 }}>
              {expedition.kind === 'gift'
                ? `專屬紀念禮物只能由 ${targetGiftCreature?.name || '主角'} 親自前往 (1/1)`
                : `可以選擇最多${maxCarriers}顆地瓜球 (${selectedIds.length}/${maxCarriers})`}
            </div>
            {liveEstimate.allWinged && selectedCreatures.length > 0 && (
              <div style={{ fontSize: 11, fontWeight: 800, color: '#DB2777', marginTop: 2 }}>
                🕊️ 純粉紅羽翅飛行小隊：5 倍超高速前往！
              </div>
            )}
          </div>

          {/* 搜尋 / 自動 / 排序 / 顏色篩選列 */}
          <div style={{ padding: '10px 14px 6px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
              <button
                onClick={() => setIsSearchOpen((v) => !v)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  border: '1.5px solid #CBD5E1',
                  background: isSearchOpen ? '#ECFDF5' : '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: 15,
                  flexShrink: 0
                }}
              >
                🔍
              </button>

              {expedition.kind !== 'gift' && (
                <button
                  onClick={handleAutoSelect}
                  style={{
                    borderRadius: 99,
                    border: '1.5px solid #94A3B8',
                    background: '#FFFFFF',
                    color: '#1E293B',
                    padding: '6px 14px',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  自動
                </button>
              )}

              <button
                onClick={() =>
                  setSortMode((m) =>
                    m === 'friendship_asc'
                      ? 'friendship_desc'
                      : m === 'friendship_desc'
                        ? 'strength_desc'
                        : m === 'strength_desc'
                          ? 'speed_desc'
                          : 'friendship_asc'
                  )
                }
                style={{
                  borderRadius: 99,
                  border: '1.5px solid #94A3B8',
                  background: '#FFFFFF',
                  color: '#1E293B',
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {sortMode === 'friendship_asc'
                  ? '友好度 ▲'
                  : sortMode === 'friendship_desc'
                    ? '友好度 ▼'
                    : sortMode === 'strength_desc'
                      ? '力量 ▼'
                      : '速度 ▼'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 4 }}>
                {VARIETY_DOT_COLORS.map((vd) => {
                  const active = filterVariety === vd.id;
                  return (
                    <button
                      key={vd.id}
                      onClick={() => setFilterVariety((prev) => (prev === vd.id ? null : vd.id))}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: active ? '2.5px solid #0F172A' : '1px solid #CBD5E1',
                        background: vd.hex,
                        cursor: 'pointer',
                        flexShrink: 0,
                        transform: active ? 'scale(1.18)' : 'none'
                      }}
                      title={VARIETY_CATALOG[vd.id].name}
                    />
                  );
                })}
              </div>
            </div>

            {isSearchOpen && (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋地瓜球名字或地點..."
                style={{
                  width: '100%',
                  borderRadius: 12,
                  border: '1.5px solid #CBD5E1',
                  padding: '7px 12px',
                  fontSize: 13,
                  outline: 'none'
                }}
              />
            )}
          </div>

          {/* 5 欄可選地瓜球卡片網格 */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '6px 12px 92px',
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 8,
              alignContent: 'start'
            }}
          >
            {filteredSortedCreatures.map((c) => {
              const isSelected = selectedIds.includes(c.id);
              const isBusy = c.busyState !== 'free';
              const isGiftWrongOne =
                expedition.kind === 'gift' && c.id !== expedition.targetCreatureId;
              const str = VARIETY_CATALOG[c.variety].carryStrength;

              return (
                <button
                  key={c.id}
                  onClick={() => handleToggleSelectCreature(c)}
                  style={{
                    background: isSelected ? '#FFFFFF' : '#F8FAFC',
                    borderRadius: 14,
                    padding: '6px 2px 7px',
                    border: isSelected ? '2px solid #F97316' : '1px solid #E2E8F0',
                    boxShadow: isSelected ? '0 4px 12px rgba(249,115,22,0.22)' : 'none',
                    opacity: isBusy || isGiftWrongOne ? 0.38 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  {str > 1 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 3,
                        right: 3,
                        fontSize: 9,
                        fontWeight: 900,
                        background: '#FEF3C7',
                        color: '#B45309',
                        borderRadius: 99,
                        padding: '0 4px'
                      }}
                    >
                      力{str}
                    </span>
                  )}

                  <DeGuaCharacter
                    variety={c.variety}
                    decor={c.decor}
                    leafStage={c.leafStage}
                    flowerColor={c.flowerColor}
                    showDecor={c.hasDecor}
                    size={44}
                    isBouncing={isSelected}
                  />

                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#334155',
                      maxWidth: '94%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {isBusy ? '探險中' : c.name}
                  </div>

                  <CreatureHeartsRow friendship={c.friendship} heartSize={9} />
                </button>
              );
            })}
          </div>

          {/* 達上限提示浮窗（對照圖 7：「這次探險最多可以派出X隻皮克敏。」） */}
          {limitToast && (
            <div
              style={{
                position: 'absolute',
                left: 20,
                right: 20,
                bottom: 84,
                zIndex: 40,
                background: 'rgba(15, 23, 42, 0.86)',
                color: '#FFFFFF',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13.5,
                fontWeight: 800,
                textAlign: 'center',
                boxShadow: '0 8px 20px rgba(0,0,0,0.25)'
              }}
            >
              {limitToast}
            </div>
          )}

          {/* 底部左：取消 ｜ 底部右：GO */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              padding: '12px 18px max(18px, env(safe-area-inset-bottom))',
              background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.96) 28%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pointerEvents: 'none'
            }}
          >
            <button
              onClick={() => setPhase('inspect_available')}
              style={{
                pointerEvents: 'auto',
                borderRadius: 99,
                border: '1.5px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
                padding: '11px 28px',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.12)'
              }}
            >
              取消
            </button>

            <button
              onClick={handlePressGo}
              style={{
                pointerEvents: 'auto',
                width: 72,
                height: 72,
                borderRadius: '50%',
                border: '2.5px solid rgba(255,255,255,0.85)',
                background:
                  isStrengthEnough && selectedCreatures.length > 0
                    ? 'linear-gradient(135deg, #FDBA74 0%, #FB7185 100%)'
                    : 'linear-gradient(135deg, #CBD5E1 0%, #94A3B8 100%)',
                color: '#FFFFFF',
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: 1,
                cursor: 'pointer',
                boxShadow:
                  isStrengthEnough && selectedCreatures.length > 0
                    ? '0 8px 22px rgba(251, 113, 133, 0.45)'
                    : '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              GO
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== Step 2 & 3（未派出詳情）＋ Step 6A（進行中詳情：查看情況與中止） ====================
  const isActiveMode = phase === 'inspect_active';
  const remainingParts = formatExpeditionDurationParts(activeSnap.remainingMs);
  const completedReady = isActiveMode && activeSnap.phase === 'completed';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        background: '#FAFBF9'
      }}
    >
      {/* 上方區域地圖與目標位置 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: `${Math.max(16, 100 - sheetHeightPct + 5)}%`
        }}
      >
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        <button
          className="pikmin-glass-circle-btn"
          onClick={handleRecenterTopMap}
          style={{
            position: 'absolute',
            right: 16,
            bottom: 22,
            zIndex: 450,
            width: 44,
            height: 44,
            background: 'rgba(255,255,255,0.92)'
          }}
          title="重新對準目標位置"
        >
          <svg width="74%" height="74%" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="5" stroke="#1E293B" strokeWidth="2.2" />
            <circle cx="12" cy="12" r="1.8" fill="#1E293B" />
            <path d="M12 2V5.5M12 18.5V22M2 12H5.5M18.5 12H22" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* 下方白色可上滑詳情面板 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: `${sheetHeightPct}%`,
          transition: isDraggingSheet ? 'none' : 'height 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
          background: '#FFFFFF',
          borderRadius: '26px 26px 0 0',
          boxShadow: '0 -10px 30px rgba(15,23,42,0.12)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 480
        }}
      >
        {/* 可上下拖拽切換半展開 / 完整展開的手柄列 */}
        <div
          onPointerDown={(e) => {
            sheetDragRef.current = { active: true, startY: e.clientY, startPct: sheetHeightPct };
            setIsDraggingSheet(true);
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!sheetDragRef.current.active) return;
            const deltaPct = ((sheetDragRef.current.startY - e.clientY) / window.innerHeight) * 100;
            setSheetHeightPct(Math.max(48, Math.min(92, sheetDragRef.current.startPct + deltaPct)));
          }}
          onPointerUp={() => {
            sheetDragRef.current.active = false;
            setIsDraggingSheet(false);
          }}
          style={{
            padding: '12px 0 8px',
            display: 'flex',
            justifyContent: 'center',
            cursor: 'ns-resize',
            touchAction: 'none',
            flexShrink: 0
          }}
        >
          <div style={{ width: 42, height: 4.5, borderRadius: 99, background: '#CBD5E1' }} />
        </div>

        {/* 主滾動內容（向上滑動即展開高度並完整顯示重量與花苗圖鑑） */}
        <div
          onScroll={(e) => {
            const top = (e.currentTarget as HTMLDivElement).scrollTop;
            if (top > 18 && sheetHeightPct < 86) {
              setSheetHeightPct(88);
            }
          }}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '6px 20px 104px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          {/* A. 進行中模式上方倒數與行進進度條（對照圖 11） */}
          {isActiveMode ? (
            <div style={{ width: '100%', textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748B' }}>距離回來還有</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#0F172A', marginTop: 2 }}>
                {completedReady ? (
                  '已抵達口哨花園！'
                ) : remainingParts.hours > 0 ? (
                  <>
                    {remainingParts.hours}{' '}
                    <span style={{ fontSize: 15, fontWeight: 800 }}>小時</span>{' '}
                    {remainingParts.minutes}{' '}
                    <span style={{ fontSize: 15, fontWeight: 800 }}>分</span>
                  </>
                ) : (
                  <>
                    {remainingParts.minutes}{' '}
                    <span style={{ fontSize: 15, fontWeight: 800 }}>分</span>
                  </>
                )}
              </div>

              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 60,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 10,
                  padding: '0 6px'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 16,
                    right: 78,
                    top: '55%',
                    borderBottom: '2.5px dotted #CBD5E1'
                  }}
                />
                {/* 動態依目前進度條位置呈現小隊 */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${Math.min(72, Math.max(8, Math.round(activeSnap.overallPct * 70)))}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    alignItems: 'center',
                    zIndex: 4
                  }}
                >
                  {activeAssignedCreatures.slice(0, 5).map((c, idx) => (
                    <div key={c.id} style={{ marginLeft: idx === 0 ? 0 : -14 }}>
                      <DeGuaCharacter
                        variety={c.variety}
                        decor={c.decor}
                        leafStage={c.leafStage}
                        flowerColor={c.flowerColor}
                        showDecor={c.hasDecor}
                        size={40}
                        isBouncing={true}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, zIndex: 5 }}>
                  <ExpeditionItemArtwork exp={expedition} isDecorCompleted={false} size={52} showDecorBadge={false} />
                  <div style={{ textAlign: 'center', minWidth: 22 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#EA580C', lineHeight: 1.05 }}>
                      {activeAssignedCreatures.length}
                    </div>
                    <div style={{ height: 2, background: '#334155', margin: '2px 0' }} />
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', lineHeight: 1.05 }}>
                      {expedition.requiredStrength}
                    </div>
                  </div>
                </div>
              </div>

              {completedReady ? (
                <button
                  onClick={() => onClaimCompletedExpedition(expedition.id)}
                  style={{
                    marginTop: 10,
                    borderRadius: 99,
                    border: 'none',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: '#FFFFFF',
                    padding: '11px 28px',
                    fontSize: 15,
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 6px 16px rgba(5,150,105,0.3)'
                  }}
                >
                  前往口哨花園收成！
                </button>
              ) : (
                <button
                  onClick={() => setPhase('follow_crew')}
                  style={{
                    marginTop: 10,
                    borderRadius: 99,
                    border: '1.5px solid #3E9A8C',
                    background: '#FFFFFF',
                    color: '#2B8A78',
                    padding: '9px 26px',
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  查看地瓜球的情況
                </button>
              )}
            </div>
          ) : (
            /* B. 未派出目標展示區（花苗／水果／禮物 + 後方黃色/灰色飾品分類 + 前往探險鈕，對照圖 1） */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ margin: '4px 0 14px' }}>
                <ExpeditionItemArtwork
                  exp={expedition}
                  isDecorCompleted={isDecorCompleted}
                  size={92}
                  showDecorBadge={expedition.kind !== 'fruit'}
                />
              </div>

              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#475569', marginBottom: 10 }}>
                {expedition.kind === 'gift'
                  ? `讓 ${targetGiftCreature?.name || '這顆地瓜球'} 回出生地領取專屬飾品！`
                  : '派地瓜球出去探險吧！'}
              </div>

              <button
                onClick={() => setPhase('select_squad')}
                style={{
                  borderRadius: 99,
                  border: '1.6px solid #3E9A8C',
                  background: '#FFFFFF',
                  color: '#2B8A78',
                  padding: '9px 32px',
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                前往探險
              </button>
            </div>
          )}

          {/* 標題（如：白色瓜糰 / 青蘋果 / 紅色禮品） */}
          <div style={{ fontSize: 25, fontWeight: 900, color: '#334155', marginBottom: 14, textAlign: 'center' }}>
            {expedition.title}
          </div>

          {/* 完整資訊方框卡片（距離、發現地、發現日、剩餘可探險時間、重量） */}
          <div
            style={{
              width: '100%',
              border: '1.5px solid #E2E8F0',
              borderRadius: 16,
              padding: '14px 16px',
              background: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              gap: 11
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
                <span style={{ transform: 'rotate(45deg)', fontSize: 15 }}>
                  {expedition.kind === 'fruit'
                    ? expedition.fruitEmoji || '🍏'
                    : decorMeta?.icon || '🏷️'}
                </span>
              </div>
              <div style={{ minWidth: 0 }}>
                {expedition.kind !== 'fruit' && (
                  <div style={{ fontSize: 13.5, fontWeight: 900, marginBottom: 2 }}>
                    <span style={{ color: '#DC2626' }}>{decorMeta?.placeCategory || '路邊'}</span>
                    <span style={{ color: '#94A3B8', margin: '0 5px' }}>/</span>
                    <span style={{ color: '#84A341' }}>
                      {decorSubsets[0]?.setName || decorMeta?.name || '飾品'}
                    </span>
                  </div>
                )}
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#334155' }}>
                  距離：{expedition.distanceMeters.toLocaleString()}m，{expedition.placeName}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 4 }}>
              <span style={{ fontSize: 18, color: '#64748B' }}>📅</span>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#334155' }}>
                發現日：　{formatExpeditionDateZh(expedition.discoveredAt)}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 4 }}>
              <span style={{ fontSize: 18, color: '#64748B' }}>⏱️</span>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#334155' }}>
                剩餘時間：　{formatRemainingExpeditionWindow(expedition.expiresAt, nowMs)}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 4 }}>
              <span style={{ fontSize: 18, color: '#64748B' }}>⚖️</span>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#334155' }}>
                重量：　{expedition.weightGrams || 65}克
              </div>
            </div>
          </div>

          {/* 禮物專屬主角卡（不含圖鑑！對照使用者規格：禮物不顯示圖鑑） */}
          {expedition.kind === 'gift' && targetGiftCreature && (
            <div
              style={{
                width: '100%',
                marginTop: 14,
                borderRadius: 16,
                border: '1.5px solid #FDE68A',
                background: '#FFFBEB',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}
            >
              <DeGuaCharacter
                variety={targetGiftCreature.variety}
                decor={targetGiftCreature.decor}
                leafStage={targetGiftCreature.leafStage}
                flowerColor={targetGiftCreature.flowerColor}
                showDecor={false}
                size={52}
                isBouncing={false}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#92400E' }}>
                  {targetGiftCreature.name}（專屬出生地禮物）
                </div>
                <div style={{ marginTop: 3 }}>
                  <CreatureHeartsRow friendship={targetGiftCreature.friendship} heartSize={12} />
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#B45309', marginTop: 3 }}>
                  僅此地瓜球可單獨前往領回「{decorMeta?.placeCategory}」飾品
                </div>
              </div>
            </div>
          )}

          {/* 瓜糰（花苗）專屬完整飾品圖鑑卡（水果與禮物不顯示圖鑑！對照圖 2） */}
          {expedition.kind === 'seedling' && expedition.seedlingDecor && decorMeta && (
            <div
              style={{
                width: '100%',
                marginTop: 14,
                border: '2px solid #EFE4BA',
                borderRadius: 18,
                padding: '14px 12px 18px',
                background: '#FFFDF7',
                display: 'flex',
                flexDirection: 'column',
                gap: 14
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <DecorSilhouetteBadge
                    decor={expedition.seedlingDecor}
                    isCompleted={isDecorCompleted}
                    size={40}
                  />
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#334155' }}>
                    {decorMeta.placeCategory}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    padding: '3px 10px',
                    borderRadius: 99,
                    background: isDecorCompleted ? '#FEF08A' : '#F1F5F9',
                    color: isDecorCompleted ? '#A16207' : '#64748B'
                  }}
                >
                  {isDecorCompleted ? '★ 此色飾品已集滿' : '尚未集滿'}
                </span>
              </div>

              {decorSubsets.map((sub) => {
                const list = sub.varieties || ALL_VARIETIES;
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
                            c.decor === expedition.seedlingDecor &&
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
                              decor={expedition.seedlingDecor!}
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
                        fontSize: 11.5,
                        fontWeight: 800,
                        color: sub.isRare ? '#D97706' : '#64748B',
                        textAlign: 'center'
                      }}
                    >
                      {sub.emoji} {sub.setName}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 進行中詳情正下方「中止」浮動鈕（對照圖 11） */}
        {isActiveMode && !completedReady && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: 'max(2.1lvh, env(safe-area-inset-bottom) + 6px)',
              zIndex: 520
            }}
          >
            <button
              onClick={() => {
                onCancelExpedition(expedition.id);
                onClose();
              }}
              style={{
                borderRadius: 99,
                border: '1.5px solid #CBD5E1',
                background: 'rgba(255,255,255,0.96)',
                color: '#334155',
                padding: '10px 26px',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(0,0,0,0.14)'
              }}
            >
              中止
            </button>
          </div>
        )}

        {/* 左下角統一光澤 ✕ 返回探險列表 */}
        <button
          className="pikmin-glass-circle-btn"
          onClick={onClose}
          style={{
            position: 'absolute',
            left: 'clamp(14px, 4vw, 18px)',
            bottom: 'max(2.1lvh, env(safe-area-inset-bottom) + 6px)',
            zIndex: 520,
            width: 'clamp(48px, 6.2lvh, 56px)',
            height: 'clamp(48px, 6.2lvh, 56px)'
          }}
          title="返回探險列表"
        >
          <svg width="58%" height="58%" viewBox="0 0 24 24" fill="none">
            <path d="M5.5 5.5L18.5 18.5M18.5 5.5L5.5 18.5" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
};
