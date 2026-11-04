// 清掉 AI 素材總表的去背殘邊：半透明的霧邊直接透明，物件外緣 2px 內的螢光黃／綠／紅／青雜色也挖掉
// 用法：node clean_fringe.js <來源.png> <輸出.png> [不透明門檻=200] [挖邊圈數=2]
// 清好之後再用 cut_blobs.js 切成單一物件
const fs = require('fs');
const { decode } = require('./png.js');
const { encode } = require('./convert_chars.js');
const [src, out, alphaMin = 200, rings = 2] = process.argv.slice(2);
const { w, h, data } = decode(src);
const N = w * h;
for (let i = 0; i < N; i++) if (data[i * 4 + 3] < +alphaMin) data[i * 4 + 3] = 0; else data[i * 4 + 3] = 255;
// 去背殘留的螢光色：飽和度極高、色相落在黃、綠、紅、青
const neon = (k) => {
  const r = data[k], g = data[k + 1], b = data[k + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx - mn < 110) return false;
  return (r > 170 && g > 170 && b < 110) || (g > 170 && r < 130 && b < 130) || (r > 170 && g < 90 && b < 90) || (g > 160 && b > 160 && r < 110);
};
for (let pass = 0; pass < +rings; pass++) {
  const kill = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!data[i * 4 + 3]) continue;
    const edge = (x && !data[(i - 1) * 4 + 3]) || (x < w - 1 && !data[(i + 1) * 4 + 3]) || (y && !data[(i - w) * 4 + 3]) || (y < h - 1 && !data[(i + w) * 4 + 3]);
    if (edge && neon(i * 4)) kill.push(i);
  }
  for (const i of kill) data[i * 4 + 3] = 0;
}
fs.writeFileSync(out, encode(w, h, data));
console.log(`${src} → ${out}`);
