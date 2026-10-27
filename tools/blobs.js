// 找出圖片中各個不透明區塊（以 4px 為單位做連通標記），供拆解 AI 產生的素材圖使用
const { decode } = require('./png.js');
function blobs(img, cell = 4, thr = 128) {
  const { w, h, data } = img, GW = Math.ceil(w / cell), GH = Math.ceil(h / cell);
  const on = new Uint8Array(GW * GH);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] >= thr) on[((y / cell) | 0) * GW + ((x / cell) | 0)] = 1;
  const lab = new Int32Array(GW * GH).fill(-1), out = [];
  for (let i = 0; i < on.length; i++) {
    if (!on[i] || lab[i] >= 0) continue;
    const id = out.length, st = [i]; lab[i] = id; let l = 1e9, t = 1e9, r = -1, b = -1, n = 0;
    while (st.length) {
      const k = st.pop(), x = k % GW, y = (k / GW) | 0; n++;
      if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const j = ny * GW + nx; if (on[j] && lab[j] < 0) { lab[j] = id; st.push(j); }
      }
    }
    out.push({ l: l * cell, t: t * cell, r: (r + 1) * cell, b: (b + 1) * cell, n: n * cell * cell });
  }
  return out.filter((o) => o.n > 600);
}
module.exports = { blobs };
if (require.main === module) {
  for (const f of process.argv.slice(2)) {
    const bs = blobs(decode(f)).sort((a, b) => b.n - a.n);
    console.log(f, bs.length + ' blobs');
    for (const o of bs.slice(0, 3)) console.log('  big', o.l, o.t, o.r, o.b, (o.r - o.l) + 'x' + (o.b - o.t));
    const small = bs.slice(2).sort((a, b) => a.t - b.t || a.l - b.l);
    console.log('  small sizes', small.map((o) => `${o.l},${o.t} ${o.r - o.l}x${o.b - o.t}`).join(' | '));
  }
}
