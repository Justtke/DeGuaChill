import { MushroomElement, MushroomSizeLabel } from '../types/game';

interface SingleMushSpec {
  cx: number;
  baseY: number;
  scale: number;
  isRoundBud?: boolean;
}

/**
 * 繪製單顆完全仿照《Pikmin Bloom》官方造型的立體蘑菇：
 * - 胖葫蘆狀（上窄下圓鼓）的米褐黃色立體菌柄 + 發光金黃色橢圓網孔 (Glowing Pores)
 * - 圓潤波浪邊緣菌傘 + 依種類配色的圓點（如白色蘑菇配粉紫圓點、紅/黃/藍/紫/灰/冰藍配白圓點、粉紅配淺粉白點）
 * - 元素蘑菇專屬外圍物質包覆（火之烈焰、水之透明水球、電之閃電電弧、毒之青紫毒霧、水晶之尖頂多面體稜柱）
 */
function renderSingleMushroomUnit(
  uid: string,
  element: MushroomElement,
  spec: SingleMushSpec,
  animateElemental = false
): string {
  const { cx, baseY, scale, isRoundBud } = spec;

  const paletteMap: Record<
    MushroomElement,
    {
      capTop: string;
      capBottom: string;
      capStroke: string;
      spotFill: string;
      spotStroke: string;
      poreGlow: string;
    }
  > = {
    red: {
      capTop: '#FF5A5F',
      capBottom: '#DC2626',
      capStroke: '#991B1B',
      spotFill: '#FFFFFF',
      spotStroke: '#FEE2E2',
      poreGlow: '#FACC15'
    },
    yellow: {
      capTop: '#FEF08A',
      capBottom: '#EAB308',
      capStroke: '#A16207',
      spotFill: '#FFFFFF',
      spotStroke: '#FEF9C3',
      poreGlow: '#FDE047'
    },
    blue: {
      capTop: '#60A5FA',
      capBottom: '#2563EB',
      capStroke: '#1E40AF',
      spotFill: '#FFFFFF',
      spotStroke: '#DBEAFE',
      poreGlow: '#FACC15'
    },
    purple: {
      capTop: '#C084FC',
      capBottom: '#7E22CE',
      capStroke: '#581C87',
      spotFill: '#FFFFFF',
      spotStroke: '#F3E8FF',
      poreGlow: '#FDE047'
    },
    white: {
      capTop: '#FFFFFF',
      capBottom: '#E2E8F0',
      capStroke: '#CBD5E1',
      spotFill: '#E879F9',
      spotStroke: '#C026D3',
      poreGlow: '#FDE047'
    },
    gray: {
      capTop: '#64748B',
      capBottom: '#334155',
      capStroke: '#1E293B',
      spotFill: '#FFFFFF',
      spotStroke: '#E2E8F0',
      poreGlow: '#FACC15'
    },
    pink: {
      capTop: '#F9A8D4',
      capBottom: '#EC4899',
      capStroke: '#BE185D',
      spotFill: '#FFF1F2',
      spotStroke: '#FBCFE8',
      poreGlow: '#FDE047'
    },
    ice: {
      capTop: '#67E8F9',
      capBottom: '#06B6D4',
      capStroke: '#0E7490',
      spotFill: '#FFFFFF',
      spotStroke: '#CFFAFE',
      poreGlow: '#FEF08A'
    },
    fire: {
      capTop: '#FF6B4A',
      capBottom: '#DC2626',
      capStroke: '#991B1B',
      spotFill: '#FFFBEB',
      spotStroke: '#FDE68A',
      poreGlow: '#FEF08A'
    },
    water: {
      capTop: '#60A5FA',
      capBottom: '#1D4ED8',
      capStroke: '#1E3A8A',
      spotFill: '#FFFFFF',
      spotStroke: '#DBEAFE',
      poreGlow: '#FDE047'
    },
    electric: {
      capTop: '#FEF9C3',
      capBottom: '#FACC15',
      capStroke: '#CA8A04',
      spotFill: '#FFFFFF',
      spotStroke: '#FEF08A',
      poreGlow: '#FEF9C3'
    },
    poison: {
      capTop: '#F8FAFC',
      capBottom: '#CBD5E1',
      capStroke: '#94A3B8',
      spotFill: '#E879F9',
      spotStroke: '#A21CAF',
      poreGlow: '#FDE047'
    },
    crystal: {
      capTop: '#64748B',
      capBottom: '#475569',
      capStroke: '#1E293B',
      spotFill: '#F1F5F9',
      spotStroke: '#CBD5E1',
      poreGlow: '#FEF08A'
    },
    bizarre: {
      // 對照圖一與圖四「輝煌蘑菇」：藍金漸層華麗傘蓋 ＋ 耀眼發光乳白金菌柄
      capTop: '#FDE047',
      capBottom: '#2563EB',
      capStroke: '#1D4ED8',
      spotFill: '#FFFFFF',
      spotStroke: '#FEF08A',
      poreGlow: '#FEF9C3'
    }
  };

  const pal = paletteMap[element] || paletteMap.red;
  const capGradId = `cap_${uid}`;
  const stemGradId = `stem_${uid}`;

  if (isRoundBud) {
    return `
      <g transform="translate(${cx}, ${baseY}) scale(${scale})">
        <defs>
          <radialGradient id="${capGradId}" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stop-color="${pal.capTop}" />
            <stop offset="100%" stop-color="${pal.capBottom}" />
          </radialGradient>
        </defs>
        <ellipse cx="0" cy="0" rx="15" ry="4.5" fill="rgba(0,0,0,0.25)" />
        <path d="M -10 -2 C -12 -10, -9 -18, 0 -18 C 9 -18, 12 -10, 10 -2 C 7 2, -7 2, -10 -2 Z" fill="#E5B869" stroke="#92400E" stroke-width="0.9" />
        <ellipse cx="0" cy="-18" rx="15" ry="13" fill="url(#${capGradId})" stroke="${pal.capStroke}" stroke-width="1" />
        <ellipse cx="0" cy="-28" rx="5.5" ry="2.2" fill="#FFFFFF" opacity="0.95" />
        <ellipse cx="-5" cy="-21" rx="3.2" ry="2.2" fill="${pal.spotFill}" opacity="0.9" />
        <ellipse cx="5.5" cy="-20" rx="2.8" ry="2" fill="${pal.spotFill}" opacity="0.9" />
        <circle cx="8" cy="-10" r="2.2" fill="#FEF08A" />
      </g>
    `;
  }

  const bodySvg = `
    <defs>
      <radialGradient id="${capGradId}" cx="42%" cy="24%" r="72%">
        <stop offset="0%" stop-color="${pal.capTop}" />
        <stop offset="100%" stop-color="${pal.capBottom}" />
      </radialGradient>
      <linearGradient id="${stemGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FEF3C7" />
        <stop offset="45%" stop-color="#E7BC74" />
        <stop offset="82%" stop-color="#C98F42" />
        <stop offset="100%" stop-color="#8C5820" />
      </linearGradient>
    </defs>

    <!-- 底部陰影 -->
    <ellipse cx="0" cy="1" rx="22" ry="5.5" fill="rgba(0,0,0,0.28)" />

    <!-- 胖葫蘆狀菌柄（上窄頸、下圓鼓肚） -->
    <path
      d="M -11.5 -31
         C -11.5 -22, -18.5 -15, -17.5 -7
         C -16.5 -1, -9.5 2.5, 0 2.5
         C 9.5 2.5, 16.5 -1, 17.5 -7
         C 18.5 -15, 11.5 -22, 11.5 -31
         Z"
      fill="url(#${stemGradId})"
      stroke="#78350F"
      stroke-width="1.1"
    />

    <!-- 菌柄上的標誌性「發光金黃網孔 (Glowing Pores)」 -->
    <ellipse cx="-6.5" cy="-23" rx="3.4" ry="4.4" transform="rotate(-8 -6.5 -23)" fill="${pal.poreGlow}" stroke="#CA8A04" stroke-width="0.8" />
    <ellipse cx="5.5" cy="-23.5" rx="3.5" ry="4.2" transform="rotate(8 5.5 -23.5)" fill="${pal.poreGlow}" stroke="#CA8A04" stroke-width="0.8" />
    <ellipse cx="0" cy="-15.5" rx="4.2" ry="3.4" fill="${pal.poreGlow}" stroke="#CA8A04" stroke-width="0.8" />
    <ellipse cx="-9.5" cy="-12.5" rx="3.2" ry="2.8" transform="rotate(-15 -9.5 -12.5)" fill="${pal.poreGlow}" stroke="#CA8A04" stroke-width="0.8" />
    <ellipse cx="9.5" cy="-12.5" rx="3.2" ry="2.8" transform="rotate(15 9.5 -12.5)" fill="${pal.poreGlow}" stroke="#CA8A04" stroke-width="0.8" />
    <circle cx="-4.5" cy="-8" r="2.3" fill="#FDE68A" opacity="0.88" />
    <circle cx="5" cy="-8" r="2.3" fill="#FDE68A" opacity="0.88" />

    <!-- 圓潤波浪邊緣菌傘 -->
    <path
      d="M -26 -30
         C -27 -46, -13.5 -54, 0 -54
         C 13.5 -54, 27 -46, 26 -30
         C 26 -26, 17.5 -25, 11.5 -27
         C 5 -25, -5 -25, -11.5 -27
         C -17.5 -25, -26 -26, -26 -30
         Z"
      fill="url(#${capGradId})"
      stroke="${pal.capStroke}"
      stroke-width="1.2"
    />

    <!-- 菌傘上的圓點 -->
    <ellipse cx="-9" cy="-42" rx="5.2" ry="3.8" transform="rotate(-18 -9 -42)" fill="${pal.spotFill}" stroke="${pal.spotStroke}" stroke-width="0.8" />
    <ellipse cx="8.5" cy="-41.5" rx="5" ry="3.8" transform="rotate(18 8.5 -41.5)" fill="${pal.spotFill}" stroke="${pal.spotStroke}" stroke-width="0.8" />
    <ellipse cx="0" cy="-49.5" rx="4.8" ry="2.6" fill="${pal.spotFill}" stroke="${pal.spotStroke}" stroke-width="0.8" />
    <ellipse cx="-18.5" cy="-34" rx="3.4" ry="2.8" transform="rotate(-28 -18.5 -34)" fill="${pal.spotFill}" stroke="${pal.spotStroke}" stroke-width="0.8" />
    <ellipse cx="18.5" cy="-34" rx="3.4" ry="2.8" transform="rotate(28 18.5 -34)" fill="${pal.spotFill}" stroke="${pal.spotStroke}" stroke-width="0.8" />
  `;

  let elementalOverlay = '';
  if (element === 'water') {
    elementalOverlay = `
      <ellipse cx="0" cy="-26" rx="30" ry="31" fill="rgba(56, 189, 248, 0.36)" stroke="#7DD3FC" stroke-width="1.6" />
      <path d="M -20 -42 C -14 -52, 4 -54, 15 -46" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.88" />
      <circle cx="-18" cy="-4" r="3" fill="#BAE6FD" opacity="0.9" />
      <circle cx="19" cy="-3" r="3.5" fill="#BAE6FD" opacity="0.9" />
    `;
  } else if (element === 'fire') {
    const fireCls = animateElemental ? ' class="mush-anim-fire"' : '';
    const embersHtml = animateElemental
      ? `
      <circle class="mush-anim-ember-1" cx="-13" cy="-36" r="2.2" fill="#FEF08A" />
      <circle class="mush-anim-ember-2" cx="11" cy="-42" r="2" fill="#FDBA74" />
      <circle class="mush-anim-ember-1" cx="2" cy="-50" r="1.8" fill="#FFFFFF" />
    `
      : '';
    elementalOverlay = `
      <g${fireCls}>
        <path
          d="M -25 2 C -29 -14, -23 -28, -17 -40 C -14 -26, -10 -22, -8 -44 C -2 -28, 2 -24, 5 -47 C 10 -26, 14 -24, 19 -40 C 25 -24, 28 -12, 24 2 Z"
          fill="rgba(249, 115, 22, 0.65)"
          stroke="#EF4444"
          stroke-width="1"
        />
        <path
          d="M -18 2 C -20 -10, -13 -20, -9 -29 C -5 -18, 0 -16, 3 -33 C 8 -18, 12 -16, 16 -26 C 19 -12, 17 -2, 15 2 Z"
          fill="rgba(253, 224, 71, 0.82)"
        />
      </g>
      ${embersHtml}
    `;
  } else if (element === 'electric') {
    const elecACls = animateElemental ? ' class="mush-anim-elec-a"' : '';
    const elecBCls = animateElemental ? ' class="mush-anim-elec-b"' : '';
    elementalOverlay = `
      <ellipse cx="0" cy="-26" rx="28" ry="28" fill="rgba(254, 240, 138, 0.30)" />
      <g${elecACls}>
        <polyline points="-28,-38 -18,-30 -24,-20 -12,-10" fill="none" stroke="#FEF08A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        <polyline points="-8,-58 0,-48 -4,-40 6,-30" fill="none" stroke="#FDE047" stroke-width="2.1" stroke-linecap="round" />
      </g>
      <g${elecBCls}>
        <polyline points="27,-42 17,-31 24,-22 13,-8" fill="none" stroke="#FFFFFF" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" />
        <polyline points="-22,-6 -13,-14 -17,-22 -6,-28" fill="none" stroke="#FEF08A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </g>
    `;
  } else if (element === 'poison') {
    const mistACls = animateElemental ? ' class="mush-anim-poison-a"' : '';
    const mistBCls = animateElemental ? ' class="mush-anim-poison-b"' : '';
    elementalOverlay = `
      <g${mistACls}>
        <circle cx="-18" cy="-36" r="11.5" fill="rgba(45, 212, 191, 0.48)" />
        <circle cx="14" cy="-10" r="11.5" fill="rgba(168, 85, 247, 0.42)" />
        <circle cx="0" cy="-46" r="10.5" fill="rgba(94, 234, 212, 0.42)" />
      </g>
      <g${mistBCls}>
        <circle cx="18" cy="-34" r="12.5" fill="rgba(45, 212, 191, 0.48)" />
        <circle cx="-12" cy="-12" r="10.5" fill="rgba(20, 184, 166, 0.50)" />
        <circle cx="-22" cy="-22" r="8.5" fill="rgba(168, 85, 247, 0.36)" />
      </g>
    `;
  } else if (element === 'crystal') {
    // 水晶菇：純粹靜態水晶包覆，不加任何動態特效
    elementalOverlay = `
      <polygon points="0,-68 -27,-36 -22,3 0,6 22,3 27,-36" fill="rgba(165, 243, 252, 0.46)" stroke="#E0F2FE" stroke-width="1.6" />
      <polygon points="0,-68 -27,-36 0,-28" fill="rgba(255, 255, 255, 0.48)" />
      <polygon points="0,-68 27,-36 0,-28" fill="rgba(56, 189, 248, 0.35)" />
      <line x1="0" y1="-28" x2="0" y2="6" stroke="#FFFFFF" stroke-width="1.4" opacity="0.88" />
    `;
  } else if (element === 'bizarre') {
    elementalOverlay = `
      <circle cx="-6" cy="-18" r="4.5" fill="#FEF08A" opacity="0.75" />
      <circle cx="10" cy="-32" r="3.2" fill="#FFFFFF" opacity="0.85" />
      <circle cx="-14" cy="-38" r="2.8" fill="#A7F3D0" opacity="0.85" />
    `;
  }

  const innerContent =
    animateElemental && element === 'water'
      ? `<g class="mush-anim-water-float">${bodySvg}${elementalOverlay}</g>`
      : `${bodySvg}${elementalOverlay}`;

  return `
    <g transform="translate(${cx}, ${baseY}) scale(${scale})">
      ${innerContent}
    </g>
  `;
}

