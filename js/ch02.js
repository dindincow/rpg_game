'use strict';
// 第 2 章演出：CG（缺圖時顯示佔位圖）、林道救援的投石與挨棍、手機鬧鐘、王宅漏雨床倒，以及合成音效
// 劇情資料在 story_data.js；台詞以 小說劇本/CH02_飢餓的清河村_完整小說劇本.txt 為準

// ---------- CG：有檔案就顯示，沒有就畫一張佔位圖，不會黑畫面 ----------
// 檔案放 assets/cg/；佔位圖寫上 CG ID 與構圖說明，方便美術對照補圖
// push：慢推鏡頭的焦點（CSS transform-origin），對應開發劇本「慢推」「慢推向碗」「慢推向主角臉」
const CH02_CG = {
  ch02_forest_rescue: { file: 'cg/第2章_林道呼救.png', note: '野林、跌坐的沈若蘭、翻倒的藥簍與小鋤、兩名惡徒', push: '50% 50%' },
  ch02_porridge: { file: 'cg/第2章_半碗粥.png', note: '小蓮把稀粥推給祖母，小蝦米在後方靜靜看著', push: '50% 62%' },
  ch02_first_night: { file: 'cg/第2章_第一夜.png', note: '王宅舊木床旁，小蝦米看著手機，冷光與月光', push: '40% 26%' },
};
const cgPh = {};
function cgPlaceholder(id) {
  if (cgPh[id]) return cgPh[id];
  const [c, g] = canvas(1448, 1086), def = CH02_CG[id];
  const grd = g.createLinearGradient(0, 0, 0, 1086); grd.addColorStop(0, '#2a2f38'); grd.addColorStop(1, '#14161b');
  g.fillStyle = grd; g.fillRect(0, 0, 1448, 1086);
  g.strokeStyle = '#4a5260'; g.lineWidth = 6; g.setLineDash([24, 16]); g.strokeRect(60, 60, 1328, 966);
  g.fillStyle = '#c8ccd4'; g.textAlign = 'center'; g.font = 'bold 56px system-ui';
  g.fillText('CG 素材待補', 724, 470);
  g.font = '40px system-ui'; g.fillStyle = '#9aa2b0';
  g.fillText(id, 724, 540); g.fillText(def.note, 724, 600);
  return (cgPh[id] = c.toDataURL());
}
function showCh02Cg(id) {
  const def = CH02_CG[id];
  if (!def) return showCg(null);
  showCg(def.file);
  const el = $('cg'); el.style.transformOrigin = def.push; void el.offsetWidth; el.classList.add('push');
  // 圖讀不到就換成佔位圖（#cg 仍保持開啟，對話照常疊在上面）
  const img = new Image();
  img.onerror = () => { const el = $('cg'); if (el.classList.contains('on') && el.style.backgroundImage.includes(def.file)) el.style.backgroundImage = `url("${cgPlaceholder(id)}")`; };
  img.src = 'assets/' + def.file;
}

