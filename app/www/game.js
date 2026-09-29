// Orchestrates the real Incident Flip Walk game inside the terminal chassis:
// owns state, renders the SVG board in the phosphor palette, and wires the
// GUI controls.

import { cloneEdges, isWalkable, flipIncident, legalMoves } from "./puzzle-model.js";
import { generatePuzzle, remixLevel } from "./puzzle-generator.js";
import { loadProgress, markCleared, markSkipped } from "./progress.js";
import { getChildren, hasBonus } from "./level-graph.js";
import { renderStageMap } from "./stagemap.js";
import { t as L, stageName, onLangChange } from "./lang.js";

const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs) => {
  const node = document.createElementNS(NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  return node;
};

// Developer build: every level is selectable regardless of real progress,
// via ?dev=1 in the URL -- doesn't touch saved progress, just what the level
// select / stage map treat as unlocked.
const DEV_MODE = new URLSearchParams(location.search).get("dev") === "1";

export function initGame(dom) {
  const progress = loadProgress();
  const recentPuzzles = [];

  let gameMode = "all";
  let gameDifficulty = "medium";
  let canRevisit = false;
  let isRandom = false;
  let bonusFrom = null; // stage index a bonus (remix) puzzle branches off, else null
  let presetIndex = 0;
  let level = null;
  let state = null;
  let history = [];
  let overlayTimer = null;

  const currentPresets = () => (gameMode === "goal" ? window.PRESETS_GOAL : window.PRESETS_ALL);
  const childrenOf = (idx) => getChildren(idx, currentPresets().length);

  // What the level select / stage map should treat as unlocked -- real
  // progress normally, or everything when DEV_MODE is on.
  function progressView() {
    const p = progress[gameMode];
    if (!DEV_MODE) return p;
    return { ...p, unlocked: currentPresets().map(() => true) };
  }

  function frontierIndex() {
    const p = progress[gameMode];
    const total = currentPresets().length;
    let last = 0;
    for (let i = 0; i < total; i++) if (p.unlocked[i]) last = i;
    return Math.min(last, total - 1);
  }

  // ---------------- core mechanics ----------------

  function computeLegal() {
    return legalMoves(level, state, canRevisit);
  }

  function markLevelCleared() {
    if (isRandom) return;
    markCleared(progress, gameMode, presetIndex, childrenOf(presetIndex));
    refreshLevelSelect();
    refreshStageMap();
  }

  function pushHistory() {
    history.push({
      pos: state.pos,
      edges: new Map(state.edges),
      moves: state.moves,
      won: state.won,
      visited: new Set(state.visited),
    });
    dom.btnUndo.disabled = false;
  }

  function tryMove(target) {
    if (state.won) return;
    if (!computeLegal().includes(target)) return;

    pushHistory();
    state.pos = target;
    state.visited.add(target);
    flipIncident(target, state.edges, level);
    state.moves += 1;

    if (gameMode === "goal") state.won = state.pos === level.goal;
    else state.won = state.visited.size === Object.keys(level.vertices).length;

    if (state.won) markLevelCleared();

    updateStats();
    render(target);
    scheduleOverlay();
  }

  function undo() {
    if (!history.length) return;
    const prev = history.pop();
    state = { ...prev, edges: prev.edges, visited: new Set(prev.visited) };
    dom.btnUndo.disabled = history.length === 0;
    updateStats();
    render();
    scheduleOverlay();
  }

  function startLevel(lv) {
    level = lv;
    state = { pos: lv.start, edges: cloneEdges(lv.edges), moves: 0, won: false, visited: new Set([lv.start]) };
    history = [];
    dom.btnUndo.disabled = true;
    if (dom.btnSkip) dom.btnSkip.style.display = isRandom ? "none" : "";
    updateStats();
    render();
    refreshDifficultyVisibility();
    scheduleOverlay();
  }

  // ---------------- clear / stuck overlay ----------------
  // Shown a couple of seconds after the fact (not instantly), so the player
  // sees their move land before the screen reacts to it.

  function clearOverlayTimer() {
    if (overlayTimer) {
      clearTimeout(overlayTimer);
      overlayTimer = null;
    }
  }

  function hideOverlay() {
    if (dom.boardOverlay) dom.boardOverlay.hidden = true;
  }

  function scheduleOverlay() {
    clearOverlayTimer();
    if (!dom.boardOverlay) return;
    if (state.won) {
      overlayTimer = setTimeout(showClearOverlay, 500);
    } else if (!computeLegal().length) {
      overlayTimer = setTimeout(showStuckOverlay, 1800);
    } else {
      hideOverlay();
    }
  }

  function overlayButton(label, cls, onClick) {
    const b = document.createElement("button");
    b.textContent = label;
    if (cls) b.className = cls;
    b.addEventListener("click", onClick);
    return b;
  }

  function showClearOverlay() {
    dom.overlayTitle.textContent = bonusFrom != null ? L("BONUS CLEAR", "ボーナスクリア") : isRandom ? L("PUZZLE CLEARED", "クリア") : L("STAGE CLEAR", "ステージクリア");
    dom.overlayTitle.classList.remove("warn");
    dom.overlaySubtitle.textContent = `${stageName(level.name)} -- ${L(`${state.moves} move${state.moves === 1 ? "" : "s"}`, `${state.moves}手`)}`;
    dom.overlayActions.innerHTML = "";

    if (!isRandom || bonusFrom != null) {
      // A bonus continues from the stage it branches off.
      const from = bonusFrom != null ? bonusFrom : presetIndex;
      const kids = childrenOf(from).filter((c) => progressView().unlocked[c]);
      if (kids.length === 1) {
        dom.overlayActions.appendChild(overlayButton(L("NEXT STAGE →", "次のステージ →"), "primary", () => { hideOverlay(); loadPreset(kids[0]); }));
      } else if (kids.length > 1) {
        kids.forEach((c) => {
          dom.overlayActions.appendChild(overlayButton(L(`STAGE ${c + 1} →`, `ステージ ${c + 1} →`), "primary", () => { hideOverlay(); loadPreset(c); }));
        });
      }
      if (bonusFrom == null && hasBonus(presetIndex, currentPresets().length)) {
        dom.overlayActions.appendChild(overlayButton(L("BONUS →", "ボーナスへ →"), "bonus", () => { hideOverlay(); startBonus(presetIndex); }));
      }
    } else {
      dom.overlayActions.appendChild(overlayButton(L("NEW RANDOM", "新しいランダム問題"), "primary", () => { hideOverlay(); loadNewPuzzle(); }));
    }
    dom.overlayActions.appendChild(overlayButton(L("← MAP", "← マップ"), "", () => { hideOverlay(); if (dom.showMap) dom.showMap(); }));
    dom.boardOverlay.hidden = false;
  }

  function showStuckOverlay() {
    dom.overlayTitle.textContent = L("STUCK", "詰み");
    dom.overlayTitle.classList.add("warn");
    dom.overlaySubtitle.textContent = L("no legal moves remain from here.", "ここからはもう進めない。");
    dom.overlayActions.innerHTML = "";
    dom.overlayActions.appendChild(overlayButton(L("UNDO", "1手戻す"), "primary", () => { hideOverlay(); undo(); }));
    dom.overlayActions.appendChild(overlayButton(L("RESET STAGE", "最初から"), "", () => { hideOverlay(); resetCurrent(); }));
    if (!isRandom) {
      dom.overlayActions.appendChild(overlayButton(L("SKIP STAGE", "スキップ"), "ghost", () => { hideOverlay(); skipCurrentLevel(); }));
    }
    dom.boardOverlay.hidden = false;
  }

  function loadPreset(idx, { enterBoard = true } = {}) {
    isRandom = false;
    bonusFrom = null;
    presetIndex = idx;
    startLevel(currentPresets()[idx]);
    refreshLevelSelect();
    refreshStageMap();
    if (enterBoard && dom.onEnterBoard) dom.onEnterBoard();
  }

  function loadNewPuzzle({ enterBoard = true } = {}) {
    dom.btnRandom.disabled = true;
    dom.btnRandom.textContent = L("GENERATING...", "生成中...");
    setTimeout(() => {
      isRandom = true;
      bonusFrom = null;
      const puzzle = generatePuzzle({ gameMode, gameDifficulty, recentPuzzles, fallbackPresets: currentPresets() });
      startLevel(puzzle);
      dom.levelSelect.value = "random";
      dom.btnRandom.disabled = false;
      dom.btnRandom.textContent = L("RANDOM PUZZLE", "ランダム問題");
      refreshStageMap();
      if (enterBoard && dom.onEnterBoard) dom.onEnterBoard();
    }, 20);
  }

  function resetCurrent() {
    if (isRandom) startLevel(level);
    else startLevel(currentPresets()[presetIndex]);
  }

  function resumeCurrentMode() {
    loadPreset(frontierIndex(), { enterBoard: false });
  }

  function skipCurrentLevel() {
    if (isRandom) return;
    const kids = childrenOf(presetIndex);
    markSkipped(progress, gameMode, presetIndex, kids);
    refreshLevelSelect();
    refreshStageMap();
    if (kids.length) loadPreset(kids[0]);
  }

  // ---------------- rendering ----------------

  function render(flipVertex) {
    const svg = dom.boardSvg;
    svg.innerHTML = "";
    const legal = state.won ? [] : computeLegal();
    const totalV = Object.keys(level.vertices).length;

    let nodeRadius = 22, activeR = 27, wWidth = 4.5, bWidth = 2.4, curStroke = 3.5, legalStroke = 2.6, normalStroke = 1.6, fontSize = "12";
    if (totalV > 65) { nodeRadius = 9; activeR = 12; wWidth = 2; bWidth = 1; curStroke = 2; legalStroke = 1.4; normalStroke = 1; fontSize = "9"; }
    else if (totalV > 40) { nodeRadius = 13; activeR = 16; wWidth = 2.6; bWidth = 1.6; curStroke = 2.4; legalStroke = 1.8; normalStroke = 1.1; fontSize = "10"; }
    else if (totalV > 15) { nodeRadius = 17; activeR = 21; wWidth = 3.6; bWidth = 2; curStroke = 3; legalStroke = 2.2; normalStroke = 1.4; fontSize = "11"; }

    // Frame the graph's bounding box (centered, with a minimum size so tiny
    // graphs don't get blown up), instead of a fixed canvas from the origin.
    const xs = Object.values(level.vertices).map((v) => v.x);
    const ys = Object.values(level.vertices).map((v) => v.y);
    const pad = 70;
    const svgW = Math.max(Math.max(...xs) - Math.min(...xs) + 2 * pad, 560);
    const svgH = Math.max(Math.max(...ys) - Math.min(...ys) + 2 * pad, 360);
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    svg.setAttribute("viewBox", `${cx - svgW / 2} ${cy - svgH / 2} ${svgW} ${svgH}`);

    const container = svg.parentElement;
    const availW = (container && container.clientWidth) || svgW;
    const availH = Math.max(280, window.innerHeight * 0.6);
    const fit = Math.min(1, availW / svgW, availH / svgH);
    svg.style.width = `${Math.round(svgW * fit)}px`;
    svg.style.height = `${Math.round(svgH * fit)}px`;

    const defs = el("defs", {});
    defs.innerHTML = `<filter id="ifwGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`;
    svg.appendChild(defs);

    const gEdges = el("g", {});
    for (const [u, v] of level.edges.map(([a, b]) => [a, b])) {
      const p1 = level.vertices[u];
      const p2 = level.vertices[v];
      const walkable = isWalkable(u, v, state.edges);
      gEdges.appendChild(el("line", {
        x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
        stroke: walkable ? "#33ff66" : "#3a5a46",
        "stroke-width": walkable ? wWidth : bWidth,
        "stroke-linecap": "round",
        "stroke-dasharray": walkable ? "0" : "9 7",
        opacity: walkable ? 0.95 : 0.55,
      }));
    }
    svg.appendChild(gEdges);

    const gNodes = el("g", {});
    for (const [id, v] of Object.entries(level.vertices)) {
      const isCurrent = id === state.pos;
      const isLegal = legal.includes(id);
      const g = el("g", { class: "node-hit" + (isLegal ? "" : " disabled"), "data-id": id });

      if (flipVertex === id) {
        const ring = el("circle", { cx: v.x, cy: v.y, class: "flip-ring animate" });
        ring.style.setProperty("--ring-start-r", `${nodeRadius * 0.7}px`);
        g.appendChild(ring);
      }

      if (isLegal) {
        // Generous invisible tap target independent of the drawn radius —
        // dense boards keep small dots but stay comfortably tappable.
        g.appendChild(el("circle", {
          cx: v.x, cy: v.y, r: Math.max(nodeRadius + 10, 22),
          fill: "transparent", "pointer-events": "all",
        }));
      }

      let role = v.role;
      if (gameMode === "all" && role === "goal") role = null;

      let fill = "#12211a";
      if (gameMode === "goal") {
        if (role === "start") fill = "#ffb454";
        else if (role === "goal") fill = "#ff5c5c";
        else if (isCurrent) fill = "#9dffc0";
      } else {
        if (state.visited.has(id)) fill = "#1c8a4a";
        if (role === "start") fill = "#ffb454";
        if (isCurrent) fill = "#9dffc0";
      }

      const circle = el("circle", {
        cx: v.x, cy: v.y, r: isCurrent ? activeR : nodeRadius,
        fill,
        stroke: isLegal ? "#33ff66" : isCurrent ? "#9dffc0" : "#1c5a34",
        "stroke-width": isCurrent ? curStroke : isLegal ? legalStroke : normalStroke,
      });
      if (isCurrent) circle.setAttribute("filter", "url(#ifwGlow)");
      g.appendChild(circle);

      let labelText = "";
      if (role === "goal" && gameMode === "goal") labelText = "t";
      if (labelText) {
        const text = el("text", {
          x: v.x, y: v.y + nodeRadius + 14, "text-anchor": "middle",
          fill: "#6f9c82", "font-size": fontSize, "font-family": "Share Tech Mono, monospace",
        });
        text.textContent = labelText;
        g.appendChild(text);
      }

      if (isLegal) g.addEventListener("click", () => tryMove(id));
      gNodes.appendChild(g);
    }
    svg.appendChild(gNodes);
  }

  // ---------------- header / sidebar / controls ----------------

  function updateStats() {
    const totalV = Object.keys(level.vertices).length;
    dom.tagNodes.textContent = `[NODES:${totalV}]`;
    dom.tagEdges.textContent = `[EDGES:${level.edges.length}]`;
    dom.tagMoves.textContent = `[MOVES:${state.moves}]`;
    dom.tagStage.textContent = `[STAGE:${level.name.toUpperCase()}]`;
    dom.tagMode.textContent = `[MODE:${gameMode === "goal" ? "REACH_GOAL" : "VISIT_ALL"}]`;
    dom.tagRevisit.textContent = `[REVISIT:${canRevisit ? "ON" : "OFF"}]`;
    dom.tagRevisit.classList.toggle("tag-warn", canRevisit);

    dom.infoStageName.textContent = stageName(level.name);
    dom.infoCond.textContent = gameMode === "goal" ? L("REACH s->t", "s から t へ") : L("VISIT ALL", "すべての点を通る");
    dom.infoOptimal.textContent = level._optimal ? L(`${level._optimal} moves`, `${level._optimal}手`) : "-";

    dom.boardStatus.textContent = state.won
      ? L("CLEARED", "クリア")
      : computeLegal().length
      ? L("IN PROGRESS", "プレイ中")
      : L("STUCK - no legal moves", "詰み - 進める点がない");
    dom.boardStatus.classList.toggle("tag-warn", !state.won && !computeLegal().length);
  }

  function refreshDifficultyVisibility() {
    const showDiff = isRandom || dom.levelSelect.value === "random";
    dom.diffGroup.style.display = showDiff ? "inline-flex" : "none";
  }

  function refreshLevelSelect() {
    const list = currentPresets();
    const p = progressView();
    dom.levelSelect.innerHTML = "";
    list.forEach((lv, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      const locked = !p.unlocked[i];
      const cleared = !!p.cleared[i];
      const skipped = !!p.skipped[i];
      const mark = cleared ? "* " : skipped ? "» " : "";
      opt.textContent = `${mark}${stageName(lv.name)}${locked ? L(" (LOCKED)", "(未解放)") : ""}`;
      opt.disabled = locked;
      dom.levelSelect.appendChild(opt);
    });
    const randomOpt = document.createElement("option");
    randomOpt.value = "random";
    randomOpt.textContent = L("RANDOM", "ランダム");
    dom.levelSelect.appendChild(randomOpt);
    dom.levelSelect.value = isRandom ? "random" : String(presetIndex);
  }

  // Bonus puzzle for a stage: the pre-generated one from bonus.js (same
  // drawing, harder puzzle) when it still matches the stage, else a remix.
  function startBonus(sourceIndex) {
    const base = currentPresets()[sourceIndex];
    const pre = gameMode === "all" && window.BONUS_ALL && window.BONUS_ALL[sourceIndex];
    setTimeout(() => {
      isRandom = true;
      bonusFrom = sourceIndex;
      startLevel(pre && pre.sourceName === base.name ? pre : remixLevel(base, gameMode, canRevisit));
      dom.levelSelect.value = "random";
      refreshStageMap();
      if (dom.onEnterBoard) dom.onEnterBoard();
    }, 20);
  }

  function refreshStageMap() {
    renderStageMap(dom.stageTree, {
      presets: currentPresets(),
      progress: progressView(),
      currentIndex: isRandom ? -1 : presetIndex,
      onSelect(idx) {
        loadPreset(idx);
      },
      onBonus: startBonus,
    });
  }

  // ---------------- GUI wiring ----------------

  dom.btnRandom.addEventListener("click", () => loadNewPuzzle());
  const labelRandomButton = () => { if (!dom.btnRandom.disabled) dom.btnRandom.textContent = L("RANDOM PUZZLE", "ランダム問題"); };
  labelRandomButton();
  onLangChange(() => {
    labelRandomButton();
    refreshLevelSelect();
    updateStats();
    if (!dom.boardOverlay.hidden) (state.won ? showClearOverlay : showStuckOverlay)();
  });
  dom.btnUndo.addEventListener("click", undo);
  dom.btnReset.addEventListener("click", resetCurrent);
  if (dom.btnSkip) dom.btnSkip.addEventListener("click", skipCurrentLevel);
  dom.levelSelect.addEventListener("change", () => {
    if (dom.levelSelect.value === "random") loadNewPuzzle();
    else loadPreset(Number(dom.levelSelect.value));
    refreshDifficultyVisibility();
  });
  dom.diffSelect.addEventListener("change", () => {
    gameDifficulty = dom.diffSelect.value;
    if (isRandom) loadNewPuzzle();
  });
  dom.revisitInput.addEventListener("change", () => {
    canRevisit = dom.revisitInput.checked;
    resetCurrent();
  });

  // ---------------- boot ----------------

  if (DEV_MODE && dom.tagDev) dom.tagDev.hidden = false;
  refreshLevelSelect();
  resumeCurrentMode();
}
