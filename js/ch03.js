'use strict';
// 第 3 章《王宅裡的異鄉人》：對話、觸發、調查點、NPC、小互動與院前道具
// 台詞取自「CH03_王宅裡的異鄉人_完整小說.txt」；標【補】者為互動所需的開發補充台詞
// 流程：清晨醒來（屋內三處）→ 老吳送木 → 清理門前三處 → 材料分類三處 → 鐵匠鋪借工具 → 若蘭換藥
// → 排水測試 → 修門、墊床腳 → 補屋頂（王宅換成修好的外觀）→ 匾額歸位 → 村長檢視（三選一）→ 小蓮送花 → 夜談與冷光 → 第 4 章

Object.assign(DIALOGUES, {
  // ---------- S01 滴答聲後的清晨（王宅室內）----------
  dlg_ch03_wake: { lines: [
    { effects: [{ type: 'hook', name: 'sfx2', sound: 'drip' }] },
    '滴答。',
    '（你睜開眼睛。昨夜勉強搬到內牆邊的舊木床仍歪著一隻腳，床板底下塞了一塊拳頭大的石頭。）',
    '（你裹著紅色帽T，縮在漏雨沒有直接滴到的角落，背後的木牆冰涼。左肩每呼吸得深一點，都彷彿有人用指頭戳一下。）',
    [HERO_NAME, '……早安，五星級破屋。', 'tired'],
    '（你伸手摸向頭頂，摸到一塊濕透的木板，立刻縮回來。）',
    [HERO_NAME, '好，今天的第一個 Bug：屋頂漏水。第二個：床會倒。第三個……'],
    // 【補】操作提示
    '【提示】看看舊床、屋頂的漏水和門窗。',
  ], effects: [{ type: 'set_flag', key: 'ch03_wake_start' }] },
  dlg_ch03_m_bed: { lines: [
    '（床腳底下塞著石頭，床板歪向一邊。你輕輕一壓，整張床就嘎吱作響。）',
    [HERO_NAME, '床會倒——確認。昨晚已經親身測試過了。', 'sigh'],
    { effects: [{ type: 'hook', name: 'ch03Count', group: 'wake', key: 'ch03_m_bed' }] },
  ] },
  dlg_ch03_m_roof: { lines: [
    '（屋頂的破洞還在滴水，地板上積了一灘。）',
    [HERO_NAME, '屋頂漏水——確認。這個 Bug 還會自己滴答提醒我。', 'tired'],
    { effects: [{ type: 'hook', name: 'ch03Count', group: 'wake', key: 'ch03_m_roof' }] },
  ] },
  dlg_ch03_m_door: { lines: [
    '（窗紙破了大半，門扇與門框分家，風從牆縫鑽進來。門外的泥土被雨水沖出一條深深的溝，正朝主屋地基延伸。）',
    [HERO_NAME, '第三個：這間房子根本是 Bug 集合體！', 'shock'],
    { effects: [{ type: 'hook', name: 'ch03Count', group: 'wake', key: 'ch03_m_door' }] },
  ] },
  dlg_ch03_phone: { lines: [
    '（你想起昨晚手機裡那張現代辦公桌的照片。那裡有空調、有電燈，有喝不完的便利商店咖啡；眼前只有一間隨時可能漏水的老屋。）',
    '（你從背包裡摸出手機。）',
    { cg: 'cg/手機特寫.png' },
    { effects: [{ type: 'hook', name: 'cgUi', ui: 'phone' }] },
    '（螢幕短暫亮起：無服務，6%。）',
    '（你看了兩秒，沒有再亂按，將手機小心收好。）',
    { cg: null },
    [HERO_NAME, '好啦，王小明。電留著，命先顧好。', 'smile'],
    '（木門外忽然傳來粗獷的嗓音。）',
    ['老吳（門外）', '小子！還活著嗎？'],
    { effects: [{ type: 'hook', name: 'emote', who: 'player', icon: '!' }] },
    [HERO_NAME, '老吳伯！', 'happy'],
    '【提示】出門看看。',
  ], effects: [{ type: 'set_flag', key: 'ch03_phone' }] },

  // ---------- S02 老吳送木（王宅門前）：木料只記一次；重物由老吳搬 ----------
  dlg_ch03_wood: { lines: [
    { effects: [{ type: 'hook', name: 'ch03Hour', h: 7 }] },
    '（昨夜落地的匾額仍躺在門外。你把寫著「王宅」的木牌翻正，抹去厚厚的泥，兩個字竟還看得清楚。）',
    [HERO_NAME, '王宅……好巧，我也姓王。'],
    { walk: [{ who: 'wu_d', near: 'player', dx: -60, dy: 10 }] },
    { effects: [{ type: 'hook', name: 'face', who: 'player', dir: 2 }] },
    '（老吳肩挑兩綑粗細不一的木料，另一手提著一綑繩子，站在門前笑得露出牙齒。）',
    ['老吳', '我昨夜聽雨下得大，還真怕你被屋頂砸扁。'],
    [HERO_NAME, '你不能早點講這種危險嗎！', 'shock'],
    ['老吳', '講了你就有別的地方睡？'],
    [HERO_NAME, '……好像也沒有。', 'tired'],
    { effects: [{ type: 'set_flag', key: 'ch03_wood' }, { type: 'log', text: '老吳送來兩綑木料、一綑繩子', toast: true }] },
    '（老吳放下木料，朝屋裡望了一眼，笑意慢慢收斂。）',
    ['老吳', '還好你沒亂動主梁。這屋老歸老，樑柱倒還能撐。先清院子，再想屋頂，別逞強。'],
    [HERO_NAME, '可是昨夜雨直接滴到我臉上耶！'],
    ['老吳', '屋頂補得再好，院子積水浸進牆根，照樣要塌。'],
    '（你轉頭看向那條朝屋裡延伸的泥溝。本來只想找個梯子爬上去，忽然明白老吳說得對。）',
    [HERO_NAME, '所以……要先找水往哪裡流。'],
    ['老吳', '嗯？'],
    [HERO_NAME, '先讓地基不泡水。這邊高、那邊低，排水口應該開在院牆外側……'],
    '（你撿起細木枝，在泥地上畫出幾條線，圈出院子的低窪處。）',
    ['老吳', '你一個穿得怪里怪氣的小子，倒像個驗屋先生。'],
    [HERO_NAME, '我是寫程式的，雖然不是蓋房子的，但排查問題總有點經驗。'],
    ['老吳', '寫……什麼？'],
    [HERO_NAME, '呃，就當我以前專門找毛病。'],
    ['老吳', '那這宅子夠你找三年。'],
    { effects: [{ type: 'hook', name: 'emote', who: 'wu_d', icon: '♪' }, { type: 'hook', name: 'emote', who: 'player', icon: '♪' }] },
    '（兩人一起笑了。）',
    // 【補】左肩受傷：重活由老吳，小蝦米做清理、分揀
    ['老吳', '重的我來搬。你肩膀有傷，先把門前的碎瓦、破筐和雜草清掉。'],
    '【提示】清理王宅門前的碎瓦、破竹筐和雜草。',
  ] },

  // ---------- S06 清理門前（三處）----------
  dlg_ch03_c_rubble: { lines: [
    { effects: [{ type: 'hook', name: 'sfx2', sound: 'sweep' }] },
    '（你蹲下來，把碎瓦一片片撿進竹畚箕。左肩一用力就發麻，只好換右手。）',
    { effects: [{ type: 'hook', name: 'ch03Count', group: 'clear', key: 'ch03_c_rubble' }] },
  ] },
  dlg_ch03_c_basket: { lines: [
    { effects: [{ type: 'hook', name: 'sfx2', sound: 'sweep' }] },
    '（爛掉的竹筐一提就散了。你把竹片拖到牆角，留著當柴燒。）',
    { effects: [{ type: 'hook', name: 'ch03Count', group: 'clear', key: 'ch03_c_basket' }] },
  ] },
  dlg_ch03_c_weeds: { lines: [
    { effects: [{ type: 'hook', name: 'sfx2', sound: 'sweep' }] },
    '（你用腳踩住雜草根，一把一把拔起來。一隻蚱蜢跳到你的帽T上。）',
    [HERO_NAME, '……你也是來借住的？'],
    { effects: [{ type: 'hook', name: 'ch03Count', group: 'clear', key: 'ch03_c_weeds' }] },
  ] },

  // ---------- S03 材料分類：放錯只給幽默提示、可以重放，沒有永久失敗 ----------
  dlg_ch03_s_good: { lines: [
    '（一綑乾燥的木料，敲起來聲音清脆。）',
    { choice: { q: '這綑木料要放哪一堆？', options: [
      { id: 'good', label: '可用木料', lines: ['（你把它靠在牆邊，用炭在切口畫了個圈。）', { effects: [{ type: 'hook', name: 'ch03Count', group: 'sort', key: 'ch03_s_good' }] }] },
      { id: 'rotten', label: '朽木（當柴燒）', lines: ['（你剛要丟，老吳伸手攔住。）', ['老吳', '這根還硬著呢，你丟了我可要心疼。']] },
      { id: 'tiles', label: '瓦片堆', lines: [[HERO_NAME, '……木頭放進瓦片堆，我是在寫亂碼嗎。', 'tired']] },
    ] } },
  ] },
  dlg_ch03_s_rotten: { lines: [
    '（幾塊發黑的木板，摸起來軟軟的。）',
    { choice: { q: '這幾塊木板要放哪一堆？', options: [
      { id: 'good', label: '可用木料', lines: ['（你一捏，木板就掉下一塊黑渣。）', [HERO_NAME, '這拿去修門，門大概會先修理我。', 'tired']] },
      { id: 'rotten', label: '朽木（當柴燒）', lines: ['（你把爛木板疊在牆角，等曬乾了還能生火。）', { effects: [{ type: 'hook', name: 'ch03Count', group: 'sort', key: 'ch03_s_rotten' }] }] },
      { id: 'tiles', label: '瓦片堆', lines: [[HERO_NAME, '……木頭放進瓦片堆，我是在寫亂碼嗎。', 'tired']] },
    ] } },
  ] },
  dlg_ch03_s_tiles: { lines: [
    '（一疊還算完整的舊瓦，邊角有些髒。）',
    { choice: { q: '這疊瓦片要放哪一堆？', options: [
      { id: 'good', label: '可用木料', lines: [[HERO_NAME, '瓦片當木料……拿來釘門嗎？', 'tired']] },
      { id: 'rotten', label: '朽木（當柴燒）', lines: [[HERO_NAME, '把好瓦丟掉？老吳伯會把我一起丟掉吧。', 'shock']] },
      { id: 'tiles', label: '瓦片堆', lines: ['（你把沒裂的瓦片一片片疊好，數了數，還有十幾片能用。）', { effects: [{ type: 'hook', name: 'ch03Count', group: 'sort', key: 'ch03_s_tiles' }] }] },
    ] } },
  ] },
});