// ---------- 合成音效（還沒有音檔，先用 Web Audio 合成） ----------
function noiseBuf(ac, dur) {
  const buf = ac.createBuffer(1, Math.max(1, ac.sampleRate * dur), ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
// 濾波噪音一下：type 濾波類型、f 頻率、dur 長度、v 音量
function noiseHit(ac, t, { type = 'bandpass', f = 1200, q = 1, dur = 0.2, v = 0.2 }) {
  const src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = noiseBuf(ac, dur); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  g.gain.setValueAtTime(v * Music.vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(fl); fl.connect(g); g.connect(ac.destination); src.start(t);
}
function toneHit(ac, t, { type = 'sine', f0 = 200, f1 = f0, dur = 0.3, v = 0.3 }) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * Music.vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + 0.05);
}
Object.assign(Sfx, {
  // 手機鬧鐘：刺耳的方波「滴滴滴滴」，響 dur 秒
  alarm(dur = 2.4) {
    const ac = this.ctx(); if (!ac) return; const t = ac.currentTime + 0.02;
    for (let i = 0; i < dur / 0.5; i++) for (let k = 0; k < 4; k++) toneHit(ac, t + i * 0.5 + k * 0.09, { type: 'square', f0: 2093, dur: 0.06, v: 0.06 });
  },
  // 石頭砸進樹叢：枝葉嘩啦
  bush() { const ac = this.ctx(); if (!ac) return; const t = ac.currentTime + 0.02; noiseHit(ac, t, { f: 2600, q: 0.7, dur: 0.5, v: 0.25 }); noiseHit(ac, t + 0.08, { f: 1500, q: 0.9, dur: 0.35, v: 0.15 }); },
  // 踢枯枝：一連串像腳步的悶響
  steps() { const ac = this.ctx(); if (!ac) return; const t = ac.currentTime + 0.02; for (let i = 0; i < 7; i++) noiseHit(ac, t + i * 0.16 + Math.random() * 0.05, { type: 'lowpass', f: 700, dur: 0.12, v: 0.3 }); },
  // 挨棍
  club() { const ac = this.ctx(); if (!ac) return; const t = ac.currentTime + 0.02; toneHit(ac, t, { f0: 160, f1: 50, dur: 0.35, v: 0.5 }); noiseHit(ac, t, { type: 'lowpass', f: 900, dur: 0.15, v: 0.35 }); },
  // 斧背敲樹：木頭的「咚」
  axeTap() { const ac = this.ctx(); if (!ac) return; const t = ac.currentTime + 0.02; toneHit(ac, t, { type: 'triangle', f0: 320, f1: 140, dur: 0.25, v: 0.4 }); noiseHit(ac, t, { f: 1800, q: 2, dur: 0.06, v: 0.2 }); },
  // 門軸嘎吱一聲，木片啪地落地
  doorFall() {
    const ac = this.ctx(); if (!ac) return; const t = ac.currentTime + 0.02;
    toneHit(ac, t, { type: 'sawtooth', f0: 180, f1: 120, dur: 0.5, v: 0.05 });
    noiseHit(ac, t + 0.55, { f: 1400, q: 1.5, dur: 0.12, v: 0.35 }); toneHit(ac, t + 0.55, { type: 'triangle', f0: 260, f1: 160, dur: 0.15, v: 0.3 });
  },
  // 牌匾砸地：悶悶的木頭「咚」加一陣塵土
  plaqueFall() { const ac = this.ctx(); if (!ac) return; const t = ac.currentTime + 0.02; toneHit(ac, t, { type: 'triangle', f0: 150, f1: 60, dur: 0.3, v: 0.45 }); noiseHit(ac, t, { type: 'lowpass', f: 1200, dur: 0.25, v: 0.3 }); },
  // 揪住衣服：布料被扯緊的「嘶」
  cloth() { const ac = this.ctx(); if (!ac) return; const t = ac.currentTime + 0.02; noiseHit(ac, t, { type: 'highpass', f: 2400, dur: 0.22, v: 0.22 }); noiseHit(ac, t + 0.05, { f: 900, q: 0.8, dur: 0.12, v: 0.15 }); },
  // 雨滴「滴答」
  drip() { const ac = this.ctx(); if (!ac) return; const t = ac.currentTime + 0.02; toneHit(ac, t, { f0: 1500, f1: 700, dur: 0.12, v: 0.2 }); },
  // 床板傾倒「砰」
  bedFall() { const ac = this.ctx(); if (!ac) return; const t = ac.currentTime + 0.02; noiseHit(ac, t, { f: 1100, q: 1.2, dur: 0.1, v: 0.35 }); toneHit(ac, t + 0.05, { f0: 120, f1: 40, dur: 0.5, v: 0.55 }); },
  // 悶雷
  thunder() { const ac = this.ctx(); if (!ac) return; const t = ac.currentTime + 0.02; noiseHit(ac, t, { type: 'lowpass', f: 180, dur: 2.4, v: 0.6 }); noiseHit(ac, t + 0.3, { type: 'lowpass', f: 120, dur: 1.8, v: 0.4 }); },
});

// ---------- 小動畫 ----------
// 對話框收起 ms 毫秒、期間跑 fn，結束後接下一句（跟 ch01.js 的 pause 一樣的做法）
function holdFor(ms, fn) {
  D.hold = true; $('dlg').classList.remove('open');
  if (fn) fn();
  setTimeout(() => { D.hold = false; $('dlg').classList.add('open'); step(); }, ms);
}
// 震屏：畫布左右抖動
function shakeScreen(ms = 300, amp = 6) {
  const t0 = performance.now();
  const tick = () => {
    const p = (performance.now() - t0) / ms;
    if (p >= 1) { C.style.transform = ''; return; }
    const a = amp * (1 - p);
    C.style.transform = `translate(${(Math.random() - 0.5) * 2 * a}px, ${(Math.random() - 0.5) * 2 * a}px)`;
    requestAnimationFrame(tick);
  };
  tick();
}
// 投石：石頭從主角手上畫一道拋物線飛進惡徒南側的灌木，落點枝葉晃動
function throwStone(tx, ty) {
  const sx = player.x, sy = player.y - 40;
  worldFx.push({ t: 0, dur: 1.1, draw(p) {
    const k = Math.min(1, p / 0.55);
    if (k < 1) {
      const x = sx + (tx - sx) * k - cam.x, y = sy + (ty - sy) * k - 120 * 4 * k * (1 - k) - cam.y;
      ctx.fillStyle = '#6a6258'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      return;
    }
    // 落點：幾片葉子往外噴
    const q = (p - 0.55) / 0.45;
    ctx.globalAlpha = 1 - q; ctx.fillStyle = '#5a7a34';
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; ctx.fillRect(Math.round(tx + Math.cos(a) * 26 * q - cam.x), Math.round(ty - 20 + Math.sin(a) * 16 * q + 30 * q * q - cam.y), 3, 2); }
    ctx.globalAlpha = 1;
  } });
  setTimeout(() => { Sfx.bush(); shakeThrowBush(); }, 600);
}
// 被石頭打中的灌木左右晃 1.2 秒（直接挪動地圖上那叢灌木的位置）
function shakeThrowBush() {
  const b = wwThrowBush; if (!b) return;
  const x0 = WW_THROW_BUSH.x, t0 = performance.now();
  const tick = () => { const p = (performance.now() - t0) / 1200; if (p >= 1) { b.x = x0; return; } b.x = x0 + Math.round(Math.sin(p * 30) * 3 * (1 - p)); requestAnimationFrame(tick); };
  tick();
}
// 漏雨：雨滴從屋頂破洞落到主角頭上（持續 dur 秒）
function rainDrops(dur = 9) {
  const drops = Array.from({ length: 16 }, (_, i) => ({ d: i * 0.55 + Math.random() * 0.3, dx: (Math.random() - 0.5) * 16 }));
  worldFx.push({ t: 0, dur, draw(p) {
    const t = p * dur;
    ctx.fillStyle = '#a8c8e8';
    for (const q of drops) {
      const k = (t - q.d) / 0.5; if (k < 0 || k > 1) continue;
      const x = player.x + q.dx - cam.x, y = player.y - 160 + k * 110 - cam.y;
      ctx.globalAlpha = 0.85; ctx.fillRect(Math.round(x), Math.round(y), 2, 6);
    }
    ctx.globalAlpha = 1;
  } });
}
// S12 門板掉落：門框上的腐朽木片晃兩下、翻轉落地、彈一下揚起灰塵；之後躺在門前，王宅修好才清掉
const DOOR_CHIP_REST = 1.42;
let doorChipFalling = false;
function doorChipPos() { const b = bld('river'); return { sx: b.doorX - 16, sy: b.doorY - 52, ex: b.doorX - 30, ey: b.doorY + 14 }; }
function drawDoorChip(x, y, a, g = ctx) {
  g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(a);
  g.fillStyle = '#2a1a0c'; g.fillRect(-5, -15, 10, 30);
  g.fillStyle = '#6a4a2a'; g.fillRect(-4, -14, 8, 28);
  g.fillStyle = '#8a6a40'; g.fillRect(-4, -14, 2, 28);
  g.fillStyle = '#4a3018'; g.fillRect(0, -8, 1, 10); g.fillRect(-2, 6, 1, 6);
  g.fillStyle = '#9a9a9a'; g.fillRect(-1, -12, 2, 2);
  g.restore();
}
function doorChipFall() {
  const { sx, sy, ex, ey } = doorChipPos(), dur = 1.3;
  doorChipFalling = true; F().ch02_door_chip = 1; Sfx.doorFall(); plaqueFall();
  worldFx.push({ t: 0, dur, draw(p) {
    const t = p * dur;
    let x = sx, y = sy, a = 0;
    if (t < 0.45) a = Math.sin(t * 38) * 0.09 * (t / 0.45);
    else if (t < 0.6) { const k = (t - 0.45) / 0.15; x = sx + (ex - sx) * k; y = sy + (ey - sy) * k * k; a = DOOR_CHIP_REST * k; }
    else { const k = Math.min(1, (t - 0.6) / 0.22); x = ex; y = ey - Math.sin(k * Math.PI) * 5; a = DOOR_CHIP_REST + Math.sin(k * Math.PI) * 0.12; }
    drawDoorChip(x - cam.x, y - cam.y, a);
    if (t > 0.58) {
      const q = Math.min(1, (t - 0.58) / 0.7);
      ctx.fillStyle = `rgba(170,140,100,${0.4 * (1 - q)})`;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(ex - cam.x + (i - 1.5) * 12, ey + 4 - cam.y - q * 8, 5 + q * 12, 0, Math.PI * 2); ctx.fill(); }
    }
    if (p >= 1) doorChipFalling = false;
  } });
  setTimeout(() => { doorChipFalling = false; shakeScreen(140, 2); }, dur * 1000);
}
// 第 2 章推門後匾額、門板木片就在地上；走完第 2 章卻沒有推門旗標的存檔也當作已掉落（第 3 章要撿起來掛回去）
const plaqueDown = () => F().ch02_door_chip || F().ch02_complete;
// 躺在地上的匾額與木片是依 y 排序的圖：王宅圖的台階會蓋住地面層，所以不能畫在地面層
let restSp = null;
function drawDoorChipRest() {
  const R = MAPS.village; if (G.id !== 'village' || !R) return;
  if (!restSp) {
    const p = plaquePos(), d = doorChipPos();
    const [pc, pg] = canvas(72, 40); pg.translate(6, 12); pg.scale(1, 0.7); pg.rotate(PLAQUE_REST); pg.drawImage(plaqueImg || (plaqueImg = makePlaque()), -4, -1);
    const [dc, dg] = canvas(40, 40); drawDoorChip(20, 20, DOOR_CHIP_REST, dg);
    const empty = canvas(1, 1)[0];
    restSp = { empty, plaque: { img: empty, full: pc, x: p.lx, y: p.ly + 16, ax: 6, ay: 28 }, chip: { img: empty, full: dc, x: d.ex, y: d.ey + 8, ax: 20, ay: 28 } };
    R.sprites.push(restSp.plaque, restSp.chip);
  }
  // 第 3 章：匾額掛回去（ch03_sign）、門修好（ch03_door）後就不再躺在地上
  const f = F(), down = plaqueDown();
  restSp.plaque.img = down && !plaqueFalling && !signRising && !f.ch03_sign ? restSp.plaque.full : restSp.empty;
  restSp.chip.img = down && !doorChipFalling && !f.ch03_door ? restSp.chip.full : restSp.empty;
}

