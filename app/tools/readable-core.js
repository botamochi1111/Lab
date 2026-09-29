// Core of the "small hard" VISIT_ALL (no revisits) level maker, shared by
// search-readable.js (one-off search) and gen-ramp-presets.js (game stages).
//
// Geometry first so drawings stay readable: vertices are spread out with a
// minimum spacing, only short edges that don't graze another vertex are
// candidates, and the whole edge set (real + decoy) keeps a small crossing
// budget with every crossing at a wide angle.
//
// Inside that geometry: pick an intended solution path (crossing-free), add
// chords that keep the solution unique, hill-climb for human difficulty, then
// hide the leaf end (a unique solution forces it) with decoy edges: ON edges
// that never touch the start, which the flip rule makes permanently unusable.
//
// Level form: start's edges ON, every other real edge OFF.

const E = require("../lab/engine.js");

function makeRng(seedArg) {
  let seed = (seedArg || 1) * 2654435761 >>> 0;
  return () => { // mulberry32
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Human-difficulty score used for both the hill-climb and stage ordering
// (shared with the lab so its numbers match).
const difficultyOf = E.difficultyFrom;

// Points: "grid" = offset (triangular) grid, cols x rows, jitter 0 = exact
// lattice; "scatter" = n points
// spread with a minimum spacing (looks less mechanical).
function makePoints(opts, rand) {
  const pts = [];
  if (opts.points === "shape") return shapePoints(opts);
  if (opts.points === "grid") {
    const jitter = opts.jitter ?? 50;
    for (let y = 0; y < opts.rows; y++) for (let x = 0; x < opts.cols; x++) {
      pts.push([100 + x * 170 + (y % 2) * 85 + (rand() - 0.5) * jitter, 100 + y * 150 + (rand() - 0.5) * jitter]);
    }
    return pts;
  }
  const n = opts.n;
  const spacing = 165;
  const cols = Math.ceil(Math.sqrt(n * 1.4));
  const W = Math.max(2, cols) * spacing * 1.05, H = Math.max(1, Math.ceil(n / cols)) * spacing * 1.1;
  for (let guard = 0; pts.length < n && guard < 200; guard++) {
    pts.length = 0;
    for (let tries = 0; pts.length < n && tries < 4000; tries++) {
      const p = [100 + rand() * W, 100 + rand() * H];
      if (pts.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) >= spacing * (guard < 100 ? 0.95 : 0.8))) pts.push(p);
    }
  }
  return pts;
}

// Tidy fixed shapes for early stages (pair with a maxLen that only admits
// neighbor edges):
//   triangle: rows 1..k of a triangular lattice
//   square:   cols x rows square grid
//   rings:    concentric polygons (counts, radii, rotation in degrees)
function shapePoints(opts) {
  const pts = [];
  if (opts.shape === "triangle") {
    for (let r = 0; r < opts.rows; r++) for (let i = 0; i <= r; i++) pts.push([400 + (i - r / 2) * 170, 100 + r * 150]);
  } else if (opts.shape === "square") {
    for (let y = 0; y < opts.rows; y++) for (let x = 0; x < opts.cols; x++) pts.push([100 + x * 170, 100 + y * 170]);
  } else if (opts.shape === "rings") {
    opts.counts.forEach((count, k) => {
      for (let i = 0; i < count; i++) {
        const a = ((i / count) * 360 + (opts.rotations?.[k] ?? 0) - 90) * Math.PI / 180;
        pts.push([400 + opts.radii[k] * Math.cos(a), 400 + opts.radii[k] * Math.sin(a)]);
      }
    });
  } else throw new Error(`unknown shape ${opts.shape}`);
  return pts;
}

// Points plus the edges that may be drawn between them: short, not grazing
// another vertex; `cross[i][j]` is 0 (compatible), 1 (wide-angle crossing,
// costs budget) or 2 (shallow crossing, forbidden); `drawable(ids)` checks an
// edge set against the crossing budget.
function buildGeometry(opts, rand) {
  const MAX_CROSS = opts.maxCross ?? 3;
  const MIN_CROSS_ANGLE = 50;
  const MAX_LEN = opts.maxLen ?? 320;
  const VERTEX_CLEARANCE = 38;
  const pts = makePoints(opts, rand);
  const n = pts.length;

  const orient = (p, q, r) => Math.sign((pts[q][0] - pts[p][0]) * (pts[r][1] - pts[p][1]) - (pts[q][1] - pts[p][1]) * (pts[r][0] - pts[p][0]));
  const cand = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    if (Math.hypot(ax - bx, ay - by) > MAX_LEN) continue;
    let grazes = false;
    for (let c = 0; c < n && !grazes; c++) {
      if (c === a || c === b) continue;
      const t = ((pts[c][0] - ax) * (bx - ax) + (pts[c][1] - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2);
      if (t > 0 && t < 1 && Math.hypot(ax + t * (bx - ax) - pts[c][0], ay + t * (by - ay) - pts[c][1]) < VERTEX_CLEARANCE) grazes = true;
    }
    if (!grazes) cand.push([a, b]);
  }
  const C = cand.length;

  // cross[i][j]: 0 = compatible, 1 = wide-angle crossing (costs budget), 2 = forbidden (shallow)
  const cross = Array.from({ length: C }, () => new Uint8Array(C));
  for (let i = 0; i < C; i++) for (let j = i + 1; j < C; j++) {
    const [a, b] = cand[i], [c, d] = cand[j];
    if (a === c || a === d || b === c || b === d) continue;
    if (orient(a, b, c) === orient(a, b, d) || orient(c, d, a) === orient(c, d, b)) continue;
    const u = [pts[b][0] - pts[a][0], pts[b][1] - pts[a][1]], v = [pts[d][0] - pts[c][0], pts[d][1] - pts[c][1]];
    const cos = Math.abs(u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v));
    cross[i][j] = cross[j][i] = Math.acos(Math.min(1, cos)) * 180 / Math.PI >= MIN_CROSS_ANGLE ? 1 : 2;
  }
  function crossingCount(ids) {
    let c = 0;
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const x = cross[ids[i]][ids[j]];
      if (x === 2) return Infinity;
      c += x;
    }
    return c;
  }
  const drawable = (ids) => crossingCount(ids) <= MAX_CROSS;
  return { pts, n, cand, cross, crossingCount, drawable };
}

