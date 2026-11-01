"use strict";
// 第 4 章《黑松林・命運的相遇》：對話、觸發、調查點、NPC、初遇之戰（戰棋劇情戰）
// 台詞取自「CH04_黑松林命運的相遇_完整小說.txt」（V2.3）；標【補】者為互動所需的開發補充台詞
// 流程：王宅清晨 → 祠堂石階下清點修渠剩料（三樣分類）→ 老吳帶老周到醫舍（藥鋪門前）、若蘭教藥草辨識
// → 黑松林採青脈草 → 馬蹄印、斷箭 → 秦無風被圍（CG）→ 小蝦米衝出 → 戰棋（小蝦米＋秦無風 vs 蒙面人×2）
// → 戰後、老吳趕到 → 避風石洞（握手 CG）→ 破曉回村見村長 → 醫舍診治 → 王宅暫住 → 追兵懸念 → 第 5 章
// 山洞是室內地圖 in_cave（interior.js 的 ROOMS.cave）：火堆在中間，秦無風靠火堆右邊坐著，走過去說話才開始洞中對話

Object.assign(ITEMS, {
  herb_note: { name: "若蘭的藥草筆記", type: "key", desc: "一塊木片，沈若蘭在上面畫了青脈草的葉形與葉脈：葉子成對生長，背面葉脈清楚。" },
  qingmai: { name: "青脈草", type: "key", desc: "葉子成對生長、背面葉脈清楚的藥草。替醫舍採的，認不準的不採，更不能亂用。" },
});

// 三處一組的小調查（沿用 ch03.js 的 ch03Count）
Object.assign(CH03_GROUPS, {
  ch04sort: {
    label: "清點剩料",
    keys: ["ch04_s_bamboo", "ch04_s_wood", "ch04_s_rope"],
    done: "ch04_sorted",
    msg: "清點完畢：舊木可補水渠、裂竹只能當支架、泡水粗繩不堪用",
  },
  ch04herb: { label: "青脈草", keys: ["ch04_h1", "ch04_h2", "ch04_h3"], done: "ch04_herbs" },
  ch04trace: { label: "林道痕跡", keys: ["ch04_t_hoof", "ch04_t_arrow"], done: "ch04_traces" },
});

// 修渠剩料分類：三個選項，答錯只給幽默回應、可以重來
// 石洞室內（in_cave，底圖 1536×1024 縮成寬 1000）：火堆在 (508, 326)；秦無風靠火堆右邊坐著，小蝦米盤腿坐左邊（坐姿圖原本朝右，在這裡左右翻轉 flip 才面向火堆）
const CH04_CAVE_SEAT = { x: 426, y: 296 }, CH04_CAVE_QIN = { x: 592, y: 300 };
// 坐姿圖都是 1254×1254：秦無風按著纏布條的手臂（qinwufeng_hurt_sit.png）、小蝦米盤腿（hero_sit_cross.png），腳底對準座位
const CH04_CAVE_QIN_IMG = { img: Object.assign(new Image(), { src: "assets/characters/qinwufeng_hurt_sit.png" }), x: CH04_CAVE_QIN.x - 41, y: CH04_CAVE_QIN.y - 80, w: 88, h: 88, flip: true };
const CH04_CAVE_HERO_IMG = { img: Object.assign(new Image(), { src: "assets/characters/hero_sit_cross.png" }), x: CH04_CAVE_SEAT.x - 35, y: CH04_CAVE_SEAT.y - 80, w: 84, h: 84, flip: true };
// 洞中小動畫：坐著時呼吸起伏；包紮、守夜用橫排 4 格的圖（每格 400×400，人物位置同秦無風坐姿圖，可直接疊在同一個座標）
CH04_CAVE_QIN_IMG.breathe = CH04_CAVE_HERO_IMG.breathe = true;
CH04_CAVE_QIN_IMG.fireShadow = CH04_CAVE_HERO_IMG.fireShadow = true; // 火光投在地上的影子（game.js drawActor）
const ch04Sheet = (src) => Object.assign(new Image(), { src });
// 兩人包紮（ch04_bandage.png，原圖方向：左小蝦米、右秦無風）：0 拿布條、1 纏、2 拉緊、3 纏好；hold 停在某格，否則 0→1→2→1 來回纏
// 兩人擠在同一張圖裡會顯小，放大到 BANDAGE_S（秦無風坐姿是 88）；腳底（格內 375/400 處）與中心不動
const CH04_BANDAGE_S = 102, CH04_QIN_FOOT = CH04_CAVE_QIN_IMG.y + 88 * 375 / 400, CH04_QIN_CX = CH04_CAVE_QIN.x + 3;
const CH04_BANDAGE = { sheet: ch04Sheet("assets/characters/ch04_bandage.png"), x: CH04_QIN_CX - CH04_BANDAGE_S / 2, y: CH04_QIN_FOOT - CH04_BANDAGE_S * 375 / 400, w: CH04_BANDAGE_S, h: CH04_BANDAGE_S, hold: null, fireShadow: true };
CH04_BANDAGE.fr = (now) => (CH04_BANDAGE.hold ?? [0, 1, 2, 1][Math.floor(now / 600) % 4]);
// 秦無風守夜（qinwufeng_watch.png）：0 閉眼、1 睜眼、2 神情放軟欲言又止、3 再闔眼；大多閉著，偶爾睜眼看你
const CH04_QIN_WATCH_SEQ = [[0, 3200], [1, 1100], [2, 1700], [3, 500], [0, 2600], [1, 900], [3, 400]];
const CH04_QIN_WATCH = { sheet: ch04Sheet("assets/characters/qinwufeng_watch.png"), x: CH04_CAVE_QIN_IMG.x, y: CH04_CAVE_QIN_IMG.y, w: 88, h: 88, flip: true, breathe: true, fireShadow: true, fr: (now) => idleFrame(CH04_QIN_WATCH_SEQ, now) };
// 打盹：2 格（頭垂下／再點一下），400px 一格，跟盤腿坐姿同大小同腳底
const CH04_HERO_DOZE = { ...CH04_CAVE_HERO_IMG, img: null, sheet: Object.assign(new Image(), { src: "assets/characters/hero_doze_sit.png" }), fr: (now) => (now % 3600 > 2900 ? 1 : 0) };
const ch04Qin = () => npcs.find((n) => n.id === "qin_cave");
const CH04_SORT_Q = (intro, key, right, lines) => ({
  lines: [
    ...intro,
    {
      choice: {
        q: "這些拿去補水渠，行不行？",
        options: ["canal", "prop", "waste"].map((id) => ({
          id,
          label: { canal: "能補水渠", prop: "只能當支架、雜用", waste: "不能用" }[id],
          lines: id === right ? [...lines[id], { effects: [{ type: "hook", name: "ch03Count", group: "ch04sort", key }] }] : lines[id],
        })),
      },
    },
  ],
});

