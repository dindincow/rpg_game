'use strict';
// 清河村 — 遊戲主程式：移動、繪製、對話、商店、選單、存檔
const C = document.getElementById('game'), ctx = C.getContext('2d');
const VW = 960, VH = 540, FOOT = 58;
// 畫布實際用 2 倍解析度（1920×1080），座標仍以 960×540 計算；主角的高解析度圖（img.hd = 3）才畫得出細節
C.width = VW * 2; C.height = VH * 2; ctx.scale(2, 2); ctx.imageSmoothingEnabled = false;
// 主角圖格：高解析度圖每格是原本的 hd 倍；縮回原大小畫時改用平滑縮放，才不會出現鋸齒
const hd3 = (img) => ((img.hd = 3), img);
const cellOf = (img, fw = CHAR_FW) => fw * ((img && img.hd) || 1);
const smoothFor = (img) => { ctx.imageSmoothingEnabled = !!(img && img.hd); ctx.imageSmoothingQuality = 'high'; };
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const SAVE_KEY = 'qinghe_rpg_save_v1'; // 舊版單一存檔，讀取時當作第 1 格
const SLOT_KEY = (n) => 'qinghe_rpg_slot_' + n, SAVE_SLOTS = 3, SAVE_VERSION = 4;
let curSlot = 1;

const MAPS = {};
let G = null, heroImg = null, S = null, player = null, npcs = [], interactables = [];
let last = 0, cam = { x: 0, y: 0 }, toastUntil = 0, started = false, fading = false;
// gathering：採集動畫進行中；worldFx：地圖上的短暫特效（世界座標，draw(p) 的 p 為 0–1 進度）
let gathering = null, worldFx = [], gatherImg = null, camFocus = null;
const keys = new Set();
const leaves = [], fireflies = [];
const [LC, lctx] = (() => { const c = document.createElement('canvas'); c.width = VW; c.height = VH; return [c, c.getContext('2d')]; })();

// ---------- 狀態 ----------
function newState() {
  const s = { x: FO_WAKE.x, y: FO_WAKE.y, dir: 3, time: 3 * 60 + 17, day: 1, gold: 150, lv: 1, exp: 0, poison: 0, map: 'forest', steps: 0,
    attrs: attrsAt(1), fame: 0, heart: 10, life: {}, specs: {}, tp: 1, tree: {}, village: newVillage(),
    inv: { herb: 2 }, equip: { weapon: null, armor: 'cloth', acc: null }, flags: { phone_batt: 12 }, story: newStory() };
  deriveStats(s); s.hp = s.maxHp; s.mp = s.baseMp;
  return s;
}
function attrsAt(lv) { const a = {}; for (const t of ATTRS) a[t.id] = t.base + t.grow * (lv - 1); return a; }
// 攻擊、防禦、速度、氣血與精力上限都由基本屬性換算
function deriveStats(s) {
  const a = s.attrs;
  s.atk = a.str; s.def = Math.round(a.con / 2); s.spd = a.agi; s.maxHp = 56 + a.con * 8 + treeFx('hp', s); s.baseMp = 16 + a.wil * 3;
}
const F = () => S.flags;
const stat = {
  atk: () => S.atk + (ITEMS[S.equip.weapon]?.atk || 0) + treeFx('atk'),
  def: () => S.def + (ITEMS[S.equip.armor]?.def || 0) + (ITEMS[S.equip.acc]?.def || 0) + treeFx('def'),
  maxMp: () => S.baseMp + (ITEMS[S.equip.acc]?.mp || 0) + treeFx('mp'),
  dodge: () => Math.max(0, S.attrs.agi - 8) / 100 + treeFx('dodge'),
};
const fameTitle = () => FAME_TITLES.filter(([n]) => S.fame >= n).pop()[1];
function addHeart(n) { S.heart = Math.min(100, S.heart + n); toast(`清河村民心 +${n}`); setTimeout(() => applyVillageHouses(MAPS.village, true), 2800); }
function addFame(n) { S.fame += n; toast(`江湖聲望 +${n}`); }

// ---------- 生活技能 ----------
const lifeDef = (cat) => LIFE_SKILLS.find((c) => c.id === cat);
const lifeLv = (cat) => (S.life[cat] ? S.life[cat].lv : 0);
function learnSpec(cat, spec) {
  if (!S.life[cat]) S.life[cat] = { lv: 1, exp: 0 };
  S.specs[spec] = 1;
  return `習得生活技能「${lifeDef(cat).name} · ${lifeDef(cat).specs[spec]}」`;
}
// 增加熟練，回傳升級訊息
function lifeExp(cat, n) {
  const s = S.life[cat], lines = [];
  s.exp += n;
  while (s.lv < LIFE_EXP.length && s.exp >= LIFE_EXP[s.lv]) { s.lv++; lines.push(`${lifeDef(cat).name}熟練度提升到 Lv ${s.lv}！`); }
  return lines;
}
// 成功率：熟練度與該類主屬性越高越穩
function craftRate(r) { return Math.min(0.95, 0.6 + lifeLv(r.skill) * 0.05 + (S.attrs[lifeDef(r.skill).attr] - 10) * 0.02 + treeFx('craft')); }
// 技能樹可減少材料用量（r.less 指定效果名，減在第一項材料上）
function recipeNeed(r) { const need = { ...r.need }, k = Object.keys(need)[0]; need[k] = Math.max(1, need[k] - (r.less ? treeFx(r.less) : 0)); return need; }
const canCraft = (r) => S.specs[r.spec] && lifeLv(r.skill) >= r.lv && Object.entries(recipeNeed(r)).every(([id, n]) => (S.inv[id] || 0) >= n);
function craft(id) {
  const r = RECIPES[id]; if (!canCraft(r)) return;
  for (const [it, n] of Object.entries(recipeNeed(r))) take(it, n);
  const ok = Math.random() < craftRate(r);
  passTime(30);
  if (ok) give(id);
  const lines = lifeExp(r.skill, ok ? 4 : 1);
  toast(ok ? `製作成功：獲得「${r.name}」` : '火候沒掌握好，材料糟蹋了……');
  if (lines.length) setTimeout(() => toast(lines.join(' ')), 1400);
}
function give(id, n = 1) { S.inv[id] = (S.inv[id] || 0) + n; }
function take(id, n = 1) { S.inv[id] = (S.inv[id] || 0) - n; if (S.inv[id] <= 0) delete S.inv[id]; }
function has(id) { return (S.inv[id] || 0) > 0 || Object.values(S.equip).includes(id); }
function healAll() { S.hp = S.maxHp; S.mp = stat.maxMp(); }

// ---------- 角色 ----------
function tintSheet(img, filter) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.filter = filter; g.drawImage(img, 0, 0); return c;
}
const NPC_DEFS = [
  { id: 'chief', name: '陳伯安', x: 1262, y: 676, dir: 0, filter: 'grayscale(.8) sepia(.35) brightness(1.15)', scale: 1.3, wander: 70, speed: 26, hide: () => !F().chief },
  { id: 'kid', name: '小豆', x: 1380, y: 770, filter: 'hue-rotate(-18deg) saturate(1.35) brightness(1.12)', scale: 1.1, wander: 240, speed: 75 },
  { id: 'guard', name: '阿武', x: 1405, y: 1612, dir: 2, filter: 'saturate(.35) brightness(.78) contrast(1.25)', scale: 1.42, wander: 100, speed: 32 },
  { id: 'farmer', name: '王嬸', x: 2060, y: 1170, filter: 'sepia(.55) hue-rotate(-12deg) saturate(1.1) brightness(1.1)', scale: 1.25, wander: 110, speed: 38 },
  { id: 'fisher', name: '張叔', x: 1600, y: 1316, dir: 0, filter: 'grayscale(.45) hue-rotate(18deg) brightness(.86)', scale: 1.3 },
  { id: 'traveler', name: '旅人', x: 300, y: 855, dir: 3, filter: 'sepia(.8) saturate(.55) brightness(.96)', scale: 1.35, wander: 90, speed: 30 },
  { id: 'storyteller', name: '說書先生', x: 1430, y: 920, dir: 2, scale: 1.3, wander: 110, speed: 22 },
  // 周老伯一家住河邊，平日在西邊河岸（原本住的河畔人家現在是王宅）
  { id: 'elder', name: '周老伯', x: 380, y: 1335, dir: 0, filter: 'grayscale(.85) brightness(1.15)', scale: 1.3 },
  { id: 'ashui', art: 'ashui', name: '阿水', x: 330, y: 1345, dir: 3, scale: 1.1, wander: 60, speed: 40 },
];
for (const d of NPC_DEFS) d.y += VN;
function makeActor(o) {
  return Object.assign({ x: 0, y: 0, dir: 0, frame: 0, anim: 0, moving: false, scale: 1.35, speed: 40, wander: 0, wait: 1 + Math.random() * 3, target: null, talkIdx: 0 }, o);
}

// ---------- 碰撞 ----------
function blocked(x, y, self) {
  const r = 10;
  if (x < 24 || x > G.W - 24 || y < (G.id === 'village' ? 64 : 10) || y > G.H - 6) return true;
  if (G.water(x, y)) return true;
  for (const [l, t, rr, b] of G.solids) if (x + r > l && x - r < rr && y + 5 > t && y - 5 < b) return true;
  for (const [cx, cy, cr] of G.circles) if (cr && (x - cx) ** 2 + ((y - cy) * 1.6) ** 2 < (cr + r) ** 2) return true;
  for (const a of [player, ...npcs]) if (a && a !== self && (x - a.x) ** 2 + ((y - a.y) * 1.6) ** 2 < 22 * 22) return true;
  return false;
}
function moveActor(a, dx, dy, speed, dt) {
  a.moving = !!(dx || dy);
  if (!a.moving) { a.frame = 0; a.anim = 0; return; }
  const len = Math.hypot(dx, dy); dx /= len; dy /= len;
  a.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
  const nx = a.x + dx * speed * dt, ny = a.y + dy * speed * dt;
  let moved = false;
  if (!blocked(nx, a.y, a)) { a.x = nx; moved = true; }
  if (!blocked(a.x, ny, a)) { a.y = ny; moved = true; }
  a.anim += dt * (speed / 15); a.frame = Math.floor(a.anim) % (a.frames || 8);
  return moved;
}

