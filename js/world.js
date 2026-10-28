'use strict';
// 清河村 — 地圖資料與程序化繪製（地面、樹木、道具、建築羽化）
// 南邊（y > WORLD_H0）是後來往南延伸的村口空地，保衛戰的戰棋就在這裡打
// 東邊（x > 2560）是後來往東加大的林地：王宅藏在林子深處，只有一條小徑通到農田那頭
// 北邊（y < VN）是後來往北加大的山坡：客棧與武器鋪之間的石階往上走，就是清河村的祠堂
// 村子原本的座標都寫成「原值 + VN」
const VN = 700;
const WORLD = { W: 3460, H: 2100 + VN }, WORLD_H0 = 1760 + VN;
const ASSET = 'assets/buildings/';

// ---------- 亂數與雜訊 ----------
function rng(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2(x, y) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) { return vnoise(x, y) * 0.6 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.1; }

// ---------- 清河與木橋 ----------
const RIVER_HW = 68;
function riverY(x) { return 1470 + VN + 45 * Math.sin(x / 310) + 18 * Math.sin(x / 97 + 1); }
const BRIDGE = (() => {
  const x0 = 1255, x1 = 1345;
  let lo = Infinity, hi = -Infinity;
  for (let x = x0; x <= x1; x += 5) { const y = riverY(x); lo = Math.min(lo, y); hi = Math.max(hi, y); }
  return { x0, x1, y0: Math.floor(lo - RIVER_HW - 22), y1: Math.ceil(hi + RIVER_HW + 22) };
})();
function onBridge(x, y) { return x > BRIDGE.x0 && x < BRIDGE.x1 && y > BRIDGE.y0 && y < BRIDGE.y1; }
function isWater(x, y) { return Math.abs(y - riverY(x)) < RIVER_HW + 6 && !onBridge(x, y); }

// ---------- 建築（座標皆為圖片內相對座標） ----------
// cutout: 去背的建築圖，整張當成一個前後排序的物件；否則是帶背景的圖，需羽化融入地面
// feather: [上, 右, 下, 左] 羽化寬度；poly: 遮擋輪廓；base: 牆腳 y（前後排序用）
// solid: 碰撞矩形；door: 門口（進屋點）；lights: 夜間燈火
const BUILDINGS = [
  { id: 'inn', name: '清河客棧', img: '客棧.png', cutout: true, x: 948, y: 150, w: 483, h: 417, base: 345,
    solid: [[20, 175, 470, 300], [0, 265, 148, 360], [214, 200, 470, 342], [236, 345, 330, 417], [326, 305, 470, 402]],
    door: [182, 352], lights: [[45, 210], [150, 252], [210, 272], [372, 322]] },
  { id: 'weapon', name: '鐵峰武器鋪', img: '武器店.png', cutout: true, x: 1730, y: 115, w: 495, h: 429, base: 355,
    solid: [[20, 150, 480, 325], [0, 235, 180, 372], [240, 350, 345, 429], [340, 225, 495, 412]],
    door: [212, 362], lights: [[236, 282], [192, 302]] },
  { id: 'armor', name: '錦甲防具行', img: '防具店.png', cutout: true, x: 1685, y: 575, w: 486, h: 402, base: 340,
    solid: [[30, 150, 480, 318], [0, 190, 192, 345], [250, 320, 345, 402], [340, 290, 486, 400]],
    door: [224, 347], lights: [[170, 232], [206, 256], [420, 292]] },
  { id: 'home', name: '吳家', img: '民宅.png', cutout: true, x: 223, y: 247, w: 495, h: 372, base: 330,
    solid: [[20, 150, 480, 318], [100, 300, 272, 372], [342, 280, 495, 368]],
    door: [295, 337], lights: [[320, 255], [426, 292]] },
  { id: 'river', name: '王宅', img: '河畔人家.png', cutout: true, x: 2898, y: 785, w: 473, h: 312, base: 225,
    solid: [[20, 90, 140, 212], [140, 90, 185, 195], [185, 90, 300, 215], [0, 172, 98, 236], [250, 110, 473, 252], [196, 222, 226, 246]],
    door: [162, 215], lights: [[45, 130], [110, 150], [198, 175]] },
];
for (const b of BUILDINGS) b.y += VN;

// 建築外觀會隨清河村的進度改變（assets/buildings/<名稱>.png，原稿在 assets/buildings/原稿/）
// door：圖上門口的位置，以「圖寬 = 500」為單位；擺放時讓這一點對齊原本的門口（doorX, doorY），室內與進門判定都不必改
// at：村子進度（民心＋繁榮的平均）達到才換上；王宅改看 wang 旗標（修繕前後）
// w：顯示寬度
const BUILDING_LOOKS = {
  inn: { w: 580, looks: [
    { file: '客棧_破舊', door: [220, 290], at: 0 }, { file: '客棧_茅瓦', door: [230, 292], at: 35 },
    { file: '客棧_旅店', door: [215, 352], at: 50 }, { file: '客棧_升級', door: [230, 338], at: 65 }] },
  weapon: { w: 560, looks: [{ file: '武器店_破舊', door: [210, 275], at: 0 }, { file: '武器店_升級', door: [232, 360], at: 50 }] },
  armor: { w: 560, looks: [{ file: '防具店_破舊', door: [312, 284], at: 0 }, { file: '防具店_升級', door: [240, 365], at: 55 }] },
  // 吳家：用民宅 A 組
  home: { w: 400, looks: [{ file: '民宅A_破舊', door: [300, 318], at: 0 }, { file: '民宅A_升級', door: [300, 318], at: 40 }] },
  // 王宅破舊版是 560×420 的原尺寸圖，寬度等於顯示寬度時直接用原圖、不縮放（look.w 可個別指定寬度）
  river: { w: 560, looks: [{ file: '王宅_破舊', door: [205, 308], wang: false }, { file: '王宅_修復_v2', door: [206, 314], wang: true }] },
};
const BLOOK_IMG = {};
const EXTRA_ART = ['祠堂', '公倉', '土地公廟'];
// true：房子照原圖大小畫，不縮放（使用者要求）
const BUILD_NATIVE = false;
// 大張的建築原圖縮小到顯示大小：一次縮到 1/4 會把細節壓糊，改成每次縮一半、連縮幾次，最後一步再縮到目標大小
function pixelScale(src, w, h) {
  let cur = src, cw = src.width, ch = src.height;
  while (cw / 2 >= w * 1.15) {
    cw = Math.round(cw / 2); ch = Math.round(ch / 2);
    const [t, tg] = canvas(cw, ch); tg.imageSmoothingQuality = 'high'; tg.drawImage(cur, 0, 0, cw, ch); cur = t;
  }
  const [c, g] = canvas(w, h); g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, w, h);
  return c;
}