Object.assign(DIALOGUES, {
  // ---------- S04 韓鐵山的鐵匠鋪（小說第二幕）：老吳帶路 → 鐵峰武器鋪室內 ----------
  dlg_ch03_to_smith: { lines: [
    { effects: [{ type: 'hook', name: 'ch03Hour', h: 9 }] },
    { walk: [{ who: 'wu_d', near: 'player', dx: -50, dy: 8 }] },
    '（老吳找了兩塊還能用的長木板，讓你先別搬重物。）',
    ['老吳', '門鉸要換，鋤頭也得借。去村西找韓鐵山。他人兇，心卻不壞。'],
    [HERO_NAME, '怎麼感覺你們村裡每個人都很兇？'],
    ['老吳', '因為村裡沒米，沒人有閒工夫陪你笑。'],
    '（你收起玩笑，跟著老吳往鐵匠鋪走。）',
    { effects: [{ type: 'set_flag', key: 'ch03_smith_told' }, { type: 'hook', name: 'warp', map: 'in_weapon', x: SMITH_ROOM.door.x, y: SMITH_ROOM.door.y - 20, dir: 1 }] },
  ] },
  dlg_ch03_smith: { lines: [
    { effects: [{ type: 'hook', name: 'sfx2', sound: 'hammer' }] },
    '（鐵匠鋪裡堆著舊鐵片、折斷的鋤頭和待修的犁尖。一名壯實漢子正在鐵砧前敲打一塊燒紅的金屬。）',
    ['老吳', '鐵山！借點工具！'],
    '（鐵錘停下。）',
    '（韓鐵山擦了把汗，先看老吳，再看你那頭橘紅短髮和亮得突兀的紅色衣服。）',
    { effects: [{ type: 'meet', char: 'han_tieshan' }] },
    ['韓鐵山', '這就是昨日那個救了若蘭的異鄉人？'],
    ['老吳', '對，他叫小蝦米。'],
    ['韓鐵山', '蝦米？你爹娘真這樣給你取名？'],
    [HERO_NAME, '不是啦！我本名王小明。', 'shock'],
    ['韓鐵山', '王小明？那你叫什麼蝦米？'],
    [HERO_NAME, '……這個故事有點長。', 'tired'],
    '（韓鐵山沒有興趣聽長故事。他打開木箱，取出一把舊錘、一柄小鋤與幾枚鐵釘。）',
    ['韓鐵山', '能借。借三日，少一枚釘子也得說清楚。'],
    [HERO_NAME, '釘子還要算喔？'],
    '（韓鐵山抬眼。）',
    ['韓鐵山', '你看看村裡還有幾塊新鐵？犁頭壞了沒得換，百姓就開不了田。你拿去修門的一枚釘子，也是別人缺的。'],
    '（你望著鐵砧旁那排折斷的農具，立刻點頭。）',
    [HERO_NAME, '懂了。工具我登記，能用舊的就不拿新的。'],
    '（你從背包裡翻出一支短筆，卻發現沒有合適的紙，便撿起木片，在表面寫下數字與簡單的符號。）',
    [HERO_NAME, '舊錘一把、小鋤一柄、鐵釘……六枚。先借這些。'],
    ['韓鐵山', '字寫得稀奇，還挺工整。你識帳？'],
    [HERO_NAME, '會一點。'],
    ['韓鐵山', '那你更該知道，借了就得還。'],
    [HERO_NAME, '一定。'],
    '（韓鐵山從箱子深處又摸出一枚用過的門鉸，邊緣有些彎，但仍能修整。）',
    ['韓鐵山', '這個不用錢。你自己敲直，敲壞了別來哭。'],
    '（你愣了一下。）',
    [HERO_NAME, '謝啦，韓大哥！', 'happy'],
    ['韓鐵山', '少套近乎。快去做事。'],
    { effects: [{ type: 'set_flag', key: 'ch03_tools' }, { type: 'set_flag', key: 'smith' }, { type: 'rel', char: 'han_tieshan', stat: 'trust', n: 3 },
      { type: 'log', text: '向韓鐵山借用：舊錘一把、小鋤一柄、鐵釘六枚（借期三日）；另得舊門鉸一枚', toast: true }] },
    { effects: [{ type: 'hook', name: 'sfx2', sound: 'hammer' }] },
    '（走出鐵匠鋪時，你忍不住回頭看了一眼。韓鐵山已重新舉錘，鐺的一聲敲在鐵砧上。）',
    '（鋪子裡缺煤、缺鐵，卻仍有人想盡辦法把壞東西修好。）',
    [HERO_NAME, '原來大家都在修東西。'],
    ['老吳', '不修，哪還有得用？'],
    '【提示】帶著工具回王宅。',
  ] },

  // ---------- S05 沈姑娘的藥與一碗水（小說第三幕）：若蘭腳傷未癒，慢慢走來；換藥不等於痊癒 ----------
  dlg_ch03_treat: { lines: [
    { effects: [{ type: 'hook', name: 'ch03Hour', h: 13 }] },
    '（午後陽光照下來，王宅門前已清出一條能走人的路。）',
    '（你拿短鋤挖了半段排水溝，左肩便疼得發麻。）',
    { effects: [{ type: 'hook', name: 'wince', who: 'player' }] },
    [HERO_NAME, '嘶……這根手臂今天是在抗議勞基法嗎？', 'tired'],
    ['沈若蘭', '我倒覺得，是有人忘了自己受傷。'],
    '（熟悉的聲音從路口傳來。）',
    { walk: [{ who: 'ruolan_t', near: 'player', dx: -44, dy: 6 }] },
    { effects: [{ type: 'hook', name: 'face', who: 'player', dir: 2 }] },
    '（沈若蘭提著小藥箱，慢慢走過來。她步子比昨日穩些，左腳卻還是不敢完全用力。）',
    [HERO_NAME, '若蘭！妳腳好了？', 'happy'],
    ['沈若蘭', '只是消腫些，還沒有好。'],
    '（她看見你肩上的紅衣沾著泥，秀眉微蹙。）',
    ['沈若蘭', '你呢？昨日才挨一棍，今日就挖地？'],
    [HERO_NAME, '不然下雨又要睡水床了嘛。'],
    ['沈若蘭', '水床？'],
    [HERO_NAME, '……就是會滴水的床。', 'tired'],
    '（沈若蘭無奈，示意你坐在門邊的矮凳上。）',
    { effects: [{ type: 'hook', name: 'sit', who: 'player', on: true }] },
    { cg: 'cg/第3章_換藥.png' },
    { effects: [{ type: 'hook', name: 'sfx2', sound: 'cloth', times: 2, gap: 260 }] },
    '（她解開你左肩外側的衣料，查看青紫色的瘀傷。你一碰到痛處便縮了縮。）',
    ['沈若蘭', '骨頭看來未見明顯變形，但還不能逞強。我替你敷藥，今天別再抬重木。', 'serious'],
    [HERO_NAME, '遵命，沈大夫。'],
    ['沈若蘭', '別嬉皮笑臉。'],
    '（你乖乖坐著，瞥見她額角也有汗珠。）',
    [HERO_NAME, '若蘭，妳腳沒好，還跑來幫我？'],
    ['沈若蘭', '老吳叔說你一早就開始拆木板，我怕你把傷口弄得更重。'],
    [HERO_NAME, '我又不是完全不會照顧自己。'],
    '（沈若蘭看了一眼屋裡那張歪斜的床。）',
    ['沈若蘭', '……這倒很難說。'],
    '（你被噎得無話可說。）',
    { effects: [{ type: 'hook', name: 'sfx2', sound: 'cloth', times: 3, gap: 420 }] },
    '（沈若蘭替你重新包紮，從藥箱拿出一小包藥草。）',
    ['沈若蘭', '這些是昨日採回來的。你不必給銀子，算我還你的救命之恩。'],
    '（你想起公倉前的小蓮。）',
    [HERO_NAME, '村裡很多人需要藥吧？妳別全部拿來我這裡。'],
    ['沈若蘭', '放心，這些只是治瘀傷的尋常草藥。'],
    '（她停頓一下，聲音柔和了些。）',
    ['沈若蘭', '你先把自己照顧好，才能幫別人。'],
    { effects: [{ type: 'set_flag', key: 'shoulder_treated' }, { type: 'heal' }, { type: 'rel', char: 'shen_ruolan', stat: 'affection', n: 3 },
      { type: 'log', text: '沈若蘭替左肩換藥（瘀傷未癒，今天不可抬重木）' }] },
    { cg: null },
    '（你望著門前的木料。）',
    [HERO_NAME, '我只是想讓村長知道，我不是來白吃飯的。'],
    ['沈若蘭', '村長在意的，不只是你會不會做工。'],
    [HERO_NAME, '還有什麼？'],
    ['沈若蘭', '他得知道，你做了好事以後，會不會也願意守規矩。', 'serious'],
    '（你沉默片刻，點了點頭。）',
    { effects: [{ type: 'hook', name: 'sit', who: 'player', on: false }] },
    '（你給沈若蘭倒了碗水。水是剛從井裡打上來、沉澱過的清水，沒有茶葉，也沒有糖。）',
    { effects: [{ type: 'hook', name: 'bowlPass', from: 'player', to: 'ruolan_t' }] },
    '（沈若蘭雙手接過。）',
    ['沈若蘭', '謝謝。'],
    [HERO_NAME, '我在家鄉請人喝飲料都沒這麼緊張過。', 'smile'],
    ['沈若蘭', '你家鄉的水，很難得嗎？'],
    [HERO_NAME, '不，太容易了。'],
    '（你望向村外乾涸的水渠，笑容慢慢淡去。）',
    [HERO_NAME, '容易到我以前都不知道，原來一碗乾淨的水也該珍惜。'],
    { walk: [{ who: 'ruolan_t', x: WANG.x + 20, y: WANG.y + 110 }] },
    '【提示】接著把排水溝弄好。',
  ], effects: [{ type: 'set_flag', key: 'ch03_treated' }] },
});

