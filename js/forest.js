'use strict';
// 村外森林 — 第一章開場：小蝦米在此醒來，熬過一夜；天亮後從東出口走進村西野林（第 2 章）
// 2400×1600：西南醒來 → 摸黑走一段林道（樹樁、獸骨、歪倒的路牌）→ 岔路盡頭的山泉 → 狼爪印
// → 林間黑影 → 天色漸亮 → 倒木歇腳 → 東邊出口通往村西野林（再往東是清河村）；西北山腳有舊礦坑
const FOW = 2400, FOH = 1600;
const FO_ROAD = [[120, 1460], [260, 1400], [480, 1330], [640, 1180], [600, 1010], [760, 880], [1000, 860], [1200, 960], [1380, 900], [1520, 720], [1700, 620], [1900, 560], [2100, 470], [2400, 420]];
const FO_WAKE = { x: 260, y: 1400 };
const FO_WU = { x: 2000, y: 500 };
const FO_EXIT = { x: FOW - 20, y: 420 };
// 西北的舊礦坑（入口素材的腳點）與通往它的小徑
const FO_MINE = { x: 520, y: 470 };
const FO_PATH = [[760, 880], [650, 650], [FO_MINE.x, FO_MINE.y + 20]];
// 岔路：通往山泉的小徑、一條走不通的死路
const FO_BRANCHES = [[[640, 1180], [780, 1270], [880, 1310]], [[1200, 960], [1290, 1130], [1285, 1225]]];
// 死路盡頭的荊棘牆（腳點）
const FO_THORNS = { x: 1285, y: 1235 };

// 第 1 章的事件點：狼爪印、林間黑影、聽見呼救
const FO_TRACKS = { x: 690, y: 950 }, FO_SHADOW = { x: 1110, y: 880 }, FO_CRY = { x: 1700, y: 640 };
// 黑影之後的兩個歇腳處：刻著「A.Z.」的老樹（三十年前的異鄉人阿哲留下的伏筆）、可以坐下寫筆記的倒木；呼救後半路再聽到一次
const FO_AZ = { x: 1290, y: 880 }, FO_LOG = { x: 1585, y: 590 }, FO_CRY2 = { x: 1830, y: 590 };
// 林道南側的一小塊空地（原本擺粗樹枝的位置；第 2 章不戰鬥後已拿掉樹枝，空地保留）
const FO_STICK = { x: 1650, y: 685 };
// 黑影演出時鏡頭看的位置（ch01.js 的跳躍路線以它為基準）
const LEAP_C = { x: FO_SHADOW.x + 290, y: FO_SHADOW.y - 140 };
// 路旁可砍的枯樹（伐木點）
const FO_CHOP = [[420, 1250], [860, 1190], [880, 810], [1150, 1030], [1850, 650]];
// 山泉：水從東北的岩堆間流下，在窪地積成一汪小水潭（池心）
const FO_POOL = { x: 960, y: 1330 }, FO_POOL_R = [84, 32];
const inPool = (x, y) => ((x - FO_POOL.x) / FO_POOL_R[0]) ** 2 + ((y - FO_POOL.y) / FO_POOL_R[1]) ** 2 < 1;
const FO_CLEARINGS = [[FO_POOL.x + 15, FO_POOL.y - 35, 200], [FO_WAKE.x, FO_WAKE.y, 170], [FO_WU.x, FO_WU.y + 10, 200], [FO_MINE.x, FO_MINE.y + 10, 180], [FO_SHADOW.x, FO_SHADOW.y, 120], [FO_AZ.x, FO_AZ.y, 80], [FO_LOG.x + 10, FO_LOG.y + 25, 100], [FO_STICK.x, FO_STICK.y, 70], [FO_THORNS.x, FO_THORNS.y - 60, 140], [FO_THORNS.x, FO_THORNS.y + 40, 120]];

