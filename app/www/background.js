// Ambient canvas layer: a proximity graph that lives ON the same lattice as
// the CSS dot-grid (GRID px spacing) — nodes rest on grid intersections and
// hop from one intersection to a nearby one, rather than floating freely,
// so the graph reads as "drawn on the grid" instead of overlaid on top of it.

const GRID = 24; // must match .dot-grid background-size in styles.css
const LINK_DIST = GRID * 6.5;
const NODE_COUNT_DESKTOP = 34;
const NODE_COUNT_MOBILE = 16;
const HOP_MS = 1600;
const PAUSE_MIN = 900;
const PAUSE_MAX = 3200;

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function startBackground(canvas) {
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let nodes = [];
  let flipUntil = 0;
  let flipPair = null;

  function toXY(c, r) {
    return { x: c * GRID, y: r * GRID };
  }

  function pickTarget(n) {
    const reach = 3; // how many grid cells a hop may cross
    let c, r;
    do {
      c = Math.min(cols, Math.max(0, n.homeC + Math.round((Math.random() - 0.5) * 2 * reach)));
      r = Math.min(rows, Math.max(0, n.homeR + Math.round((Math.random() - 0.5) * 2 * reach)));
    } while (c === n.homeC && r === n.homeR);
    return { c, r };
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    cols = Math.round(width / GRID);
    rows = Math.round(height / GRID);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    const count = width < 640 ? NODE_COUNT_MOBILE : NODE_COUNT_DESKTOP;
    nodes = Array.from({ length: count }, () => {
      const homeC = Math.round(Math.random() * cols);
      const homeR = Math.round(Math.random() * rows);
      return {
        homeC, homeR,
        targetC: homeC, targetR: homeR,
        hopStart: performance.now() - Math.random() * HOP_MS,
        pauseUntil: performance.now() + Math.random() * PAUSE_MAX,
        x: homeC * GRID, y: homeR * GRID,
      };
    });
  }

  function step(now) {
    for (const n of nodes) {
      if (now >= n.pauseUntil) {
        const elapsed = now - n.hopStart;
        if (elapsed >= HOP_MS) {
          n.homeC = n.targetC;
          n.homeR = n.targetR;
          const t = pickTarget(n);
          n.targetC = t.c;
          n.targetR = t.r;
          n.hopStart = now;
          n.pauseUntil = now + HOP_MS + PAUSE_MIN + Math.random() * (PAUSE_MAX - PAUSE_MIN);
        }
      }
      const p = Math.min(1, Math.max(0, (now - n.hopStart) / HOP_MS));
      const e = easeInOut(p);
      const from = toXY(n.homeC, n.homeR);
      const to = toXY(n.targetC, n.targetR);
      n.x = from.x + (to.x - from.x) * e;
      n.y = from.y + (to.y - from.y) * e;
    }
  }

  function draw(now) {
    ctx.clearRect(0, 0, width, height);

    if (now > flipUntil) {
      flipUntil = now + 900 + Math.random() * 2200;
      flipPair = Math.floor(Math.random() * nodes.length);
    }

    let pairIndex = 0;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DIST) {
          const t = 1 - dist / LINK_DIST;
          const isFlip = pairIndex === flipPair;
          pairIndex++;
          ctx.beginPath();
          if (isFlip) {
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = `rgba(255, 180, 84, ${0.4 * t})`;
          } else {
            ctx.setLineDash([]);
            ctx.strokeStyle = `rgba(51, 255, 102, ${0.16 * t})`;
          }
          ctx.lineWidth = 1;
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.setLineDash([]);
    for (const n of nodes) {
      ctx.beginPath();
      ctx.fillStyle = "rgba(51, 255, 102, 0.55)";
      ctx.arc(n.x, n.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame(now) {
    step(now);
    draw(now);
    if (!reduceMotion) requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  if (reduceMotion) {
    draw(performance.now());
  } else {
    requestAnimationFrame(frame);
  }
}
