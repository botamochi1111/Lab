// IFW Lab UI: edit levels, play them, analyze them exactly, and check the
// S->T (with revisits) hub-decomposition lemma on concrete instances.

const E = window.IFWEngine;
const SAMPLES = window.IFW_SAMPLES;

const NS = "http://www.w3.org/2000/svg";
const $ = (id) => document.getElementById(id);
const svg = $("canvas");

const TOOL_HINTS = {
  move: ["頂点をドラッグして移動", "Drag a vertex to move it"],
  addNode: ["空いている場所をクリックして頂点を追加", "Click an empty spot to add a vertex"],
  addEdge: ["頂点を2つ順にクリックして辺を追加(Escで取消)", "Click two vertices to add an edge (Esc cancels)"],
  cycleEdge: ["辺をクリック: オフ ⇄ オン", "Click an edge: OFF ⇄ ON"],
  subdivide: ["辺をクリックして真ん中に頂点を挿入", "Click an edge to insert a vertex in the middle"],
  delete: ["頂点または辺をクリックして削除", "Click a vertex or edge to delete it"],
  setStart: ["頂点をクリックしてスタートに指定", "Click a vertex to make it the start"],
  setGoal: ["頂点をクリックしてゴールに指定(S→T用)", "Click a vertex to make it the goal (for S→T)"],
};

let level = null;
let tool = "move";
let tab = "edit";
let pendingEdge = null;
let drag = null;
let play = null;
let solution = null;
let lastAnalysis = null;
let undoStack = [];
let redoStack = [];

// ---------------- level helpers ----------------

function cloneLevel(lv) {
  return JSON.parse(JSON.stringify(lv));
}

function normalizeLevel(lv) {
  const out = {
    name: lv.name || "untitled",
    note: lv.note || "",
    vertices: {},
    edges: (lv.edges || []).map(([u, v, w]) => [u, v, w]),
    start: lv.start,
    goal: lv.goal ?? null,
    mode: lv.mode || (lv.goal ? "goal" : "all"),
    canRevisit: !!lv.canRevisit,
  };
  for (const [id, p] of Object.entries(lv.vertices || {})) out.vertices[id] = { x: p.x, y: p.y };
  return out;
}

function rules() {
  return { mode: level.mode, revisit: level.canRevisit };
}

function compiled() {
  return E.compile(level);
}

function newVertexId() {
  let i = Object.keys(level.vertices).length;
  while (level.vertices[`v${i}`]) i++;
  return `v${i}`;
}

function edgeIndex(u, v) {
  return level.edges.findIndex(([a, b]) => (a === u && b === v) || (a === v && b === u));
}

// ---------------- undo / redo (editor) ----------------

// Call BEFORE mutating the level.
function snapshot() {
  undoStack.push(cloneLevel(level));
  if (undoStack.length > 200) undoStack.shift();
  redoStack = [];
}

function restore(lv) {
  level = lv;
  pendingEdge = null;
  $("levelName").value = level.name;
  $("levelNote").value = level.note;
  $("modeSelect").value = level.mode;
  $("chkRevisit").checked = level.canRevisit;
  changed();
}

function undoEdit() {
  if (!undoStack.length) return;
  redoStack.push(cloneLevel(level));
  restore(undoStack.pop());
}

function redoEdit() {
  if (!redoStack.length) return;
  undoStack.push(cloneLevel(level));
  restore(redoStack.pop());
}

function undoPlayMove() {
  if (!play || !play.history.length) return;
  play.st = play.history.pop();
  play.moves--;
  refreshAll();
}

function changed() {
  play = null;
  solution = null;
  lastAnalysis = null;
  $("analysisOut").innerHTML = "";
  $("proofOut").innerHTML = "";
  $("solutionControls").hidden = true;
  if (tab === "play") startPlay();
  refreshAll();
}