Object.assign(DIALOGUES, {
  // ---------- S01 第二日的清晨（王宅室內）----------
  dlg_ch04_morning: {
    lines: [
      // 醒來：躺床 → 坐床邊 → 起身（第 3 章結尾人還在窗邊，這裡先放回床上）
      { effects: [{ type: "hook", name: "ch04Wake", stage: "lie" }] },
      "（王宅的門，竟然真的關得上了。）",
      { effects: [{ type: "hook", name: "ch04Wake", stage: "sit" }] },
      "（清晨醒來，你先用腳尖碰了碰床腳。床板沒歪，門板也沒有被夜風吹開。窗台那幾朵小蓮送的野花有些蔫了，仍倔強地立在陶杯裡。）",
      { effects: [{ type: "hook", name: "ch04Wake", stage: "up" }] },
      [HERO_NAME, "早安，四星級破屋。", "smile"],
      "（你摸摸左肩。疼意比昨日輕些，但還沒好。）",
      { effects: [{ type: "hook", name: "wince", who: "player" }] },
      [HERO_NAME, "今天先不拆房子。村長叫我辰時去祠堂……工程師穿越古代，職涯第一站竟然是倉管。", "tired"],
      "（你將借來的短錘與剩餘釘子放妥，把借用紀錄木片塞進背包。出門前，又回頭看了一眼屋內。）",
      "（昨天還以為自己會被屋子壓死。今天卻開始在意窗台上的花有沒有水。）",
      "【提示】辰時到祠堂石階下找村長。",
    ],
    effects: [
      { type: "set_flag", key: "ch04_morning" },
      { type: "log", text: "三日之約第 2 日：辰時到祠堂外清點修渠剩料" },
    ],
  },

  // ---------- S02 祠堂外的清點 ----------
  dlg_ch04_report: {
    lines: [
      { effects: [{ type: "hook", name: "ch04Hour", h: 7 }] },
      "（祠堂石階下，陳伯安已經等著了。）",
      ["陳伯安", "王小明，你倒守時。"],
      [HERO_NAME, "村長，報到！", "grin"],
      ["陳伯安", "少耍嘴皮。把這些舊木、竹節、繩索分清楚，哪樣能補水渠，哪樣不能用，列個明白。"],
      "（地上攤著兩捆裂竹、半車舊木和數截泡過水的粗繩。）",
      "【提示】檢查裂竹、舊木和粗繩，分清楚哪樣能補水渠。",
    ],
    effects: [{ type: "set_flag", key: "ch04_count_start" }],
  },
  // 【補】三樣剩料的分類回應（裂竹一句取自小說）
  dlg_ch04_s_bamboo: CH04_SORT_Q(
    ["（兩捆裂竹。你蹲下檢查，左肩一使力便抽痛，連忙換手。）", { effects: [{ type: "hook", name: "wince", who: "player" }] }],
    "ch04_s_bamboo",
    "prop",
    {
      canal: [[HERO_NAME, "……拿裂到節上的竹子當水槽？水還沒到田裡就先漏光了。", "tired"]],
      prop: [[HERO_NAME, "這捆竹子裂到節上，拿去當水槽會漏。這幾根倒還能做支架……"]],
      waste: [["陳伯安", "裂的是竹節，竹身還硬著。你倒捨得丟。"]],
    },
  ),
  dlg_ch04_s_wood: CH04_SORT_Q(["（半車舊木。敲了敲，聲音還算紮實，只有表面發黑。）"], "ch04_s_wood", "canal", {
    canal: ["（你刮掉表面一層黑皮，底下的木色還新。）", [HERO_NAME, "這些削一削，還能做水渠的擋板。"]],
    prop: [[HERO_NAME, "這麼紮實的木頭只拿來當支架……好像有點浪費。", "doubt"]],
    waste: [["陳伯安", "木頭還硬著，你倒捨得丟。"]],
  }),
  dlg_ch04_s_rope: CH04_SORT_Q(["（數截泡過水的粗繩，一拉就掉下一撮爛麻。）"], "ch04_s_rope", "waste", {
    canal: ["（你用力一扯，繩子當場斷成兩截。）", [HERO_NAME, "……好，這個 Bug 自己回報了。", "tired"]],
    prop: [[HERO_NAME, "拿爛繩綁支架，等於叫支架自己散開。", "tired"]],
    waste: [[HERO_NAME, "泡爛了。拿去綁水渠，大概撐不過第一場雨。"]],
  }),
  dlg_ch04_chief_wait: { lines: [["陳伯安", "裂竹、舊木、粗繩，分清楚了再來回話。"]] },
  // 清點完 → 問水車與糧 → 老吳帶著發熱的老周趕來
  dlg_ch04_inventory: {
    lines: [
      "（你用木片刻下可用的數量。陳伯安站在旁邊看著，沒有稱讚，也沒打斷。）",
      [HERO_NAME, "村長，水車停多久了？", "doubt"],
      ["陳伯安", "不是一朝一夕的事。"],
      [HERO_NAME, "那糧呢？"],
      "（陳伯安的木杖輕敲地面。）",
      ["陳伯安", "先做好你手上的事。公倉有多少米，不是讓你一個初來的客人隨便過問的。"],
      "（你摸摸鼻子。）",
      [HERO_NAME, "知道啦。我只是想，修東西之前得先知道壞在哪。"],
      {
        effects: [
          { type: "set_flag", key: "ch04_inventory" },
          { type: "log", text: "修渠剩料清點完畢（水渠仍未修好，公倉仍缺糧）", toast: true },
        ],
      },
      "（這時，祠堂外傳來急促的腳步聲。）",
      ["老吳", "村長！"],
      {
        walk: [
          { who: "wu_i", near: "player", dx: -60, dy: 30 },
          { who: "zhou_i", near: "player", dx: -100, dy: 40 },
        ],
      },
      "（老吳扶著一名中年樵夫走來。樵夫老周臉色發青，袖口被撕開一道口子，手臂上有幾道深淺不一的抓傷。）",
      ["老吳", "老周昨晚從林邊回來就發冷，今早又起熱。我先送去醫舍，若蘭說有些藥不夠。"],
      ["陳伯安", "又是黑松林？"],
      "（老吳點頭，聲音壓得很低。）",
      ["老吳", "昨晚那些持兵器的人還在山裡。我在舊獵道外側看見新馬蹄印。"],
      "（你想起昨夜從窗邊看見的那點冷光。）",
      [HERO_NAME, "不會吧……真有人在打架？", "shock"],
      "（陳伯安看了你一眼。）",
      ["陳伯安", "那不是你該管的事。"],
      "（你本想回嘴，望見老周不停發抖的樣子，話又嚥了回去。）",
      "【提示】跟老吳把老周送到醫舍（村中廣場西南的藥鋪）。",
    ],
  },

  // ---------- S03 醫舍的藥簍（小說第二幕，精簡教學：對話結束直接習得藥草辨識）----------
  dlg_ch04_clinic: {
    lines: [
      { effects: [{ type: "hook", name: "ch04Hour", h: 9 }] },
      "（沈若蘭坐在醫舍門前的矮凳上，左腳踝仍纏著布條，正替受傷發熱的老周清理傷口。）",
      // 【補】小說為敘述句：若蘭不斷言是獸傷
      ["沈若蘭", "先別急著說是什麼抓的。你先歇著，若高熱不退，我再想辦法。", "serious"],
      "（你望著幾乎見底的藥簍。）",
      [HERO_NAME, "妳的藥呢？", "doubt"],
      ["沈若蘭", "常備草藥快用完了。舊獵道旁應該有，可我的腳傷還沒好……", "worry"],
      [HERO_NAME, "我去採吧！老吳伯可以帶路。"],
      ["沈若蘭", "你認得藥草嗎？", "doubt"],
      [HERO_NAME, "呃……綠色的算不算？", "tired"],
      "（沈若蘭無奈地笑了笑，取出一株草藥。）",
      ["沈若蘭", "這是青脈草，葉子成對生長，背面葉脈清楚。記住模樣，別採錯了。", "smile"],
      [HERO_NAME, "收到！沈老師！", "grin"],
      ["沈若蘭", "沈老師？", "surprise"],
      [HERO_NAME, "教我本事的人，當然是老師啊！"],
      "（若蘭輕輕一笑，在木片上畫下葉形與葉脈，交給你。）",
      ["沈若蘭", "認不準的就別採，更不能亂用。還有，別往林子深處跑。", "serious"],
      [HERO_NAME, "放心！採完立刻回來！"],
      { effects: [{ type: "hook", name: "ch04Learn" }] },
      "（若蘭將小藥簍、備急止血用品與乾淨布條交給你。你避開受傷的左肩，用右肩背起藥簍。）",
      { effects: [{ type: "item", id: "herb", n: 2, why: "若蘭給的備急止血用品" }] },
      ["老吳", "我只帶你走舊獵道外緣。小子，走了！"],
      "（你連忙跟上。臨出門，若蘭又喚了一聲。）",
      ["沈若蘭", "小蝦米，記得回來。", "worry"],
      "（你收起玩笑，回頭點了點頭。）",
      [HERO_NAME, "好，我答應妳。", "smile"],
      {
        effects: [
          { type: "set_flag", key: "ch04_errand" },
          { type: "hook", name: "ch04Warp", map: "forest", x: CH04.entry.x, y: CH04.entry.y, dir: 2, hour: 13 },
        ],
      },
      "（黑松林的樹比清河村附近高出許多。午後的光透過枝葉，灑在舊獵道上。）",
      "【提示】對照若蘭的筆記，在舊獵道旁的石坡採三株青脈草。",
    ],
  },
  dlg_ch04_ruolan_idle: {
    lines: [
      {
        branch: [
          [{ notFlags: ["ch04_errand"] }, ["（若蘭正低頭替病人清理傷口，沒空抬頭。）"]],
          [{ notFlags: ["ch04_battle_won"] }, [["沈若蘭", "認不準的就別採。記得回來。", "worry"]]],
          [null, [["沈若蘭", "他的毒我只能按症狀照顧。夜裡若呼吸變差，立刻來叫我。", "serious"]]],
        ],
      },
    ],
  },
  dlg_ch04_zhou: { lines: [["老周", "……冷得很。多謝你們跑這一趟。"]] },

  // ---------- S04–S05 黑松林：採青脈草、馬蹄印與斷箭 ----------
  dlg_ch04_wu_forest: {
    lines: [
      {
        branch: [
          [{ notFlags: ["ch04_herbs"] }, [["老吳", "石坡那邊陰濕，青脈草愛長那兒。認不準的別碰。"]]],
          [null, [["老吳", "採夠了就別貪。這林子今天不對勁。"]]],
        ],
      },
    ],
  },
  dlg_ch04_joke: {
    lines: [
      { walk: [{ who: "wu_fo", near: "player", dx: 50, dy: -6 }] },
      "（你避開不認識的野草，採了半簍。）",
      [HERO_NAME, "這工作也不輕鬆耶。", "tired"],
      ["老吳", "你以為採藥是去市場買菜？"],
      [HERO_NAME, "至少市場不會有狼。"],
      ["老吳", "市場要是有狼，你還敢去嗎？"],
      [HERO_NAME, "那得看菜價。", "grin"],
      { effects: [{ type: "hook", name: "emote", who: "wu_fo", icon: "♪" }] },
      "（老吳被你逗笑，卻很快收了聲。前方的泥地上，好像有什麼。）",
      "【提示】看看前方泥地上的痕跡。",
    ],
    effects: [{ type: "set_flag", key: "ch04_joke" }],
  },
  dlg_ch04_hoof: {
    lines: ["（前方泥地上，出現幾道新鮮的馬蹄印。）", { effects: [{ type: "hook", name: "ch03Count", group: "ch04trace", key: "ch04_t_hoof" }] }],
  },
  dlg_ch04_arrow: {
    lines: [
      "（一截斷箭橫在路旁，箭羽上沾著泥。更遠處的灌木間，似有一小片暗色布料勾在枝頭。）",
      { effects: [{ type: "hook", name: "ch03Count", group: "ch04trace", key: "ch04_t_arrow" }] },
    ],
  },

  // ---------- S06 黑松林的聲音：秦無風被圍（保留 CG「第4章_秦無風遇襲」）→ 小蝦米衝出 → 戰棋 ----------
  dlg_ch04_reveal: {
    lines: [
      { walk: [{ who: "wu_fo", near: "player", dx: 46, dy: -4 }] },
      "（老吳蹲下察看，神色一沉。）",
      ["老吳", "不對。這裡不能再走了。"],
      [HERO_NAME, "發生什麼事？", "doubt"],
      ["老吳", "不是樵夫留下的。這些人帶弓，還騎馬。"],
      "（你下意識壓低聲音。）",
      [HERO_NAME, "昨晚的那些？", "worry"],
      ["老吳", "很可能。走，回村。"],
      { effects: [{ type: "hook", name: "sfx", sound: "clash" }] },
      "（兩人正要退回原路，林中忽然響起一聲尖銳的金鐵相擊。）",
      "鏘！",
      {
        effects: [
          { type: "hook", name: "sfx", sound: "clash" },
          { type: "hook", name: "emote", who: "player", icon: "!" },
        ],
      },
      "（接著又是一聲。）",
      {
        walk: [
          { who: "player", x: CH04.hide.x, y: CH04.hide.y, run: true },
          { who: "wu_fo", x: CH04.hide.x - 36, y: CH04.hide.y + 8, run: true },
        ],
      },
      "（老吳立即抓住你的後領，拉你蹲到樹根後。）",
      ["老吳", "別出聲。"],
      { effects: [{ type: "hook", name: "camTo", x: CH04.clearing.x, y: CH04.clearing.y - 20, pan: 1.2, hold: 999 }] },
      "（透過枝葉空隙，你看見一片稍寬的林間空地。）",
      { cg: "cg/第4章_秦無風遇襲.png" },
      "（一名黑衣男子持劍而立。他身形高挑，黑髮高束，深色衣袖沾滿血，右手的劍卻仍然穩得驚人。）",
      "（兩名蒙面人一左一右逼近。）",
      ["蒙面人甲", "秦無風！中了軟筋散還敢硬撐？把東西交出來！"],
      "（黑衣劍客吐出一口帶血的氣，目光冰冷。）",
      ["秦無風", "你們若有本事，自己來取。", "cold"],
      ["蒙面人乙", "死到臨頭還嘴硬。"],
      "（老吳臉色大變，向你打手勢：退。）",
      "（你也想退。你不知道那個叫秦無風的人是好是壞，更不知道追兵口中的東西是什麼。你只知道三人都有刀劍，自己手裡那把短柴刀恐怕連護身都嫌勉強。）",
      "（可就在老吳轉身尋路時，一名追兵突然繞到黑衣劍客身側。）",
      "（秦無風似乎想移步，膝頭卻猛地一軟。）",
      "（刀光從他沒有防備的角度落下——）",
      { cg: null },
      "（你的腦子還沒想明白，腳已經動了。）",
      [HERO_NAME, "喂——！", "shock"],
      { effects: [{ type: "hook", name: "camFree" }] },
      { walk: [{ who: "player", x: CH04.rush.x, y: CH04.rush.y, run: true }] },
      "（你衝出樹後，舉起短柴刀，大吼——）",
      [HERO_NAME, "兩個打一個，還下藥！你們要不要臉啊！", "angry"],
      {
        effects: [
          { type: "hook", name: "face", who: "mk_a", dir: 2 },
          { type: "hook", name: "emote", who: "mk_a", icon: "!" },
          { type: "hook", name: "emote", who: "mk_b", icon: "!" },
        ],
      },
      "（林間所有人都愣了一瞬。）",
      ["蒙面人甲", "哪來的紅毛小子？"],
      "（你這才發現，自己真的站在刀口前。）",
      [HERO_NAME, "呃……路過的熱心民眾？", "tired"],
      ["蒙面人乙", "一併殺了。"],
      "（你心頭一涼。）",
      [HERO_NAME, "靠夭！沒有先警告的喔！", "shock"],
      ["秦無風", "滾回去！", "glare"],
      [HERO_NAME, "我現在回去來得及嗎？！", "shock"],
      // 戰前安全存檔：讀檔後由 ch04_rebattle 重新開戰
      {
        effects: [
          { type: "set_flag", key: "ch04_encounter" },
          { type: "meet", char: "qin_wufeng" },
          { type: "hook", name: "autosave" },
        ],
      },
      "【戰棋模式開始：黑松林・初遇之戰】",
      { effects: [{ type: "hook", name: "ch04Battle" }] },
    ],
  },
  // 【補】戰前存檔讀回來（或 GAME OVER 後回標題再讀檔）時重新開戰
  dlg_ch04_rebattle: {
    lines: [
      "（蒙面人的刀還指著你們。秦無風擋在你前方，呼吸又淺又急。）",
      [HERO_NAME, "……再來一次。這次一定要撐住！", "angry"],
      { effects: [{ type: "hook", name: "ch04Battle" }] },
    ],
  },
});

