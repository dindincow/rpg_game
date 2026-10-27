'use strict';
// 礦山隧道 — 村外森林西北邊的舊礦坑：主坑道往北直通被封死的深處，東西兩條支坑各有一處礦室
// 素材 assets/mine/<名稱>.png（tools/crop_parts.js 從 assets/mine/原稿/礦山.png 裁出）
const MW = 1280, MH = 1000;
const MINE_ART_NAMES = ['礦坑入口', '礦坑_封', '鐵軌', '木架', '吊燈', '礦車', '鶴嘴鋤', '木箱', '木桶', '麻袋', '石堆_大', '礦石_甲', '礦石_乙', '礦石_丙'];
const MINE_ART = {};
const ROCK_NAMES = ['岩山1', '岩山2', '岩山3', '岩山4', '岩山5', '岩坡左', '岩坡右', '岩坡下右', '岩坡上右', '巨石1', '巨石2', '巨石3', '巨石4', '碎石1', '碎石2', '碎石3', '土丘1', '土丘2', '土丘3', '土石堆1', '土石堆2', '土石堆3'];
const ROCK_ART = {};
// 坑道：[x1, y1, x2, y2, 半寬]；礦室：[x, y, 半徑]
const MI_TUNNELS = [[640, MH + 40, 640, 200, 72], [640, 720, 980, 640, 54], [640, 470, 300, 420, 54]];
const MI_ROOMS = [[640, 170, 130], [1060, 620, 135], [230, 400, 125], [640, 880, 110]];
const MI_EXIT = { x: 640, y: MH - 30 };
const MI_PICK = { x: 712, y: 905 };
const MI_ORES = [[1010, 540, 'iron'], [1150, 560, 'iron'], [1120, 710, 'coal'], [170, 330, 'iron'], [300, 340, 'coal'], [160, 470, 'iron'], [560, 140, 'coal'], [735, 150, 'iron']];