// ---------- 道路與區域 ----------
// [材質 c=石板 d=泥土, 寬度, 折線]
// 通往王宅的林間小徑（路面與兩旁不長樹的範圍都用它）
const WANG_PATH = [[1910, 935], [2010, 1012], [2470, 1015], [2640, 990], [2820, 1030], [2960, 1075], [3060, 1070], [3060, 1010]];
const ROADS = [
  ['c', 64, [[1130, 505], [1180, 600], [1250, 700]]],
  ['c', 70, [[1250, 700], [1300, 850], [1300, 1300], [1300, 2100]]],
  ['d', 58, [[30, 800], [300, 800], [560, 760], [900, 720], [1050, 705]]],
  ['d', 44, [[518, 600], [540, 700], [560, 760]]],
  ['d', 48, [[1420, 660], [1700, 560], [1945, 500]]],
  ['d', 48, [[1460, 760], [1700, 880], [1910, 935]]],
  ['d', 40, [[1650, 860], [1760, 1060], [1880, 1210]]],
  ['d', 44, [[420, 1330], [700, 1305], [1000, 1320], [1300, 1320]]],
  // 通往王宅的林間小徑：從農田旁往東，彎進林子深處
  ['d', 34, WANG_PATH],
  ['d', 44, [[1300, 1310], [1550, 1292], [1700, 1292]]],
  // 往祠堂的路：廣場東北角先走一段石板路（客棧與武器鋪之間），到山腳才是石階，一路爬上祠堂前的石板廣場
  ['c', 60, [[1480, 650], [1592, 560], [1592, -240]]],
  ['c', 96, [[1470, -300], [1714, -300]]],
  // 北坡小徑：從吳家與客棧之間往上，經過山坡上的幾戶人家，接到祠堂前
  ['d', 34, [[900, 720], [800, 300], [770, 40], [300, -30]]],
  ['d', 34, [[770, 40], [1110, 10], [1560, 150]]],
];
for (const [, , pts] of ROADS) for (const p of pts) p[1] += VN;
const PLAZA = { x: 1250, y: 705 + VN, rx: 270, ry: 140 };
const FIELD = { x0: 1890, y0: 1070 + VN, x1: 2460, y1: 1345 + VN };
// 村民的房子：兩組民宅的升級前後（assets/buildings/民宅A、B_破舊／_升級.png，從 原稿/民宅AB_總表.png 切出）
// 一開始是茅屋、破瓦屋；清河村的民心與繁榮提高到 at 之後，換成修好的瓦房（village.js applyVillageHouses）
// [x, y] 房子底部中央（腳點），w 顯示寬度；w: 0 表示照原圖大小畫（民宅 B、C 是使用者給的原尺寸小圖）
const VILLAGE_HOUSES = [
  // 廣場南邊兩側：沈若蘭的藥鋪（西）、村長陳伯安家（東）；兩張都照原尺寸畫，不隨進度改變
  { x: 1040, y: 1110, w: 0, poor: '藥鋪', rich: '藥鋪', at: 999 },
  { x: 1580, y: 1270, w: 0, poor: '村長家', rich: '村長家', at: 999 },
  // 廣場西南：公倉（村子的共用倉庫，捐獻物資的地方）
  { x: 850, y: 860, w: 0, poor: '公倉', rich: '公倉', at: 999 },
  // 西邊住家（吳家一帶）
  { x: 470, y: 1000, w: 0, poor: '民宅B_破舊', rich: '民宅B_升級', at: 46 },
  // 西南河岸
  { x: 215, y: 1200, w: 0, poor: '民宅C_破舊', rich: '民宅C_升級', at: 38 },
  { x: 700, y: 1250, w: 297, poor: '民宅A_破舊', rich: '民宅A_升級', at: 62 },
  // 東北（武器鋪後方、防具行東邊）
  { x: 2580, y: 360, w: 0, poor: '民宅B_破舊', rich: '民宅B_升級', at: 50 },
  { x: 2370, y: 660, w: 297, poor: '民宅A_破舊', rich: '民宅A_升級', at: 54 },
  { x: 2330, y: 960, w: 0, poor: '民宅C_破舊', rich: '民宅C_升級', at: 70 },
  // 南田東邊的田頭：土地公廟，保佑莊稼
  { x: 2760, y: 1330, w: 0, poor: '土地公廟', rich: '土地公廟', at: 999 },
  // 北坡（祠堂下方的山坡）：守祠的人家，以及幾間沒人住的空屋（vacant）
  // 空屋門窗釘著木板；村子進度到 at，流民搬進來住，才變成有人住的房子
  { x: 1110, y: -20, w: 297, poor: '民宅A_破舊', rich: '民宅A_升級', at: 44 },
  { x: 300, y: -40, w: 297, poor: '民宅A_破舊', rich: '民宅A_破舊', at: 40, vacant: true },
  { x: 720, y: -30, w: 0, poor: '民宅C_破舊', rich: '民宅C_破舊', at: 58, vacant: true },
  { x: 2250, y: -40, w: 0, poor: '民宅B_破舊', rich: '民宅B_破舊', at: 76, vacant: true },
];
for (const h of VILLAGE_HOUSES) h.y += VN;
const VHOUSE = {};
const GATE = { x: 1300, y: 1585 + VN };
// 村中寶箱（武器鋪後方樹下）
const V_CHESTS = [{ id: 'v1', x: 2120, y: 148 + VN, gold: 0, items: [['revive', 1]] }];
const WELL = { x: 1175, y: 690 + VN };
// 祠堂：北坡最高處，坐北朝南，面對石階與整個村子（腳點）
// 石階從山腳（y STAIR_BOT）爬到山頂（y STAIR_TOP），平移前的值
const STAIR_TOP = -220, STAIR_BOT = 180;
const SHRINE = { x: 1592, y: STAIR_TOP - 110 + VN };
// 祠堂門口（祠堂.png 正殿台階在錨點右側約 60px）：在這裡按住「上」進入祠堂室內
const SHRINE_DOOR = { x: SHRINE.x + 60, y: SHRINE.y - 24 };
// 不長樹的範圍：祠堂四周、石階兩側
const SHRINE_KEEP = [[SHRINE.x, SHRINE.y - 120, 270], [SHRINE.x, SHRINE.y + 60, 170], ...[-180, -80, 20, 120, 220, 320, 420, 520].map((y) => [1592, y + VN, 80])];

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const x = ax + t * dx - px, y = ay + t * dy - py;
  return Math.sqrt(x * x + y * y);
}
// 回傳 0=無 1=泥土 2=石板；edge=到邊緣的距離
function roadAt(px, py, jitter) {
  let best = 0, edge = 99;
  for (const [type, w, pts] of ROADS) {
    for (let i = 1; i < pts.length; i++) {
      const d = segDist(px, py, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
      const e = w / 2 + jitter - d;
      if (e > 0) { const v = type === 'c' ? 2 : 1; if (v > best || (v === best && e > edge)) { best = v; edge = e; } }
    }
  }
  const pe = 1 - ((px - PLAZA.x) / PLAZA.rx) ** 2 - ((py - PLAZA.y) / PLAZA.ry) ** 2;
  if (pe + jitter * 0.01 > 0) { best = 2; edge = Math.max(edge, pe * 60); }
  return [best, edge];
}
function inYard(px, py) {
  for (const b of BUILDINGS) {
    const cx = b.x + b.w / 2, cy = b.y + b.base;
    if (((px - cx) / (b.w / 2 + 10)) ** 2 + ((py - cy) / 55) ** 2 < 1) return true;
  }
  return false;
}

// ---------- 地面生成 ----------
const MAT = { GRASS: 0, DIRT: 1, COBBLE: 2, WATER: 3, BANK: 4, FIELD: 5, ROCK: 6 };
// 共用材質配色：寫入 out[1..3]
function colWater(out, t, px, py, hb) {
  out[1] = 30 + t * 26; out[2] = 74 + t * 40; out[3] = 98 + t * 34;
  if (t > 0.9 && hb > 0.45) { out[1] = 128; out[2] = 166; out[3] = 162; }
  else if (((py + ((px / 16) | 0) * 3) % 11) === 0 && hb > 0.55) { out[1] += 22; out[2] += 26; out[3] += 24; }
}
function colBank(out, cx, cy) {
  const s = hash2(cx >> 2, cy >> 1);
  out[1] = 92 + s * 34; out[2] = 84 + s * 28; out[3] = 66 + s * 22;
  if (((cx + (cy >> 1)) & 3) === 0) { out[1] -= 20; out[2] -= 18; out[3] -= 14; }
}
function colCobble(out, px, py, edge) {
  const row = Math.floor(py / 8), off = (row & 1) * 7;
  const col = Math.floor((px + off) / 14), lx = (px + off) % 14, ly = py % 8;
  if (lx < 2 || ly < 2) { out[1] = 96; out[2] = 86; out[3] = 68; }
  else {
    const s = 0.84 + hash2(col, row) * 0.3;
    out[1] = 154 * s; out[2] = 141 * s; out[3] = 114 * s;
    if (ly < 4 && lx < 6) { out[1] += 14; out[2] += 13; out[3] += 10; }
  }
  if (edge < 4) { out[1] = out[1] * 0.9 + 18; out[2] = out[2] * 0.9 + 12; out[3] *= 0.9; }
}
function colDirt(out, n, h, hb, edge, isRoad) {
  out[1] = 168 + n * 32; out[2] = 130 + n * 26; out[3] = 80 + n * 18;
  if (h > 0.975) { out[1] = 136; out[2] = 116; out[3] = 86; }
  else if (h < 0.03) { out[1] -= 22; out[2] -= 20; out[3] -= 14; }
  if (isRoad && edge < 5 && hb > 0.5) { out[1] -= 30; out[2] -= 18; out[3] -= 20; }
}
// tone: 0 = 村莊草地，負值 = 較暗的林地
function colGrass(out, px, py, n, hb, tone = 0) {
  const t = n * 0.75 + vnoise(px / 37, py / 37) * 0.25;
  out[1] = 68 + t * 54 + tone * 18; out[2] = 88 + t * 50 + tone * 14; out[3] = 38 + t * 22 + tone * 6;
  if (hb > 0.92) { out[1] += 20; out[2] += 18; out[3] += 8; }
  else if (hb < 0.07) { out[1] -= 16; out[2] -= 16; out[3] -= 8; }
  // 秋意：零星枯黃
  const au = vnoise(px / 140 + 50, py / 140) - 0.62;
  if (au > 0) { const k = Math.min(1, au * 4) * (hb > 0.35 ? 1 : 0.4); out[1] += 26 * k; out[2] += 10 * k; out[3] -= 4 * k; }
}
// 以 2px 為一格計算材質與顏色，再放大成整張地面
function buildGround(W, H, pixel) {
  const CW = W / 2, CH = H / 2;
  const small = document.createElement('canvas'); small.width = CW; small.height = CH;
  const sg = small.getContext('2d');
  const id = sg.createImageData(CW, CH), d = id.data;
  const mat = new Uint8Array(CW * CH), out = [0, 0, 0, 0];
  for (let cy = 0; cy < CH; cy++) {
    const py = cy * 2 + 1;
    for (let cx = 0; cx < CW; cx++) {
      const px = cx * 2 + 1, k = cy * CW + cx;
      pixel(out, px, py, cx, cy, fbm(px / 90, py / 90), hash2(cx, cy), hash2(cx >> 1, cy >> 1));
      mat[k] = out[0];
      const o = k * 4; d[o] = out[1]; d[o + 1] = out[2]; d[o + 2] = out[3]; d[o + 3] = 255;
    }
  }
  sg.putImageData(id, 0, 0);
  const big = document.createElement('canvas'); big.width = W; big.height = H;
  const bg = big.getContext('2d'); bg.imageSmoothingEnabled = false;
  bg.drawImage(small, 0, 0, W, H);
  return { canvas: big, ctx: bg, mat, CW, CH };
}
// ---------- 地面材質貼圖（assets/tiles/） ----------
// 貼在程式繪製的底色上（保留陰影、秋色斑塊與路緣），兩種方向交錯以減少重複感
const TILES = {};
const TILE_USE = [
  // [材質, 主貼圖, 交錯貼圖（null 表示不交錯）, 透明度]
  [MAT.DIRT, '泥土', '泥土', 0.95],
  [MAT.COBBLE, '石板路', null, 0.97], // 磚縫要對齊，不做交錯層
  [MAT.GRASS, '草地', '草地', 0.9],
];
function boxBlur(src, CW, CH, R) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length), n = 2 * R + 1;
  for (let y = 0; y < CH; y++) { let acc = 0; for (let x = -R; x <= R; x++) acc += src[y * CW + Math.min(CW - 1, Math.max(0, x))];
    for (let x = 0; x < CW; x++) { tmp[y * CW + x] = acc / n; acc += src[y * CW + Math.min(CW - 1, x + R + 1)] - src[y * CW + Math.max(0, x - R)]; } }
  for (let x = 0; x < CW; x++) { let acc = 0; for (let y = -R; y <= R; y++) acc += tmp[Math.min(CH - 1, Math.max(0, y)) * CW + x];
    for (let y = 0; y < CH; y++) { out[y * CW + x] = acc / n; acc += tmp[Math.min(CH - 1, y + R + 1) * CW + x] - tmp[Math.max(0, y - R) * CW + x]; } }
  return out;
}
// 決定每一格貼哪種材質：草地與路面交界處用雜訊混出一團團不規則的邊，不再是一條直線
function textureMap(mat, CW, CH) {
  const f = (m) => { const a = new Float32Array(mat.length); for (let i = 0; i < mat.length; i++) a[i] = mat[i] === m ? 1 : 0; return a; };
  const grass = boxBlur(f(MAT.GRASS), CW, CH, 5), dirt = boxBlur(f(MAT.DIRT), CW, CH, 5), cob = boxBlur(f(MAT.COBBLE), CW, CH, 5);
  const tex = new Uint8Array(mat.length).fill(255);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const i = y * CW + x, m = mat[i];
    if (m !== MAT.GRASS && m !== MAT.DIRT && m !== MAT.COBBLE && m !== MAT.WATER) continue;
    if (m === MAT.WATER) { tex[i] = m; continue; }
    const road = dirt[i] + cob[i], tot = grass[i] + road;
    if (grass[i] < 0.02 || road < 0.02 || tot < 0.9) { tex[i] = m; continue; }
    const t = 0.5 + (vnoise(x / 3.2, y / 3.2) - 0.5) * 0.85 + (hash2(x, y) - 0.5) * 0.22;
    tex[i] = grass[i] / tot > t ? MAT.GRASS : cob[i] > dirt[i] ? MAT.COBBLE : MAT.DIRT;
  }
  return tex;
}
function applyTiles(info, W, H) {
  const { mat, CW, CH } = info, g = info.ctx;
  const tex = textureMap(mat, CW, CH);
  // 交錯用的雜訊遮罩
  const [nz, ng] = canvas(CW >> 3, CH >> 3), nd = ng.createImageData(nz.width, nz.height);
  for (let y = 0; y < nz.height; y++) for (let x = 0; x < nz.width; x++) nd.data[(y * nz.width + x) * 4 + 3] = vnoise(x / 9, y / 9) > 0.55 ? 255 : 0;
  ng.putImageData(nd, 0, 0);
  for (const [m, main, alt, alpha] of TILE_USE) {
    if (!TILES[main]) continue;
    const [mk, mg] = canvas(CW, CH), md = mg.createImageData(CW, CH);
    for (let i = 0; i < tex.length; i++) if (tex[i] === m) md.data[i * 4 + 3] = 255;
    mg.putImageData(md, 0, 0);
    if (m === MAT.GRASS) {
      // 草邊在路面上的淡淡陰影（往下偏移）
      const [sh, sg] = canvas(W, H);
      sg.filter = 'blur(2px)'; sg.drawImage(mk, 0, 3, W, H); sg.filter = 'none';
      sg.globalCompositeOperation = 'source-in'; sg.fillStyle = 'rgba(48,32,14,.28)'; sg.fillRect(0, 0, W, H);
      g.drawImage(sh, 0, 0);
    }
    const [lay, lg] = canvas(W, H);
    lg.fillStyle = lg.createPattern(TILES[main], 'repeat'); lg.fillRect(0, 0, W, H);
    // 交錯層：翻轉＋位移的貼圖，只出現在雜訊遮罩的區塊
    if (alt) {
      const [alt2, ag] = canvas(W, H), [ft, fg] = canvas(TILES[alt].width, TILES[alt].height);
      fg.translate(ft.width, 0); fg.scale(-1, 1); fg.drawImage(TILES[alt], 0, 0);
      ag.translate(23, 37); ag.fillStyle = ag.createPattern(ft, 'repeat'); ag.fillRect(-23, -37, W, H); ag.setTransform(1, 0, 0, 1, 0, 0);
      ag.globalCompositeOperation = 'destination-in'; ag.imageSmoothingEnabled = true; ag.drawImage(nz, 0, 0, W, H);
      lg.drawImage(alt2, 0, 0);
    }
    lg.globalCompositeOperation = 'destination-in'; lg.drawImage(mk, 0, 0, W, H);
    g.globalAlpha = alpha; g.drawImage(lay, 0, 0); g.globalAlpha = 1;
  }
  placeDecals(g, tex, CW, CH);
}
// ---------- 水面點綴 ----------
// flow(x) 回傳河道中線的 y；hw 為半寬
function addWaterFx(G, R, W, flow, hw, skip, nRipple, nLeaf) {
  const rip = (DECALS.水面波紋 || []).filter(Boolean), leaf = (DECALS.水面落葉 || []).filter(Boolean);
  G.waterFx = { flow, hw, W, ripples: [], leaves: [] };
  for (let i = 0, k = 0; i < nRipple * 8 && k < nRipple && rip.length; i++) {
    const x = R() * W, y = flow(x) + (R() - 0.5) * hw * 1.3;
    if (skip(x, y)) continue;
    G.waterFx.ripples.push({ img: rip[(R() * rip.length) | 0], x, y, p: R() * 6.28, sp: 0.6 + R() * 0.8 }); k++;
  }
  for (let i = 0; i < nLeaf && leaf.length; i++)
    G.waterFx.leaves.push({ img: leaf[(R() * leaf.length) | 0], x: R() * W, off: (R() - 0.5) * hw * 1.2, v: 10 + R() * 14, p: R() * 6.28, rot: R() * 6.28 });
}

