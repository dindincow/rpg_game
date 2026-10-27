'use strict';
// 標題畫面演出：第一次先顯示「按任意鍵開始」（瀏覽器要等玩家按過才准出聲），按下後淡入標題影片、按鈕依序浮上
// 畫面邊緣的暖光、標題後的光暈與飄浮光點跟著音樂低音變化（TITLE_BEAT：離線算好的每 0.1 秒低音強度）
let titleEntered = false;
const TFX = { on: false, parts: [], last: 0, lvl: 0 };
const titleIsOpen = () => $('title').classList.contains('open');

// showTitle 呼叫：第一次停在「按任意鍵開始」，之後回到標題直接進場
function titleOpen() {
  const t = $('title'); t.classList.remove('entered');
  if (!titleEntered) t.classList.add('pressing'); else titleEnter();
  if (!TFX.on) { TFX.on = true; TFX.last = performance.now(); requestAnimationFrame(titleFrame); }
}
function titleEnter() {
  titleEntered = true;
  const t = $('title'); t.classList.remove('pressing'); void t.offsetWidth; t.classList.add('entered');
  TitleMusic.play();
}
for (const ev of ['keydown', 'pointerdown']) window.addEventListener(ev, (e) => {
  if (!titleIsOpen() || !$('title').classList.contains('pressing')) return;
  if (e.key === 'F12') return;
  e.preventDefault(); e.stopPropagation(); titleEnter();
}, true);

// 音樂目前的低音強度 0–1：上升快、下降慢，光才不會一閃一閃
function titleLevel(dt) {
  const a = TitleMusic.a, raw = a.paused ? 0 : (TITLE_BEAT.env[Math.floor(a.currentTime / TITLE_BEAT.step)] || 0) / 99;
  TFX.lvl += (raw - TFX.lvl) * Math.min(1, dt * (raw > TFX.lvl ? 14 : 3));
  return TFX.lvl;
}
function titleFrame(now) {
  if (!titleIsOpen()) { TFX.on = false; TFX.parts.length = 0; return; }
  const dt = Math.min(0.05, (now - TFX.last) / 1000); TFX.last = now;
  const cv = $('titleFx'), W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const g = cv.getContext('2d'), lvl = titleLevel(dt), k = W / 960;
  g.clearRect(0, 0, W, H);
  if ($('title').classList.contains('entered')) {
    g.globalCompositeOperation = 'lighter';
    // 畫面邊緣的暖光：每一拍亮一下
    const eg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.75);
    eg.addColorStop(0, 'rgba(0,0,0,0)'); eg.addColorStop(1, `rgba(255,150,60,${0.05 + lvl * 0.22})`);
    g.fillStyle = eg; g.fillRect(0, 0, W, H);
    // 書法標題後方的光暈（標題約在畫面 70%、30% 處）
    const lx = W * 0.7, ly = H * 0.32, lg = g.createRadialGradient(lx, ly, 0, lx, ly, W * 0.3);
    lg.addColorStop(0, `rgba(255,214,150,${0.04 + lvl * 0.16})`); lg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
    // 飄浮粒子：金色光點往上飄、紅色花瓣斜斜飄落；音樂強時多一點、快一點
    const P = TFX.parts;
    if (P.length < 60 && Math.random() < dt * (3 + lvl * 9)) {
      const mote = Math.random() < 0.65;
      P.push(mote ? { mote, x: Math.random() * W, y: H + 10, vx: (Math.random() - 0.5) * 12, vy: -(14 + Math.random() * 22), r: 1 + Math.random() * 2, ph: Math.random() * 6, life: 0 }
        : { mote, x: Math.random() * W * 1.1 - W * 0.1, y: -10, vx: 18 + Math.random() * 22, vy: 22 + Math.random() * 20, r: 3 + Math.random() * 2.5, ph: Math.random() * 6, rot: Math.random() * 6, life: 0, c: ['#e0503c', '#f08a6a', '#f2b45a'][(Math.random() * 3) | 0] });
    }
    const sp = 1 + lvl * 1.2;
    for (const p of P) {
      p.life += dt; p.ph += dt * 2;
      p.x += (p.vx + Math.sin(p.ph) * (p.mote ? 6 : 14)) * dt * sp * k; p.y += p.vy * dt * sp * k;
      if (p.mote) {
        const a = Math.min(1, p.life) * (0.35 + lvl * 0.65) * (0.6 + Math.sin(p.ph * 2) * 0.4);
        const rg = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4 * k);
        rg.addColorStop(0, `rgba(255,224,150,${a})`); rg.addColorStop(1, 'rgba(255,200,100,0)');
        g.fillStyle = rg; g.fillRect(p.x - p.r * 4 * k, p.y - p.r * 4 * k, p.r * 8 * k, p.r * 8 * k);
      } else {
        g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = Math.min(1, p.life * 2) * 0.85;
        g.translate(p.x, p.y); g.rotate(p.rot + p.ph); g.fillStyle = p.c;
        g.beginPath(); g.ellipse(0, 0, p.r * k, p.r * 0.5 * k, 0, 0, Math.PI * 2); g.fill(); g.restore();
      }
    }
    TFX.parts = P.filter((p) => p.y > -20 && p.y < H + 20 && p.x < W + 30);
    g.globalCompositeOperation = 'source-over';
  }
  requestAnimationFrame(titleFrame);
}

// 按鈕：滑過時輕輕一聲「叮」；開始遊戲前白光一閃
function titleDing() {
  const ac = Sfx.ctx(); if (!ac || !Music.on) return;
  const t = ac.currentTime + 0.01, o = ac.createOscillator(), o2 = ac.createOscillator(), gn = ac.createGain();
  o.type = 'sine'; o.frequency.value = 1568; o2.type = 'sine'; o2.frequency.value = 2349;
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.06 * Music.vol, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.connect(gn); o2.connect(gn); gn.connect(ac.destination); o.start(t); o2.start(t); o.stop(t + 0.55); o2.stop(t + 0.55);
}
function titleFlash(fn) {
  const f = $('flash'); f.style.transition = 'opacity .15s'; f.style.opacity = 1;
  setTimeout(() => { fn(); f.style.transition = 'opacity 1.2s'; f.style.opacity = 0; }, 180);
}
for (const b of document.querySelectorAll('.title .btns button')) b.addEventListener('mouseenter', () => { if (!b.disabled) titleDing(); });
$('btnNew').onclick = () => titleFlash(() => beginGame(false));
$('btnContinue').onclick = () => titleFlash(() => beginGame(true));