Object.assign(DIALOGUES, {
  // ---------- S08 戰後（小說第四幕末～第五幕）→ S09 山洞（第五、六幕）→ 破曉回村 ----------
  dlg_ch04_after: {
    lines: [
      {
        branch: [
          [{ allFlags: ["ch04_g_perfect"] }, ["【戰鬥評價：完美勝利｜生死之交】"]],
          [{ allFlags: ["ch04_g_normal"] }, ["【戰鬥評價：普通勝利｜患難之交】"]],
          [null, ["【戰鬥評價：險勝｜命懸一線】"]],
        ],
      },
      { effects: [{ type: "hook", name: "ch04Reward" }] },
      {
        branch: [
          [
            { allFlags: ["ch04_qin_downed"] },
            [
              { effects: [{ type: "hook", name: "sit", who: "qin_c", on: true }] },
              // 【補】小說備註：追兵撤退後，小蝦米確認他仍有呼吸
              "（追兵的腳步聲遠去。你跌跌撞撞跑到秦無風身邊，伸手探他的鼻息——還有呼吸。）",
            ],
          ],
        ],
      },
      "（你仍舉著柴刀，等了一會兒才發現敵人真的不見了。）",
      [HERO_NAME, "贏……贏了？", "surprise"],
      {
        branch: [
          [{ allFlags: ["ch04_qin_downed"] }, ["（話音剛落，秦無風勉強恢復意識，撐著劍想站起，卻無力站穩。）"]],
          [null, ["（話音剛落，秦無風手中的劍忽然一沉。）"]],
        ],
      },
      [HERO_NAME, "喂！", "shock"],
      { walk: [{ who: "player", near: "qin_c", dx: -40, dy: 10, run: true }] },
      "（你連忙伸出右手扶住他，左肩卻疼得倒抽冷氣。）",
      { effects: [{ type: "hook", name: "wince", who: "player" }] },
      ["秦無風", "放手。我自己能走。", "pain"],
      [HERO_NAME, "你都快倒了還逞強！", "angry"],
      ["秦無風", "……你也受傷。", "cold"],
      [HERO_NAME, "至少我還站得住！"],
      "（秦無風抬眼看你，竟沒有再反駁。）",
      ["老吳", "小子！王小明！"],
      [HERO_NAME, "我在這！還活著！", "grin"],
      { walk: [{ who: "wu_fo2", near: "player", dx: -56, dy: 18 }] },
      "（老吳從樹間鑽出，見到滿地打鬥痕跡與黑衣傷者，臉色頓時黑了。）",
      ["老吳", "我叫你回村，你跑去跟拿刀的人吵架？！"],
      [HERO_NAME, "我也是一時衝動嘛！", "tired"],
      ["老吳", "你知不知道差點把命送掉！"],
      "（你被罵得縮了縮脖子。）",
      ["秦無風", "此事因我而起，莫怪他。", "serious"],
      "（老吳轉向他，半晌才開口。）",
      ["老吳", "你也別急著說話。這裡不安全。附近溪谷有條避風的石洞，先去那裡躲躲。天色晚了，追兵還可能回來。"],
      "（三人沿著側道慢慢移動。秦無風能自行挪步，卻無法快走；老吳扶住他較穩的那一側，你只提藥簍與輕物。）",
      { effects: [{ type: "set_flag", key: "ch04_to_cave" }] },
      "【提示】沿林道往西南走，從山泉岔路繞過水潭，到溪谷的避風石洞。",
    ],
  },
  dlg_ch04_follow: {
    lines: [["老吳", "別停下來。石洞在山泉那頭，繞過水潭就是。"]],
  },
  // 走到石洞口才接下去（秦無風、老吳一路跟在後面）
  dlg_ch04_cave: {
    lines: [
      { walk: [{ who: "qin_f", x: FO_CAVE.x - 30, y: FO_CAVE.y + 22 }, { who: "wu_f", x: FO_CAVE.x + 40, y: FO_CAVE.y + 30 }] },
      "（到了石洞口，老吳探看四周，交代自己沿熟悉的小道先回村報信，設法找水和布條，再趁天亮前來接應。）",
      ["老吳", "你們別點大火，別亂走。"],
      [HERO_NAME, "這次真的不亂走！"],
      "（老吳看了你好半天。）",
      ["老吳", "……我姑且信你一次。"],
      { walk: [{ who: "wu_f", x: FO_CAVE.x + 260, y: FO_CAVE.y + 80 }] },
      { effects: [{ type: "hook", name: "ch04Cave" }, { type: "set_flag", key: "ch04_cave" }] },
      "（洞中只餘兩人。洞裡不深，火堆是老吳臨走前幫忙生的，只敢燒小小一堆。）",
      "【提示】到火堆旁照看秦無風。",
    ],
  },
  // 石洞室內：走到火堆旁跟秦無風說話才接下去
  dlg_ch04_cave_talk: {
    lines: [
      // 先走到秦無風身邊直接包紮（包紮完淡出時才回到火堆右邊的座位坐下）
      { walk: [{ who: "player", x: CH04_CAVE_QIN.x - 30, y: CH04_CAVE_QIN.y + 4 }] },
      // 包紮、守夜這段改播 assets/音樂/Cave Ember.mp3，天亮離開石洞時接回地圖音樂
      { effects: [{ type: "hook", name: "sceneMusic", src: "assets/音樂/Cave Ember.mp3" }, { type: "hook", name: "ch04Bandage" }] },
      "（你用乾淨布條壓住秦無風臂上的傷，動作生疏，卻認真照著沈若蘭教過的方法做。）",
      ["秦無風", "你不知我是誰。", "cold"],
      [HERO_NAME, "嗯？"],
      ["秦無風", "也不知那些人為何追殺我。"],
      [HERO_NAME, "對啊。"],
      ["秦無風", "那你為何救我？", "doubt"],
      { effects: [{ type: "hook", name: "ch04Bandage", hold: 2 }] },
      "（你的手停了一下。）",
      [HERO_NAME, "你們古代人救人都要先審履歷喔？", "doubt"],
      "（秦無風沒有笑。）",
      { effects: [{ type: "hook", name: "ch04Bandage", hold: 3 }] },
      "（你嘆了口氣，把布條紮妥。）",
      [HERO_NAME, "我不知道你是不是好人，也不敢保證救你沒麻煩。", "sigh"],
      { effects: [{ type: "hook", name: "ch04Bandage", on: false }] },
      "（你抬起頭。）",
      [HERO_NAME, "可是剛剛我看見他們要砍你。要是什麼都不做，我八成會一直想著那一幕。"],
      "（秦無風靜靜看著你。）",
      "（你摸了摸鼻子。）",
      [HERO_NAME, "總不能因為不認識你，就看著你死吧。", "smile"],
      { effects: [{ type: "hook", name: "ch04Wind" }] },
      "（洞外起風，吹得樹葉沙沙作響。）",
      "（秦無風低下眼，過了很久才開口。）",
      ["秦無風", "……你會後悔。", "cold"],
      [HERO_NAME, "拜託，現在就已經有點後悔了好嗎？", "tired"],
      { effects: [{ type: "hook", name: "emote", who: "qin_cave", icon: "…" }] },
      "（秦無風一怔。）",
      "（你卻咧嘴笑了。）",
      [HERO_NAME, "但救都救了，先想辦法活到明天吧。", "grin"],
      "（秦無風沒有答話，只輕輕點頭。）",
      "（夜色濃了。）",
      "（你從包裡找出在村中留下的一小塊乾餅，掰成兩半，把略大的一半擺在秦無風手邊。）",
      ["秦無風", "留著自己吃。", "cold"],
      [HERO_NAME, "我又沒有中毒。你先吃一點，別真的昏過去。"],
      ["秦無風", "我無妨。"],
      [HERO_NAME, "你這個「無妨」，聽起來就很有妨。", "doubt"],
      "（秦無風終於拿起乾餅，慢慢咬下一口。）",
      ["秦無風", "……你的名字？", "serious"],
      [HERO_NAME, "王小明。"],
      ["秦無風", "王小明？", "doubt"],
      [HERO_NAME, "對啦。很普通，我知道。", "sigh"],
      ["秦無風", "確實普通。", "serious"],
      [HERO_NAME, "靠！你不要一臉認真地補刀！", "shock"],
      "（秦無風望著你，嘴角似乎微微牽動。）",
      [HERO_NAME, "大家都叫我小蝦米。"],
      ["秦無風", "小蝦米。", "serious"],
      [HERO_NAME, "怎樣？至少比王小明有江湖味吧？", "grin"],
      ["秦無風", "……像菜名。", "smirk"],
      [HERO_NAME, "喂！", "angry"],
      { effects: [{ type: "hook", name: "ch04Wind" }, { type: "hook", name: "emote", who: "player", icon: "♪" }] },
      "（洞口傳來風聲。你氣得想回嘴，最後卻自己先笑出來。）",
      "（秦無風垂眼，像是忍耐了一下，才低聲說——）",
      ["秦無風", "秦無風。", "serious"],
      [HERO_NAME, "蛤？", "surprise"],
      ["秦無風", "我的名字。"],
      { effects: [{ type: "set_flag", key: "ch04_names" }] },
      [HERO_NAME, "喔！秦無風？這名字有夠帥！跟我這種路人名字差好多。", "laugh"],
      ["秦無風", "名字罷了。"],
      [HERO_NAME, "好啦，秦兄。", "grin"],
      ["秦無風", "秦兄？", "doubt"],
      [HERO_NAME, "不行喔？總不能一直叫你黑衣大哥。"],
      "（秦無風看了你半晌，最後沒有反對。）",
      "（你伸出右手。）",
      [HERO_NAME, "那就正式認識一下。我是小蝦米，暫住清河村王宅，目前職業是修房子兼打雜。", "smile"],
      ["秦無風", "這是何意？", "doubt"],
      [HERO_NAME, "我們家鄉認識新朋友會握手。"],
      "（你正想尷尬地把手收回——）",
      { cg: "cg/第4章_山洞握手.png" },
      "（秦無風卻伸手握住了你。）",
      "（掌心冰涼，力道不重。）",
      ["秦無風", "今日之恩，我記下了。", "serious"],
      [HERO_NAME, "恩不用先記。你先活到明天再說。", "smile"],
      ["秦無風", "……好。", "smile"],
      {
        effects: [
          { type: "set_flag", key: "ch04_handshake" },
          { type: "rel", char: "qin_wufeng", stat: "affection", n: 5, why: "山洞中的第一次握手" },
        ],
      },
      { cg: null },
      { effects: [{ type: "hook", name: "ch04Night" }] },
      "（夜裡你靠著石壁打盹，不時被風吹醒。）",
      "（秦無風有幾次睜眼，看見紅帽T的少年抱著背包、護著肩膀，仍時不時確認自己是否還有呼吸。）",
      "（他想開口說什麼，終究沒有出聲。）",
      // ---------- S10 回到清河村（小說第七幕）----------
      { effects: [{ type: "hook", name: "ch04Night", on: false }, { type: "hook", name: "ch04Dawn" }] },
      "（破曉前，老吳帶著水與簡單包布回到洞口。）",
      ["老吳", "追兵暫時沒影子，趁天亮前走。"],
      "（秦無風試著站起，腳步仍虛。老吳扶他走上較平的樵夫道；你背著藥簍，偶爾回頭張望。）",
      { effects: [{ type: "hook", name: "ch04CaveSit", on: false }, { type: "hook", name: "bgmResume" }, { type: "hook", name: "ch04Warp", map: "village", x: CH04.gate.x, y: CH04.gate.y, dir: 3, hour: 7, dawn: true }] },
      "（進村前，老吳先去找陳伯安說明情況。）",
    ],
    next: "dlg_ch04_chief",
  },

  dlg_ch04_chief: {
    lines: [
      { walk: [{ who: "chief_g", near: "player", dx: 64, dy: -4 }] },
      { effects: [{ type: "hook", name: "face", who: "chief_g", dir: 2 }] },
      "（村長聽罷，氣得木杖重重點地。）",
      ["陳伯安", "我昨天才叫你辰時來清點！怎麼轉眼又帶個受傷的外人回來？"],
      "（你縮著脖子。）",
      [HERO_NAME, "村長，我真的有先做完清點……", "tired"],
      ["陳伯安", "我是在問這個嗎！"],
      "（秦無風勉強拱手。）",
      ["秦無風", "在下秦無風。若會連累村人，我稍歇便走。", "serious"],
      "（陳伯安看了他一眼，又看看你與老吳。）",
      ["陳伯安", "你這樣子出村，不是倒在路邊，就是把追你的人引到村口。"],
      "（他沉吟片刻。）",
      ["陳伯安", "先去醫舍看傷。不得讓人聚在門口看熱鬧，也不得隱瞞追兵可能靠近的事。之後我再決定留不留人。"],
      [HERO_NAME, "收到！", "grin"],
      ["陳伯安", "少學那些怪腔怪調。"],
      {
        effects: [
          { type: "set_flag", key: "ch04_chief" },
          { type: "log", text: "村長得知秦無風入村：先到醫舍看傷，留不留人之後再議", toast: true },
          { type: "hook", name: "ch04Warp", map: "village", x: CH04.clinic.x - 70, y: CH04.clinic.y + 50, dir: 1, hour: 8 },
        ],
      },
    ],
    next: "dlg_ch04_treatment",
  },

  // ---------- S11 醫舍診治（若蘭按症狀照顧，不神奇解毒）----------
  dlg_ch04_treatment: {
    lines: [
      "（醫舍中，沈若蘭剛替老周換好布。見你帶回一名渾身帶傷的劍客，眉頭立刻蹙起。）",
      ["沈若蘭", "你答應我什麼？", "angry"],
      "（你乾笑。）",
      [HERO_NAME, "……記得回來。", "tired"],
      ["沈若蘭", "你是回來了。", "serious"],
      "（她望向秦無風。）",
      ["沈若蘭", "還多帶一位。"],
      [HERO_NAME, "這不是……順便嗎？", "tired"],
      "（沈若蘭沒有理你，先請秦無風坐穩，查看刀傷與脈象。她不敢憑眼前症狀便斷定藥物種類，只知道他異常虛弱，且傷口需要處理。）",
      ["沈若蘭", "傷口得洗淨、包紮。你說中了軟筋散？那是追你的人說的，還是你自己知道？", "serious"],
      "（秦無風略一沉默。）",
      ["秦無風", "聞到藥氣，之後手腳失力。", "pain"],
      "（若蘭點頭。）",
      ["沈若蘭", "我先按症狀照顧，不能保證立刻解毒。你今日不宜遠行，若呼吸或意識變差，得立刻叫我。", "serious"],
      // 【補】險勝（秦無風在戰鬥中倒下過）多一段診治
      {
        branch: [
          [
            { allFlags: ["ch04_qin_downed"] },
            [
              ["沈若蘭", "他在林子裡倒下過？……脈象比我想的還弱。今晚得有人守著，一有不對就來叫我。", "worry"],
              [HERO_NAME, "交給我。", "serious"],
            ],
          ],
        ],
      },
      // 【補】交出採回的青脈草
      {
        branch: [
          [
            { items: { qingmai: 1 } },
            [
              "（你把藥簍裡的青脈草交給若蘭。她一株株翻看葉背，點了點頭。）",
              ["沈若蘭", "都採對了。老周用得上。", "smile"],
              { effects: [{ type: "hook", name: "ch04GiveHerbs" }] },
            ],
          ],
        ],
      },
      [HERO_NAME, "聽見沒有？專業的說不能走。", "grin"],
      ["秦無風", "你也該換藥。", "cold"],
      "（沈若蘭轉頭看向你肩上的髒布。）",
      ["沈若蘭", "他說得對。"],
      [HERO_NAME, "……怎麼變成你們兩個一起罵我？", "shock"],
      {
        effects: [
          { type: "hook", name: "sfx2", sound: "cloth", times: 3, gap: 380 },
          { type: "heal" },
          { type: "log", text: "若蘭替左肩重新包紮（挫傷仍未痊癒）" },
        ],
      },
      "（若蘭一邊替你重新包紮，一邊問林裡發生的事。你照實說了追兵與戰鬥，卻也坦白自己不知道秦無風被追的原因。）",
      "（秦無風始終不談那件「東西」。）",
      ["秦無風", "我不能將追兵的事說得更明白。至少現在不能。", "serious"],
      "（陳伯安聽罷，臉色更沉。）",
      ["陳伯安", "既如此，村子也不可能毫無戒心地收留你。"],
      "（秦無風拱手。）",
      ["秦無風", "明白。", "cold"],
      "（村長看著他蒼白的臉，最後開口。）",
      ["陳伯安", "先容你在王宅暫歇一夜。明日再議。王小明，你原本的三日暫住之約照算，這不是給你招待江湖客的許可。"],
      [HERO_NAME, "知道，我會負責！"],
      ["陳伯安", "你先學會別每回都把命押上去。"],
      {
        effects: [
          { type: "set_flag", key: "ch04_qin_stable" },
          { type: "rel", char: "chen_boan", stat: "trust", n: 2, why: "沒有隱瞞追兵的事" },
          { type: "log", text: "村長：秦無風只准在王宅暫歇一夜，明日再議；三日之約照算（今日已是第 3 日，即將到期）", toast: true },
          { type: "hook", name: "ch04Warp", map: "in_river", x: WROOM.door.x, y: WROOM.door.y - 40, dir: 1, hour: 17.5 },
        ],
      },
    ],
    next: "dlg_ch04_guest",
  },

  // ---------- S12 王宅的第二個人（小說第八幕）→ S13 追兵懸念 → 第 4 章完 ----------
  dlg_ch04_guest: {
    lines: [
      "（傍晚，秦無風在老吳攙扶下，走進王宅。）",
      "（他看了看修補過的門、色澤不同的屋瓦，還有窗台那只插著野花的陶杯。）",
      ["秦無風", "這就是你的住處？"],
      [HERO_NAME, "對啊。怎樣？不錯吧？", "grin"],
      "（秦無風看了看門框。）",
      ["秦無風", "門還有些歪。", "serious"],
      [HERO_NAME, "……", "tired"],
      "（他又看了看窗紙。）",
      ["秦無風", "夜裡會漏風。", "serious"],
      [HERO_NAME, "……", "tired"],
      ["秦無風", "屋瓦也不是全新。", "serious"],
      [HERO_NAME, "你到底來養傷還是來驗屋的啊？！", "shock"],
      "（秦無風嘴角微動。你一怔。）",
      [HERO_NAME, "欸！你剛剛笑了對不對？", "surprise"],
      ["秦無風", "沒有。", "cold"],
      [HERO_NAME, "明明就有！", "laugh"],
      "（秦無風不再回話，只靠在床邊坐下。）",
      "（你把屋裡唯一一張較穩的床讓給他，自己鋪了席子，預備今晚睡在內牆邊。秦無風見狀，皺眉。）",
      ["秦無風", "不用。", "serious"],
      [HERO_NAME, "你這身傷，總不能睡地板吧？"],
      ["秦無風", "我可以。"],
      [HERO_NAME, "你可以，我不可以讓你這樣睡。要是若蘭知道，第一個被罵的還是我。"],
      "（秦無風沒有再爭。）",
      { walk: [{ who: "wu_r", x: WROOM.door.x + 10, y: WROOM.door.y + 10 }] },
      "（窗外暮色漸沉。他看見門楣匾額上的兩個舊字。）",
      ["秦無風", "王宅？"],
      [HERO_NAME, "對啊。以前就叫這名字。很巧吧？我也姓王。"],
      ["秦無風", "你不是本村人。"],
      [HERO_NAME, "才來沒幾天。"],
      ["秦無風", "為何要費力修這間舊屋？", "doubt"],
      "（你正將借來的錘子放回牆角，聞言停了一下。你望向小蓮送的花，又看向屋外漸亮的村舍燈火。）",
      [HERO_NAME, "我也不知道自己會待多久。"],
      [HERO_NAME, "說不定哪天就找到回家的路了。", "sigh"],
      "（你笑了笑。）",
      [HERO_NAME, "但人在這裡，總得有個地方能回來吧。", "smile"],
      "（秦無風垂眼，輕聲重複。）",
      ["秦無風", "……回來。", "shy"],
      "（你忽然又轉過身。）",
      [HERO_NAME, "欸，秦兄，先說喔！"],
      ["秦無風", "何事？"],
      [HERO_NAME, "你如果留在這裡，傷好了要幫忙修房子。", "grin"],
      ["秦無風", "……"],
      [HERO_NAME, "我一個人真的修得很累耶！", "tired"],
      "（秦無風看著眼前這個剛剛把性命賭在陌生人身上的年輕人，沉默了片刻。）",
      ["秦無風", "……好。", "smile"],
      [HERO_NAME, "一言為定！", "laugh"],
      "（你笑得燦爛。秦無風也淡淡地笑了一下。）",
      "（屋外，一陣晚風吹過門楣。那塊重新掛好的「王宅」舊匾，輕輕晃了晃。）",
      {
        effects: [
          { type: "set_flag", key: "ch04_guest" },
          { type: "log", text: "秦無風在王宅暫歇（尚未入隊；明日村長再議去留）" },
        ],
      },
      { effects: [{ type: "hook", name: "ch04Backdrop", kind: "pursuit" }] },
      "【而同一時刻，黑松林北側。】",
      "（一名蒙面人半跪在泥地，指尖拂過一小片沾血的布條。）",
      ["蒙面人甲", "他們走的不是官道。"],
      "（另一人望向遠處若隱若現的村舍炊煙。）",
      ["蒙面人乙", "山下有人家。"],
      ["蒙面人甲", "要追嗎？"],
      ["蒙面人乙", "先回報。這次別再打草驚蛇。"],
      "（兩人的身影沒入林中。）",
      { cg: null },
      "（王宅裡，你正忙著找第二只乾淨的碗，還不知道這件事。）",
      "（你只覺得，今天的屋子好像沒有昨天那麼空了。）",
      // 守夜：小蝦米趴在床邊睡著 → 一夜過去 → 秦無風坐起
      { effects: [{ type: "hook", name: "night" }, { type: "hook", name: "pause", ms: 1000 }] },
      "（夜深了。秦無風躺下沒多久，額頭又開始發燙。）",
      { walk: [{ who: "player", x: WROOM.bed.x + 40, y: WROOM.bed.y + 24 }] },
      { effects: [{ type: "hook", name: "ch04Towel", on: true }] },
      "（你想起若蘭的交代——今晚得有人守著。你把席子拖到床邊，擰了條濕布，替他換過一次又一次。）",
      [HERO_NAME, "……撐住啊，秦兄。你答應要幫我修房子的。"],
      // 換布換到睡著：先停在敷布的畫面一會兒，再慢慢淡出、黑幕多停一下，淡入時已趴在床沿
      { effects: [{ type: "hook", name: "pause", ms: 2200 }] },
      { effects: [{ type: "hook", name: "ch04Doze", on: true, fade: 1600 }] },
      { effects: [{ type: "hook", name: "pause", ms: 1000 }] },
      "（不知什麼時候，你趴在床沿，睡著了。）",
      { effects: [{ type: "hook", name: "dawn" }, { type: "hook", name: "pause", ms: 800 }] },
      "【一夜過去】",
      { effects: [{ type: "set_flag", key: "ch04_qin_up" }] },
      "（晨光從窗縫透進來。秦無風睜開眼，慢慢撐起身子。）",
      "（他低頭，看見趴在床邊熟睡的你，手裡還攥著那條濕布。）",
      ["秦無風", "……傻子。", "shy"],
      { effects: [{ type: "hook", name: "ch04Doze", on: false }] },
      [HERO_NAME, "嗯……？秦兄你醒了！燒退了沒？！", "surprise"],
      ["秦無風", "退了。", "serious"],
      "【第04章 完】",
      {
        effects: [
          { type: "set_flag", key: "ch04_complete" },
          { type: "chapter", id: "ch05" },
          { type: "hook", name: "autosave" },
        ],
      },
    ],
  },
  dlg_ch04_qin_idle: {
    lines: [
      {
        branch: [
          [{ notFlags: ["ch04_complete"] }, [["秦無風", "……我沒事。你先去忙。", "cold"]]],
          [
            null,
            [
              ["秦無風", "門還是有些歪。", "smirk"],
              [HERO_NAME, "你養你的傷啦！", "shock"],
            ],
          ],
        ],
      },
    ],
  },
});

