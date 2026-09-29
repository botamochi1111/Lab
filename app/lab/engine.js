// Exact rules + analysis engine for the Incident Flip Walk lab.
// Parity model: f_v = parity of arrivals at v (start not counted).
// Edge uv is walkable iff it is FIXED, or w_uv ^ f_u ^ f_v === 1.
// Plain script (not an ES module) so the lab opens straight from file://;
// exposes window.IFWEngine in the browser and module.exports under Node.
(function (root) {

const OFF = 0;
const ON = 1;
const FIXED = 2;
const MAX_VERTICES = 30;

function compile(level) {
  const ids = Object.keys(level.vertices);
  const idx = new Map(ids.map((id, i) => [id, i]));
  const n = ids.length;
  const edges = level.edges.map(([u, v, w]) => ({ u: idx.get(u), v: idx.get(v), w }));
  const adj = Array.from({ length: n }, () => []);
  edges.forEach((e, k) => {
    adj[e.u].push({ to: e.v, e: k });
    adj[e.v].push({ to: e.u, e: k });
  });
  return {
    level, ids, idx, n, edges, adj,
    s: idx.get(level.start),
    t: level.goal != null ? idx.get(level.goal) : -1,
  };
}

const bit = (m, i) => (m >>> i) & 1;

function walkable(G, k, f) {
  const e = G.edges[k];
  if (e.w === FIXED) return true;
  return ((e.w ^ bit(f, e.u) ^ bit(f, e.v)) & 1) === 1;
}

function tracksVisited(rules) {
  return rules.mode === "all" || !rules.revisit;
}

function initialState(G, rules) {
  return { pos: G.s, f: 0, vm: tracksVisited(rules) ? (1 << G.s) >>> 0 : 0 };
}

function fullMask(n) {
  return n >= 31 ? -1 : ((2 ** n) - 1);
}

function isGoal(G, rules, st) {
  if (rules.mode === "goal") return st.pos === G.t;
  return st.vm === fullMask(G.n);
}

function legalMoves(G, rules, st) {
  const out = [];
  for (const { to, e } of G.adj[st.pos]) {
    if (!walkable(G, e, st.f)) continue;
    if (!rules.revisit && bit(st.vm, to)) continue;
    out.push(to);
  }
  return out;
}

function step(G, rules, st, to) {
  return {
    pos: to,
    f: (st.f ^ (1 << to)) >>> 0,
    vm: tracksVisited(rules) ? (st.vm | (1 << to)) >>> 0 : 0,
  };
}

const keyOf = (st) => `${st.pos},${st.f},${st.vm}`;

// Full state-space exploration. Goal states are terminal.
function explore(G, rules, cap = 400000) {
  const states = [];
  const index = new Map();
  const dist = [];
  const parent = [];
  const succ = [];
  const add = (st, d, p) => {
    const k = keyOf(st);
    let i = index.get(k);
    if (i !== undefined) return i;
    i = states.length;
    index.set(k, i);
    states.push(st);
    dist.push(d);
    parent.push(p);
    succ.push(null);
    return i;
  };
  add(initialState(G, rules), 0, -1);
  let truncated = false;
  for (let i = 0; i < states.length; i++) {
    const st = states[i];
    if (isGoal(G, rules, st)) { succ[i] = []; continue; }
    const list = [];
    for (const to of legalMoves(G, rules, st)) {
      if (states.length >= cap) { truncated = true; break; }
      list.push(add(step(G, rules, st, to), dist[i] + 1, i));
    }
    succ[i] = list;
    if (truncated) break;
  }
  return { states, index, dist, parent, succ, truncated };
}

function analyze(G, rules, cap) {
  if (G.n > MAX_VERTICES) return { error: `頂点数が${MAX_VERTICES}を超えています` };
  if (G.s == null) return { error: "スタートが未指定です" };
  if (rules.mode === "goal" && G.t < 0) return { error: "ゴールが未指定です" };

  const X = explore(G, rules, cap);
  const N = X.states.length;
  const goalIdx = [];
  for (let i = 0; i < N; i++) if (X.succ[i] && isGoal(G, rules, X.states[i])) goalIdx.push(i);

  const pred = Array.from({ length: N }, () => []);
  for (let i = 0; i < N; i++) for (const j of X.succ[i] || []) pred[j].push(i);
  const winnable = new Uint8Array(N);
  const queue = [...goalIdx];
  goalIdx.forEach((g) => (winnable[g] = 1));
  while (queue.length) {
    const j = queue.pop();
    for (const i of pred[j]) if (!winnable[i]) { winnable[i] = 1; queue.push(i); }
  }
  let winCount = 0;
  for (let i = 0; i < N; i++) winCount += winnable[i];

  // Shortest-path counts in BFS order.
  const ways = new Float64Array(N);
  ways[0] = 1;
  for (let i = 0; i < N; i++) for (const j of X.succ[i] || []) if (X.dist[j] === X.dist[i] + 1) ways[j] += ways[i];

  let optimal = null;
  let optCount = 0;
  let bestGoal = -1;
  for (const g of goalIdx) {
    if (optimal === null || X.dist[g] < optimal) { optimal = X.dist[g]; bestGoal = g; }
  }
  if (optimal !== null) for (const g of goalIdx) if (X.dist[g] === optimal) optCount += ways[g];

  const path = [];
  for (let i = bestGoal; i > 0; i = X.parent[i]) path.push(X.states[i].pos);
  path.reverse();
  const pathStates = [];
  for (let i = bestGoal; i >= 0; i = X.parent[i]) pathStates.push(i);
  pathStates.reverse();

  // With no revisits every move visits a new vertex, so the state graph is a
  // DAG and BFS order is topological: count all solutions, and how far a
  // wrong turn lets you keep walking before you're stuck (trap depth).
  const isDag = !rules.revisit;
  let solutionCount = null;
  let walkCount = null;
  let depth = null;
  if (isDag && !X.truncated) {
    solutionCount = 0;
    for (const g of goalIdx) solutionCount += ways[g];
    // Every walk until the player is stuck (or wins): all paths from the
    // start to a state with no further moves.
    walkCount = 0;
    for (let i = 0; i < N; i++) if (X.succ[i] && X.succ[i].length === 0) walkCount += ways[i];
    depth = new Int32Array(N);
    for (let i = N - 1; i >= 0; i--) {
      let best = 0;
      for (const j of X.succ[i] || []) best = Math.max(best, 1 + depth[j]);
      depth[i] = best;
    }
  }

  const traps = [];
  if (bestGoal >= 0) {
    for (let k = 0; k < pathStates.length - 1; k++) {
      const i = pathStates[k];
      const wrong = [];
      for (const j of X.succ[i]) {
        if (!winnable[j]) wrong.push({ to: X.states[j].pos, depth: depth ? 1 + depth[j] : null });
      }
      const safe = X.succ[i].filter((j) => winnable[j]).length;
      traps.push({ step: k + 1, from: X.states[i].pos, safe, wrong });
    }
  }

  const human = rules.mode === "all" && !rules.revisit && !X.truncated
    ? humanDifficulty(G, X, winnable, bestGoal >= 0 ? pathStates : [])
    : null;

  const first = X.succ[0] || [];
  return {
    human,
    solvable: goalIdx.length > 0,
    truncated: X.truncated,
    reachable: N,
    winnable: winCount,
    deadRatio: N ? 1 - winCount / N : 0,
    optimal,
    optCount,
    solutionCount,
    walkCount,
    path,
    firstMoves: { total: first.length, safe: first.filter((j) => winnable[j]).length },
    traps,
  };
}

// ---- S->T without revisits: the linear-time characterization -----------
// A walk is a simple path whose first edge starts ON (or FIXED) and every
// later edge starts OFF (or FIXED).
function reachNoRevisitP(G) {
  if (G.s === G.t) return true;
  for (const { to: u, e } of G.adj[G.s]) {
    const w = G.edges[e].w;
    if (w !== ON && w !== FIXED) continue;
    if (u === G.t) return true;
    const seen = new Set([G.s, u]);
    const stack = [u];
    while (stack.length) {
      const x = stack.pop();
      for (const { to, e: k } of G.adj[x]) {
        const wk = G.edges[k].w;
        if (seen.has(to) || (wk !== OFF && wk !== FIXED)) continue;
        if (to === G.t) return true;
        seen.add(to);
        stack.push(to);
      }
    }
  }
  return false;
}

// ---- VISIT_ALL without revisits = Hamiltonian path in the derived graph --
function derivedEdge(G, k) {
  const e = G.edges[k];
  if (e.u === G.s || e.v === G.s) return e.w === ON || e.w === FIXED;
  return e.w === OFF || e.w === FIXED;
}

function countHamPathsDerived(G, limitN = 18) {
  if (G.n > limitN) return null;
  const nbr = Array.from({ length: G.n }, () => []);
  G.edges.forEach((e, k) => {
    if (!derivedEdge(G, k)) return;
    nbr[e.u].push(e.v);
    nbr[e.v].push(e.u);
  });
  const full = (2 ** G.n) - 1;
  let count = 0;
  const dfs = (x, mask) => {
    if (mask === full) { count++; return; }
    for (const y of nbr[x]) if (!((mask >>> y) & 1)) dfs(y, (mask | (1 << y)) >>> 0);
  };
  dfs(G.s, (1 << G.s) >>> 0);
  return count;
}

// ---- Hub decomposition (for the S->T with revisits lemma) ----------------
// Hubs: degree >= 3. Leaves: degree 1. Hallways: maximal chains of degree-2
// vertices between hubs/leaves.
function hubStructure(G) {
  const deg = G.adj.map((a) => a.length);
  const isJunction = (v) => deg[v] !== 2;
  const usedEdge = new Uint8Array(G.edges.length);
  const hallways = [];
  for (let v = 0; v < G.n; v++) {
    if (!isJunction(v) || deg[v] === 0) continue;
    for (const { to, e } of G.adj[v]) {
      if (usedEdge[e]) continue;
      const internal = [];
      const edgeList = [e];
      usedEdge[e] = 1;
      let prev = v;
      let cur = to;
      while (!isJunction(cur)) {
        internal.push(cur);
        const next = G.adj[cur].find((a) => !(a.to === prev && usedEdge[a.e]) && !usedEdge[a.e]);
        if (!next) break;
        usedEdge[next.e] = 1;
        edgeList.push(next.e);
        prev = cur;
        cur = next.to;
      }
      hallways.push({
        a: { node: v, edge: e },
        b: { node: cur, edge: edgeList[edgeList.length - 1] },
        internal,
        edges: edgeList,
      });
    }
  }
  const junctions = [];
  for (let v = 0; v < G.n; v++) if (deg[v] !== 2 && deg[v] > 0) junctions.push(v);

  const problems = [];
  if (deg[G.s] !== 1) problems.push("スタートが次数1(葉)ではない");
  if (G.t >= 0 && deg[G.t] !== 1) problems.push("ゴールが次数1(葉)ではない");
  if (G.edges.some((e) => e.w === FIXED)) problems.push("常時オンの辺がある(補題の対象外)");
  hallways.forEach((h, i) => {
    if (h.internal.length === 0) problems.push(`通路${i}: 内部頂点がない(次数2の頂点で分割が必要)`);
    if (h.a.node === h.b.node) problems.push(`通路${i}: 両端が同じハブ`);
    const inner = h.edges.slice(1, -1);
    if (inner.some((k) => G.edges[k].w !== OFF)) problems.push(`通路${i}: 内部の辺が初期オフでない`);
  });
  for (let v = 0; v < G.n; v++) {
    if (deg[v] === 2 && !hallways.some((h) => h.internal.includes(v))) problems.push("次数2の頂点だけの閉路がある");
  }
  return { deg, hallways, junctions, problems: [...new Set(problems)] };
}

// Abstract model from the lemma: each hallway end (junction, door) carries a
// bit (1 = its hub-side edge is currently walkable). Leaving junction J via
// door Y needs bit 1 and clears it; arriving at K via door X needs bit 0 and
// flips every other door bit at K.
function abstractReach(G, H, cap = 400000) {
  const ends = [];
  const doorsOf = new Map();
  H.hallways.forEach((h, i) => {
    for (const side of ["a", "b"]) {
      const id = ends.length;
      ends.push({ node: h[side].node, edge: h[side].edge, hall: i, side });
      if (!doorsOf.has(h[side].node)) doorsOf.set(h[side].node, []);
      doorsOf.get(h[side].node).push(id);
    }
  });
  const other = (id) => (id % 2 === 0 ? id + 1 : id - 1);
  const init = ends.map((d) => (G.edges[d.edge].w === ON ? 1 : 0));
  const key = (pos, bits) => `${pos}|${bits.join("")}`;
  const seen = new Set([key(G.s, init)]);
  const queue = [{ pos: G.s, bits: init }];
  let truncated = false;
  let reachesGoal = false;
  for (let qi = 0; qi < queue.length; qi++) {
    const { pos, bits } = queue[qi];
    if (pos === G.t) { reachesGoal = true; continue; }
    for (const y of doorsOf.get(pos) || []) {
      if (bits[y] !== 1) continue;
      const x = other(y);
      if (bits[x] !== 0) continue;
      const nb = bits.slice();
      nb[y] = 0;
      const k = ends[x].node;
      for (const z of doorsOf.get(k)) if (z !== x) nb[z] ^= 1;
      const kk = key(k, nb);
      if (seen.has(kk)) continue;
      if (seen.size >= cap) { truncated = true; break; }
      seen.add(kk);
      queue.push({ pos: k, bits: nb });
    }
    if (truncated) break;
  }
  return { seen, ends, reachesGoal, truncated };
}

// Check the lemma on this concrete instance: the set of concrete states in
// which the agent stands on a junction must equal the abstract model's
// reachable set (after reading door bits off the concrete edge states).
function verifyLemma(G, cap = 400000) {
  const H = hubStructure(G);
  if (H.problems.length) return { ok: false, problems: H.problems };
  const rules = { mode: "goal", revisit: true };
  const X = explore(G, rules, cap);
  const A = abstractReach(G, H, cap);
  const isJunction = new Set(H.junctions);
  const concrete = new Set();
  for (const st of X.states) {
    if (!isJunction.has(st.pos)) continue;
    const bits = A.ends.map((d) => (walkable(G, d.edge, st.f) ? 1 : 0));
    concrete.add(`${st.pos}|${bits.join("")}`);
  }
  let missingInAbstract = 0;
  let missingInConcrete = 0;
  for (const k of concrete) if (!A.seen.has(k)) missingInAbstract++;
  for (const k of A.seen) if (!concrete.has(k)) missingInConcrete++;
  const concreteGoal = X.states.some((st) => st.pos === G.t);
  return {
    ok: true,
    truncated: X.truncated || A.truncated,
    concreteStates: concrete.size,
    abstractStates: A.seen.size,
    missingInAbstract,
    missingInConcrete,
    equal: missingInAbstract === 0 && missingInConcrete === 0,
    concreteGoal,
    abstractGoal: A.reachesGoal,
    hallways: H.hallways.length,
    hubs: H.junctions.filter((v) => H.deg[v] >= 3).length,
  };
}

// Door view of a hub in the current state: which doors are open (lemma's S).
function hubDoors(G, H, f, pos) {
  const out = [];
  for (const v of H.junctions) {
    if (H.deg[v] < 3) continue;
    const doors = [];
    H.hallways.forEach((h) => {
      for (const side of ["a", "b"]) {
        if (h[side].node !== v) continue;
        const w = walkable(G, h[side].edge, f) ? 1 : 0;
        const nbr = h.internal.length ? (side === "a" ? h.internal[0] : h.internal[h.internal.length - 1]) : h[side === "a" ? "b" : "a"].node;
        doors.push({ to: nbr, open: w === 0 });
      }
    });
    out.push({ hub: v, here: v === pos, doors });
  }
  return out;
}

// ---- Human-difficulty measures for VISIT_ALL without revisits ------------
// A human prunes a partial walk at a glance when the unvisited part is cut
// off from the current vertex, some unvisited vertex has nowhere to go, or
// two or more unvisited vertices are forced dead ends (only one can be the
// last stop). "Plausible" = none of those is visible. A plausible trap is a
// move that looks fine by these checks but can no longer be completed.
function derivedAdjacency(G) {
  const adj = Array.from({ length: G.n }, () => []);
  G.edges.forEach((e, k) => {
    if (!derivedEdge(G, k)) return;
    adj[e.u].push(e.v);
    adj[e.v].push(e.u);
  });
  return adj;
}

function looksPlausible(G, dadj, st) {
  const full = fullMask(G.n);
  if (st.vm === full) return true;
  const open = (v) => v === st.pos || !((st.vm >>> v) & 1);
  let total = 0;
  for (let v = 0; v < G.n; v++) if (open(v)) total++;
  const seen = new Uint8Array(G.n);
  const stack = [st.pos];
  seen[st.pos] = 1;
  let reached = 1;
  while (stack.length) {
    const x = stack.pop();
    for (const y of dadj[x]) if (!seen[y] && open(y)) { seen[y] = 1; reached++; stack.push(y); }
  }
  if (reached !== total) return false;
  let ends = 0;
  // Forced-edge reasoning: an unvisited vertex with exactly two open
  // neighbors must use both edges, unless it is the last stop (at most one
  // vertex can be). So if 3 such corridors all run into the current vertex
  // (which takes one more edge), or 4 run into any other vertex (which takes
  // two), it's an obvious contradiction even allowing for the last stop.
  const corridorsInto = new Int32Array(G.n);
  for (let v = 0; v < G.n; v++) {
    if (v === st.pos || !open(v)) continue;
    const nb = dadj[v].filter(open);
    if (nb.length === 0) return false;
    if (nb.length === 1) ends++;
    if (nb.length === 2) { corridorsInto[nb[0]]++; corridorsInto[nb[1]]++; }
  }
  if (ends > 1) return false;
  if (corridorsInto[st.pos] >= 3) return false;
  for (let v = 0; v < G.n; v++) if (v !== st.pos && open(v) && corridorsInto[v] >= 4) return false;
  return true;
}

// Warnsdorff's rule: always step to the neighbor with the fewest onward
// options. Returns true if some tie-break of that rule completes the level.
function greedySolves(G, dadj) {
  const full = fullMask(G.n);
  const go = (pos, vm) => {
    if (vm === full) return true;
    const opts = dadj[pos].filter((y) => !((vm >>> y) & 1));
    if (!opts.length) return false;
    const deg = (y) => dadj[y].filter((z) => z !== pos && !((vm >>> z) & 1)).length;
    const best = Math.min(...opts.map(deg));
    return opts.filter((y) => deg(y) === best).some((y) => go(y, (vm | (1 << y)) >>> 0));
  };
  return go(G.s, (1 << G.s) >>> 0);
}

function humanDifficulty(G, X, winnable, pathStates) {
  const dadj = derivedAdjacency(G);
  const N = X.states.length;
  const plausible = new Uint8Array(N);
  for (let i = 0; i < N; i++) plausible[i] = looksPlausible(G, dadj, X.states[i]) ? 1 : 0;
  // How long a wrong turn keeps looking fine: longest run of plausible
  // states (BFS order is topological without revisits).
  const run = new Int32Array(N);
  for (let i = N - 1; i >= 0; i--) {
    if (!plausible[i]) continue;
    let best = 0;
    for (const j of X.succ[i] || []) if (plausible[j]) best = Math.max(best, 1 + run[j]);
    run[i] = best;
  }
  let deceptive = 0;
  for (let i = 0; i < N; i++) if (plausible[i] && !winnable[i]) deceptive++;
  const traps = [];
  let ambiguous = 0;
  for (let k = 0; k + 1 < pathStates.length; k++) {
    const i = pathStates[k];
    const looksOk = (X.succ[i] || []).filter((j) => plausible[j]);
    if (looksOk.length >= 2) ambiguous++;
    for (const j of looksOk) {
      if (!winnable[j]) traps.push({ step: k + 1, from: X.states[i].pos, to: X.states[j].pos, depth: 1 + run[j] });
    }
  }
  return {
    plausibleTraps: traps,
    ambiguousSteps: ambiguous,
    deceptiveStates: deceptive,
    greedySolves: greedySolves(G, dadj),
  };
}

const api = {
  OFF, ON, FIXED, MAX_VERTICES,
  compile, walkable, tracksVisited, initialState, isGoal, legalMoves, step,
  explore, analyze, reachNoRevisitP, derivedEdge, countHamPathsDerived,
  hubStructure, abstractReach, verifyLemma, hubDoors,
  derivedAdjacency, looksPlausible,
};
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.IFWEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
