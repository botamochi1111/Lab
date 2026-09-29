// Regenerates the 20 Goal + 20 Visit-All preset levels with an explicit
// topology-diversity pass: early levels previously reused the same tiny
// layer-size shape (3 layers, 1-2 wide) and only differed by which edges
// started walkable, so consecutive levels looked identical at a glance.
// This version (a) jitters layerCount/size per level so neighbors rarely
// share a shape, and (b) rejects a candidate whose *topology* (independent
// of edge on/off state) duplicates an already-accepted level in the batch.

function edgeKey(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }

function buildLayeredGraph(layerSizes, density, intraProb, crossProb) {
  // Every layer holds plain generic vertices — no layer is hard-wired to be
  // "the s layer" or "the t layer". Which vertex becomes s/t is decided
  // afterwards (see chooseStartGoal), so a level's start can land anywhere
  // in the graph instead of always at the leftmost corner.
  const layerCount = layerSizes.length;
  const groups = Array.from({ length: layerCount }, () => []);
  let vid = 1;
  for (let i = 0; i < layerCount; i++) for (let j = 0; j < layerSizes[i]; j++) groups[i].push(`v${vid++}`);

  const ids = groups.flat();
  const layerOf = new Map();
  groups.forEach((g, L) => g.forEach((id) => layerOf.set(id, L)));
  const edgePairs = [];
  const seen = new Set();
  const addEdge = (u, v) => {
    if (u === v) return;
    const k = edgeKey(u, v);
    if (!seen.has(k)) { seen.add(k); edgePairs.push([u, v]); }
  };

  for (let i = 0; i < layerCount - 1; i++) {
    const L1 = groups[i], L2 = groups[i + 1];
    const m = L1.length, n = L2.length;
    let a = 0, b = 0;
    addEdge(L1[a], L2[b]);
    while (a < m - 1 || b < n - 1) {
      if (a === m - 1) b++;
      else if (b === n - 1) a++;
      else if (Math.random() < 0.5) a++;
      else b++;
      addEdge(L1[a], L2[b]);
    }
    const cur = edgePairs.filter(([u, v]) => {
      const lu = layerOf.get(u), lv = layerOf.get(v);
      return (lu === i && lv === i + 1) || (lu === i + 1 && lv === i);
    }).map(([u, v]) => {
      const isUL1 = L1.includes(u);
      const uVal = isUL1 ? u : v, vVal = isUL1 ? v : u;
      return [L1.indexOf(uVal), L2.indexOf(vVal)];
    });
    for (let x = 0; x < m; x++) {
      for (let y = 0; y < n; y++) {
        if (Math.random() < density) {
          const crosses = cur.some(([cx, cy]) => (x - cx) * (y - cy) < 0);
          if (!crosses) { addEdge(L1[x], L2[y]); cur.push([x, y]); }
          else if (Math.random() < crossProb) { addEdge(L1[x], L2[y]); cur.push([x, y]); }
        }
      }
    }
  }
  for (let i = 0; i < layerCount; i++) {
    const L = groups[i];
    for (let j = 0; j < L.length - 1; j++) if (Math.random() < intraProb) addEdge(L[j], L[j + 1]);
  }
  return { ids, edgePairs, groups, layerOf };
}

// Decide which vertex plays s (and, for goal mode, t). Most of the time s
// still lands at one end (that's a perfectly natural shape too), but a
// meaningful slice of levels seat it in an interior layer instead — nothing
// in the game's rules or its proofs requires s to be a degree-1 corner.
const CENTER_BIAS = 0.4;

function chooseStartGoal(groups, mode) {
  const layerCount = groups.length;
  let sLayer;
  if (layerCount >= 4 && Math.random() < CENTER_BIAS) {
    const lo = Math.max(1, Math.floor(layerCount * 0.25));
    const hi = Math.min(layerCount - 2, Math.ceil(layerCount * 0.75));
    sLayer = lo + Math.floor(Math.random() * Math.max(1, hi - lo + 1));
  } else {
    sLayer = Math.random() < 0.5 ? 0 : layerCount - 1;
  }
  const sPool = groups[sLayer];
  const s = sPool[Math.floor(Math.random() * sPool.length)];

  if (mode !== "goal") return { s, t: null };

  const dists = groups.map((_, L) => Math.abs(L - sLayer));
  const maxDist = Math.max(...dists);
  const farLayers = [];
  dists.forEach((d, L) => { if (d === maxDist) farLayers.push(L); });
  const tLayer = farLayers[Math.floor(Math.random() * farLayers.length)];
  let tPool = groups[tLayer].filter((id) => id !== s);
  if (!tPool.length) tPool = groups[tLayer];
  const t = tPool[Math.floor(Math.random() * tPool.length)];
  return { s, t };
}

