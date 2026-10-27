// 把去背的建築圖裁掉透明邊並縮放成遊戲用大小
// 用法：node convert_building.js <來源.png> <輸出.png> <縮放比例>
const fs = require('fs');
const { decode } = require('./png.js');
const { encode, sample } = require('./convert_chars.js');

const [src, out, scale] = process.argv.slice(2);
const img = decode(src), { w, h, data } = img;
let l = w, t = h, r = 0, b = 0;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 40) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
const step = 1 / +scale, ow = Math.round((r - l + 1) / step), oh = Math.round((b - t + 1) / step);
fs.writeFileSync(out, encode(ow, oh, sample(img, l, t, step, ow, oh, [l, t, r + 1, b + 1], false)));
console.log(out, ow + 'x' + oh);
