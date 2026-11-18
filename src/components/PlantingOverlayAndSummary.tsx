import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { PetalColor, PETAL_META, PetalVariantMeta } from '../types/game';
import { FLOWERS_PER_COIN } from '../services/flowerPlantingEngine';
import { getVisiblePlaceLabels } from '../services/realMapService';
import { createPikminOsmShaderTileLayer } from './FlowerMap';

export interface PlantingSessionSummaryData {
  flowersPlanted: number;
  durationSeconds: number;
  coinsEarned: number;
  petalName: string;
  petalColor: PetalColor;
  centerLat: number;
  centerLng: number;
  points: { lat: number; lng: number; color: PetalColor }[];
}

export function formatPlantingDuration(totalSeconds: number): string {
  const sec = Math.max(1, Math.round(totalSeconds));
  if (sec < 60) return `${sec} 秒`;
  const mins = Math.floor(sec / 60);
  const remSec = sec % 60;
  return remSec > 0 ? `${mins} 分 ${remSec} 秒` : `${mins} 分鐘`;
}

/**
 * 進行種花時的地圖上方皮克敏 HUD 狀態列 ＋ 中央短暫過場提示（「種花 開始！」／「種花 結束！」）
 */
export const PlantingMapHudOverlay: React.FC<{
  isPlanting: boolean;
  sessionFlowers: number;
  sessionCoins: number;
  petalVariant: PetalVariantMeta;
  isAccelActive: boolean;
  accelSecondsLeft: number;
  bannerText: string | null;
}> = ({
  isPlanting,
  sessionFlowers,
  sessionCoins,
  petalVariant,
  isAccelActive,
  accelSecondsLeft,
  bannerText
}) => {
  const flowersToNextCoin = FLOWERS_PER_COIN - (sessionFlowers % FLOWERS_PER_COIN);
  const accelMin = Math.floor(accelSecondsLeft / 60);
  const accelSec = accelSecondsLeft % 60;

  return (
    <>
      {isPlanting && (
        <div
          style={{
            position: 'absolute',
            top: 'var(--top-safe-hud)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 520,
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(8px)',
            borderRadius: 18,
            padding: '7px 14px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.16)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 278,
            maxWidth: 'calc(100% - 128px)',
            pointerEvents: 'none'
          }}
        >
          {/* 左側：種植花朵總數 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>
              {PETAL_META[petalVariant.color].emoji}
            </span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>
                {sessionFlowers.toLocaleString()}
              </div>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: '#475569', marginTop: 2, whiteSpace: 'nowrap' }}>
                種植的花朵總數
              </div>
            </div>
          </div>

          <div style={{ width: 1, height: 28, background: '#CBD5E1' }} />

          {/* 右側：獲得金幣 & 距下一枚金幣朵數 */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>
                目前的獲得數量
              </span>
              <span style={{ fontSize: 12, fontWeight: 900, color: '#D97706' }}>
                🪙 {sessionCoins}
              </span>
            </div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#334155', marginTop: 2, whiteSpace: 'nowrap' }}>
              距離下一枚金幣：{flowersToNextCoin}
            </div>
          </div>
        </div>
      )}

      {/* 左側加速狀態徽章（對照影片左上角「加速」） */}
      {isPlanting && isAccelActive && (
        <div
          style={{
            position: 'absolute',
            top: 'max(72px, calc(env(safe-area-inset-top) + 58px))',
            left: 16,
            zIndex: 520,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#FFFFFF',
            borderRadius: 99,
            padding: '5px 12px',
            fontSize: 11.5,
            fontWeight: 900,
            boxShadow: '0 4px 12px rgba(5,150,105,0.38)',
            border: '1.5px solid rgba(255,255,255,0.75)',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            pointerEvents: 'none'
          }}
        >
          <span>⏩</span>
          <span>加速 {accelMin}:{String(accelSec).padStart(2, '0')}</span>
        </div>
      )}

      {/* 中央短暫淡入提示：「種花 開始！」／「種花 結束！」 */}
      {bannerText && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1300,
            background: 'rgba(15, 23, 42, 0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: 3,
              textShadow: '0 3px 14px rgba(0,0,0,0.65)'
            }}
          >
            {bannerText}
          </div>
        </div>
      )}
    </>
  );
};

