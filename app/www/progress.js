// Stage progression, persisted per mode (Reach Goal / Visit All) in
// localStorage. `unlocked` is a sparse boolean array (not a single count)
// because the stage path can fork: clearing one stage can unlock two next
// stages at once, and a later stage can become reachable from either one.

const KEY = "ifw_terminal_progress_v1";

function fresh() {
  return { unlocked: [true], cleared: [], skipped: [] };
}

function normalize(p) {
  if (!p) return fresh();
  if (!Array.isArray(p.cleared)) p.cleared = [];
  if (!Array.isArray(p.skipped)) p.skipped = [];
  if (typeof p.unlocked === "number") {
    // Migrate the old "unlocked count" shape into a boolean array.
    const arr = [];
    for (let i = 0; i < p.unlocked; i++) arr[i] = true;
    p.unlocked = arr;
  }
  if (!Array.isArray(p.unlocked)) p.unlocked = [true];
  if (!p.unlocked[0]) p.unlocked[0] = true;
  return p;
}

export function loadProgress() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY));
  } catch (e) {
    saved = null;
  }
  return {
    goal: normalize(saved && saved.goal),
    all: normalize(saved && saved.all),
  };
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch (e) {
    /* private-browsing / storage disabled — progress just won't persist */
  }
}

export function isUnlocked(p, index) {
  return !!p.unlocked[index];
}

function unlockAll(p, indices) {
  for (const i of indices) p.unlocked[i] = true;
}

export function markCleared(progress, mode, index, children) {
  const p = progress[mode];
  p.cleared[index] = true;
  unlockAll(p, children);
  saveProgress(progress);
}

export function markSkipped(progress, mode, index, children) {
  const p = progress[mode];
  p.skipped[index] = true;
  unlockAll(p, children);
  saveProgress(progress);
}