// ---------- 地面貼片（assets/decals/） ----------
// 草叢邊：蓋住草地與路面的交界；石板邊：石板路的破損邊緣；路面：路上的雜草、碎石、落葉、泥斑
const DECAL_SET = { 草叢邊: 12, 石板邊: 13, 路面: 24, 水面波紋: 8, 水面落葉: 3 };
const DECALS = {};
const ROAD_STAIN = [14, 18, 19, 23, 24]; // 泥土斑塊（放在石板上像刮痕，目前只用在泥土路）
function placeDecals(g, tex, CW, CH) {
  const list = (k) => (DECALS[k] || []).filter(Boolean);
  const grass = list('草叢邊'), stone = list('石板邊'), road = list('路面');
  if (!grass.length) return;
  const isRoad = (m) => m === MAT.DIRT || m === MAT.COBBLE;
  const used = new Set(), cell = (x, y, s) => ((x / s) | 0) + ',' + ((y / s) | 0);
  const take = (x, y, s) => { const k = cell(x, y, s); if (used.has(k)) return false; used.add(k); return true; };
  const draw = (img, x, y, flip) => {
    g.save(); g.translate(Math.round(x), Math.round(y)); if (flip) g.scale(-1, 1);
    g.drawImage(img, -img.width / 2, -img.height / 2); g.restore();
  };
  for (let y = 2; y < CH - 2; y++) for (let x = 2; x < CW - 2; x++) {
    const i = y * CW + x, m = tex[i], hsh = hash2(x * 13, y * 7);
    if (m === MAT.GRASS) {
      // 草地邊緣：下、左、右任一側是路面
      // 找出路面在哪一側，貼片往草地那側退一點，只蓋住交界線
      const dn = isRoad(tex[i + CW * 2]), up = isRoad(tex[i - CW * 2]), lf = isRoad(tex[i - 2]), rt = isRoad(tex[i + 2]);
      if (!(dn || up || lf || rt) || hsh > 0.22 || !take(x * 2, y * 2, 34)) continue;
      const d = grass[(hash2(x, y * 3) * grass.length) | 0];
      const ox = lf ? d.width * 0.3 : rt ? -d.width * 0.3 : 0, oy = dn ? -d.height * 0.3 : up ? d.height * 0.3 : 0;
      draw(d, x * 2 + ox, y * 2 + oy, hash2(y, x) < 0.5);
    } else if (m === MAT.COBBLE) {
      const toOther = [i + CW * 3, i - CW * 3, i - 3, i + 3].some((j) => tex[j] === MAT.GRASS || tex[j] === MAT.DIRT);
      if (toOther && stone.length && hsh < 0.18 && take(x * 2 + 5000, y * 2, 70)) draw(stone[(hash2(x * 5, y) * stone.length) | 0], x * 2, y * 2, hash2(x, y) < 0.5);
    } else if (m === MAT.DIRT && road.length && hsh < 0.0025) {
      const pool = road;
      draw(pool[(hash2(x * 3, y * 11) * pool.length) | 0], x * 2, y * 2, hsh < 0.002);
    }
  }
}
function villagePixel(out, px, py, cx, cy, n, h, hb) {
  const dv = Math.abs(py - riverY(px));
  if (dv < RIVER_HW) { out[0] = MAT.WATER; colWater(out, dv / RIVER_HW, px, py, hb); return; }
  if (dv < RIVER_HW + 10) { out[0] = MAT.BANK; colBank(out, cx, cy); return; }
  const [road, edge] = roadAt(px, py, (n - 0.5) * 16);
  if (road === 2) { out[0] = MAT.COBBLE; colCobble(out, px, py, edge); }
  else if (road === 1 || inYard(px, py)) { out[0] = MAT.DIRT; colDirt(out, n, h, hb, edge, road === 1); }
  else if (px > FIELD.x0 && px < FIELD.x1 && py > FIELD.y0 && py < FIELD.y1) {
    out[0] = MAT.FIELD;
    const rp = (py - FIELD.y0) % 24;
    if (rp < 10) { out[1] = 104; out[2] = 76; out[3] = 46; } else { out[1] = 128; out[2] = 96; out[3] = 58; }
    if (h > 0.9) { out[1] += 12; out[2] += 10; out[3] += 6; }
  } else { out[0] = MAT.GRASS; colGrass(out, px, py, n, hb); }
}
function matAt(G, x, y) {
  const cx = (x / 2) | 0, cy = (y / 2) | 0, gi = G.groundInfo;
  if (cx < 0 || cy < 0 || cx >= gi.CW || cy >= gi.CH) return -1;
  return gi.mat[cy * gi.CW + cx];
}

