/* zamo — ascii portrait on canvas.
   Chars fly in from a scattered ring, then hovering pulls them into a
   swirling vortex around the cursor, like a black hole. */

const Portrait = (() => {
  "use strict";

  const CELL_W = 4;              // 8px monospace at 4px pitch, like the original
  const CELL_H = 6;
  const FONT = 8;
  const SRC = "../assets/img/portrait-color.png";

  let imgPromise = null;
  let live = [];                 // cleanup fns of mounted instances

  function loadImage() {
    if (!imgPromise) {
      imgPromise = new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = SRC;
      });
    }
    return imgPromise;
  }

  function palette() {
    const cs = getComputedStyle(document.documentElement);
    const g = (k) => cs.getPropertyValue(k).trim();
    return {
      dark: g("--faint") || "#45423b",
      light: g("--fg") || "#d8d2c4",
      mid: g("--accent") || "#d9a05b",
      lifted: g("--dim") || "#7a7568",   // displaced dark chars
    };
  }

  function mount(el) {
    const rows = PORTRAIT;
    const cols = Math.max(...rows.map((r) => r.length));
    const W = Math.round(cols * CELL_W);
    const H = Math.round(rows.length * CELL_H + 2);
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const canvas = document.createElement("canvas");
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.aspectRatio = `${W} / ${H}`;
    el.appendChild(canvas);

    const ctx = canvas.getContext("2d", { alpha: true });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let pal = palette();
    const onTheme = () => { pal = palette(); };
    window.addEventListener("zamo:theme", onTheme);

    const chars = [];
    const mouse = { x: -9999, y: -9999 };
    let raf = 0;
    let dead = false;

    function build(colorCtx) {
      const cx = W / 2, cy = H / 2;
      rows.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) {
          const ch = row[c];
          if (ch === " ") continue;
          const x = c * CELL_W;
          const y = r * CELL_H + CELL_H;
          let lum = -1;
          if (colorCtx) {
            const px = Math.min(W - 1, Math.max(0, Math.floor(x)));
            const py = Math.min(H - 1, Math.max(0, Math.floor(y - FONT / 2)));
            const d = colorCtx.getImageData(px, py, 1, 1).data;
            if (d[3] > 10) lum = (d[0] + d[1] + d[2]) / 3;
          }
          const ang = Math.atan2(y - cy, x - cx);
          const dist = Math.hypot(x - cx, y - cy) + (Math.random() * 350 + 150);
          const a2 = ang + Math.random() * 2;
          chars.push({
            char: ch,
            x: cx + Math.cos(a2) * dist,
            y: cy + Math.sin(a2) * dist,
            baseX: x, baseY: y,
            density: Math.random() * 15 + 5,
            lum,
          });
        }
      });
    }

    function frame() {
      if (dead) return;
      ctx.clearRect(0, 0, W, H);
      ctx.font = `${FONT}px "JetBrains Mono", monospace`;
      ctx.textBaseline = "alphabetic";
      const R = window.innerWidth > 768 ? 30 : 42;
      const R2 = R * R;
      for (const p of chars) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 0) {
          // black hole: pull toward the cursor + tangential swirl
          const d = Math.sqrt(d2);
          const nx = dx / d, ny = dy / d;
          const fall = (R - d) / R;
          p.x -= (nx + ny * 1.5) * fall * p.density;
          p.y -= (ny - nx * 1.5) * fall * p.density;
        } else {
          // spring back to rest
          const k = p.density * 0.85;
          const ox = p.x - p.baseX;
          p.x = Math.abs(ox) < 0.5 ? p.baseX : p.x - ox / k;
          const oy = p.y - p.baseY;
          p.y = Math.abs(oy) < 0.5 ? p.baseY : p.y - oy / k;
        }
        const moved = (p.x - p.baseX) ** 2 + (p.y - p.baseY) ** 2 > 2;
        let tone = p.lum < 0 ? pal.mid : p.lum < 140 ? pal.dark : p.lum > 220 ? pal.light : pal.mid;
        if (moved && tone === pal.dark) tone = pal.lifted;
        ctx.fillStyle = tone;
        ctx.fillText(p.char, p.x, p.y);
      }
      raf = requestAnimationFrame(frame);
    }

    function track(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      mouse.x = (clientX - r.left) * (W / r.width);
      mouse.y = (clientY - r.top) * (H / r.height);
    }
    const onMove = (ev) => track(ev.clientX, ev.clientY);
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    const onTouch = (ev) => {
      ev.preventDefault();
      track(ev.touches[0].clientX, ev.touches[0].clientY);
    };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    canvas.addEventListener("touchmove", onTouch, { passive: false });
    canvas.addEventListener("touchend", onLeave);
    canvas.addEventListener("touchcancel", onLeave);

    loadImage().then((img) => {
      if (dead) return;
      let colorCtx = null;
      if (img) {
        const off = document.createElement("canvas");
        off.width = W; off.height = H;
        colorCtx = off.getContext("2d", { willReadFrequently: true });
        colorCtx.drawImage(img, 0, 0, W, H);
      }
      build(colorCtx);
      frame();
    });

    const cleanup = () => {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("zamo:theme", onTheme);
      canvas.remove();
    };
    live.push(cleanup);
    return cleanup;
  }

  function mountAll(root) {
    while (live.length) live.pop()();
    root.querySelectorAll(".portrait-mount").forEach(mount);
  }

  return { mountAll };
})();