function loadLevel(lv) {
  level = normalizeLevel(cloneLevel(lv));
  if (LANG === "en" && lv.name_en) level.name = lv.name_en;
  if (LANG === "en" && lv.note_en) level.note = lv.note_en;
  undoStack = [];
  redoStack = [];
  pendingEdge = null;
  $("levelName").value = level.name;
  $("levelNote").value = level.note;
  $("modeSelect").value = level.mode;
  $("chkRevisit").checked = level.canRevisit;
  $("chkDoors").checked = level.mode === "goal";
  changed();
}

// ---------------- play ----------------

function startPlay() {
  if (!level.start || !level.vertices[level.start]) { play = null; return; }
  const G = compiled();
  play = { G, st: E.initialState(G, rules()), history: [], moves: 0 };
}

function playMove(id) {
  if (!play) return;
  const to = play.G.idx.get(id);
  if (E.isGoal(play.G, rules(), play.st)) return;
  if (!E.legalMoves(play.G, rules(), play.st).includes(to)) return;
  play.history.push(play.st);
  play.st = E.step(play.G, rules(), play.st, to);
  play.moves++;
  refreshAll();
}

// ---------------- rendering ----------------

function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

function viewBox() {
  const pts = Object.values(level.vertices);
  if (!pts.length) return { x: 0, y: 0, w: 1000, h: 700 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  const pad = 90;
  let w = Math.max(500, maxX - minX + pad * 2);
  let h = Math.max(360, maxY - minY + pad * 2);
  return { x: (minX + maxX) / 2 - w / 2, y: (minY + maxY) / 2 - h / 2, w, h };
}

let frozenView = null;

function currentState() {
  if (solution) return solution.states[solution.step];
  if (tab === "play" && play) return play.st;
  return null;
}

function render() {
  const vb = frozenView || viewBox();
  svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  svg.innerHTML = "";
  const G = compiled();
  const st = currentState();
  const R = rules();
  const legal = st && !E.isGoal(G, R, st) ? E.legalMoves(G, R, st) : [];
  const showDerived = $("chkDerived").checked && level.mode === "all" && !level.canRevisit && level.start;
  const H = $("chkDoors").checked ? E.hubStructure(G) : null;

  const gE = el("g", {}, svg);
  G.edges.forEach((e, k) => {
    const p = level.vertices[G.ids[e.u]];
    const q = level.vertices[G.ids[e.v]];
    const hit = el("line", { x1: p.x, y1: p.y, x2: q.x, y2: q.y, stroke: "transparent", "stroke-width": 22, "data-edge": k, class: "edge-hit" }, gE);
    hit.style.cursor = tool === "cycleEdge" || tool === "subdivide" || tool === "delete" ? "pointer" : "default";
    if (showDerived && E.derivedEdge(G, k)) {
      el("line", { x1: p.x, y1: p.y, x2: q.x, y2: q.y, stroke: "#4aa3ff", "stroke-width": 14, opacity: 0.25, "pointer-events": "none" }, gE);
    }
    const walk = st ? E.walkable(G, k, st.f) : e.w !== E.OFF;
    el("line", {
      x1: p.x, y1: p.y, x2: q.x, y2: q.y,
      stroke: walk ? "#111" : "#bbb",
      "stroke-width": walk ? 3.5 : 2,
      "stroke-dasharray": walk ? "0" : "8 6",
      "stroke-linecap": "round",
      "pointer-events": "none",
    }, gE);
  });

  // Hub door markers: green = open (edge at rest OFF), red = closed.
  if (H) {
    const f = st ? st.f : 0;
    for (const hub of E.hubDoors(G, H, f, st ? st.pos : -1)) {
      const c = level.vertices[G.ids[hub.hub]];
      for (const d of hub.doors) {
        const o = level.vertices[G.ids[d.to]];
        const x = c.x + (o.x - c.x) * 0.3;
        const y = c.y + (o.y - c.y) * 0.3;
        el("circle", {
          cx: x, cy: y, r: 6,
          fill: hub.here ? "#aaa" : d.open ? "#16a34a" : "#dc2626",
          stroke: "#fff", "stroke-width": 1.5, "pointer-events": "none",
        }, gE);
      }
    }
  }

  const gN = el("g", {}, svg);
  G.ids.forEach((id, i) => {
    const p = level.vertices[id];
    const isStart = id === level.start;
    const isGoalV = level.mode === "goal" && id === level.goal;
    const here = st && st.pos === i;
    const visited = st && ((st.vm >>> i) & 1);
    const isLegal = legal.includes(i);
    const g = el("g", { "data-node": id, class: "node" }, gN);
    g.style.cursor = "pointer";
    if (isLegal) el("circle", { cx: p.x, cy: p.y, r: 27, fill: "none", stroke: "#2563eb", "stroke-width": 2.5, "stroke-dasharray": "4 3" }, g);
    let fill = "#fff";
    if (visited) fill = "#cfe3ff";
    if (isStart) fill = "#ffd84d";
    if (isGoalV) fill = "#ff9a9a";
    if (here) fill = "#2563eb";
    el("circle", {
      cx: p.x, cy: p.y, r: 18, fill,
      stroke: pendingEdge === id ? "#2563eb" : "#333",
      "stroke-width": pendingEdge === id ? 4 : 1.8,
    }, g);
    const deg = G.adj[i].length;
    const label = el("text", { x: p.x, y: p.y + 4, "text-anchor": "middle", "font-size": 12, "font-family": "system-ui, sans-serif", fill: here ? "#fff" : "#222", "pointer-events": "none" }, g);
    label.textContent = id;
    if (H && deg >= 3) {
      const hl = el("text", { x: p.x, y: p.y - 26, "text-anchor": "middle", "font-size": 10, "font-family": "system-ui, sans-serif", fill: "#888", "pointer-events": "none" }, g);
      hl.textContent = `hub d${deg}`;
    }
  });
}

function renderEditStats() {
  const G = compiled();
  const s = G.s;
  let decoys = 0;
  let derived = 0;
  G.edges.forEach((e, k) => {
    if (E.derivedEdge(G, k)) derived++;
    else if (s != null) decoys++;
  });
  const counts = [0, 0, 0];
  G.edges.forEach((e) => counts[e.w]++);
  $("editStats").innerHTML = `<table>
    <tr><td>${L("頂点", "Vertices")}</td><td>${G.n}</td></tr>
    <tr><td>${L("辺", "Edges")}</td><td>${G.edges.length}${L(`(オフ ${counts[0]} / オン ${counts[1]})`, ` (OFF ${counts[0]} / ON ${counts[1]})`)}</td></tr>
    <tr><td>${L("スタート / ゴール", "Start / goal")}</td><td>${level.start || "-"} / ${level.mode === "goal" ? level.goal || "-" : L("(なし)", "(none)")}</td></tr>
    ${level.mode === "all" && !level.canRevisit ? `<tr><td>${L("本当に使える辺", "Usable edges")}</td><td>${L(`${derived}本(一度も通れない飾り ${decoys}本)`, `${derived} (${decoys} decoys that can never be used)`)}</td></tr>` : ""}
  </table>`;
}

function renderPlay() {
  if (!play) { $("playStatus").innerHTML = L("スタートを指定してください", "Set a start vertex"); $("doorList").innerHTML = ""; return; }
  const G = play.G;
  const R = rules();
  const st = play.st;
  const won = E.isGoal(G, R, st);
  const legal = E.legalMoves(G, R, st);
  let visitedCount = 0;
  for (let i = 0; i < G.n; i++) visitedCount += (st.vm >>> i) & 1;
  $("playStatus").innerHTML = `<table>
    <tr><td>${L("手数", "Moves")}</td><td>${play.moves}</td></tr>
    <tr><td>${L("現在地", "Position")}</td><td>${G.ids[st.pos]}</td></tr>
    ${E.tracksVisited(R) ? `<tr><td>${L("訪問済み", "Visited")}</td><td>${visitedCount} / ${G.n}</td></tr>` : ""}
    <tr><td>${L("状態", "Status")}</td><td>${won ? `<span class="ok">${L("クリア!", "Cleared!")}</span>` : legal.length ? L("進行中", "In progress") : `<span class="ng">${L("詰み", "Stuck")}</span>`}</td></tr>
  </table>`;
  const H = E.hubStructure(G);
  const hubs = E.hubDoors(G, H, st.f, st.pos);
  $("doorList").innerHTML = hubs.length
    ? `<div class='small'>${L("ハブの扉(補題の開いている扉の集合 S)", "Hub doors (the lemma's set S of open doors)")}</div><table>` +
      hubs.map((h) => `<tr><td>${G.ids[h.hub]}${h.here ? L("(現在地)", " (here)") : ""}</td><td>${h.here ? L("到着直後(値は反転後)", "just arrived (values already flipped)") : "S = {" + h.doors.filter((d) => d.open).map((d) => G.ids[d.to]).join(", ") + "}"}</td></tr>`).join("") +
      "</table>"
    : "";
}

function refreshAll() {
  render();
  renderEditStats();
  if (tab === "play") renderPlay();
  if (tab === "proof") renderProofChecks();
  $("toolHint").textContent = tab === "edit" ? L(...TOOL_HINTS[tool]) : tab === "play" ? L("光っている点線の輪の頂点をクリックして移動", "Click a vertex with a glowing dashed ring to move there") : "";
}

// ---------------- analysis ----------------

function pct(x) {
  return `${(x * 100).toFixed(1)}%`;
}

function runAnalysis() {
  const G = compiled();
  const R = rules();
  const t0 = performance.now();
  const r = E.analyze(G, R);
  const ms = Math.round(performance.now() - t0);
  lastAnalysis = r;
  if (r.error) { $("analysisOut").innerHTML = `<span class="ng">${trEngine(r.error)}</span>`; return; }
  const rows = [];
  rows.push([L("解けるか", "Solvable"), r.solvable ? `<span class="ok">${L("解ける", "Yes")}</span>` : `<span class="ng">${L("解けない", "No")}</span>`]);
  if (r.truncated) rows.push([L("注意", "Note"), `<span class="warn">${L("状態数が上限に達したため途中まで", "Stopped early: state limit reached")}</span>`]);
  rows.push([L("最短手数", "Shortest solution"), r.optimal ?? "-"]);
  rows.push([L("最短解の本数", "Number of shortest solutions"), r.optCount || 0]);
  if (r.walkCount != null) rows.push([L("歩ける道の総数(詰むまで)", "Total walks (until stuck)"), r.walkCount]);
  if (r.solutionCount != null) rows.push([L("そのうちクリアできる道", "Of which clear the level"), r.solutionCount]);
  if (R.mode === "all" && !R.revisit) {
    const ham = E.countHamPathsDerived(G);
    if (ham != null) rows.push([L("導出グラフのハミルトン路", "Hamiltonian paths in the derived graph"), `${ham} ${ham === r.solutionCount ? `<span class="ok">${L("(解の総数と一致)", "(matches the solution count)")}</span>` : `<span class="ng">${L("(不一致!)", "(MISMATCH!)")}</span>`}`]);
  }
  rows.push([L("到達可能な状態", "Reachable states"), r.reachable]);
  rows.push([L("詰み状態の割合", "Dead-state ratio"), pct(r.deadRatio)]);
  rows.push([L("初手", "First move"), L(`${r.firstMoves.total}通り中 正解につながるのは ${r.firstMoves.safe}通り`, `${r.firstMoves.safe} of ${r.firstMoves.total} lead to a solution`)]);
  const trapRows = r.traps.filter((t) => t.wrong.length);
  const maxDepth = Math.max(0, ...trapRows.flatMap((t) => t.wrong.map((w) => w.depth || 0)));
  rows.push([L("解の途中の罠", "Traps along the solution"), trapRows.length ? L(`${trapRows.length}か所(最大の深さ ${maxDepth || "-"}手)`, `${trapRows.length} (max depth ${maxDepth || "-"} moves)`) : L("なし", "none")]);
  if (r.human) {
    const h = r.human;
    const hd = Math.max(0, ...h.plausibleTraps.map((t) => t.depth));
    rows.push([L("もっともらしい罠", "Plausible traps"), L(`${h.plausibleTraps.length}個(一目ではダメと分からない手。気づくまで最大${hd}手)`, `${h.plausibleTraps.length} (wrong moves that don't look wrong; up to ${hd} moves before you notice)`)]);
    rows.push([L("迷う分かれ道", "Ambiguous steps"), L(`解の${r.path.length}手中 ${h.ambiguousSteps}か所(もっともらしい手が2つ以上)`, `${h.ambiguousSteps} of ${r.path.length} solution steps (2+ plausible moves)`)]);
    rows.push([L("騙し状態", "Deceptive states"), L(`${h.deceptiveStates}個(見た目は大丈夫だが実は詰んでいる状態)`, `${h.deceptiveStates} (look fine but are already lost)`)]);
    rows.push([L("「行き先の少ない所から回る」で解けるか", "Solved by the fewest-exits-first greedy"), h.greedySolves ? `<span class="ng">${L("解けてしまう", "Yes (too easy)")}</span>` : `<span class="ok">${L("解けない", "No")}</span>`]);
  }
  rows.push([L("計算時間", "Time"), `${ms} ms`]);
  let html = "<table>" + rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("") + "</table>";
  if (r.human && r.human.plausibleTraps.length) {
    html += `<div class='small' style='margin-top:6px'>${L("もっともらしい罠(深さ = 見た目は大丈夫なまま進めてしまう手数)", "Plausible traps (depth = moves you can make while it still looks fine)")}</div><table>`;
    for (const t of r.human.plausibleTraps) {
      html += `<tr><td>${L(`${t.step}手目`, `Move ${t.step}`)} @${G.ids[t.from]}</td><td>→ ${G.ids[t.to]}${L(`(${t.depth}手)`, ` (${t.depth})`)}</td></tr>`;
    }
    html += "</table>";
  }
  if (trapRows.length) {
    html += `<div class='small' style='margin-top:6px'>${L("罠の詳細(深さ = 間違えてから詰むまでに進める手数)", "Trap details (depth = moves from the mistake until stuck)")}</div><table>`;
    for (const t of trapRows) {
      html += `<tr><td>${L(`${t.step}手目`, `Move ${t.step}`)} @${G.ids[t.from]}</td><td>${L("正解", "correct")} ${t.safe} / ${L("罠", "traps")}: ${t.wrong.map((w) => `${G.ids[w.to]}${w.depth != null ? ` (${w.depth})` : ""}`).join(", ")}</td></tr>`;
    }
    html += "</table>";
  }
  if (r.solvable) html += `<div class="small" style="margin-top:6px">${L("最短解", "Shortest solution")}: ${[level.start, ...r.path.map((i) => G.ids[i])].join(" → ")}</div>`;
  $("analysisOut").innerHTML = html;
  if (r.solvable) {
    const states = [E.initialState(G, R)];
    for (const to of r.path) states.push(E.step(G, R, states[states.length - 1], to));
    solution = { states, step: 0 };
    $("solutionControls").hidden = false;
    updateSolStep();
  }
}

function updateSolStep() {
  if (!solution) return;
  $("solStep").textContent = `${solution.step} / ${solution.states.length - 1}`;
  render();
}

// ---------------- proof tab ----------------

function renderProofChecks() {
  const G = compiled();
  if (level.mode !== "goal" || !level.goal) {
    $("proofChecks").innerHTML = `<span class="warn">${L("モードをREACH_GOALにしてゴールを指定してください", "Switch the mode to REACH_GOAL and set a goal")}</span>`;
    return;
  }
  const H = E.hubStructure(G);
  const hubs = H.junctions.filter((v) => H.deg[v] >= 3);
  $("proofChecks").innerHTML = `<table>
    <tr><td>${L("ハブ(次数3以上)", "Hubs (degree ≥ 3)")}</td><td>${hubs.map((v) => `${G.ids[v]}${L(`(次数${H.deg[v]})`, ` (deg ${H.deg[v]})`)}`).join(", ") || L("なし", "none")}</td></tr>
    <tr><td>${L("通路", "Hallways")}</td><td>${H.hallways.length}</td></tr>
    <tr><td>${L("補題の前提", "Lemma hypotheses")}</td><td>${H.problems.length ? H.problems.map((p) => `<div class="ng">✗ ${trEngine(p)}</div>`).join("") : `<span class="ok">${L("✓ すべて満たす", "✓ all satisfied")}</span>`}</td></tr>
  </table>`;
}

function runLemma() {
  const G = compiled();
  if (level.mode !== "goal" || !level.goal) return;
  const r = E.verifyLemma(G);
  if (!r.ok) {
    $("proofOut").innerHTML = `<span class="ng">${L("前提を満たしていないため検証できません", "Cannot verify: hypotheses not satisfied")}</span>`;
    return;
  }
  $("proofOut").innerHTML = `<table>
    <tr><td>${L("具体グラフ(全状態探索)", "Concrete graph (full search)")}</td><td>${L(`ハブ/葉にいる状態 ${r.concreteStates}個、ゴール${r.concreteGoal ? "到達可" : "到達不可"}`, `${r.concreteStates} states at hubs/leaves, goal ${r.concreteGoal ? "reachable" : "unreachable"}`)}</td></tr>
    <tr><td>${L("補題の抽象モデル", "Lemma's abstract model")}</td><td>${L(`状態 ${r.abstractStates}個、ゴール${r.abstractGoal ? "到達可" : "到達不可"}`, `${r.abstractStates} states, goal ${r.abstractGoal ? "reachable" : "unreachable"}`)}</td></tr>
    <tr><td>${L("到達集合", "Reachable sets")}</td><td>${r.equal ? `<span class="ok">${L("✓ 完全に一致", "✓ identical")}</span>` : `<span class="ng">${L(`✗ 不一致(抽象に無い ${r.missingInAbstract} / 具体に無い ${r.missingInConcrete})`, `✗ differ (${r.missingInAbstract} missing in abstract / ${r.missingInConcrete} missing in concrete)`)}</span>`}</td></tr>
    ${r.truncated ? `<tr><td>${L("注意", "Note")}</td><td class="warn">${L("上限で打ち切り", "stopped at the limit")}</td></tr>` : ""}
  </table>`;
}

function runPCheck() {
  const G = compiled();
  if (!level.goal) { $("proofOut").innerHTML = `<span class="warn">${L("ゴールを指定してください", "Set a goal")}</span>`; return; }
  const p = E.reachNoRevisitP(G);
  const exact = E.analyze(G, { mode: "goal", revisit: false });
  $("proofOut").innerHTML = `<table>
    <tr><td>${L("P判定(1歩目オン・以降オフの単純パス)", "P test (simple path: first edge ON, rest OFF)")}</td><td>${p ? L("到達可", "reachable") : L("到達不可", "unreachable")}</td></tr>
    <tr><td>${L("全探索(再訪なし)", "Full search (no revisits)")}</td><td>${exact.solvable ? L("到達可", "reachable") : L("到達不可", "unreachable")}</td></tr>
    <tr><td>${L("一致", "Match")}</td><td>${p === exact.solvable ? '<span class="ok">✓</span>' : '<span class="ng">✗</span>'}</td></tr>
  </table>`;
}

// ---------------- canvas interaction ----------------

function svgPoint(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

svg.addEventListener("pointerdown", (evt) => {
  const nodeEl = evt.target.closest("[data-node]");
  const edgeEl = evt.target.closest("[data-edge]");
  const p = svgPoint(evt);

  if (solution) return;

  if (tab === "play") {
    if (nodeEl) playMove(nodeEl.dataset.node);
    return;
  }

  if (nodeEl) {
    const id = nodeEl.dataset.node;
    if (tool === "move") {
      frozenView = viewBox();
      drag = { id, dx: level.vertices[id].x - p.x, dy: level.vertices[id].y - p.y, before: cloneLevel(level) };
      svg.setPointerCapture(evt.pointerId);
    } else if (tool === "addEdge") {
      if (!pendingEdge) pendingEdge = id;
      else if (pendingEdge !== id) {
        if (edgeIndex(pendingEdge, id) < 0) { snapshot(); level.edges.push([pendingEdge, id, E.OFF]); }
        pendingEdge = null;
        changed();
        return;
      } else pendingEdge = null;
      render();
    } else if (tool === "delete") {
      snapshot();
      delete level.vertices[id];
      level.edges = level.edges.filter(([a, b]) => a !== id && b !== id);
      if (level.start === id) level.start = null;
      if (level.goal === id) level.goal = null;
      changed();
    } else if (tool === "setStart") {
      if (level.start === id) return;
      snapshot();
      level.start = id;
      changed();
    } else if (tool === "setGoal") {
      if (level.goal === id) return;
      snapshot();
      level.goal = id;
      changed();
    }
    return;
  }

  if (edgeEl) {
    const k = Number(edgeEl.dataset.edge);
    if (tool === "cycleEdge") {
      snapshot();
      level.edges[k][2] = level.edges[k][2] === 1 ? 0 : 1;
      changed();
    } else if (tool === "delete") {
      snapshot();
      level.edges.splice(k, 1);
      changed();
    } else if (tool === "subdivide") {
      snapshot();
      const [u, v, w] = level.edges[k];
      const id = newVertexId();
      const a = level.vertices[u];
      const b = level.vertices[v];
      level.vertices[id] = { x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) };
      level.edges.splice(k, 1, [u, id, w], [id, v, E.OFF]);
      changed();
    }
    return;
  }

  if (tool === "addNode") {
    snapshot();
    const id = newVertexId();
    level.vertices[id] = { x: Math.round(p.x), y: Math.round(p.y) };
    if (!level.start) level.start = id;
    changed();
  }
});

svg.addEventListener("pointermove", (evt) => {
  if (!drag) return;
  const p = svgPoint(evt);
  level.vertices[drag.id] = { x: Math.round(p.x + drag.dx), y: Math.round(p.y + drag.dy) };
  render();
});

svg.addEventListener("pointerup", () => {
  if (!drag) return;
  const { id, before } = drag;
  const a = before.vertices[id], b = level.vertices[id];
  if (a.x !== b.x || a.y !== b.y) { undoStack.push(before); redoStack = []; }
  drag = null;
  frozenView = null;
  changed();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { pendingEdge = null; render(); return; }
  // Leave text fields to their own undo.
  if (e.target.closest?.("input, textarea, select") || dialog.open) return;
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  const k = e.key.toLowerCase();
  const redo = k === "y" || (k === "z" && e.shiftKey);
  if (k !== "z" && k !== "y") return;
  e.preventDefault();
  if (drag) return;
  if (tab === "play") { if (!redo) undoPlayMove(); return; }
  if (solution) return;
  if (redo) redoEdit(); else undoEdit();
});

// ---------------- controls ----------------

document.querySelectorAll("#tools [data-tool]").forEach((b) => {
  b.addEventListener("click", () => {
    tool = b.dataset.tool;
    pendingEdge = null;
    document.querySelectorAll("#tools [data-tool]").forEach((x) => x.classList.toggle("active", x === b));
    if (tab !== "edit") switchTab("edit");
    refreshAll();
  });
});

function switchTab(name) {
  tab = name;
  document.querySelectorAll("#tabs [data-tab]").forEach((x) => x.classList.toggle("active", x.dataset.tab === name));
  for (const t of ["edit", "play", "analyze", "proof"]) $(`tab-${t}`).hidden = t !== name;
  if (name !== "analyze") { solution = null; $("solutionControls").hidden = true; }
  if (name === "play") startPlay();
  refreshAll();
}
document.querySelectorAll("#tabs [data-tab]").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));

