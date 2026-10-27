'use strict';
// 雲山官道 — 出村後的野外地圖（山谷、密林、山溪、土地廟、黑風坡）
const FW = 1920, FH = 2400;
const F_ROAD = [[960, 0], [930, 300], [1040, 620], [1120, 900], [960, 1200], [820, 1480], [900, 1800], [980, 2080], [960, 2400]];
const F_PATHS = [[[1110, 905], [1250, 975], [1340, 1030]], [[1035, 610], [850, 620], [700, 660]], [[905, 1790], [1200, 1760], [1430, 1770]]];
const F_SHRINE = { x: 1365, y: 1010 };
const F_CAMP = { x: 960, y: 2150 };
const F_CLEARINGS = [[F_SHRINE.x, F_SHRINE.y, 250], [F_CAMP.x, F_CAMP.y, 240], [690, 660, 110], [1440, 1770, 105], [960, 120, 210]];
const F_CHESTS = [
  { id: 'c1', x: 680, y: 650, gold: 0, items: [['herb', 2]] },
  { id: 'c2', x: 1450, y: 1760, gold: 60, items: [['tea', 1]] },
  { id: 'c3', x: 1150, y: 2230, gold: 80, items: [['tea', 2]] },
];
const F_CREEK_HW = 30;
// 官道北段路旁可砍的枯樹（伐木點）
const F_CHOP = [[260, -95], [520, 100], [820, -100]].map(([y, dx]) => [Math.round(roadCenterX(y) + dx), y]);
function creekY(x) { return 1500 + 34 * Math.sin(x / 170) + 12 * Math.sin(x / 53 + 2); }
const F_BRIDGE = (() => {
  const x0 = 788, x1 = 868; let lo = Infinity, hi = -Infinity;
  for (let x = x0; x <= x1; x += 4) { const y = creekY(x); lo = Math.min(lo, y); hi = Math.max(hi, y); }
  return { x0, x1, y0: Math.floor(lo - F_CREEK_HW - 16), y1: Math.ceil(hi + F_CREEK_HW + 16) };
})();
function onFBridge(x, y) { return x > F_BRIDGE.x0 && x < F_BRIDGE.x1 && y > F_BRIDGE.y0 && y < F_BRIDGE.y1; }