// ---------- 自動觸發 ----------
STORY_EVENTS.push(
  {
    id: "ch04_morning",
    map: "in_river",
    area: [WROOM.mid.x, WROOM.mid.y, 900],
    if: { allFlags: ["ch03_complete"], notFlags: ["ch04_morning"] },
    dialogue: "dlg_ch04_morning",
  },
  {
    id: "ch04_report",
    map: "village",
    area: [CH04.chief.x, CH04.chief.y, 170],
    if: { allFlags: ["ch04_morning"], notFlags: ["ch04_count_start"] },
    dialogue: "dlg_ch04_report",
  },
  {
    id: "ch04_inventory",
    map: "village",
    area: [CH04.chief.x, CH04.chief.y, 260],
    if: { allFlags: ["ch04_sorted"], notFlags: ["ch04_inventory"] },
    dialogue: "dlg_ch04_inventory",
  },
  {
    id: "ch04_clinic",
    map: "village",
    area: [CH04.clinic.x, CH04.clinic.y, 170],
    if: { allFlags: ["ch04_inventory"], notFlags: ["ch04_errand"] },
    dialogue: "dlg_ch04_clinic",
  },
  { id: "ch04_joke", map: "forest", if: { allFlags: ["ch04_herbs"], notFlags: ["ch04_joke"] }, dialogue: "dlg_ch04_joke" },
  { id: "ch04_reveal", map: "forest", if: { allFlags: ["ch04_traces"], notFlags: ["ch04_encounter"] }, dialogue: "dlg_ch04_reveal" },
  {
    id: "ch04_cave_arrive",
    map: "forest",
    area: [FO_CAVE.x, FO_CAVE.y + 40, 90],
    if: { allFlags: ["ch04_to_cave"], notFlags: ["ch04_cave"] },
    dialogue: "dlg_ch04_cave",
  },
  {
    id: "ch04_rebattle",
    map: "forest",
    once: false,
    if: { allFlags: ["ch04_encounter"], notFlags: ["ch04_battle_won"] },
    dialogue: "dlg_ch04_rebattle",
  },
);