// ---------- 互動點 ----------
function bld(id) { return MAPS.village.buildings.find((b) => b.id === id); }
function buildInteractables() {
  const npcIt = npcs.map((n) => ({ npc: n, r: n.r || (n.id === 'boss' ? 90 : 62), name: n.name, act: () => (n.story ? storyTalk(n) : n.folk ? talk(typeof n.folk.talk === 'function' ? n.folk.talk() : n.folk.talk) : (NPC_TALK[n.id] || FIELD_TALK[n.id] || FOREST_TALK[n.id] || YUN_TALK[n.id] || INTERIOR_TALK[n.id])(n)) }));
  if (G.interior) { interactables = [...storyInteractables(), ...interiorInteractables(), ...npcIt]; return; }
  if (G.id === 'field') { interactables = [...fieldInteractables(), ...npcIt]; return; }
  if (G.id === 'forest') { interactables = [...storyInteractables(), ...forestInteractables(), ...npcIt]; return; }
  if (G.id === 'wildwood') { interactables = [...storyInteractables(), ...npcIt]; return; }
  if (G.id === 'mine') { interactables = [...mineInteractables(), ...npcIt]; return; }
  if (G.id === 'yunshan') { interactables = [...yunInteractables(), ...npcIt]; return; }
  const folks = DOOR_FOLKS.filter((f) => !bld(f.b).cutout).map((f) => { const b = bld(f.b); return { x: b.x + f.rel[0], y: b.y + f.rel[1], r: 46, name: f.name, act: () => talk(typeof f.talk === 'function' ? f.talk() : f.talk) }; });
  for (const ch of V_CHESTS) G.chests[ch.id].img = chestFrame(F()['chest_' + ch.id] ? 2 : 0);
  interactables = [
    ...storyInteractables(),
    ...folks,
    ...V_CHESTS.map((ch) => ({ x: ch.x, y: ch.y + 6, r: 50, name: '寶箱', act: () => openChest(ch) })),
    { x: WELL.x, y: WELL.y + 10, r: 90, name: '清河古井', act: searchWell },
    { x: 1040, y: 530 + VN, r: 55, name: '木桶', act: () => search('sInn', ['（在木桶後找到一束止血草。）', () => { give('herb'); toast('獲得「止血草」'); }], '只是幾罈醃菜，聞起來挺香。') },
    { x: 2120, y: 468 + VN, r: 55, name: '木箱', act: () => search('sCrate', ['（木箱底層壓著 30 文錢，大概是誰忘了拿走。）', () => { S.gold += 30; toast('獲得 30 文'); }], '箱裡堆著些廢鐵和刀柄。') },
    { x: 400, y: 1402 + VN, r: 60, name: '蘆葦叢', act: searchReeds, spark: () => F().quest === 1 && !has('jade') },
    { x: 380, y: 775 + VN, r: 60, name: '路牌', act: () => talk(['木牌上寫著：「西：清河鎮（山路坍方，暫不通行）」']) },
    { x: 1385, y: 1360 + VN, r: 60, name: '路牌', act: () => talk(['木牌上寫著：「南：雲山官道　三十里」']) },
    { x: 150, y: 800 + VN, r: 80, name: '落石', act: () => talk(['巨石堆滿了往清河鎮的山路，看來一時半刻是過不去了。', '倒是旁邊有條踩出來的小徑，鑽進了西邊的林子。']) },
    { x: SHRINE.x, y: SHRINE.y + 30, r: 80, name: '祠堂', act: visitShrine },
    { x: 2760, y: 1350 + VN, r: 80, name: '土地公廟', act: visitTudi },
    { x: 850, y: 860 + VN, r: 80, name: '公倉', act: () => talk(['（公倉的門半掩著，裡頭的米缸大多見了底。）', () => openDonate()]) },
    { x: 2180, y: 1225 + VN, r: 60, name: '稻草人', act: () => talk(['稻草人戴著斗笠，表情似乎有點得意。']) },
    ...npcIt,
  ];
}
function switchMap(id, x, y, dir = 0) {
  G = MAPS[id]; S.map = id;
  refreshNpcs();
  player.x = x; player.y = y; player.dir = dir; player.frame = 0; S.steps = 0;
  leaves.length = 0; fireflies.length = 0;
  if (id === 'field') { applyFieldFlags(G); spawnMonsters(); }
  else if (id === 'mine') { applyMineFlags(G); monsters = []; }
  else if (id === 'yunshan') { applyYunshanFlags(G); spawnYunshanMonsters(); }
  else monsters = [];
  if (G.chest) G.chest.img = makeChest(!!F().homeChest).img;
}
// 已擊退的敵人不再出現
function enterRoom(id) {
  keys.clear();
  fade(() => { const R = MAPS['in_' + id]; switchMap(R.id, R.door, R.H - 40, 1); toast(R.name); });
}
function leaveRoom() {
  keys.clear(); const b = bld(G.outside);
  fade(() => switchMap('village', b.doorX, b.doorY + 26, 0));
}
function doorNear() { return !G.interior && G.buildings.find((b) => Math.abs(player.x - b.doorX) < 30 && Math.abs(player.y - b.doorY) < 34); }
function doorAhead() { return keys.has('up') && G.buildings.find((b) => Math.abs(player.x - b.doorX) < 24 && player.y < b.doorY + 8 && player.y > b.doorY - 30); }
const NIGHT_STAY = ['guard', 'chief'];
const shownNpcs = () => G.npcs.filter((n) => !(n.hostile && (F().boss || F().boss_fog)) && !(n.hide && n.hide()) && !(G.id === 'village' && isNight() && !n.folk && !NIGHT_STAY.includes(n.id)));
function refreshNpcs() { npcs = shownNpcs(); buildInteractables(); }
function nearest() {
  let best = null, bd = Infinity;
  for (const it of interactables) {
    const x = it.npc ? it.npc.x : it.x, y = it.npc ? it.npc.y : it.y;
    const d = Math.hypot(player.x - x, (player.y - y) * 1.2);
    if (d < it.r && d < bd) { bd = d; best = it; }
  }
  return best;
}
function face(n) {
  const dx = player.x - n.x, dy = player.y - n.y;
  n.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
  n.moving = false; n.frame = 0; n.target = null; n.wait = 4;
}
function interact() {
  if (isModal()) return;
  const it = nearest();
  if (!it) { toast('附近沒有可以調查的東西'); return; }
  if (it.npc) face(it.npc);
  it.act();
}
function search(flag, found, empty) {
  if (!F()[flag]) { F()[flag] = 1; talk(found); } else talk([empty]);
}

