// Build small VISIT_ALL levels (no revisits) that are dense (every vertex
// except the start has degree >= 3, so no vertex gives away the last stop)
// yet have exactly ONE solution, and that are hard for humans.
//
// Method: fix the intended solution path first, then add chords one at a
// time, keeping only chords that preserve "exactly one Hamiltonian path from
// the start". Then hill-climb over chords (never touching the solution
// path) to maximize human difficulty. Layout is done afterwards with a
// spring embedding that ignores which edges form the solution, and vertex
// names are shuffled, so neither the picture nor the labels reveal the path.
//
// Level form: start's edges ON, every other edge OFF.
//
// usage: node search-dense.js <n> <iterations> <seed> <out.json>

const fs = require("fs");
const E = require("../lab/engine.js");

const [n, iters, seedArg] = process.argv.slice(2, 5).map(Number);
const outPath = process.argv[5];
let seed = seedArg || 1;
const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const S = 0; // the solution path is 0-1-2-...-(n-1)
const key = (a, b) => (a < b ? a * n + b : b * n + a);
const pathEdges = [];
for (let i = 0; i + 1 < n; i++) pathEdges.push([i, i + 1]);
const chords = [];
for (let a = 0; a < n; a++) for (let b = a + 2; b < n; b++) chords.push([a, b]);

function hamCount(chordSet, limit = 2) {
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of pathEdges) { adj[a].push(b); adj[b].push(a); }
  for (const k of chordSet) { const [a, b] = chords[k]; adj[a].push(b); adj[b].push(a); }
  let count = 0;
  const seen = new Uint8Array(n);
  seen[S] = 1;
  const dfs = (x, d) => {
    if (count >= limit) return;
    if (d === n) { count++; return; }
    for (const y of adj[x]) if (!seen[y]) { seen[y] = 1; dfs(y, d + 1); seen[y] = 0; }
  };
  dfs(S, 1);
  return count;
}

function degrees(chordSet) {
  const d = new Int32Array(n);
  for (const [a, b] of pathEdges) { d[a]++; d[b]++; }
  for (const k of chordSet) { d[chords[k][0]]++; d[chords[k][1]]++; }
  return d;
}
// With a unique solution the last vertex MUST be a leaf of the real graph:
// any extra edge from it to some v_i lets you "rotate" the path
// (s..v_i, last, v_{n-2}..v_{i+1}) into a second solution. So the last
// vertex is allowed degree 1 here and gets disguised with decoy edges later.
const END = n - 1;
// In practice one more interior vertex always ends up with degree 2 when the
// solution is unique (observed for n = 8..14; not proven), so allow one.
// Low-degree vertices are disguised with decoys anyway.
const minDeg = (v) => (v === S ? 2 : v === END ? 1 : 3);
const degreeOk = (set) => {
  const d = degrees(set);
  let twos = 0;
  for (let v = 0; v < n; v++) {
    if (v === S || v === END) { if (d[v] < minDeg(v)) return false; continue; }
    if (d[v] < 2) return false;
    if (d[v] === 2) twos++;
  }
  return twos <= 1;
};

// Real edges: start's ON, others OFF. Decoys: ON and never touching the
// start, which makes them permanently unusable without revisits.
function toLevel(set, coords, names, decoys = []) {
  const vertices = {};
  for (let v = 0; v < n; v++) vertices[names[v]] = { x: coords ? Math.round(coords[v][0]) : v * 10, y: coords ? Math.round(coords[v][1]) : 0 };
  const edges = [...pathEdges, ...[...set].map((k) => chords[k])].map(([a, b]) => [names[a], names[b], a === S || b === S ? 1 : 0]);
  for (const [a, b] of decoys) edges.push([names[a], names[b], 1]);
  return { vertices, edges, start: names[S], goal: null, mode: "all", canRevisit: false };
}

const plainNames = [...Array(n).keys()].map((i) => `v${i}`);
function score(set) {
  if (!degreeOk(set) || hamCount(set) !== 1) return null;
  const r = E.analyze(E.compile(toLevel(set, null, plainNames)), { mode: "all", revisit: false }, 300000);
  if (!r.human || r.solutionCount !== 1 || r.human.greedySolves) return null;
  const h = r.human;
  const depthSum = h.plausibleTraps.reduce((s, t) => s + t.depth, 0);
  const avgDeg = (2 * (n - 1 + set.size)) / n;
  return { value: depthSum + 2 * h.ambiguousSteps + 5 * (avgDeg - 3), r, avgDeg };
}

// 1) Add every chord that keeps the solution unique (a maximal dense set);
// retry with other orders until the degree condition holds.
let cur = null;
for (let restart = 0; restart < 60 && !cur; restart++) {
  const set = new Set();
  for (const k of shuffle([...chords.keys()])) {
    set.add(k);
    if (hamCount(set) !== 1) set.delete(k);
  }
  if (degreeOk(set)) cur = set;
}
if (!cur) { console.log("could not reach the degree condition"); process.exit(1); }

