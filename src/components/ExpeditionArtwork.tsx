import React from 'react';
import {
  DECOR_CATALOG,
  DecorCategory,
  DeGuaVariety,
  ExpeditionItem,
  PetalColor,
  VARIETY_CATALOG
} from '../types/game';
import { getCreatureHeartSummary } from '../services/expeditionService';

/**
 * 繪製可愛 3D 盆栽瓜糰（對照皮克敏圖一白色花苗圓甕造形＋顏色紋樣與嫩芽）
 */
export const ExpeditionSeedlingPotSvg: React.FC<{
  variety?: DeGuaVariety;
  isHuge?: boolean;
  size?: number;
}> = ({ variety = 'white', isHuge = false, size = 84 }) => {
  const accentHex = isHuge ? '#F59E0B' : VARIETY_CATALOG[variety].potColor;
  const potBodyTop = isHuge ? '#FEF3C7' : '#F8FAFC';
  const potBodyBot = isHuge ? '#FDE68A' : '#E2E8F0';
  const zigzagColor =
    variety === 'white'
      ? '#EF4444'
      : isHuge
        ? '#D97706'
        : accentHex;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 88 92"
      style={{ overflow: 'visible', filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.16))' }}
    >
      <defs>
        <radialGradient id={`potBody_${variety}_${isHuge ? 'h' : 'n'}`} cx="38%" cy="35%" r="68%">
          <stop offset="0%" stopColor={potBodyTop} />
          <stop offset="72%" stopColor={potBodyBot} />
          <stop offset="100%" stopColor={isHuge ? '#F59E0B' : '#CBD5E1'} />
        </radialGradient>
      </defs>

      <ellipse cx="44" cy="84" rx="21" ry="5.5" fill="rgba(15,23,42,0.16)" />

      {/* 圓甕本體 */}
      <path
        d="M 22 44 C 14 54 16 74 30 80 L 58 80 C 72 74 74 54 66 44 Z"
        fill={`url(#potBody_${variety}_${isHuge ? 'h' : 'n'})`}
        stroke={isHuge ? '#B45309' : '#CBD5E1'}
        strokeWidth="1.4"
      />

      {/* 甕身彩色鋸齒/色帶紋樣（對照圖一盆栽紋飾） */}
      <path
        d="M 21 53 L 28 62 L 36 53 L 44 62 L 52 53 L 60 62 L 67 53"
        fill="none"
        stroke={zigzagColor}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 甕口與土面 */}
      <ellipse cx="44" cy="43" rx="22" ry="8" fill="#D97706" stroke="#B45309" strokeWidth="1.2" />
      <ellipse cx="44" cy="43" rx="18.5" ry="6" fill="#78350F" />
      <ellipse cx="44" cy="44" rx="14" ry="3.5" fill="#451A03" opacity="0.65" />

      {/* 綠色嫩芽 */}
      <path
        d="M 44 43 Q 43 29 48 21"
        stroke="#4D7C0F"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 48 22 C 47 12 63 8 69 11 C 65 21 54 25 48 22 Z"
        fill="#65A30D"
        stroke="#3F6212"
        strokeWidth="1.1"
      />
      <path d="M 49 21 C 55 17 61 14 66 12" stroke="#BEF264" strokeWidth="1.1" fill="none" />

      {/* 巨大瓜糰金星光點 */}
      {isHuge && (
        <>
          <circle cx="26" cy="36" r="2.6" fill="#FDE047" />
          <circle cx="64" cy="34" r="2.2" fill="#FDE047" />
        </>
      )}
    </svg>
  );
};

/**
 * 繪製 4★ 滿心專屬飾品禮物盒（白色禮物盒＋立體紅絲帶蝴蝶結）
 */