// ---------- 小工具 ----------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; }
function poly(g, pts, fill) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fillStyle = fill; g.fill(); }

// ---------- 花草裝飾素材（assets/decor/） ----------
// [寬, 高, 腳點 x, 腳點 y]；圖片在 boot() 載入到 DECOR
const DECOR_META = {
  綠樹: [170, 170, 84, 167], 銀杏樹: [179, 172, 89, 169], 楓樹: [174, 170, 90, 167],
  灌木: [93, 65, 47, 62], 樹籬: [134, 75, 67, 72], 草叢: [70, 46, 35, 43],
  花草地: [86, 61, 43, 40], 野花叢: [91, 49, 45, 34], 碎石: [54, 27, 27, 18],
  石堆: [118, 72, 59, 66], 岩石: [77, 59, 38, 54], 大岩石: [105, 82, 52, 76],
};
const DECOR = {}, decorCache = {};
const DECOR_TREES = ['綠樹', '銀杏樹', '楓樹'];
// variant：1 左右翻轉、2 深色（林地）、4 縮小
function decorSprite(name, variant = 0) {
  const key = name + variant; if (decorCache[key]) return decorCache[key];
  const [w0, h0, ax0, ay0] = DECOR_META[name], s = variant & 4 ? 0.82 : 1, w = Math.round(w0 * s), h = Math.round(h0 * s);
  const [c, g] = canvas(w, h);
  g.imageSmoothingEnabled = true;
  if (variant & 2) g.filter = 'brightness(.78) saturate(.85) hue-rotate(-8deg)';
  if (variant & 1) { g.translate(w, 0); g.scale(-1, 1); }
  g.drawImage(DECOR[name], 0, 0, w, h);
  const ax = (variant & 1 ? w0 - ax0 : ax0) * s, tree = DECOR_TREES.includes(name);
  const rock = name.includes('石');
  return (decorCache[key] = { img: c, ax, ay: ay0 * s, cr: tree ? 11 * s : rock ? w * 0.34 : 0, shadow: tree ? w * 0.3 : w * 0.4, rock, h });
}
// 依舊的樹種代號挑選素材
function decorTree(kind, R) {
  const v = (R() < 0.5 ? 1 : 0) | (R() < 0.35 ? 4 : 0);
  if (kind === 'bush') return decorSprite(R() < 0.55 ? '灌木' : R() < 0.65 ? '草叢' : '樹籬', v & 5);
  if (kind === 'bushA') return decorSprite(R() < 0.5 ? '草叢' : '灌木', (v & 5) | 2);
  const name = kind === 'autumn' ? '銀杏樹' : kind === 'maple' ? '楓樹' : '綠樹';
  return decorSprite(name, v | (kind === 'pine' ? 2 : 0));
}
// 把平面的花草、碎石直接印在地面上
function stampDecor(gctx, matAt, G, R, W, H, n) {
  const names = ['花草地', '花草地', '野花叢', '碎石', '草叢'];
  for (let i = 0, k = 0; i < n * 6 && k < n; i++) {
    const x = R() * W, y = R() * H; if (matAt(G, x, y) !== MAT.GRASS || matAt(G, x + 30, y) !== MAT.GRASS || matAt(G, x - 30, y) !== MAT.GRASS) continue;
    const d = decorSprite(names[(R() * names.length) | 0], (R() < 0.5 ? 1 : 0) | (R() < 0.4 ? 4 : 0));
    gctx.drawImage(d.img, Math.round(x - d.ax), Math.round(y - d.ay)); k++;
  }
}

