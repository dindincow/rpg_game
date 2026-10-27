'use strict';
// 第二章「雲山」─ 霧氣瀰漫的古山道（凌霄：守山人、問天道長的弟子；三十年前曾有另一個異鄉人來過）
const YW = 1920, YH = 3000;
const Y_ROAD = [[960,0],[940,200],[990,480],[960,800],[900,1100],[950,1300],[1000,1600],[950,1900],[960,2150],[980,2400],[960,2700],[960,3000]];
const Y_SHRINE = { x: 960, y: 800 };
const Y_STATION = { x: 960, y: 1900 };
const Y_PAVILION = { x: 960, y: 2400 };
const Y_BOSS = { x: 960, y: 2700 };
const Y_CLEARINGS = [[960,80,210],[Y_SHRINE.x,Y_SHRINE.y,180],[Y_STATION.x,Y_STATION.y,200],[Y_PAVILION.x,Y_PAVILION.y,220],[Y_BOSS.x,Y_BOSS.y,250]];
const Y_CHESTS = [
  { id: 'yc1', x: 692, y: 620, gold: 40, items: [['herb', 1]] },
  { id: 'yc2', x: 1248, y: 1440, gold: 60, items: [['tea', 1]] },
  { id: 'yc3', x: 780, y: 2020, gold: 80, items: [['spirit_tea', 1]] },
];

function yunRoadCenterX(y) {
  for (let i = 1; i < Y_ROAD.length; i++) {
    const [ax, ay] = Y_ROAD[i-1], [bx, by] = Y_ROAD[i];
    if (y <= by) return ax + (bx - ax) * Math.max(0, (y - ay) / (by - ay));
  }
  return Y_ROAD[Y_ROAD.length-1][0];
}
function yunRoadAt(px, py, jitter) {
  let edge = -1;
  for (let i = 1; i < Y_ROAD.length; i++) edge = Math.max(edge, 26 + jitter - segDist(px, py, Y_ROAD[i-1][0], Y_ROAD[i-1][1], Y_ROAD[i][0], Y_ROAD[i][1]));
  return [edge > 0 ? 1 : 0, edge];
}
function yunClearing(px, py) {
  let v = -9;
  for (const [x, y, r] of Y_CLEARINGS) v = Math.max(v, 1 - Math.hypot(px - x, (py - y) * 1.2) / r);
  return v;
}
function yunRockValue(px, py) {
  const n = fbm(px / 100 + 17, py / 100 + 3);
  const side = Math.abs(px - yunRoadCenterX(py)) - (430 + 85 * Math.sin(py / 370 + 2) + 44 * Math.sin(py / 115)) + (n - 0.5) * 110;
  let cliff = -1;
  if (yunClearing(px, py) < -0.45 && py > 40) { const rd = Math.abs(px - yunRoadCenterX(py)); if (rd > 140) cliff = (fbm(px / 140 + 40, py / 140 + 5) - 0.71) * 850; }
  return Math.max(side, cliff);
}
function yunPixel(out, px, py, cx, cy, n, h, hb) {
  const rv = yunRockValue(px, py);
  if (rv > 0) {
    out[0] = MAT.ROCK;
    const s = 0.72 + hash2(cx >> 2, cy >> 3) * 0.32;
    out[1] = (62 + n * 40) * s; out[2] = (60 + n * 36) * s; out[3] = (68 + n * 36) * s;
    if (rv < 4) { out[1] = 34; out[2] = 34; out[3] = 40; } else if (rv < 9) { out[1] += 18; out[2] += 16; out[3] += 22; }
    return;
  }
  if (yunRockValue(px, py - 32) > 0) {
    out[0] = MAT.ROCK;
    const v = 44 + ((px / 6) | 0) % 3 * 7 + n * 22;
    out[1] = v * 0.80; out[2] = v * 0.82; out[3] = v * 0.88; return;
  }
  const [road, edge] = yunRoadAt(px, py, (n - 0.5) * 12);
  const cl = yunClearing(px, py);
  if (road) {
    out[0] = MAT.COBBLE; colCobble(out, px, py, edge);
    out[1] = Math.round(out[1] * 0.74); out[2] = Math.round(out[2] * 0.72); out[3] = Math.round(out[3] * 0.68);
  } else if (cl > 0.4) {
    out[0] = MAT.DIRT; colDirt(out, n, h, hb, 99, false);
    out[1] = Math.round(out[1] * 0.88); out[2] = Math.round(out[2] * 0.85); out[3] = Math.round(out[3] * 0.80);
  } else {
    out[0] = MAT.GRASS; colGrass(out, px, py, n, hb, -1.8);
    if (hb > 0.96) { out[1] = 56; out[2] = 82; out[3] = 52; }
  }
  if (yunRockValue(px, py - 54) > 0) { out[1] = Math.round(out[1] * 0.56); out[2] = Math.round(out[2] * 0.58); out[3] = Math.round(out[3] * 0.64); }
}

