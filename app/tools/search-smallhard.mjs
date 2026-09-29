// Search for small VISIT_ALL levels (no revisits) that have MANY possible
// walks but exactly ONE that visits every vertex.
//
// Level form: start's edges ON, every other edge OFF (the Hamiltonian-path
// reduction form), so a walk is exactly a simple path from the start.
// Vertices sit on a fixed point set and only non-crossing, nearby edges are
// allowed, so the drawing stays planar and readable.
//
// Hill climbing over edge subsets: keep "exactly one Hamiltonian path from
// start", maximize the number of maximal walks (walks until stuck).
//
// usage: node search-smallhard.mjs <cols> <rows> <iterations> <seed>

import fs from "fs";

const [cols, rows, iters, seedArg] = process.argv.slice(2).map(Number);
let seed = seedArg || 1;
const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);

// Jittered grid point set.
const pts = [];
for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
  pts.push([100 + x * 160 + (y % 2) * 80 + (rand() - 0.5) * 40, 100 + y * 140 + (rand() - 0.5) * 40]);
}
const n = pts.length;
const dist = (a, b) => Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]);

function segCross(a, b, c, d) {
  if (a === c || a === d || b === c || b === d) return false;
  const o = (p, q, r) => Math.sign((pts[q][0] - pts[p][0]) * (pts[r][1] - pts[p][1]) - (pts[q][1] - pts[p][1]) * (pts[r][0] - pts[p][0]));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}

// Candidate edges: short enough, and not passing too close to another vertex.
const cand = [];
for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
  if (dist(a, b) > 260) continue;
  let blocked = false;
  for (let c = 0; c < n && !blocked; c++) {
    if (c === a || c === b) continue;
    const [ax, ay] = pts[a], [bx, by] = pts[b], [cx, cy] = pts[c];
    const t = ((cx - ax) * (bx - ax) + (cy - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2);
    if (t > 0 && t < 1 && Math.hypot(ax + t * (bx - ax) - cx, ay + t * (by - ay) - cy) < 45) blocked = true;
  }
  if (!blocked) cand.push([a, b]);
}

const S = 0;
const CAP = 3000000;

function evaluate(edgeSet) {
  const adj = Array.from({ length: n }, () => []);
  for (const k of edgeSet) { const [a, b] = cand[k]; adj[a].push(b); adj[b].push(a); }
  let walks = 0, ham = 0;
  const seen = new Uint8Array(n);
  seen[S] = 1;
  const dfs = (x, depth) => {
    if (walks > CAP) return;
    let ext = false;
    for (const y of adj[x]) if (!seen[y]) { ext = true; seen[y] = 1; dfs(y, depth + 1); seen[y] = 0; }
    if (!ext) { walks++; if (depth === n) ham++; }
  };
  dfs(S, 1);
  return { walks, ham };
}

function crossesAny(k, edgeSet) {
  const [a, b] = cand[k];
  for (const j of edgeSet) { const [c, d] = cand[j]; if (segCross(a, b, c, d)) return true; }
  return false;
}

// Start from a random planar spanning structure that has a Hamiltonian path.
let cur = new Set();
{
  const order = [...Array(cand.length).keys()].sort(() => rand() - 0.5);
  for (const k of order) if (!crossesAny(k, cur)) cur.add(k);
}
// Prune down until exactly one Hamiltonian path remains (or restart).
let ev = evaluate(cur);
let guard = 0;
while (ev.ham !== 1 && guard++ < 5000) {
  const arr = [...cur];
  const k = arr[Math.floor(rand() * arr.length)];
  const next = new Set(cur); next.delete(k);
  const e2 = evaluate(next);
  if (e2.ham >= 1) { cur = next; ev = e2; }
}
if (ev.ham !== 1) { console.log("no unique start found"); process.exit(1); }

let best = { set: new Set(cur), ev };
for (let it = 0; it < iters; it++) {
  const next = new Set(cur);
  const k = Math.floor(rand() * cand.length);
  if (next.has(k)) next.delete(k);
  else { if (crossesAny(k, next)) continue; next.add(k); }
  const e2 = evaluate(next);
  if (e2.ham !== 1) continue;
  // Accept improvements, and occasionally small setbacks to escape plateaus.
  if (e2.walks >= ev.walks || rand() < 0.02) { cur = next; ev = e2; }
  if (ev.walks > best.ev.walks) best = { set: new Set(cur), ev };
}

const ids = pts.map((_, i) => `v${i}`);
const vertices = {};
pts.forEach(([x, y], i) => (vertices[ids[i]] = { x: Math.round(x), y: Math.round(y) }));
const edges = [...best.set].map((k) => { const [a, b] = cand[k]; return [ids[a], ids[b], a === S || b === S ? 1 : 0]; });
const level = { name: `Many-walks ${cols}x${rows} #${seedArg}`, vertices, edges, start: ids[S], goal: null, mode: "all", canRevisit: false };
console.log(JSON.stringify({ n, edges: edges.length, walks: best.ev.walks, ham: best.ev.ham }));
fs.writeFileSync(`/tmp/mw-${cols}x${rows}-${seedArg}.json`, JSON.stringify(level));
