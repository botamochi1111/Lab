// Pure rules of Incident Flip Walk — no DOM, no rendering. Arriving at a
// vertex flips every edge incident to it between walkable (1) and blocked (0).

export function edgeKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function cloneEdges(edges) {
  const m = new Map();
  for (const [u, v, w] of edges) m.set(edgeKey(u, v), w);
  return m;
}

export function getNeighbors(vertex, lv) {
  const nbs = [];
  for (const [u, v] of lv.edges) {
    if (u === vertex) nbs.push(v);
    else if (v === vertex) nbs.push(u);
  }
  return nbs;
}

export function isWalkable(u, v, edgeMap) {
  return edgeMap.get(edgeKey(u, v)) === 1;
}

export function flipIncident(vertex, edgeMap, lv) {
  for (const nb of getNeighbors(vertex, lv)) {
    const k = edgeKey(vertex, nb);
    edgeMap.set(k, edgeMap.get(k) === 1 ? 0 : 1);
  }
}

export function legalMoves(lv, st, canRevisit) {
  let moves = getNeighbors(st.pos, lv).filter((nb) => isWalkable(st.pos, nb, st.edges));
  if (!canRevisit && st.visited) {
    moves = moves.filter((nb) => !st.visited.has(nb));
  }
  return moves;
}

// BFS/DFS over the (position, edge-mask, visited-mask) state space to find an
// optimal or any solution path. Used by the level generator to check
// solvability and pick a good candidate.
export function bfsSolveFrom(lv, st, mode, canRevisit) {
  const totalVertices = Object.keys(lv.vertices).length;
  const initialVisited = st.visited || new Set([st.pos]);

  const adj = {};
  Object.keys(lv.vertices).forEach((id) => (adj[id] = []));
  lv.edges.forEach(([u, v], idx) => {
    adj[u].push({ to: v, edgeIdx: idx });
    adj[v].push({ to: u, edgeIdx: idx });
  });

  const vertexIndexMap = new Map();
  Object.keys(lv.vertices).forEach((id, idx) => vertexIndexMap.set(id, idx));

  const flipMasks = {};
  for (const id of Object.keys(lv.vertices)) {
    let fmask = 0n;
    lv.edges.forEach(([u, v], idx) => {
      if (u === id || v === id) fmask |= 1n << BigInt(idx);
    });
    flipMasks[id] = fmask;
  }

  let startMask = 0n;
  lv.edges.forEach(([u, v], idx) => {
    if (st.edges.get(edgeKey(u, v)) === 1) startMask |= 1n << BigInt(idx);
  });

  let startVisitedMask = 0n;
  for (const vId of initialVisited) {
    startVisitedMask |= 1n << BigInt(vertexIndexMap.get(vId));
  }

  const targetVisitedMask = (1n << BigInt(totalVertices)) - 1n;
  const queue = [{ pos: st.pos, mask: startMask, visitedMask: startVisitedMask, path: [] }];
  const ser = (pos, mask, visitedMask) => `${pos}|${mask.toString()}|${visitedMask.toString()}`;
  const seen = new Set([ser(st.pos, startMask, startVisitedMask)]);
  let statesChecked = 0;

  const useDfs = totalVertices >= (mode === "goal" ? 20 : 12);
  const maxStates = useDfs ? 40000 : 8000;
  const maxPathLength = Math.max(100, totalVertices * 2);

  while (queue.length) {
    statesChecked++;
    if (statesChecked > maxStates) return null;
    const cur = useDfs ? queue.pop() : queue.shift();

    if (mode === "goal") {
      if (cur.pos === lv.goal) return cur.path;
    } else if (cur.visitedMask === targetVisitedMask) {
      return cur.path;
    }
    if (cur.path.length >= maxPathLength) continue;

    for (const { to, edgeIdx } of adj[cur.pos]) {
      const walkable = (cur.mask & (1n << BigInt(edgeIdx))) !== 0n;
      if (!walkable) continue;
      const toIdx = BigInt(vertexIndexMap.get(to));
      const wasVisited = (cur.visitedMask & (1n << toIdx)) !== 0n;
      if (!canRevisit && wasVisited) continue;

      const nextMask = cur.mask ^ flipMasks[to];
      const nextVisitedMask = cur.visitedMask | (1n << toIdx);
      const k = ser(to, nextMask, nextVisitedMask);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push({ pos: to, mask: nextMask, visitedMask: nextVisitedMask, path: [...cur.path, to] });
      }
    }
  }
  return null;
}
