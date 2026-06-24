function edgeKey(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }
function cloneEdges(edges) {
  const m = new Map();
  for (const [u, v, w] of edges) m.set(edgeKey(u, v), w);
  return m;
}
function getNeighbors(v, em, lv) {
  const n = [];
  for (const [u, w] of lv.edges) {
    if (u === v) n.push(w);
    else if (w === v) n.push(u);
  }
  return n;
}
function isWalkable(u, v, em) { return em.get(edgeKey(u, v)) === 1; }
function flipIncident(v, em, lv) {
  for (const nb of getNeighbors(v, em, lv)) em.set(edgeKey(v, nb), em.get(edgeKey(v, nb)) ^ 1);
}
function legal(lv, st) {
  return getNeighbors(st.pos, st.edges, lv).filter((nb) => isWalkable(st.pos, nb, st.edges));
}
function ser(lv, st) {
  return `${st.pos}|${lv.edges.map(([u, v]) => st.edges.get(edgeKey(u, v))).join("")}`;
}
function bfs(lv) {
  const q = [{ pos: lv.start, edges: cloneEdges(lv.edges), path: [] }];
  const seen = new Set([ser(lv, q[0])]);
  while (q.length) {
    const c = q.shift();
    if (c.pos === lv.goal) return c.path;
    for (const nb of legal(lv, c)) {
      const em = new Map(c.edges);
      const n = { pos: nb, edges: em, path: [...c.path, nb] };
      flipIncident(nb, em, lv);
      const k = ser(lv, n);
      if (!seen.has(k)) { seen.add(k); q.push(n); }
    }
  }
  return null;
}
function buildFromPath(path, pairs) {
  const flipAt = (sigma, v) => {
    const n = new Map(sigma);
    for (const [u, w] of pairs) {
      if (u === v || w === v) n.set(edgeKey(u, w), n.get(edgeKey(u, w)) ^ 1);
    }
    return n;
  };
  for (let t = 0; t < 500; t++) {
    let sigma = new Map(pairs.map(([u, v]) => [edgeKey(u, v), Math.random() < 0.5 ? 1 : 0]));
    let ok = true;
    for (let i = path.length - 1; i >= 1; i--) {
      sigma = flipAt(sigma, path[i]);
      if (sigma.get(edgeKey(path[i - 1], path[i])) !== 1) { ok = false; break; }
    }
    if (ok) return pairs.map(([u, v]) => [u, v, sigma.get(edgeKey(u, v))]);
  }
  return null;
}
function layoutLayered(groups) {
  const vertices = {};
  const mx = 55, my = 45, w = 800 - mx * 2, h = 500 - my * 2, L = groups.length;
  groups.forEach((g, l) => {
    const x = mx + (L === 1 ? w / 2 : (l / (L - 1)) * w);
    const sp = g.length > 1 ? h / (g.length + 1) : h / 2;
    g.forEach((id, i) => {
      vertices[id] = {
        x, y: my + sp * (i + 1),
        label: id === "s" || id === "t" ? id : String(i + 1),
        role: id === "s" ? "start" : id === "t" ? "goal" : null,
      };
    });
  });
  return vertices;
}
function connectLayers(groups, density, seed) {
  const pairs = [];
  const seen = new Set();
  const add = (u, v) => {
    const k = edgeKey(u, v);
    if (!seen.has(k)) { seen.add(k); pairs.push([u, v]); }
  };
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let l = 0; l < groups.length - 1; l++) {
    for (const u of groups[l]) {
      for (const v of groups[l + 1]) {
        if (rnd() < density) add(u, v);
      }
    }
    for (const v of groups[l + 1]) {
      if (!pairs.some(([u, w]) => u === v || w === v)) add(groups[l][0], v);
    }
    for (let i = 0; i < groups[l].length - 1; i++) {
      if (rnd() < 0.4) add(groups[l][i], groups[l][i + 1]);
    }
  }
  return pairs;
}
function findRealizablePath(pairs, minLen = 4) {
  const verts = new Set();
  for (const [u, v] of pairs) { verts.add(u); verts.add(v); }
  const ids = [...verts];
  const adj = new Map(ids.map((id) => [id, new Set()]));
  for (const [u, v] of pairs) { adj.get(u).add(v); adj.get(v).add(u); }

  function neighbors(pos, em) {
    return [...adj.get(pos)].filter((nb) => em.get(edgeKey(pos, nb)) === 1);
  }
  function flip(pos, em) {
    const n = new Map(em);
    for (const [u, v] of pairs) {
      if (u === pos || v === pos) n.set(edgeKey(u, v), n.get(edgeKey(u, v)) ^ 1);
    }
    return n;
  }

  const q = [];
  for (let mask = 0; mask < (1 << pairs.length); mask++) {
    const em = new Map(pairs.map(([u, v], i) => [edgeKey(u, v), (mask >> i) & 1]));
    const key = `s|${[...em.values()].join("")}`;
    q.push({ pos: "s", em, path: ["s"], seen: new Set([key]) });
  }

  let best = null;
  while (q.length) {
    const cur = q.shift();
    if (cur.pos === "t" && cur.path.length >= minLen) {
      if (!best || cur.path.length < best.length) best = cur.path;
      continue;
    }
    if (cur.path.length > 14) continue;
    for (const nb of neighbors(cur.pos, cur.em)) {
      const em2 = flip(nb, cur.em);
      const key = `${nb}|${[...em2.values()].join("")}`;
      if (cur.seen.has(key)) continue;
      const seen2 = new Set(cur.seen);
      seen2.add(key);
      q.push({ pos: nb, em: em2, path: [...cur.path, nb], seen: seen2 });
    }
  }
  return best;
}

