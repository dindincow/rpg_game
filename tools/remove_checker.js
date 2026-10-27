// 去掉「假透明」棋盤格底（AI 圖常把灰白格子直接畫進圖裡）：從四邊與指定種子點填滿淺灰／白色，再裁到最小範圍
// 用法：node remove_checker.js <來源.png> <輸出.png> [種子x,y ...]（被圍住的空洞，如牌樓門洞，需另給種子點）
const fs = require('fs');
const { decode } = require('./png.js');
const { encode } = require('./convert_chars.js');
const [src, out, ...seeds] = process.argv.slice(2);
const { w, h, data } = decode(src);
const isBg = (p) => { const k = p * 4, r = data[k], g = data[k + 1], b = data[k + 2]; return Math.min(r, g, b) >= 196 && Math.max(r, g, b) - Math.min(r, g, b) <= 14; };
const seen = new Uint8Array(w * h), st = [];
for (let x = 0; x < w; x++) st.push(x, (h - 1) * w + x);
for (let y = 0; y < h; y++) st.push(y * w, y * w + w - 1);
for (const s of seeds) { const [x, y] = s.split(',').map(Number); st.push(y * w + x); }
while (st.length) {
  const p = st.pop(); if (seen[p]) continue; seen[p] = 1;
  if (!isBg(p)) continue;
  data[p * 4 + 3] = 0;
  const x = p % w, y = (p / w) | 0;
  if (x > 0) st.push(p - 1); if (x < w - 1) st.push(p + 1); if (y > 0) st.push(p - w); if (y < h - 1) st.push(p + w);
}
// 被圍住的棋盤格空洞（梁柱之間、樹下）：大片相連的淺灰／白色一律視為背景；小白花等面積小，不受影響
{
  const vis = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    if (vis[p] || !data[p * 4 + 3] || !isBg(p)) continue;
    const reg = [], q = [p]; vis[p] = 1;
    while (q.length) { const c = q.pop(); reg.push(c); const x = c % w; for (const d of [x > 0 ? c - 1 : -1, x < w - 1 ? c + 1 : -1, c - w, c + w]) if (d >= 0 && d < w * h && !vis[d] && data[d * 4 + 3] && isBg(d)) { vis[d] = 1; q.push(d); } }
    if (reg.length > 1500) for (const c of reg) data[c * 4 + 3] = 0;
  }
}
// 邊緣殘留的淺色雜點（與背景相鄰、偏亮偏灰）一併清掉
for (let p = 0; p < w * h; p++) if (data[p * 4 + 3] && isBg(p)) {
  const x = p % w, y = (p / w) | 0;
  if ([p - 1, p + 1, p - w, p + w].some((q) => q >= 0 && q < w * h && !data[q * 4 + 3])) data[p * 4 + 3] = 0;
}
// 浮水印、格線殘下的零星小點：面積太小的不相連區塊清掉
const lab = new Int32Array(w * h), sizes = [0];
for (let p = 0; p < w * h; p++) {
  if (lab[p] || !data[p * 4 + 3]) continue;
  const id = sizes.length, q = [p]; let n = 0; lab[p] = id;
  while (q.length) { const c = q.pop(); n++; const x = c % w; for (const d of [x > 0 ? c - 1 : -1, x < w - 1 ? c + 1 : -1, c - w, c + w]) if (d >= 0 && d < w * h && !lab[d] && data[d * 4 + 3]) { lab[d] = id; q.push(d); } }
  sizes.push(n);
}
for (let p = 0; p < w * h; p++) if (data[p * 4 + 3] && sizes[lab[p]] < 300) data[p * 4 + 3] = 0;
let l = w, t = h, r = -1, b = -1;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3]) { l = Math.min(l, x); t = Math.min(t, y); r = Math.max(r, x); b = Math.max(b, y); }
const W = r - l + 1, H = b - t + 1, o = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) data.copy(o, y * W * 4, ((t + y) * w + l) * 4, ((t + y) * w + l + W) * 4);
fs.writeFileSync(out, encode(W, H, o));
console.log(out, W + '×' + H, '裁切起點', l, t);
