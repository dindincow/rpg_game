'use strict';
// 清河村保衛戰（戰棋）：鏡頭停在南邊村口，地圖疊上 48px 格子
// 我方：小蝦米、阿武、有兵器的民兵、瞭望台弓手；敵方：黑風寨分波從南邊官道湧來，想穿過牌樓、過橋闖進村裡
// 柵欄、瞭望台等建設本身就是地圖上的障礙物，所以準備的成果會直接反映在棋盤上
// 劇情戰（T.sc）：沿用同一套棋盤、選單、AI 與繪製；開場、回合結束、倒下、勝敗與上方回合列交給劇情檔（例如 ch04.js）
const TS = 48, T_COLS = 20, T_ROWS = 11;
const T = { on: false, sc: null };

// ---------- 棋盤 ----------
const tCenter = (c, r) => [T.ox + c * TS + TS / 2, T.oy + r * TS + TS / 2];
const tCell = (x, y) => [Math.floor((x - T.ox) / TS), Math.floor((y - T.oy) / TS)];
const tIn = (c, r) => c >= 0 && r >= 0 && c < T_COLS && r < T_ROWS;
const tKey = (c, r) => c + ',' + r;
// 重傷倒地（downed）的人仍佔著格子
const unitAt = (c, r) => T.units.find((u) => (u.hp > 0 || u.downed) && u.c === c && u.r === r);
const tDist = (a, b) => Math.abs(a.c - b.c) + Math.abs(a.r - b.r);
// 一格能不能走：取格子中心與上下兩點，都沒撞到地形才算可走
function tBuildGrid() {
  T.pass = [];
  for (let r = 0; r < T_ROWS; r++) for (let c = 0; c < T_COLS; c++) {
    const [x, y] = tCenter(c, r);
    T.pass[r * T_COLS + c] = ![[0, 0], [0, -10], [0, 10]].some(([dx, dy]) => blocked(x + dx, y + dy, player));
  }
}
const tPass = (c, r) => tIn(c, r) && T.pass[r * T_COLS + c];
// 從 u 出發 mv 步內能停的格子（不能穿過敵人，可以穿過自己人但不能停在有人的格子）
function tReach(u) {
  const out = new Map([[tKey(u.c, u.r), [u.c, u.r]]]), q = [[u.c, u.r, 0]], seen = new Set([tKey(u.c, u.r)]);
  while (q.length) {
    const [c, r, d] = q.shift();
    if (d >= u.mv) continue;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr, k = tKey(nc, nr);
      if (seen.has(k) || !tPass(nc, nr)) continue;
      const o = unitAt(nc, nr); if (o && o.side !== u.side) continue;
      seen.add(k); q.push([nc, nr, d + 1]); if (!o) out.set(k, [nc, nr]);
    }
  }
  return out;
}
// 敵人尋路：到 goal 最短路徑上的下一串格子（敵人視自己人為可穿越）
function tPath(u, goalFn) {
  const prev = new Map([[tKey(u.c, u.r), null]]), q = [[u.c, u.r]];
  while (q.length) {
    const [c, r] = q.shift();
    if (goalFn(c, r) && !(c === u.c && r === u.r)) {
      const path = []; let k = tKey(c, r);
      while (k) { const [pc, pr] = k.split(',').map(Number); path.unshift([pc, pr]); k = prev.get(k); }
      return path.slice(1);
    }
    for (const [dc, dr] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) {
      const nc = c + dc, nr = r + dr, k = tKey(nc, nr);
      if (prev.has(k) || !tPass(nc, nr)) continue;
      const o = unitAt(nc, nr); if (o && o.side !== u.side && !goalFn(nc, nr)) continue;
      prev.set(k, tKey(c, r)); q.push([nc, nr]);
    }
  }
  return null;
}

