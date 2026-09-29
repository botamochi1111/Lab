// English / Japanese switch. English is the default; the choice is remembered.
// - Static text in index.html: an element with data-ja="..." shows that HTML
//   in Japanese mode and its original HTML in English mode.
// - Dynamic text: t("English", "日本語").

const KEY = "ifwLang";
let lang = "en";
try { if (localStorage.getItem(KEY) === "ja") lang = "ja"; } catch (e) { /* storage unavailable */ }

const listeners = [];

export function getLang() {
  return lang;
}

export function t(en, ja) {
  return lang === "ja" ? ja : en;
}

// "Level 3" -> "ステージ 3", "Level 3 [HARD REMIX]" -> "ステージ 3(ボーナス)" in Japanese mode.
export function stageName(name) {
  return lang === "ja" ? name.replace(/^Level\b/, "ステージ").replace(/\s*\[HARD REMIX\]$/, "(ボーナス)") : name;
}

export function onLangChange(fn) {
  listeners.push(fn);
}

export function applyStaticText() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-ja]").forEach((el) => {
    if (el.dataset.en == null) el.dataset.en = el.innerHTML;
    el.innerHTML = lang === "ja" ? el.dataset.ja : el.dataset.en;
  });
}

export function setLang(next) {
  lang = next;
  try { localStorage.setItem(KEY, next); } catch (e) { /* storage unavailable */ }
  applyStaticText();
  listeners.forEach((fn) => fn());
}
