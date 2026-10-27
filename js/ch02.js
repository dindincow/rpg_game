'use strict';
// 第 2 章演出：CG（缺圖時顯示佔位圖）、林道救援的投石與挨棍、手機鬧鐘、王宅漏雨床倒，以及合成音效
// 劇情資料在 story_data.js；台詞以 小說劇本/CH02_飢餓的清河村_完整小說劇本.txt 為準

// ---------- CG：有檔案就顯示，沒有就畫一張佔位圖，不會黑畫面 ----------
// 檔案放 assets/cg/；佔位圖寫上 CG ID 與構圖說明，方便美術對照補圖
const CH02_CG = {
  ch02_forest_rescue: { file: 'cg/第2章_林道呼救.png', note: '野林、跌坐的沈若蘭、翻倒的藥簍與小鋤、兩名惡徒' },
  ch02_porridge: { file: 'cg/第2章_半碗粥.png', note: '小蓮把稀粥推給祖母，小蝦米在後方靜靜看著' },
  ch02_first_night: { file: 'cg/第2章_第一夜.png', note: '王宅舊木床旁，小蝦米看著手機，冷光與月光' },
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
// 投石：石頭從主角手上畫一道拋物線飛進濃霧樹叢，落點枝葉晃動
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
  setTimeout(() => Sfx.bush(), 600);
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
// 屋頂破洞：月光照在地上的一塊光斑（王宅修好前才有）
function drawRoofHole() {
  if (G.id !== 'in_river' || F().wang_house_repaired) return;
  const x = WHOLE.x - cam.x, y = WHOLE.y - cam.y;
  ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#d8e4ff';
  ctx.beginPath(); ctx.ellipse(x, y, 46, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.ellipse(x, y, 24, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
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
  bedFall: () => { Sfx.bedFall(); shakeScreen(380, 8); playPose(heroSitImg, SIT_DOWN.slice(0, 5), true); },
  clearPose: () => { poseImg = null; lookFr = null; },
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
  for (const [dx, dy, s, fl] of CLUE_STEPS) drawFootprint(Math.round(CH02.foot.x + dx + ox), Math.round(CH02.foot.y + dy + oy), s, fl);
  [[-14, -4, 0.3], [6, 6, -0.5], [18, -8, 0.9], [-30, 8, -0.2], [34, 2, 0.4]].forEach(([dx, dy, k]) => drawHerbSprig(Math.round(CH02.herb.x + dx + ox), Math.round(CH02.herb.y + dy + oy), k));
}
