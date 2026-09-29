// Bonus stage from a game stage: the SAME drawing (every vertex position and
// every edge), but a new start and a new ON/OFF assignment that makes it a
// harder unique-solution VISIT_ALL (no revisits) puzzle.
//
// Why this works: with no revisits, the only usable edges are the start's ON
// edges (first move) and every OFF edge not touching the start. So for any
// start s and any "real" edge set R:
//   s-edge in R -> ON,  s-edge not in R -> OFF   (never usable)
//   other in R  -> OFF, other not in R  -> ON    (lit decoy, never usable)
// and the puzzle is exactly "Hamiltonian path from s in R". The drawing never
// changes; only which edges are live does.

const E = require("../lab/engine.js");
const { difficultyOf } = require("./readable-core.js");

function makeRng(seedArg) {
  let seed = (seedArg || 1) * 2654435761 >>> 0;
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function scoreLevel(level) {
  const r = E.analyze(E.compile({ ...level, mode: "all" }), { mode: "all", revisit: false }, 300000);
  if (!r.human || r.solutionCount !== 1) return null;
  const n = Object.keys(level.vertices).length;
  const realEdges = level.edges.filter(([u, v, w]) => (u === level.start || v === level.start ? w === 1 : w === 0)).length;
  return { value: difficultyOf(r, n, (2 * realEdges) / n), r };
}

function makeBonus(level, { seed = 1, iters = 300, starts = 6 } = {}) {
  const rand = makeRng(seed);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const ids = Object.keys(level.vertices);
  const n = ids.length;
  const idx = new Map(ids.map((id, i) => [id, i]));
  const pairs = level.edges.map(([u, v]) => [idx.get(u), idx.get(v)]);
  const m = pairs.length;

  function hamCount(R, s, limit = 2) {
    const adj = Array.from({ length: n }, () => []);
    R.forEach((on, k) => { if (on) { const [a, b] = pairs[k]; adj[a].push(b); adj[b].push(a); } });
    let count = 0;
    const seen = new Uint8Array(n);
    seen[s] = 1;
    const dfs = (x, d) => {
      if (count >= limit) return;
      if (d === n) { count++; return; }
      for (const y of adj[x]) if (!seen[y]) { seen[y] = 1; dfs(y, d + 1); seen[y] = 0; }
    };
    dfs(s, 1);
    return count;
  }

  function toLevel(R, s) {
    const vertices = {};
    for (const [id, p] of Object.entries(level.vertices)) vertices[id] = { ...p, role: idx.get(id) === s ? "start" : null };
    const edges = pairs.map(([a, b], k) => {
      const atStart = a === s || b === s;
      return [ids[a], ids[b], atStart ? (R[k] ? 1 : 0) : (R[k] ? 0 : 1)];
    });
    return { ...level, vertices, edges, start: ids[s], name: `${level.name} [HARD REMIX]` };
  }

  function score(R, s) {
    if (hamCount(R, s) !== 1) return null;
    const lv = toLevel(R, s);
    const sc = scoreLevel(lv);
    if (!sc || sc.r.human.greedySolves) return null;
    return { ...sc, lv };
  }

  const base = scoreLevel(level);
  const baseValue = base ? base.value : 0;
  let best = null;

  const startOrder = shuffle([...Array(n).keys()]);
  const origStart = idx.get(level.start);
  const tryStarts = [...new Set([origStart, ...startOrder])].slice(0, starts);
  for (const s of tryStarts) {
    // Thin the full drawing down to a unique Hamiltonian path from s.
    const R = new Array(m).fill(true);
    if (hamCount(R, s, 1) === 0) continue;
    for (const k of shuffle([...Array(m).keys()])) {
      if (hamCount(R, s) === 1) break;
      R[k] = false;
      if (hamCount(R, s, 1) === 0) R[k] = true;
    }
    let cur = R;
    let curSc = score(cur, s);
    for (let t = 0; !curSc && t < 300; t++) {
      const next = [...cur];
      const k = Math.floor(rand() * m);
      next[k] = !next[k];
      if (hamCount(next, s) === 1) { cur = next; curSc = score(cur, s); }
    }
    if (!curSc) continue;
    let localBest = curSc;
    for (let it = 0; it < iters; it++) {
      const next = [...cur];
      const k = Math.floor(rand() * m);
      next[k] = !next[k];
      const s2 = score(next, s);
      if (!s2) continue;
      if (s2.value >= curSc.value || rand() < 0.03) { cur = next; curSc = s2; }
      if (curSc.value > localBest.value) localBest = curSc;
    }
    if (!best || localBest.value > best.value) best = localBest;
  }
  if (!best) return null;
  const h = best.r.human;
  const stats = {
    baseDifficulty: +baseValue.toFixed(1), difficulty: +best.value.toFixed(1),
    walks: best.r.walkCount, plausibleTraps: h.plausibleTraps.length,
    maxDepth: Math.max(0, ...h.plausibleTraps.map((t) => t.depth)), ambiguous: h.ambiguousSteps,
    litDecoys: best.lv.edges.filter(([u, v, w]) => w === 1 && u !== best.lv.start && v !== best.lv.start).length, edges: m,
  };
  return { level: best.lv, stats };
}

module.exports = { makeBonus };
