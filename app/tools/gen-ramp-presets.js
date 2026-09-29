// Regenerates the 30 VISIT_ALL game stages with a steep difficulty ramp:
// stage 1 has 6 vertices, stage 3 is already a real puzzle, and size keeps
// growing after that. Every stage has exactly one solution, is not solved by
// the "fewest exits first" rule (where possible), and stays readable (few,
// wide-angle crossings). Built with readable-core.js.
//
// Stages are slow to search, so generation is split up and can run in
// parallel; assembling rewrites PRESETS_ALL in www/presets.js and keeps
// PRESETS_GOAL as it is. The first stages use a tidy lattice; each group is
// ordered by measured difficulty.
//
// usage:
//   node tools/gen-ramp-presets.js <from> <to>   generate stages into tools/out/ramp/
//   node tools/gen-ramp-presets.js assemble      write www/presets.js

const fs = require("fs");
const path = require("path");
const { makeReadableLevel } = require("./readable-core.js");

const LEVEL_COUNT = 30;
const OUT_DIR = path.join(__dirname, "out", "ramp");
const PRESETS = path.join(__dirname, "..", "www", "presets.js");

// Vertex count per stage: 6, 8, 10, then +1 roughly every other stage, up to 20.
function sizeFor(i) {
  if (i <= 3) return [6, 8, 10][i - 1];
  return Math.min(20, 10 + Math.ceil((i - 3) / 2));
}

// The first stages each use a different tidy shape with only neighbor edges
// and no crossings, so they look clean without all looking alike.
const EARLY = [
  { shape: "triangle", rows: 3, maxLen: 200 },                                        // 6
  { shape: "square", cols: 3, rows: 3, maxLen: 250 },                                 // 9
  { shape: "rings", counts: [5, 5], radii: [110, 250], maxLen: 300 },                 // 10
  { points: "grid", cols: 4, rows: 3, jitter: 0, maxLen: 200 },                       // 12
  { shape: "rings", counts: [6, 6], radii: [120, 260], rotations: [0, 30], maxLen: 280 }, // 12
  { shape: "square", cols: 4, rows: 3, maxLen: 250 },                                 // 12
];

function specFor(i) {
  if (i <= EARLY.length) {
    const e = EARLY[i - 1];
    // Small shapes may have no room to disguise the end; take what fits.
    return { points: "shape", ...e, maxCross: 0, iters: 150, extraDecoys: 2, minEndDecoys: 0 };
  }
  const n = sizeFor(i);
  return {
    points: "scatter",
    n,
    maxCross: n <= 8 ? 1 : n <= 12 ? 2 : n <= 16 ? 3 : 4,
    iters: n <= 10 ? 150 : 250,
    extraDecoys: n <= 8 ? 1 : 2,
  };
}

// Game format: start is "s", other vertices get numeric labels.
function toGameLevel(level, i) {
  const rename = new Map();
  let k = 1;
  for (const id of Object.keys(level.vertices)) rename.set(id, id === level.start ? "s" : `v${k++}`);
  const vertices = {};
  for (const [id, p] of Object.entries(level.vertices)) {
    const nid = rename.get(id);
    vertices[nid] = { x: p.x, y: p.y, label: nid === "s" ? "s" : nid.slice(1), role: nid === "s" ? "start" : null };
  }
  return {
    name: `Level ${i}`,
    vertices,
    edges: level.edges.map(([u, v, w]) => [rename.get(u), rename.get(v), w]),
    start: "s",
    goal: null,
  };
}

function generate(i) {
  const spec = specFor(i);
  for (let attempt = 0; attempt < 40; attempt++) {
    // Tiny stages may have no greedy-proof layout at all; allow it only as a last resort.
    const res = makeReadableLevel({ ...spec, seed: i * 1000 + attempt, allowGreedy: attempt >= 20 });
    if (!res) continue;
    const out = { ...toGameLevel(res.level, i), _stats: res.stats };
    fs.writeFileSync(path.join(OUT_DIR, `level-${i}.json`), JSON.stringify(out));
    console.log(`Level ${i}: ${JSON.stringify(res.stats)}`);
    return;
  }
  throw new Error(`failed to generate level ${i}`);
}

function assemble() {
  const loaded = [];
  for (let i = 1; i <= LEVEL_COUNT; i++) loaded.push(JSON.parse(fs.readFileSync(path.join(OUT_DIR, `level-${i}.json`), "utf8")));
  // The lattice stages stay first in order; size only roughly tracks
  // difficulty after that, so the rest are ordered by measured difficulty.
  const early = loaded.slice(0, EARLY.length).sort((a, b) => a._stats.difficulty - b._stats.difficulty);
  const all = [...early, ...loaded.slice(EARLY.length).sort((a, b) => a._stats.difficulty - b._stats.difficulty)];
  all.forEach((lv, k) => {
    const s = lv._stats;
    lv.name = `Level ${k + 1}`;
    console.log(`Level ${k + 1}: V=${s.n} walks=${s.walks} traps=${s.plausibleTraps} maxDepth=${s.maxDepth} ambiguous=${s.ambiguous}/${s.steps} greedy=${s.greedySolves} crossings=${s.crossings} difficulty=${s.difficulty}`);
    delete lv._stats;
  });
  const src = fs.readFileSync(PRESETS, "utf8");
  const goal = src.match(/const PRESETS_GOAL = (.*);\n/)[1];
  const out =
    "const PRESETS_GOAL = " + goal + ";\n\n" +
    "const PRESETS_ALL = " + JSON.stringify(all) + ";\n\n" +
    "window.PRESETS_GOAL = PRESETS_GOAL;\nwindow.PRESETS_ALL = PRESETS_ALL;\n";
  fs.writeFileSync(PRESETS, out);
  console.log("wrote www/presets.js");
}

fs.mkdirSync(OUT_DIR, { recursive: true });
if (process.argv[2] === "assemble") assemble();
else {
  const from = Number(process.argv[2] || 1), to = Number(process.argv[3] || LEVEL_COUNT);
  for (let i = from; i <= to; i++) generate(i);
}