export const ExpeditionGiftBoxSvg: React.FC<{ size?: number }> = ({ size = 84 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 88 88"
    style={{ overflow: 'visible', filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.18))' }}
  >
    <ellipse cx="44" cy="80" rx="25" ry="5.5" fill="rgba(15,23,42,0.16)" />
    {/* 盒身 */}
    <rect x="20" y="34" width="48" height="42" rx="5" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
    {/* 盒蓋 */}
    <rect x="17" y="25" width="54" height="14" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
    <rect x="20" y="39" width="48" height="3.5" fill="rgba(148,163,184,0.28)" />
    {/* 紅絲帶縱條與橫條 */}
    <rect x="39" y="25" width="10" height="51" fill="#EF4444" />
    <rect x="17" y="30" width="54" height="6" fill="#EF4444" opacity="0.9" />
    {/* 頂部立體蝴蝶結 */}
    <path
      d="M 44 26 C 34 11 21 15 24 24 C 26 29 36 28 44 26 Z"
      fill="#DC2626"
      stroke="#991B1B"
      strokeWidth="1.1"
    />
    <path
      d="M 44 26 C 54 11 67 15 64 24 C 62 29 52 28 44 26 Z"
      fill="#EF4444"
      stroke="#991B1B"
      strokeWidth="1.1"
    />
    <circle cx="44" cy="25" r="4.5" fill="#B91C1C" stroke="#FEE2E2" strokeWidth="1" />
  </svg>
);

/**
 * 繪製飽滿 3D 水果插畫（青蘋果 / 檸檬 / 紅蘋果 / 橘子 / 藍莓 / 水蜜桃）
 */
export const ExpeditionFruitSvg: React.FC<{
  emoji?: string;
  nectarColor?: PetalColor;
  size?: number;
}> = ({ emoji = '🍏', nectarColor = 'white', size = 84 }) => {
  const palette =
    emoji === '🍏'
      ? { c1: '#A3E635', c2: '#4D7C0F', stem: '#3F6212', kind: 'apple' as const }
      : emoji === '🍎'
        ? { c1: '#FB7185', c2: '#DC2626', stem: '#78350F', kind: 'apple' as const }
        : emoji === '🍋'
          ? { c1: '#FEF08A', c2: '#EAB308', stem: '#65A30D', kind: 'lemon' as const }
          : emoji === '🍊'
            ? { c1: '#FDBA74', c2: '#EA580C', stem: '#3F6212', kind: 'orange' as const }
            : emoji === '🫐' || nectarColor === 'blue'
              ? { c1: '#93C5FD', c2: '#1D4ED8', stem: '#1E3A8A', kind: 'berry' as const }
              : { c1: '#FBCFE8', c2: '#F43F5E', stem: '#65A30D', kind: 'apple' as const };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 88 88"
      style={{ overflow: 'visible', filter: 'drop-shadow(0 8px 11px rgba(0,0,0,0.18))' }}
    >
      <defs>
        <radialGradient id={`fruitGrad_${palette.kind}_${palette.c2.replace('#', '')}`} cx="36%" cy="30%" r="68%">
          <stop offset="0%" stopColor={palette.c1} />
          <stop offset="80%" stopColor={palette.c2} />
          <stop offset="100%" stopColor={palette.stem} />
        </radialGradient>
      </defs>
      <ellipse cx="44" cy="79" rx="22" ry="5" fill="rgba(15,23,42,0.16)" />

      {palette.kind === 'lemon' ? (
        <g>
          <path
            d="M 15 47 C 13 31 28 21 46 22 C 63 22 76 33 74 47 C 75 61 61 70 43 70 C 26 70 14 59 15 47 Z"
            fill={`url(#fruitGrad_${palette.kind}_${palette.c2.replace('#', '')})`}
          />
          <ellipse cx="33" cy="36" rx="9" ry="4.5" transform="rotate(-20 33 36)" fill="rgba(255,255,255,0.42)" />
        </g>
      ) : palette.kind === 'berry' ? (
        <g>
          <circle cx="35" cy="52" r="14" fill="#2563EB" />
          <circle cx="53" cy="51" r="14" fill="#1D4ED8" />
          <circle cx="44" cy="39" r="15" fill={`url(#fruitGrad_${palette.kind}_${palette.c2.replace('#', '')})`} />
          <circle cx="39" cy="33" r="4.5" fill="rgba(255,255,255,0.42)" />
          <path d="M 44 24 L 40 16 M 44 24 L 51 17" stroke="#65A30D" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          <path
            d="M 44 26 C 32 19 16 28 17 48 C 18 66 30 76 41 74 C 43 73.5 45 73.5 47 74 C 58 76 70 66 71 48 C 72 28 56 19 44 26 Z"
            fill={`url(#fruitGrad_${palette.kind}_${palette.c2.replace('#', '')})`}
          />
          <path d="M 44 27 Q 45 16 50 12" stroke="#78350F" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          {palette.kind === 'orange' && (
            <path d="M 47 17 C 54 11 63 14 64 21 C 56 24 49 22 47 17 Z" fill="#4ADE80" />
          )}
          <ellipse cx="30" cy="39" rx="6.5" ry="10" transform="rotate(-18 30 39)" fill="rgba(255,255,255,0.38)" />
        </g>
      )}
    </svg>
  );
};

