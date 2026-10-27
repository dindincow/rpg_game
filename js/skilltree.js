'use strict';
// 技能樹：花技能點解鎖節點；節點效果（fx）加總後由 treeFx() 提供給戰鬥、採集、製作等系統
const TREE_NODES = SKILL_TREES.flatMap((t) => t.nodes.map((n) => Object.assign(n, { tree: t })));
const treeNode = (id) => TREE_NODES.find((n) => n.id === id);
const treeOn = (n, s = S) => !!(s.tree[n.id] || (n.spec && s.specs[n.spec[1]]));
function treeFx(key, s = S) {
  let v = 0;
  for (const n of TREE_NODES) if (n.fx && n.fx[key] && treeOn(n, s)) v += n.fx[key];
  return v;
}
// 解鎖條件逐項檢查：[說明, 是否達成]
function treeChecks(n) {
  const out = [], c = n.cond || {};
  for (const id of n.req || []) out.push([`前置「${treeNode(id).name}」`, treeOn(treeNode(id))]);
  if (c.lv) out.push([`等級 ${c.lv}`, S.lv >= c.lv]);
  if (c.attr) { const t = ATTRS.find((a) => a.id === c.attr[0]); out.push([`${t.name} ${c.attr[1]}`, S.attrs[t.id] >= c.attr[1]]); }
  if (c.life) out.push([`${lifeDef(c.life[0]).name}熟練 Lv ${c.life[1]}`, lifeLv(c.life[0]) >= c.life[1]]);
  if (c.item) out.push([`持有「${ITEMS[c.item].name}」`, has(c.item)]);
  if (n.teach) out.push([`向${n.teach}學習`, treeOn(n)]);
  return out;
}
const treeCanUnlock = (n) => !treeOn(n) && !n.teach && S.tp >= n.cost && treeChecks(n).every(([, ok]) => ok);
const treeState = (n) => (treeOn(n) ? 'on' : treeCanUnlock(n) ? 'avail' : 'locked');
const TREE_STATE_TEXT = { on: '已解鎖', avail: '可解鎖', locked: '未解鎖' };
function treeUnlock(n) {
  if (!treeCanUnlock(n)) return;
  S.tp -= n.cost; S.tree[n.id] = 1;
  if (n.spec) learnSpec(n.spec[0], n.spec[1]);
  const oldMax = S.maxHp; deriveStats(S); S.hp += S.maxHp - oldMax;
  toast(`解鎖「${n.name}」：${n.effect}`);
  renderTree();
}

// ---------- 介面 ----------
let treeOpen = false, treeTab = '生活', treeId = 'gather', treeSel = 'g1';
function openTree() { treeOpen = true; keys.clear(); renderTree(); $('tree').classList.add('open'); }
function closeTree() { treeOpen = false; $('tree').classList.remove('open'); }
function renderTree() {
  const trees = SKILL_TREES.filter((t) => t.tab === treeTab);
  if (trees.length && !trees.some((t) => t.id === treeId)) { treeId = trees[0].id; treeSel = trees[0].nodes[0].id; }
  const tree = trees.find((t) => t.id === treeId);
  // 上方分頁
  const tabs = $('treeTabs'); tabs.replaceChildren();
  for (const tab of TREE_TABS) {
    const b = document.createElement('button'); b.textContent = tab; b.className = tab === treeTab ? 'sel' : '';
    b.onclick = () => { treeTab = tab; renderTree(); }; tabs.appendChild(b);
  }
  // 左側分類
  const cats = $('treeCats'); cats.replaceChildren();
  for (const t of trees) {
    const b = document.createElement('button'); b.className = t.id === treeId ? 'sel' : '';
    b.innerHTML = `<i>${t.icon}</i>${t.name}`;
    b.onclick = () => { treeId = t.id; treeSel = t.nodes[0].id; renderTree(); }; cats.appendChild(b);
  }
  if (!trees.length) cats.innerHTML = '<p class="tmuted">尚未開放</p>';
  // 中間技能樹
  const pos = (n) => [18 + n.x * 32, 12 + n.y * 25];
  const canvasEl = $('treeCanvas'); canvasEl.replaceChildren();
  $('treeName').textContent = tree ? tree.name : `${treeTab}（尚未開放）`;
  $('treeDesc').textContent = tree ? tree.desc : '隨著劇情推進，這一系的學問才會向你敞開。';
  if (tree) {
    let svg = '';
    for (const n of tree.nodes) for (const id of n.req || []) {
      const p = treeNode(id); if (p.tree !== tree) continue;
      const [x1, y1] = pos(p), [x2, y2] = pos(n), my = (y1 + y2) / 2;
      svg += `<path class="${treeOn(p) ? (treeOn(n) ? 'on' : 'half') : ''}" d="M${x1} ${y1} V${my} H${x2} V${y2}"/>`;
    }
    canvasEl.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${svg}</svg>`;
    for (const n of tree.nodes) {
      const st = treeState(n), [x, y] = pos(n), b = document.createElement('button');
      b.className = `tnode ${st}${n.mile ? ' mile' : ''}${n.id === treeSel ? ' sel' : ''}`;
      b.style.left = x + '%'; b.style.top = y + '%';
      b.innerHTML = `<i>${n.icon}</i><span>${n.name}<small>${st === 'locked' ? '🔒 ' : ''}${TREE_STATE_TEXT[st]}</small></span>`;
      b.onclick = () => { treeSel = n.id; renderTree(); };
      canvasEl.appendChild(b);
    }
  }
  // 右側節點資訊
  const info = $('treeInfo'), n = tree && treeNode(treeSel);
  if (!n) { info.innerHTML = '<p class="tmuted">選擇一個節點查看詳情。</p>'; }
  else {
    const st = treeState(n), checks = treeChecks(n);
    const reqs = (n.req || []).map((id) => treeNode(id).name).join('、') || '無';
    const conds = checks.filter(([t]) => !t.startsWith('前置')).map(([t, ok]) => `<em class="${ok ? 'ok' : 'no'}">${t}</em>`).join('、') || '無';
    info.innerHTML = `<div class="thead"><i class="${st}">${n.icon}</i><div><b>${n.name}</b><span class="tbadge ${st}">${TREE_STATE_TEXT[st]}</span></div></div>
      <dl><dt>類型</dt><dd>${n.tree.name} / ${n.mile ? '里程碑' : n.teach ? '拜師' : '技能'}</dd><dt>效果</dt><dd>${n.effect}</dd>
      <dt>前置</dt><dd>${reqs}</dd><dt>條件</dt><dd>${conds}</dd><dt>消耗</dt><dd>${n.teach ? '—' : `技能點 ${n.cost}`}</dd>
      <dt>狀態</dt><dd class="${st}">${TREE_STATE_TEXT[st]}</dd></dl><p class="ttext">${n.text}</p>`;
    if (st !== 'on') {
      const b = document.createElement('button'); b.className = 'tunlock';
      b.textContent = n.teach ? `需向${n.teach}學習` : `解鎖（技能點 ${n.cost}）`; b.disabled = st !== 'avail';
      b.onclick = () => treeUnlock(n); info.appendChild(b);
    }
  }
  // 下方資源列
  $('treeRes').innerHTML = [['技能點', S.tp], ['銅錢', S.gold + ' 文'], ['止血草', S.inv.herb || 0], ['金創藥', S.inv.salve || 0]]
    .map(([k, v]) => `<span>${k}：<b>${v}</b></span>`).join('');
}
