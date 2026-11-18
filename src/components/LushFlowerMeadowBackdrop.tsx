import React from 'react';

interface FlowerPatchSpec {
  id: number;
  xPct: number;
  yPct: number;
  scale: number;
  kind: 'daisy_cluster' | 'red_poppy' | 'blue_clover' | 'pink_blossom' | 'lavender' | 'grass';
  swayDelay: string;
  slow?: boolean;
}

const HOME_PATCHES: FlowerPatchSpec[] = [
  // 遠景地平線沿岸繁花草叢（任務卡下方左右延伸）
  { id: 1, xPct: 8, yPct: 12, scale: 0.56, kind: 'daisy_cluster', swayDelay: '0s' },
  { id: 2, xPct: 20, yPct: 16, scale: 0.58, kind: 'pink_blossom', swayDelay: '0.4s', slow: true },
  { id: 3, xPct: 35, yPct: 11, scale: 0.52, kind: 'grass', swayDelay: '0.8s' },
  { id: 4, xPct: 68, yPct: 13, scale: 0.55, kind: 'lavender', swayDelay: '0.3s', slow: true },
  { id: 5, xPct: 84, yPct: 10, scale: 0.58, kind: 'daisy_cluster', swayDelay: '1.1s' },
  { id: 6, xPct: 93, yPct: 17, scale: 0.62, kind: 'red_poppy', swayDelay: '0.5s' },
  // 中景密集繁花花海
  { id: 7, xPct: 6, yPct: 34, scale: 0.8, kind: 'red_poppy', swayDelay: '0.2s' },
  { id: 8, xPct: 17, yPct: 28, scale: 0.72, kind: 'blue_clover', swayDelay: '0.9s', slow: true },
  { id: 9, xPct: 28, yPct: 38, scale: 0.78, kind: 'daisy_cluster', swayDelay: '0.4s' },
  { id: 10, xPct: 44, yPct: 32, scale: 0.68, kind: 'grass', swayDelay: '1.3s' },
  { id: 11, xPct: 62, yPct: 30, scale: 0.72, kind: 'pink_blossom', swayDelay: '0.7s', slow: true },
  { id: 12, xPct: 76, yPct: 38, scale: 0.82, kind: 'daisy_cluster', swayDelay: '0.1s' },
  { id: 13, xPct: 90, yPct: 33, scale: 0.78, kind: 'lavender', swayDelay: '1.0s' },
  // 圍繞中央小人周圍的盛開花團
  { id: 14, xPct: 11, yPct: 54, scale: 0.94, kind: 'pink_blossom', swayDelay: '0.3s' },
  { id: 15, xPct: 24, yPct: 48, scale: 0.88, kind: 'lavender', swayDelay: '0.8s', slow: true },
  { id: 16, xPct: 37, yPct: 62, scale: 0.92, kind: 'blue_clover', swayDelay: '0.2s' },
  { id: 17, xPct: 64, yPct: 60, scale: 0.9, kind: 'red_poppy', swayDelay: '1.2s', slow: true },
  { id: 18, xPct: 78, yPct: 50, scale: 0.88, kind: 'daisy_cluster', swayDelay: '0.6s' },
  { id: 19, xPct: 91, yPct: 56, scale: 0.96, kind: 'grass', swayDelay: '0.4s' },
  // 近景底部濃密花草（延伸至螢幕最底緣）
  { id: 20, xPct: 8, yPct: 76, scale: 1.15, kind: 'daisy_cluster', swayDelay: '0.7s' },
  { id: 21, xPct: 21, yPct: 84, scale: 1.22, kind: 'red_poppy', swayDelay: '0.1s', slow: true },
  { id: 22, xPct: 34, yPct: 78, scale: 1.05, kind: 'pink_blossom', swayDelay: '0.9s' },
  { id: 23, xPct: 49, yPct: 88, scale: 1.18, kind: 'daisy_cluster', swayDelay: '0.4s', slow: true },
  { id: 24, xPct: 65, yPct: 80, scale: 1.12, kind: 'lavender', swayDelay: '1.1s' },
  { id: 25, xPct: 80, yPct: 86, scale: 1.24, kind: 'blue_clover', swayDelay: '0.5s' },
  { id: 26, xPct: 92, yPct: 79, scale: 1.16, kind: 'pink_blossom', swayDelay: '0.8s', slow: true },
  { id: 27, xPct: 16, yPct: 95, scale: 1.32, kind: 'grass', swayDelay: '0.2s' },
  { id: 28, xPct: 58, yPct: 96, scale: 1.28, kind: 'red_poppy', swayDelay: '0.6s' },
  { id: 29, xPct: 86, yPct: 96, scale: 1.32, kind: 'daisy_cluster', swayDelay: '0.3s', slow: true }
];

