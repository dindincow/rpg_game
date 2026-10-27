'use strict';
// 回合制戰鬥：依速度排序行動，指令有攻擊、仙術、道具、防禦、逃跑
const B = { on: false, enemies: [], fx: [], nums: [], anims: [], bg: null, menu: null, opts: {}, intro: 0, shake: 0, bossTurns: 0,
  hero: { x: 740, y: 368, ox: 0, oy: 0, flash: 0, frame: 0, guard: false, alpha: 1 } };
// 各地圖的戰鬥背景圖（assets/battle/<名稱>.png），boot() 載入
const BATTLE_BG_FILES = { field: '雲山官道', forest: '雲山官道', village: '雲山官道' }, BATTLE_BG = {};

// ---------- 敵人造型（像素塊組合） ----------
// parts: ['e', cx, cy, rx, ry, 色盤] 橢圓、['r', x, y, w, h, 色盤] 矩形；色盤 = [輪廓, 暗, 中, 亮]
function creature(w, h, parts, details, soft) {
  const BK = 3, [c, g] = canvas(w, h), GW = Math.ceil(w / BK), GH = Math.ceil(h / BK);
  const own = new Int16Array(GW * GH).fill(-1), shade = new Uint8Array(GW * GH);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const px = i * BK + 1.5, py = j * BK + 1.5;
    for (let k = parts.length - 1; k >= 0; k--) {
      const [t, a, b, cc, d] = parts[k];
      let inside = false, s = 2;
      if (t === 'e') {
        const dx = (px - a) / cc, dy = (py - b) / d;
        if (dx * dx + dy * dy < 1) { inside = true; const v = -dx * 0.4 - dy * 0.8; s = v > (soft ? 0.5 : 0.35) ? 3 : v < (soft ? -0.75 : -0.35) ? 1 : 2; }
      } else if (px >= a && px < a + cc && py >= b && py < b + d) { inside = true; const v = (py - b) / d; s = v < 0.3 ? 3 : v > 0.75 ? 1 : 2; }
      if (inside) { own[j * GW + i] = k; shade[j * GW + i] = s; break; }
    }
  }
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const o = own[j * GW + i]; if (o < 0) continue;
    const nb = [i > 0 ? own[j * GW + i - 1] : -1, i < GW - 1 ? own[j * GW + i + 1] : -1, j > 0 ? own[(j - 1) * GW + i] : -1, j < GH - 1 ? own[(j + 1) * GW + i] : -1];
    const idx = nb.some((v) => v < o) ? 0 : shade[j * GW + i]; // 鄰格為空或屬於後方部件 → 輪廓
    g.fillStyle = parts[o][5][idx]; g.fillRect(i * BK, j * BK, BK, BK);
  }
  if (details) details(g);
  return { img: c, ax: w / 2, ay: h - 6 };
}
const PAL = {
  wolf: ['#1e1e24', '#4a4a54', '#7a7a86', '#a8a8b4'], wolfL: ['#1e1e24', '#8a8a90', '#b4b4ba', '#d8d8dc'], wolfD: ['#141418', '#2e2e36', '#44444e', '#5a5a66'],
  boar: ['#1e120a', '#4a2e1a', '#6e4628', '#94643a'], boarD: ['#140c06', '#2e1c10', '#3e2616', '#523422'], boarS: ['#2a1410', '#8a5a48', '#b07a64', '#d09a82'],
  tusk: ['#3a3a30', '#d8d0b0', '#f0ead0', '#ffffff'],
  snake: ['#0e1e0e', '#2a5a26', '#4a8a3a', '#7ab85a'], snakeY: ['#1e1e0e', '#a8a050', '#c8c070', '#e0d890'],
};
const ART = {};
function enemyArt(kind) {
  if (ART[kind]) return ART[kind];
  if (ENEMIES[kind] && ENEMIES[kind].art) return enemyArt(ENEMIES[kind].art);
  const real = MON_ART[kind] && MON_ART[kind].battle;
  if (real) return (ART[kind] = { img: real, ax: real.width / 2, ay: real.height - 2 });
  const P = PAL;
  let a;
  if (kind === 'wolf') a = creature(156, 108, [
    ['e', 20, 40, 11, 6, P.wolf], ['e', 34, 48, 13, 7, P.wolf], ['r', 40, 58, 9, 40, P.wolfD], ['r', 100, 58, 9, 40, P.wolfD],
    ['e', 76, 54, 40, 20, P.wolf], ['r', 58, 62, 9, 36, P.wolf], ['r', 114, 62, 9, 36, P.wolf], ['e', 108, 56, 16, 17, P.wolfL],
    ['e', 114, 22, 5, 10, P.wolfD], ['e', 128, 21, 5, 10, P.wolfD], ['e', 123, 38, 17, 13, P.wolf], ['e', 140, 44, 12, 6, P.wolf],
  ], (g) => { g.fillStyle = '#ff4a30'; g.fillRect(127, 33, 5, 4); g.fillStyle = '#111'; g.fillRect(149, 41, 4, 4); g.fillStyle = '#f4f0e0'; g.fillRect(138, 49, 3, 3); g.fillRect(144, 49, 3, 3); });
  else if (kind === 'boar') a = creature(160, 110, [
    ['r', 44, 66, 11, 38, P.boarD], ['r', 98, 66, 11, 38, P.boarD], ['e', 78, 60, 46, 27, P.boar], ['r', 62, 70, 11, 34, P.boar], ['r', 114, 70, 11, 34, P.boar],
    ['e', 72, 36, 34, 9, P.boarD], ['e', 110, 42, 6, 9, P.boarD], ['e', 120, 64, 22, 19, P.boar], ['e', 140, 70, 10, 9, P.boarS], ['e', 136, 82, 3, 8, P.tusk],
  ], (g) => { g.fillStyle = '#f0c040'; g.fillRect(124, 56, 4, 4); g.fillStyle = '#2a1410'; g.fillRect(143, 67, 3, 3); g.fillRect(143, 73, 3, 3); });
  else if (kind === 'snake') a = creature(134, 112, [
    ['e', 62, 90, 44, 14, P.snake], ['e', 60, 74, 34, 12, P.snake], ['e', 64, 60, 24, 10, P.snake], ['e', 80, 44, 8, 15, P.snake], ['e', 84, 46, 4, 11, P.snakeY], ['e', 92, 28, 14, 9, P.snake],
  ], (g) => { g.fillStyle = '#f0e040'; g.fillRect(96, 23, 4, 3); g.fillStyle = '#d02020'; g.fillRect(105, 30, 8, 2); g.fillRect(112, 28, 3, 2); g.fillRect(112, 32, 3, 2); });
  else if (kind === 'treant') {
    // 沒有樹精素材時，用楓樹裝飾素材加上發光的眼睛
    const t = decorSprite('楓樹'), [c, g] = canvas(t.img.width, t.img.height);
    g.drawImage(t.img, 0, 0); const cx = t.ax, by = t.ay;
    g.fillStyle = '#ffe040'; g.fillRect(cx - 10, by - 60, 6, 5); g.fillRect(cx + 4, by - 60, 6, 5);
    g.fillStyle = '#140a04'; g.fillRect(cx - 7, by - 46, 14, 5);
    a = { img: c, ax: t.ax, ay: t.ay, scale: 1.1 };
  } else if (kind === 'wraith') {
    a = { sheet: tintSheet(heroImg, 'brightness(.28) hue-rotate(220deg) saturate(2.2) contrast(1.3)'), ax: 32, ay: FOOT, scale: 1.9 };
  } else if (kind === 'fog_beast') {
    a = { sheet: tintSheet(heroImg, 'brightness(.35) hue-rotate(155deg) saturate(1.8) contrast(1.1)'), ax: 32, ay: FOOT, scale: 2.3 };
  } else if (kind === 'fog_sha') {
    a = { sheet: tintSheet(heroImg, 'brightness(.15) hue-rotate(270deg) saturate(4) contrast(1.5)'), ax: 32, ay: FOOT, scale: 3.5 };
  } else {
    // 人形敵人：沿用角色圖並染色（面向右）
    const def = kind === 'boss' ? FIELD_NPC_DEFS[1] : FIELD_NPC_DEFS[2];
    a = { sheet: tintSheet(heroImg, def.filter), ax: 32, ay: FOOT, scale: kind === 'boss' ? 2.7 : 1.85 };
  }
  return (ART[kind] = a);
}