function foRoad(px, py, jitter) {
  let edge = -1;
  for (let i = 1; i < FO_ROAD.length; i++) edge = Math.max(edge, 26 + jitter - segDist(px, py, FO_ROAD[i - 1][0], FO_ROAD[i - 1][1], FO_ROAD[i][0], FO_ROAD[i][1]));
  for (const P of [FO_PATH, ...FO_BRANCHES]) for (let i = 1; i < P.length; i++) edge = Math.max(edge, 18 + jitter * 0.6 - segDist(px, py, P[i - 1][0], P[i - 1][1], P[i][0], P[i][1]));
  return [edge > 0 ? 1 : 0, edge];
}
function foClearing(px, py) {
  let v = -9;
  for (const [x, y, r] of FO_CLEARINGS) v = Math.max(v, 1 - Math.hypot(px - x, (py - y) * 1.2) / r);
  return v;
}
// 礦坑背後的土石山：西北角整片是岩堆（地面畫成土石，上面再疊岩石素材），礦坑從山腳挖進去；>0 代表山體
const foRidgeTop = (px) => (px < 900 ? 390 + 22 * Math.sin(px / 85) : 390 - (px - 900) * 1.3);
function foRidge(px, py) {
  const top = foRidgeTop(px);
  return top - py + (fbm(px / 60 + 11, py / 60) - 0.5) * 46;
}
function forestPixel(out, px, py, cx, cy, n, h, hb) {
  const rv = foRidge(px, py);
  if (rv > 0) {
    // 土石地：黃褐土夾灰色碎石
    out[0] = MAT.ROCK;
    const v = 0.8 + n * 0.35;
    out[1] = 150 * v; out[2] = 118 * v; out[3] = 78 * v;
    if (h > 0.9) { out[1] = 112; out[2] = 106; out[3] = 96; } else if (h < 0.08) { out[1] *= 0.8; out[2] *= 0.8; out[3] *= 0.8; }
    return;
  }
  const [road, edge] = foRoad(px, py, (n - 0.5) * 12);
  const cl = foClearing(px, py);
  if (road) { out[0] = MAT.DIRT; colDirt(out, n, h, hb, edge, true); }
  else if (cl > 0.5 && hb > 0.3 + (1 - cl) * 0.8) { out[0] = MAT.DIRT; colDirt(out, n, h, hb, 99, false); }
  else {
    out[0] = MAT.GRASS; colGrass(out, px, py, n, hb, cl > 0 ? -0.3 : -0.9);
    if (hb > 0.98 && cl <= 0) { out[1] = 150; out[2] = 92; out[3] = 34; }
  }
  // 岩壁腳下的陰影
  if (foRidge(px, py - 50) > 0) { out[1] *= 0.74; out[2] *= 0.76; out[3] *= 0.82; }
}

