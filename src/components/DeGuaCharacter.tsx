import React from 'react';
import {
  DecorCategory,
  DeGuaVariety,
  LeafStage,
  PetalColor,
  PETAL_META,
  VARIETY_CATALOG
} from '../types/game';

interface DeGuaCharacterProps {
  variety: DeGuaVariety;
  decor: DecorCategory;
  leafStage: LeafStage;
  flowerColor: PetalColor;
  showDecor: boolean;
  size?: number;
  isBouncing?: boolean;
  onClick?: () => void;
}

export const DeGuaCharacter: React.FC<DeGuaCharacterProps> = ({
  variety,
  decor,
  leafStage,
  flowerColor,
  showDecor,
  size = 100,
  isBouncing = true,
  onClick
}) => {
  const vMeta = VARIETY_CATALOG[variety];
  const flowerHex = PETAL_META[flowerColor].hex;
  const rx = variety === 'purple' ? 46 : variety === 'white' ? 35 : 40;
  const ry = variety === 'purple' ? 40 : variety === 'white' ? 33 : 36;

  return (
    <div
      onClick={onClick}
      className={isBouncing ? 'degua-bounce' : ''}
      style={{
        width: size,
        height: size * 1.18,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        position: 'relative'
      }}
    >
      <svg viewBox="0 0 120 142" width="100%" height="100%" style={{ overflow: 'visible' }}>
        {/* 地面投影 */}
        <ellipse cx="60" cy="130" rx="32" ry="6.5" fill="rgba(0,0,0,0.16)" />

        {/* 粉紅羽翅球專屬背後小翅膀 */}
        {variety === 'winged' && (
          <g>
            <ellipse
              cx="26"
              cy="76"
              rx="18"
              ry="10"
              transform="rotate(-25 26 76)"
              fill="rgba(255,255,255,0.8)"
              stroke="#93C5FD"
              strokeWidth="2"
            />
            <ellipse
              cx="94"
              cy="76"
              rx="18"
              ry="10"
              transform="rotate(25 94 76)"
              fill="rgba(255,255,255,0.8)"
              stroke="#93C5FD"
              strokeWidth="2"
            />
          </g>
        )}

        {/* 頭頂皮克敏莖與葉子 / 花苞 / 盛開花朵 */}
        <g transform="translate(60, 36)">
          <path
            d="M 0 12 Q -3 -2 0 -16"
            stroke="#15803D"
            strokeWidth="4.2"
            strokeLinecap="round"
            fill="none"
          />

          {/* 紫心地瓜球專屬頭頂小鬚毛 (致敬紫皮克敏) */}
          {variety === 'purple' && (
            <g stroke="#581C87" strokeWidth="2.5" strokeLinecap="round">
              <line x1="-16" y1="10" x2="-24" y2="2" />
              <line x1="16" y1="10" x2="24" y2="2" />
            </g>
          )}

          {leafStage === 'bare' && (
            <circle cx="0" cy="-16" r="2.2" fill="#15803D" />
          )}

          {leafStage === 'leaf' && (
            <g transform="translate(0, -16)">
              <path
                d="M 0 0 C -16 -12 -20 5 -1 6 C 16 5 16 -12 0 0 Z"
                fill="#22C55E"
                stroke="#15803D"
                strokeWidth="2"
              />
              <line x1="0" y1="5" x2="0" y2="-6" stroke="#15803D" strokeWidth="1.5" />
            </g>
          )}

          {leafStage === 'bud' && (
            <g transform="translate(0, -21)">
              <path
                d="M 0 -11 C 7 -5, 9 4, 0 8 C -9 4, -7 -5, 0 -11 Z"
                fill={flowerHex === '#FFFFFF' ? '#F8FAFC' : flowerHex}
                stroke="#15803D"
                strokeWidth="1.8"
              />
              <path d="M -7 4 Q 0 11 7 4 Q 0 1 -7 4 Z" fill="#22C55E" stroke="#15803D" strokeWidth="1.2" />
            </g>
          )}

          {leafStage === 'flower' && (
            <g transform="translate(0, -22)" className="flower-glow">
              <circle cx="0" cy="0" r="22" fill={PETAL_META[flowerColor].glowHex} opacity="0.65" />
              <circle cx="0" cy="-10" r="7.5" fill={flowerHex} stroke="#CA8A04" strokeWidth="1.2" />
              <circle cx="9.5" cy="-3" r="7.5" fill={flowerHex} stroke="#CA8A04" strokeWidth="1.2" />
              <circle cx="6" cy="8" r="7.5" fill={flowerHex} stroke="#CA8A04" strokeWidth="1.2" />
              <circle cx="-6" cy="8" r="7.5" fill={flowerHex} stroke="#CA8A04" strokeWidth="1.2" />
              <circle cx="-9.5" cy="-3" r="7.5" fill={flowerHex} stroke="#CA8A04" strokeWidth="1.2" />
              <circle cx="0" cy="0" r="5.5" fill="#F97316" />
            </g>
          )}
        </g>

        {/* 黃金地瓜球專屬兩側大耳朵 (致敬黃皮克敏) */}
        {variety === 'yellow' && (
          <g>
            <polygon points="18,68 4,56 16,84" fill={vMeta.bodyColor} stroke={vMeta.spotColor} strokeWidth="2.5" />
            <polygon points="102,68 116,56 104,84" fill={vMeta.bodyColor} stroke={vMeta.spotColor} strokeWidth="2.5" />
          </g>
        )}

        {/* 小短腿與小手 */}
        <ellipse cx="45" cy="120" rx="6.5" ry="9" fill={vMeta.spotColor} />
        <ellipse cx="75" cy="120" rx="6.5" ry="9" fill={vMeta.spotColor} />
        <ellipse
          cx="18"
          cy="86"
          rx="8"
          ry="5.5"
          transform="rotate(-20 18 86)"
          fill={vMeta.bodyColor}
          stroke={vMeta.spotColor}
          strokeWidth="2.5"
        />
        <ellipse
          cx="102"
          cy="86"
          rx="8"
          ry="5.5"
          transform="rotate(20 102 86)"
          fill={vMeta.bodyColor}
          stroke={vMeta.spotColor}
          strokeWidth="2.5"
        />

        {/* 地瓜球本體（岩石品種為多角切面，其餘為酥脆圓球） */}
        {variety === 'rock' ? (
          <polygon
            points="32,52 60,43 88,52 102,80 90,112 60,119 30,112 18,80"
            fill={vMeta.bodyColor}
            stroke={vMeta.spotColor}
            strokeWidth="3.5"
          />
        ) : (
          <ellipse
            cx="60"
            cy="83"
            rx={rx}
            ry={ry}
            fill={vMeta.bodyColor}
            stroke={vMeta.spotColor}
            strokeWidth="3.2"
          />
        )}

        {/* 酥脆高光 */}
        <ellipse cx="43" cy="61" rx="10" ry="5.5" transform="rotate(-18 43 61)" fill="rgba(255,255,255,0.42)" />

        {/* 眼睛（白玉球為紅寶石眼、羽翅球為藍眼、其餘為大白眼黑瞳） */}
        <circle cx="45" cy="79" r="7.5" fill={variety === 'white' ? '#EF4444' : variety === 'winged' ? '#60A5FA' : '#FFFFFF'} stroke="#1F2937" strokeWidth="1.8" />
        <circle cx="75" cy="79" r="7.5" fill={variety === 'white' ? '#EF4444' : variety === 'winged' ? '#60A5FA' : '#FFFFFF'} stroke="#1F2937" strokeWidth="1.8" />
        {variety !== 'white' && (
          <>
            <circle cx="46" cy="79" r="3.8" fill="#111827" />
            <circle cx="74" cy="79" r="3.8" fill="#111827" />
          </>
        )}

        {/* 紅梅地瓜球專屬尖鼻子 (致敬紅皮克敏) */}
        {variety === 'red' && (
          <polygon points="56,82 60,95 66,84" fill="#DC2626" stroke="#991B1B" strokeWidth="1.8" />
        )}

        {/* 蝶豆花藍球專屬腮紅小嘴 (致敬藍皮克敏) */}
        {variety === 'blue' ? (
          <path d="M 53 91 L 60 88 L 67 91" stroke="#1E3A8A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M 55 88 Q 60 93 65 88" stroke="#1F2937" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        )}

        {/* 飾品 (Decor) */}
        {showDecor && (
          <g>
            {decor === 'bubble_tea' && (
              <g transform="translate(78, 38) rotate(14)">
                <rect x="-10" y="0" width="20" height="24" rx="3" fill="#FDE68A" stroke="#92400E" strokeWidth="2" />
                <line x1="-12" y1="0" x2="12" y2="0" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
                <line x1="2" y1="-10" x2="-2" y2="18" stroke="#1F2937" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="-4" cy="19" r="2.2" fill="#1F2937" />
                <circle cx="2" cy="20" r="2.2" fill="#1F2937" />
                <circle cx="6" cy="18" r="2.2" fill="#1F2937" />
              </g>
            )}
            {decor === 'convenience' && (
              <g transform="translate(60, 46)">
                <path
                  d="M -26 6 Q -24 -14 0 -14 Q 24 -14 26 6 L 16 2 L 8 8 L 0 1 L -9 8 L -17 2 Z"
                  fill="#B45309"
                  stroke="#78350F"
                  strokeWidth="2"
                />
              </g>
            )}
            {decor === 'bakery' && (
              <g transform="translate(60, 47)">
                <ellipse cx="0" cy="0" rx="28" ry="11" fill="#FBBF24" stroke="#B45309" strokeWidth="2" />
                <line x1="-16" y1="-6" x2="16" y2="6" stroke="#B45309" strokeWidth="1.5" />
                <line x1="-16" y1="6" x2="16" y2="-6" stroke="#B45309" strokeWidth="1.5" />
              </g>
            )}
            {decor === 'park' && (
              <g transform="translate(36, 48) rotate(-18)">
                <circle cx="-5" cy="-5" r="5" fill="#16A34A" />
                <circle cx="5" cy="-5" r="5" fill="#16A34A" />
                <circle cx="-5" cy="5" r="5" fill="#16A34A" />
                <circle cx="5" cy="5" r="5" fill="#16A34A" />
                <circle cx="0" cy="0" r="2.5" fill="#86EFAC" />
              </g>
            )}
            {decor === 'station' && (
              <g transform="translate(60, 45)">
                <path d="M -22 4 L 22 4 L 18 -9 L -18 -9 Z" fill="#1E3A8A" stroke="#172554" strokeWidth="2" />
                <path d="M -25 4 Q 0 10 25 4" stroke="#FACC15" strokeWidth="3" fill="none" />
                <circle cx="0" cy="-3" r="3" fill="#FACC15" />
              </g>
            )}
            {decor === 'night_market' && (
              <g>
                <line x1="16" y1="42" x2="105" y2="108" stroke="#D97706" strokeWidth="4" strokeLinecap="round" />
                <rect x="68" y="94" width="24" height="16" rx="3" fill="#FEF2F2" stroke="#EF4444" strokeWidth="2" />
                <text x="80" y="105" fontSize="9" textAnchor="middle" fill="#DC2626" fontWeight="bold">梅粉</text>
              </g>
            )}
            {decor === 'roadside' && (
              <g transform="translate(76, 94) rotate(-10)">
                <circle cx="0" cy="0" r="11" fill="#22C55E" stroke="#15803D" strokeWidth="1.8" />
                <text x="0" y="3.5" fontSize="10" textAnchor="middle" fill="#FFFFFF" fontWeight="900">P</text>
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  );
};
