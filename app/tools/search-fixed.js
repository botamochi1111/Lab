// Levels with FIXED (always walkable, never flipping) edges.
//
// Without revisits, a fixed edge adds nothing: VISIT_ALL is then a
// Hamiltonian path on the usable edges, and a fixed edge is simply usable
// (like an OFF edge away from the start, or an ON edge at the start). Fixed
// edges only change the game when revisits are allowed: coming back through a
// vertex flips its ordinary edges again, but a fixed edge stays put, so it
// works as a dependable corridor / branch point.
//
// So this searches VISIT_ALL levels WITH revisits on a tidy shape, requiring:
//   - solvable with revisits, but NOT without them (revisits are needed);
//   - the fixed edges are needed: turning them all into OFF edges, or all
//     into ON edges, makes the level unsolvable;
// and hill-climbs over edge states (OFF / ON / FIXED) for a long shortest
// solution, few solutions, many dead states, and few safe first moves.
//
// usage: node tools/search-fixed.js <shape> <iters> <seed> <out.json>
//   shape: hex7 | square8 | grid9 | penta10

const fs = require("fs");
const E = require("../lab/engine.js");
const { shapePoints } = require("./readable-core.js");

const SHAPES = {
  hex7: { shape: "rings", counts: [1, 6], radii: [0, 170], maxLen: 200 },
  square8: { shape: "rings", counts: [4, 4], radii: [100, 230], rotations: [45, 45], maxLen: 200 },
  grid9: { shape: "square", cols: 3, rows: 3, maxLen: 200 },
  penta10: { shape: "rings", counts: [5, 5], radii: [110, 250], maxLen: 300 },
};

const [shapeName, itersArg, seedArg] = process.argv.slice(2, 5);
const outPath = process.argv[5];
const spec = SHAPES[shapeName];
const iters = Number(itersArg || 400);
let seed = (Number(seedArg) || 1) * 2654435761 >>> 0;
const rand = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pts = shapePoints(spec);
const n = pts.length;
const ids = pts.map((_, i) => `v${i}`);
const pairs = [];
for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
  if (Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]) <= spec.maxLen) pairs.push([a, b]);
}

function toLevel(states, start) {
  const vertices = {};
  pts.forEach(([x, y], i) => (vertices[ids[i]] = { x: Math.round(x), y: Math.round(y) }));
  return { vertices, edges: pairs.map(([a, b], k) => [ids[a], ids[b], states[k]]), start: ids[start], goal: null, mode: "all", canRevisit: true };
}

const CAP = 300000;
const analyze = (lv, revisit) => E.analyze(E.compile(lv), { mode: "all", revisit }, CAP);

function score(states, start) {
  const fixed = states.filter((w) => w === E.FIXED).length;
  if (fixed === 0 || fixed > Math.ceil(pairs.length * 0.3)) return null;
  const lv = toLevel(states, start);
  const r = analyze(lv, true);
  if (!r.solvable || r.truncated) return null;
  if (analyze(lv, false).solvable) return null;
  for (const replace of [E.OFF, E.ON]) {
    const alt = toLevel(states.map((w) => (w === E.FIXED ? replace : w)), start);
    if (analyze(alt, true).solvable) return null;
  }
  const safe = r.firstMoves.total ? r.firstMoves.safe / r.firstMoves.total : 1;
  const value = 2 * r.optimal + 20 * r.deadRatio + 6 * (1 - safe) - 2 * Math.log2(Math.max(1, r.optCount));
  return { value, r, lv };
}

let best = null;
for (let restart = 0; restart < 30; restart++) {
  const start = Math.floor(rand() * n);
  let cur = pairs.map(() => (rand() < 0.2 ? E.FIXED : rand() < 0.4 ? E.ON : E.OFF));
  let curSc = score(cur, start);
  for (let t = 0; !curSc && t < 3000; t++) {
    cur = pairs.map(() => (rand() < 0.2 ? E.FIXED : rand() < 0.4 ? E.ON : E.OFF));
    curSc = score(cur, start);
  }
  if (!curSc) continue;
  let local = { states: cur, sc: curSc };
  for (let it = 0; it < iters; it++) {
    const next = [...cur];
    const k = Math.floor(rand() * pairs.length);
    next[k] = (next[k] + 1 + Math.floor(rand() * 2)) % 3;
    const s2 = score(next, start);
    if (!s2) continue;
    if (s2.value >= curSc.value || rand() < 0.03) { cur = next; curSc = s2; }
    if (curSc.value > local.sc.value) local = { states: [...cur], sc: curSc };
  }
  if (!best || local.sc.value > best.sc.value) best = local;
  if (restart >= 3) break;
}
if (!best) { console.log("no level found"); process.exit(1); }
const r = best.sc.r;
const counts = [0, 0, 0];
best.states.forEach((w) => counts[w]++);
console.log(JSON.stringify({
  shape: shapeName, n, edges: pairs.length, off: counts[0], on: counts[1], fixed: counts[2],
  optimal: r.optimal, optCount: r.optCount, deadRatio: +r.deadRatio.toFixed(3),
  firstMoves: r.firstMoves, reachable: r.reachable, score: +best.sc.value.toFixed(1),
}));
if (outPath) fs.writeFileSync(outPath, JSON.stringify(best.sc.lv));
