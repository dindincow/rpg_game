// 從一張素材圖依座標裁出各個物件（底色若是半透明模糊背景，alpha 過半才保留）
// 用法：node crop_parts.js <來源.png> <輸出資料夾> <名稱>=<左>,<上>,<右>,<下>[@縮放] ...（預設縮放 0.5）
const fs = require('fs'), path = require('path');
const { decode } = require('./png.js');
const { encode, sample } = require('./convert_chars.js');

const [src, outDir, ...parts] = process.argv.slice(2);
const img = decode(src);
fs.mkdirSync(outDir, { recursive: true });
for (const p of parts) {
  const [name, spec] = p.split('='), [box, sc = '0.5'] = spec.split('@'), [l, t, r, b] = box.split(',').map(Number), S = +sc;
  const w = Math.ceil((r - l) * S), h = Math.ceil((b - t) * S);
  fs.writeFileSync(path.join(outDir, name + '.png'), encode(w, h, sample(img, l, t, 1 / S, w, h, [l, t, r, b], true)));
  console.log(name, w + '×' + h);
}