// ---------- 單位 ----------
function tSheet(kind) {
  const ch = (id) => CHAR_ART[id] && CHAR_ART[id].walk;
  if (kind === 'hero') return [heroSheet(), cellOf(heroSheet())];
  if (kind === 'guard' && ch('guard')) return [ch('guard'), CHAR_FW];
  if (kind === 'militia') return [ch('fisher') || heroImg, CHAR_FW];
  if (kind === 'archer') return [ch('traveler') || heroImg, CHAR_FW];
  if (kind === 'qin' && ch('qinwufeng')) return [ch('qinwufeng'), CHAR_FW];
  if (kind === 'masked' && ch('masked')) return [ch('masked'), CHAR_FW];
  if (kind === 'leader' && MON_ART.boss.walk) return [MON_ART.boss.walk, 96];
  if (MON_ART.bandit.walk) return [MON_ART.bandit.walk, 96];
  return [heroImg, CHAR_FW];
}
const T_STATS = {
  guard: { name: '阿武', hp: 90, atk: 15, def: 6, mv: 4, rng: 1 },
  militia: { name: '民兵', hp: 45, atk: 11, def: 3, mv: 3, rng: 1 },
  archer: { name: '瞭望台弓手', hp: 40, atk: 10, def: 2, mv: 0, rng: 3 },
  bandit: { name: '山賊', hp: 46, atk: 14, def: 4, mv: 4, rng: 1 },
  leader: { name: '黑風寨二當家', hp: 95, atk: 18, def: 6, mv: 4, rng: 1 },
};
function tUnit(kind, side, c, r, extra = {}) {
  const [sheet, fw] = tSheet(kind), [x, y] = tCenter(c, r);
  const u = { kind, side, c, r, x, y, sheet, fw, dir: side === 'ally' ? 0 : 1, acted: false, flash: 0, alpha: 1, ...T_STATS[kind], ...extra };
  u.maxHp = u.maxHp || u.hp;
  T.units.push(u); return u;
}
// 找離 (c, r) 最近的空格
function tFree(c, r) {
  for (let d = 0; d < 8; d++) for (let dc = -d; dc <= d; dc++) for (const dr of [-(d - Math.abs(dc)), d - Math.abs(dc)]) {
    const nc = c + dc, nr = r + dr; if (tPass(nc, nr) && !unitAt(nc, nr)) return [nc, nr];
  }
  return [c, r];
}

// ---------- 開始與結束 ----------
function startTactics() {
  const f = F(), v = V();
  T.on = true; T.sc = null; T.units = []; T.turn = 1; T.phase = 'player'; T.sel = null; T.mode = null; T.breach = 0; T.lostMilitia = 0; T.busy = 0; T.cursor = null; T.msg = '';
  // 棋盤頂端放在河北岸，往南延伸到村口外的空地
  T.ox = Math.round(Math.max(0, Math.min(G.W - VW, GATE.x - VW / 2))); T.oy = Math.round(Math.max(0, Math.min(G.H - VH, riverY(GATE.x) - RIVER_HW - 60)));
  T.cx = T.ox + VW / 2; T.cy = T.oy + VH / 2;
  npcs = []; monsters = []; S.time = 18 * 60 + 30;
  tBuildGrid();
  // 目標：過了橋、踏上北岸就算闖進村裡
  T.goalRow = Math.max(0, tCell(GATE.x, riverY(GATE.x) - RIVER_HW)[1]); T.gateCell = tCell(GATE.x, GATE.y - 20);
  // 我方部署在牌樓前後
  const [gc, grow] = T.gateCell;
  tUnit('hero', 'ally', ...tFree(gc, grow), { name: HERO_NAME, hp: S.hp, maxHp: S.maxHp, atk: stat.atk(), def: stat.def(), mv: 4, rng: 1, ctrl: true });
  tUnit('guard', 'ally', ...tFree(gc + 1, grow), { ctrl: true });
  for (let i = 0; i < vDeploy(); i++) {
    const armed = i < vArmed();
    const drilled = f.build_drill ? 1 : 0;
    // 練兵：刀盾加防、長槍加攻；前幾名轉為弓手（射程 2）
    const vv = V(), bow = i < Math.min(vv.bowmen, vDeploy());
    tUnit('militia', 'ally', ...tFree(gc + (i % 2 ? 2 + (i >> 1) : -1 - (i >> 1)), grow), { name: (bow ? '民兵弓手' : '民兵') + '甲乙丙丁戊己'[i] + (armed || bow ? '' : '（農具）'), atk: (armed ? 11 : 7) + drilled * 2 + vv.spearLv * 2 - (bow ? 2 : 0), hp: 45 + drilled * 15, def: 3 + vv.shieldLv * 2, rng: bow ? 2 : 1 });
  }
  if (f.build_tower) tUnit('archer', 'ally', ...tFree(...tCell(GATE.x - 210, GATE.y + 70)));
  // 敵方分波：柵欄讓敵人少一波；最後一波由二當家帶隊
  // 建設越多，敵人越弱：0 項二當家攻擊 +3；2 項以上全員攻擊 −2；3 項再少一名山賊、二當家氣血 −20%
  const built = vBuilt(); T.foeMod = { atk: built === 0 ? 0 : built >= 2 ? -2 : 0, leaderAtk: built === 0 ? 3 : 0, leaderHp: built >= 3 ? 0.8 : 1 };
  T.waves = (f.build_fence ? (built >= 3 ? [2, 4] : [3, 4]) : [3, 3, 4]).map((n, i, a) => ({ turn: 1 + i * 2, n, leader: i === a.length - 1, done: false }));
  $('gameBox').classList.add('intactics');
  Music.setMode('battle');
  tSpawnWaves();
  talk(['（黑風寨的人馬從官道湧來。守住牌樓和橋頭，別讓他們闖進村裡！）',
    '【戰棋操作】你操控小蝦米和阿武：點選人物會跳出行動選單（移動、攻擊、防禦、仙術、道具、待機）。民兵和弓手是友軍，你結束回合後會自己行動。',
    '（方向鍵移動游標、E 確定、Esc 取消、Q 結束回合；滑鼠右鍵也能取消。）',
    `（敵人闖過橋頭 4 次，或${HERO_NAME}倒下，就算守不住。）`]);
}
function tSpawnWaves() {
  for (const w of T.waves) {
    if (w.done || w.turn > T.turn) continue;
    w.done = true;
    for (let i = 0; i < w.n; i++) {
      const kind = w.leader && i === 0 ? 'leader' : 'bandit';
      const [c, r] = tFree(Math.round(T_COLS / 2 + (i - w.n / 2) * 2.5), T_ROWS - 1);
      const base = T_STATS[kind], m = T.foeMod;
      tUnit(kind, 'enemy', c, r, { name: kind === 'leader' ? '黑風寨二當家' : '山賊', atk: base.atk + m.atk + (kind === 'leader' ? m.leaderAtk : 0), hp: Math.round(base.hp * (kind === 'leader' ? m.leaderHp : 1)) });
    }
    T.msg = `第 ${T.waves.indexOf(w) + 1} 波：${w.n} 名賊人殺到！`; T.msgT = 2.5;
  }
}
function endTactics(win) {
  T.on = false; T.sel = null;
  $('gameBox').classList.remove('intactics');
  Music.setMode('field');
  const hero = T.units.find((u) => u.kind === 'hero');
  S.hp = Math.max(1, hero.hp);
  if (T.sc) return T.sc.end(win);
  refreshNpcs(); player.x = GATE.x; player.y = GATE.y + 50; player.dir = 0;
  if (win) raidWin(T.lostMilitia, T.breach); else raidLose();
}