// 排水測試失敗（兩種擺法共用）：第一次照小說「連水都跟我作對」，之後只給簡短提示
const CH03_DRAIN_FAIL = (again) => [
  { effects: [{ type: 'hook', name: 'pause', ms: 1700 }] },
  { branch: [
    [{ notFlags: ['ch03_drain_try'] }, ['（水在竹管裡停了一下……竟慢慢倒流回來。）', [HERO_NAME, '……不會吧，連水都跟我作對？', 'shock'],
      { effects: [{ type: 'hook', name: 'emote', who: 'wu_d', icon: '♪' }] }, '（老吳看得大笑。）', ['老吳', '水可不認識你。']]],
    [null, ['（水又倒流回來，潑了你一腳。）', [HERO_NAME, again, 'tired']]],
  ] },
  // 【補】解謎提示
  '【提示】水往低處流——試試「墊高入口、壓低出口」。',
  { effects: [{ type: 'set_flag', key: 'ch03_drain_try' }] },
];

Object.assign(DIALOGUES, {
  // ---------- S07 排水小解謎：第一次一定倒流（照小說），試過才出現正確擺法；水引向院外舊溝，不沖村道 ----------
  dlg_ch03_drain: { lines: [
    { branch: [[{ notFlags: ['ch03_drain_try'] }, [
      { effects: [{ type: 'hook', name: 'ch03Hour', h: 14 }] },
      '（老吳將一截舊竹管放到旁邊。）',
      ['老吳', '你分類歸分類，可別把屋子畫在地上就當修好了。'],
      [HERO_NAME, '我知道啦！'],
      '（你先用短鋤挖通門前的淤泥，讓積水能繞開主屋流向院外低處。接著把竹管架上去，舀一瓢水試試。）',
    ]]] },
    { choice: { q: '竹管要怎麼擺？', options: [
      { id: 'flat', label: '直接平放，倒水試試', effects: [{ type: 'hook', name: 'drainTest', ok: false }], lines: CH03_DRAIN_FAIL('平放不行……剛才就試過了。') },
      { id: 'up', label: '把出口那頭墊高', effects: [{ type: 'hook', name: 'drainTest', ok: false }], lines: CH03_DRAIN_FAIL('出口比入口高……水又不會爬坡。') },
      { id: 'right', label: '墊高入口、壓低出口', if: { allFlags: ['ch03_drain_try'] }, effects: [{ type: 'hook', name: 'drainTest', ok: true }], lines: [
        '（你咬牙把竹管墊高，重新試了一次。）',
        { effects: [{ type: 'hook', name: 'pause', ms: 1700 }] },
        '（這回一瓢水順著竹管流出院牆外的小溝。）',
        [HERO_NAME, '成功了！', 'happy'],
        '（你高舉雙手，左肩立刻一抽。）',
        { effects: [{ type: 'hook', name: 'emote', who: 'player', icon: '💦' }] },
        [HERO_NAME, '痛痛痛……成功也不能舉手是不是！', 'shock'],
        '（老吳搖頭，一邊笑一邊幫你把竹管固定。）',
        { effects: [{ type: 'set_flag', key: 'ch03_drain' }, { type: 'log', text: '排水溝接上院外的舊溝，沒有直接沖向村道', toast: true }] },
        '【提示】接下來修大門、換掉屋裡的爛床腳。',
      ] },
    ] } },
  ] },

  // ---------- S08 修門（小說第四幕）、墊床腳【補】----------
  dlg_ch03_door: { lines: [
    { effects: [{ type: 'hook', name: 'ch03Hour', h: 15 }, { type: 'hook', name: 'sfx2', sound: 'hammer' }] },
    '（接著是門框。韓鐵山借出的舊門鉸果然還能用，老吳替你扶住門板，你慢慢敲直彎曲的鐵片，幾次差點敲到手指。）',
    [HERO_NAME, '啊！這工作比 Debug 難多了。', 'shock'],
    ['老吳', '你家鄉修門不用錘子？'],
    [HERO_NAME, '我們很多事情都用鍵盤解決。'],
    ['老吳', '鍵盤又是哪種鐵器？'],
    [HERO_NAME, '……老吳伯，我改天畫給你看。', 'tired'],
    { effects: [{ type: 'hook', name: 'sfx2', sound: 'hammer' }] },
    // 【補】修好的確認
    '（門板裝回門框，推了推，穩穩地合上了。）',
    { effects: [{ type: 'set_flag', key: 'ch03_door' }, { type: 'log', text: '大門修好（用掉舊門鉸一枚、鐵釘四枚）', toast: true }] },
    '【提示】門邊那塊掉落的舊匾額，現在可以撿起來掛回去了。',
  ] },
  dlg_ch03_bed: { lines: [
    // 【補】床腳
    '（你把床板抬起一角——床腳底下那塊石頭早就被壓裂了。）',
    [HERO_NAME, '原來昨晚就是你害我的。', 'tired'],
    { effects: [{ type: 'hook', name: 'sfx2', sound: 'hammer' }] },
    '（你用老吳挑出來的硬木塊換掉爛床腳，敲進兩枚鐵釘，再坐上去試了試。）',
    { effects: [{ type: 'set_flag', key: 'ch02_bed_tilt', value: 0 }, { type: 'set_flag', key: 'ch03_bed' }, { type: 'log', text: '換掉爛床腳（用掉鐵釘兩枚）', toast: true }] },
    '（沒有傾斜。）',
    [HERO_NAME, '很好，這個 Bug 修掉了。', 'happy'],
  ] },
  // ---------- S09 補屋頂：老吳上屋樑、小蝦米在下面遞瓦；王宅換成修好的外觀 ----------
  dlg_ch03_roof: { lines: [
    // 【補】左肩有傷不爬高
    ['老吳', '上頭的事交給我。你在底下把瓦遞上來，別爬高。'],
    [HERO_NAME, '收到！'],
    '（你把分好的瓦片一片片遞上去，老吳蹲在屋樑上換瓦。灰塵和碎泥嘩啦啦往下掉。）',
    { effects: [{ type: 'hook', name: 'sfx2', sound: 'tile' }, { type: 'hook', name: 'ch03Roof' }] },
    '（夕陽西斜時，王宅的門終於能穩穩合上，床腳換上了不腐爛的木塊，地上的碎瓦也清理乾淨。屋頂仍留著幾處舊瓦色差，卻已補上昨夜漏雨最厲害的破洞。）',
    '（沒有雕梁畫棟，沒有花園池塘，連牆面都還留著斑駁舊痕。）',
    '（可至少像一間能住人的屋子了。）',
    '【提示】門外那塊掉落的舊匾額……',
  ] },
  // ---------- S10 匾額歸位 → 接村長檢視 ----------
  dlg_ch03_sign: { lines: [
    '（你回頭，看見門邊那塊掉落的舊匾額。）',
    { walk: [{ who: 'wu_d', near: 'player', dx: -56, dy: 10 }] },
    [HERO_NAME, '老吳伯，那塊「王宅」可以再掛回去嗎？'],
    ['老吳', '破成那樣，換塊新的就是。'],
    '（你蹲下，把木牌翻過來。）',
    [HERO_NAME, '不用。字還看得清楚。'],
    ['老吳', '你倒念舊。'],
    [HERO_NAME, '不是念舊啦。'],
    '（你將牌上的塵抹乾淨。）',
    [HERO_NAME, '我總得有個地方，能說自己住在這裡。'],
    '（老吳聞言，沒有接話。片刻後，他從工具堆裡挑出兩根還能用的木釘。）',
    ['老吳', '來。這回我替你扶著。'],
    { effects: [{ type: 'set_flag', key: 'ch03_sign' }, { type: 'hook', name: 'signRise' }, { type: 'hook', name: 'pause', ms: 1700 }] },
    '（兩人一上一下，將「王宅」重新掛回門楣。）',
    '（木牌不新，卻端端正正。）',
  ] },

  // ---------- 閒聊與提示 ----------
  dlg_ch03_gate_wait: { lines: [
    { branch: [
      [{ notFlags: ['ch03_door'] }, ['（門扇與門框分家，輕輕一碰就晃。）']],
      [null, ['（王宅的門穩穩合著。）']],
    ] },
  ] },
  dlg_ch03_ruolan_idle: { lines: [['沈若蘭', '藥敷上了，不代表傷好了。重的讓老吳叔來。']] },
  dlg_ch03_wu_hint: { lines: [
    { branch: [
      [{ notFlags: ['ch03_cleared'] }, [['老吳', '重的我來，你先把碎瓦、破筐和雜草清掉。']]],
      [{ notFlags: ['ch03_sorted'] }, [['老吳', '木料、瓦片分一分。還能用的、爛掉的，別混在一塊。']]],
      [{ notFlags: ['ch03_drain'] }, [['老吳', '先弄排水。屋頂補得再好，牆根泡水照樣要塌。']]],
      [{ notFlags: ['ch03_door'] }, [['老吳', '門鉸有了，門我替你扶著。']]],
      [{ notFlags: ['ch03_bed'] }, [['老吳', '屋裡那張床，你再睡一晚歪的，脖子可要歪了。']]],
      [{ notFlags: ['wang_house_repaired'] }, [['老吳', '屋頂上頭的事交給我。你進屋把破洞指給我看。']]],
      [null, [['老吳', '忙了一天，歇著吧。']]],
    ] },
  ] },
});