// 王宅牌匾：門樓樑下歪掛一塊破牌匾（只剩左邊一根釘子），推門時順著釘子盪下來、釘子鬆脫砸在地上
// 位置以王宅門口（bld('river') 的 doorX/doorY）為準：王宅_破舊.png 門樓橫樑在門口上方約 60px
const PLAQUE_TILT = 0.16, PLAQUE_DROP = 1.35, PLAQUE_REST = -0.1;
let plaqueImg = null, plaqueSp = null, plaqueFalling = false;
function plaquePos() { const b = bld('river'); return { nx: b.doorX - 26, ny: b.doorY - 64, lx: b.doorX + 16, ly: b.doorY + 22 }; }
function makePlaque() {
  const [c, g] = canvas(56, 24);
  g.fillStyle = '#1e140c'; g.fillRect(0, 0, 56, 24);
  g.fillStyle = '#4a3220'; g.fillRect(3, 3, 50, 18); g.fillStyle = '#5c4028'; g.fillRect(3, 3, 50, 3);
  g.fillStyle = '#2a1c10'; g.fillRect(6, 14, 15, 1); g.fillRect(34, 6, 1, 11); g.fillRect(35, 16, 9, 1);
  g.font = 'bold 15px "Noto Serif TC","PMingLiU",serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#a8884a'; g.fillText('王', 17, 13); g.globalAlpha = 0.55; g.fillText('宅', 39, 13); g.globalAlpha = 1;
  g.fillStyle = '#4a3220'; g.fillRect(40, 8, 4, 4); g.fillRect(35, 15, 3, 4); g.fillRect(14, 16, 3, 3);
  g.clearRect(48, 16, 8, 8); g.clearRect(52, 13, 4, 3);
  g.fillStyle = '#1e140c'; g.fillRect(47, 16, 1, 6); g.fillRect(48, 15, 4, 1); g.fillRect(52, 12, 1, 1);
  g.fillStyle = '#4a6a2a'; g.fillRect(0, 0, 7, 3); g.fillRect(0, 3, 3, 4); g.fillStyle = '#6a8a3a'; g.fillRect(1, 0, 3, 1);
  return c;
}
// x, y：釘子（牌匾左上角）的畫面座標；sy：躺在地上時縱向壓扁
function drawPlaque(x, y, a, sy = 1) {
  plaqueImg = plaqueImg || makePlaque();
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(1, sy); ctx.rotate(a); ctx.drawImage(plaqueImg, -4, -1); ctx.restore();
}
// 掛在門樓上的牌匾是依 y 排序的圖片，疊在王宅圖上、被站在門前的人擋住
function syncPlaque() {
  const R = MAPS.village; if (!R) return;
  const p = plaquePos();
  if (!plaqueSp) {
    plaqueImg = plaqueImg || makePlaque();
    const [c, g] = canvas(76, 56), ncx = 8, ncy = 6;
    g.save(); g.translate(ncx, ncy); g.rotate(PLAQUE_TILT); g.drawImage(plaqueImg, -4, -1); g.restore();
    g.fillStyle = '#8a8a86'; g.fillRect(ncx - 1, ncy - 1, 2, 2);
    plaqueSp = { hang: c, img: c, x: p.nx, y: bld('river').doorY + 0.5, ax: ncx, ay: bld('river').doorY + 0.5 - p.ny + ncy };
    R.sprites.push(plaqueSp);
  }
  const f = F(), show = !plaqueDown() && !f.wang_house_repaired;
  // 第 3 章重新掛回的匾額：端端正正，兩顆釘子
  if (f.ch03_sign && !plaqueSp.straight) {
    const [c, g] = canvas(76, 56), ncx = 8, ncy = 6;
    g.drawImage(plaqueImg, ncx - 4, ncy - 1);
    g.fillStyle = '#8a8a86'; g.fillRect(ncx - 1, ncy - 1, 2, 2); g.fillRect(ncx + 47, ncy - 1, 2, 2);
    plaqueSp.straight = c;
  }
  plaqueSp.img = signRising ? canvas(1, 1)[0] : f.ch03_sign ? plaqueSp.straight : show ? plaqueSp.hang : canvas(1, 1)[0];
}
// 推門：先抖一下 → 順著釘子盪成垂直 → 晃兩下 → 釘子鬆脫掉下 → 砸地彈起揚塵
function plaqueFall() {
  const p = plaquePos(), dur = 2.0;
  plaqueFalling = true; if (plaqueSp) plaqueSp.img = canvas(1, 1)[0];
  worldFx.push({ t: 0, dur, draw(q) {
    const t = q * dur;
    let x = p.nx, y = p.ny, a = PLAQUE_TILT, sy = 1;
    if (t < 0.3) a = PLAQUE_TILT + Math.sin(t * 50) * 0.04;
    else if (t < 0.75) { const k = (t - 0.3) / 0.45, e = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2); a = PLAQUE_TILT + (PLAQUE_DROP - PLAQUE_TILT) * e; }
    else if (t < 1.05) a = PLAQUE_DROP + Math.sin((t - 0.75) * 18) * 0.12 * (1 - (t - 0.75) / 0.3);
    else if (t < 1.3) { const k = (t - 1.05) / 0.25; x = p.nx + (p.lx - p.nx) * k; y = p.ny + (p.ly - p.ny) * k * k; a = PLAQUE_DROP + (PLAQUE_REST - PLAQUE_DROP) * k; sy = 1 - 0.3 * k; }
    else { const k = Math.min(1, (t - 1.3) / 0.22); x = p.lx; y = p.ly - Math.sin(k * Math.PI) * 4; a = PLAQUE_REST + Math.sin(k * Math.PI) * 0.1; sy = 0.7; }
    if (t < 1.05) { ctx.fillStyle = '#8a8a86'; ctx.fillRect(Math.round(p.nx - cam.x) - 1, Math.round(p.ny - cam.y) - 1, 2, 2); }
    drawPlaque(x - cam.x, y - cam.y, a, sy);
    if (t > 1.28) {
      const d = Math.min(1, (t - 1.28) / 0.7), cx = p.lx + 24 - cam.x, cy = p.ly + 10 - cam.y;
      ctx.fillStyle = `rgba(170,140,100,${0.45 * (1 - d)})`;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(cx + (i - 2) * 11, cy - d * 8, 5 + d * 13, 0, Math.PI * 2); ctx.fill(); }
    }
  } });
  setTimeout(() => { Sfx.plaqueFall(); shakeScreen(200, 3); }, 1300);
  setTimeout(() => { plaqueFalling = false; }, dur * 1000);
}
// 低頭看：匾額在地上「還沒死透」再左右晃一下才停住，木片與匾額周圍的灰慢慢飄散
function debrisSettle() {
  const p = plaquePos(), { ex, ey } = doorChipPos(), dur = 1.4;
  plaqueFalling = true;
  const motes = Array.from({ length: 10 }, (_, i) => ({ x: (i < 6 ? p.lx + 24 : ex) + (hash2(i, 7) - 0.5) * 50, y: (i < 6 ? p.ly + 8 : ey) + (hash2(i, 3) - 0.5) * 10, r: 4 + hash2(i, 5) * 6 }));
  worldFx.push({ t: 0, dur, draw(q) {
    const t = q * dur, w = t < 0.7 ? Math.sin(t / 0.7 * Math.PI * 2) * 0.07 * (1 - t / 0.7) : 0;
    drawPlaque(p.lx - cam.x, p.ly - cam.y - Math.abs(w) * 12, PLAQUE_REST + w, 0.7);
    for (const m of motes) {
      ctx.fillStyle = `rgba(170,140,100,${0.28 * (1 - q)})`;
      ctx.beginPath(); ctx.arc(m.x - cam.x + Math.sin(t * 2 + m.r) * 6 * q, m.y - cam.y - q * 14, m.r + q * 8, 0, Math.PI * 2); ctx.fill();
    }
  } });
  setTimeout(() => { plaqueFalling = false; }, 700);
}

