// Renders the real level list as a compact snake path (like a mobile game's
// level-select map) that forks into 2 or 3 parallel stages and merges back,
// at irregular intervals (see level-graph.js) -- not one fixed shape stamped
// out every N stages. Plus an occasional "hard remix" side branch. Colored by
// real progress state. Regenerated on demand by game.js whenever the mode,
// level, or progress changes.
//
// Layout: normal stages snake left/right/left across COLS lanes so a long
// stage list stays short and needs far less vertical scrolling than a single
// straight column would. A fork stage re-centers to the middle lane; its
// branches (2 or 3 of them) spread across the lanes one row down, sharing a
// row instead of stacking; the merge stage picks the snake back up from the
// middle lane. Connectors are drawn as soft S-curves rather than straight
// segments so the map reads as a hand-laid trail, not a wiring diagram.

import { getChildren, forkRole } from "./level-graph.js";

const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs) => {
  const node = document.createElementNS(NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  return node;
};

const COLS = 3;
const MARGIN_X = 40;
const LANE_SPACING = 66;
const ROW_SPACING = 50;
const TOP_MARGIN = 34;
const BONUS_EVERY = 4;
const BONUS_REACH = 62; // how far the bonus branch sticks out (longer = clearer detour)
const NODE_R = 12;
const HIT_R = 21;

const BRANCH_COLS = { 1: [1], 2: [0, 2], 3: [0, 1, 2] };
const JITTER_X = 9;
const BOW_MAX = 16;

// Deterministic 0..1 pseudo-random from an integer -- stable across
// re-renders (the map shouldn't reshuffle under the player mid-session) but
// different per node/edge, so the grid doesn't look perfectly machine-drawn.
function hash01(n) {
  let x = (n ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = x ^ (x >>> 16);
  return (x >>> 0) / 4294967296;
}

// Walks the flat stage list and assigns each index a (row, col) grid slot.
// A fork's branches can run for more than one stage before merging, and
// different branches on the same fork can run different lengths -- so each
// branch is walked as its own little chain in a fixed lane, and the merge
// row is wherever the longest branch on that fork finishes.
function computeLayout(count) {
  const pos = new Array(count);
  let row = 0;
  let col = 0;
  let dir = 1;
  let i = 0;
  while (i < count) {
    if (forkRole(i, count) === "fork") {
      const kids = getChildren(i, count); // each branch's first stage
      // Always start the fork on a fresh row -- the snake cursor may already
      // be sitting in the middle lane from the preceding normal stage, and
      // reusing that row would draw the fork right on top of it.
      row += 1;
      const forkRow = row;
      pos[i] = { row: forkRow, col: 1 };
      const cols = BRANCH_COLS[kids.length] || BRANCH_COLS[2];

      let mergeIndex = null;
      let maxLen = 1;
      kids.forEach((startIdx, k) => {
        let idx = startIdx;
        let r = forkRow + 1;
        for (;;) {
          pos[idx] = { row: r, col: cols[k] };
          const next = getChildren(idx, count)[0];
          if (forkRole(next, count) !== "branch") { mergeIndex = next; break; }
          idx = next;
          r += 1;
        }
        maxLen = Math.max(maxLen, r - forkRow);
      });

      // Land back on the middle lane for the merge row, then let the normal
      // snake logic below place the merge stage itself (and advance past it)
      // -- it's a plain stage from here on out.
      row = forkRow + maxLen + 1;
      col = 1;
      i = mergeIndex;
      continue;
    }
    pos[i] = { row, col };
    col += dir;
    if (col >= COLS) { col = COLS - 1; dir = -1; row += 1; }
    else if (col < 0) { col = 0; dir = 1; row += 1; }
    i += 1;
  }
  return { pos, rows: row + 1 };
}

// A soft S-curve instead of a straight line, with a small random sideways
// bow so curves don't all mirror each other -- reads as a laid-out trail
// rather than a schematic connector.
function curvePath(x1, y1, x2, y2, seed) {
  const midY = (y1 + y2) / 2;
  const bow = (hash01(seed) - 0.5) * 2 * BOW_MAX;
  return `M ${x1} ${y1} C ${x1 + bow} ${midY}, ${x2 + bow} ${midY}, ${x2} ${y2}`;
}

function nodeGroup({ x, y, r, state, label, onTap }) {
  const g = el("g", { class: "stage-node" + (state === "current" ? " stage-pulse" : ""), "data-state": state });
  g.appendChild(el("circle", { cx: x, cy: y, r: HIT_R, fill: "transparent", "pointer-events": "all" }));
  g.appendChild(el("circle", { cx: x, cy: y, r, class: "stage-node-body" }));
  const text = el("text", { x, y, dy: "3", "text-anchor": "middle", "font-size": "8" });
  text.textContent = label;
  g.appendChild(text);
  g.addEventListener("click", onTap);
  return g;
}

export function renderStageMap(svg, { presets, progress, currentIndex, onSelect, onBonus }) {
  svg.innerHTML = "";
  const count = presets.length;
  const { pos, rows } = computeLayout(count);

  const laneX = (col) => MARGIN_X + BONUS_REACH + col * LANE_SPACING;
  const rowY = (row) => TOP_MARGIN + row * ROW_SPACING;
  // A small per-node jitter, seeded by index, so nodes don't all sit dead-on
  // a grid intersection -- the topology is already irregular, this makes the
  // drawing look it too.
  const xFor = (i) => laneX(pos[i].col) + (hash01(i * 2 + 1) - 0.5) * 2 * JITTER_X;
  const yFor = (i) => rowY(pos[i].row);

  const width = MARGIN_X * 2 + BONUS_REACH * 2 + (COLS - 1) * LANE_SPACING;
  const height = rowY(rows - 1) + TOP_MARGIN;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));

  const nodeState = (i) => {
    const locked = !progress.unlocked[i];
    const cleared = !!progress.cleared[i];
    const skipped = !!progress.skipped[i];
    if (i === currentIndex) return "current";
    if (locked) return "locked";
    if (skipped) return "skipped";
    if (cleared) return "cleared";
    return "open";
  };

  const gEdges = el("g", {});
  for (let i = 0; i < count; i++) {
    for (const child of getChildren(i, count)) {
      // Style by the DESTINATION's unlock state, not the source's — an edge
      // leading into a still-locked stage must not look "live".
      const childLocked = !progress.unlocked[child];
      gEdges.appendChild(el("path", {
        d: curvePath(xFor(i), yFor(i), xFor(child), yFor(child), i * 97 + child),
        fill: "none",
        class: "stage-edge" + (childLocked ? " locked" : " live"),
      }));
    }
  }
  svg.appendChild(gEdges);

  const gNodes = el("g", {});
  for (let i = 0; i < count; i++) {
    const locked = !progress.unlocked[i];
    gNodes.appendChild(nodeGroup({
      x: xFor(i), y: yFor(i), r: i === currentIndex ? NODE_R + 3 : NODE_R,
      state: nodeState(i), label: String(i + 1),
      onTap: () => {
        if (locked) return;
        onSelect(i);
      },
    }));

    // Occasional "hard remix" side branch off a normal (non-fork) stage —
    // pushed out beyond whichever edge lane it's closest to, so it reads as
    // a clearly-detached side pocket rather than part of the main path.
    if (forkRole(i, count) === "normal" && i % BONUS_EVERY === BONUS_EVERY - 1 && i < count - 1) {
      const col = pos[i].col;
      const dir = col <= (COLS - 1) / 2 ? -1 : 1;
      // A middle-lane source needs a longer reach -- one lane-width of push
      // would just land the bonus node on top of the neighboring lane.
      const reach = col === 1 ? LANE_SPACING + 40 : BONUS_REACH;
      const bx = xFor(i) + dir * reach;
      const by = yFor(i) - ROW_SPACING * 0.35;
      gEdges.insertBefore(
        el("path", {
          d: curvePath(xFor(i), yFor(i), bx, by, i * 53 + 7),
          fill: "none",
          class: "stage-edge bonus" + (locked ? " locked" : ""),
        }),
        gEdges.firstChild
      );
      gNodes.appendChild(nodeGroup({
        x: bx, y: by, r: NODE_R - 2, state: locked ? "locked" : "bonus", label: "!",
        onTap: () => {
          if (locked) return;
          onBonus(i);
        },
      }));
    }
  }
  svg.appendChild(gNodes);

  const scrollBox = svg.parentElement;
  if (scrollBox && currentIndex >= 0) {
    const targetY = yFor(currentIndex);
    scrollBox.scrollTop = Math.max(0, targetY - scrollBox.clientHeight / 2);
  }
}
