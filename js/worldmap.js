'use strict';
// 清河地區大地圖（手繪底圖版）：完整手繪地形底圖 ＋ 碰撞資料 ＋ 入口 ＋ 角色自由行走
// 底圖：assets/worldmap2/wm_base_master.png（1672×941，第 2 版）照 tools/build_worldmap2.py 的倍率 K（目前 1 倍）切成分塊（assets/worldmap2/chunks/，貼圖 3 倍解析度）
//   每一格畫面只畫看得到的那幾塊（整張放進一張 canvas 太大時部分瀏覽器會失敗，之後地圖再加大也不用改）
// 碰撞、地標入口在 js/worldmap_data.js：由 tools/build_worldmap2.py 產生；要改入口位置或碰撞，改 tools/worldmap2_layout.json 再重跑
// 主角、走路動畫、攝影機、互動、存檔都沿用一般地圖：G.id = 'worldmap'
// 進出：清河村南村口（第 2 章之後）、室外地圖按 G（或下方「大地圖」按鈕）；走到入口按 E 切換場景
const WMW = WM_W, WMH = WM_H;

// 入口圖層：第一階段開放清河村、黑松林、雲山官道；三座山寨與官道驛站先預留位置
const WM_ENTRANCES = {
  // 回清河村：南村口已經開放（阿武讓路）就站在南村口，不然站在南橋頭北側（不然會被守衛判定推回去）
  qinghe: { name: '清河村', sub: '起點・王宅', to: () => (F().gate ? switchMap('village', GATE.x, WORLD.H - 110, 1) : switchMap('village', GATE.x, GATE.y - 60, 1)) },
  heisong: { name: '黑松林', sub: '第 4 章', to: () => switchMap('forest', FOW - 60, FO_EXIT.y, 2) },
  // 雲山官道：第一次去要先確認「啟程」（原本在清河村南村口問的那段），之後直接進
  guandao: { name: '雲山官道', sub: '第 5 章', go: () => leaveVillage(),
    ok: () => F().gate || F().leftOnce, no: ['（關口的守衛攔住了你。）', ['阿武', '沒有村長的吩咐，我可不能放你出去。']] },
  qingfeng: { name: '清風寨', sub: '武松', note: ['（山腰上插著藍旗的寨子，寨門緊閉。）', '【預留地點・尚未開放】'] },
  heifeng: { name: '黑風寨', sub: '秦紅櫻', note: ['（崖頂的石寨插滿紅旗，石階上有人守著。）', '【預留地點・尚未開放】'] },
  tufeng: { name: '突風寨', sub: '雷萬山', note: ['（木柵圍起來的山寨，望樓上燃著火盆，有人盯著官道。）', '【預留地點・尚未開放】'] },
  yizhan: { name: '官道驛站', sub: '商旅據點', note: ['（驛站前停著幾輛貨車，馬夫正在餵馬。）', '【預留地點・尚未開放】'] },
};
// 從各張室外地圖打開大地圖時，站到哪個入口前
const WM_FROM = { village: 'qinghe', wildwood: 'qinghe', forest: 'heisong', field: 'guandao' };

// ---------- 載入：底圖分塊、小地圖 ----------
// 右、下邊緣的分塊可能不滿一塊（地圖寬高不是 WM_CHUNK 的倍數）
const WM_COLS = Math.ceil(WMW / WM_CHUNK), WM_ROWS = Math.ceil(WMH / WM_CHUNK), WM_CHUNKS = [];
let WM_MINI = null;
let WM_SHOW_COLL = false; // 按 C 切換：大地圖上用紅色標出不能走的地方
function toggleWorldColl() {
  if (G.id !== 'worldmap') return toast('碰撞檢視只在大地圖有效');
  WM_SHOW_COLL = !WM_SHOW_COLL;
  toast(WM_SHOW_COLL ? '碰撞檢視：開（紅色＝不能走）' : '碰撞檢視：關');
}
async function loadWorldArt() {
  const jobs = [];
  for (let r = 0; r < WM_ROWS; r++) for (let c = 0; c < WM_COLS; c++) {
    jobs.push(loadImg(`assets/worldmap2/chunks/r${r}c${c}.webp`).then((im) => { WM_CHUNKS[r * WM_COLS + c] = im; }).catch(() => {}));
  }
  jobs.push(loadImg('assets/worldmap2/wm_mini.webp').then((im) => { WM_MINI = im; }).catch(() => {}));
  await Promise.all(jobs);
}

