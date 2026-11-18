import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BigFlowerNode,
  calculateCreatureMushroomPower,
  createStarterNectarInventory,
  createStarterPetalInventory,
  DecorCategory,
  DECOR_CATALOG,
  DeGuaCreature,
  ExpeditionItem,
  getPetalVariantMeta,
  MushroomNode,
  PetalColor,
  PETAL_META,
  PlantedFlowerCell,
  PostcardItem,
  PrivacyZoneSetting,
  Seedling,
  VARIETY_CATALOG
} from './types/game';
import {
  requestAllPermissions,
  setNativeBackgroundPlanting,
  syncSeedlingsToNative,
  triggerSeedlingReadyNotification
} from './bridge/iosNativeBridge';
import {
  getDeterministicWorldAround,
  loadLocalWorldState,
  syncWorldStateWithCloud,
  triggerDetectorScan,
  WorldDeltaState
} from './services/worldSyncService';
import { DeGuaCharacter } from './components/DeGuaCharacter';
import { FlowerMap } from './components/FlowerMap';
import {
  fetchNearbyPlaceLabels,
  onRealLandmarksUpdated,
  searchTaiwanPlaceCoordinates
} from './services/realMapService';
import { GardenWhistleView } from './components/GardenWhistleView';
import { FlowerPlantingModal, GlassPetalJarSvg } from './components/FlowerPlantingModal';
import {
  PlantingMapHudOverlay,
  PlantingSessionSummaryData,
  PlantingSummaryModal
} from './components/PlantingOverlayAndSummary';
import { PlanterPackModal } from './components/PlanterPackModal';
import {
  applyWalkingStepsToLifecycle,
  createInitialDailyLifecycleState,
  DailyLifecycleState,
  feedNectarToSquad,
  getGameDayKey,
  harvestCreatureFlower,
  reconcileCreatureLifecycle
} from './services/pikminLifecycleService';
import {
  CellCooldownRecord,
  computeEarnedCoinDelta,
  getPlantingFootprintForSquad,
  stampFlowerFootprint
} from './services/flowerPlantingEngine';
import {
  DetectorModal,
  ExpeditionsModal,
  MushroomBattleModal
} from './components/ExpeditionAndRaidModals';
import {
  DailyLifelogModal,
  DecorCollectionModal,
  FriendsAndWorldModal,
  MushroomGuideModal,
  NotificationsModal,
  ProfileAndMenuModal,
  ShopModal
} from './components/HomeFeatureModals';

const INITIAL_SEEDLINGS: Seedling[] = [
  {
    id: 'seed_1',
    variety: 'red',
    decor: 'bubble_tea',
    isHuge: false,
    placeName: '巷口 50嵐手搖飲',
    lat: 25.0332,
    lng: 121.5356,
    currentSteps: 850,
    targetSteps: 1000,
    slotIndex: 0,
    isReady: false,
    notified: false,
    discoveredAt: Date.now() - 3600_000
  },
  {
    id: 'seed_2',
    variety: 'yellow',
    decor: 'convenience',
    isHuge: false,
    placeName: '轉角 7-ELEVEN',
    lat: 25.0328,
    lng: 121.5351,
    currentSteps: 690,
    targetSteps: 1000,
    slotIndex: 1,
    isReady: false,
    notified: false,
    discoveredAt: Date.now() - 2400_000
  },
  {
    id: 'seed_3',
    variety: 'purple',
    decor: 'bakery',
    isHuge: false,
    placeName: '老街手工烘焙坊',
    lat: 25.0336,
    lng: 121.5349,
    currentSteps: 0,
    targetSteps: 3000,
    slotIndex: null,
    isReady: false,
    notified: false,
    discoveredAt: Date.now() - 1200_000
  },
  {
    id: 'seed_4',
    variety: 'winged',
    decor: 'night_market',
    isHuge: true,
    placeName: '夜市黃金地瓜球總攤',
    lat: 25.0325,
    lng: 121.5362,
    currentSteps: 0,
    targetSteps: 10000,
    slotIndex: null,
    isReady: false,
    notified: false,
    discoveredAt: Date.now() - 600_000
  }
];

const INITIAL_CREATURES: DeGuaCreature[] = [
  {
    id: 'dg_1',
    name: '紅梅一號',
    variety: 'red',
    decor: 'bubble_tea',
    placeName: '忠孝手搖茶飲店',
    lat: 25.0331,
    lng: 121.5355,
    friendship: 400,
    hasDecor: true,
    giftExpeditionCreated: true,
    leafStage: 'flower',
    flowerColor: 'red',
    pluckCountToday: 0,
    inSquad: true,
    busyState: 'free',
    createdAt: Date.now() - 90000_000
  },
  {
    id: 'dg_2',
    name: '黃金阿Q',
    variety: 'yellow',
    decor: 'convenience',
    placeName: '巷口全家超商',
    lat: 25.0329,
    lng: 121.5352,
    friendship: 350,
    hasDecor: false,
    giftExpeditionCreated: false,
    leafStage: 'leaf',
    flowerColor: 'yellow',
    pluckCountToday: 0,
    inSquad: true,
    busyState: 'free',
    createdAt: Date.now() - 70000_000
  },
  {
    id: 'dg_3',
    name: '蝶豆小藍',
    variety: 'blue',
    decor: 'park',
    placeName: '大安森林公園',
    lat: 25.0334,
    lng: 121.5358,
    friendship: 200,
    hasDecor: false,
    giftExpeditionCreated: false,
    leafStage: 'flower',
    flowerColor: 'blue',
    pluckCountToday: 0,
    inSquad: true,
    busyState: 'free',
    createdAt: Date.now() - 50000_000
  },
  {
    id: 'dg_4',
    name: '紫薯力王',
    variety: 'purple',
    decor: 'night_market',
    placeName: '夜市廟口地瓜球',
    lat: 25.0327,
    lng: 121.5348,
    friendship: 400,
    hasDecor: true,
    giftExpeditionCreated: true,
    leafStage: 'bud',
    flowerColor: 'white',
    pluckCountToday: 0,
    inSquad: true,
    busyState: 'free',
    createdAt: Date.now() - 40000_000
  },
  {
    id: 'dg_5',
    name: '竹炭硬漢',
    variety: 'rock',
    decor: 'station',
    placeName: '捷運站出口廣場',
    lat: 25.0335,
    lng: 121.5350,
    friendship: 150,
    hasDecor: false,
    giftExpeditionCreated: false,
    leafStage: 'leaf',
    flowerColor: 'white',
    pluckCountToday: 0,
    inSquad: true,
    busyState: 'free',
    createdAt: Date.now() - 20000_000
  }
];

const INITIAL_EXPEDITIONS: ExpeditionItem[] = [
  {
    id: 'exp_init_1',
    kind: 'seedling',
    title: '野生瓜糰',
    placeName: '街角手搖茶飲店 附近',
    lat: 25.0324,
    lng: 121.5347,
    distanceMeters: 95,
    requiredStrength: 1,
    seedlingVariety: 'winged',
    seedlingDecor: 'bubble_tea',
    seedlingIsHuge: false,
    status: 'available',
    assignedCreatureIds: []
  },
  {
    id: 'exp_init_2',
    kind: 'fruit',
    title: '屏東四季檸檬',
    placeName: '散步公園步道 附近',
    lat: 25.0338,
    lng: 121.5362,
    distanceMeters: 120,
    requiredStrength: 2,
    fruitEmoji: '🍋',
    fruitName: '屏東四季檸檬',
    nectarColor: 'yellow',
    nectarAmount: 20,
    status: 'available',
    assignedCreatureIds: []
  }
];

