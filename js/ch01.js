'use strict';
// 第 1 章演出：CG 上的介面（電腦視窗、手機畫面）、白光、甦醒時的模糊對焦，以及手機（手電筒、電量）
// CG 圖都是 1448×1086；介面位置以原圖像素標記 [x, y, w, h]，顯示時依 #cg 的 cover 縮放換算
const CG_W = 1448, CG_H = 1086;
const CG_RECT = { popup: [372, 270, 712, 296], phone: [566, 124, 352, 738] };
function cgPlace(el, [x, y, w, h]) {
  const box = $('cg'), bw = box.clientWidth, bh = box.clientHeight, k = Math.max(bw / CG_W, bh / CG_H);
  const ox = (bw - CG_W * k) / 2, oy = (bh - CG_H * k) / 2;
  Object.assign(el.style, { left: ox + x * k + 'px', top: oy + y * k + 'px', width: w * k + 'px', height: h * k + 'px', fontSize: 40 * k + 'px' });
}
let cgTyping = null;
function cgUi(kind) {
  const ui = $('cgUi'); ui.replaceChildren(); clearInterval(cgTyping);
  if (!kind) return;
  const el = document.createElement('div'); el.className = 'cgui-' + kind; ui.appendChild(el); cgPlace(el, CG_RECT[kind]);
  if (kind === 'popup') {
    Sfx.glow();
    // 視窗裡的字一個一個打出來
    const msg = '若有機會改變一個世界，\n你願意付出什麼代價？'; let n = 0;
    cgTyping = setInterval(() => { el.textContent = msg.slice(0, ++n); if (n >= msg.length) clearInterval(cgTyping); }, 90);
  } else el.innerHTML = phoneHtml();
}

// ---------- 手機：電量只剩 12%，時間停在 03:17；手電筒開著會耗電 ----------
// 掉到 9% 會進入省電模式、關掉手電筒（第 2 章開場固定 9%，林道救援用鬧鐘再扣 3%）
const PHONE_SAVER = 9;
const phoneBatt = () => Math.max(0, Math.ceil(F().phone_batt ?? 12));
const torchOn = () => !!F().torch && phoneBatt() > 0 && has('phone');
function phoneHtml() {
  const b = phoneBatt();
  if (!b) return '<div class="dead"></div>';
  return `<div class="sb"><span>03:17</span><span>無服務　<i class="${b <= 5 ? 'low' : ''}">${b}%</i></span></div>
    <div class="clock">03:17</div><div class="date">無法取得日期與時間</div>
    <div class="note">⚠ 沒有網路連線<br>GPS：定位失敗</div>
    <div class="torch${torchOn() ? ' on' : ''}">手電筒　${torchOn() ? '開' : '關'}</div>`;
}
function usePhone() {
  if (menuOpen) closeMenu();
  if (!F().ch01_bag) { F().ch01_bag = 1; questTick(); }
  const show = () => { showCg('cg/手機特寫.png'); cgUi('phone'); };
  if (!phoneBatt()) return talk([show, '（不管怎麼按，螢幕都是黑的。）', [HERO_NAME, '……最後一點電，就這樣沒了。']]);
  // 第 2 章林道救援：投石之後用鬧鐘引開惡徒
  const alarm = storyCond({ allFlags: ['ch02_thrown'], notFlags: ['ch02_alarm'] });
  talk([show, { name: '', q: `（電量 ${phoneBatt()}%。時間停在 03:17，一直沒有動過。）`, choices: [
    ...(alarm ? [['打開鬧鐘，音量開到最大', () => dialogueItems('dlg_ch02_alarm')]] : []),
    [torchOn() ? '關掉手電筒' : '打開手電筒', () => {
      if (F().phone_saver && !torchOn()) return ['（螢幕上跳出「省電模式中」。）', [HERO_NAME, '剩這點電……還是留著，說不定待會兒用得上。']];
      F().torch = !torchOn(); cgUi('phone');
      return F().torch ? ['（一道白光照亮了腳下。）', [HERO_NAME, '手電筒很耗電……省著點用。']] : ['（四周又暗了下來。）'];
    }],
    ['收起手機', () => []],
  ] }]);
}
function updatePhone(dt) {
  if (!S || !torchOn()) return;
  // 手電筒開著時約 90 秒耗 1%；掉到 9% 自動進入省電模式
  F().phone_batt = Math.max(PHONE_SAVER, (F().phone_batt ?? 12) - dt / 90);
  if (F().phone_batt <= PHONE_SAVER) { F().torch = 0; F().phone_saver = 1; toast(`電量 ${PHONE_SAVER}%：已開啟省電模式，手電筒關閉`); }
}