// ---------- 調查點 ----------
const ch04Herb = (i) => ({
  lines: [
    { effects: [{ type: "hook", name: "herbGlow", who: "player" }] },
    i ? "（石坡下又是一叢矮草。）" : "（石坡旁一叢矮草。你蹲下翻開葉片，拿出若蘭的藥草筆記對照。）",
    "（依照若蘭的筆記，葉片成對、葉脈清楚——是青脈草。）",
    {
      effects: [
        { type: "item", id: "qingmai", n: 1, why: "照若蘭的筆記採集" },
        { type: "hook", name: "ch03Count", group: "ch04herb", key: "ch04_h" + (i + 1) },
      ],
    },
  ],
});
CH04.herbs.forEach((_, i) => {
  DIALOGUES["dlg_ch04_herb" + (i + 1)] = ch04Herb(i);
});
STORY_SPOTS.push(
  ch03Spot(
    "ch04_s_bamboo",
    "village",
    CH04.bamboo,
    "裂竹",
    { allFlags: ["ch04_count_start"], notFlags: ["ch04_s_bamboo", "ch04_sorted"] },
    "dlg_ch04_s_bamboo",
  ),
  ch03Spot(
    "ch04_s_wood",
    "village",
    CH04.wood,
    "舊木",
    { allFlags: ["ch04_count_start"], notFlags: ["ch04_s_wood", "ch04_sorted"] },
    "dlg_ch04_s_wood",
  ),
  ch03Spot(
    "ch04_s_rope",
    "village",
    CH04.rope,
    "粗繩",
    { allFlags: ["ch04_count_start"], notFlags: ["ch04_s_rope", "ch04_sorted"] },
    "dlg_ch04_s_rope",
  ),
  ...CH04.herbs.map((p, i) =>
    ch03Spot(
      "ch04_h" + (i + 1),
      "forest",
      p,
      "青脈草",
      { allFlags: ["ch04_herb_learned"], notFlags: ["ch04_h" + (i + 1)] },
      "dlg_ch04_herb" + (i + 1),
    ),
  ),
  ch03Spot("ch04_t_hoof", "forest", CH04.hoof, "馬蹄印", { allFlags: ["ch04_joke"], notFlags: ["ch04_t_hoof", "ch04_traces"] }, "dlg_ch04_hoof", 60),
  ch03Spot(
    "ch04_t_arrow",
    "forest",
    CH04.arrow,
    "斷箭",
    { allFlags: ["ch04_joke"], notFlags: ["ch04_t_arrow", "ch04_traces"] },
    "dlg_ch04_arrow",
    60,
  ),
);

