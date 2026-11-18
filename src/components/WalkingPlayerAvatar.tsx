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
