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
  // 自然皮克敏風格草原：柔和細碎草葉簇＋極少量淡雅小白點野草花（不搶走主角與地瓜球小隊焦點）
  { id: 1, xPct: 12, yPct: 24, scale: 0.42, kind: 'grass', swayDelay: '0.2s' },
  { id: 2, xPct: 28, yPct: 18, scale: 0.36, kind: 'grass', swayDelay: '0.9s', slow: true },
  { id: 3, xPct: 68, yPct: 22, scale: 0.4, kind: 'grass', swayDelay: '0.4s' },
  { id: 4, xPct: 86, yPct: 26, scale: 0.45, kind: 'grass', swayDelay: '1.1s', slow: true },
  { id: 5, xPct: 8, yPct: 48, scale: 0.54, kind: 'grass', swayDelay: '0.3s' },
  { id: 6, xPct: 22, yPct: 42, scale: 0.28, kind: 'daisy_cluster', swayDelay: '0.7s', slow: true },
  { id: 7, xPct: 77, yPct: 44, scale: 0.3, kind: 'daisy_cluster', swayDelay: '0.5s' },
  { id: 8, xPct: 91, yPct: 52, scale: 0.56, kind: 'grass', swayDelay: '1.2s' },
  { id: 9, xPct: 15, yPct: 72, scale: 0.62, kind: 'grass', swayDelay: '0.6s', slow: true },
  { id: 10, xPct: 42, yPct: 76, scale: 0.5, kind: 'grass', swayDelay: '0.1s' },
  { id: 11, xPct: 72, yPct: 74, scale: 0.58, kind: 'grass', swayDelay: '0.8s' },
  { id: 12, xPct: 6, yPct: 91, scale: 0.72, kind: 'grass', swayDelay: '0.3s', slow: true },
  { id: 13, xPct: 33, yPct: 92, scale: 0.34, kind: 'daisy_cluster', swayDelay: '1.0s' },
  { id: 14, xPct: 64, yPct: 93, scale: 0.68, kind: 'grass', swayDelay: '0.4s' },
  { id: 15, xPct: 88, yPct: 90, scale: 0.7, kind: 'grass', swayDelay: '0.9s', slow: true }
];

const GARDEN_PATCHES: FlowerPatchSpec[] = [
  // 遠景地平線小草點（小比例、高景深）
  { id: 20, xPct: 14, yPct: 20, scale: 0.34, kind: 'grass', swayDelay: '0s' },
  { id: 21, xPct: 32, yPct: 21, scale: 0.36, kind: 'daisy_cluster', swayDelay: '0.4s', slow: true },
  { id: 22, xPct: 68, yPct: 19, scale: 0.35, kind: 'lavender', swayDelay: '0.3s', slow: true },
  { id: 23, xPct: 86, yPct: 22, scale: 0.38, kind: 'pink_blossom', swayDelay: '0.5s' },
  // 中景花園草坪花叢（中比例）
  { id: 24, xPct: 10, yPct: 36, scale: 0.56, kind: 'blue_clover', swayDelay: '0.9s', slow: true },
  { id: 25, xPct: 28, yPct: 32, scale: 0.52, kind: 'grass', swayDelay: '0.2s' },
  { id: 26, xPct: 74, yPct: 34, scale: 0.54, kind: 'grass', swayDelay: '0.7s', slow: true },
  { id: 27, xPct: 90, yPct: 40, scale: 0.6, kind: 'daisy_cluster', swayDelay: '0.1s' },
  { id: 28, xPct: 16, yPct: 54, scale: 0.72, kind: 'red_poppy', swayDelay: '0.6s' },
  { id: 29, xPct: 84, yPct: 56, scale: 0.74, kind: 'pink_blossom', swayDelay: '0.3s', slow: true },
  // 近景立體草簇與野花（大比例營造 3D 近距縱深）
  { id: 30, xPct: 12, yPct: 76, scale: 1.02, kind: 'red_poppy', swayDelay: '0.2s', slow: true },
  { id: 31, xPct: 34, yPct: 80, scale: 0.92, kind: 'grass', swayDelay: '0.5s' },
  { id: 32, xPct: 56, yPct: 84, scale: 0.98, kind: 'daisy_cluster', swayDelay: '0.4s' },
  { id: 33, xPct: 82, yPct: 78, scale: 1.06, kind: 'pink_blossom', swayDelay: '0.8s', slow: true },
  { id: 34, xPct: 92, yPct: 90, scale: 1.15, kind: 'grass', swayDelay: '0.1s' }
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
      {/* 草原陽光坡地底層漸層（garden 模式包含晴朗遠景天際＋遠近漸層綠地） */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            variant === 'home'
              ? 'linear-gradient(180deg, rgba(180,215,243,0.92) 0%, rgba(154,210,168,0.88) 7%, #83CB5B 18%, #63BA43 44%, #4CA131 76%, #3E8E27 100%)'
              : 'linear-gradient(180deg, #93D2FA 0%, #BAE6FD 9%, #B7E4A6 15%, #77CB55 24%, #5EB943 52%, #4BA332 80%, #3A8924 100%)'
        }}
      />

      {/* 口哨花園專屬：遠處柔霧樹林丘陵＋3D 透視草坪紋理與蜿蜒砂土小徑（提供真實遠近地面參考點！） */}
      {variant === 'garden' && (
        <>
          {/* 遠景森林樹冠與緩坡地平線 */}
          <svg
            viewBox="0 0 400 90"
            preserveAspectRatio="none"
            style={{ position: 'absolute', top: '8%', left: 0, width: '100%', height: '14%', pointerEvents: 'none' }}
          >
            <path
              d="M0 70 Q45 36 95 52 T190 42 T290 50 T400 38 L400 90 L0 90 Z"
              fill="rgba(74, 165, 76, 0.55)"
            />
            <path
              d="M0 78 C24 58 46 60 66 72 C88 50 116 52 134 72 C158 56 184 58 205 74 C232 48 264 52 284 74 C312 58 344 56 368 72 C384 62 394 64 400 72 L400 90 L0 90 Z"
              fill="#62BC4B"
            />
          </svg>

          {/* 3D 透視草坪斜切明暗光帶 + 彎曲暖米色花園小徑 */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          >
            <polygon points="0,18 100,18 100,100 0,100" fill="none" />
            <polygon points="36,18 48,18 22,100 0,100" fill="rgba(255,255,255,0.06)" />
            <polygon points="56,18 68,18 96,100 72,100" fill="rgba(255,255,255,0.05)" />
            {/* 遠小近寬的蜿蜒砂土小徑，立刻呈現地面 3D 縱深 */}
            <path
              d="M 55 18 C 52 34 38 46 44 64 C 49 78 62 90 56 100 L 42 100 C 37 88 26 76 28 60 C 30 44 47 32 51 18 Z"
              fill="rgba(235, 225, 192, 0.42)"
            />
            <path
              d="M 54 18 C 51 34 36 46 42 64 C 46 78 58 90 52 100 L 46 100 C 42 89 31 77 33 61 C 35 45 49 32 52 18 Z"
              fill="rgba(247, 240, 218, 0.36)"
            />
            <ellipse cx="42" cy="52" rx="1.6" ry="0.7" fill="rgba(180,165,130,0.45)" />
            <ellipse cx="48" cy="70" rx="2.1" ry="0.9" fill="rgba(180,165,130,0.48)" />
            <ellipse cx="38" cy="64" rx="1.4" ry="0.6" fill="rgba(160,145,110,0.42)" />
          </svg>
        </>
      )}

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