// 2) Hill-climb over chords for human difficulty.
let curSc = score(cur);
for (let tries = 0; !curSc && tries < 2000; tries++) {
  const next = new Set(cur);
  const k = Math.floor(rand() * chords.length);
  if (next.has(k)) next.delete(k); else next.add(k);
  if (degreeOk(next) && hamCount(next) === 1) { cur = next; curSc = score(cur); }
}
if (!curSc) { console.log("no scored start (greedy keeps solving)"); process.exit(1); }
let best = { set: new Set(cur), sc: curSc };
for (let it = 0; it < iters; it++) {
  const next = new Set(cur);
  const k = Math.floor(rand() * chords.length);
  if (next.has(k)) next.delete(k); else next.add(k);
  const s2 = score(next);
  if (!s2) continue;
  if (s2.value >= curSc.value || rand() < 0.03) { cur = next; curSc = s2; }
  if (curSc.value > best.sc.value) best = { set: new Set(cur), sc: curSc };
}

// 3) Decoys: every vertex (the leaf end in particular) should LOOK like it
// has degree >= 3. Decoys never touch the start and never duplicate a real
// edge. Two extra decoys elsewhere so the end isn't the only one with them.
const realEdges = [...pathEdges, ...[...best.set].map((k) => chords[k])];
const hasEdge = (a, b, list) => list.some(([x, y]) => key(x, y) === key(a, b));
const decoys = [];
const visDeg = () => {
  const d = new Int32Array(n);
  for (const [a, b] of [...realEdges, ...decoys]) { d[a]++; d[b]++; }
  return d;
};
for (let guard = 0; guard < 200; guard++) {
  const d = visDeg();
  const low = [...Array(n).keys()].filter((v) => v !== S && d[v] < 3);
  if (!low.length) break;
  const a = low[0];
  const options = shuffle([...Array(n).keys()].filter((b) => b !== a && b !== S && !hasEdge(a, b, realEdges) && !hasEdge(a, b, decoys)));
  if (!options.length) break;
  decoys.push([a, options[0]]);
}
for (let extra = 0; extra < 2; extra++) {
  const a = 1 + Math.floor(rand() * (n - 2));
  const options = shuffle([...Array(n).keys()].filter((b) => b !== a && b !== S && !hasEdge(a, b, realEdges) && !hasEdge(a, b, decoys)));
  if (options.length) decoys.push([a, options[0]]);
}

// 4) Spring layout (Fruchterman-Reingold) over real + decoy edges, blind to
// which edges form the solution.
const allEdges = [...realEdges, ...decoys];
let pos = [...Array(n)].map(() => [rand() * 800, rand() * 600]);
const W = 800, H = 600, kk = Math.sqrt((W * H) / n);
for (let step = 0, temp = 120; step < 600; step++, temp *= 0.992) {
  const disp = pos.map(() => [0, 0]);
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
    const dx = pos[a][0] - pos[b][0], dy = pos[a][1] - pos[b][1];
    const d = Math.max(1, Math.hypot(dx, dy)), f = (kk * kk) / d;
    disp[a][0] += (dx / d) * f; disp[a][1] += (dy / d) * f;
    disp[b][0] -= (dx / d) * f; disp[b][1] -= (dy / d) * f;
  }
  for (const [a, b] of allEdges) {
    const dx = pos[a][0] - pos[b][0], dy = pos[a][1] - pos[b][1];
    const d = Math.max(1, Math.hypot(dx, dy)), f = (d * d) / kk;
    disp[a][0] -= (dx / d) * f; disp[a][1] -= (dy / d) * f;
    disp[b][0] += (dx / d) * f; disp[b][1] += (dy / d) * f;
  }
  pos = pos.map(([x, y], i) => {
    const [dx, dy] = disp[i], d = Math.max(1, Math.hypot(dx, dy)), m = Math.min(d, temp);
    return [Math.min(W, Math.max(0, x + (dx / d) * m)), Math.min(H, Math.max(0, y + (dy / d) * m))];
  });
}
const coords = pos.map(([x, y]) => [100 + x, 100 + y]);

// Shuffled names so labels don't encode the solution order.
const names = shuffle([...Array(n).keys()].map((i) => `v${i}`));
const level = toLevel(best.set, coords, names, decoys);
const check = E.analyze(E.compile(level), { mode: "all", revisit: false });
if (check.solutionCount !== 1) { console.log("decoys changed the solution count?!", check.solutionCount); process.exit(1); }
const h = best.sc.r.human;
const vd = visDeg();
console.log(JSON.stringify({
  n, realEdges: realEdges.length, decoys: decoys.length, realAvgDeg: best.sc.avgDeg.toFixed(2), minVisibleDegNonStart: Math.min(...[...vd].filter((_, v) => v !== S)),
  walks: best.sc.r.walkCount, plausibleTraps: h.plausibleTraps.length,
  maxDepth: Math.max(0, ...h.plausibleTraps.map((t) => t.depth)), ambiguous: h.ambiguousSteps, steps: n - 1, deceptive: h.deceptiveStates,
}));
if (outPath) fs.writeFileSync(outPath, JSON.stringify(level));
