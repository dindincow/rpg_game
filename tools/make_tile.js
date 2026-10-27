// 讓地磚可以無縫拼接：拉平每列／每欄的亮度，再把四邊和對邊交叉混合
// 用法：node make_tile.js <來源.png> <輸出.png> [邊緣混合寬度=6]
const fs = require('fs');
const { decode } = require('./png.js');
const { encode } = require('./convert_chars.js');
const [src, out, bw = 6] = process.argv.slice(2);
const { w, h, data } = decode(src), d = Float32Array.from(data);
const lum = (k) => (d[k] + d[k + 1] + d[k + 2]) / 3;
let total = 0; for (let k = 0; k < d.length; k += 4) total += lum(k); const mean = total / (w * h);
for (let pass = 0; pass < 2; pass++) {
  const n = pass ? w : h, m = pass ? h : w;
  for (let i = 0; i < n; i++) {
    let s = 0; for (let j = 0; j < m; j++) s += lum(pass ? (j * w + i) * 4 : (i * w + j) * 4);
    const gain = mean / (s / m);
    for (let j = 0; j < m; j++) { const k = pass ? (j * w + i) * 4 : (i * w + j) * 4; d[k] *= gain; d[k + 1] *= gain; d[k + 2] *= gain; }
  }
}
// 邊緣交叉混合（左右、上下）
const B = +bw, src2 = Float32Array.from(d);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const k = (y * w + x) * 4;
  let tx = x < B ? 0.5 - 0.5 * x / B : x >= w - B ? 0.5 - 0.5 * (w - 1 - x) / B : 0;
  let ty = y < B ? 0.5 - 0.5 * y / B : y >= h - B ? 0.5 - 0.5 * (h - 1 - y) / B : 0;
  const kx = (y * w + (w - 1 - x)) * 4, ky = ((h - 1 - y) * w + x) * 4;
  for (let c = 0; c < 3; c++) {
    let v = src2[k + c];
    if (tx) v = v * (1 - tx) + src2[kx + c] * tx;
    if (ty) v = v * (1 - ty) + src2[ky + c] * ty;
    d[k + c] = v;
  }
}
const o = Buffer.alloc(d.length); for (let i = 0; i < d.length; i++) o[i] = Math.max(0, Math.min(255, Math.round(d[i])));
fs.writeFileSync(out, encode(w, h, o));
console.log(out);
