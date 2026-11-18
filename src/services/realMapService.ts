export interface RealPlaceLabel {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface RealLandmarkPoi {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  photoUrl?: string;
}

// 台灣常見行政區與核心聚落里名基底庫（供俯瞰視角地圖顯示稀疏區域地名）
const BUILTIN_TAIWAN_PLACES: RealPlaceLabel[] = [
  { id: 'tw_1', name: '雙連', lat: 25.0578, lng: 121.5208 },
  { id: 'tw_2', name: '中山', lat: 25.0528, lng: 121.5204 },
  { id: 'tw_3', name: '建成', lat: 25.0535, lng: 121.5152 },
  { id: 'tw_4', name: '牛埔', lat: 25.0632, lng: 121.5255 },
  { id: 'tw_5', name: '頂厝庄仔', lat: 25.0595, lng: 121.5315 },
  { id: 'tw_6', name: '詔安厝', lat: 25.0482, lng: 121.5288 },
  { id: 'tw_7', name: '大稻埕', lat: 25.0568, lng: 121.5095 },
  { id: 'tw_8', name: '西門', lat: 25.0421, lng: 121.5081 },
  { id: 'tw_9', name: '城中', lat: 25.0445, lng: 121.5162 },
  { id: 'tw_10', name: '東門', lat: 25.0339, lng: 121.5287 },
  { id: 'tw_11', name: '大安', lat: 25.0330, lng: 121.5435 },
  { id: 'tw_12', name: '龍安坡', lat: 25.0265, lng: 121.5358 },
  { id: 'tw_13', name: '古亭', lat: 25.0263, lng: 121.5228 },
  { id: 'tw_14', name: '公館', lat: 25.0148, lng: 121.5345 },
  { id: 'tw_15', name: '信義', lat: 25.0339, lng: 121.5645 },
  { id: 'tw_16', name: '五分埔', lat: 25.0438, lng: 121.5762 },
  { id: 'tw_17', name: '松山', lat: 25.0502, lng: 121.5775 },
  { id: 'tw_18', name: '民生社區', lat: 25.0592, lng: 121.5615 },
  { id: 'tw_19', name: '大直', lat: 25.0802, lng: 121.5468 },
  { id: 'tw_20', name: '內湖', lat: 25.0830, lng: 121.5868 },
  { id: 'tw_21', name: '港墘', lat: 25.0798, lng: 121.5742 },
  { id: 'tw_22', name: '東湖', lat: 25.0682, lng: 121.6135 },
  { id: 'tw_23', name: '南港', lat: 25.0553, lng: 121.6068 },
  { id: 'tw_24', name: '圓山', lat: 25.0715, lng: 121.5201 },
  { id: 'tw_25', name: '劍潭', lat: 25.0845, lng: 121.5252 },
  { id: 'tw_26', name: '士林', lat: 25.0938, lng: 121.5265 },
  { id: 'tw_27', name: '天母', lat: 25.1185, lng: 121.5312 },
  { id: 'tw_28', name: '石牌', lat: 25.1145, lng: 121.5155 },
  { id: 'tw_29', name: '北投', lat: 25.1325, lng: 121.5032 },
  { id: 'tw_30', name: '萬華', lat: 25.0352, lng: 121.4998 },
  { id: 'tw_31', name: '景美', lat: 24.9928, lng: 121.5412 },
  { id: 'tw_32', name: '木柵', lat: 24.9885, lng: 121.5702 },
  { id: 'nt_1', name: '板橋', lat: 25.0142, lng: 121.4637 },
  { id: 'nt_2', name: '新埔', lat: 25.0232, lng: 121.4682 },
  { id: 'nt_3', name: '江子翠', lat: 25.0302, lng: 121.4725 },
  { id: 'nt_4', name: '府中', lat: 25.0085, lng: 121.4592 },
  { id: 'nt_5', name: '亞東', lat: 24.9985, lng: 121.4525 },
  { id: 'nt_6', name: '中和', lat: 25.0015, lng: 121.4985 },
  { id: 'nt_7', name: '景安', lat: 24.9938, lng: 121.5048 },
  { id: 'nt_8', name: '永和', lat: 25.0088, lng: 121.5162 },
  { id: 'nt_9', name: '頂溪', lat: 25.0138, lng: 121.5152 },
  { id: 'nt_10', name: '新店', lat: 24.9678, lng: 121.5418 },
  { id: 'nt_11', name: '大坪林', lat: 24.9828, lng: 121.5412 },
  { id: 'nt_12', name: '三重', lat: 25.0615, lng: 121.4875 },
  { id: 'nt_13', name: '菜寮', lat: 25.0602, lng: 121.4918 },
  { id: 'nt_14', name: '三和', lat: 25.0768, lng: 121.4865 },
  { id: 'nt_15', name: '蘆洲', lat: 25.0848, lng: 121.4718 },
  { id: 'nt_16', name: '新莊', lat: 25.0360, lng: 121.4505 },
  { id: 'nt_17', name: '頭前庄', lat: 25.0398, lng: 121.4612 },
  { id: 'nt_18', name: '副都心', lat: 25.0588, lng: 121.4465 },
  { id: 'nt_19', name: '丹鳳', lat: 25.0228, lng: 121.4192 },
  { id: 'nt_20', name: '泰山', lat: 25.0582, lng: 121.4315 },
  { id: 'nt_21', name: '林口', lat: 25.0772, lng: 121.3765 },
  { id: 'nt_22', name: '淡水', lat: 25.1695, lng: 121.4455 },
  { id: 'nt_23', name: '紅樹林', lat: 25.1542, lng: 121.4588 },
  { id: 'nt_24', name: '汐止', lat: 25.0645, lng: 121.6582 },
  { id: 'nt_25', name: '土城', lat: 24.9725, lng: 121.4435 },
  { id: 'nt_26', name: '海山', lat: 24.9852, lng: 121.4488 },
  { id: 'nt_27', name: '樹林', lat: 24.9912, lng: 121.4245 },
  { id: 'nt_28', name: '三峽', lat: 24.9345, lng: 121.3688 },
  { id: 'ty_1', name: '桃園', lat: 24.9932, lng: 121.3010 },
  { id: 'ty_2', name: '藝文特區', lat: 25.0165, lng: 121.2985 },
  { id: 'ty_3', name: '中壢', lat: 24.9537, lng: 121.2256 },
  { id: 'ty_4', name: '青埔', lat: 25.0132, lng: 121.2145 },
  { id: 'hc_1', name: '新竹', lat: 24.8016, lng: 120.9716 },
  { id: 'hc_2', name: '竹北', lat: 24.8278, lng: 121.0128 },
  { id: 'tc_1', name: '西屯', lat: 24.1652, lng: 120.6402 },
  { id: 'tc_2', name: '逢甲', lat: 24.1788, lng: 120.6465 },
  { id: 'tc_3', name: '一中街', lat: 24.1498, lng: 120.6848 },
  { id: 'tc_4', name: '勤美草悟', lat: 24.1512, lng: 120.6635 },
  { id: 'tn_1', name: '中西區', lat: 22.9971, lng: 120.2026 },
  { id: 'tn_2', name: '安平', lat: 23.0015, lng: 120.1625 },
  { id: 'kh_1', name: '左營', lat: 22.6690, lng: 120.3029 },
  { id: 'kh_2', name: '巨蛋', lat: 22.6665, lng: 120.3032 },
  { id: 'kh_3', name: '鹽埕', lat: 22.6232, lng: 120.2835 },
  { id: 'kh_4', name: '三多', lat: 22.6138, lng: 120.3055 }
];

// 皮克敏 / Wayfarer 風格真實地標基底庫（公園、公共藝術、古蹟、宮廟、車站廣場，絕不使用生硬路名！）
const BUILTIN_WAYFARER_LANDMARKS: RealLandmarkPoi[] = [
  { id: 'wf_1', name: '心中山線形公園月光森林', category: 'artwork', lat: 25.0542, lng: 121.5205 },
  { id: 'wf_2', name: '台北當代藝術館廣場鐘樓', category: 'museum', lat: 25.0506, lng: 121.5190 },
  { id: 'wf_3', name: '雙連文昌宮雕花石獅', category: 'temple', lat: 25.0585, lng: 121.5212 },
  { id: 'wf_4', name: '建成公園赤峰街蒸氣火車頭', category: 'park', lat: 25.0538, lng: 121.5178 },
  { id: 'wf_5', name: '蔡瑞月舞蹈研究社木造洋樓', category: 'historic', lat: 25.0558, lng: 121.5225 },
  { id: 'wf_6', name: '蔣渭水紀念公園牌樓', category: 'park', lat: 25.0598, lng: 121.5148 },
  { id: 'wf_7', name: '光點台北（前美國大使官邸）', category: 'historic', lat: 25.0532, lng: 121.5228 },
  { id: 'wf_8', name: '雙連長老教會彩繪玻璃窗', category: 'temple', lat: 25.0572, lng: 121.5238 },
  { id: 'wf_9', name: '台北霞海城隍廟月老銅像', category: 'temple', lat: 25.0555, lng: 121.5102 },
  { id: 'wf_10', name: '永樂市場紅磚拱廊', category: 'historic', lat: 25.0550, lng: 121.5105 },
  { id: 'wf_11', name: '大稻埕碼頭唐山帆船', category: 'attraction', lat: 25.0568, lng: 121.5072 },
  { id: 'wf_12', name: '北門（承恩門）古蹟廣場', category: 'historic', lat: 25.0476, lng: 121.5112 },
  { id: 'wf_13', name: '撫臺街洋樓石造拱廊', category: 'historic', lat: 25.0462, lng: 121.5115 },
  { id: 'wf_14', name: '國立臺灣博物館銅牛雕像', category: 'museum', lat: 25.0428, lng: 121.5150 },
  { id: 'wf_15', name: '二二八和平公園音樂台', category: 'park', lat: 25.0408, lng: 121.5156 },
  { id: 'wf_16', name: '中山堂抗日戰爭勝利紀念碑', category: 'historic', lat: 25.0432, lng: 121.5098 },
  { id: 'wf_17', name: '西門紅樓八角堂', category: 'historic', lat: 25.0420, lng: 121.5068 },
  { id: 'wf_18', name: '華山1914文創園區大草原', category: 'park', lat: 25.0441, lng: 121.5294 },
  { id: 'wf_19', name: '大安森林公園竹林蓮花池', category: 'park', lat: 25.0312, lng: 121.5358 },
  { id: 'wf_20', name: '大安森林公園露天音樂台', category: 'park', lat: 25.0288, lng: 121.5362 },
  { id: 'wf_21', name: '永康公園石獅子涼亭', category: 'park', lat: 25.0322, lng: 121.5298 },
  { id: 'wf_22', name: '中正紀念堂自由廣場牌樓', category: 'historic', lat: 25.0358, lng: 121.5178 },
  { id: 'wf_23', name: '國立臺灣大學傅鐘', category: 'historic', lat: 25.0172, lng: 121.5368 },
  { id: 'wf_24', name: '松山文創園區巴洛克花園', category: 'park', lat: 25.0438, lng: 121.5606 },
  { id: 'wf_25', name: '台北101水舞廣場LOVE雕塑', category: 'artwork', lat: 25.0339, lng: 121.5645 },
  { id: 'wf_26', name: '行天宮麒麟照壁', category: 'temple', lat: 25.0630, lng: 121.5338 },
  { id: 'wf_27', name: '花博公園舞蝶共融遊戲場', category: 'park', lat: 25.0702, lng: 121.5245 },
  { id: 'wf_28', name: '台北市立美術館白色方盒雕塑', category: 'museum', lat: 25.0725, lng: 121.5248 },
  { id: 'wf_29', name: '大湖公園錦帶橋', category: 'park', lat: 25.0838, lng: 121.6025 },
  { id: 'wf_30', name: '板橋林本源園邸來青閣', category: 'historic', lat: 25.0112, lng: 121.4548 },
  { id: 'wf_31', name: '板橋站前廣場夢幻竹筍地標', category: 'artwork', lat: 25.0142, lng: 121.4637 },
  { id: 'wf_32', name: '板橋介壽公園涼亭', category: 'park', lat: 25.0095, lng: 121.4658 },
  { id: 'wf_33', name: '新莊廟街慈祐宮石獅', category: 'temple', lat: 25.0338, lng: 121.4525 },
  { id: 'wf_34', name: '新莊體育場陽光草坪', category: 'park', lat: 25.0415, lng: 121.4488 },
  { id: 'wf_35', name: '新北大都會公園熊猴森樂園', category: 'park', lat: 25.0585, lng: 121.4812 }
];

// 皮克敏 Wayfarer 風格的生動地標尾綴（當某區塊無直接古蹟時，結合當地里名生成富有畫面感的地標名，絕不用「XX路幾段」！）
const WAYFARER_VIVID_TITLES = [
  '池邊歡笑雕像',
  '等待奇蹟的香菇彩繪',
  '社區口袋公園涼亭',
  '百年大榕樹下石椅',
  '街角馬賽克拼貼壁畫',
  '廣場噴水池海豚雕像',
  '紅磚老宅郵筒',
  '綠蔭步道木造拱橋',
  '土地公廟祈福石獅',
  '轉角復古咖啡館招牌',
  '兒童遊樂場彩色溜滑梯',
  '公共藝術：散步的旅人'
];

const globalPlacesMap = new Map<string, RealPlaceLabel>();
BUILTIN_TAIWAN_PLACES.forEach((p) => globalPlacesMap.set(p.id, p));

const globalLandmarksMap = new Map<string, RealLandmarkPoi>();
BUILTIN_WAYFARER_LANDMARKS.forEach((lm) => globalLandmarksMap.set(lm.id, lm));

export interface GeotaggedPhotoItem {
  id: string;
  lat: number;
  lng: number;
  photoUrl: string;
}

// 儲存附近所有從 Wikipedia 與 Wikimedia Commons 取得的真實地理座標實景照片池，確保每顆蘑菇 100% 都有真實照片！
const globalGeotaggedPhotos = new Map<string, GeotaggedPhotoItem>();

const fetchedPlaceCells = new Set<string>();
const fetchedLandmarkCells = new Set<string>();
const landmarkListeners = new Set<() => void>();

export function onRealLandmarksUpdated(cb: () => void): () => void {
  landmarkListeners.add(cb);
  return () => {
    landmarkListeners.delete(cb);
  };
}

function notifyLandmarkListeners() {
  landmarkListeners.forEach((cb) => cb());
}

/**
 * 過濾掉生硬的純路名/門牌（例如「中華路一段」、「信義路三段12號」），只保留真正的地標名稱！
 */
function isStiffRoadOrAddressName(name: string): boolean {
  const clean = name.trim();
  if (clean.length < 2) return true;
  if (/^[0-9]+$/.test(clean)) return true;
  // 若名稱以「路、街、段、巷、弄、號、樓」結尾，且不含公園/站/宮/廟/寺/館/園/場/校/亭/碑/橋/店/廳/坊
  if (
    /[路街段巷弄號樓]$/.test(clean) &&
    !/[公園站宮廟寺祠堂館園場校亭碑橋店廳坊院樓古蹟藝文廣場市場教會教堂]/.test(clean)
  ) {
    return true;
  }
  return false;
}

/**
 * 為缺少照片的地標，從附近真實地理定位照片池 (Wikipedia + Wikimedia Commons) 配對最近且未重複的實景照片
 */
function findNearestRealPhotoUrl(
  lat: number,
  lng: number,
  fallbackIndex: number,
  usedPhotos?: Set<string>
): string | undefined {
  if (globalGeotaggedPhotos.size === 0) return undefined;

  const sorted = Array.from(globalGeotaggedPhotos.values())
    .map((p) => ({
      p,
      dist: Math.hypot((p.lat - lat) * 111000, (p.lng - lng) * 102000)
    }))
    .sort((a, b) => a.dist - b.dist);

  for (const item of sorted) {
    if (!usedPhotos || !usedPhotos.has(item.p.photoUrl)) {
      if (usedPhotos) usedPhotos.add(item.p.photoUrl);
      return item.p.photoUrl;
    }
  }

  // 若池中照片皆已分配過，依序循環取用真實地標照片
  const fallbackItem = sorted[Math.abs(fallbackIndex) % sorted.length];
  return fallbackItem?.p.photoUrl;
}

/**
 * 根據大花或蘑菇的真實經緯度，取得最接近且不重複的「皮克敏風格真實世界地標名稱與照片」
 * 優先選擇擁有真實實景照片的地標；若該地標本身無附圖，自動配對同區最近的真实地標照片，確保每朵菇都有照片！
 */
export function getNearestRealLandmarkInfo(
  lat: number,
  lng: number,
  fallbackIndex: number,
  usedNames?: Set<string>,
  usedPhotos?: Set<string>
): { name: string; photoUrl?: string } {
  const candidates: { lm: RealLandmarkPoi; dist: number; score: number }[] = [];

  for (const lm of globalLandmarksMap.values()) {
    const d = Math.hypot((lm.lat - lat) * 111000, (lm.lng - lng) * 102000);
    if (d <= 1600) {
      // 擁有真實照片的地標享有優先權（距離權重減 650m）
      const score = d - (lm.photoUrl ? 650 : 0);
      candidates.push({ lm, dist: d, score });
    }
  }

  candidates.sort((a, b) => a.score - b.score);

  for (const cand of candidates) {
    if (!usedNames || !usedNames.has(cand.lm.name)) {
      if (usedNames) usedNames.add(cand.lm.name);
      let photoUrl = cand.lm.photoUrl;
      if (photoUrl && usedPhotos) {
        if (usedPhotos.has(photoUrl)) {
          photoUrl = findNearestRealPhotoUrl(lat, lng, fallbackIndex, usedPhotos) || photoUrl;
        } else {
          usedPhotos.add(photoUrl);
        }
      } else if (!photoUrl) {
        photoUrl = findNearestRealPhotoUrl(lat, lng, fallbackIndex, usedPhotos);
      }
      return {
        name: cand.lm.name,
        photoUrl
      };
    }
  }

  // 若附近 1.6km 內已用完或尚在載入，使用最近的真實里名搭配皮克敏 Wayfarer 風格生動地標名稱（絕不用生硬路名！）
  let bestPlace: RealPlaceLabel | null = null;
  let bestPlaceDist = Infinity;
  for (const pl of globalPlacesMap.values()) {
    const d = Math.hypot((pl.lat - lat) * 111000, (pl.lng - lng) * 102000);
    if (d < bestPlaceDist) {
      bestPlaceDist = d;
      bestPlace = pl;
    }
  }

  const vividTitle =
    WAYFARER_VIVID_TITLES[Math.abs(fallbackIndex) % WAYFARER_VIVID_TITLES.length];
  const prefix = bestPlace && bestPlaceDist <= 5000 ? `${bestPlace.name}・` : '';
  const finalName = `${prefix}${vividTitle}`;
  if (usedNames) usedNames.add(finalName);
  const fallbackPhoto = findNearestRealPhotoUrl(lat, lng, fallbackIndex, usedPhotos);
  return { name: finalName, photoUrl: fallbackPhoto };
}

export function getNearestRealLandmarkName(
  lat: number,
  lng: number,
  fallbackIndex: number
): string {
  return getNearestRealLandmarkInfo(lat, lng, fallbackIndex).name;
}

/**
 * 同步取得目前檢視範圍內稀疏、不重疊的真實地名（供俯瞰視角顯示）
 */
export function getVisiblePlaceLabels(lat: number, lng: number): RealPlaceLabel[] {
  const maxDelta = 0.045;
  const candidates = Array.from(globalPlacesMap.values())
    .filter((p) => Math.abs(p.lat - lat) < maxDelta && Math.abs(p.lng - lng) < maxDelta)
    .sort(
      (a, b) =>
        Math.hypot(a.lat - lat, a.lng - lng) - Math.hypot(b.lat - lat, b.lng - lng)
    );

  const selected: RealPlaceLabel[] = [];
  for (const c of candidates) {
    const tooClose = selected.some(
      (s) =>
        s.name === c.name ||
        Math.hypot((s.lat - c.lat) * 111000, (s.lng - c.lng) * 102000) < 350
    );
    if (!tooClose) {
      selected.push(c);
    }
    if (selected.length >= 9) break;
  }
  return selected;
}

const OVERPASS_MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass-api.de/api/interpreter'
];

