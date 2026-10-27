// 把 AI 產生的怪物／敵人素材（特寫＋行走圖＋戰鬥姿勢，排版不固定）拆成遊戲用的檔案：
//   <id>_face.png 256×256、<id>_battle.png（面向右）、<id>_walk.png（每格 96×96、8×4：下、上、左、右）
// 用法：node convert_monsters.js <輸出資料夾> <來源.png>=<id>:<戰鬥圖高度>:<地圖高度>[:<左列>,<右列>] ...
//   左列／右列：原圖中朝左、朝右的是第幾列（0 起算），寫 m3 表示「把第 3 列左右翻轉」
const fs = require('fs'), path = require('path');
const { decode } = require('./png.js');
const { blobs } = require('./blobs.js');
const { encode, sample } = require('./convert_chars.js');

const MW = 96, MFOOT = 87;
function frameRows(frames) {
  frames.sort((a, b) => (a.t + a.b) / 2 - (b.t + b.b) / 2);
  const medH = frames.map((f) => f.b - f.t).sort((a, b) => a - b)[frames.length >> 1];
  const rows = [];
  for (const f of frames) {
    const cy = (f.t + f.b) / 2, row = rows.find((r) => Math.abs(r.cy - cy) < medH * 0.45);
    if (row) row.f.push(f); else rows.push({ cy, f: [f] });
  }
  return rows.map((r) => r.f.sort((a, b) => a.l - b.l));
}
function writeImage(file, w, h, buf) { fs.writeFileSync(file, encode(w, h, buf)); }
function mirror(buf, w, h) {
  const out = Buffer.alloc(buf.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) buf.copy(out, (y * w + (w - 1 - x)) * 4, (y * w + x) * 4, (y * w + x) * 4 + 4);
  return out;
}

function convert(src, id, battleH, mapH, sides, outDir) {
  const img = decode(src), bs = blobs(img).sort((a, b) => b.n - a.n);
  const [bigA, bigB] = bs;
  const [bust, battle] = bigA.t < bigB.t ? [bigA, bigB] : [bigB, bigA];
  // 頭像：取特寫區塊的正方形
  {
    const S = Math.max(bust.r - bust.l, bust.b - bust.t), cx = (bust.l + bust.r) / 2, cy = (bust.t + bust.b) / 2;
    writeImage(path.join(outDir, id + '_face.png'), 256, 256, sample(img, cx - S / 2, cy - S / 2, S / 256, 256, 256, [bust.l, bust.t, bust.r, bust.b], false));
  }
  // 戰鬥圖：裁掉空白、縮放到指定高度（周圍飄散的碎片一起納入）
  {
    let { l, t, r, b } = battle;
    for (const o of bs) if (o !== battle && o !== bust && o.l >= battle.l - 80 && o.r <= battle.r + 80 && o.t >= battle.t - 80 && o.b <= battle.b + 80) { l = Math.min(l, o.l); t = Math.min(t, o.t); r = Math.max(r, o.r); b = Math.max(b, o.b); }
    const step = (b - t) / battleH, W = Math.round((r - l) / step);
    writeImage(path.join(outDir, id + '_battle.png'), W, battleH, sample(img, l, t, step, W, battleH, [l, t, r, b], true));
  }
  // 行走圖：其餘大小相近的區塊就是一格一格的畫格
  const rest = bs.filter((o) => o !== bust && o !== battle);
  const medN = rest.map((o) => o.n).sort((a, b) => a - b)[rest.length >> 1];
  const frames = rest.filter((o) => o.n > medN * 0.35 && !(o.l >= battle.l - 10 && o.r <= battle.r + 10 && o.t >= battle.t - 10 && o.b <= battle.b + 10));
  // 相鄰畫格黏在一起時，依寬度切開（在透明像素最少處下刀）
  const rowMedW = new Map();
  // 一整列都黏成一塊時，改用其他正常列的畫格寬度當基準
  const allRows = frameRows([...frames]), okW = allRows.filter((r) => r.length >= 4).flatMap((r) => r.map((f) => f.r - f.l)).sort((a, b) => a - b);
  const refW = okW[okW.length >> 1];
  for (const row of allRows) { const ws = row.map((f) => f.r - f.l).sort((a, b) => a - b); for (const f of row) rowMedW.set(f, row.length >= 4 ? ws[ws.length >> 1] : refW); }
  for (const f of [...frames]) {
    const k = Math.round((f.r - f.l) / rowMedW.get(f)); if (k < 2) continue;
    frames.splice(frames.indexOf(f), 1);
    let x0 = f.l;
    for (let i = 1; i <= k; i++) {
      let cut = i === k ? f.r : Math.round(f.l + (f.r - f.l) * i / k), best = 1e9;
      if (i < k) for (let x = cut - 12; x <= cut + 12; x++) {
        let c = 0; for (let y = f.t; y < f.b; y++) if (img.data[(y * img.w + x) * 4 + 3] >= 128) c++;
        if (c < best) { best = c; cut = x; }
      }
      let t = 1e9, b = -1;
      for (let y = f.t; y < f.b; y++) for (let x = x0; x < cut; x++) if (img.data[(y * img.w + x) * 4 + 3] >= 128) { if (y < t) t = y; if (y > b) b = y; }
      frames.push({ l: x0, r: cut, t, b: b + 1 }); x0 = cut;
    }
  }
  const rows = frameRows(frames);
  if (rows.length < 4) throw new Error(`${id}: 只找到 ${rows.length} 列行走圖`);
  const front = rows[0].map((f) => f.b - f.t).sort((a, b) => a - b), step = front[front.length >> 1] / mapH;
  const tile = (f) => sample(img, (f.l + f.r) / 2 - (MW / 2) * step, f.b - MFOOT * step, step, MW, MW, [f.l - 2, f.t - 2, f.r + 2, f.b + 2], true);
  const rowTiles = (spec) => {
    const flip = spec.startsWith('m'), r = rows[+spec.replace('m', '')];
    return Array.from({ length: 8 }, (_, i) => { const t = tile(r[i % r.length]); return flip ? mirror(t, MW, MW) : t; });
  };
  const [L, R] = sides || ['2', '3'];
  const out = [rowTiles('0'), rowTiles('1'), rowTiles(L), rowTiles(R)];
  const sheet = Buffer.alloc(MW * 8 * MW * 4 * 4);
  out.forEach((row, ri) => row.forEach((t, ci) => { for (let y = 0; y < MW; y++) t.copy(sheet, ((ri * MW + y) * MW * 8 + ci * MW) * 4, y * MW * 4, (y + 1) * MW * 4); }));
  writeImage(path.join(outDir, id + '_walk.png'), MW * 8, MW * 4, sheet);
  console.log('ok', id, 'rows', rows.map((r) => r.length).join('/'));
}

if (require.main === module) {
  const [outDir, ...jobs] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  for (const job of jobs) {
    const [src, spec] = job.split('='), [id, bh, mh, sides] = spec.split(':');
    convert(src, id, +bh, +mh, sides && sides.split(','), outDir);
  }
}