export const App: React.FC = () => {
  // 玩家名稱、等級與共同世界設定
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('dg_player_name_v2') || '芝麻丸';
  });
  const [playerLevel, setPlayerLevel] = useState<number>(() => {
    return Number(localStorage.getItem('dg_player_level_v2') || '20');
  });
  const [coins, setCoins] = useState<number>(() => {
    return Number(localStorage.getItem('dg_coins_v2') || '180');
  });
  const [worldKey, setWorldKey] = useState<string>(() => {
    return localStorage.getItem('dg_world_key_v2') || 'TAIWAN-WORLD-1';
  });
  const [cloudUrl, setCloudUrl] = useState<string>(() => {
    return localStorage.getItem('dg_cloud_url_v2') || '';
  });

  // 今日步數與目前 GPS 座標
  const [todaySteps, setTodaySteps] = useState<number>(() => {
    return Number(localStorage.getItem('dg_steps_v2') || '3781');
  });
  const [myLat, setMyLat] = useState<number>(() => {
    const saved = Number(localStorage.getItem('dg_user_confirmed_lat_v5'));
    return Number.isFinite(saved) && saved > 20 && saved < 27 ? saved : 25.0553;
  });
  const [myLng, setMyLng] = useState<number>(() => {
    const saved = Number(localStorage.getItem('dg_user_confirmed_lng_v5'));
    return Number.isFinite(saved) && saved > 118 && saved < 123 ? saved : 121.5204;
  });
  const [recenterSeq, setRecenterSeq] = useState<number>(0);

  // 任務進度：摧毀 3 朵蘑菇
  const [mushroomsDestroyed, setMushroomsDestroyed] = useState<number>(() => {
    return Number(localStorage.getItem('dg_mush_destroyed_v2') || '2');
  });
  const [missionTarget, setMissionTarget] = useState<number>(3);

  // 每日紀錄 (Lifelog) 本週心情印章
  const [dailyMoods, setDailyMoods] = useState<Record<number, string>>({
    1: '😊',
    2: '🧋',
    3: '😊',
    4: '🍱',
    5: '😊'
  });

  // 種花模式與本次種花計數（對照皮克敏：支援全花卉品種、5 分鐘格冷卻、15 分鐘加速、250 朵換 1 金幣）
  const [isPlanting, setIsPlanting] = useState<boolean>(false);
  const [showPlantingDrawer, setShowPlantingDrawer] = useState<boolean>(false);
  const [activePetalVariantId, setActivePetalVariantId] = useState<string>(() => {
    return localStorage.getItem('dg_active_petal_variant_v1') || 'daisy_yellow';
  });
  const activePetalVariant = getPetalVariantMeta(activePetalVariantId);
  const activePetalColor = activePetalVariant.color;

  const [selectedNectar, setSelectedNectar] = useState<PetalColor>('yellow');
  const [sessionPlantedCount, setSessionPlantedCount] = useState<number>(0);
  const [sessionCoinsEarned, setSessionCoinsEarned] = useState<number>(0);
  const [plantingBanner, setPlantingBanner] = useState<string | null>(null);
  const [plantingSummary, setPlantingSummary] = useState<PlantingSessionSummaryData | null>(null);

  const [isWithOthers, setIsWithOthers] = useState<boolean>(false);
  const [accelCount, setAccelCount] = useState<number>(2);
  const [accelExpiresAt, setAccelExpiresAt] = useState<number | null>(null);
  const [accelSecondsLeft, setAccelSecondsLeft] = useState<number>(0);
  const isAccelActive = accelExpiresAt !== null && accelSecondsLeft > 0;

  // 全花種花瓣與精華庫存（基礎 4 色無縫同步至 petalJar / nectarJar 供花園與商店使用）
  const [nectarInventory, setNectarInventory] = useState<Record<string, number>>(() => {
    const baseDefaults = createStarterNectarInventory();
    try {
      const raw = localStorage.getItem('dg_nectar_inventory_v1');
      if (raw) {
        return { ...baseDefaults, ...(JSON.parse(raw) as Record<string, number>) };
      }
      const legacy = localStorage.getItem('dg_nectar_jar_v1');
      if (legacy) {
        const l = JSON.parse(legacy) as Record<PetalColor, number>;
        return {
          ...baseDefaults,
          daisy_white: l.white ?? baseDefaults.daisy_white,
          daisy_yellow: l.yellow ?? baseDefaults.daisy_yellow,
          daisy_red: l.red ?? baseDefaults.daisy_red,
          daisy_blue: l.blue ?? baseDefaults.daisy_blue
        };
      }
    } catch {
      // ignore
    }
    return baseDefaults;
  });

  const [petalInventory, setPetalInventory] = useState<Record<string, number>>(() => {
    const baseDefaults = createStarterPetalInventory();
    try {
      const raw = localStorage.getItem('dg_petal_inventory_v1');
      if (raw) {
        return { ...baseDefaults, ...(JSON.parse(raw) as Record<string, number>) };
      }
      const legacy = localStorage.getItem('dg_petal_jar_v1');
      if (legacy) {
        const l = JSON.parse(legacy) as Record<PetalColor, number>;
        return {
          ...baseDefaults,
          daisy_white: l.white ?? baseDefaults.daisy_white,
          daisy_yellow: l.yellow ?? baseDefaults.daisy_yellow,
          daisy_red: l.red ?? baseDefaults.daisy_red,
          daisy_blue: l.blue ?? baseDefaults.daisy_blue
        };
      }
    } catch {
      // ignore
    }
    return baseDefaults;
  });

  const nectarJar = useMemo<Record<PetalColor, number>>(
    () => ({
      white: nectarInventory.daisy_white ?? 0,
      yellow: nectarInventory.daisy_yellow ?? 0,
      red: nectarInventory.daisy_red ?? 0,
      blue: nectarInventory.daisy_blue ?? 0
    }),
    [nectarInventory]
  );

  const petalJar = useMemo<Record<PetalColor, number>>(
    () => ({
      white: petalInventory.daisy_white ?? 0,
      yellow: petalInventory.daisy_yellow ?? 0,
      red: petalInventory.daisy_red ?? 0,
      blue: petalInventory.daisy_blue ?? 0
    }),
    [petalInventory]
  );

  const setNectarJar = (updater: React.SetStateAction<Record<PetalColor, number>>) => {
    setNectarInventory((prevInv) => {
      const prevBase: Record<PetalColor, number> = {
        white: prevInv.daisy_white ?? 0,
        yellow: prevInv.daisy_yellow ?? 0,
        red: prevInv.daisy_red ?? 0,
        blue: prevInv.daisy_blue ?? 0
      };
      const nextBase = typeof updater === 'function' ? updater(prevBase) : updater;
      return {
        ...prevInv,
        daisy_white: nextBase.white,
        daisy_yellow: nextBase.yellow,
        daisy_red: nextBase.red,
        daisy_blue: nextBase.blue
      };
    });
  };

  const setPetalJar = (updater: React.SetStateAction<Record<PetalColor, number>>) => {
    setPetalInventory((prevInv) => {
      const prevBase: Record<PetalColor, number> = {
        white: prevInv.daisy_white ?? 0,
        yellow: prevInv.daisy_yellow ?? 0,
        red: prevInv.daisy_red ?? 0,
        blue: prevInv.daisy_blue ?? 0
      };
      const nextBase = typeof updater === 'function' ? updater(prevBase) : updater;
      return {
        ...prevInv,
        daisy_white: nextBase.white,
        daisy_yellow: nextBase.yellow,
        daisy_red: nextBase.red,
        daisy_blue: nextBase.blue
      };
    });
  };

  // 5 分鐘方格冷卻、每日種花金幣上限與隱私區域設定
  const [cellCooldowns, setCellCooldowns] = useState<Record<string, CellCooldownRecord>>(() => {
    try {
      const raw = localStorage.getItem('dg_planted_cell_cooldowns_v1');
      if (raw) return JSON.parse(raw) as Record<string, CellCooldownRecord>;
    } catch {
      // ignore
    }
    return {};
  });
  const [dailyCoinsState, setDailyCoinsState] = useState<{ dayKey: string; coins: number }>(() => {
    const todayKey = getGameDayKey(Date.now());
    try {
      const raw = localStorage.getItem('dg_daily_coins_v1');
      if (raw) {
        const parsed = JSON.parse(raw) as { dayKey: string; coins: number };
        if (parsed.dayKey === todayKey) return parsed;
      }
    } catch {
      // ignore
    }
    return { dayKey: todayKey, coins: 0 };
  });
  const [privacyZone, setPrivacyZone] = useState<PrivacyZoneSetting>(() => {
    try {
      const raw = localStorage.getItem('dg_privacy_zone_v1');
      if (raw) return JSON.parse(raw) as PrivacyZoneSetting;
    } catch {
      // ignore
    }
    return { enabled: false, lat: myLat, lng: myLng, radiusMeters: 150 };
  });

  // 瓜糰、地瓜球、每日生命週期狀態（凌晨 4 點重置 / 8 小時變花苞 / 步數結苞 / 21:00~04:00 鎖定）
  const [seedlings, setSeedlings] = useState<Seedling[]>(() => {
    const raw = localStorage.getItem('dg_seedlings_v2');
    return raw ? (JSON.parse(raw) as Seedling[]) : INITIAL_SEEDLINGS;
  });
  const [dailyLifecycle, setDailyLifecycle] = useState<DailyLifecycleState>(() => {
    try {
      const raw = localStorage.getItem('dg_daily_lifecycle_v1');
      if (raw) return JSON.parse(raw) as DailyLifecycleState;
    } catch {
      // ignore
    }
    return createInitialDailyLifecycleState(Date.now());
  });
  const [creatures, setCreatures] = useState<DeGuaCreature[]>(() => {
    const raw = localStorage.getItem('dg_creatures_v2');
    return raw ? (JSON.parse(raw) as DeGuaCreature[]) : INITIAL_CREATURES;
  });
  const creaturesRef = useRef<DeGuaCreature[]>(creatures);
  creaturesRef.current = creatures;
  const dailyLifecycleRef = useRef<DailyLifecycleState>(dailyLifecycle);
  dailyLifecycleRef.current = dailyLifecycle;
  const [expeditions, setExpeditions] = useState<ExpeditionItem[]>(() => {
    const raw = localStorage.getItem('dg_expeditions_v2');
    return raw ? (JSON.parse(raw) as ExpeditionItem[]) : INITIAL_EXPEDITIONS;
  });
  const [postcards, setPostcards] = useState<PostcardItem[]>(() => {
    const raw = localStorage.getItem('dg_postcards_v2');
    return raw ? (JSON.parse(raw) as PostcardItem[]) : [];
  });
  const [activityLogs, setActivityLogs] = useState<string[]>([
    '🍠 歡迎來到地瓜球 DeGuaChill！帶著手機散步就能自動油炸瓜糰與種花！',
    '🧋 在「巷口 50嵐手搖飲」附近發現了紅色瓜糰！',
    '🍄 世界地圖上的蘑菇與大花已與共同世界同步！'
  ]);

  // 世界同步狀態（花海、大花盛開數、蘑菇血量與參戰者）
  const [worldDelta, setWorldDelta] = useState<WorldDeltaState>(() => loadLocalWorldState());

  // 畫面開啟狀態與互動地圖視角切換 ('surround' 周圍視角 vs 'overhead' 俯瞰視角)
  const [isDecorModalOpen, setIsDecorModalOpen] = useState<boolean>(false);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState<boolean>(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState<boolean>(false);
  const [isInteractiveMapOpen, setIsInteractiveMapOpen] = useState<boolean>(false);
  const [mapPerspective, setMapPerspective] = useState<'surround' | 'overhead'>('surround');
  const [mapBearing, setMapBearing] = useState<number>(0);
  const [isLifelogModalOpen, setIsLifelogModalOpen] = useState<boolean>(false);
  const [isShopModalOpen, setIsShopModalOpen] = useState<boolean>(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);
  const [isGardenOpen, setIsGardenOpen] = useState<boolean>(false);
  const [isPlanterOpen, setIsPlanterOpen] = useState<boolean>(false);
  const [isExpeditionsOpen, setIsExpeditionsOpen] = useState<boolean>(false);
  const [isDetectorOpen, setIsDetectorOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [focusedMapTarget, setFocusedMapTarget] = useState<{
    lat: number;
    lng: number;
    mushroomId?: string;
    seq: number;
  } | null>(null);

  const [selectedMushroom, setSelectedMushroom] = useState<MushroomNode | null>(null);
  const [selectedBigFlower, setSelectedBigFlower] = useState<BigFlowerNode | null>(null);
  const [newlyPluckedCreature, setNewlyPluckedCreature] = useState<DeGuaCreature | null>(null);

  const [nearbyDecors, setNearbyDecors] = useState<DecorCategory[]>([
    'bubble_tea',
    'convenience',
    'bakery',
    'park'
  ]);
  const [isScanningRadar, setIsScanningRadar] = useState<boolean>(false);
  const [toastBanner, setToastBanner] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastBanner(msg);
    setActivityLogs((prev) =>
      [`[${new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}] ${msg}`, ...prev].slice(0, 30)
    );
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastBanner(null), 4000);
  };

  const [landmarkTick, setLandmarkTick] = useState<number>(0);

  useEffect(() => {
    fetchNearbyPlaceLabels(myLat, myLng);
    return onRealLandmarksUpdated(() => {
      setLandmarkTick((t) => t + 1);
    });
  }, [myLat, myLng]);

  // 依據目前經緯度、真實世界地標圖資與世界同步狀態，確定性算出周圍所有的大花與蘑菇
  const { bigFlowers, mushrooms } = useMemo(
    () => getDeterministicWorldAround(myLat, myLng, worldDelta),
    [myLat, myLng, worldDelta, landmarkTick]
  );

  // 持久化與 iOS 原生層同步
  useEffect(() => {
    localStorage.setItem('dg_seedlings_v2', JSON.stringify(seedlings));
    syncSeedlingsToNative(seedlings, isPlanting ? 1.2 : 1.0);
  }, [seedlings, isPlanting]);

  useEffect(() => {
    localStorage.setItem('dg_creatures_v2', JSON.stringify(creatures));
  }, [creatures]);

  useEffect(() => {
    localStorage.setItem('dg_daily_lifecycle_v1', JSON.stringify(dailyLifecycle));
  }, [dailyLifecycle]);

  useEffect(() => {
    localStorage.setItem('dg_nectar_inventory_v1', JSON.stringify(nectarInventory));
  }, [nectarInventory]);

  useEffect(() => {
    localStorage.setItem('dg_petal_inventory_v1', JSON.stringify(petalInventory));
  }, [petalInventory]);

  useEffect(() => {
    localStorage.setItem('dg_active_petal_variant_v1', activePetalVariantId);
  }, [activePetalVariantId]);

  useEffect(() => {
    localStorage.setItem('dg_planted_cell_cooldowns_v1', JSON.stringify(cellCooldowns));
  }, [cellCooldowns]);

  useEffect(() => {
    localStorage.setItem('dg_daily_coins_v1', JSON.stringify(dailyCoinsState));
  }, [dailyCoinsState]);

  useEffect(() => {
    localStorage.setItem('dg_privacy_zone_v1', JSON.stringify(privacyZone));
  }, [privacyZone]);

  // 15 分鐘種花加速器倒數計時
  useEffect(() => {
    if (accelExpiresAt === null) {
      setAccelSecondsLeft(0);
      return;
    }
    const updateCountdown = () => {
      const remSec = Math.max(0, Math.ceil((accelExpiresAt - Date.now()) / 1000));
      setAccelSecondsLeft(remSec);
      if (remSec <= 0) {
        setAccelExpiresAt(null);
      }
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [accelExpiresAt]);

  // 定期與切回前景時檢查：凌晨 4:00 葉子重置、登入滿 8 小時結花苞、2 小時飽食回復、光禿禿 6 小時長葉
  useEffect(() => {
    const checkTimeTransitions = () => {
      const res = reconcileCreatureLifecycle(
        creaturesRef.current,
        dailyLifecycleRef.current,
        Date.now()
      );
      const creaturesChanged = res.creatures !== creaturesRef.current;
      const dailyChanged = res.dailyState !== dailyLifecycleRef.current;
      if (creaturesChanged) {
        creaturesRef.current = res.creatures;
        setCreatures(res.creatures);
      }
      if (dailyChanged) {
        dailyLifecycleRef.current = res.dailyState;
        setDailyLifecycle(res.dailyState);
      }
      if (res.didDailyReset) {
        setTodaySteps(0);
      }
    };

    checkTimeTransitions();
    const timer = window.setInterval(checkTimeTransitions, 30000);
    const onVisible = () => {
      if (!document.hidden) checkTimeTransitions();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('dg_expeditions_v2', JSON.stringify(expeditions));
  }, [expeditions]);

  useEffect(() => {
    localStorage.setItem('dg_postcards_v2', JSON.stringify(postcards));
  }, [postcards]);

  useEffect(() => {
    localStorage.setItem('dg_steps_v2', String(todaySteps));
  }, [todaySteps]);

  useEffect(() => {
    localStorage.setItem('dg_player_name_v2', playerName);
    localStorage.setItem('dg_player_level_v2', String(playerLevel));
    localStorage.setItem('dg_coins_v2', String(coins));
    localStorage.setItem('dg_mush_destroyed_v2', String(mushroomsDestroyed));
    localStorage.setItem('dg_world_key_v2', worldKey);
    localStorage.setItem('dg_cloud_url_v2', cloudUrl);
  }, [playerName, playerLevel, coins, mushroomsDestroyed, worldKey, cloudUrl]);

  // 啟動與定時同步共同世界
  useEffect(() => {
    syncWorldStateWithCloud(cloudUrl, worldKey, worldDelta).then((merged) => {
      setWorldDelta(merged);
    });
    const timer = window.setInterval(() => {
      setWorldDelta((current) => {
        syncWorldStateWithCloud(cloudUrl, worldKey, current).then((merged) => {
          setWorldDelta(merged);
        });
        return current;
      });
    }, 10000);
    return () => window.clearInterval(timer);
  }, [cloudUrl, worldKey]);

  // 綁定 iOS 原生 Swift 背景計步與種花回呼
  useEffect(() => {
    window.DeGuaNativeCallback = {
      onNativeStepDelta: (deltaSteps: number) => {
        if (deltaSteps > 0) addStepsAndCheckSeedlings(deltaSteps);
      },
      onNativeBackgroundFlowerPlanted: (cell: PlantedFlowerCell, remainingPetals: number) => {
        setPetalJar((prev) => ({ ...prev, [cell.color]: remainingPetals }));
        setWorldDelta((prev) => {
          const next: WorldDeltaState = {
            ...prev,
            flowers: { ...prev.flowers, [cell.gridId]: cell },
            updatedAt: Date.now()
          };
          syncWorldStateWithCloud(cloudUrl, worldKey, next);
          return next;
        });
      },
      onNativeLocationUpdate: (lat: number, lng: number) => {
        setMyLat(lat);
        setMyLng(lng);
      }
    };
  });

  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [locationQuery, setLocationQuery] = useState<string>('');
  const [isSearchingLocation, setIsSearchingLocation] = useState<boolean>(false);
  const [winDesktopAccessDenied, setWinDesktopAccessDenied] = useState<boolean>(false);
  const lastPosRef = useRef<{ lat: number; lng: number }>({ lat: myLat, lng: myLng });
  const hasInitialFixRef = useRef<boolean>(false);

  const applyVerifiedLocation = (
    lat: number,
    lng: number,
    _label?: string,
    forceRecenter = false
  ) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const distMeters = Math.hypot(
      (lat - lastPosRef.current.lat) * 111000,
      (lng - lastPosRef.current.lng) * 102000
    );
    const isFirstFix = !hasInitialFixRef.current;
    hasInitialFixRef.current = true;
    setWinDesktopAccessDenied(false);

    // 仿照皮克敏 distanceFilter (5公尺移動門檻)：待在原地或微幅訊號漂移 (<5m) 時絕不更新狀態與重繪畫面！
    if (!isFirstFix && !forceRecenter && distMeters < 5) {
      return;
    }

    lastPosRef.current = { lat, lng };
    localStorage.setItem('dg_user_confirmed_lat_v5', String(lat));
    localStorage.setItem('dg_user_confirmed_lng_v5', String(lng));
    setMyLat(lat);
    setMyLng(lng);
    if (forceRecenter || isFirstFix) {
      setRecenterSeq((s) => s + 1);
    }
  };

  const handleManualPlaceSearch = async () => {
    if (!locationQuery.trim()) return;
    setIsSearchingLocation(true);
    try {
      const found = await searchTaiwanPlaceCoordinates(locationQuery);
      if (found) {
        applyVerifiedLocation(found.lat, found.lng, found.displayName, true);
        setIsLocationModalOpen(false);
        setLocationQuery('');
      } else {
        showToast('⚠️ 找不到該地點');
      }
    } finally {
      setIsSearchingLocation(false);
    }
  };

  // 直接向本機 Windows WinRT Geolocator 讀取系統定位服務與「預設位置 (DefaultGeoposition)」（僅限本機桌面瀏覽器，手機端一律走自身 GPS）
  const fetchWindowsNativeLocation = async (
    notify = false,
    forceRecenter = false
  ): Promise<boolean> => {
    const isDesktopLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
      !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isDesktopLocalhost) return false;

    try {
      const res = await fetch('/api/windows-location');
      if (!res.ok) return false;
      const data = await res.json();
      if (data?.ok && Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
        applyVerifiedLocation(
          Number(data.lat),
          Number(data.lng),
          notify ? `Windows 系統定位 (${data.source || 'Default'})` : undefined,
          forceRecenter
        );
        return true;
      }
      if (data?.reason === 'desktop_access_denied') {
        if (!winDesktopAccessDenied && notify) {
          showToast(
            '⚠️ 請在 Windows「設定 > 隱私權與安全性 > 位置」往下捲動到底部，開啟【讓桌面應用程式存取您的位置】，即可自動抓到您的預設位置！'
          );
        }
        setWinDesktopAccessDenied(true);
      }
    } catch {
      // 非本機 Vite 環境 (例如已打包為 iOS IPA) 時略過
    }
    return false;
  };

  const requestAndApplyRealLocation = async (notify = false, forceRecenter = false) => {
    // 1. 優先向本機 Windows WinRT 橋接層讀取「Windows 定位服務 / 預設位置」
    const winOk = await fetchWindowsNativeLocation(notify, forceRecenter);
    if (winOk) return;

    // 2. 透過標準瀏覽器 Geolocation API 讀取 (iPhone / 筆電 GPS)
    if (!('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyVerifiedLocation(
          pos.coords.latitude,
          pos.coords.longitude,
          notify ? '目前 GPS 位置' : undefined,
          forceRecenter
        );
      },
      () => {
        navigator.geolocation.getCurrentPosition(
          (pos2) => {
            applyVerifiedLocation(
              pos2.coords.latitude,
              pos2.coords.longitude,
              notify ? '目前系統定位位置' : undefined,
              forceRecenter
            );
          },
          () => {
            fetchWindowsNativeLocation(notify, forceRecenter);
          },
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
        );
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
    );
  };

  // 仿照皮克敏標準做法：啟動時取得初始定位，之後僅在「使用者實際移動超過 5 公尺 (watchPosition)」或「從系統設定切回視窗」時靜默更新，不跳多餘定位通知！
  useEffect(() => {
    requestAndApplyRealLocation(false, false);

    const onWindowFocus = () => {
      if (!hasInitialFixRef.current) {
        requestAndApplyRealLocation(false, false);
      }
    };
    window.addEventListener('focus', onWindowFocus);

    if ('permissions' in navigator && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          status.onchange = () => {
            if (status.state === 'granted') {
              requestAndApplyRealLocation(false, true);
            }
          };
        })
        .catch(() => {});
    }

    if (!('geolocation' in navigator)) {
      return () => window.removeEventListener('focus', onWindowFocus);
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setWinDesktopAccessDenied(false);
        handleWalkToCoordinate(pos.coords.latitude, pos.coords.longitude, false);
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 10000, timeout: 15000 }
    );
    return () => {
      window.removeEventListener('focus', onWindowFocus);
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isPlanting, activePetalColor]);

  // 步數增加並檢查油鍋裡的瓜糰、隊伍/全體葉子變花苞、光禿禿步數恢復（遵循 21:00~04:00 限制）
  const addStepsAndCheckSeedlings = (rawDeltaSteps: number) => {
    const mult = isPlanting ? (isAccelActive ? 1.4 : 1.2) : 1.0;
    const effectiveSteps = Math.max(1, Math.round(rawDeltaSteps * mult));

    setTodaySteps((prev) => prev + rawDeltaSteps);

    const lifeRes = applyWalkingStepsToLifecycle(
      creaturesRef.current,
      dailyLifecycleRef.current,
      rawDeltaSteps,
      Date.now()
    );
    creaturesRef.current = lifeRes.creatures;
    dailyLifecycleRef.current = lifeRes.dailyState;
    setCreatures(lifeRes.creatures);
    setDailyLifecycle(lifeRes.dailyState);

    if (lifeRes.allBudTriggeredNow) {
      showToast('🌷 今日累積步行達標，全體地瓜球頭頂已結成花苞！');
    } else if (lifeRes.squadBudCount > 0) {
      showToast(`🌷 散步累積步數達標，${lifeRes.squadBudCount} 隻隊伍地瓜球長出了花苞！`);
    } else if (lifeRes.bareRecoveredCount > 0) {
      showToast(`🌱 步行恢復達標，${lifeRes.bareRecoveredCount} 隻光禿禿地瓜球重新長回葉子了！`);
    }

    setSeedlings((prev) =>
      prev.map((s) => {
        if (s.slotIndex === null || s.isReady) return s;
        const nextSteps = Math.min(s.targetSteps, s.currentSteps + effectiveSteps);
        const nowReady = nextSteps >= s.targetSteps;

        if (nowReady && !s.notified) {
          const matured: Seedling = {
            ...s,
            currentSteps: nextSteps,
            isReady: true,
            notified: true
          };
          triggerSeedlingReadyNotification(matured);
          showToast(
            `🍠 瓜糰已經炸熟浮起來了！「${s.placeName}」附近的${s.isHuge ? '巨大瓜糰' : VARIETY_CATALOG[s.variety].potName}可以去【🍳油鍋】用網勺撈起來囉！`
          );
          return matured;
        }
        return { ...s, currentSteps: nextSteps };
      })
    );
  };

  const isPlantingRef = useRef<boolean>(isPlanting);
  isPlantingRef.current = isPlanting;
  const activeVariantRef = useRef(activePetalVariant);
  activeVariantRef.current = activePetalVariant;
  const petalInventoryRef = useRef<Record<string, number>>(petalInventory);
  petalInventoryRef.current = petalInventory;
  const cellCooldownsRef = useRef<Record<string, CellCooldownRecord>>(cellCooldowns);
  cellCooldownsRef.current = cellCooldowns;
  const worldDeltaRef = useRef<WorldDeltaState>(worldDelta);
  worldDeltaRef.current = worldDelta;
  const bigFlowersRef = useRef<BigFlowerNode[]>(bigFlowers);
  bigFlowersRef.current = bigFlowers;
  const privacyZoneRef = useRef<PrivacyZoneSetting>(privacyZone);
  privacyZoneRef.current = privacyZone;
  const isAccelActiveRef = useRef<boolean>(isAccelActive);
  isAccelActiveRef.current = isAccelActive;
  const dailyCoinsRef = useRef<{ dayKey: string; coins: number }>(dailyCoinsState);
  dailyCoinsRef.current = dailyCoinsState;
  const myPosRef = useRef<{ lat: number; lng: number }>({ lat: myLat, lng: myLng });
  myPosRef.current = { lat: myLat, lng: myLng };

  const sessionFlowersRef = useRef<number>(0);
  const sessionCoinsRef = useRef<number>(0);
  const sessionStartAtRef = useRef<number>(Date.now());
  const sessionPointsRef = useRef<{ lat: number; lng: number; color: PetalColor }[]>([]);
  const lastMoveStampRef = useRef<number>(Date.now());

  const runPlantingStampAt = (targetLat: number, targetLng: number, speedKmh = 0) => {
    const activeSquadCount = creaturesRef.current.filter(
      (c) => c.inSquad && c.busyState === 'free'
    ).length;
    const variant = activeVariantRef.current;

    const stampRes = stampFlowerFootprint({
      lat: targetLat,
      lng: targetLng,
      squadCount: Math.max(1, activeSquadCount),
      color: variant.color,
      isAccelActive: isAccelActiveRef.current,
      speedKmh,
      privacyZone: privacyZoneRef.current,
      cooldowns: cellCooldownsRef.current,
      existingFlowers: worldDeltaRef.current.flowers,
      bigFlowers: bigFlowersRef.current,
      existingBigFlowerStates: worldDeltaRef.current.bigFlowerStates,
      nowMs: Date.now()
    });

    if (stampRes.cooldowns !== cellCooldownsRef.current) {
      cellCooldownsRef.current = stampRes.cooldowns;
      setCellCooldowns(stampRes.cooldowns);
    }

    if (stampRes.plantedCount > 0) {
      const prevSessionFlowers = sessionFlowersRef.current;
      const nextSessionFlowers = prevSessionFlowers + stampRes.plantedCount;
      sessionFlowersRef.current = nextSessionFlowers;
      setSessionPlantedCount(nextSessionFlowers);

      if (stampRes.plantedPoints.length > 0) {
        sessionPointsRef.current = [...sessionPointsRef.current, ...stampRes.plantedPoints];
      }

      const todayKey = getGameDayKey(Date.now());
      const currentDailyCoins =
        dailyCoinsRef.current.dayKey === todayKey ? dailyCoinsRef.current.coins : 0;
      const gainedCoins = computeEarnedCoinDelta(
        prevSessionFlowers,
        nextSessionFlowers,
        currentDailyCoins
      );
      if (gainedCoins > 0) {
        setCoins((c) => c + gainedCoins);
        sessionCoinsRef.current += gainedCoins;
        setSessionCoinsEarned(sessionCoinsRef.current);
        const nextDaily = { dayKey: todayKey, coins: currentDailyCoins + gainedCoins };
        dailyCoinsRef.current = nextDaily;
        setDailyCoinsState(nextDaily);
      }

      if (stampRes.newlyBloomedBigFlowers.length > 0) {
        stampRes.newlyBloomedBigFlowers.forEach((bf) => {
          const bloomFruitExp: ExpeditionItem = {
            id: `exp_bf_${Date.now()}_${bf.id}`,
            kind: 'fruit',
            title: '大花盛開大水蜜桃',
            placeName: bf.name,
            lat: bf.lat,
            lng: bf.lng,
            distanceMeters: bf.distanceMeters,
            requiredStrength: 3,
            fruitEmoji: '🍑',
            fruitName: '盛開大水蜜桃',
            nectarColor: variant.color,
            nectarAmount: 30,
            status: 'available',
            assignedCreatureIds: []
          };
          setExpeditions((prevExp) => [bloomFruitExp, ...prevExp]);
          showToast(`🌺「${bf.name}」盛開了！掉了大果實到【探險】清單！`);
        });
      }

      const nextWorld: WorldDeltaState = {
        ...worldDeltaRef.current,
        flowers: stampRes.flowers,
        bigFlowerStates: stampRes.bigFlowerStates,
        updatedAt: Date.now()
      };
      worldDeltaRef.current = nextWorld;
      setWorldDelta(nextWorld);
      syncWorldStateWithCloud(cloudUrl, worldKey, nextWorld);
    }
  };

  // 移動座標、算步數、種花、推進大花盛開（依皮克敏真實 5m×5m 網格與 5 分鐘冷卻公式計算，絕不瞬移造假）
  const handleWalkToCoordinate = (targetLat: number, targetLng: number, isManualTap = true) => {
    const distMeters = Math.hypot(
      (targetLat - lastPosRef.current.lat) * 111000,
      (targetLng - lastPosRef.current.lng) * 102000
    );
    if (!isManualTap && distMeters < 5) {
      return;
    }

    const now = Date.now();
    const dtHours = Math.max(0.0005, (now - lastMoveStampRef.current) / 3_600_000);
    const speedKmh = isManualTap ? 4 : Math.min(80, distMeters / 1000 / dtHours);
    lastMoveStampRef.current = now;

    lastPosRef.current = { lat: targetLat, lng: targetLng };
    localStorage.setItem('dg_user_confirmed_lat_v5', String(targetLat));
    localStorage.setItem('dg_user_confirmed_lng_v5', String(targetLng));
    setMyLat(targetLat);
    setMyLng(targetLng);

    const stepsWalked = isManualTap
      ? Math.max(120, Math.min(400, Math.round(distMeters * 1.45)))
      : Math.max(0, Math.round(distMeters * 1.35));

    if (stepsWalked > 0) {
      addStepsAndCheckSeedlings(stepsWalked);
    }

    if (isPlantingRef.current) {
      const remaining = petalInventoryRef.current[activeVariantRef.current.id] || 0;
      if (remaining <= 0) {
        handleStopPlanting(true);
        return;
      }
      runPlantingStampAt(targetLat, targetLng, speedKmh);
    }
  };

  // 啟動與停止種花（依隊伍人數計時器每 10~30 秒消耗 1 片花瓣；結束後顯示街廓地圖＋種花時間＋花朵數結算視窗）
  const handleStartPlanting = async () => {
    const variant = activeVariantRef.current;
    const currentCount = petalInventoryRef.current[variant.id] || 0;
    if (currentCount <= 0) {
      showToast('⚠️ 該種花瓣不足');
      return;
    }
    await requestAllPermissions();

    const nextCount = Math.max(0, currentCount - 1);
    const nextInv = { ...petalInventoryRef.current, [variant.id]: nextCount };
    petalInventoryRef.current = nextInv;
    setPetalInventory(nextInv);

    sessionFlowersRef.current = 0;
    sessionCoinsRef.current = 0;
    sessionStartAtRef.current = Date.now();
    sessionPointsRef.current = [];
    setSessionPlantedCount(0);
    setSessionCoinsEarned(0);
    setPlantingSummary(null);

    setShowPlantingDrawer(false);
    setMapPerspective('surround');
    setIsInteractiveMapOpen(true);
    setIsPlanting(true);
    isPlantingRef.current = true;

    setNativeBackgroundPlanting({
      isPlanting: true,
      petalColor: variant.color,
      remainingPetals: nextCount,
      playerId: playerName,
      syncEndpointUrl: cloudUrl,
      roomCode: worldKey
    });

    setPlantingBanner('種花 開始！');
    window.setTimeout(() => setPlantingBanner(null), 1250);

    // 立即於當前位置依 5m×5m 格與 5 分鐘冷卻規則嘗試首次蓋章
    runPlantingStampAt(myPosRef.current.lat, myPosRef.current.lng, 0);
  };

  const handleStopPlanting = (depleted = false) => {
    if (!isPlantingRef.current && !isPlanting) return;
    const variant = activeVariantRef.current;
    const elapsedSec = Math.max(1, Math.round((Date.now() - sessionStartAtRef.current) / 1000));
    const finalFlowers = sessionFlowersRef.current;
    const finalCoins = sessionCoinsRef.current;
    const finalPoints = sessionPointsRef.current;

    setIsPlanting(false);
    isPlantingRef.current = false;
    setShowPlantingDrawer(false);
    setNativeBackgroundPlanting({
      isPlanting: false,
      petalColor: variant.color,
      remainingPetals: petalInventoryRef.current[variant.id] || 0,
      playerId: playerName,
      syncEndpointUrl: cloudUrl,
      roomCode: worldKey
    });

    setIsInteractiveMapOpen(true);
    setPlantingBanner(depleted ? '花瓣已用完！' : '種花 結束！');
    window.setTimeout(() => {
      setPlantingBanner(null);
      setPlantingSummary({
        flowersPlanted: finalFlowers,
        durationSeconds: elapsedSec,
        coinsEarned: finalCoins,
        petalName: variant.displayName,
        petalColor: variant.color,
        centerLat: myPosRef.current.lat,
        centerLng: myPosRef.current.lng,
        points: finalPoints
      });
    }, 950);
  };

  // 皮克敏種花定量消耗計時器（依隊伍規模 10s~30s 消耗 1 片，加速器期間頻率加倍）
  useEffect(() => {
    if (!isPlanting) return;
    const activeSquadCount = creaturesRef.current.filter(
      (c) => c.inSquad && c.busyState === 'free'
    ).length;
    const footprint = getPlantingFootprintForSquad(Math.max(1, activeSquadCount));
    const intervalMs = Math.round(
      (footprint.intervalSeconds * 1000) / (isAccelActive ? 2 : 1)
    );

    const timer = window.setInterval(() => {
      if (!isPlantingRef.current) return;
      const variant = activeVariantRef.current;
      const cur = petalInventoryRef.current[variant.id] || 0;
      if (cur <= 0) {
        handleStopPlanting(true);
        return;
      }
      const nextCount = cur - 1;
      const nextInv = { ...petalInventoryRef.current, [variant.id]: nextCount };
      petalInventoryRef.current = nextInv;
      setPetalInventory(nextInv);

      runPlantingStampAt(myPosRef.current.lat, myPosRef.current.lng, 0);

      if (nextCount <= 0) {
        handleStopPlanting(true);
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isPlanting, isAccelActive, activePetalVariantId, creatures.length]);

  const handleAssignSeedlingToSlot = (seedlingId: string, slotIndex: number) => {
    setSeedlings((prev) =>
      prev.map((s) => (s.id === seedlingId ? { ...s, slotIndex } : s))
    );
    showToast('🍳 已將生瓜糰丟入黃金油鍋！');
  };

  const handlePluckSeedling = (seedling: Seedling) => {
    const vMeta = VARIETY_CATALOG[seedling.variety];
    const dMeta = DECOR_CATALOG[seedling.decor];
    const newCreature: DeGuaCreature = {
      id: `dg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `${dMeta.icon}${vMeta.name}`,
      variety: seedling.variety,
      decor: seedling.decor,
      placeName: seedling.placeName,
      lat: seedling.lat,
      lng: seedling.lng,
      friendship: seedling.isHuge ? 400 : 100,
      hasDecor: seedling.isHuge,
      giftExpeditionCreated: seedling.isHuge,
      leafStage: 'leaf',
      flowerColor: 'white',
      pluckCountToday: 0,
      inSquad: true,
      busyState: 'free',
      createdAt: Date.now()
    };

    setCreatures((prev) => [newCreature, ...prev]);
    setSeedlings((prev) => prev.filter((s) => s.id !== seedling.id));
    setIsPlanterOpen(false);
    setNewlyPluckedCreature(newCreature);
  };

  // 花園拋出精華球餵食（套用皮克敏葉子+白精華變花苞 / 花苞雙倍花瓣 / 6/6 光禿禿規則）
  const handleThrowNectarToFeed = () => {
    if (nectarJar[selectedNectar] <= 0) {
      showToast(`⚠️【${PETAL_META[selectedNectar].nectarName}】不足`);
      return;
    }

    const res = feedNectarToSquad(
      creaturesRef.current,
      selectedNectar,
      nectarJar[selectedNectar],
      Date.now()
    );

    if (res.usedNectar === 0) {
      const freeSquad = creaturesRef.current.filter((c) => c.inSquad && c.busyState === 'free');
      const hasFlowering = freeSquad.some((c) => c.leafStage === 'flower');
      const hasBare = freeSquad.some((c) => c.leafStage === 'bare');
      if (hasFlowering) {
        showToast('🌼 頭頂已開滿花，滑動頭頂即可採收花瓣');
      } else if (hasBare) {
        showToast('🌱 已餵滿 6/6 光禿禿，走 2,000 步或等 6 小時長回葉子');
      }
      return;
    }

    setNectarJar((prev) => ({
      ...prev,
      [selectedNectar]: Math.max(0, prev[selectedNectar] - res.usedNectar)
    }));
    creaturesRef.current = res.creatures;
    setCreatures(res.creatures);

    if (res.giftReadyCreatures.length > 0) {
      const newGiftExpeditions: ExpeditionItem[] = res.giftReadyCreatures.map((c) => ({
        id: `exp_gift_${c.id}`,
        kind: 'gift',
        title: `${c.name} 的飾品禮物`,
        placeName: c.placeName,
        lat: c.lat,
        lng: c.lng,
        distanceMeters: 150,
        requiredStrength: 1,
        targetCreatureId: c.id,
        status: 'available',
        assignedCreatureIds: [c.id]
      }));
      setExpeditions((prev) => [...newGiftExpeditions, ...prev]);
      showToast(`🎁「${newGiftExpeditions[0].title}」已於探險分頁出現！`);
    }
  };

  // 滑動或點擊採收頭頂花瓣：花苞開的花享雙倍 (+2)，一般葉子開的花得 +1；滿 6/6 變光禿禿
  const handleSwipePluckSingle = (creatureId: string) => {
    const res = harvestCreatureFlower(creaturesRef.current, creatureId, Date.now());
    if (res.petalsGained <= 0 || !res.petalColor) return;

    const color = res.petalColor;
    creaturesRef.current = res.creatures;
    setCreatures(res.creatures);
    setPetalJar((prev) => ({
      ...prev,
      [color]: Math.min(300, prev[color] + res.petalsGained)
    }));
  };

  // 吹口哨集合小隊（不繞過 6/6 光禿禿冷卻懲罰，符合皮克敏正式規則）
  const handleWhistleGather = () => {
    showToast('😗 吹響口哨！地瓜球小隊集合完畢');
  };

  const handleFireDetector = async () => {
    setIsScanningRadar(true);
    try {
      const res = await triggerDetectorScan(myLat, myLng);
      setNearbyDecors(res.nearbyDecors);
      setExpeditions((prev) => [...res.newExpeditions, ...prev]);
      setIsDetectorOpen(false);
      setIsExpeditionsOpen(true);
      showToast(`📡 探測器發現了 ${res.newExpeditions.length} 個新探險目標（含野生瓜糰与水果）！`);
    } finally {
      setIsScanningRadar(false);
    }
  };

  const handleDispatchExpedition = (expId: string) => {
    setExpeditions((prev) =>
      prev.map((e) => (e.id === expId ? { ...e, status: 'active' } : e))
    );
    showToast('🏃 地瓜球小隊已出發前往搬運！');
  };

  const handleClaimExpedition = (expId: string) => {
    const exp = expeditions.find((e) => e.id === expId);
    if (!exp) return;

    if (exp.kind === 'fruit' && exp.nectarColor && exp.nectarAmount) {
      setNectarJar((prev) => ({
        ...prev,
        [exp.nectarColor!]: prev[exp.nectarColor!] + exp.nectarAmount!
      }));
      showToast(`${exp.fruitEmoji} 搬回【${exp.title}】，榨出了 +${exp.nectarAmount} 滴${PETAL_META[exp.nectarColor].nectarName}！`);
    } else if (exp.kind === 'seedling' && exp.seedlingVariety && exp.seedlingDecor) {
      const v = exp.seedlingVariety;
      const newSeed: Seedling = {
        id: `seed_${Date.now()}`,
        variety: v,
        decor: exp.seedlingDecor,
        isHuge: Boolean(exp.seedlingIsHuge),
        placeName: exp.placeName,
        lat: exp.lat,
        lng: exp.lng,
        currentSteps: 0,
        targetSteps: exp.seedlingIsHuge ? 10000 : VARIETY_CATALOG[v].baseSteps,
        slotIndex: null,
        isReady: false,
        notified: false,
        discoveredAt: Date.now()
      };
      setSeedlings((prev) => [newSeed, ...prev]);
      showToast(`🍠 成功把「${exp.placeName}」的生瓜糰搬進【🍳油鍋】背包了！`);
    } else if (exp.kind === 'gift' && exp.targetCreatureId) {
      setCreatures((prev) =>
        prev.map((c) => {
          if (c.id !== exp.targetCreatureId) return c;
          const updated = { ...c, hasDecor: true };
          setNewlyPluckedCreature(updated);
          return updated;
        })
      );
      setIsExpeditionsOpen(false);
    }

    setExpeditions((prev) => prev.filter((e) => e.id !== expId));
  };

  // 參加蘑菇戰鬥
  const handleJoinMushroomBattle = (mushroomId: string) => {
    if (!selectedMushroom) return;
    const availableSquad = creatures.filter((c) => c.busyState === 'free');
    const myPower = availableSquad.reduce(
      (sum, c) => sum + calculateCreatureMushroomPower(c, selectedMushroom.element).power,
      0
    );

    setWorldDelta((prev) => {
      const prevMush = prev.mushroomStates[mushroomId] || {
        currentHp: selectedMushroom.maxHp,
        participants: selectedMushroom.participants
      };
      const damageDealt = myPower * 120;
      const nextHp = Math.max(0, prevMush.currentHp - damageDealt);
      const otherParticipants = prevMush.participants.filter((p) => p.playerName !== playerName);
      const nextParticipants = [
        ...otherParticipants,
        { playerName, power: myPower, joinedAt: Date.now() }
      ];

      const nextWorld: WorldDeltaState = {
        ...prev,
        mushroomStates: {
          ...prev.mushroomStates,
          [mushroomId]: {
            currentHp: nextHp,
            participants: nextParticipants
          }
        },
        updatedAt: Date.now()
      };
      syncWorldStateWithCloud(cloudUrl, worldKey, nextWorld);
      return nextWorld;
    });

    setMushroomsDestroyed((prev) => prev + 1);
    setNectarJar((prev) => ({
      ...prev,
      [selectedMushroom.rewardColor]: prev[selectedMushroom.rewardColor] + 24
    }));

    const newCard: PostcardItem = {
      id: `pc_${Date.now()}`,
      placeName: selectedMushroom.name,
      mushroomName: selectedMushroom.name,
      stars: myPower >= 120 ? 4 : 3,
      senderName: playerName,
      creatures: availableSquad.slice(0, 3).map((c) => ({
        variety: c.variety,
        decor: c.decor,
        hasDecor: c.hasDecor
      })),
      createdAt: new Date().toLocaleDateString('zh-TW')
    };
    setPostcards((prev) => [newCard, ...prev]);
    setSelectedMushroom(null);
    showToast(`🍄 摧毀蘑菇成功！獲得 +24 滴精華花蜜與「${selectedMushroom.name}」紀念明信片！`);
  };

  // 領取進行中任務獎勵
  const handleClaimMissionReward = () => {
    if (mushroomsDestroyed < missionTarget) {
      setIsExpeditionsOpen(true);
      showToast(`🍄 目前已摧毀 ${mushroomsDestroyed}/${missionTarget} 朵蘑菇！已在探險一覽列出附近可打的蘑菇！`);
      return;
    }
    setMissionTarget((t) => t + 3);
    setPlayerLevel((lv) => lv + 1);
    setCoins((c) => c + 100);
    const rewardSeed: Seedling = {
      id: `seed_mission_${Date.now()}`,
      variety: 'purple',
      decor: 'bubble_tea',
      isHuge: true,
      placeName: '任務達成限定獎勵',
      lat: myLat,
      lng: myLng,
      currentSteps: 0,
      targetSteps: 1000,
      slotIndex: null,
      isReady: false,
      notified: false,
      discoveredAt: Date.now()
    };
    setSeedlings((prev) => [rewardSeed, ...prev]);
    showToast('🎉 任務完成！等級提升並獲得【1,000步特殊飾品巨大瓜糰】與 💰100 金幣！');
  };

  // 商店購買
  const handleBuyShopItem = (cost: number, type: 'petals' | 'nectar' | 'radar' | 'seedling') => {
    if (coins < cost) {
      showToast(`⚠️ 金幣不足（需 💰${cost}），開啟種花模式散步就能免費賺金幣喔！`);
      return;
    }
    setCoins((c) => c - cost);
    if (type === 'petals') {
      setPetalJar((prev) => ({
        white: Math.min(300, prev.white + 100),
        yellow: Math.min(300, prev.yellow + 100),
        red: Math.min(300, prev.red + 100),
        blue: Math.min(300, prev.blue + 100)
      }));
      showToast('🌼 已補充四色花瓣各 +100 片！');
    } else if (type === 'nectar') {
      setNectarJar((prev) => ({
        white: prev.white + 30,
        yellow: prev.yellow + 30,
        red: prev.red + 30,
        blue: prev.blue + 30
      }));
      showToast('🍯 已補充四色花蜜各 +30 滴！');
    } else if (type === 'radar') {
      setIsShopModalOpen(false);
      setIsDetectorOpen(true);
    } else if (type === 'seedling') {
      const specialSeed: Seedling = {
        id: `seed_shop_${Date.now()}`,
        variety: 'yellow',
        decor: 'bubble_tea',
        isHuge: true,
        placeName: '商店限定手搖飲特典',
        lat: myLat,
        lng: myLng,
        currentSteps: 0,
        targetSteps: 1000,
        slotIndex: null,
        isReady: false,
        notified: false,
        discoveredAt: Date.now()
      };
      setSeedlings((prev) => [specialSeed, ...prev]);
      showToast('🍠✨ 已獲得【商店限定特殊巨大瓜糰】，快去油鍋油炸吧！');
    }
  };

  const readySeedlingsCount = seedlings.filter((s) => s.isReady).length;
  const activeFryerCount = seedlings.filter((s) => s.slotIndex !== null).length;
  const squadCreatures = creatures.filter((c) => c.inSquad && c.busyState === 'free');
  const totalExpeditionItems = mushrooms.length + expeditions.length;
  const missionPct = Math.min(100, Math.round((mushroomsDestroyed / missionTarget) * 100));

  const todayDateStr = useMemo(() => {
    const now = new Date();
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return `${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`;
  }, []);

  return (
    <div
      className="pikmin-app-shell"
      style={{
        background: 'linear-gradient(180deg, #2563EB 0%, #60A5FA 18%, #BAE6FD 48%, #4ADE80 54%, #22C55E 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflowY: 'auto'
      }}
    >
      {/* ==================== 上半部固定卡片區（100% 對照圖 3 真實皮克敏主畫面） ==================== */}
      <div
        style={{
          padding: 'max(10px, env(safe-area-inset-top)) 14px 4px',
          display: 'flex',
          flexDirection: 'column',
          gap: 9,
          zIndex: 10
        }}
      >
        {/* 【頂部四顆純白膠囊】：飾品一覽 ｜ 好友 ｜ 通知 ｜ 說明 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          <button
            onClick={() => setIsDecorModalOpen(true)}
            style={{
              background: '#FFFFFF',
              border: 'none',
              borderRadius: 99,
              padding: '7px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              fontSize: 11.5,
              fontWeight: 900,
              color: '#1E293B',
              cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(0,0,0,0.12)',
              whiteSpace: 'nowrap'
            }}
          >
            <span>🎖️</span>
            <span>飾品</span>
          </button>

          <button
            onClick={() => setIsFriendsModalOpen(true)}
            style={{
              background: '#FFFFFF',
              border: 'none',
              borderRadius: 99,
              padding: '7px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              fontSize: 11.5,
              fontWeight: 900,
              color: '#1E293B',
              cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(0,0,0,0.12)',
              whiteSpace: 'nowrap'
            }}
          >
            <span>➿</span>
            <span>好友</span>
          </button>

          <button
            onClick={() => setIsNotificationsModalOpen(true)}
            style={{
              background: '#FFFFFF',
              border: 'none',
              borderRadius: 99,
              padding: '7px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              fontSize: 11.5,
              fontWeight: 900,
              color: '#1E293B',
              cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(0,0,0,0.12)',
              whiteSpace: 'nowrap'
            }}
          >
            <span>📢</span>
            <span>通知</span>
          </button>

          <button
            onClick={() => setIsGuideModalOpen(true)}
            style={{
              background: '#FFFFFF',
              border: 'none',
              borderRadius: 99,
              padding: '7px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              fontSize: 11.5,
              fontWeight: 900,
              color: '#1E293B',
              cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(0,0,0,0.12)',
              whiteSpace: 'nowrap'
            }}
          >
            <span>📖</span>
            <span>說明</span>
          </button>
        </div>

        {/* 【主畫面中央大白卡：上半部靜態今日足跡概覽地圖＋步數 ＆ 下半部本週日曆連成一體（完全對照圖 3）】 */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 24,
            padding: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* 紅框部分：只顯示今天走的區域綠色足跡與步數（不做地圖雜亂互動，上方只有「你有 X 項探險！ >」按鈕） */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: 175,
              borderRadius: 18,
              overflow: 'hidden'
            }}
          >
            <FlowerMap
              mode="mini_footprint"
              recenterSeq={recenterSeq}
              myLat={myLat}
              myLng={myLng}
              isPlanting={isPlanting}
              activePetalColor={activePetalColor}
              squad={squadCreatures}
              flowers={worldDelta.flowers}
              worldDelta={worldDelta}
              bigFlowers={bigFlowers}
              mushrooms={mushrooms}
              activeExpeditions={[]}
            />

            {/* 地圖上唯一的按鈕：🍄 你有 X 項探險！ > （點進去有可打的菇跟可搬的瓜糰） */}
            <button
              onClick={() => setIsExpeditionsOpen(true)}
              style={{
                position: 'absolute',
                top: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 410,
                background: 'rgba(255, 255, 255, 0.96)',
                border: '1.5px solid #E2E8F0',
                borderRadius: 99,
                padding: '7px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 900,
                color: '#1E293B',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ fontSize: 18 }}>🍄</span>
              <span>你有 {totalExpeditionItems} 項探險！</span>
              <span style={{ color: '#94A3B8' }}>&gt;</span>
            </button>

            {/* 地圖正下方中央：皇冠 + 翠綠白邊大字步數（完全對照圖 3 的 3781 步數） */}
            <div
              style={{
                position: 'absolute',
                bottom: 6,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 405,
                textAlign: 'center',
                pointerEvents: 'none'
              }}
            >
              <div style={{ fontSize: 14, marginBottom: -4 }}>👑</div>
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 900,
                  color: '#10B981',
                  lineHeight: 1,
                  letterSpacing: 1,
                  WebkitTextStroke: '1.5px #FFFFFF',
                  textShadow: '0 2px 6px rgba(0,0,0,0.22), 0 0 10px #FFFFFF'
                }}
              >
                {todaySteps}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: '#0F172A',
                  textShadow: '0 0 6px #FFFFFF, 0 0 10px #FFFFFF'
                }}
              >
                步數
              </div>
            </div>
          </div>

          {/* 同一張大白卡下半部：每日紀錄日曆（點擊開啟 Lifelog） */}
          <div
            onClick={() => setIsLifelogModalOpen(true)}
            style={{
              padding: '10px 8px 6px',
              cursor: 'pointer'
            }}
          >
            <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 900, color: '#334155', marginBottom: 8 }}>
              {todayDateStr}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
              {['一', '二', '三', '四', '五', '六', '日'].map((dayLabel, idx) => {
                const dayNum = idx + 11;
                const mood = dailyMoods[idx + 1];
                const isToday = idx === 0;
                return (
                  <div key={dayLabel} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#64748B' }}>{dayLabel}</span>
                    {mood ? (
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          background: '#FEF08A',
                          border: '1.5px solid #F59E0B',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16
                        }}
                      >
                        {mood}
                      </div>
                    ) : (
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          border: isToday ? '2px solid #10B981' : '1px solid transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                          fontWeight: 900,
                          color: isToday ? '#10B981' : '#93C5FD'
                        }}
                      >
                        {dayNum}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 【進行中的任務卡片】 */}
        <div
          onClick={handleClaimMissionReward}
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.08)'
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 900, color: '#0F172A', marginBottom: 6 }}>
              <span>摧毀 {missionTarget} 朵蘑菇</span>
              <span style={{ color: '#10B981', fontSize: 12 }}>
                {mushroomsDestroyed >= missionTarget ? '✨ 點此領取獎勵瓜糰！' : `${mushroomsDestroyed} / ${missionTarget}`}
              </span>
            </div>
            <div style={{ width: '100%', height: 8, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${missionPct}%`,
                  height: '100%',
                  background: mushroomsDestroyed >= missionTarget ? '#22C55E' : '#94A3B8',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <DeGuaCharacter
              variety="red"
              decor="bubble_tea"
              leafStage="flower"
              flowerColor="white"
              showDecor={true}
              isBouncing={false}
              size={38}
            />
          </div>
        </div>

        {/* 【個人資訊 ＆ 商店 並排雙純白圓角卡】 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            onClick={() => setIsProfileMenuOpen(true)}
            style={{
              background: '#FFFFFF',
              border: 'none',
              borderRadius: 16,
              padding: '9px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}
          >
            <span style={{ fontSize: 22 }}>🧑‍🌾</span>
            <span
              style={{
                background: 'linear-gradient(135deg, #F59E0B, #B45309)',
                color: '#FFF',
                fontSize: 11,
                fontWeight: 900,
                padding: '2px 6px',
                borderRadius: 99
              }}
            >
              {playerLevel}
            </span>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {playerName}
            </span>
          </button>

          <button
            onClick={() => setIsShopModalOpen(true)}
            style={{
              background: '#FFFFFF',
              border: 'none',
              borderRadius: 16,
              padding: '9px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}
          >
            <span style={{ fontSize: 18 }}>🛍️</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#1E293B' }}>商店</span>
          </button>
        </div>
      </div>

      {/* ==================== 下半部花海草地角色散步場景 ＋ 底部按鈕群（完全對照圖 3） ==================== */}
      <div
        style={{
          flex: 1,
          minHeight: 205,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px 16px max(16px, env(safe-area-inset-bottom))',
          overflow: 'hidden'
        }}
      >
        {/* 繽紛花叢背景 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.9,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-around',
            alignContent: 'space-around',
            fontSize: 18
          }}
        >
          <span>🌺</span><span>🌼</span><span>💮</span><span>🪻</span><span>🌸</span>
          <span>💮</span><span>🌼</span><span>🌺</span><span>💮</span><span>🌼</span>
          <span>🌸</span><span>🪻</span><span>💮</span><span>🌼</span><span>🌺</span>
        </div>

        {/* 中央主角與跟隨散步的地瓜球小隊 */}
        <div
          onClick={() => setIsGardenOpen(true)}
          style={{
            position: 'relative',
            zIndex: 5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            marginBottom: 22
          }}
        >
          <div style={{ display: 'flex', gap: 4, marginBottom: -14, alignItems: 'flex-end' }}>
            {squadCreatures.slice(0, 4).map((c) => (
              <DeGuaCharacter
                key={c.id}
                variety={c.variety}
                decor={c.decor}
                leafStage={c.leafStage}
                flowerColor={c.flowerColor}
                showDecor={c.hasDecor}
                size={60}
              />
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            {squadCreatures[4] && (
              <DeGuaCharacter
                variety={squadCreatures[4].variety}
                decor={squadCreatures[4].decor}
                leafStage={squadCreatures[4].leafStage}
                flowerColor={squadCreatures[4].flowerColor}
                showDecor={squadCreatures[4].hasDecor}
                size={64}
              />
            )}
            <div
              style={{
                fontSize: 62,
                filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.28))',
                lineHeight: 1
              }}
              className="degua-bounce"
            >
              🧑‍🌾
            </div>
            {squadCreatures[0] && (
              <DeGuaCharacter
                variety={squadCreatures[0].variety}
                decor={squadCreatures[0].decor}
                leafStage={squadCreatures[0].leafStage}
                flowerColor={squadCreatures[0].flowerColor}
                showDecor={squadCreatures[0].hasDecor}
                size={64}
              />
            )}
          </div>
        </div>

        {/* 左下角：☰ 主選單圓鈕 */}
        <button
          onClick={() => setIsProfileMenuOpen(true)}
          style={{
            position: 'absolute',
            left: 16,
            bottom: 'max(16px, env(safe-area-inset-bottom))',
            zIndex: 20,
            width: 54,
            height: 54,
            borderRadius: '50%',
            border: '2.5px solid rgba(255,255,255,0.85)',
            background: 'radial-gradient(circle at 30% 30%, rgba(52,211,153,0.9), rgba(5,150,105,0.92))',
            color: '#FFFFFF',
            fontSize: 22,
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: '0 6px 16px rgba(0,0,0,0.28), inset 0 2px 6px rgba(255,255,255,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="主選單"
        >
          ☰
        </button>

        {/* 【正下方中央：🧭 地圖按鈕（完全對照圖 3 正下方中央的指北針圓鈕！點進去是圖 2 的周圍/俯瞰地圖）】 */}
        <button
          onClick={() => {
            requestAndApplyRealLocation(false);
            setMapPerspective('surround'); // 點進去先是周圍地圖視角
            setMapBearing(0);
            setRecenterSeq((s) => s + 1);
            setIsInteractiveMapOpen(true);
          }}
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 'max(16px, env(safe-area-inset-bottom))',
            zIndex: 20,
            width: 58,
            height: 58,
            borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.9)',
            background: 'radial-gradient(circle at 30% 30%, rgba(52,211,153,0.95), rgba(4,120,87,0.95))',
            color: '#FFFFFF',
            fontSize: 26,
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(0,0,0,0.32), inset 0 3px 8px rgba(255,255,255,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="開啟散步地圖"
        >
          🧭
        </button>

        {/* 右下角垂直三顆玻璃球圓鈕：🌼 花朵 ｜ 🍳 油鍋 ｜ 😗 口哨 */}
        <div
          style={{
            position: 'absolute',
            right: 16,
            bottom: 'max(14px, env(safe-area-inset-bottom))',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10
          }}
        >
          {/* 🌼 花朵（開啟種花模式／種花中顯示目前玻璃瓶與剩餘片數） */}
          <button
            onClick={() => setShowPlantingDrawer(true)}
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              border: isPlanting
                ? '2.5px solid #4ADE80'
                : '2.5px solid rgba(255,255,255,0.88)',
              background: isPlanting
                ? 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(187,247,208,0.95))'
                : 'radial-gradient(circle at 30% 30%, rgba(167,243,208,0.85), rgba(16,185,129,0.9))',
              fontSize: 25,
              cursor: 'pointer',
              boxShadow: isPlanting
                ? '0 0 18px rgba(74,222,128,0.72), 0 6px 16px rgba(0,0,0,0.26)'
                : '0 6px 16px rgba(0,0,0,0.26), inset 0 3px 8px rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
            title="花朵：開啟種花模式"
          >
            {isPlanting ? (
              <>
                <GlassPetalJarSvg
                  color={activePetalColor}
                  petalCount={petalInventory[activePetalVariant.id] || 0}
                  shape={activePetalVariant.shape}
                  size={34}
                  uid="home_btn"
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: -4,
                    right: -4,
                    background: '#3F3F46',
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 900,
                    padding: '1px 5px',
                    borderRadius: 99,
                    border: '1.5px solid #FFFFFF'
                  }}
                >
                  {petalInventory[activePetalVariant.id] || 0}
                </span>
              </>
            ) : (
              '🌼'
            )}
          </button>

          {/* 🍳 油鍋（查看與油炸瓜糰，炸好從鍋裡撈起） */}
          <button
            onClick={() => setIsPlanterOpen(true)}
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              border: '2.5px solid rgba(255,255,255,0.88)',
              background: 'radial-gradient(circle at 30% 30%, rgba(167,243,208,0.85), rgba(16,185,129,0.9))',
              fontSize: 24,
              cursor: 'pointer',
              boxShadow: '0 6px 16px rgba(0,0,0,0.26), inset 0 3px 8px rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
            title="油鍋：炸瓜糰與從鍋裡撈起地瓜球"
          >
            🍳
            {readySeedlingsCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: '#EF4444',
                  color: '#FFF',
                  fontSize: 11,
                  fontWeight: 900,
                  padding: '1px 6px',
                  borderRadius: 99,
                  border: '2px solid #FFF'
                }}
              >
                {readySeedlingsCount}
              </span>
            )}
          </button>

          {/* 😗 口哨（快速集合並餵食精華花蜜） */}
          <button
            onClick={() => setIsGardenOpen(true)}
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.92)',
              background: 'radial-gradient(circle at 30% 30%, rgba(167,243,208,0.9), rgba(5,150,105,0.95))',
              fontSize: 27,
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(0,0,0,0.3), inset 0 3px 8px rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="口哨：集合並餵食地瓜球"
          >
            😗
          </button>
        </div>
      </div>

      {/* ==================== 點擊底部正中央 🧭 進入的「互動地圖畫面」（100% 對照圖 1 周圍視角 ＆ 圖 2 俯瞰視角！） ==================== */}
      {isInteractiveMapOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 950,
            background: '#65B741',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ flex: 1, position: 'relative' }}>
            <FlowerMap
              mode="interactive"
              cameraPerspective={mapPerspective}
              cameraBearing={mapBearing}
              recenterSeq={recenterSeq}
              focusedTarget={focusedMapTarget}
              onBearingChange={setMapBearing}
              onPerspectiveChange={setMapPerspective}
              myLat={myLat}
              myLng={myLng}
              isPlanting={isPlanting}
              activePetalColor={activePetalColor}
              squad={squadCreatures}
              flowers={worldDelta.flowers}
              worldDelta={worldDelta}
              bigFlowers={bigFlowers}
              mushrooms={mushrooms}
              activeExpeditions={expeditions.filter((e) => e.status === 'active')}
              onSelectBigFlower={(bf) => setSelectedBigFlower(bf)}
              onSelectMushroom={(m) => setSelectedMushroom(m)}
            />

            {/* 種花進行中頂部 HUD（「種植的花朵總數 / 目前獲得金幣 / 距離下一枚金幣」）與過場提示 */}
            <PlantingMapHudOverlay
              isPlanting={isPlanting}
              sessionFlowers={sessionPlantedCount}
              sessionCoins={sessionCoinsEarned}
              petalVariant={activePetalVariant}
              isAccelActive={isAccelActive}
              accelSecondsLeft={accelSecondsLeft}
              bannerText={plantingBanner}
            />

            {/* 圖一左上角：半透明圓形天氣鈕（未種花加速時顯示） */}
            {mapPerspective === 'surround' && !(isPlanting && isAccelActive) && (
              <button
                onClick={() => requestAndApplyRealLocation(false, true)}
                style={{
                  position: 'absolute',
                  top: 'max(18px, env(safe-area-inset-top))',
                  left: 16,
                  zIndex: 500,
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255,255,255,0.68)',
                  backdropFilter: 'blur(6px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                }}
                title="目前天氣與重新定位"
              >
                ☁️
              </button>
            )}

            {/* 右上角：半透明圓形指北針（隨 360° 視角旋轉，點擊可立即回正北方 0°） */}
            <button
              onClick={() => {
                setMapBearing(0);
                showToast('🧭 已將視角回正北方（0°）');
              }}
              style={{
                position: 'absolute',
                top: 'max(18px, env(safe-area-inset-top))',
                right: 16,
                zIndex: 500,
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(15, 23, 42, 0.42)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                cursor: 'pointer',
                transform: `rotate(${mapBearing.toFixed(1)}deg)`,
                transition: 'transform 0.1s linear'
              }}
              title="點擊回正北方視角 (0°)"
            >
              🧭
            </button>

            {/* 圖一左下側（返回鈕上方）：半透明圓弧「🔭 望遠鏡（探險與蘑菇一覽）」按鈕 */}
            {mapPerspective === 'surround' && (
              <button
                onClick={() => setIsExpeditionsOpen(true)}
                style={{
                  position: 'absolute',
                  left: 0,
                  bottom: 100,
                  zIndex: 500,
                  width: 68,
                  height: 52,
                  borderRadius: '0 99px 99px 0',
                  border: 'none',
                  background: 'rgba(120, 138, 108, 0.72)',
                  backdropFilter: 'blur(6px)',
                  color: '#FFFFFF',
                  fontSize: 24,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
                title="查看附近蘑菇與探險"
              >
                🔭
              </button>
            )}

            {/* 左下角：圓形綠色 < 返回主畫面按鈕（圖一、圖二共通） */}
            <button
              onClick={() => setIsInteractiveMapOpen(false)}
              style={{
                position: 'absolute',
                left: 18,
                bottom: 'max(22px, env(safe-area-inset-bottom))',
                zIndex: 500,
                width: 52,
                height: 52,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.75)',
                background: 'radial-gradient(circle at 30% 30%, rgba(74, 222, 128, 0.85), rgba(21, 128, 61, 0.92))',
                color: '#FFFFFF',
                fontSize: 22,
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(0,0,0,0.28), inset 0 2px 6px rgba(255,255,255,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="返回主畫面"
            >
              &lt;
            </button>

            {/* 底部正中央：【🚶 周圍視角 ｜ 🗺️ 俯瞰視角】雙切換膠囊（完全對照圖一、圖二底部中央！） */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                bottom: 'max(22px, env(safe-area-inset-bottom))',
                zIndex: 500,
                background: 'rgba(110, 145, 95, 0.78)',
                backdropFilter: 'blur(8px)',
                borderRadius: 99,
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
                border: '1.5px solid rgba(255,255,255,0.45)'
              }}
            >
              <button
                onClick={() => setMapPerspective('surround')}
                style={{
                  width: 42,
                  height: 36,
                  borderRadius: 10,
                  border: mapPerspective === 'surround' ? '2.5px solid #FFFFFF' : 'none',
                  background: mapPerspective === 'surround' ? '#16A34A' : 'rgba(255,255,255,0.22)',
                  color: '#FFFFFF',
                  fontSize: 19,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="周圍視角（圖一）"
              >
                🚶
              </button>

              <button
                onClick={() => setMapPerspective('overhead')}
                style={{
                  width: 42,
                  height: 36,
                  borderRadius: 10,
                  border: mapPerspective === 'overhead' ? '2.5px solid #FFFFFF' : 'none',
                  background: mapPerspective === 'overhead' ? '#16A34A' : 'rgba(255,255,255,0.22)',
                  color: '#FFFFFF',
                  fontSize: 19,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="俯瞰視角（圖二）"
              >
                🗺️
              </button>
            </div>

            {/* 右下角：在「圖一：周圍視角」顯示四顆透明綠玻璃球；在「圖二：俯瞰視角」顯示單顆 🎯 定位圓鈕！ */}
            {mapPerspective === 'surround' ? (
              <div
                style={{
                  position: 'absolute',
                  right: 16,
                  bottom: 'max(18px, env(safe-area-inset-bottom))',
                  zIndex: 500,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                {/* 1. 📡 探測器 */}
                <button
                  onClick={() => setIsDetectorOpen(true)}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.85)',
                    background: 'radial-gradient(circle at 30% 30%, rgba(167,243,208,0.78), rgba(16,185,129,0.85))',
                    fontSize: 24,
                    cursor: 'pointer',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.25), inset 0 3px 8px rgba(255,255,255,0.65)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  📡
                  <span
                    style={{
                      position: 'absolute',
                      bottom: -4,
                      right: -4,
                      background: 'rgba(255,255,255,0.92)',
                      color: '#0F172A',
                      fontSize: 10,
                      fontWeight: 900,
                      padding: '1px 6px',
                      borderRadius: 99
                    }}
                  >
                    1
                  </span>
                </button>

                {/* 2. 🌼 花朵（種花中顯示玻璃花瓶＋剩餘花瓣數與光暈，對照皮克敏影片） */}
                <button
                  onClick={() => setShowPlantingDrawer(true)}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    border: isPlanting ? '2.5px solid #4ADE80' : '2px solid rgba(255,255,255,0.85)',
                    background: isPlanting
                      ? 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(187,247,208,0.92))'
                      : 'radial-gradient(circle at 30% 30%, rgba(167,243,208,0.78), rgba(16,185,129,0.85))',
                    fontSize: 25,
                    cursor: 'pointer',
                    boxShadow: isPlanting
                      ? '0 0 20px rgba(74, 222, 128, 0.78), 0 6px 16px rgba(0,0,0,0.25)'
                      : '0 6px 16px rgba(0,0,0,0.25), inset 0 3px 8px rgba(255,255,255,0.65)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {isPlanting ? (
                    <>
                      <GlassPetalJarSvg
                        color={activePetalColor}
                        petalCount={petalInventory[activePetalVariant.id] || 0}
                        shape={activePetalVariant.shape}
                        size={34}
                        uid="map_btn"
                      />
                      <span
                        style={{
                          position: 'absolute',
                          bottom: -4,
                          right: -4,
                          background: '#3F3F46',
                          color: '#FFFFFF',
                          fontSize: 10,
                          fontWeight: 900,
                          padding: '1px 6px',
                          borderRadius: 99,
                          border: '1.5px solid #FFFFFF'
                        }}
                      >
                        {petalInventory[activePetalVariant.id] || 0}
                      </span>
                    </>
                  ) : (
                    '🌼'
                  )}
                </button>

                {/* 3. 🍳 油鍋 */}
                <button
                  onClick={() => setIsPlanterOpen(true)}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.85)',
                    background: 'radial-gradient(circle at 30% 30%, rgba(167,243,208,0.78), rgba(16,185,129,0.85))',
                    fontSize: 23,
                    cursor: 'pointer',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.25), inset 0 3px 8px rgba(255,255,255,0.65)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  🍳
                </button>

                {/* 4. 😗 口哨 */}
                <button
                  onClick={() => setIsGardenOpen(true)}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    border: '2.5px solid rgba(255,255,255,0.9)',
                    background: 'radial-gradient(circle at 30% 30%, rgba(167,243,208,0.85), rgba(5,150,105,0.92))',
                    fontSize: 28,
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.3), inset 0 3px 8px rgba(255,255,255,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  😗
                </button>
              </div>
            ) : (
              /* 圖二「俯瞰視角」右下角的單顆 🎯 定位回正圓鈕 */
              <button
                onClick={() => {
                  setRecenterSeq((s) => s + 1);
                  requestAndApplyRealLocation(false, true);
                }}
                style={{
                  position: 'absolute',
                  right: 18,
                  bottom: 'max(22px, env(safe-area-inset-bottom))',
                  zIndex: 500,
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.75)',
                  background: 'radial-gradient(circle at 30% 30%, rgba(74, 222, 128, 0.85), rgba(21, 128, 61, 0.92))',
                  color: '#FFFFFF',
                  fontSize: 22,
                  cursor: 'pointer',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.28), inset 0 2px 6px rgba(255,255,255,0.55)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="定位回正"
              >
                🎯
              </button>
            )}
          </div>
        </div>
      )}

      {/* ==================== 頂部通知 Toast ==================== */}
      {toastBanner && (
        <div
          style={{
            position: 'fixed',
            top: 'max(16px, env(safe-area-inset-top))',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '92%',
            maxWidth: 440,
            background: 'rgba(15, 23, 42, 0.95)',
            color: '#FEF08A',
            padding: '12px 16px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 800,
            zIndex: 2000,
            boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
            border: '2px solid #F59E0B'
          }}
        >
          {toastBanner}
        </div>
      )}

      {/* ==================== 所有彈出功能面板 ==================== */}

      {/* 📍 定位與所在地搜尋面板（當 Windows 系統關閉定位服務使瀏覽器顯示 ⊘ 時，可直接搜尋路名/地區定位） */}
      {isLocationModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2100,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 380,
              background: '#FFFFFF',
              borderRadius: 24,
              padding: '20px 18px',
              boxShadow: '0 16px 40px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#0F172A' }}>
                📍 設定您的真實所在位置
              </div>
              <button
                onClick={() => setIsLocationModalOpen(false)}
                style={{
                  border: 'none',
                  background: '#F1F5F9',
                  borderRadius: '50%',
                  width: 30,
                  height: 30,
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, marginBottom: 12 }}>
              若電腦瀏覽器網址列出現 <b>⊘ 定位遭系統阻擋圖示</b>（Windows 系統「設定 &gt; 隱私權與安全性 &gt; 位置」未開啟），可直接輸入您所在的<b>行政區、路名、捷運站或地標</b>立即載入真實街道：
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualPlaceSearch();
                }}
                placeholder="例如：板橋車站、新莊區、內湖、台中一中..."
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1.5px solid #CBD5E1',
                  fontSize: 13,
                  outline: 'none'
                }}
              />
              <button
                onClick={handleManualPlaceSearch}
                disabled={isSearchingLocation}
                style={{
                  background: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 12,
                  padding: '0 16px',
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {isSearchingLocation ? '搜尋中...' : '定位'}
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {[
                { name: '中山/雙連', lat: 25.0553, lng: 121.5204 },
                { name: '信義區', lat: 25.0339, lng: 121.5645 },
                { name: '板橋', lat: 25.0142, lng: 121.4637 },
                { name: '新莊', lat: 25.036, lng: 121.4505 },
                { name: '中和/永和', lat: 25.0015, lng: 121.5123 },
                { name: '內湖', lat: 25.083, lng: 121.5868 },
                { name: '桃園/中壢', lat: 24.9537, lng: 121.2256 },
                { name: '新竹', lat: 24.8016, lng: 120.9716 },
                { name: '台中', lat: 24.1618, lng: 120.6469 },
                { name: '台南', lat: 22.9971, lng: 120.2126 },
                { name: '高雄', lat: 22.669, lng: 120.3029 }
              ].map((p) => (
                <button
                  key={p.name}
                  onClick={() => {
                    applyVerifiedLocation(p.lat, p.lng, p.name);
                    setIsLocationModalOpen(false);
                  }}
                  style={{
                    background: '#ECFDF5',
                    color: '#065F46',
                    border: '1px solid #A7F3D0',
                    borderRadius: 99,
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <button
              onClick={() => requestAndApplyRealLocation(true)}
              style={{
                width: '100%',
                background: '#F1F5F9',
                color: '#334155',
                border: '1px solid #CBD5E1',
                borderRadius: 12,
                padding: '9px 12px',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              🔄 重新向瀏覽器讀取硬體 GPS 座標
            </button>
          </div>
        </div>
      )}

      {/* 🎖️ 飾品一覽 */}
      {isDecorModalOpen && (
        <DecorCollectionModal
          creatures={creatures}
          onClose={() => setIsDecorModalOpen(false)}
        />
      )}

      {/* ➿ 好友與共同世界 */}
      {isFriendsModalOpen && (
        <FriendsAndWorldModal
          playerName={playerName}
          worldKey={worldKey}
          cloudUrl={cloudUrl}
          postcards={postcards}
          onChangePlayerName={setPlayerName}
          onChangeWorldKey={setWorldKey}
          onChangeCloudUrl={setCloudUrl}
          onClose={() => setIsFriendsModalOpen(false)}
        />
      )}

      {/* 📢 通知與活動公告 */}
      {isNotificationsModalOpen && (
        <NotificationsModal
          logs={activityLogs}
          onTestIosNotification={async () => {
            await requestAllPermissions();
            if (seedlings[0]) triggerSeedlingReadyNotification(seedlings[0]);
            showToast('🔔 已發送測試瓜糰炸熟通知！');
          }}
          onClose={() => setIsNotificationsModalOpen(false)}
        />
      )}

      {/* 🍄 探險一覽（點主畫面地圖上方「你有 X 項探險！」進入） */}
      {isExpeditionsOpen && (
        <ExpeditionsModal
          myLat={myLat}
          myLng={myLng}
          todaySteps={todaySteps}
          dailyMoods={dailyMoods}
          expeditions={expeditions}
          mushrooms={mushrooms}
          creatures={creatures}
          seedlings={seedlings}
          postcards={postcards}
          onSelectMushroom={(m) => {
            // 保留 isExpeditionsOpen=true，讓點進蘑菇詳情按「返回」時精準回到原本的探險頁面！
            setSelectedMushroom(m);
          }}
          onDispatchExpedition={handleDispatchExpedition}
          onClaimCompletedExpedition={handleClaimExpedition}
          onOpenDecorModal={() => setIsDecorModalOpen(true)}
          onOpenPlanterModal={() => setIsPlanterOpen(true)}
          onOpenGardenModal={() => setIsGardenOpen(true)}
          onClose={() => setIsExpeditionsOpen(false)}
        />
      )}

      {/* 🙂 每日紀錄 (Lifelog) */}
      {isLifelogModalOpen && (
        <DailyLifelogModal
          todaySteps={todaySteps}
          dailyMoods={dailyMoods}
          onSelectMoodToday={(emoji, note) => {
            setDailyMoods((prev) => ({ ...prev, 1: emoji }));
            setNectarJar((prev) => ({ ...prev, yellow: prev.yellow + 10 }));
            setIsLifelogModalOpen(false);
            showToast(`${emoji} 已記錄今日散步日記「${note}」，獲得 +10 滴黃色花蜜！`);
          }}
          onClose={() => setIsLifelogModalOpen(false)}
        />
      )}

      {/* 🧑‍🌾 個人資訊 / ☰ 主選單 */}
      {isProfileMenuOpen && (
        <ProfileAndMenuModal
          playerName={playerName}
          level={playerLevel}
          todaySteps={todaySteps}
          coins={coins}
          creaturesCount={creatures.length}
          petalJar={petalJar}
          nectarJar={nectarJar}
          privacyZone={privacyZone}
          onChangePrivacyZone={(next) =>
            setPrivacyZone({ ...next, lat: myLat, lng: myLng })
          }
          onChangePlayerName={setPlayerName}
          onSimulateWalkSteps={(s) => addStepsAndCheckSeedlings(s)}
          onOpenSubModal={(target) => {
            setIsProfileMenuOpen(false);
            if (target === 'garden') setIsGardenOpen(true);
            if (target === 'planter') setIsPlanterOpen(true);
            if (target === 'expeditions') setIsExpeditionsOpen(true);
            if (target === 'decor') setIsDecorModalOpen(true);
            if (target === 'friends') setIsFriendsModalOpen(true);
            if (target === 'shop') setIsShopModalOpen(true);
            if (target === 'guide') setIsGuideModalOpen(true);
          }}
          onClose={() => setIsProfileMenuOpen(false)}
        />
      )}

      {/* 🛍️ 商店 */}
      {isShopModalOpen && (
        <ShopModal
          coins={coins}
          onBuyItem={handleBuyShopItem}
          onClose={() => setIsShopModalOpen(false)}
        />
      )}

      {/* 🌼 皮克敏風格種花全螢幕抽屜介面 */}
      {showPlantingDrawer && (
        <FlowerPlantingModal
          activeVariantId={activePetalVariant.id}
          isPlanting={isPlanting}
          petalInventory={petalInventory}
          nectarInventory={nectarInventory}
          squadCreatures={squadCreatures}
          isWithOthers={isWithOthers}
          onToggleWithOthers={() => setIsWithOthers((v) => !v)}
          accelCount={accelCount}
          isAccelActive={isAccelActive}
          onToggleAccel={() => {
            if (!isAccelActive && accelCount <= 0) {
              showToast('⚠️ 加速道具已用完');
              return;
            }
            if (!isAccelActive) {
              setAccelCount((c) => Math.max(0, c - 1));
              setAccelExpiresAt(Date.now() + 15 * 60 * 1000);
            }
          }}
          onSelectPetalVariant={(variantId) => {
            const v = getPetalVariantMeta(variantId);
            setActivePetalVariantId(variantId);
            if (isPlanting) {
              setNativeBackgroundPlanting({
                isPlanting: true,
                petalColor: v.color,
                remainingPetals: petalInventory[variantId] || 0,
                playerId: playerName,
                syncEndpointUrl: cloudUrl,
                roomCode: worldKey
              });
            }
          }}
          onStartPlanting={handleStartPlanting}
          onStopPlanting={() => handleStopPlanting(false)}
          onOpenDetector={() => {
            setShowPlantingDrawer(false);
            setIsDetectorOpen(true);
          }}
          onClose={() => setShowPlantingDrawer(false)}
        />
      )}

      {/* 🌸 結束種花結算畫面（街廓地圖 ＋ 種花時間 ＋ 種植朵數 ＋ 確定） */}
      {plantingSummary && (
        <PlantingSummaryModal
          summary={plantingSummary}
          onConfirm={() => setPlantingSummary(null)}
        />
      )}

      {/* 🍳 油鍋（查看與油炸瓜糰 & 用網勺從鍋裡撈起地瓜球） */}
      {isPlanterOpen && (
        <PlanterPackModal
          seedlings={seedlings}
          isPlanting={isPlanting}
          onAssignToSlot={handleAssignSeedlingToSlot}
          onPluckSeedling={handlePluckSeedling}
          onDebugAddSteps={(steps) => addStepsAndCheckSeedlings(steps)}
          onClose={() => setIsPlanterOpen(false)}
        />
      )}

      {/* 😗 口哨（快速集合並餵食精華花蜜 & 滑動收花瓣） */}
      {isGardenOpen && (
        <GardenWhistleView
          creatures={creatures}
          nectarJar={nectarJar}
          petalJar={petalJar}
          selectedNectar={selectedNectar}
          onSelectNectar={setSelectedNectar}
          onThrowNectarToFeed={handleThrowNectarToFeed}
          onSwipePluckSingle={handleSwipePluckSingle}
          onWhistleGather={handleWhistleGather}
          onCloseGarden={() => setIsGardenOpen(false)}
        />
      )}

      {/* 📡 探測器雷達 */}
      {isDetectorOpen && (
        <DetectorModal
          nearbyDecors={nearbyDecors}
          isScanning={isScanningRadar}
          onFireDetector={handleFireDetector}
          onClose={() => setIsDetectorOpen(false)}
        />
      )}

      {/* 📖 主畫面「蘑菇種類、血量與打菇規則說明」Modal */}
      {isGuideModalOpen && (
        <MushroomGuideModal onClose={() => setIsGuideModalOpen(false)} />
      )}

      {/* 🍄 全螢幕蘑菇詳情與開打畫面 */}
      {selectedMushroom && (
        <MushroomBattleModal
          mushroom={selectedMushroom}
          creatures={creatures}
          onJoinMushroomBattle={handleJoinMushroomBattle}
          onNavigateToMap={(m) => {
            setSelectedMushroom(null);
            setIsExpeditionsOpen(false);
            setMapPerspective('overhead');
            setIsInteractiveMapOpen(true);
            setFocusedMapTarget({
              lat: m.lat,
              lng: m.lng,
              mushroomId: m.id,
              seq: Date.now()
            });
          }}
          onClose={() => setSelectedMushroom(null)}
        />
      )}

      {/* 🌺 大花詳情 */}
      {selectedBigFlower && (
        <div
          onClick={() => setSelectedBigFlower(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(0,0,0,0.55)',
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
              padding: '24px 20px',
              width: '100%',
              maxWidth: 340,
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: 54 }}>
              {selectedBigFlower.currentFlowers >= selectedBigFlower.requiredFlowers ? '🌺' : '🌷'}
            </div>
            <div style={{ fontSize: 19, fontWeight: 900, color: '#0F172A', marginTop: 6 }}>
              {selectedBigFlower.name}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#16A34A', margin: '8px 0 14px' }}>
              {selectedBigFlower.currentFlowers >= selectedBigFlower.requiredFlowers
                ? '✨ 大花已盛開！往下拉花朵即可獲得花蜜！'
                : `在圓圈範圍內再種 ${selectedBigFlower.requiredFlowers - selectedBigFlower.currentFlowers} 朵花即可盛開！`}
            </div>

            {selectedBigFlower.currentFlowers >= selectedBigFlower.requiredFlowers && (
              <button
                onClick={() => {
                  const color = selectedBigFlower.bloomedColor || 'red';
                  setNectarJar((prev) => ({ ...prev, [color]: prev[color] + 15 }));
                  setSelectedBigFlower(null);
                  showToast(`🌺 從盛開的大花採集了 +15 滴${PETAL_META[color].nectarName}！`);
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: '#FFF',
                  fontWeight: 900,
                  fontSize: 14,
                  padding: '12px',
                  borderRadius: 99,
                  cursor: 'pointer',
                  marginBottom: 8
                }}
              >
                ⬇️ 下拉花朵採集花蜜 (+15)
              </button>
            )}

            <button
              onClick={() => setSelectedBigFlower(null)}
              style={{
                width: '100%',
                border: '1.5px solid #CBD5E1',
                background: '#FFF',
                color: '#475569',
                fontWeight: 900,
                fontSize: 14,
                padding: '11px',
                borderRadius: 99,
                cursor: 'pointer'
              }}
            >
              關閉
            </button>
          </div>
        </div>
      )}

      {/* 🍠 從油鍋撈起新地瓜球或穿上飾品登場畫面 */}
      {newlyPluckedCreature && (
        <div
          onClick={() => setNewlyPluckedCreature(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'radial-gradient(circle, rgba(254,240,138,0.96) 0%, rgba(253,224,71,0.96) 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 900, color: '#B45309' }}>
            {newlyPluckedCreature.hasDecor ? '🎁 獲得飾品地瓜球！' : '🥄 剛從黃金油鍋撈起新夥伴！'}
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>
            {newlyPluckedCreature.name}
          </div>

          <div style={{ margin: '20px 0' }}>
            <DeGuaCharacter
              variety={newlyPluckedCreature.variety}
              decor={newlyPluckedCreature.decor}
              leafStage={newlyPluckedCreature.leafStage}
              flowerColor={newlyPluckedCreature.flowerColor}
              showDecor={newlyPluckedCreature.hasDecor}
              size={155}
            />
          </div>

          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              padding: '14px 20px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              fontSize: 13,
              fontWeight: 800,
              color: '#334155',
              lineHeight: 1.6,
              marginBottom: 24
            }}
          >
            📍 發現於：{newlyPluckedCreature.placeName}
            <br />
            🏷️ 分類：{DECOR_CATALOG[newlyPluckedCreature.decor].icon}{' '}
            {DECOR_CATALOG[newlyPluckedCreature.decor].placeCategory}
            {newlyPluckedCreature.hasDecor && (
              <>
                <br />
                ✨ 飾品：{DECOR_CATALOG[newlyPluckedCreature.decor].name}
              </>
            )}
          </div>

          <button
            onClick={() => setNewlyPluckedCreature(null)}
            style={{
              border: 'none',
              background: '#D97706',
              color: '#FFF',
              fontWeight: 900,
              fontSize: 16,
              padding: '14px 48px',
              borderRadius: 99,
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(217,119,6,0.35)'
            }}
          >
            收進隊伍！
          </button>
        </div>
      )}
    </div>
  );
};