// ---------- 劇情與對話 ----------
function objective() {
  const sq = storyObjective();
  if (sq) return sq;
  const q = mainObjective();
  if (G.id === 'forest') return [q[0], FO_EXIT.x, FO_EXIT.y];
  if (G.id === 'wildwood') return [q[0], WW_EAST.x, WW_EAST.y];
  if (G.id === 'mine') return [q[0], MI_EXIT.x, MI_EXIT.y];
  return q;
}
function mainObjective() {
  const f = F(), inField = G.id === 'field', inYun = G.id === 'yunshan';
  if (raidLeft() !== null) return [raidLeft() ? `整備清河村：黑風寨 ${raidLeft()} 日後來襲` : '黑風寨今夜來襲！回清河村迎戰', GATE.x, GATE.y];
  if (!f.chief) return ['前往村中古井，拜見村長陳伯安', 1262, 676 + VN];
  if (!S.equip.weapon) return ['到「鐵峰武器鋪」購置兵器並裝備', bld('weapon').doorX, bld('weapon').doorY];
  if (!f.gate) return ['過橋，到南邊橋頭找守衛阿武', 1405, 1612 + VN];
  if (!f.boss) return inField ? ['沿官道南行，穿越黑風坡', F_CAMP.x, F_CAMP.y - 60] : ['出村，往南方的雲山官道前進', 1300, WORLD.H - 30];
  if (!f.fogma_jade) return inYun ? ['在霧婆茶棚與霧婆交談', Y_SHRINE.x, Y_SHRINE.y] : inField ? ['往南進入雲山', 960, FH - 30] : ['回到雲山官道，繼續南行', 1300, WORLD.H - 30];
  if (!f.lingxiao_met) return inYun ? ['繼續向南，前往問心亭', Y_PAVILION.x, Y_PAVILION.y] : inField ? ['往南進入雲山', 960, FH - 30] : ['前往雲山', 1300, WORLD.H - 30];
  if (!f.boss_fog) return inYun ? ['與凌霄共同鎮壓霧煞', Y_BOSS.x, Y_BOSS.y] : inField ? ['往南進入雲山', 960, FH - 30] : ['前往雲山', 1300, WORLD.H - 30];
  return inYun ? ['繼續向南，前往雲海古城', 960, YH - 80] : inField ? ['進入雲山', 960, FH - 30] : ['前往雲山', 1300, WORLD.H - 30];
}
function talkMother() {
  const f = F();
  const lines = [];
  // 第一次見面：送他一套衣裳，從此換上古裝
  if (!f.outfit) lines.push(['吳嬸', '你就是老吳說的那個小兄弟吧？聽說你為了救沈姑娘，連命都不顧了！'], ['吳嬸', '瞧你這身打扮怪模怪樣的，走在村裡，旁人怕要當你是山裡下來的妖怪。'],
    ['吳嬸', '這是我家那口子年輕時的衣裳，嬸改小了些，你先換上。往後就把這兒當自己家。'], [HERO_NAME, '……謝謝嬸。'],
    () => fade(() => { f.outfit = 1; give('modern_clothes'); }), '（你換上了吳嬸給的粗布衣裳。原本的外套和背包，就收進行囊裡吧。）', () => toast('換上了古裝 · 獲得「現代衣物」'));
  if (!f.chief) return talk([...lines, ['吳嬸', '村長陳伯安在村中古井那兒，你先去見見他吧。']]);
  if (!S.specs.herbal) {
    lines.push(['吳嬸', '要出遠門，身上可得帶著藥。來，嬸教你認草。'], ['吳嬸', '葉子邊上有細鋸齒、折開會滲出紅汁的，就是止血草。官道兩旁到處都有。'],
      ['吳嬸', '過了山溪，林邊濕地還長著開藍色小鈴花的延龍草，嚼上一株，精神就回來了。'],
      ['吳嬸', '採回來三株，搗爛了熬成膏，就是金創藥，比生嚼草葉管用多了。'],
      () => [learnSpec('gather', 'herbal'), learnSpec('medic', 'pharma'), () => toast('習得「採藥」「製藥」 · 選單 → 狀態 → 技能')]);
  }
  if (!f.charm) {
    lines.push(['吳嬸', '……陳伯安都跟我說了，你要往雲山去？'], ['吳嬸', '我家老吳這條命是你撿回來的。這是嬸去廟裡求來的平安符，你帶在身上。'],
      () => { f.charm = 1; give('charm'); if (!S.equip.acc) { take('charm'); S.equip.acc = 'charm'; } toast('獲得「平安符」，已裝備'); });
  }
  lines.push(['吳嬸', '累了就回來歇歇，嬸給你煮碗熱湯。'], () => { healAll(); toast('氣血、精力完全恢復'); }, '（熱湯下肚，渾身都暖了起來。）');
  talk(lines);
}
function talkInn() {
  talk([['店小二', '客官裡邊請！住店一晚二十文，熱水熱飯都有。'], { name: '店小二', q: '客官要些什麼？', choices: [
    ['住宿一晚（20 文）', () => {
      if (S.gold < 20) return [['店小二', '這……客官，小店也是小本生意啊。']];
      S.gold -= 20;
      return [() => sleep(), '（一夜好眠，醒來時天已濛濛亮。）', ['店小二', '客官早！昨夜睡得可好？']];
    }],
    ['買些藥草乾糧', () => { openShop('清河客棧', '店小二', ['herb', 'tea']); }],
    ['打聽消息', () => [RUMORS[(F().rumor = ((F().rumor || 0) + 1)) % RUMORS.length]]],
    ['離開', () => [['店小二', '客官慢走，有空常來！']]],
  ] }]);
}
function sleep() {
  fade(() => { S.time = 6 * 60; S.day++; healAll(); villageDaily(); });
}
function talkSmith() {
  if (isNight()) return talk([['韓鐵山', '（打著呵欠）爐子都封了，明兒個天亮再來吧。']]);
  const lines = F().smith ? [['韓鐵山', '又來啦？看看有什麼合用的。']]
    : [['韓鐵山', '喲，你就是老吳撿回來的那個外鄉小子？聽說你要出遠門？'], ['韓鐵山', '外頭世道亂，沒把好兵器可不成。來，挑挑看！']];
  F().smith = 1;
  talk([...lines, () => openShop('鐵峰武器鋪', '韓鐵山', ['wsword', 'isword', 'spear', 'qsword'])]);
}
function talkArmor() {
  if (isNight()) return talk([['錦娘', '小店打烊了，少俠明日請早。']]);
  const lines = F().armor ? [['錦娘', '少俠又來了，今兒想看些什麼？']]
    : [['錦娘', '少俠，出門在外，甲冑可比勇氣可靠。'], ['錦娘', '皮甲、護腕、布靴，總有一件適合你。']];
  F().armor = 1;
  talk([...lines, () => openShop('錦甲防具行', '錦娘', ['cloth', 'leather', 'chain', 'bracer', 'boots'])]);
}
function talkElder() {
  const f = F();
  if (!f.quest) return talk([['周老伯', '唉……'], ['周老伯', '老夫昨日在河邊洗衣，把老伴留下的青玉珮給弄丟了。'], ['周老伯', '那是她留給我唯一的念想……老夫眼花，怎麼也找不著。'],
    { name: '周老伯', q: '要幫周老伯找玉珮嗎？', choices: [
      ['我幫您找找看', () => { f.quest = 1; toast('接受委託：「失落的玉珮」'); return [['周老伯', '好孩子！我記得……是在西邊河岸的蘆葦叢那一帶。']]; }],
      ['改天吧', () => [['周老伯', '唉，也是，你也有你的事要忙。']]],
    ] }]);
  if (f.quest === 1 && !has('jade')) return talk([['周老伯', '西邊河岸的蘆葦叢……你找著了嗎？']]);
  if (f.quest === 1) {
    const choices = [['收下酬金', () => [() => { take('jade'); S.gold += 120; give('herb', 2); f.quest = 2; S.heart = Math.min(100, S.heart + 5); toast('獲得 120 文、止血草 ×2 · 民心 +5'); }]]];
    // 魅力夠高，才說得出讓老人家不再推辭的話
    if (S.attrs.cha >= 10) choices.push([`婉拒酬金（魅力 ${S.attrs.cha}）`, () => [[HERO_NAME, '老伯，錢您留著。往後村裡要是有人問起我這個外鄉人，您幫我說句好話就成。'],
      ['周老伯', '……好孩子，好孩子！老夫這就去跟大夥兒說，吳家收留的是個好人！'], () => { take('jade'); f.quest = 2; addHeart(15); }]]);
    return talk([['周老伯', '這、這正是……！'], '（老人捧著玉珮，久久說不出話來。）', { name: '周老伯', q: '這點銀錢你收下，出門在外用得上。', choices }]);
  }
  talk([['周老伯', '雲山啊……老夫年輕時也去過一回。'], ['周老伯', '翻過山頭，是一片望不見盡頭的雲海，雲海底下，隱約有座古城。'], ['周老伯', '不過，那都是幾十年前的事嘍，呵呵。']]);
}
// 清河祠：第一次上香民心 +2，之後每天可以再拜一次
function visitShrine() {
  const f = F();
  if (f.shrineDay === S.day) return talk(['（香已經點過了。裊裊的煙，往山上飄去。）']);
  const first = !f.shrine;
  talk([
    '（祠堂的門檻長了青苔，香爐裡的灰早就冷了。牌位上，刻著清河村歷代先人的名字。）',
    ...(first ? [[HERO_NAME, '……連祠堂都沒人顧了啊。', 'sigh'], [HERO_NAME + '（OS）', '我不信這些，不過……入境隨俗吧。', 'smile']] : []),
    { name: '', q: '要上一炷香嗎？', choices: [
      ['上香', () => { f.shrineDay = S.day; if (first) { f.shrine = 1; addHeart(2); } return ['（你點了三炷香，學著村裡人的樣子拜了三拜。）', ...(first ? ['（路過的村民看見了，愣了一下，輕輕點了點頭。）'] : [])]; }],
      ['離開', () => []],
    ] },
  ]);
}
// 田頭的土地公廟：每天可以拜一次，第一次民心 +1；拜過之後當天氣血、精力恢復一些
function visitTudi() {
  const f = F();
  if (f.tudiDay === S.day) return talk(['（土地公笑瞇瞇地坐在神龕裡。香還在燒。）']);
  talk([
    '（小小的土地公廟，供桌上擺著幾顆乾癟的地瓜。看得出村裡人再窮，也捨不得斷了這一炷香。）',
    { name: '', q: '要拜一拜土地公嗎？', choices: [
      ['拜一拜', () => { const first = !f.tudi; f.tudiDay = S.day; f.tudi = 1; S.hp = Math.min(S.maxHp, S.hp + 30); S.mp = Math.min(stat.maxMp(), S.mp + 10); if (first) addHeart(1);
        return ['（你雙手合十，拜了三拜。）', [HERO_NAME + '（OS）', '保佑今年田裡多長點東西……也保佑我早點找到回家的路。', 'smile'], () => toast('心裡踏實了些 · 氣血 +30、精力 +10')]; }],
      ['離開', () => []],
    ] },
  ]);
}
function searchWell() {
  if (!F().sWell) { F().sWell = 1; return talk(['（往井裡望去……井壁的縫隙似乎卡著什麼。）', '（伸手一摸，是一枚古錢。）', () => { give('coin'); toast('獲得「開元古錢」'); }]); }
  talk(['井水清冽，映出你的面容。遠處的瓦簷倒影，隨著水波輕輕晃動。']);
}
function searchReeds() {
  if (F().quest === 1 && !has('jade')) return talk(['（撥開蘆葦，泥灘上有什麼東西在發光……）', () => { give('jade'); toast('獲得「青玉珮」'); }, '是一塊溫潤的青玉珮，背面刻著一個「蓮」字。']);
  talk(['蘆葦隨風搖曳，偶爾驚起一兩隻白鷺。']);
}
function cycle(n, list) { const l = list[n.talkIdx % list.length]; n.talkIdx++; talk(l); }
// 村長的閒聊：依主線進度給提示
function chiefChat() {
  if (!S.equip.weapon) return [['陳伯安', '先去鐵峰武器鋪挑把趁手的兵器。買了記得在選單（Esc）裡裝備上。'], ['陳伯安', '盤纏不夠的話……河畔的周老伯好像在找人幫忙。']];
  if (!F().gate) return [['陳伯安', '準備得差不多了？那就過橋去找阿武吧。']];
  return [['陳伯安', '去吧，孩子。記住，無論走到哪裡，清河村都是你的家。']];
}
const NPC_TALK = {
  chief(n) {
    const f = F();
    if (!f.chief) return talk([['陳伯安', '你就是老吳說的那位小兄弟？來得正好。'], [HERO_NAME, '老伯，請問這裡是哪裡？我一醒來就在林子裡，手機也沒訊號……'],
      ['陳伯安', '……果然。昨夜有位雲遊的道長路過村子，臨走前留下這封信，說：「不日將有異鄉人自西邊林中來，此信交予他。」'],
      '（你接過信。信封上，以硃砂畫著一道從未見過的符紋。）', ['陳伯安', '信上只寫了八個字——「雲山之南，故人待君」。'],
      ['陳伯安', '你為何會來到此地，老夫答不上來。但這位道長，或許知道。孩子，這恐怕就是天意。'],
      ['陳伯安', '出村的路不太平，近來常有野獸出沒。先去武器鋪、防具行好好準備，再到南邊橋頭找阿武。'],
      () => { f.chief = 1; give('letter'); toast('獲得「道長的信」'); }]);
    chiefMenu();
  },
  kid: (n) => cycle(n, [[['小豆', `${HERO_NAME}哥哥！聽說雲山上住著會飛的仙人，是真的嗎？`]], [['小豆', '我娘不讓我去河邊玩，說河裡有水鬼……我才不怕呢！']], [['小豆', '等我長大了，也要像你一樣出去闖蕩！']]]),
  farmer: (n) => cycle(n, [[['王嬸', '今年收成還不錯，就是山上的野豬又下來糟蹋莊稼。']], [['王嬸', '吳家兩口子心善，收留了你。出門在外，可別讓他們操心。']]]),
  fisher: (n) => cycle(n, [[['張叔', '這清河的魚啊，越到秋天越肥。']], [['張叔', '順著河往下游走三天，就是大江了。年輕時我常撐船去那兒賣魚。']], [['張叔', '噓……別嚇跑了我的魚。']]]),
  traveler: (n) => cycle(n, [[['旅人', '西邊往清河鎮的山路前幾日山崩，被落石堵死了。'], ['旅人', '我只好在這兒歇歇腳，等官府派人來清。']], [['旅人', '你們村子真是山明水秀，難怪有「清河」之名。']]]),
  storyteller: (n) => cycle(n, [
    [['說書先生', '（敲著折扇）話說三十年前，雲山守山的凌家劍客，與一位來歷不明的怪人聯手，鎮壓了山中妖靈！'], ['說書先生', '那怪人一身奇裝異服，說的話十句有九句聽不懂……鎮完妖靈便下山去了，從此音訊全無，怪哉怪哉……']],
    [['說書先生', '雲山的霧，百年不散。老朽年輕時曾在山腳見過古城的輪廓，那城牆……高得看不見頂。']],
    [['說書先生', '小子，雲山去過了嗎？老朽年輕時也想去闖一闖，可惜山高路遠，腿腳不濟嘍。']],
  ]),
  ashui: () => talk(F().quest === 2 ? [['阿水', '謝謝你幫爺爺找回玉珮！爺爺好久沒這麼高興了。']] : [['阿水', '爺爺最近老是嘆氣……你去跟他說說話吧。']]),
  guard() {
    const f = F();
    if (!f.chief) return talk([['阿武', '過了這兒就是雲山官道了。沒有村長的吩咐，我可不能放你出去。']]);
    if (!S.equip.weapon) return talk([['阿武', '赤手空拳就想出村？外頭的野狼可不跟你講道理。'], ['阿武', '先去武器鋪買把兵器，裝備好了再來。']]);
    if (!f.gate) return talk([['阿武', '……準備好了？'], ['阿武', `保重，${HERO_NAME}。等你回來，我請你喝酒！`], () => { f.gate = 1; toast('阿武讓開了道路'); }]);
    talk([['阿武', '一路順風！']]);
  },
};
function leaveVillage() {
  if (F().leftOnce) return fade(() => { switchMap('field', 960, 110, 0); toast('雲山官道'); });
  talk([{ name: '', q: '要離開清河村，踏上前往雲山的旅途嗎？', choices: [
    ['啟程', () => [() => fade(() => { F().leftOnce = 1; switchMap('field', 960, 110, 0); }, 1000),
      '你踏上南方的官道。回頭望去，清河村的炊煙在晨霧中緩緩升起。', '前方，雲山層巒疊嶂。林間的風，帶著一絲說不出的寒意。', () => toast('野外會遇到敵人 · 打不過可以逃跑')]],
    ['再準備一下', () => { player.y = WORLD.H - 90; player.dir = 1; }],
  ] }]);
}

// ---------- 對話框 ----------
const D = { open: false, queue: [], full: '', shown: 0, choices: null, sel: 0 };
function talk(items) {
  D.queue.push(...items);
  if (!D.open) { D.open = true; keys.clear(); $('dlg').classList.add('open'); step(); }
}
function step() {
  if (!D.queue.length) { D.open = false; D.choices = null; $('dlg').classList.remove('open'); $('cg').classList.remove('on'); return; }
  const it = D.queue.shift();
  if (typeof it === 'function') { const r = it(); if (Array.isArray(r)) D.queue.unshift(...r); return D.hold ? undefined : step(); }
  let name = '', text = it, mood = null;
  if (Array.isArray(it)) [name, text, mood] = it;
  else if (it && it.choices) { name = it.name; text = it.q; }
  $('dlgName').textContent = name; $('dlgName').style.display = name ? '' : 'none';
  setPortrait(name, text, mood);
  $('dlg').classList.toggle('narr', !name);
  D.full = text; D.shown = 0; D.choices = it && it.choices ? it.choices : null; D.sel = 0;
  $('dlgText').textContent = ''; $('dlgChoices').replaceChildren(); $('dlgMore').style.visibility = 'hidden';
}
function showChoices() {
  const box = $('dlgChoices'); box.replaceChildren();
  D.choices.forEach(([label], i) => {
    const b = document.createElement('button'); b.textContent = label; b.className = i === D.sel ? 'sel' : '';
    b.onclick = (e) => { e.stopPropagation(); D.sel = i; choose(); };
    b.onmouseenter = () => { D.sel = i; markChoice(); };
    box.appendChild(b);
  });
}
function markChoice() { [...$('dlgChoices').children].forEach((b, i) => b.className = i === D.sel ? 'sel' : ''); }
function choose() {
  const fn = D.choices[D.sel][1]; D.choices = null;
  const r = fn(); if (Array.isArray(r)) D.queue.unshift(...r);
  step();
}
function advance() {
  if (!D.open || D.hold) return;
  if (D.shown < D.full.length) { D.shown = D.full.length; return; }
  if (D.choices) return choose();
  step();
}
function updateDialog(dt) {
  if (!D.open || D.shown >= D.full.length) return;
  D.shown = Math.min(D.full.length, D.shown + dt * 42);
  $('dlgText').textContent = D.full.slice(0, Math.floor(D.shown));
  if (D.shown >= D.full.length) { if (D.choices) showChoices(); else $('dlgMore').style.visibility = 'visible'; }
}

