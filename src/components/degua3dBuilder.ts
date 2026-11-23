import * as THREE from 'three';
import {
  DecorCategory,
  DeGuaCreature,
  DeGuaVariety,
  LeafStage,
  PetalColor,
  VARIETY_CATALOG
} from '../types/game';

export interface DeGua3DRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headStemPivot: THREE.Group;
  armL: THREE.Mesh;
  armR: THREE.Mesh;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  wingL?: THREE.Mesh;
  wingR?: THREE.Mesh;
  crownGroup: THREE.Group;
  decorGroup: THREE.Group;
  shadowMesh: THREE.Mesh;
  variety: DeGuaVariety;
  lastLeafStage: LeafStage;
  lastFlowerColor: PetalColor;
  lastShowDecor: boolean;
  lastDecor: DecorCategory;
  lastIsRareDecor: boolean;
}

const PETAL_HEX: Record<PetalColor, number> = {
  white: 0xffffff,
  yellow: 0xfacc15,
  red: 0xf43f5e,
  blue: 0x3b82f6
};

// 共用基礎幾何體快取，讓 40 顆同時在畫面上維持流暢 60fps
const sharedGeo = {
  sphereBody: new THREE.SphereGeometry(0.28, 18, 14),
  rockBody: new THREE.IcosahedronGeometry(0.31, 0),
  eyeWhite: new THREE.SphereGeometry(0.056, 10, 8),
  pupil: new THREE.SphereGeometry(0.03, 8, 8),
  limb: new THREE.CapsuleGeometry(0.044, 0.14, 4, 8),
  foot: new THREE.SphereGeometry(0.055, 8, 6),
  wing: new THREE.PlaneGeometry(0.28, 0.16),
  stem: new THREE.CylinderGeometry(0.02, 0.028, 0.36, 7),
  leaf: new THREE.CircleGeometry(0.16, 12),
  bud: new THREE.ConeGeometry(0.11, 0.24, 10),
  petal: new THREE.CircleGeometry(0.105, 10),
  pollen: new THREE.SphereGeometry(0.068, 8, 6),
  shadow: new THREE.CircleGeometry(0.29, 16)
};

function buildShadowMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0x14532d,
    transparent: true,
    opacity: 0.28,
    depthWrite: false
  });
}

const sharedShadowMat = buildShadowMaterial();
const stemMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.65 });
const leafMat = new THREE.MeshStandardMaterial({
  color: 0x4ade80,
  roughness: 0.5,
  side: THREE.DoubleSide
});
const pollenMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });
const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
const rubyEyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
const wingIceEyeMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });

function populateCrownGroup(
  crownGroup: THREE.Group,
  leafStage: LeafStage,
  flowerColor: PetalColor
): void {
  while (crownGroup.children.length > 0) {
    const ch = crownGroup.children.pop()!;
    crownGroup.remove(ch);
  }

  if (leafStage === 'bare') {
    const stub = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 6),
      stemMat
    );
    stub.position.set(0, 0.35, 0);
    crownGroup.add(stub);
    return;
  }

  if (leafStage === 'leaf') {
    const leaf = new THREE.Mesh(sharedGeo.leaf, leafMat);
    leaf.scale.set(1.25, 0.8, 1);
    leaf.rotation.set(-0.55, 0, 0.25);
    leaf.position.set(0.09, 0.36, 0.02);
    crownGroup.add(leaf);
    return;
  }

  if (leafStage === 'bud') {
    const budMat = new THREE.MeshStandardMaterial({
      color: PETAL_HEX[flowerColor],
      roughness: 0.38
    });
    const bud = new THREE.Mesh(sharedGeo.bud, budMat);
    bud.position.set(0, 0.42, 0);
    bud.rotation.z = -0.1;
    crownGroup.add(bud);
    return;
  }

  // flower
  const flowerGrp = new THREE.Group();
  flowerGrp.position.set(0, 0.41, 0);
  flowerGrp.rotation.x = -0.45;
  const pMat = new THREE.MeshStandardMaterial({
    color: PETAL_HEX[flowerColor],
    emissive: PETAL_HEX[flowerColor],
    emissiveIntensity: 0.12,
    roughness: 0.32,
    side: THREE.DoubleSide
  });

  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    const petal = new THREE.Mesh(sharedGeo.petal, pMat);
    petal.position.set(Math.cos(ang) * 0.115, Math.sin(ang) * 0.115, 0);
    flowerGrp.add(petal);
  }
  const center = new THREE.Mesh(sharedGeo.pollen, pollenMat);
  center.position.z = 0.025;
  flowerGrp.add(center);
  crownGroup.add(flowerGrp);
}