// ---------- 動畫工具 ----------
function tween(ms, fn = () => {}) { return new Promise((res) => B.anims.push({ t: 0, dur: ms / 1000, fn, res })); }
const wait = (ms) => tween(ms);
const ease = (p) => 1 - (1 - p) * (1 - p);
function bmsg(s) { $('bMsg').textContent = s; $('bMsg').style.visibility = s ? 'visible' : 'hidden'; }
function num(x, y, text, color) { B.nums.push({ x, y, text: String(text), color, t: 0 }); }
function fx(dur, draw) { B.fx.push({ t: 0, dur, draw }); }
// 戰鬥中人物、怪物的整體縮放（素材原尺寸偏大）
const B_ENEMY_SCALE = 0.72, B_HERO_SCALE = 1.9;
function enemyTop(e) { const a = e.art, sc = (a.scale || 1) * B_ENEMY_SCALE; return e.y - (a.sheet ? 50 * sc : a.img.height * sc * 0.75); }
function slashFx(x, y, color = '255,255,240') {
  fx(0.32, (p) => {
    ctx.strokeStyle = `rgba(${color},${1 - p})`; ctx.lineWidth = 4 - p * 3;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x - 46 + i * 14, y - 40 + p * 6); ctx.lineTo(x + 40 + i * 14, y + 34 - p * 6); ctx.stroke(); }
  });
}
function burstFx(x, y, color, n = 14) {
  const ps = Array.from({ length: n }, () => ({ a: Math.random() * 6.28, v: 60 + Math.random() * 120 }));
  fx(0.5, (p) => { ctx.fillStyle = `rgba(${color},${1 - p})`; for (const q of ps) ctx.fillRect(x + Math.cos(q.a) * q.v * p, y + Math.sin(q.a) * q.v * p * 0.7, 4, 4); });
}

