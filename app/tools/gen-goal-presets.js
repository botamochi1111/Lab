// Regenerates the 30 REACH_GOAL (S→T) levels in the same style as the
// VISIT_ALL stages: tidy shapes first, then spread-out points with few,
// wide-angle crossings; vertices named s, t, v1, v2, ...
//
// These are S→T WITH revisits puzzles (the case being studied): from stage 3
// on, the goal must be unreachable without revisits. Edge ON/OFF states are
// hill-climbed for a long shortest walk, few shortest walks, many dead
// states and few safe first moves.
//
// Generation is split so it can run in parallel; `assemble` rewrites
// PRESETS_GOAL in www/presets.js (PRESETS_ALL is kept), all ordered by score.
//
// usage:
//   node tools/gen-goal-presets.js <from> <to>   generate into tools/out/goal/
//   node tools/gen-goal-presets.js assemble      write www/presets.js

const fs = require("fs");
const path = require("path");
const E = require("../lab/engine.js");
const { buildGeometry, makeRng } = require("./readable-core.js");

const LEVEL_COUNT = 30;
const OUT_DIR = path.join(__dirname, "out", "goal");
const PRESETS = path.join(__dirname, "..", "www", "presets.js");
const CAP = 150000;

const EARLY = [
  { points: "shape", shape: "triangle", rows: 3, maxLen: 200 },                                        // 6
  { points: "shape", shape: "square", cols: 3, rows: 3, maxLen: 200 },                                 // 9
  { points: "shape", shape: "rings", counts: [5, 5], radii: [110, 250], maxLen: 300 },                 // 10
  { points: "grid", cols: 4, rows: 3, jitter: 0, maxLen: 200 },                                        // 12
  { points: "shape", shape: "rings", counts: [6, 6], radii: [120, 260], rotations: [0, 30], maxLen: 280 }, // 12
  { points: "shape", shape: "square", cols: 4, rows: 3, maxLen: 200 },                                 // 12
];

function specFor(i) {
  if (i <= EARLY.length) return { ...EARLY[i - 1], maxCross: 0 };
  const n = Math.min(14, 9 + Math.floor((i - EARLY.length) / 5));
  return { points: "scatter", n, maxCross: n <= 11 ? 1 : 2 };
}