Object.assign(DIALOGUES, {
  // ---------- S11 村長檢視（小說第五幕）：三選一只影響小幅數值，最後都收斂到「明日辰時到祠堂外」 ----------
  dlg_ch03_chief: { lines: [
    { effects: [{ type: 'hook', name: 'ch03Hour', h: 18 }, { type: 'meet', char: 'chen_boan' }] },
    { walk: [{ who: 'chief_w', x: WANG.x - 40, y: WANG.y + 100 }, { who: 'player', x: WANG.x + 30, y: WANG.y + 92 }] },
    { effects: [{ type: 'hook', name: 'face', who: 'player', dir: 2 }] },
    '（傍晚，陳伯安拄著木杖來到王宅。村長原本只打算遠遠看一眼，卻在門前停住。）',
    '（昨晚還塞滿雜草的通道已清出石路，門板不再歪斜，屋簷下的雨水被引往一旁的小溝。屋子算不上漂亮，但有了生活的樣子。）',
    ['陳伯安', '這些都是你今日做的？'],
    '（你連忙搖頭。）',
    [HERO_NAME, '老吳伯幫很多忙，韓大哥借工具，若蘭還來替我換藥。我自己哪可能一天做完。'],
    '（村長朝老吳看了一眼。）',
    ['老吳', '這小子嘴碎，倒真肯幹活。'],
    { walk: [{ who: 'chief_w', x: CH03.drain.x - 50, y: CH03.drain.y - 6 }] },
    '（陳伯安走到排水溝旁，用木杖點了點新挖的土。）',
    ['陳伯安', '這條溝，通向哪裡？'],
    [HERO_NAME, '院外的舊溝，沒有直接沖向村道。我先清出一段，雨大時還得看看有沒有堵住。'],
    ['陳伯安', '你考慮過後續？'],
    [HERO_NAME, '不然下次又淹回來，我不是白挖了嗎？'],
    '（村長的神色略微緩和。他卻沒有立刻說出「你可以長住」這類話。）',
    ['陳伯安', '你昨日答應的是三日暫住，今日才第一日。'],
    [HERO_NAME, '我知道。'],
    ['陳伯安', '村子不富裕，借你的工具、木料都不是從天上掉下來的。'],
    [HERO_NAME, '我記著，等有能力會還。今天用了哪些，我也有記下來。'],
    '（你拿出那塊刻著記號的木片。）',
    ['陳伯安', '既會記數，明日到祠堂外幫忙清點修渠剩料。只是清點，不准擅動公倉糧食。'],
    [HERO_NAME, '可以！', 'happy'],
    '（你答得太快，村長又皺起眉頭。）',
    ['陳伯安', '你莫高興得太早。村裡缺的是糧，不是幾張漂亮的清單。'],
    '（你一怔，想起小蓮推給祖母的那碗稀粥。）',
    [HERO_NAME, '我知道。清單不會變出米。'],
    '（你抬頭，望向村外那架停擺的水車。）',
    [HERO_NAME, '可是……這裡的人，也在努力活著啊。'],
    '（陳伯安沿著你的目光看去，沉默許久。）',
    ['陳伯安', '年輕人，水渠不是你畫幾條線就能修好的。'],
    [HERO_NAME, '我也沒說今天能修好。'],
    '（你摸摸鼻子。）',
    [HERO_NAME, '但明天可以先去看看。總比一直猜好吧？'],
    '（陳伯安望著你，終於輕輕點了點頭。）',
    ['陳伯安', '先做好眼前的事。'],
    [HERO_NAME, '知道啦，村長。'],
    // 【補】三選一
    { choice: { key: 'ch03_chief_reply', q: '（村長要走了。還想補一句嗎？）', options: [
      { id: 'ledger', label: '「借用的材料，我會一筆一筆記清楚。」', effects: [{ type: 'rel', char: 'chen_boan', stat: 'trust', n: 1 }],
        lines: [['陳伯安', '嗯。帳清楚，人才清楚。']] },
      { id: 'thanks', label: '「今天很多人幫我，我會記得這份人情。」', effects: [{ type: 'heart', n: 1 }],
        lines: [['陳伯安', '……知道記人情，是好事。']] },
      { id: 'canal', label: '「明天我想順便看看水渠。」', effects: [{ type: 'set_flag', key: 'canal_interest' }],
        lines: [['陳伯安', '先把清點做好。水渠的事，慢慢來。']] },
    ] } },
    { walk: [{ who: 'chief_w', x: WANG.x - 20, y: WANG.y + 64 }] },
    { effects: [{ type: 'hook', name: 'face', who: 'chief_w', dir: 1 }] },
    '（離開前，陳伯安站在門口，看了那塊重新掛起的「王宅」牌匾一眼。）',
    { effects: [{ type: 'hook', name: 'face', who: 'chief_w', dir: 0 }] },
    ['陳伯安', '明日若起得來，辰時到祠堂外找我。'],
    { effects: [{ type: 'log', text: '村長交代：明日辰時到祠堂外幫忙清點修渠剩料（三日之約，第一日）', toast: true }] },
    { walk: [{ who: 'chief_w', x: CH03.road.x, y: CH03.road.y }] },
    { effects: [{ type: 'set_flag', key: 'ch03_chief_done' }, { type: 'set_flag', key: 'ch03_xl_visit' }] },
    [HERO_NAME + '（小聲）', '這算是……沒有討厭我吧？'],
    ['老吳', '村長要是真討厭你，就不會交代明天的事了。'],
    { effects: [{ type: 'hook', name: 'emote', who: 'player', icon: '♪' }] },
  ], next: 'dlg_ch03_flowers' },

  // ---------- S12 小蓮送花：花擺上屋裡的小桌（ch03_flowers，屋內畫出陶杯野花）----------
  dlg_ch03_flowers: { lines: [
    ['小蓮', '小蝦米哥哥！'],
    '（一個小小的身影從路口探出頭。小蓮抱著一把剛採的野花，身後跟著扶著木杖慢行的祖母。）',
    { walk: [{ who: 'xiaolian_w', near: 'player', dx: -38, dy: 6, run: true }, { who: 'grandma_w', near: 'player', dx: -100, dy: -4 }] },
    { effects: [{ type: 'hook', name: 'face', who: 'player', dir: 2 }] },
    ['小蓮', '我聽說你把房子修好了！'],
    '（你蹲下來，接過那幾朵小花。）',
    [HERO_NAME, '還沒全部修好啦。妳看，牆還有好多地方要補。', 'smile'],
    ['小蓮', '可是門不會倒了！'],
    [HERO_NAME, '這個倒是真的。'],
    '（小蓮跑進屋裡，把花塞進一只乾淨的空陶杯，擺在窗邊的小桌上。）',
    { effects: [{ type: 'set_flag', key: 'ch03_flowers' }, { type: 'log', text: '小蓮送來野花，擺在王宅的小桌上' }] },
    ['小蓮', '這樣就像有人住了。'],
    '（她說得那樣理所當然。你望著那幾朵花，忽然鼻尖有點酸。）',
    [HERO_NAME, '……謝謝妳，小蓮。'],
    // 【補】小說為敘述句，改成祖母開口
    ['小蓮的奶奶', '昨日在公倉外，多謝你關心這孩子。'],
    '（你連忙擺手。你沒有糧食能送，也沒有奇蹟能拿出來。）',
    [HERO_NAME, '以後有我能做的事，我一定盡力。'],
    { walk: [{ who: 'grandma_w', x: CH03.road.x, y: CH03.road.y }, { who: 'xiaolian_w', x: CH03.road.x + 70, y: CH03.road.y + 6 }] },
    { effects: [{ type: 'hook', name: 'face', who: 'xiaolian_w', dir: 3 }] },
    '（小蓮離開前，回頭喊了一聲。）',
    ['小蓮', '哥哥！明天也要加油喔！'],
    [HERO_NAME, '好！', 'happy'],
    '（你用力揮手。）',
    { effects: [{ type: 'set_flag', key: 'ch03_xl_visit', value: 0 }, { type: 'set_flag', key: 'ch03_evening' }] },
    '【提示】天黑了，回屋裡休息（床邊按 E）。',
  ] },

  // ---------- S13 星光下的思鄉（小說第六幕）＋ S14 黑松林的冷光 ----------
  dlg_ch03_night: { lines: [
    { effects: [{ type: 'hook', name: 'night' }, { type: 'hook', name: 'pause', ms: 1200 }] },
    '（夜色落下。王宅終於安靜下來。）',
    '（你把用完的工具整齊放在牆邊，確認門閂能扣住，才回到屋內。）',
    { walk: [{ who: 'player', x: WROOM.bed.x + 40, y: WROOM.bed.y + 24 }] },
    '（你坐上那張修好床腳的舊床，先小心試了試。）',
    { effects: [{ type: 'hook', name: 'sit', who: 'player', on: true }] },
    '（沒有傾斜。）',
    [HERO_NAME, '太感動了……今天終於不用跟地板約會。', 'happy'],
    '（屋裡仍然簡陋。被褥破舊，牆角還有幾道沒有補平的裂紋，風從窗縫透進來。但床邊的小桌上，多了一只插著野花的陶杯；門外的匾額，也不再歪歪斜斜。）',
    '（你打開背包，摸到手機，想了想又放回去。只有百分之六。你不知道那張現代照片還能看幾次。）',
    [HERO_NAME, '今天先不看。'],
    '（你躺下，望著屋頂新補的瓦片。）',
    [HERO_NAME, '老媽如果知道我在異世界當修屋工，不知道會笑我還是罵我……', 'smile'],
    '（屋外有蟲鳴，遠處傳來河水淺淺的聲音。）',
    '（很久之後——）',
    [HERO_NAME, '……我想回家。', 'sad'],
    '（沒有人回答。）',
    '（你把紅色帽T拉緊一些，又看向桌上那幾朵野花。）',
    [HERO_NAME, '可是……這裡的人，也在努力活著啊。'],
    { effects: [{ type: 'hook', name: 'sfx2', sound: 'knock' }] },
    '（門外忽然響起輕輕的敲門聲。）',
    ['老吳（門外）', '小子，睡了沒？'],
    { effects: [{ type: 'hook', name: 'sit', who: 'player', on: false }] },
    { walk: [{ who: 'player', x: WROOM.door.x, y: WROOM.door.y - 40 }] },
    '（你起身打開門。老吳沒有進屋，只是站在院子裡，神色比白天嚴肅許多。）',
    ['老吳', '剛才砍柴回來，黑松林那邊又有動靜。'],
    [HERO_NAME, '什麼動靜？'],
    ['老吳', '幾個帶兵器的陌生人，沿著北面的舊獵道走。我沒敢靠太近。'],
    '（你心頭一緊。）',
    [HERO_NAME, '會不會是昨天欺負若蘭的那兩個？'],
    ['老吳', '不像。那兩人是攔路搶藥的莽漢。這幾個腳步輕，行路有章法。'],
    '（老吳望向黑松林方向，壓低聲音。）',
    ['老吳', '還有，我瞧見林子深處有一點火光，一會兒亮，一會兒就滅了。不是尋常樵夫燒火的法子。'],
    [HERO_NAME, '那……要告訴村長吧？'],
    ['老吳', '我已經說了。今晚你把門閂好，別往山裡跑。'],
    [HERO_NAME, '我又不傻！', 'shock'],
    '（老吳搖頭離去。你關上門，將門閂扣好。）',
    { effects: [{ type: 'set_flag', key: 'forest_warning_heard' }, { type: 'log', text: '老吳警告：黑松林北面舊獵道有持械陌生人，林中火光忽明忽滅', toast: true }] },
    { walk: [{ who: 'player', x: WROOM.bed.x + 40, y: WROOM.bed.y + 24 }] },
    '（你回到床邊，卻一時睡不著。昨日山路上的那根木棍、若蘭掉落的藥簍、老吳口中的持械陌生人，斷斷續續地浮現在腦海。）',
    '（不知過了多久，一道極輕的風聲掠過院牆之外。）',
    '（你屏住呼吸，沒有走出門，只悄悄靠近窗邊。）',
    { walk: [{ who: 'player', x: CH03.sill.x, y: CH03.sill.y }] },
    { effects: [{ type: 'hook', name: 'face', who: 'player', dir: 3 }, { type: 'hook', name: 'ch03Glint' }, { type: 'hook', name: 'pause', ms: 1400 }] },
    '（遠方黑松林的山脊上，彷彿閃過一點冷光。）',
    '（像月光照在劍刃上。）',
    '（轉瞬便消失了。）',
    [HERO_NAME, '……我是不是該先把門再加一根木閂？', 'doubt'],
    '（沒有人回答。）',
    '（黑松林深處，一場追逐正悄悄逼近清河村。）',
    '【第03章 完】',
    // 章節完成：天亮（暫住之約第 2 日）→ 第 4 章 → 自動存檔
    { effects: [{ type: 'hook', name: 'dawn' }, { type: 'set_flag', key: 'ch03_complete' }, { type: 'chapter', id: 'ch04' }, { type: 'hook', name: 'autosave' }] },
  ] },
});