// ---------- 劇情 NPC（老周沿用張叔走路圖染色當占位）----------
const CH04_ZHOU = { art: "laozhou" };
const CH04_CHIEF = { art: "chief", filter: "grayscale(.8) sepia(.35) brightness(1.15)" };
STORY_NPCS.push(
  // 祠堂石階下
  {
    id: "chief_i",
    map: "village",
    name: "陳伯安",
    ...CH04_CHIEF,
    x: CH04.chief.x,
    y: CH04.chief.y,
    dir: 0,
    scale: 1.3,
    show: { allFlags: ["ch04_morning"], notFlags: ["ch04_inventory"] },
    talk: [[null, "dlg_ch04_chief_wait"]],
  },
  {
    id: "wu_i",
    map: "village",
    name: "老吳",
    art: "woodcutter",
    x: CH04.lane.x,
    y: CH04.lane.y,
    dir: 3,
    scale: 1.3,
    show: { allFlags: ["ch04_sorted"], notFlags: ["ch04_inventory"] },
    talk: [],
  },
  {
    id: "zhou_i",
    map: "village",
    name: "老周",
    ...CH04_ZHOU,
    x: CH04.lane.x - 40,
    y: CH04.lane.y + 10,
    dir: 3,
    scale: 1.25,
    show: { allFlags: ["ch04_sorted"], notFlags: ["ch04_inventory"] },
    talk: [],
  },
  // 醫舍（藥鋪門前）：若蘭從此章起留在醫舍
  {
    id: "ruolan_k",
    map: "village",
    name: "沈若蘭",
    art: "shenruolan",
    x: CH04.clinic.x,
    y: CH04.clinic.y,
    dir: 0,
    scale: 1.35,
    sit: true,
    stool: true,
    show: { allFlags: ["ch04_morning"] },
    talk: [
      [{ allFlags: ["ch04_complete"] }, "dlg_ruolan_idle"],
      [null, "dlg_ch04_ruolan_idle"],
    ],
  },
  {
    id: "zhou_k",
    map: "village",
    name: "老周",
    ...CH04_ZHOU,
    x: CH04.clinic.x - 60,
    y: CH04.clinic.y + 14,
    dir: 3,
    scale: 1.25,
    sit: true,
    show: { allFlags: ["ch04_inventory"], notFlags: ["ch04_complete"] },
    talk: [[null, "dlg_ch04_zhou"]],
  },
  {
    id: "wu_k",
    map: "village",
    name: "老吳",
    art: "woodcutter",
    x: CH04.clinic.x + 70,
    y: CH04.clinic.y + 20,
    dir: 2,
    scale: 1.3,
    show: { allFlags: ["ch04_inventory"], notFlags: ["ch04_errand"] },
    talk: [],
  },
  {
    id: "qin_k",
    map: "village",
    name: "秦無風",
    art: "qinwufeng",
    x: CH04.clinic.x + 66,
    y: CH04.clinic.y + 24,
    dir: 2,
    scale: 1.35,
    sit: true,
    show: { allFlags: ["ch04_chief"], notFlags: ["ch04_qin_stable"] },
    talk: [],
  },
  {
    id: "chief_k",
    map: "village",
    name: "陳伯安",
    ...CH04_CHIEF,
    x: CH04.clinic.x + 130,
    y: CH04.clinic.y + 50,
    dir: 2,
    scale: 1.3,
    show: { allFlags: ["ch04_chief"], notFlags: ["ch04_qin_stable"] },
    talk: [],
  },
  // 黑松林（村外森林）
  {
    id: "wu_fo",
    map: "forest",
    name: "老吳",
    art: "woodcutter",
    x: CH04.wu.x,
    y: CH04.wu.y,
    dir: 2,
    scale: 1.3,
    show: { allFlags: ["ch04_errand"], notFlags: ["ch04_encounter"] },
    talk: [[null, "dlg_ch04_wu_forest"]],
  },
  {
    id: "qin_c",
    map: "forest",
    name: "秦無風",
    art: "qinwufeng",
    x: CH04.clearing.x + 40,
    y: CH04.clearing.y - 10,
    dir: 0,
    scale: 1.35,
    show: { allFlags: ["ch04_traces"], notFlags: ["ch04_to_cave"] },
    talk: [],
  },
  {
    id: "mk_a",
    map: "forest",
    name: "蒙面人甲",
    art: "masked",
    x: CH04.clearing.x - 50,
    y: CH04.clearing.y + 40,
    dir: 3,
    scale: 1.35,
    show: { allFlags: ["ch04_traces"], notFlags: ["ch04_battle_won"] },
    talk: [],
  },
  {
    id: "mk_b",
    map: "forest",
    name: "蒙面人乙",
    art: "masked",
    x: CH04.clearing.x + 130,
    y: CH04.clearing.y - 50,
    dir: 2,
    scale: 1.35,
    show: { allFlags: ["ch04_traces"], notFlags: ["ch04_battle_won"] },
    talk: [],
  },
  {
    id: "wu_fo2",
    map: "forest",
    name: "老吳",
    art: "woodcutter",
    x: CH04.hide.x + 60,
    y: CH04.hide.y,
    dir: 1,
    scale: 1.3,
    show: { allFlags: ["ch04_battle_won"], notFlags: ["ch04_to_cave"] },
    talk: [],
  },
  // 石洞室內：秦無風靠在火堆右邊，跟他說話開始洞中對話
  {
    id: "qin_cave",
    map: "in_cave",
    name: "秦無風",
    art: "qinwufeng",
    x: CH04_CAVE_QIN.x,
    y: CH04_CAVE_QIN.y,
    dir: 1,
    scale: 1.35,
    lie: CH04_CAVE_QIN_IMG,
    show: { allFlags: ["ch04_cave"], notFlags: ["ch04_chief"] },
    talk: [[{ notFlags: ["ch04_handshake"] }, "dlg_ch04_cave_talk"]],
  },
  // 前往避風石洞：秦無風、老吳跟在玩家後面
  {
    id: "qin_f",
    map: "forest",
    name: "秦無風",
    art: "qinwufeng",
    x: CH04.rush.x + 40,
    y: CH04.rush.y + 10,
    dir: 3,
    scale: 1.35,
    follow: 72,
    show: { allFlags: ["ch04_to_cave"], notFlags: ["ch04_cave"] },
    talk: [[null, "dlg_ch04_follow"]],
  },
  {
    id: "wu_f",
    map: "forest",
    name: "老吳",
    art: "woodcutter",
    x: CH04.rush.x + 80,
    y: CH04.rush.y + 20,
    dir: 3,
    scale: 1.3,
    follow: 128,
    show: { allFlags: ["ch04_to_cave"], notFlags: ["ch04_cave"] },
    talk: [[null, "dlg_ch04_follow"]],
  },
  // 破曉的西村口
  {
    id: "chief_g",
    map: "village",
    name: "陳伯安",
    ...CH04_CHIEF,
    x: CH04.gate.x + 160,
    y: CH04.gate.y - 10,
    dir: 2,
    scale: 1.3,
    show: { allFlags: ["ch04_handshake"], notFlags: ["ch04_chief"] },
    talk: [],
  },
  {
    id: "wu_g",
    map: "village",
    name: "老吳",
    art: "woodcutter",
    x: CH04.gate.x + 40,
    y: CH04.gate.y - 50,
    dir: 3,
    scale: 1.3,
    show: { allFlags: ["ch04_handshake"], notFlags: ["ch04_chief"] },
    talk: [],
  },
  {
    id: "qin_g",
    map: "village",
    name: "秦無風",
    art: "qinwufeng",
    x: CH04.gate.x - 50,
    y: CH04.gate.y + 30,
    dir: 3,
    scale: 1.35,
    show: { allFlags: ["ch04_handshake"], notFlags: ["ch04_chief"] },
    talk: [],
  },
  // 王宅：秦無風躺在床上養傷（不是入隊）；lie 是整張躺床圖在王宅地圖上的位置與大小，要微調就改這四個數字
  {
    id: "qin_r",
    map: "in_river",
    name: "秦無風",
    art: "qinwufeng",
    x: WROOM.bed.x,
    y: WROOM.bed.y,
    dir: 0,
    scale: 1.35,
    lie: { img: Object.assign(new Image(), { src: "assets/characters/qinwufeng_lie.png" }), x: 119, y: 251, w: 183, h: 148 },
    show: { allFlags: ["ch04_qin_stable"], notFlags: ["ch04_qin_up"] },
    talk: [[null, "dlg_ch04_qin_idle"]],
  },
  // 守夜隔天清晨：秦無風在床上坐起
  {
    id: "qin_r_up",
    map: "in_river",
    name: "秦無風",
    art: "qinwufeng",
    x: WROOM.bed.x,
    y: WROOM.bed.y,
    dir: 0,
    scale: 1.35,
    lie: { img: Object.assign(new Image(), { src: "assets/characters/qinwufeng_sitbed.png" }), x: 125, y: 260, w: 160, h: 130 },
    show: { allFlags: ["ch04_qin_up"] },
    talk: [[null, "dlg_ch04_qin_idle"]],
  },
  {
    id: "wu_r",
    map: "in_river",
    name: "老吳",
    art: "woodcutter",
    x: WROOM.door.x - 60,
    y: WROOM.door.y - 70,
    dir: 1,
    scale: 1.3,
    show: { allFlags: ["ch04_qin_stable"], notFlags: ["ch04_guest"] },
    talk: [],
  },
);

