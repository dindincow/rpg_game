'use strict';
// 清河村 — 道具、角色台詞與劇情資料

const HERO_NAME = '小蝦米';

// 正式角色素材（assets/characters/）：行走圖每格 86×86、8×4 格；頭像 256×256
// 沒有素材的角色會自動改用主角圖染色與程式繪製的頭像
const CHAR_FW = 86;
const CHAR_ART = {
  chief: { name: '陳伯安' }, kid: { name: '小豆' }, guard: { name: '阿武' }, farmer: { name: '王嬸' }, fisher: { name: '張叔' },
  traveler: { name: '旅人' }, mother: { name: '吳嬸' }, innkeeper: { name: '店小二' }, smith: { name: '韓鐵山' },
  hero: { name: HERO_NAME, faceOnly: true },
  // 地圖上的劇情野狼（第 1 章狼爪印）：沿用怪物走路圖 assets/monsters/wolf_walk.png（每格 96）
  wolf: { name: '野狼', dir: 'monsters', walkOnly: true, fw: 96 },
  liushen: { name: '劉嬸' }, afeng: { name: '學徒阿鋒', walkOnly: true }, xiaoliu: { name: '夥計小六', walkOnly: true }, ashui: { name: '阿水', walkOnly: true },
  storyteller: { name: '說書先生' }, woodcutter: { name: '老吳' },
  qinwufeng: { name: '秦無風' }, guwenyuan: { name: '顧文淵' }, shenruolan: { name: '沈若蘭' }, masked: { name: '蒙面人' },
  boss: { name: '黑風寨主', dir: 'monsters', fw: 96 }, bandit: { name: '山賊', dir: 'monsters', fw: 96 },
  fogma: { name: '霧婆' }, lingxiao: { name: '凌霄' },
};
// 怪物素材（assets/monsters/）：<id>_walk.png 地圖用（每格 96×96、8×4）、<id>_battle.png 戰鬥用（面向右）
const MON_ART = { wolf: {}, snake: {}, boar: {}, bandit: {}, treant: {}, boss: {}, wraith: {}, fog_beast: {}, fog_sha: {} };

