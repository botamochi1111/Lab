// Title screen: a short boot-log typewriter (purely atmospheric, skippable)
// then a blinking "TAP TO START" prompt -- like a mobile game's splash, the
// whole screen is the button. Tapping/pressing anything during the boot text
// skips straight to the prompt; tapping/pressing anything once the prompt is
// showing starts the game. "How to play" lives on the stage-select screen now,
// not here.

import { loadProgress } from "./progress.js";

const BOOT_LINES = [
  "> BOOTING IFW-OS v1.0 ...",
  "> LOADING GRAPH KERNEL ... OK",
  "> MOUNTING STAGE ARCHIVE (30 STAGES) ... OK",
  "> CALIBRATING PHOSPHOR ... OK",
  "> READY.",
];

function hasSave(progress) {
  const touched = (p) => p.unlocked.filter(Boolean).length > 1 || p.cleared.some(Boolean) || p.skipped.some(Boolean);
  return touched(progress.goal) || touched(progress.all);
}

export function initTitle({ onStart }) {
  const screen = document.getElementById("titleScreen");
  const bootLog = document.getElementById("bootLog");
  const prompt = document.getElementById("titlePrompt");

  const progress = loadProgress();
  prompt.textContent = hasSave(progress) ? "TAP TO CONTINUE" : "TAP TO START";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let revealed = false;
  let dismissed = false;
  let bootTimer = null;

  function reveal() {
    if (revealed) return;
    revealed = true;
    if (bootTimer) clearInterval(bootTimer);
    bootLog.textContent = BOOT_LINES.join("\n");
    prompt.hidden = false;
  }

  if (reduceMotion) {
    reveal();
  } else {
    let li = 0;
    let lineEl = document.createElement("div");
    bootLog.appendChild(lineEl);
    bootTimer = setInterval(() => {
      const line = BOOT_LINES[li];
      const shown = lineEl.textContent.length;
      if (shown < line.length) {
        lineEl.textContent = line.slice(0, shown + 1);
        return;
      }
      li++;
      if (li >= BOOT_LINES.length) {
        reveal();
        return;
      }
      lineEl = document.createElement("div");
      bootLog.appendChild(lineEl);
    }, 24);
  }

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    screen.classList.add("title-hide");
    document.getElementById("crtRoot").classList.remove("pre-start");
    setTimeout(() => { screen.hidden = true; }, 220);
    onStart();
  }

  function handleActivate() {
    if (!revealed) reveal();
    else dismiss();
  }

  screen.addEventListener("click", handleActivate);
  window.addEventListener(
    "keydown",
    (e) => {
      if (screen.hidden || dismissed) return;
      handleActivate();
    },
    { capture: true }
  );
}
