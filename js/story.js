'use strict';
// 劇情核心：資料驅動的對話、事件、任務、羈絆與日誌（資料在 js/story_data.js）
// 條件與效果都是受控的操作類型，由這裡顯式解析，不用 eval
// 狀態全部放在 S.story（與 S.flags），隨存檔保存
function newStory() {
  return { chapter: 'ch01', quests: {}, obj: {}, claimed: [], seen: {}, choices: {}, rel: {}, log: [] };
}
const ST = () => S.story;

// ---------- 條件 ----------
// { allFlags, anyFlags, notFlags, items: { id: n }, quests: { id: 狀態或狀態陣列 }, choice: { key: id }, gold, rel: [角色, 指標, 至少] }
function storyCond(c) {
  if (!c) return true;
  const f = F();
  if (c.allFlags && !c.allFlags.every((k) => f[k])) return false;
  if (c.anyFlags && !c.anyFlags.some((k) => f[k])) return false;
  if (c.notFlags && c.notFlags.some((k) => f[k])) return false;
  if (c.items && !Object.entries(c.items).every(([id, n]) => (S.inv[id] || 0) >= n)) return false;
  if (c.gold && S.gold < c.gold) return false;
  if (c.quests && !Object.entries(c.quests).every(([id, st]) => [].concat(st).includes(questStatus(id)))) return false;
  if (c.choice && !Object.entries(c.choice).every(([k, v]) => ST().choices[k] === v)) return false;
  if (c.rel && relOf(c.rel[0])[c.rel[1]] < c.rel[2]) return false;
  return true;
}

// ---------- 效果 ----------
// 每個效果都會留下日誌，讓玩家看得到增減的原因
const STORY_HOOKS = {};
function storyEffects(list, why) {
  for (const e of list || []) {
    const reason = e.why || why || '劇情';
    switch (e.type) {
      case 'set_flag': F()[e.key] = e.value === undefined ? 1 : e.value; break;
      case 'item':
        if (e.n > 0) give(e.id, e.n); else take(e.id, -e.n);
        storyLog(`${ITEMS[e.id].name} ${e.n > 0 ? '+' : ''}${e.n}（${reason}）`, !e.quiet); break;
      case 'gold': S.gold = Math.max(0, S.gold + e.n); storyLog(`盤纏 ${e.n > 0 ? '+' : ''}${e.n} 文（${reason}）`, !e.quiet); break;
      case 'heart': S.heart = Math.max(0, Math.min(100, S.heart + e.n)); storyLog(`清河村民心 ${e.n > 0 ? '+' : ''}${e.n}（${reason}）`, !e.quiet); setTimeout(() => applyVillageHouses(MAPS.village, true), 2800); break;
      case 'meet': relOf(e.char); break;
      case 'rel': {
        const r = relOf(e.char), name = (STORY_CHARS[e.char] || {}).name || e.char;
        r[e.stat] = Math.max(0, Math.min(100, r[e.stat] + e.n));
        storyLog(`${name}・${REL_NAMES[e.stat]} ${e.n > 0 ? '+' : ''}${e.n}（${reason}）`, !e.quiet); break;
      }
      case 'heal': healAll(); break;
      case 'quest_start': questStart(e.id); break;
      case 'chapter': chapterStart(e.id); break;
      case 'log': storyLog(e.text, e.toast); break;
      case 'hook': STORY_HOOKS[e.name](e); break;
      default: console.warn('未知的劇情效果', e);
    }
  }
  if (list && list.length && S) { refreshNpcs(); questTick(); }
}
function storyLog(text, show) {
  ST().log.unshift({ day: S.day, time: shichen(S.time), text });
  ST().log.length = Math.min(ST().log.length, 80);
  if (show) toast(text);
}

// ---------- 羈絆：信任 trust、情誼 affection、理念認同 ideology ----------
const REL_NAMES = { trust: '信任', affection: '情誼', ideology: '理念認同' };
function relOf(id) {
  return ST().rel[id] || (ST().rel[id] = { ...((STORY_CHARS[id] || {}).rel || { trust: 20, affection: 20, ideology: 20 }) });
}

