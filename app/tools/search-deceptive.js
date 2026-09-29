// Search for small VISIT_ALL levels (no revisits) that are hard for HUMANS:
// many moves that look fine by at-a-glance checks (nothing stranded, nothing
// cut off, at most one forced dead end) but can no longer be completed, and
// that keep looking fine for many moves after the mistake.
//
// Level form: start's edges ON, every other edge OFF. Vertices sit on a
// fixed jittered grid and only short, non-crossing edges are allowed, so the
// drawing stays planar and readable.
//
// Constraints: exactly one solution; Warnsdorff's rule (always go to the
// neighbor with the fewest onward options) must NOT solve it.
// Objective: sum of plausible-trap depths + 2 * ambiguous steps.
//
// usage: node search-deceptive.js <cols> <rows> <iterations> <seed> <out.json> [maxCrossings] [maxEdgeLength]

const fs = require("fs");
const E = require("../lab/engine.js");

const [cols, rows, iters, seedArg] = process.argv.slice(2, 6).map(Number);
const outPath = process.argv[6];
const MAX_CROSS = Number(process.argv[7] || 0);
const MAX_LEN = Number(process.argv[8] || 260);
let seed = seedArg || 1;
const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);

const pts = [];
for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
  pts.push([100 + x * 160 + (y % 2) * 80 + (rand() - 0.5) * 40, 100 + y * 140 + (rand() - 0.5) * 40]);
}
const n = pts.length;
const ids = pts.map((_, i) => `v${i}`);

function segCross(a, b, c, d) {
  if (a === c || a === d || b === c || b === d) return false;
  const o = (p, q, r) => Math.sign((pts[q][0] - pts[p][0]) * (pts[r][1] - pts[p][1]) - (pts[q][1] - pts[p][1]) * (pts[r][0] - pts[p][0]));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}

const cand = [];
for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
  const [ax, ay] = pts[a], [bx, by] = pts[b];
  if (Math.hypot(ax - bx, ay - by) > MAX_LEN) continue;
  let blocked = false;
  for (let c = 0; c < n && !blocked; c++) {
    if (c === a || c === b) continue;
    const [cx, cy] = pts[c];
    const t = ((cx - ax) * (bx - ax) + (cy - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2);
    if (t > 0 && t < 1 && Math.hypot(ax + t * (bx - ax) - cx, ay + t * (by - ay) - cy) < 45) blocked = true;
  }
  if (!blocked) cand.push([a, b]);
}

const crossingsOf = (set) => {
  const arr = [...set];
  let c = 0;
  for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
    if (segCross(cand[arr[i]][0], cand[arr[i]][1], cand[arr[j]][0], cand[arr[j]][1])) c++;
  }
  return c;
};
// Adding edge k must keep the total number of crossings within MAX_CROSS.
const crossesAny = (k, set) => {
  let added = 0;
  for (const j of set) if (segCross(cand[k][0], cand[k][1], cand[j][0], cand[j][1])) added++;
  return added > 0 && crossingsOf(set) + added > MAX_CROSS;
};

function toLevel(set, start) {
  const vertices = {};
  pts.forEach(([x, y], i) => (vertices[ids[i]] = { x: Math.round(x), y: Math.round(y) }));
  const edges = [...set].map((k) => {
    const [a, b] = cand[k];
    return [ids[a], ids[b], a === start || b === start ? 1 : 0];
  });
  return { vertices, edges, start: ids[start], goal: null, mode: "all", canRevisit: false };
}

// No low-degree giveaways: a degree-1 vertex is obviously the last stop, and
// a unique solution forces the last stop to have odd degree (Thomason's
// lollipop argument), so require degree >= 3 everywhere except the start.
const MIN_DEG = 3;
function degrees(set) {
  const d = new Int32Array(n);
  for (const k of set) { d[cand[k][0]]++; d[cand[k][1]]++; }
  return d;
}
function degreeOk(set, start) {
  const d = degrees(set);
  for (let v = 0; v < n; v++) if (d[v] < (v === start ? 2 : MIN_DEG)) return false;
  return true;
}

function score(set, start) {
  if (!degreeOk(set, start)) return null;
  const lv = toLevel(set, start);
  const r = E.analyze(E.compile(lv), { mode: "all", revisit: false }, 200000);
  if (!r.solvable || r.solutionCount !== 1 || !r.human || r.human.greedySolves) return null;
  const h = r.human;
  const depthSum = h.plausibleTraps.reduce((s, t) => s + t.depth, 0);
  const avgDeg = (2 * set.size) / n;
  return { value: depthSum + 2 * h.ambiguousSteps + 5 * (avgDeg - 3), r, lv, avgDeg };
}

// Start: random maximal planar edge set, then drop edges until unique.
let best = null;
for (let restart = 0; restart < 30 && !best; restart++) {
  const start = Math.floor(rand() * n);
  let cur = new Set();
  for (const k of [...cand.keys()].sort(() => rand() - 0.5)) if (!crossesAny(k, cur)) cur.add(k);
  let guard = 0;
  let sc = score(cur, start);
  while (!sc && guard++ < 600) {
    const arr = [...cur];
    const next = new Set(cur);
    next.delete(arr[Math.floor(rand() * arr.length)]);
    if (!degreeOk(next, start)) continue;
    const r = E.analyze(E.compile(toLevel(next, start)), { mode: "all", revisit: false }, 200000);
    if (r.solvable) { cur = next; sc = score(cur, start); }
  }
  if (!sc) continue;
  let curSc = sc;
  best = { set: new Set(cur), sc, start };
  for (let it = 0; it < iters; it++) {
    const next = new Set(cur);
    const k = Math.floor(rand() * cand.length);
    if (next.has(k)) next.delete(k);
    else { if (crossesAny(k, next)) continue; next.add(k); }
    const s2 = score(next, start);
    if (!s2) continue;
    if (s2.value >= curSc.value || rand() < 0.03) { cur = next; curSc = s2; }
    if (curSc.value > best.sc.value) best = { set: new Set(cur), sc: curSc, start };
  }
}

if (!best) { console.log("no level found"); process.exit(1); }
const h = best.sc.r.human;
const degs = degrees(best.set);
console.log(JSON.stringify({
  n, score: Math.round(best.sc.value), avgDeg: best.sc.avgDeg.toFixed(2), minDeg: Math.min(...degs), crossings: crossingsOf(best.set), walks: best.sc.r.walkCount,
  plausibleTraps: h.plausibleTraps.length, maxDepth: Math.max(0, ...h.plausibleTraps.map((t) => t.depth)),
  ambiguous: h.ambiguousSteps, steps: best.sc.r.path.length, deceptive: h.deceptiveStates,
}));
if (outPath) fs.writeFileSync(outPath, JSON.stringify(best.sc.lv));
