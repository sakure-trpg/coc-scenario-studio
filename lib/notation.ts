/** Authoring conventions shared by the editor and MCP. */
export const notationRules = [
 {category:'技能など・正気度ロール',brackets:'〈 〉',example:'〈目星〉、〈正気度〉ロール'},
 {category:'計算式',brackets:'［ ］',example:'［1D6＋2］'},
 {category:'呪文関連',brackets:'《 》',example:'《呪文名》'},
 {category:'魔道書・書籍・映画タイトル',brackets:'『 』',example:'『書名』、『映画タイトル』'},
] as const;
export const notationInstructions = '表記統一：技能などは〈 〉（〈正気度〉ロールも同じ）、計算式は［ ］、呪文関連は《 》、魔道書・書籍・映画タイトルは『 』を用いる。括弧の内側に不要な空白を入れない。シナリオ本文・NPC説明・判定・計算式・AI提案に共通して適用する。';