const GARDEN_PATCHES: FlowerPatchSpec[] = [
  ...HOME_PATCHES.map((p) => ({ ...p, yPct: 8 + p.yPct * 0.9 })),
  { id: 30, xPct: 48, yPct: 22, scale: 0.65, kind: 'daisy_cluster', swayDelay: '0.2s' },
  { id: 31, xPct: 54, yPct: 44, scale: 0.8, kind: 'grass', swayDelay: '0.9s', slow: true },
  { id: 32, xPct: 28, yPct: 64, scale: 0.98, kind: 'red_poppy', swayDelay: '0.5s' },
  { id: 33, xPct: 72, yPct: 68, scale: 1.0, kind: 'pink_blossom', swayDelay: '1.1s' }
];

const FlowerPatchSvg: React.FC<{ kind: FlowerPatchSpec['kind'] }> = ({ kind }) => {
  if (kind === 'grass') {
    return (
      <svg width="56" height="44" viewBox="0 0 56 44" style={{ overflow: 'visible' }}>
        <ellipse cx="28" cy="39" rx="22" ry="4" fill="rgba(22,101,52,0.22)" />
        <path d="M24 38 C20 26 12 18 6 12 C14 16 21 23 26 36 Z" fill="#16A34A" />
        <path d="M28 38 C28 24 27 14 29 5 C32 14 33 25 32 38 Z" fill="#22C55E" />
        <path d="M33 38 C36 25 43 17 50 11 C44 19 38 27 35 38 Z" fill="#15803D" />
        <path d="M18 38 C16 30 10 25 3 23 C11 25 16 31 20 38 Z" fill="#4ADE80" />
        <path d="M37 38 C40 31 46 27 53 26 C46 29 41 33 39 38 Z" fill="#4ADE80" />
      </svg>
    );
  }

  const palette =
    kind === 'red_poppy'
      ? { p1: '#FB7185', p2: '#EF4444', center: '#FDE047' }
      : kind === 'pink_blossom'
        ? { p1: '#F472B6', p2: '#EC4899', center: '#FEF08A' }
        : kind === 'blue_clover'
          ? { p1: '#60A5FA', p2: '#3B82F6', center: '#FEF9C3' }
          : kind === 'lavender'
            ? { p1: '#C084FC', p2: '#A855F7', center: '#FEF08A' }
            : { p1: '#FFFFFF', p2: '#FEF08A', center: '#F59E0B' };

  return (
    <svg width="64" height="50" viewBox="0 0 64 50" style={{ overflow: 'visible' }}>
      <ellipse cx="32" cy="44" rx="26" ry="5" fill="rgba(20,83,45,0.24)" />
      {/* 底座青草葉 */}
      <path d="M22 43 C15 34 8 29 3 24 C11 26 19 32 25 42 Z" fill="#15803D" />
      <path d="M32 43 C31 31 32 21 35 12 C37 22 36 33 35 43 Z" fill="#16A34A" />
      <path d="M41 43 C47 34 54 29 60 25 C53 31 46 36 43 43 Z" fill="#15803D" />
      {/* 左花 */}
      <g transform="translate(17, 29)">
        <circle cx="0" cy="-6" r="4.2" fill={palette.p1} />
        <circle cx="6" cy="-1" r="4.2" fill={palette.p1} />
        <circle cx="4" cy="5" r="4.2" fill={palette.p1} />
        <circle cx="-4" cy="5" r="4.2" fill={palette.p1} />
        <circle cx="-6" cy="-1" r="4.2" fill={palette.p1} />
        <circle cx="0" cy="0" r="3.2" fill={palette.center} />
      </g>
      {/* 上主花 */}
      <g transform="translate(34, 19)">
        <circle cx="0" cy="-7.5" r="5" fill={palette.p2} />
        <circle cx="7" cy="-2" r="5" fill={palette.p2} />
        <circle cx="4.5" cy="6.5" r="5" fill={palette.p2} />
        <circle cx="-4.5" cy="6.5" r="5" fill={palette.p2} />
        <circle cx="-7" cy="-2" r="5" fill={palette.p2} />
        <circle cx="0" cy="0" r="3.6" fill={palette.center} />
      </g>
      {/* 右前花 */}
      <g transform="translate(47, 31)">
        <circle cx="0" cy="-5.5" r="3.8" fill={palette.p1} />
        <circle cx="5.5" cy="-1.5" r="3.8" fill={palette.p1} />
        <circle cx="3.5" cy="5" r="3.8" fill={palette.p1} />
        <circle cx="-3.5" cy="5" r="3.8" fill={palette.p1} />
        <circle cx="-5.5" cy="-1.5" r="3.8" fill={palette.p1} />
        <circle cx="0" cy="0" r="2.8" fill={palette.center} />
      </g>
    </svg>
  );
};

