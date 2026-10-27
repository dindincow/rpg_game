'use strict';
// 村西野林 — 村外森林（黑松林）與清河村西村口之間的一片雜木林；第 2 章林道救援在這裡發生
// 1800×1100：西邊接村外森林的東出口 → 林道往東蜿蜒 → 中段偏東的空地（沈若蘭被惡徒圍堵）→ 東邊出口通往清河村西村口
// 比黑松林亮、樹種雜：松樹少，多闊葉樹、秋葉樹與灌木叢
const WWW = 1800, WWH = 1100;
const WW_ROAD = [[0, 620], [220, 600], [420, 640], [640, 600], [860, 540], [1080, 520], [1300, 560], [1520, 520], [1800, 500]];
const WW_WEST = { x: 20, y: 620 }, WW_EAST = { x: WWW - 20, y: 500 };
// 空地：救援現場（若蘭與兩名惡徒）、觀察點、入口
const WW_SITE = { x: 1150, y: 500 };
// 第 2 章藏身的大樹（觀察點東側，擋住惡徒的視線）與樹旁的灌木
const WW_HIDE_TREE = { x: 898, y: 561 }, WW_HIDE_BUSH = { x: 934, y: 577 };
// 惡徒南側的灌木（第 2 章投石的目標）；ch02.js 會讓它在被打中時左右晃
const WW_THROW_BUSH = { x: 1170, y: 650 };
let wwThrowBush = null;
const WW_CLEARINGS = [[WW_SITE.x, WW_SITE.y + 10, 230], [140, 610, 120], [930, 545, 90], [1630, 515, 110]];

function wwRoad(px, py, jitter) {
  let edge = -1;
  for (let i = 1; i < WW_ROAD.length; i++) edge = Math.max(edge, 26 + jitter - segDist(px, py, WW_ROAD[i - 1][0], WW_ROAD[i - 1][1], WW_ROAD[i][0], WW_ROAD[i][1]));
  return [edge > 0 ? 1 : 0, edge];
}
function wwClearing(px, py) {
  let v = -9;
  for (const [x, y, r] of WW_CLEARINGS) v = Math.max(v, 1 - Math.hypot(px - x, (py - y) * 1.2) / r);
  return v;
}
function wildPixel(out, px, py, cx, cy, n, h, hb) {
  const [road, edge] = wwRoad(px, py, (n - 0.5) * 12);
  const cl = wwClearing(px, py);
  if (road) { out[0] = MAT.DIRT; colDirt(out, n, h, hb, edge, true); }
  else if (cl > 0.5 && hb > 0.3 + (1 - cl) * 0.8) { out[0] = MAT.DIRT; colDirt(out, n, h, hb, 99, false); }
  else {
    // 野林的草比黑松林亮一些
    out[0] = MAT.GRASS; colGrass(out, px, py, n, hb, cl > 0 ? -0.1 : -0.5);
    if (hb > 0.97 && cl <= 0) { out[1] = 160; out[2] = 110; out[3] = 40; }
  }
}

function buildWild() {
  const info = buildGround(WWW, WWH, wildPixel);
  applyTiles(info, WWW, WWH);
  const G = { id: 'wildwood', name: '村西野林', W: WWW, H: WWH, ground: info.canvas, groundInfo: info, sprites: [], solids: [], circles: [], lights: [], shimmers: [], buildings: [], chests: {} };
  G.water = () => false;
  const gctx = info.ctx, R = rng(5821);
  const shadow = (x, y, rx, ry, a = 0.3) => { gctx.fillStyle = `rgba(16,22,10,${a})`; gctx.beginPath(); gctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); gctx.fill(); };
  const addSprite = (s, x, y) => { const o = { img: s.img, x, y, ax: s.ax, ay: s.ay }; G.sprites.push(o); return o; };
  stampDecor(gctx, matAt, G, R, WWW, WWH, 200);
  // 野花與雜草
  for (let i = 0; i < 1300; i++) {
    const x = R() * WWW, y = R() * WWH; if (matAt(G, x, y) !== MAT.GRASS) continue;
    gctx.fillStyle = i % 5 === 0 ? ['#f2ead0', '#f0d060', '#e08a9a', '#b090d8'][i % 4] : R() > 0.5 ? '#3a4a1c' : '#8a9a48';
    gctx.fillRect(x | 0, y | 0, 2, i % 5 === 0 ? 2 : 4); gctx.fillRect((x | 0) + 3, (y | 0) + 1, 2, 3);
  }
  // 樹：林道與空地保持看得見（樹冠往上長，樹根在路下方一段距離內會蓋住路面）
  const trees = [], seen = [];
  for (let i = 1; i < WW_ROAD.length; i++) {
    const [x0, y0] = WW_ROAD[i - 1], [x1, y1] = WW_ROAD[i], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 30);
    for (let k = 0; k <= n; k++) seen.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
  }
  const ok = (x, y, minD) => {
    if (x < 10 || x > WWW - 10 || y < 30 || y > WWH) return false;
    if (wwRoad(x, y, 26 + minD * 0.5)[0]) return false;
    const crown = minD > 60 ? 175 : 55;
    for (const [px, py] of seen) if (Math.abs(x - px) < 80 && y - py > -25 && y - py < crown) return false;
    if (wwClearing(x, y) > -0.1) return false;
    for (const t of trees) if (Math.hypot(x - t[0], (y - t[1]) * 1.4) < minD) return false;
    return true;
  };
  for (let i = 0; i < 12000 && trees.length < 230; i++) {
    const x = R() * WWW, y = 30 + R() * WWH;
    if (!ok(x, y, 80)) continue;
    trees.push([x, y, R() < 0.2 ? 'pine' : R() < 0.55 ? 'green' : 'autumn']);
  }
  for (const [x, y, k] of trees) {
    const t = decorTree(k, R); shadow(x + 4, y - 2, t.shadow, t.shadow * 0.32);
    addSprite(t, Math.round(x), Math.round(y)); G.circles.push([x, y - 4, t.cr]);
  }
  // 灌木叢比黑松林多
  for (let i = 0; i < 5000 && trees.length < 560; i++) {
    const x = R() * WWW, y = 30 + R() * WWH;
    if (!ok(x, y, 42)) continue;
    trees.push([x, y, 'bush']);
    const t = decorTree(R() < 0.5 ? 'bush' : 'bushA', R); shadow(x, y - 2, t.shadow, t.shadow * 0.28, 0.22); addSprite(t, Math.round(x), Math.round(y));
  }
  // 藏身大樹：空地不長樹，這棵另外種
  { const t = decorSprite('綠樹', 2); shadow(WW_HIDE_TREE.x + 4, WW_HIDE_TREE.y - 2, t.shadow, t.shadow * 0.32); addSprite(t, WW_HIDE_TREE.x, WW_HIDE_TREE.y); G.circles.push([WW_HIDE_TREE.x, WW_HIDE_TREE.y - 4, t.cr]);
    const b = decorSprite('灌木', 2); shadow(WW_HIDE_BUSH.x, WW_HIDE_BUSH.y - 2, b.shadow, b.shadow * 0.28, 0.22); addSprite(b, WW_HIDE_BUSH.x, WW_HIDE_BUSH.y);
    const tb = decorSprite('灌木', 0); shadow(WW_THROW_BUSH.x, WW_THROW_BUSH.y - 2, tb.shadow, tb.shadow * 0.28, 0.22); wwThrowBush = addSprite(tb, WW_THROW_BUSH.x, WW_THROW_BUSH.y); }
  const [mini, mg] = canvas(Math.round(WWW / 12), Math.round(WWH / 12));
  mg.imageSmoothingEnabled = true; mg.drawImage(G.ground, 0, 0, mini.width, mini.height);
  for (const [x, y, k] of trees) { mg.fillStyle = k === 'bush' ? '#2f4a1c88' : '#16281acc'; mg.fillRect(x / 12 - 1, y / 12 - 3, 3, 3); }
  G.mini = mini;
  G.npcs = [];
  return G;
}

