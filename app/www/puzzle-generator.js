// Random-puzzle generator for the "random" level slot — layered graph
// construction, a crafted solution path, and a scoring pass to pick a
// well-shaped candidate out of many random attempts.

import { edgeKey, cloneEdges, legalMoves, bfsSolveFrom } from "./puzzle-model.js";

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildLayeredGraph(layerSizes, density, crossProb) {
  // Generic vertices in every layer — no layer is hard-wired to be "the s
  // layer". chooseStartGoal() below decides which vertex plays s/t, so a
  // puzzle's start doesn't always sit at the leftmost corner.
  const layerCount = layerSizes.length;
  const groups = Array.from({ length: layerCount }, () => []);
  let vid = 1;
  for (let i = 0; i < layerCount; i++) {
    for (let j = 0; j < layerSizes[i]; j++) groups[i].push(`v${vid++}`);
  }

  const ids = groups.flat();
  const layerOf = new Map();
  groups.forEach((g, L) => g.forEach((id) => layerOf.set(id, L)));

  const edgePairs = [];
  const seen = new Set();
  const addEdge = (u, v) => {
    if (u === v) return;
    const k = edgeKey(u, v);
    if (!seen.has(k)) {
      seen.add(k);
      edgePairs.push([u, v]);
    }
  };

  for (let i = 0; i < layerCount - 1; i++) {
    const L1 = groups[i];
    const L2 = groups[i + 1];
    const m = L1.length;
    const n = L2.length;
    let a = 0, b = 0;
    addEdge(L1[a], L2[b]);
    while (a < m - 1 || b < n - 1) {
      if (a === m - 1) b++;
      else if (b === n - 1) a++;
      else if (Math.random() < 0.5) a++;
      else b++;
      addEdge(L1[a], L2[b]);
    }

    const currentEdges = edgePairs
      .filter(([u, v]) => {
        const lu = layerOf.get(u);
        const lv2 = layerOf.get(v);
        return (lu === i && lv2 === i + 1) || (lu === i + 1 && lv2 === i);
      })
      .map(([u, v]) => {
        const isUL1 = L1.includes(u);
        const uVal = isUL1 ? u : v;
        const vVal = isUL1 ? v : u;
        return [L1.indexOf(uVal), L2.indexOf(vVal)];
      });

    for (let x = 0; x < m; x++) {
      for (let y = 0; y < n; y++) {
        if (Math.random() < density) {
          const crosses = currentEdges.some(([cx, cy]) => (x - cx) * (y - cy) < 0);
          if (!crosses) {
            addEdge(L1[x], L2[y]);
            currentEdges.push([x, y]);
          } else if (Math.random() < crossProb) {
            addEdge(L1[x], L2[y]);
            currentEdges.push([x, y]);
          }
        }
      }
    }
  }

  for (let i = 0; i < layerCount; i++) {
    const L = groups[i];
    for (let j = 0; j < L.length - 1; j++) {
      if (Math.random() < 0.3) addEdge(L[j], L[j + 1]);
    }
  }

  return { ids, edgePairs, groups, layerOf };
}

// Decide which vertex plays s (and, for goal mode, t) — see gen-varied-
// presets.js for the same idea applied to the offline preset generator.
const CENTER_BIAS = 0.4;

function chooseStartGoal(groups, hasGoal) {
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

  if (!hasGoal) return { s, t: null };

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
  const marginX = 90;
  const marginY = 90;
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
        x: Math.round(baseX),
        y: Math.round(baseY),
        label: id === "s" ? "s" : id === "t" ? "t" : String(i + 1),
        role: id === "s" ? "start" : id === "t" ? "goal" : null,
      };
    });
  });
  return vertices;
}

function scorePuzzle(lv, solution, gameMode) {
  if (!solution) return -1;
  const len = solution.length;
  if (len < 4 || len > 16) return -1;

  const walkable = lv.edges.filter(([, , w]) => w === 1).length;
  const ratio = walkable / lv.edges.length;
  if (ratio < 0.28 || ratio > 0.72) return -1;

  const unique = new Set(solution).size;
  const revisitBonus = unique < solution.length ? 18 : 0;
  const lenScore = 20 - Math.abs(len - 7) * 3;
  const edgeScore = lv.edges.length >= 7 && lv.edges.length <= 22 ? 8 : 0;
  const startMoves = legalMoves(lv, { pos: lv.start, edges: cloneEdges(lv.edges) }, false).length;
  if (startMoves === 0) return -1;
  const branchScore = startMoves === 1 ? 4 : startMoves === 2 ? 8 : 3;

  return lenScore + revisitBonus + edgeScore + branchScore;
}