function buildForest() {
  const info = buildGround(FOW, FOH, forestPixel);
  applyTiles(info, FOW, FOH);
  const G = { id: 'forest', name: '村外森林', W: FOW, H: FOH, ground: info.canvas, groundInfo: info, sprites: [], solids: [], circles: [], lights: [], shimmers: [], buildings: [], chests: {} };
  G.water = (x, y) => matAt(G, x, y) === MAT.ROCK || inPool(x, y);
  const gctx = info.ctx, R = rng(7311);
  const shadow = (x, y, rx, ry, a = 0.32) => { gctx.fillStyle = `rgba(16,22,10,${a})`; gctx.beginPath(); gctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); gctx.fill(); };
  const addSprite = (s, x, y) => { const o = { img: s.img, x, y, ax: s.ax, ay: s.ay }; G.sprites.push(o); return o; };

  // 礦坑入口：靠著山脊，左右岩堆與坑口上方擋住，中間的坑道可以走進去
  const mi = MINE_ART.礦坑入口, { x: mx, y: my } = FO_MINE;
  shadow(mx, my - 4, 112, 22, 0.35); addSprite({ img: mi, ax: mi.width / 2, ay: mi.height - 4 }, mx, my);
  G.solids.push([mx - 103, my - 190, mx - 44, my - 6], [mx + 50, my - 190, mx + 103, my - 6], [mx - 44, my - 190, mx + 50, my - 48]);
  G.lights.push({ x: mx - 59, y: my - 79, r: 120, c: '255,170,80' }, { x: mx + 64, y: my - 79, r: 120, c: '255,170,80' });
  // 土石山：素材 assets/mine/rocks/（tools/crop_parts.js 從 assets/mine/原稿/土石.png 裁出），由後往前一排排疊上去
  const rock = (name, x, y, solid) => {
    const i = ROCK_ART[name]; addSprite({ img: i, ax: i.width / 2, ay: i.height - 3 }, Math.round(x), Math.round(y));
    if (solid) G.circles.push([x, y - 8, i.width * 0.36]);
  };
  const hills = ['岩山1', '岩山2', '岩山3', '岩山4', '岩山5'];
  for (const [y0, step] of [[60, 120], [150, 115], [240, 110]]) for (let x = -20, k = 0; x < 1000; x += step + R() * 30, k++) {
    if (y0 + 30 < foRidgeTop(x)) rock(hills[(k + (y0 >> 4)) % 5], x, y0 + R() * 20);
  }
  // 山腳前緣（礦坑左右），礦坑本身的岩堆在中間
  for (const [name, x] of [['岩山1', 40], ['岩山3', 160], ['岩山2', 270], ['岩山5', 380], ['岩山4', 680], ['岩山1', 800], ['岩山3', 900]]) rock(name, x, foRidgeTop(x) + 22, true);
  rock('岩坡下右', 990, foRidgeTop(990) + 70, true); rock('岩坡下右', 1065, foRidgeTop(1065) + 60, true);
  // 坑口腳下的落石與土堆
  for (const [name, dx, dy] of [['巨石1', -122, 6], ['碎石2', -84, 30], ['土石堆3', 128, 10], ['巨石3', 165, -10], ['土丘2', -170, 18], ['碎石1', 96, 34]]) rock(name, mx + dx, my + dy, !name.startsWith('土丘'));
  // 路旁可砍的樹
  // 止血草（學會採藥才採得到）
  FO_HERBS.forEach(([x, y], i) => { const h = makeHerb('herb', 5 + (i % 3)); addGather(G, addSprite, 'herb', x, y, 'fherb' + i, { imgs: [h.img, makeHerb('herb', 0).img], ax: h.ax, ay: h.ay }); });
  FO_CHOP.forEach(([x, y], i) => { addGather(G, addSprite, 'wood', x, y, 'fwood' + i, makeChopTree(R)); G.circles.push([x, y - 4, 11]); });
  stampDecor(gctx, matAt, G, R, FOW, FOH, 250);
  for (let i = 0; i < 1400; i++) {
    const x = R() * FOW, y = R() * FOH; if (matAt(G, x, y) !== MAT.GRASS) continue;
    gctx.fillStyle = i % 6 === 0 ? ['#f2ead0', '#f0d060', '#b090d8'][i % 3] : R() > 0.5 ? '#2e3e18' : '#7e9240';
    gctx.fillRect(x | 0, y | 0, 2, i % 6 === 0 ? 2 : 4); gctx.fillRect((x | 0) + 3, (y | 0) + 1, 2, 3);
  }
  drawSpring(gctx, G, addSprite, R);
  drawTracks(gctx, R);
  drawClues(G, gctx, addSprite, R);
  // 密林：比官道更密、更暗
  const trees = [];
  // 要看得見的地面：林道、礦坑小徑、第 4 章舊獵道通往空地的側道（每 30px 取一點）
  const seen = [];
  for (const line of [FO_ROAD, FO_PATH, ...FO_BRANCHES, FO_HUNT_TRAIL]) for (let i = 1; i < line.length; i++) {
    const [x0, y0] = line[i - 1], [x1, y1] = line[i], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 30);
    for (let k = 0; k <= n; k++) seen.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
  }
  const ok = (x, y, minD) => {
    if (x < 10 || x > FOW - 10 || y < 30 || y > FOH) return false;
    if (foRoad(x, y, 26 + minD * 0.5)[0]) return false;
    // 樹冠往上長：樹根在路的下方一段距離內，就會蓋住路面和走在路上的人
    const crown = minD > 60 ? 175 : 55;
    for (const [px, py] of seen) if (Math.abs(x - px) < 80 && y - py > -25 && y - py < crown) return false;
    if (foClearing(x, y) > -0.1) return false;
    if (foRidge(x, y - 40) > 0) return false; // 土石山上不長樹
    for (const t of [...trees, ...FO_CHOP]) if (Math.hypot(x - t[0], (y - t[1]) * 1.4) < minD) return false;
    return true;
  };
  for (let i = 0; i < 16000 && trees.length < 420; i++) {
    const x = R() * FOW, y = 30 + R() * FOH;
    if (!ok(x, y, 74)) continue;
    trees.push([x, y, R() < 0.55 ? 'pine' : R() < 0.5 ? 'green' : 'autumn']);
  }
  for (const [x, y, k] of trees) {
    const t = decorTree(k, R); shadow(x + 4, y - 2, t.shadow, t.shadow * 0.32);
    addSprite(t, Math.round(x), Math.round(y)); G.circles.push([x, y - 4, t.cr]);
  }
  for (let i = 0; i < 3500 && trees.length < 660; i++) {
    const x = R() * FOW, y = 30 + R() * FOH;
    if (!ok(x, y, 46)) continue;
    trees.push([x, y, 'bush']);
    const t = decorTree(R() < 0.6 ? 'bush' : 'bushA', R); shadow(x, y - 2, t.shadow, t.shadow * 0.28, 0.25); addSprite(t, Math.round(x), Math.round(y));
  }
  const [mini, mg] = canvas(Math.round(FOW / 12), Math.round(FOH / 12));
  mg.imageSmoothingEnabled = true; mg.drawImage(G.ground, 0, 0, mini.width, mini.height);
  for (const [x, y, k] of trees) { mg.fillStyle = k === 'bush' ? '#2f4a1c88' : '#16281acc'; mg.fillRect(x / 12 - 1, y / 12 - 3, 3, 3); }
  G.mini = mini;
  return G;
}

