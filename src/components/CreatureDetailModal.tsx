import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  DECOR_CATALOG,
  DECOR_SUBSETS_CATALOG,
  DeGuaCreature,
  VARIETY_CATALOG
} from '../types/game';
import {
  formatDistrictOnlyPlaceName,
  formatExpeditionDateZh
} from '../services/expeditionService';
import {
  isCategoryRareEligible,
  isRegularCategoryCatalogComplete,
  RARE_POINTS_RELEASE_NO_DECOR,
  RARE_POINTS_RELEASE_WITH_DECOR
} from '../services/rareDecorService';
import { CreatureHeartsRow } from './ExpeditionArtwork';
import { createDeGua3DRig, disposeObject3DTree } from './degua3dBuilder';

interface CreatureTurntable3DProps {
  creature: DeGuaCreature;
  zoomed?: boolean;
  autoSpin?: boolean;
  height?: number;
}

export const CreatureTurntable3D: React.FC<CreatureTurntable3DProps> = ({
  creature,
  zoomed = false,
  autoSpin = true,
  height = 220
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const yawRef = useRef<number>(0);
  const dragRef = useRef<{ active: boolean; lastX: number }>({ active: false, lastX: 0 });
  const zoomRef = useRef<boolean>(zoomed);
  zoomRef.current = zoomed;
  const autoSpinRef = useRef<boolean>(autoSpin);
  autoSpinRef.current = autoSpin;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = Math.max(240, container.clientWidth);
    const h = height;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, w / h, 0.1, 30);
    camera.position.set(0, 1.35, 3.35);
    camera.lookAt(0, 0.52, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x4ade80, 1.4);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfffbeb, 1.3);
    dir.position.set(3, 6, 4);
    scene.add(dir);

    // 淡綠色橢圓草坪展示墊（完全對照圖 4！）
    const padOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.98, 0.03, 36),
      new THREE.MeshBasicMaterial({ color: 0xa7f3d0 })
    );
    padOuter.position.y = 0.015;
    const padInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.78, 0.036, 32),
      new THREE.MeshBasicMaterial({ color: 0x34d399 })
    );
    padInner.position.y = 0.02;
    scene.add(padOuter, padInner);

    const rig = createDeGua3DRig(creature);
    rig.root.scale.setScalar(1.22);
    rig.root.position.set(0, 0.03, 0);
    rig.shadowMesh.visible = false;
    scene.add(rig.root);

    let rafId = 0;
    let lastT = performance.now();
    const animate = (now: number) => {
      rafId = window.requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      const tSec = now * 0.001;

      if (!dragRef.current.active && autoSpinRef.current) {
        yawRef.current += dt * 0.45;
      }
      rig.root.rotation.y = yawRef.current;
      rig.bodyPivot.position.y = 0.42 + Math.sin(tSec * 2.8) * 0.02;
      rig.headStemPivot.rotation.z = Math.sin(tSec * 2.5) * 0.06;
      if (rig.wingL && rig.wingR) {
        rig.wingL.rotation.y = 0.35 + Math.sin(tSec * 16) * 0.4;
        rig.wingR.rotation.y = -0.35 - Math.sin(tSec * 16) * 0.4;
      }

      const targetZ = zoomRef.current ? 2.15 : 3.35;
      const targetY = zoomRef.current ? 1.15 : 1.35;
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.14);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.14);
      camera.lookAt(0, zoomRef.current ? 0.62 : 0.52, 0);

      renderer.render(scene, camera);
    };
    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      scene.remove(rig.root);
      disposeObject3DTree(rig.root);
      padOuter.geometry.dispose();
      (padOuter.material as THREE.Material).dispose();
      padInner.geometry.dispose();
      (padInner.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, [creature, height]);

  return (
    <div
      ref={mountRef}
      onPointerDown={(e) => {
        dragRef.current = { active: true, lastX: e.clientX };
      }}
      onPointerMove={(e) => {
        if (!dragRef.current.active) return;
        const dx = e.clientX - dragRef.current.lastX;
        dragRef.current.lastX = e.clientX;
        yawRef.current += dx * 0.015;
      }}
      onPointerUp={() => {
        dragRef.current.active = false;
      }}
      onPointerLeave={() => {
        dragRef.current.active = false;
      }}
      style={{
        width: '100%',
        height,
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none'
      }}
    />
  );
};

interface CreatureDetailModalProps {
  creature: DeGuaCreature;
  allCreatures: DeGuaCreature[];
  squadLimit: number;
  squadCount: number;
  onToggleInSquad: (creatureId: string) => void;
  onToggleFavorite: (creatureId: string) => void;
  onRenameCreature: (creatureId: string, newName: string) => void;
  onReleaseCreature: (creatureId: string) => void;
  onOpenArCamera?: () => void;
  onClose: () => void;
}

