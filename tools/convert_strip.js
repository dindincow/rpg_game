// 把「一橫排、沒有標籤」的動作圖（例如小蝦米_張望動作）切成遊戲用的單列動作圖：每格 86×86，腳底對齊行走圖
// 用法：node convert_strip.js <來源.png> <輸出.png> [格數，預設 8]
// 以全透明的直欄切出每個人物；所有格用同一個縮放比例（最高那格縮到 TARGET_H），水平置中、腳底貼齊 FOOT_Y
const fs = require('fs');
const { decode } = require('./png.js');
const { encode, sample } = require('./convert_chars.js');

// HD=3：輸出 3 倍解析度的圖格（每格 258），遊戲內縮回原大小畫，細節較清楚（主角用）
const HD = +(process.env.HD || 1);
const FW = 86 * HD, FOOT_Y = 76 * HD, TARGET_H = (+process.env.TARGET_H || 66) * HD, OPA = 128;
const [src, out, count = 8] = process.argv.slice(2);
const img = decode(src);
const opaque = (x, y) => img.data[(y * img.w + x) * 4 + 3] >= OPA;

const colHas = (x) => { for (let y = 0; y < img.h; y++) if (opaque(x, y)) return true; return false; };
const spans = []; let s = -1;
for (let x = 0; x <= img.w; x++) { if (x < img.w && colHas(x)) { if (s < 0) s = x; } else if (s >= 0) { if (x - s > 20) spans.push([s, x]); s = -1; } }
// 人物之間有手腳碰在一起時：從最寬的那塊中段、不透明像素最少的直欄切開
const colCount = (x) => { let n = 0; for (let y = 0; y < img.h; y++) if (opaque(x, y)) n++; return n; };
while (spans.length < +count) {
  const i = spans.reduce((b, s, k) => (s[1] - s[0] > spans[b][1] - spans[b][0] ? k : b), 0), [l, r] = spans[i];
  let best = l + ((r - l) >> 1), bn = Infinity;
  for (let x = l + Math.round((r - l) * 0.3); x < l + Math.round((r - l) * 0.7); x++) { const n = colCount(x); if (n < bn) { bn = n; best = x; } }
  spans.splice(i, 1, [l, best], [best, r]);
}
if (spans.length !== +count) throw new Error(`應有 ${count} 格，找到 ${spans.length}`);
const boxes = spans.map(([l, r]) => {
  let t = 1e9, b = -1;
  for (let y = 0; y < img.h; y++) for (let x = l; x < r; x++) if (opaque(x, y)) { t = Math.min(t, y); b = Math.max(b, y); }
  return [l, t, r, b + 1];
});
const step = Math.max(...boxes.map(([, t, , b]) => b - t)) / TARGET_H;
const W = FW * count, rgba = Buffer.alloc(W * FW * 4);
// CENTER=head：手上拿東西、旁邊有道具或灰塵時，改用頭頂那一段（HEAD 比例）的不透明像素平均位置置中，人物才不會左右飄
const HEAD = +(process.env.HEAD || 0.18);
const headX = ([l, t, r, b]) => {
  let sx = 0, n = 0;
  for (let y = t; y < t + (b - t) * HEAD; y++) for (let x = l; x < r; x++) if (opaque(x, y)) { sx += x; n++; }
  return n ? sx / n : (l + r) / 2;
};
boxes.forEach(([l, t, r, b], i) => {
  // 以人物寬度中心置中、腳底對齊
  const cx = process.env.CENTER === 'head' ? headX([l, t, r, b]) : (l + r) / 2, x0 = cx - (FW / 2) * step, y0 = b - FOOT_Y * step;
  const cell = sample(img, x0, y0, step, FW, FW, [l, t, r, b]);
  for (let y = 0; y < FW; y++) cell.copy(rgba, (y * W + i * FW) * 4, y * FW * 4, (y + 1) * FW * 4);
});
fs.writeFileSync(out, encode(W, FW, rgba));
console.log(`${out}：${count} 格，縮放 1/${step.toFixed(2)}`);