// 山泉：使用者的素材 assets/props/山泉.png（1254×1254 透明背景，原稿在 assets/props/原稿/）
// 整張先印在地面上；右上的岩堆另外裁成一個依 y 排序的物件，人走到岩石後面會被擋住
// 以下座標都是原圖像素：水潭中心、岩堆裁切範圍與底線、岩石碰撞圓
const SPRING_S = 0.24, SPRING_POOL = [560, 770], SPRING_ROCKS = [620, 170, 1240, 830], SPRING_ROCK_BASE = 800;
const SPRING_SOLID = [[960, 470, 230], [760, 330, 110], [860, 640, 70]];
function drawSpring(g, G, addSprite, R) {
  const img = PROPS.山泉; if (!img) return;
  const k = SPRING_S, ox = FO_POOL.x - SPRING_POOL[0] * k, oy = FO_POOL.y - SPRING_POOL[1] * k;
  g.imageSmoothingQuality = 'high'; g.drawImage(img, ox, oy, img.width * k, img.height * k);
  const [l, t, r, b] = SPRING_ROCKS, w = Math.round((r - l) * k), h = Math.round((b - t) * k), [c, cg] = canvas(w, h);
  cg.imageSmoothingQuality = 'high'; cg.drawImage(img, l, t, r - l, b - t, 0, 0, w, h);
  addSprite({ img: c, ax: 0, ay: Math.round((SPRING_ROCK_BASE - t) * k) }, Math.round(ox + l * k), Math.round(oy + SPRING_ROCK_BASE * k));
  for (const [x, y, rr] of SPRING_SOLID) G.circles.push([ox + x * k, oy + y * k, rr * k]);
  // 水面波光
  for (let i = 0; i < 18; i++) {
    const x = FO_POOL.x + (R() - 0.5) * FO_POOL_R[0] * 1.6, y = FO_POOL.y + (R() - 0.5) * FO_POOL_R[1] * 1.4;
    if (inPool(x, y)) G.shimmers.push({ x, y, p: R() * 6.28, w: 3 + R() * 7 });
  }
}