export const LushFlowerMeadowBackdrop: React.FC<{
  variant: 'home' | 'garden' | 'planting';
  animateBurst?: boolean;
}> = ({ variant, animateBurst = false }) => {
  const patches = variant === 'home' ? HOME_PATCHES : GARDEN_PATCHES;
  const floatingPetals = [
    { x: 18, y: 45, c: '#FFFFFF', delay: '0s' },
    { x: 38, y: 62, c: '#FEF08A', delay: '1.1s' },
    { x: 64, y: 52, c: '#FBCFE8', delay: '0.5s' },
    { x: 82, y: 68, c: '#BFDBFE', delay: '1.9s' },
    { x: 52, y: 74, c: '#FFFFFF', delay: '2.4s' }
  ];

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0
      }}
    >
      {/* 草原陽光坡地底層漸層與明暗草班 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            variant === 'home'
              ? 'linear-gradient(180deg, rgba(163,230,53,0.18) 0%, #6CC644 12%, #5AB63B 46%, #459D2E 82%, #3B8927 100%)'
              : 'linear-gradient(180deg, #4BA134 0%, #5BB842 22%, #6BC84D 54%, #53AD38 82%, #3E8E2A 100%)'
        }}
      />

      {/* 有機立體日照光斑（營造皮克敏繁花草地立體起伏感） */}
      <div
        style={{
          position: 'absolute',
          top: '14%',
          left: '-12%',
          width: '72%',
          height: '44%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(190,242,100,0.42) 0%, rgba(190,242,100,0) 72%)'
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '28%',
          right: '-15%',
          width: '68%',
          height: '46%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(254,240,138,0.28) 0%, rgba(254,240,138,0) 70%)'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '12%',
          width: '85%',
          height: '42%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(22,101,52,0.28) 0%, rgba(22,101,52,0) 75%)'
        }}
      />

      {/* 多景深隨風搖曳的花叢與草簇 */}
      {patches.map((p) => (
        <div
          key={p.id}
          className={p.slow ? 'meadow-sway-slow' : 'meadow-sway'}
          style={{
            position: 'absolute',
            left: `${p.xPct}%`,
            top: `${p.yPct}%`,
            marginLeft: -30,
            marginTop: -24,
            transform: `scale(${p.scale})`,
            animationDelay: p.swayDelay,
            opacity: variant === 'home' && p.yPct < 14 ? 0.78 : 0.96
          }}
        >
          <FlowerPatchSvg kind={p.kind} />
        </div>
      ))}

      {/* 輕飄在草原上的花瓣與陽光光點 */}
      {floatingPetals.map((fp, i) => (
        <div
          key={i}
          className="meadow-float-petal"
          style={{
            position: 'absolute',
            left: `${fp.x}%`,
            top: `${fp.y}%`,
            width: animateBurst ? 11 : 8,
            height: animateBurst ? 7 : 5,
            borderRadius: '80% 10% 80% 10%',
            background: fp.c,
            boxShadow: `0 0 8px ${fp.c}`,
            animationDelay: fp.delay,
            animationDuration: animateBurst ? '2.5s' : '4.4s'
          }}
        />
      ))}
    </div>
  );
};