// ---------- 對話 ----------
// 台詞格式：'旁白'、['說話者', '台詞']、{ speaker, text, mood, voice, cg }、{ effects: [...] }、{ branch: [...] }、
// { choice: { speaker, q, options: [{ id, label, if, effects, lines, next }] } }
// 對話本身可帶 effects（結束時套用）、next（接著播放的對話）、once（只播一次）
function playDialogue(id) { talk(dialogueItems(id)); }
function showCg(file) {
  const el = $('cg');
  if (file) el.style.backgroundImage = 'url("assets/' + file + '")';
  cgUi(null);
  el.classList.toggle('on', !!file);
}
function dialogueItems(id) {
  const d = DIALOGUES[id];
  if (!d) { console.warn('找不到對話', id); return []; }
  const items = [];
  const push = (lines) => { for (const l of lines) items.push(dialogueLine(id, l)); };
  push(d.lines);
  items.push(() => {
    ST().seen[id] = (ST().seen[id] || 0) + 1;
    storyEffects(d.effects, d.why);
    if (d.next) return dialogueItems(d.next);
  });
  return items;
}
function dialogueLine(dlgId, l) {
  if (typeof l === 'string' || Array.isArray(l)) return l;
  if (l.effects) return () => { storyEffects(l.effects, l.why); };
  // { walk: [{ who: 'player' 或 NPC id, x, y, run }] }：對話框先收起，等所有人走到定點再繼續
  if (l.walk) return () => { scriptWalk(l.walk); };
  // { branch: [[條件, [台詞…]], …] }：播到這裡時挑第一個條件成立的那組台詞（條件 null 為預設）
  if (l.branch) return () => { const b = l.branch.find(([c]) => storyCond(c)); return b ? b[1].map((x) => dialogueLine(dlgId, x)) : []; };
  // { cg: '檔名' } 淡入 assets/ 下的 CG；{ cg: null } 淡出
  if ('cg' in l) return () => { showCg(l.cg); };
  if (l.choice) {
    const c = l.choice;
    const options = c.options.filter((o) => storyCond(o.if));
    return { name: c.speaker || '', q: c.q, choices: options.map((o) => [o.label, () => {
      ST().choices[c.key || dlgId] = o.id;
      storyEffects(o.effects, o.why || '選擇');
      const after = (o.lines || []).map((x) => dialogueLine(dlgId, x));
      if (o.next) after.push(() => dialogueItems(o.next));
      return after;
    }]) };
  }
  // { speaker, text }：mood/voice/cg 可缺省；目前沒有配音、CG 檔，只顯示文字，不會卡住劇情
  return l.speaker ? [l.speaker, l.text] : l.text;
}

// ---------- 事件：走進範圍或滿足條件時自動觸發 ----------
// { id, map, area: [x, y, r], if, once, dialogue }
function storyTriggers() {
  if (isModal()) return false;
  for (const ev of STORY_EVENTS) {
    if (ev.map !== G.id || (ev.once !== false && ST().seen['ev:' + ev.id])) continue;
    if (ev.area && Math.hypot(player.x - ev.area[0], (player.y - ev.area[1]) * 1.2) > ev.area[2]) continue;
    if (!storyCond(ev.if)) continue;
    ST().seen['ev:' + ev.id] = 1; keys.clear();
    playDialogue(ev.dialogue);
    return true;
  }
  return false;
}
// 地圖上的劇情調查點：{ id, map, x, y, r, name, if, talk: [[條件, 對話 id], ...], spark }
function storyInteractables() {
  return STORY_SPOTS.filter((s) => s.map === G.id && storyCond(s.if)).map((s) => ({
    x: s.x, y: s.y, r: s.r || 55, name: s.name, spark: () => s.talk.some(([c, , hot]) => hot && storyCond(c)),
    act: () => { const t = s.talk.find(([c]) => storyCond(c)); if (t) playDialogue(t[1]); },
  }));
}
// 劇情 NPC：talk 同上，依序找第一個條件成立的對話
function storyTalk(n) {
  const t = n.story.talk.find(([c]) => storyCond(c));
  if (t) playDialogue(t[1]);
}
function storyNpcActors(mk) {
  for (const d of STORY_NPCS) {
    const a = mk({ ...d, story: d, hide: () => !storyCond(d.show) });
    MAPS[d.map].npcs.push(a);
  }
}