// ---------- 碰撞：解開 WM_COLL 的行程長度編碼（1＝能走）----------
function wmWalkGrid() {
  const { w, h, rows } = WM_COLL, g = new Uint8Array(w * h);
  rows.split('|').forEach((row, y) => {
    let x = 0, walk = false;
    for (const r of row.split(',')) { const n = parseInt(r, 36); if (walk) g.fill(1, y * w + x, y * w + x + n); x += n; walk = !walk; }
  });
  return g;
}

function buildWorldMap() {
  const G = { id: 'worldmap', name: '清河地區', W: WMW, H: WMH, sprites: [], solids: [], circles: [], lights: [], shimmers: [], buildings: [], chests: {} };
  // 照概念圖的比例：人約為房子的一半高，走路也放慢（不然一下就走完整張地圖）
  G.actorScale = 0.65; G.speedScale = 0.7;
  // 地面：只畫鏡頭範圍內的分塊（game.js 的 render 看到 G.drawGround 就改用它）
  // 分塊貼圖是 WM_TEX 倍解析度，縮回遊戲座標的大小畫；畫布本身是 RS 倍（2–3），所以細節會真的畫到螢幕上
  G.drawGround = (g, cam) => {
    const c0 = Math.max(0, Math.floor(cam.x / WM_CHUNK)), c1 = Math.min(WM_COLS - 1, Math.floor((cam.x + VW - 1) / WM_CHUNK));
    const r0 = Math.max(0, Math.floor(cam.y / WM_CHUNK)), r1 = Math.min(WM_ROWS - 1, Math.floor((cam.y + VH - 1) / WM_CHUNK));
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const im = WM_CHUNKS[r * WM_COLS + c], x = c * WM_CHUNK - cam.x, y = r * WM_CHUNK - cam.y;
      if (im) g.drawImage(im, x, y, im.width / WM_TEX, im.height / WM_TEX);
      else { g.fillStyle = '#6f7a34'; g.fillRect(x, y, Math.min(WM_CHUNK, WMW - c * WM_CHUNK), Math.min(WM_CHUNK, WMH - r * WM_CHUNK)); }
    }
    g.imageSmoothingEnabled = false;
    if (WM_SHOW_COLL && G.collOverlay) g.drawImage(G.collOverlay, -cam.x, -cam.y, WM_COLL.w * WM_COLL.k, WM_COLL.h * WM_COLL.k);
  };
  // 能不能走全看碰撞格：河、山、樹林、建築都算擋路（沿用 blocked() 的 G.water 判定）
  const wg = wmWalkGrid(), K = WM_COLL.k;
  G.water = (x, y) => { const c = (x / K) | 0, r = (y / K) | 0; return !(c >= 0 && r >= 0 && c < WM_COLL.w && r < WM_COLL.h && wg[r * WM_COLL.w + c]); };
  // 除錯：按 C 切換，不能走的地方蓋一層半透明紅色（看碰撞用）
  const [red, rg] = canvas(WM_COLL.w, WM_COLL.h), rd = rg.createImageData(WM_COLL.w, WM_COLL.h);
  for (let i = 0; i < wg.length; i++) if (!wg[i]) { rd.data[i * 4] = 230; rd.data[i * 4 + 1] = 30; rd.data[i * 4 + 2] = 30; rd.data[i * 4 + 3] = 110; }
  rg.putImageData(rd, 0, 0);
  G.collOverlay = red;
  // 小地圖
  const [mini, mg] = canvas(384, Math.round(384 * WMH / WMW)); // 小地圖會縮放整張圖顯示，固定 384 寬就夠清楚
  mg.imageSmoothingEnabled = true;
  if (WM_MINI) mg.drawImage(WM_MINI, 0, 0, mini.width, mini.height);
  G.mini = mini;
  G.npcs = [];
  return G;
}