// ---------- 操作：點選角色 → 行動選單（移動／攻擊／防禦／仙術／道具／待機） ----------
// 小蝦米、阿武由玩家操控（ctrl）；民兵、弓手是友軍，按「結束回合」後自己行動
const tFoesIn = (u, rng) => T.units.filter((e) => e.side === 'enemy' && e.hp > 0 && tDist(u, e) <= rng);
const tCtrl = () => T.units.filter((u) => u.ctrl && u.hp > 0);
function tSelect(u) { T.sel = u; T.home = [u.c, u.r]; tOpenMenu(); }
function tOpenMenu() {
  const u = T.sel, items = [
    { label: '移動', off: u.moved, act: () => { T.mode = 'move'; T.reach = tReach(u); T.menu = null; } },
    { label: '攻擊', off: !tFoesIn(u, u.rng).length, act: () => tPickTarget(tFoesIn(u, u.rng), (e) => { tAttack(u, e); tDone(u); }) },
    { label: '防禦', act: () => { u.guard = true; tFloat(u, '防禦', '#9fd0ff'); tDone(u); } },
  ];
  if (u.kind === 'hero') items.push({ label: '仙術', off: !learned().length, act: tSkillMenu }, { label: '道具', off: !usable().length, act: tItemMenu });
  items.push({ label: '待機', act: () => tDone(u) });
  T.menu = { items, idx: Math.max(0, items.findIndex((i) => !i.off)), back: null }; T.mode = 'menu';
}
// 仙術：單體（劍氣斬）射程 2；全體技打周圍的敵人（流雲連斬 1 格內、風裂斬 2 格內）；回春術回復自己
const T_SKILL_RNG = { jianqi: 2, liuyun: 1, fenglie: 2 };
function tSkillMenu() {
  const u = T.sel, items = learned().map((id) => {
    const k = SKILLS[id], noFoe = k.target !== 'self' && !tFoesIn(u, T_SKILL_RNG[id] || 1).length;
    return { label: k.name, note: '精力 ' + k.mp, off: S.mp < k.mp || noFoe || (k.heal && u.hp >= u.maxHp), act: () => tCast(id) };
  });
  T.menu = { items, idx: Math.max(0, items.findIndex((i) => !i.off)), back: tOpenMenu };
}
function tCast(id) {
  const u = T.sel, k = SKILLS[id], rng = T_SKILL_RNG[id] || 1;
  if (k.target === 'self') { S.mp -= k.mp; const n = Math.min(u.maxHp - u.hp, k.heal + S.lv * 6); u.hp += n; tFloat(u, '+' + n, '#8fe07a'); return tDone(u); }
  if (k.target === 'one') return tPickTarget(tFoesIn(u, rng), (e) => { S.mp -= k.mp; tFloat(u, k.name, '#ffe070'); tAttack(u, e, k.power); tDone(u); });
  S.mp -= k.mp; tFloat(u, k.name, '#ffe070');
  for (const e of tFoesIn(u, rng)) tAttack(u, e, k.power);
  tDone(u);
}
function tItemMenu() {
  const u = T.sel, items = usable().map((id) => {
    const it = ITEMS[id];
    // 劇情戰：療傷藥也能給相鄰的受傷隊友（例如把止血草遞給秦無風）
    const mates = it.heal ? T.units.filter((o) => o.side === 'ally' && o.hp > 0 && o.hp < o.maxHp && (o === u || (T.sc && tDist(o, u) <= 1))) : [];
    return { label: it.name, note: '×' + S.inv[id], off: (it.heal && !it.mana && !mates.length) || (it.mana && !it.heal && S.mp >= stat.maxMp()), act: () => {
      const use = (v) => {
        take(id);
        if (it.heal) { const n = Math.min(v.maxHp - v.hp, it.heal); v.hp += n; tFloat(v, '+' + n, '#8fe07a'); }
        if (it.mana) { S.mp = Math.min(stat.maxMp(), S.mp + it.mana); tFloat(u, '精力 +' + it.mana, '#80b8ff'); }
        tDone(u);
      };
      if (mates.length && !(mates.length === 1 && mates[0] === u)) return tPickTarget(mates, use, true);
      use(u);
    } };
  });
  T.menu = { items, idx: Math.max(0, items.findIndex((i) => !i.off)), back: tOpenMenu };
}
// ally：選的是自己人（綠色標示），例如遞藥
function tPickTarget(list, fn, ally) { T.mode = 'target'; T.targets = list; T.onTarget = fn; T.menu = null; T.pickAlly = !!ally; }
function tDone(u) {
  u.acted = true; T.sel = null; T.menu = null; T.mode = null;
  // 可操控的角色都行動完了，就自動結束回合（劇情對話開著就等對話結束）
  const auto = () => (D.open ? setTimeout(auto, 200) : tEndTurn());
  if (tCtrl().every((c) => c.acted)) setTimeout(auto, 500);
}
// 取消：目標／移動 → 回選單；子選單 → 回上一層；主選單 → 已移動就退回原位，否則取消選取
function tBack() {
  if (!T.sel) return;
  if (T.mode === 'move' || T.mode === 'target') return tOpenMenu();
  if (T.menu && T.menu.back) return T.menu.back();
  if (T.sel.moved) { tMove(T.sel, ...T.home, true); T.sel.moved = false; return tOpenMenu(); }
  T.sel = null; T.menu = null; T.mode = null;
}
function tClickCell(c, r) {
  if (T.phase !== 'player' || T.busy || D.open) return;
  const u = unitAt(c, r);
  if (T.mode === 'move') { if (T.reach.has(tKey(c, r))) { tMove(T.sel, c, r); T.sel.moved = true; tOpenMenu(); } else tBack(); return; }
  if (T.mode === 'target') { if (u && T.targets.includes(u)) T.onTarget(u); else tBack(); return; }
  if (T.mode === 'menu') return tBack();
  if (u && u.ctrl && !u.acted) tSelect(u);
}
function tEndTurn() {
  if (T.phase !== 'player' || T.busy || D.open) return;
  T.sel = null; T.menu = null; T.mode = null; tRunPhases();
}
function tMenuPick() { const it = T.menu.items[T.menu.idx]; if (it && !it.off) it.act(); }
function tacticsKey(k, e) {
  e.preventDefault();
  const hero = T.units.find((u) => u.kind === 'hero');
  if (!T.cursor) T.cursor = [hero.c, hero.r];
  const dir = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[k];
  if (T.menu) {
    if (dir && dir[1]) { const n = T.menu.items.length; T.menu.idx = (T.menu.idx + dir[1] + n) % n; return; }
    if ((k === 'e' || k === ' ' || k === 'enter') && !e.repeat) return tMenuPick();
    if (k === 'escape') return tBack();
    return;
  }
  if (dir) { T.cursor[0] = Math.max(0, Math.min(T_COLS - 1, T.cursor[0] + dir[0])); T.cursor[1] = Math.max(0, Math.min(T_ROWS - 1, T.cursor[1] + dir[1])); return; }
  if ((k === 'e' || k === ' ' || k === 'enter') && !e.repeat) return tClickCell(...T.cursor);
  if (k === 'escape') return tBack();
  if (k === 'q' && !e.repeat) return tEndTurn();
}
// 畫面座標 → 選單、按鈕或棋盤
const T_BTN = { end: [VW - 130, VH - 46, 118, 34] };
const inBtn = (b, x, y) => x >= b[0] && x <= b[0] + b[2] && y >= b[1] && y <= b[1] + b[3];
function tacticsPointer(e, click) {
  const rc = C.getBoundingClientRect(), x = (e.clientX - rc.left) * VW / rc.width, y = (e.clientY - rc.top) * VH / rc.height;
  const m = T.menu && T.menuRect, onMenu = m && x >= m[0] && x <= m[0] + m[2] && y >= m[1] && y <= m[1] + m[3];
  if (onMenu) T.menu.idx = Math.max(0, Math.min(T.menu.items.length - 1, Math.floor((y - m[1] - 6) / 28)));
  if (!click) { if (!onMenu) T.cursor = tCell(x + cam.x, y + cam.y); return; }
  if (e.button === 2) return tBack();
  if (onMenu) return tMenuPick();
  if (inBtn(T_BTN.end, x, y)) return tEndTurn();
  tClickCell(...tCell(x + cam.x, y + cam.y));
}