const ITEMS = {
  herb: { name: '止血草', type: 'use', price: 15, desc: '清河畔常見的藥草，恢復 40 點氣血。', heal: 40 },
  revive: { name: '還魂丹', type: 'use', price: 300, desc: '能從鬼門關前把人拉回來的靈丹。戰鬥中倒下時自動服用，以一半氣血重新站起；平時服用則恢復全部氣血。', heal: 9999, revive: true },
  salve: { name: '金創藥', type: 'use', price: 60, desc: '以止血草熬煉成的藥膏，恢復 100 點氣血。', heal: 100 },
  longcao: { name: '延龍草', type: 'use', price: 20, desc: '花如小鈴的藥草，長在山溪邊的濕地。嚼之清神，恢復 15 點精力。', mana: 15 },
  wood: { name: '木材', type: 'mat', price: 4, desc: '剛砍下的原木，蓋房、做柵欄、打家具都用得上。' },
  stone: { name: '石材', type: 'mat', price: 3, desc: '敲礦時一併撬下來的石塊，可以砌牆、鋪路。' },
  iron_ore: { name: '鐵礦石', type: 'mat', price: 12, desc: '帶著鏽紅斑紋的礦石，冶煉後可得生鐵。' },
  coal: { name: '煤炭', type: 'mat', price: 8, desc: '烏黑發亮的石炭，比木柴耐燒，打鐵、冶煉都用得上。' },
  tea: { name: '雲霧茶', type: 'use', price: 25, desc: '山間採的老茶，恢復 20 點精力。', mana: 20 },
  letter: { name: '道長的信', type: 'key', desc: '信封以硃砂畫著符紋，信上僅八字：「雲山之南，故人待君」。' },
  jade: { name: '青玉珮', type: 'key', desc: '溫潤的青玉，背面刻著一個「蓮」字。' },
  coin: { name: '開元古錢', type: 'key', desc: '井底撈起的古錢，邊緣磨得發亮，似乎有些年頭了。' },
  wsword: { name: '木劍', type: 'weapon', atk: 4, price: 40, desc: '練武用的木劍，聊勝於無。' },
  isword: { name: '鐵劍', type: 'weapon', atk: 10, price: 120, desc: '鐵峰鋪的招牌貨，鋒利耐用。' },
  spear: { name: '紅纓槍', type: 'weapon', atk: 14, price: 230, desc: '槍頭紅纓似火，攻守兼備。' },
  qsword: { name: '青鋒劍', type: 'weapon', atk: 19, price: 360, desc: '寒光凜凜，據說以清河水淬煉。' },
  cloth: { name: '粗布衣', type: 'armor', def: 2, price: 30, desc: '耐磨的粗布衣裳。' },
  leather: { name: '皮甲', type: 'armor', def: 6, price: 90, desc: '鞣製牛皮縫成，輕便結實。' },
  chain: { name: '鎖子甲', type: 'armor', def: 12, price: 300, desc: '鐵環相扣，可擋刀劍。' },
  bracer: { name: '鐵護腕', type: 'acc', def: 3, price: 70, desc: '護住手腕的鐵片。' },
  boots: { name: '千層布靴', type: 'acc', def: 1, spd: 1, price: 45, desc: '納了千層底，走山路不累腳。' },
  talisman: { name: '殘缺玉符', type: 'key', desc: '刻著雲紋的半塊玉符，紋路與道長信封上的符紋如出一轍。' },
  jade_complete: { name: '完整玉符', type: 'acc', def: 2, mp: 15, desc: '兩半玉符合而為一，散發淡淡靈光，能克制妖靈之氣。' },
  spirit_tea: { name: '靈氣茶', type: 'use', price: 50, desc: '霧婆炮製的山茶，恢復 40 點精力。', mana: 40 },
  method_book: { name: '殘破功法冊', type: 'key', desc: '凌霄傳下的功法，記載著「風裂斬」劍訣殘篇。' },
  charm: { name: '平安符', type: 'acc', def: 2, mp: 10, desc: '吳嬸親手到廟裡求來的護身符。' },
  axe: { name: '柴刀', type: 'key', desc: '老吳送的舊柴刀，刀口還很利。' },
  pickaxe: { name: '鶴嘴鋤', type: 'key', desc: '在舊礦坑撿到的鶴嘴鋤，鋤柄磨得發亮。有了它才敲得動礦石。' },
  black_feather: { name: '黑羽令', type: 'key', desc: '刻著黑色羽毛的鐵令牌。圍攻秦無風的蒙面人身上，也掛著一樣的東西。' },
  modern_clothes: { name: '現代衣物', type: 'key', desc: '醒來時身上那件紅色連帽外套和背包。在這裡，大概只有你認得這是什麼。' },
  phone: { name: '手機', type: 'key', desc: '沒有訊號、沒有網路，時間停在 03:17。還能當手電筒用，前提是電撐得住。' },
  notebook: { name: '筆記本', type: 'key', desc: '從原本的世界帶來的筆記本，前幾頁寫著些看不懂的待辦事項。' },
  pen: { name: '原子筆', type: 'key', desc: '按壓式原子筆。在這個用毛筆的世界，這大概算是神器。' },
  lighter: { name: '打火機', type: 'key', desc: '塑膠打火機，一按就有火。比起手機，這東西在這裡可能更有用。' },
  water:{ name: '半瓶水', type: 'key', desc: '塑膠瓶裝的礦泉水，只剩一半。' },
  stick: { name: '粗樹枝', type: 'key', desc: '在林道邊撿到的粗樹枝，握起來剛剛好。總比空手好。' },
  small_stone: { name: '石塊', type: 'key', desc: '大樹根旁撿的石頭，拳頭大小。丟出去的聲音應該夠大。' },
  black_arrow: { name: '黑羽斷箭', type: 'key', desc: '從野狼身上掉下來的半截斷箭。箭羽是罕見的黑色鳥羽，箭桿上烙著一個看不懂的記號。' },
  spring_water: { name: '一瓶山泉水', type: 'use', heal: 25, desc: '在山泉邊裝滿的寶特瓶。喝起來比辦公室的飲水機甜。' },
};
const SLOT_NAMES = { weapon: '武器', armor: '防具', acc: '飾品' };

// 十二時辰
const SHICHEN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
function shichen(min) { const h = (min / 60) % 24; return SHICHEN[Math.floor(((h + 1) % 24) / 2)] + '時'; }

const RUMORS = [
  ['店小二', '聽說雲山深處有座道觀，常年雲霧繚繞，凡人走上三天三夜也找不著山門。'],
  ['店小二', '前些日子有個北方來的商隊，說邊關又不太平了……客官出門可得小心。'],
  ['店小二', '鐵峰鋪的韓鐵山年輕時當過兵，一手打鐵功夫是在軍營裡學的。'],
  ['店小二', '河畔的周老伯最近總是唉聲嘆氣，好像是丟了什麼要緊的東西。'],
];