// ---------- 道具 ----------
// 村口牌樓素材（assets/props/村口牌樓.png，tools/remove_checker.js 去背）；以下座標為素材原尺寸
const GATE_ART = { s: 0.24, cx: 722, foot: 840, fade: 790, pillarDx: 357, tree: [1305, 700], lanterns: [[293, 470], [1160, 470]] };
function makeGate() {
  const i = PROPS.村口牌樓, s = GATE_ART.s, [c, g] = canvas(Math.round(i.width * s), Math.round(i.height * s));
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(i, 0, 0, c.width, c.height);
  // 柱腳以下（素材自帶的石板路與草地）往下漸淡，接上村裡的石板路
  const f0 = GATE_ART.fade * s, gr = g.createLinearGradient(0, f0, 0, c.height);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = gr; g.fillRect(0, f0, c.width, c.height - f0);
  return { img: c, ax: Math.round(GATE_ART.cx * s), ay: Math.round(GATE_ART.foot * s) };
}
// 牌樓素材座標 → 世界座標
function gateAt(x, y) { return [GATE.x + Math.round((x - GATE_ART.cx) * GATE_ART.s), GATE.y + Math.round((y - GATE_ART.foot) * GATE_ART.s)]; }
// 水井、石燈籠素材（assets/props/），boot() 載入到 PROPS
const PROPS = {};
function makeBoat() { const i = PROPS.小船; return { img: i, ax: i.width / 2, ay: i.height - 6 }; }
function makeWell() { const i = PROPS.水井; return { img: i, ax: i.width / 2, ay: i.height - 14 }; }
function makeLantern() { const i = PROPS.石燈籠; return { img: i, ax: i.width / 2 + 2, ay: i.height - 10 }; }
function makeSign(text) {
  const [c, g] = canvas(78, 80);
  g.fillStyle = '#00000038'; g.beginPath(); g.ellipse(39, 76, 14, 4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#4a3220'; g.fillRect(35, 26, 8, 50);
  g.fillStyle = '#3e2a18'; g.fillRect(2, 8, 74, 26); g.fillStyle = '#9a7448'; g.fillRect(4, 10, 70, 22);
  g.fillStyle = '#b48a58'; g.fillRect(4, 10, 70, 3);
  g.fillStyle = '#2a1c10'; g.font = 'bold 12px "Noto Serif TC","PMingLiU",serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 39, 22);
  return { img: c, ax: 39, ay: 76 };
}
// 路牌素材（assets/props/路牌_*.png）：縮到與 makeSign 相近的高度，錨點在柱腳
function makeSignArt(name) {
  const i = PROPS['路牌_' + name], s = 105 / i.height, [c, g] = canvas(Math.round(i.width * s), 105);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(i, 0, 0, c.width, c.height);
  return { img: c, ax: c.width / 2, ay: c.height - 2 };
}
// 農田素材（assets/farm/，tools/cut_farm.js 切出），boot() 載入到 FARM；原圖較大，一律縮到 FARM_S 倍
const FARM = {}, FARM_S = 0.55;
function farmScaled(name) {
  const i = FARM[name], [c, g] = canvas(Math.round(i.width * FARM_S), Math.round(i.height * FARM_S));
  g.imageSmoothingQuality = 'high'; g.drawImage(i, 0, 0, c.width, c.height); return c;
}
// 以縮放後的圖樣鋪滿 (w, h)；ox, oy 為圖樣起點偏移，讓分段畫出的圍籬能接續
function farmPattern(name, w, h, ox = 0, oy = 0) {
  const [c, g] = canvas(w, h);
  g.imageSmoothingQuality = 'high'; g.translate(-ox, -oy); g.scale(FARM_S, FARM_S);
  g.fillStyle = g.createPattern(FARM[name], 'repeat'); g.fillRect(0, 0, (w + ox) / FARM_S + 1, (h + oy) / FARM_S + 1);
  return c;
}
function makeFarmProp(name, footY) { const c = farmScaled(name); return { img: c, ax: c.width / 2, ay: Math.round(footY * FARM_S) }; }
function makeScarecrow() { return makeFarmProp('稻草人', 150); }
// 橫向圍籬：柱腳約在素材第 82 列
const FENCE_H_FOOT = Math.round(82 * FARM_S);
function fenceH(len) { return farmPattern('圍籬_橫', len, Math.round(100 * FARM_S)); }

// ---------- 建築羽化 ----------
function featherBuilding(b, img) {
  const [c, g] = canvas(b.w, b.h);
  g.drawImage(img, 0, 0, b.w, b.h);
  g.globalCompositeOperation = 'destination-out';
  const [ft, fr, fb, fl] = b.feather;
  const band = (x0, y0, x1, y1, rx, ry, rw, rh) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.45, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
  };
  band(0, 0, 0, ft, 0, 0, b.w, ft);
  band(0, b.h, 0, b.h - fb, 0, b.h - fb, b.w, fb);
  band(0, 0, fl, 0, 0, 0, fl, b.h);
  band(b.w, 0, b.w - fr, 0, b.w - fr, 0, fr, b.h);
  // 邊緣像素溶解，避免直線接縫
  const R = rng(b.x * 7 + b.y);
  for (let y = 0; y < b.h; y += 3) for (let x = 0; x < b.w; x += 3) {
    const e = Math.min(x / fl, (b.w - x) / fr, y / ft, (b.h - y) / fb);
    if (e < 1.15 && R() > e * 0.9) g.fillRect(x, y, 3, 3);
  }
  g.globalCompositeOperation = 'source-over';
  const [o, og] = canvas(b.w, b.h);
  og.beginPath(); b.poly.forEach(([x, y], i) => i ? og.lineTo(x, y) : og.moveTo(x, y)); og.closePath(); og.clip();
  og.drawImage(c, 0, 0);
  return { full: c, occluder: o };
}

