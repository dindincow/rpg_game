'use strict';
// 室內場景 — 程序化像素房間與家具
const WALL_H = 120;

// ---------- 家具（回傳 { img, ax, ay, solid:[l,t,r,b] 相對腳點 } ） ----------
function fTable(w = 100, tea = true) {
  const [c, g] = canvas(w + 8, 66);
  g.fillStyle = '#00000040'; g.fillRect(6, 56, w - 4, 8);
  g.fillStyle = '#3e2a17'; g.fillRect(8, 32, 8, 28); g.fillRect(w - 8, 32, 8, 28);
  g.fillStyle = '#4a321c'; g.fillRect(4, 18, w, 18);
  g.fillStyle = '#7a5530'; g.fillRect(4, 18, w, 14); g.fillStyle = '#a07648'; g.fillRect(4, 18, w, 4);
  if (tea) {
    g.fillStyle = '#d8e0e8'; g.fillRect(w / 2 - 6, 8, 14, 12); g.fillStyle = '#3a5a8a'; g.fillRect(w / 2 - 6, 12, 14, 3); g.fillRect(w / 2 + 8, 11, 4, 3);
    g.fillStyle = '#e8e2d4'; g.fillRect(w / 2 - 26, 15, 6, 5); g.fillRect(w / 2 + 20, 15, 6, 5);
  }
  return { img: c, ax: w / 2 + 4, ay: 60, solid: [-w / 2, -26, w / 2, 0] };
}
function fStool() {
  const [c, g] = canvas(28, 30);
  g.fillStyle = '#3e2a17'; g.fillRect(4, 14, 4, 14); g.fillRect(20, 14, 4, 14);
  g.fillStyle = '#8a6238'; g.fillRect(2, 8, 24, 8); g.fillStyle = '#a87e4c'; g.fillRect(2, 8, 24, 2);
  return { img: c, ax: 14, ay: 28 };
}
function fCounter(len = 200) {
  const [c, g] = canvas(len, 76);
  g.fillStyle = '#00000040'; g.fillRect(2, 68, len - 4, 8);
  g.fillStyle = '#4a2e18'; g.fillRect(0, 24, len, 46);
  for (let x = 6; x < len - 30; x += 44) { g.fillStyle = '#5e3c22'; g.fillRect(x, 32, 36, 30); g.fillStyle = '#3a2210'; g.fillRect(x, 60, 36, 2); }
  g.fillStyle = '#9a7246'; g.fillRect(0, 12, len, 14); g.fillStyle = '#c09060'; g.fillRect(0, 12, len, 3);
  // 算盤與帳簿
  g.fillStyle = '#3a2210'; g.fillRect(16, 4, 34, 10); g.fillStyle = '#c03828'; for (let x = 19; x < 48; x += 5) g.fillRect(x, 6, 3, 3);
  g.fillStyle = '#e8dcb8'; g.fillRect(len - 46, 6, 26, 8); g.fillStyle = '#5a4a3a'; g.fillRect(len - 46, 9, 26, 1);
  return { img: c, ax: 0, ay: 70, solid: [0, -34, len, 0] };
}
function fBed() {
  const [c, g] = canvas(156, 96);
  g.fillStyle = '#00000040'; g.fillRect(4, 86, 150, 8);
  g.fillStyle = '#3e2412'; g.fillRect(0, 26, 156, 62); g.fillRect(0, 0, 12, 88);
  g.fillStyle = '#5e3a1e'; g.fillRect(2, 2, 6, 84);
  g.fillStyle = '#d8cfb8'; g.fillRect(12, 28, 140, 40);
  g.fillStyle = '#efe8d8'; g.fillRect(16, 30, 30, 20); g.fillStyle = '#c8bea4'; g.fillRect(16, 46, 30, 4);
  g.fillStyle = '#34507a'; g.fillRect(52, 30, 98, 44); g.fillStyle = '#4a6a9a'; g.fillRect(52, 30, 98, 8);
  g.fillStyle = '#c9a45c'; for (let x = 60; x < 146; x += 16) g.fillRect(x, 50, 6, 6);
  g.fillStyle = '#2a1a0c'; g.fillRect(0, 72, 156, 16);
  return { img: c, ax: 78, ay: 88, solid: [-78, -60, 78, 0] };
}
function fStove() {
  const [c, g] = canvas(112, 114);
  g.fillStyle = '#7a4030'; g.fillRect(80, 0, 18, 46); g.fillStyle = '#5a2e20'; g.fillRect(80, 0, 4, 46);
  g.fillStyle = '#8a4a32'; g.fillRect(8, 44, 96, 64);
  g.fillStyle = '#6a3424'; for (let y = 52; y < 106; y += 10) g.fillRect(8, y, 96, 2);
  for (let y = 44; y < 106; y += 10) for (let x = 8 + ((y / 10) % 2) * 12; x < 104; x += 24) g.fillRect(x, y, 2, 10);
  g.fillStyle = '#6a6a62'; g.fillRect(4, 38, 104, 10); g.fillStyle = '#8a8a80'; g.fillRect(4, 38, 104, 3);
  g.fillStyle = '#1a0a04'; g.fillRect(38, 74, 34, 26);
  g.fillStyle = '#2a2a2e'; g.fillRect(24, 22, 44, 18); g.fillStyle = '#46464c'; g.fillRect(24, 22, 44, 4); g.fillStyle = '#5a4030'; g.fillRect(40, 14, 12, 8);
  g.fillStyle = '#e8e8e8a0'; g.fillRect(34, 6, 3, 10); g.fillRect(46, 2, 3, 12); g.fillRect(56, 8, 3, 8);
  return { img: c, ax: 56, ay: 108, solid: [-50, -40, 50, 0], fire: [0, -10] };
}
function fCabinet(books) {
  const [c, g] = canvas(76, 112);
  g.fillStyle = '#3a2210'; g.fillRect(4, 4, 68, 104); g.fillStyle = '#4e301a'; g.fillRect(6, 6, 64, 100);
  if (books) {
    const cols = ['#8a2a20', '#2a4a6a', '#6a5a2a', '#3a5a3a', '#7a4a6a', '#a07030'];
    for (const y of [10, 40, 70]) { g.fillStyle = '#2a1a0c'; g.fillRect(8, y + 26, 60, 3); for (let x = 10, i = 0; x < 64; x += 7, i++) { g.fillStyle = cols[(i + y) % cols.length]; g.fillRect(x, y + 6 + (i % 3), 6, 20 - (i % 3)); } }
  } else {
    g.fillStyle = '#5e3c22'; g.fillRect(10, 12, 26, 60); g.fillRect(40, 12, 26, 60);
    g.fillStyle = '#c9a045'; g.fillRect(32, 40, 3, 6); g.fillRect(41, 40, 3, 6);
    g.fillStyle = '#5e3c22'; g.fillRect(10, 78, 56, 24); g.fillStyle = '#c9a045'; g.fillRect(36, 88, 4, 4);
  }
  return { img: c, ax: 38, ay: 108, solid: [-34, -26, 34, 0] };
}
function fShelf() {
  const [c, g] = canvas(124, 104);
  g.fillStyle = '#3a2210'; g.fillRect(4, 4, 6, 98); g.fillRect(114, 4, 6, 98);
  const jars = [['#d8e0e8', '#3a5a8a'], ['#7a4a22', '#b8282a'], ['#5a6a4a', '#c9a45c'], ['#d8d0b8', '#8a2a20']];
  for (const [y, k] of [[30, 0], [62, 1], [96, 2]]) {
    g.fillStyle = '#5e3c22'; g.fillRect(4, y, 116, 5); g.fillStyle = '#8a6238'; g.fillRect(4, y, 116, 2);
    for (let x = 14, i = k; x < 104; x += 24, i++) { const [a, b] = jars[i % 4]; g.fillStyle = a; g.fillRect(x, y - 18, 16, 18); g.fillRect(x + 4, y - 22, 8, 4); g.fillStyle = b; g.fillRect(x, y - 12, 16, 4); }
  }
  return { img: c, ax: 62, ay: 100, solid: [-60, -22, 60, 0] };
}
function fJar() {
  const [c, g] = canvas(42, 48);
  g.fillStyle = '#00000040'; g.beginPath(); g.ellipse(21, 44, 17, 4, 0, 0, 7); g.fill();
  g.fillStyle = '#3a1e0c'; g.beginPath(); g.ellipse(21, 28, 18, 17, 0, 0, 7); g.fill();
  g.fillStyle = '#6a3a1a'; g.beginPath(); g.ellipse(21, 28, 16, 15, 0, 0, 7); g.fill();
  g.fillStyle = '#8a5428'; g.fillRect(10, 18, 8, 10);
  g.fillStyle = '#c8b080'; g.fillRect(12, 6, 18, 8); g.fillStyle = '#8a2a20'; g.fillRect(12, 12, 18, 2);
  g.fillStyle = '#b8282a'; g.fillRect(14, 24, 14, 14); g.fillStyle = '#1a0a04'; g.font = 'bold 11px serif'; g.textAlign = 'center'; g.fillText('酒', 21, 35);
  return { img: c, ax: 21, ay: 44, solid: [-14, -8, 14, 0] };
}
function fRack() {
  const [c, g] = canvas(144, 112);
  g.fillStyle = '#3a2210'; g.fillRect(6, 8, 8, 100); g.fillRect(130, 8, 8, 100); g.fillRect(6, 18, 132, 6); g.fillRect(6, 86, 132, 6);
  for (let i = 0; i < 6; i++) {
    const x = 22 + i * 19;
    if (i % 3 === 2) { // 長槍
      g.fillStyle = '#6a4a2a'; g.fillRect(x + 1, 4, 3, 104); g.fillStyle = '#d8dce4'; g.fillRect(x, 0, 5, 10); g.fillStyle = '#c02020'; g.fillRect(x - 1, 10, 7, 5);
    } else { // 劍
      g.fillStyle = '#c8ccd4'; g.fillRect(x, 26, 5, 58); g.fillStyle = '#f0f2f6'; g.fillRect(x, 26, 2, 58);
      g.fillStyle = '#c9a045'; g.fillRect(x - 3, 82, 11, 3); g.fillStyle = '#5a2a1a'; g.fillRect(x + 1, 85, 3, 14);
    }
  }
  return { img: c, ax: 72, ay: 108, solid: [-70, -24, 70, 0] };
}
function fArmorStand(kind) {
  const [c, g] = canvas(64, 112);
  g.fillStyle = '#00000040'; g.beginPath(); g.ellipse(32, 106, 20, 5, 0, 0, 7); g.fill();
  g.fillStyle = '#5e3c22'; g.fillRect(29, 30, 6, 74); g.fillRect(16, 100, 32, 6);
  const [a, b, hl] = kind === 'leather' ? ['#5a3a1e', '#7a5230', '#9a6a40'] : ['#5a5e66', '#8a8e96', '#b8bcc4'];
  g.fillStyle = a; g.fillRect(12, 30, 40, 50); g.fillRect(6, 30, 12, 16); g.fillRect(46, 30, 12, 16);
  g.fillStyle = b; g.fillRect(14, 32, 36, 46); g.fillStyle = hl; g.fillRect(14, 32, 36, 4);
  g.fillStyle = a; for (let y = 44; y < 78; y += 8) g.fillRect(14, y, 36, 2);
  g.fillStyle = '#c9a045'; g.fillRect(30, 36, 4, 40);
  g.fillStyle = a; g.fillRect(20, 8, 24, 22); g.fillStyle = b; g.fillRect(22, 10, 20, 16); g.fillStyle = hl; g.fillRect(22, 10, 20, 3);
  g.fillStyle = '#c02020'; g.fillRect(30, 2, 4, 8);
  return { img: c, ax: 32, ay: 106, solid: [-16, -12, 16, 0] };
}
function fAnvil() {
  const [c, g] = canvas(74, 54);
  g.fillStyle = '#00000040'; g.fillRect(10, 46, 56, 6);
  g.fillStyle = '#26262c'; g.fillRect(4, 12, 62, 12); g.fillRect(64, 14, 8, 6); g.fillRect(24, 24, 24, 14); g.fillRect(14, 38, 44, 10);
  g.fillStyle = '#4a4a54'; g.fillRect(6, 12, 58, 3);
  g.fillStyle = '#6a6a74'; g.fillRect(40, 6, 22, 4); g.fillStyle = '#5a3a1e'; g.fillRect(22, 8, 20, 3);
  return { img: c, ax: 37, ay: 48, solid: [-30, -14, 30, 0] };
}
function fForge() {
  const [c, g] = canvas(124, 124);
  g.fillStyle = '#3e3a34'; g.fillRect(34, 0, 56, 46); g.fillStyle = '#524c44'; g.fillRect(34, 0, 8, 46);
  g.fillStyle = '#5a5248'; g.fillRect(8, 42, 108, 78);
  for (let y = 42; y < 118; y += 12) for (let x = 8 + ((y / 12) % 2) * 14; x < 112; x += 28) { g.fillStyle = '#6e6658'; g.fillRect(x + 1, y + 1, 25, 10); }
  g.fillStyle = '#140804'; g.fillRect(36, 66, 52, 34);
  g.fillStyle = '#ff7a2a80'; g.fillRect(36, 92, 52, 8);
  return { img: c, ax: 62, ay: 118, solid: [-56, -44, 56, 0], fire: [0, -22] };
}
function fScreen() {
  const [c, g] = canvas(152, 112);
  for (let i = 0; i < 4; i++) {
    const x = 2 + i * 37;
    g.fillStyle = '#3a2210'; g.fillRect(x, 6, 36, 100); g.fillStyle = '#e8dcb8'; g.fillRect(x + 4, 10, 28, 88);
    g.fillStyle = '#8a8a84'; for (let k = 0; k < 3; k++) { const px = x + 6 + k * 8, py = 70 - ((i + k) % 3) * 10; for (let s = 0; s < 14; s += 2) g.fillRect(px + s / 2, py - s, 14 - s, 2); }
    g.fillStyle = '#c03828'; if (i === 1) g.fillRect(x + 20, 24, 6, 6);
  }
  return { img: c, ax: 76, ay: 106, solid: [-74, -10, 74, 0] };
}
function fPlant() {
  const [c, g] = canvas(50, 72);
  g.fillStyle = '#7a3e22'; g.fillRect(12, 46, 26, 22); g.fillStyle = '#9a5a32'; g.fillRect(10, 44, 30, 5);
  const lv = ['#2a4a1e', '#3e6a2a', '#5a8a3a', '#7aa84a'];
  for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 + (i - 7) * 0.22, len = 18 + (i % 3) * 7; for (let t = 4; t < len; t += 3) { g.fillStyle = lv[Math.min(3, (t / 6) | 0)]; g.fillRect(25 + Math.cos(a) * t - 2, 44 + Math.sin(a) * t, 4, 3); } }
  return { img: c, ax: 25, ay: 68, solid: [-13, -10, 13, 0] };
}
// 祠堂供桌：後方牌位龕、紅漆供桌、香爐、一對紅燭、供品
function fAltar() {
  const [c, g] = canvas(200, 120);
  g.fillStyle = '#00000040'; g.fillRect(8, 110, 184, 8);
  g.fillStyle = '#2a1408'; g.fillRect(24, 0, 152, 8);
  g.fillStyle = '#3a1a10'; g.fillRect(30, 6, 140, 60); g.fillStyle = '#5a2a18'; g.fillRect(34, 10, 132, 52);
  for (let i = 0; i < 7; i++) { const x = 40 + i * 18; g.fillStyle = '#2a1408'; g.fillRect(x, 14, 14, 44); g.fillStyle = '#b8903e'; g.fillRect(x + 2, 16, 10, 40); g.fillStyle = '#3a2210'; g.fillRect(x + 6, 22, 2, 28); }
  g.fillStyle = '#6a1e14'; g.fillRect(8, 64, 184, 16); g.fillStyle = '#8a2a1a'; g.fillRect(8, 64, 184, 4);
  g.fillStyle = '#4a140c'; g.fillRect(14, 80, 10, 32); g.fillRect(176, 80, 10, 32);
  g.fillStyle = '#5a1a10'; g.fillRect(14, 80, 172, 10); g.fillStyle = '#c9a045'; g.fillRect(14, 88, 172, 2);
  g.fillStyle = '#4a4a44'; g.fillRect(88, 50, 24, 14); g.fillStyle = '#6a6a60'; g.fillRect(84, 46, 32, 5);
  g.fillStyle = '#e8e8e8a0'; g.fillRect(98, 30, 2, 16); g.fillRect(104, 26, 2, 20);
  for (const x of [52, 144]) { g.fillStyle = '#b82a1e'; g.fillRect(x, 44, 6, 20); g.fillStyle = '#ffd070'; g.fillRect(x + 1, 38, 4, 6); }
  for (const x of [64, 120]) { g.fillStyle = '#d8d0b8'; g.fillRect(x, 58, 16, 6); g.fillStyle = '#c86a2a'; g.fillRect(x + 2, 54, 12, 5); }
  return { img: c, ax: 100, ay: 112, solid: [-92, -50, 92, 0] };
}
function fCushion() {
  const [c, g] = canvas(36, 20);
  g.fillStyle = '#00000030'; g.beginPath(); g.ellipse(18, 14, 16, 5, 0, 0, 7); g.fill();
  g.fillStyle = '#7a2a1a'; g.beginPath(); g.ellipse(18, 10, 16, 7, 0, 0, 7); g.fill();
  g.fillStyle = '#a8402a'; g.beginPath(); g.ellipse(18, 8, 13, 4, 0, 0, 7); g.fill();
  return { img: c, ax: 18, ay: 16 };
}
// 村長對帳的小木桌：舊帳簿、算盤、半盞涼茶
function fDesk() {
  const [c, g] = canvas(96, 60);
  g.fillStyle = '#00000040'; g.fillRect(6, 50, 84, 8);
  g.fillStyle = '#3e2a17'; g.fillRect(8, 30, 7, 24); g.fillRect(81, 30, 7, 24);
  g.fillStyle = '#4a321c'; g.fillRect(4, 18, 88, 14); g.fillStyle = '#7a5530'; g.fillRect(4, 18, 88, 10); g.fillStyle = '#a07648'; g.fillRect(4, 18, 88, 3);
  g.fillStyle = '#e8dcb8'; g.fillRect(12, 10, 26, 10); g.fillStyle = '#5a4a3a'; g.fillRect(25, 10, 1, 10);
  g.fillStyle = '#8a7a6a'; g.fillRect(14, 13, 9, 1); g.fillRect(14, 16, 9, 1); g.fillRect(28, 13, 8, 1); g.fillRect(28, 16, 8, 1);
  g.fillStyle = '#3a2210'; g.fillRect(44, 8, 26, 11); g.fillStyle = '#c03828'; for (let x = 46; x < 68; x += 4) { g.fillRect(x, 10, 2, 3); g.fillRect(x, 15, 2, 2); }
  g.fillStyle = '#d8e0e8'; g.fillRect(76, 12, 8, 7); g.fillStyle = '#3a5a8a'; g.fillRect(76, 14, 8, 2);
  return { img: c, ax: 48, ay: 54, solid: [-44, -22, 44, 0] };
}
function fBarrel() {
  const [c, g] = canvas(40, 50);
  g.fillStyle = '#00000040'; g.fillRect(4, 44, 32, 5);
  g.fillStyle = '#5a3a1e'; g.fillRect(4, 8, 32, 38); g.fillStyle = '#7a5230'; g.fillRect(8, 8, 8, 38);
  g.fillStyle = '#2e2e30'; g.fillRect(4, 14, 32, 3); g.fillRect(4, 36, 32, 3);
  g.fillStyle = '#8a6238'; g.fillRect(4, 4, 32, 6);
  return { img: c, ax: 20, ay: 46, solid: [-16, -10, 16, 0] };
}