// ---------- 行動 ----------
function tMove(u, c, r, instant) {
  if (c !== u.c) u.dir = c < u.c ? 2 : 3; else if (r !== u.r) u.dir = r < u.r ? 1 : 0;
  u.c = c; u.r = r;
  if (instant) [u.x, u.y] = tCenter(c, r);
}
function tFloat(u, text, col) {
  const x = u.x, y = u.y - 70;
  worldFx.push({ t: 0, dur: 1, draw: (p) => {
    ctx.globalAlpha = 1 - p; ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#140c08';
    ctx.strokeText(text, x - cam.x, y - cam.y - p * 26); ctx.fillStyle = col; ctx.fillText(text, x - cam.x, y - cam.y - p * 26); ctx.globalAlpha = 1;
  } });
}
// 防禦中的目標傷害減半
function tAttack(a, b, power = 1) {
  if (b.c !== a.c) a.dir = b.c < a.c ? 2 : 3; else a.dir = b.r < a.r ? 1 : 0;
  const crit = Math.random() < 0.1;
  let d = Math.round(calcDmg(a.atk, b.def, power) * (crit ? 1.5 : 1));
  if (b.guard) d = Math.max(1, Math.round(d * 0.5));
  b.hp = Math.max(0, b.hp - d); b.flash = 0.3; a.lunge = 0.2;
  tFloat(b, (crit ? '暴擊 ' : '') + d, b.side === 'ally' ? '#ff8a70' : crit ? '#ffd040' : '#fff');
  if (T.sc && T.sc.onHit) T.sc.onHit(a, b);
  if (b.hp <= 0) tDie(b);
}
function tDie(u) {
  if (T.sc) return T.sc.onDie(u);
  if (u.kind === 'militia') T.lostMilitia++;
  if (u.kind === 'hero') { T.phase = 'over'; setTimeout(() => talk([`（${HERO_NAME}重傷倒地……）`, () => endTactics(false)]), 700); }
}
// 回合流程：玩家 → 友軍（民兵、弓手）→ 敵方 → 下一回合
async function tRunPhases() {
  T.busy = 1;
  T.phase = 'ally'; if (!(await tAiTurn('ally'))) return;
  T.phase = 'enemy'; if (!(await tAiTurn('enemy'))) return;
  if (T.sc && !(await T.sc.turnEnd())) return;
  T.turn++; T.phase = 'player'; T.busy = 0;
  for (const u of T.units) { u.acted = false; u.moved = false; if (u.side === 'ally') u.guard = false; }
  tSpawnWaves();
  tCheckWin();
}
// AI：一個一個行動（各隔一下）。敵人：鄰近有我方就打，6 格內有我方就去打，否則直奔橋頭
// 友軍：射程內有敵人就打，5 格內有敵人就上前迎擊，否則原地守著
async function tAiTurn(side) {
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  const foeSide = side === 'ally' ? 'enemy' : 'ally';
  for (const a of T.units.filter((u) => u.side === side && u.hp > 0 && !u.ctrl)) {
    // 劇情戰的對話開著時，等玩家讀完再動
    while (D.open) await wait(120);
    if (!T.on || T.phase === 'over') return false;
    if (a.hp <= 0) continue;
    // prefer：劇情戰裡指定優先找誰（例如蒙面人甲盯小蝦米、乙盯秦無風）；找不到才打最弱的
    const near = () => { const inR = T.units.filter((u) => u.side === foeSide && u.hp > 0 && tDist(u, a) <= a.rng); return inR.find((u) => u.kind === a.prefer) || inR.sort((x, y) => x.hp - y.hp)[0]; };
    let tgt = near();
    if (!tgt && a.mv) {
      let foes = T.units.filter((u) => u.side === foeSide && u.hp > 0 && tDist(u, a) <= (T.sc ? 99 : side === 'enemy' ? 6 : 5));
      const pref = foes.find((f) => f.kind === a.prefer); if (pref) foes = [pref];
      const adj = (c, r) => foes.some((f) => Math.abs(f.c - c) + Math.abs(f.r - r) === 1);
      const path = foes.length ? tPath(a, adj) : side === 'enemy' && !T.sc ? tPath(a, (c, r) => r <= T.goalRow) : null;
      if (path) { let n = 0; for (const [c, r] of path) { if (n >= a.mv || unitAt(c, r)) break; tMove(a, c, r); n++; await wait(110); } }
      if (side === 'enemy' && !T.sc && a.r <= T.goalRow) { // 闖進村裡
        a.hp = 0; a.alpha = 0; T.breach++; T.msg = `賊人闖過橋頭！（${T.breach} / 4）`; T.msgT = 2;
        if (T.breach >= 4) { T.phase = 'over'; await wait(600); talk(['（賊人一批批闖進村裡，四處放火搶糧……）', () => endTactics(false)]); return false; }
        continue;
      }
      tgt = near();
    }
    if (tgt) { await wait(150); tAttack(a, tgt); await wait(350); while (D.open) await wait(120); if (T.phase === 'over') return false; }
  }
  return T.on && T.phase !== 'over';
}
function tCheckWin() {
  if (T.sc) return; // 劇情戰的勝負由劇情檔判定（敵人撤退）
  if (T.waves.every((w) => w.done) && !T.units.some((u) => u.side === 'enemy' && u.hp > 0)) {
    T.phase = 'over'; setTimeout(() => talk(['（最後一個賊人丟下火把，逃回了官道。）', () => endTactics(true)]), 500);
  }
}
function updateTactics(dt) {
  if (T.msgT) T.msgT = Math.max(0, T.msgT - dt);
  for (const u of T.units) {
    const [tx, ty] = tCenter(u.c, u.r), sp = 260 * dt;
    u.moving = Math.hypot(tx - u.x, ty - u.y) > 1;
    u.x += Math.max(-sp, Math.min(sp, tx - u.x)); u.y += Math.max(-sp, Math.min(sp, ty - u.y));
    u.flash = Math.max(0, u.flash - dt); u.lunge = Math.max(0, (u.lunge || 0) - dt);
    if (u.hp <= 0) u.alpha = Math.max(u.downed ? 0.6 : 0, u.alpha - dt * 2);
  }
  if (T.phase === 'player' && !T.busy) tCheckWin();
}

