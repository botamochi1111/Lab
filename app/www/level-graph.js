// The stage list is stored flat (Level 1, 2, 3, ...) but progression through
// it isn't a single line. Where forks land, how many branches each one opens
// (2 or 3), and how long each individual branch runs before merging back are
// all drawn from a seeded random generator -- not a hand-authored pattern
// that repeats -- so the shape actually looks organic instead of stamped out.
// The seed is derived from the stage count, so a given preset list always
// lays out the same way (the map doesn't reshuffle under the player's feet
// every time it re-renders), but different-length lists look different.
//
//   ...-> [fork] -+-> [branch] -> [branch] -+-> [merge] -> ...
//                 +-> [branch] -------------+
//                 +-> [branch] -> [branch] -> [branch] -+   (branches can run
//                                                            different lengths)

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map();

function buildOnce(total, seed) {
  const rand = mulberry32(seed);
  const role = new Array(total).fill("normal");
  const children = new Array(total).fill(null);
  const forks = [];
  let i = 0;

  while (i < total) {
    // Usually 1-4 stages before the next fork; occasionally 0, so the fork
    // lands right on the merge that just closed and forks chain back-to-back.
    // The very first fork always gets a couple of lead-in stages.
    const chained = i > 0 && rand() < 0.15;
    const gap = i === 0 ? 2 + Math.floor(rand() * 2) : chained ? 0 : 1 + Math.floor(rand() * 4);
    let steps = 0;
    while (steps < gap && i < total - 1) {
      children[i] = [i + 1];
      i++;
      steps++;
    }
    if (i >= total - 1) break; // no room left for another fork

    // Branches are normally a single stage; only occasionally does one branch
    // run longer (2-3 stages) before merging back.
    const branchCount = rand() < 0.3 ? 3 : 2;
    const shape = new Array(branchCount).fill(1);
    if (rand() < 0.25) shape[Math.floor(rand() * branchCount)] = 2 + Math.floor(rand() * 2);
    const branchStages = shape.reduce((a, b) => a + b, 0);
    const mergeIndex = i + branchStages + 1;
    if (mergeIndex >= total) break; // not enough stages left to fit this fork

    role[i] = "fork";
    const kids = [];
    let cursor = i + 1;
    for (const len of shape) {
      kids.push(cursor); // fork's direct children = each branch's first stage
      for (let s = 0; s < len; s++) {
        const idx = cursor + s;
        role[idx] = "branch";
        children[idx] = s === len - 1 ? [mergeIndex] : [cursor + s + 1];
      }
      cursor += len;
    }
    children[i] = kids;
    forks.push({ shape, chained });
    i = mergeIndex;
  }

  for (; i < total; i++) {
    if (children[i] === null) children[i] = i + 1 < total ? [i + 1] : [];
  }
  return { role, children, forks };
}

// A single seed can clump (e.g. every fork coming out 3-way and one stage
// deep), which reads as the same shape repeated. Reroll until the map has
// the intended mix: 2-way and 3-way forks, an occasional longer branch (but
// not most of them), an occasional back-to-back fork, and no one shape
// dominating.
function isVaried(forks) {
  if (forks.length < 3) return false;
  const long = forks.filter((f) => Math.max(...f.shape) > 1).length;
  const threeWay = forks.filter((f) => f.shape.length === 3).length;
  const distinct = new Set(forks.map((f) => f.shape.join("/"))).size;
  return (
    long >= 1 && long <= Math.ceil(forks.length / 3) &&
    threeWay >= 1 && threeWay < forks.length &&
    forks.some((f) => f.chained) &&
    distinct >= Math.min(3, forks.length)
  );
}

function buildSchedule(total) {
  let last = null;
  for (let attempt = 0; attempt < 500; attempt++) {
    last = buildOnce(total, (total * 2654435761 + attempt * 40503) >>> 0);
    if (isVaried(last.forks)) break;
  }
  return last;
}

function scheduleFor(total) {
  let s = cache.get(total);
  if (!s) {
    s = buildSchedule(total);
    cache.set(total, s);
  }
  return s;
}

export function forkRole(i, total) {
  return scheduleFor(total).role[i] || "normal";
}

// Indices that clearing/skipping `i` should unlock.
export function getChildren(i, total) {
  return scheduleFor(total).children[i] || [];
}