// ---------- 初遇之戰：沿用 tactics.js 的戰棋（T.sc 劇情戰）----------
// 實力：健康的秦無風 ＞ 蒙面人（沿用 ENEMIES.masked）＞ 小蝦米（不會武功：攻擊上限 12）
// 秦無風中毒：每個完整回合結束扣最大氣血 12%；歸零只是重傷倒地，不會 Game Over
// 蒙面人氣血降到 25% 就撤退（不算死亡）；一人撤退，另一人這一回合結束也撤；秦無風倒下後再撐一回合，老吳的喊聲也會逼退追兵
const CH04_POISON = 0.12;
const CH04_FOE = { hp: ENEMIES.masked.hp, atk: ENEMIES.masked.atk, def: ENEMIES.masked.def, mv: 4, rng: 1, flee: 0.25 };
const CH04_GRADES = {
  perfect: {
    label: "完美勝利｜生死之交",
    rewards: [
      { type: "item", id: "leather", n: 1 },
      { type: "item", id: "salve", n: 2 },
      { type: "rel", char: "qin_wufeng", stat: "trust", n: 8 },
    ],
  },
  normal: {
    label: "普通勝利｜患難之交",
    rewards: [
      { type: "item", id: "bracer", n: 1 },
      { type: "item", id: "salve", n: 1 },
      { type: "rel", char: "qin_wufeng", stat: "trust", n: 5 },
    ],
  },
  narrow: {
    label: "險勝｜命懸一線",
    rewards: [
      { type: "item", id: "herb", n: 3 },
      { type: "rel", char: "qin_wufeng", stat: "trust", n: 3 },
    ],
  },
};
let ch04Snap = null;
const ch04Unit = (kind) => T.units.find((u) => u.kind === kind);
const ch04Sleep = (ms) => new Promise((res) => setTimeout(res, ms));
function startCh04Battle() {
  const c = CH04.clearing,
    f = F();
  // 第一次開戰前問要不要看說明；之後重試就不再問
  const tutorial = !f.ch04_tut;
  f.ch04_tut = 1;
  // 林中一路採藥下來，至少留七成氣血進戰，避免一開戰就被兩刀撂倒
  S.hp = Math.max(S.hp, Math.ceil(S.maxHp * 0.7));
  // 戰前檢查點：小蝦米倒下時從這裡重試（只存在記憶體，不寫入存檔）
  ch04Snap = JSON.stringify(S);
  Object.assign(T, {
    on: true,
    sc: CH04_BATTLE,
    units: [],
    turn: 1,
    phase: "player",
    sel: null,
    mode: null,
    menu: null,
    busy: 0,
    cursor: null,
    msg: "",
    msgT: 0,
    waves: [],
    breach: 0,
    lostMilitia: 0,
    pickAlly: false,
  });
  T.ox = Math.round(Math.max(0, Math.min(G.W - VW, c.x - VW / 2)));
  T.oy = Math.round(Math.max(0, Math.min(G.H - VH, c.y - VH / 2)));
  T.cx = T.ox + VW / 2;
  T.cy = T.oy + VH / 2;
  T.ch04 = { ev: {}, poisonTurn: 0, retreatTurn: 99, qinHp: 0 };
  npcs = [];
  monsters = [];
  tBuildGrid();
  tUnit("hero", "ally", ...tFree(...tCell(CH04.rush.x, CH04.rush.y)), {
    name: HERO_NAME,
    hp: S.hp,
    maxHp: S.maxHp,
    atk: Math.min(stat.atk(), 12),
    def: stat.def(),
    mv: 4,
    rng: 1,
    ctrl: true,
    dir: 3,
    note: "左肩挫傷・不會武功",
  });
  tUnit("qin", "ally", ...tFree(...tCell(c.x + 40, c.y - 10)), {
    name: "秦無風",
    hp: 100,
    atk: 32,
    def: 9,
    mv: 3,
    rng: 1,
    ctrl: true,
    dir: 0,
    note: `中毒（軟筋散）：每回合結束 -${Math.ceil(100 * CH04_POISON)}、移動力下降`,
  });
  tUnit("masked", "enemy", ...tFree(...tCell(c.x - 50, c.y + 40)), { ...CH04_FOE, name: "蒙面人甲", prefer: "hero", dir: 2 });
  tUnit("masked", "enemy", ...tFree(...tCell(c.x + 130, c.y - 50)), { ...CH04_FOE, name: "蒙面人乙", prefer: "qin", dir: 2 });
  $("gameBox").classList.add("intactics");
  Music.setMode("battle");
  const help = [
    "【戰棋操作】點選小蝦米或秦無風，會跳出行動選單：移動、攻擊、防禦、道具（小蝦米）、待機。兩人都行動完就自動結束回合，也可以按「結束回合」。",
    "（方向鍵移動游標、E 確定、Esc 取消、Q 結束回合；滑鼠右鍵也能取消。）",
    "【注意】秦無風身中毒傷，每回合結束都會失血。小蝦米站到他旁邊用「道具」，就能把止血草遞給他。",
    "【勝敗】擊退兩名蒙面人（追兵會撤退）。秦無風倒下不會結束戰鬥；小蝦米倒下就是 GAME OVER。",
  ];
  talk([
    "（秦無風勉強挺直身子，持劍擋在你前方。）",
    ["秦無風", "你不會武功？", "cold"],
    [HERO_NAME, "……現在學還來得及嗎？", "tired"],
    ["秦無風", "退後。別站在我劍前。", "serious"],
    ...(tutorial
      ? [
          {
            name: "",
            q: "第一次雙人戰棋。要看操作說明嗎？",
            choices: [
              ["看說明", () => help],
              ["跳過", () => []],
            ],
          },
        ]
      : []),
  ]);
}
// 剩下的追兵全部撤退 → 勝利
function ch04Win() {
  if (T.ch04.won) return;
  T.ch04.won = true;
  T.phase = "over";
  T.ch04.qinHp = ch04Unit("qin").hp;
  for (const e of T.units)
    if (e.side === "enemy" && e.hp > 0) {
      e.fled = true;
      e.hp = 0;
      tFloat(e, "撤退", "#ffd27a");
    }
  setTimeout(
    () =>
      talk([
        // 【補】小說：林外響起老吳呼喊同伴的聲音
        "（林外忽然傳來老吳扯開嗓子的喊聲：「這邊——！快來人哪——！」）",
        ["蒙面人甲", "再拖下去會引來村人。撤！"],
        ["蒙面人乙", "秦無風，這事還沒完！"],
        "（兩人且戰且退，消失於林道另一端。）",
        "【戰棋勝利：擊退蒙面追兵】",
        () => endTactics(true),
      ]),
    600,
  );
}
function ch04GameOver() {
  ch04Backdrop("black");
  talk([
    "【命斷黑松林】",
    // 【補】短結局
    "（刀光落下的那一刻，你忽然想起若蘭那句「記得回來」。）",
    "（可黑松林太深了。你的聲音，傳不出去。）",
    {
      name: "",
      q: "GAME OVER",
      choices: [
        [
          "從戰前檢查點重試",
          () => {
            Object.assign(S, JSON.parse(ch04Snap));
            fade(startCh04Battle, 600);
          },
        ],
        [
          "回到標題畫面",
          () => {
            showTitle();
          },
        ],
      ],
    },
  ]);
}
const CH04_BATTLE = {
  bar() {
    const q = ch04Unit("qin"),
      fled = T.units.filter((u) => u.fled).length;
    return `秦無風 ${q.downed ? "重傷倒地" : `毒傷：每回合 -${Math.ceil(q.maxHp * CH04_POISON)}`}　擊退蒙面人 ${fled}/2`;
  },
  onHit(a, b) {
    const ev = T.ch04.ev;
    if (b.side === "enemy" && !b.fled && b.hp <= b.maxHp * b.flee) {
      b.hp = 0;
      b.fled = true;
    }
    if (a.kind === "masked" && b.kind === "hero" && !ev.onHero) {
      ev.onHero = 1;
      talk([
        [HERO_NAME, "我先聲明！我跟他今天才認識！", "shock"],
        ["蒙面人甲", "那你出來做什麼！"],
        [HERO_NAME, "這不是正在後悔嗎！", "tired"],
      ]);
    } else if (a.kind === "hero" && b.side === "enemy" && !ev.heroHit) {
      ev.heroHit = 1;
      talk(["（你以柴刀試探攻擊，力道不足，只逼得對方側了側身。）", ["蒙面人乙", "就這點本事？"], [HERO_NAME, "我從來沒說我很強啊！", "shock"]]);
    } else if (a.kind === "qin" && !ev.qinHit) {
      ev.qinHit = 1;
      talk([
        "（秦無風抬手，劍光一閃，將迫近的敵人逼退。）",
        [HERO_NAME, "哇靠！這招好帥！你等等可以教我嗎？", "surprise"],
        ["秦無風", "先把命留下。", "cold"],
      ]);
    }
  },
  onDie(u) {
    const st = T.ch04;
    if (u.kind === "hero") {
      T.phase = "over";
      setTimeout(() => talk([`（${HERO_NAME}重傷倒地……）`, () => endTactics(false)]), 700);
      return;
    }
    if (u.kind === "qin") {
      // 重傷倒地：留在原格、不能再行動；再撐一回合，林外的喊聲會逼退追兵
      u.downed = true;
      u.ctrl = false;
      u.acted = true;
      u.note = "重傷倒地（不會死亡，戰後甦醒）";
      st.retreatTurn = Math.min(st.retreatTurn, T.turn + 1);
      talk([
        "（秦無風單膝跪地，劍尖拄進土裡，再也撐不起身子。）",
        [HERO_NAME, "喂！你不准先倒啊！", "shock"],
        "【秦無風重傷倒地，無法行動。小蝦米，撐到追兵撤退！】",
      ]);
      return;
    }
    if (u.fled) {
      tFloat(u, "撤退", "#ffd27a");
      if (!T.units.some((e) => e.side === "enemy" && e.hp > 0)) return ch04Win();
      // 一人被擊退，另一人也無心戀戰：這一回合結束就撤
      st.retreatTurn = Math.min(st.retreatTurn, T.turn);
      T.msg = `${u.name}退出戰圈！`;
      T.msgT = 2.2;
    }
  },
  // 每個完整回合結束：秦無風毒傷發作（只結算一次）、檢查追兵是否撤退
  async turnEnd() {
    const st = T.ch04,
      q = ch04Unit("qin");
    if (st.poisonTurn !== T.turn) {
      st.poisonTurn = T.turn;
      if (q.hp > 0) {
        const d = Math.min(q.hp, Math.ceil(q.maxHp * CH04_POISON));
        q.hp -= d;
        q.flash = 0.3;
        tFloat(q, "毒傷 -" + d, "#c080ff");
        if (!st.ev.poison) {
          st.ev.poison = 1;
          T.msg = "秦無風毒傷發作！每回合結束都會失血";
          T.msgT = 2.5;
        }
        await ch04Sleep(800);
        if (q.hp <= 0) tDie(q);
        else if (!st.ev.medicine && q.hp <= q.maxHp * 0.6) {
          st.ev.medicine = 1;
          talk([
            "（秦無風的動作慢了下來，臉色愈發蒼白。你從背包抽出止血藥。）",
            [HERO_NAME, "喂！你先別逞強，我這裡有藥！", "worry"],
            ["秦無風", "現在不是時候。", "pain"],
            [HERO_NAME, "那就打完再擦！但你不准先倒！", "angry"],
            ...(usable().some((id) => ITEMS[id].heal) ? ["【提示】小蝦米站到秦無風旁邊，用「道具」就能把藥遞給他。"] : []),
          ]);
        }
      }
    }
    while (D.open) await ch04Sleep(120);
    if (T.phase === "over") return false;
    if (T.turn >= st.retreatTurn) {
      ch04Win();
      return false;
    }
    return true;
  },
  end(win) {
    if (!win) return ch04GameOver();
    const f = F(),
      q = ch04Unit("qin"),
      hp = T.ch04.qinHp;
    // 以敵軍撤退的瞬間判定評價；旗標只寫一次
    const grade = hp <= 0 ? "narrow" : hp >= q.maxHp * 0.3 ? "perfect" : "normal";
    if (!f.ch04_battle_won)
      Object.assign(f, { ch04_battle_won: 1, ch04_grade: grade, ["ch04_g_" + grade]: 1, ch04_qin_downed: grade === "narrow" ? 1 : 0 });
    player.x = CH04.rush.x;
    player.y = CH04.rush.y;
    player.dir = 3;
    refreshNpcs();
    questTick();
    playDialogue("dlg_ch04_after");
  },
};

// ---------- 畫面：洞中、追兵、GAME OVER 的底色（#cg 疊一層漸層，對話照常疊在上面）----------
const CH04_BACKDROPS = {
  // 石洞內部圖原本是白天的光，疊一層夜色和中間的柴火光
  cave: "radial-gradient(ellipse at 50% 58%, rgba(255,150,60,.35), rgba(120,55,20,.12) 24%, rgba(0,0,0,0) 46%), linear-gradient(rgba(8,10,24,.55), rgba(8,10,24,.55)), url('assets/cg/第4章_石洞內部.png')",
  pursuit: "radial-gradient(ellipse at 70% 20%, rgba(140,160,190,.18), rgba(0,0,0,0) 40%), linear-gradient(#0f1c16, #050807)",
  black: "none",
};
function ch04Backdrop(kind) {
  const el = $("cg");
  cgUi(null);
  el.style.backgroundImage = CH04_BACKDROPS[kind];
  el.classList.remove("push");
  el.classList.add("on");
}
// 淡出淡入期間收起對話框，換好場景再接下一句
function ch04Fade(mid, hold = 700) {
  D.hold = true;
  $("dlg").classList.remove("open");
  fade(mid, hold);
  setTimeout(
    () => {
      D.hold = false;
      $("dlg").classList.add("open");
      step();
    },
    650 + hold + 600,
  );
}