// ---------- 任務：未接 → 進行中 active → 完成 done → 已領獎勵 claimed ----------
const questStatus = (id) => ST().quests[id] || 'none';
function questStart(id) {
  if (ST().quests[id]) return;
  ST().quests[id] = 'active';
  storyLog(`接取任務：「${QUESTS[id].title}」`, true);
  questTick();
}
function objDone(q, i) {
  const key = q.id + ':' + i;
  if (ST().obj[key]) return true;
  const o = q.objectives[i];
  const ok = o.flag ? !!F()[o.flag] : o.item ? (S.inv[o.item] || 0) >= o.amount : false;
  // 達成過就記住：材料之後被修繕用掉，也不會倒退成未完成
  if (ok) ST().obj[key] = 1;
  return ok;
}
function questTick() {
  for (const [id, st] of Object.entries(ST().quests)) {
    if (st !== 'active') continue;
    const q = QUESTS[id];
    if (!q.objectives.every((_, i) => objDone(q, i))) continue;
    ST().quests[id] = 'done';
    storyLog(`任務完成：「${q.title}」${q.rewards && q.rewards.length ? ' · 到選單「任務」領取獎勵' : ''}`, true);
    // 後續任務在完成時就接上，不必先領獎勵，避免卡關
    for (const n of q.next || []) questStart(n);
  }
}
function questClaim(id) {
  if (questStatus(id) !== 'done' || ST().claimed.includes(id)) return;
  ST().claimed.push(id); ST().quests[id] = 'claimed';
  storyEffects(QUESTS[id].rewards, `任務「${QUESTS[id].title}」獎勵`);
}
// 目前要做的事：第一個進行中任務的第一個未完成目標
function storyObjective() {
  for (const [id, st] of Object.entries(ST().quests)) {
    if (st !== 'active' || QUESTS[id].passive) continue;
    const q = QUESTS[id], i = q.objectives.findIndex((_, k) => !objDone(q, k));
    if (i < 0) continue;
    const o = q.objectives[i], t = o.at || q.at;
    if (!t) return [o.text, player.x, player.y];
    if (t[0] === G.id) return [o.text, t[1], t[2]];
    // 目標在別張地圖：先指向出口
    const exit = STORY_EXITS[G.id + '>' + t[0]];
    return [o.text, ...(exit || [player.x, player.y])];
  }
  return null;
}

// ---------- 章節 ----------
function chapterStart(id) {
  ST().chapter = id;
  const c = CHAPTERS[id];
  storyLog(`進入第 ${c.no} 章「${c.title}」`);
  talk([`——　第 ${c.no} 章｜${c.title}　——`]);
}

// ---------- 舊存檔遷移：沒有劇情狀態的存檔，視為第 1–3 章已走完，避免卡在新劇情 ----------
function migrateStory(saved) {
  const st = newStory();
  if (saved.flags && saved.flags.ch1_wolves) {
    st.chapter = 'ch04';
    for (const id of ['q_ch01_survive', 'q_ch02_rescue', 'q_ch03_repair_wang_house']) { st.quests[id] = 'claimed'; st.claimed.push(id); }
    st.quests.q_ch04_rescue = 'active';
    Object.assign(saved.flags, { ch02_rescued: 1, ch02_entered: 1, ch02_chief: 1, wang_house_repaired: 1 });
  }
  return st;
}