// ---------- 場景道具 ----------
function makeTeaStall() {
  const [c, g] = canvas(180, 120); const by = 114;
  g.fillStyle = '#00000038'; g.beginPath(); g.ellipse(90, by, 80, 13, 0, 0, Math.PI * 2); g.fill();
  for (const px of [14, 156]) { g.fillStyle = '#4a3220'; g.fillRect(px, 36, 10, by - 36); g.fillStyle = '#6a4e32'; g.fillRect(px + 2, 36, 4, by - 40); }
  poly(g, [[0,42],[90,10],[180,42],[170,52],[10,52]], '#5e4228');
  poly(g, [[6,46],[90,16],[174,46]], '#7e5a38');
  g.fillStyle = '#4a3220'; for (let x = 18; x < 164; x += 8) g.fillRect(x, 18, 3, 28);
  g.fillStyle = '#5a3a1e'; g.fillRect(14, 74, 152, 14); g.fillStyle = '#7a5230'; g.fillRect(14, 74, 152, 4);
  g.fillStyle = '#2e1c0e'; g.fillRect(70, 52, 40, 24); g.fillStyle = '#9a7448'; g.fillRect(72, 54, 36, 20);
  g.fillStyle = '#1e140c'; g.font = 'bold 9px "Noto Serif TC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('霧婆茶棚', 90, 64);
  return { img: c, ax: 90, ay: by };
}
function makePavilion() {
  const [c, g] = canvas(180, 160); const by = 154;
  g.fillStyle = '#00000038'; g.beginPath(); g.ellipse(90, by, 78, 14, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#6a6050'; g.fillRect(10, by - 22, 160, 20); g.fillStyle = '#8a7e6a'; g.fillRect(10, by - 22, 160, 5);
  for (const px of [16, 152]) { g.fillStyle = '#7a5e44'; g.fillRect(px, 62, 12, by - 78); g.fillStyle = '#9a7a58'; g.fillRect(px + 2, 62, 5, by - 80); }
  poly(g, [[0,66],[90,18],[180,66],[164,76],[16,76]], '#2a2e38');
  g.fillStyle = '#3c4250'; for (let x = 20; x < 162; x += 7) g.fillRect(x, 26, 3, 44);
  g.fillStyle = '#1c2028'; g.fillRect(12, 60, 156, 8); g.fillRect(0, 60, 8, 14); g.fillRect(172, 60, 8, 14);
  g.fillStyle = '#c9a45c'; g.fillRect(14, 66, 152, 3);
  g.fillStyle = '#6a5038'; g.fillRect(16, by - 38, 148, 5);
  for (let rx = 22; rx < 148; rx += 14) g.fillRect(rx, by - 50, 4, 16);
  return { img: c, ax: 90, ay: by };
}
function makeStoneTablet(l1, l2) {
  const [c, g] = canvas(60, 90);
  g.fillStyle = '#00000030'; g.beginPath(); g.ellipse(30, 86, 22, 5, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#6a6460'; g.fillRect(10, 14, 40, 70); g.fillStyle = '#8a8480'; g.fillRect(10, 14, 40, 5);
  g.fillStyle = '#55504c'; g.fillRect(12, 82, 36, 4);
  poly(g, [[8,16],[30,6],[52,16]], '#555050');
  g.fillStyle = '#3a3632'; g.font = 'bold 10px "Noto Serif TC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(l1, 30, 38); g.fillText(l2, 30, 56);
  return { img: c, ax: 30, ay: 86 };
}

// ---------- 組合地圖 ----------
function buildYunshan() {
  const info = buildGround(YW, YH, yunPixel);
  applyTiles(info, YW, YH);
  const G = { id: 'yunshan', name: '雲山', W: YW, H: YH, ground: info.canvas, groundInfo: info,
    sprites: [], solids: [], circles: [], lights: [], shimmers: [], buildings: [], chests: {} };
  G.water = (x, y) => matAt(G, x, y) === MAT.ROCK;
  const gctx = info.ctx, R = rng(9527);
  const shadow = (x, y, rx, ry, a = 0.30) => { gctx.fillStyle = `rgba(12,18,8,${a})`; gctx.beginPath(); gctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); gctx.fill(); };
  const addSprite = (s, x, y) => { const o = { img: s.img, x, y, ax: s.ax, ay: s.ay }; G.sprites.push(o); return o; };
  stampDecor(gctx, matAt, G, R, YW, YH, 120);

  const stall = makeTeaStall();
  shadow(Y_SHRINE.x - 40, Y_SHRINE.y, 72, 14, 0.22); addSprite(stall, Y_SHRINE.x - 40, Y_SHRINE.y);
  G.solids.push([Y_SHRINE.x - 120, Y_SHRINE.y - 44, Y_SHRINE.x + 42, Y_SHRINE.y]);
  G.lights.push({ x: Y_SHRINE.x - 40, y: Y_SHRINE.y - 30, r: 150, c: '255,200,120' });

  const pav = makePavilion();
  shadow(Y_PAVILION.x, Y_PAVILION.y, 68, 14, 0.24); addSprite(pav, Y_PAVILION.x, Y_PAVILION.y);
  G.solids.push([Y_PAVILION.x - 80, Y_PAVILION.y - 60, Y_PAVILION.x + 80, Y_PAVILION.y - 10]);
  G.lights.push({ x: Y_PAVILION.x, y: Y_PAVILION.y - 50, r: 130, c: '200,220,255' });

  for (const [ox, oy] of [[-70,-20],[70,-20],[-50,-55],[50,-55]]) {
    const [pc, pg] = canvas(40, 90);
    pg.fillStyle = '#4a4840'; pg.fillRect(6, 0, 28, 84); pg.fillStyle = '#6a6858'; pg.fillRect(8, 0, 14, 84);
    pg.fillStyle = '#3a3830'; pg.fillRect(6, 0, 28, 4); pg.fillRect(6, 80, 28, 4);
    const ps = { img: pc, ax: 20, ay: 84 };
    shadow(Y_STATION.x + ox, Y_STATION.y + oy, 16, 5, 0.20); addSprite(ps, Y_STATION.x + ox, Y_STATION.y + oy);
    G.circles.push([Y_STATION.x + ox, Y_STATION.y + oy - 40, 16]);
  }

  const tab = makeStoneTablet('凌氏守山', '代代不息');
  addSprite(tab, 960, 250); G.circles.push([960, 240, 32]); G.solids.push([940, 200, 980, 260]);

  addSprite(makeSign('入山謹慎'), 1040, 160); G.circles.push([1040, 156, 8]);
  addSprite(makeSign('問心亭'), 1080, Y_PAVILION.y - 300); G.circles.push([1080, Y_PAVILION.y - 304, 8]);

  G.chestImg = [makeChest(false).img, makeChest(true).img];
  for (const ch of Y_CHESTS) { G.chests[ch.id] = addSprite(makeChest(false), ch.x, ch.y); G.circles.push([ch.x, ch.y - 8, 16]); }

  const trees = [];
  const ok = (x, y, minD) => {
    if (x < 10 || x > YW - 10 || y < 30 || y > YH) return false;
    if (yunRoadAt(x, y, 30 + minD * 0.5)[0] || yunClearing(x, y) > -0.05) return false;
    for (const t of trees) if (Math.hypot(x - t[0], (y - t[1]) * 1.4) < minD) return false;
    return true;
  };
  for (let i = 0; i < 8000 && trees.length < 280; i++) {
    const x = R() * YW, y = 30 + R() * YH;
    if (!ok(x, y, 80)) continue;
    const rock = matAt(G, x, y) === MAT.ROCK;
    trees.push([x, y, rock ? 'pine' : R() < 0.55 ? 'pine' : R() < 0.5 ? 'maple' : 'autumn']);
  }
  for (const [x, y, k] of trees) {
    const t = decorTree(k, R); shadow(x + 3, y - 2, t.shadow, t.shadow * 0.30);
    addSprite(t, Math.round(x), Math.round(y)); G.circles.push([x, y - 4, t.cr]);
  }
  for (let i = 0; i < 1400 && trees.length < 460; i++) {
    const x = R() * YW, y = 30 + R() * YH;
    if (!ok(x, y, 45) || matAt(G, x, y) === MAT.ROCK) continue;
    trees.push([x, y, 'bush']);
    if (R() < 0.18) { const r2 = decorSprite(['岩石','石堆','大岩石'][(R() * 3) | 0], R() < 0.5 ? 1 : 0); shadow(x, y - 4, r2.shadow, r2.shadow * 0.24, 0.24); addSprite(r2, Math.round(x), Math.round(y)); G.circles.push([x, y - 10, r2.cr]); }
    else { const t = decorTree(R() < 0.6 ? 'bush' : 'bushA', R); shadow(x, y - 2, t.shadow, t.shadow * 0.25, 0.22); addSprite(t, Math.round(x), Math.round(y)); }
  }

  const [mini, mg] = canvas(Math.round(YW / 12), Math.round(YH / 12));
  mg.imageSmoothingEnabled = true; mg.drawImage(G.ground, 0, 0, mini.width, mini.height);
  for (const [x, y, k] of trees) { mg.fillStyle = k === 'bush' ? '#2a3e1888' : '#18281acc'; mg.fillRect(x / 12 - 1, y / 12 - 3, 3, 3); }
  G.mini = mini;
  return G;
}

// ---------- NPC ----------
const YUNSHAN_NPC_DEFS = [
  { id: 'fogma', name: '霧婆', x: Y_SHRINE.x - 10, y: Y_SHRINE.y - 30, dir: 2,
    filter: 'grayscale(.75) brightness(1.3) sepia(.2)', scale: 1.3, wander: 30, speed: 18 },
  { id: 'lingxiao', name: '凌霄', x: Y_PAVILION.x - 50, y: Y_PAVILION.y - 10, dir: 3,
    filter: 'brightness(.65) hue-rotate(190deg) saturate(.7) contrast(1.15)', scale: 1.45 },
];

// ---------- 互動 ----------
function yunInteractables() {
  return [
    { x: 960, y: 256, r: 60, name: '石碑', act: () => talk(['（石碑上鐫刻著：「凌氏守山，代代不息」。底部的小字已被苔蘚掩蓋。）', '（守山的一族……道長信上的「故人」，會不會就在這山裡？）']) },
    { x: 1040, y: 170, r: 55, name: '路牌', act: () => talk(['木牌上寫著：「北：雲山官道　南：雲山深處」，牌邊刻著「入山謹慎」四字。']) },
    { x: 1080, y: Y_PAVILION.y - 290, r: 55, name: '路牌', act: () => talk(['木牌上寫著：「前方百步　問心亭」。']) },
    { x: Y_STATION.x, y: Y_STATION.y - 30, r: 100, name: '廢棄驛站', act: () => talk(['（昔日驛站只剩幾根殘柱，壁上隱約有壁畫——雲霧中一座古城，城門嵌著三塊玉石。）']) },
    ...Y_CHESTS.map((ch) => ({ x: ch.x, y: ch.y + 10, r: 50, name: '寶箱', act: () => openYunChest(ch) })),
  ];
}
function openYunChest(ch) {
  if (F()['chest_' + ch.id]) return talk(['寶箱已空。']);
  F()['chest_' + ch.id] = 1;
  animateChestOpen(G.chests[ch.id]);
  const got = [];
  if (ch.gold) { S.gold += ch.gold; got.push(ch.gold + ' 文'); }
  for (const [id, n] of ch.items) { give(id, n); got.push(`${ITEMS[id].name} ×${n}`); }
  talk([`（打開寶箱，獲得 ${got.join('、')}。）`]);
}
function applyYunshanFlags(Gf) {
  for (const ch of Y_CHESTS) if (Gf.chests[ch.id]) Gf.chests[ch.id].img = Gf.chestImg[F()['chest_' + ch.id] ? 1 : 0];
}

// ---------- 怪物 ----------
MON_SPEED.wraith = [55, 145];
MON_SPEED.fog_beast = [28, 80];
function monsterSafe(x, y) {
  if (G && G.id === 'yunshan')
    return Math.hypot(x - Y_SHRINE.x, y - Y_SHRINE.y) < 280 || Math.hypot(x - Y_PAVILION.x, y - Y_PAVILION.y) < 180 || y < 200 || y > Y_BOSS.y - 60;
  return Math.hypot(x - F_SHRINE.x, y - F_SHRINE.y) < 260 || y < 300 || y > 1960;
}
const YUN_MON_ZONES = [{ y0:200,y1:800,n:4,tier:0 },{ y0:800,y1:1900,n:5,tier:1 },{ y0:1900,y1:2640,n:3,tier:2 }];
const YUN_ENCOUNTERS = [
  { groups: [['wraith'],['fog_beast'],['wraith','fog_beast'],['wraith','wraith']] },
  { groups: [['wraith','wraith'],['fog_beast','fog_beast'],['wraith','fog_beast'],['fog_beast','wraith']] },
  { groups: [['fog_beast','fog_beast'],['wraith','wraith','fog_beast'],['fog_beast','wraith']] },
];
function spawnYunshanMonster(zone) {
  for (let i = 0; i < 200; i++) {
    const y = zone.y0 + Math.random() * (zone.y1 - zone.y0), x = yunRoadCenterX(y) + (Math.random() - 0.5) * 700;
    if (monsterSafe(x, y) || blocked(x, y, {}) || Math.hypot(x - player.x, y - player.y) < 380) continue;
    const tier = YUN_ENCOUNTERS[zone.tier], group = tier.groups[(Math.random() * tier.groups.length) | 0];
    const kind = group.reduce((a, b) => (ENEMIES[b].hp > ENEMIES[a].hp ? b : a));
    return { mon: true, kind, group, zone, x, y, home: [x, y], dir: 3, fdir: 0, target: null, wait: Math.random() * 3, chase: false, stun: 0, anim: 0, moving: false, dead: false };
  }
  return null;
}
function spawnYunshanMonsters() {
  monsters = []; monGrace = 1.5;
  if (params.has('peace')) return;
  for (const z of YUN_MON_ZONES) for (let i = 0; i < z.n; i++) { const m = spawnYunshanMonster(z); if (m) monsters.push(m); }
}
function spawnMonster(zone) {
  if (G && G.id === 'yunshan') return spawnYunshanMonster(zone);
  for (let i = 0; i < 200; i++) {
    const y = zone.y0 + Math.random() * (zone.y1 - zone.y0), x = roadCenterX(y) + (Math.random() - 0.5) * 900;
    if (monsterSafe(x, y) || blocked(x, y, {}) || Math.hypot(x - player.x, y - player.y) < 380) continue;
    const tier = ENCOUNTERS[zone.tier], group = tier.groups[(Math.random() * tier.groups.length) | 0];
    const kind = group.reduce((a, b) => (ENEMIES[b].hp > ENEMIES[a].hp ? b : a));
    return { mon: true, kind, group, zone, x, y, home: [x, y], dir: 3, fdir: 0, target: null, wait: Math.random() * 3, chase: false, stun: 0, anim: 0, moving: false, dead: false };
  }
  return null;
}

// ---------- 對話 ----------
const YUN_TALK = { fogma: () => talkFogma(), lingxiao: () => talkLingxiao() };

function talkFogma() {
  const f = F();
  if (!f.fogma_jade && has('talisman')) {
    return talk([
      ['霧婆', '娃兒……你手上那塊玉符，我在哪兒見過。'],
      [HERO_NAME, '這是黑風坡賊首丟下的，符紋和道長信封上的一模一樣……'],
      ['霧婆', '（她從懷中摸出另一半，兩塊一拼，嚴絲合縫。）'],
      ['霧婆', '三十年前，也有個打扮古怪的年輕人從林子裡冒出來，說話跟你一樣，滿嘴聽不懂的詞兒。'],
      ['霧婆', '他臨走把這半塊交給我，說：「下一個從林子裡出來的人，會帶著另一半來。叫他去問心亭。」'],
      [HERO_NAME, '……跟我一樣的人？他後來去了哪裡？'],
      ['霧婆', '老婆子不知道。問心亭的凌霄跟他一起上過山，你去問他吧。'],
      () => { f.fogma_jade = 1; take('talisman'); give('jade_complete'); toast('「殘缺玉符」合為「完整玉符」'); },
      { name: '', q: '要在茶棚歇息嗎？', choices: [
        ['歇息（恢復並存檔）', () => [() => fade(() => { healAll(); S.poison = 0; }), '（喝下靈氣茶，渾身舒暢，精力充盈。）', () => { toast(saveGame() ? '氣血、精力全滿 · 已存檔' : '氣血、精力全滿'); }]],
        ['繼續趕路', () => [['霧婆', '問心亭在山道南端，自己保重。']]],
      ] },
    ]);
  }
  talk([{ name: '', q: '要在茶棚歇息嗎？', choices: [
    ['歇息（恢復並存檔）', () => [() => fade(() => { healAll(); S.poison = 0; }), '（熱茶入喉，五臟六腑都暖了。）', () => { toast(saveGame() ? '氣血、精力全滿 · 已存檔' : '氣血、精力全滿'); }]],
    ['購買補給', () => { openShop('霧婆茶棚', '霧婆', ['herb', 'tea', 'spirit_tea']); }],
    ['離開', () => [['霧婆', '山路難行，自己小心些。']]],
  ] }]);
}
function talkLingxiao() {
  const f = F();
  if (!f.boss_fog) {
    return talk([['凌霄', '你終於到了。'], ['凌霄', '問心亭下有道妖靈正在甦醒——霧煞。我一人鎮不住，要你一起。'],
      [HERO_NAME, '霧婆說，三十年前也有個像我一樣的人……'], ['凌霄', '……等打完再說。'],
      ['凌霄', '身上帶著完整玉符嗎？拿著它，霧煞的妖力便克制不了你。']]);
  }
  talk([['凌霄', '霧煞已被鎮壓。'], ['凌霄', '道觀在雲海盡頭的古城，我師父——問天道長在等你。'],
    [HERO_NAME, '您不跟我一起去嗎？'], ['凌霄', '我的功夫十年前就廢了。這條路只能你走。'],
    ['凌霄', '進古城要三處印記，先從城西的石林找起。'],
    () => { if (!has('method_book')) { give('method_book'); toast('獲得「殘破功法冊」'); } },
    ['凌霄', '這本功法冊記著「風裂斬」殘篇，慢慢領悟。']]);
}

// ---------- 觸發器 ----------
function fogShaEvent() {
  if (F().boss_fog) return;
  talk(['（山頂驟然霧氣翻湧，黑暗中有形狀浮現。）',
    ['凌霄', '它來了！守好自身——'],
    () => startBattle(['fog_sha'], { boss: true, bossMsg: '霧煞顯身，妖氣瀰天！',
      onWin: () => talk(['（黑霧漸散，問心亭重現天光。）',
        ['霧煞', '……玉……符……又……一……個……異……鄉……人……（散）'],
        () => { F().boss_fog = 1; refreshNpcs(); addFame(50); },
        ['凌霄', '做得好。霧煞被封印三十年，今日甦醒時力還不足，否則……'],
        [HERO_NAME, '三十年前……就是那個異鄉人來的那一年？'],
        ['凌霄', '他叫自己「阿哲」。我們一起鎮住了霧煞，之後他便下山去了，再沒回來。'],
        ['凌霄', '你為何會來、能不能回去，去找問天道長吧。他知道的比我多。'],
        () => { healAll(); toast('氣血、精力全滿'); }]) }),
  ]);
}
function yunTriggers() {
  if (player.y < 40) { keys.clear(); return fade(() => { switchMap('field', 960, FH - 120, 1); toast('雲山官道'); }); }
  if (player.y > YH - 40) { keys.clear(); return yunEnding(); }
  if (!F().yunshan_enter && player.y > 160) {
    F().yunshan_enter = 1;
    talk(['山道陡峭，四周雲霧漸濃。回頭望去，清河村已遙不可見。',
      '一塊石碑矗立路旁，刻著：「凌氏守山，代代不息。」',
      `${HERO_NAME}攥緊了懷中的玉符，繼續向前走去。`]);
    return;
  }
  if (!F().lingxiao_met && player.y > Y_PAVILION.y - 120) {
    F().lingxiao_met = 1; keys.clear();
    const npc = MAPS.yunshan.npcs && MAPS.yunshan.npcs.find((n) => n.id === 'lingxiao');
    if (npc) npc.dir = 1;
    talk(['（霧氣中，亭邊站著一個白衣人，背對來路，一動不動。）',
      [HERO_NAME, '……您是？'], ['凌霄', '你不該來。'],
      [HERO_NAME, '道長的信說——「雲山之南，故人待君」。那位故人……是您嗎？'],
      ['凌霄', '那封信是我師父寫的。他讓我在此等你。'],
      ['凌霄', '我是凌霄，雲山的守山人。'], ['凌霄', '你身上的氣息……跟三十年前那個人一模一樣。'],
      [HERO_NAME, '……您見過跟我一樣的人？'], ['凌霄', '先別說話。雲山深處有妖靈甦醒，我們先把它鎮住。']]);
    return;
  }
  if (F().lingxiao_met && !F().boss_fog && player.y > Y_BOSS.y - 130) {
    player.y = Y_BOSS.y - 130; keys.clear(); fogShaEvent();
  }
}
function yunEnding() {
  if (!F().boss_fog) {
    player.y = YH - 60; player.dir = 1; keys.clear();
    talk(['（前方雲霧更厚，腳下幾乎看不見山路。似乎還有什麼事未竟……）']); return;
  }
  talk([`（凌霄佇立亭邊，目送${HERO_NAME}走向雲海邊緣。）`,
    ['凌霄', '去吧，問天在等你。'],
    '雲霧翻湧，古城的輪廓若隱若現，巍峨而古老……',
    '——　第二章「雲山」　完　——',
    '（第三章「古城問天」製作中，敬請期待。）',
    () => { player.y = YH - 80; player.dir = 1; }]);
}