// ---------- hooks ----------
// 小蝦米趴在床邊睡（assets/characters/hero_doze.png）：整張圖依世界座標畫在床沿
// 跪在床前、側身往左上前傾，伸手替秦無風敷額頭（hero_towel.png，2 格 400×400：濕布伸出／按下）；身體疊到床沿上，手才搆得到枕頭
const CH04_TOWEL = { sheet: Object.assign(new Image(), { src: "assets/characters/hero_towel.png" }), x: 158, y: 275, w: 104, h: 104, breathe: true, fr: (now) => Math.floor(now / 1300) % 2 };
const CH04_DOZE = { img: Object.assign(new Image(), { src: "assets/characters/hero_doze.png" }), x: 195, y: 349, w: 108, h: 82 };
// 第 4 章清晨醒來：躺床（hero_lie.png，跟秦無風躺床同構圖、同床位）、坐床邊（hero_sitbed.png，雙腳垂到床前地板）
const CH04_WAKE = {
  lie: { img: Object.assign(new Image(), { src: "assets/characters/hero_lie.png" }), x: 125, y: 260, w: 160, h: 130 },
  sit: { img: Object.assign(new Image(), { src: "assets/characters/hero_sitbed.png" }), x: 207, y: 314, w: 86, h: 82 },
};
// ---------- 洞中小效果（畫在夜色之上：overFx）----------
const CH04_NIGHT = { on: false };
// 頭頂位置（世界座標）：坐著的人頭頂約在腳底上方 78
const ch04Head = (who) => (who === "qin" ? { x: CH04_CAVE_QIN.x - 2, y: CH04_CAVE_QIN.y - 82 } : { x: CH04_CAVE_SEAT.x + 6, y: CH04_CAVE_SEAT.y - 80 });
// 打盹時頭上斷斷續續飄出 z：預設是洞裡（CH04_NIGHT.on 關掉就停）；h／alive 可換成別的頭頂位置與停止條件
function ch04Zzz(h = ch04Head("player"), alive = () => CH04_NIGHT.on) {
  const t0 = performance.now();
  overFx.push({ draw() {
    if (!alive()) return false;
    const t = (performance.now() - t0) / 1000;
    for (let i = 0; i < 3; i++) {
      const p = (t / 2.4 + i / 3) % 1;
      ctx.save(); ctx.globalAlpha = Math.sin(p * Math.PI) * 0.85; ctx.font = `bold ${9 + p * 7}px sans-serif`; ctx.textAlign = "center";
      ctx.lineWidth = 2.5; ctx.strokeStyle = "#1a1220"; const x = h.x - cam.x + 10 + p * 14 + Math.sin(p * 6) * 3, y = h.y - cam.y - p * 26;
      ctx.strokeText("z", x, y); ctx.fillStyle = "#e8f0ff"; ctx.fillText("z", x, y); ctx.restore();
    }
    return true;
  } });
}
// 起風：火光晃得比較兇（約 2 秒），灰燼和碎葉從洞口那側斜斜飄過畫面
function ch04Wind() {
  const L = G.lights.find((p) => p.campfire), f0 = L && L.flick, t0 = performance.now();
  if (L) { L.flick = 0.28; setTimeout(() => { L.flick = f0; }, 2000); }
  const bits = Array.from({ length: 22 }, () => ({ x: -40 - Math.random() * 300, y: 120 + Math.random() * 300, v: 260 + Math.random() * 160, s: 1 + Math.random() * 2, leaf: Math.random() < 0.35, ph: Math.random() * 6 }));
  overFx.push({ draw() {
    const t = (performance.now() - t0) / 1000; if (t > 2.6) return false;
    for (const b of bits) {
      const x = b.x + b.v * t, y = b.y - t * 40 + Math.sin(t * 5 + b.ph) * 6; if (x < -10 || x > VW + 10) continue;
      ctx.globalAlpha = Math.min(1, (2.6 - t) * 1.5) * 0.8;
      ctx.fillStyle = b.leaf ? "#6b5a2e" : "#ffb070"; ctx.fillRect(Math.round(x), Math.round(y), b.leaf ? 4 : b.s, b.leaf ? 2 : b.s);
    }
    ctx.globalAlpha = 1; return true;
  } });
}
Object.assign(STORY_HOOKS, {
  ch04Towel: (e) => { player.lie = e.on ? CH04_TOWEL : null; },
  ch04Doze: (e) => {
    // 趴在床沿睡著：頭頂（CH04_DOZE 圖裡頭的位置）飄 z，起身就停
    if (e.on) setTimeout(() => ch04Zzz({ x: CH04_DOZE.x + 44, y: CH04_DOZE.y + 18 }, () => player.lie === CH04_DOZE), e.fade ? 700 : 0);
    if (e.fade) return ch04Fade(() => { player.lie = e.on ? CH04_DOZE : null; }, e.fade);
    player.lie = e.on ? CH04_DOZE : null;
  },
  ch04CaveSit: (e) => {
    player.lie = e.on ? CH04_CAVE_HERO_IMG : null;
    const q = ch04Qin(); if (q) q.lie = CH04_CAVE_QIN_IMG;
    if (!e.on) CH04_NIGHT.on = false;
  },
  // 包紮：兩人分開的坐姿先藏起來，改畫合在一起的包紮圖；hold 停在某格；on:false 換回各自坐著
  // 開始與結束時畫面淡出淡入，遮住小蝦米從座位移到秦無風身邊（只改 hold 時不淡）
  ch04Bandage: (e) => {
    const q = ch04Qin(); if (!q) return;
    if (e.hold != null) { CH04_BANDAGE.hold = e.hold; return; }
    ch04Fade(() => {
      // 包紮完：小蝦米回到火堆右邊的座位盤腿坐下（頭頂符號、Zzz 都以座位為準）
      if (e.on === false) { q.lie = CH04_CAVE_QIN_IMG; Object.assign(player, { x: CH04_CAVE_SEAT.x, y: CH04_CAVE_SEAT.y, dir: 0 }); player.lie = CH04_CAVE_HERO_IMG; }
      else { CH04_BANDAGE.hold = null; q.lie = CH04_BANDAGE; player.lie = { hide: true }; }
    }, 350);
  },
  // 洞外起風：火光猛晃一下，灰燼和落葉從洞口斜斜飄過
  ch04Wind: () => ch04Wind(),
  // 夜裡：小蝦米打盹（點頭、飄 Zzz），秦無風閉眼守夜、偶爾睜眼
  ch04Night: (e) => {
    CH04_NIGHT.on = e.on !== false; if (!CH04_NIGHT.on) return;
    player.lie = CH04_HERO_DOZE; const q = ch04Qin(); if (q) q.lie = CH04_QIN_WATCH;
    ch04Zzz();
  },
  // 破曉：火堆熄成冒煙的餘燼、火光變小，洞口透進冷色晨光
  ch04Dawn: () => {
    const s = G.sprites.find((p) => p.campfire), L = G.lights.find((p) => p.campfire);
    if (s && s.embers) { s.frames = s.embers; s.frameMs = 220; if (s.groundGlow) s.groundGlow = [s.groundGlow[0] * 0.6, s.groundGlow[1] * 0.6, s.groundGlow[2], 0.18]; }
    if (L) Object.assign(L, { r: 150, glow: 70, flick: 0.05 });
    G.lights.push({ x: Math.round(775 * MAPS.in_cave.f), y: Math.round(860 * MAPS.in_cave.f), r: 300, c: "190,215,255", glow: 160 });
  },
  ch04Wake: (e) => {
    // 舊存檔是在第 3 章天亮前存的（還停在半夜）：醒來時補上天亮
    if (e.stage === "lie" && isNight()) {
      S.time = 6 * 60;
      S.day++;
    }
    player.x = WROOM.bed.x + 40;
    player.y = WROOM.bed.y + 24;
    player.dir = 0;
    player.lie = CH04_WAKE[e.stage] || null;
  },
  ch04Hour: (e) => {
    S.time = Math.max(S.time, e.h * 60);
  },
  // 醫舍教學：習得「藥草辨識・初級」與筆記，只發一次
  ch04Learn: () => {
    const f = F();
    if (f.ch04_herb_learned) return;
    f.ch04_herb_learned = 1;
    if (!S.specs.herbal) learnSpec("gather", "herbal");
    give("herb_note");
    storyLog("技能習得：藥草辨識・初級", true);
    setTimeout(() => toast("獲得物品：若蘭的藥草筆記"), 2700);
  },
  ch04GiveHerbs: () => {
    const n = S.inv.qingmai || 0;
    if (!n) return;
    take("qingmai", n);
    storyLog(`青脈草 ×${n} 交給沈若蘭（醫舍備藥）`, true);
  },
  // 戰鬥評價獎勵：只在第一次結算時發放
  ch04Reward: () => {
    const f = F();
    if (f.ch04_reward) return;
    f.ch04_reward = 1;
    const g = CH04_GRADES[f.ch04_grade] || CH04_GRADES.normal;
    storyLog(`初遇之戰評價：${g.label}`);
    storyEffects(g.rewards, `初遇之戰・${g.label}`);
  },
  ch04Backdrop: (e) => ch04Backdrop(e.kind),
  // 進石洞：換到室內地圖（in_cave），玩家站在洞口小路上
  ch04Cave: () =>
    ch04Fade(() => {
      $("cg").classList.remove("on");
      const R = MAPS.in_cave;
      switchMap("in_cave", Math.round(775 * R.f), Math.round(760 * R.f), 3); // 出生在洞口小路上段：太下面會被對話框擋住
      S.time = Math.max(S.time, 18 * 60 + 30);
      toast(R.name);
    }),
  // 換地圖；dawn：在洞中過夜，換到隔天（三日之約第 3 日）
  ch04Warp: (e) =>
    ch04Fade(() => {
      if (e.dawn) {
        S.day++;
        S.time = 0;
        villageDaily();
        healAll();
      }
      $("cg").classList.remove("on");
      switchMap(e.map, e.x, e.y, e.dir || 0);
      if (e.hour) S.time = Math.max(S.time, Math.round(e.hour * 60));
      toast(MAPS[e.map].name);
    }),
  ch04Battle: () => fade(startCh04Battle, 600),
});

// ---------- 黑松林的地面點綴：青脈草、馬蹄印、斷箭與勾在枝頭的布料 ----------
function ch04HerbArt(x, y) {
  for (const [dx, h] of [
    [-7, 14],
    [0, 19],
    [7, 13],
  ]) {
    ctx.strokeStyle = "#3f6a2a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + dx * 0.3, y);
    ctx.lineTo(x + dx, y - h);
    ctx.stroke();
    // 成對的葉子，背面葉脈清楚
    for (const k of [0.45, 0.8]) {
      const lx = x + dx * (0.3 + 0.7 * k),
        ly = y - h * k;
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#5f9a3a";
        ctx.beginPath();
        ctx.ellipse(lx + s * 4, ly, 4, 2, s * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#cfe8a0";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(lx + s * 7, ly + 1);
        ctx.lineTo(lx + s, ly);
        ctx.stroke();
      }
    }
  }
}
function ch04Hoof(x, y) {
  ctx.strokeStyle = "rgba(55,38,22,.75)";
  ctx.lineWidth = 2.2;
  for (const [dx, dy] of [
    [-34, 10],
    [-14, -2],
    [6, 8],
    [26, -4],
    [46, 6],
  ]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 4.5, Math.PI * 0.15, Math.PI * 0.85, true);
    ctx.stroke();
  }
}
function ch04Arrow(x, y) {
  ctx.strokeStyle = "#7a5a36";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 16, y + 3);
  ctx.lineTo(x + 10, y - 2);
  ctx.stroke();
  ctx.strokeStyle = "#b89a6a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 10, y - 2);
  ctx.lineTo(x + 14, y - 5);
  ctx.moveTo(x + 10, y - 2);
  ctx.lineTo(x + 13, y + 1);
  ctx.stroke();
  ctx.fillStyle = "#d8d2c0";
  ctx.beginPath();
  ctx.moveTo(x - 12, y + 2);
  ctx.lineTo(x - 20, y - 3);
  ctx.lineTo(x - 17, y + 3);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 12, y + 3);
  ctx.lineTo(x - 19, y + 8);
  ctx.lineTo(x - 17, y + 3);
  ctx.fill();
  // 遠處灌木上的暗色布料
  ctx.fillStyle = "#1e2030";
  ctx.beginPath();
  ctx.moveTo(x + 34, y - 40);
  ctx.lineTo(x + 44, y - 37);
  ctx.lineTo(x + 41, y - 29);
  ctx.lineTo(x + 35, y - 31);
  ctx.fill();
}
// 祠堂石階下攤開的修渠剩料：兩捆裂竹、半車舊木（沿用 ch03.js 的木料圖）、數截泡過水的粗繩
function ch04Bamboo(x, y) {
  for (let b = 0; b < 2; b++)
    for (let i = 0; i < 5; i++) {
      const yy = y - b * 9 - i * 2,
        xx = x + b * 6;
      ctx.fillStyle = i % 2 ? "#a8a457" : "#c2bd6a";
      ctx.fillRect(xx - 20, yy - 2, 40, 3);
      ctx.fillStyle = "#6f6c38";
      ctx.fillRect(xx - 6, yy - 2, 2, 3);
      ctx.fillRect(xx + 9, yy - 2, 2, 3);
    }
  ctx.strokeStyle = "#4a4628";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 4, y - 6);
  ctx.lineTo(x + 8, y - 4);
  ctx.stroke();
}
function ch04Rope(x, y) {
  ctx.strokeStyle = "#6b5a40";
  ctx.lineWidth = 3;
  for (const [dx, dy, r] of [
    [-12, 0, 9],
    [8, 3, 7],
    [20, -3, 5],
  ]) {
    ctx.beginPath();
    ctx.ellipse(x + dx, y + dy, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(40,60,70,.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 30, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}
function drawCh04Decals() {
  const f = F();
  const at = (p) => [p.x - cam.x, p.y - cam.y];
  if (G.id === "village" && f.ch04_morning && !f.ch04_errand) {
    ch04Bamboo(...at(CH04.bamboo));
    ch03Logs(...at(CH04.wood), false);
    ch04Rope(...at(CH04.rope));
    return;
  }
  if (G.id !== "forest" || !f.ch04_errand || f.ch04_complete) return;
  CH04.herbs.forEach((p, i) => {
    if (!f["ch04_h" + (i + 1)]) ch04HerbArt(...at(p));
  });
  ch04Hoof(...at(CH04.hoof));
  ch04Arrow(...at(CH04.arrow));
}