// ---------- 開始與結束 ----------
function startBattle(group, opts = {}) {
  keys.clear(); B.on = true; B.opts = opts; B.fx = []; B.nums = []; B.anims = []; B.menu = null; B.intro = 0; B.bossTurns = 0;
  Object.assign(B.hero, { ox: 0, oy: 0, flash: 0, guard: false, alpha: 1 });
  // 戰鬥背景：該地圖有專屬底圖（assets/battle/）就用底圖，否則以目前畫面模糊代替
  const [bg, g] = canvas(VW, VH), art = BATTLE_BG[G.id];
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  if (art) g.drawImage(art, 0, 0, VW, VH);
  else { g.filter = 'blur(1.5px) brightness(.82) saturate(.95)'; g.drawImage(C, -20, -20, VW + 40, VH + 40); g.filter = 'none'; }
  // 四周暗角，中央保持明亮（底圖本身已有暗角，只輕輕加一層）
  const gr = g.createRadialGradient(VW / 2, VH * 0.55, VH * 0.3, VW / 2, VH * 0.55, VW * 0.62); gr.addColorStop(0, 'rgba(6,8,6,0)'); gr.addColorStop(1, `rgba(6,8,6,${art ? 0.3 : 0.62})`);
  g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
  B.bg = bg;
  // 站位都在畫面中段的空地上，名牌不壓到下方面板
  const spots = { 1: [[320, 362]], 2: [[230, 316], [430, 364]], 3: [[165, 292], [430, 314], [300, 360]] }[group.length];
  B.enemies = group.map((id, i) => {
    // 教學戰：敵人氣血、攻擊減弱，赤手空拳也打得贏
    let d = opts.tutorial ? { ...ENEMIES[id], hp: Math.ceil(ENEMIES[id].hp / 2), atk: ENEMIES[id].atk - 4 } : ENEMIES[id];
    // 保衛戰：民兵、瞭望台等準備會削弱敵人
    if (opts.hpMul) d = { ...d, hp: Math.ceil(d.hp * opts.hpMul) };
    if (opts.atkAdd) d = { ...d, atk: Math.max(1, d.atk + opts.atkAdd) };
    return { id, ...d, name: d.name + (group.filter((g2) => g2 === id).length > 1 ? '甲乙丙'[group.slice(0, i).filter((g2) => g2 === id).length] : ''),
      maxHp: d.hp, x: spots[i][0], y: spots[i][1], ox: 0, oy: 0, flash: 0, alpha: 1, dead: false, art: enemyArt(id), raged: false };
  });
  $('gameBox').classList.add('inbattle'); $('battle').classList.add('open');
  Music.setMode('battle');
  updateBattleHud(); bmsg('');
  battleMain().catch(showError);
}
function endBattle() {
  B.on = false; B.menu = null; $('battle').classList.remove('open'); $('gameBox').classList.remove('inbattle'); renderCmd();
  Music.setMode('field'); S.steps = 0;
}
async function battleMain() {
  await tween(600, (p) => { B.intro = p; });
  const names = [...new Set(B.enemies.map((e) => ENEMIES[e.id].name))].join('、');
  bmsg(B.opts.boss ? (B.opts.bossMsg || '黑風寨主擋住了去路！') : B.opts.msg || `${names}出現了！`); await wait(1000);
  for (;;) {
    const order = [{ hero: true, s: S.spd * (0.85 + Math.random() * 0.3) }, ...B.enemies.filter((e) => !e.dead).map((e) => ({ e, s: e.spd * (0.85 + Math.random() * 0.3) }))]
      .sort((a, b) => b.s - a.s);
    for (const o of order) {
      if (o.e && o.e.dead) continue;
      if (o.hero) {
        B.hero.guard = false;
        if (S.poison > 0) {
          S.poison--; const d = Math.max(1, Math.round(S.maxHp * 0.06)); S.hp = Math.max(1, S.hp - d);
          num(B.hero.x, B.hero.y - 120, d, '#b070ff'); bmsg(`${HERO_NAME}毒性發作！`); updateBattleHud(); await wait(700);
        }
        bmsg(`${HERO_NAME}的回合　──　請選擇行動`);
        const act = await heroTurn(); B.menu = null; renderCmd();
        if ((await doHero(act)) === 'fled') return finish('flee');
      } else await doEnemy(o.e);
      updateBattleHud();
      // 還魂丹：倒下時自動服用，以一半氣血復活
      if (S.hp <= 0 && S.inv.revive) {
        const h = B.hero; take('revive'); S.hp = Math.ceil(S.maxHp / 2);
        bmsg(`${HERO_NAME}服下還魂丹，重新站了起來！`);
        burstFx(h.x, h.y - 60, '255,220,120', 26); num(h.x, h.y - 130, '+' + S.hp, '#ffe08a');
        updateBattleHud(); await wait(1000);
      }
      // 教學戰不會輸：老吳替主角擋下致命一擊
      if (S.hp <= 0 && B.opts.tutorial) { S.hp = Math.ceil(S.maxHp / 3); bmsg(B.opts.saveMsg || '老吳掄起柴刀，替你擋開了野狼！'); updateBattleHud(); await wait(1000); }
      if (S.hp <= 0) return finish('lose');
      if (B.enemies.every((e) => e.dead)) return finish('win');
    }
  }
}
async function finish(result) {
  if (B.opts.onResult) B.opts.onResult(result);
  if (result === 'flee') { bmsg('順利脫身了。'); await wait(700); endBattle(); return; }
  if (result === 'lose') {
    bmsg(`${HERO_NAME}倒下了……`); await tween(1400, (p) => { B.hero.alpha = 1 - p * 0.7; });
    endBattle(); return defeat();
  }
  bmsg('戰鬥勝利！'); await wait(900);
  let exp = 0, gold = 0; const drops = [];
  for (const e of B.enemies) {
    exp += e.exp; gold += e.gold;
    if (e.drop && Math.random() < e.drop[1]) { give(e.drop[0]); drops.push(ITEMS[e.drop[0]].name); }
  }
  S.gold += gold; S.poison = 0; exp = Math.round(exp * (1 + treeFx('exp')));
  const lines = [`獲得經驗 ${exp}、銅錢 ${gold} 文${drops.length ? '、' + drops.join('、') : ''}。`];
  // 急救（技能樹）：戰後處理傷勢
  const aid = Math.min(S.maxHp - S.hp, Math.round(S.maxHp * treeFx('firstaid')));
  if (aid > 0) { S.hp += aid; lines.push(`你替自己包紮傷口，恢復了 ${aid} 點氣血。`); }
  lines.push(...gainExp(exp));
  endBattle();
  talk(lines);
  if (B.opts.onWin) talk([() => B.opts.onWin()]);
}
function gainExp(n) {
  S.exp += n; const lines = [];
  while (S.lv < NEXT_EXP.length && S.exp >= NEXT_EXP[S.lv]) {
    S.lv++; S.tp++; for (const t of ATTRS) S.attrs[t.id] += t.grow; deriveStats(S); healAll();
    lines.push(`${HERO_NAME}升到了第 ${S.lv} 級！氣血、精力全滿，獲得 1 點技能點。`);
    for (const id in SKILLS) if (SKILLS[id].lv === S.lv) lines.push(`領悟了仙術「${SKILLS[id].name}」！`);
  }
  return lines;
}
function defeat() {
  const lost = Math.floor(S.gold / 2);
  fade(() => {
    S.gold -= lost; healAll(); S.poison = 0;
    if (S.map === 'yunshan' && F().fogma_jade) { switchMap('yunshan', Y_SHRINE.x, Y_SHRINE.y + 60, 0); }
    else if (S.map === 'yunshan') { switchMap('field', 960, FH - 120, 0); }
    else if (F().shrine) { switchMap('field', F_SHRINE.x, F_SHRINE.y + 60, 0); }
    else { switchMap('village', 458, 640 + VN, 0); }
  }, 900);
  talk(['（迷迷糊糊之間，你似乎被人救了回來……）', `醒來時，氣血已經恢復，但盤纏少了 ${lost} 文。`]);
}

