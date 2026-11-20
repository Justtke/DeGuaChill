import React from 'react';

/**
 * 繪製「全身邁步走路的玩家角色」SVG 字串（同時供地圖 L.divIcon 與 React 元件共用）
 */
export function buildFullBodyWalkingPlayerSvg(width = 56, height = 80): string {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 56 80" style="overflow:visible;filter:drop-shadow(0 5px 7px rgba(0,0,0,0.32));">
      <ellipse cx="28" cy="73" rx="14" ry="5" fill="rgba(0,0,0,0.26)" />
      <g class="pikmin-walker-leg-l">
        <rect x="19" y="50" width="7" height="17" rx="3.5" fill="#1E3A8A" />
        <ellipse cx="22.5" cy="68" rx="5.5" ry="3.5" fill="#EF4444" stroke="#FFFFFF" stroke-width="1.2" />
      </g>
      <g class="pikmin-walker-leg-r">
        <rect x="30" y="50" width="7" height="17" rx="3.5" fill="#1E40AF" />
        <ellipse cx="33.5" cy="68" rx="5.5" ry="3.5" fill="#EF4444" stroke="#FFFFFF" stroke-width="1.2" />
      </g>
      <g class="pikmin-walker-body">
        <rect x="15" y="29" width="26" height="20" rx="6" fill="#D97706" stroke="#92400E" stroke-width="1.2" />
        <rect x="11" y="32" width="6" height="16" rx="3" transform="rotate(14 14 32)" fill="#38BDF8" stroke="#0284C7" stroke-width="1" />
        <circle cx="12" cy="48" r="3" fill="#FDE68A" />
        <rect x="39" y="32" width="6" height="16" rx="3" transform="rotate(-14 42 32)" fill="#38BDF8" stroke="#0284C7" stroke-width="1" />
        <circle cx="44" cy="48" r="3" fill="#FDE68A" />
        <path d="M 17 31 C 17 27 39 27 39 31 L 40 52 L 16 52 Z" fill="#38BDF8" stroke="#0284C7" stroke-width="1.2" />
        <rect x="24" y="30" width="8" height="22" fill="#FFFFFF" />
        <rect x="19" y="30" width="3" height="18" rx="1" fill="#92400E" />
        <rect x="34" y="30" width="3" height="18" rx="1" fill="#92400E" />
        <circle cx="28" cy="17" r="12" fill="#FDE68A" stroke="#D97706" stroke-width="1" />
        <path d="M 16 16 C 16 5 40 5 40 16 C 37 11 32 10 28 11 C 23 10 19 12 16 16 Z" fill="#27272A" />
        <circle cx="23.5" cy="17.5" r="1.8" fill="#1E293B" />
        <circle cx="32.5" cy="17.5" r="1.8" fill="#1E293B" />
        <circle cx="20.5" cy="20" r="2.2" fill="#FDA4AF" opacity="0.7" />
        <circle cx="35.5" cy="20" r="2.2" fill="#FDA4AF" opacity="0.7" />
        <path d="M 25 22 Q 28 24.5 31 22" stroke="#9A3412" stroke-width="1.5" stroke-linecap="round" fill="none" />
      </g>
    </svg>
  `;
}

export const WalkingPlayerAvatar: React.FC<{ height?: number; isWalking?: boolean }> = ({
  height = 84,
  isWalking = true
}) => {
  const width = Math.round((height * 56) / 80);
  return (
    <div
      className={isWalking ? undefined : 'pikmin-walker-static'}
      style={{
        width,
        height,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      dangerouslySetInnerHTML={{ __html: buildFullBodyWalkingPlayerSvg(width, height) }}
    />
  );
};

/**
 * 類似「2 吋證件大頭照」半身個人頭像（完全對照皮克敏左側人物方圓裁切大頭照）
 */
export const PlayerPortraitAvatar: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: 12,
      background: 'linear-gradient(180deg, #DBEAFE 0%, #BFDBFE 100%)',
      border: '1.5px solid #93C5FD',
      overflow: 'hidden',
      display: 'inline-flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      flexShrink: 0,
      boxShadow: 'inset 0 1px 4px rgba(255,255,255,0.85)'
    }}
  >
    <svg width={size} height={size} viewBox="0 0 48 48">
      {/* 上半身襯衫＋吊帶 */}
      <path d="M9 48 C10 34 38 34 39 48 Z" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.2" />
      <rect x="20" y="34" width="8" height="14" fill="#FFFFFF" />
      <rect x="14" y="35" width="3" height="13" rx="1" fill="#92400E" />
      <rect x="31" y="35" width="3" height="13" rx="1" fill="#92400E" />
      {/* 2吋臉部特寫 */}
      <circle cx="24" cy="21" r="13.5" fill="#FDE68A" stroke="#D97706" strokeWidth="1.1" />
      <path d="M 10.5 20 C 10.5 7 37.5 7 37.5 20 C 34 13.5 29 12.5 24 13.5 C 18.5 12.5 14 14 10.5 20 Z" fill="#27272A" />
      <circle cx="19" cy="21.5" r="2" fill="#1E293B" />
      <circle cx="29" cy="21.5" r="2" fill="#1E293B" />
      <circle cx="15.5" cy="24.5" r="2.5" fill="#FDA4AF" opacity="0.72" />
      <circle cx="32.5" cy="24.5" r="2.5" fill="#FDA4AF" opacity="0.72" />
      <path d="M 20.5 27 Q 24 29.8 27.5 27" stroke="#9A3412" strokeWidth="1.7" strokeLinecap="round" fill="none" />
    </svg>
  </div>
);

/**
 * 依等級區間取得六角徽章顏色（1~49 青銅 / 50~99 白銀 / 100~130 金色）
 */
export function getLevelBadgeStyle(level: number): {
  bg: string;
  border: string;
  text: string;
  labelColor: string;
} {
  if (level >= 100) {
    return {
      bg: 'linear-gradient(155deg, #FEF9C3 0%, #FACC15 45%, #D97706 100%)',
      border: '#B45309',
      text: '#78350F',
      labelColor: '#92400E'
    };
  }
  if (level >= 50) {
    return {
      bg: 'linear-gradient(155deg, #FFFFFF 0%, #CBD5E1 48%, #64748B 100%)',
      border: '#64748B',
      text: '#0F172A',
      labelColor: '#334155'
    };
  }
  return {
    bg: 'linear-gradient(155deg, #FED7AA 0%, #C27438 50%, #7C2D12 100%)',
    border: '#7C2D12',
    text: '#FFFFFF',
    labelColor: '#FEF3C7'
  };
}

export const PlayerLevelHexBadge: React.FC<{ level: number }> = ({ level }) => {
  const palette = getLevelBadgeStyle(level);
  return (
    <div
      style={{
        width: 30,
        height: 33,
        background: palette.border,
        clipPath: 'polygon(50% 0%, 96% 24%, 96% 76%, 50% 100%, 4% 76%, 4% 24%)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.22))'
      }}
    >
      <div
        style={{
          width: 26,
          height: 29,
          background: palette.bg,
          clipPath: 'polygon(50% 0%, 96% 24%, 96% 76%, 50% 100%, 4% 76%, 4% 24%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 0.92
        }}
      >
        <span style={{ fontSize: 7.5, fontWeight: 900, color: palette.labelColor }}>Lv</span>
        <span style={{ fontSize: 12, fontWeight: 900, color: palette.text }}>{level}</span>
      </div>
    </div>
  );
};