// 離坑道多遠：<0 在坑內
function mineWall(px, py) {
  let d = 1e9;
  for (const [x1, y1, x2, y2, hw] of MI_TUNNELS) d = Math.min(d, segDist(px, py, x1, y1, x2, y2) - hw);
  for (const [x, y, r] of MI_ROOMS) d = Math.min(d, Math.hypot(px - x, (py - y) * 1.15) - r);
  return d + (fbm(px / 40 + 3, py / 40) - 0.5) * 34;
}
function minePixel(out, px, py, cx, cy, n, h, hb) {
  const w = mineWall(px, py);
  if (w > 0) {
    // 岩壁：上方是岩石、下方是坑道時畫出朝南的岩面
    out[0] = MAT.ROCK;
    const face = mineWall(px, py + 26) < 0, v = 46 + n * 30 + (hash2(cx >> 2, cy >> 2) - 0.5) * 14;
    if (face) { const k = 1.1 + ((px / 7 | 0) % 3) * 0.06; out[1] = v * k + 10; out[2] = v * k * 0.9 + 6; out[3] = v * k * 0.78; if ((py + (px / 18 | 0) * 4) % 14 < 2) { out[1] -= 16; out[2] -= 14; out[3] -= 12; } }
    else { out[1] = v * 0.62; out[2] = v * 0.58; out[3] = v * 0.52; if (hb > 0.93) { out[1] += 18; out[2] += 16; out[3] += 12; } }
    return;
  }
  // 坑道地面：深色碎石土，牆腳較暗
  out[0] = MAT.BANK;
  const v = 70 + n * 34 + (h > 0.9 ? 16 : h < 0.06 ? -14 : 0);
  out[1] = v * 1.05; out[2] = v * 0.92; out[3] = v * 0.74;
  if (w > -14) { out[1] *= 0.7; out[2] *= 0.7; out[3] *= 0.7; }
}
function buildMine() {
  const info = buildGround(MW, MH, minePixel);
  const G = { id: 'mine', name: '礦山隧道', cave: true, W: MW, H: MH, ground: info.canvas, groundInfo: info, sprites: [], solids: [], circles: [], lights: [], shimmers: [], buildings: [], chests: {} };
  G.water = (x, y) => matAt(G, x, y) === MAT.ROCK || matAt(G, x, y) === -1;
  const gctx = info.ctx, R = rng(5150), A = MINE_ART;
  const addSprite = (s, x, y) => { const o = { img: s.img, x, y, ax: s.ax, ay: s.ay }; G.sprites.push(o); return o; };
  const art = (name) => ({ img: A[name], ax: A[name].width / 2, ay: A[name].height - 3 });
  const shadow = (x, y, rx, ry) => { gctx.fillStyle = 'rgba(0,0,0,.35)'; gctx.beginPath(); gctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); gctx.fill(); };
  // 主坑道的鐵軌（直接印在地面上）
  gctx.imageSmoothingEnabled = false;
  for (let y = MH; y > 230; y -= A.鐵軌.height - 4) gctx.drawImage(A.鐵軌, 640 - A.鐵軌.width / 2, y - A.鐵軌.height);
  // 碎石
  for (let i = 0; i < 500; i++) {
    const x = R() * MW, y = R() * MH; if (matAt(G, x, y) !== MAT.BANK) continue;
    gctx.fillStyle = R() < 0.5 ? '#2a241c' : '#6a6050'; gctx.fillRect(x | 0, y | 0, 2 + (R() * 3 | 0), 2);
  }
  // 支撐木架與吊燈
  for (const y of [960, 760, 560, 340]) { addSprite(art('木架'), 640, y); G.circles.push([640 - 52, y - 4, 9], [640 + 52, y - 4, 9]); }
  for (const [x, y] of [[548, 900], [732, 650], [548, 420], [735, 250], [990, 580], [290, 360], [470, 160]]) {
    addSprite(art('吊燈'), x, y); G.circles.push([x - 8, y - 4, 8]);
    G.lights.push({ x: x + 10, y: y - 52, r: 190, c: '255,170,80' });
  }
  // 深處：被木板封死的坑口
  addSprite(art('礦坑_封'), 640, 110); G.solids.push([640 - 90, 0, 640 + 90, 108]);
  // 東礦室：礦車、木箱；西礦室：石堆
  addSprite(art('礦車'), 1135, 640); G.circles.push([1135, 636, 26]);
  addSprite(art('木箱'), 1180, 690); addSprite(art('木桶'), 1205, 660); G.circles.push([1180, 686, 14], [1205, 656, 12]);
  addSprite(art('石堆_大'), 200, 500); G.circles.push([200, 494, 50]);
  addSprite(art('麻袋'), 760, 960); addSprite(art('木桶'), 520, 950); G.circles.push([760, 956, 10], [520, 946, 12]);
  // 入口旁的鶴嘴鋤（撿起來就學會採礦）
  G.pick = addSprite(art('鶴嘴鋤'), MI_PICK.x, MI_PICK.y);
  // 礦石
  const rocks = ['礦石_甲', '礦石_乙', '礦石_丙'];
  MI_ORES.forEach(([x, y, kind], i) => { shadow(x, y - 2, 24, 7); addGather(G, addSprite, kind, x, y, 'ore' + i, makeOre(kind, A[rocks[i % 3]], 31 + i)); G.circles.push([x, y - 6, 16]); });
  const [mini, mg] = canvas(Math.round(MW / 12), Math.round(MH / 12));
  mg.imageSmoothingEnabled = true; mg.drawImage(G.ground, 0, 0, mini.width, mini.height);
  G.mini = mini;
  return G;
}

// ---------- 互動與劇情 ----------
function mineInteractables() {
  return [
    ...gatherInteractables(),
    { x: MI_PICK.x, y: MI_PICK.y, r: 50, name: '鶴嘴鋤', act: takePickaxe, spark: () => !has('pickaxe') },
    { x: 640, y: 160, r: 90, name: '封死的坑口', act: () => talk(['坑道深處被木板封得死死的，木板上用炭寫著「塌方危險，禁止入內」。', '木縫裡透出一陣陣涼風，隱約還有滴水聲……']) },
    { x: 1135, y: 650, r: 60, name: '礦車', act: () => talk(['生鏽的礦車裡還剩半車碎石。輪子卡死了，推不動。']) },
  ];
}
function takePickaxe() {
  if (has('pickaxe')) return;
  G.pick.img = canvas(1, 1)[0];
  give('pickaxe');
  talk(['（地上躺著一把鶴嘴鋤，鋤柄被磨得發亮，鐵頭倒還結實。）', [HERO_NAME, '礦坑、鶴嘴鋤……這不就是挖礦的標準配備嗎。'],
    '你學著礦工的樣子掄了幾下，找到了敲礦的訣竅。', () => [learnSpec('gather', 'mining')], () => toast('獲得「鶴嘴鋤」 · 習得「採礦」')]);
}
function applyMineFlags(Gm) {
  applyGather(Gm);
  if (has('pickaxe')) Gm.pick.img = canvas(1, 1)[0];
}
function mineTriggers() {
  if (player.y > MH - 24) { keys.clear(); fade(() => { switchMap('forest', FO_MINE.x, FO_MINE.y + 40, 0); toast('村外森林'); }); }
}
