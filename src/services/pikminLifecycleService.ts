import { DeGuaCreature, PetalColor } from '../types/game';

export const RESET_HOUR_LOCAL = 4; // 每日凌晨 4:00 重置
export const NIGHT_LOCK_START_HOUR = 21; // 晚上 9:00 ~ 凌晨 4:00 走路不轉換狀態
export const EIGHT_HOURS_MS = 8 * 3600 * 1000;
export const SIX_HOURS_MS = 6 * 3600 * 1000;
export const TWO_HOURS_MS = 2 * 3600 * 1000;

export const SQUAD_LEAF_TO_BUD_STEPS = 1800; // 1,700 ~ 2,000 步
export const ALL_CREATURES_BUD_DAILY_STEPS = 5200; // 5,000 ~ 5,500 步
export const BARE_TO_LEAF_STEPS = 1800; // 6 小時倒數中，每走 1 步扣 12 秒，走滿約 1,800 步即長回葉子
export const BARE_STEP_BONUS_MS = 12_000;
export const MAX_FEED_SLOTS = 6; // 0/6 ~ 6/6

export interface DailyLifecycleState {
  dayKey: string;
  firstLoginAt: number;
  dailySteps: number;
  eightHourBudApplied: boolean;
  allBudTriggered: boolean;
}

/**
 * 計算「所在時區自然日 (凌晨 00:00 重置)」鍵值（用於今日步數與每日免費商店禮物）。
 */
