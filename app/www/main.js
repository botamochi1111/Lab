import { startBackground } from "./background.js";
import { initGame } from "./game.js";
import { initTitle } from "./title.js";
import { initRules } from "./rules.js";
import { getLang, setLang, applyStaticText } from "./lang.js";

function startClock(el) {
  function tick() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    el.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  tick();
  setInterval(tick, 1000);
}

function initViews() {
  const viewMap = document.getElementById("viewMap");
  const viewBoard = document.getElementById("viewBoard");
  const tabMap = document.getElementById("tabMap");
  const tabBoard = document.getElementById("tabBoard");

  function show(name) {
    const onBoard = name === "board";
    viewMap.hidden = onBoard;
    viewBoard.hidden = !onBoard;
    tabMap.classList.toggle("active", !onBoard);
    tabBoard.classList.toggle("active", onBoard);
  }

  tabMap.addEventListener("click", () => show("map"));
  tabBoard.addEventListener("click", () => show("board"));
  document.getElementById("btnBackToMap").addEventListener("click", () => show("map"));

  show("map");
  return { showBoard: () => show("board"), showMap: () => show("map") };
}

// Android hardware back button (only present when running inside the
// Capacitor app shell; a no-op in a normal browser).
function initBackButton(views) {
  const App = window.Capacitor?.Plugins?.App;
  if (!App) return;
  const dialog = document.getElementById("rulesDialog");
  const viewBoard = document.getElementById("viewBoard");
  App.addListener("backButton", () => {
    if (dialog.open) dialog.close();
    else if (!viewBoard.hidden) views.showMap();
    else App.exitApp();
  });
}

function boot() {
  applyStaticText();
  document.getElementById("btnLang").addEventListener("click", () => setLang(getLang() === "ja" ? "en" : "ja"));

  startBackground(document.getElementById("bgCanvas"));
  startClock(document.getElementById("clock"));

  const views = initViews();

  initGame({
    boardSvg: document.getElementById("boardSvg"),
    boardStatus: document.getElementById("boardStatus"),
    stageTree: document.getElementById("stageTree"),
    levelSelect: document.getElementById("levelSelect"),
    diffSelect: document.getElementById("diffSelect"),
    diffGroup: document.getElementById("diffGroup"),
    revisitInput: document.getElementById("chkRevisit"),
    btnRandom: document.getElementById("btnRandom"),
    btnUndo: document.getElementById("btnUndo"),
    btnReset: document.getElementById("btnReset"),
    btnSkip: document.getElementById("btnSkip"),
    tagNodes: document.getElementById("tagNodes"),
    tagEdges: document.getElementById("tagEdges"),
    tagMoves: document.getElementById("tagMoves"),
    tagStage: document.getElementById("tagStage"),
    tagMode: document.getElementById("tagMode"),
    tagRevisit: document.getElementById("tagRevisit"),
    tagDev: document.getElementById("tagDev"),
    infoStageName: document.getElementById("infoStageName"),
    infoCond: document.getElementById("infoCond"),
    infoOptimal: document.getElementById("infoOptimal"),
    boardOverlay: document.getElementById("boardOverlay"),
    overlayTitle: document.getElementById("overlayTitle"),
    overlaySubtitle: document.getElementById("overlaySubtitle"),
    overlayActions: document.getElementById("overlayActions"),
    onEnterBoard: views.showBoard,
    showMap: views.showMap,
  });

  initRules({ helpBtn: document.getElementById("btnHowToPlayMap") });
  initTitle({
    onStart: () => {},
  });
  initBackButton(views);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