// ---------- 開場音樂與音效 ----------
// 辦公室那段播 assets/music/辦公室.mp3；被吸進螢幕時音樂斷掉，醒來後才接回地圖音樂
const SceneMusic = {
  a: null, timer: null,
  play(src) {
    this.stop(0);
    this.a = Object.assign(new Audio(src), { loop: true, volume: 0 });
    this.a.play().catch(() => {}); this.fade(Music.vol, 1500);
  },
  fade(to, ms, after) {
    clearInterval(this.timer); const a = this.a; if (!a) return;
    const from = a.volume, t0 = performance.now();
    this.timer = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / ms); a.volume = Math.max(0, Math.min(1, from + (to - from) * p));
      if (p >= 1) { clearInterval(this.timer); this.timer = null; if (after) after(); }
    }, 40);
  },
  stop(ms = 300) { const a = this.a; if (!a) return; if (!ms) { a.pause(); this.a = null; return; } this.fade(0, ms, () => { a.pause(); if (this.a === a) this.a = null; }); },
};
// 合成音效：視窗亮起的嗡鳴、被吸進螢幕的倒吸聲與落地的悶響
Object.assign(Sfx, {
  // 視窗亮起：幾個略微走音的正弦波慢慢浮起，再疊一層高頻閃爍
  glow(vol = 1) {
    const ac = this.ctx(); if (!ac) return;
    const t = ac.currentTime + 0.02, out = ac.createGain(), v = 0.07 * vol * Music.vol;
    out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(v, t + 1.2); out.gain.exponentialRampToValueAtTime(0.0001, t + 3.2); out.connect(ac.destination);
    for (const f of [220, 277.2, 329.6, 440.8, 880, 1318.5]) {
      const o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain();
      o.type = 'sine'; o.frequency.value = f * (0.995 + Math.random() * 0.01);
      lfo.frequency.value = 3 + Math.random() * 4; lg.gain.value = f * 0.004; lfo.connect(lg); lg.connect(o.frequency);
      o.connect(out); o.start(t); lfo.start(t); o.stop(t + 3.3); lfo.stop(t + 3.3);
    }
  },
  // 被吸進去：濾波噪音由低往高掃、音高往上拉，越來越大聲，最後一下子斷掉
  suck(dur = 1.1, vol = 1) {
    const ac = this.ctx(); if (!ac) return;
    const t = ac.currentTime + 0.02, v = vol * Music.vol;
    const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = buf; bp.type = 'bandpass'; bp.Q.value = 2.5;
    bp.frequency.setValueAtTime(180, t); bp.frequency.exponentialRampToValueAtTime(5200, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35 * v, t + dur * 0.95); g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(bp); bp.connect(g); g.connect(ac.destination); src.start(t);
    const o = ac.createOscillator(), og = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(1400, t + dur);
    og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.05 * v, t + dur * 0.9); og.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(og); og.connect(ac.destination); o.start(t); o.stop(t + dur + 0.05);
  },
  // 白光之後的一聲悶響（像被甩出來）
  thud(vol = 1) {
    const ac = this.ctx(); if (!ac) return;
    const t = ac.currentTime + 0.02, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * vol * Music.vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 1);
  },
});