function relabelStartGoal(graph, sOld, tOld) {
  const rename = new Map();
  rename.set(sOld, "s");
  if (tOld) rename.set(tOld, "t");
  const apply = (id) => rename.get(id) || id;
  return {
    ids: graph.ids.map(apply),
    edgePairs: graph.edgePairs.map(([u, v]) => [apply(u), apply(v)]),
    groups: graph.groups.map((g) => g.map(apply)),
    layerOf: new Map([...graph.layerOf.entries()].map(([id, L]) => [apply(id), L])),
  };
}

function layoutLayered(groups) {
  const vertices = {};
  const marginX = 90, marginY = 90;
  const layerCount = groups.length;
  const layerSpacing = 140;
  const width = Math.max(1000 - marginX * 2, (layerCount - 1) * layerSpacing);
  const height = 900 - marginY * 2;
  groups.forEach((g, L) => {
    const baseX = marginX + (layerCount === 1 ? width / 2 : (L / (layerCount - 1)) * width);
    const spacing = g.length > 1 ? height / (g.length + 1) : height / 2;
    g.forEach((id, i) => {
      const baseY = marginY + spacing * (i + 1);
      vertices[id] = {
        x: Math.round(baseX), y: Math.round(baseY),
        label: id === "s" ? "s" : id === "t" ? "t" : String(i + 1),
        role: id === "s" ? "start" : id === "t" ? "goal" : null,
      };
    });
  });
  return vertices;
}

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
  const useDfs = totalVertices >= (mode === "goal" ? 20 : 12);
  while (q.length) {
    checked++;
    if (checked > maxStates) return null;
    const c = useDfs ? q.pop() : q.shift();
    if (mode === "goal" ? c.pos === lv.goal : c.vs === totalVertices) return c.depth;
    for (const { to, idx } of adj[c.pos]) {
      if ((c.mask & (1n << BigInt(idx))) === 0n) continue;
      const ti = BigInt(vIdx.get(to));
      const was = (c.vm & (1n << ti)) !== 0n;
      if (noRevisit && was) continue;
      const nm = c.mask ^ flipMasks[to];
      const nvm = c.vm | (1n << ti);
      const key = `${to}|${nm}|${nvm}`;
      if (!seen.has(key)) { seen.add(key); q.push({ pos: to, mask: nm, vm: nvm, vs: was ? c.vs : c.vs + 1, depth: c.depth + 1 }); }
    }
  }
  return null;
}

// Topology fingerprint: independent of which edges start walkable. Two
// levels with the same layer-size pattern AND the same adjacency (as a
// sorted degree sequence per layer) read as "the same puzzle" to a player.
function topologySignature(graph) {
  const degree = new Map(graph.ids.map((id) => [id, 0]));
  graph.edgePairs.forEach(([u, v]) => { degree.set(u, degree.get(u) + 1); degree.set(v, degree.get(v) + 1); });
  const perLayer = graph.groups.map((g) => g.map((id) => degree.get(id)).sort((a, b) => a - b).join(","));
  return graph.groups.map((g) => g.length).join("-") + "::" + perLayer.join("|") + "::E" + graph.edgePairs.length;
}