/**
 * 結束種花結算視窗（100% 對照影片 00:35~00:43：真實街廓地圖 ＋ 種花時間 ＋ 種植朵數 ＋ 確定鈕）
 */
export const PlantingSummaryModal: React.FC<{
  summary: PlantingSessionSummaryData;
  onConfirm: () => void;
}> = ({ summary, onConfirm }) => {
  const mapBoxRef = useRef<HTMLDivElement | null>(null);
  const mapObjRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapBoxRef.current || mapObjRef.current) return;

    const map = L.map(mapBoxRef.current, {
      center: [summary.centerLat, summary.centerLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomAnimation: false
    });

    const shader = createPikminOsmShaderTileLayer(() => ({
      isMini: true,
      cameraPerspective: 'overhead'
    }));
    shader.addTo(map);

    const group = L.layerGroup().addTo(map);
    const labels = getVisiblePlaceLabels(summary.centerLat, summary.centerLng);
    labels.slice(0, 4).forEach((lb) => {
      const lblIcon = L.divIcon({
        className: 'pikmin-summary-label',
        html: `<div style="
          font-size: 11px;
          font-weight: 900;
          color: #1E293B;
          white-space: nowrap;
          text-shadow: -1px -1px 0 #FFF, 1px -1px 0 #FFF, -1px 1px 0 #FFF, 1px 1px 0 #FFF;
        ">${lb.name}</div>`,
        iconSize: [70, 18],
        iconAnchor: [35, 9]
      });
      L.marker([lb.lat, lb.lng], { icon: lblIcon, interactive: false }).addTo(group);
    });

    // 在結算地圖上點亮本次種植位置的小花軌跡
    const pts = summary.points.slice(0, 120);
    pts.forEach((pt) => {
      const hex = PETAL_META[pt.color].hex;
      L.circleMarker([pt.lat, pt.lng], {
        radius: 5,
        color: '#FFFFFF',
        weight: 1.5,
        fillColor: hex === '#FFFFFF' ? '#F8FAFC' : hex,
        fillOpacity: 0.95,
        interactive: false
      }).addTo(group);
    });

    const timer = window.setTimeout(() => map.invalidateSize({ animate: false }), 60);
    mapObjRef.current = map;

    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapObjRef.current = null;
    };
  }, [summary]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1350,
        background: 'rgba(15, 23, 42, 0.48)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 342,
          background: '#FFFFFF',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.34)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* 上半部：種花路線街廓地圖 */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 270,
            background: '#60B354'
          }}
        >
          <div ref={mapBoxRef} style={{ width: '100%', height: '100%' }} />

          {/* 左上角本次種植花朵總數膠囊（僅當數量清楚列示） */}
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              zIndex: 450,
              background: 'rgba(255,255,255,0.92)',
              borderRadius: 99,
              padding: '4px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: '0 2px 8px rgba(0,0,0,0.16)'
            }}
          >
            <span style={{ fontSize: 15 }}>{PETAL_META[summary.petalColor].emoji}</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#0F172A' }}>
              {summary.flowersPlanted.toLocaleString()} 朵
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#64748B' }}>
              ({summary.petalName})
            </span>
          </div>
        </div>

        {/* 中央簡潔數據列：種花時間 ＋ 種花數量 ＋ 金幣（不放冗長說明文字） */}
        <div
          style={{
            padding: '16px 20px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: '#334155' }}>種植花朵</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: '#0F172A' }}>
              {summary.flowersPlanted.toLocaleString()} 朵
              {summary.coinsEarned > 0 ? ` ・ 🪙 +${summary.coinsEarned}` : ''}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: '#334155' }}>種花時間</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: '#0F172A' }}>
              {formatPlantingDuration(summary.durationSeconds)}
            </span>
          </div>
        </div>

        {/* 底部【確定】按鈕（對照影片圓潤淺底綠字按鈕） */}
        <div style={{ padding: '10px 24px 20px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onConfirm}
            style={{
              minWidth: 148,
              border: '1.5px solid #CBD5E1',
              background: '#F8FAFC',
              color: '#0F766E',
              borderRadius: 99,
              padding: '10px 32px',
              fontSize: 15,
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(0,0,0,0.06)'
            }}
          >
            確定
          </button>
        </div>
      </div>
    </div>
  );
};
