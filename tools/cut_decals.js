// 把一整張「散放的小物件」切成一個個檔案：靠得很近的碎塊（例如一撮小石子）會合成同一個物件
// 用法：node cut_decals.js <來源.png> <輸出資料夾> <檔名前綴> <縮放比例> [合併距離=14]
const fs = require('fs'), path = require('path');
const { decode } = require('./png.js');
const { blobs } = require('./blobs.js');
const { encode, sample } = require('./convert_chars.js');

const [src, outDir, prefix, scale, gap = 14] = process.argv.slice(2);
const img = decode(src);
// 清掉幾乎透明的雜色邊
for (let i = 3; i < img.data.length; i += 4) if (img.data[i] < 40) img.data[i - 3] = img.data[i - 2] = img.data[i - 1] = img.data[i] = 0;
let groups = blobs(img, 2, 150).map((b) => ({ ...b }));
const near = (a, b) => a.l - gap < b.r && b.l - gap < a.r && a.t - gap < b.b && b.t - gap < a.b;
for (let merged = true; merged;) {
  merged = false;
  for (let i = 0; i < groups.length && !merged; i++) for (let j = i + 1; j < groups.length; j++) if (near(groups[i], groups[j])) {
    const a = groups[i], b = groups[j];
    groups[i] = { l: Math.min(a.l, b.l), t: Math.min(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b), n: a.n + b.n };
    groups.splice(j, 1); merged = true; break;
  }
}
groups.sort((a, b) => a.t - b.t || a.l - b.l);
fs.mkdirSync(outDir, { recursive: true });
const step = 1 / +scale;
groups.forEach((g, i) => {
  const ow = Math.max(1, Math.round((g.r - g.l) / step)), oh = Math.max(1, Math.round((g.b - g.t) / step));
  const file = path.join(outDir, `${prefix}_${String(i + 1).padStart(2, '0')}.png`);
  fs.writeFileSync(file, encode(ow, oh, sample(img, g.l, g.t, step, ow, oh, [g.l, g.t, g.r, g.b], false)));
  console.log(file, ow + 'x' + oh);
});