// ---------- 組合整個村莊 ----------
function buildWorld(buildingImgs) {
  const info = buildGround(WORLD.W, WORLD.H, villagePixel);
  applyTiles(info, WORLD.W, WORLD.H);
  const G = { id: 'village', name: '清河村', W: WORLD.W, H: WORLD.H, water: isWater, ground: info.canvas, groundInfo: info, sprites: [], solids: [], circles: [], lights: [], shimmers: [], buildings: [] };
  const gctx = info.ctx;
  const R = rng(20251024);
  const shadow = (x, y, rx, ry, a = 0.32) => { gctx.fillStyle = `rgba(22,30,12,${a})`; gctx.beginPath(); gctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); gctx.fill(); };
  const addSprite = (s, x, y) => { G.sprites.push({ img: s.img, x, y, ax: s.ax, ay: s.ay }); };

  // 田地作物：綠苗、金穗每 190px 交替，用素材圖樣鋪滿
  for (let x = FIELD.x0, k = 0; x < FIELD.x1; x += 190, k++) {
    const w = Math.min(190, FIELD.x1 - x);
    gctx.drawImage(farmPattern(k % 2 ? '作物_金' : '作物_綠', w, FIELD.y1 - FIELD.y0), x, FIELD.y0);
  }
  // 花草點綴
  const flowerCols = ['#f2ead0', '#f0d060', '#e88a9a', '#b090d8', '#f6f6f6'];
  for (let i = 0; i < 900; i++) {
    const x = R() * WORLD.W, y = R() * WORLD_H0;
    if (matAt(G, x, y) !== MAT.GRASS) continue;
    if (i % 5 === 0) {
      gctx.fillStyle = flowerCols[(R() * flowerCols.length) | 0];
      for (let k = 0; k < 4; k++) gctx.fillRect(Math.round(x + (R() - 0.5) * 14), Math.round(y + (R() - 0.5) * 8), 2, 2);
    } else {
      gctx.fillStyle = R() > 0.5 ? '#3a4c1e' : '#8ea24a';
      gctx.fillRect(x | 0, y | 0, 2, 4); gctx.fillRect((x | 0) + 3, (y | 0) + 1, 2, 3); gctx.fillRect((x | 0) - 3, (y | 0) + 2, 2, 2);
    }
  }
  stampDecor(gctx, matAt, G, R, WORLD.W, WORLD_H0, 170);
  // 河岸蘆葦
  for (let x = 40; x < WORLD.W; x += 9) {
    for (const side of [-1, 1]) {
      if (hash2(x, side + 5) < 0.55) continue;
      if (x > BRIDGE.x0 - 30 && x < BRIDGE.x1 + 30) continue;
      const y = riverY(x) + side * (RIVER_HW + 4);
      const hgt = 8 + hash2(x, 3) * 12;
      gctx.fillStyle = '#4b5f26'; gctx.fillRect(x, y - hgt, 2, hgt);
      gctx.fillStyle = '#9aa850'; gctx.fillRect(x + 2, y - hgt * 0.7, 2, hgt * 0.7);
      if (hash2(x, 9) > 0.7) { gctx.fillStyle = '#d8c79a'; gctx.fillRect(x, y - hgt - 4, 2, 5); }
    }
  }
  // 木橋
  const { x0, x1, y0, y1 } = BRIDGE;
  gctx.fillStyle = '#1a2a3080'; gctx.fillRect(x0 - 4, y0 + 10, x1 - x0 + 8, y1 - y0);
  for (let y = y0; y < y1; y += 8) {
    gctx.fillStyle = ((y - y0) / 8) % 2 ? '#7a5530' : '#8c6438'; gctx.fillRect(x0, y, x1 - x0, 7);
    gctx.fillStyle = '#4a321c'; gctx.fillRect(x0, y + 7, x1 - x0, 1);
    gctx.fillStyle = '#a07648'; gctx.fillRect(x0 + 6 + hash2(y, 1) * 40, y + 1, 10, 1);
  }
  for (const rx of [x0, x1 - 8]) {
    gctx.fillStyle = '#3e2a17'; gctx.fillRect(rx, y0 - 6, 8, y1 - y0 + 8);
    gctx.fillStyle = '#9a7246'; gctx.fillRect(rx + 1, y0 - 6, 3, y1 - y0 + 8);
    for (let y = y0 - 8; y < y1; y += 30) { gctx.fillStyle = '#2e1f10'; gctx.fillRect(rx - 2, y, 12, 10); gctx.fillStyle = '#6b4a2a'; gctx.fillRect(rx, y, 8, 3); }
  }
  G.solids.push([x0 - 6, y0, x0 + 10, y1], [x1 - 10, y0, x1 + 6, y1]);

  // 建築
  BUILDINGS.forEach((b, i) => {
    if (b.cutout) {
      // 去背建築：地面畫柔和陰影，整張圖依牆腳前後排序
      const [sh, sg] = canvas(b.w + 60, 120);
      const gr = sg.createRadialGradient(sh.width / 2, 60, 10, sh.width / 2, 60, sh.width / 2);
      gr.addColorStop(0, 'rgba(20,26,12,.45)'); gr.addColorStop(1, 'rgba(20,26,12,0)');
      sg.fillStyle = gr; sg.scale(1, 0.24); sg.fillRect(0, 0, sh.width, 500);
      gctx.drawImage(sh, b.x - 30, b.y + b.base - 70);
      const sp = { img: buildingImgs[i], x: b.x, y: b.y + b.base, ax: 0, ay: b.base }; G.sprites.push(sp);
      if (BUILDING_LOOKS[b.id]) (G.looks || (G.looks = {}))[b.id] = { sp, solids: [], b };
    } else {
      const f = featherBuilding(b, buildingImgs[i]);
      gctx.drawImage(f.full, b.x, b.y);
      G.sprites.push({ img: f.occluder, x: b.x, y: b.y + b.base, ax: 0, ay: b.base });
    }
    for (const [l, t, r, bt] of b.solid) { const s = [b.x + l, b.y + t, b.x + r, b.y + bt]; G.solids.push(s); if (G.looks && G.looks[b.id]) G.looks[b.id].solids.push(s); }
    for (const [lx, ly] of b.lights) G.lights.push({ x: b.x + lx, y: b.y + ly, r: 120, c: '255,190,110' });
    G.buildings.push({ ...b, doorX: b.x + b.door[0], doorY: b.y + b.door[1] });
  });

  // 石階（山腳到山頂）：一階一階的陰影與亮邊，兩側石緣；山腳兩旁一對石燈籠
  const st0 = STAIR_TOP + VN, st1 = STAIR_BOT + VN;
  // 素材：assets/props/石階/（從 assets/props/原稿/石階總表.png 裁出）。長石階由下往上疊幾段，頂端接石階平台
  const SW = 170, stair = PROPS['石階/長石階'], plat = PROPS['石階/石階平台'];
  if (stair) {
    const h = Math.round(stair.height * SW / stair.width);
    for (let yb = st1; yb > st0; yb -= h - 18) gctx.drawImage(stair, 1592 - SW / 2, yb - h, SW, h);
  }
  if (plat) { const pw = 380, ph = Math.round(plat.height * pw / plat.width); gctx.drawImage(plat, 1592 - pw / 2, st0 - ph + 24, pw, ph); }
  // 山坡：石階兩側的地面較暗，越往上越暗，看起來是一道坡
  for (let y = st0; y < st1; y += 4) { const a = 0.1 + 0.14 * (st1 - y) / (st1 - st0); gctx.fillStyle = `rgba(20,28,10,${a})`; gctx.fillRect(1380, y, 176, 4); gctx.fillRect(1630, y, 176, 4); }
  G.solids.push([1592 - SW / 2, st0, 1592 - 48, st1], [1592 + 48, st0, 1592 + SW / 2, st1]);
  { const li = PROPS['石階/石燈籠'], lan2 = li ? (() => { const w = 44, h = Math.round(li.height * w / li.width), [c, g] = canvas(w, h); g.imageSmoothingQuality = 'high'; g.drawImage(li, 0, 0, w, h); return { img: c, ax: w / 2, ay: h - 4 }; })() : makeLantern();
    for (const lx of [1592 - 110, 1592 + 110]) { addSprite(lan2, lx, st1 + 24); G.circles.push([lx, st1 + 20, 14]); G.lights.push({ x: lx, y: st1 - 30, r: 140, c: '255,200,120' }); } }
  // 祠堂（assets/buildings/祠堂.png；還沒有素材時用程式畫的占位圖）
  const shrine = makeVillageShrine(); shadow(SHRINE.x, SHRINE.y - 6, shrine.img.width * 0.42, 18, 0.3); addSprite(shrine, SHRINE.x, SHRINE.y);
  G.solids.push([SHRINE.x - shrine.img.width * 0.4, SHRINE.y - shrine.img.height * 0.55, SHRINE.x + shrine.img.width * 0.4, SHRINE.y - 30]);
  G.lights.push({ x: SHRINE.x - 60, y: SHRINE.y - 70, r: 110, c: '255,170,90' }, { x: SHRINE.x + 60, y: SHRINE.y - 70, r: 110, c: '255,170,90' });
  G.buildings.push({ id: 'shrine', name: '清河祠', doorX: SHRINE_DOOR.x, doorY: SHRINE_DOOR.y });
  // 道具
  const well = makeWell(); shadow(WELL.x, WELL.y - 4, 50, 14, 0.2); addSprite(well, WELL.x, WELL.y); G.circles.push([WELL.x, WELL.y - 18, 46]);
  const gate = makeGate(), pdx = Math.round(GATE_ART.pillarDx * GATE_ART.s); addSprite(gate, GATE.x, GATE.y);
  G.circles.push([GATE.x - pdx, GATE.y - 6, 16], [GATE.x + pdx, GATE.y - 6, 16], [...gateAt(...GATE_ART.tree), 12]);
  for (const l of GATE_ART.lanterns) { const [x, y] = gateAt(...l); G.lights.push({ x, y, r: 90, c: '255,180,110' }); }
  const lan = makeLantern();
  for (const [x, y] of [[1010, 640], [1492, 640], [1010, 790], [1492, 790], [1235, 1255], [1365, 1255]].map(([x, y]) => [x, y + VN])) {
    addSprite(lan, x, y); G.circles.push([x, y - 4, 16]); G.lights.push({ x, y: y - 48, r: 150, c: '255,200,120' });
  }
  const sign = makeSignArt('西清河鎮'); addSprite(sign, 380, 760 + VN); G.circles.push([380, 756 + VN, 8]);
  const sign2 = makeSignArt('南雲山官道'); addSprite(sign2, 1385, 1345 + VN); G.circles.push([1385, 1341 + VN, 8]);
  addSprite(decorSprite('大岩石'), 70, 815 + VN); addSprite(decorSprite('石堆', 1), 120, 862 + VN); addSprite(decorSprite('岩石'), 30, 870 + VN); G.solids.push([0, 740 + VN, 140, 860 + VN]);
  // 村中寶箱
  G.chests = {};
  for (const ch of V_CHESTS) { const c = makeChest(false); G.sprites.push({ img: c.img, x: ch.x, y: ch.y, ax: c.ax, ay: c.ay }); G.chests[ch.id] = G.sprites[G.sprites.length - 1]; G.circles.push([ch.x, ch.y - 8, 16]); }
  // 王宅修繕前：在建築圖上疊一層破損（占位，程式繪製）；修好後拿掉，露出原圖
  const wb = BUILDINGS.find((b) => b.id === 'river');
  const wimg = makeWangRuin(wb, buildingImgs[BUILDINGS.indexOf(wb)]);
  G.wang = { img: wimg, broken: wimg, x: wb.x, y: wb.y + wb.base + 1, ax: 0, ay: wb.base + 1 };
  G.sprites.push(G.wang);
  const scare = makeScarecrow(); addSprite(scare, 2180, 1210 + VN); G.circles.push([2180, 1206 + VN, 10]);
  // 田邊小物
  for (const [n, foot, x, y, r] of [['草堆', 120, 2500, 1160 + VN, 26], ['水桶', 86, 2490, 1255 + VN, 12], ['木箱', 74, 2515, 1270 + VN, 14]]) {
    addSprite(makeFarmProp(n, foot), x, y); G.circles.push([x, y - 4, r]);
  }
  // 小船：停在北岸邊的水面上，水面加一圈淡淡的倒影陰影
  const boat = makeBoat(), bx = 1700, by = riverY(1700) - RIVER_HW + 56;
  gctx.fillStyle = 'rgba(10,30,40,.35)'; gctx.beginPath(); gctx.ellipse(bx, by - 8, boat.img.width * 0.52, 12, 0, 0, Math.PI * 2); gctx.fill();
  G.sprites.push({ img: boat.img, x: bx, y: by, ax: boat.ax, ay: boat.ay, bob: true });

  // 田地圍籬（西側留入口）
  const fy0 = FIELD.y0 - 10, fy1 = FIELD.y1 + 6;
  const fh = fenceH(FIELD.x1 - FIELD.x0 + 16);
  G.sprites.push({ img: fh, x: FIELD.x0 - 8, y: fy0 + 30, ax: 0, ay: FENCE_H_FOOT }, { img: fh, x: FIELD.x0 - 8, y: fy1 + 30, ax: 0, ay: FENCE_H_FOOT });
  G.solids.push([FIELD.x0, fy0 + 20, FIELD.x1 + 8, fy0 + 32], [FIELD.x0, fy1 + 20, FIELD.x1 + 8, fy1 + 32]);
  // 直向圍籬切成每段 SEG 高的小圖，各自依底邊排序遮擋；圖樣偏移接續，看起來仍是一整排
  const SEG = 24, vw = Math.round(70 * FARM_S);
  for (const [fx, gapA, gapB] of [[FIELD.x0, 1170 + VN, 1250 + VN], [FIELD.x1, -1, -1]]) {
    for (let y = fy0 + 30 + SEG; y <= fy1 + 30; y += SEG) {
      if (y > gapA && y < gapB + SEG) continue;
      G.sprites.push({ img: farmPattern('圍籬_直', vw, SEG, 0, y - fy0), x: fx, y, ax: vw / 2, ay: SEG });
    }
    if (gapA > 0) G.solids.push([fx - 4, fy0 + 20, fx + 10, gapA], [fx - 4, gapB, fx + 10, fy1 + 32]);
    else G.solids.push([fx - 4, fy0 + 20, fx + 10, fy1 + 32]);
  }

  // 樹木
  const keep = [[WANG.x, WANG.y + 120, 260], [WANG.x - 200, WANG.y + 90, 170], [WANG.x + 200, WANG.y + 90, 170], [WANG.x, WANG.y - 120, 300], [380, 1335 + VN, 60], [WELL.x, WELL.y, 120], [GATE.x, GATE.y, 140], [GATE.x + 120, GATE.y + 40, 175], [GATE.x - 120, GATE.y + 40, 130], [380, 760 + VN, 70], [2180, 1210 + VN, 60], [1385, 1345 + VN, 60], ...SHRINE_KEEP, ...V_CHESTS.map((c) => [c.x, c.y, 45])];
  for (const b of G.buildings) keep.push([b.doorX, b.doorY + 20, 95]);
  for (const h of VILLAGE_HOUSES) { const w = h.w || 400; keep.push([h.x, h.y - w * 0.3, w * 0.75]); }
  const trees = [];
  const getTree = (k) => decorTree(k, R);
  const okSpot = (x, y, minD) => {
    if (x < 10 || x > WORLD.W - 10 || y < 40 || y > WORLD.H) return false;
    if (Math.abs(y - riverY(x)) < RIVER_HW + 34) return false;
    if (roadAt(x, y, 20 + minD * 0.5)[0]) return false;
    // 樹冠往上長：樹根在王宅小徑下方 150 內，就會蓋住路面，不種
    for (let i = 1; i < WANG_PATH.length; i++) { const [ax, ay] = WANG_PATH[i - 1], [bx, by] = WANG_PATH[i]; if (segDist(x, y - 75, ax, ay, bx, by) < 90) return false; }
    if (x > FIELD.x0 - 40 && x < FIELD.x1 + 40 && y > FIELD.y0 - 30 && y < FIELD.y1 + 50) return false;
    for (const b of BUILDINGS) if (x > b.x - 30 && x < b.x + b.w + 30 && y > b.y + 10 && y < b.y + b.h + 80) return false;
    for (const [kx, ky, kr] of keep) if (Math.hypot(x - kx, y - ky) < kr) return false;
    for (const t of trees) if (Math.hypot(x - t[0], (y - t[1]) * 1.4) < minD) return false;
    return true;
  };
  for (let i = 0; i < 9000 && trees.length < 300; i++) {
    const x = R() * WORLD.W, y = 40 + R() * (WORLD_H0 - 40);
    const border = Math.min(x, WORLD.W - x, y - 40, WORLD_H0 - y);
    // 東邊的林地種得密，王宅四周才隱蔽
    const p = border < 110 ? 0.95 : x > 2560 ? 0.7 : border < 260 ? 0.35 : 0.1;
    if (R() > p || !okSpot(x, y, 92)) continue;
    const nearRiver = Math.abs(y - riverY(x)) < 210;
    const k = nearRiver && R() < 0.6 ? 'willow' : R() < 0.55 ? 'green' : R() < 0.6 ? 'autumn' : 'maple';
    trees.push([x, y, k]);
  }
  // 原本地圖南緣那排很密的邊界樹，現在橫在村口戰場中間：牌樓前方那一段拿掉
  for (let i = trees.length - 1; i >= 0; i--) { const [x, y] = trees[i]; if (y > WORLD_H0 - 160 && Math.abs(x - GATE.x) < 560) trees.splice(i, 1); }
  const R2 = rng(9911);
  for (let i = 0; i < 2600; i++) {
    const x = R2() * WORLD.W, y = WORLD_H0 - 60 + R2() * (WORLD.H - WORLD_H0 + 60), side = Math.abs(x - GATE.x);
    const p = side < 420 ? 0.03 : side < 600 ? 0.3 : 0.85;
    if (R2() > p || !okSpot(x, y, 92)) continue;
    trees.push([x, y, R2() < 0.5 ? 'green' : R2() < 0.6 ? 'autumn' : 'maple']);
  }
  for (let i = 0; i < 400; i++) {
    const x = R2() * WORLD.W, y = WORLD_H0 + R2() * (WORLD.H - WORLD_H0);
    if (matAt(G, x, y) !== MAT.GRASS) continue;
    gctx.fillStyle = i % 5 === 0 ? flowerCols[(R2() * flowerCols.length) | 0] : R2() > 0.5 ? '#3a4c1e' : '#8ea24a';
    gctx.fillRect(x | 0, y | 0, 2, i % 5 === 0 ? 2 : 4); gctx.fillRect((x | 0) + 3, (y | 0) + 1, 2, 3);
  }
  for (const [x, y, k] of trees) {
    const t = getTree(k);
    shadow(x + 4, y - 2, t.shadow, t.shadow * 0.32);
    addSprite(t, Math.round(x), Math.round(y));
    G.circles.push([x, y - 4, t.cr]);
  }
  for (let i = 0; i < 1400 && trees.length < 270; i++) {
    const x = R() * WORLD.W, y = 40 + R() * (WORLD_H0 - 40);
    if (!okSpot(x, y, 52)) continue;
    trees.push([x, y, 'bush']);
    const t = getTree(R() < 0.7 ? 'bush' : 'bushA');
    shadow(x, y - 2, t.shadow, t.shadow * 0.28, 0.25);
    addSprite(t, Math.round(x), Math.round(y));
  }

  // 水面波光
  for (let i = 0; i < 160; i++) {
    const x = R() * WORLD.W, y = riverY(x) + (R() - 0.5) * RIVER_HW * 1.6;
    if (!onBridge(x, y)) G.shimmers.push({ x, y, p: R() * 6.28, w: 6 + R() * 10 });
  }
  addWaterFx(G, R, WORLD.W, riverY, RIVER_HW, (x, y) => onBridge(x, y), 70, 14);

  // 小地圖
  const [mini, mg] = canvas(Math.round(WORLD.W / 12), Math.round(WORLD.H / 12));
  mg.imageSmoothingEnabled = true; mg.drawImage(G.ground, 0, 0, mini.width, mini.height);
  for (const [x, y, k] of trees) { mg.fillStyle = k === 'bush' ? '#3f5a2588' : k === 'green' || k === 'willow' ? '#2f4a1ccc' : '#9a6a20cc'; mg.fillRect(x / 12 - 1, y / 12 - 3, 3, 3); }
  G.mini = mini;
  return G;
}