// ---------- 主角行動 ----------
const learned = () => Object.keys(SKILLS).filter((id) => SKILLS[id].lv <= S.lv);
const usable = () => Object.keys(S.inv).filter((id) => ITEMS[id].type === 'use');
const alive = () => B.enemies.filter((e) => !e.dead);
function calcDmg(atk, def, power = 1) { return Math.max(1, Math.round((atk * power - def * 0.5) * (0.9 + Math.random() * 0.2))); }
function heroTurn() {
  return new Promise((res) => {
    const root = () => showMenu([
      { label: '攻擊', act: () => pickTarget((t) => res({ kind: 'attack', target: t }), root) },
      { label: '仙術', act: skills, disabled: !learned().length },
      { label: '道具', act: items, disabled: !usable().length },
      { label: '防禦', act: () => res({ kind: 'guard' }) },
      { label: '逃跑', act: () => res({ kind: 'flee' }), disabled: !!(B.opts.boss || B.opts.tutorial || B.opts.noFlee) },
    ], null);
    const skills = () => showMenu(learned().map((id) => {
      const s = SKILLS[id];
      return { label: s.name, note: `精力 ${s.mp}`, desc: s.desc, disabled: S.mp < s.mp,
        act: () => (s.target === 'one' ? pickTarget((t) => res({ kind: 'skill', id, target: t }), skills) : res({ kind: 'skill', id })) };
    }), root);
    const items = () => showMenu(usable().map((id) => ({ label: ITEMS[id].name, note: '×' + S.inv[id], desc: ITEMS[id].desc, act: () => res({ kind: 'item', id }) })), root);
    root();
  });
}
async function dashTo(x, y) {
  const h = B.hero, sx = h.ox, sy = h.oy, tx = x - h.x, ty = y - h.y;
  await tween(220, (p) => { h.ox = sx + (tx - sx) * ease(p); h.oy = sy + (ty - sy) * ease(p); h.frame = Math.floor(p * 6) % 8; });
}
async function dashBack() { const h = B.hero, sx = h.ox, sy = h.oy; await tween(240, (p) => { h.ox = sx * (1 - ease(p)); h.oy = sy * (1 - ease(p)); h.frame = Math.floor(p * 6) % 8; }); h.frame = 0; }
async function hitEnemy(e, power, color) {
  let d = calcDmg(stat.atk(), e.def, power); const crit = power === 1 && Math.random() < 0.1;
  if (crit) d = Math.round(d * 1.5);
  e.hp = Math.max(0, e.hp - d); e.flash = 0.25; B.shake = crit ? 8 : 4;
  slashFx(e.x, enemyTop(e) + 40, color); num(e.x, enemyTop(e), crit ? `暴擊 ${d}` : d, crit ? '#ffd040' : '#ffffff');
  if (e.hp <= 0) { e.dead = true; tween(500, (p) => { e.alpha = 1 - p; e.oy = p * 10; }); }
}
async function doHero(act) {
  const h = B.hero;
  if (act.kind === 'attack') {
    const t = act.target; bmsg(`${HERO_NAME}${S.equip.weapon ? '揮劍斬向' : '掄起樹枝打向'}${t.name}！`);
    await dashTo(t.x + 110, t.y + 4); await hitEnemy(t, 1); await wait(260); await dashBack();
  } else if (act.kind === 'skill') {
    const s = SKILLS[act.id]; S.mp -= s.mp; updateBattleHud(); bmsg(`${HERO_NAME}施展「${s.name}」！`);
    if (act.id === 'jianqi') {
      const t = act.target, x0 = h.x - 40, y0 = h.y - 60, x1 = t.x, y1 = enemyTop(t) + 40;
      await tween(340, (p) => { B.proj = { x: x0 + (x1 - x0) * p, y: y0 + (y1 - y0) * p }; });
      B.proj = null; burstFx(x1, y1, '150,210,255'); await hitEnemy(t, s.power, '150,210,255'); await wait(400);
    } else if (act.id === 'liuyun') {
      for (const t of alive()) { await dashTo(t.x + 90, t.y + 4); await hitEnemy(t, s.power, '190,230,255'); await wait(140); }
      await dashBack(); await wait(200);
    } else if (act.id === 'fenglie') {
      fx(0.55, (p) => { ctx.strokeStyle = `rgba(160,255,200,${1 - p})`; ctx.lineWidth = 2 + p; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, B.hero.y - 16 + i * 24 - p * 52); ctx.lineTo(VW, B.hero.y - 10 + i * 24 - p * 52); ctx.stroke(); } });
      await wait(200); for (const t of alive()) { await hitEnemy(t, s.power, '140,240,200'); await wait(110); } await wait(240);
    } else if (act.id === 'huichun') {
      const v = s.heal + S.lv * 6; S.hp = Math.min(S.maxHp, S.hp + v);
      burstFx(h.x, h.y - 60, '120,240,140', 22); num(h.x, h.y - 130, '+' + v, '#7cf08c'); await wait(700);
    }
  } else if (act.kind === 'item') {
    const it = ITEMS[act.id]; take(act.id); bmsg(`${HERO_NAME}使用了${it.name}。`);
    if (it.heal) { const v = Math.min(it.heal, S.maxHp - S.hp); S.hp += v; num(h.x, h.y - 130, '+' + v, '#7cf08c'); burstFx(h.x, h.y - 60, '120,240,140'); }
    if (it.mana) { S.mp = Math.min(stat.maxMp(), S.mp + it.mana); num(h.x, h.y - 110, '精力 +' + it.mana, '#80b8ff'); burstFx(h.x, h.y - 60, '120,170,255'); }
    await wait(700);
  } else if (act.kind === 'guard') {
    h.guard = true; bmsg(`${HERO_NAME}擺出防禦架勢。`); await wait(600);
  } else if (act.kind === 'flee') {
    const avg = alive().reduce((a, e) => a + e.spd, 0) / alive().length;
    bmsg(`${HERO_NAME}試圖逃跑……`); await wait(500);
    if (Math.random() < 0.55 + (S.spd - avg) * 0.04) { await tween(400, (p) => { h.ox = p * 300; h.frame = Math.floor(p * 8) % 8; }); return 'fled'; }
    bmsg('沒能逃掉！'); await wait(600);
  }
  updateBattleHud();
}

