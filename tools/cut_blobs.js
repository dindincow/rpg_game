// 把透明背景的素材總表切成一個個物件：以不透明像素的連通塊分組（近距離的碎塊會併進同一個物件）
// 用法：node cut_blobs.js <來源.png> <輸出資料夾> [最小面積=400] [合併距離=6] [不透明門檻=40]
// 背景是半透明霧面（例如 alpha 100–190）的總表，門檻調高到 230 左右，只留下實心的物件
// 輸出 <資料夾>/NN.png 與 index.json（每個物件在原圖的範圍），方便之後挑選命名
const fs = require('fs');
const { decode } = require('./png.js');
const { encode } = require('./convert_chars.js');
const [src, dir, minArea = 400, gap = 6, alphaMin = 40] = process.argv.slice(2);
const img = decode(src), { w, h, data } = img;
const op = new Uint8Array(w * h);
for (let i = 0; i < w * h; i++) op[i] = data[i * 4 + 3] >= +alphaMin ? 1 : 0;
// 先把不透明區膨脹 gap 像素，讓相鄰的碎塊連成一塊
const g = +gap, dil = new Uint8Array(w * h);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (op[y * w + x])
  for (let dy = -g; dy <= g; dy++) for (let dx = -g; dx <= g; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h) dil[Y * w + X] = 1; }
const lab = new Int32Array(w * h).fill(-1), boxes = [];
for (let i = 0; i < w * h; i++) {
  if (!dil[i] || lab[i] >= 0) continue;
  const id = boxes.length, st = [i]; let l = w, t = h, r = 0, b = 0, n = 0; lab[i] = id;
  while (st.length) {
    const k = st.pop(), x = k % w, y = (k / w) | 0;
    if (op[k]) { n++; if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
    for (const q of [k - 1, k + 1, k - w, k + w]) if (q >= 0 && q < w * h && dil[q] && lab[q] < 0 && Math.abs((q % w) - x) <= 1) { lab[q] = id; st.push(q); }
  }
  boxes.push({ id, l, t, r: r + 1, b: b + 1, n });
}
fs.mkdirSync(dir, { recursive: true });
const keep = boxes.filter((o) => o.n >= +minArea).sort((a, b) => a.t - b.t || a.l - b.l), index = [];
keep.forEach((o, k) => {
  const ow = o.r - o.l, oh = o.b - o.t, out = Buffer.alloc(ow * oh * 4);
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
    const i = (o.t + y) * w + o.l + x; if (lab[i] !== o.id) continue;
    if (!op[i]) continue;
    data.copy(out, (y * ow + x) * 4, i * 4, i * 4 + 4);
  }
  const name = String(k).padStart(2, '0');
  fs.writeFileSync(`${dir}/${name}.png`, encode(ow, oh, out));
  index.push({ name, box: [o.l, o.t, o.r, o.b] });
});
fs.writeFileSync(`${dir}/index.json`, JSON.stringify(index, null, 1));
console.log(`${keep.length} 個物件 → ${dir}`);