// ---------- 祠堂、公倉（占位美術；有素材圖時改用素材） ----------
function makeVillageShrine() {
  const art = BLOOK_IMG.祠堂; if (art) return { img: art, ax: art.width / 2, ay: art.height - 8 };
  if (makeVillageShrine.c) return makeVillageShrine.c;
  const W = 420, H = 300, [c, g] = canvas(W, H);
  const r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  // 石台基與台階
  r('#6e675c', 30, 238, 360, 40); r('#8c8476', 30, 238, 360, 6); r('#57514a', 30, 272, 360, 6);
  for (let i = 0; i < 3; i++) r(i % 2 ? '#7a7366' : '#958d7e', 170 - i * 8, 278 + i * 7, 80 + i * 16, 7);
  // 牆與紅柱
  r('#b8a27e', 70, 140, 280, 100); r('#9c8664', 70, 228, 280, 12);
  for (const x of [78, 150, 256, 328]) { r('#7a2a1c', x, 128, 14, 112); r('#a8402a', x + 2, 128, 4, 112); }
  // 門與窗格
  r('#3a2414', 178, 158, 64, 82); r('#5a3a20', 182, 162, 26, 74); r('#5a3a20', 212, 162, 26, 74);
  for (const x of [96, 274]) { r('#4a3420', x, 168, 44, 40); for (let k = 0; k < 4; k++) r('#c9b088', x + 4 + k * 10, 172, 4, 32); }
  // 屋頂：兩端上翹的瓦頂
  g.fillStyle = '#3c3a3a'; g.beginPath(); g.moveTo(20, 140); g.lineTo(60, 64); g.lineTo(360, 64); g.lineTo(400, 140); g.quadraticCurveTo(210, 118, 20, 140); g.fill();
  g.fillStyle = '#55524f'; for (let x = 66; x < 356; x += 14) g.fillRect(x, 70, 6, 52);
  r('#2a2828', 54, 56, 312, 12); g.fillStyle = '#2a2828'; g.beginPath(); g.moveTo(54, 56); g.lineTo(34, 40); g.lineTo(60, 52); g.fill(); g.beginPath(); g.moveTo(366, 56); g.lineTo(386, 40); g.lineTo(360, 52); g.fill();
  // 屋頂的雜草（荒廢）
  g.fillStyle = '#5a7a30'; for (const [x, y] of [[110, 72], [180, 80], [300, 74], [240, 66]]) { g.fillRect(x, y, 3, 8); g.fillRect(x + 4, y + 2, 3, 6); }
  // 牌匾
  r('#2a1a10', 168, 98, 84, 28); r('#7a4a20', 171, 101, 78, 22);
  g.fillStyle = '#e8c870'; g.font = 'bold 16px "Noto Serif TC","PMingLiU",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('清河祠', 210, 113);
  // 香爐
  r('#4a4a44', 194, 250, 32, 18); r('#6a6a60', 190, 246, 40, 6); r('#4a4a44', 198, 238, 4, 8); r('#4a4a44', 218, 238, 4, 8);
  return (makeVillageShrine.c = { img: c, ax: W / 2, ay: 286 });
}
// 公倉：架高的木造倉房，門上掛「倉」字
function makeGranary() {
  if (makeGranary.c) return makeGranary.c;
  const W = 300, H = 240, [c, g] = canvas(W, H);
  const r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  for (const x of [40, 110, 180, 250]) r('#4a3220', x, 190, 12, 36);
  r('#6e4a2c', 30, 100, 240, 94); for (let y = 104; y < 192; y += 12) r('#5a3c22', 30, y, 240, 2);
  r('#3a2414', 120, 128, 60, 66); r('#5a3a20', 124, 132, 52, 58);
  g.fillStyle = '#7a6a3a'; g.beginPath(); g.moveTo(14, 104); g.lineTo(50, 40); g.lineTo(250, 40); g.lineTo(286, 104); g.fill();
  g.fillStyle = '#9a8a4a'; for (let x = 56; x < 246; x += 10) g.fillRect(x, 44, 4, 56);
  r('#2a1a10', 132, 106, 36, 22); g.fillStyle = '#e8c870'; g.font = 'bold 16px "Noto Serif TC","PMingLiU",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('倉', 150, 117);
  for (const [x, y] of [[44, 208], [70, 214], [232, 210]]) { r('#c8a860', x, y, 22, 16); r('#a8884a', x, y + 12, 22, 4); }
  return (makeGranary.c = { img: c, ax: W / 2, ay: 228 });
}