// ---------- 商店 ----------
let shopOpen = false;
function openShop(title, keeper, ids) {
  shopOpen = true; keys.clear();
  $('shopTitle').textContent = title;
  const render = () => {
    $('shopGold').textContent = S.gold + ' 文';
    const list = $('shopList'); list.replaceChildren();
    for (const id of ids) {
      const it = ITEMS[id], row = document.createElement('div'); row.className = 'row';
      const cur = it.type !== 'use' ? ITEMS[S.equip[it.type]] : null;
      const st = it.atk ? `攻 +${it.atk}` : it.def ? `防 +${it.def}` : it.revive ? '倒下時復活' : it.heal ? `氣血 +${it.heal}` : `精力 +${it.mana}`;
      const cmp = it.type !== 'use' ? `<small>目前：${cur ? cur.name : '無'}</small>` : '';
      const own = (S.inv[id] || 0) + (Object.values(S.equip).includes(id) ? 1 : 0);
      row.innerHTML = `<div><b>${it.name}</b> <span class="st">${st}</span><p>${it.desc}</p>${cmp}</div><div class="right"><span class="price">${it.price} 文</span><small>持有 ${own}</small></div>`;
      const btn = document.createElement('button'); btn.textContent = it.type === 'use' ? '購買' : '購買並裝備';
      btn.disabled = S.gold < it.price;
      btn.onclick = () => {
        S.gold -= it.price;
        if (it.type === 'use') { give(id); toast(`購得「${it.name}」`); }
        else { if (S.equip[it.type]) give(S.equip[it.type]); S.equip[it.type] = id; if (it.type === 'acc' && S.mp > stat.maxMp()) S.mp = stat.maxMp(); toast(`購得並裝備「${it.name}」`); }
        render();
      };
      row.querySelector('.right').appendChild(btn); list.appendChild(row);
    }
  };
  render();
  $('shopKeeper').textContent = keeper + '：「看上哪件儘管說！」';
  $('shop').classList.add('open');
}
function closeShop() { shopOpen = false; $('shop').classList.remove('open'); }

// ---------- 選單 ----------
let menuOpen = false, menuTab = 'status', statusTab = 'basic';
function openMenu(tab) { menuOpen = true; keys.clear(); if (tab) menuTab = tab; renderMenu(); $('menu').classList.add('open'); }
function closeMenu() { menuOpen = false; $('menu').classList.remove('open'); }
function renderMenu() {
  for (const b of document.querySelectorAll('#menuTabs button[data-tab]')) b.classList.toggle('sel', b.dataset.tab === menuTab);
  const body = $('menuBody'); body.replaceChildren();
  const add = (html) => { const d = document.createElement('div'); d.innerHTML = html; body.appendChild(d); return d; };
  if (menuTab === 'status') {
    const bar = (label, v, m, c) => `<div class="gline"><label>${label}</label><span>${v} / ${m}</span></div><div class="bar"><i style="width:${Math.min(100, Math.round(v / m * 100))}%;background:${c}"></i></div>`;
    const maxLv = S.lv >= NEXT_EXP.length, expMax = maxLv ? S.exp : NEXT_EXP[S.lv];
    add(`<div class="status"><div class="portrait"${modernLook() ? ' style="background-image:url(assets/characters/hero_face_modern.png)"' : ''}></div><div class="who"><h3>${HERO_NAME}</h3>
      <p><span class="lv">Lv. ${S.lv}</span> 平民 · 異世旅人</p><p class="muted">所屬：清河村<br>稱號：${fameTitle()}</p></div></div>
      ${bar('氣血 HP', S.hp, S.maxHp, '#c4524a')}${bar('精力 SP', S.mp, stat.maxMp(), '#3f8fb0')}${bar('經驗 EXP', S.exp, expMax, '#b89a4a')}`);
    const tabs = add('<div class="subtabs"></div>').firstChild;
    for (const [k, label] of [['basic', '基本'], ['battle', '戰鬥'], ['skill', '技能'], ['identity', '身份']]) {
      const b = document.createElement('button'); b.textContent = label; b.className = statusTab === k ? 'sel' : '';
      b.onclick = () => { statusTab = k; renderMenu(); }; tabs.appendChild(b);
    }
    const rows = (list) => add(`<div class="kv">${list.map(([k, v, note]) => `<div><span>${k}${note ? `<small>${note}</small>` : ''}</span><b>${v}</b></div>`).join('')}</div>`);
    if (statusTab === 'basic') {
      rows(ATTRS.map((t) => [`${t.name} ${t.en}`, S.attrs[t.id], t.desc]));
      const q = objective();
      add(`<h4>主線</h4><p>${q[0]}</p><h4>委託</h4><p>${F().quest === 1 ? '失落的玉珮 — 到西邊河岸蘆葦叢尋找周老伯的玉珮' + (has('jade') ? '（已找到，回去交給周老伯）' : '') : F().quest === 2 ? '失落的玉珮 — 已完成' : '暫無'}</p>`);
    } else if (statusTab === 'battle') {
      const eq = (slot) => (ITEMS[S.equip[slot]] ? ITEMS[S.equip[slot]].name : '（無）');
      rows([['攻擊', stat.atk(), '力量 + 武器'], ['防禦', stat.def(), '體質 ÷ 2 + 防具、飾品'], ['速度', S.spd, '敏捷'], ['閃避率', Math.round(stat.dodge() * 100) + '%', '敏捷'],
        ['武器', eq('weapon')], ['防具', eq('armor')], ['飾品', eq('acc')]]);
    } else if (statusTab === 'skill') {
      add('<h4>戰鬥技能</h4>');
      if (!learned().length) add('<p class="muted">尚未領悟任何仙術。</p>');
      for (const id of learned()) {
        const k = SKILLS[id], d = add(`<div class="row"><div><b>${k.name}</b> <small>精力 ${k.mp}</small><p>${k.desc}</p></div><div class="right"></div></div>`);
        if (!k.heal) continue;
        const b = document.createElement('button'); b.textContent = '施展'; b.disabled = S.mp < k.mp || S.hp >= S.maxHp;
        b.onclick = () => { S.mp -= k.mp; S.hp = Math.min(S.maxHp, S.hp + k.heal + S.lv * 6); toast(`施展「${k.name}」`); renderMenu(); };
        d.querySelector('.right').appendChild(b);
      }
      add('<h4>生活技能</h4>');
      const attrName = (id) => ATTRS.find((t) => t.id === id).name;
      for (const c of LIFE_SKILLS) {
        const lv = lifeLv(c.id), s = S.life[c.id];
        const specs = Object.entries(c.specs).map(([id, n]) => `<i class="${S.specs[id] ? 'on' : ''}">${n}</i>`).join('');
        const prog = !lv ? '' : lv >= LIFE_EXP.length ? '<small>已臻化境</small>'
          : `<div class="bar"><i style="width:${Math.round((s.exp - LIFE_EXP[lv - 1]) / (LIFE_EXP[lv] - LIFE_EXP[lv - 1]) * 100)}%;background:#7aa05a"></i></div>`;
        const d = add(`<div class="life${lv ? '' : ' off'}"><div class="lhead"><b>${c.name}</b><span>${lv ? 'Lv ' + lv : '未入門'}</span><small>主屬性：${attrName(c.attr)}</small></div>${prog}<div class="specs">${specs}</div></div>`);
        for (const [id, r] of Object.entries(RECIPES)) {
          if (r.skill !== c.id || !S.specs[r.spec]) continue;
          const need = Object.entries(recipeNeed(r)).map(([it, n]) => `${ITEMS[it].name} ${S.inv[it] || 0}/${n}`).join('、');
          const row = document.createElement('div'); row.className = 'recipe';
          row.innerHTML = `<span>${r.name}<small>${need} · 成功率 ${Math.round(craftRate(r) * 100)}%</small></span>`;
          const b = document.createElement('button'); b.textContent = '製作'; b.disabled = !canCraft(r);
          b.onclick = () => { craft(id); renderMenu(); };
          row.appendChild(b); d.firstChild.appendChild(row);
        }
      }
    } else {
      rows([['身份', '平民'], ['官職', '無'], ['江湖聲望', S.fame], ['清河村民心', `${S.heart} / 100`], ['所屬勢力', '無'],
        ['個人財產', S.gold + ' 文'], ['住處', F().wang_house_repaired ? '王宅' : F().ch02_chief ? '王宅（待修繕）' : '無'], ['日期', `第 ${S.day} 日 · ${shichen(S.time)}`]]);
    }
  } else if (menuTab === 'quest') renderQuestTab(add);
  else if (menuTab === 'log') renderLogTab(add);
  else if (menuTab === 'items') {
    const ids = Object.keys(S.inv).filter((id) => ['use', 'mat', 'key'].includes(ITEMS[id].type));
    if (!ids.length) add('<p class="muted">行囊空空如也。</p>');
    for (const id of ids) {
      const it = ITEMS[id], d = add(`<div class="row"><div><b>${it.name}</b> ×${S.inv[id]}<p>${it.desc}</p></div><div class="right"></div></div>`);
      if (it.type === 'use') {
        const b = document.createElement('button'); b.textContent = '使用';
        b.onclick = () => {
          if (it.heal) S.hp = Math.min(S.maxHp, S.hp + it.heal);
          if (it.mana) S.mp = Math.min(stat.maxMp(), S.mp + it.mana);
          take(id); toast(`使用了「${it.name}」`); renderMenu();
        };
        d.querySelector('.right').appendChild(b);
      } else if (id === 'phone') {
        const b = document.createElement('button'); b.textContent = `查看（${phoneBatt()}%）`; b.onclick = usePhone;
        d.querySelector('.right').appendChild(b);
      } else d.querySelector('.right').innerHTML = `<small>${it.type === 'mat' ? '材料' : '重要物品'}</small>`;
    }
  } else if (menuTab === 'equip') {
    for (const slot of ['weapon', 'armor', 'acc']) {
      const cur = ITEMS[S.equip[slot]];
      const d = add(`<h4>${SLOT_NAMES[slot]}：${cur ? cur.name : '（無）'}</h4><div class="chips"></div>`);
      const chips = d.querySelector('.chips');
      if (cur) { const b = document.createElement('button'); b.textContent = '卸下'; b.onclick = () => { give(S.equip[slot]); S.equip[slot] = null; S.mp = Math.min(S.mp, stat.maxMp()); renderMenu(); }; chips.appendChild(b); }
      for (const id of Object.keys(S.inv).filter((i) => ITEMS[i].type === slot)) {
        const it = ITEMS[id], b = document.createElement('button');
        b.textContent = `裝備 ${it.name}（${it.atk ? '攻+' + it.atk : '防+' + it.def}）`;
        b.onclick = () => { take(id); if (S.equip[slot]) give(S.equip[slot]); S.equip[slot] = id; renderMenu(); };
        chips.appendChild(b);
      }
    }
  } else if (menuTab === 'system') {
    const d = add('<div class="chips"></div><p class="muted" id="sysMsg"></p>');
    const btn = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; d.firstChild.appendChild(b); };
    for (let n = 1; n <= SAVE_SLOTS; n++) {
      const m = readSlot(n), row = add(`<div class="row"><div><b>存檔 ${n}</b>${n === curSlot ? ' <small>（目前）</small>' : ''}<p>${m ? slotText(m) : '（空）'}</p></div><div class="right"></div></div>`);
      const r = row.querySelector('.right'), b1 = document.createElement('button'), b2 = document.createElement('button');
      b1.textContent = '存檔'; b1.onclick = () => { const ok = saveGame(n); renderMenu(); $('sysMsg').textContent = ok ? `已存到第 ${n} 格。` : '無法存檔（瀏覽器不允許本機儲存）。'; };
      b2.textContent = '讀檔'; b2.disabled = !m || !!m.bad;
      b2.onclick = () => { if (loadGame(n)) { closeMenu(); toast(`讀取存檔 ${n}`); } else $('sysMsg').textContent = '讀檔失敗。'; };
      r.append(b1, b2);
    }
    btn(Music.on ? '音樂：開' : '音樂：關', () => { Music.toggle(); renderMenu(); });
    btn('回到標題', () => { closeMenu(); showTitle(); });
  }
}

