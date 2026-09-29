// Japanese / English switch for the lab.
// - L(ja, en) picks a string for dynamic text built in lab.js.
// - applyStaticLang() swaps the static text in index.html using STATIC_EN,
//   keyed by the Japanese original (which is remembered, so switching back works).
// - trEngine() translates messages that come from engine.js.

var LANG = "ja";
try { if (localStorage.getItem("ifwLabLang") === "en") LANG = "en"; } catch (e) { /* storage unavailable */ }

function L(ja, en) {
  return LANG === "en" ? en : ja;
}

var STATIC_EN = {
  "レベルを読み込む": "Load a level",
  "新規": "New",
  "JSON出力": "Export JSON",
  "JSON読込": "Import JSON",
  "モード": "Mode",
  "VISIT_ALL(全部通る)": "VISIT_ALL (visit every vertex)",
  "REACH_GOAL(S→T)": "REACH_GOAL (S→T)",
  "再訪あり": "Can revisit",
  "移動": "Move",
  "頂点追加": "Add vertex",
  "辺追加": "Add edge",
  "辺の状態切替": "Toggle edge",
  "辺を分割": "Split edge",
  "削除": "Delete",
  "スタート指定": "Set start",
  "ゴール指定": "Set goal",
  "元に戻す": "Undo",
  "やり直し": "Redo",
  "本当に使える辺を表示": "Show usable edges",
  "ハブの扉を表示": "Show hub doors",
  "編集": "Edit",
  "プレイ": "Play",
  "解析": "Analyze",
  "S→T検証": "S→T check",
  "名前": "Name",
  "メモ": "Note",
  "初期オフ": "Initially OFF",
  "初期オン": "Initially ON",
  "固定(常に通れる・反転しない)": "Fixed (always walkable, never flips)",
  "本当に使える辺(VISIT_ALL・再訪なし)": "Actually usable edge (VISIT_ALL, no revisit)",
  "1手戻す": "Undo move",
  "最初から": "Restart",
  "厳密に解析する": "Analyze exactly",
  "終了": "Exit",
  "ゲームの全ステージの難易度一覧": "Difficulty of every game stage",
  "どんなグラフでも使えるS→Tの全状態探索。": "A full S→T state search that works on any graph.",
  "S→T 全状態探索(条件なし)": "S→T full state search (any graph)",
  "補題の検証(証明用)": "Lemma checks (for the proof)",
  "補題の前提を満たす形に変換": "Convert to satisfy the lemma",
  "補題を検証(そのままのグラフで)": "Verify lemma (on the graph as is)",
  "再訪なしS→T: P判定と全探索を比較": "S→T without revisits: compare P test with full search",
  "読み込む": "Load",
  "コピー": "Copy",
  "閉じる": "Close",
};

var staticOriginals = new Map(); // text node / element -> Japanese original

function applyStaticLang() {
  document.documentElement.lang = LANG;
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  var nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(function (node) {
    if (node.parentElement.closest("#analysisOut, #stageTableOut, #stOut, #proofOut, #proofChecks, #editStats, #playStatus, #doorList, #toolHint, #sampleSelect, textarea")) return;
    if (!staticOriginals.has(node)) {
      var key = node.nodeValue.trim();
      if (!STATIC_EN[key]) return;
      staticOriginals.set(node, node.nodeValue);
    }
    var orig = staticOriginals.get(node);
    var trimmed = orig.trim();
    node.nodeValue = LANG === "en" ? orig.replace(trimmed, STATIC_EN[trimmed]) : orig;
  });
  document.querySelectorAll("[title]").forEach(function (el) {
    if (!el.dataset.titleJa) {
      if (!STATIC_EN[el.title]) return;
      el.dataset.titleJa = el.title;
    }
    el.title = L(el.dataset.titleJa, STATIC_EN[el.dataset.titleJa]);
  });
}

var ENGINE_EN = [
  [/^頂点数が(\d+)を超えています$/, "More than $1 vertices"],
  [/^スタートが未指定です$/, "No start vertex set"],
  [/^ゴールが未指定です$/, "No goal vertex set"],
  [/^スタートが次数1\(葉\)ではない$/, "Start is not a leaf (degree 1)"],
  [/^ゴールが次数1\(葉\)ではない$/, "Goal is not a leaf (degree 1)"],
  [/^常時オンの辺がある\(補題の対象外\)$/, "Has always-on edges (outside the lemma)"],
  [/^通路(\d+): 内部頂点がない\(次数2の頂点で分割が必要\)$/, "Hallway $1: no internal vertex (split it with a degree-2 vertex)"],
  [/^通路(\d+): 両端が同じハブ$/, "Hallway $1: both ends at the same hub"],
  [/^通路(\d+): 内部の辺が初期オフでない$/, "Hallway $1: an internal edge is not initially OFF"],
  [/^次数2の頂点だけの閉路がある$/, "Has a cycle made only of degree-2 vertices"],
];

function trEngine(msg) {
  if (LANG !== "en") return msg;
  for (var i = 0; i < ENGINE_EN.length; i++) {
    if (ENGINE_EN[i][0].test(msg)) return msg.replace(ENGINE_EN[i][0], ENGINE_EN[i][1]);
  }
  return msg;
}
