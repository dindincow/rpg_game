// 去掉單色背景（從圖片四周往內填滿，只挖掉和邊緣相連的背景色，物件內部同色的地方會保留）
// 用法：node remove_bg.js <來源.png> <輸出.png> [容許色差=24]
const fs = require('fs');
const { decode } = require('./png.js');
const { encode } = require('./convert_chars.js');
const [src, out, tol = 24] = process.argv.slice(2);
const { w, h, data } = decode(src), bg = [data[0], data[1], data[2]];
const near = (k) => Math.abs(data[k] - bg[0]) + Math.abs(data[k + 1] - bg[1]) + Math.abs(data[k + 2] - bg[2]) <= +tol;
const seen = new Uint8Array(w * h), st = [];
for (let x = 0; x < w; x++) st.push(x, (h - 1) * w + x);
for (let y = 0; y < h; y++) st.push(y * w, y * w + w - 1);
while (st.length) {
  const i = st.pop(); if (seen[i]) continue; seen[i] = 1;
  if (!near(i * 4)) continue;
  data[i * 4 + 3] = 0;
  const x = i % w, y = (i / w) | 0;
  if (x > 0) st.push(i - 1); if (x < w - 1) st.push(i + 1); if (y > 0) st.push(i - w); if (y < h - 1) st.push(i + w);
}
fs.writeFileSync(out, encode(w, h, data));
console.log(out, '背景色', bg.join(','));
