import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  DeGuaCreature,
  ExpeditionItem,
  PetalColor,
  VARIETY_CATALOG
} from '../types/game';
import {
  createDeGua3DRig,
  DeGua3DRig,
  disposeObject3DTree,
  syncDeGua3DRig
} from './degua3dBuilder';

interface CreatureAgentState {
  id: string;
  creature: DeGuaCreature;
  rig: DeGua3DRig;
  pos: THREE.Vector3;
  vel: THREE.Vector2;
  target: THREE.Vector2;
  yaw: number;
  walkPhase: number;
  idleTimer: number;
  hopVel: number;
  baseScale: number;
}

interface NectarDropParticle {
  mesh: THREE.Mesh;
  start: THREE.Vector3;
  end: THREE.Vector3;
  elapsed: number;
  duration: number;
  landed: boolean;
  consumed: boolean;
}

interface PetalSparkParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface MagnifierCircleRect {
  centerX: number;
  centerY: number;
  radius: number;
}

interface Garden3DSceneProps {
  creatures: DeGuaCreature[];
  allCreatures: DeGuaCreature[];
  selectedNectar: PetalColor;
  throwNectarSeq: number;
  throwNectarTargetNdc: { x: number; y: number } | null;
  whistlePulseSeq: number;
  completedExpedition: ExpeditionItem | null;
  collectingReturnId: string | null;
  magnifierRectRef: React.MutableRefObject<MagnifierCircleRect>;
  onHoldCreatureChange: (creature: DeGuaCreature | null, inMagnifier: boolean) => void;
  onInspectCreatureDetail: (creature: DeGuaCreature) => void;
  onSwipePluckSingle: (creatureId: string) => void;
  onTapReturnedExpedition: (exp: ExpeditionItem) => void;
}

const NECTAR_COLORS: Record<PetalColor, number> = {
  white: 0xf8fafc,
  yellow: 0xfde047,
  red: 0xfb7185,
  blue: 0x60a5fa
};

function createMeadowTurfTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#5bb944';
  ctx.fillRect(0, 0, 512, 512);

  // 自然太陽光斑與淺深草塊噪點（無人工格線、無道路）
  for (let i = 0; i < 650; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 8 + Math.random() * 26;
    ctx.fillStyle =
      i % 3 === 0
        ? 'rgba(132, 224, 92, 0.24)'
        : i % 3 === 1
          ? 'rgba(67, 152, 46, 0.22)'
          : 'rgba(163, 230, 53, 0.14)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 細碎草葉紋理
  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(74, 168, 52, 0.45)' : 'rgba(152, 228, 102, 0.42)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 6, y - 5 - Math.random() * 6);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 12);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildReturnedBundleMesh(exp: ExpeditionItem): THREE.Group {
  const grp = new THREE.Group();

  if (exp.kind === 'gift') {
    const boxColor = exp.isRareGift ? 0xfacc15 : 0xf8fafc;
    const ribbonColor = exp.isRareGift ? 0xe11d48 : 0xef4444;
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.46, 0.56),
      new THREE.MeshStandardMaterial({
        color: boxColor,
        roughness: 0.3,
        metalness: exp.isRareGift ? 0.35 : 0.05
      })
    );
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.11, 0.6),
      new THREE.MeshStandardMaterial({ color: boxColor, roughness: 0.3 })
    );
    lid.position.y = 0.26;
    const ribA = new THREE.Mesh(
      new THREE.BoxGeometry(0.61, 0.54, 0.12),
      new THREE.MeshStandardMaterial({ color: ribbonColor, roughness: 0.4 })
    );
    const ribB = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.54, 0.61),
      new THREE.MeshStandardMaterial({ color: ribbonColor, roughness: 0.4 })
    );
    const bow = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.11, 0.032, 32, 6, 2, 3),
      new THREE.MeshStandardMaterial({ color: ribbonColor, roughness: 0.35 })
    );
    bow.position.y = 0.36;
    grp.add(box, lid, ribA, ribB, bow);
  } else if (exp.kind === 'fruit') {
    const fCol = NECTAR_COLORS[exp.nectarColor || 'red'];
    const fruit = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 18, 14),
      new THREE.MeshStandardMaterial({
        color: fCol,
        roughness: 0.28,
        emissive: fCol,
        emissiveIntensity: 0.14
      })
    );
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.03, 0.18, 6),
      new THREE.MeshStandardMaterial({ color: 0x15803d })
    );
    stem.position.y = 0.34;
    grp.add(fruit, stem);
  } else {
    const vCol = new THREE.Color(
      exp.seedlingIsHuge
        ? '#FEF3C7'
        : VARIETY_CATALOG[exp.seedlingVariety || 'white'].potColor
    );
    const pot = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 16, 12),
      new THREE.MeshStandardMaterial({ color: vCol, roughness: 0.42 })
    );
    if (exp.seedlingIsHuge) pot.scale.set(1.24, 1.24, 1.24);
    const sprout = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.25, 8),
      new THREE.MeshStandardMaterial({ color: 0x22c55e })
    );
    sprout.position.y = 0.34;
    grp.add(pot, sprout);
  }

  return grp;
}

