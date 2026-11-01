'use strict';
// 數值編輯面板（開發測試用）：放在畫面下方操作列底下，即時顯示並可直接修改主角、背包、清河村的數值
// 數值有變化時會在欄位旁閃出增減量，方便觀察捐獻、結算、建設的效果
const DEV_FIELDS = [
  ['清河村倉庫', V_RES.map((r) => [r.name, () => S.village, r.id])],
  ['村莊狀態', [['人口', () => S.village, 'pop'], ['可調度勞力', () => S.village, 'labor'], ['繁榮度', () => S.village, 'prosper'], ['民心', () => S, 'heart'], ['累計捐獻點', () => S.village, 'donated'], ['民兵', () => S.village, 'militia'], ['兵器', () => S.village, 'arms'], ['刀盾次數', () => S.village, 'shieldLv'], ['長槍次數', () => S.village, 'spearLv'], ['民兵弓手', () => S.village, 'bowmen']]],
  ['主角', [['盤纏（文）', () => S, 'gold'], ['氣血', () => S, 'hp'], ['精力', () => S, 'mp'], ['技能點', () => S, 'tp'], ['江湖聲望', () => S, 'fame'], ['第幾日', () => S, 'day']]],
  ['背包材料', ['wood', 'stone', 'iron_ore', 'coal', 'herb', 'longcao', 'salve'].map((id) => [ITEMS[id].name, () => S.inv, id])],
];
const DEV_FLAGS = [['村長授權', 'auth'], ['已換古裝', 'outfit'], ['村口柵欄', 'build_fence'], ['瞭望台', 'build_tower'], ['練兵場', 'build_drill'], ['已進清河村', 'ch1_wolves'], ['王宅已修繕', 'wang_house_repaired'], ['保衛戰已結束', 'raidDone']];
const devLast = {};
function buildDevPanel() {
  const box = $('devBody'); box.replaceChildren();
  for (const [title, fields] of DEV_FIELDS) {
    const sec = document.createElement('fieldset'); sec.innerHTML = `<legend>${title}</legend>`;
    for (const [label, obj, key] of fields) {
      const id = title + key, row = document.createElement('label');
      row.innerHTML = `<span>${label}</span><input type="number" step="1" data-id="${id}"><em></em>`;
      const input = row.querySelector('input');
      input.onchange = () => {
        if (!S) return;
        const n = Math.max(0, Math.round(+input.value || 0)), o = obj();
        if (o === S.inv && !n) delete o[key]; else o[key] = n;
        if (key === 'heart') S.heart = Math.min(100, S.heart);
        devLast[id] = n; renderGov();
      };
      input.dataset.key = key; row.dev = { obj, key, id, input, em: row.querySelector('em') };
      sec.appendChild(row);
    }
    box.appendChild(sec);
  }
  const flags = document.createElement('fieldset'); flags.innerHTML = '<legend>劇情旗標</legend>';
  for (const [label, key] of DEV_FLAGS) {
    const row = document.createElement('label'); row.className = 'flag';
    row.innerHTML = `<input type="checkbox"><span>${label}</span>`;
    const cb = row.querySelector('input');
    cb.onchange = () => { if (!S) return; F()[key] = cb.checked ? 1 : 0; if (key.startsWith('build_')) applyVillageBuilds(MAPS.village); if (key === 'ch1_wolves') refreshNpcs(); renderGov(); };
    row.devFlag = { key, cb }; flags.appendChild(row);
  }
  const acts = document.createElement('div'); acts.className = 'devacts';
  const btn = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = () => { if (S && started) { fn(); renderGov(); } }; acts.appendChild(b); };
  btn('推進一天（每日結算）', () => { S.day++; villageDaily(); applyGather(G); });
  btn('材料各 +10', () => { for (const id of ['wood', 'stone', 'iron_ore', 'herb']) give(id, 10); });
  btn('氣血精力全滿', () => healAll());
  btn('黑風寨今夜來襲', () => { F().auth = 1; F().raidDone = 0; F().raidDay = S.day; });
  // 劇情跳關：補齊前面章節的完成旗標，傳到王宅；from 給了就從那句（找 hook 名稱）開始播
  const CH04_DONE = ['ch1_wolves', 'ch02_rescued', 'ch02_entered', 'ch02_chief', 'ch02_permit', 'ch02_led', 'ch02_wu_left', 'ch02_complete', 'wang_house_repaired', 'ch03_wake_start', 'ch03_chief_done', 'ch03_complete',
    'ch04_morning', 'ch04_count_start', 'ch04_inventory', 'ch04_errand', 'ch04_joke', 'ch04_encounter', 'ch04_to_cave', 'ch04_cave', 'ch04_names', 'ch04_handshake', 'ch04_chief', 'ch04_qin_stable'];
  const jumpWang = (extra, hour, hook) => {
    for (const k of [...CH04_DONE, ...extra]) F()[k] = 1;
    for (const k of ['ch04_guest', 'ch04_qin_up', 'ch04_complete']) if (!extra.includes(k)) delete F()[k];
    ST().chapter = 'ch04';
    fade(() => { switchMap('in_river', WROOM.door.x, WROOM.door.y - 40, 1); S.time = Math.max(S.time, hour * 60); refreshNpcs(); }, 600);
    const lines = DIALOGUES.dlg_ch04_guest.lines, i = hook ? lines.findIndex((l) => l.effects && l.effects.some((e) => e.name === hook)) : 0;
    setTimeout(() => talk(dialogueItems('dlg_ch04_guest').slice(Math.max(0, i))), 1300);
  };
  btn('跳到：秦無風回王宅', () => jumpWang([], 17.5));
  btn('跳到：王宅守夜（夜深了）', () => jumpWang(['ch04_guest'], 22, 'night'));
  btn('存檔', () => toast(saveGame() ? '已存檔' : '無法存檔'));
  flags.appendChild(acts);
  box.appendChild(flags);
}
// 每 0.25 秒同步一次：正在輸入的欄位不覆蓋；數值被遊戲改動時閃出增減量
function syncDevPanel() {
  if (!S || !$('dev').open) return;
  for (const row of $('devBody').querySelectorAll('label')) {
    if (row.devFlag) { row.devFlag.cb.checked = !!F()[row.devFlag.key]; continue; }
    const { obj, key, id, input, em } = row.dev, v = obj()[key] || 0;
    if (document.activeElement !== input && (input.value === '' || +input.value !== v)) input.value = v;
    if (devLast[id] !== undefined && devLast[id] !== v) {
      const d = v - devLast[id]; em.textContent = (d > 0 ? '+' : '') + d; em.className = d > 0 ? 'up' : 'down';
      clearTimeout(em.timer); em.timer = setTimeout(() => { em.textContent = ''; }, 2500);
    }
    devLast[id] = v;
  }
}
buildDevPanel();
setInterval(syncDevPanel, 250);