/**
 * 地圖與探險卡片上各體型的 SVG 尺寸（小蘑菇放大約 10%，一般菇與一般色菇同尺寸）
 */
export const MUSHROOM_CARD_SVG_DIMS: Record<MushroomSizeLabel, { w: number; h: number }> = {
  小: { w: 94, h: 62 },
  一般: { w: 138, h: 86 },
  大: { w: 172, h: 110 },
  巨大: { w: 186, h: 116 }
};

/**
 * 地圖與探險卡片上的叢生蘑菇 SVG（完全對照圖一探險卡比例 ＆ 圖五俯瞰圖大/一般/小菇叢比例！）
 * - 小：尺寸嬌小（94×62），3 顆小巧幼菇
 * - 一般：中等寬大飽滿（138×86），佔探險卡片照片高度一半以上
 * - 大：更寬大高聳（172×110），6 顆巨型與中大菇叢聚，主菇明顯更寬更高
 * - 巨大：霸王特大叢（186×116），7 顆環繞
 */
export function buildAuthenticPikminMushroomSvg(
  element: MushroomElement,
  sizeLabel: MushroomSizeLabel,
  uidPrefix = 'm'
): string {
  const safeUid = `${uidPrefix}_${element}_${sizeLabel}`.replace(/[^a-zA-Z0-9_]/g, '');

  const dims = MUSHROOM_CARD_SVG_DIMS[sizeLabel];
  const svgW = dims.w;
  const svgH = dims.h;
  let vbW = 138;
  let vbH = 86;
  let clusterSpecs: SingleMushSpec[] = [];
  let groundFlowersHtml = '';

  if (sizeLabel === '小') {
    // 【小】（比原先加大 10%）：3 顆小巧幼菇
    vbW = 104;
    vbH = 72;
    clusterSpecs = [
      { cx: 52, baseY: 64, scale: 0.68 },
      { cx: 28, baseY: 67, scale: 0.48, isRoundBud: true },
      { cx: 74, baseY: 67, scale: 0.50 }
    ];
    groundFlowersHtml = `
      <circle cx="38" cy="67" r="2.2" fill="#F472B6" />
      <circle cx="64" cy="67" r="2.2" fill="#FDE047" />
    `;
  } else if (sizeLabel === '一般') {
    // 【一般】：1 顆飽滿主菇 + 4 顆副菇/圓苞（共 5 顆），佔探險卡片照片一半以上高度！
    vbW = 138;
    vbH = 86;
    clusterSpecs = [
      { cx: 30, baseY: 72, scale: 0.62 },
      { cx: 108, baseY: 72, scale: 0.62 },
      { cx: 69, baseY: 74, scale: 1.08 }, // 飽滿中大主菇
      { cx: 44, baseY: 79, scale: 0.68, isRoundBud: true },
      { cx: 94, baseY: 79, scale: 0.68, isRoundBud: true }
    ];
    groundFlowersHtml = `
      <circle cx="24" cy="78" r="2.6" fill="#60A5FA" />
      <circle cx="56" cy="80" r="2.6" fill="#FDE047" />
      <circle cx="82" cy="80" r="2.6" fill="#F472B6" />
      <circle cx="114" cy="78" r="2.6" fill="#FFFFFF" />
    `;
  } else if (sizeLabel === '大') {
    // 【大】（對照圖五右下「大 火蘑菇」）：比一般菇明顯更寬更壯更高（172×110），6 顆大蘑菇聚攏！
    vbW = 156;
    vbH = 100;
    clusterSpecs = [
      { cx: 24, baseY: 84, scale: 0.78 },
      { cx: 132, baseY: 84, scale: 0.78 },
      { cx: 50, baseY: 86, scale: 0.98 },
      { cx: 88, baseY: 88, scale: 1.42 }, // 超寬大高聳巨型主菇
      { cx: 36, baseY: 92, scale: 0.74, isRoundBud: true },
      { cx: 114, baseY: 92, scale: 0.84 }
    ];
    groundFlowersHtml = `
      <circle cx="18" cy="90" r="3" fill="#FDE047" />
      <circle cx="54" cy="94" r="3.2" fill="#FFFFFF" />
      <circle cx="78" cy="95" r="3.2" fill="#FB7185" />
      <circle cx="102" cy="94" r="3" fill="#FEF08A" />
      <circle cx="136" cy="90" r="3" fill="#60A5FA" />
    `;
  } else {
    // 【巨大】：7 顆特大霸王菇群，更寬廣雄偉！
    vbW = 166;
    vbH = 106;
    clusterSpecs = [
      { cx: 18, baseY: 88, scale: 0.82 },
      { cx: 148, baseY: 88, scale: 0.82 },
      { cx: 44, baseY: 90, scale: 1.06 },
      { cx: 122, baseY: 90, scale: 1.06 },
      { cx: 83, baseY: 92, scale: 1.54 }, // 霸王主菇
      { cx: 30, baseY: 97, scale: 0.78, isRoundBud: true },
      { cx: 136, baseY: 97, scale: 0.78, isRoundBud: true }
    ];
    groundFlowersHtml = `
      <circle cx="16" cy="95" r="3.2" fill="#F472B6" />
      <circle cx="44" cy="98" r="3.2" fill="#FACC15" />
      <circle cx="83" cy="99" r="3.6" fill="#FFFFFF" />
      <circle cx="122" cy="98" r="3.2" fill="#60A5FA" />
      <circle cx="150" cy="95" r="3.2" fill="#C084FC" />
    `;
  }

  const unitsHtml = clusterSpecs
    .map((spec, idx) => renderSingleMushroomUnit(`${safeUid}_${idx}`, element, spec))
    .join('');

  return `
    <svg width="${svgW}" height="${svgH}" viewBox="0 0 ${vbW} ${vbH}" style="overflow:visible;filter:drop-shadow(0 5px 10px rgba(0,0,0,0.36));display:block;">
      <ellipse cx="${vbW / 2}" cy="${vbH - 8}" rx="${vbW * 0.42}" ry="7.5" fill="rgba(0,0,0,0.26)" />
      ${unitsHtml}
      ${groundFlowersHtml}
    </svg>
  `;
}