// ---------- 戰鬥 ----------
// 仙術：lv = 領悟等級；target: one 單體 / all 全體 / self 自身
const SKILLS = {
  jianqi: { name: '劍氣斬', mp: 6, lv: 1, target: 'one', power: 1.7, desc: '凝氣於劍，斬出一道劍氣。' },
  huichun: { name: '回春術', mp: 8, lv: 2, target: 'self', heal: 50, desc: '運轉精力，恢復氣血。' },
  liuyun: { name: '流雲連斬', mp: 14, lv: 4, target: 'all', power: 1.15, desc: '身形如流雲，連斬所有敵人。' },
  fenglie: { name: '風裂斬', mp: 18, lv: 5, target: 'all', power: 1.35, desc: '凌空一斬，化作千道風刃席捲群敵。' },
};
const ENEMIES = {
  wolf: { name: '野狼', hp: 32, atk: 12, def: 3, spd: 12, exp: 8, gold: 6 },
  snake: { name: '青竹蛇', hp: 24, atk: 11, def: 2, spd: 15, exp: 7, gold: 4 },
  boar: { name: '野豬', hp: 56, atk: 16, def: 6, spd: 7, exp: 13, gold: 9, drop: ['herb', 0.25] },
  masked: { name: '蒙面人', art: 'bandit', hp: 90, atk: 18, def: 6, spd: 13, exp: 25, gold: 15 },
  thug: { name: '惡徒', art: 'bandit', hp: 40, atk: 13, def: 3, spd: 9, exp: 10, gold: 8 },
  bandit: { name: '山賊', hp: 48, atk: 15, def: 5, spd: 10, exp: 15, gold: 18, drop: ['herb', 0.3] },
  treant: { name: '樹精', hp: 80, atk: 17, def: 8, spd: 5, exp: 22, gold: 12, drop: ['tea', 0.35] },
  boss: { name: '黑風寨主', hp: 280, atk: 23, def: 9, spd: 11, exp: 120, gold: 200, boss: true },
  wraith: { name: '山鬼', hp: 50, atk: 18, def: 4, spd: 18, exp: 20, gold: 15 },
  fog_beast: { name: '霧獸', hp: 68, atk: 16, def: 8, spd: 8, exp: 18, gold: 12, drop: ['spirit_tea', 0.15] },
  fog_sha: { name: '霧煞', hp: 380, atk: 28, def: 10, spd: 12, exp: 220, gold: 300, boss: true },
};
// 基本屬性：第 1 級數值與每升一級的成長（自動成長）
// 小蝦米是讀書人出身的現代人：智力偏高，力量、體質、精神偏低
const ATTRS = [
  { id: 'str', name: '力量', en: 'STR', base: 8, grow: 2, desc: '近戰傷害' },
  { id: 'con', name: '體質', en: 'CON', base: 8, grow: 2, desc: '氣血上限、防禦' },
  { id: 'agi', name: '敏捷', en: 'AGI', base: 10, grow: 1, desc: '出手順序、閃避' },
  { id: 'int', name: '智力', en: 'INT', base: 14, grow: 1, desc: '科技研究、學習效率、機關破解' },
  { id: 'wil', name: '精神', en: 'WIL', base: 8, grow: 2, desc: '精力上限、持久作戰' },
  { id: 'cha', name: '魅力', en: 'CHA', base: 10, grow: 1, desc: '交涉、NPC 關係' },
];
// 生活技能：8 大類各有熟練度（Lv 0 = 未入門），類別底下的專精要拜師或劇情才學得會
const LIFE_SKILLS = [
  { id: 'gather', name: '採集', attr: 'con', specs: { herbal: '採藥', logging: '伐木', mining: '採礦', fishing: '釣魚', hunting: '狩獵', foraging: '野外採集' } },
  { id: 'farm', name: '農牧', attr: 'con', specs: { tilling: '耕種', garden: '園藝', husbandry: '畜牧', bees: '養蜂', mill: '農產加工' } },
  { id: 'make', name: '製造', attr: 'str', specs: { smith: '打鐵', smelt: '冶煉', wood: '木工', sew: '裁縫', leather: '皮革', pottery: '陶藝', weave: '編織', paper: '造紙' } },
  { id: 'food', name: '食品', attr: 'wil', specs: { cook: '烹飪', brew: '釀造', pickle: '醃製', teacraft: '製茶' } },
  { id: 'medic', name: '醫藥', attr: 'int', specs: { pharma: '製藥', herbwork: '藥材加工', firstaid: '急救', care: '醫療照護' } },
  { id: 'build', name: '營造', attr: 'str', specs: { repair: '修補', house: '建築', mason: '石工', water: '水利', ship: '造船' } },
  { id: 'trade', name: '商業', attr: 'cha', specs: { bargain: '交易議價', appraise: '鑑定', shop: '經商' } },
  { id: 'craft', name: '工藝', attr: 'int', specs: { mech: '機關', tools: '工具製作', carve: '雕刻', art: '書畫' } },
];
// LIFE_EXP[lv] = 升到 lv+1 所需的累計熟練；最高 10 級
const LIFE_EXP = [0, 10, 25, 45, 70, 100, 140, 190, 250, 320];
// 配方：need 材料、skill 所屬大類、spec 需要的專精、lv 需要的熟練度
const RECIPES = {
  salve: { name: '金創藥', skill: 'medic', spec: 'pharma', lv: 1, need: { herb: 3 }, less: 'salveHerb' },
};
// 技能樹：x 0–2 欄、y 由上往下；req 前置節點、cost 技能點、cond 條件、fx 效果數值（全部加總後生效）
// spec：對應生活技能專精，拜師學會後節點自動點亮（teach 為師父，不能用技能點買）
const TREE_TABS = ['武學', '生活', '科技', '兵法', '經商'];
const SKILL_TREES = [
  { tab: '武學', id: 'martial', name: '基礎武學樹', icon: '武', desc: '強身健體，打熬筋骨。', nodes: [
    { id: 'm1', name: '紮馬步', icon: '樁', x: 1, y: 0, cost: 1, fx: { def: 2 }, effect: '防禦 +2', text: '下盤穩了，挨打也站得住。' },
    { id: 'm2', name: '揮棍練習', icon: '棍', x: 0, y: 1, req: ['m1'], cost: 1, fx: { atk: 2 }, effect: '攻擊 +2', text: '每日揮棍三百下，力道漸沉。' },
    { id: 'm3', name: '吐納', icon: '息', x: 2, y: 1, req: ['m1'], cost: 1, fx: { mp: 10 }, effect: '精力上限 +10', text: '調勻呼吸，久戰不疲。' },
    { id: 'm4', name: '身法', icon: '影', x: 0, y: 2, req: ['m2'], cost: 2, cond: { attr: ['agi', 12] }, fx: { dodge: 0.03 }, effect: '閃避率 +3%', text: '腳步一錯，刀鋒擦身而過。' },
    { id: 'm5', name: '強身', icon: '體', x: 2, y: 2, req: ['m3'], cost: 2, cond: { lv: 3 }, fx: { hp: 25 }, effect: '氣血上限 +25', text: '筋骨強健，傷了也撐得住。' },
    { id: 'm6', name: '武學入門', icon: '武', x: 1, y: 3, req: ['m4', 'm5'], cost: 3, cond: { lv: 5 }, fx: { atk: 4, def: 2 }, effect: '攻擊 +4、防禦 +2', text: '基礎武學的里程碑，從此算是半個練家子。', mile: true },
  ] },
  { tab: '生活', id: 'gather', name: '生存採集樹', icon: '採', desc: '識百草、走山路，靠山吃山。', nodes: [
    { id: 'g1', name: '採藥', icon: '草', x: 1, y: 0, spec: ['gather', 'herbal'], teach: '吳嬸', effect: '能在官道路旁採集止血草', text: '吳嬸教的認草訣竅。' },
    { id: 'g2', name: '識草', icon: '識', x: 0, y: 1, req: ['g1'], cost: 1, fx: { herbChance: 0.2 }, effect: '採藥時多採一株的機率 +20%', text: '一眼認出哪株藥性最足。' },
    { id: 'g3', name: '腳力', icon: '行', x: 2, y: 1, req: ['g1'], cost: 1, fx: { move: 0.1 }, effect: '移動速度 +10%', text: '山路走慣了，腳底生風。' },
    { id: 'g7', name: '伐木', icon: '木', x: 2, y: 0, spec: ['gather', 'logging'], teach: '老吳', effect: '能在村外森林、官道砍樹取得木材', text: '老吳手把手教的，斧要斜著下。' },
    { id: 'g5', name: '採礦', icon: '礦', x: 0, y: 3, spec: ['gather', 'mining'], teach: '舊礦坑的鶴嘴鋤', effect: '能在礦山隧道敲下鐵礦石、煤炭', text: '撿到鶴嘴鋤後自己摸索出來的。' },
    { id: 'g6', name: '礦脈辨識', icon: '脈', x: 2, y: 3, req: ['g5'], cost: 1, fx: { oreChance: 0.25 }, effect: '採礦時多敲一塊的機率 +25%', text: '順著岩層的紋路下鋤，事半功倍。' },
    { id: 'g4', name: '野外老手', icon: '野', x: 1, y: 2, req: ['g2', 'g3'], cost: 2, cond: { life: ['gather', 3] }, fx: { herbChance: 0.2, move: 0.05 }, effect: '多採機率再 +20%、移動速度 +5%', text: '採集的里程碑，山林就是你的藥鋪。', mile: true },
  ] },
  { tab: '生活', id: 'medic', name: '醫藥樹', icon: '醫', desc: '懸壺濟世，先救自己。', nodes: [
    { id: 'd1', name: '製藥', icon: '藥', x: 1, y: 0, spec: ['medic', 'pharma'], teach: '吳嬸', effect: '能把止血草熬成金創藥', text: '吳嬸傳授的熬膏法子。' },
    { id: 'd2', name: '熬膏火候', icon: '火', x: 0, y: 1, req: ['d1'], cost: 1, fx: { craft: 0.1 }, effect: '製作成功率 +10%', text: '文火慢熬，藥膏不焦不稀。' },
    { id: 'd3', name: '急救', icon: '救', x: 2, y: 1, req: ['d1'], cost: 2, cond: { attr: ['int', 15] }, spec: ['medic', 'firstaid'], fx: { firstaid: 0.1 }, effect: '戰鬥勝利後恢復 10% 氣血', text: '打完架先止血包紮，別硬撐。' },
    { id: 'd4', name: '精簡配方', icon: '方', x: 1, y: 2, req: ['d2'], cost: 2, cond: { life: ['medic', 3] }, fx: { salveHerb: 1 }, effect: '金創藥只需止血草 ×2', text: '醫藥的里程碑，同樣的草藥能多救一人。', mile: true },
  ] },
  { tab: '科技', id: 'modern', name: '現代知識樹', icon: '知', desc: '來自另一個世界的學問。', nodes: [
    { id: 't1', name: '筆記整理', icon: '記', x: 1, y: 0, cost: 1, cond: { item: 'notebook' }, fx: { exp: 0.1 }, effect: '戰鬥經驗 +10%', text: '把每場仗的心得寫進筆記本，下回少走彎路。' },
    { id: 't2', name: '科學方法', icon: '理', x: 0, y: 1, req: ['t1'], cost: 2, cond: { attr: ['int', 16] }, fx: { craft: 0.05 }, effect: '所有製作成功率 +5%', text: '控制變因、記錄結果——古人沒聽過的做法。' },
    { id: 't3', name: '消毒觀念', icon: '菌', x: 2, y: 1, req: ['t1', 'd3'], cost: 2, cond: { item: 'lighter' }, fx: { firstaid: 0.1 }, effect: '急救恢復量再 +10%', text: '用打火機燒過刀刃、沸水煮過布條，傷口就不容易化膿。' },
  ] },
];
// 江湖聲望 → 稱號
const FAME_TITLES = [[0, '初入江湖'], [30, '小有名氣'], [100, '名動一方']];
// NEXT_EXP[lv] = 升到 lv+1 所需的累計經驗
const NEXT_EXP = [0, 20, 55, 110, 190, 300, 450, 650, 900, 1200, 1600];
// 依官道南北區段決定遇敵組合
const ENCOUNTERS = [
  { y1: 900, groups: [['wolf'], ['snake'], ['wolf', 'wolf'], ['snake', 'wolf']] },
  { y1: 1700, groups: [['wolf', 'wolf'], ['boar'], ['bandit'], ['boar', 'snake'], ['bandit', 'wolf']] },
  { y1: 99999, groups: [['bandit', 'bandit'], ['treant'], ['boar', 'wolf'], ['bandit', 'snake', 'wolf'], ['treant', 'snake']] },
];