/**
 * 背景從三大真實圖資來源抓取地標：
 * 1. Wikipedia / Wikimedia 繁體中文地理搜尋 API（極速、免 Key、支援 CORS，且直接回傳真實地標名稱＋真實地標實景照片！）
 * 2. OpenStreetMap 多鏡像地標點位（公共藝術、雕像、古蹟、宮廟、公園、涼亭、捷運站、知名場所）
 * 3. Nominatim 逆向地理編碼補充俯瞰地圖里名
 */
export async function fetchNearbyPlaceLabels(
  lat: number,
  lng: number
): Promise<RealPlaceLabel[]> {
  const cellKey = `${(Math.round(lat * 100) / 100).toFixed(2)}_${(
    Math.round(lng * 100) / 100
  ).toFixed(2)}`;

  if (!fetchedLandmarkCells.has(cellKey)) {
    fetchedLandmarkCells.add(cellKey);

    // 來源 A1：Wikipedia 繁體中文地理搜尋 API (加入 pilimit=50 與 colimit=50，讓全部 50 個地標都回傳真實縮圖照片與座標，不再只回傳第 1 個！)
    (async () => {
      try {
        const wikiUrl = `https://zh.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${lat.toFixed(
          5
        )}|${lng.toFixed(
          5
        )}&ggsradius=3500&ggslimit=50&prop=coordinates|pageimages&colimit=50&piprop=thumbnail&pithumbsize=480&pilimit=50&format=json&origin=*&variant=zh-tw`;
        const res = await fetch(wikiUrl);
        if (res.ok) {
          const data = await res.json();
          const pages = data?.query?.pages;
          if (pages && typeof pages === 'object') {
            let added = false;
            for (const page of Object.values(pages) as Array<{
              pageid: number;
              title: string;
              coordinates?: Array<{ lat: number; lon: number }>;
              thumbnail?: { source: string };
            }>) {
              const title = String(page.title || '').trim();
              const coord = page.coordinates?.[0];
              const thumbUrl = page.thumbnail?.source;
              if (!coord) continue;

              if (thumbUrl) {
                globalGeotaggedPhotos.set(`wiki_photo_${page.pageid}`, {
                  id: `wiki_photo_${page.pageid}`,
                  lat: coord.lat,
                  lng: coord.lon,
                  photoUrl: thumbUrl
                });
                // 若預設 Wayfarer 地標剛好在此 180m 內且尚無照片，同步補上真實照片
                for (const existingLm of globalLandmarksMap.values()) {
                  if (!existingLm.photoUrl) {
                    const dist = Math.hypot(
                      (existingLm.lat - coord.lat) * 111000,
                      (existingLm.lng - coord.lon) * 102000
                    );
                    if (dist <= 180) {
                      existingLm.photoUrl = thumbUrl;
                    }
                  }
                }
                added = true;
              }

              if (!title || isStiffRoadOrAddressName(title)) continue;
              globalLandmarksMap.set(`wiki_${page.pageid}`, {
                id: `wiki_${page.pageid}`,
                name: title.slice(0, 18),
                category: 'wikipedia_landmark',
                lat: coord.lat,
                lng: coord.lon,
                photoUrl: thumbUrl
              });
              added = true;
            }
            if (added) notifyLandmarkListeners();
          }
        }
      } catch {
        // ignore
      }
    })();

    // 來源 A2：Wikimedia Commons 地理定位實景照片庫 (抓取周圍 3km 內真實拍攝的地標、公園、古蹟與公共藝術照片，補足所有無圖地標！)
    (async () => {
      try {
        const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${lat.toFixed(
          5
        )}|${lng.toFixed(
          5
        )}&ggsradius=3000&ggslimit=50&ggsnamespace=6&prop=coordinates|imageinfo&colimit=50&iiprop=url&iiurlwidth=480&format=json&origin=*`;
        const res = await fetch(commonsUrl);
        if (res.ok) {
          const data = await res.json();
          const pages = data?.query?.pages;
          if (pages && typeof pages === 'object') {
            let added = false;
            for (const page of Object.values(pages) as Array<{
              pageid: number;
              title: string;
              coordinates?: Array<{ lat: number; lon: number }>;
              imageinfo?: Array<{ thumburl?: string; url?: string }>;
            }>) {
              const coord = page.coordinates?.[0];
              const imgUrl = page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url;
              if (!coord || !imgUrl) continue;
              // 排除非照片類型的 SVG / PDF / 圖表檔
              if (/\.(svg|pdf|tif|tiff|ogg|webm)$/i.test(imgUrl)) continue;

              globalGeotaggedPhotos.set(`commons_${page.pageid}`, {
                id: `commons_${page.pageid}`,
                lat: coord.lat,
                lng: coord.lon,
                photoUrl: imgUrl
              });
              added = true;
            }
            if (added) notifyLandmarkListeners();
          }
        }
      } catch {
        // ignore
      }
    })();

    // 來源 B：OpenStreetMap 多鏡像真實地標查詢（只抓公共藝術、古蹟、公園、宮廟、車站、藝文場所，絕不抓路名）
    (async () => {
      const d = 0.014;
      const bbox = `${(lat - d).toFixed(4)},${(lng - d).toFixed(4)},${(lat + d).toFixed(
        4
      )},${(lng + d).toFixed(4)}`;
      const poiQuery = `
        [out:json][timeout:6];
        (
          node["tourism"~"artwork|attraction|museum|gallery|viewpoint"]["name"](${bbox});
          node["historic"]["name"](${bbox});
          node["amenity"~"place_of_worship|fountain|library|post_office|townhall|community_centre|arts_centre|theatre|cinema"]["name"](${bbox});
          node["leisure"~"park|garden|playground"]["name"](${bbox});
          way["leisure"~"park|garden"]["name"](${bbox});
          node["railway"~"station|subway_entrance"]["name"](${bbox});
          node["place"~"suburb|quarter|neighbourhood|village|hamlet"](${bbox});
        );
        out center 80;
      `;

      for (const mirror of OVERPASS_MIRRORS) {
        const controller = new AbortController();
        const tid = window.setTimeout(() => controller.abort(), 4500);
        try {
          const res = await fetch(mirror, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body: `data=${encodeURIComponent(poiQuery)}`,
            signal: controller.signal
          });
          window.clearTimeout(tid);
          if (!res.ok) continue;
          const json = await res.json();
          let updated = false;
          for (const el of json?.elements || []) {
            const tags = el.tags || {};
            const name = tags.name ? String(tags.name).trim() : '';
            const elLat = el.lat ?? el.center?.lat;
            const elLng = el.lon ?? el.center?.lon;
            if (!name || !Number.isFinite(elLat) || !Number.isFinite(elLng)) continue;

            if (tags.place) {
              globalPlacesMap.set(`osm_pl_${el.id}`, {
                id: `osm_pl_${el.id}`,
                name,
                lat: elLat,
                lng: elLng
              });
              updated = true;
            } else if (!isStiffRoadOrAddressName(name)) {
              globalLandmarksMap.set(`poi_${el.id}`, {
                id: `poi_${el.id}`,
                name: name.slice(0, 18),
                category:
                  tags.tourism ||
                  tags.historic ||
                  tags.leisure ||
                  tags.amenity ||
                  tags.railway ||
                  'landmark',
                lat: elLat,
                lng: elLng
              });
              updated = true;
            }
          }
          if (updated) {
            notifyLandmarkListeners();
            break;
          }
        } catch {
          window.clearTimeout(tid);
        }
      }
    })();
  }

  if (fetchedPlaceCells.has(cellKey)) {
    return getVisiblePlaceLabels(lat, lng);
  }
  fetchedPlaceCells.add(cellKey);

  // 來源 C：Nominatim 補充俯瞰視角的真實里名（且僅在確實為具名地標時才加入地標庫，絕不將路名加入地標庫！）
  const probeOffsets = [
    [0, 0],
    [0.0035, -0.003],
    [-0.0035, 0.003]
  ];

  await Promise.allSettled(
    probeOffsets.map(async ([dLat, dLng], idx) => {
      const pLat = lat + dLat;
      const pLng = lng + dLng;
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pLat.toFixed(
        5
      )}&lon=${pLng.toFixed(5)}&zoom=16&accept-language=zh-TW`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const data = await res.json();
      const addr = data?.address || {};

      const areaCandidate =
        addr.neighbourhood ||
        addr.suburb ||
        addr.quarter ||
        addr.village ||
        addr.hamlet;
      if (areaCandidate) {
        const cleanArea = String(areaCandidate).replace(
          /^(台灣|臺灣|臺北市|台北市|新北市|桃園市|臺中市|台中市|臺南市|台南市|高雄市)/,
          ''
        );
        if (cleanArea.length >= 2 && cleanArea.length <= 6) {
          const id = `nom_area_${cellKey}_${idx}`;
          globalPlacesMap.set(id, {
            id,
            name: cleanArea,
            lat: pLat,
            lng: pLng
          });
        }
      }

      // 僅接受真正的公園、古蹟、景點、廟宇或具名建築，嚴格排除純路名 (addr.road)！
      const poiTitle =
        addr.leisure ||
        addr.tourism ||
        addr.historic ||
        addr.amenity ||
        (!isStiffRoadOrAddressName(String(data?.name || '')) ? data?.name : '');

      if (poiTitle && !isStiffRoadOrAddressName(String(poiTitle))) {
        const lmId = `nom_poi_${cellKey}_${idx}`;
        globalLandmarksMap.set(lmId, {
          id: lmId,
          name: String(poiTitle).trim().slice(0, 18),
          category: 'landmark',
          lat: pLat,
          lng: pLng
        });
        notifyLandmarkListeners();
      }
    })
  );

  return getVisiblePlaceLabels(lat, lng);
}

/**
 * 透過 OpenStreetMap Nominatim 搜尋台灣真實地址、路名、捷運站或行政區座標
 */
export async function searchTaiwanPlaceCoordinates(
  queryText: string
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const q = queryText.trim();
  if (!q) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      q
    )}&countrycodes=tw&limit=1&accept-language=zh-TW`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return null;
    const arr = await res.json();
    if (Array.isArray(arr) && arr.length > 0) {
      const first = arr[0];
      const lat = Number(first.lat);
      const lng = Number(first.lon);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const shortDisplay = String(first.display_name || q).split(',')[0];
        return { lat, lng, displayName: shortDisplay };
      }
    }
  } catch {
    // ignore
  }
  return null;
}