// ---------- 房間（地板、牆面直接畫在底圖） ----------
// 有美術底圖的房間（assets/interiors/<bg>.png）：家具都畫在圖上，碰撞框、燈光、NPC 位置都用底圖原尺寸座標，依 w 等比縮放
const ROOM_BG = {};
function buildBgRoom(def) {
  const img = ROOM_BG[def.bg];
  if (!img) throw new Error('缺少室內底圖：assets/interiors/' + def.bg + '.png');
  const f = def.w / img.width, w = def.w, h = Math.round(img.height * f), sc = (v) => Math.round(v * f);
  const [c, g] = canvas(w, h); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, w, h);
  const R = { id: 'in_' + def.id, name: def.name, W: w, H: h, f, interior: true, outside: def.id, door: sc(def.door), ground: c, groundBase: c, sprites: [], solids: [], circles: [], lights: [], shimmers: [], buildings: [], water: () => false };
  // 另一張同構圖的底圖（如修繕後的王宅），進房時依 altFlag 切換
  const alt = def.bgAlt && ROOM_BG[def.bgAlt];
  if (alt) { const [c2, g2] = canvas(w, h); g2.imageSmoothingQuality = 'high'; g2.drawImage(alt, 0, 0, w, h); Object.assign(R, { groundAlt: c2, altFlag: def.altFlag }); }
  for (const s of def.solids) R.solids.push(s.map(sc));
  for (const [x, y, r = 150] of def.lights) R.lights.push({ x: sc(x), y: sc(y), r, c: '255,170,100' });
  for (const n of ROOM_NPC_DEFS[def.id] || []) { n.x = sc(n.x); n.y = sc(n.y); }
  return R;
}
function buildRoom(def) {
  if (def.bg) return buildBgRoom(def);
  const { w, h, door } = def, WH = WALL_H;
  const [c, g] = canvas(w, h);
  // 地板
  for (let y = WH; y < h; y += 14) {
    const row = (y - WH) / 14;
    for (let x = -((row * 37) % 90); x < w; x += 90) {
      const s = hash2(x + 500, row);
      if (def.floor === 'stone') { g.fillStyle = `rgb(${96 + s * 26},${90 + s * 22},${78 + s * 18})`; g.fillRect(x, y, 44, 13); g.fillRect(x + 46, y, 43, 13); }
      else { g.fillStyle = `rgb(${120 + s * 26},${82 + s * 18},${46 + s * 12})`; g.fillRect(x, y, 89, 13); g.fillStyle = `rgba(255,220,160,.12)`; g.fillRect(x, y, 89, 2); }
    }
    g.fillStyle = def.floor === 'stone' ? '#4a443a' : '#4a2e16'; g.fillRect(0, y + 13, w, 1);
  }
  for (const [x, y, rw, rh, col] of def.rugs || []) {
    g.fillStyle = '#3a1410'; g.fillRect(x - 3, y - 3, rw + 6, rh + 6); g.fillStyle = col; g.fillRect(x, y, rw, rh);
    g.fillStyle = '#c9a45c'; g.fillRect(x + 6, y + 6, rw - 12, 2); g.fillRect(x + 6, y + rh - 8, rw - 12, 2); g.fillRect(x + 6, y + 6, 2, rh - 12); g.fillRect(x + rw - 8, y + 6, 2, rh - 12);
  }
  // 牆面
  for (let y = 0; y < WH; y += 4) for (let x = 0; x < w; x += 4) { const s = hash2(x * 3 + 1, y); g.fillStyle = `rgb(${196 + s * 16},${176 + s * 14},${136 + s * 12})`; g.fillRect(x, y, 4, 4); }
  g.fillStyle = '#5e3c22'; g.fillRect(0, WH - 36, w, 32); g.fillStyle = '#7a5230'; g.fillRect(0, WH - 36, w, 3);
  for (let x = 20; x < w; x += 40) { g.fillStyle = '#4e301a'; g.fillRect(x, WH - 30, 2, 24); }
  g.fillStyle = '#2a1a0c'; g.fillRect(0, WH - 4, w, 4); g.fillRect(0, 0, w, 14); g.fillStyle = '#4a3220'; g.fillRect(0, 12, w, 3);
  for (let x = 16; x < w; x += 170) { g.fillStyle = '#3e2816'; g.fillRect(x, 0, 14, WH - 4); g.fillStyle = '#5a3c22'; g.fillRect(x + 2, 0, 3, WH - 4); }
  for (const [x, ww] of def.windows || []) {
    g.fillStyle = '#3a2210'; g.fillRect(x - 4, 26, ww + 8, 56); g.fillStyle = '#ece2bc'; g.fillRect(x, 30, ww, 48);
    g.fillStyle = '#6a4a2a'; for (let k = x + 8; k < x + ww; k += 8) g.fillRect(k, 30, 1, 48); for (let k = 38; k < 78; k += 8) g.fillRect(x, k, ww, 1);
  }
  for (const [x, text] of def.scrolls || []) {
    const hh = 22 + text.length * 18;
    g.fillStyle = '#3a2210'; g.fillRect(x - 15, 20, 30, 4); g.fillRect(x - 15, 22 + hh, 30, 4);
    g.fillStyle = '#efe4c4'; g.fillRect(x - 12, 24, 24, hh - 2);
    g.fillStyle = '#1e140c'; g.font = 'bold 15px "Noto Serif TC","PMingLiU",serif'; g.textAlign = 'center'; g.textBaseline = 'top';
    [...text].forEach((ch, i) => g.fillText(ch, x, 32 + i * 18));
  }
  for (const [x, y] of def.lanterns || []) {
    g.fillStyle = '#3a2210'; g.fillRect(x - 1, 14, 2, y - 24);
    g.fillStyle = '#8a1a10'; g.fillRect(x - 11, y - 12, 22, 24); g.fillStyle = '#d0402a'; g.fillRect(x - 9, y - 12, 18, 24); g.fillStyle = '#f07a4a'; g.fillRect(x - 5, y - 10, 6, 18);
    g.fillStyle = '#c9a045'; g.fillRect(x - 8, y - 15, 16, 4); g.fillRect(x - 8, y + 11, 16, 4);
  }
  if (def.nets) { g.strokeStyle = '#6a5a3a'; g.lineWidth = 1; for (const [nx, nw] of def.nets) { for (let k = 0; k <= nw; k += 8) { g.beginPath(); g.moveTo(nx + k, 22); g.lineTo(nx + k * 0.6 + nw * 0.2, 96); g.stroke(); } for (let y = 26; y < 96; y += 8) { g.beginPath(); g.moveTo(nx + (y - 22) * 0.08 * nw / 30, y); g.lineTo(nx + nw - (y - 22) * 0.08 * nw / 30, y); g.stroke(); } } }
  // 牆腳陰影、側牆與前牆（門口留空）
  const gr = g.createLinearGradient(0, WH, 0, WH + 36); gr.addColorStop(0, 'rgba(0,0,0,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, WH, w, 36);
  g.fillStyle = '#20150c'; g.fillRect(0, 0, 14, h); g.fillRect(w - 14, 0, 14, h);
  g.fillRect(0, h - 22, door - 36, 22); g.fillRect(door + 36, h - 22, w - door - 36, 22);
  g.fillStyle = '#4a3220'; g.fillRect(0, h - 22, door - 36, 3); g.fillRect(door + 36, h - 22, w - door - 36, 3); g.fillRect(12, 0, 2, h - 22); g.fillRect(w - 14, 0, 2, h - 22);
  g.fillStyle = '#7a3a2a'; g.fillRect(door - 30, h - 30, 60, 30); g.fillStyle = '#a0583a'; g.fillRect(door - 26, h - 26, 52, 2);

  const R = { id: 'in_' + def.id, name: def.name, W: w, H: h, interior: true, outside: def.id, door, ground: c, sprites: [], solids: [], circles: [], lights: [], shimmers: [], buildings: [], water: () => false };
  R.solids.push([0, 0, w, WH + 6], [0, 0, 16, h], [w - 16, 0, w, h], [0, h - 18, door - 34, h], [door + 34, h - 18, w, h]);
  const MAKERS = { table: fTable, stool: fStool, counter: fCounter, bed: fBed, stove: fStove, cabinet: () => fCabinet(false), books: () => fCabinet(true), shelf: fShelf,
    jar: fJar, rack: fRack, stand: () => fArmorStand('metal'), leather: () => fArmorStand('leather'), anvil: fAnvil, forge: fForge, screen: fScreen, plant: fPlant, barrel: fBarrel, chest: () => makeChest(false),
    altar: fAltar, cushion: fCushion, desk: fDesk };
  for (const [type, x, y, arg] of def.items) {
    const f = MAKERS[type](arg);
    R.sprites.push({ img: f.img, x, y, ax: f.ax, ay: f.ay, fire: !!f.fire, fireOff: f.fire });
    if (f.solid) R.solids.push([x + f.solid[0], y + f.solid[1], x + f.solid[2], y + f.solid[3]]);
    if (type === 'chest') R.chest = R.sprites[R.sprites.length - 1];
    if (f.fire) R.lights.push({ x: x + f.fire[0], y: y + f.fire[1] - 20, r: 200, c: '255,140,60' });
  }
  for (const [x, y] of def.lanterns || []) R.lights.push({ x, y, r: 160, c: '255,170,100' });
  return R;
}

// ---------- 各室內配置 ----------
const ROOMS = {
  // 凌家底圖原尺寸 1536×1024
  home: { name: '吳家', bg: '凌家', w: 1000, door: 777,
    solids: [[0, 0, 1536, 360], [100, 280, 322, 388], [622, 278, 834, 392], [832, 285, 908, 384], [1165, 88, 1362, 408], [1338, 280, 1432, 412],
      [0, 0, 80, 1024], [1458, 0, 1536, 1024], [72, 400, 522, 625], [688, 532, 996, 698], [590, 648, 684, 722], [998, 648, 1092, 722],
      [1350, 428, 1460, 542], [1358, 552, 1466, 712], [1308, 722, 1460, 888], [68, 648, 288, 888], [0, 880, 642, 1024], [912, 880, 1536, 1024]],
    lights: [[118, 425], [232, 745], [1435, 190], [875, 175, 120], [770, 600, 110]] },
  // 以下座標為底圖原尺寸（1594×986）
  inn: { name: '清河客棧', bg: '客棧', w: 1100, door: 790,
    solids: [[0, 0, 1594, 305], [0, 0, 240, 412], [0, 0, 75, 986], [1515, 0, 1594, 986], [1020, 0, 1515, 445], [815, 0, 872, 362],
      [178, 430, 482, 585], [148, 650, 458, 808], [688, 568, 992, 712], [60, 420, 135, 580], [60, 615, 148, 832],
      [1400, 455, 1515, 615], [1175, 590, 1515, 830], [0, 830, 642, 986], [945, 830, 1594, 986]],
    lights: [[220, 110], [410, 175], [1035, 140], [1165, 165], [1500, 175], [95, 270], [265, 455], [890, 580], [220, 680], [110, 640], [1490, 700], [610, 800], [965, 800]] },
  weapon: { name: '鐵峰武器鋪', bg: '武器店', w: 1000, door: 812,
    solids: [[0, 0, 1594, 352], [0, 0, 330, 400], [75, 330, 178, 512], [380, 0, 700, 530], [830, 0, 1530, 392], [1050, 405, 1530, 580],
      [1255, 500, 1530, 832], [65, 535, 445, 752], [410, 590, 495, 712], [0, 0, 75, 986], [1525, 0, 1594, 986], [0, 858, 682, 986], [915, 858, 1594, 986]],
    lights: [[110, 150], [1495, 165], [470, 330, 220], [1105, 410]] },
  armor: { name: '錦甲防具行', w: 620, h: 410, door: 310, windows: [[60, 80]], scrolls: [[520, '甲']], lanterns: [[330, 60]],
    rugs: [[230, 300, 160, 70, '#2a4a5a']],
    items: [['stand', 80, 210], ['stand', 160, 210], ['leather', 80, 320], ['leather', 160, 320], ['shelf', 330, 132], ['books', 450, 140], ['counter', 400, 270, 180], ['plant', 580, 380], ['screen', 500, 380]] },
  // 王宅底圖原尺寸 1556×1011（修繕前的破舊樣貌）：床在左、桌凳居中、左上屋頂破洞
  river: { name: '王宅', bg: '王宅', bgAlt: '王宅_修繕', altFlag: 'wang_house_repaired', w: 1000, door: 740,
    solids: [[0, 0, 1556, 327], [1064, 106, 1360, 368], [152, 289, 312, 372], [160, 398, 541, 638], [669, 511, 969, 729], [99, 638, 319, 778],
      [1276, 520, 1380, 596], [1279, 600, 1440, 772], [0, 0, 160, 1011], [1375, 0, 1556, 1011], [0, 760, 596, 1011], [886, 760, 1556, 1011]],
    lights: [[456, 425, 180], [881, 167, 120]] },
  // 王宅_修繕.png（1555×1011）與破舊版同構圖，家具位置相同，共用上面的碰撞框
  // 清河祠底圖原尺寸 1672×941：供桌居中靠後牆、左側靠牆的書桌（第 2 章村長對帳）
  shrine: { name: '清河祠', bg: '祠堂', w: 1100, door: 836,
    solids: [[0, 0, 1672, 318], [686, 245, 990, 444], [1274, 180, 1478, 346], [0, 0, 180, 941], [176, 346, 253, 542], [180, 228, 245, 346], [139, 588, 216, 748],
      [1494, 0, 1672, 941], [1417, 362, 1489, 519], [1429, 588, 1551, 748], [0, 718, 764, 941], [908, 718, 1672, 941]],
    lights: [[369, 98], [1301, 98], [759, 269, 110], [911, 269, 110], [629, 727, 120], [1045, 727, 120], [1466, 596, 100], [526, 209, 90], [1143, 209, 90]] },
};
const ROOM_NPC_DEFS = {
  home: [{ id: 'mother', name: '吳嬸', x: 600, y: 455, dir: 0, filter: 'hue-rotate(250deg) saturate(.5) brightness(1.1)', scale: 1.3, wander: 40, speed: 22 }],
  inn: [
    { id: 'innkeeper', name: '店小二', x: 1250, y: 482, dir: 0, filter: 'saturate(.4) brightness(1.05)', scale: 1.3, r: 110 },
    { id: 'merchant', name: '旅商', x: 525, y: 520, dir: 2, filter: 'sepia(.6) hue-rotate(20deg) brightness(.95)', scale: 1.3 },
    { id: 'storyteller', name: '說書先生', x: 840, y: 765, dir: 0, filter: 'grayscale(.7) brightness(1.1)', scale: 1.3 },
  ],
  weapon: [{ id: 'smith', name: '韓鐵山', x: 1150, y: 620, dir: 0, filter: 'sepia(.4) brightness(.8) contrast(1.2)', scale: 1.4, r: 110 }],
  armor: [{ id: 'armorer', name: '錦娘', x: 490, y: 218, dir: 0, filter: 'hue-rotate(150deg) saturate(.6) brightness(1.1)', scale: 1.3, r: 110 }],
  river: [],
  shrine: [],
};
function buildInteriors() {
  const out = {};
  for (const id in ROOMS) out['in_' + id] = buildRoom({ id, ...ROOMS[id] });
  return out;
}
function interiorInteractables() {
  const id = G.outside, list = [];
  if (id === 'home') {
    list.push({ x: 474, y: 268, r: 60, name: '木箱', act: () => {
      if (F().homeChest) return talk(['箱子裡只剩幾件舊衣裳。']);
      F().homeChest = 1; if (G.chest) G.chest.img = makeChest(true).img; S.gold += 20; give('herb');
      talk(['（牆邊的木箱裡，吳嬸替你備了些東西。）', '獲得 20 文、止血草 ×1。']);
    } });
    list.push({ x: 860, y: 318, r: 60, name: '書簍', act: () => talk(['竹簍裡插著幾卷泛黃的書。其中一本是老吳年輕時收來的遊記，扉頁寫著：', '「雲山之南，雲海之下，有城曰……」後面的字跡被水漬暈開了。']) });
    list.push({ x: 547, y: 410, r: 70, name: '茶几', act: () => talk(['桌上的茶還溫著，是吳嬸剛沏好的。']) });
  }
  if (id === 'weapon') list.push({ x: 300, y: 340, r: 80, name: '火爐', act: () => talk(['爐火燒得正旺，熱氣撲面而來。']) });
  if (id === 'inn') list.push({ x: 1010, y: 395, r: 75, name: '酒罈', act: () => talk(['罈口封著紅紙，聞得到淡淡的酒香。']) });
  if (id === 'river') list.push({ x: 250, y: 225, r: 60, name: '漁網', act: () => talk(['前屋主留下的舊漁網，修一修或許還能用。']) });
  if (id === 'armor') list.push({ x: 120, y: 220, r: 60, name: '鎧甲', act: () => talk(['擦得發亮的鐵甲，映出你的身影。']) });
  if (id === 'shrine') list.push({ x: 551, y: 305, r: 70, name: '供桌', act: visitShrine });
  return list;
}
// 建築門口原本就畫在圖上的人物
// npc: 建築圖上沒有畫這個人時，改用站在門邊的村民 [x, y（相對門口）, 行走圖代號]；行走圖用 tools/recolor.js 借現有角色換衣服顏色產生
const DOOR_FOLKS = [
  { b: 'weapon', name: '學徒阿鋒', rel: [175, 272], npc: [-62, 18, 'afeng'], talk: [['學徒阿鋒', '師父在裡頭打鐵呢，要買兵器就進去吧！'], ['學徒阿鋒', '我也想跟你一樣出去闖蕩……可師父說我連錘子都還拿不穩。']] },
  { b: 'armor', name: '夥計小六', rel: [205, 252], npc: [-70, 20, 'xiaoliu'], talk: [['夥計小六', '錦娘在店裡，今兒剛到一批皮甲，進去瞧瞧吧！']] },
  { b: 'home', name: '劉嬸', rel: [290, 258], npc: [55, 52, 'liushen'], talk: [['劉嬸', `${HERO_NAME}，吳嬸在屋裡呢，剛才還念叨著你。`]] },
];
const INTERIOR_TALK = {
  mother: () => talkMother(), innkeeper: () => talkInn(), smith: () => talkSmith(), armorer: () => talkArmor(), elder: () => talkElder(),
  merchant: (n) => cycle(n, [[['旅商', '我從北邊來，打算往雲山那頭去收些山貨。'], ['旅商', '可聽說黑風坡最近不太平，正猶豫要不要找個鏢局同行呢。']], [['旅商', '小兄弟，出門在外，盤纏要藏好，別全放在一個地方。']]]),
  storyteller: (n) => cycle(n, [
    [['說書先生', '話說上古之時，天地間有一柄神劍，劍光一出，雲開霧散……'], ['說書先生', '後來神劍下落不明，有人說，它就藏在雲山深處。'], ['說書先生', '欲知後事如何，且聽下回分解！']],
    [['說書先生', '小哥也對這些傳說有興趣？呵呵，年輕人，故事可不只是故事啊。']],
  ]),
};