// 狼爪印：一串從西南草叢斜穿林道、往東北樹叢（野狼躲藏處）去的腳印（印在地面上，以 FO_TRACKS 為中心）
function drawTracks(g, R) {
  const x0 = FO_TRACKS.x - 120, y0 = FO_TRACKS.y + 70, x1 = FO_TRACKS.x + 150, y1 = FO_TRACKS.y - 50;
  const ang = Math.atan2(y1 - y0, x1 - x0), n = 14;
  const paw = (x, y, a, s) => {
    g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2);
    // 先一圈壓痕的淺色泥邊，再畫深色印子：掌墊一個、趾頭四個、趾尖爪痕
    for (const [col, grow] of [['rgba(120,92,58,.55)', 1.2], ['rgba(40,28,16,.85)', 0]]) {
      g.fillStyle = col;
      g.beginPath(); g.ellipse(0, 2 * s, 3.4 * s + grow, 2.8 * s + grow, 0, 0, Math.PI * 2); g.fill();
      for (const [tx, ty] of [[-3.2, -2.2], [-1.1, -4], [1.1, -4], [3.2, -2.2]]) { g.beginPath(); g.ellipse(tx * s, ty * s, 1.2 * s + grow * 0.6, 1.5 * s + grow * 0.6, 0, 0, Math.PI * 2); g.fill(); }
    }
    g.fillStyle = 'rgba(30,20,12,.8)';
    for (const tx of [-1.1, 1.1]) g.fillRect(tx * s - 0.5, -6.4 * s, 1, 1.4 * s);
    g.restore();
  };
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), side = i % 2 ? 1 : -1;
    const x = x0 + (x1 - x0) * t - Math.sin(ang) * side * 6 + (R() - 0.5) * 3, y = y0 + (y1 - y0) * t + Math.cos(ang) * side * 6 + (R() - 0.5) * 3;
    paw(x, y, ang + (R() - 0.5) * 0.25, 1.15);
  }
}

