const fs = require("fs");
const path = require("path");

function edgeKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function generatePlanarLayeredGraph(layerSizes, density = 0.5, hasGoal = true, intraProb = 0.3) {
  const layerCount = layerSizes.length;
  const groups = Array.from({ length: layerCount }, () => []);

  groups[0] = ["s"];
  let vid = 1;
  for (let i = 1; i < layerCount - 1; i++) {
    for (let j = 0; j < layerSizes[i]; j++) {
      groups[i].push(`v${vid++}`);
    }
  }
  if (hasGoal) {
    groups[layerCount - 1] = ["t"];
  } else {
    for (let j = 0; j < layerSizes[layerCount - 1]; j++) {
      groups[layerCount - 1].push(`v${vid++}`);
    }
  }

  const ids = groups.flat();
  const layerOf = new Map();
  groups.forEach((g, L) => g.forEach((id) => layerOf.set(id, L)));

  const edgePairs = [];
  const seen = new Set();
  const addEdge = (u, v) => {
    const k = edgeKey(u, v);
    if (!seen.has(k)) {
      seen.add(k);
      edgePairs.push([u, v]);
    }
  };

  // Connect adjacent layers monotonically to prevent crossings
  for (let i = 0; i < layerCount - 1; i++) {
    const L1 = groups[i];
    const L2 = groups[i + 1];
    const m = L1.length;
    const n = L2.length;

    let a = 0, b = 0;
    addEdge(L1[a], L2[b]);
    while (a < m - 1 || b < n - 1) {
      if (a === m - 1) {
        b++;
      } else if (b === n - 1) {
        a++;
      } else {
        if (Math.random() < 0.5) {
          a++;
        } else {
          b++;
        }
      }
      addEdge(L1[a], L2[b]);
    }

    // Add extra non-crossing edges
    const currentEdges = edgePairs.filter(([u, v]) => {
      const lu = layerOf.get(u);
      const lv = layerOf.get(v);
      return (lu === i && lv === i + 1) || (lu === i + 1 && lv === i);
    }).map(([u, v]) => {
      const isUL1 = L1.includes(u);
      const uVal = isUL1 ? u : v;
      const vVal = isUL1 ? v : u;
      return [L1.indexOf(uVal), L2.indexOf(vVal)];
    });

    for (let x = 0; x < m; x++) {
      for (let y = 0; y < n; y++) {
        if (Math.random() < density) {
          const crosses = currentEdges.some(([cx, cy]) => {
            return (x - cx) * (y - cy) < 0;
          });
          if (!crosses) {
            addEdge(L1[x], L2[y]);
            currentEdges.push([x, y]);
          }
        }
      }
    }
  }

  // Add adjacent intra-layer vertical edges
  for (let i = 0; i < layerCount; i++) {
    const L = groups[i];
    for (let j = 0; j < L.length - 1; j++) {
      if (Math.random() < intraProb) {
        addEdge(L[j], L[j + 1]);
      }
    }
  }

  return { ids, edgePairs, groups, layerOf };
}