$("modeSelect").addEventListener("change", () => { snapshot(); level.mode = $("modeSelect").value; changed(); });
$("chkRevisit").addEventListener("change", () => { snapshot(); level.canRevisit = $("chkRevisit").checked; changed(); });
$("chkDerived").addEventListener("change", render);
$("chkDoors").addEventListener("change", render);
$("levelName").addEventListener("input", () => { level.name = $("levelName").value; });
$("levelNote").addEventListener("input", () => { level.note = $("levelNote").value; });

$("btnUndo").addEventListener("click", undoPlayMove);
$("btnEditUndo").addEventListener("click", () => { if (tab !== "edit") switchTab("edit"); undoEdit(); });
$("btnEditRedo").addEventListener("click", () => { if (tab !== "edit") switchTab("edit"); redoEdit(); });
$("btnReset").addEventListener("click", () => { startPlay(); refreshAll(); });

$("btnAnalyze").addEventListener("click", runAnalysis);
$("btnSolPrev").addEventListener("click", () => { if (solution && solution.step > 0) { solution.step--; updateSolStep(); } });
$("btnSolNext").addEventListener("click", () => { if (solution && solution.step < solution.states.length - 1) { solution.step++; updateSolStep(); } });
$("btnSolExit").addEventListener("click", () => { solution = null; $("solutionControls").hidden = true; render(); });