// 摸黑探索的小發現（位置同 story_data.js 的 fo_stump、fo_bones、fo_sign 調查點）
const FO_CLUES = { stump: { x: 430, y: 1320 }, bones: { x: 590, y: 1090 }, sign: { x: 690, y: 1190 } };
function drawClues(G, g, addSprite, R) {
  // 歪倒的木牌：拿村裡的路牌素材，把字蓋掉、只剩幾個磨損的字，再斜斜插在地上
  const src = PROPS.路牌_西清河鎮;
  if (src) {
    const [c0, b] = canvas(src.width, src.height); b.drawImage(src, 0, 0);
    b.fillStyle = '#c6935a'; b.fillRect(100, 268, 536, 158);
    for (let i = 0; i < 26; i++) { b.fillStyle = R() < 0.5 ? '#b07c46' : '#d6a46a'; b.fillRect(100, 270 + R() * 150, 536, 2 + R() * 3); }
    b.font = 'bold 92px "Noto Serif TC","PMingLiU",serif'; b.textBaseline = 'middle'; b.fillStyle = 'rgba(60,34,16,.5)';
    b.fillText('河', 250, 350); b.fillText('村', 420, 352); b.fillStyle = 'rgba(60,34,16,.35)'; b.fillText('東', 540, 348);
    // 刮痕與缺角
    b.strokeStyle = 'rgba(90,56,28,.8)'; b.lineWidth = 6;
    for (let i = 0; i < 7; i++) { const x = 120 + R() * 480, y = 280 + R() * 130; b.beginPath(); b.moveTo(x, y); b.lineTo(x + 30 + R() * 60, y + (R() - 0.5) * 30); b.stroke(); }
    b.clearRect(560, 200, 160, 90);
    const k = 0.1, w = 110, h = 100, [c, cg] = canvas(w, h);
    cg.imageSmoothingQuality = 'high'; cg.translate(w / 2, h - 6); cg.rotate(-0.38);
    cg.drawImage(c0, -src.width * k / 2, -src.height * k, src.width * k, src.height * k);
    const p = FO_CLUES.sign;
    g.fillStyle = 'rgba(16,22,10,.3)'; g.beginPath(); g.ellipse(p.x - 6, p.y - 2, 26, 6, 0, 0, Math.PI * 2); g.fill();
    addSprite({ img: c, ax: w / 2, ay: h - 6 }, p.x, p.y); G.circles.push([p.x, p.y - 3, 8]);
  }
  // 使用者素材縮小成地圖物件：k 縮放比例，[ax, ay] 原圖上的腳點
  const prop = (img, k, ax, ay) => {
    const w = Math.round(img.width * k), h = Math.round(img.height * k), [c, cg] = canvas(w, h);
    cg.imageSmoothingQuality = 'high'; cg.drawImage(img, 0, 0, w, h);
    return { img: c, ax: ax * k, ay: ay * k };
  };
  const shade = (x, y, rx, ry) => { g.fillStyle = 'rgba(16,22,10,.32)'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  // 刻著記號的老樹（assets/props/老樹_刻字.png，1254×1254，樹根中心約在 (640, 1150)）
  if (PROPS.老樹_刻字) { shade(FO_AZ.x + 4, FO_AZ.y - 2, 70, 18); addSprite(prop(PROPS.老樹_刻字, 0.2, 640, 1150), FO_AZ.x, FO_AZ.y); G.circles.push([FO_AZ.x, FO_AZ.y - 6, 20]); }
  // 歇腳的倒木（assets/props/倒木.png，1448×1086，左下斷口往右上斜躺；腳點取底部中央）
  if (PROPS.倒木) {
    shade(FO_LOG.x, FO_LOG.y - 4, 70, 12); addSprite(prop(PROPS.倒木, 0.11, 720, 880), FO_LOG.x, FO_LOG.y);
    G.circles.push([FO_LOG.x - 45, FO_LOG.y - 2, 12], [FO_LOG.x, FO_LOG.y - 14, 12], [FO_LOG.x + 45, FO_LOG.y - 28, 12]);
  }
  // 死路盡頭的荊棘叢（assets/props/荊棘與倒木.png 下排的小塊）：林道走到這裡就斷了，幾叢荊棘錯落成一道弧，兩端埋進樹叢
  const th = PROPS.荊棘與倒木;
  if (th) {
    const piece = (sx, sy, ex, ey, k) => { const w = Math.round((ex - sx) * k), h = Math.round((ey - sy) * k), [c, cg] = canvas(w, h); cg.imageSmoothingQuality = 'high'; cg.drawImage(th, sx, sy, ex - sx, ey - sy, 0, 0, w, h); return { img: c, w, h }; };
    const P = [[1125, 395, 1440, 560], [1110, 580, 1480, 770], [1510, 590, 1830, 770], [1505, 400, 1625, 610]];
    // [素材, 相對腳點 dx, dy, 縮放]
    for (const [i, dx, dy, k] of [[2, -125, 6, 0.38], [0, 0, -8, 0.4], [1, 120, 4, 0.38], [3, -205, 18, 0.34], [3, 200, 16, 0.32]]) {
      const p = piece(...P[i], k), x = FO_THORNS.x + dx, y = FO_THORNS.y + dy;
      shade(x, y - 3, p.w * 0.45, 6);
      addSprite({ img: p.img, ax: p.w / 2, ay: p.h - 5 }, x, y);
      G.solids.push([x - p.w / 2 + 4, y - 14, x + p.w / 2 - 4, y + 2]);
    }
  }
  // 樹樁：深色樹皮、淺色切面年輪，切面上一道斧頭砍痕
  const st = FO_CLUES.stump;
  g.fillStyle = 'rgba(16,22,10,.35)'; g.beginPath(); g.ellipse(st.x + 3, st.y + 2, 22, 7, 0, 0, Math.PI * 2); g.fill();
  const [sc, sg] = canvas(44, 40);
  sg.fillStyle = '#4a3220'; sg.fillRect(6, 12, 32, 22); sg.beginPath(); sg.ellipse(22, 34, 16, 5, 0, 0, Math.PI * 2); sg.fill();
  for (let x = 8; x < 36; x += 5) { sg.fillStyle = '#382414'; sg.fillRect(x, 14, 2, 20); }
  sg.fillStyle = '#c9a26a'; sg.beginPath(); sg.ellipse(22, 12, 16, 6, 0, 0, Math.PI * 2); sg.fill();
  sg.strokeStyle = '#a07a46'; sg.lineWidth = 1; for (const r of [11, 7, 3]) { sg.beginPath(); sg.ellipse(22, 12, r, r * 0.38, 0, 0, Math.PI * 2); sg.stroke(); }
  sg.strokeStyle = '#3a2412'; sg.lineWidth = 2; sg.beginPath(); sg.moveTo(12, 9); sg.lineTo(24, 15); sg.stroke();
  addSprite({ img: sc, ax: 22, ay: 36 }, st.x, st.y); G.circles.push([st.x, st.y - 2, 12]);
  // 白骨：幾根散落的骨頭，貼在地面上
  const bo = FO_CLUES.bones;
  const bone = (x, y, a, len) => {
    g.save(); g.translate(x, y); g.rotate(a);
    for (const [col, gr] of [['#5a5040', 1], ['#e6dfcc', 0]]) {
      g.fillStyle = col; g.fillRect(-len / 2, -1.5 - gr, len, 3 + gr * 2);
      for (const ex of [-len / 2, len / 2]) for (const ey of [-2, 2]) { g.beginPath(); g.arc(ex, ey, 2.2 + gr, 0, Math.PI * 2); g.fill(); }
    }
    g.restore();
  };
  // 散開擺，避免疊成一團像骷髏標誌
  [[-34, -6], [-12, 10], [22, 14], [40, -2], [-26, 16], [6, -14]].forEach(([dx, dy]) => bone(bo.x + dx + (R() - 0.5) * 6, bo.y + dy + (R() - 0.5) * 4, R() * Math.PI, 9 + R() * 9));
  // 一塊動物頭骨
  g.fillStyle = '#5a5040'; g.beginPath(); g.ellipse(bo.x + 50, bo.y + 10, 8, 5.5, 0.3, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ece4d0'; g.beginPath(); g.ellipse(bo.x + 50, bo.y + 9, 7, 4.5, 0.3, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#2a2418'; g.fillRect(bo.x + 46, bo.y + 7, 2, 2); g.fillRect(bo.x + 51, bo.y + 9, 2, 2);
}

// ---------- 角色與劇情 ----------
// 森林裡的劇情人物（沈若蘭、惡徒、老吳）改由 story_data.js 的 STORY_NPCS 定義
// ch1_wolves 沿用為「已離開森林、進過清河村」的舊旗標，礦坑與村口出口靠它開啟
const FOREST_NPC_DEFS = [];
function forestActor(d, mk) {
  const w = d.wolf && MON_ART.wolf.walk;
  return w ? makeActor({ ...d, home: [d.x, d.y], sheet: w, fw: 96 }) : mk(d);
}
function forestInteractables() {
  return [...gatherInteractables(),{ x: FO_MINE.x, y: FO_MINE.y - 20, r: 70, name: '礦坑', act: () => talk(F().ch1_wolves ? ['山腳下挖著一座舊礦坑，坑口的油燈居然還亮著。往裡走就能進去。'] : ['（一座舊礦坑……可現在不是探險的時候。）']) }];
}
const FOREST_TALK = {};

// 開場趴地醒來：assets/characters/hero_prone.png 橫排 8 格（0–3 昏睡、4–7 撐起身子）
// prone.mode：sleep 昏睡呼吸、wake 撐起身子、dazed 頭上冒出「???」
let prone = null, proneImg = null, heroFaceModern = null, heroModernWalk = null, heroRunImg = null, heroHurtImg = null;
// 待機（hero_idle.png）、挖礦（hero_mine.png）：單列 8 格，每格 86
let heroIdleImg = null, heroMineImg = null;
// 肩傷（hero_shoulder.png）：單列 8 格，0 站著摀肩、1–2 疼得縮起來、3–4 彎腰、5–6 蹲下喘氣、7 站起來
let heroShoulderImg = null;
// 剛穿越過來（還沒到清河村）時，小蝦米穿的是現代衣服：紅色連帽外套、背包（assets/characters/hero_modern_walk.png）
// 吳嬸送他一套衣裳（F().outfit）之前，都穿著穿越時的現代衣服
const modernLook = () => !!heroFaceModern && S && !S.flags.outfit;
const heroSheet = () => (modernLook() && heroModernWalk) || heroImg;
function drawProne(t) {
  const fw = proneImg.width / 8, fh = proneImg.height, sc = player.scale / 1.35 / (proneImg.hd || 1);
  const fr = prone.mode === 'sleep' ? [0, 1, 2, 1][Math.floor(prone.t / 0.6) % 4] : Math.min(7, 4 + Math.floor(prone.t / 0.4));
  const x = Math.round(player.x - cam.x), y = Math.round(player.y - cam.y), w = fw * sc, h = fh * sc;
  // 圖格下方留有空白，身體實際貼地處約在格高 80% 的位置：以那裡對齊腳下，陰影才會貼著身體
  const foot = fh * 0.8 * sc;
  ctx.fillStyle = 'rgba(15,20,12,.32)'; ctx.beginPath(); ctx.ellipse(x + w * 0.04, y - 2, w * 0.4, 4, 0, 0, Math.PI * 2); ctx.fill();
  smoothFor(proneImg); ctx.drawImage(proneImg, fr * fw, 0, fw, fh, Math.round(x - w / 2), Math.round(y - foot), w, h); ctx.imageSmoothingEnabled = false;
  if (prone.mode !== 'dazed') return;
  const bx = x - w * 0.18, by = y - foot - 10 + Math.sin(t / 160) * 3;
  ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = '#1a1510';
  ['?', '?', '?'].forEach((q, i) => { const qx = bx + (i - 1) * 12, qy = by - Math.max(0, Math.sin(t / 180 - i * 0.9)) * 5; ctx.strokeText(q, qx, qy); ctx.fillStyle = '#ffe070'; ctx.fillText(q, qx, qy); });
}
function forestTriggers() {
  if (F().ch1_wolves && Math.abs(player.x - FO_MINE.x - 3) < 32 && player.y < FO_MINE.y - 40) { keys.clear(); return fade(() => { switchMap('mine', MI_EXIT.x, MI_EXIT.y - 40, 1); toast('礦山隧道'); }); }
  // 東出口通往村西野林：第 1 章在倒木歇過（ch01_diary）之後才走得出去
  if ((F().ch1_wolves || F().ch01_diary) && player.x > FOW - 30 && Math.abs(player.y - FO_EXIT.y) < 120) { keys.clear(); return fade(() => { switchMap('wildwood', 60, WW_WEST.y, 3); toast('村西野林'); }); }
}