// 舊版第 4 章預告任務（q_ch04_teaser）改成正式的第 4 章任務
function upgradeStory(st) {
  const f = S.flags;
  // 舊版第 2 章（見過村長就結束）：視為已熬過王宅第一夜，第 3 章的人物照常出現
  if (f.ch02_chief && !f.ch02_permit && !f.ch02_complete) Object.assign(f, { ch02_complete: 1, ch02_permit: 1, ch02_wu_left: 1, ch02_porridge: 1 });
  // 舊版第 1 章黑影事件會把手機弄到沒電；還沒救人的存檔補回 9%，第 2 章才用得了鬧鐘
  if (f.ch01_shadow && !f.ch02_rescued && !(f.phone_batt > 0)) Object.assign(f, { phone_batt: 9, phone_saver: 1, torch: 0 });
  if (st.quests.q_ch05_teaser) { delete st.quests.q_ch05_teaser; if (!st.quests.q_ch05_heal) st.quests.q_ch05_heal = 'active'; }
  if (st.quests.q_ch04_teaser) { delete st.quests.q_ch04_teaser; if (!st.quests.q_ch04_rescue) st.quests.q_ch04_rescue = 'active'; }
}

// ---------- 介面：選單「任務」「日誌」分頁 ----------
const Q_STATE = { active: '進行中', done: '已完成', claimed: '已領獎勵' };
function renderQuestTab(add) {
  const ids = Object.keys(ST().quests);
  const c = CHAPTERS[ST().chapter];
  add(`<h4>第 ${c.no} 章　${c.title}</h4>`);
  if (!ids.length) add('<p class="muted">尚未接取任何任務。</p>');
  for (const id of ids.slice().reverse()) {
    const q = QUESTS[id], st = questStatus(id);
    const objs = q.objectives.map((o, i) => {
      const ok = objDone(q, i), cnt = o.item && !ok ? ` ${Math.min(S.inv[o.item] || 0, o.amount)}/${o.amount}` : '';
      return `<li class="${ok ? 'ok' : ''}">${ok ? '✔' : '□'} ${o.text}${cnt}</li>`;
    }).join('');
    const rw = (q.rewards || []).map(rewardText).join('、');
    const d = add(`<div class="qcard q-${st}"><div class="qhead"><b>${q.title}</b><span>${Q_STATE[st]}</span></div><p>${q.desc}</p><ul>${objs}</ul>${rw ? `<small>獎勵：${rw}</small>` : ''}<div class="right"></div></div>`);
    if (st === 'done' && rw) {
      const b = document.createElement('button'); b.textContent = '領取獎勵';
      b.onclick = () => { questClaim(id); renderMenu(); };
      d.querySelector('.right').appendChild(b);
    }
  }
}
function rewardText(e) {
  if (e.type === 'item') return `${ITEMS[e.id].name} ×${e.n}`;
  if (e.type === 'gold') return `${e.n} 文`;
  if (e.type === 'heart') return `民心 +${e.n}`;
  if (e.type === 'rel') return `${STORY_CHARS[e.char].name}${REL_NAMES[e.stat]} +${e.n}`;
  return e.label || '';
}
function renderLogTab(add) {
  add('<h4>羈絆</h4>');
  const met = Object.keys(STORY_CHARS).filter((id) => ST().rel[id]);
  if (!met.length) add('<p class="muted">還沒有結識什麼人。</p>');
  for (const id of met) {
    const r = relOf(id), bar = (k, c) => `<div class="gline"><label>${REL_NAMES[k]}</label><span>${r[k]}</span></div><div class="bar"><i style="width:${r[k]}%;background:${c}"></i></div>`;
    add(`<div class="rel"><b>${STORY_CHARS[id].name}</b><small>${STORY_CHARS[id].desc}</small>${bar('trust', '#5a8ac0')}${bar('affection', '#c0607a')}${bar('ideology', '#b89a4a')}</div>`);
  }
  add('<h4>日誌</h4>');
  if (!ST().log.length) add('<p class="muted">尚無紀錄。</p>');
  add(`<ul class="log">${ST().log.map((l) => `<li><small>第 ${l.day} 日 ${l.time}</small>${l.text}</li>`).join('')}</ul>`);
}

