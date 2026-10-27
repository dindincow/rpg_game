// 借用現有角色的行走圖，只替換衣服顏色，產生新角色（臉和頭髮保持原樣）
// 用法：node recolor.js <來源_walk.png> <輸出_walk.png> <#衣服顏色>
const fs = require('fs');
const { decode } = require('./png.js');
const { encode } = require('./convert_chars.js');
const [src, out, hex] = process.argv.slice(2);
const img = decode(src), p = img.data, n = parseInt(hex.slice(1), 16), tr = n >> 16, tg = (n >> 8) & 255, tb = n & 255;
for (let i = 0; i < p.length; i += 4) {
  if (p[i + 3] < 10) continue;
  const r = p[i], g = p[i + 1], b = p[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const skin = r > g && g > b && r - b > 40 && r > 150;
  if (skin || mx - mn < 28 || mx < 45) continue;
  const l = (r * 0.3 + g * 0.59 + b * 0.11) / 128;
  p[i] = Math.min(255, tr * l); p[i + 1] = Math.min(255, tg * l); p[i + 2] = Math.min(255, tb * l);
}
fs.writeFileSync(out, encode(img.w, img.h, p));
console.log(out);