function layoutLayered(groups) {
  const vertices = {};
  const marginX = 90;
  const marginY = 90;
  const layerCount = groups.length;

  // Find the maximum layer size to calculate dynamic vertical height
  let maxSize = 1;
  groups.forEach(g => {
    if (g.length > maxSize) maxSize = g.length;
  });

  const layerSpacing = 140; // Horizontal spacing between layers
  const rowSpacing = 140;   // Vertical spacing between rows in the same layer

  const width = Math.max(1000 - marginX * 2, (layerCount - 1) * layerSpacing);
  // Height dynamically scales based on maxSize to stretch the graph vertically
  const height = Math.max(700 - marginY * 2, (maxSize - 1) * rowSpacing);

  groups.forEach((g, L) => {
    const baseX = marginX + (layerCount === 1 ? width / 2 : (L / (layerCount - 1)) * width);
    
    // Vertically center the nodes of this layer inside the total height
    const layerHeight = (g.length - 1) * rowSpacing;
    const startY = marginY + (height - layerHeight) / 2;

    g.forEach((id, i) => {
      const baseY = startY + rowSpacing * i;
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

function bfs(lv, mode = "goal", useDfs = false, noRevisit = true) {
  const totalVertices = Object.keys(lv.vertices).length;
  
  // Convert initial edges to BigInt bitmask
  let startMask = 0n;
  lv.edges.forEach(([u, v], idx) => {
    if (v !== undefined && u !== undefined) {
      const state = lv.edges[idx][2];
      if (state === 1) {
        startMask |= (1n << BigInt(idx));
      }
    }
  });

  // Precompute BigInt flip masks for each vertex
  const flipMasks = {};
  for (const id of Object.keys(lv.vertices)) {
    let fmask = 0n;
    lv.edges.forEach(([u, v], idx) => {
      if (u === id || v === id) {
        fmask |= (1n << BigInt(idx));
      }
    });
    flipMasks[id] = fmask;
  }

  // Precompute adjacency list with edge indices
  const adj = {};
  Object.keys(lv.vertices).forEach(id => adj[id] = []);
  lv.edges.forEach(([u, v], idx) => {
    adj[u].push({ to: v, edgeIdx: idx });
    adj[v].push({ to: u, edgeIdx: idx });
  });

  // Create mapping from vertex ID to index for BigInt visited bitmask
  const vertexIndexMap = new Map();
  Object.keys(lv.vertices).forEach((id, idx) => {
    vertexIndexMap.set(id, idx);
  });

  const startVisitedMask = (1n << BigInt(vertexIndexMap.get(lv.start)));

  // Optimize: Storing only depth number and visited BigInt bitmask
  const q = [{ 
    pos: lv.start, 
    mask: startMask, 
    visitedMask: startVisitedMask, 
    visitedSize: 1,
    depth: 0 
  }];
  
  const ser = (pos, mask, visitedMask) => {
    return `${pos}|${mask.toString()}|${visitedMask.toString()}`;
  };
  
  const seen = new Set([ser(lv.start, startMask, q[0].visitedMask)]);
  let statesChecked = 0;
  const maxStates = useDfs ? 150000 : 100000;

  while (q.length) {
    statesChecked++;
    if (statesChecked > maxStates) return null;
    
    const c = useDfs ? q.pop() : q.shift();
    if (mode === "goal") {
      if (c.pos === lv.goal) return { length: c.depth };
    } else {
      if (c.visitedSize === totalVertices) return { length: c.depth };
    }
    
    const neighbors = adj[c.pos];
    for (const { to, edgeIdx } of neighbors) {
      // Is walkable?
      const isWalkable = (c.mask & (1n << BigInt(edgeIdx))) !== 0n;
      if (!isWalkable) continue;

      const toIdx = BigInt(vertexIndexMap.get(to));
      const wasVisited = (c.visitedMask & (1n << toIdx)) !== 0n;

      // Enforce noRevisit rules if enabled: cannot visit a node that was already visited
      if (noRevisit && wasVisited) continue;

      const nextMask = c.mask ^ flipMasks[to];
      const nextVisitedMask = c.visitedMask | (1n << toIdx);
      const nextVisitedSize = wasVisited ? c.visitedSize : c.visitedSize + 1;

      const key = ser(to, nextMask, nextVisitedMask);
      if (!seen.has(key)) {
        seen.add(key);
        q.push({
          pos: to,
          mask: nextMask,
          visitedMask: nextVisitedMask,
          visitedSize: nextVisitedSize,
          depth: c.depth + 1
        });
      }
    }
  }
  return null;
}

function generateLevel(name, layerSizes, minOpt, maxOpt, mode = "goal") {
  const hasGoal = mode === "goal";
  const estV = layerSizes.reduce((sum, size) => sum + size, 0);
  const threshold = 20; // 20 vertices for both modes to manage search scaling
  const firstLoopAttempts = estV < threshold ? 20000 : 2000;
  const intraProb = mode === "all" ? 0.90 : 0.30; // High vertical edge probability for Visit All mode
  
  // Both modes must be solvable WITHOUT revisit (No Revisit is the default game state)
  const enforceNoRevisit = true;

  for (let attempt = 0; attempt < firstLoopAttempts; attempt++) {
    const graph = generatePlanarLayeredGraph(layerSizes, 0.45, hasGoal, intraProb);
    
    // Prune mathematically unsolvable graphs for Visit All mode
    if (mode === "all") {
      const degrees = {};
      for (const g of graph.groups) {
        g.forEach(id => degrees[id] = 0);
      }
      graph.edgePairs.forEach(([u, v]) => {
        degrees[u] = (degrees[u] || 0) + 1;
        degrees[v] = (degrees[v] || 0) + 1;
      });
      let degree1Count = 0;
      let unsolvable = false;
      for (const id of Object.keys(degrees)) {
        const deg = degrees[id];
        if (deg === 0) {
          unsolvable = true;
          break;
        }
        if (deg === 1 && id !== "s") {
          degree1Count++;
        }
      }
      if (unsolvable || degree1Count > 1) {
        continue;
      }
    }

    // Random edge state assignment
    const rawEdges = graph.edgePairs.map(([u, v]) => {
      return [u, v, Math.random() < 0.45 ? 1 : 0];
    });

    const lv = {
      name,
      vertices: layoutLayered(graph.groups),
      edges: rawEdges,
      start: "s",
      goal: hasGoal ? "t" : null
    };

    const sol = bfs(lv, mode, mode === "all" || estV >= threshold, enforceNoRevisit);
    if (sol) {
      const vCount = Object.keys(lv.vertices).length;
      if (vCount < threshold && mode !== "all") {
        if (sol.length >= minOpt && sol.length <= maxOpt) {
          return { ...lv, _optimal: sol.length };
        }
      } else {
        return { ...lv, _optimal: sol.length };
      }
    }
  }

  // Fallback to retry with wider bounds and more attempts
  const fallbackAttempts = estV < threshold ? 10000 : 8000;
  for (let attempt = 0; attempt < fallbackAttempts; attempt++) {
    const graph = generatePlanarLayeredGraph(layerSizes, 0.65, hasGoal, intraProb);
    
    // Prune mathematically unsolvable graphs for Visit All mode
    if (mode === "all") {
      const degrees = {};
      for (const g of graph.groups) {
        g.forEach(id => degrees[id] = 0);
      }
      graph.edgePairs.forEach(([u, v]) => {
        degrees[u] = (degrees[u] || 0) + 1;
        degrees[v] = (degrees[v] || 0) + 1;
      });
      let degree1Count = 0;
      let unsolvable = false;
      for (const id of Object.keys(degrees)) {
        const deg = degrees[id];
        if (deg === 0) {
          unsolvable = true;
          break;
        }
        if (deg === 1 && id !== "s") {
          degree1Count++;
        }
      }
      if (unsolvable || degree1Count > 1) {
        continue;
      }
    }

    const baseProb = mode === "all" ? 0.70 : 0.55;
    const maxProb = mode === "all" ? 0.95 : 0.85;
    const activeProb = baseProb + (maxProb - baseProb) * (attempt / fallbackAttempts);
    const rawEdges = graph.edgePairs.map(([u, v]) => [u, v, Math.random() < activeProb ? 1 : 0]);
    const lv = {
      name,
      vertices: layoutLayered(graph.groups),
      edges: rawEdges,
      start: "s",
      goal: hasGoal ? "t" : null
    };
    const sol = bfs(lv, mode, mode === "all" || estV >= threshold, enforceNoRevisit);
    if (sol) {
      return { ...lv, _optimal: sol.length };
    }
  }
  throw new Error(`Failed to generate solvable level for ${name}`);
}

const goalSpecs = [];
for (let i = 1; i <= 20; i++) {
  const layerCount = 3 + Math.floor((i - 1) * 0.5); // Grows from 3 to 12 layers
  const minSize = i < 5 ? 1 : i < 10 ? 2 : 3;
  const maxSize = i < 4 ? 2 : (i < 8 ? 4 : (i < 12 ? 6 : (i < 16 ? 8 : 10))); // Vertical height grows up to 10
  const layers = [];
  layers.push(1);
  for (let L = 1; L < layerCount - 1; L++) {
    layers.push(Math.min(maxSize, minSize + Math.floor(Math.random() * (maxSize - minSize + 1))));
  }
  layers.push(1); // Target goal layer
  
  const minOpt = Math.min(25, 2 + Math.floor((i - 1) * 0.9));
  const maxOpt = minOpt + 6;
  goalSpecs.push({ name: `Level ${i}`, layers, min: minOpt, max: maxOpt });
}

const allSpecs = [];
for (let i = 1; i <= 20; i++) {
  const layerCount = 3 + Math.floor((i - 1) * 0.25); // Grows from 3 to 7 layers
  const minSize = 2; // Always keep size >= 2 for Visit All mode to prevent bottlenecks
  const maxSize = i < 5 ? 2 : (i < 10 ? 3 : 4); // Vertical height grows up to 4 to balance Hamiltonian path solvability
  const layers = [];
  layers.push(1);
  for (let L = 1; L < layerCount - 1; L++) {
    layers.push(Math.min(maxSize, minSize + Math.floor(Math.random() * (maxSize - minSize + 1))));
  }
  layers.push(Math.min(maxSize, minSize + Math.floor(Math.random() * (maxSize - minSize + 1)))); // NoGoal last layer
  
  const minOpt = Math.min(25, 3 + Math.floor((i - 1) * 0.8));
  const maxOpt = minOpt + 6;
  allSpecs.push({ name: `Level ${i}`, layers, min: minOpt, max: maxOpt });
}

console.log("Generating Goal Mode Presets (20 levels)...");
const presetsGoal = goalSpecs.map(spec => {
  const lv = generateLevel(spec.name, spec.layers, spec.min, spec.max, "goal");
  console.log(`Generated Goal Level: ${lv.name} (V=${Object.keys(lv.vertices).length}, E=${lv.edges.length}, opt=${lv._optimal})`);
  return lv;
});

console.log("\nGenerating Visit All Mode Presets (20 levels)...");
const presetsAll = allSpecs.map(spec => {
  const lv = generateLevel(spec.name, spec.layers, spec.min, spec.max, "all");
  console.log(`Generated Visit All Level: ${lv.name} (V=${Object.keys(lv.vertices).length}, E=${lv.edges.length}, opt=${lv._optimal})`);
  return lv;
});

const out = {
  goal: presetsGoal,
  all: presetsAll
};

// Write JSON
fs.writeFileSync(path.join(__dirname, "presets.json"), JSON.stringify(out, null, 2));
console.log("\nWrote presets.json");

// Write JS (readable JS constants)
const jsContent = `// Auto-generated level presets for Incident Flip Walk
const PRESETS_GOAL = ${JSON.stringify(presetsGoal, null, 2)};

const PRESETS_ALL = ${JSON.stringify(presetsAll, null, 2)};
`;
fs.writeFileSync(path.join(__dirname, "presets.js"), jsContent);
console.log("Wrote presets.js");