// ---------- 劇情掛勾：需要動到畫面或其他系統的效果 ----------
Object.assign(STORY_HOOKS, {
  // 開場趴地醒來的動畫（forest.js 的 prone）
  proneWake: () => { prone = proneImg ? { mode: 'wake', t: 0 } : null; },
  proneDazed: () => { if (prone) prone.mode = 'dazed'; },
  proneUp: () => { prone = null; player.dir = 0; },
  // 戰鬥：必須是對話的最後一步；勝利後接 win 對話
  battle: (e) => startBattle(e.group, { tutorial: true, saveMsg: e.saveMsg, onWin: () => playDialogue(e.win) }),
  warp: (e) => fade(() => { switchMap(e.map, e.x, e.y, e.dir); if (e.hour) S.time = Math.max(S.time, e.hour * 60); toast(MAPS[e.map].name); }, 1000),
  learnHerbal: () => { if (!S.specs.herbal) { learnSpec('gather', 'herbal'); toast('習得「採藥」'); } },
  // 守夜：時間跳到深夜；天亮：換日並恢復
  night: () => fade(() => { S.time = Math.max(S.time, 23 * 60); }, 800),
  dawn: () => fade(() => { S.time = 6 * 60; S.day++; healAll(); villageDaily(); }, 1200),
  learnLogging: () => { if (!S.specs.logging) learnSpec('gather', 'logging'); if (!has('axe')) give('axe'); toast('獲得「柴刀」 · 習得「伐木」'); },
  repairWang: () => fade(() => { passTime(360); F().wang_house_repaired = 1; applyWang(MAPS.village); }, 1200),
  rest: () => sleep(),
  saveMenu: () => openMenu('system'),
});