function makeReadableLevel(opts) {
  const rand = makeRng(opts.seed);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const iters = opts.iters ?? 300;

  const { pts, n, cand, cross, crossingCount, drawable } = buildGeometry(opts, rand);
  const C = cand.length;

  // ---- combinatorics ----
  function hamCount(ids, start, limit = 2) {
    const adj = Array.from({ length: n }, () => []);
    for (const k of ids) { const [a, b] = cand[k]; adj[a].push(b); adj[b].push(a); }
    let count = 0;
    const seen = new Uint8Array(n);
    seen[start] = 1;
    const dfs = (x, d) => {
      if (count >= limit) return;
      if (d === n) { count++; return; }
      for (const y of adj[x]) if (!seen[y]) { seen[y] = 1; dfs(y, d + 1); seen[y] = 0; }
    };
    dfs(start, 1);
    return count;
  }
  function degrees(ids) {
    const d = new Int32Array(n);
    for (const k of ids) { d[cand[k][0]]++; d[cand[k][1]]++; }
    return d;
  }
  // Real graph: start >= 2, end is a leaf (forced), interior >= 2 with at most two of degree 2.
  function degreeOk(ids, start, end) {
    const d = degrees(ids);
    let twos = 0;
    for (let v = 0; v < n; v++) {
      if (v === start) { if (d[v] < 2) return false; continue; }
      if (v === end) continue;
      if (d[v] < 2) return false;
      if (d[v] === 2) twos++;
    }
    return twos <= 2;
  }

  function toLevel(ids, start, decoys = [], names = null) {
    const nm = names || [...Array(n).keys()].map((i) => `v${i}`);
    const vertices = {};
    pts.forEach(([x, y], i) => (vertices[nm[i]] = { x: Math.round(x), y: Math.round(y) }));
    const edges = ids.map((k) => { const [a, b] = cand[k]; return [nm[a], nm[b], a === start || b === start ? 1 : 0]; });
    for (const k of decoys) edges.push([nm[cand[k][0]], nm[cand[k][1]], 1]);
    return { vertices, edges, start: nm[start], goal: null, mode: "all", canRevisit: false };
  }

  function score(ids, start, end) {
    if (!drawable(ids) || !degreeOk(ids, start, end) || hamCount(ids, start) !== 1) return null;
    const r = E.analyze(E.compile(toLevel(ids, start)), { mode: "all", revisit: false }, 300000);
    if (!r.human || r.solutionCount !== 1 || (r.human.greedySolves && !opts.allowGreedy)) return null;
    const avgDeg = (2 * ids.length) / n;
    return { value: difficultyOf(r, n, avgDeg), r, avgDeg };
  }

  // A crossing-free Hamiltonian path through the candidate graph.
  function randomPath() {
    const adj = Array.from({ length: n }, () => []);
    cand.forEach(([a, b], k) => { adj[a].push([b, k]); adj[b].push([a, k]); });
    const start = Math.floor(rand() * n);
    const seen = new Uint8Array(n);
    const used = [];
    let steps = 0;
    const dfs = (x, d) => {
      if (d === n) return true;
      if (++steps > 20000) return false;
      for (const [y, k] of shuffle([...adj[x]])) {
        if (seen[y] || used.some((j) => cross[j][k])) continue;
        seen[y] = 1; used.push(k);
        if (dfs(y, d + 1)) return true;
        seen[y] = 0; used.pop();
      }
      return false;
    };
    seen[start] = 1;
    if (!dfs(start, 1)) return null;
    const order = [start];
    for (const k of used) { const [a, b] = cand[k]; order.push(order[order.length - 1] === a ? b : a); }
    return { start, end: order[n - 1], pathIds: used };
  }

  let best = null;
  const restarts = opts.restarts ?? 40;
  for (let restart = 0; restart < restarts; restart++) {
    const P = randomPath();
    if (!P) continue;
    const { start, end, pathIds } = P;
    const pathSet = new Set(pathIds);
    // Reserve two decoys at the leaf end BEFORE adding chords, so chords can't
    // wall the end in and leave no room to disguise it.
    const endDecoys = [];
    for (const k of shuffle([...cand.keys()])) {
      const [a, b] = cand[k];
      if (endDecoys.length < 2 && (a === end || b === end) && a !== start && b !== start && !pathSet.has(k) && drawable([...pathIds, ...endDecoys, k])) endDecoys.push(k);
    }
    if (endDecoys.length < (opts.minEndDecoys ?? 2)) continue;
    const reserved = new Set(endDecoys);
    const chords = [...cand.keys()].filter((k) => !pathSet.has(k) && !reserved.has(k) && cand[k][0] !== end && cand[k][1] !== end);
    const drawableWithEnd = (ids) => drawable([...ids, ...endDecoys]);
    if (!chords.length) continue;
    // Maximal set of chords keeping the solution unique and the drawing clean.
    let cur = [...pathIds];
    for (const k of shuffle([...chords])) {
      const next = [...cur, k];
      if (drawableWithEnd(next) && hamCount(next, start) === 1) cur = next;
    }
    let curSc = score(cur, start, end);
    for (let t = 0; !curSc && t < 400; t++) {
      const k = chords[Math.floor(rand() * chords.length)];
      const next = cur.includes(k) ? cur.filter((j) => j !== k) : [...cur, k];
      if (drawableWithEnd(next) && hamCount(next, start) === 1) { cur = next; curSc = score(cur, start, end); }
    }
    if (!curSc) continue;
    let localBest = { ids: [...cur], sc: curSc };
    for (let it = 0; it < iters; it++) {
      const k = chords[Math.floor(rand() * chords.length)];
      const next = cur.includes(k) ? cur.filter((j) => j !== k) : [...cur, k];
      if (!drawableWithEnd(next)) continue;
      const s2 = score(next, start, end);
      if (!s2) continue;
      if (s2.value >= curSc.value || rand() < 0.03) { cur = next; curSc = s2; }
      if (curSc.value > localBest.sc.value) localBest = { ids: [...cur], sc: curSc };
    }
    if (!best || localBest.sc.value > best.sc.value) best = { ...localBest, start, end, endDecoys };
    if (restart >= (opts.minRestarts ?? 8) && best) break;
  }
  if (!best) return null;

  // Decoys: make every non-start vertex LOOK like degree >= 3, within the same drawing rules.
  const { start, end } = best;
  const decoys = [...best.endDecoys];
  const visDeg = () => degrees([...best.ids, ...decoys]);
  const usedIds = () => new Set([...best.ids, ...decoys]);
  const decoyOptions = (v) => shuffle([...cand.keys()].filter((k) => {
    const [a, b] = cand[k];
    return (a === v || b === v) && a !== start && b !== start && !usedIds().has(k) && drawable([...best.ids, ...decoys, k]);
  }));
  for (let guard = 0; guard < 50; guard++) {
    const d = visDeg();
    const low = [...Array(n).keys()].filter((v) => v !== start && d[v] < 3).sort((a, b) => (a === end ? -1 : b === end ? 1 : 0));
    if (!low.length) break;
    const o = decoyOptions(low[0]);
    if (!o.length) break;
    decoys.push(o[0]);
  }
  for (let extra = 0; extra < (opts.extraDecoys ?? 2); extra++) {
    const v = [...Array(n).keys()].filter((x) => x !== start && x !== end)[Math.floor(rand() * (n - 2))];
    const o = decoyOptions(v);
    if (o.length) decoys.push(o[0]);
  }

  const names = shuffle([...Array(n).keys()].map((i) => `v${i}`));
  const level = toLevel(best.ids, start, decoys, names);
  const check = E.analyze(E.compile(level), { mode: "all", revisit: false });
  if (check.solutionCount !== 1) return null;
  const h = best.sc.r.human;
  const vd = visDeg();
  const stats = {
    n, realEdges: best.ids.length, decoys: decoys.length, crossings: crossingCount([...best.ids, ...decoys]),
    realAvgDeg: +best.sc.avgDeg.toFixed(2), endVisibleDeg: vd[end], minVisibleDegNonStart: Math.min(...[...vd].filter((_, v) => v !== start)),
    walks: best.sc.r.walkCount, plausibleTraps: h.plausibleTraps.length,
    maxDepth: Math.max(0, ...h.plausibleTraps.map((t) => t.depth)), ambiguous: h.ambiguousSteps, steps: n - 1,
    greedySolves: h.greedySolves, difficulty: +best.sc.value.toFixed(1),
  };
  return { level, stats };
}

module.exports = { makeReadableLevel, difficultyOf, shapePoints, buildGeometry, makeRng };