function generateLevel(name, layerSizes, minOpt, maxOpt, mode, crossProb, usedTopologies) {
  const hasGoal = mode === "goal";
  const estV = layerSizes.reduce((s, n) => s + n, 0);
  const threshold = 20;
  const firstLoopAttempts = estV < threshold ? 20000 : 6000;
  const maxStates = mode === "all" || estV >= threshold ? 90000 : 8000;
  const intraProb = mode === "all" ? 0.9 : 0.3;

  function checkAllModeDegrees(graph) {
    const degrees = {};
    graph.groups.flat().forEach((id) => (degrees[id] = 0));
    graph.edgePairs.forEach(([u, v]) => { degrees[u]++; degrees[v]++; });
    let degree1Count = 0, unsolvable = false;
    for (const id of Object.keys(degrees)) {
      if (degrees[id] === 0) { unsolvable = true; break; }
      if (degrees[id] === 1 && id !== "s") degree1Count++;
    }
    return !unsolvable && degree1Count <= 1;
  }

  for (let attempt = 0; attempt < firstLoopAttempts; attempt++) {
    const raw = buildLayeredGraph(layerSizes, 0.45, intraProb, crossProb);
    const { s, t } = chooseStartGoal(raw.groups, mode);
    const graph = relabelStartGoal(raw, s, hasGoal ? t : null);
    if (mode === "all" && !checkAllModeDegrees(graph)) continue;

    const topoSig = topologySignature(graph);
    // Only enforce novelty for the first ~2500 tries; past that, take
    // whatever is solvable so generation still terminates.
    if (attempt < 2500 && usedTopologies.has(topoSig)) continue;

    const rawEdges = graph.edgePairs.map(([u, v]) => [u, v, Math.random() < 0.45 ? 1 : 0]);
    const lv = { name, vertices: layoutLayered(graph.groups), edges: rawEdges, start: "s", goal: hasGoal ? "t" : null };
    const sol = bfs(lv, mode, true, maxStates);
    if (sol == null) continue;
    const vCount = Object.keys(lv.vertices).length;
    if (vCount < threshold && mode !== "all") {
      if (sol < minOpt || sol > maxOpt) continue;
    }
    usedTopologies.add(topoSig);
    return { ...lv, _optimal: sol };
  }

  // Fallback: widen bounds, still respects topology novelty best-effort.
  const fallbackAttempts = 16000;
  for (let attempt = 0; attempt < fallbackAttempts; attempt++) {
    const raw = buildLayeredGraph(layerSizes, 0.65, intraProb, crossProb);
    const { s, t } = chooseStartGoal(raw.groups, mode);
    const graph = relabelStartGoal(raw, s, hasGoal ? t : null);
    if (mode === "all" && !checkAllModeDegrees(graph)) continue;
    const activeProb = 0.55 + 0.3 * (attempt / fallbackAttempts);
    const rawEdges = graph.edgePairs.map(([u, v]) => [u, v, Math.random() < activeProb ? 1 : 0]);
    const lv = { name, vertices: layoutLayered(graph.groups), edges: rawEdges, start: "s", goal: hasGoal ? "t" : null };
    const sol = bfs(lv, mode, true, maxStates);
    if (sol == null) continue;
    usedTopologies.add(topologySignature(graph));
    return { ...lv, _optimal: sol };
  }

  // Emergency pass: visit-all-without-revisit gets genuinely hard to satisfy
  // at random past a certain size, so a shape can exhaust both loops above
  // by bad luck alone. Relax the degree check (only reject a truly isolated
  // vertex) and search harder so generation still terminates.
  for (let attempt = 0; attempt < 20000; attempt++) {
    const raw = buildLayeredGraph(layerSizes, 0.7, intraProb, crossProb);
    const { s, t } = chooseStartGoal(raw.groups, mode);
    const graph = relabelStartGoal(raw, s, hasGoal ? t : null);
    if (mode === "all") {
      const degrees = {};
      graph.groups.flat().forEach((id) => (degrees[id] = 0));
      graph.edgePairs.forEach(([u, v]) => { degrees[u]++; degrees[v]++; });
      if (Object.values(degrees).some((d) => d === 0)) continue;
    }
    const activeProb = 0.4 + 0.5 * Math.random();
    const rawEdges = graph.edgePairs.map(([u, v]) => [u, v, Math.random() < activeProb ? 1 : 0]);
    const lv = { name, vertices: layoutLayered(graph.groups), edges: rawEdges, start: "s", goal: hasGoal ? "t" : null };
    const sol = bfs(lv, mode, true, 120000);
    if (sol == null) continue;
    usedTopologies.add(topologySignature(graph));
    return { ...lv, _optimal: sol };
  }
  throw new Error(`failed to generate ${name}`);
}