function populateDecorGroup(
  decorGroup: THREE.Group,
  decor: DecorCategory,
  showDecor: boolean,
  isRareDecor: boolean
): void {
  while (decorGroup.children.length > 0) {
    const ch = decorGroup.children.pop()!;
    decorGroup.remove(ch);
  }
  if (!showDecor) return;

  const goldOrNormal = (normalColor: number) =>
    new THREE.MeshStandardMaterial({
      color: isRareDecor ? 0xfbbf24 : normalColor,
      metalness: isRareDecor ? 0.55 : 0.1,
      roughness: isRareDecor ? 0.25 : 0.55,
      emissive: isRareDecor ? 0xf59e0b : 0x000000,
      emissiveIntensity: isRareDecor ? 0.22 : 0
    });

  if (decor === 'bakery') {
    const bread = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.11, 0.28, 6, 10),
      goldOrNormal(0xd97706)
    );
    bread.rotation.z = Math.PI / 2;
    bread.position.set(0, 0.32, 0.04);
    decorGroup.add(bread);
  } else if (decor === 'night_market') {
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.19, 0.12, 14),
      goldOrNormal(0xf8fafc)
    );
    brim.position.set(0, 0.34, 0);
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 10),
      goldOrNormal(0xffffff)
    );
    puff.position.set(0, 0.45, 0);
    decorGroup.add(brim, puff);
  } else if (decor === 'bubble_tea') {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.1, 0.26, 12),
      goldOrNormal(0xfde68a)
    );
    cup.position.set(0.2, 0.26, 0.04);
    cup.rotation.z = -0.25;
    const straw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.26, 6),
      new THREE.MeshStandardMaterial({ color: 0x1f2937 })
    );
    straw.position.set(0.22, 0.38, 0.04);
    straw.rotation.z = -0.25;
    decorGroup.add(cup, straw);
  } else if (decor === 'station') {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.22, 0.13, 12),
      goldOrNormal(0x1e3a8a)
    );
    cap.position.set(0, 0.32, 0);
    decorGroup.add(cap);
  } else if (decor === 'park') {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const cl = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 8, 6),
        goldOrNormal(0x16a34a)
      );
      cl.position.set(-0.2 + Math.cos(a) * 0.06, 0.3 + Math.sin(a) * 0.06, 0.1);
      decorGroup.add(cl);
    }
  } else if (decor === 'roadside') {
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.04, 14),
      goldOrNormal(0x22c55e)
    );
    coin.rotation.x = Math.PI / 2;
    coin.position.set(0.22, 0.05, 0.18);
    decorGroup.add(coin);
  } else {
    const crown = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.045, 8, 16),
      goldOrNormal(0xf59e0b)
    );
    crown.rotation.x = Math.PI / 2;
    crown.position.set(0, 0.31, 0);
    decorGroup.add(crown);
  }

  if (isRareDecor) {
    const star = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.085, 0),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfacc15,
        emissiveIntensity: 0.75,
        metalness: 0.6,
        roughness: 0.15
      })
    );
    star.position.set(-0.24, 0.44, 0.14);
    decorGroup.add(star);
  }
}

