// 把等分格子排列的動畫（例如 4×2 的趴地醒來）切成一條橫排圖條：每格用同一個裁切框，動作之間的相對位置不會跑掉
// 用法：node cut_grid.js <來源.png> <輸出.png> <欄數> <列數> <縮放比例>
const fs = require('fs');
const { decode } = require('./png.js');
const { encode, sample } = require('./convert_chars.js');

const [src, out, cols, rows, scale] = process.argv.slice(2);
const img = decode(src), C = +cols, Rn = +rows, S = +scale, cw = img.w / C, ch = img.h / Rn;
// 所有格子不透明範圍的聯集（以格內座標）
let l = 1e9, t = 1e9, r = -1, b = -1;
for (let j = 0; j < Rn; j++) for (let i = 0; i < C; i++) {
  const x0 = Math.round(i * cw), y0 = Math.round(j * ch);
  for (let y = y0; y < Math.round(y0 + ch); y++) for (let x = x0; x < Math.round(x0 + cw); x++) {
    if (img.data[(y * img.w + x) * 4 + 3] < 128) continue;
    l = Math.min(l, x - x0); r = Math.max(r, x - x0 + 1); t = Math.min(t, y - y0); b = Math.max(b, y - y0 + 1);
  }
}
const fw = Math.ceil((r - l) * S), fh = Math.ceil((b - t) * S), n = C * Rn, strip = Buffer.alloc(fw * n * fh * 4);
for (let k = 0; k < n; k++) {
  const x0 = Math.round((k % C) * cw) + l, y0 = Math.round(Math.floor(k / C) * ch) + t;
  const tile = sample(img, x0, y0, 1 / S, fw, fh, [x0, y0, x0 + (r - l), y0 + (b - t)], true);
  for (let y = 0; y < fh; y++) tile.copy(strip, (y * fw * n + k * fw) * 4, y * fw * 4, (y + 1) * fw * 4);
}
fs.writeFileSync(out, encode(fw * n, fh, strip));
console.log('ok', out, n + ' 格', fw + '×' + fh);