// ---------- 敵人行動 ----------
async function hitHero(e, power, label) {
  const h = B.hero;
  if (Math.random() < stat.dodge()) { num(h.x, h.y - 130, '閃避', '#c8f0ff'); return; }
  let d = calcDmg(e.atk, stat.def(), power); if (h.guard) d = Math.max(1, Math.round(d * 0.5));
  S.hp = Math.max(0, S.hp - d); h.flash = 0.25; h.hurt = 0.6; B.shake = 6;
  fx(0.3, (p) => { ctx.strokeStyle = `rgba(255,70,50,${1 - p})`; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(h.x - 26 + i * 12, h.y - 110); ctx.lineTo(h.x - 36 + i * 12, h.y - 50); ctx.stroke(); } });
  num(h.x, h.y - 130, (label ? label + ' ' : '') + d, '#ff8a70'); updateBattleHud();
}
async function lunge(e, dist = 70) {
  await tween(200, (p) => { e.ox = dist * ease(p); });
  return async () => tween(220, (p) => { e.ox = dist * (1 - ease(p)); });
}
async function doEnemy(e) {
  const r = Math.random();
  if (e.id === 'fog_beast' && r < 0.22 && e.hp < e.maxHp) {
    bmsg(`${e.name}吸收山霧，恢復體力！`); const v = 16; e.hp = Math.min(e.maxHp, e.hp + v);
    burstFx(e.x, enemyTop(e) + 40, '80,120,80'); num(e.x, enemyTop(e), '+' + v, '#80c080'); await wait(800); return;
  }
  if (e.id === 'wraith' && r < 0.28) {
    bmsg(`${e.name}化作虛影，連擊！`); const wback = await lunge(e, 170);
    await hitHero(e, 0.55); await wait(170); await hitHero(e, 0.55, '虛影連擊'); await wait(220); await wback(); await wait(220); return;
  }
  if (e.id === 'fog_sha') {
    B.bossTurns++;
    if (!e.raged && e.hp < e.maxHp * 0.5) {
      e.raged = true; e.atk += 8; bmsg('霧煞真身顯現！靈力大漲！');
      fx(0.8, (p) => { ctx.fillStyle = `rgba(40,10,80,${(1 - p) * 0.55})`; ctx.fillRect(0, 0, VW, VH); });
      burstFx(e.x, enemyTop(e) + 40, '100,60,200', 32); B.shake = 14; await wait(1100); return;
    }
    if (e.raged && B.bossTurns % 4 === 0 && !has('jade_complete')) {
      const v = 38; e.hp = Math.min(e.maxHp, e.hp + v);
      burstFx(e.x, enemyTop(e) + 40, '80,40,160'); num(e.x, enemyTop(e), '+' + v, '#a080ff');
      bmsg('霧煞以妖氣自我修復！（完整玉符可克制！）'); await wait(1000); return;
    }
    if (B.bossTurns % 3 === 0) {
      bmsg('霧煞施展「妖霧衝擊」！'); fx(0.7, (p) => { ctx.fillStyle = `rgba(40,20,80,${(1 - p) * 0.45})`; ctx.fillRect(0, 0, VW, VH); });
      const fsback = await lunge(e, 200); await hitHero(e, 1.65); await wait(250); await fsback(); await wait(300); return;
    }
  }
  if (e.id === 'treant' && r < 0.22 && e.hp < e.maxHp) {
    bmsg(`${e.name}的根鬚汲取地氣……`); const v = 18; e.hp = Math.min(e.maxHp, e.hp + v);
    burstFx(e.x, enemyTop(e) + 40, '120,240,140'); num(e.x, enemyTop(e), '+' + v, '#7cf08c'); await wait(800); return;
  }
  if (e.id === 'boss') {
    B.bossTurns++;
    if (!e.raged && e.hp < e.maxHp * 0.4) {
      e.raged = true; e.atk += 5; bmsg('黑風寨主怒吼一聲，殺氣暴漲！'); B.shake = 10;
      burstFx(e.x, enemyTop(e) + 40, '255,80,40', 26); await wait(900); return;
    }
    if (B.bossTurns % 3 === 0) {
      bmsg('黑風寨主使出「旋風斬」！');
      fx(0.7, (p) => { ctx.strokeStyle = `rgba(200,220,255,${1 - p})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(B.hero.x, B.hero.y - 60, 30 + p * 70, 12 + p * 26, 0, p * 9, p * 9 + 4.5); ctx.stroke(); });
      const back = await lunge(e, 200); await hitHero(e, 1.6); await wait(250); await back(); await wait(300); return;
    }
  }
  if (e.id === 'bandit' && r < 0.2 && S.gold > 0) {
    const g = Math.min(S.gold, 5 + Math.floor(Math.random() * 11));
    bmsg(`${e.name}趁亂摸走了 ${g} 文錢！`); const back = await lunge(e, 160); S.gold -= g; num(B.hero.x, B.hero.y - 120, `-${g} 文`, '#ffd040'); await wait(300); await back(); await wait(300); return;
  }
  const strong = e.id === 'boar' && r < 0.25;
  bmsg(strong ? `${e.name}低頭猛衝過來！` : `${e.name}發動攻擊！`);
  const back = await lunge(e, strong ? 260 : 150);
  if (e.id === 'wolf' && r < 0.2) { await hitHero(e, 0.65); await wait(180); await hitHero(e, 0.65, '連咬'); }
  else await hitHero(e, strong ? 1.4 : 1);
  if (e.id === 'snake' && r < 0.3 && S.hp > 0 && !S.poison) { S.poison = 3; num(B.hero.x, B.hero.y - 100, '中毒', '#b070ff'); bmsg(`${HERO_NAME}中毒了！`); }
  await wait(250); await back(); await wait(250);
}

// ---------- 指令選單 ----------
function showMenu(items, back) { B.menu = { items, idx: Math.max(0, items.findIndex((i) => !i.disabled)), back }; renderCmd(); }
function pickTarget(cb, back) {
  const list = alive();
  if (list.length === 1) return cb(list[0]);
  B.menu = { target: true, list, idx: 0, cb, back }; renderCmd();
}
// 指令圖示（米金色線稿）：劍、旋渦、布袋、盾、奔跑
const CMD_ICON = (() => {
  const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="#f0dcae" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  return {
    攻擊: svg('<path d="M19 3l-9.5 9.5"/><path d="M19 3h2v2l-9.5 9.5"/><path d="M7 13l4 4"/><path d="M8.5 15.5L4 20"/><path d="M3.5 18.5l2 2"/>'),
    仙術: svg('<path d="M12 12a2 2 0 1 1 2-2c0 3-3 5-6 4.5S3 11 5 7.5 12 3 15.5 4.5 21 10 19 14s-6 6.5-10 5.5"/>'),
    道具: svg('<path d="M9 4h6l-1.5 3h-3z"/><path d="M10.5 7C6 9 4.5 13 5 16.5S8 21 12 21s6.5-1 7-4.5S18 9 13.5 7"/><path d="M9.5 7.5h5"/>'),
    防禦: svg('<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z"/><path d="M12 7v10"/><path d="M8 11h8"/>'),
    逃跑: svg('<circle cx="14.5" cy="4.5" r="1.8" fill="#f0dcae" stroke="none"/><path d="M8 9l4-2 3 3 3 1"/><path d="M12 7l-1.5 5.5 3.5 3-1 5"/><path d="M10.5 12.5L8 16H4"/>'),
  };
})();
function renderCmd() {
  const box = $('bCmd'); box.replaceChildren(); const m = B.menu;
  box.style.visibility = m ? 'visible' : 'hidden';
  if (!m) return;
  if (m.target) {
    const p = document.createElement('div'); p.className = 'bhint'; p.textContent = `目標：${m.list[m.idx].name}`; box.appendChild(p);
    const v = document.createElement('div'); v.className = 'divider'; box.appendChild(v);
    const p2 = document.createElement('div'); p2.className = 'bsub'; p2.textContent = '←→ 切換 · E 確定 · Esc 返回（也可直接點選敵人）'; box.appendChild(p2);
    return;
  }
  m.items.forEach((it, i) => {
    const b = document.createElement('button'); b.className = (i === m.idx ? 'sel ' : '') + (it.disabled ? 'off' : '');
    b.innerHTML = `<span class="ico">${CMD_ICON[it.label] || `<b style="font-size:1.2cqw;color:#f6dcc0">${it.label[0]}</b>`}</span><span class="lbl">${it.label}</span>${it.note ? `<small>${it.note}</small>` : ''}`;
    b.onclick = () => { m.idx = i; confirmCmd(); };
    b.onmouseenter = () => { m.idx = i; markCmd(); };
    box.appendChild(b);
  });
  const desc = m.items[m.idx] && m.items[m.idx].desc;
  if (desc) { const v = document.createElement('div'); v.className = 'divider'; box.appendChild(v); const d = document.createElement('div'); d.className = 'bsub'; d.textContent = desc; box.appendChild(d); }
}
function markCmd() { renderCmd(); }
function confirmCmd() {
  const m = B.menu; if (!m) return;
  if (m.target) { const t = m.list[m.idx], cb = m.cb; B.menu = null; renderCmd(); return cb(t); }
  const it = m.items[m.idx]; if (!it || it.disabled) return;
  it.act();
}
function battleKey(k, e) {
  const m = B.menu; if (!m) return;
  const up = k === 'arrowup' || k === 'w', dn = k === 'arrowdown' || k === 's', lf = k === 'arrowleft' || k === 'a', rt = k === 'arrowright' || k === 'd';
  if (up || dn || lf || rt) {
    e.preventDefault();
    const n = m.target ? m.list.length : m.items.length, dir = up || lf ? -1 : 1;
    m.idx = (m.idx + dir + n) % n; renderCmd();
  } else if ((k === 'e' || k === ' ' || k === 'enter') && !e.repeat) { e.preventDefault(); confirmCmd(); }
  else if (k === 'escape' || k === 'backspace' || k === 'q') { e.preventDefault(); if (m.back) m.back(); }
}
C.addEventListener('click', (ev) => {
  if (!B.on || !B.menu || !B.menu.target) return;
  const r = C.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * VW, y = (ev.clientY - r.top) / r.height * VH;
  const i = B.menu.list.findIndex((e) => Math.abs(x - e.x) < 60 && y < e.y + 10 && y > enemyTop(e) - 20);
  if (i >= 0) { B.menu.idx = i; confirmCmd(); }
});
function updateBattleHud() {
  $('bLv').textContent = S.lv;
  const hp = (S.hp / S.maxHp * 100) + '%', mp = (S.mp / stat.maxMp() * 100) + '%';
  $('bHp').style.width = hp; $('bHpLag').style.width = hp; $('bHpT').textContent = `${S.hp} / ${S.maxHp}`;
  $('bMp').style.width = mp; $('bMpLag').style.width = mp; $('bMpT').textContent = `${S.mp} / ${stat.maxMp()}`;
  $('bState').textContent = S.poison ? '中毒' : B.hero.guard ? '防禦' : '';
}

// ---------- 更新與繪製 ----------
function updateBattle(dt) {
  for (const a of [...B.anims]) {
    a.t += dt; const p = Math.min(1, a.t / a.dur); a.fn(p);
    if (p >= 1) { B.anims.splice(B.anims.indexOf(a), 1); a.res(); }
  }
  for (const f of B.fx) f.t += dt;
  B.fx = B.fx.filter((f) => f.t < f.dur);
  for (const n of B.nums) n.t += dt;
  B.nums = B.nums.filter((n) => n.t < 1.1);
  for (const e of B.enemies) {
    e.flash = Math.max(0, e.flash - dt);
    // 血條殘影：受傷後停 0.35 秒再慢慢追上
    if (e.lag !== undefined && e.lag > e.hp) { if ((e.lagWait = (e.lagWait || 0) + dt) > 0.35) e.lag = Math.max(e.hp, e.lag - e.maxHp * dt * 0.8); } else e.lagWait = 0;
  }
  B.hero.flash = Math.max(0, B.hero.flash - dt); B.hero.hurt = Math.max(0, (B.hero.hurt || 0) - dt);
  B.shake = Math.max(0, B.shake - dt * 30);
}
function renderBattle(t) {
  const sx = (Math.random() - 0.5) * B.shake, sy = (Math.random() - 0.5) * B.shake;
  const z = 1 + (1 - B.intro) * 0.25;
  ctx.save(); ctx.translate(VW / 2 + sx, VH / 2 + sy); ctx.scale(z, z); ctx.translate(-VW / 2, -VH / 2);
  ctx.drawImage(B.bg, 0, 0);
  // 戰場地面光暈
  const gr = ctx.createRadialGradient(480, 380, 40, 480, 380, 420); gr.addColorStop(0, 'rgba(255,230,180,.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
  const list = [...B.enemies.map((e, i) => ({ e, i, y: e.y })), { hero: true, y: B.hero.y }].sort((a, b) => a.y - b.y);
  for (const o of list) {
    if (o.hero) { drawBattleHero(t); continue; }
    const e = o.e, a = e.art, sc = (a.scale || 1) * B_ENEMY_SCALE;
    if (e.alpha <= 0) continue;
    const x = e.x + e.ox, y = e.y + e.oy + (e.dead ? 0 : Math.sin(t / 380 + o.i * 2) * 2);
    ctx.globalAlpha = e.alpha;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(x, e.y + 2, (a.sheet ? 22 : a.img.width * 0.32) * sc, 8 * sc, 0, 0, Math.PI * 2); ctx.fill();
    if (e.flash > 0) ctx.filter = 'brightness(2.6)';
    if (a.sheet) { const sz = 64 * sc, fr = e.ox > 1 ? Math.floor(t / 70) % 8 : 0; ctx.drawImage(a.sheet, fr * CHAR_FW, 3 * CHAR_FW, CHAR_FW, CHAR_FW, x - sz / 2, y - FOOT * sc, sz, sz); }
    else ctx.drawImage(a.img, x - a.ax * sc, y - a.ay * sc, a.img.width * sc, a.img.height * sc);
    ctx.filter = 'none'; ctx.globalAlpha = 1;
    if (!e.dead) {
      // 敵人名牌：深色木框（金邊＋四角）內上排名字、下排血條
      if (e.lag === undefined) e.lag = e.hp;
      ctx.font = '14px "Noto Serif TC","PMingLiU",serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const pw = Math.max(e.boss ? 120 : 98, ctx.measureText(e.name).width + 32), ph = 34, px = Math.round(e.x - pw / 2), py = Math.round(e.y + 10);
      ctx.fillStyle = '#000a'; ctx.fillRect(px + 2, py + 3, pw, ph);
      const pg = ctx.createLinearGradient(0, py, 0, py + ph); pg.addColorStop(0, '#3a2216'); pg.addColorStop(1, '#1a0e09');
      ctx.fillStyle = pg; ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = '#d8b874'; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      ctx.strokeStyle = '#6a4a26'; ctx.strokeRect(px + 2.5, py + 2.5, pw - 5, ph - 5);
      ctx.fillStyle = '#f0d08a'; for (const [cx, cy] of [[px, py], [px + pw - 3, py], [px, py + ph - 3], [px + pw - 3, py + ph - 3]]) ctx.fillRect(cx, cy, 3, 3);
      if (e.boss) { ctx.fillStyle = '#a8281e'; ctx.fillRect(px - 15, py + 2, 13, 14); ctx.strokeStyle = '#e2c27e'; ctx.strokeRect(px - 14.5, py + 2.5, 12, 13); ctx.fillStyle = '#ffe8cc'; ctx.font = '10px serif'; ctx.fillText('王', px - 8.5, py + 4); ctx.font = '14px "Noto Serif TC","PMingLiU",serif'; }
      ctx.fillStyle = '#000'; ctx.fillText(e.name, e.x + 1, py + 5); ctx.fillStyle = '#f6e6bf'; ctx.fillText(e.name, e.x, py + 4);
      const bw = pw - 14, bx = px + 7, by = py + ph - 11;
      ctx.fillStyle = '#0a0604'; ctx.fillRect(bx - 1, by - 1, bw + 2, 7); ctx.strokeStyle = '#8a6a32'; ctx.strokeRect(bx - 1.5, by - 1.5, bw + 3, 8);
      ctx.fillStyle = '#f4e6c8b0'; ctx.fillRect(bx, by, bw * e.lag / e.maxHp, 5);
      const gr = ctx.createLinearGradient(0, by, 0, by + 5); gr.addColorStop(0, '#f07050'); gr.addColorStop(1, '#9a1e12');
      ctx.fillStyle = gr; ctx.fillRect(bx, by, bw * e.hp / e.maxHp, 5);
      ctx.fillStyle = '#ffffff50'; ctx.fillRect(bx, by, bw * e.hp / e.maxHp, 1);
    }
  }
  if (B.proj) {
    const { x, y } = B.proj;
    ctx.strokeStyle = 'rgba(170,220,255,.95)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x + 20, y, 30, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 20, y, 30, Math.PI * 0.65, Math.PI * 1.35); ctx.stroke();
  }
  for (const f of B.fx) f.draw(Math.min(1, f.t / f.dur));
  for (const n of B.nums) {
    const p = n.t / 1.1, y = n.y - 10 - ease(Math.min(1, p * 1.6)) * 34;
    ctx.globalAlpha = p > 0.7 ? (1 - p) / 0.3 : 1;
    ctx.font = 'bold 20px "Noto Serif TC",system-ui,serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = '#1a0e08'; ctx.strokeText(n.text, n.x, y); ctx.fillStyle = n.color; ctx.fillText(n.text, n.x, y);
    ctx.globalAlpha = 1;
  }
  if (B.menu && B.menu.target) {
    // 目標游標：金色雙箭頭＋腳下光圈
    const e = B.menu.list[B.menu.idx], x = e.x, y = enemyTop(e) - 18 + Math.sin(t / 150) * 4, pa = (Math.sin(t / 200) + 1) / 2;
    ctx.strokeStyle = `rgba(255,210,120,${0.45 + pa * 0.4})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, e.y + 2, 34 + pa * 3, 10 + pa, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,210,120,.25)'; ctx.beginPath(); ctx.ellipse(x, e.y + 2, 42 + pa * 4, 13 + pa * 2, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.save(); ctx.shadowColor = 'rgba(255,190,80,.9)'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#3a2410'; ctx.beginPath(); ctx.moveTo(x - 15, y - 22); ctx.lineTo(x + 15, y - 22); ctx.lineTo(x, y + 2); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; const ag = ctx.createLinearGradient(0, y - 20, 0, y);
    ag.addColorStop(0, '#fff2b8'); ag.addColorStop(1, '#d89a2a');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.moveTo(x - 11, y - 19); ctx.lineTo(x + 11, y - 19); ctx.lineTo(x, y - 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.moveTo(x - 6, y - 17); ctx.lineTo(x, y - 17); ctx.lineTo(x - 1, y - 9); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  if (B.intro < 1) {
    ctx.fillStyle = `rgba(0,0,0,${1 - B.intro})`; ctx.fillRect(0, 0, VW, VH);
    if (B.intro < 0.2) { ctx.fillStyle = `rgba(255,255,255,${0.8 - B.intro * 4})`; ctx.fillRect(0, 0, VW, VH); }
  }
}
function drawBattleHero(t) {
  const h = B.hero, sc = B_HERO_SCALE, sz = 64 * sc, x = h.x + h.ox, y = h.y + h.oy;
  ctx.globalAlpha = h.alpha;
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(x, h.y + 2, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
  if (h.guard) { ctx.strokeStyle = `rgba(140,200,255,${0.5 + Math.sin(t / 120) * 0.2})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - 44, 34, 54, 0, 0, Math.PI * 2); ctx.stroke(); }
  if (h.flash > 0) ctx.filter = 'brightness(2.6)';
  const dirRow = h.ox > 40 ? 3 : 2;
  const hurt = h.hurt > 0 && heroHurtImg && !modernLook();
  const hs = hurt ? heroHurtImg : heroSheet(), hc = cellOf(hs); smoothFor(hs);
  ctx.drawImage(hs, (hurt ? 1 + Math.min(2, Math.floor((0.6 - h.hurt) / 0.2)) : h.frame) * hc, dirRow * hc, hc, hc, x - sz / 2, y - FOOT * sc + Math.sin(t / 420) * 1.5, sz, sz);
  ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;
}
