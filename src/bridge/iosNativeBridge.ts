import { PetalColor, PlantedFlowerCell, Seedling, VARIETY_CATALOG, DECOR_CATALOG } from '../types/game';

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        DeGuaNative?: {
          postMessage: (msg: Record<string, unknown>) => void;
        };
      };
    };
    DeGuaNativeCallback?: {
      onNativeStepDelta?: (deltaSteps: number, totalTodaySteps: number) => void;
      onNativeBackgroundFlowerPlanted?: (cell: PlantedFlowerCell, remainingPetals: number) => void;
      onNativeLocationUpdate?: (lat: number, lng: number) => void;
    };
  }
}

export function isRunningInsideIosNative(): boolean {
  return Boolean(window.webkit?.messageHandlers?.DeGuaNative);
}

export function postToIosNative(action: string, payload: Record<string, unknown> = {}): void {
  try {
    if (window.webkit?.messageHandlers?.DeGuaNative) {
      window.webkit.messageHandlers.DeGuaNative.postMessage({
        action,
        ...payload
      });
    }
  } catch (err) {
    console.warn('[DeGuaNativeBridge] postMessage failed:', err);
  }
}

export function syncSeedlingsToNative(seedlings: Seedling[], plantingMultiplier: number): void {
  const activeTargets = seedlings
    .filter((s) => s.slotIndex !== null && !s.isReady)
    .map((s) => ({
      id: s.id,
      title: s.isHuge ? '巨大瓜糰' : VARIETY_CATALOG[s.variety].potName,
      placeName: `${s.placeName} (${DECOR_CATALOG[s.decor].placeCategory})`,
      currentSteps: s.currentSteps,
      targetSteps: s.targetSteps,
      notified: s.notified
    }));

  postToIosNative('syncSeedlings', {
    seedlings: activeTargets,
    plantingMultiplier
  });
}

export function setNativeBackgroundPlanting(params: {
  isPlanting: boolean;
  petalColor: PetalColor;
  remainingPetals: number;
  playerId: string;
  syncEndpointUrl: string;
  roomCode: string;
}): void {
  postToIosNative('setBackgroundPlanting', params);
}

export async function requestAllPermissions(): Promise<{
  notificationGranted: boolean;
  nativeBridgeActive: boolean;
}> {
  postToIosNative('requestPermissions', {});

  let notificationGranted = false;
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      notificationGranted = true;
    } else if (Notification.permission !== 'denied') {
      const res = await Notification.requestPermission();
      notificationGranted = res === 'granted';
    }
  }

  return {
    notificationGranted: notificationGranted || isRunningInsideIosNative(),
    nativeBridgeActive: isRunningInsideIosNative()
  };
}

export function triggerSeedlingReadyNotification(seedling: Seedling): void {
  const potTitle = seedling.isHuge ? '巨大瓜糰' : VARIETY_CATALOG[seedling.variety].potName;
  const title = '🍠 瓜糰已經炸熟浮起來了！';
  const body = `「${seedling.placeName}」附近的${potTitle}已經炸熟，快拿網勺從油鍋撈起來吧！`;

  postToIosNative('fireLocalNotification', {
    id: `seedling_ready_${seedling.id}`,
    title,
    body
  });

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        tag: `seedling_${seedling.id}`
      });
    } catch {
      // ignore
    }
  }
}
