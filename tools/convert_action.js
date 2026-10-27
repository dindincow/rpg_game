// 把「左側方向標籤＋上方格號」的動作表（例如拔草）切成遊戲用的動作圖（8×4 格、每格 86×86，列順序同行走圖：下、上、左、右）
// 用法：node convert_action.js <來源.png> <輸出.png> [來源列順序，預設 下左右上]
// 每列以第 1 格（站姿）定錨：之後各格沿用同一個腳底與身體中心，蹲下、起身才不會左右亂跳
const fs = require('fs');
const { decode } = require('./png.js');
const { encode, sample } = require('./convert_chars.js');

// HD=3：輸出 3 倍解析度的圖格（每格 258），遊戲內縮回原大小畫，細節較清楚（主角用）
const HD = +(process.env.HD || 1);
const FW = 86 * HD, FOOT_Y = 77 * HD, TARGET_H = (+process.env.TARGET_H || 67) * HD;
// 左側標籤欄寬、每列上方格號的高度（格號在下方的圖設 NUM_H=0，下方格號會因高度太小自動略過）
const COLS = +(process.env.COLS || 8); // 每列幾格
const OPA = 128, LABEL_W = +(process.env.LABEL_W || 158), NUM_H = +(process.env.NUM_H ?? 48);

const [src, out, order = '下左右上'] = process.argv.slice(2);
const img = decode(src);
const opaque = (x, y) => img.data[(y * img.w + x) * 4 + 3] >= OPA;

// 以全透明的橫列切出 4 列
const prof = Array.from({ length: img.h }, (_, y) => { let n = 0; for (let x = LABEL_W; x < img.w; x++) if (opaque(x, y)) n++; return n; });
const rows = []; let s = -1;
for (let y = 0; y <= img.h; y++) { if (y < img.h && prof[y]) { if (s < 0) s = y; } else if (s >= 0) { if (y - s > 100) rows.push([s, y]); s = -1; } }
// 下方若還有其他動作（待機、跑步等），只取最上面 4 列
if (rows.length < 4) throw new Error('應有 4 列，找到 ' + rows.length);
rows.length = 4;
// 欄：去掉左右空白後均分 8 格
let x0 = LABEL_W, x1 = img.w;
while (x1 > x0 && !rows.some(([a, b]) => { for (let y = a; y < b; y++) if (opaque(x1 - 1, y)) return true; return false; })) x1--;
// 沒有左側標籤欄的圖（LABEL_W=0）從最左邊的人物開始均分
if (!LABEL_W) while (x0 < x1 && !rows.some(([a, b]) => { for (let y = a; y < b; y++) if (opaque(x0, y)) return true; return false; })) x0++;
const cw = (x1 - x0) / COLS;

function bbox(c) {
  let l = 1e9, t = 1e9, r = -1, b = -1;
  for (let y = c[1]; y < c[3]; y++) for (let x = c[0]; x < c[2]; x++) if (opaque(x, y)) { l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y); }
  return r < 0 ? null : [l, t, r + 1, b + 1];
}
const cells = rows.map(([ry0, ry1]) => Array.from({ length: COLS }, (_, i) => {
  const clip = [Math.round(x0 + i * cw) + 3, ry0 + NUM_H, Math.round(x0 + (i + 1) * cw) - 3, ry1];
  return { clip, bb: bbox(clip) };
}));
// 去掉縮小後殘留的零星雜點（小於 8 像素的連通塊）
function despeck(tile) {
  const seen = new Uint8Array(FW * FW);
  for (let i = 0; i < FW * FW; i++) {
    if (seen[i] || !tile[i * 4 + 3]) continue;
    const comp = [i], stack = [i]; seen[i] = 1;
    while (stack.length) {
      const k = stack.pop(), x = k % FW, y = (k / FW) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, n = ny * FW + nx;
        if (nx < 0 || ny < 0 || nx >= FW || ny >= FW || seen[n] || !tile[n * 4 + 3]) continue;
        seen[n] = 1; comp.push(n); stack.push(n);
      }
    }
    if (comp.length < 8) for (const k of comp) tile[k * 4 + 3] = 0;
  }
}
// 縮放：以第 1 列第 1 格（正面站姿）的身高對齊行走圖
const stand = cells[0][0].bb, step = (stand[3] - stand[1]) / TARGET_H;
const DIRS = '下上左右', sheet = Buffer.alloc(FW * COLS * FW * 4 * 4);
for (let ri = 0; ri < 4; ri++) {
  const row = cells[order.indexOf(DIRS[ri])], a = row[0];
  const ax = (a.bb[0] + a.bb[2]) / 2 - a.clip[0], foot = a.bb[3] - a.clip[1];
  row.forEach((f, ci) => {
    // ANCHOR=each：格子間距不均時，每格以自己的身體中心置中（腳底仍沿用第 1 格）
    const cx = process.env.ANCHOR === 'each' && f.bb ? (f.bb[0] + f.bb[2]) / 2 : f.clip[0] + ax;
    const tile = sample(img, cx - (FW / 2) * step, f.clip[1] + foot - FOOT_Y * step, step, FW, FW, f.clip, true);
    despeck(tile);
    for (let y = 0; y < FW; y++) tile.copy(sheet, ((ri * FW + y) * FW * COLS + ci * FW) * 4, y * FW * 4, (y + 1) * FW * 4);
  });
}
fs.writeFileSync(out, encode(FW * COLS, FW * 4, sheet));
console.log('ok', out, 'scale 1/' + step.toFixed(2));