export function generatePuzzle({ gameMode, gameDifficulty, recentPuzzles, fallbackPresets }) {
  let best = null;
  let bestScore = -1;
  const maxAttempts = gameDifficulty === "expert" ? 500 : gameDifficulty === "hard" ? 300 : 150;

  let layerCount, minSize, maxSize;
  if (gameMode === "all") {
    if (gameDifficulty === "easy") { layerCount = 3; minSize = 2; maxSize = 2; }
    else if (gameDifficulty === "medium") { layerCount = 4; minSize = 2; maxSize = 3; }
    else if (gameDifficulty === "hard") { layerCount = 8; minSize = 2; maxSize = 4; }
    else { layerCount = 13; minSize = 2; maxSize = 5; }
  } else {
    if (gameDifficulty === "easy") { layerCount = randInt(3, 4); minSize = 1; maxSize = 2; }
    else if (gameDifficulty === "medium") { layerCount = randInt(5, 6); minSize = 2; maxSize = 3; }
    else if (gameDifficulty === "hard") { layerCount = randInt(9, 12); minSize = 2; maxSize = 5; }
    else { layerCount = randInt(14, 16); minSize = 3; maxSize = 6; }
  }

  const serialize = (lv) =>
    lv.edges.map(([u, v, w]) => {
      const k = u < v ? `${u}-${v}` : `${v}-${u}`;
      return `${k}:${w}`;
    }).sort().join(",");

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const layerSizes = [];
    for (let L = 0; L < layerCount; L++) layerSizes.push(randInt(minSize, maxSize));

    const crossProb = gameDifficulty === "hard" || gameDifficulty === "expert" ? 0.15 : 0;
    const raw = buildLayeredGraph(layerSizes, 0.45, crossProb);
    const { s, t } = chooseStartGoal(raw.groups, gameMode === "goal");
    const graph = relabelStartGoal(raw, s, gameMode === "goal" ? t : null);
    const edges = graph.edgePairs.map(([u, v]) => [u, v, Math.random() < 0.45 ? 1 : 0]);

    const candidate = {
      name: "Random",
      vertices: layoutLayered(graph.groups),
      edges,
      start: "s",
      goal: gameMode === "goal" ? "t" : null,
    };

    const sig = serialize(candidate);
    if (recentPuzzles.includes(sig)) continue;

    const solution = bfsSolveFrom(
      candidate,
      { pos: candidate.start, edges: cloneEdges(candidate.edges), visited: new Set([candidate.start]) },
      gameMode,
      false
    );
    if (!solution) continue;

    const score = scorePuzzle(candidate, solution, gameMode);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
      best._optimal = solution.length;
      best._sig = sig;
    }
    if (bestScore >= 25 && best._sig) break;
  }

  if (!best) {
    const pool = fallbackPresets;
    best = JSON.parse(JSON.stringify(pool[randInt(0, pool.length - 1)]));
    best.name = "Random";
    best._optimal = null;
    best._sig = serialize(best);
  }

  recentPuzzles.push(best._sig);
  if (recentPuzzles.length > 10) recentPuzzles.shift();

  return best;
}

// Bonus-branch content: same vertices/edges (same puzzle "shape") as the
// stage it forks from, but a freshly rolled — and deliberately harder —
// initial walkable/blocked pattern. Tries many random assignments on the
// same topology and keeps the one with the longest optimal solution.
export function remixLevel(level, mode, canRevisit = false, attempts = 250) {
  const topology = level.edges.map(([u, v]) => [u, v]);
  const baseline = level._optimal || 0;
  let best = null;
  let bestLen = -1;

  for (let a = 0; a < attempts; a++) {
    const edges = topology.map(([u, v]) => [u, v, Math.random() < 0.45 ? 1 : 0]);
    const candidate = { ...level, edges, name: `${level.name} [HARD REMIX]` };
    const sol = bfsSolveFrom(
      candidate,
      { pos: candidate.start, edges: cloneEdges(edges), visited: new Set([candidate.start]) },
      mode,
      canRevisit
    );
    if (!sol) continue;
    if (sol.length > bestLen) {
      bestLen = sol.length;
      best = candidate;
      best._optimal = sol.length;
    }
    // Good enough and clearly harder than the original — stop early.
    if (bestLen >= baseline + 2 && a > 40) break;
  }

  if (!best) {
    best = { ...level, edges: level.edges.map((e) => [...e]), name: `${level.name} [HARD REMIX]` };
  }
  return best;
}