export function getLocalCalendarDayKey(nowMs: number = Date.now()): string {
  const local = new Date(nowMs);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, '0');
  const d = String(local.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 計算「皮克敏遊戲日」鍵值：以每日凌晨 04:00 為換日點（葉子／花苞與每日金幣上限重置用）。
 * 例如凌晨 02:30 仍屬於前一個遊戲日，04:00 起算新的一天。
 */
export function getGameDayKey(nowMs: number = Date.now()): string {
  const shifted = new Date(nowMs - RESET_HOUR_LOCAL * 3600 * 1000);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, '0');
  const d = String(shifted.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 晚上 21:00 ~ 凌晨 03:59 期間，即使持續走路也不會觸發葉子/花苞/光禿禿狀態轉變。
 */
export function isNightStateLockTime(nowMs: number = Date.now()): boolean {
  const hour = new Date(nowMs).getHours();
  return hour >= NIGHT_LOCK_START_HOUR || hour < RESET_HOUR_LOCAL;
}

export function createInitialDailyLifecycleState(nowMs: number = Date.now()): DailyLifecycleState {
  return {
    dayKey: getGameDayKey(nowMs),
    firstLoginAt: nowMs,
    dailySteps: 0,
    eightHourBudApplied: false,
    allBudTriggered: false
  };
}

/**
 * 依據時間檢查：
 * 1) 跨越凌晨 4:00 -> 全體重置為葉子 (0/6)
 * 2) 非光禿禿且超過 2 小時未餵食 -> 每 2 小時恢復 1 格飢餓度
 * 3) 光禿禿等待滿 6 小時 -> 長回葉子 (0/6)
 * 4) 凌晨 4:00 後登入滿 8 小時 -> 隊伍中或未餵食地瓜球自動從葉子變花苞
 */
export function reconcileCreatureLifecycle(
  creatures: DeGuaCreature[],
  dailyState: DailyLifecycleState,
  nowMs: number = Date.now()
): {
  creatures: DeGuaCreature[];
  dailyState: DailyLifecycleState;
  didDailyReset: boolean;
  didEightHourBud: boolean;
} {
  const currentDayKey = getGameDayKey(nowMs);

  // 1. 每日凌晨 4:00 重置所有皮克敏為「葉子」
  if (dailyState.dayKey !== currentDayKey) {
    const resetCreatures = creatures.map((c) => ({
      ...c,
      leafStage: 'leaf' as const,
      pluckCountToday: 0,
      feedCount: 0,
      lastFedAt: null,
      bareAt: null,
      bareWalkSteps: 0,
      squadWalkSteps: 0,
      budBonusPending: false
    }));
    const nextDailyState: DailyLifecycleState = {
      dayKey: currentDayKey,
      firstLoginAt: nowMs,
      dailySteps: 0,
      eightHourBudApplied: false,
      allBudTriggered: false
    };
    return {
      creatures: resetCreatures,
      dailyState: nextDailyState,
      didDailyReset: true,
      didEightHourBud: false
    };
  }

  let didEightHourBud = false;
  let updatedCreatures = creatures.map((c) => {
    let next = c;
    const feedCount = next.feedCount ?? 0;

    // 2. 光禿禿等待滿 6 小時長回葉子
    if (next.leafStage === 'bare' && next.bareAt && nowMs - next.bareAt >= SIX_HOURS_MS) {
      next = {
        ...next,
        leafStage: 'leaf',
        feedCount: 0,
        lastFedAt: null,
        bareAt: null,
        bareWalkSteps: 0,
        squadWalkSteps: 0,
        budBonusPending: false
      };
    } else if (next.leafStage !== 'bare' && feedCount > 0 && next.lastFedAt) {
      // 3. 飢餓度緩慢恢復：每 2 小時回復 1 格 (0/6 ~ 5/6)
      const slotsRecovered = Math.floor((nowMs - next.lastFedAt) / TWO_HOURS_MS);
      if (slotsRecovered > 0) {
        const nextFeed = Math.max(0, feedCount - slotsRecovered);
        next = {
          ...next,
          feedCount: nextFeed,
          lastFedAt: nextFeed > 0 ? next.lastFedAt + slotsRecovered * TWO_HOURS_MS : null
        };
      }
    }
    return next;
  });

  // 4. 凌晨 4:00 後登入起算滿 8 小時：未餵食或隊伍中葉子自動變花苞
  let nextDailyState = dailyState;
  if (!dailyState.eightHourBudApplied && nowMs - dailyState.firstLoginAt >= EIGHT_HOURS_MS) {
    let converted = false;
    updatedCreatures = updatedCreatures.map((c) => {
      if (c.leafStage === 'leaf' && ((c.feedCount ?? 0) === 0 || c.inSquad)) {
        converted = true;
        return { ...c, leafStage: 'bud' as const };
      }
      return c;
    });
    didEightHourBud = converted;
    nextDailyState = { ...dailyState, eightHourBudApplied: true };
  }

  return {
    creatures: updatedCreatures,
    dailyState: nextDailyState,
    didDailyReset: false,
    didEightHourBud
  };
}

/**
 * 走路步數觸發狀態轉換：
 * - 晚上 21:00 ~ 04:00 不轉換狀態
 * - 隊伍中葉子走滿 1,800 步 -> 變花苞
 * - 光禿禿走滿 2,000 步 -> 長回葉子
 * - 當日累積達 5,200 步 -> 全體（含待命中）葉子自動變花苞
 */
export function applyWalkingStepsToLifecycle(
  creatures: DeGuaCreature[],
  dailyState: DailyLifecycleState,
  deltaSteps: number,
  nowMs: number = Date.now()
): {
  creatures: DeGuaCreature[];
  dailyState: DailyLifecycleState;
  squadBudCount: number;
  allBudTriggeredNow: boolean;
  bareRecoveredCount: number;
} {
  const reconciled = reconcileCreatureLifecycle(creatures, dailyState, nowMs);
  let nextDaily = reconciled.dailyState;
  let nextCreatures = reconciled.creatures;

  if (deltaSteps <= 0) {
    return {
      creatures: nextCreatures,
      dailyState: nextDaily,
      squadBudCount: 0,
      allBudTriggeredNow: false,
      bareRecoveredCount: 0
    };
  }

  nextDaily = {
    ...nextDaily,
    dailySteps: nextDaily.dailySteps + deltaSteps
  };

  // 晚上 9:00 ~ 凌晨 4:00 走路不會轉變頭頂狀態
  if (isNightStateLockTime(nowMs)) {
    return {
      creatures: nextCreatures,
      dailyState: nextDaily,
      squadBudCount: 0,
      allBudTriggeredNow: false,
      bareRecoveredCount: 0
    };
  }

  let squadBudCount = 0;
  let bareRecoveredCount = 0;
  let allBudTriggeredNow = false;

  const shouldTriggerAllBud =
    !nextDaily.allBudTriggered && nextDaily.dailySteps >= ALL_CREATURES_BUD_DAILY_STEPS;

  nextCreatures = nextCreatures.map((c) => {
    const stepWalkDelta = c.inSquad && c.busyState === 'free' ? deltaSteps : 0;
    const nextTotalWalked = (c.stepsWalked ?? 0) + stepWalkDelta;

    // 禿頭恢復：不論是否在隊伍或待機，白天走每 1 步皆可使 6 小時冷卻縮短 12 秒（合計約 1,800 步長回葉子）
    if (c.leafStage === 'bare') {
      const nextBareSteps = (c.bareWalkSteps ?? 0) + deltaSteps;
      const elapsedBareMs = c.bareAt ? Math.max(0, nowMs - c.bareAt) : 0;
      const effectiveBareMs = elapsedBareMs + nextBareSteps * BARE_STEP_BONUS_MS;
      if (effectiveBareMs >= SIX_HOURS_MS || nextBareSteps >= BARE_TO_LEAF_STEPS) {
        bareRecoveredCount++;
        return {
          ...c,
          stepsWalked: nextTotalWalked,
          leafStage: shouldTriggerAllBud ? ('bud' as const) : ('leaf' as const),
          feedCount: 0,
          lastFedAt: null,
          bareAt: null,
          bareWalkSteps: 0,
          squadWalkSteps: 0,
          budBonusPending: false
        };
      }
      return {
        ...c,
        stepsWalked: nextTotalWalked,
        bareWalkSteps: nextBareSteps
      };
    }

    if (c.leafStage === 'leaf') {
      if (shouldTriggerAllBud) {
        squadBudCount++;
        return {
          ...c,
          stepsWalked: nextTotalWalked,
          leafStage: 'bud' as const,
          squadWalkSteps: 0
        };
      }
      if (c.inSquad && c.busyState === 'free') {
        const nextWalkSteps = (c.squadWalkSteps ?? 0) + deltaSteps;
        if (nextWalkSteps >= SQUAD_LEAF_TO_BUD_STEPS) {
          squadBudCount++;
          return {
            ...c,
            stepsWalked: nextTotalWalked,
            leafStage: 'bud' as const,
            squadWalkSteps: nextWalkSteps
          };
        }
        return {
          ...c,
          stepsWalked: nextTotalWalked,
          squadWalkSteps: nextWalkSteps
        };
      }
    }

    return stepWalkDelta > 0 ? { ...c, stepsWalked: nextTotalWalked } : c;
  });

  if (shouldTriggerAllBud) {
    nextDaily = { ...nextDaily, allBudTriggered: true };
    allBudTriggeredNow = true;
  }

  return {
    creatures: nextCreatures,
    dailyState: nextDaily,
    squadBudCount,
    allBudTriggeredNow,
    bareRecoveredCount
  };
}

/**
 * 餵食精華規則：
 * - 葉子 + 白色精華 -> 立即變「花苞」
 * - 葉子 + 紅/黃/藍精華 -> 直接開花（一般採收 +1 花瓣）
 * - 花苞 + 任何精華 -> 開花並標記雙倍採收 (budBonusPending = true，採收 +2 花瓣)
 * - 餵到第 6 格 (6/6) 開花後採收會變成光禿禿；光禿禿及開花中不吃精華
 */
export function feedNectarToSquad(
  creatures: DeGuaCreature[],
  selectedNectar: PetalColor,
  availableNectar: number,
  nowMs: number = Date.now()
): {
  creatures: DeGuaCreature[];
  usedNectar: number;
  buddedCount: number;
  bloomedCount: number;
  giftReadyCreatures: DeGuaCreature[];
} {
  if (availableNectar <= 0) {
    return {
      creatures,
      usedNectar: 0,
      buddedCount: 0,
      bloomedCount: 0,
      giftReadyCreatures: []
    };
  }

  let remaining = availableNectar;
  let usedNectar = 0;
  let buddedCount = 0;
  let bloomedCount = 0;
  const giftReadyCreatures: DeGuaCreature[] = [];

  const nextCreatures = creatures.map((c) => {
    if (
      remaining <= 0 ||
      !c.inSquad ||
      c.busyState !== 'free' ||
      c.leafStage === 'flower' ||
      c.leafStage === 'bare' ||
      (c.feedCount ?? 0) >= MAX_FEED_SLOTS
    ) {
      return c;
    }

    remaining--;
    usedNectar++;

    const nextFeedCount = Math.min(MAX_FEED_SLOTS, (c.feedCount ?? 0) + 1);
    const friendGain = c.friendship < 400 ? 20 : 5;
    const nextFriendship = Math.min(800, c.friendship + friendGain);
    const becameGiftReady = nextFriendship >= 400 && !c.hasDecor && !c.giftExpeditionCreated;

    let nextLeafStage: DeGuaCreature['leafStage'] = 'flower';
    let nextBudBonus = false;
    let nextFlowerColor = selectedNectar;

    if (c.leafStage === 'leaf' && selectedNectar === 'white' && nextFeedCount < MAX_FEED_SLOTS) {
      // 葉子餵食白色精華 -> 立刻變花苞（若已餵滿第 6 格則開出最後一朵花，採收後變光禿禿）
      nextLeafStage = 'bud';
      nextBudBonus = false;
      nextFlowerColor = 'white';
      buddedCount++;
    } else if (c.leafStage === 'bud') {
      // 花苞再餵食任何精華 -> 開花並享雙倍花瓣
      nextLeafStage = 'flower';
      nextBudBonus = true;
      bloomedCount++;
    } else {
      // 葉子餵食黃/紅/藍精華 -> 開花（單倍）
      nextLeafStage = 'flower';
      nextBudBonus = false;
      bloomedCount++;
    }

    const updated: DeGuaCreature = {
      ...c,
      leafStage: nextLeafStage,
      flowerColor: nextFlowerColor,
      friendship: nextFriendship,
      feedCount: nextFeedCount,
      lastFedAt: nowMs,
      budBonusPending: nextBudBonus,
      giftExpeditionCreated: becameGiftReady ? true : c.giftExpeditionCreated
    };

    if (becameGiftReady) {
      giftReadyCreatures.push(updated);
    }

    return updated;
  });

  return {
    creatures: nextCreatures,
    usedNectar,
    buddedCount,
    bloomedCount,
    giftReadyCreatures
  };
}

/**
 * 採收開花地瓜球頭上的花瓣：
 * - 由花苞開的花可得 2 片花瓣（雙倍）；由葉子開的花得 1 片
 * - feedCount 尚未滿 6/6 時，採收後長回「葉子」可繼續 0/6 ~ 5/6 循環
 * - 若已達 6/6，採收後變為「光禿禿 (bare)」，需等待 6 小時或走 2,000 步長回葉子
 */
export function harvestCreatureFlower(
  creatures: DeGuaCreature[],
  creatureId: string,
  nowMs: number = Date.now()
): {
  creatures: DeGuaCreature[];
  petalsGained: number;
  petalColor: PetalColor | null;
  becameBare: boolean;
} {
  const target = creatures.find((c) => c.id === creatureId);
  if (!target || target.leafStage !== 'flower') {
    return { creatures, petalsGained: 0, petalColor: null, becameBare: false };
  }

  const petalsGained = target.budBonusPending ? 2 : 1;
  const feedCount = target.feedCount ?? 1;
  const becameBare = feedCount >= MAX_FEED_SLOTS;

  const nextCreatures = creatures.map((c) => {
    if (c.id !== creatureId) return c;
    return {
      ...c,
      leafStage: becameBare ? ('bare' as const) : ('leaf' as const),
      pluckCountToday: c.pluckCountToday + 1,
      budBonusPending: false,
      bareAt: becameBare ? nowMs : null,
      bareWalkSteps: 0,
      squadWalkSteps: 0
    };
  });

  return {
    creatures: nextCreatures,
    petalsGained,
    petalColor: target.flowerColor,
    becameBare
  };
}

/**
 * 探險結束返還隊員並結算友好度：
 * - 一般探險（花苗／水果）固定 +1 點友好度（不會因隻數較少而加倍）
 * - 禮物探險則是讓達成 4 顆紅心的主角帶回專屬飾品 (hasDecor = true)
 */
export function finalizeExpeditionCreatures(
  creatures: DeGuaCreature[],
  assignedIds: string[],
  kind: 'seedling' | 'fruit' | 'gift',
  targetCreatureId?: string,
  options?: { isRareGift?: boolean; rareDecorSetId?: string }
): {
  creatures: DeGuaCreature[];
  giftReadyCreatures: DeGuaCreature[];
} {
  const assignedSet = new Set(assignedIds);
  const giftReadyCreatures: DeGuaCreature[] = [];

  const nextCreatures = creatures.map((c) => {
    const isTargetGift = kind === 'gift' && c.id === targetCreatureId;
    const participated = assignedSet.has(c.id) || isTargetGift;
    if (!participated) return c;

    if (isTargetGift) {
      return {
        ...c,
        hasDecor: true,
        isRareDecor: options?.isRareGift ? true : c.isRareDecor,
        decorSetId: options?.rareDecorSetId || c.decorSetId,
        giftExpeditionCreated: true,
        busyState: 'free' as const
      };
    }

    const nextFriendship = Math.min(800, c.friendship + 1);
    const becameGiftReady = nextFriendship >= 400 && !c.hasDecor && !c.giftExpeditionCreated;
    const updated: DeGuaCreature = {
      ...c,
      friendship: nextFriendship,
      busyState: 'free' as const,
      giftExpeditionCreated: becameGiftReady ? true : c.giftExpeditionCreated
    };
    if (becameGiftReady) {
      giftReadyCreatures.push(updated);
    }
    return updated;
  });

  return {
    creatures: nextCreatures,
    giftReadyCreatures
  };
}
