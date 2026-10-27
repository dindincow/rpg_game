'use strict';
// 採集點：藥草、礦石共用一套。各地圖建好後把採集點放進 G.gather：{ kind, x, y, key, sprite, imgs: [可採, 採過] }
// 每處每天能採一次（F()[key] 記下採集的日子）
const GATHER_KINDS = {
  herb: { time: 20, name: '止血草', item: 'herb', spec: 'herbal', bonus: 'herbChance', art: '止血草', text: '#b8f090', bits: ['#6aa83e', '#c0402a'],
    unknown: '（路旁長著一叢開著小花的野草。看起來像是藥草，可你認不出是哪一種。）', done: '這叢止血草今天已經採過了，過一兩天才會再長出來。' },
  longcao: { time: 20, name: '延龍草', item: 'longcao', spec: 'herbal', bonus: 'herbChance', art: '延龍草', text: '#a8c8ff', bits: ['#6aa83e', '#7a90e0'],
    unknown: '（路旁長著一叢開著小花的野草。看起來像是藥草，可你認不出是哪一種。）', done: '這叢延龍草今天已經採過了，過一兩天才會再長出來。' },
  wood: { time: 40, name: '木材', item: 'wood', spec: 'logging', bonus: 'woodChance', amount: 2, text: '#e8c890', bits: ['#8a5a30', '#6a9a3a'],
    unknown: '（一棵長得歪斜的老樹，砍了正好。可惜手邊沒有柴刀。）', done: '這棵樹今天已經砍過了，樹樁還冒著新鮮的木香。' },
  iron: { time: 60, name: '鐵礦石', item: 'iron_ore', spec: 'mining', bonus: 'oreChance', extra: ['stone', 1], text: '#e8b088', bits: ['#8a857a', '#c0703a'], fleck: ['#a0502a', '#d08048'],
    unknown: '（岩堆裡嵌著帶鏽色的石塊。徒手敲不下來，得有把趁手的工具。）', done: '這處礦脈今天已經敲過了，碎石還沒清開。' },
  coal: { time: 60, name: '煤炭', item: 'coal', spec: 'mining', bonus: 'oreChance', extra: ['stone', 1], text: '#c8c8d0', bits: ['#8a857a', '#2a2a30'], fleck: ['#18181c', '#3a3a44'],
    unknown: '（岩堆裡夾著一層烏黑發亮的石頭。徒手敲不下來，得有把趁手的工具。）', done: '這處煤層今天已經挖過了。' },
};
const HERB_ART = {};
const gatherDone = (n) => F()[n.key] === S.day;
// 藥草圖：第 stage 階段（0 = 剛冒芽，7 = 開滿花）；錨點在土堆底部
function makeHerb(kind, stage) {
  const src = HERB_ART[GATHER_KINDS[kind].art], fw = src.width / 8, [c, g] = canvas(fw, src.height);
  g.drawImage(src, stage * fw, 0, fw, src.height, 0, 0, fw, src.height);
  return { img: c, ax: fw / 2, ay: src.height - 4 };
}
// 礦石圖：在岩堆上點出礦脈色斑（source-atop 只畫在岩石上）；採過的岩堆變暗、沒有礦斑
function makeOre(kind, rock, seed) {
  const K = GATHER_KINDS[kind], R = rng(seed), mk = (ore) => {
    const [c, g] = canvas(rock.width, rock.height);
    if (!ore) g.filter = 'brightness(.7) saturate(.6)';
    g.drawImage(rock, 0, 0); g.filter = 'none';
    if (ore) {
      g.globalCompositeOperation = 'source-atop';
      for (let i = 0; i < 9; i++) {
        const x = rock.width * (0.2 + R() * 0.6), y = rock.height * (0.25 + R() * 0.55);
        g.fillStyle = K.fleck[0]; g.fillRect(x | 0, y | 0, 4, 3); g.fillStyle = K.fleck[1]; g.fillRect(x | 0, y | 0, 2, 1);
      }
    }
    return c;
  };
  return { imgs: [mk(true), mk(false)], ax: rock.width / 2, ay: rock.height - 3 };
}
// 可砍的樹：枯黃的老松（跟森林裡的綠樹一眼就分得出來），砍倒後剩下樹樁（畫在同一張圖的腳點上，錨點不變）
function makeChopTree(R) {
  const t0 = decorTree('pine', R), [tc, tg] = canvas(t0.img.width, t0.img.height);
  tg.filter = 'sepia(.75) saturate(.8) brightness(.9) hue-rotate(-8deg)'; tg.drawImage(t0.img, 0, 0);
  const t = { ...t0, img: tc }, [c, g] = canvas(t.img.width, t.img.height), cx = t.ax, by = t.ay;
  g.fillStyle = '#00000040'; g.beginPath(); g.ellipse(cx, by - 2, 16, 5, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#4a2e18'; g.fillRect(cx - 11, by - 14, 22, 12); g.fillStyle = '#6a4424'; g.fillRect(cx - 9, by - 14, 18, 10);
  g.fillStyle = '#c89a5a'; g.beginPath(); g.ellipse(cx, by - 14, 11, 4, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#9a7040'; g.lineWidth = 1; g.beginPath(); g.ellipse(cx, by - 14, 6, 2, 0, 0, Math.PI * 2); g.stroke();
  return { imgs: [t.img, c], ax: t.ax, ay: t.ay };
}
function addGather(Gm, addSprite, kind, x, y, key, art) {
  const s = addSprite({ img: art.imgs[0], ax: art.ax, ay: art.ay }, x, y);
  (Gm.gather || (Gm.gather = [])).push({ kind, x, y, key, sprite: s, imgs: art.imgs });
}
function applyGather(Gm) { for (const n of Gm.gather || []) n.sprite.img = n.imgs[gatherDone(n) ? 1 : 0]; }
function gatherInteractables() {
  return (G.gather || []).map((n) => ({ x: n.x, y: n.y, r: 45, name: GATHER_KINDS[n.kind].name, act: () => startGather(n), spark: () => !gatherDone(n) }));
}
function startGather(n) {
  const K = GATHER_KINDS[n.kind];
  if (gatherDone(n)) return talk([K.done]);
  if (!S.specs[K.spec]) return talk([K.unknown]);
  player.dir = Math.abs(n.x - player.x) > Math.abs(n.y - player.y) ? (n.x < player.x ? 2 : 3) : (n.y < player.y ? 1 : 0);
  keys.clear(); gathering = { n, t: 0, dur: 1.5, leaf: 0 };
}
// 採集動畫：目標晃動、碎屑飛散、頭上進度圈，結束時採到的東西浮起消失
function updateGather(dt) {
  const g = gathering, n = g.n, s = n.sprite, K = GATHER_KINDS[n.kind];
  g.t += dt; s.x = n.x + Math.round(Math.sin(g.t * 38) * 1.5);
  if ((g.leaf -= dt) <= 0) {
    g.leaf = 0.12;
    const vx = (Math.random() - 0.5) * 70, vy = -40 - Math.random() * 40, col = K.bits[Math.random() < 0.7 ? 0 : 1];
    worldFx.push({ t: 0, dur: 0.7, draw: (p) => { ctx.fillStyle = col; ctx.globalAlpha = 1 - p; ctx.fillRect(Math.round(n.x + vx * p - cam.x), Math.round(n.y - 20 + vy * p + 90 * p * p - cam.y), 3, 2); ctx.globalAlpha = 1; } });
  }
  if (g.t < g.dur) return;
  s.x = n.x; gathering = null;
  passTime(K.time);
  F()[n.key] = S.day; s.img = n.imgs[1];
  const amount = (K.amount || 1) + (Math.random() < lifeLv('gather') * 0.1 + treeFx(K.bonus) ? 1 : 0);
  give(K.item, amount);
  if (K.extra) give(...K.extra);
  const label = `${K.name} +${amount}（${timeText(K.time)}）` + (K.extra ? ` · ${ITEMS[K.extra[0]].name} +${K.extra[1]}` : '');
  const img = n.imgs[0];
  worldFx.push({ t: 0, dur: 0.8, draw: (p) => { ctx.globalAlpha = 1 - p; ctx.drawImage(img, Math.round(n.x - img.width / 2 - cam.x), Math.round(n.y - img.height + 4 - p * 30 - cam.y)); ctx.globalAlpha = 1; } });
  worldFx.push({ t: 0, dur: 1.3, draw: (p) => {
    ctx.globalAlpha = Math.min(1, (1 - p) * 2); ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = '#142010'; const tx = n.x - cam.x, ty = n.y - 66 - p * 30 - cam.y;
    ctx.strokeText(label, tx, ty); ctx.fillStyle = K.text; ctx.fillText(label, tx, ty); ctx.globalAlpha = 1;
  } });
  const lines = lifeExp('gather', 3);
  if (lines.length) talk(lines);
}
function drawGather() {
  if (!gathering) return;
  const x = player.x - cam.x, y = player.y - cam.y - 64 * player.scale - 14, p = Math.min(1, gathering.t / gathering.dur);
  ctx.lineWidth = 4; ctx.strokeStyle = '#1a1510cc'; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#b8f090'; ctx.beginPath(); ctx.arc(x, y, 10, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
}