/**
 * 飾品分類淡彩浮水印圖示（花苗與禮物後方顯示：黃色表示此分類此顏色已集滿、灰色表示尚未）
 */
export const DecorSilhouetteBadge: React.FC<{
  decor?: DecorCategory;
  isCompleted: boolean;
  size?: number;
}> = ({ decor = 'roadside', isCompleted, size = 56 }) => {
  const icon = DECOR_CATALOG[decor]?.icon || '🏷️';
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: isCompleted
          ? 'radial-gradient(circle at 35% 30%, rgba(254,240,138,0.88), rgba(250,204,21,0.55))'
          : 'radial-gradient(circle at 35% 30%, rgba(226,232,240,0.72), rgba(203,213,225,0.45))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.56),
        filter: isCompleted
          ? 'drop-shadow(0 0 10px rgba(250,204,21,0.5)) sepia(0.35) saturate(1.8)'
          : 'grayscale(1) opacity(0.55)',
        pointerEvents: 'none',
        userSelect: 'none'
      }}
    >
      {icon}
    </div>
  );
};

export const ExpeditionItemArtwork: React.FC<{
  exp: ExpeditionItem;
  isDecorCompleted?: boolean;
  size?: number;
  showDecorBadge?: boolean;
}> = ({ exp, isDecorCompleted = false, size = 84, showDecorBadge = true }) => {
  const badgeSize = Math.round(size * 0.64);
  if (exp.kind === 'gift') {
    return (
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {showDecorBadge && (
          <div style={{ position: 'absolute', right: -Math.round(size * 0.34), top: -Math.round(size * 0.14), zIndex: 1 }}>
            <DecorSilhouetteBadge decor={exp.seedlingDecor} isCompleted={isDecorCompleted} size={badgeSize} />
          </div>
        )}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <ExpeditionGiftBoxSvg size={size} />
        </div>
      </div>
    );
  }
  if (exp.kind === 'fruit') {
    return (
      <ExpeditionFruitSvg emoji={exp.fruitEmoji} nectarColor={exp.nectarColor} size={size} />
    );
  }
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {showDecorBadge && (
        <div style={{ position: 'absolute', right: -Math.round(size * 0.34), top: -Math.round(size * 0.16), zIndex: 1 }}>
          <DecorSilhouetteBadge decor={exp.seedlingDecor} isCompleted={isDecorCompleted} size={badgeSize} />
        </div>
      )}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <ExpeditionSeedlingPotSvg
          variety={exp.seedlingVariety || 'white'}
          isHuge={exp.seedlingIsHuge}
          size={size}
        />
      </div>
    </div>
  );
};

/**
 * 渲染紅心 (1~4) / 金心 (5~8) 條狀列，精確表現未滿顆的局部填充比例
 */
export const CreatureHeartsRow: React.FC<{
  friendship: number;
  heartSize?: number;
}> = ({ friendship, heartSize = 11 }) => {
  const { filledRed, partialRedPct, filledGold, partialGoldPct } =
    getCreatureHeartSummary(friendship);

  const isGoldPhase = friendship > 400;
  const fullCount = isGoldPhase ? filledGold : filledRed;
  const partialPct = isGoldPhase ? partialGoldPct : partialRedPct;
  const fillHex = isGoldPhase ? '#F59E0B' : '#FB7185';
  const trackHex = isGoldPhase ? '#FB7185' : '#E2E8F0';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
      {[0, 1, 2, 3].map((slot) => {
        const pct = slot < fullCount ? 100 : slot === fullCount ? partialPct : 0;
        return (
          <svg
            key={slot}
            width={heartSize}
            height={heartSize}
            viewBox="0 0 24 24"
            style={{ overflow: 'visible' }}
          >
            <defs>
              <clipPath id={`hc_${friendship}_${slot}`}>
                <rect x="0" y={24 - (24 * pct) / 100} width="24" height={(24 * pct) / 100} />
              </clipPath>
            </defs>
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill={trackHex}
            />
            {pct > 0 && (
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill={fillHex}
                clipPath={`url(#hc_${friendship}_${slot})`}
              />
            )}
          </svg>
        );
      })}
    </div>
  );
};