export function createDeGua3DRig(creature: DeGuaCreature): DeGua3DRig {
  const vMeta = VARIETY_CATALOG[creature.variety];
  const bodyColorHex = new THREE.Color(vMeta.bodyColor);
  const spotColorHex = new THREE.Color(vMeta.spotColor);

  const root = new THREE.Group();

  const shadowMesh = new THREE.Mesh(sharedGeo.shadow, sharedShadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.015;
  root.add(shadowMesh);

  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.42;
  root.add(bodyPivot);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColorHex,
    roughness: creature.variety === 'rock' ? 0.68 : 0.44,
    metalness: creature.variety === 'rock' ? 0.12 : 0.04,
    flatShading: creature.variety === 'rock'
  });

  const bodyMesh = new THREE.Mesh(
    creature.variety === 'rock' ? sharedGeo.rockBody : sharedGeo.sphereBody,
    bodyMat
  );
  if (creature.variety === 'purple') {
    bodyMesh.scale.set(1.26, 1.24, 1.12);
    shadowMesh.scale.set(1.3, 1.3, 1);
  } else if (creature.variety === 'white') {
    bodyMesh.scale.set(0.84, 0.94, 0.84);
    shadowMesh.scale.set(0.85, 0.85, 1);
  } else if (creature.variety === 'rock') {
    bodyMesh.scale.set(1.06, 1.05, 1.0);
  } else {
    bodyMesh.scale.set(0.95, 1.14, 0.92);
  }
  bodyPivot.add(bodyMesh);

  // 眼睛
  const zEye = creature.variety === 'purple' ? 0.28 : 0.235;
  const xEye = creature.variety === 'white' ? 0.088 : 0.105;
  const yEye = 0.07;

  const eyeMat =
    creature.variety === 'white'
      ? rubyEyeMat
      : creature.variety === 'winged'
        ? wingIceEyeMat
        : scleraMat;

  const eyeL = new THREE.Mesh(sharedGeo.eyeWhite, eyeMat);
  eyeL.position.set(-xEye, yEye, zEye);
  const eyeR = new THREE.Mesh(sharedGeo.eyeWhite, eyeMat);
  eyeR.position.set(xEye, yEye, zEye);
  bodyPivot.add(eyeL, eyeR);

  if (creature.variety !== 'white') {
    const pupilL = new THREE.Mesh(sharedGeo.pupil, pupilMat);
    pupilL.position.set(-xEye + 0.008, yEye, zEye + 0.036);
    const pupilR = new THREE.Mesh(sharedGeo.pupil, pupilMat);
    pupilR.position.set(xEye - 0.008, yEye, zEye + 0.036);
    bodyPivot.add(pupilL, pupilR);
  }

  // 品種專屬五官特徵
  if (creature.variety === 'red') {
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.16, 8),
      new THREE.MeshStandardMaterial({ color: spotColorHex, roughness: 0.45 })
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.01, zEye + 0.07);
    bodyPivot.add(nose);
  } else if (creature.variety === 'yellow') {
    const earGeo = new THREE.ConeGeometry(0.075, 0.21, 5);
    const earL = new THREE.Mesh(earGeo, bodyMat);
    earL.position.set(-0.28, 0.18, 0);
    earL.rotation.z = 0.72;
    const earR = new THREE.Mesh(earGeo, bodyMat);
    earR.position.set(0.28, 0.18, 0);
    earR.rotation.z = -0.72;
    bodyPivot.add(earL, earR);
  } else if (creature.variety === 'blue') {
    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.045, 0.016, 6, 10, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0x1e3a8a })
    );
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, -0.02, zEye + 0.015);
    bodyPivot.add(mouth);
  } else if (creature.variety === 'purple') {
    const whiskMat = new THREE.MeshStandardMaterial({ color: spotColorHex });
    const wGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.16, 5);
    const wL = new THREE.Mesh(wGeo, whiskMat);
    wL.position.set(-0.22, 0.26, 0.06);
    wL.rotation.z = 0.7;
    const wR = new THREE.Mesh(wGeo, whiskMat);
    wR.position.set(0.22, 0.26, 0.06);
    wR.rotation.z = -0.7;
    bodyPivot.add(wL, wR);
  }

  let wingL: THREE.Mesh | undefined;
  let wingR: THREE.Mesh | undefined;
  if (creature.variety === 'winged') {
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.82,
      roughness: 0.2,
      side: THREE.DoubleSide
    });
    wingL = new THREE.Mesh(sharedGeo.wing, wingMat);
    wingL.position.set(-0.24, 0.06, -0.2);
    wingL.rotation.y = 0.4;
    wingR = new THREE.Mesh(sharedGeo.wing, wingMat);
    wingR.position.set(0.24, 0.06, -0.2);
    wingR.rotation.y = -0.4;
    bodyPivot.add(wingL, wingR);
  }

  // 四肢（獨立關節以便真實邁步）
  const limbMat = new THREE.MeshStandardMaterial({ color: bodyColorHex, roughness: 0.5 });
  const footMat = new THREE.MeshStandardMaterial({ color: spotColorHex, roughness: 0.6 });

  const armL = new THREE.Mesh(sharedGeo.limb, limbMat);
  armL.position.set(-0.26, -0.04, 0.02);
  armL.rotation.z = 0.55;
  const armR = new THREE.Mesh(sharedGeo.limb, limbMat);
  armR.position.set(0.26, -0.04, 0.02);
  armR.rotation.z = -0.55;

  const legL = new THREE.Mesh(sharedGeo.foot, footMat);
  legL.scale.set(0.95, 1.35, 1.35);
  legL.position.set(-0.11, -0.34, 0.02);
  const legR = new THREE.Mesh(sharedGeo.foot, footMat);
  legR.scale.set(0.95, 1.35, 1.35);
  legR.position.set(0.11, -0.34, 0.02);

  bodyPivot.add(armL, armR, legL, legR);

  // 頭頂莖部與葉/花苞/花朵
  const headStemPivot = new THREE.Group();
  headStemPivot.position.set(0, 0.29, 0);
  bodyPivot.add(headStemPivot);

  const stemMesh = new THREE.Mesh(sharedGeo.stem, stemMat);
  stemMesh.position.y = 0.17;
  stemMesh.rotation.z = 0.08;
  headStemPivot.add(stemMesh);

  const crownGroup = new THREE.Group();
  headStemPivot.add(crownGroup);
  populateCrownGroup(crownGroup, creature.leafStage, creature.flowerColor);

  const decorGroup = new THREE.Group();
  bodyPivot.add(decorGroup);
  populateDecorGroup(
    decorGroup,
    creature.decor,
    creature.hasDecor,
    Boolean(creature.isRareDecor)
  );

  return {
    root,
    bodyPivot,
    headStemPivot,
    armL,
    armR,
    legL,
    legR,
    wingL,
    wingR,
    crownGroup,
    decorGroup,
    shadowMesh,
    variety: creature.variety,
    lastLeafStage: creature.leafStage,
    lastFlowerColor: creature.flowerColor,
    lastShowDecor: creature.hasDecor,
    lastDecor: creature.decor,
    lastIsRareDecor: Boolean(creature.isRareDecor)
  };
}