export const CreatureDetailModal: React.FC<CreatureDetailModalProps> = ({
  creature,
  allCreatures,
  squadLimit,
  squadCount,
  onToggleInSquad,
  onToggleFavorite,
  onRenameCreature,
  onReleaseCreature,
  onOpenArCamera,
  onClose
}) => {
  const [zoomed, setZoomed] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [draftName, setDraftName] = useState<string>(creature.name);
  const [confirmRelease, setConfirmRelease] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const dMeta = DECOR_CATALOG[creature.decor];
  const vMeta = VARIETY_CATALOG[creature.variety];
  const subsets = DECOR_SUBSETS_CATALOG[creature.decor] || [];
  const subEntry =
    subsets.find((s) => s.setId === creature.decorSetId) ||
    subsets.find((s) => !s.isRare) ||
    subsets[0];
  const district = formatDistrictOnlyPlaceName(creature.placeName, creature.lat, creature.lng);

  const isRareUnlocked =
    isCategoryRareEligible(creature.decor) &&
    isRegularCategoryCatalogComplete(allCreatures, creature.decor);
  const releasePointsPreview = isRareUnlocked
    ? creature.hasDecor && !creature.isRareDecor
      ? RARE_POINTS_RELEASE_WITH_DECOR
      : !creature.hasDecor
        ? RARE_POINTS_RELEASE_NO_DECOR
        : 0
    : 0;

  const handleShare = async () => {
    const shareText = `我在「${district}」遇見了${creature.name}（${dMeta.placeCategory}・${subEntry?.setName || dMeta.name}），已一起散步 ${(creature.stepsWalked ?? 1200).toLocaleString()} 步！`;
    try {
      if (navigator.share) {
        await navigator.share({ title: creature.name, text: shareText });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        setShareFeedback('已複製分享資訊');
        window.setTimeout(() => setShareFeedback(null), 1800);
      }
    } catch {
      // ignore cancel
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1220,
        background: 'rgba(15, 23, 42, 0.56)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          height: '92lvh',
          background: '#FFFFFF',
          borderRadius: '26px 26px 0 0',
          boxShadow: '0 -12px 36px rgba(0,0,0,0.28)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: 38,
            height: 4,
            borderRadius: 99,
            background: '#D1D5DB',
            margin: '10px auto 0'
          }}
        />

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 96px' }}>
          {/* 上方 AR ＋ 右側預留鈕 ＋ 中央可旋轉 3D 展示台 */}
          <div style={{ position: 'relative' }}>
            {onOpenArCamera && (
              <button
                onClick={onOpenArCamera}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 6,
                  zIndex: 5,
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  fontSize: 12,
                  fontWeight: 900,
                  color: '#334155',
                  cursor: 'pointer'
                }}
                title="AR 相機"
              >
                AR
              </button>
            )}

            {/* 分類輪廓背景浮水印（對照圖 4 右後方黃/灰剪影） */}
            <div
              style={{
                position: 'absolute',
                right: 36,
                top: 22,
                fontSize: 82,
                opacity: creature.hasDecor ? 0.28 : 0.14,
                filter: creature.hasDecor ? 'none' : 'grayscale(1)',
                pointerEvents: 'none',
                zIndex: 0
              }}
            >
              {dMeta.icon}
            </div>

            <div style={{ position: 'relative', zIndex: 2 }}>
              <CreatureTurntable3D creature={creature} zoomed={zoomed} height={224} />
            </div>

            <button
              onClick={() => setZoomed((z) => !z)}
              style={{
                position: 'absolute',
                right: 0,
                bottom: 12,
                zIndex: 5,
                width: 38,
                height: 38,
                borderRadius: '50%',
                border: '1px solid #E2E8F0',
                background: zoomed ? '#ECFDF5' : '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                fontSize: 16,
                cursor: 'pointer'
              }}
              title="放大／還原檢視"
            >
              🔍
            </button>
          </div>

          {/* 從隊伍中移除 / 加入隊伍 膠囊鈕 */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
            <button
              onClick={() => onToggleInSquad(creature.id)}
              disabled={!creature.inSquad && squadCount >= squadLimit}
              style={{
                borderRadius: 99,
                border: creature.inSquad ? '1.5px solid #475569' : '1.5px solid #10B981',
                background: creature.inSquad ? '#FFFFFF' : '#10B981',
                color: creature.inSquad ? '#1E293B' : '#FFFFFF',
                padding: '7px 20px',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: !creature.inSquad && squadCount >= squadLimit ? 'not-allowed' : 'pointer',
                opacity: !creature.inSquad && squadCount >= squadLimit ? 0.5 : 1
              }}
            >
              {creature.inSquad ? '從隊伍中移除' : '加入散步隊伍'}
            </button>
          </div>

          {/* 名稱 ＋ ☆ 最愛 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginTop: 14,
              textAlign: 'center'
            }}
          >
            {isEditingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  maxLength={24}
                  autoFocus
                  style={{
                    border: '1.5px solid #10B981',
                    borderRadius: 10,
                    padding: '6px 10px',
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#0F172A'
                  }}
                />
                <button
                  onClick={() => {
                    const trimmed = draftName.trim();
                    if (trimmed) onRenameCreature(creature.id, trimmed);
                    setIsEditingName(false);
                  }}
                  style={{
                    border: 'none',
                    background: '#10B981',
                    color: '#FFF',
                    borderRadius: 99,
                    padding: '6px 12px',
                    fontSize: 12.5,
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  儲存
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 19, fontWeight: 900, color: '#1E293B', lineHeight: 1.35 }}>
                  {creature.name}
                  {creature.isRareDecor && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 11,
                        background: '#FEF3C7',
                        color: '#B45309',
                        padding: '2px 7px',
                        borderRadius: 99,
                        verticalAlign: 'middle'
                      }}
                    >
                      ✨ 稀有
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onToggleFavorite(creature.id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: 24,
                    cursor: 'pointer',
                    color: creature.isFavorite ? '#F59E0B' : '#CBD5E1',
                    padding: 0
                  }}
                >
                  {creature.isFavorite ? '★' : '☆'}
                </button>
              </>
            )}
          </div>

          {/* 變更名稱 ＋ 分享地瓜球 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 12 }}>
            <button
              onClick={() => {
                setDraftName(creature.name);
                setIsEditingName((v) => !v);
              }}
              style={{
                borderRadius: 99,
                border: '1.2px solid #94A3B8',
                background: '#FFFFFF',
                color: '#334155',
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ✏️ 變更名稱
            </button>
            <button
              onClick={handleShare}
              style={{
                borderRadius: 99,
                border: '1.2px solid #94A3B8',
                background: '#FFFFFF',
                color: '#334155',
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              📤 {shareFeedback || '分享地瓜球'}
            </button>
          </div>

          {/* 友好度 ＋ 一起走過的步數 */}
          <div
            style={{
              marginTop: 16,
              border: '1.5px solid #E2E8F0',
              borderRadius: 16,
              padding: '14px 12px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748B' }}>友好度</div>
              <CreatureHeartsRow friendship={creature.friendship} heartSize={15} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748B' }}>一起走過的步數</div>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#1E293B' }}>
                {(creature.stepsWalked ?? 1200).toLocaleString()}步
              </div>
            </div>
          </div>

          {/* 飾品類別、發現地點、發現日 */}
          <div
            style={{
              marginTop: 12,
              border: '1.5px solid #E2E8F0',
              borderRadius: 16,
              padding: '14px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50% 50% 50% 0',
                  transform: 'rotate(-45deg)',
                  background: '#C86C6E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <span style={{ transform: 'rotate(45deg)', fontSize: 15 }}>{dMeta.icon}</span>
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 900 }}>
                  <span style={{ color: '#DC2626' }}>{dMeta.placeCategory}</span>
                  <span style={{ color: '#94A3B8', margin: '0 4px' }}>/</span>
                  <span style={{ color: '#84A341' }}>
                    {subEntry?.setName || dMeta.name}・{vMeta.name}
                  </span>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#334155', marginTop: 2 }}>
                  {district}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 4 }}>
              <span style={{ fontSize: 17, color: '#64748B' }}>📅</span>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>
                發現日：　{formatExpeditionDateZh(creature.createdAt)}
              </div>
            </div>
          </div>

          {/* 放生（送回野外）：可累積已解鎖分類的稀有飾品點數 */}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
            {!confirmRelease ? (
              <button
                onClick={() => setConfirmRelease(true)}
                style={{
                  borderRadius: 99,
                  border: '1.2px solid #FCA5A5',
                  background: '#FFF1F2',
                  color: '#E11D48',
                  padding: '8px 20px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                🌱 送回野外（放生）
              </button>
            ) : (
              <div
                style={{
                  width: '100%',
                  background: '#FFF1F2',
                  border: '1.5px solid #FDA4AF',
                  borderRadius: 16,
                  padding: '12px 14px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: '#9F1239' }}>
                  確定要將「{creature.name}」送回野外嗎？
                  {releasePointsPreview > 0 && (
                    <div style={{ fontSize: 11.5, color: '#B45309', marginTop: 3 }}>
                      ✨ 可獲得 +{releasePointsPreview} 點【{dMeta.placeCategory}】稀有飾品積分
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 10, justifyContent: 'center' }}>
                  <button
                    onClick={() => setConfirmRelease(false)}
                    style={{
                      borderRadius: 99,
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#334155',
                      padding: '6px 16px',
                      fontSize: 12.5,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      onReleaseCreature(creature.id);
                      onClose();
                    }}
                    style={{
                      borderRadius: 99,
                      border: 'none',
                      background: '#E11D48',
                      color: '#FFFFFF',
                      padding: '6px 18px',
                      fontSize: 12.5,
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    確認放生
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 左下角 < 返回圓鈕（對照圖 4） */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            left: 16,
            bottom: 'max(16px, env(safe-area-inset-bottom))',
            zIndex: 20,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '1px solid #E2E8F0',
            background: '#FFFFFF',
            color: '#334155',
            fontSize: 20,
            fontWeight: 800,
            boxShadow: '0 4px 12px rgba(0,0,0,0.14)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="返回"
        >
          ‹
        </button>
      </div>
    </div>
  );
};