export const Garden3DScene: React.FC<Garden3DSceneProps> = ({
  creatures,
  allCreatures,
  selectedNectar,
  throwNectarSeq,
  throwNectarTargetNdc,
  whistlePulseSeq,
  completedExpedition,
  collectingReturnId,
  magnifierRectRef,
  onHoldCreatureChange,
  onInspectCreatureDetail,
  onSwipePluckSingle,
  onTapReturnedExpedition
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const agentsRef = useRef<Map<string, CreatureAgentState>>(new Map());
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const nectarDropsRef = useRef<NectarDropParticle[]>([]);
  const sparklesRef = useRef<PetalSparkParticle[]>([]);
  const whistleRingRef = useRef<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; age: number } | null>(null);
  const returnGroupRef = useRef<{
    exp: ExpeditionItem | null;
    root: THREE.Group;
    bundle: THREE.Group | null;
    carrierRigs: DeGua3DRig[];
    collectAnimElapsed: number;
  } | null>(null);

  const callbacksRef = useRef({
    onHoldCreatureChange,
    onInspectCreatureDetail,
    onSwipePluckSingle,
    onTapReturnedExpedition
  });
  callbacksRef.current = {
    onHoldCreatureChange,
    onInspectCreatureDetail,
    onSwipePluckSingle,
    onTapReturnedExpedition
  };

  const completedExpRef = useRef<ExpeditionItem | null>(completedExpedition);
  completedExpRef.current = completedExpedition;
  const collectingReturnIdRef = useRef<string | null>(collectingReturnId);
  collectingReturnIdRef.current = collectingReturnId;
  const allCreaturesRef = useRef<DeGuaCreature[]>(allCreatures);
  allCreaturesRef.current = allCreatures;

  const heldStateRef = useRef<{
    creatureId: string | null;
    inMagnifier: boolean;
    pointerClientX: number;
    pointerClientY: number;
  }>({
    creatureId: null,
    inMagnifier: false,
    pointerClientX: 0,
    pointerClientY: 0
  });

  // 1. 初始化 Three.js WebGL 場景、3D 草花植被、燈光與主循環
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(480, container.clientHeight);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x63be48);
    scene.fog = new THREE.FogExp2(0x66c44c, 0.036);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 60);
    camera.position.set(0, 5.2, 7.2);
    camera.lookAt(0, 0.15, -0.4);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 自然草原光線
    const hemiLight = new THREE.HemisphereLight(0xf0fdf4, 0x2f7d24, 1.45);
    scene.add(hemiLight);
    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
    sunLight.position.set(4.5, 9.5, 5.5);
    scene.add(sunLight);

    // 3D 微曲面綠色花草原地形（無道路、無遠山，純粹翠綠百花草地）
    const turfTex = createMeadowTurfTexture();
    const groundGeo = new THREE.PlaneGeometry(36, 40, 24, 24);
    groundGeo.rotateX(-Math.PI / 2);
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const gx = posAttr.getX(i);
      const gz = posAttr.getZ(i);
      // 柔和微起伏草原波浪
      const h =
        Math.sin(gx * 0.35) * 0.08 +
        Math.cos(gz * 0.28) * 0.09 +
        (gz < -6 ? (-6 - gz) * 0.06 : 0);
      posAttr.setY(i, h);
    }
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshStandardMaterial({
      map: turfTex,
      roughness: 0.92,
      metalness: 0
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    scene.add(groundMesh);

    // 3D 草叢植被（InstancedMesh 高效 60fps 渲染）
    const grassCount = 340;
    const grassGeo = new THREE.ConeGeometry(0.085, 0.24, 4);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x3fa334, roughness: 0.8 });
    const grassInst = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < grassCount; i++) {
      const gx = (Math.random() - 0.5) * 18;
      const gz = -11 + Math.random() * 17;
      dummy.position.set(gx, 0.08, gz);
      dummy.rotation.set((Math.random() - 0.5) * 0.25, Math.random() * Math.PI, (Math.random() - 0.5) * 0.25);
      const s = 0.7 + Math.random() * 0.9;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      grassInst.setMatrixAt(i, dummy.matrix);
    }
    grassInst.instanceMatrix.needsUpdate = true;
    scene.add(grassInst);

    // 3D 野花叢（多色小白花 / 小黃花 / 小粉紫花散落草原各處）
    const flowerCount = 260;
    const fGeo = new THREE.CylinderGeometry(0.085, 0.025, 0.055, 6);
    const fMat = new THREE.MeshStandardMaterial({ roughness: 0.5 });
    const flowerInst = new THREE.InstancedMesh(fGeo, fMat, flowerCount);
    const wildColors = [0xffffff, 0xfef08a, 0xf9a8d4, 0xc4b5fd, 0xbfdbfe];
    const tmpCol = new THREE.Color();
    for (let i = 0; i < flowerCount; i++) {
      const fx = (Math.random() - 0.5) * 16;
      const fz = -10 + Math.random() * 16;
      dummy.position.set(fx, 0.06, fz);
      dummy.rotation.set((Math.random() - 0.5) * 0.2, Math.random() * Math.PI, 0);
      const s = 0.65 + Math.random() * 0.8;
      dummy.scale.set(s, 1, s);
      dummy.updateMatrix();
      flowerInst.setMatrixAt(i, dummy.matrix);
      tmpCol.setHex(wildColors[i % wildColors.length]);
      flowerInst.setColorAt(i, tmpCol);
    }
    flowerInst.instanceMatrix.needsUpdate = true;
    if (flowerInst.instanceColor) flowerInst.instanceColor.needsUpdate = true;
    scene.add(flowerInst);

    // 淡藍色透明口哨光環（對照影片 00:01 草地集合環）
    const wRingGeo = new THREE.RingGeometry(1.15, 1.28, 48);
    wRingGeo.rotateX(-Math.PI / 2);
    const wRingMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const wRingMesh = new THREE.Mesh(wRingGeo, wRingMat);
    wRingMesh.position.set(0, 0.04, -0.4);
    scene.add(wRingMesh);
    whistleRingRef.current = { mesh: wRingMesh, mat: wRingMat, age: 99 };

    // 歸來探險端貨區節點
    const retRoot = new THREE.Group();
    retRoot.position.set(0, 0, 2.25);
    scene.add(retRoot);
    returnGroupRef.current = {
      exp: null,
      root: retRoot,
      bundle: null,
      carrierRigs: [],
      collectAnimElapsed: 0
    };

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0.4, 1).normalize(), -2.1);
    const dragHitPt = new THREE.Vector3();

    let pointerState: {
      active: boolean;
      downX: number;
      downY: number;
      lastX: number;
      lastY: number;
      candidateId: string | null;
      holdTimer: number | null;
      didHold: boolean;
      didTapBundle: boolean;
      lastPluckedAt: Record<string, number>;
    } = {
      active: false,
      downX: 0,
      downY: 0,
      lastX: 0,
      lastY: 0,
      candidateId: null,
      holdTimer: null,
      didHold: false,
      didTapBundle: false,
      lastPluckedAt: {}
    };

    const hitTestCreatureId = (clientX: number, clientY: number): string | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);

      let closestId: string | null = null;
      let minDist = Infinity;
      agentsRef.current.forEach((ag, id) => {
        const hits = raycaster.intersectObject(ag.rig.root, true);
        if (hits.length > 0 && hits[0].distance < minDist) {
          minDist = hits[0].distance;
          closestId = id;
        }
      });
      return closestId;
    };

    const hitTestReturnedBundle = (clientX: number, clientY: number): boolean => {
      const rg = returnGroupRef.current;
      if (!rg || !rg.exp || !rg.bundle) return false;
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObject(rg.root, true).length > 0;
    };

    const spawnPetalBurst3D = (origin: THREE.Vector3, colorHex: number) => {
      const pMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide
      });
      for (let i = 0; i < 6; i++) {
        const m = new THREE.Mesh(new THREE.CircleGeometry(0.06, 6), pMat.clone());
        m.position.copy(origin).add(new THREE.Vector3(0, 0.72, 0));
        scene.add(m);
        sparklesRef.current.push({
          mesh: m,
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * 1.4,
            1.6 + Math.random() * 1.1,
            (Math.random() - 0.5) * 1.2
          ),
          life: 0,
          maxLife: 0.65
        });
      }
      pMat.dispose();
    };

    const checkInMagnifier = (clientX: number, clientY: number): boolean => {
      const mr = magnifierRectRef.current;
      return Math.hypot(clientX - mr.centerX, clientY - mr.centerY) <= mr.radius;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (completedExpRef.current && hitTestReturnedBundle(e.clientX, e.clientY)) {
        pointerState.active = true;
        pointerState.didTapBundle = true;
        pointerState.downX = e.clientX;
        pointerState.downY = e.clientY;
        return;
      }

      const cid = hitTestCreatureId(e.clientX, e.clientY);
      pointerState.active = true;
      pointerState.didTapBundle = false;
      pointerState.downX = e.clientX;
      pointerState.downY = e.clientY;
      pointerState.lastX = e.clientX;
      pointerState.lastY = e.clientY;
      pointerState.candidateId = cid;
      pointerState.didHold = false;

      if (pointerState.holdTimer) window.clearTimeout(pointerState.holdTimer);
      if (cid) {
        pointerState.holdTimer = window.setTimeout(() => {
          const ag = agentsRef.current.get(cid);
          if (!ag || !pointerState.active) return;
          pointerState.didHold = true;
          heldStateRef.current = {
            creatureId: cid,
            inMagnifier: checkInMagnifier(pointerState.lastX, pointerState.lastY),
            pointerClientX: pointerState.lastX,
            pointerClientY: pointerState.lastY
          };
          callbacksRef.current.onHoldCreatureChange(
            ag.creature,
            heldStateRef.current.inMagnifier
          );
        }, 185);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointerState.active) return;
      pointerState.lastX = e.clientX;
      pointerState.lastY = e.clientY;

      // 若按住還沒滿 185ms 就大幅滑動，取消長按並轉為橫掃採花瓣手勢
      if (!pointerState.didHold) {
        const moveDist = Math.hypot(e.clientX - pointerState.downX, e.clientY - pointerState.downY);
        if (moveDist > 16 && pointerState.holdTimer) {
          window.clearTimeout(pointerState.holdTimer);
          pointerState.holdTimer = null;
        }
        const hitId = hitTestCreatureId(e.clientX, e.clientY);
        if (hitId) {
          const ag = agentsRef.current.get(hitId);
          const now = Date.now();
          if (
            ag &&
            ag.creature.leafStage === 'flower' &&
            now - (pointerState.lastPluckedAt[hitId] || 0) > 360
          ) {
            pointerState.lastPluckedAt[hitId] = now;
            spawnPetalBurst3D(ag.pos, NECTAR_COLORS[ag.creature.flowerColor]);
            callbacksRef.current.onSwipePluckSingle(hitId);
          }
        }
        return;
      }

      // 長按抓起後拖曳：即時判斷是否進入下方放大鏡圈內
      const cid = heldStateRef.current.creatureId;
      if (cid) {
        const ag = agentsRef.current.get(cid);
        const insideMag = checkInMagnifier(e.clientX, e.clientY);
        heldStateRef.current.pointerClientX = e.clientX;
        heldStateRef.current.pointerClientY = e.clientY;
        if (insideMag !== heldStateRef.current.inMagnifier) {
          heldStateRef.current.inMagnifier = insideMag;
          if (ag) callbacksRef.current.onHoldCreatureChange(ag.creature, insideMag);
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (pointerState.holdTimer) {
        window.clearTimeout(pointerState.holdTimer);
        pointerState.holdTimer = null;
      }

      if (pointerState.didTapBundle && completedExpRef.current) {
        const moveDist = Math.hypot(e.clientX - pointerState.downX, e.clientY - pointerState.downY);
        if (moveDist < 20) {
          callbacksRef.current.onTapReturnedExpedition(completedExpRef.current);
        }
      } else if (pointerState.didHold && heldStateRef.current.creatureId) {
        const ag = agentsRef.current.get(heldStateRef.current.creatureId);
        const insideMag = checkInMagnifier(e.clientX, e.clientY);
        heldStateRef.current.creatureId = null;
        heldStateRef.current.inMagnifier = false;
        callbacksRef.current.onHoldCreatureChange(null, false);
        if (insideMag && ag) {
          callbacksRef.current.onInspectCreatureDetail(ag.creature);
        }
      } else if (pointerState.candidateId && !pointerState.didHold) {
        // 輕點已開花的地瓜球也可採瓣（符合快速連點與滑動習慣）
        const moveDist = Math.hypot(e.clientX - pointerState.downX, e.clientY - pointerState.downY);
        if (moveDist < 12) {
          const ag = agentsRef.current.get(pointerState.candidateId);
          if (ag && ag.creature.leafStage === 'flower') {
            spawnPetalBurst3D(ag.pos, NECTAR_COLORS[ag.creature.flowerColor]);
            callbacksRef.current.onSwipePluckSingle(ag.id);
          }
        }
      }

      pointerState.active = false;
      pointerState.didHold = false;
      pointerState.didTapBundle = false;
      pointerState.candidateId = null;
    };

    const el = renderer.domElement;
    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    const onResize = () => {
      if (!container) return;
      const w = Math.max(320, container.clientWidth);
      const h = Math.max(480, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 60fps 主迴圈：每顆地瓜球擁有完全獨立 3D 位移、方向角、四肢步態、抓取懸空、花蜜追逐與歸來收成動畫
    let rafId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      rafId = window.requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const tSec = now * 0.001;

      // 1. 更新拋出精華液滴拋物線
      for (let i = nectarDropsRef.current.length - 1; i >= 0; i--) {
        const drop = nectarDropsRef.current[i];
        drop.elapsed += dt;
        if (!drop.landed) {
          const p = Math.min(1, drop.elapsed / drop.duration);
          const x = THREE.MathUtils.lerp(drop.start.x, drop.end.x, p);
          const z = THREE.MathUtils.lerp(drop.start.z, drop.end.z, p);
          const y = THREE.MathUtils.lerp(drop.start.y, 0.14, p) + Math.sin(p * Math.PI) * 1.65;
          drop.mesh.position.set(x, y, z);
          if (p >= 1) drop.landed = true;
        } else if (drop.elapsed > drop.duration + 1.15) {
          scene.remove(drop.mesh);
          drop.mesh.geometry.dispose();
          (drop.mesh.material as THREE.Material).dispose();
          nectarDropsRef.current.splice(i, 1);
        } else {
          drop.mesh.scale.setScalar(1 + Math.sin(tSec * 12) * 0.12);
        }
      }

      // 2. 更新採收花瓣飛散火花
      for (let i = sparklesRef.current.length - 1; i >= 0; i--) {
        const sp = sparklesRef.current[i];
        sp.life += dt;
        sp.vel.y -= 3.2 * dt;
        sp.mesh.position.addScaledVector(sp.vel, dt);
        sp.mesh.rotation.z += dt * 7;
        const m = sp.mesh.material as THREE.MeshBasicMaterial;
        m.opacity = Math.max(0, 1 - sp.life / sp.maxLife);
        if (sp.life >= sp.maxLife) {
          scene.remove(sp.mesh);
          sp.mesh.geometry.dispose();
          m.dispose();
          sparklesRef.current.splice(i, 1);
        }
      }

      // 3. 更新口哨集合水波環
      if (whistleRingRef.current && whistleRingRef.current.age < 2.4) {
        const wr = whistleRingRef.current;
        wr.age += dt;
        const pulseScale = wr.age < 0.55 ? 0.5 + wr.age * 1.9 : 1.55 + Math.sin(wr.age * 5) * 0.06;
        wr.mesh.scale.set(pulseScale, 1, pulseScale);
        wr.mat.opacity = wr.age < 1.8 ? 0.52 : Math.max(0, 0.52 * (1 - (wr.age - 1.8) / 0.6));
      } else if (whistleRingRef.current) {
        whistleRingRef.current.mat.opacity = 0;
      }

      // 4. 更新歸來端貨組動畫（點擊果實／瓜糰時先旋轉浮上空再縮小飛入介面底部圖示）
      const rg = returnGroupRef.current;
      const retBundle = rg?.bundle;
      if (rg && retBundle) {
        const isCollecting =
          Boolean(collectingReturnIdRef.current) && rg.exp?.id === collectingReturnIdRef.current;
        if (isCollecting) {
          rg.collectAnimElapsed += dt;
          const p = Math.min(1, rg.collectAnimElapsed / 1.0);
          if (p < 0.45) {
            const up = p / 0.45;
            retBundle.position.y = 0.72 + Math.sin(up * (Math.PI / 2)) * 1.45;
            retBundle.rotation.y += dt * 11;
            retBundle.scale.setScalar(1 + up * 0.35);
          } else {
            const swoop = (p - 0.45) / 0.55;
            const targetY = rg.exp?.kind === 'seedling' ? -0.45 : -0.8;
            const targetX = rg.exp?.kind === 'seedling' ? 1.85 : 0;
            retBundle.position.y = THREE.MathUtils.lerp(2.17, targetY, swoop * swoop);
            retBundle.position.x = THREE.MathUtils.lerp(0, targetX, swoop * swoop);
            retBundle.position.z = THREE.MathUtils.lerp(0, 2.2, swoop);
            retBundle.rotation.y += dt * 15;
            retBundle.scale.setScalar(Math.max(0.12, 1.35 * (1 - swoop * 0.85)));
          }
        } else {
          rg.collectAnimElapsed = 0;
          retBundle.position.set(0, 0.74 + Math.sin(tSec * 3.4) * 0.04, 0);
          retBundle.rotation.y = Math.sin(tSec * 1.5) * 0.25;
          retBundle.scale.setScalar(1);
        }
        rg.carrierRigs.forEach((cr, idx) => {
          cr.bodyPivot.position.y = 0.42 + Math.abs(Math.sin(tSec * 5 + idx)) * 0.05;
        });
      }

      // 5. 每顆地瓜球獨立 3D 行動 AI、方向插值與四肢步態
      const activeNectarDrops = nectarDropsRef.current.filter((d) => d.elapsed > 0.2);

      agentsRef.current.forEach((ag) => {
        const isHeld = heldStateRef.current.creatureId === ag.id;

        if (isHeld) {
          const rect = renderer.domElement.getBoundingClientRect();
          ndc.x = ((heldStateRef.current.pointerClientX - rect.left) / rect.width) * 2 - 1;
          ndc.y = -((heldStateRef.current.pointerClientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(ndc, camera);
          if (raycaster.ray.intersectPlane(dragPlane, dragHitPt)) {
            ag.pos.lerp(
              new THREE.Vector3(
                dragHitPt.x,
                heldStateRef.current.inMagnifier ? 1.15 : 1.05,
                dragHitPt.z
              ),
              0.38
            );
          }
          ag.rig.root.position.copy(ag.pos);
          const zoomScale = heldStateRef.current.inMagnifier ? ag.baseScale * 1.72 : ag.baseScale * 1.24;
          ag.rig.root.scale.lerp(new THREE.Vector3(zoomScale, zoomScale, zoomScale), 0.24);
          ag.rig.root.rotation.y = Math.sin(tSec * 4) * 0.25;
          ag.rig.shadowMesh.visible = false;
          // 騰空被抓起來時雙腳雙手可愛亂踢
          ag.rig.legL.position.z = Math.sin(tSec * 18) * 0.07;
          ag.rig.legR.position.z = -Math.sin(tSec * 18) * 0.07;
          ag.rig.armL.rotation.z = 0.65 + Math.sin(tSec * 16) * 0.45;
          ag.rig.armR.rotation.z = -0.65 - Math.sin(tSec * 16) * 0.45;
          if (ag.rig.wingL && ag.rig.wingR) {
            ag.rig.wingL.rotation.y = 0.35 + Math.sin(tSec * 28) * 0.5;
            ag.rig.wingR.rotation.y = -0.35 - Math.sin(tSec * 28) * 0.5;
          }
          return;
        }

        ag.rig.shadowMesh.visible = true;
        ag.rig.root.scale.lerp(new THREE.Vector3(ag.baseScale, ag.baseScale, ag.baseScale), 0.16);

        // 決定目標：若有掉落地上的花蜜就衝過去，否則各自獨立閒晃或休息
        if (activeNectarDrops.length > 0 && ag.creature.leafStage !== 'flower' && ag.creature.leafStage !== 'bare') {
          let nearest = activeNectarDrops[0];
          let minD = Math.hypot(nearest.end.x - ag.pos.x, nearest.end.z - ag.pos.z);
          for (let k = 1; k < activeNectarDrops.length; k++) {
            const d = Math.hypot(activeNectarDrops[k].end.x - ag.pos.x, activeNectarDrops[k].end.z - ag.pos.z);
            if (d < minD) {
              minD = d;
              nearest = activeNectarDrops[k];
            }
          }
          ag.target.set(nearest.end.x + (Math.random() - 0.5) * 0.35, nearest.end.z + (Math.random() - 0.5) * 0.35);
          ag.idleTimer = 0;
        }

        const dx = ag.target.x - ag.pos.x;
        const dz = ag.target.y - ag.pos.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 0.16) {
          ag.vel.multiplyScalar(0.8);
          ag.idleTimer -= dt;
          if (ag.idleTimer <= 0) {
            // 每顆獨立隨機選出下個草原漫步目標與休息秒數
            const angle = Math.random() * Math.PI * 2;
            const rad = 0.7 + Math.random() * 2.15;
            ag.target.set(
              Math.max(-3.1, Math.min(3.1, Math.cos(angle) * rad)),
              Math.max(-3.6, Math.min(1.45, -0.5 + Math.sin(angle) * rad * 0.85))
            );
            ag.idleTimer = 1.4 + Math.random() * 3.8;
          }
        } else {
          const speed = activeNectarDrops.length > 0 ? 2.15 : 0.85 + (ag.baseScale - 0.85) * 0.3;
          const desiredVx = (dx / dist) * speed;
          const desiredVz = (dz / dist) * speed;
          ag.vel.x = THREE.MathUtils.lerp(ag.vel.x, desiredVx, 0.1);
          ag.vel.y = THREE.MathUtils.lerp(ag.vel.y, desiredVz, 0.1);
        }

        ag.pos.x += ag.vel.x * dt;
        ag.pos.z += ag.vel.y * dt;
        ag.pos.y = 0;
        ag.rig.root.position.copy(ag.pos);

        const moveSpeed = Math.hypot(ag.vel.x, ag.vel.y);
        if (moveSpeed > 0.08) {
          const targetYaw = Math.atan2(ag.vel.x, ag.vel.y);
          let diff = targetYaw - ag.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          ag.yaw += diff * Math.min(1, dt * 8.5);
          ag.walkPhase += moveSpeed * dt * 11.5;

          const stride = Math.sin(ag.walkPhase);
          ag.rig.bodyPivot.position.y = 0.42 + Math.abs(stride) * 0.055;
          ag.rig.legL.position.z = stride * 0.085;
          ag.rig.legR.position.z = -stride * 0.085;
          ag.rig.armL.rotation.x = -stride * 0.45;
          ag.rig.armR.rotation.x = stride * 0.45;
        } else {
          // 待機柔和呼吸與偶爾左右張望
          const idleBob = Math.sin(tSec * 2.6 + ag.walkPhase) * 0.014;
          ag.rig.bodyPivot.position.y = 0.42 + idleBob;
          ag.rig.legL.position.z = THREE.MathUtils.lerp(ag.rig.legL.position.z, 0.02, 0.15);
          ag.rig.legR.position.z = THREE.MathUtils.lerp(ag.rig.legR.position.z, 0.02, 0.15);
          ag.rig.armL.rotation.x = 0;
          ag.rig.armR.rotation.x = 0;
        }

        ag.rig.root.rotation.y = ag.yaw;
        // 頭頂花莖柔和隨風搖曳
        ag.rig.headStemPivot.rotation.z = Math.sin(tSec * 3.1 + ag.pos.x * 2) * 0.07;

        if (ag.rig.wingL && ag.rig.wingR) {
          ag.rig.wingL.rotation.y = 0.35 + Math.sin(tSec * 20 + ag.pos.x) * 0.42;
          ag.rig.wingR.rotation.y = -0.35 - Math.sin(tSec * 20 + ag.pos.x) * 0.42;
        }
      });

      renderer.render(scene, camera);
    };

    rafId = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(rafId);
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('resize', onResize);
      if (pointerState.holdTimer) window.clearTimeout(pointerState.holdTimer);

      agentsRef.current.forEach((ag) => {
        scene.remove(ag.rig.root);
        disposeObject3DTree(ag.rig.root);
      });
      agentsRef.current.clear();

      groundGeo.dispose();
      groundMat.dispose();
      turfTex.dispose();
      grassGeo.dispose();
      grassMat.dispose();
      flowerInst.geometry.dispose();
      fMat.dispose();
      wRingGeo.dispose();
      wRingMat.dispose();
      renderer.dispose();
    };
  }, [magnifierRectRef]);

  // 2. 同步隊伍地瓜球清單到 3D 骨架（新增 / 更新頭頂葉花苞狀態 / 移除）
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentIds = new Set(creatures.map((c) => c.id));
    agentsRef.current.forEach((ag, id) => {
      if (!currentIds.has(id)) {
        scene.remove(ag.rig.root);
        disposeObject3DTree(ag.rig.root);
        agentsRef.current.delete(id);
      }
    });

    creatures.forEach((c, idx) => {
      const existing = agentsRef.current.get(c.id);
      if (existing) {
        existing.creature = c;
        syncDeGua3DRig(existing.rig, c);
      } else {
        const rig = createDeGua3DRig(c);
        const angle = (idx / Math.max(1, creatures.length)) * Math.PI * 2 + idx * 0.4;
        const radius = 0.65 + (idx % 5) * 0.48;
        const startX = Math.max(-2.9, Math.min(2.9, Math.cos(angle) * radius));
        const startZ = Math.max(-3.2, Math.min(1.2, -0.55 + Math.sin(angle) * radius * 0.72));
        rig.root.position.set(startX, 0, startZ);
        const baseScale = c.variety === 'purple' ? 1.05 : c.variety === 'white' ? 0.85 : 0.96;
        rig.root.scale.setScalar(baseScale);
        scene.add(rig.root);

        agentsRef.current.set(c.id, {
          id: c.id,
          creature: c,
          rig,
          pos: new THREE.Vector3(startX, 0, startZ),
          vel: new THREE.Vector2(0, 0),
          target: new THREE.Vector2(
            Math.max(-2.8, Math.min(2.8, startX + (Math.random() - 0.5) * 1.4)),
            Math.max(-3.2, Math.min(1.3, startZ + (Math.random() - 0.5) * 1.1))
          ),
          yaw: Math.random() * Math.PI * 2,
          walkPhase: idx * 1.1,
          idleTimer: 0.4 + (idx % 6) * 0.55,
          hopVel: 0,
          baseScale
        });
      }
    });
  }, [creatures]);

  // 3. 同步歸來的探險物品與端貨團隊（在前方草原舉起來）
  useEffect(() => {
    const rg = returnGroupRef.current;
    if (!rg) return;

    while (rg.root.children.length > 0) {
      const ch = rg.root.children.pop()!;
      rg.root.remove(ch);
      disposeObject3DTree(ch);
    }
    rg.carrierRigs = [];
    rg.bundle = null;
    rg.exp = completedExpedition;

    if (!completedExpedition) return;

    const bundle = buildReturnedBundleMesh(completedExpedition);
    bundle.position.set(0, 0.76, 0);
    rg.root.add(bundle);
    rg.bundle = bundle;

    const carriers = completedExpedition.assignedCreatureIds
      .map((id) => allCreaturesRef.current.find((c) => c.id === id))
      .filter((c): c is DeGuaCreature => Boolean(c))
      .slice(0, 5);
    const displayCarriers =
      carriers.length > 0 ? carriers : creatures.slice(0, 3);

    const offsets = [
      { x: -0.45, z: -0.25 },
      { x: 0.45, z: -0.25 },
      { x: -0.52, z: 0.2 },
      { x: 0.52, z: 0.2 },
      { x: 0, z: 0.38 }
    ];

    displayCarriers.forEach((c, i) => {
      const cr = createDeGua3DRig(c);
      const off = offsets[i % offsets.length];
      cr.root.position.set(off.x, 0, off.z);
      cr.root.scale.setScalar(0.86);
      cr.root.rotation.y = Math.atan2(-off.x, -off.z);
      rg.root.add(cr.root);
      rg.carrierRigs.push(cr);
    });
  }, [completedExpedition, creatures]);

  // 4. 觸發拋出 3D 花蜜液滴
  useEffect(() => {
    if (throwNectarSeq <= 0 || !sceneRef.current) return;
    const scene = sceneRef.current;
    const dropColor = NECTAR_COLORS[selectedNectar];
    const tx = throwNectarTargetNdc ? throwNectarTargetNdc.x * 2.1 : (Math.random() - 0.5) * 1.4;
    const tz = throwNectarTargetNdc ? -0.6 - throwNectarTargetNdc.y * 1.4 : -0.4 + (Math.random() - 0.5) * 1.2;

    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 12, 10),
        new THREE.MeshStandardMaterial({
          color: dropColor,
          emissive: dropColor,
          emissiveIntensity: 0.35,
          roughness: 0.15
        })
      );
      const start = new THREE.Vector3((i - 1) * 0.22, 0.45, 3.6);
      const end = new THREE.Vector3(
        Math.max(-2.6, Math.min(2.6, tx + (i - 1) * 0.65)),
        0.14,
        Math.max(-2.8, Math.min(1.0, tz + (i % 2 === 0 ? -0.35 : 0.35)))
      );
      m.position.copy(start);
      scene.add(m);
      nectarDropsRef.current.push({
        mesh: m,
        start,
        end,
        elapsed: 0,
        duration: 0.48 + i * 0.08,
        landed: false,
        consumed: false
      });
    }
  }, [throwNectarSeq, selectedNectar, throwNectarTargetNdc]);

  // 5. 吹口哨集合（淡淡藍圈波紋 + 個別衝向聚集圓區）
  useEffect(() => {
    if (whistlePulseSeq <= 0) return;
    if (whistleRingRef.current) {
      whistleRingRef.current.age = 0;
    }
    const total = agentsRef.current.size;
    let idx = 0;
    agentsRef.current.forEach((ag) => {
      const ring = Math.floor(idx / 8);
      const slot = idx % 8;
      const angle = (slot / Math.min(8, Math.max(1, total))) * Math.PI * 2 + ring * 0.35;
      const rad = 0.42 + ring * 0.44;
      ag.target.set(Math.cos(angle) * rad, -0.4 + Math.sin(angle) * rad * 0.78);
      ag.idleTimer = 3.6 + Math.random() * 1.5;
      idx++;
    });
  }, [whistlePulseSeq]);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        touchAction: 'none'
      }}
    />
  );
};