function roadCenterX(y) {
  for (let i = 1; i < F_ROAD.length; i++) {
    const [ax, ay] = F_ROAD[i - 1], [bx, by] = F_ROAD[i];
    if (y <= by) return ax + (bx - ax) * Math.max(0, (y - ay) / (by - ay));
  }
  return F_ROAD[F_ROAD.length - 1][0];
}
// 回傳 [是否在路上, 到路緣距離]
function fRoad(px, py, jitter) {
  let edge = -1;
  for (let i = 1; i < F_ROAD.length; i++) edge = Math.max(edge, 31 + jitter - segDist(px, py, F_ROAD[i - 1][0], F_ROAD[i - 1][1], F_ROAD[i][0], F_ROAD[i][1]));
  for (const pts of F_PATHS) for (let i = 1; i < pts.length; i++) edge = Math.max(edge, 20 + jitter * 0.6 - segDist(px, py, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
  return [edge > 0 ? 1 : 0, edge];
}
function clearing(px, py) {
  let v = -9;
  for (const [x, y, r] of F_CLEARINGS) v = Math.max(v, 1 - Math.hypot(px - x, (py - y) * 1.2) / r);
  return v;
}
// 山壁：>0 代表岩石
function rockValue(px, py) {
  const n = fbm(px / 120 + 7, py / 120);
  const side = Math.abs(px - roadCenterX(py)) - (700 + 110 * Math.sin(py / 380 + 1) + 60 * Math.sin(py / 130)) + (n - 0.5) * 140;
  let out = -1;
  if (clearing(px, py) < -0.4 && py > 40) {
    const rd = Math.abs(px - roadCenterX(py));
    if (rd > 170) out = (fbm(px / 160 + 30, py / 160) - 0.71) * 900;
  }
  return Math.max(side, out);
}
function fieldPixel(out, px, py, cx, cy, n, h, hb) {
  const dv = Math.abs(py - creekY(px));
  if (dv < F_CREEK_HW) { out[0] = MAT.WATER; colWater(out, dv / F_CREEK_HW, px, py, hb); return; }
  if (dv < F_CREEK_HW + 8) { out[0] = MAT.BANK; colBank(out, cx, cy); return; }
  const rv = rockValue(px, py);
  if (rv > 0) {
    out[0] = MAT.ROCK;
    const s = 0.85 + hash2(cx >> 2, cy >> 3) * 0.25;
    out[1] = (100 + n * 40) * s; out[2] = (94 + n * 34) * s; out[3] = (80 + n * 26) * s;
    if ((py + ((px / 26) | 0) * 5) % 18 < 2) { out[1] -= 24; out[2] -= 22; out[3] -= 18; }
    if (rv < 4) { out[1] = 52; out[2] = 48; out[3] = 40; }
    else if (rv < 9) { out[1] += 22; out[2] += 20; out[3] += 16; }
    else if (hb > 0.9 && n > 0.55) { out[1] = 82; out[2] = 98; out[3] = 52; }
    return;
  }
  // 南向的山壁立面（岩石在正上方）
  const above = rockValue(px, py - 30);
  if (above > 0) {
    out[0] = MAT.ROCK;
    const k = 1 - Math.min(1, (rockValue(px, py - 8) > 0 ? 0 : 0.5) + 0.25);
    const v = 60 + ((px / 6) | 0) % 3 * 8 + n * 26;
    out[1] = v * (0.8 + k * 0.3); out[2] = v * 0.92 * (0.8 + k * 0.3); out[3] = v * 0.8 * (0.8 + k * 0.3);
    if (hb > 0.8) { out[1] += 14; out[2] += 12; out[3] += 10; }
    return;
  }
  const [road, edge] = fRoad(px, py, (n - 0.5) * 14);
  const cl = clearing(px, py);
  if (road) { out[0] = MAT.DIRT; colDirt(out, n, h, hb, edge, true); }
  else if (cl > 0.45 && hb > 0.25 + (1 - cl) * 0.8) { out[0] = MAT.DIRT; colDirt(out, n, h, hb, 99, false); }
  else {
    out[0] = MAT.GRASS; colGrass(out, px, py, n, hb, cl > 0 ? 0 : -0.7);
    // 林下落葉
    if (hb > 0.985 && cl <= 0) { out[1] = 150; out[2] = 92; out[3] = 34; }
  }
  // 山壁腳下的陰影
  if (rockValue(px, py - 48) > 0) { out[1] *= 0.72; out[2] *= 0.74; out[3] *= 0.8; }
}

// ---------- 野外道具 ----------
// 路旁土地廟：有素材（assets/buildings/土地公廟.png，與清河村南田那座同一張）就照原尺寸用，沒有才用程式畫
function makeShrine() {
  const art = VHOUSE.土地公廟 || BLOOK_IMG.土地公廟;
  if (art) return { img: art, ax: art.width * 0.53, ay: art.height * 0.86 };
  const [c, g] = canvas(120, 120); const by = 112;
  g.fillStyle = '#00000040'; g.beginPath(); g.ellipse(60, by - 4, 54, 12, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#6f6a5b'; g.fillRect(14, by - 22, 92, 18); g.fillStyle = '#8b8571'; g.fillRect(14, by - 22, 92, 4);
  g.fillStyle = '#5c574a'; for (let x = 18; x < 104; x += 14) g.fillRect(x, by - 14, 12, 2);
  g.fillStyle = '#7a2418'; g.fillRect(26, 48, 68, 44); g.fillStyle = '#93301f'; g.fillRect(26, 48, 68, 5);
  g.fillStyle = '#1a1210'; g.fillRect(44, 58, 32, 34);
  g.fillStyle = '#c9b27a'; g.fillRect(55, 70, 10, 14); g.fillStyle = '#e8d8a8'; g.fillRect(57, 66, 6, 6);
  g.fillStyle = '#f6c763'; g.fillRect(48, 82, 3, 6); g.fillRect(69, 82, 3, 6);
  poly(g, [[6, 50], [22, 26], [98, 26], [114, 50], [100, 54], [20, 54]], '#2b2f38');
  g.fillStyle = '#464c58'; for (let x = 16; x < 106; x += 7) g.fillRect(x, 32, 2, 18);
  g.fillStyle = '#181b21'; g.fillRect(20, 20, 80, 7); g.fillRect(4, 44, 8, 8); g.fillRect(108, 44, 8, 8);
  g.fillStyle = '#c9a45c'; g.fillRect(48, 30, 24, 12); g.fillStyle = '#231a12'; g.fillRect(50, 32, 20, 8);
  // 香爐
  g.fillStyle = '#4a4438'; g.fillRect(50, by - 32, 20, 10); g.fillStyle = '#6a6250'; g.fillRect(48, by - 34, 24, 3);
  g.fillStyle = '#d8c79a'; g.fillRect(56, by - 44, 1, 10); g.fillRect(60, by - 46, 1, 12); g.fillRect(64, by - 43, 1, 9);
  return { img: c, ax: 60, ay: by - 6 };
}
function makeTent(hue) {
  const [c, g] = canvas(130, 100); const by = 94;
  g.fillStyle = '#00000040'; g.beginPath(); g.ellipse(65, by, 60, 10, 0, 0, Math.PI * 2); g.fill();
  poly(g, [[6, by], [65, 12], [124, by]], hue ? '#8a7450' : '#7a6a52');
  poly(g, [[65, 12], [124, by], [96, by]], hue ? '#6a5638' : '#5a4c3a');
  poly(g, [[48, by], [65, 46], [82, by]], '#1a120c');
  g.fillStyle = '#3e2a17'; g.fillRect(63, 4, 4, 12);
  g.fillStyle = '#a03020'; g.fillRect(67, 4, 14, 8);
  return { img: c, ax: 65, ay: by };
}
function makeCampfire() {
  const [c, g] = canvas(60, 40);
  g.fillStyle = '#5a5448'; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.fillRect(30 + Math.cos(a) * 22 - 4, 28 + Math.sin(a) * 8 - 3, 8, 6); }
  g.fillStyle = '#3e2a17'; g.fillRect(16, 26, 28, 5); g.fillRect(22, 22, 16, 5);
  return { img: c, ax: 30, ay: 34, fire: true };
}
// 寶箱素材（assets/props/寶箱.png）：橫排 4 格 — 0 關、1 半開、2 開（空）、3 開（發光）
const CHEST_FRAMES = [];
function chestFrame(k) {
  if (!CHEST_FRAMES[k]) {
    const src = PROPS.寶箱, fw = src.width / 4, [c, g] = canvas(fw, src.height);
    g.fillStyle = '#00000040'; g.beginPath(); g.ellipse(fw / 2, src.height - 3, fw / 2 - 3, 5, 0, 0, Math.PI * 2); g.fill();
    g.drawImage(src, k * fw, 0, fw, src.height, 0, 0, fw, src.height);
    CHEST_FRAMES[k] = c;
  }
  return CHEST_FRAMES[k];
}
function makeChest(open) { const img = chestFrame(open ? 2 : 0); return { img, ax: img.width / 2, ay: img.height - 3 }; }
// 開箱動畫：半開 → 發光 → 光散去剩空箱
function animateChestOpen(sprite) {
  sprite.img = chestFrame(1);
  setTimeout(() => { sprite.img = chestFrame(3); }, 140);
  setTimeout(() => { sprite.img = chestFrame(2); }, 1400);
}
function makeBarricade() {
  const [c, g] = canvas(110, 60);
  for (let i = 0; i < 5; i++) {
    const x = 8 + i * 22;
    g.fillStyle = '#3e2a17'; g.fillRect(x, 8, 10, 48); g.fillStyle = '#7a5530'; g.fillRect(x + 2, 8, 5, 46);
    poly(g, [[x, 10], [x + 5, 0], [x + 10, 10]], '#9a7246');
  }
  g.fillStyle = '#2e1f10'; g.fillRect(2, 24, 106, 6); g.fillRect(2, 40, 106, 6);
  return { img: c, ax: 55, ay: 56 };
}

// ---------- 組合野外地圖 ----------
function buildField() {
  const info = buildGround(FW, FH, fieldPixel);
  applyTiles(info, FW, FH);
  const G = { id: 'field', name: '雲山官道', W: FW, H: FH, ground: info.canvas, groundInfo: info, sprites: [], solids: [], circles: [], lights: [], shimmers: [], buildings: [], chests: {} };
  G.water = (x, y) => { const m = matAt(G, x, y); return m === MAT.ROCK || (m === MAT.WATER && !onFBridge(x, y)); };
  const gctx = info.ctx, R = rng(4242);
  const shadow = (x, y, rx, ry, a = 0.32) => { gctx.fillStyle = `rgba(16,22,10,${a})`; gctx.beginPath(); gctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); gctx.fill(); };
  const addSprite = (s, x, y) => { const o = { img: s.img, x, y, ax: s.ax, ay: s.ay, fire: s.fire }; G.sprites.push(o); return o; };

  // 花草、蘆葦
  stampDecor(gctx, matAt, G, R, FW, FH, 200);
  for (let i = 0; i < 900; i++) {
    const x = R() * FW, y = R() * FH; if (matAt(G, x, y) !== MAT.GRASS) continue;
    gctx.fillStyle = i % 6 === 0 ? ['#f2ead0', '#f0d060', '#b090d8'][i % 3] : R() > 0.5 ? '#2e3e18' : '#7e9240';
    gctx.fillRect(x | 0, y | 0, 2, i % 6 === 0 ? 2 : 4); gctx.fillRect((x | 0) + 3, (y | 0) + 1, 2, 3);
  }
  for (let x = 10; x < FW; x += 8) for (const side of [-1, 1]) {
    if (hash2(x, side + 11) < 0.5 || (x > F_BRIDGE.x0 - 20 && x < F_BRIDGE.x1 + 20)) continue;
    const y = creekY(x) + side * (F_CREEK_HW + 3); if (matAt(G, x, y) === MAT.ROCK) continue;
    const hgt = 7 + hash2(x, 4) * 10;
    gctx.fillStyle = '#4b5f26'; gctx.fillRect(x, y - hgt, 2, hgt); gctx.fillStyle = '#9aa850'; gctx.fillRect(x + 2, y - hgt * 0.7, 2, hgt * 0.7);
  }
  // 獨木橋
  const { x0, x1, y0, y1 } = F_BRIDGE;
  gctx.fillStyle = '#1a2a3080'; gctx.fillRect(x0 - 4, y0 + 8, x1 - x0 + 8, y1 - y0);
  for (let y = y0; y < y1; y += 8) {
    gctx.fillStyle = ((y - y0) / 8) % 2 ? '#7a5530' : '#8c6438'; gctx.fillRect(x0, y, x1 - x0, 7);
    gctx.fillStyle = '#4a321c'; gctx.fillRect(x0, y + 7, x1 - x0, 1);
  }
  for (const rx of [x0, x1 - 6]) { gctx.fillStyle = '#3e2a17'; gctx.fillRect(rx, y0 - 4, 6, y1 - y0 + 6); gctx.fillStyle = '#9a7246'; gctx.fillRect(rx + 1, y0 - 4, 2, y1 - y0 + 6); }
  G.solids.push([x0 - 6, y0, x0 + 8, y1], [x1 - 8, y0, x1 + 6, y1]);

  // 官道北段路旁可砍的樹
  F_CHOP.forEach(([x, y], i) => { addGather(G, addSprite, 'wood', x, y, 'wood' + i, makeChopTree(R)); G.circles.push([x, y - 4, 11]); });
  // 土地廟、營地、寶箱、路牌
  const shrine = makeShrine(); shadow(F_SHRINE.x, F_SHRINE.y, 56, 12, 0.2); addSprite(shrine, F_SHRINE.x, F_SHRINE.y);
  G.solids.push([F_SHRINE.x - 110, F_SHRINE.y - 95, F_SHRINE.x + 125, F_SHRINE.y - 28]);
  G.lights.push({ x: F_SHRINE.x, y: F_SHRINE.y - 30, r: 120, c: '255,200,120' });
  const tA = makeTent(0), tB = makeTent(1);
  for (const [t, x, y] of [[tA, 800, 2090], [tB, 1130, 2100], [tA, 1060, 2290]]) { addSprite(t, x, y); G.solids.push([x - 50, y - 40, x + 50, y]); }
  const fire = makeCampfire(); addSprite(fire, F_CAMP.x + 60, F_CAMP.y + 70); G.circles.push([F_CAMP.x + 60, F_CAMP.y + 64, 22]);
  G.lights.push({ x: F_CAMP.x + 60, y: F_CAMP.y + 50, r: 190, c: '255,150,70' });
  const bar = makeBarricade(); addSprite(bar, F_CAMP.x - 150, F_CAMP.y - 120); addSprite(bar, F_CAMP.x + 150, F_CAMP.y - 120);
  G.solids.push([F_CAMP.x - 205, F_CAMP.y - 136, F_CAMP.x - 95, F_CAMP.y - 120], [F_CAMP.x + 95, F_CAMP.y - 136, F_CAMP.x + 205, F_CAMP.y - 120]);
  G.chestImg = [makeChest(false).img, makeChest(true).img];
  // 每處長成的階段不同（5–7），採過後剩新芽
  F_HERBS.forEach(([x, y, kind], i) => { const h = makeHerb(kind, 5 + (i % 3)); addGather(G, addSprite, kind, x, y, 'herb' + i, { imgs: [h.img, makeHerb(kind, 0).img], ax: h.ax, ay: h.ay }); });
  for (const ch of F_CHESTS) { G.chests[ch.id] = addSprite(makeChest(false), ch.x, ch.y); G.circles.push([ch.x, ch.y - 8, 16]); }
  const sign = makeSign('北 清河村'); addSprite(sign, 1040, 150); G.circles.push([1040, 146, 8]);
  const sign2 = makeSign('土地廟'); addSprite(sign2, 1160, 880); G.circles.push([1160, 876, 8]);
  const sign3 = makeSign('黑風坡 危'); addSprite(sign3, 1050, 1930); G.circles.push([1050, 1926, 8]);

  // 樹林：松樹為主，夾雜秋色
  const trees = [];
  const getTree = (k) => decorTree(k, R);
  const ok = (x, y, minD) => {
    if (x < 10 || x > FW - 10 || y < 30 || y > FH) return false;
    if (Math.abs(y - creekY(x)) < F_CREEK_HW + 26) return false;
    if (fRoad(x, y, 30 + minD * 0.55)[0]) return false;
    if (clearing(x, y) > -0.1) return false;
    for (const t of [...trees, ...F_CHOP]) if (Math.hypot(x - t[0], (y - t[1]) * 1.4) < minD) return false;
    return true;
  };
  for (let i = 0; i < 9000 && trees.length < 330; i++) {
    const x = R() * FW, y = 30 + R() * FH;
    if (!ok(x, y, 84)) continue;
    const rock = matAt(G, x, y) === MAT.ROCK;
    const k = rock ? 'pine' : R() < 0.45 ? 'pine' : R() < 0.45 ? 'green' : R() < 0.55 ? 'autumn' : 'maple';
    trees.push([x, y, k]);
  }
  for (const [x, y, k] of trees) {
    const t = getTree(k); shadow(x + 4, y - 2, t.shadow, t.shadow * 0.32);
    addSprite(t, Math.round(x), Math.round(y)); G.circles.push([x, y - 4, t.cr]);
  }
  const rocks = ['岩石', '石堆', '大岩石'];
  for (let i = 0; i < 1600 && trees.length < 520; i++) {
    const x = R() * FW, y = 30 + R() * FH;
    if (!ok(x, y, 50) || matAt(G, x, y) === MAT.ROCK) continue;
    trees.push([x, y, 'bush']);
    if (R() < 0.16) { const r = decorSprite(rocks[(R() * 3) | 0], R() < 0.5 ? 1 : 0); shadow(x, y - 4, r.shadow, r.shadow * 0.25, 0.25); addSprite(r, Math.round(x), Math.round(y)); G.circles.push([x, y - 10, r.cr]); }
    else { const t = getTree(R() < 0.6 ? 'bush' : 'bushA'); shadow(x, y - 2, t.shadow, t.shadow * 0.28, 0.25); addSprite(t, Math.round(x), Math.round(y)); }
  }
  for (let i = 0; i < 120; i++) {
    const x = R() * FW, y = creekY(x) + (R() - 0.5) * F_CREEK_HW * 1.5;
    if (matAt(G, x, y) === MAT.WATER && !onFBridge(x, y)) G.shimmers.push({ x, y, p: R() * 6.28, w: 4 + R() * 8 });
  }
  addWaterFx(G, R, FW, creekY, F_CREEK_HW, (x, y) => onFBridge(x, y) || matAt(G, x, y) !== MAT.WATER, 30, 6);
  const [mini, mg] = canvas(Math.round(FW / 12), Math.round(FH / 12));
  mg.imageSmoothingEnabled = true; mg.drawImage(G.ground, 0, 0, mini.width, mini.height);
  for (const [x, y, k] of trees) { mg.fillStyle = k === 'bush' ? '#2f4a1c88' : k === 'pine' ? '#16281acc' : '#2f4a1ccc'; mg.fillRect(x / 12 - 1, y / 12 - 3, 3, 3); }
  G.mini = mini;
  return G;
}

// ---------- 野外角色與劇情 ----------
const FIELD_NPC_DEFS = [
  { id: 'woodcutter', name: '老吳', x: 970, y: 330, dir: 2, filter: 'sepia(.7) saturate(.6) brightness(.9)', scale: 1.3, wander: 180, speed: 32 },
  { id: 'boss', name: '黑風寨主', x: 960, y: 2100, dir: 0, filter: 'brightness(.5) sepia(.6) hue-rotate(-30deg) saturate(1.8)', scale: 1.8, hostile: true },
  { id: 'lackey1', art: 'bandit', name: '山賊', x: 880, y: 2125, dir: 0, filter: 'brightness(.6) saturate(.35)', scale: 1.4, hostile: true },
  { id: 'lackey2', art: 'bandit', name: '山賊', x: 1045, y: 2125, dir: 0, filter: 'brightness(.6) saturate(.35)', scale: 1.4, hostile: true },
];
function fieldInteractables() {
  return [
    { x: F_SHRINE.x, y: F_SHRINE.y + 24, r: 80, name: '土地廟', act: prayShrine },
    ...gatherInteractables(),
    ...F_CHESTS.map((ch) => ({ x: ch.x, y: ch.y + 10, r: 50, name: '寶箱', act: () => openChest(ch) })),
    { x: 1040, y: 165, r: 55, name: '路牌', act: () => talk(['木牌上寫著：「北：清河村　南：雲山」']) },
    { x: 1160, y: 895, r: 55, name: '路牌', act: () => talk(['木牌上寫著：「東行百步，土地廟」']) },
    { x: 1050, y: 1945, r: 55, name: '路牌', act: () => talk(['木牌上歪歪扭扭地刻著：「黑風坡　過路留財」，旁邊還畫了個骷髏。']) },
  ];
}
// 路旁的藥草（採集見 gather.js）：止血草在官道北段，延龍草長在山溪以南較濕的林邊
const F_HERBS = [[400, 70, 'herb'], [700, -75, 'herb'], [1000, 80, 'herb'], [1250, -70, 'herb'], [1600, 75, 'herb'], [1850, -65, 'herb'],
  [1580, -80, 'longcao'], [1700, 85, 'longcao'], [1900, 75, 'longcao']].map(([y, dx, kind]) => [Math.round(roadCenterX(y) + dx), y, kind]);
function prayShrine() {
  const first = !F().shrine; F().shrine = 1;
  talk([first ? '（一座小小的土地廟，香爐裡還插著幾炷殘香。）' : '（土地廟前香煙裊裊。）',
    { name: '', q: '要在土地廟前歇息嗎？', choices: [
      ['參拜歇息（恢復並存檔）', () => [() => fade(() => { healAll(); S.poison = 0; }), '（你雙手合十，心中默禱。一股暖意流遍全身。）', () => { toast(saveGame() ? '氣血、精力全滿 · 已存檔' : '氣血、精力全滿'); }]],
      ['離開', () => {}],
    ] }]);
}
function openChest(ch) {
  if (F()['chest_' + ch.id]) return talk(['寶箱已經空了。']);
  F()['chest_' + ch.id] = 1;
  animateChestOpen(G.chests[ch.id]);
  const got = [];
  if (ch.gold) { S.gold += ch.gold; got.push(ch.gold + ' 文'); }
  for (const [id, n] of ch.items) { give(id, n); got.push(`${ITEMS[id].name} ×${n}`); }
  talk([`（打開寶箱，獲得 ${got.join('、')}。）`]);
}
function applyFieldFlags(Gf) {
  for (const ch of F_CHESTS) Gf.chests[ch.id].img = Gf.chestImg[F()['chest_' + ch.id] ? 1 : 0];
  applyGather(Gf);
}
const FIELD_TALK = {
  woodcutter: (n) => (!S.specs.logging ? talk([['老吳', '喲，小兄弟！在村裡住得還慣嗎？'], ['老吳', '老漢沒什麼好報答你的，就這手砍柴的功夫還拿得出手。'],
    ['老吳', '來，這把柴刀你拿著。斧要斜著下，順著木紋，別跟樹硬碰硬。'], () => [learnSpec('gather', 'logging'), () => { give('axe'); toast('獲得「柴刀」 · 習得「伐木」'); }],
    ['老吳', '砍下來的木頭，自個兒用也行，捐給村裡修柵欄也成。村長正為這事發愁呢。']]) : cycle(n, [
    [['老吳', '小兄弟，又碰面了！這官道可不比村裡，林子裡野狼、毒蛇多得很。'], ['老吳', '打不過就跑，沒什麼丟人的。往東有座土地廟，在那兒拜一拜，能歇口氣。']],
    [['老吳', '再往南就是黑風坡了。聽說最近來了夥山賊，領頭的叫什麼「黑風寨主」……'], ['老吳', '你要過去，可得先把功夫練紮實了。']],
    [['老吳', '精力用完了，喝杯雲霧茶就能回上一些。客棧有賣。']],
  ])),
  boss: () => bossEvent(),
  lackey1: () => talk([['山賊', '看什麼看？要過去，先問問我們寨主答不答應！']]),
  lackey2: () => talk([['山賊', '嘿嘿，又來了一隻肥羊。']]),
};
function bossEvent() {
  if (F().boss) return;
  keys.clear();
  talk([['黑風寨主', '站住！此路是我開，此樹是我栽——'], ['黑風寨主', '小子，留下買路錢，饒你一條小命！'], [HERO_NAME, '我要往雲山去，請讓開。'],
    ['黑風寨主', '哈哈哈！好大的口氣！弟兄們，給我上！'],
    () => startBattle(['bandit', 'boss', 'bandit'], { boss: true, onWin: () => talk([
      ['黑風寨主', '咳……你這身手……莫非你就是……那個從林子裡冒出來的異鄉人？'],
      ['黑風寨主', '罷了……雲山上的那位，早就在等你了……撤！'],
      '（黑風寨主帶著手下狼狽逃入林中，地上留下了一塊殘破的玉符。）',
      () => { F().boss = 1; give('talisman'); S.fame += 30; toast('獲得「殘缺玉符」 · 江湖聲望 +30'); },
      [HERO_NAME, '這紋路……和道長信封上的符紋一模一樣！'],
    ]) })]);
}
function fieldEnding() {
  talk(['穿過黑風坡，山路漸陡。雲霧從腳下升起，彷彿踏入了另一個世界。', '雲山，就在眼前。',
    '——　第一章「清河村」　完　——',
    () => fade(() => { switchMap('yunshan', 960, 100, 0); toast('雲山'); }, 800)]);
}

// ---------- 野外怪物（明雷：看得見才會遇敵） ----------
const MON_SPEED = { wolf: [45, 125], snake: [25, 70], boar: [35, 115], bandit: [40, 95], treant: [20, 50] }; // [閒逛, 追擊]
const MON_ZONES = [{ y0: 300, y1: 900, n: 5, tier: 0 }, { y0: 900, y1: 1700, n: 6, tier: 1 }, { y0: 1700, y1: 1950, n: 4, tier: 2 }];
const MON_SIGHT = 170, MON_GIVEUP = 330;
let monsters = [], monGrace = 0;
function monsterSafe(x, y) { return Math.hypot(x - F_SHRINE.x, y - F_SHRINE.y) < 260 || y < 300 || y > 1960; }
function spawnMonster(zone) {
  for (let i = 0; i < 200; i++) {
    const y = zone.y0 + Math.random() * (zone.y1 - zone.y0), x = roadCenterX(y) + (Math.random() - 0.5) * 900;
    if (monsterSafe(x, y) || blocked(x, y, {}) || Math.hypot(x - player.x, y - player.y) < 380) continue;
    const tier = ENCOUNTERS[zone.tier], group = tier.groups[(Math.random() * tier.groups.length) | 0];
    // 地圖上顯示隊伍裡最強的那隻
    const kind = group.reduce((a, b) => (ENEMIES[b].hp > ENEMIES[a].hp ? b : a));
    return { mon: true, kind, group, zone, x, y, home: [x, y], dir: 3, fdir: 0, target: null, wait: Math.random() * 3, chase: false, stun: 0, anim: 0, moving: false, dead: false };
  }
  return null;
}
function spawnMonsters() {
  monsters = []; monGrace = 1.5;
  if (params.has('peace')) return;
  for (const z of MON_ZONES) for (let i = 0; i < z.n; i++) { const m = spawnMonster(z); if (m) monsters.push(m); }
}
function moveMon(m, dx, dy, sp, dt) {
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  if (Math.abs(dx) > 0.2) m.dir = dx < 0 ? 2 : 3;
  m.fdir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
  const nx = m.x + dx * sp * dt, ny = m.y + dy * sp * dt; let ok = false;
  if (!blocked(nx, m.y, m) && !monsterSafe(nx, m.y)) { m.x = nx; ok = true; }
  if (!blocked(m.x, ny, m) && !monsterSafe(m.x, ny)) { m.y = ny; ok = true; }
  m.moving = true; m.anim += dt * sp / 15; m.stuck = ok ? 0 : (m.stuck || 0) + dt;
}
function updateMonsters(dt) {
  monGrace = Math.max(0, monGrace - dt);
  for (const m of monsters) {
    if (m.dead) {
      if ((m.respawn -= dt) <= 0) { const n = spawnMonster(m.zone); if (n) Object.assign(m, n); else m.respawn = 5; }
      continue;
    }
    m.stun = Math.max(0, m.stun - dt); m.moving = false;
    const dx = player.x - m.x, dy = player.y - m.y, d = Math.hypot(dx, dy), [ws, cs] = MON_SPEED[m.kind];
    if (!m.stun && !monsterSafe(player.x, player.y) && (d < MON_SIGHT || (m.chase && d < MON_GIVEUP))) { m.chase = true; moveMon(m, dx, dy, cs, dt); }
    else {
      m.chase = false;
      if (m.target) {
        const tx = m.target[0] - m.x, ty = m.target[1] - m.y;
        if (Math.hypot(tx, ty) < 6 || m.stuck > 1) { m.target = null; m.wait = 1 + Math.random() * 3; } else moveMon(m, tx, ty, ws, dt);
      } else if ((m.wait -= dt) <= 0) {
        const a = Math.random() * 6.28, r = Math.random() * 120;
        m.target = [m.home[0] + Math.cos(a) * r, m.home[1] + Math.sin(a) * r * 0.7]; m.stuck = 0;
      }
    }
    if (!m.stun && !monGrace && d < 34) return touchMonster(m);
  }
}
function touchMonster(m) {
  keys.clear(); m.chase = false;
  startBattle(m.group, { onResult: (r) => {
    monGrace = 1.5;
    if (r === 'flee') m.stun = 4;
    else { m.dead = true; m.respawn = r === 'win' ? 60 : 20; }
  } });
}
function drawMonster(m, t) {
  const a = enemyArt(m.kind), x = Math.round(m.x - cam.x), y = Math.round(m.y - cam.y);
  const alpha = ctx.globalAlpha;
  if (m.stun > 0 && Math.floor(t / 110) % 2) ctx.globalAlpha = alpha * 0.4;
  ctx.fillStyle = 'rgba(15,20,12,.4)'; ctx.beginPath(); ctx.ellipse(x, y, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
  let top;
  const mw = MON_ART[m.kind] && MON_ART[m.kind].walk;
  if (mw) {
    const sc = 1.35, sz = 64 * sc, fr = m.moving ? Math.floor(m.anim) % 8 : 0;
    ctx.drawImage(mw, fr * 96, m.fdir * 96, 96, 96, x - sz / 2, y - FOOT * sc, sz, sz);
    top = y - (m.kind === 'bandit' ? 72 : m.kind === 'treant' ? 68 : 50);
  } else if (a.sheet) {
    const sc = 1.35, sz = 64 * sc, fr = m.moving ? Math.floor(m.anim) % 8 : 0;
    ctx.drawImage(a.sheet, fr * CHAR_FW, m.fdir * CHAR_FW, CHAR_FW, CHAR_FW, x - sz / 2, y - FOOT * sc, sz, sz); top = y - 72;
  } else {
    const sc = (a.scale || 1) * (m.kind === 'treant' ? 0.5 : 0.5), hop = m.moving ? Math.abs(Math.sin(m.anim * 1.4)) * 3 : 0;
    ctx.save(); ctx.translate(x, y - hop); if (m.dir === 2) ctx.scale(-1, 1);
    ctx.drawImage(a.img, -a.ax * sc, -a.ay * sc, a.img.width * sc, a.img.height * sc); ctx.restore();
    top = y - a.ay * sc - 4;
  }
  ctx.globalAlpha = alpha;
  if (m.group.length > 1) {
    ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1a1510d0'; ctx.beginPath(); ctx.roundRect(x + 10, top + 2, 26, 16, 4); ctx.fill();
    ctx.fillStyle = '#ffd36a'; ctx.fillText('×' + m.group.length, x + 23, top + 10);
  }
  if (m.chase) {
    const by = top - 14 + Math.sin(t / 90) * 2;
    ctx.fillStyle = '#c0281e'; ctx.beginPath(); ctx.roundRect(x - 10, by - 12, 20, 22, 5); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', x, by);
  }
}
