// 把 ChatGPT 產生的「行走圖＋半身像」轉成遊戲用的行走圖（8×4 格）與頭像
// 用法：node convert_chars.js <輸出資料夾> <來源.png>=<id>[:walk|face] ...
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const { decode } = require('./png.js');

function crc32(buf) {
  let c, table = crc32.t || (crc32.t = Array.from({ length: 256 }, (_, n) => { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; }));
  let crc = 0xffffffff; for (const b of buf) crc = table[(crc ^ b) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0;
}
function encode(w, h, rgba) {
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const OPA = 128;
function runs(profile, minGap, thr = 0) {
  const out = []; let s = -1, gap = 0;
  for (let i = 0; i < profile.length; i++) {
    if (profile[i] > thr) { if (s < 0) s = i; gap = 0; }
    else if (s >= 0 && ++gap >= minGap) { out.push([s, i - gap + 1]); s = -1; gap = 0; }
  }
  if (s >= 0) out.push([s, profile.length]);
  return out;
}
// 以面積平均縮放；alpha 過半才保留，維持清楚的像素邊緣
function sample(img, x0, y0, step, ow, oh, clip, hard) {
  const { w, data } = img, out = Buffer.alloc(ow * oh * 4);
  for (let ty = 0; ty < oh; ty++) for (let tx = 0; tx < ow; tx++) {
    const sx0 = x0 + tx * step, sy0 = y0 + ty * step;
    let a = 0, r = 0, g = 0, b = 0, n = 0;
    for (let sy = Math.floor(sy0); sy < Math.ceil(sy0 + step); sy++) for (let sx = Math.floor(sx0); sx < Math.ceil(sx0 + step); sx++) {
      n++;
      if (sx < clip[0] || sx >= clip[2] || sy < clip[1] || sy >= clip[3]) continue;
      const k = (sy * w + sx) * 4, al = data[k + 3] / 255;
      a += al; r += data[k] * al; g += data[k + 1] * al; b += data[k + 2] * al;
    }
    const o = (ty * ow + tx) * 4, av = n ? a / n : 0;
    if (a > 0 && (hard ? av >= 0.5 : av > 0.02)) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; out[o + 3] = hard ? 255 : Math.min(255, av * 255); }
  }
  return out;
}
function opaqueAt(img, x, y) { return img.data[(y * img.w + x) * 4 + 3] >= OPA; }
function bbox(img, x0, y0, x1, y1) {
  let l = 1e9, t = 1e9, r = -1, b = -1;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (opaqueAt(img, x, y)) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
  return r < 0 ? null : [l, t, r + 1, b + 1];
}
function headCenter(img, bb, frac) {
  const [l, t, r, b] = bb, y1 = t + (b - t) * frac; let sx = 0, n = 0;
  for (let y = t; y < y1; y++) for (let x = l; x < r; x++) if (opaqueAt(img, x, y)) { sx += x; n++; }
  return n ? sx / n : (l + r) / 2;
}

// TARGET_H：正面行走時人物在格內的高度；可用環境變數 TARGET_H 指定（主角約 67）
// 銳利化（原圖是大張插畫縮小時會偏糊）：環境變數 SHARPEN=強度（約 0.5–1）；並替人物外圍補一圈深色描邊
function sharpen(buf, w, h, amt) {
  const src = Buffer.from(buf), op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = (y * w + x) * 4; if (!src[k + 3]) continue;
    for (let c = 0; c < 3; c++) {
      let s = 0, n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (op(x + dx, y + dy)) { s += src[((y + dy) * w + x + dx) * 4 + c]; n++; }
      if (n) buf[k + c] = Math.max(0, Math.min(255, src[k + c] + amt * (src[k + c] - s / n)));
    }
    // 邊緣像素壓暗，形成描邊
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => op(x + dx, y + dy))) for (let c = 0; c < 3; c++) buf[k + c] = buf[k + c] * 0.45;
  }
}
// HD=3：輸出 3 倍解析度的圖格（每格 258），遊戲內縮回原大小畫，細節較清楚（主角用）
const HD = +(process.env.HD || 1);
const FW = 86 * HD, FOOT_Y = 78 * HD, TARGET_H = (+process.env.TARGET_H || 70) * HD;
function convertWalk(img, outFile) {
  // 1) 找出 4 列：只看上半部（半身像之前）
  const prof = new Array(img.h).fill(0);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x += 2) if (opaqueAt(img, x, y)) prof[y]++;
  let bands = runs(prof, 2, 3).filter(([a, b]) => b - a > 60);
  const typical = bands.slice(0, 3).reduce((s, [a, b]) => s + b - a, 0) / 3;
  bands = bands.slice(0, 4).map(([a, b]) => [a, Math.min(b, a + Math.round(typical * 1.12))]);
  if (bands.length < 4) throw new Error('找不到 4 列行走圖');
  const frames = [];
  for (const [y0, y1] of bands) {
    const px = new Array(img.w).fill(0);
    for (let y = y0; y < y1; y++) for (let x = 0; x < img.w; x++) if (opaqueAt(img, x, y)) px[x]++;
    let cols = runs(px, 4, 1);
    while (cols.length > 8) { // 合併間隔最小的兩段（例如漁網、長槍造成的斷開）
      let bi = 0, bg = 1e9; for (let i = 1; i < cols.length; i++) { const g = cols[i][0] - cols[i - 1][1]; if (g < bg) { bg = g; bi = i; } }
      cols.splice(bi - 1, 2, [cols[bi - 1][0], cols[bi][1]]);
    }
    if (cols.length === 7) cols.push(cols[0]); // 只有 7 格時補第一格，湊滿 8 格循環
    else if (cols.length < 8) { const cw = img.w / 8; cols = Array.from({ length: 8 }, (_, i) => [Math.round(i * cw), Math.round((i + 1) * cw)]); }
    frames.push(cols.map(([x0, x1]) => ({ clip: [x0, y0, x1, y1], bb: bbox(img, x0, y0, x1, y1) })));
  }
  const hs = frames[0].map((f) => f.bb[3] - f.bb[1]).sort((a, b) => a - b), medH = hs[hs.length >> 1];
  const step = medH / TARGET_H;
  const sheet = Buffer.alloc(FW * 8 * FW * 4 * 4);
  frames.forEach((row, ri) => row.forEach((f, ci) => {
    const cx = headCenter(img, f.bb, 0.35), foot = f.bb[3];
    const tile = sample(img, cx - (FW / 2) * step, foot - FOOT_Y * step, step, FW, FW, f.clip, true);
    for (let y = 0; y < FW; y++) tile.copy(sheet, ((ri * FW + y) * FW * 8 + ci * FW) * 4, y * FW * 4, (y + 1) * FW * 4);
  }));
  if (process.env.SHARPEN) sharpen(sheet, FW * 8, FW * 4, +process.env.SHARPEN);
  fs.writeFileSync(outFile, encode(FW * 8, FW * 4, sheet));
  return bands[3][1];
}
function convertFace(img, startY, outFile) {
  const bb = bbox(img, 0, startY, img.w, img.h); if (!bb) throw new Error('找不到半身像');
  const hgt = img.h - bb[1], S = Math.min(img.w, Math.round(hgt * 0.62)), cx = headCenter(img, bb, 0.3);
  const x0 = Math.max(0, Math.min(img.w - S, cx - S / 2)), y0 = bb[1] - S * 0.04, OS = 256;
  fs.writeFileSync(outFile, encode(OS, OS, sample(img, x0, y0, S / OS, OS, OS, [0, startY, img.w, img.h], false)));
}

module.exports = { encode, sample };
if (require.main === module) {
  const [outDir, ...jobs] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  for (const job of jobs) {
    const [src, spec] = job.split('='), [id, only] = spec.split(':');
    const img = decode(src);
    let after = 0;
    if (only !== 'face') after = convertWalk(img, path.join(outDir, id + '_walk.png'));
    if (only !== 'walk') convertFace(img, after, path.join(outDir, id + '_face.png'));
    console.log('ok', id, path.basename(src));
  }
}
