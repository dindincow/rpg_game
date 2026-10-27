'use strict';
// 清河村公共資源：全村共用的倉庫、每日結算、捐獻與建設
// 公共倉庫不是小蝦米的私產：前期只能捐獻，取得村長陳伯安授權後才能調度物資動工
const V_RES = [
  { id: 'food', name: '糧食' }, { id: 'wood', name: '木材' }, { id: 'stone', name: '石材' },
  { id: 'iron', name: '鐵材' }, { id: 'herbs', name: '藥材' }, { id: 'silver', name: '銀兩' },
];
// 背包物品 → 公共資源：[資源, 每件折合數量]；value 用來換算民心（每 10 點 +1）
const DONATE = {
  wood: { res: 'wood', n: 1, value: 1 }, stone: { res: 'stone', n: 1, value: 1 }, iron_ore: { res: 'iron', n: 1, value: 3 },
  herb: { res: 'herbs', n: 1, value: 1 }, longcao: { res: 'herbs', n: 1, value: 1 }, salve: { res: 'herbs', n: 3, value: 4 },
};
// 每日產出（簡化模型：固定的農民、樵夫、礦工）；民心高時多兩成
const V_DAILY = { food: 10, wood: 4, stone: 2, iron: 1, herbs: 2, silver: 5 };
// 建設：cost 消耗公共資源、defense 防禦評分、需要授權 auth
const V_PROJECTS = {
  fence: { name: '村口柵欄', cost: { wood: 30, stone: 10 }, defense: 20, desc: '牌樓兩側立起木柵。保衛戰敵人少一波，牌樓成為隘口。' },
  tower: { name: '瞭望台', cost: { wood: 25, stone: 15 }, defense: 10, desc: '多一名射程 3 的弓手，並預先標出下一波敵人的進場位置。' },
  drill: { name: '練兵場', cost: { wood: 20, stone: 10 }, defense: 15, desc: '解鎖訓練民兵；上陣民兵氣血 +15、攻擊 +2。' },
};
// 調度：消耗公共資源。need 前置建設、max 上限、preview 回傳 [項目, 現在, 之後]、run 執行並回傳結果文字
const V_ACTIONS = {
  arms: { time: 360, name: '打造兵器', who: '韓鐵山', cost: { iron: 5, silver: 20 }, desc: '用公共倉庫的鐵材打造五把刀槍，配給民兵。沒有兵器的民兵只能拿農具上陣。',
    preview: (v) => [['兵器', v.arms, v.arms + 5]], run: (v) => { v.arms += 5; return '兵器 +5'; } },
  recruit: { time: 360, name: '招募新兵', cost: { food: 20, silver: 30 }, need: 'drill', desc: '從村裡招三名青壯加入民兵。人多好辦事，但新兵不耐打。',
    full: (v) => v.militia >= v.labor, fullText: '能下地的青壯都已經是民兵了', preview: (v) => [['民兵', v.militia, Math.min(v.labor, v.militia + 3)]], run: (v) => { v.militia = Math.min(v.labor, v.militia + 3); return '民兵 +3'; } },
  shield: { time: 360, name: '刀盾操練', cost: { food: 15 }, need: 'drill', desc: '教民兵舉盾擋刀。全體民兵防禦 +2，最多練 2 次。',
    full: (v) => v.shieldLv >= 2, fullText: '已練滿 2 次', preview: (v) => [['民兵防禦', 3 + v.shieldLv * 2, 5 + v.shieldLv * 2]], run: (v) => { v.shieldLv++; return '民兵防禦 +2'; } },
  spear: { time: 360, name: '長槍陣', cost: { food: 15, iron: 2 }, need: 'drill', desc: '排成槍陣齊刺。全體民兵攻擊 +2，最多練 2 次。',
    full: (v) => v.spearLv >= 2, fullText: '已練滿 2 次', preview: (v) => [['民兵攻擊', 13 + v.spearLv * 2, 15 + v.spearLv * 2]], run: (v) => { v.spearLv++; return '民兵攻擊 +2'; } },
  bow: { time: 360, name: '弓箭手', cost: { food: 20, wood: 10 }, need: 'tower', desc: '挑兩名眼力好的民兵改練弓，射程 2。要先蓋瞭望台當靶場。',
    full: (v) => v.bowmen + 2 > v.militia, fullText: '民兵人數不夠轉成弓手', preview: (v) => [['民兵弓手', v.bowmen, v.bowmen + 2]], run: (v) => { v.bowmen += 2; return '民兵弓手 +2'; } },
};
const V_GROUPS = [['建設', Object.keys(V_PROJECTS)], ['兵器', ['arms']], ['練兵', ['recruit', 'shield', 'spear', 'bow']]];
const GOV_ICON = { fence: '柵', tower: '台', drill: '練', arms: '鐵', recruit: '兵', shield: '盾', spear: '槍', bow: '弓' };
// 缺資源時告訴玩家去哪裡弄
const RES_HINT = { wood: '村外森林、官道砍樹後捐獻', stone: '礦山隧道挖礦後捐獻', iron: '礦山隧道挖鐵礦後捐獻', food: '每日結算 +10', herbs: '採藥後捐獻', silver: '捐盤纏（每 10 文）' };
// 民兵全員上陣（最多 6 名）；有兵器的拿刀槍，沒有的拿農具，攻擊比較低
const vDeploy = () => Math.min(6, V().militia);
const vArmed = () => Math.min(vDeploy(), V().arms);
const vCost = (cost) => Object.entries(cost).map(([r, n]) => `${V_RES.find((x) => x.id === r).name} ${V()[r]}/${n}`).join('、');
const canAct = (id) => !govBlock(id);
function vAct(id) {
  if (!canAct(id)) return;
  const a = V_ACTIONS[id], before = snapHud();
  for (const [r, n] of Object.entries(a.cost)) V()[r] -= n;
  const res = a.run(V());
  fade(() => passTime(a.time));
  talk([`（${a.who ? a.who + '在鋪子裡叮叮噹噹打了半天' : '村口的空地上，民兵們操練了半天'}。）`, `${a.name}完成：${res}。`, () => { flashHud(before); renderGov(); }]);
}
// ---------- 資源圖示（16×16 點陣，程式繪製）與畫面上方的資源列 ----------
const RES_ICON = {};
function resIcon(id) {
  if (RES_ICON[id]) return RES_ICON[id];
  const [c, g] = canvas(16, 16), px = (col, x, y, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  if (id === 'food') { // 米袋
    px('#5a4020', 4, 4, 8, 11); px('#d8c08a', 5, 5, 6, 9); px('#f0dca8', 6, 6, 3, 6); px('#8a6a3a', 5, 3, 6, 2); px('#a83020', 7, 2, 2, 2);
  } else if (id === 'wood') { // 原木堆
    for (const [x, y] of [[2, 8], [8, 8], [5, 3]]) { px('#4a2e18', x, y, 6, 6); px('#c89a5a', x + 1, y + 1, 4, 4); px('#9a6a3a', x + 2, y + 2, 2, 2); }
  } else if (id === 'stone') { // 石塊
    px('#3a3a3a', 2, 6, 12, 8); px('#8a8a86', 3, 5, 10, 8); px('#b0b0aa', 4, 5, 6, 3); px('#6a6a66', 9, 9, 4, 4);
  } else if (id === 'iron') { // 鐵錠
    px('#2a2e36', 2, 7, 12, 6); px('#7a8494', 3, 7, 10, 5); px('#2a2e36', 4, 4, 8, 3); px('#a8b4c4', 4, 5, 8, 2); px('#c8d4e4', 5, 5, 3, 1);
  } else if (id === 'herbs') { // 藥草
    px('#3a5a20', 7, 6, 2, 9); px('#4a8a2a', 3, 4, 4, 3); px('#6aa83e', 4, 5, 3, 2); px('#4a8a2a', 9, 3, 4, 3); px('#6aa83e', 9, 4, 3, 2); px('#4a8a2a', 5, 9, 3, 2); px('#4a8a2a', 9, 8, 3, 2); px('#c0402a', 2, 3, 2, 2); px('#c0402a', 12, 2, 2, 2);
  } else if (id === 'silver') { // 元寶
    px('#5a5a62', 2, 8, 12, 5); px('#c8ccd4', 3, 8, 10, 4); px('#5a5a62', 5, 5, 6, 4); px('#e8ecf4', 6, 5, 4, 3); px('#ffffff', 4, 9, 2, 1);
  }
  return (RES_ICON[id] = c.toDataURL());
}
const resImg = (id) => `<img class="ricon" src="${resIcon(id)}" alt="">`;
// 只在清河村（含室內）顯示；點一下打開選單的「清河村」分頁
// 資源下方的村莊狀態：[鍵, 名稱, 取值]
const V_HUD_STATS = [
  ['pop', '人口', () => V().pop], ['labor', '勞力', () => V().labor], ['heart', '民心', () => S.heart],
  ['prosper', '繁榮', () => V().prosper], ['defense', '防禦', () => vDefense()], ['militia', '民兵', () => V().militia + '/' + V().labor],
  ['arms', '兵器', () => V().arms], ['deploy', '上陣', () => vDeploy() + '(' + vArmed() + ')'], ['ready', '準備', () => vReady() + '%'],
];
function updateVillageHud() {
  const el = $('hudVillage'), show = S && S.village && (G.id === 'village' || G.interior);
  el.style.display = show ? '' : 'none';
  if (!show) return;
  if (!el.firstChild) {
    el.innerHTML = V_RES.map((r) => `<span title="${r.name}">${resImg(r.id)}<i>${r.name}</i><b data-r="${r.id}"></b></span>`).join('') + V_HUD_STATS.map(([k, name]) => `<span class="st"><i>${name}</i><b data-s="${k}"></b></span>`).join('') + '<span class="auth"><i>權限</i><b data-s="auth"></b></span><span class="raid" title="黑風寨來襲倒數">⚔<b data-raid></b></span>';
    el.onclick = () => !isModal() && toggleGov();
  }
  for (const b of el.querySelectorAll('b[data-r]')) { const v = String(V()[b.dataset.r]); if (b.textContent !== v) b.textContent = v; }
  for (const b of el.querySelectorAll('b[data-s]')) { const s = V_HUD_STATS.find(([k]) => k === b.dataset.s), v = String(s ? s[2]() : vAuthText()); if (b.textContent !== v) b.textContent = v; }
  const left = raidLeft(), rb = el.querySelector('b[data-raid]');
  rb.parentNode.style.display = left === null ? 'none' : ''; if (left !== null) rb.textContent = left ? left + '日' : '今夜';
}
function newVillage() { return { food: 120, wood: 12, stone: 6, iron: 0, herbs: 8, silver: 200, pop: 52, labor: 18, prosper: 20, donated: 0, militia: 0, arms: 0, shieldLv: 0, spearLv: 0, bowmen: 0 }; }
const V = () => S.village;
const vBuilt = () => Object.keys(V_PROJECTS).filter((id) => F()['build_' + id]).length;
const vDefense = () => 10 + Object.keys(V_PROJECTS).reduce((s, id) => s + (F()['build_' + id] ? V_PROJECTS[id].defense : 0), 0);
const vAuthText = () => (F().auth ? '可調度物資整備村防' : '僅能捐獻');
// 黑風寨來襲倒數（天）；沒有在倒數時回傳 null
const raidLeft = () => (F().raidDay && !F().raidDone ? Math.max(0, F().raidDay - S.day) : null);

// ---------- 每日結算 ----------
// 換日時呼叫：產出入庫，回傳結算摘要
function villageDaily() {
  setTimeout(renderGov, 0);
  const v = V(), k = S.heart >= 50 ? 1.2 : 1, got = [];
  for (const r of V_RES) { const n = Math.round((V_DAILY[r.id] || 0) * k); if (n) { v[r.id] += n; got.push(`${r.name}+${n}`); } }
  toast('清河村日結：' + got.join('、'));
  setTimeout(() => applyVillageHouses(MAPS.village, true), 2800);
}

// ---------- 捐獻 ----------
function openDonate() {
  shopOpen = true; keys.clear();
  $('shopTitle').textContent = '清河村公共倉庫';
  const render = () => {
    const v = V();
    $('shopGold').textContent = S.gold + ' 文';
    $('shopKeeper').textContent = `民心 ${S.heart} / 100 · 每捐 10 點物資，民心 +1`;
    const list = $('shopList'); list.replaceChildren();
    const stock = document.createElement('div'); stock.className = 'vstock';
    stock.innerHTML = V_RES.map((r) => `<span>${r.name}<b>${v[r.id]}</b></span>`).join('');
    list.appendChild(stock);
    const ids = Object.keys(DONATE).filter((id) => S.inv[id]);
    const rows = [...ids.map((id) => [id, ITEMS[id].name, S.inv[id], DONATE[id]]), ['gold', '銀兩（10 文）', Math.floor(S.gold / 10), { res: 'silver', n: 10, value: 1 }]];
    if (!ids.length) list.insertAdjacentHTML('beforeend', '<p class="muted">背包裡沒有能捐的物資。木材、石材、鐵礦石、藥草都能捐給村子。</p>');
    for (const [id, name, have, d] of rows) {
      if (!have) continue;
      const row = document.createElement('div'); row.className = 'row';
      row.innerHTML = `<div><b>${name}</b> <span class="st">→ ${V_RES.find((r) => r.id === d.res).name} +${d.n}</span><p>持有 ${have}</p></div><div class="right"></div>`;
      for (const [label, cnt] of [['捐 1', 1], ['全部捐出', have]]) {
        const b = document.createElement('button'); b.textContent = label;
        b.onclick = () => { donate(id, cnt); render(); };
        row.querySelector('.right').appendChild(b);
      }
      list.appendChild(row);
    }
  };
  render();
  $('shop').classList.add('open');
}
function donate(id, cnt) {
  const d = id === 'gold' ? { res: 'silver', n: 10, value: 1 } : DONATE[id];
  if (id === 'gold') S.gold -= cnt * 10; else take(id, cnt);
  V()[d.res] += d.n * cnt;
  const before = Math.floor(V().donated / 10);
  V().donated += d.value * cnt;
  const gain = Math.floor(V().donated / 10) - before;
  if (gain) S.heart = Math.min(100, S.heart + gain);
  toast(`捐出 ${cnt} 份 · ${V_RES.find((r) => r.id === d.res).name} +${d.n * cnt}${gain ? ` · 民心 +${gain}` : ''}`);
}

// ---------- 建設 ----------
const BUILD_TIME = 720;
const canBuild = (id) => !isNight() && F().auth && !F()['build_' + id] && Object.entries(V_PROJECTS[id].cost).every(([r, n]) => V()[r] >= n);
function build(id) {
  if (!canBuild(id)) return;
  for (const [r, n] of Object.entries(V_PROJECTS[id].cost)) V()[r] -= n;
  const before = snapHud();
  F()['build_' + id] = 1; applyVillageBuilds(MAPS.village);
  fade(() => { passTime(BUILD_TIME); camFocus = { x: GATE.x + { fence: 0, tower: -210, drill: 215 }[id], y: GATE.y + 40, until: performance.now() + 2600 }; });
  talk(['（村民們扛來木料，叮叮咚咚從日出忙到日落。）', `「${V_PROJECTS[id].name}」完工了！`, () => { S.heart = Math.min(100, S.heart + 3); flashHud(before); renderGov(); toast(`防禦評分 ${vDefense()} · 民心 +3`); }]);
}
// 瞭望台：木架高台（程式繪製）
function makeTower() {
  const [c, g] = canvas(80, 150), by = 146;
  g.fillStyle = '#00000040'; g.beginPath(); g.ellipse(40, by - 2, 34, 8, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3e2a17'; for (const x of [12, 62]) g.fillRect(x, 40, 7, by - 40);
  g.strokeStyle = '#5a3e22'; g.lineWidth = 3; g.beginPath(); g.moveTo(16, 60); g.lineTo(65, by - 10); g.moveTo(65, 60); g.lineTo(16, by - 10); g.stroke();
  g.fillStyle = '#7a5530'; g.fillRect(4, 36, 72, 8); g.fillStyle = '#9a7246'; g.fillRect(4, 36, 72, 3);
  g.fillStyle = '#6a4828'; for (let x = 6; x < 74; x += 8) g.fillRect(x, 18, 4, 18); g.fillRect(4, 16, 72, 4);
  poly(g, [[0, 18], [40, 0], [80, 18]], '#4a3a2a'); poly(g, [[40, 0], [80, 18], [60, 18]], '#3a2c20');
  g.fillStyle = '#a03020'; g.fillRect(38, 0, 3, 10); g.fillRect(41, 0, 10, 6);
  return { img: c, ax: 40, ay: by };
}
// 依建設旗標把柵欄、瞭望台、練兵場畫上村莊地圖；讀檔時會再呼叫一次：先拆掉舊的，再依旗標重蓋
// 村民的房子：依「民心＋繁榮」的平均，一間一間從破屋換成修好的瓦房（VILLAGE_HOUSES 的 at 為門檻）
const villageProgress = () => (S.heart + V().prosper) / 2;
function applyVillageHouses(Gv, announce) {
  if (!Gv.houses) {
    Gv.houses = VILLAGE_HOUSES.map((h) => {
      const o = { x: h.x, y: h.y, ax: 0, ay: 0, img: null, def: h, rich: null };
      Gv.sprites.push(o);
      const sw = BUILD_NATIVE || !h.w ? (VHOUSE[h.poor] || {}).width || 300 : h.w, solid = [h.x - sw * 0.38, h.y - sw * 0.32, h.x + sw * 0.38, h.y - sw * 0.04];
      Gv.solids.push(solid);
      return o;
    });
  }
  let up = 0;
  for (const o of Gv.houses) {
    const rich = villageProgress() >= o.def.at, src = VHOUSE[rich ? o.def.rich : o.def.poor] || (o.def.poor === '公倉' ? makeGranary().img : null);
    if (!src || o.rich === rich) continue;
    if (o.rich === false && rich && !o.def.vacant) up++;
    if (o.rich === false && rich && o.def.vacant) toast('有一戶流民搬進了村裡的空屋');
    // w 為 0：破舊版照原圖大小，升級版縮到跟破舊版一樣寬
    const tw = o.def.w || (VHOUSE[o.def.poor] || src).width, k = BUILD_NATIVE ? 1 : tw / src.width, w = Math.round(src.width * k), h = Math.round(src.height * k), c = pixelScale(src, w, h);
    // 空屋：門窗釘上交叉的木板、整棟暗一點
    if (o.def.vacant && !rich) {
      const g = c.getContext('2d');
      g.fillStyle = 'rgba(20,16,12,.25)'; g.globalCompositeOperation = 'source-atop'; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over';
      const bx = w * 0.5, by = h * 0.68;
      for (const a of [0.45, -0.45]) { g.save(); g.translate(bx, by); g.rotate(a); g.fillStyle = '#5a3a1c'; g.fillRect(-w * 0.12, -4, w * 0.24, 8); g.fillStyle = '#8a5a30'; g.fillRect(-w * 0.12, -4, w * 0.24, 2); g.restore(); }
    }
    Object.assign(o, { img: c, ax: w / 2, ay: Math.round(h * 0.86), rich });
  }
  applyBuildingLooks(Gv);
  if (announce && up) toast(up > 1 ? `村裡又有 ${up} 戶人家修好了屋子` : '村裡又有一戶人家修好了屋子');
}
function applyVillageBuilds(Gv) {
  applyVillageHouses(Gv); applyBuildingLooks(Gv);
  if (Gv.built) { Gv.sprites = Gv.sprites.filter((s) => !Gv.built.includes(s)); Gv.solids = Gv.solids.filter((s) => !Gv.built.includes(s)); Gv.circles = Gv.circles.filter((s) => !Gv.built.includes(s)); }
  Gv.built = [];
  const put = (s, x, y, solid) => { const o = { img: s.img, x, y, ax: s.ax, ay: s.ay }; Gv.sprites.push(o); Gv.built.push(o); if (solid) { Gv.solids.push(solid); Gv.built.push(solid); } };
  // 柵欄：南邊村口牌樓兩側各三段削尖木柵（沿用官道山寨的木柵造型）
  if (F().build_fence) { const bar = makeBarricade(); for (const dx of [-150, -255, -360, 150, 255, 360]) put(bar, GATE.x + dx, GATE.y + 4, [GATE.x + dx - 52, GATE.y - 10, GATE.x + dx + 52, GATE.y + 4]); }
  // 牌樓在河的南岸，北邊就是河：瞭望台、練兵場都放在牌樓外（南側）的空地
  if (F().build_tower) put(makeTower(), GATE.x - 210, GATE.y + 80, [GATE.x - 245, GATE.y + 66, GATE.x - 175, GATE.y + 84]);
  // 練兵場：兩個草人當木樁
  if (F().build_drill) for (const dx of [185, 250]) { const s = makeScarecrow(); put(s, GATE.x + dx, GATE.y + 85); const cc = [GATE.x + dx, GATE.y + 81, 12]; Gv.circles.push(cc); Gv.built.push(cc); }
}

// ---------- 黑風寨來襲：清河村保衛戰 ----------
// 保衛戰本身是戰棋（tactics.js）：柵欄、瞭望台會成為棋盤上的障礙與弓手，有兵器的民兵上陣；藥材在戰後減少傷亡
function raidCheck() {
  if (raidLeft() === 0 && !isModal()) raidEvent();
}
function raidEvent() {
  const f = F(), n = vDeploy(), armed = vArmed(), built = vBuilt();
  keys.clear();
  const prep = [f.build_fence ? '村口的木柵已經立好，賊人只能擠向牌樓' : '村口無遮無擋，賊人可以從四面八方湧過來', f.build_tower ? '瞭望台的弓手已經登上高台' : '沒有人放哨，等看見火把時賊人已到村口',
    !n ? '村裡沒有民兵，只有你和阿武頂在前面' : armed === n ? `${n} 名民兵握著刀槍守在牌樓下` : `${n} 名民兵守在牌樓下，其中 ${n - armed} 人只拿著鋤頭、草叉`];
  const mood = ['（賊人一路吆喝，氣焰囂張，顯然沒把清河村放在眼裡。）', '', '（看見村口的防備，火把隊伍遲疑了一下。）', '（黑風寨的探子早回報了：清河村有備而來。賊人的叫罵聲明顯虛了。）'].at(built);
  talk(['（夜裡，官道上亮起一長串火把——黑風寨的人來了。）', ...prep.map((s) => `（${s}。）`), ...(mood ? [mood] : []),
    ['陳伯安', '孩子……清河村就拜託你了！'],
    () => fade(() => { switchMap('village', GATE.x, GATE.y + 40, 1); startTactics(); }, 900)]);
}
// lost：戰死的民兵；breach：闖進村裡的賊人（每人害兩個村民受傷）
function raidWin(lost, breach) {
  const f = F(), v = V();
  let hurt = lost + breach * 2;
  const saved = Math.min(hurt, Math.floor(v.herbs / 4)); v.herbs -= saved * 4; hurt -= saved;
  v.pop -= hurt; v.militia = Math.max(0, v.militia - lost); v.arms = Math.max(0, v.arms - lost); v.prosper += 10;
  f.raidDone = 1; f.raidResult = 'win'; S.heart = Math.min(100, S.heart + 10); S.fame += 20;
  talk(['（天邊泛白，黑風寨的人丟下火把，狼狽逃回官道。）', ['陳伯安', '守住了……清河村守住了！'],
    saved ? `（靠著倉裡的藥材，救回了 ${saved} 條人命。）` : '（村裡沒有多餘的藥材，傷者只能硬撐。）',
    hurt ? `（這一戰，村裡折了 ${hurt} 個人。）` : '（萬幸，村裡無人傷亡。）',
    () => toast('保衛戰勝利 · 民心 +10 · 江湖聲望 +20 · 繁榮度 +10')]);
}
function raidLose() {
  const f = F(), v = V();
  f.raidDone = 1; f.raidResult = 'lose';
  v.food = Math.round(v.food * 0.6); v.wood = Math.round(v.wood * 0.5); v.silver = Math.round(v.silver * 0.5); v.pop -= 8; v.militia = 0;
  S.heart = Math.max(0, S.heart - 10);
  talk([['陳伯安', '……糧倉被搶了一大半，還折了好些人。'], ['陳伯安', '不怪你，孩子。是咱們準備得不夠。'], () => toast('保衛戰失敗 · 糧食、木材、銀兩被搶 · 民心 -10')]);
}

// ---------- 右側政務面板（V 鍵） ----------
// 上方圖示列一眼看狀態；點一項，下方詳情區說明原因、花費差多少、完工時刻與保衛戰的變化，按「確認」才執行
let govOpen = false, govSel = 'fence';
function toggleGov() {
  if (!govOpen && !(G.id === 'village' || G.interior)) return toast('回到清河村才能處理村務');
  govOpen = !govOpen; $('gov').classList.toggle('open', govOpen); if (govOpen) renderGov();
}
const isBuild = (id) => !!V_PROJECTS[id];
const govDef = (id) => V_PROJECTS[id] || V_ACTIONS[id];
const govTime = (id) => (isBuild(id) ? BUILD_TIME : V_ACTIONS[id].time);
// 不能執行的原因（依序檢查）；null = 可以執行
function govBlock(id) {
  const d = govDef(id), v = V();
  if (!F().auth) return { lock: true, text: '需要村長陳伯安授權（民心達 30 後找他）' };
  if (isBuild(id) && F()['build_' + id]) return { done: true, text: '已完工' };
  if (!isBuild(id) && d.need && !F()['build_' + d.need]) return { lock: true, text: `先蓋好「${V_PROJECTS[d.need].name}」`, go: d.need };
  if (!isBuild(id) && d.full && d.full(v)) return { done: true, text: d.fullText };
  if (isNight()) return { text: '入夜了，明天卯時才能動工' };
  const lack = Object.entries(d.cost).filter(([r, n]) => v[r] < n);
  if (lack.length) return { short: true, text: '材料不足' };
  return null;
}
// 保衛戰準備度 0–100：建設、上陣民兵、兵器、訓練、藥材
function vReady() {
  const v = V(), n = vDeploy();
  return Math.min(100, Math.round(vBuilt() * 15 + n * 5 + vArmed() * 2 + (v.shieldLv + v.spearLv) * 4 + v.bowmen * 2 + Math.min(10, Math.floor(v.herbs / 4) * 2)));
}
// 執行後的變化預覽
function govPreview(id) {
  if (isBuild(id)) {
    const p = V_PROJECTS[id], rows = [['防禦評分', vDefense(), vDefense() + p.defense]];
    if (id === 'tower') rows.push(['弓手', 0, 1]);
    if (id === 'drill') rows.push(['民兵氣血', 45, 60]);
    return rows;
  }
  return V_ACTIONS[id].preview(V());
}
const clock = (min) => `${shichen(min % 1440)}${min >= 1440 ? '（隔天）' : ''}`;
function renderGov() {
  if (!govOpen) return;
  const v = V(), body = $('govBody'), left = raidLeft();
  $('govReady').innerHTML = `保衛戰準備度 <b>${vReady()}%</b><i style="width:${vReady()}%"></i>${left !== null ? `<span>⚔ 黑風寨 ${left ? left + ' 日後' : '今夜'}</span>` : ''}`;
  body.replaceChildren();
  // 圖示列
  const strip = document.createElement('div'); strip.className = 'gstrip';
  for (const [title, ids] of V_GROUPS) {
    const grp = document.createElement('div'); grp.innerHTML = `<label>${title}</label>`;
    for (const id of ids) {
      const bl = govBlock(id), st = !bl ? 'ready' : bl.done ? 'done' : bl.lock ? 'locked' : 'short';
      const b = document.createElement('button'); b.className = `gico ${st}${id === govSel ? ' sel' : ''}`; b.title = govDef(id).name;
      b.innerHTML = `${GOV_ICON[id]}${st === 'done' ? '<s>✓</s>' : st === 'locked' ? '<s>🔒</s>' : ''}`;
      b.onclick = () => { govSel = id; renderGov(); }; grp.appendChild(b);
    }
    strip.appendChild(grp);
  }
  body.appendChild(strip);
  // 詳情
  const id = govSel, d = govDef(id), bl = govBlock(id), det = document.createElement('div'); det.className = 'gdet';
  const tag = !bl ? '<em class="ok">可執行</em>' : bl.done ? '<em class="done">' + bl.text + '</em>' : bl.lock ? '<em class="no">未解鎖</em>' : '<em class="no">' + bl.text + '</em>';
  let html = `<h3>${d.name}${isBuild(id) ? ` <small>防禦 +${d.defense}</small>` : ''}${tag}</h3><p>${d.desc}</p>`;
  if (bl && bl.lock) html += `<p class="why">🔒 ${bl.text}${bl.go ? ' <a data-go="' + bl.go + '">→ 前往</a>' : ''}</p>`;
  if (!(bl && bl.done)) {
    html += '<dl><dt>需要</dt><dd>' + Object.entries(d.cost).map(([r, n]) => {
      const name = V_RES.find((x) => x.id === r).name, ok = v[r] >= n;
      return `<div class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${name} ${v[r]} / ${n}${ok ? '' : `<small>還差 ${n - v[r]} → ${RES_HINT[r]}</small>`}</div>`;
    }).join('') + '</dd>';
    html += `<dt>時間</dt><dd>${timeText(govTime(id))}（現在${shichen(S.time)} → ${clock(S.time + govTime(id))}完成）</dd>`;
    html += '<dt>變化</dt><dd>' + govPreview(id).map(([k, a, b]) => `<div>${k} ${a} → <b>${b}</b></div>`).join('') + '</dd></dl>';
  }
  det.innerHTML = html;
  for (const a of det.querySelectorAll('a[data-go]')) a.onclick = () => { govSel = a.dataset.go; renderGov(); };
  if (!(bl && bl.done)) {
    const btn = document.createElement('button'); btn.className = 'gconfirm';
    btn.textContent = bl ? (bl.lock ? '尚未解鎖' : bl.text) : `確認${isBuild(id) ? '動工' : '執行'}（${timeText(govTime(id))}）`;
    btn.disabled = !!bl; btn.onclick = () => (isBuild(id) ? build(id) : vAct(id));
    det.appendChild(btn);
  }
  body.appendChild(det);
}
// 完成回饋：左上角變動的數字閃一下
function snapHud() { const out = {}; for (const b of document.querySelectorAll('#hudVillage b')) out[b.dataset.r || b.dataset.s] = b.textContent; return out; }
function flashHud(before) {
  updateVillageHud();
  for (const b of document.querySelectorAll('#hudVillage b')) {
    const k = b.dataset.r || b.dataset.s; if (!k || before[k] === b.textContent) continue;
    b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
  }
}
setInterval(() => { if (govOpen && !(G.id === 'village' || G.interior)) toggleGov(); }, 500);

// ---------- 村長：授權與選單 ----------
// 民心到 30，陳伯安才肯把公共物資交給這個外鄉人調度
function chiefMenu() {
  const f = F(), lines = [];
  if (!f.auth && S.heart >= 30) {
    lines.push(['陳伯安', '這些日子你替村子做的事，大夥兒都看在眼裡。'], ['陳伯安', '村口那道舊柵欄早就爛光了，黑風寨的人若真打過來，連個擋的東西都沒有。'],
      ['陳伯安', '今早阿武在官道上撞見黑風寨的探子……老夫估摸，不出三天，他們就要來了。'],
      ['陳伯安', '公共倉庫的物資，就交給你調度。修柵欄、搭瞭望台、練民兵，你看著辦。'], () => { f.auth = 1; f.raidDay = S.day + 3; toast('取得授權 · 黑風寨三日後來襲'); },
      '（按 V 鍵或點左上角的村務欄，打開「清河村政務」面板。）');
  }
  lines.push({ name: '陳伯安', q: '有什麼事嗎？', choices: [
    ['捐獻物資給村子', () => { openDonate(); }],
    ['村裡的情況', () => [['陳伯安', `村裡如今有 ${V().pop} 口人，能下地幹活的約莫 ${V().labor} 個。`], ['陳伯安', `倉裡的糧食還有 ${V().food} 石，${V().food >= 100 ? '撐得過這個冬天。' : '得省著吃了。'}`],
      ...(f.auth ? [] : [['陳伯安', '公共倉庫的東西是全村的，老夫不能隨便交給外人……你若真心為村子好，大夥兒會看見的。']])]],
    ['閒聊', () => chiefChat()],
    ['沒事', () => []],
  ] });
  talk(lines);
}