// S15 床倒：王宅舊床以左側床腳為支點傾斜約 10°（右端翻起），王宅修好前保持歪斜
const BED_TILT = -0.17;
// 床畫在王宅底圖上：從底圖裁出床（WROOM.bedBox）當成獨立圖片，平常不顯示，歪斜時才畫旋轉後的床，原位蓋一層陰影
let bedSp = null;
function wangBed() {
  if (bedSp) return bedSp;
  const R = MAPS.in_river; if (!R) return null;
  const [x0, y0, x1, y1] = WROOM.bedBox, [c, g] = canvas(x1 - x0, y1 - y0);
  g.drawImage(R.groundBase || R.ground, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
  bedSp = { img: canvas(1, 1)[0], img0: c, x: WROOM.bed.x, y: WROOM.bed.y, ax: 0, ay: 0, ax0: WROOM.bed.x - x0, ay0: y1 - y0, tilt: 0 };
  R.sprites.push(bedSp);
  return bedSp;
}
function setBedTilt(a) {
  const s = wangBed(); if (!s || s.tilt === a) return;
  s.tilt = a;
  if (!a) { Object.assign(s, { img: canvas(1, 1)[0], ax: 0, ay: 0 }); return; }
  const src = s.img0, [c, g] = canvas(src.width + 60, src.height + 80), px = 40, py = s.ay0 + 60;
  g.translate(px, py); g.rotate(a); g.drawImage(src, 0, -s.ay0);
  Object.assign(s, { img: c, ax: px + s.ax0, ay: py });
}
function drawBedShadow() {
  const s = bedSp; if (!s || !s.tilt) return;
  const [x0, y0, x1, y1] = WROOM.bedBox;
  ctx.fillStyle = 'rgba(14,9,5,.72)'; ctx.fillRect(Math.round(x0 - cam.x), Math.round(y0 - cam.y), x1 - x0, y1 - y0);
}
function bedTiltFall() {
  F().ch02_bed_tilt = 1;
  tweenActor(null, 420, (p) => setBedTilt(p < 0.6 ? BED_TILT * (p / 0.6) : BED_TILT * (1 + Math.sin((p - 0.6) / 0.4 * Math.PI) * 0.15)));
}
function syncBedTilt() {
  const f = F(), s = wangBed(); if (!s) return;
  const want = f.ch02_bed_tilt && !f.wang_house_repaired ? BED_TILT : 0;
  if ((s.tilt === 0) !== (want === 0)) setBedTilt(want);
  drawBedShadow();
}

// 屋頂破洞：從破洞斜照下來的一道月光、地上的光斑與碎瓦、飄浮的灰塵（王宅修好前才有）
const ROOF_TOP = { x: 268, y: 96 };
let tilesImg = null;
function makeTiles() {
  const [c, g] = canvas(64, 26);
  const tile = (x, y, w, h, a) => {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = '#3a3a40'; g.fillRect(-w / 2, -h / 2 + 2, w, h);
    g.fillStyle = '#6a6a72'; g.fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle = '#8a8a94'; g.fillRect(-w / 2, -h / 2, w, 2);
    g.fillStyle = '#4a4a52'; g.fillRect(-w / 2 + 3, -h / 2 + 3, 1, h - 4); g.fillRect(-w / 2 + w - 4, -h / 2 + 3, 1, h - 4);
    g.restore();
  };
  tile(14, 14, 16, 9, -0.35); tile(34, 9, 14, 8, 0.5); tile(48, 17, 12, 7, -0.1); tile(26, 19, 9, 5, 1.1);
  g.fillStyle = '#5a5a62'; for (const [x, y] of [[6, 22], [41, 22], [57, 8], [22, 4], [31, 23]]) g.fillRect(x, y, 3, 2);
  return (tilesImg = c);
}
function drawRoofHole() {
  if (G.id !== 'in_river' || F().wang_house_repaired) return;
  const x = WHOLE.x - cam.x, y = WHOLE.y - cam.y, tx = ROOF_TOP.x - cam.x, ty = ROOF_TOP.y - cam.y, t = performance.now();
  ctx.save();
  const gr = ctx.createLinearGradient(tx, ty, x, y); gr.addColorStop(0, 'rgba(216,228,255,.32)'); gr.addColorStop(1, 'rgba(216,228,255,.08)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(tx - 34, ty); ctx.lineTo(tx + 34, ty); ctx.lineTo(x + 50, y); ctx.lineTo(x - 50, y); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 0.22; ctx.fillStyle = '#d8e4ff';
  ctx.beginPath(); ctx.ellipse(x, y, 52, 20, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.ellipse(x, y, 28, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1; ctx.drawImage(tilesImg || makeTiles(), Math.round(x - 30), Math.round(y - 8));
  ctx.fillStyle = '#e8eeff';
  for (let i = 0; i < 9; i++) {
    const k = ((t / 5200 + i / 9) % 1), px = tx + (x - tx) * k + Math.sin(t / 900 + i * 2.1) * 18, py = ty + (y - ty) * k;
    ctx.globalAlpha = 0.5 * Math.sin(k * Math.PI); ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
  }
  ctx.restore();
}

// 王宅門框：門口右側掉下來的一截門框與碎木、生鏽的釘子（調查點「門框」）
let frameImg = null;
function makeFrameDebris() {
  const [c, g] = canvas(78, 40);
  g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(40, 32, 36, 6, 0, 0, Math.PI * 2); g.fill();
  g.save(); g.translate(40, 22); g.rotate(-0.18);
  g.fillStyle = '#3a2412'; g.fillRect(-32, -4, 60, 11);
  g.fillStyle = '#6e4a28'; g.fillRect(-32, -6, 60, 10);
  g.fillStyle = '#8a6036'; g.fillRect(-32, -6, 60, 2);
  g.fillStyle = '#4a2e16'; for (const x of [-22, -6, 10]) g.fillRect(x, -4, 9, 1);
  g.fillStyle = '#6e4a28'; g.beginPath(); g.moveTo(28, -6); g.lineTo(36, -3); g.lineTo(30, -1); g.lineTo(37, 2); g.lineTo(28, 4); g.closePath(); g.fill();
  g.fillStyle = '#8a3a1a'; g.fillRect(-26, -9, 2, 5); g.fillStyle = '#5a2a14'; g.fillRect(-27, -10, 4, 2);
  g.restore();
  const chip = (x, y, w, a) => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#5a3a1e'; g.fillRect(-w / 2, -2, w, 4); g.fillStyle = '#9a6e40'; g.fillRect(-w / 2, -2, w, 1); g.restore(); };
  chip(12, 33, 14, 0.6); chip(62, 34, 12, -0.4); chip(70, 26, 8, 1.2); chip(22, 26, 7, -0.9);
  g.fillStyle = '#9a9a9a'; g.fillRect(52, 35, 5, 1); g.fillRect(56, 34, 1, 3);
  return (frameImg = c);
}
function drawWangProps() {
  if (G.id !== 'in_river' || F().wang_house_repaired) return;
  const d = frameImg || makeFrameDebris();
  ctx.drawImage(d, Math.round(WROOM.door.x + 50 - 39 - cam.x), Math.round(WROOM.door.y - 30 - 28 - cam.y));
}

// 挨棍（hero_hurt.png 第 1–3 格）、跌坐（hero_sit.png）
const HURT_SEQ = [[1, 140], [2, 160], [3, 700]];

Object.assign(STORY_HOOKS, {
  cg2: (e) => showCh02Cg(e.id),
  shake: (e) => shakeScreen(e.ms, e.amp),
  // { sound, times, gap }：連續播放同一個合成音效
  sfx2: (e) => { for (let i = 0; i < (e.times || 1); i++) setTimeout(() => Sfx[e.sound](), i * (e.gap || 300)); },
  throwStone: () => holdFor(1200, () => throwStone(CH02.fogBush.x, CH02.fogBush.y)),
  hurt: () => { Sfx.club(); shakeScreen(320, 7); emote('player', '!'); playPose(heroHurtImg, HURT_SEQ, false); },
  rainDrops: (e) => rainDrops(e.dur),
  bedFall: () => { Sfx.bedFall(); shakeScreen(380, 8); bedTiltFall(); playPose(heroSitImg, SIT_DOWN.slice(0, 5), true); },
  doorChip: () => doorChipFall(),
  debrisSettle: () => debrisSettle(),
  clearPose: () => { poseImg = null; lookFr = null; },
  emote: (e) => emote(e.who, e.icon),
  // 投石後：兩名惡徒一起冒驚嘆號、轉頭望向南邊的樹叢
  thugsTurn: () => { for (const id of ['thug_f1', 'thug_f2']) { emote(id, '!'); const a = actorOf(id); if (a) a.dir = 0; } },
  // 鬧鐘響起：兩人冒問號、左右張望約 2.5 秒
  thugsLook: () => {
    for (const id of ['thug_f1', 'thug_f2']) emote(id, '?', 2.2);
    let n = 0;
    const iv = setInterval(() => {
      [['thug_f1', [2, 3, 1, 2, 3]], ['thug_f2', [3, 2, 1, 3, 2]]].forEach(([id, ds]) => { const a = actorOf(id); if (a) a.dir = ds[n % ds.length]; });
      if (++n >= 6) clearInterval(iv);
    }, 420);
  },
  phoneWave: () => phoneWave(2.6),
  // 揪帽T：橫肉漢子貼上來，把主角拎高幾像素、左右晃兩下，之後一直拎著
  grabHood: () => holdFor(900, () => {
    const t = actorOf('thug_f1'); if (t) { t.x = player.x + 26; t.y = player.y - 4; t.dir = 2; }
    player.dir = 3; Sfx.cloth(); emote('player', '!');
    tweenActor(player, 700, (p) => { player.lift = Math.round(Math.min(1, p / 0.25) * 7); player.jx = p < 0.85 ? Math.round(Math.sin(p * 28) * 2) : 0; });
  }),
  // 再次舉棍：橫肉漢子往後仰一下，畫面輕震
  raiseClub: () => holdFor(600, () => {
    const t = actorOf('thug_f1'); if (!t) return;
    tweenActor(t, 450, (p) => { t.lift = Math.round(Math.sin(p * Math.PI) * 4); t.jx = Math.round(Math.sin(p * Math.PI) * 5); });
    setTimeout(() => shakeScreen(220, 3), 300);
  }),
  // 老吳出現：橫肉漢子鬆手，主角落回地面
  dropHood: () => { player.lift = 0; player.jx = 0; },
  branchSlide: () => { F().ch02_kicked = 1; branchSlide(); shakeScreen(260, 3); },
  // 林道線索：腳印、草藥兩處都看過就能前往觀察點
  ch02Clue: (e) => {
    F()[e.key] = 1;
    const n = ['ch02_c_foot', 'ch02_c_herb'].filter((k) => F()[k]).length;
    if (n >= 2 && !F().ch02_clues) { F().ch02_clues = 1; toast('線索足夠了：先找個能看清楚狀況的地方'); }
  },
  // 救援完成的狀態一次提交：手機只扣一次 3%（讀檔、重播都不會再扣）
  ch02Rescued: () => {
    const f = F();
    if (!f.ch02_batt_spent) { f.ch02_batt_spent = 1; f.phone_batt = Math.max(0, phoneBatt() - 3); }
    Object.assign(f, { ch02_rescued: 1, left_shoulder_bruised: 1, shen_ankle_sprained: 1, torch: 0 });
  },
  // 王宅三處調查（門框、屋頂、木床）
  ch02House: (e) => {
    F()[e.key] = 1;
    const n = ['ch02_h_door', 'ch02_h_roof', 'ch02_h_bed'].filter((k) => F()[k]).length;
    toast(`王宅調查 ${n}/3`);
    if (n >= 3) F().ch02_house_checked = 1;
  },
  // 三日之約：兩則提示依序出現
  permitToast: () => { toast('新據點解鎖：王宅'); setTimeout(() => toast('跨章節任務：三日之約'), 2700); },
  autosave: () => { if (saveGame()) toast('已自動存檔'); },
});

// ---------- 林道線索：直接畫在地上（腳印、散落的草藥），救下若蘭後就不再畫 ----------
// 腳印：兩組又大又深的追著一組小的；[x, y, 大小, 左右腳]，以 CH02.foot 為中心往東延伸
const CLUE_STEPS = [];
for (let i = 0; i < 6; i++) {
  CLUE_STEPS.push([-70 + i * 26, -6 + (i % 2) * 7, 1, i % 2]); // 小腳印（逃跑，步子亂）
  CLUE_STEPS.push([-80 + i * 30, 4 + (i % 2) * 8, 1.6, i % 2]);
  CLUE_STEPS.push([-64 + i * 30, -14 + (i % 2) * 8, 1.6, i % 2]);
}
function drawFootprint(x, y, s, flip) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.12 + (flip ? 0.2 : 0));
  ctx.fillStyle = 'rgba(52,32,18,.55)';
  ctx.beginPath(); ctx.ellipse(0, 0, 2.6 * s, 1.7 * s, 0, 0, Math.PI * 2); ctx.fill(); // 前掌
  ctx.beginPath(); ctx.ellipse(-4.2 * s, 0.2 * s, 1.7 * s, 1.4 * s, 0, 0, Math.PI * 2); ctx.fill(); // 腳跟
  ctx.fillStyle = 'rgba(150,110,70,.35)'; ctx.fillRect(Math.round(1.5 * s), Math.round(-1.8 * s), 2, 1); // 泥邊反光
  ctx.restore();
}
function drawHerbSprig(x, y, k) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(k);
  ctx.fillStyle = '#5a3b22'; ctx.fillRect(-7, -1, 4, 2); // 帶泥的根
  ctx.fillStyle = '#7c5a32'; ctx.fillRect(-8, 0, 2, 1);
  ctx.fillStyle = '#3f6b2a'; ctx.fillRect(-3, -1, 10, 1); // 莖
  ctx.fillStyle = '#5f9a3a';
  for (const [lx, ly] of [[0, -3], [3, 1], [5, -3], [7, 0]]) ctx.fillRect(lx, ly, 3, 2);
  ctx.fillStyle = '#9fd06a'; ctx.fillRect(5, -3, 1, 1); ctx.fillRect(1, -3, 1, 1);
  ctx.restore();
}
function drawCh02Clues(t) {
  const f = F(); if (!f.ch01_voice || f.ch02_rescued) return;
  const ox = -cam.x, oy = -cam.y;
  if (!f.ch02_kicked) drawBranchPile(Math.round(CH02.branches.x + ox), Math.round(CH02.branches.y + oy));
  // 樹根旁的石塊（岩石素材縮小），撿起前一直在
  if (!f.ch02_stone && DECOR['岩石']) { const w = 26, h = Math.round(w * 59 / 77); ctx.imageSmoothingEnabled = true; ctx.drawImage(DECOR['岩石'], Math.round(CH02.stone.x - w / 2 + ox), Math.round(CH02.stone.y - h + 4 + oy), w, h); ctx.imageSmoothingEnabled = false; }
  for (const [dx, dy, s, fl] of CLUE_STEPS) drawFootprint(Math.round(CH02.foot.x + dx + ox), Math.round(CH02.foot.y + dy + oy), s, fl);
  [[-14, -4, 0.3], [6, 6, -0.5], [18, -8, 0.9], [-30, 8, -0.2], [34, 2, 0.4]].forEach(([dx, dy, k]) => drawHerbSprig(Math.round(CH02.herb.x + dx + ox), Math.round(CH02.herb.y + dy + oy), k));
}

// 枯枝堆：幾根粗細不一的枯枝交疊（深色描邊＋亮面），夾著幾片乾葉
// [起點 dx, dy, 長度, 角度, 粗細]
const BRANCH_PILE = [[-20, 2, 34, -0.18, 3], [-14, -4, 30, 0.35, 2], [-4, -8, 28, -0.5, 2], [-24, -6, 22, 0.1, 2], [2, 0, 24, -0.08, 3], [-10, 4, 26, 0.22, 2], [6, -6, 16, 0.8, 2]];
const BRANCH_LEAVES = [[-16, -6, '#a8742e'], [-2, -2, '#c08a3a'], [10, -4, '#8a5a24'], [-8, 4, '#b07a30'], [14, 2, '#9a6a2a'], [-22, 0, '#c4964a']];
function drawBranchPile(x, y) {
  ctx.fillStyle = 'rgba(16,22,10,.28)'; ctx.beginPath(); ctx.ellipse(x - 2, y + 4, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
  for (const [dx, dy, len, ang, w] of BRANCH_PILE) {
    ctx.save(); ctx.translate(x + dx, y + dy); ctx.rotate(ang);
    ctx.fillStyle = '#2e1e10'; ctx.fillRect(-1, -1, len + 2, w + 2);
    ctx.fillStyle = '#6b4a2a'; ctx.fillRect(0, 0, len, w);
    ctx.fillStyle = '#9a7246'; ctx.fillRect(1, 0, len - 3, 1);
    ctx.fillStyle = '#5a3d22'; ctx.fillRect(Math.round(len * 0.6), -2, 1, 2); // 小分岔
    ctx.restore();
  }
  for (const [dx, dy, c] of BRANCH_LEAVES) { ctx.fillStyle = c; ctx.fillRect(x + dx, y + dy, 3, 2); ctx.fillRect(x + dx + 1, y + dy - 1, 1, 1); }
}

// 依時間逐幀呼叫 fn(p)，p 由 0 到 1
function tweenActor(a, ms, fn) {
  const t0 = performance.now();
  const tick = () => { const p = Math.min(1, (performance.now() - t0) / ms); fn(p); if (p < 1) requestAnimationFrame(tick); };
  tick();
}

// ---------- 林道救援：大樹掩體、手機按鈕、鬧鐘音波、枯枝滑落 ----------
// 看到現場之後、救人之前，停在藏身處附近就蹲著
function ch02Hiding() {
  const f = F();
  return G.id === 'wildwood' && f.ch02_vantage && !f.ch02_rescued && !player.moving && !scripted && Math.hypot(player.x - CH02.vantage.x, player.y - CH02.vantage.y) < 60;
}
// 投石之後畫面下方出現手機按鈕，不用翻選單
const ALARM_READY = { allFlags: ['ch02_thrown'], notFlags: ['ch02_alarm'] };
function ch02Tick() {
  $('phoneBtn').classList.toggle('on', G.id === 'wildwood' && storyCond(ALARM_READY) && !isModal());
}
function ch02PhoneAlarm() {
  if (isModal() || !storyCond(ALARM_READY)) return;
  $('phoneBtn').classList.remove('on'); talk(dialogueItems('dlg_ch02_alarm'));
}
// 鬧鐘：從主角手上一圈一圈往兩側擴散的音波
function phoneWave(dur) {
  worldFx.push({ t: 0, dur, draw(p) {
    const x = player.x - cam.x + 8, y = player.y - cam.y - 40, t = p * dur;
    ctx.save(); ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const k = (t * 1.4 + i / 3) % 1, r = 8 + k * 70;
      ctx.strokeStyle = `rgba(255,240,170,${(1 - k) * 0.85})`;
      ctx.beginPath(); ctx.arc(x, y, r, -1.2, 1.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, r, Math.PI - 1.2, Math.PI + 1.2); ctx.stroke();
    }
    ctx.restore();
  } });
}
// 踢枯枝：枯枝和落葉被踢得四散，揚起一陣塵土
function branchSlide() {
  const bx = CH02.branches.x, by = CH02.branches.y;
  const bits = Array.from({ length: 14 }, (_, i) => ({ dx: (Math.random() - 0.5) * 50, v: 40 + Math.random() * 50, d: Math.random() * 0.3, stick: i % 3 === 0, r: Math.random() * 3 }));
  worldFx.push({ t: 0, dur: 1.4, draw(p) {
    const t = p * 1.4;
    ctx.globalAlpha = Math.max(0, 1 - p * 0.9);
    for (const b of bits) {
      const k = Math.max(0, t - b.d), x = bx + b.dx + k * 18 - cam.x, y = by - 20 + k * b.v - cam.y;
      if (b.stick) { ctx.save(); ctx.translate(x, y); ctx.rotate(b.r + k * 4); ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-7, -1, 14, 2); ctx.restore(); }
      else { ctx.fillStyle = '#9a7a3a'; ctx.fillRect(Math.round(x), Math.round(y), 3, 2); }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(170,140,100,${0.35 * (1 - p)})`;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(bx - cam.x + (i - 2) * 14, by + 24 - cam.y - p * 10, 8 + p * 16, 0, Math.PI * 2); ctx.fill(); }
  } });
}