// 出入口：西邊回村外森林；東邊到清河村西村口（第 2 章隨老吳進過村子之後才走得通，之前由劇情事件帶進村）
function wildTriggers() {
  if (player.x < 30 && Math.abs(player.y - WW_WEST.y) < 120) { keys.clear(); return fade(() => { switchMap('forest', FOW - 60, FO_EXIT.y, 2); toast('村外森林'); }); }
  if (F().ch1_wolves && player.x > WWW - 30 && Math.abs(player.y - WW_EAST.y) < 120) { keys.clear(); return fade(() => { switchMap('village', 200, 800 + VN, 3); toast('清河村'); }); }
}

// 清晨薄霧：整片淡淡的白霧底色，加上十幾團較濃的霧在畫面各處（上、中、下）慢慢往東飄
// 霧團位置以畫面座標為主、只跟鏡頭移動一點點（視差），所以不管走到哪裡，整個畫面都罩著霧
// 第一次畫的時候才建立（這支檔案比 game.js 先載入，載入當下還沒有 VW、VH）
let WW_MIST = null;
const makeMist = () => Array.from({ length: 16 }, (_, i) => ({ x: (i * 211) % (VW + 500), y: ((i * 7) % 16) / 15 * VH, r: 150 + (i % 4) * 45, sp: 8 + (i % 5) * 3, ph: i * 1.3 }));
// 霧先畫在另一張畫布上，再沿著林道挖掉（中間全清、往外漸濃），林道上看得清楚，兩側樹林才有霧
let mistCv = null;
function drawMist(t) {
  if (!WW_MIST) { WW_MIST = makeMist(); mistCv = canvas(VW, VH); }
  const [mc, g] = mistCv, s = t / 1000;
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, VW, VH);
  g.fillStyle = 'rgba(225,232,228,.1)'; g.fillRect(0, 0, VW, VH);
  for (const m of WW_MIST) {
    const x = ((m.x + s * m.sp - cam.x * 0.15) % (VW + 500) + VW + 500) % (VW + 500) - 250, y = m.y + Math.sin(s / 6 + m.ph) * 18 - (cam.y * 0.15) % 40;
    const a = 0.22 + Math.sin(s / 4 + m.ph) * 0.06, gr = g.createRadialGradient(x, y, 0, x, y, m.r);
    gr.addColorStop(0, `rgba(235,240,236,${a})`); gr.addColorStop(0.6, `rgba(235,240,236,${a * 0.45})`); gr.addColorStop(1, 'rgba(235,240,236,0)');
    g.save(); g.translate(x, y); g.scale(2, 0.6); g.translate(-x, -y);
    g.fillStyle = gr; g.fillRect(x - m.r, y - m.r, m.r * 2, m.r * 2); g.restore();
  }
  g.globalCompositeOperation = 'destination-out'; g.lineCap = g.lineJoin = 'round';
  for (const [w, a] of [[220, 0.3], [170, 0.5], [120, 0.8], [80, 1]]) {
    g.strokeStyle = `rgba(0,0,0,${a})`; g.lineWidth = w; g.beginPath();
    WW_ROAD.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, x - cam.x, y - cam.y));
    g.stroke();
  }
  ctx.drawImage(mc, 0, 0, VW, VH);
}
