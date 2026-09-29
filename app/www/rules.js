// "How to play" dialog: static rule text plus a tiny interactive demo of the
// one core mechanic (arriving at a node flips every edge touching it).

const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs) => {
  const node = document.createElementNS(NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  return node;
};

function initFlipDemo(svg, caption) {
  const center = { x: 40, y: 45 };
  const leaves = [{ x: 130, y: 15 }, { x: 130, y: 45 }, { x: 130, y: 75 }];
  let walkable = [true, false, true];

  function render(flip) {
    svg.innerHTML = "";
    leaves.forEach((leaf, i) => {
      svg.appendChild(el("line", {
        x1: center.x, y1: center.y, x2: leaf.x, y2: leaf.y,
        stroke: walkable[i] ? "#33ff66" : "#3a5a46",
        "stroke-width": walkable[i] ? 3 : 2,
        "stroke-dasharray": walkable[i] ? "0" : "6 5",
        "stroke-linecap": "round",
      }));
    });
    if (flip) {
      const ring = el("circle", { cx: center.x, cy: center.y, r: 10, class: "flip-ring animate" });
      svg.appendChild(ring);
    }
    const cx = el("circle", { cx: center.x, cy: center.y, r: 11, fill: "#9dffc0", stroke: "#33ff66", "stroke-width": 2, class: "rules-demo-node" });
    svg.appendChild(cx);
    leaves.forEach((leaf) => {
      svg.appendChild(el("circle", { cx: leaf.x, cy: leaf.y, r: 7, fill: "#12211a", stroke: "#1c5a34", "stroke-width": 1.4 }));
    });
  }

  render(false);
  svg.addEventListener("click", () => {
    walkable = walkable.map((w) => !w);
    render(true);
    if (caption) caption.textContent = "flipped! tap again to flip back";
  });
}

export function initRules({ helpBtn }) {
  const dialog = document.getElementById("rulesDialog");
  const closeBtn = document.getElementById("btnCloseRules");
  const demoSvg = document.getElementById("rulesDemoSvg");
  const caption = document.querySelector(".rules-demo-caption");

  initFlipDemo(demoSvg, caption);

  function open() {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }
  function close() {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  helpBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close(); // click on the backdrop
  });
}