// ---------- 繪製 ----------
function drawTactics(t) {
  // 格子
  ctx.lineWidth = 1;
  for (let r = 0; r < T_ROWS; r++) for (let c = 0; c < T_COLS; c++) {
    const x = T.ox + c * TS - cam.x, y = T.oy + r * TS - cam.y;
    if (!tPass(c, r)) continue;
    ctx.strokeStyle = 'rgba(255,240,200,.12)'; ctx.strokeRect(x + 0.5, y + 0.5, TS - 1, TS - 1);
    if (!T.sc && r <= T.goalRow) { ctx.fillStyle = 'rgba(200,60,40,.10)'; ctx.fillRect(x, y, TS, TS); }
  }
  const fill = (c, r, col) => { ctx.fillStyle = col; ctx.fillRect(T.ox + c * TS - cam.x + 2, T.oy + r * TS - cam.y + 2, TS - 4, TS - 4); };
  if (T.sel && T.mode === 'move') for (const [c, r] of T.reach.values()) fill(c, r, 'rgba(90,160,255,.32)');
  if (T.mode === 'target') for (const u of T.targets) fill(u.c, u.r, T.pickAlly ? `rgba(90,220,110,${0.3 + Math.sin(t / 150) * 0.12})` : `rgba(255,70,50,${0.3 + Math.sin(t / 150) * 0.12})`);
  if (T.sel) { ctx.strokeStyle = '#ffe070'; ctx.lineWidth = 2; ctx.strokeRect(T.ox + T.sel.c * TS - cam.x + 1, T.oy + T.sel.r * TS - cam.y + 1, TS - 2, TS - 2); }
  // 單位（依 y 排序）
  for (const u of [...T.units].filter((u) => u.alpha > 0).sort((a, b) => a.y - b.y)) {
    const sc = u.kind === 'leader' ? 1.45 : 1.2, sz = 64 * sc, x = Math.round(u.x - cam.x), y = Math.round(u.y - cam.y + TS * 0.32);
    ctx.globalAlpha = u.alpha * (u.acted && u.ctrl && T.phase === 'player' ? 0.55 : 1);
    ctx.fillStyle = u.side === 'ally' ? 'rgba(80,150,255,.45)' : 'rgba(255,70,50,.45)';
    ctx.beginPath(); ctx.ellipse(x, y, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
    if (u.flash > 0) ctx.filter = 'brightness(2.4)'; else if (u.downed) ctx.filter = 'grayscale(1) brightness(.7)';
    const fr = u.moving ? Math.floor(t / 90) % 8 : 0, lx = u.lunge ? [0, 0, -6, 6][u.dir] : 0, ly = u.lunge ? [6, -6, 0, 0][u.dir] : 0;
    smoothFor(u.sheet);
    ctx.drawImage(u.sheet, fr * u.fw, u.dir * u.fw, u.fw, u.fw, x - sz / 2 + lx, y - FOOT * sc + ly, sz, sz);
    ctx.imageSmoothingEnabled = false; ctx.filter = 'none';
    // 血條
    const bw = 36, by = y - FOOT * sc - 6;
    ctx.fillStyle = '#1a1210d0'; ctx.fillRect(x - bw / 2 - 1, by - 1, bw + 2, 6);
    ctx.fillStyle = u.side === 'ally' ? '#5ac46a' : '#d8503a'; ctx.fillRect(x - bw / 2, by, bw * u.hp / u.maxHp, 4);
    ctx.globalAlpha = 1;
  }
  // 瞭望台：下一波敵人的進場位置（紅色箭頭）
  const nw = !T.sc && F().build_tower && T.waves.find((w) => !w.done);
  if (nw) for (let i = 0; i < nw.n; i++) {
    const x = T.ox + Math.round(T_COLS / 2 + (i - nw.n / 2) * 2.5) * TS + TS / 2 - cam.x, y = T.oy + (T_ROWS - 1) * TS + TS / 2 - cam.y + Math.sin(t / 200) * 3;
    ctx.fillStyle = 'rgba(255,80,50,.75)'; ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x - 10, y + 4); ctx.lineTo(x + 10, y + 4); ctx.fill();
  }
  // 游標
  if (T.cursor && tIn(...T.cursor)) { ctx.strokeStyle = '#ffe070'; ctx.lineWidth = 2; ctx.strokeRect(T.ox + T.cursor[0] * TS - cam.x + 2, T.oy + T.cursor[1] * TS - cam.y + 2, TS - 4, TS - 4); }
  // 上方回合列
  const allies = T.units.filter((u) => u.side === 'ally' && u.hp > 0), foes = T.units.filter((u) => u.side === 'enemy' && u.hp > 0);
  const next = T.waves.find((w) => !w.done);
  const phase = T.phase === 'player' ? '我方行動' : T.phase === 'ally' ? '友軍行動' : T.phase === 'enemy' ? '敵方行動' : '';
  const bar = T.sc ? `第 ${T.turn} 回合 · ${phase}　${T.sc.bar()}` : `第 ${T.turn} 回合 · ${phase}　我方 ${allies.length}　敵方 ${foes.length}${next ? `　下一波：第 ${next.turn} 回合` : ''}　闖入 ${T.breach}/4`;
  ctx.font = 'bold 15px "Noto Serif TC",serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(bar).width + 40;
  ctx.fillStyle = '#1a1210e0'; ctx.strokeStyle = '#c9a45c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(VW / 2 - w / 2, 10, w, 32, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffe2a4'; ctx.fillText(bar, VW / 2, 26);
  if (T.msgT) { ctx.globalAlpha = Math.min(1, T.msgT); ctx.font = 'bold 22px "Noto Serif TC",serif'; ctx.lineWidth = 5; ctx.strokeStyle = '#1a0a06'; ctx.strokeText(T.msg, VW / 2, 80); ctx.fillStyle = '#ff9a6a'; ctx.fillText(T.msg, VW / 2, 80); ctx.globalAlpha = 1; }
  // 左下：游標所指人物資料
  const info = T.cursor && unitAt(...T.cursor) || T.sel;
  if (info) {
    ctx.fillStyle = '#1a1210e0'; ctx.strokeStyle = '#c9a45c'; ctx.beginPath(); ctx.roundRect(12, VH - 80, 230, 68, 6); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left'; ctx.font = 'bold 15px "Noto Serif TC",serif'; ctx.fillStyle = info.side === 'ally' ? '#9fd0ff' : '#ff9a7a'; ctx.fillText(info.name, 24, VH - 62);
    ctx.font = '13px system-ui'; ctx.fillStyle = '#e8dcc0';
    ctx.fillText(`氣血 ${info.hp}/${info.maxHp}　攻 ${info.atk}　防 ${info.def}`, 24, VH - 40);
    ctx.fillText(`移動 ${info.mv}　射程 ${info.rng}${info.acted ? '　（已行動）' : ''}`, 24, VH - 22);
    // note：劇情戰的狀態說明（中毒、左肩挫傷、重傷倒地）
    if (info.note) { ctx.font = '12px system-ui'; ctx.fillStyle = '#d0a0ff'; ctx.fillText(info.note, 24, VH - 92); }
  }
  // 右下按鈕
  // 行動選單：靠在選取的人物右邊
  T.menuRect = null;
  if (T.menu && T.sel) {
    const items = T.menu.items, mw = 132, mh = items.length * 28 + 12;
    const mx = Math.min(VW - mw - 8, Math.round(T.sel.x - cam.x) + 34), my = Math.max(50, Math.min(VH - mh - 56, Math.round(T.sel.y - cam.y) - 80));
    T.menuRect = [mx, my, mw, mh];
    ctx.fillStyle = '#1a1210f0'; ctx.strokeStyle = '#c9a45c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(mx, my, mw, mh, 6); ctx.fill(); ctx.stroke();
    items.forEach((it, i) => {
      const iy = my + 6 + i * 28;
      if (i === T.menu.idx) { ctx.fillStyle = '#7a5c30'; ctx.fillRect(mx + 4, iy, mw - 8, 26); }
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = 'bold 15px "Noto Serif TC",serif'; ctx.fillStyle = it.off ? '#7d7766' : '#fbeac8'; ctx.fillText(it.label, mx + 14, iy + 13);
      if (it.note) { ctx.textAlign = 'right'; ctx.font = '12px system-ui'; ctx.fillStyle = it.off ? '#6a6458' : '#9fd0ff'; ctx.fillText(it.note, mx + mw - 10, iy + 13); }
    });
  }
  if (T.mode === 'target' || T.mode === 'move') { ctx.textAlign = 'center'; ctx.font = 'bold 14px system-ui'; ctx.fillStyle = '#ffe2a4'; ctx.fillText(T.mode === 'move' ? '點藍色格子移動（右鍵／Esc 取消）' : T.pickAlly ? '點綠色的人（右鍵／Esc 取消）' : '點紅色目標（右鍵／Esc 取消）', VW / 2, VH - 28); }
  if (T.phase === 'player') for (const [k, label] of [['end', '結束回合 Q']]) {
    const [x, y, bw, bh] = T_BTN[k], off = false;
    ctx.globalAlpha = off ? 0.45 : 1; ctx.fillStyle = '#40382a'; ctx.strokeStyle = '#c9a45c'; ctx.beginPath(); ctx.roundRect(x, y, bw, bh, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fbeac8'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center'; ctx.fillText(label, x + bw / 2, y + bh / 2 + 1); ctx.globalAlpha = 1;
  }
}
C.addEventListener('pointerdown', (e) => { if (T.on && !D.open) { e.preventDefault(); tacticsPointer(e, true); } });
C.addEventListener('pointermove', (e) => { if (T.on) tacticsPointer(e, false); });
C.addEventListener('contextmenu', (e) => { if (T.on) e.preventDefault(); });
