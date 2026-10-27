// 把「一列列排好的同類物件」（例如藥草的 8 個生長階段）切成橫排圖條：每列一個檔案，每格等寬、物件底部置中對齊
// 用法：node cut_rows.js <來源.png> <輸出資料夾> <縮放比例> <列1檔名> <列2檔名> ...
// 又寬又扁的區塊視為標題牌（如「止血草」字牌），會先抹掉
const fs = require('fs'), path = require('path');
const { decode } = require('./png.js');
const { blobs } = require('./blobs.js');
const { encode, sample } = require('./convert_chars.js');

const [src, outDir, scale, ...names] = process.argv.slice(2);
const img = decode(src), S = +scale;
for (let i = 3; i < img.data.length; i += 4) if (img.data[i] < 40) img.data[i - 3] = img.data[i - 2] = img.data[i - 1] = img.data[i] = 0;
// 標題牌：又寬又扁的長方形；先從圖上抹掉，免得跟旁邊的物件黏在一起
const label = (g) => g.r - g.l > 200 && (g.r - g.l) / (g.b - g.t) > 2.2;
for (const g of blobs(img, 2, 150).filter(label)) for (let y = g.t; y < g.b; y++) for (let x = g.l; x < g.r; x++) img.data[(y * img.w + x) * 4 + 3] = 0;
// 碎塊合併（花瓣、小石子和本體分開時）
const GAP = +(process.env.GAP ?? 4), THR = +(process.env.THR || 150); // 碎塊合併距離、不透明門檻
let groups = blobs(img, 2, THR);
const near = (a, b) => a.l - GAP < b.r && b.l - GAP < a.r && a.t - GAP < b.b && b.t - GAP < a.b;
for (let merged = true; merged;) {
  merged = false;
  for (let i = 0; i < groups.length && !merged; i++) for (let j = i + 1; j < groups.length; j++) if (near(groups[i], groups[j])) {
    const a = groups[i], b = groups[j];
    groups[i] = { l: Math.min(a.l, b.l), t: Math.min(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b), n: a.n + b.n };
    groups.splice(j, 1); merged = true; break;
  }
}
groups = groups.filter((g) => g.n > 400);
// 依底部 y 分列，列內依 x 排序
groups.sort((a, b) => a.b - b.b);
const rows = [];
for (const g of groups) { const r = rows.find((row) => Math.abs(row[0].b - g.b) < 60); if (r) r.push(g); else rows.push([g]); }
rows.sort((a, b) => a[0].b - b[0].b);
if (rows.length !== names.length) throw new Error(`找到 ${rows.length} 列，但給了 ${names.length} 個檔名`);
fs.mkdirSync(outDir, { recursive: true });
// 葉子相連的兩株會黏成一塊：少於 8 格時，把最寬的那塊從中段最細的地方切開
const COUNT = +process.env.COUNT || 8;
function split(row) {
  const g = row.reduce((a, b) => (b.r - b.l > a.r - a.l ? b : a)), w = g.r - g.l;
  let best = -1, bv = 1e9;
  for (let x = g.l + Math.round(w * 0.3); x < g.l + Math.round(w * 0.7); x++) {
    let v = 0; for (let y = g.t; y < g.b; y++) if (img.data[(y * img.w + x) * 4 + 3] >= 150) v++;
    if (v < bv) { bv = v; best = x; }
  }
  row.splice(row.indexOf(g), 1, { ...g, r: best }, { ...g, l: best });
}
rows.forEach((row, ri) => {
  while (row.length < COUNT) split(row);
  row.sort((a, b) => a.l - b.l);
  const cw = Math.ceil(Math.max(...row.map((g) => g.r - g.l)) * S) + 2, ch = Math.ceil(Math.max(...row.map((g) => g.b - g.t)) * S) + 2;
  const strip = Buffer.alloc(cw * row.length * ch * 4);
  row.forEach((g, i) => {
    const w = Math.ceil((g.r - g.l) * S), h = Math.ceil((g.b - g.t) * S);
    const tile = sample(img, g.l, g.t, 1 / S, w, h, [g.l, g.t, g.r, g.b], true);
    const ox = i * cw + ((cw - w) >> 1), oy = ch - h;
    for (let y = 0; y < h; y++) tile.copy(strip, ((oy + y) * cw * row.length + ox) * 4, y * w * 4, (y + 1) * w * 4);
  });
  fs.writeFileSync(path.join(outDir, names[ri] + '.png'), encode(cw * row.length, ch, strip));
  console.log(names[ri], row.length + ' 格', cw + '×' + ch);
});