// --- per-level shape schedules with deliberate jitter -----------------

// Split `total` vertices into `parts` layers, each 1..maxPer wide.
function splitLayers(total, parts, maxPer) {
  const sizes = new Array(parts).fill(1);
  let left = total - parts;
  while (left > 0) {
    const k = Math.floor(Math.random() * parts);
    if (sizes[k] < maxPer) { sizes[k]++; left--; }
  }
  return sizes;
}

// Shape from a target vertex count that starts tiny (level 1 = 4 vertices)
// and grows gradually, instead of picking layer counts/widths directly.
function shapeFor(V, maxPerCap) {
  const maxPer = Math.min(maxPerCap, V <= 6 ? 2 : V <= 12 ? 3 : V <= 18 ? 4 : 5);
  const minLayers = Math.max(2, Math.ceil(V / maxPer));
  const layerCount = Math.min(V, minLayers + Math.floor(Math.random() * 2));
  return splitLayers(V, layerCount, maxPer);
}

function goalShape(i) {
  const V = Math.min(26, Math.round(4 + (i - 1) * 0.75) + (i > 3 ? Math.floor(Math.random() * 2) : 0));
  const layers = shapeFor(V, 5);
  const minOpt = Math.max(2, Math.floor(V * 0.35));
  return { layers, min: minOpt, max: V, crossProb: i >= 10 ? 0.15 : 0 };
}

function allShape(i) {
  // Visit-all-without-revisit gets unreliable to even *generate* much past
  // ~25 vertices at random, so this tops out around 20.
  const V = Math.min(21, Math.round(4 + (i - 1) * 0.58) + (i > 3 ? Math.floor(Math.random() * 2) : 0));
  const layers = shapeFor(V, 4);
  return { layers, min: 0, max: V, crossProb: i >= 8 ? 0.15 : 0 };
}

const LEVEL_COUNT = 30;

console.log(`Generating GOAL presets (1..${LEVEL_COUNT}) with topology dedup...`);
const usedGoalTopo = new Set();
const presetsGoal = [];
for (let i = 1; i <= LEVEL_COUNT; i++) {
  const spec = goalShape(i);
  const lv = generateLevel(`Level ${i}`, spec.layers, spec.min, spec.max, "goal", spec.crossProb, usedGoalTopo);
  const xs = Object.values(lv.vertices).map((v) => v.x);
  const sPos = lv.vertices.s.x === Math.min(...xs) ? "EDGE(left)" : lv.vertices.s.x === Math.max(...xs) ? "EDGE(right)" : "MIDDLE";
  console.log(`  Level ${i}: layers=[${spec.layers}] V=${Object.keys(lv.vertices).length} E=${lv.edges.length} optimal=${lv._optimal} sPos=${sPos}`);
  presetsGoal.push(lv);
}

console.log(`\nGenerating ALL presets (1..${LEVEL_COUNT}) with topology dedup...`);
const usedAllTopo = new Set();
const presetsAll = [];
for (let i = 1; i <= LEVEL_COUNT; i++) {
  const spec = allShape(i);
  const lv = generateLevel(`Level ${i}`, spec.layers, spec.min, spec.max, "all", spec.crossProb, usedAllTopo);
  const xs = Object.values(lv.vertices).map((v) => v.x);
  const sPos = lv.vertices.s.x === Math.min(...xs) ? "EDGE(left)" : lv.vertices.s.x === Math.max(...xs) ? "EDGE(right)" : "MIDDLE";
  console.log(`  Level ${i}: layers=[${spec.layers}] V=${Object.keys(lv.vertices).length} E=${lv.edges.length} optimal=${lv._optimal} sPos=${sPos}`);
  presetsAll.push(lv);
}

const fs = require("fs");
const out =
  "const PRESETS_GOAL = " + JSON.stringify(presetsGoal) + ";\n\n" +
  "const PRESETS_ALL = " + JSON.stringify(presetsAll) + ";\n\n" +
  "window.PRESETS_GOAL = PRESETS_GOAL;\nwindow.PRESETS_ALL = PRESETS_ALL;\n";
fs.writeFileSync(__dirname + "/../www/presets.js", out);
console.log("\nWrote www/presets.js");
