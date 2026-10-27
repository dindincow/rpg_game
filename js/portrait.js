'use strict';
// 對話頭像 — 依角色設定程序化繪製像素半身像（沿用 battle.js 的 creature 點陣繪製）
function shades(hex) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = (k) => `rgb(${Math.min(255, r * k) | 0},${Math.min(255, g * k) | 0},${Math.min(255, b * k) | 0})`;
  return [f(0.28), f(0.68), f(1), f(1.32)];
}
const SKIN = { light: '#e8b48a', tan: '#c88a5a', old: '#d4a482', pale: '#f0c8a0' };
const HAIR = { auburn: '#b85a22', black: '#2e2e3a', brown: '#7a4422', white: '#d0d0d6', gray: '#80808a', grayb: '#5a5048' };
// 角色設定：skin 膚色、hair 髮色、style 髮型、hat 帽飾、beard 鬍子、cloth 服色、eyes 眼型、extra 特徵
const PORTRAITS = {
  凌雲: { skin: 'light', hair: 'auburn', style: 'spiky', cloth: '#2e4a6a', eyes: 'hero', extra: ['band'] },
  吳嬸: { skin: 'pale', hair: 'black', style: 'bun', cloth: '#8a5a7a', eyes: 'female', extra: ['pin', 'blush'] },
  陳伯安: { skin: 'old', hair: 'white', style: 'bald', beard: 'long', cloth: '#6a5a40', eyes: 'old', extra: ['wrinkle'] },
  小豆: { skin: 'light', hair: 'brown', style: 'twin', cloth: '#c05a3a', eyes: 'kid', kid: true },
  阿武: { skin: 'tan', hair: 'black', style: 'short', hat: 'helmet', beard: 'stubble', cloth: '#5a6070', eyes: 'stern' },
  王嬸: { skin: 'tan', hair: 'grayb', style: 'scarf', scarf: '#7a8a4a', cloth: '#9a6a4a', eyes: 'female', extra: ['blush'] },
  張叔: { skin: 'tan', hair: 'black', style: 'short', hat: 'straw', beard: 'mustache', cloth: '#4a6a7a', eyes: 'normal' },
  旅人: { skin: 'tan', hair: 'brown', style: 'short', hat: 'straw', beard: 'stubble', cloth: '#7a6a4a', eyes: 'normal' },
  店小二: { skin: 'light', hair: 'black', style: 'short', hat: 'cap', cloth: '#4a5a6a', eyes: 'smile' },
  韓鐵山: { skin: 'tan', hair: 'grayb', style: 'short', hat: 'headband', band: '#a83020', beard: 'full', beardC: '#3a3430', cloth: '#5a3a2a', eyes: 'stern' },
  錦娘: { skin: 'pale', hair: 'black', style: 'bun', cloth: '#2f6a6a', eyes: 'female', extra: ['pin', 'earring'] },
  周老伯: { skin: 'old', hair: 'white', style: 'bald', beard: 'long', cloth: '#5a6a5a', eyes: 'old', extra: ['wrinkle'] },
  老吳: { skin: 'tan', hair: 'black', style: 'short', hat: 'headband', band: '#d8d0b8', beard: 'stubble', cloth: '#6a5a3a', eyes: 'smile' },
  黑風寨主: { skin: 'tan', hair: 'black', style: 'wild', beard: 'full', beardC: '#1e1e26', cloth: '#4a1a1a', eyes: 'angry', extra: ['scar'] },
  山賊: { skin: 'tan', hair: 'black', style: 'short', hat: 'bandana', band: '#9a2a20', beard: 'stubble', cloth: '#3a3a30', eyes: 'angry' },
  劉嬸: { skin: 'light', hair: 'grayb', style: 'bun', cloth: '#6a7a5a', eyes: 'female', extra: ['blush'] },
  學徒阿鋒: { skin: 'light', hair: 'brown', style: 'short', hat: 'headband', band: '#3a5a8a', cloth: '#5a4a3a', eyes: 'normal' },
  夥計小六: { skin: 'light', hair: 'black', style: 'short', hat: 'cap', cloth: '#4a6a4a', eyes: 'smile' },
  阿水: { skin: 'light', hair: 'black', style: 'short', cloth: '#a84a3a', eyes: 'normal', kid: true },
  旅商: { skin: 'tan', hair: 'brown', style: 'short', hat: 'cap', beard: 'mustache', cloth: '#7a5a2a', eyes: 'smile' },
  說書先生: { skin: 'old', hair: 'gray', style: 'bald', beard: 'long', beardC: '#a0a0aa', cloth: '#4a3a5a', eyes: 'smile', extra: ['wrinkle'] },
  // 第一卷新角色（占位頭像，等正式素材）
  沈若蘭: { skin: 'pale', hair: 'black', style: 'bun', cloth: '#3a7a6a', eyes: 'female', extra: ['pin'] },
  顧文淵: { skin: 'light', hair: 'black', style: 'short', hat: 'cap', cloth: '#5a6a8a', eyes: 'normal' },
  小蓮: { skin: 'light', hair: 'black', style: 'twin', cloth: '#a86a8a', eyes: 'kid', kid: true },
  小蓮的奶奶: { skin: 'old', hair: 'white', style: 'bun', cloth: '#6a5a4a', eyes: 'old', extra: ['wrinkle'] },
  秦無風: { skin: 'pale', hair: 'black', style: 'short', cloth: '#1e1e26', eyes: 'stern' },
  蒙面人: { skin: 'tan', hair: 'black', style: 'short', hat: 'bandana', band: '#1a1a1a', cloth: '#1e1e22', eyes: 'angry' },
  惡徒: { skin: 'tan', hair: 'black', style: 'wild', beard: 'stubble', cloth: '#3a3028', eyes: 'angry', extra: ['scar'] },
};
PORTRAITS[HERO_NAME] = PORTRAITS.凌雲;
const portraitCache = {};
function makePortrait(spec) {
  const sk = shades(SKIN[spec.skin]), hr = shades(HAIR[spec.hair]), cl = shades(spec.cloth);
  const bd = shades(spec.beardC || HAIR[spec.hair]), kid = !!spec.kid;
  const fy = kid ? 70 : 64, fry = kid ? 27 : 30, frx = kid ? 26 : 25;
  const P = [];
  // 後髮
  if (spec.style === 'bun') P.push(['e', 66, 62, 32, 36, hr], ['e', 66, 20, 13, 11, hr]);
  if (spec.style === 'wild') P.push(['e', 66, 56, 40, 38, hr]);
  if (spec.style === 'scarf') P.push(['e', 66, 58, 35, 38, shades(spec.scarf)]);
  // 身體
  P.push(['e', 66, 138, 60, 36, cl], ['r', 54, fy + 18, 24, 24, sk]);
  P.push(['e', 66 - frx, fy + 2, 5, 8, sk], ['e', 66 + frx, fy + 2, 5, 8, sk]);
  P.push(['e', 66, fy, frx, fry, sk]);
  if (spec.beard === 'full') P.push(['e', 66, fy + 22, 26, 16, bd]);
  if (spec.beard === 'long') P.push(['e', 66, fy + 30, 18, 14, bd], ['e', 66, fy + 42, 11, 12, bd]);
  if (spec.beard === 'mustache' || spec.beard === 'long' || spec.beard === 'full') P.push(['e', 58, fy + 17, 8, 3, bd], ['e', 74, fy + 17, 8, 3, bd]);
  // 前髮
  const top = fy - fry;
  if (spec.style === 'spiky') P.push(['e', 66, top + 10, 30, 16, hr], ['e', 44, top + 12, 11, 12, hr], ['e', 55, top + 3, 12, 13, hr], ['e', 69, top, 13, 13, hr],
    ['e', 83, top + 4, 12, 12, hr], ['e', 92, top + 14, 9, 12, hr], ['r', 40, top + 14, 8, 22, hr], ['r', 84, top + 14, 8, 22, hr]);
  if (spec.style === 'short') P.push(['e', 66, top + 10, 29, 16, hr], ['r', 40, top + 12, 7, 18, hr], ['r', 85, top + 12, 7, 18, hr]);
  if (spec.style === 'bun') P.push(['e', 66, top + 10, 28, 14, hr]);
  if (spec.style === 'twin') P.push(['e', 66, top + 10, 28, 15, hr], ['e', 41, top + 2, 10, 9, hr], ['e', 91, top + 2, 10, 9, hr]);
  if (spec.style === 'bald') P.push(['e', 44, fy - 6, 5, 8, hr], ['e', 88, fy - 6, 5, 8, hr], ['e', 66, top + 2, 9, 6, hr]);
  if (spec.style === 'wild') P.push(['e', 50, top + 6, 14, 12, hr], ['e', 66, top + 2, 16, 12, hr], ['e', 82, top + 6, 14, 12, hr], ['r', 40, top + 10, 8, 30, hr], ['r', 84, top + 10, 8, 30, hr]);
  if (spec.style === 'scarf') P.push(['e', 66, top + 10, 30, 14, shades(spec.scarf)]);
  // 帽飾
  if (spec.hat === 'straw') { const st = shades('#c9a85a'); P.push(['e', 66, top + 10, 56, 10, st], ['e', 66, top - 2, 24, 13, st]); }
  if (spec.hat === 'helmet') { const m = shades('#7a808a'); P.push(['e', 66, top + 8, 31, 18, m], ['r', 36, top + 16, 60, 6, m]); }
  if (spec.hat === 'cap') P.push(['e', 66, top + 6, 26, 12, shades(spec.cloth)]);
  if (spec.hat === 'headband' || spec.hat === 'bandana') P.push(['r', 40, top + 14, 52, 6, shades(spec.band)]);
  if (spec.hat === 'bandana') P.push(['e', 66, top + 8, 28, 12, shades(spec.band)], ['e', 96, top + 20, 6, 5, shades(spec.band)]);
  const art = creature(132, 132, P, (g) => {
    const ey = fy + 1, ex = [55, 77];
    for (const x of ex) {
      const e = spec.eyes;
      if (e === 'old') { g.fillStyle = '#2a1a10'; g.fillRect(x - 5, ey, 10, 2); }
      else if (e === 'smile') { g.fillStyle = '#2a1a10'; g.fillRect(x - 5, ey, 3, 2); g.fillRect(x - 2, ey - 2, 4, 2); g.fillRect(x + 2, ey, 3, 2); }
      else {
        g.fillStyle = '#f4efe6'; g.fillRect(x - 5, ey - 2, 10, 5);
        g.fillStyle = e === 'hero' ? '#3a2a1a' : '#1a1410'; const pw = e === 'kid' || e === 'female' ? 5 : 4; g.fillRect(x - 2, ey - 2, pw, 5);
        g.fillStyle = '#ffffff'; g.fillRect(x - 1, ey - 2, 1, 1);
        if (e === 'female') { g.fillStyle = '#1a1410'; g.fillRect(x - 6, ey - 3, 12, 2); }
      }
      // 眉毛
      g.fillStyle = shades(spec.beardC || HAIR[spec.hair])[0];
      const inner = x < 66 ? 1 : -1;
      if (e === 'angry' || e === 'stern') { const d = e === 'angry' ? 2 : 1; g.fillRect(x - 6, ey - 8 - (inner < 0 ? d : 0), 6, 2); g.fillRect(x, ey - 8 - (inner > 0 ? d : 0), 6, 2); g.fillRect(x + (inner > 0 ? 3 : -6), ey - 6, 3, 2); }
      else if (spec.style !== 'scarf' || true) g.fillRect(x - 5, ey - 7, 10, 2);
    }
    g.fillStyle = shades(SKIN[spec.skin])[1]; g.fillRect(64, fy + 8, 4, 4);
    g.fillStyle = spec.eyes === 'angry' ? '#5a1a10' : '#9a3a2a';
    if (spec.beard !== 'full') { if (spec.eyes === 'smile' || spec.eyes === 'kid') { g.fillRect(60, fy + 18, 12, 2); g.fillRect(58, fy + 16, 2, 2); g.fillRect(72, fy + 16, 2, 2); } else g.fillRect(61, fy + 18, 10, 2); }
    const ex2 = spec.extra || [];
    if (ex2.includes('blush')) { g.fillStyle = '#e88a7a90'; g.fillRect(46, fy + 9, 7, 3); g.fillRect(79, fy + 9, 7, 3); }
    if (ex2.includes('wrinkle')) { g.fillStyle = shades(SKIN[spec.skin])[1]; g.fillRect(56, fy - 14, 20, 1); g.fillRect(58, fy - 11, 16, 1); g.fillRect(44, fy + 2, 4, 1); g.fillRect(84, fy + 2, 4, 1); }
    if (ex2.includes('scar')) { g.fillStyle = '#8a2a20'; for (let i = 0; i < 7; i++) g.fillRect(74 + i, fy - 10 + i * 3, 2, 3); }
    if (ex2.includes('pin')) { g.fillStyle = '#e8c050'; g.fillRect(78, top - 4, 16, 3); g.fillStyle = '#c03828'; g.fillRect(92, top - 6, 5, 5); }
    if (ex2.includes('earring')) { g.fillStyle = '#e8c050'; g.fillRect(39, fy + 10, 3, 5); g.fillRect(91, fy + 10, 3, 5); }
    if (ex2.includes('band')) { g.fillStyle = '#c03828'; g.fillRect(40, top + 16, 52, 4); g.fillRect(90, top + 18, 10, 3); g.fillRect(96, top + 21, 8, 3); }
    // 交領衣襟
    g.fillStyle = shades(spec.cloth)[3];
    for (let i = 0; i < 12; i++) { g.fillRect(52 + i * 2, 110 + i * 2, 4, 3); g.fillRect(80 - i * 2, 110 + i * 2, 4, 3); }
    g.fillStyle = '#e8dcc0'; for (let i = 0; i < 8; i++) g.fillRect(56 + i * 2, 110 + i * 2, 2, 3);
  }, true);
  return art.img;
}
function portraitFor(name) {
  const base = name.replace(/（.*）$/, '').replace(/[甲乙丙]$/, '');
  const spec = PORTRAITS[base]; if (!spec) return null;
  return portraitCache[base] || (portraitCache[base] = makePortrait(spec));
}
// 表情包：4×3 格的頭像表；台詞可寫 [名字, 文字, 表情]，沒寫時依台詞內容猜
// 小蝦米只在穿現代裝時用（assets/characters/hero_faces_modern.png）
let heroFacesModern = null;
const FACE_SETS = {
  [HERO_NAME]: { img: () => modernLook() && heroFacesModern, moods: { smile: 0, grin: 1, laugh: 2, surprise: 3, worry: 4, shy: 5, angry: 6, doubt: 7, tired: 8, shock: 9, sigh: 10, wink: 11 } },
  秦無風: { file: 'assets/characters/qinwufeng_faces.png', moods: { smile: 10, smirk: 1, serious: 2, cold: 0, glare: 3, angry: 4, surprise: 5, doubt: 6, pain: 7, hurt: 8, shy: 9, annoyed: 11 } },
  顧文淵: { file: 'assets/characters/guwenyuan_faces.png', moods: { calm: 0, smile: 1, happy: 2, think: 3, serious: 4, annoyed: 5, surprise: 6, worry: 7, shy: 8, flustered: 9, doubt: 10, sigh: 11 } },
  沈若蘭: { file: 'assets/characters/shenruolan_faces.png', moods: { smile: 0, happy: 1, laugh: 2, surprise: 3, worry: 4, sad: 5, shy: 6, flustered: 7, angry: 8, serious: 9, think: 10, cry: 11 } },
};
for (const f of Object.values(FACE_SETS)) if (f.file) { f.el = new Image(); f.el.src = f.file; f.img = () => f.el.complete && f.el.naturalWidth && f.el; }
// 猜表情：回傳通用名稱，再對應到各角色表上最接近的一格
function guessMood(text) {
  const t = String(text || '');
  if (/[！!][？?]|[？?][！!]|不、不|等、等|什麼鬼|絕對是/.test(t)) return 'shock';
  if (/痛|痠|嚇死|在抖|陣亡|好累|腿軟/.test(t)) return 'tired';
  if (/唉|^……[^？?]*$|放鴿子|奢望/.test(t)) return 'sigh';
  if (/哈哈|好啊|外掛|露營心得|喜歡/.test(t)) return 'laugh';
  if (/^……/.test(t) && /[？?]/.test(t)) return 'surprise';
  if (/可惡|找死|嘖|有仇|休想/.test(t)) return 'angry';
  if (/[？?]/.test(t)) return 'doubt';
  if (/……/.test(t)) return 'worry';
  return 'smile';
}
const MOOD_ALIAS = { pain: ['tired', 'worry'], hurt: ['pain'], glare: ['angry'], cold: ['serious'], smirk: ['smile'], calm: ['smile'], annoyed: ['angry'], shock: ['surprise'], tired: ['pain', 'worry'], sigh: ['sad', 'worry'], doubt: ['think'], grin: ['happy'], happy: ['grin'], sad: ['sigh'], think: ['doubt'], serious: ['cold', 'doubt'], cry: ['sad', 'tired'], flustered: ['shy'], wink: ['laugh'] };
function moodIndex(set, m) {
  for (const k of [m, ...(MOOD_ALIAS[m] || [])]) if (k in set.moods) return set.moods[k];
  return 0;
}
function setPortrait(name, text, mood) {
  const box = $('dlgPortrait'), base = name && name.replace(/（.*）$/, '').replace(/[甲乙丙]$/, '');
  // 優先使用正式頭像素材，沒有才用程式繪製
  const art = base && Object.values(CHAR_ART).find((a) => a.name === base && a.face);
  const fs = FACE_SETS[base], sheet = fs && fs.img();
  if (sheet) {
    const i = moodIndex(fs, mood || guessMood(text)), fw = sheet.width / 4, fh = sheet.height / 3;
    $('dlg').classList.add('withp');
    const g = box.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.clearRect(0, 0, box.width, box.height);
    g.drawImage(sheet, (i % 4) * fw, Math.floor(i / 4) * fh, fw, fh, 0, 0, box.width, box.height);
    return;
  }
  const img = base === HERO_NAME && modernLook() ? heroFaceModern : art ? art.face : name && portraitFor(name);
  $('dlg').classList.toggle('withp', !!img);
  if (!img) return;
  const g = box.getContext('2d'); g.imageSmoothingEnabled = !!art || img === heroFaceModern; g.imageSmoothingQuality = 'high';
  g.clearRect(0, 0, box.width, box.height); g.drawImage(img, 0, 0, box.width, box.height);
}