function generate(i, seed) {
  const rand = makeRng(seed);
  const shuffle = (a) => { for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(rand() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; };
  const spec = specFor(i);
  const geo = buildGeometry(spec, rand);
  const { n, cand, pts } = geo;

  // Edge set: a random maximal drawable set, thinned toward average degree ~2.8
  // while staying connected (sparser graphs have more interesting S→T walks).
  let ids = [];
  for (const k of shuffle([...cand.keys()])) if (geo.drawable([...ids, k])) ids.push(k);
  const connected = (set) => {
    const adj = Array.from({ length: n }, () => []);
    for (const k of set) { const [a, b] = cand[k]; adj[a].push(b); adj[b].push(a); }
    const seen = new Uint8Array(n); const st = [0]; seen[0] = 1; let c = 1;
    while (st.length) { const x = st.pop(); for (const y of adj[x]) if (!seen[y]) { seen[y] = 1; c++; st.push(y); } }
    return c === n;
  };
  for (const k of shuffle([...ids])) {
    if ((2 * ids.length) / n <= 2.8) break;
    const next = ids.filter((j) => j !== k);
    if (connected(next)) ids = next;
  }
  if (!connected(ids)) return null;

  // s and t: a pair at maximum graph distance.
  const adj = Array.from({ length: n }, () => []);
  for (const k of ids) { const [a, b] = cand[k]; adj[a].push(b); adj[b].push(a); }
  const bfs = (src) => { const d = new Array(n).fill(-1); d[src] = 0; const q = [src]; for (let h = 0; h < q.length; h++) for (const y of adj[q[h]]) if (d[y] < 0) { d[y] = d[q[h]] + 1; q.push(y); } return d; };
  let s = 0, t = 1, far = -1;
  for (let a = 0; a < n; a++) { const d = bfs(a); for (let b = 0; b < n; b++) if (d[b] > far || (d[b] === far && rand() < 0.3)) { far = d[b]; s = a; t = b; } }

  const names = new Array(n);
  names[s] = "s"; names[t] = "t";
  let label = 1;
  for (let v = 0; v < n; v++) if (v !== s && v !== t) names[v] = `v${label++}`;
  const toLevel = (states) => {
    const vertices = {};
    pts.forEach(([x, y], v) => {
      vertices[names[v]] = { x: Math.round(x), y: Math.round(y), label: names[v] === "s" || names[v] === "t" ? names[v] : names[v].slice(1), role: v === s ? "start" : v === t ? "goal" : null };
    });
    return { name: `Level ${i}`, vertices, edges: ids.map((k, j) => [names[cand[k][0]], names[cand[k][1]], states[j]]), start: "s", goal: "t" };
  };
  const needRevisit = i >= 3;
  const score = (states) => {
    const lv = toLevel(states);
    const G = E.compile({ ...lv, mode: "goal" });
    const r = E.analyze(G, { mode: "goal", revisit: true }, CAP);
    if (!r.solvable || r.truncated) return null;
    const nr = E.analyze(G, { mode: "goal", revisit: false }, CAP);
    if (needRevisit && nr.solvable) return null;
    const safe = r.firstMoves.total ? r.firstMoves.safe / r.firstMoves.total : 1;
    const value = 2 * r.optimal + 20 * r.deadRatio + 6 * (1 - safe) - 2 * Math.log2(Math.max(1, r.optCount));
    return { value, r, lv, needsRevisit: !nr.solvable };
  };

  let cur = null, curSc = null;
  for (let tries = 0; tries < 4000 && !curSc; tries++) {
    cur = ids.map(() => (rand() < 0.45 ? E.ON : E.OFF));
    curSc = score(cur);
  }
  if (!curSc) return null;
  let best = { states: cur, sc: curSc };
  for (let it = 0; it < 250; it++) {
    const next = [...cur];
    const k = Math.floor(rand() * next.length);
    next[k] ^= 1;
    const s2 = score(next);
    if (!s2) continue;
    if (s2.value >= curSc.value || rand() < 0.03) { cur = next; curSc = s2; }
    if (curSc.value > best.sc.value) best = { states: [...cur], sc: curSc };
  }
  const r = best.sc.r;
  return {
    level: { ...best.sc.lv, _optimal: r.optimal },
    stats: { n, edges: ids.length, optimal: r.optimal, optCount: r.optCount, deadRatio: +r.deadRatio.toFixed(3), firstMoves: r.firstMoves, needsRevisit: best.sc.needsRevisit, score: +best.sc.value.toFixed(1) },
  };
}

function assemble() {
  const loaded = [];
  for (let i = 1; i <= LEVEL_COUNT; i++) loaded.push(JSON.parse(fs.readFileSync(path.join(OUT_DIR, `level-${i}.json`), "utf8")));
  const goal = loaded.sort((a, b) => a.stats.score - b.stats.score).map((x, k) => {
    console.log(`Level ${k + 1}: ${JSON.stringify(x.stats)}`);
    // Designed as revisit puzzles, so the lab opens them with revisits on.
    return { ...x.level, name: `Level ${k + 1}`, canRevisit: true };
  });
  const src = fs.readFileSync(PRESETS, "utf8");
  const all = src.match(/const PRESETS_ALL = (.*);\n/)[1];
  fs.writeFileSync(PRESETS,
    "const PRESETS_GOAL = " + JSON.stringify(goal) + ";\n\n" +
    "const PRESETS_ALL = " + all + ";\n\n" +
    "window.PRESETS_GOAL = PRESETS_GOAL;\nwindow.PRESETS_ALL = PRESETS_ALL;\n");
  console.log("wrote www/presets.js");
}

fs.mkdirSync(OUT_DIR, { recursive: true });
if (process.argv[2] === "assemble") assemble();
else {
  const from = Number(process.argv[2] || 1), to = Number(process.argv[3] || LEVEL_COUNT);
  for (let i = from; i <= to; i++) {
    let res = null;
    for (let attempt = 0; attempt < 30 && !res; attempt++) res = generate(i, i * 1000 + attempt);
    if (!res) { console.log(`Level ${i}: failed`); continue; }
    fs.writeFileSync(path.join(OUT_DIR, `level-${i}.json`), JSON.stringify(res));
    console.log(`Level ${i}: ${JSON.stringify(res.stats)}`);
  }
}