// ---------- 自動觸發 ----------
STORY_EVENTS.push(
  { id: 'ch03_wake', map: 'in_river', area: [WROOM.mid.x, WROOM.mid.y, 900], if: { allFlags: ['ch02_complete'], notFlags: ['ch03_wake_start', 'wang_house_repaired'] }, dialogue: 'dlg_ch03_wake' },
  { id: 'ch03_phone', map: 'in_river', area: [WROOM.mid.x, WROOM.mid.y, 900], if: { allFlags: ['ch03_wake'], notFlags: ['ch03_phone'] }, dialogue: 'dlg_ch03_phone' },
  { id: 'ch03_wood', map: 'village', area: [WANG.x, WANG.y + 50, 150], if: { allFlags: ['ch03_phone'], notFlags: ['ch03_wood'] }, dialogue: 'dlg_ch03_wood' },
  { id: 'ch03_to_smith', map: 'village', area: [WANG.x, WANG.y + 90, 320], if: { allFlags: ['ch03_sorted'], notFlags: ['ch03_smith_told'] }, dialogue: 'dlg_ch03_to_smith' },
  { id: 'ch03_smith', map: 'in_weapon', area: [SMITH_ROOM.door.x, SMITH_ROOM.door.y, 260], if: { allFlags: ['ch03_smith_told'], notFlags: ['ch03_tools'] }, dialogue: 'dlg_ch03_smith' },
  { id: 'ch03_chief', map: 'village', area: [WANG.x, WANG.y + 60, 260], if: { allFlags: ['ch03_sign', 'wang_house_repaired'], notFlags: ['ch03_chief_done'] }, dialogue: 'dlg_ch03_chief' },
  { id: 'ch03_treat', map: 'village', area: [WANG.x, WANG.y + 80, 220], if: { allFlags: ['ch03_tools'], notFlags: ['ch03_treated'] }, dialogue: 'dlg_ch03_treat' },
);