export function syncDeGua3DRig(rig: DeGua3DRig, creature: DeGuaCreature): void {
  if (
    rig.lastLeafStage !== creature.leafStage ||
    rig.lastFlowerColor !== creature.flowerColor
  ) {
    populateCrownGroup(rig.crownGroup, creature.leafStage, creature.flowerColor);
    rig.lastLeafStage = creature.leafStage;
    rig.lastFlowerColor = creature.flowerColor;
  }

  const rare = Boolean(creature.isRareDecor);
  if (
    rig.lastShowDecor !== creature.hasDecor ||
    rig.lastDecor !== creature.decor ||
    rig.lastIsRareDecor !== rare
  ) {
    populateDecorGroup(rig.decorGroup, creature.decor, creature.hasDecor, rare);
    rig.lastShowDecor = creature.hasDecor;
    rig.lastDecor = creature.decor;
    rig.lastIsRareDecor = rare;
  }
}

export function disposeObject3DTree(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (m.material) {
      if (Array.isArray(m.material)) {
        m.material.forEach((mat) => {
          if (
            mat !== sharedShadowMat &&
            mat !== stemMat &&
            mat !== leafMat &&
            mat !== pollenMat &&
            mat !== scleraMat &&
            mat !== pupilMat &&
            mat !== rubyEyeMat &&
            mat !== wingIceEyeMat
          ) {
            mat.dispose();
          }
        });
      } else if (
        m.material !== sharedShadowMat &&
        m.material !== stemMat &&
        m.material !== leafMat &&
        m.material !== pollenMat &&
        m.material !== scleraMat &&
        m.material !== pupilMat &&
        m.material !== rubyEyeMat &&
        m.material !== wingIceEyeMat
      ) {
        m.material.dispose();
      }
    }
  });
}