// ---------- 第 4 章：血跡線索（地面點綴）與林間聲響 ----------
// 血跡素材：assets/props/血跡.png（透明背景）；還沒有檔案時用程式畫的血點代替
const BLOOD_IMG = Object.assign(new Image(), { src: 'assets/props/血跡.png' });
// kind：pool 第一處的一小灘；drop 沿路的血滴（每處 1–3 滴）
const bloodPh = {};
function bloodSprite(kind, seed) {
  if (BLOOD_IMG.complete && BLOOD_IMG.naturalWidth) return BLOOD_IMG;
  const key = kind + seed; if (bloodPh[key]) return bloodPh[key];
  const [c, g] = canvas(kind === 'pool' ? 64 : 30, kind === 'pool' ? 34 : 18), R = rng(seed * 7 + 3);
  const drop = (x, y, r) => {
    g.fillStyle = '#4a0606'; g.beginPath(); g.ellipse(x, y, r + 1, (r + 1) * 0.62, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#8c1010'; g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#b8261c'; g.beginPath(); g.ellipse(x - r * 0.2, y - r * 0.15, r * 0.6, r * 0.34, 0, 0, Math.PI * 2); g.fill();
    if (r > 2) { g.fillStyle = '#f08a70'; g.fillRect(Math.round(x - r * 0.45), Math.round(y - r * 0.35), 2, 1); }
  };
  if (kind === 'pool') {
    for (let i = 0; i < 7; i++) drop(24 + (R() - 0.5) * 22, 17 + (R() - 0.5) * 8, 5 + R() * 4);
    for (let i = 0; i < 9; i++) { const a = R() * Math.PI * 2, d = 16 + R() * 12; drop(32 + Math.cos(a) * d, 17 + Math.sin(a) * d * 0.5, 1 + R() * 1.6); }
  } else {
    const n = 1 + Math.floor(R() * 3);
    for (let i = 0; i < n; i++) drop(15 + (R() - 0.5) * 14, 9 + (R() - 0.5) * 6, 2 + R() * 2.2);
  }
  return (bloodPh[key] = c);
}
// 血點路線：第一處在林道旁（一小灘），之後每隔一段幾滴，延伸到秦無風被圍的岩石旁
const BLOOD_TRAIL = (() => {
  const path = [[FO_BLOOD.x, FO_BLOOD.y], [FO_BLOOD.x + 100, FO_BLOOD.y - 50], [FO_BLOOD.x + 200, FO_BLOOD.y - 110], [FO_BLOOD.x + 300, FO_BLOOD.y - 160], [FO_QIN.x - 40, FO_QIN.y + 70]], pts = [], R = rng(91);
  for (let i = 1; i < path.length; i++) {
    const [x0, y0] = path[i - 1], [x1, y1] = path[i], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 34);
    for (let k = i === 1 ? 0 : 1; k <= n; k++) pts.push([x0 + (x1 - x0) * k / n + (R() - 0.5) * 16, y0 + (y1 - y0) * k / n + (R() - 0.5) * 10]);
  }
  return pts;
})();
// 床上的秦無風：把他的走路圖（正面第一格）轉成橫躺，下半身蓋上被子
let lyingQin = null;
function lyingQinImg() {
  if (lyingQin) return lyingQin;
  const art = CHAR_ART.qinwufeng; if (!art || !art.walk) return null;
  const fw = art.fw || CHAR_FW, [c, g] = canvas(140, 70);
  g.save(); g.translate(64, 38); g.rotate(-Math.PI / 2); g.drawImage(art.walk, 0, 0, fw, fw, -fw / 2, -fw / 2 - 6, fw, fw); g.restore();
  // 被子（顏色同 interior.js 的床）
  g.fillStyle = '#34507a'; g.fillRect(58, 14, 82, 46); g.fillStyle = '#4a6a9a'; g.fillRect(58, 14, 82, 7);
  g.fillStyle = '#c9a45c'; for (let x = 66; x < 136; x += 16) g.fillRect(x, 34, 6, 6);
  return (lyingQin = c);
}
// 以 y 排序的物件放進王宅室內：躺在床上（床圖錨點 (78, 88)，枕頭在左端）；不在床上時換成空圖
let lyingSprite = null;
function syncLyingQin() {
  const R = MAPS.in_river; if (!R) return;
  if (!lyingSprite) { lyingSprite = { img: canvas(1, 1)[0], x: WROOM.bed.x, y: WROOM.bed.y + 1, ax: 70, ay: 77 }; R.sprites.push(lyingSprite); }
  const img = F().ch04_back && lyingQinImg();
  lyingSprite.img = img || canvas(1, 1)[0];
}
function drawStoryDecals() {
  if (G.id === 'in_river') { syncLyingQin(); drawRoofHole(); }
  ch02Tick();
  if (G.id === 'wildwood') drawCh02Clues(performance.now());
  if (G.id !== 'forest' || !F().ch04_ready || F().ch04_rescued) return;
  // 調查前只看得到第一處那灘血和旁邊幾滴；調查後整條血路都看得見
  const list = F().ch04_blood ? BLOOD_TRAIL : BLOOD_TRAIL.slice(0, 3);
  list.forEach(([x, y], i) => {
    const img = bloodSprite(i ? 'drop' : 'pool', i), sc = BLOOD_IMG.complete && BLOOD_IMG.naturalWidth ? (i ? 0.6 : 1.4) : 1.4;
    const w = img.width * sc, h = img.height * sc;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, Math.round(x - w / 2 - cam.x), Math.round(y - h / 2 - cam.y), w, h);
    ctx.imageSmoothingEnabled = false;
  });
}
// 音效：用 Web Audio 即時合成（風聲＝濾波噪音、金屬碰撞＝幾個不和諧泛音快速衰減），音量隨距離變化
const Sfx = {
  ac: null,
  ctx() { try { this.ac = this.ac || (Music.ac) || new AudioContext(); this.ac.resume(); return this.ac; } catch { return null; } },
  clash(vol = 1) {
    const ac = this.ctx(); if (!ac || vol <= 0.02) return;
    const t = ac.currentTime + 0.01, out = ac.createGain();
    out.gain.setValueAtTime(0.25 * vol * Music.vol, t); out.gain.exponentialRampToValueAtTime(0.001, t + 0.9); out.connect(ac.destination);
    for (const f of [1870, 2630, 3410, 4790]) { const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f * (0.97 + Math.random() * 0.06); o.connect(out); o.start(t); o.stop(t + 0.9); }
  },
  wind(vol = 1) {
    const ac = this.ctx(); if (!ac) return;
    const t = ac.currentTime + 0.01, len = 3, buf = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = buf; bp.type = 'bandpass'; bp.Q.value = 0.8; bp.frequency.setValueAtTime(500, t); bp.frequency.linearRampToValueAtTime(900, t + len / 2); bp.frequency.linearRampToValueAtTime(400, t + len);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09 * vol * Music.vol, t + 1.2); g.gain.linearRampToValueAtTime(0, t + len);
    src.connect(bp); bp.connect(g); g.connect(ac.destination); src.start(t);
  },
};
let ambClash = 2, ambWind = 1;
function storyAmbient(dt) {
  if (G.id !== 'forest' || !F().ch04_ready || F().ch04_fled) return;
  // 遠處的兵刃聲：調查過血跡之後才聽得見，越靠近越響、越頻繁
  const d = Math.hypot(player.x - FO_QIN.x, player.y - FO_QIN.y), near = Math.max(0, 1 - d / 900);
  if (F().ch04_blood && (ambClash -= dt) <= 0) { Sfx.clash(0.15 + near * 0.85); if (Math.random() < 0.4) setTimeout(() => Sfx.clash(0.1 + near * 0.7), 160); ambClash = 3.5 - near * 2.2 + Math.random() * 1.5; }
  if ((ambWind -= dt) <= 0) { Sfx.wind(0.7); ambWind = 6 + Math.random() * 5; }
}
Object.assign(STORY_HOOKS, {
  sfx: (e) => { Sfx[e.sound](1); setTimeout(() => Sfx[e.sound](0.9), 180); setTimeout(() => Sfx[e.sound](1), 520); },
  // 鏡頭移到 (x, y)：pan 秒平移過去，停留 hold 秒（999＝直到 camFree）
  camTo: (e) => { camFocus = { x: e.x, y: e.y, pan: e.pan, start: performance.now(), until: performance.now() + (e.pan + e.hold) * 1000 }; },
  camFree: () => { camFocus = null; },
});