// ---------- 調查點 ----------
const ch03Spot = (id, map, p, name, cond, dlg, r = 50) => ({ id, map, x: p.x, y: p.y, r, name, if: cond, talk: [[null, dlg, true]] });
STORY_SPOTS.push(
  // 屋內（S01 清晨三處、S08 床腳、S09 屋頂、S13 夜裡休息）
  ch03Spot('ch03_m_bed', 'in_river', { x: WROOM.bed.x + 20, y: WROOM.bed.y + 20 }, '舊床', { allFlags: ['ch03_wake_start'], notFlags: ['ch03_m_bed', 'ch03_wake'] }, 'dlg_ch03_m_bed', 80),
  ch03Spot('ch03_m_roof', 'in_river', WHOLE, '屋頂漏水', { allFlags: ['ch03_wake_start'], notFlags: ['ch03_m_roof', 'ch03_wake'] }, 'dlg_ch03_m_roof', 60),
  ch03Spot('ch03_m_door', 'in_river', { x: WROOM.door.x + 50, y: WROOM.door.y - 30 }, '門與窗', { allFlags: ['ch03_wake_start'], notFlags: ['ch03_m_door', 'ch03_wake'] }, 'dlg_ch03_m_door'),
  ch03Spot('ch03_bed', 'in_river', { x: WROOM.bed.x + 20, y: WROOM.bed.y + 20 }, '爛床腳', { allFlags: ['ch03_drain'], notFlags: ['ch03_bed'] }, 'dlg_ch03_bed', 80),
  ch03Spot('ch03_roof', 'in_river', WHOLE, '屋頂破洞', { allFlags: ['ch03_door', 'ch03_bed'], notFlags: ['wang_house_repaired'] }, 'dlg_ch03_roof', 60),
  ch03Spot('ch03_rest', 'in_river', { x: WROOM.bed.x + 20, y: WROOM.bed.y + 20 }, '休息', { allFlags: ['ch03_evening'], notFlags: ['ch03_complete'] }, 'dlg_ch03_night', 80),
  // 王宅門前（S06 清理、S03 分類、S07 排水、S10 匾額）
  ch03Spot('ch03_c_rubble', 'village', CH03.rubble, '碎瓦', { allFlags: ['ch03_wood'], notFlags: ['ch03_c_rubble', 'ch03_cleared'] }, 'dlg_ch03_c_rubble'),
  ch03Spot('ch03_c_basket', 'village', CH03.basket, '破竹筐', { allFlags: ['ch03_wood'], notFlags: ['ch03_c_basket', 'ch03_cleared'] }, 'dlg_ch03_c_basket'),
  ch03Spot('ch03_c_weeds', 'village', CH03.weeds, '雜草', { allFlags: ['ch03_wood'], notFlags: ['ch03_c_weeds', 'ch03_cleared'] }, 'dlg_ch03_c_weeds'),
  ch03Spot('ch03_s_good', 'village', CH03.good, '一綑木料', { allFlags: ['ch03_cleared'], notFlags: ['ch03_s_good', 'ch03_sorted'] }, 'dlg_ch03_s_good'),
  ch03Spot('ch03_s_rotten', 'village', CH03.rotten, '發黑的木板', { allFlags: ['ch03_cleared'], notFlags: ['ch03_s_rotten', 'ch03_sorted'] }, 'dlg_ch03_s_rotten'),
  ch03Spot('ch03_s_tiles', 'village', CH03.tiles, '舊瓦', { allFlags: ['ch03_cleared'], notFlags: ['ch03_s_tiles', 'ch03_sorted'] }, 'dlg_ch03_s_tiles'),
  ch03Spot('ch03_drain', 'village', CH03.drain, '排水溝', { allFlags: ['ch03_treated'], notFlags: ['ch03_drain'] }, 'dlg_ch03_drain', 60),
  ch03Spot('ch03_sign', 'village', CH03.plaque, '舊匾額', { allFlags: ['ch03_door'], notFlags: ['ch03_sign'] }, 'dlg_ch03_sign'),
);

