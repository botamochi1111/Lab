// Bundle app/www into ONE self-contained HTML file (game/index.html) that
// opens by double-clicking: browsers refuse to load separate ES module files
// from file://, so every module, the stylesheet and the fonts are inlined.
//
// Each module becomes a function scope; `import { a } from "./x.js"` turns
// into `const { a } = modules["x.js"]` and exported names are returned.
//
// usage: node tools/build-single-html.js   (from app/, or anywhere)

const fs = require("fs");
const path = require("path");

const WWW = path.join(__dirname, "..", "www");
const OUT = path.join(__dirname, "..", "..", "game", "index.html");
const read = (f) => fs.readFileSync(path.join(WWW, f), "utf8");

// ---- modules, in dependency order starting from main.js ----
const order = [];
const seen = new Set();
function visit(file) {
  if (seen.has(file)) return;
  seen.add(file);
  const src = read(file);
  for (const m of src.matchAll(/^import\s*\{[^}]*\}\s*from\s*"\.\/([^"]+)";/gm)) visit(m[1]);
  order.push(file);
}
visit("main.js");

function wrapModule(file) {
  let src = read(file);
  const exported = [];
  src = src.replace(/^import\s*\{([^}]*)\}\s*from\s*"\.\/([^"]+)";/gm, (_, names, dep) => `const {${names}} = modules[${JSON.stringify(dep)}];`);
  src = src.replace(/^export\s+(async\s+function|function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm, (_, kind, name) => {
    exported.push(name);
    return `${kind} ${name}`;
  });
  if (/^\s*(import|export)\b/m.test(src)) throw new Error(`${file}: unsupported import/export form`);
  return `modules[${JSON.stringify(file)}] = (function () {\n"use strict";\n${src}\nreturn { ${exported.join(", ")} };\n})();\n`;
}

// ---- stylesheet with fonts as data URIs ----
const css = read("styles.css").replace(/url\("([^"]+\.woff2)"\)/g, (_, f) => {
  const b64 = fs.readFileSync(path.join(WWW, f)).toString("base64");
  return `url("data:font/woff2;base64,${b64}")`;
});

// ---- assemble ----
const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
let html = read("index.html");
html = html.replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${css}\n</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => `<script>\n${safe(read(f))}\n</script>`);
html = html.replace('<script type="module" src="main.js"></script>', () =>
  `<script>\n(function () {\nconst modules = {};\n${safe(order.map(wrapModule).join("\n"))}\n})();\n</script>`);
if (/<script[^>]*src=|<link[^>]*stylesheet/.test(html)) throw new Error("an external reference was left in the output");

html = html.replace("<!doctype html>", "<!doctype html>\n<!-- Generated from app/www by app/tools/build-single-html.js. Edit app/www, then rebuild. -->");
fs.writeFileSync(OUT, html);
console.log(`wrote ${path.relative(process.cwd(), OUT)} (${Math.round(html.length / 1024)} KB), modules: ${order.join(", ")}`);