// ---------- 存讀檔 ----------
// 3 格存檔：{ version, savedAt, chapter, map, area, day, state }；舊版單一存檔視為第 1 格
function saveGame(n = curSlot) {
  try {
    S.x = player.x; S.y = player.y; S.dir = player.dir; curSlot = n;
    localStorage.setItem(SLOT_KEY(n), JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), chapter: S.story.chapter, map: S.map, area: areaName(player.x, player.y), day: S.day, state: S }));
    return true;
  } catch { return false; }
}
function readSlot(n) {
  try {
    const raw = localStorage.getItem(SLOT_KEY(n)) || (n === 1 && localStorage.getItem(SAVE_KEY));
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d.version) return { version: 1, savedAt: 0, chapter: null, map: d.map, day: d.day, state: d };
    if (d.version > SAVE_VERSION) return { ...d, bad: '存檔版本較新，與目前遊戲不相容' };
    return d;
  } catch { return { bad: '存檔損毀，無法讀取' }; }
}
function slotText(m) {
  if (m.bad) return m.bad;
  const c = m.chapter && CHAPTERS[m.chapter];
  return `${c ? `第 ${c.no} 章 ${c.title}` : '舊版存檔'} · ${m.area || ''} · 第 ${m.day} 日${m.savedAt ? ' · ' + new Date(m.savedAt).toLocaleString() : ''}`;
}
function latestSlot() {
  let best = 0, bt = -1;
  for (let n = 1; n <= SAVE_SLOTS; n++) { const m = readSlot(n); if (m && !m.bad && m.savedAt > bt) { bt = m.savedAt; best = n; } }
  return best;
}
function hasSave() { return latestSlot() > 0; }
function loadGame(n = latestSlot()) {
  try {
    const m = n && readSlot(n); if (!m || m.bad) return false;
    const saved = m.state;
    // 舊版存檔：拜見過村長就已換上古裝
    if (!saved.story && saved.flags && saved.flags.chief && saved.flags.outfit === undefined) saved.flags.outfit = 1;
    if (!saved.story) saved.story = migrateStory(saved);
    // 清河村往北加大：版本 3 加大了 400，版本 4 再加到 VN（700）；舊存檔站在村子裡的位置跟著往下移
    if ((m.version || 1) < 4 && (saved.map || 'village') === 'village') saved.y += (m.version || 1) < 3 ? VN : VN - 400;
    S = Object.assign(newState(), saved);
    S.story = Object.assign(newStory(), saved.story); upgradeStory(S.story);
    curSlot = n; prone = null;
    // 舊存檔沒有基本屬性：依等級補上
    if (!saved.attrs) S.attrs = attrsAt(S.lv);
    if (saved.tp === undefined) S.tp = S.lv;
    S.village = Object.assign(newVillage(), saved.village || {});
    applyVillageBuilds(MAPS.village); applyWang(MAPS.village);
    deriveStats(S); S.hp = Math.min(S.hp, S.maxHp); S.mp = Math.min(S.mp, stat.maxMp());
    switchMap(S.map || 'village', S.x, S.y, S.dir); return true;
  } catch (e) { console.error(e); return false; }
}
function placePlayer() { player.x = S.x; player.y = S.y; player.dir = S.dir; player.frame = 0; }

// ---------- 介面輔助 ----------
function isModal() { return D.open || shopOpen || menuOpen || treeOpen || fading || gathering || T.on || !started || B.on; }
function toast(s) { $('toast').textContent = s; $('toast').classList.add('show'); toastUntil = performance.now() + 2600; }
function fade(mid, hold = 700) {
  fading = true; const f = $('fade'); f.classList.add('on');
  setTimeout(() => { mid(); setTimeout(() => { f.classList.remove('on'); setTimeout(() => fading = false, 600); }, hold); }, 650);
}
function areaName(x, y) {
  if (G.interior) return G.name;
  if (G.id === 'yunshan') {
    if (Math.hypot(x - Y_SHRINE.x, y - Y_SHRINE.y) < 200) return '霧婆茶棚';
    if (Math.hypot(x - Y_STATION.x, y - Y_STATION.y) < 200) return '廢棄驛站';
    if (Math.hypot(x - Y_PAVILION.x, y - Y_PAVILION.y) < 200) return '問心亭';
    if (Math.hypot(x - Y_BOSS.x, y - Y_BOSS.y) < 220) return '雲山絕頂';
    if (y < 400) return '雲山山道（入口）';
    if (y > 2200) return '雲山深處';
    return '雲山山道';
  }
  if (G.id === 'forest') return Math.hypot(x - FO_MINE.x, y - FO_MINE.y) < 220 ? '舊礦坑' : '村外森林';
  if (G.id === 'wildwood') return '村西野林';
  if (G.id === 'mine') return y < 330 ? '礦坑深處' : x > 860 ? '東礦室' : x < 420 ? '西礦室' : '礦山隧道';
  if (G.id === 'field') {
    if (Math.hypot(x - F_SHRINE.x, y - F_SHRINE.y) < 220) return '土地廟';
    if (Math.abs(y - creekY(x)) < 120) return '山溪';
    if (y > 1950) return '黑風坡';
    if (y < 300) return '官道入口';
    return '雲山官道';
  }
  for (const b of G.buildings) if (Math.hypot(x - b.doorX, y - b.doorY) < 150) return b.name;
  if (Math.abs(y - riverY(x)) < 170) return '清河畔';
  if (y > GATE.y - 20) return '雲山官道';
  if (((x - PLAZA.x) / PLAZA.rx) ** 2 + ((y - PLAZA.y) / PLAZA.ry) ** 2 < 1.3) return '村中廣場';
  if (x > FIELD.x0 - 60 && y > FIELD.y0 - 60) return '南田';
  if (x < 260) return '西村口';
  return '清河村';
}

// ---------- 時間與光影 ----------
// 行動花費遊戲時間（分鐘）；跨過午夜就換日並做每日結算
function passTime(min) {
  S.time += min;
  while (S.time >= 1440) { S.time -= 1440; S.day++; applyGather(G); villageDaily(); }
  if (G.id === 'village') refreshNpcs();
}
const hourNow = () => (S.time / 60) % 24;
const isNight = () => hourNow() >= 20 || hourNow() < 5;
const timeText = (min) => (min >= 60 ? (min % 60 ? `${Math.floor(min / 60)} 小時 ${min % 60} 分` : `${min / 60} 小時`) : `${min} 分鐘`);
function darkness(m) {
  const h = (m / 60) % 24;
  if (h < 4.5 || h >= 20.5) return 1;
  if (h < 6.5) return 1 - (h - 4.5) / 2;
  if (h >= 17.5) return (h - 17.5) / 3;
  return 0;
}

// ---------- 更新 ----------
function update(dt, t) {
  updateDialog(dt);
  if (B.on) { updateBattle(dt); return; }
  if (!started) return;
  for (const f of worldFx) f.t += dt;
  if (!isModal() || D.open) storyAmbient(dt);
  if (prone) prone.t += dt;
  if (!isModal()) updatePhone(dt);
  worldFx = worldFx.filter((f) => f.t < f.dur);
  if (gathering && !D.open) updateGather(dt);
  if (T.on) { if (!D.open) updateTactics(dt); return; }
  if (!isModal()) S.time += dt * 1.0;
  if (S.time >= 1440) { S.time -= 1440; S.day++; applyGather(G); villageDaily(); }
  // 入夜、天亮時村民回家或出門
  if (G.id === 'village' && npcs.length !== shownNpcs().length) refreshNpcs();
  // 玩家
  if (!isModal()) {
    const dx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0), dy = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
    const spd = 150 * (keys.has('run') ? 1.65 : 1) * (S.equip.acc === 'boots' ? 1.08 : 1) * (1 + treeFx('move'));
    const ox = player.x, oy = player.y;
    moveActor(player, dx, dy, spd, dt);
    if (storyTriggers()) { /* 劇情事件優先 */ }
    else if (G.id === 'field') fieldTriggers(Math.hypot(player.x - ox, player.y - oy));
    else if (G.id === 'yunshan') yunTriggers();
    else if (G.id === 'forest') forestTriggers();
    else if (G.id === 'wildwood') wildTriggers();
    else if (G.id === 'mine') mineTriggers();
    else if (G.interior) { if (player.y > G.H - 26 && Math.abs(player.x - G.door) < 36) leaveRoom(); }
    // 走進門口（按住「上」）即進屋
    // 王宅：第 2 章老吳送到門口之後才能進去（修好之前屋裡漏雨、床腳歪斜）
    else if (doorAhead() && (doorAhead().id !== 'river' || F().ch02_wu_left || F().wang_house_repaired)) enterRoom(doorAhead().id);
    // 南橋頭守衛
    else if (!F().gate && player.y > GATE.y + 4 && Math.abs(player.x - GATE.x) < 100) {
      player.y = GATE.y - 18; player.dir = 1; keys.clear();
      const g = npcs.find((n) => n.id === 'guard'); face(g); NPC_TALK.guard(g);
    }
    if (G.id === 'village' && player.y > WORLD.H - 40) { keys.clear(); leaveVillage(); }
    if (G.id === 'village') raidCheck();
    // 西村口落石旁的小徑通往村西野林（再往西才是村外森林）
    if (G.id === 'village' && player.x < 175 && Math.abs(player.y - 800 - VN) < 70) { keys.clear(); fade(() => { switchMap('wildwood', WWW - 60, WW_EAST.y, 2); toast('村西野林'); }); }
  } else if (!updateScripted(dt)) { player.moving = false; player.frame = 0; }
  if ((G.id === 'field' || G.id === 'yunshan') && !isModal()) updateMonsters(dt);
  if ((G.id === 'field' || G.id === 'yunshan') && npcs.length !== shownNpcs().length) refreshNpcs();
  // NPC 閒逛
  for (const n of npcs) {
    if (!n.wander || isModal()) { if (!n.moving) n.frame = 0; continue; }
    if (n.target) {
      const dx = n.target[0] - n.x, dy = n.target[1] - n.y, dist = Math.hypot(dx, dy);
      // 卡住判定：距離目標沒有縮短（貼著障礙物滑動也算卡住），0.6 秒就放棄換方向
      if (dist < 6 || n.stuck > 0.6) { n.target = null; n.wait = n.stuck > 0.6 ? 0.3 : 0.8 + Math.random() * 2.2; moveActor(n, 0, 0, 0, dt); }
      else {
        moveActor(n, dx, dy, n.speed, dt);
        const nd = Math.hypot(n.target[0] - n.x, n.target[1] - n.y);
        n.stuck = nd < dist - n.speed * dt * 0.5 ? 0 : (n.stuck || 0) + dt;
      }
    } else if ((n.wait -= dt) <= 0) {
      // 只挑空地當目標，且中途不能有障礙
      for (let tries = 0; tries < 8; tries++) {
        const a = Math.random() * Math.PI * 2, r = n.wander * (0.3 + Math.random() * 0.7);
        const tx = n.home[0] + Math.cos(a) * r, ty = n.home[1] + Math.sin(a) * r * 0.7;
        let clear = true;
        for (let s = 1; s <= 6 && clear; s++) clear = !blocked(n.x + (tx - n.x) * s / 6, n.y + (ty - n.y) * s / 6, n);
        if (clear) { n.target = [tx, ty]; n.stuck = 0; break; }
      }
      if (!n.target) n.wait = 0.5;
    }
  }
  // 落葉與螢火
  if (!G.interior && !G.cave && leaves.length < 26 && Math.random() < dt * 6) leaves.push({ x: Math.random() * VW * 1.2 - 100, y: -10, vx: 20 + Math.random() * 25, vy: 25 + Math.random() * 25, p: Math.random() * 6, c: ['#d89a2a', '#c4621e', '#e8c050', '#9a7a2a'][(Math.random() * 4) | 0] });
  for (const l of leaves) { l.p += dt * 3; l.x += (l.vx + Math.sin(l.p) * 30) * dt; l.y += l.vy * dt; }
  for (let i = leaves.length - 1; i >= 0; i--) if (leaves[i].y > VH + 10) leaves.splice(i, 1);
  const dark = darkness(S.time);
  if (!G.interior && !G.cave && dark > 0.4 && fireflies.length < 40 && Math.random() < dt * 8) {
    const x = cam.x + Math.random() * VW; fireflies.push({ x, y: (G.id === 'field' || G.id === 'yunshan' || G.id === 'forest' || G.id === 'wildwood') ? cam.y + Math.random() * VH : riverY(x) - RIVER_HW - 20 - Math.random() * 120, p: Math.random() * 6, life: 4 + Math.random() * 4 });
  }
  for (const f of fireflies) { f.p += dt; f.life -= dt; f.x += Math.sin(f.p * 1.3) * 12 * dt; f.y += Math.cos(f.p * 0.9) * 10 * dt; }
  for (let i = fireflies.length - 1; i >= 0; i--) if (fireflies[i].life <= 0) fireflies.splice(i, 1);
}