// ---------- 王宅破損層（占位美術）：屋頂破洞、缺瓦、門口釘木板、牆根雜草 ----------
function makeWangRuin(b, img) {
  if (makeWangRuin.img) return makeWangRuin.img;
  const [c, g] = canvas(b.w, b.h), R = rng(78);
  const px = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
  // 整棟蒙上一層灰，看起來荒廢
  g.fillStyle = 'rgba(60,50,40,.28)'; g.fillRect(0, 0, b.w, b.h); g.globalCompositeOperation = 'destination-in'; g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-over';
  // 屋頂破洞
  for (const [x, y, w, h] of [[120, 60, 34, 16], [250, 40, 28, 12], [330, 92, 40, 14], [200, 96, 22, 10], [80, 110, 26, 10]]) { px('#140e0a', x, y, w, h); px('#5a4028', x + 3, y + h - 3, w - 6, 3); }
  for (let i = 0; i < 14; i++) px('#2a2a30', 70 + R() * 320, 120 + R() * 30, 9, 4);
  // 門口交叉釘木板
  g.save(); g.translate(b.door[0], b.door[1] - 34);
  for (const a of [0.5, -0.5]) { g.save(); g.rotate(a); px('#6a4424', -30, -4, 60, 8); px('#8a5a30', -30, -4, 60, 2); g.restore(); }
  g.restore();
  // 牆根雜草、蛛網
  for (let i = 0; i < 70; i++) px(R() > 0.5 ? '#4a6a2a' : '#6a8a3a', 20 + R() * (b.w - 40), b.base - 10 + R() * 30, 2, 5 + R() * 8);
  g.font = '11px system-ui'; g.fillStyle = '#ffffff90'; g.fillText('破損（占位）', 8, b.h - 6);
  return (makeWangRuin.img = c);
}
// 依目前進度替換建築外觀；solids 原地改寫（陣列物件仍在 G.solids 裡）
function applyBuildingLooks(Gm) {
  if (!Gm.looks || !S) return;
  const prog = (S.heart + S.village.prosper) / 2;
  for (const [id, L] of Object.entries(Gm.looks)) {
    const def = BUILDING_LOOKS[id], ok = def.looks.filter((l) => (l.wang === undefined ? prog >= l.at : l.wang === !!S.flags.wang_house_repaired) && BLOOK_IMG[l.file]);
    const look = ok[ok.length - 1]; if (!look || L.cur === look) continue;
    L.cur = look;
    const src = BLOOK_IMG[look.file], w = BUILD_NATIVE ? src.width : look.w || def.w, k = w / src.width, h = Math.round(src.height * k), c = w === src.width ? src : pixelScale(src, w, h);
    const u = look.door[0] / 500 * w, v = look.door[1] / 500 * w, dx = L.b.x + L.b.door[0], dy = L.b.y + L.b.door[1];
    Object.assign(L.sp, { img: c, x: dx - u, y: dy, ax: 0, ay: v });
    // 擋住屋身、留出門口：左右兩塊＋門楣上方一塊
    const top = dy - v + h * 0.32, x0 = dx - u + w * 0.1, x1 = dx - u + w * 0.9;
    const box = [[x0, top, dx - 26, dy - 8], [dx + 26, top, x1, dy - 8], [dx - 26, top, dx + 26, dy - 44]];
    L.solids.forEach((s, i) => { const nb = box[i] || [0, 0, 0, 0]; s.splice(0, 4, ...nb); });
  }
  if (Gm.wang && Gm.looks.river && Gm.looks.river.cur) Gm.wang.img = canvas(1, 1)[0];
}
function applyWang(Gm) { if (Gm.wang) Gm.wang.img = S && S.flags.wang_house_repaired ? canvas(1, 1)[0] : Gm.wang.broken; applyBuildingLooks(Gm); }