/**
 * 點進蘑菇後的「全螢幕上半部照片特寫 (Detail Hero)」專用 SVG（完全對照圖三「大 火蘑菇」＆ 圖四「一般 輝煌蘑菇」！）
 * - 大 / 巨大（對照圖三「大 火蘑菇」）：超巨型主菇幾乎擋住整張地標照片（粗壯發光菌柄直頂畫面上緣）！
 * - 一般（對照圖四「一般 輝煌蘑菇」）：雙主菇站在花毯上約佔 65% 高度，後方與上方地標風景清晰可見！
 * - 小：小巧可愛的 3 顆小菇約佔 40% 高度，露出大片地標實景！
 */
export function buildDetailHeroPikminMushroomSvg(
  element: MushroomElement,
  sizeLabel: MushroomSizeLabel,
  uidPrefix = 'hero'
): string {
  const safeUid = `${uidPrefix}_${element}_${sizeLabel}`.replace(/[^a-zA-Z0-9_]/g, '');

  let specs: SingleMushSpec[] = [];

  if (sizeLabel === '小') {
    // 小蘑菇：更小巧，僅佔上半部照片下緣 ~38% 高度，背景風景大面積露出
    specs = [
      { cx: 195, baseY: 236, scale: 1.28 },
      { cx: 132, baseY: 242, scale: 0.86, isRoundBud: true },
      { cx: 258, baseY: 242, scale: 0.92 }
    ];
  } else if (sizeLabel === '一般') {
    // 一般蘑菇（對照圖四「一般 輝煌蘑菇」）：左高右中兩顆飽滿大菇，上方留出空間給地標名與背後實景
    specs = [
      { cx: 306, baseY: 228, scale: 1.12, isRoundBud: true },
      { cx: 132, baseY: 234, scale: 2.58 },
      { cx: 256, baseY: 238, scale: 2.08 }
    ];
  } else {
    // 大 / 巨大蘑菇（對照圖三「大 火蘑菇」）：龐大到幾乎擋住整張地標照片，頂端直逼畫面上緣！
    specs = [
      { cx: 42, baseY: 218, scale: 2.65 },
      { cx: 368, baseY: 222, scale: 2.05 },
      { cx: 234, baseY: 244, scale: 4.55 }, // 巨無霸主菇幾乎佔滿整張照片！
      { cx: 108, baseY: 246, scale: 2.15, isRoundBud: true }
    ];
  }

  const unitsHtml = specs
    .map((spec, idx) => renderSingleMushroomUnit(`${safeUid}_${idx}`, element, spec, true))
    .join('');

  return `
    <svg width="100%" height="100%" viewBox="0 0 390 260" preserveAspectRatio="xMidYMax slice" style="overflow:visible;filter:drop-shadow(0 8px 18px rgba(0,0,0,0.44));">
      ${unitsHtml}
    </svg>
  `;
}