function buildAdj(pairs) {
  const adj = new Map();
  const add = (u, v) => {
    if (!adj.has(u)) adj.set(u, new Set());
    if (!adj.has(v)) adj.set(v, new Set());
    adj.get(u).add(v);
    adj.get(v).add(u);
  };
  for (const [u, v] of pairs) add(u, v);
  return adj;
}

function randomWalkPath(adj, minLen = 6) {
  for (let trial = 0; trial < 60; trial++) {
    const path = ["s"];
    let cur = "s";
    const seen = new Set(["s"]);
    for (let step = 0; step < 28; step++) {
      if (cur === "t" && path.length >= minLen) return path;
      const nbs = [...adj.get(cur)];
      if (!nbs.length) break;
      const unvisited = nbs.filter((nb) => !seen.has(nb));
      let next;
      if (path.length < minLen - 1) {
        const pool = unvisited.length ? unvisited : nbs.filter((nb) => nb !== "t" || path.length >= minLen - 2);
        if (!pool.length) break;
        next = pool[Math.floor(Math.random() * pool.length)];
      } else if (cur !== "t") {
        const queue = [[cur]];
        const vis = new Set([cur]);
        let route = null;
        while (queue.length) {
          const p = queue.shift();
          if (p[p.length - 1] === "t") { route = p; break; }
          for (const nb of adj.get(p[p.length - 1])) {
            if (!vis.has(nb)) { vis.add(nb); queue.push([...p, nb]); }
          }
        }
        if (!route || route.length < 2) break;
        next = route[1];
      } else break;
      path.push(next);
      seen.add(next);
      cur = next;
    }
    if (cur !== "t") {
      const queue = [[cur]];
      const vis = new Set([cur]);
      while (queue.length) {
        const p = queue.shift();
        if (p[p.length - 1] === "t") { path.push(...p.slice(1)); cur = "t"; break; }
        for (const nb of adj.get(p[p.length - 1])) {
          if (!vis.has(nb)) { vis.add(nb); queue.push([...p, nb]); }
        }
      }
    }
    if (cur === "t" && path.length >= minLen) return path;
  }
  return null;
}

function makeLevelBig(name, groups, pairs, minLen) {
  const adj = buildAdj(pairs);
  for (let i = 0; i < 80; i++) {
    const path = randomWalkPath(adj, minLen);
    if (!path) continue;
    const lv = makeLevel(name, groups, pairs, path);
    if (lv) return lv;
  }
  return null;
}

function makeLevelAuto(name, groups, pairs, minLen = 4) {
  if (pairs.length > 14) return makeLevelBig(name, groups, pairs, minLen);
  const path = findRealizablePath(pairs, minLen);
  if (!path) return null;
  return makeLevel(name, groups, pairs, path);
}

function makeLevel(name, groups, pairs, path) {
  const edges = buildFromPath(path, pairs);
  if (!edges) return null;
  const lv = { name, vertices: layoutLayered(groups), edges, start: "s", goal: "t" };
  const sol = bfs(lv);
  if (!sol) return null;
  return { ...lv, _optimal: sol.length };
}