// ---------- 白光、甦醒時的模糊對焦 ----------
// 被吸進螢幕：對話框收起 → 倒吸聲、畫面往螢幕裡衝（放大）→ 白光、音樂斷掉 → 悶響
function suckIn() {
  D.hold = true; $('dlg').classList.remove('open');
  const cg = $('cg'), dur = 1.1;
  Sfx.suck(dur); SceneMusic.fade(0, dur * 1000);
  cg.style.transition = 'opacity .8s, transform ' + dur + 's cubic-bezier(.6,0,1,1), filter ' + dur + 's ease-in';
  cg.style.transform = 'scale(2.4)'; cg.style.filter = 'brightness(2.2) blur(2px)';
  setTimeout(() => {
    cg.style.transition = ''; cg.style.transform = ''; cg.style.filter = '';
    SceneMusic.stop(0); flashWhite();
    setTimeout(() => Sfx.thud(), 700);
    D.hold = false; $('dlg').classList.add('open'); step();
  }, dur * 1000);
}
function flashWhite() {
  const f = $('flash'); f.style.transition = 'none'; f.style.opacity = 1;
  // 光退去後留下全黑的 CG 底，畫面背後先模糊、壓暗，等 wakeFocus 再對焦
  const cg = $('cg'); cg.style.backgroundImage = 'none'; cg.classList.add('on'); cgUi(null);
  C.style.transition = 'none'; C.style.filter = 'blur(10px) brightness(.45)'; $('vignette').classList.add('on');
  requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = 'opacity 1.6s'; f.style.opacity = 0; }));
}
function wakeFocus() {
  Sfx.wind(0.6);
  C.style.transition = 'filter 5s ease-out'; C.style.filter = 'blur(0px) brightness(1)';
  setTimeout(() => { $('vignette').classList.remove('on'); C.style.transition = ''; C.style.filter = ''; }, 5200);
}