// ---------- 劇情 NPC ----------
STORY_NPCS.push(
  // 老吳：送木之後整天在王宅門前幫忙，小蓮來訪後回家（夜裡在門外敲門，不必現身）
  { id: 'wu_d', map: 'village', name: '老吳', art: 'woodcutter', x: CH03.wu.x, y: CH03.wu.y, dir: 0, scale: 1.3,
    show: { allFlags: ['ch03_phone'], notFlags: ['ch03_evening'] }, talk: [[null, 'dlg_ch03_wu_hint']] },
  { id: 'wu_w', map: 'in_weapon', name: '老吳', art: 'woodcutter', x: SMITH_ROOM.door.x - 70, y: SMITH_ROOM.door.y - 30, dir: 1, scale: 1.3,
    show: { allFlags: ['ch03_smith_told'], notFlags: ['ch03_tools'] }, talk: [] },
  // 沈若蘭：從路口慢慢走來換藥，之後由 ruolan_v 接手站在門前
  { id: 'ruolan_t', map: 'village', name: '沈若蘭', art: 'shenruolan', x: CH03.road.x, y: CH03.road.y, dir: 3, scale: 1.35,
    show: { allFlags: ['ch03_tools'], notFlags: ['ch03_treated'] }, talk: [] },
  // 村長：匾額掛好、屋頂補好後從路口走來
  { id: 'chief_w', map: 'village', name: '陳伯安', art: 'chief', filter: 'grayscale(.8) sepia(.35) brightness(1.15)', x: CH03.road.x, y: CH03.road.y, dir: 3, scale: 1.3,
    show: { allFlags: ['ch03_sign', 'wang_house_repaired'], notFlags: ['ch03_chief_done'] }, talk: [] },
  // 小蓮祖孫：來訪期間，公倉那邊的祖孫先隱藏
  { id: 'xiaolian_w', map: 'village', name: '小蓮', art: 'kid', filter: 'hue-rotate(280deg) saturate(1.2) brightness(1.1)', x: CH03.road.x - 30, y: CH03.road.y + 10, dir: 3, scale: 1.05,
    show: { allFlags: ['ch03_xl_visit'] }, talk: [] },
  { id: 'grandma_w', map: 'village', name: '小蓮的奶奶', art: 'liushen', filter: 'grayscale(.6) brightness(1.05)', x: CH03.road.x - 70, y: CH03.road.y, dir: 3, scale: 1.2,
    show: { allFlags: ['ch03_xl_visit'] }, talk: [] },
);

// ---------- 音效 ----------
Object.assign(Sfx, {
  cloth() { const ac = this.ctx(); if (!ac) return; const t = ac.currentTime + 0.02; noiseHit(ac, t, { f: 1400, q: 0.8, dur: 0.25, v: 0.12 }); },
  hammer() { const ac = this.ctx(); if (!ac) return; const t = ac.currentTime + 0.02; toneHit(ac, t, { type: 'triangle', f0: 900, f1: 420, dur: 0.18, v: 0.35 }); noiseHit(ac, t, { f: 3200, q: 2, dur: 0.05, v: 0.25 }); },
  sweep() { const ac = this.ctx(); if (!ac) return; const t = ac.currentTime + 0.02; noiseHit(ac, t, { type: 'highpass', f: 1800, dur: 0.35, v: 0.15 }); },
  tile() { const ac = this.ctx(); if (!ac) return; const t = ac.currentTime + 0.02; toneHit(ac, t, { type: 'square', f0: 1300, f1: 900, dur: 0.06, v: 0.12 }); noiseHit(ac, t, { f: 2600, q: 3, dur: 0.08, v: 0.2 }); },
  knock() { const ac = this.ctx(); if (!ac) return; const t = ac.currentTime + 0.02; toneHit(ac, t, { type: 'triangle', f0: 220, f1: 120, dur: 0.16, v: 0.4 }); noiseHit(ac, t, { type: 'lowpass', f: 800, dur: 0.08, v: 0.25 }); },
  water() { const ac = this.ctx(); if (!ac) return; const t = ac.currentTime + 0.02; noiseHit(ac, t, { f: 900, q: 0.6, dur: 1.4, v: 0.18 }); },
});

