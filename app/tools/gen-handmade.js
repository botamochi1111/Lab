// Standalone search for small-but-hard Incident Flip Walk puzzles, reusing
// the same rules as the real game. Not part of the shipped artifact —
// its output is hand-picked and pasted into handmade-extra.js.

function edgeKey(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }

function bfs(lv, mode, noRevisit, maxStates) {
  const totalVertices = Object.keys(lv.vertices).length;
  const adj = {};
  Object.keys(lv.vertices).forEach((id) => (adj[id] = []));
  lv.edges.forEach(([u, v], idx) => { adj[u].push({ to: v, idx }); adj[v].push({ to: u, idx }); });
  const flipMasks = {};
  for (const id of Object.keys(lv.vertices)) {
    let m = 0n;
    lv.edges.forEach(([u, v], idx) => { if (u === id || v === id) m |= 1n << BigInt(idx); });
    flipMasks[id] = m;
  }
  const vIdx = new Map();
  Object.keys(lv.vertices).forEach((id, i) => vIdx.set(id, i));
  let startMask = 0n;
  lv.edges.forEach(([, , w], idx) => { if (w === 1) startMask |= 1n << BigInt(idx); });
  const startVisited = 1n << BigInt(vIdx.get(lv.start));
  const targetVisited = (1n << BigInt(totalVertices)) - 1n;
  const q = [{ pos: lv.start, mask: startMask, vm: startVisited, vs: 1, depth: 0 }];
  const seen = new Set([`${lv.start}|${startMask}|${startVisited}`]);
  let checked = 0;
  while (q.length) {
    checked++;
    if (checked > maxStates) return null;
    const c = q.shift();
    if (mode === "goal" ? c.pos === lv.goal : c.vs === totalVertices) return c.depth;
    for (const { to, idx } of adj[c.pos]) {
      if ((c.mask & (1n << BigInt(idx))) === 0n) continue;
      const ti = BigInt(vIdx.get(to));
      const was = (c.vm & (1n << ti)) !== 0n;
      if (noRevisit && was) continue;
      const nm = c.mask ^ flipMasks[to];
      const nvm = c.vm | (1n << ti);
      const key = `${to}|${nm}|${nvm}`;
      if (!seen.has(key)) {
        seen.add(key);
        q.push({ pos: to, mask: nm, vm: nvm, vs: was ? c.vs : c.vs + 1, depth: c.depth + 1 });
      }
    }
  }
  return null;
}

function circleLayout(ids) {
  const vertices = {};
  const cx = 500, cy = 450, r = 300;
  ids.forEach((id, i) => {
    const a = (i / ids.length) * Math.PI * 2 - Math.PI / 2;
    vertices[id] = {
      x: Math.round(cx + r * Math.cos(a)),
      y: Math.round(cy + r * Math.sin(a)),
      label: id === "s" ? "s" : id === "t" ? "t" : id.replace("v", ""),
      role: id === "s" ? "start" : id === "t" ? "goal" : null,
    };
  });
  return vertices;
}

function randomGraph(n, edgeProb, hasGoal) {
  const ids = hasGoal
    ? ["s", ...Array.from({ length: n - 2 }, (_, i) => `v${i + 1}`), "t"]
    : ["s", ...Array.from({ length: n - 1 }, (_, i) => `v${i + 1}`)];
  const edgePairs = [];
  const seen = new Set();
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (Math.random() < edgeProb) {
        const k = edgeKey(ids[i], ids[j]);
        if (!seen.has(k)) { seen.add(k); edgePairs.push([ids[i], ids[j]]); }
      }
    }
  }
  return { ids, edgePairs };
}

function search(n, mode, attempts) {
  const hasGoal = mode === "goal";
  const results = [];
  for (let a = 0; a < attempts; a++) {
    const edgeProb = 0.28 + Math.random() * 0.32;
    const { ids, edgePairs } = randomGraph(n, edgeProb, hasGoal);
    const adj = {};
    ids.forEach((id) => (adj[id] = []));
    edgePairs.forEach(([u, v]) => { adj[u].push(v); adj[v].push(u); });
    if (adj.s.length === 0) continue;
    if (hasGoal && adj.t.length === 0) continue;
    const seenV = new Set(["s"]);
    const stack = ["s"];
    while (stack.length) { const c = stack.pop(); for (const nb of adj[c]) if (!seenV.has(nb)) { seenV.add(nb); stack.push(nb); } }
    if (seenV.size !== ids.length) continue;

    const rawEdges = edgePairs.map(([u, v]) => [u, v, Math.random() < 0.45 ? 1 : 0]);
    const lv = { name: "tmp", vertices: circleLayout(ids), edges: rawEdges, start: "s", goal: hasGoal ? "t" : null };
    const optimal = bfs(lv, mode, true, 60000);
    if (optimal == null) continue;
    results.push({ lv, optimal, ratio: optimal / ids.length, vCount: ids.length, eCount: edgePairs.length });
  }
  results.sort((a, b) => b.ratio - a.ratio || b.optimal - a.optimal);
  return results;
}

function pick(results, count, minE, maxE) {
  const seenSig = new Set();
  const out = [];
  for (const r of results) {
    if (r.eCount < minE || r.eCount > maxE) continue;
    const sig = r.lv.edges.map(([u, v, w]) => `${u}-${v}:${w}`).sort().join(",");
    if (seenSig.has(sig)) continue;
    seenSig.add(sig);
    out.push(r);
    if (out.length >= count) break;
  }
  return out;
}

console.log("Searching GOAL mode (n=7,8)...");
const goalResults = [...search(7, "goal", 25000), ...search(8, "goal", 25000)];
const goalPicks = pick(goalResults, 5, 8, 16);
goalPicks.forEach((p, i) => console.log(`GOAL ${i + 1}: V=${p.vCount} E=${p.eCount} optimal=${p.optimal} ratio=${p.ratio.toFixed(2)}`));

console.log("\nSearching ALL mode (n=6,7)...");
const allResults = [...search(6, "all", 25000), ...search(7, "all", 25000)];
const allPicks = pick(allResults, 4, 6, 13);
allPicks.forEach((p, i) => console.log(`ALL ${i + 1}: V=${p.vCount} E=${p.eCount} optimal=${p.optimal} ratio=${p.ratio.toFixed(2)}`));

const fs = require("fs");
const out = {
  goal: goalPicks.map((p, i) => ({ ...p.lv, name: `Small Hard ${i + 1}`, _optimal: p.optimal })),
  all: allPicks.map((p, i) => ({ ...p.lv, name: `Small Hard ${i + 1}`, _optimal: p.optimal })),
};
fs.writeFileSync(__dirname + "/handmade-extra.json", JSON.stringify(out, null, 2));
console.log("\nWrote handmade-extra.json");