// ---------- 打開大地圖、進入場景 ----------
const wmLandmark = (id) => WM_LANDMARKS.find((l) => l.id === id);
// 從某張地圖進大地圖，站到對應入口上
function gotoWorldMap(from) {
  const l = wmLandmark(from);
  keys.clear();
  fade(() => { switchMap('worldmap', l.x, l.y, 0); toast('清河地區'); });
}
function openWorldMap() {
  if (isModal() || !started) return;
  const from = WM_FROM[G.id];
  if (!from) return toast(G.interior ? '到室外才能打開大地圖' : '這裡看不到清河地區的路');
  // 第 1–2 章還沒進過清河村，不認得周圍的路
  if (!F().ch02_complete) return toast('還不認得這一帶的路……先跟著劇情走吧');
  gotoWorldMap(from);
}
function enterPlace(id) {
  const e = WM_ENTRANCES[id];
  if (e.note) return talk(e.note);
  if (e.ok && !e.ok()) return talk(e.no);
  keys.clear();
  if (e.go) return e.go();
  fade(() => { e.to(); toast(MAPS[S.map].name); });
}
function worldInteractables() {
  return WM_LANDMARKS.map((l) => { const e = WM_ENTRANCES[l.id]; return { x: l.x, y: l.y, r: 40 + 20 * WM_COLL.k, name: e.name, prompt: (e.note ? '查看' : '進入') + e.name, act: () => enterPlace(l.id) }; });
}
function worldAreaName(x, y) {
  let best = null, bd = 120 * WM_COLL.k;
  for (const l of WM_LANDMARKS) { const d = Math.hypot(x - l.x, y - l.y); if (d < bd) { bd = d; best = l; } }
  return best ? `清河地區・${WM_ENTRANCES[best.id].name}` : '清河地區';
}
// 地標上方的名牌（木框紙籤）：畫在所有人物與物件之上
function drawWorldLabels() {
  if (G.id !== 'worldmap') return;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const l of WM_LANDMARKS) {
    const e = WM_ENTRANCES[l.id], x = Math.round(l.lx - cam.x), y = Math.round(l.ly - cam.y);
    if (x < -140 || x > VW + 140 || y < -60 || y > VH + 60) continue;
    const th = 44, sub = e.note ? `（${e.sub}・預留）` : `（${e.sub}）`;
    ctx.font = 'bold 17px "Noto Serif TC","PMingLiU",serif'; let tw = ctx.measureText(e.name).width;
    ctx.font = '10px "Noto Serif TC","PMingLiU",serif'; tw = Math.max(tw, ctx.measureText(sub).width) + 28;
    ctx.fillStyle = 'rgba(30,18,8,.35)'; ctx.fillRect(x - tw / 2 + 3, y - th / 2 + 4, tw, th);
    ctx.fillStyle = '#f1e2bb'; ctx.strokeStyle = '#6b4a26'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(x - tw / 2, y - th / 2, tw, th, 4); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#b08a52'; ctx.lineWidth = 1; ctx.strokeRect(x - tw / 2 + 4.5, y - th / 2 + 4.5, tw - 9, th - 9);
    ctx.fillStyle = '#2a1a0e'; ctx.font = 'bold 17px "Noto Serif TC","PMingLiU",serif'; ctx.fillText(e.name, x, y - 6);
    ctx.fillStyle = e.note ? '#9a4a30' : '#6b4a26'; ctx.font = '10px "Noto Serif TC","PMingLiU",serif'; ctx.fillText(sub, x, y + 12);
  }
}

// 劇情目標在別張地圖時，大地圖上的箭頭指向對應的入口
Object.assign(STORY_EXITS, (() => {
  const at = (id) => { const l = wmLandmark(id); return [l.x, l.y]; };
  const o = { 'worldmap>village': at('qinghe'), 'worldmap>wildwood': at('qinghe'), 'worldmap>forest': at('heisong'), 'worldmap>field': at('guandao') };
  for (const r of ['in_river', 'in_shrine', 'in_weapon', 'in_armor', 'in_inn', 'in_home']) o['worldmap>' + r] = at('qinghe');
  return o;
})());