// ---------- hooks ----------
// 三處一組的小調查：全部做完才亮起下一段
const CH03_GROUPS = {
  wake: { label: '屋內檢查', keys: ['ch03_m_bed', 'ch03_m_roof', 'ch03_m_door'], done: 'ch03_wake' },
  clear: { label: '清理門前', keys: ['ch03_c_rubble', 'ch03_c_basket', 'ch03_c_weeds'], done: 'ch03_cleared', msg: '門前清出一條能走人的路' },
  sort: { label: '材料分類', keys: ['ch03_s_good', 'ch03_s_rotten', 'ch03_s_tiles'], done: 'ch03_sorted', msg: '修屋材料：可用木料兩綑、可重用的瓦片十幾片；朽木留著當柴' },
};
let signRising = false;
// 肩痛（hero_shoulder.png）：0 摀肩 → 1–2 痛得縮起來 → 3 彎腰 → 1 喘口氣 → 7 站好
const WINCE_SEQ = [[0, 200], [1, 220], [2, 380], [3, 420], [1, 220], [7, 260]];
Object.assign(STORY_HOOKS, {
  // S05 肩痛：主角播 hero_shoulder.png 摀肩、縮起、彎腰再站好＋冒汗；其他角色原地抖一下
  wince: (e) => {
    const a = actorOf(e.who); if (!a) return;
    emote(e.who, '💦');
    if (a === player && heroShoulderImg) return playPose(heroShoulderImg, WINCE_SEQ, false);
    const x0 = a.x; let i = 0;
    const id = setInterval(() => { a.x = x0 + (i % 2 ? -2 : 2); if (++i >= 6) { clearInterval(id); a.x = x0; } }, 55);
  },
  // S05 遞水：一只陶碗從 from 手邊移到 to 手邊，停一下再淡掉（對話框暫收 1.1 秒）
  bowlPass: (e) => holdFor(1100, () => {
    const A = actorOf(e.from), B = actorOf(e.to); if (!A || !B) return;
    const hand = (a) => ({ x: a.x, y: a.y - 64 * (a.scale || 1) * (a.sit ? 0.74 : 1) * 0.42 });
    worldFx.push({ t: 0, dur: 1.6, draw(p) {
      const a = hand(A), b = hand(B), k = Math.min(1, p / 0.55), e2 = k * k * (3 - 2 * k);
      const x = a.x + (b.x - a.x) * e2 - cam.x, y = a.y + (b.y - a.y) * e2 - Math.sin(k * Math.PI) * 8 - cam.y;
      ctx.globalAlpha = p > 0.8 ? (1 - p) / 0.2 : 1;
      ctx.fillStyle = '#a0664a'; ctx.beginPath(); ctx.moveTo(x - 6, y - 3); ctx.lineTo(x + 6, y - 3); ctx.lineTo(x + 4, y + 3); ctx.lineTo(x - 4, y + 3); ctx.fill();
      ctx.fillStyle = '#9cc8e6'; ctx.fillRect(x - 5, y - 4, 10, 2);
      ctx.globalAlpha = 1;
    } });
  }),
  ch03Count: (e) => {
    const g = CH03_GROUPS[e.group], f = F();
    f[e.key] = 1;
    const n = g.keys.filter((k) => f[k]).length;
    if (n < g.keys.length) return toast(`${g.label} ${n}/${g.keys.length}`);
    f[g.done] = 1;
    if (g.msg) storyLog(g.msg, true); else toast(`${g.label} ${n}/${g.keys.length}`);
  },
  ch03Hour: (e) => { S.time = Math.max(S.time, e.h * 60); },
  // 竹管倒水：ok 流出院外；否則流到一半倒流回入口
  drainTest: (e) => {
    const d = CH03.drain, ix = d.x - 46, iy = d.y - 12, ox = d.x + 44, oy = d.y + 2;
    Sfx.water();
    worldFx.push({ t: 0, dur: 1.6, draw(p) {
      for (let i = 0; i < 7; i++) {
        let k = Math.max(0, Math.min(1, p * 1.6 - i * 0.07));
        if (!e.ok) k = k < 0.5 ? k : 1 - k;
        if (k <= 0) continue;
        const x = ix + (ox - ix) * k, y = iy + (oy - iy) * k + (e.ok ? 0 : Math.sin(k * Math.PI) * -3);
        ctx.fillStyle = 'rgba(150,200,235,.85)';
        ctx.beginPath(); ctx.arc(x - cam.x, y - cam.y - 3, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      // 結果：成功在出口外濺起水花，失敗在入口積一灘
      const sx = e.ok ? ox + 10 : ix - 4, sy = e.ok ? oy + 6 : iy + 8, q = Math.max(0, p * 1.6 - 0.8);
      if (q > 0) { ctx.fillStyle = `rgba(140,190,225,${0.5 * Math.min(1, q * 2)})`; ctx.beginPath(); ctx.ellipse(sx - cam.x, sy - cam.y, 6 + q * 8, 2 + q * 3, 0, 0, Math.PI * 2); ctx.fill(); }
    } });
  },
  // 補好屋頂：王宅內外換成修好的樣子（仍是簡樸舊宅），時間到傍晚
  ch03Roof: () => fade(() => {
    F().wang_house_repaired = 1; S.time = Math.max(S.time, 17 * 60 + 30);
    applyWang(MAPS.village);
    if (G.groundAlt) G.ground = G.groundAlt;
    refreshNpcs(); questTick();
  }, 1200),
  // 匾額從地上抬起、端正掛回門楣
  signRise: () => {
    const p = plaquePos(), dur = 1.4;
    signRising = true;
    worldFx.push({ t: 0, dur, draw(q) {
      const k = Math.min(1, q), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const x = p.lx + (p.nx - p.lx) * e, y = p.ly + (p.ny - p.ly) * e - Math.sin(k * Math.PI) * 14;
      drawPlaque(x - cam.x, y - cam.y, PLAQUE_REST * (1 - e), 0.7 + 0.3 * e);
    } });
    setTimeout(() => { signRising = false; Sfx.hammer(); setTimeout(() => Sfx.hammer(), 220); }, dur * 1000);
  },
  // 窗外遠方山脊的一點冷光
  ch03Glint: () => {
    const w = CH03.window;
    worldFx.push({ t: 0, dur: 1.2, draw(p) {
      const a = Math.sin(Math.min(1, p) * Math.PI), x = w.x - cam.x, y = w.y - cam.y, r = 3 + a * 9;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
      gr.addColorStop(0, `rgba(225,238,255,${0.7 * a})`); gr.addColorStop(1, 'rgba(225,238,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(240,248,255,${a})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r * 0.7); ctx.lineTo(x, y + r * 0.7); ctx.stroke();
    } });
  },
});

// ---------- 院前道具與屋內陶杯（畫在地面層，人物會走在上面）----------
function ch03Rubble(x, y) {
  ctx.fillStyle = '#6f6a62';
  for (const [dx, dy, w, h] of [[-14, -2, 10, 5], [-2, -6, 12, 6], [8, 2, 9, 5], [-8, 5, 8, 4], [14, -4, 7, 4]]) ctx.fillRect(x + dx, y + dy, w, h);
  ctx.fillStyle = '#8c857a'; ctx.fillRect(x - 1, y - 6, 12, 2); ctx.fillRect(x - 14, y - 2, 10, 2);
}
function ch03Basket(x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x, y + 6, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#9a7a45'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y - 2, 15, 9, 0.3, 0.4, Math.PI * 1.7); ctx.stroke();
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 6, y - 9); ctx.lineTo(x + i * 5 + 3, y + 6); ctx.stroke(); }
}
function ch03Weeds(x, y) {
  ctx.strokeStyle = '#5f7a35'; ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) { const bx = x - 20 + i * 5; ctx.beginPath(); ctx.moveTo(bx, y + 4); ctx.lineTo(bx + ((i % 3) - 1) * 4, y - 8 - (i % 4) * 3); ctx.stroke(); }
}
function ch03Logs(x, y, rotten) {
  for (let i = 0; i < 3; i++) {
    const ly = y - i * 5, lx = x + (i % 2) * 4;
    ctx.fillStyle = rotten ? '#4a3f33' : '#9b7348'; ctx.fillRect(lx - 18, ly - 4, 36, 6);
    ctx.fillStyle = rotten ? '#3a322a' : '#c8a070'; ctx.beginPath(); ctx.ellipse(lx + 18, ly - 1, 2.5, 3, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (!rotten) { ctx.strokeStyle = '#6a5a3a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 4, y - 14); ctx.lineTo(x - 4, y + 2); ctx.stroke(); }
}
function ch03Tiles(x, y) {
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#5b5f63' : '#6b7074'; ctx.fillRect(x - 12, y - i * 3, 24, 3); }
}
function drawCh03Decals() {
  const f = F();
  if (G.id === 'in_river' && f.ch03_flowers) {
    const { x, y } = CH03.cup, cx = x - cam.x, cy = y - cam.y;
    ctx.strokeStyle = '#4f7a3a'; ctx.lineWidth = 1.5;
    for (const [dx, h] of [[-4, 14], [0, 18], [4, 13]]) { ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + dx, cy - 6 - h); ctx.stroke(); }
    for (const [dx, h, c] of [[-4, 14, '#f2e27a'], [0, 18, '#f5f2ea'], [4, 13, '#d98aa8']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx + dx, cy - 6 - h, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#a0664a'; ctx.fillRect(cx - 5, cy - 8, 10, 10); ctx.fillStyle = '#7a4a34'; ctx.fillRect(cx - 5, cy - 8, 10, 2);
    return;
  }
  if (G.id !== 'village' || !f.ch02_complete) return;
  const at = (p) => [p.x - cam.x, p.y - cam.y];
  // 泥溝 → 排水溝與竹管
  const d = CH03.drain, [dx, dy] = at(d);
  ctx.fillStyle = f.ch03_drain ? 'rgba(60,45,30,.55)' : 'rgba(95,70,45,.4)';
  ctx.beginPath(); ctx.moveTo(dx - 120, dy - 52); ctx.quadraticCurveTo(dx - 70, dy - 20, dx - 46, dy - 12); ctx.lineTo(dx - 46, dy - 4); ctx.quadraticCurveTo(dx - 78, dy - 12, dx - 126, dy - 46); ctx.fill();
  if (f.ch03_drain) {
    ctx.fillStyle = 'rgba(60,45,30,.55)'; ctx.fillRect(dx + 44, dy, 50, 7);
    ctx.fillStyle = 'rgba(150,195,225,.35)'; ctx.fillRect(dx + 46, dy + 2, 46, 3);
  }
  if (f.ch03_treated) {
    const ix = dx - 46, iy = dy - (f.ch03_drain ? 12 : 6), ox = dx + 44, oy = dy + (f.ch03_drain ? 2 : -6);
    ctx.strokeStyle = '#8a9a5a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ox, oy); ctx.stroke();
    ctx.strokeStyle = '#6a7a40'; ctx.lineWidth = 1;
    for (let k = 0.25; k < 1; k += 0.25) { const x = ix + (ox - ix) * k, y = iy + (oy - iy) * k; ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); ctx.stroke(); }
    ctx.lineCap = 'butt';
    if (f.ch03_drain) { ctx.fillStyle = '#5a4a3a'; ctx.fillRect(ix - 5, iy + 2, 10, 6); }
  }
  // 清理前的碎瓦、破筐、雜草
  if (!f.ch03_c_rubble) ch03Rubble(...at(CH03.rubble));
  if (!f.ch03_c_basket) ch03Basket(...at(CH03.basket));
  if (!f.ch03_c_weeds) ch03Weeds(...at(CH03.weeds));
  // 老吳送來的材料：分類前散在門前，分好後靠牆堆放（補屋頂用掉木料和瓦片，朽木留著當柴）
  if (!f.ch03_wood) return;
  const [px, py] = at(CH03.piles);
  if (!f.ch03_s_good) ch03Logs(...at(CH03.good), false); else if (!f.wang_house_repaired) ch03Logs(px, py, false);
  if (!f.ch03_s_rotten) ch03Logs(...at(CH03.rotten), true); else ch03Logs(px + 46, py + 12, true);
  if (!f.ch03_s_tiles) ch03Tiles(...at(CH03.tiles)); else if (!f.wang_house_repaired) ch03Tiles(px - 40, py + 16);
}