const presets = [
  {
    name: "1 はじめの一歩",
    vertices: {
      s: { x: 100, y: 250, label: "s", role: "start" },
      a: { x: 350, y: 150, label: "1" },
      b: { x: 350, y: 350, label: "2" },
      t: { x: 600, y: 250, label: "t", role: "goal" },
    },
    edges: [["s", "a", 1], ["s", "b", 0], ["a", "t", 0], ["b", "t", 1], ["a", "b", 1]],
    start: "s", goal: "t", _optimal: 2,
  },
  {
    name: "2 二股",
    vertices: {
      s: { x: 80, y: 250, label: "s", role: "start" },
      a: { x: 250, y: 120, label: "1" },
      b: { x: 250, y: 380, label: "2" },
      c: { x: 450, y: 250, label: "3" },
      t: { x: 620, y: 250, label: "t", role: "goal" },
    },
    edges: [
      ["s", "a", 1], ["s", "b", 1], ["s", "c", 0],
      ["a", "c", 1], ["b", "c", 0], ["a", "b", 1], ["c", "t", 1],
    ],
    start: "s", goal: "t",
  },
];

for (const p of presets) {
  const sol = bfs(p);
  if (!sol) { console.error("FAIL preset", p.name); process.exit(1); }
  p._optimal = sol.length;
}

const midSpecs = [
  {
    name: "3 回り道",
    groups: [["s"], ["a", "b"], ["c"], ["t"]],
    pairs: [["s", "a"], ["s", "b"], ["a", "c"], ["b", "c"], ["a", "b"], ["c", "t"], ["s", "c"]],
    minLen: 4,
  },
  {
    name: "4 三方路",
    groups: [["s"], ["a", "b"], ["c", "d"], ["e"], ["t"]],
    pairs: [
      ["s", "a"], ["s", "b"], ["a", "c"], ["b", "d"], ["c", "e"], ["d", "e"],
      ["b", "c"], ["a", "d"], ["c", "d"], ["e", "t"], ["c", "t"],
    ],
    minLen: 5,
  },
  {
    name: "5 交差",
    groups: [["s"], ["a", "b"], ["c"], ["d", "e"], ["f"], ["t"]],
    pairs: [
      ["s", "a"], ["s", "b"], ["a", "c"], ["b", "c"], ["c", "d"], ["c", "e"],
      ["d", "f"], ["e", "f"], ["d", "e"], ["f", "t"], ["a", "b"],
    ],
    minLen: 6,
  },
];

for (const spec of midSpecs) {
  const lv = makeLevelAuto(spec.name, spec.groups, spec.pairs, spec.minLen);
  if (!lv) { console.error("FAIL", spec.name); process.exit(1); }
  presets.push(lv);
}

const bigSpecs = [
  {
    name: "6 大門",
    groups: [["s"], ["a", "b", "c"], ["d", "e", "f"], ["g", "h", "i"], ["j", "k", "l"], ["t"]],
    density: 0.44, seed: 42, minLen: 6,
  },
  {
    name: "7 迷宮",
    groups: [["s"], ["a", "b"], ["c", "d", "e"], ["f", "g", "h"], ["i", "j", "k"], ["l", "m"], ["n", "o"], ["t"]],
    density: 0.48, seed: 77, minLen: 7,
  },
  {
    name: "8 最終試練",
    groups: [
      ["s"], ["a", "b", "c"], ["d", "e", "f", "g"], ["h", "i", "j", "k"],
      ["l", "m", "n"], ["o", "p", "q"], ["r", "u", "v"], ["t"],
    ],
    density: 0.5, seed: 99, minLen: 8,
  },
];

for (const spec of bigSpecs) {
  let lv = null;
  for (let i = 0; i < 300 && !lv; i++) {
    const pairs = connectLayers(spec.groups, spec.density, spec.seed + i);
    lv = makeLevelBig(spec.name, spec.groups, pairs, spec.minLen);
  }
  if (!lv) { console.error("FAIL", spec.name); process.exit(1); }
  presets.push(lv);
}

for (const p of presets) {
  const sol = bfs(p);
  console.log(p.name, "V=" + Object.keys(p.vertices).length, "E=" + p.edges.length, "opt=" + sol.length);
}

const fs = require("fs");
const out = presets.map(({ _optimal, ...rest }) => ({ ...rest, _optimal }));
fs.writeFileSync(__dirname + "/presets.json", JSON.stringify(out, null, 2));
console.log("wrote presets.json");
