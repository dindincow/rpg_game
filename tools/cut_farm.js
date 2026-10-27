// 從農田素材圖切出可拼接的作物、圍籬與田邊小物（原尺寸輸出，遊戲內再縮放）
// 用法：node cut_farm.js <農田素材.png> <輸出資料夾>
const fs = require('fs'), path = require('path');
const { decode } = require('./png.js');
const { encode } = require('./convert_chars.js');

// [名稱, x, y, w, h, 是否去背並裁到最小範圍]；作物與圍籬的範圍都量過，左右（上下）相接時無接縫
const PIECES = [
  ['作物_綠', 203, 182, 206, 66, false], ['作物_金', 462, 182, 268, 66, false],
  ['圍籬_橫', 392, 28, 78, 100, false], ['圍籬_直', 880, 140, 70, 113, false],
  ['稻草人', 335, 588, 190, 159, true], ['草堆', 1290, 860, 146, 132, true], ['水桶', 982, 878, 86, 90, true], ['木箱', 1432, 868, 88, 95, true],
];
const [src, outDir] = process.argv.slice(2);
const img = decode(src);
fs.mkdirSync(outDir, { recursive: true });
for (const [name, x, y, w, h, trim] of PIECES) {
  let b = Buffer.alloc(w * h * 4);
  for (let r = 0; r < h; r++) img.data.copy(b, r * w * 4, ((y + r) * img.w + x) * 4, ((y + r) * img.w + x + w) * 4);
  for (let k = 3; k < b.length; k += 4) b[k] = b[k] > 128 ? 255 : 0; // 背景是半透明的模糊底色，一律切成全透明
  let W = w, H = h;
  if (trim) {
    let l = w, t = h, rr = -1, bb = -1;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (b[(yy * w + xx) * 4 + 3]) { l = Math.min(l, xx); t = Math.min(t, yy); rr = Math.max(rr, xx); bb = Math.max(bb, yy); }
    W = rr - l + 1; H = bb - t + 1; const o = Buffer.alloc(W * H * 4);
    for (let r = 0; r < H; r++) b.copy(o, r * W * 4, ((t + r) * w + l) * 4, ((t + r) * w + l + W) * 4);
    b = o;
  }
  fs.writeFileSync(path.join(outDir, name + '.png'), encode(W, H, b));
  console.log(name, W + '×' + H);
}