function fieldTriggers(moved) {
  if (player.y < 40) { keys.clear(); return fade(() => { switchMap('village', 1300, WORLD.H - 80, 1); toast('清河村'); }); }
  if (player.y > FH - 40) { keys.clear(); return fieldEnding(); }
  if (!F().boss && player.y > 2040) { player.y = 2030; keys.clear(); return bossEvent(); }
}

// ---------- 繪製 ----------
function drawActor(a) {
  const x = Math.round(a.x - cam.x), y = Math.round(a.y - cam.y), sz = Math.round(64 * a.scale), fw = cellOf(a.sheet, a.fw || CHAR_FW);
  ctx.fillStyle = 'rgba(15,20,12,.38)'; ctx.beginPath(); ctx.ellipse(x, y, 12 * a.scale, 4.5 * a.scale, 0, 0, Math.PI * 2); ctx.fill();
  smoothFor(a.sheet); // 點陣人物不做平滑縮放，避免糊掉（高解析度主角圖除外）
  // a.pose：單列動作圖的某一格（每格 86，腳底對齊行走圖）；flip 左右翻轉
  if (a.pose && a.pose.img) {
    const p = a.pose; ctx.save(); ctx.translate(x, 0); if (p.flip) ctx.scale(-1, 1);
    const pc = cellOf(p.img, 86); smoothFor(p.img);
    ctx.drawImage(p.img, p.fr * pc, 0, pc, pc, -sz / 2, y - Math.round(FOOT * a.scale), sz, sz); ctx.restore(); ctx.imageSmoothingEnabled = false; return;
  }
  // a.sit：坐在地上，身體壓矮、略為變寬，腳底位置不動
  if (a.sit) { const h = sz * 0.74, w = sz * 1.06; ctx.drawImage(a.sheet, a.frame * fw, a.dir * fw, fw, fw, Math.round(x - w / 2), Math.round(y - FOOT * a.scale * 0.74), w, h); }
  else ctx.drawImage(a.sheet, a.frame * fw, a.dir * fw, fw, fw, Math.round(x - sz / 2), y - Math.round(FOOT * a.scale), sz, sz);
  ctx.imageSmoothingEnabled = false;
}
// 採集時改用拔草動作圖（assets/characters/hero_gather.png），依進度播放 8 格
function drawPlayer() {
  if (prone && proneImg) return drawProne(performance.now());
  // 單列動作圖（張望 hero_look、跌坐 hero_sit；ch01.js playPose）
  if (lookFr !== null && poseImg) { player.sheet = poseImg; player.frame = lookFr; player.dir = 0; return drawActor(player); }
  // 穿現代裝、面朝下站著不動時，循環播放待機動作（hero_idle.png，單列 8 格）
  if (heroIdleImg && modernLook() && !player.moving && !gathering && player.dir === 0) {
    player.pose = { img: heroIdleImg, fr: Math.floor(performance.now() / 220) % 8 }; drawActor(player); player.pose = null; return;
  }
  player.sheet = player.moving && (keys.has('run') || player.scriptRun) && !modernLook() && heroRunImg ? heroRunImg : heroSheet();
  if (!gathering || !gatherImg) return drawActor(player);
  const sh = player.sheet, fr = player.frame;
  player.sheet = gatherImg; player.frame = Math.min(7, Math.floor(gathering.t / gathering.dur * 8));
  drawActor(player); player.sheet = sh; player.frame = fr;
}
function render(t) {
  if (B.on) return renderBattle(t);
  if (camFocus && performance.now() > camFocus.until) camFocus = null;
  // camFocus.pan：從主角位置平移過去（秒），沒有就直接切過去
  const cp = camFocus && camFocus.pan ? Math.min(1, (performance.now() - camFocus.start) / (camFocus.pan * 1000)) : 1, ce = cp * cp * (3 - 2 * cp);
  const fx = T.on ? T.cx : camFocus ? player.x + (camFocus.x - player.x) * ce : started ? player.x : 1250 + Math.sin(t / 14000) * 700, fy = T.on ? T.cy : camFocus ? player.y - 40 + (camFocus.y - player.y + 40) * ce : started ? player.y - 40 : 760 + VN + Math.cos(t / 19000) * 380;
  if (G.interior) {
    cam.x = Math.round(G.W < VW ? (G.W - VW) / 2 : Math.max(0, Math.min(G.W - VW, fx - VW / 2)));
    cam.y = Math.round(G.H < VH ? (G.H - VH) / 2 : Math.max(0, Math.min(G.H - VH, fy - VH / 2)));
    ctx.fillStyle = '#07090a'; ctx.fillRect(0, 0, VW, VH); ctx.drawImage(G.ground, -cam.x, -cam.y);
  } else {
    cam.x = Math.round(Math.max(0, Math.min(G.W - VW, fx - VW / 2)));
    cam.y = Math.round(Math.max(0, Math.min(G.H - VH, fy - VH / 2)));
    ctx.drawImage(G.ground, cam.x, cam.y, VW, VH, 0, 0, VW, VH);
  }
  drawStoryDecals();
  // 水面點綴：波紋淡入淡出、落葉順流漂動（橋下不畫）
  const wf = G.waterFx;
  if (wf) {
    for (const r of wf.ripples) {
      const x = r.x - cam.x, y = r.y - cam.y; if (x < -50 || x > VW + 50 || y < -30 || y > VH + 30) continue;
      ctx.globalAlpha = 0.35 + 0.65 * (Math.sin(t / 1000 * r.sp + r.p) + 1) / 2;
      ctx.drawImage(r.img, Math.round(x - r.img.width / 2), Math.round(y - r.img.height / 2));
    }
    ctx.globalAlpha = 1;
    for (const l of wf.leaves) {
      const wx = ((l.x + t / 1000 * l.v) % (wf.W + 80)) - 40, wy = wf.flow(wx) + l.off + Math.sin(t / 900 + l.p) * 3;
      const x = wx - cam.x, y = wy - cam.y; if (x < -30 || x > VW + 30 || y < -30 || y > VH + 30) continue;
      if (G.id === 'village' ? onBridge(wx, wy) : onFBridge(wx, wy)) continue;
      ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(l.rot + Math.sin(t / 1400 + l.p) * 0.4);
      ctx.drawImage(l.img, -l.img.width / 2, -l.img.height / 2); ctx.restore();
    }
  }
  // 水面波光
  for (const s of G.shimmers) {
    const x = s.x - cam.x, y = s.y - cam.y; if (x < -20 || x > VW + 20 || y < -10 || y > VH + 10) continue;
    const a = (Math.sin(t / 600 + s.p) + 1) / 2; if (a < 0.4) continue;
    ctx.fillStyle = `rgba(200,230,230,${(a - 0.4) * 0.8})`; ctx.fillRect(Math.round(x + Math.sin(t / 900 + s.p) * 4), Math.round(y), s.w, 2);
  }
  // 任務光點
  for (const it of interactables) if (it.spark && it.spark()) {
    const x = it.x - cam.x, y = it.y - cam.y - 6, a = (Math.sin(t / 180) + 1) / 2;
    ctx.fillStyle = `rgba(255,250,200,${0.4 + a * 0.6})`; ctx.fillRect(x - 1, y - 6 - a * 3, 2, 12 + a * 6); ctx.fillRect(x - 6 - a * 3, y - 1, 12 + a * 6, 2);
  }
  // 依 y 排序繪製
  const list = [];
  for (const s of G.sprites) {
    const l = s.x - s.ax - cam.x, tp = s.y - s.ay - cam.y;
    if (l > VW || tp > VH || l + s.img.width < 0 || tp + s.img.height < 0) continue;
    list.push(s);
  }
  for (const n of npcs) list.push(n);
  for (const m of monsters) if (!m.dead) list.push(m);
  if (!T.on) list.push(player);
  list.sort((a, b) => a.y - b.y);
  for (const s of list) {
    if (s.mon) drawMonster(s, t);
    else if (s === player) drawPlayer();
    else if (s.sheet) drawActor(s);
    else {
      ctx.drawImage(s.img, Math.round(s.x - s.ax - cam.x), Math.round(s.y - s.ay - cam.y + (s.bob ? Math.sin(t / 700) * 1.5 : 0)));
      if (s.fire) drawFire(s.x - cam.x + (s.fireOff ? s.fireOff[0] : 0), s.y - cam.y + (s.fireOff ? s.fireOff[1] : -14), t);
    }
  }
  if (T.on) drawTactics(t);
  for (const f of worldFx) f.draw(Math.min(1, f.t / f.dur));
  drawGather();
  // 被樹木遮住的怪物與主角也透出半透明身影，避免看不見
  ctx.globalAlpha = 0.55; for (const m of monsters) if (!m.dead) { const st = m.stun; m.stun = 0; drawMonster(m, t); m.stun = st; }
  if (!G.interior && !T.on) { ctx.globalAlpha = 0.4; drawPlayer(); } ctx.globalAlpha = 1;
  // 門口提示：按「上」進入
  const dn = !isModal() && doorNear();
  if (dn) {
    const x = Math.round(dn.doorX - cam.x), y = Math.round(dn.doorY - cam.y - 70 + Math.sin(t / 220) * 2);
    ctx.fillStyle = '#1a1510e6'; ctx.strokeStyle = '#e3c37c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x - 34, y - 13, 68, 24, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe3a0'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('↑ 進入', x, y);
  }
  // 互動提示
  const near = !isModal() && nearest();
  if (near) {
    const ox = near.npc ? near.npc.x : near.x, oy = near.npc ? near.npc.y - 64 * near.npc.scale - 6 : near.y - 52;
    const x = Math.round(ox - cam.x), y = Math.round(oy - cam.y + Math.sin(t / 220) * 2);
    ctx.fillStyle = '#1a1510e6'; ctx.strokeStyle = '#e3c37c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x - 13, y - 13, 26, 24, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe3a0'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('E', x, y);
  }
  // 落葉
  for (const l of leaves) { ctx.fillStyle = l.c; ctx.fillRect(Math.round(l.x), Math.round(l.y), 4, Math.sin(l.p) > 0 ? 3 : 2); }
  // 夜色與燈火
  const dark = G.cave ? 0.92 : darkness(S.time) * (G.interior ? 0.5 : 1), h = (S.time / 60) % 24;
  const dusk = Math.max(0, 1 - Math.abs(h - 18) / 1.6);
  if (dusk > 0) { ctx.fillStyle = `rgba(255,120,40,${dusk * 0.13})`; ctx.fillRect(0, 0, VW, VH); }
  if (dark > 0.01) {
    lctx.globalCompositeOperation = 'source-over'; lctx.clearRect(0, 0, VW, VH);
    lctx.fillStyle = `rgba(8,12,40,${dark * (G.id === 'village' || G.id === 'forest' || G.id === 'wildwood' ? 0.8 : 0.64)})`; lctx.fillRect(0, 0, VW, VH);
    lctx.globalCompositeOperation = 'destination-out';
    const lights = [...G.lights, { x: player.x, y: player.y - 30, r: G.cave && has('lighter') ? 140 : torchOn() ? 175 : 90 }];
    for (const L of lights) {
      const x = L.x - cam.x, y = L.y - cam.y; if (x < -L.r || x > VW + L.r || y < -L.r || y > VH + L.r) continue;
      const fl = L.c ? 1 + Math.sin(t / 130 + L.x) * 0.04 : 1;
      const gr = lctx.createRadialGradient(x, y, 0, x, y, L.r * fl);
      gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = gr; lctx.fillRect(x - L.r, y - L.r, L.r * 2, L.r * 2);
    }
    ctx.drawImage(LC, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const L of G.lights) {
      const x = L.x - cam.x, y = L.y - cam.y; if (x < -80 || x > VW + 80 || y < -80 || y > VH + 80) continue;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, 60);
      gr.addColorStop(0, `rgba(${L.c},${dark * 0.55})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.fillRect(x - 60, y - 60, 120, 120);
    }
    for (const f of fireflies) {
      const a = Math.min(1, f.life) * (0.5 + Math.sin(f.p * 4) * 0.5) * dark;
      ctx.fillStyle = `rgba(220,255,140,${a})`; ctx.fillRect(Math.round(f.x - cam.x), Math.round(f.y - cam.y), 2, 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  drawOverFx();
  // HUD
  $('hudLoc').textContent = areaName(player.x, player.y);
  $('hudTime').textContent = `第 ${S.day} 日 · ${shichen(S.time)}`;
  $('hudGold').textContent = `${S.gold} 文`;
  updateVillageHud();
  $('hudHp').style.width = (S.hp / S.maxHp * 100) + '%';
  const obj = objective(); $('hudQuest').textContent = '目標：' + obj[0];
  if (performance.now() > toastUntil) $('toast').classList.remove('show');
  mini.style.display = G.interior ? 'none' : '';
  if (!G.interior) drawMini(t, obj);
}
function drawFire(x, y, t) {
  const cols = ['#ffef9a', '#ffc24a', '#ff8a2a', '#d0461a'];
  for (let i = 0; i < 9; i++) {
    const ph = t / 90 + i * 1.7, hgt = 10 + ((Math.sin(ph) + 1) * 9) | 0, w = 4 + (i % 3) * 2;
    ctx.fillStyle = cols[(i + ((t / 120) | 0)) % 4]; ctx.fillRect(Math.round(x - 14 + i * 3.2), Math.round(y - hgt), w, hgt);
  }
}
const mini = $('mini'), mctx = mini.getContext('2d');
function drawMini(t, obj) {
  const w = mini.width, h = mini.height, k = Math.max(G.W / w, G.H / h);
  mctx.fillStyle = '#10160f'; mctx.fillRect(0, 0, w, h);
  mctx.save(); mctx.translate((w - G.W / k) / 2, (h - G.H / k) / 2);
  mctx.drawImage(G.mini, 0, 0, G.W / k, G.H / k);
  mctx.strokeStyle = '#f5e3b088'; mctx.lineWidth = 1; mctx.strokeRect(cam.x / k + 0.5, cam.y / k + 0.5, VW / k, VH / k);
  if (Math.sin(t / 250) > -0.3) { mctx.fillStyle = '#ffd36a'; mctx.beginPath(); mctx.arc(obj[1] / k, obj[2] / k, 3, 0, Math.PI * 2); mctx.fill(); }
  for (const m of monsters) if (!m.dead) { mctx.fillStyle = '#ff4030'; mctx.fillRect(m.x / k - 1.5, m.y / k - 1.5, 3, 3); }
  for (const n of npcs) { mctx.fillStyle = '#cfe6ff'; mctx.fillRect(n.x / k - 1, n.y / k - 1, 2, 2); }
  mctx.fillStyle = '#ff5a3a'; mctx.fillRect(player.x / k - 2, player.y / k - 2, 4, 4);
  mctx.restore();
}

function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
  try { update(dt, t); render(t); } catch (e) { showError(e); return; }
  requestAnimationFrame(loop);
}

// ---------- 輸入 ----------
const BIND = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right', w: 'up', s: 'down', a: 'left', d: 'right', shift: 'run' };
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen(); else $('gameBox').requestFullscreen().catch(() => toast('瀏覽器不允許全螢幕'));
}
$('btnFull').onclick = toggleFullscreen;
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
  const k = e.key.toLowerCase();
  if (k === 'f' && !e.repeat && !shopOpen && !menuOpen) { e.preventDefault(); toggleFullscreen(); return; }
  if (!started) return;
  if (B.on && !D.open) { battleKey(k, e); return; }
  if (D.open) {
    if (D.choices && D.shown >= D.full.length && (k === 'arrowup' || k === 'w' || k === 'arrowdown' || k === 's')) {
      D.sel = (D.sel + (k === 'arrowup' || k === 'w' ? -1 : 1) + D.choices.length) % D.choices.length; markChoice(); e.preventDefault(); return;
    }
    if ((k === 'e' || k === ' ' || k === 'enter') && !e.repeat) { e.preventDefault(); advance(); }
    return;
  }
  if (treeOpen) { if (k === 'escape' || k === 'k') { e.preventDefault(); closeTree(); } return; }
  if (k === 'k' && !shopOpen && !menuOpen && !fading) { e.preventDefault(); openTree(); return; }
  if (k === 'v' && !e.repeat && !shopOpen && !menuOpen && !fading) { e.preventDefault(); toggleGov(); return; }
  if (T.on) { tacticsKey(k, e); return; }
  if (k === 'escape' || k === 'm') {
    e.preventDefault();
    if (shopOpen) closeShop(); else if (menuOpen) closeMenu(); else if (!fading) openMenu();
    return;
  }
  if (BIND[k]) { e.preventDefault(); keys.add(BIND[k]); }
  if ((k === 'e' || k === ' ' || k === 'enter') && !e.repeat) { e.preventDefault(); interact(); }
});
window.addEventListener('keyup', (e) => { const k = BIND[e.key.toLowerCase()]; if (k) keys.delete(k); });
window.addEventListener('blur', () => keys.clear());
$('dlg').addEventListener('click', advance);
for (const b of document.querySelectorAll('[data-dir]')) {
  const d = b.dataset.dir;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); keys.add(d); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => keys.delete(d));
}
$('mobileAction').onclick = () => (D.open ? advance() : B.on ? confirmCmd() : interact());
$('mobileMenu').onclick = () => (menuOpen ? closeMenu() : !isModal() && openMenu());
$('shopClose').onclick = closeShop;
$('menuClose').onclick = closeMenu;
$('menuTree').onclick = () => { closeMenu(); openTree(); };
$('treeClose').onclick = closeTree;
for (const b of document.querySelectorAll('#menuTabs button[data-tab]')) b.onclick = () => { menuTab = b.dataset.tab; renderMenu(); };
$('btnMenu').onclick = () => !isModal() && openMenu();
$('btnSave').onclick = () => started && toast(saveGame() ? '已存檔' : '無法存檔');
$('btnMusic').onclick = () => Music.toggle();
$('volume').oninput = (e) => Music.setVolume(Number(e.target.value));

// ---------- 音樂：地圖播放 assets/music/village.mp3，戰鬥時改為五聲音階戰鬥曲 ----------
const PREF_KEY = 'qinghe_rpg_music';
const Music = {
  ac: null, on: false, timer: null, step: 0, note: 2, vol: 1, fadeTimer: null,
  bgm: Object.assign(new Audio('assets/music/village.mp3'), { loop: true, preload: 'auto', volume: 0 }),
  pref() { try { return localStorage.getItem(PREF_KEY) !== 'off'; } catch { return true; } },
  savePref() { try { localStorage.setItem(PREF_KEY, this.on ? 'on' : 'off'); } catch {} },
  label() { $('btnMusic').textContent = this.on ? '音樂：開' : '音樂：關'; },
  toggle() {
    // 標題畫面只切換標題音樂，進遊戲後才動地圖音樂
    if (!started) { this.on = !this.on; this.on ? TitleMusic.play(true) : TitleMusic.stop(); } else this.on ? this.stop() : this.start();
    this.savePref(); this.label();
  },
  setVolume(v) { this.vol = v; if (SceneMusic.a && !SceneMusic.timer) SceneMusic.a.volume = v; if (!TitleMusic.a.paused && !TitleMusic.timer) TitleMusic.a.volume = v; if (this.out) this.out.gain.value = 0.22 * v / 0.6; if (this.on && this.mode !== 'battle' && !this.fadeTimer) this.bgm.volume = v; },
  // 背景音樂淡入淡出
  fadeBgm(to, ms = 800, after) {
    clearInterval(this.fadeTimer);
    const from = this.bgm.volume, t0 = performance.now();
    if (to > 0 && this.bgm.paused) this.bgm.play().catch(() => {});
    this.fadeTimer = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      this.bgm.volume = Math.max(0, Math.min(1, from + (to - from) * p));
      if (p >= 1) { clearInterval(this.fadeTimer); this.fadeTimer = null; if (to === 0) this.bgm.pause(); if (after) after(); }
    }, 40);
  },
  startSynth() { clearInterval(this.timer); this.timer = setInterval(() => this.tick(), 150); },
  start() {
    this.on = true;
    if (this.mode === 'battle') this.startSynth(); else this.fadeBgm(this.vol, 1200);
    try {
      if (!this.ac) {
        this.ac = new AudioContext();
        this.out = this.ac.createGain(); this.out.gain.value = 0.22;
        const dl = this.ac.createDelay(); dl.delayTime.value = 0.32; const fb = this.ac.createGain(); fb.gain.value = 0.32;
        this.out.connect(this.ac.destination); this.out.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(this.ac.destination);
      }
      this.out.gain.value = 0.22 * this.vol / 0.6; this.ac.resume();
    } catch { /* 沒有 Web Audio 時只播背景音樂 */ }
  },
  mode: 'field',
  stop() { this.on = false; clearInterval(this.timer); this.fadeBgm(0, 500); },
  setMode(m) {
    this.mode = m; if (!this.on) return;
    if (m === 'battle') { this.fadeBgm(0, 400); this.startSynth(); }
    else { clearInterval(this.timer); this.fadeBgm(this.vol, 1500); }
  },
  pluck(f, when, vol = 0.5, dur = 1.6) {
    const ac = this.ac;
    for (const [mul, v, type] of [[1, vol, 'triangle'], [2, vol * 0.25, 'sine'], [3.01, vol * 0.08, 'sine']]) {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f * mul;
      g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(v, when + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.connect(g); g.connect(this.out); o.start(when); o.stop(when + dur + 0.05);
    }
  },
  tick() {
    const scale = [146.8, 164.8, 185.0, 220.0, 246.9, 293.7, 329.6, 370.0, 440.0, 493.9, 587.3];
    if (!this.ac) return;
    const now = this.ac.currentTime + 0.05; this.step++;
    if (this.mode === 'battle') {
      if (this.step % 4 === 1) this.pluck(scale[0] / 2, now, 0.4, 0.5);
      if (this.step % 8 === 5) this.pluck(scale[2] / 2, now, 0.3, 0.4);
      if (Math.random() < 0.7) { this.note = Math.max(2, Math.min(scale.length - 1, this.note + [-1, 1, 2, -2, 0][(Math.random() * 5) | 0])); this.pluck(scale[this.note], now, 0.28, 0.6); }
      return;
    }
    if (this.step % 16 === 1) this.pluck(scale[0] / 2, now, 0.35, 3.5);
    if (this.step % 16 === 9) this.pluck(scale[3] / 2, now, 0.25, 3);
    if (Math.random() < (this.step % 2 ? 0.35 : 0.65)) {
      this.note = Math.max(2, Math.min(scale.length - 1, this.note + [-2, -1, -1, 1, 1, 2, 0][(Math.random() * 7) | 0]));
      this.pluck(scale[this.note], now, 0.32, 1.8);
      if (Math.random() < 0.15) this.pluck(scale[this.note], now + 0.13, 0.18, 1.2);
    }
  },
};

// 標題畫面音樂：assets/music/標題.mp3。瀏覽器不准自動播放時，等玩家第一次按鍵或點擊再開始
const TitleMusic = {
  a: Object.assign(new Audio('assets/music/標題.mp3'), { loop: true, preload: 'auto', volume: 0 }),
  want: false, timer: null,
  fade(to, ms, after) {
    clearInterval(this.timer);
    const from = this.a.volume, t0 = performance.now();
    this.timer = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      this.a.volume = Math.max(0, Math.min(1, from + (to - from) * p));
      if (p >= 1) { clearInterval(this.timer); this.timer = null; if (after) after(); }
    }, 40);
  },
  play(force) {
    if (!force && !Music.pref()) return;
    this.want = true;
    this.a.play().then(() => { if (this.want) this.fade(Music.vol, 1500); }).catch(() => {});
  },
  stop() { this.want = false; this.fade(0, 800, () => this.a.pause()); },
};
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => { if (TitleMusic.want && TitleMusic.a.paused) TitleMusic.play(); }, true);

// ---------- 標題與開始 ----------
function showTitle() {
  started = false; $('title').classList.add('open'); $('gameBox').classList.add('titling');
  $('btnContinue').disabled = !hasSave();
  // 從遊戲回到標題：地圖音樂淡出，換成標題音樂
  if (!Music.bgm.paused) Music.fadeBgm(0, 600);
  Music.on = Music.pref(); Music.label(); titleOpen();
  const v = $('titleVideo'); v.muted = true; v.play().catch(() => {});
}
function initActors() {
  S = newState();
  player = makeActor({ x: S.x, y: S.y, sheet: heroImg, scale: Number($('scale').value) });
  const mk = (d) => { const art = CHAR_ART[d.art || d.id]; return makeActor({ ...d, home: [d.x, d.y], ...(art && art.walk ? { sheet: art.walk, fw: art.fw || CHAR_FW, frames: art.frames } : { sheet: tintSheet(heroImg, d.filter), fw: CHAR_FW }) }); };
  MAPS.village.npcs = NPC_DEFS.map(mk);
  for (const f of DOOR_FOLKS) {
    const b = bld(f.b); if (!b.cutout || !f.npc) continue;
    MAPS.village.npcs.push(mk({ id: 'folk_' + f.b, name: f.name, folk: f, x: b.doorX + f.npc[0], y: b.doorY + f.npc[1], dir: 0, art: f.npc[2], scale: 1.3, wander: 45, speed: 26 }));
  } MAPS.field.npcs = FIELD_NPC_DEFS.map(mk);
  MAPS.yunshan.npcs = YUNSHAN_NPC_DEFS.map(mk);
  MAPS.forest.npcs = FOREST_NPC_DEFS.map((d) => forestActor(d, mk));
  MAPS.mine.npcs = [];
  MAPS.wildwood.npcs = [];
  // 劇情 NPC：已有走路圖的角色可再加色調當占位（例如沈若蘭暫借吳嬸的圖）
  for (const id in ROOM_NPC_DEFS) MAPS['in_' + id].npcs = ROOM_NPC_DEFS[id].map(mk);
  // 劇情 NPC（要在室內 NPC 之後加，才不會被蓋掉）；已有走路圖的角色可再加色調當占位
  storyNpcActors((d) => { const art = CHAR_ART[d.art]; return art && art.walk && d.filter ? makeActor({ ...d, home: [d.x, d.y], sheet: tintSheet(art.walk, d.filter), fw: art.fw || CHAR_FW, frames: art.frames }) : mk(d); });
  G = MAPS.village; refreshNpcs();
}
function beginGame(load) {
  TitleMusic.stop(); $('titleVideo').pause();
  if (Music.pref()) { Music.start(); Music.label(); }
  $('title').classList.remove('open'); $('gameBox').classList.remove('titling');
  initActors();
  applyVillageBuilds(MAPS.village); applyWang(MAPS.village);
  if (load && loadGame()) { started = true; toast('讀取存檔'); return; }
  switchMap(S.map, S.x, S.y, S.dir); started = true;
  if (params.get('map')) { Object.assign(F(), { chief: 1, gate: 1, leftOnce: 1 }); S.equip.weapon = 'isword'; switchMap(params.get('map'), 960, 140); }
  if (params.get('x')) { player.x = +params.get('x'); player.y = +params.get('y'); }
  if (params.get('battle')) { if (!params.get('map')) S.equip.weapon = 'isword'; S.lv = +params.get('lv') || 1; S.attrs = attrsAt(S.lv); deriveStats(S); healAll(); startBattle(params.get('battle').split(',')); }
  if (params.get('t')) S.time = +params.get('t') * 60;
  // 開發用：?open=menu / ?open=shop 直接打開畫面
  if (params.get('open') === 'menu') { S.gold = 999; give('herb', 3); openMenu(); }
  if (params.get('open') === 'tree') openTree();
  if (params.get('open') === 'shop') openShop('鐵峰武器鋪', '韓鐵山', ['wsword', 'isword', 'spear', 'qsword']);
  if (params.has('skip')) return;
  prone = proneImg ? { mode: 'sleep', t: 0 } : null;
  // 一按新遊戲就直接是辦公室 CG（不淡入，免得先閃出森林畫面），章名疊在 CG 上
  // 辦公室那段換成開場音樂（地圖音樂先停，開場結束時 bgmResume 再接回）
  if (Music.on) { Music.fadeBgm(0, 200); SceneMusic.play('assets/music/辦公室.mp3'); }
  const cg = $('cg'); cg.style.transition = 'none'; showCg('cg/第1章_辦公室_1.png'); void cg.offsetWidth; cg.style.transition = '';
  talk([`——　第 ${CHAPTERS.ch01.no} 章｜${CHAPTERS.ch01.title}　——`, () => dialogueItems('dlg_ch01_office')]);
}
$('btnNew').onclick = () => beginGame(false);
$('btnContinue').onclick = () => beginGame(true);
$('btnHelp').onclick = () => { $('helpBox').classList.toggle('open'); };
$('scale').oninput = (e) => { const v = Number(e.target.value); $('scaleValue').textContent = v.toFixed(2) + '×'; if (player) player.scale = v; };

function showError(e) { console.error(e); $('err').textContent = '錯誤：' + (e && e.message || e); $('err').style.display = 'block'; }
window.addEventListener('error', (e) => showError(e.error || e.message));

function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('無法載入圖片：' + src)); i.src = src; });
}
async function boot() {
  try {
    const imgs = await Promise.all([...BUILDINGS.map((b) => loadImg(ASSET + b.img)), loadImg('assets/characters/hero_walk.png')]);
    await Promise.all(['水井', '石燈籠', '小船', '村口牌樓', '寶箱', '路牌_西清河鎮', '路牌_南雲山官道', '山泉', '老樹_刻字', '倒木', '荊棘與倒木', '石階/長石階', '石階/石階平台', '石階/石燈籠'].map(async (n) => { PROPS[n] = await loadImg('assets/props/' + n + '.png'); }));
    await Promise.all(MINE_ART_NAMES.map(async (n) => { MINE_ART[n] = await loadImg('assets/mine/' + n + '.png'); }));
    await Promise.all(ROCK_NAMES.map(async (n) => { ROCK_ART[n] = await loadImg('assets/mine/rocks/' + n + '.png'); }));
    await Promise.all(Object.values(GATHER_KINDS).filter((k) => k.art).map(async (k) => { HERB_ART[k.art] = await loadImg('assets/props/herbs/' + k.art + '.png'); }));
    await Promise.all(['作物_綠', '作物_金', '圍籬_橫', '圍籬_直', '稻草人', '草堆', '水桶', '木箱'].map(async (n) => { FARM[n] = await loadImg('assets/farm/' + n + '.png'); }));
    await Promise.all(EXTRA_ART.map(async (n) => { BLOOK_IMG[n] = await loadImg('assets/buildings/' + n + '.png').catch(() => null); if (BLOOK_IMG[n]) VHOUSE[n] = BLOOK_IMG[n]; }));
    await Promise.all(Object.values(BUILDING_LOOKS).flatMap((d) => d.looks).map(async (l) => { BLOOK_IMG[l.file] = await loadImg('assets/buildings/' + l.file + '.png').catch(() => null); }));
    await Promise.all([...new Set(VILLAGE_HOUSES.flatMap((h) => [h.poor, h.rich]))].map(async (n) => { VHOUSE[n] = await loadImg('assets/buildings/' + n + '.png').catch(() => null); }));
    await Promise.all(Object.keys(DECOR_META).map(async (n) => { DECOR[n] = await loadImg('assets/decor/' + n + '.png'); }));
    await Promise.all(Object.entries(DECAL_SET).map(async ([k, n]) => { DECALS[k] = await Promise.all(Array.from({ length: n }, (_, i) => loadImg(`assets/decals/${k}_${String(i + 1).padStart(2, '0')}.png`).catch(() => null))); }));
    await Promise.all(['草地', '泥土', '石板路', '河水'].map(async (n) => { TILES[n] = await loadImg('assets/tiles/' + n + '.png').catch(() => null); }));
    $('loadingText').textContent = '繪製村莊中……';
    await new Promise((r) => setTimeout(r, 30));
    heroImg = imgs.pop();
    gatherImg = await loadImg('assets/characters/hero_gather.png').then(hd3).catch(() => null);
    proneImg = await loadImg('assets/characters/hero_prone.png').then(hd3).catch(() => null);
    heroFaceModern = await loadImg('assets/characters/hero_face_modern.png').catch(() => null);
    heroFacesModern = await loadImg('assets/characters/hero_faces_modern.png').catch(() => null);
    heroModernWalk = await loadImg('assets/characters/hero_modern_walk.png').then(hd3).catch(() => null);
    heroRunImg = await loadImg('assets/characters/hero_run.png').catch(() => null);
    heroHurtImg = await loadImg('assets/characters/hero_hurt.png').catch(() => null);
    heroLookImg = await loadImg('assets/characters/hero_look.png').then(hd3).catch(() => null);
    heroSitImg = await loadImg('assets/characters/hero_sit.png').catch(() => null);
    heroDustImg = await loadImg('assets/characters/hero_dust.png').then(hd3).catch(() => null);
    heroPackImg = await loadImg('assets/characters/hero_pack.png').then(hd3).catch(() => null);
    heroIdleImg = await loadImg('assets/characters/hero_idle.png').then(hd3).catch(() => null);
    heroMineImg = await loadImg('assets/characters/hero_mine.png').then(hd3).catch(() => null);
    // 載入正式角色素材；缺檔就略過
    await Promise.all(Object.entries(CHAR_ART).map(async ([id, a]) => {
      const dir = 'assets/' + (a.dir || 'characters') + '/';
      if (!a.walkOnly) a.face = await loadImg(dir + id + '_face.png').catch(() => null);
      if (!a.faceOnly) a.walk = await loadImg(dir + id + '_walk.png').catch(() => null);
    }));
    await Promise.all(Object.entries(MON_ART).map(async ([id, a]) => {
      a.walk = await loadImg(`assets/monsters/${id}_walk.png`).catch(() => null);
      a.battle = await loadImg(`assets/monsters/${id}_battle.png`).catch(() => null);
    }));
    MAPS.village = G = buildWorld(imgs);
    $('loadingText').textContent = '繪製雲山官道……';
    await new Promise((r) => setTimeout(r, 30));
    MAPS.field = buildField();
    $('loadingText').textContent = '繪製雲山中……';
    await new Promise((r) => setTimeout(r, 30));
    MAPS.yunshan = buildYunshan();
    MAPS.forest = buildForest();
    MAPS.wildwood = buildWild();
    MAPS.mine = buildMine();
    await Promise.all(Object.entries(BATTLE_BG_FILES).map(async ([id, n]) => { BATTLE_BG[id] = await loadImg('assets/battle/' + n + '.png').catch(() => null); }));
    await Promise.all(Object.values(ROOMS).filter((r) => r.bg).map(async (r) => { ROOM_BG[r.bg] = await loadImg('assets/interiors/' + r.bg + '.png').catch(() => null); }));
    Object.assign(MAPS, buildInteriors());
    $('loading').style.display = 'none';
    initActors();
    showTitle();
    if (params.has('auto')) beginGame(false);
    requestAnimationFrame(loop);
  } catch (e) { showError(e); }
}
boot();