// ---------- 劇情走位 ----------
let scripted = null;
function scriptWalk(list) {
  // near：目的地是該角色（'player' 或 NPC id）目前位置再加 dx、dy
  scripted = list.map((w) => ({ ...w, ...(w.near ? (() => { const t = w.near === 'player' ? player : npcs.find((n) => n.id === w.near) || player; return { x: t.x + (w.dx || 0), y: t.y + (w.dy || 0) }; })() : {}), a: w.who === 'player' ? player : npcs.find((n) => n.id === w.who) })).filter((w) => w.a);
  if (!scripted.length) { scripted = null; return; }
  D.hold = true; $('dlg').classList.remove('open');
}
// 每幀呼叫；有人在走就回傳 true（主角這幀不歸零動畫）
function updateScripted(dt) {
  if (!scripted) return false;
  let busy = false;
  for (const w of scripted) {
    const a = w.a, dx = w.x - a.x, dy = w.y - a.y, d = Math.hypot(dx, dy), sp = w.run ? 260 : 130;
    if (d < 4) { a.moving = false; a.frame = 0; a.anim = 0; continue; }
    busy = true;
    // 直接移動、不做碰撞，避免劇情走位被樹擋住卡死
    const k = Math.min(1, sp * dt / d);
    a.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
    a.x += dx * k; a.y += dy * k; a.moving = true; a.target = null; a.wait = 9;
    a.anim = (a.anim || 0) + dt * (sp / 15); a.frame = Math.floor(a.anim) % (a.frames || 8);
    if (a === player) player.scriptRun = !!w.run;
  }
  if (!busy) { scripted = null; player.scriptRun = false; D.hold = false; $('dlg').classList.add('open'); step(); }
  return true;
}