// 林深處的輕功黑影（秦無風的伏筆）：鏡頭推過去 → 「鏘」一聲、一道刀光 → 黑影從地面躍起，踏著樹梢連跳，拖著殘影，落腳處灑下葉子 → 跳出畫面
// 播放時對話框先收起；畫在夜色之上（drawOverFx），黑影才不會被夜色吃掉
let overFx = [];
// [起點 x, y, 終點 x, y, 拋物線高度]（世界座標）
// 由右往左：從東邊林地躍起，往西踏樹梢而去
const LEAP_HOPS = [[170, 70, 65, -20, 90], [65, -20, -55, -60, 85], [-55, -60, -530, -170, 150]].map(([a, b, c, d, h]) => [LEAP_C.x + a, LEAP_C.y + b, LEAP_C.x + c, LEAP_C.y + d, h]);
const LEAP_WAIT = 1.1, LEAP_HOP = 0.36, LEAP_PAUSE = 0.08;
function shadowLeap() {
  D.hold = true; $('dlg').classList.remove('open');
  const art = CHAR_ART.qinwufeng, sheet = art && art.walk, fw = sheet ? art.fw || CHAR_FW : 0;
  const t0 = LEAP_WAIT + 0.2, end = t0 + LEAP_HOPS.length * (LEAP_HOP + LEAP_PAUSE), leaves = [];
  let t = 0, last = performance.now(), clashed = false, released = false;
  // 第 i 跳的位置（世界座標）；停頓時停在落腳處
  const pos = (tt) => {
    const k = (tt - t0) / (LEAP_HOP + LEAP_PAUSE), i = Math.min(LEAP_HOPS.length - 1, Math.max(0, Math.floor(k)));
    const [x0, y0, x1, y1, arc] = LEAP_HOPS[i], p = Math.min(1, Math.max(0, (tt - t0 - i * (LEAP_HOP + LEAP_PAUSE)) / LEAP_HOP));
    return [x0 + (x1 - x0) * p, y0 + (y1 - y0) * p - arc * 4 * p * (1 - p), p];
  };
  const figure = (x, y, alpha) => {
    const sz = 64 * 1.35, sx = x - cam.x - sz / 2, sy = y - cam.y - FOOT * 1.35;
    ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false;
    if (sheet) {
      // 月光描邊（淡色、略大）＋黑色剪影；都加模糊，只看得出輪廓
      ctx.filter = 'brightness(0) invert(.75) blur(3px)'; ctx.globalAlpha = alpha * 0.45; ctx.drawImage(sheet, 2 * fw, 2 * fw, fw, fw, sx - 1, sy - 1, sz + 2, sz + 2);
      ctx.filter = 'brightness(0) blur(1.6px)'; ctx.globalAlpha = alpha; ctx.drawImage(sheet, 2 * fw, 2 * fw, fw, fw, sx, sy, sz, sz);
    } else { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x - cam.x, y - cam.y - 30, 11, 30, 0.3, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  };
  overFx.push({ draw() {
    const now = performance.now(); t += Math.min(0.05, (now - last) / 1000); last = now;
    if (t < LEAP_WAIT) return true;
    // 刀光：斜斜一道白光，0.3 秒淡掉
    if (!clashed) { clashed = true; Sfx.clash(1); setTimeout(() => Sfx.clash(0.8), 170); }
    const sl = (t - LEAP_WAIT) / 0.3;
    if (sl < 1) {
      ctx.save(); ctx.globalAlpha = 1 - sl; ctx.strokeStyle = '#fff'; ctx.shadowColor = '#cfe8ff'; ctx.shadowBlur = 18; ctx.lineCap = 'round';
      const cx = LEAP_C.x + 190 - cam.x, cy = LEAP_C.y + 60 - cam.y, len = 70 + sl * 50;
      ctx.lineWidth = 4 * (1 - sl) + 1; ctx.beginPath(); ctx.moveTo(cx + len, cy + len * 0.45); ctx.lineTo(cx - len, cy - len * 0.45); ctx.stroke();
      ctx.restore();
    }
    if (t >= t0 && t < end) {
      // 殘影：往前幾個時間點的位置，越早越淡
      for (let k = 4; k >= 1; k--) { const tt = t - k * 0.035; if (tt >= t0) { const [x, y] = pos(tt); figure(x, y, 0.28 * (1 - k / 5)); } }
      const [x, y, p] = pos(t); figure(x, y, 1);
      // 落腳：灑葉子（每一跳落地時一次，最後一跳飛出畫面不灑）
      const i = Math.floor((t - t0) / (LEAP_HOP + LEAP_PAUSE));
      if (p >= 1 && i < LEAP_HOPS.length - 1 && !leaves.some((l) => l.hop === i)) {
        for (let n = 0; n < 10; n++) leaves.push({ hop: i, x, y: y - 20, vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 30, ph: Math.random() * 6, born: t, c: ['#4a6a2a', '#6a8a3a', '#8a6a2a'][n % 3] });
      }
    }
    for (const l of leaves) {
      const a = t - l.born; if (a > 1.6) continue;
      const lx = l.x + l.vx * a + Math.sin(l.ph + a * 6) * 6 - cam.x, ly = l.y + l.vy * a + 60 * a * a - cam.y;
      ctx.globalAlpha = 1 - a / 1.6; ctx.fillStyle = l.c; ctx.fillRect(Math.round(lx), Math.round(ly), 3, Math.sin(l.ph + a * 8) > 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
    if (t >= end && !released) { released = true; D.hold = false; $('dlg').classList.add('open'); step(); }
    return t < end + 1.6;
  } });
}
function drawOverFx() { overFx = overFx.filter((f) => f.draw()); }

Object.assign(STORY_HOOKS, {
  cgUi: (e) => cgUi(e.ui),
  flash: () => flashWhite(),
  suckIn: () => suckIn(),
  sceneMusic: (e) => { if (Music.on) SceneMusic.play(e.src); },
  // 開場結束：接回地圖音樂
  bgmResume: () => { SceneMusic.stop(800); if (Music.on) Music.fadeBgm(Music.vol, 2500); },
  wakeFocus: () => wakeFocus(),
  shadowLeap: () => shadowLeap(),
  passTime: (e) => fade(() => passTime(e.min), 600),
  // 天色轉亮：時間至少推到 e.min 分（黎明前後，夜色會隨時間慢慢退去）
  // 黑影事件：手機跳出省電模式，手電筒熄滅，電量停在 9%
  phoneSaver: () => { F().phone_batt = PHONE_SAVER; F().torch = 0; F().phone_saver = 1; },
  dawnTo: (e) => { S.time = Math.max(S.time, e.min); },
});

// 爬起來之後探頭探腦：有張望動作圖（hero_look.png，單列 8 格）就照格播放；沒有圖時改用轉方向＋左右探身
// 播放時對話框先收起，播完才接下一句
// poseImg／lookFr：目前播放中的單列動作圖與格數（game.js drawPlayer 會改畫這一格）
let heroLookImg = null, heroSitImg = null, heroDustImg = null, heroPackImg = null, poseImg = null, lookFr = null;
// 動作圖各格：0 扶頭茫然、1 看左、2 手遮額頭望左、3 縮肩緊張、4 看右、5 望右、6 抬頭看樹梢、7 抓背包冒冷汗
const LOOK_SEQ = [[0, 900], [1, 650], [2, 1000], [3, 550], [4, 650], [5, 1000], [6, 1000], [7, 1100]];
// [朝向, 往那邊探出的距離, 停留毫秒]；朝向 0 下 1 上 2 左 3 右
const LOOK_FALLBACK = [[0, 0, 500], [2, -6, 700], [3, 6, 700], [2, -9, 350], [3, 9, 350], [1, 0, 1000], [0, 0, 600]];
function lookAround() {
  D.hold = true; $('dlg').classList.remove('open');
  const ox = player.x, oy = player.y, art = !!heroLookImg;
  const seq = art ? LOOK_SEQ : LOOK_FALLBACK, total = seq.reduce((n, s) => n + s[s.length - 1], 0) / 1000;
  worldFx.push({ t: 0, dur: total, draw(p) {
    const ch = p < 0.82 ? '?' : '!', x = player.x - cam.x, y = player.y - cam.y - 64 * player.scale - 4 - Math.abs(Math.sin(p * 18)) * 3;
    ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = '#1a1510';
    ctx.strokeText(ch, x, y); ctx.fillStyle = '#ffe070'; ctx.fillText(ch, x, y);
  } });
  let i = 0;
  const next = () => {
    if (i >= seq.length) { lookFr = null; poseImg = null; player.x = ox; player.y = oy; player.dir = 0; D.hold = false; $('dlg').classList.add('open'); step(); return; }
    const s = seq[i++];
    if (art) { poseImg = heroLookImg; lookFr = s[0]; }
    else { player.dir = s[0]; player.x = ox + s[1]; player.y = oy + (s[0] === 1 ? -2 : 0); }
    setTimeout(next, s[s.length - 1]);
  };
  next();
}
// 單列動作圖照 [格, 毫秒] 播放；播放時對話框收起，播完停在最後一格（keep）或回到走路圖
function playPose(img, seq, keep) {
  if (!img) return;
  D.hold = true; $('dlg').classList.remove('open');
  let i = 0;
  const next = () => {
    if (i >= seq.length) { if (!keep) { poseImg = null; lookFr = null; } player.dir = 0; D.hold = false; $('dlg').classList.add('open'); step(); return; }
    const [fr, ms] = seq[i++]; poseImg = img; lookFr = fr; player.dir = 0;
    setTimeout(next, ms);
  };
  next();
}
// 跌坐（hero_sit.png）：0 站、1 腿軟、2 伸手撐、3 往後倒、4 屁股著地、5 閉眼喘氣、6 擦汗、7 坐著發呆
const SIT_DOWN = [[0, 200], [1, 220], [2, 220], [3, 220], [4, 450], [5, 900], [6, 1000], [7, 300]];
const SIT_UP = [[4, 260], [2, 260], [1, 260], [0, 200]];
// 拍泥（hero_dust.png）：0 站、1 低頭、2–5 拍大腿／屁股／膝蓋、6 甩手、7 站
const DUST = [[0, 150], [1, 260], [2, 200], [3, 200], [4, 240], [5, 200], [6, 300], [7, 160]];
// 背背包（hero_pack.png）：0 背包在腳邊、1 低頭、2 彎腰抓肩帶、3 提起、4 甩上肩、5 套肩帶、6 拉緊、7 站好
const PACK = [[0, 260], [1, 260], [2, 280], [3, 220], [4, 220], [5, 260], [6, 260], [7, 160]];
// ---------- 小人物的簡單演技：坐下、頭上冒符號、藥草光點 ----------
const actorOf = (who) => (who === 'player' ? player : npcs.find((n) => n.id === who));
// 頭上冒符號（💦 汗、… 沉默、! 驚嚇、♪ 開心），跳一下再淡掉
function emote(who, icon, dur = 1.8) {
  const a = actorOf(who); if (!a) return;
  worldFx.push({ t: 0, dur, draw(p) {
    const x = a.x - cam.x + 14, y = a.y - cam.y - 64 * a.scale * (a.sit ? 0.74 : 1) - 6 - Math.max(0, Math.sin(Math.min(1, p * 4) * Math.PI)) * 8;
    ctx.save(); ctx.globalAlpha = p > 0.8 ? (1 - p) / 0.2 : 1;
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x - 13, y - 13, 26, 22, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 5, y + 8); ctx.lineTo(x - 9, y + 14); ctx.lineTo(x + 1, y + 8); ctx.fill();
    ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = icon === '!' ? '#d0402a' : icon === '♪' ? '#c0607a' : icon === '💦' ? '#3a8ad0' : '#3a2a18';
    ctx.fillText(icon, x, y - 2); ctx.restore();
  } });
}
// 綠色藥草光點：從 who 身上冒出、往上飄
function herbGlow(who, dur = 1.6) {
  const a = actorOf(who); if (!a) return;
  const pts = Array.from({ length: 14 }, () => ({ dx: (Math.random() - 0.5) * 30, d: Math.random() * 0.5, s: 30 + Math.random() * 30 }));
  worldFx.push({ t: 0, dur, draw(p) {
    for (const q of pts) {
      const k = (p - q.d) / (1 - q.d); if (k < 0) continue;
      const x = a.x - cam.x + q.dx, y = a.y - cam.y - 30 - k * q.s;
      ctx.globalAlpha = Math.sin(k * Math.PI) * 0.9; ctx.fillStyle = k < 0.5 ? '#c8f0a0' : '#80d060';
      ctx.fillRect(Math.round(x), Math.round(y), 3, 3);
    }
    ctx.globalAlpha = 1;
  } });
}
// 沈若蘭受傷包藥（assets/characters/shenruolan_aid.png）：0 站、1 絆到、2 跌倒、3 坐地抱腳踝、4–5 檢查藥簍、6 遞出布包、7 捧著布包
const ruolanAid = Object.assign(new Image(), { src: 'assets/characters/shenruolan_aid.png' });
// 依序播放 NPC 的動作格，播完停在最後一格；播放時對話框收起
function npcPose(who, seq, flip) {
  const a = actorOf(who); if (!a || !ruolanAid.complete || !ruolanAid.naturalWidth) return;
  D.hold = true; $('dlg').classList.remove('open');
  let i = 0;
  const next = () => {
    if (i >= seq.length) { D.hold = false; $('dlg').classList.add('open'); step(); return; }
    const [fr, ms] = seq[i++]; a.pose = { img: ruolanAid, fr, flip: !!flip };
    setTimeout(next, ms);
  };
  next();
}
Object.assign(STORY_HOOKS, {
  // { who, seq: [[格, 毫秒]…], flip }；{ who, clear: true } 回到走路圖
  npcPose: (e) => { if (e.clear) { const a = actorOf(e.who); if (a) a.pose = null; return; } npcPose(e.who, e.seq, e.flip); },
});
Object.assign(STORY_HOOKS, {
  // { who, on }：坐下／站起（npc 或 'player'）；{ who, dir }：轉向
  sit: (e) => { const a = actorOf(e.who); if (a) a.sit = e.on !== false; },
  face: (e) => { const a = actorOf(e.who); if (a) { a.dir = e.dir; a.frame = 0; } },
  emote: (e) => emote(e.who, e.icon),
  herbGlow: (e) => herbGlow(e.who),
  // 對話框收起一會兒，讓小人物的動作被看見
  pause: (e) => { D.hold = true; $('dlg').classList.remove('open'); setTimeout(() => { D.hold = false; $('dlg').classList.add('open'); step(); }, e.ms || 800); },
});
Object.assign(STORY_HOOKS, {
  lookAround: () => lookAround(),
  sitDown: () => playPose(heroSitImg, SIT_DOWN, true),
  sitUp: () => playPose(heroSitImg, SIT_UP, false),
  dustOff: () => playPose(heroDustImg, DUST, false),
  packUp: () => playPose(heroPackImg, PACK, false),
});