$("btnLemma").addEventListener("click", runLemma);
$("btnPCheck").addEventListener("click", runPCheck);

$("btnNew").addEventListener("click", () => loadLevel({ name: "new level", vertices: {}, edges: [], start: null, goal: null, mode: level.mode }));

const dialog = $("jsonDialog");
$("btnExport").addEventListener("click", () => {
  $("jsonText").value = JSON.stringify(level, null, 1);
  $("btnJsonApply").hidden = true;
  dialog.showModal();
});
$("btnImport").addEventListener("click", () => {
  $("jsonText").value = "";
  $("btnJsonApply").hidden = false;
  dialog.showModal();
});
$("btnJsonApply").addEventListener("click", () => {
  try {
    const lv = JSON.parse($("jsonText").value);
    if (!lv.vertices || !lv.edges) throw new Error(L("vertices / edges がありません", "missing vertices / edges"));
    loadLevel(lv);
    dialog.close();
  } catch (err) {
    alert(`${L("読み込めませんでした", "Could not load")}: ${err.message}`);
  }
});
$("btnJsonCopy").addEventListener("click", () => navigator.clipboard?.writeText($("jsonText").value));
$("btnJsonClose").addEventListener("click", () => dialog.close());

// ---------------- sample / preset menu ----------------

const menu = [];
const sel = $("sampleSelect");
function addGroup(label, list, mode) {
  const og = document.createElement("optgroup");
  og.dataset.label = JSON.stringify(label);
  list.forEach((lv) => {
    const o = document.createElement("option");
    o.value = String(menu.length);
    menu.push({ ...lv, mode: lv.mode || mode });
    og.appendChild(o);
  });
  sel.appendChild(og);
}
function labelMenu() {
  sel.querySelectorAll("optgroup").forEach((og) => (og.label = L(...JSON.parse(og.dataset.label))));
  sel.querySelectorAll("option").forEach((o) => {
    const lv = menu[Number(o.value)];
    o.textContent = (LANG === "en" && lv.name_en) || lv.name;
  });
}
addGroup(["ラボのサンプル", "Lab samples"], SAMPLES);
if (window.PRESETS_ALL) addGroup(["ゲーム: VISIT_ALL", "Game: VISIT_ALL"], window.PRESETS_ALL, "all");
if (window.PRESETS_GOAL) addGroup(["ゲーム: S→T", "Game: S→T"], window.PRESETS_GOAL, "goal");
labelMenu();

// Language switch: static text, menu labels, and everything rendered from state.
function setLang(lang) {
  LANG = lang;
  try { localStorage.setItem("ifwLabLang", lang); } catch (e) { /* storage unavailable */ }
  $("btnLang").textContent = LANG === "en" ? "日本語" : "English";
  applyStaticLang();
  labelMenu();
  $("proofOut").innerHTML = "";
  if (lastAnalysis && tab === "analyze") runAnalysis();
  refreshAll();
}
$("btnLang").addEventListener("click", () => setLang(LANG === "en" ? "ja" : "en"));
sel.addEventListener("change", () => loadLevel(menu[Number(sel.value)]));

loadLevel(menu[0]);
setLang(LANG);
