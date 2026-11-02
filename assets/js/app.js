/* zamo — main site engine: circular wheel + terminal pane */

(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const wheelEl = $("#wheel");
  const itemsEl = $("#wheel-items");
  const markEl = $("#wheel-mark");
  const inkEl = $("#ink");
  const ictx = inkEl.getContext("2d");
  const term = $("#term");
  const sbStats = $("#sb-stats");
  const tabFile = $("#tab-file");
  const announce = $("#announce");
  const entries = SITE.entries;
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let idx = 0;

  /* ── colors (canvas needs values, not var()) ───────── */

  let COL = {};
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const g = (k) => cs.getPropertyValue(k).trim();
    COL = { dim: g("--dim"), faint: g("--faint"), accent: g("--accent") };
  }
  readColors();
  window.addEventListener("zamo:theme", readColors);

  /* ── theme ─────────────────────────────────────────── */

  const cycleTheme = Theme.cycle;

  /* ── terminal rendering ────────────────────────────── */

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

  function promptLines(path, branch, cmd) {
    return [
      `<span class="user">zamo@dev</span> <span class="path">${path}</span>` +
        (branch ? ` <span class="branch">(${branch})</span>` : ""),
      `<span class="chev">&gt;</span> <span class="cmd">${esc(cmd)}</span>`,
    ];
  }

  function kv(k, v, extra = "") {
    return `<span class="kv">${k}</span>${v}${extra}`;
  }

  function bar(n, max, width = 30) {
    const filled = Math.max(1, Math.round((n / max) * width));
    const rest = width - filled;
    return `<span class="bar-hot">${"█".repeat(Math.min(1, filled))}</span>` +
      `<span class="accent">${"█".repeat(filled - 1)}</span>` +
      `<span class="bar-rest">${"░".repeat(rest)}</span>`;
  }

  function link(href, text) {
    return `<a href="${href}" target="_blank" rel="noopener">${esc(text || href)}</a>`;
  }

  const doiUrl = (doi) => "https://doi.org/" + doi;

  function pubLines(p) {
    const vol = p.volume ? ` · vol. ${p.volume}${p.issue ? `(${p.issue})` : ""}` : "";
    return [
      `<span class="head">${esc(p.title)}</span>`,
      `<span class="dim">${esc(p.authors)} — ${esc(p.venue)}${vol} · ${p.year}</span>`,
      kv("doi", link(doiUrl(p.doi), p.doi)),
    ];
  }

  // Optional profile links from SITE.links; empty ones are skipped.
  function extraLinks() {
    const names = { cv: "cv.pdf", linkedin: "linkedin", scholar: "scholar", orcid: "orcid" };
    return Object.entries(names)
      .filter(([k]) => SITE.links && SITE.links[k])
      .map(([k, label]) => link(SITE.links[k], label));
  }

  function portraitBlock(sideHtml) {
    return `<div class="p-row"><div class="portrait-mount"></div><div class="p-side">${sideHtml}</div></div>`;
  }

  function buildWhoami() {
    const L = [];
    L.push(...promptLines("~", null, "whoami"));
    L.push(portraitBlock(
      `<span class="head">Zamo Rzgar Ahmed</span>\n` +
      `AI researcher · software engineer\n` +
      `<span class="dim">PhD researcher, Software Engineering</span>\n` +
      `<span class="dim">AI &amp; NLP — Beihang University</span>\n` +
      `<span class="dim">Beijing, China</span>`
    ));
    L.push(
      "Working on LLMs, multi-agent systems, knowledge graphs,",
      "multimodal AI and computer vision — engineering intelligence",
      `<span class="dim">with feeling.</span>`,
    );
    L.push("");
    L.push(...promptLines("~", null, "cat education.txt"));
    L.push(
      `<span class="head">PhD</span>  Software Engineering, AI &amp; NLP — Beihang University      <span class="dim">2026 →</span>`,
      `<span class="head">MSc</span>  Software Engineering — Nankai University                 <span class="dim">2024–2026</span>`,
      `<span class="head">BSc</span>  Information Technology — Sulaimany Polytechnic          <span class="dim">2017–2021</span>`,
    );
    L.push("");
    L.push(...promptLines("~", null, "cat experience.txt"));
    L.push(
      `<span class="head">Codec</span> — Software Engineer                                  <span class="dim">2023–2024</span>`,
      `  Scalable web apps with Next.js + Supabase, +30% responsiveness.`,
      `  Led backend optimization −25% response time · managed dev teams.`,
      `  AI features: chatbots and trend-analysis systems.`,
      `<span class="head">SDE</span>   — Software Engineer &amp; IT Specialist                  <span class="dim">2020–2023</span>`,
      `  IT systems +40% reliability · training −20% tech incidents.`,
    );
    L.push("");
    L.push(...promptLines("~", null, "cat openkylin.md"));
    L.push(
      `<span class="head">openKylin</span> — contributor &amp; community member       <span class="dim">current</span>`,
      `  Open-source software development · speaker and volunteer at community events.`,
      `  Took part in the openKylin AI optimization competition.`,
      `  Currently working with the team on <span class="accent">Arabic language support</span> for the OS.`,
    );
    L.push("");
    L.push(...promptLines("~", null, "cat awards.txt"));
    L.push(
      `<span class="head">MOFCOM</span> Chinese Government Scholarship — <span class="accent">PhD</span>    <span class="dim">2026</span>`,
      `  Full scholarship, Ministry of Commerce of China — AI, Beihang University.`,
      `<span class="head">MOFCOM</span> Chinese Government Scholarship — <span class="accent">MSc</span>    <span class="dim">2024</span>`,
      `  Full scholarship — Software Engineering, Nankai University.`,
      `  <span class="dim">Both degrees funded by the Chinese Government (MOFCOM).</span>`,
    );
    L.push("");
    L.push(...promptLines("~", null, "cat publications.txt"));
    for (const p of SITE.publications) L.push(...pubLines(p));
    L.push("");
    L.push(...promptLines("~", null, "stack --languages"));
    const max = Math.max(...SITE.langs.map((l) => l[1]));
    for (const [name, n] of SITE.langs) {
      L.push(`${kv(name, "")} ${bar(n, max, 14)}  ${n} repo${n > 1 ? "s" : ""}`);
    }
    L.push("");
    L.push(...promptLines("~", null, "stack --ai"));
    L.push(
      `LLMs · multi-agent systems · knowledge graphs`,
      `GNNs · multimodal AI · computer vision · NLP`,
      `<span class="dim">pytorch · next.js · supabase · typescript</span>`,
    );
    L.push("");
    L.push(...promptLines("~", null, "ls links/"));
    L.push([
      link(SITE.github, "github"),
      link("mailto:" + SITE.email, "email"),
      ...extraLinks(),
      link(doiUrl(SITE.publications[0].doi), "paper"),
    ].join("    "));
    return L;
  }

  function buildProject(e) {
    const L = [];
    const path = `~/P/${e.repo}`;
    L.push(...promptLines(path, "main", `fetch ${e.repo}`));
    L.push(`<span class="head">${esc(e.repo)}</span>`);
    L.push(esc(e.tagline));
    L.push("");
    if (e.upstream) {
      L.push(kv("fork of", link(`https://github.com/${e.upstream}`, e.upstream)));
    }
    L.push(
      kv("lang", `<span class="accent">${esc(e.lang)}</span>`),
      kv("since", `${e.since}   <span class="dim">pushed ${e.pushed}</span>`),
    );
    L.push("");
    L.push(...promptLines(path, "main", "cat README.md"));
    for (const b of e.bullets) L.push(`<span class="hot">·</span> ${esc(b)}`);
    L.push("");
    L.push(...promptLines(path, "main", `open github.com/${SITE.githubUser}/${e.repo}`));
    L.push(link(`https://github.com/${SITE.githubUser}/${e.repo}`));
    if (e.homepage) {
      L.push("");
      L.push(...promptLines(path, "main", `open ${e.homepage.replace("https://", "")}`));
      L.push(link(e.homepage));
    }
    return L;
  }

  function buildResearch() {
    const L = [];
    L.push(...promptLines("~/research", null, "cat publications.txt"));
    for (const p of SITE.publications) L.push(...pubLines(p));
    L.push("");
    L.push(...promptLines("~/research", null, "ls awards/"));
    for (const a of SITE.awards) {
      L.push(`<span class="hot">·</span> ${esc(a.what)}` +
        (a.when ? `  <span class="dim">${a.when}</span>` : ""));
    }
    L.push("");
    L.push(...promptLines("~/research", null, "langs --human"));
    L.push(
      kv("kurdish", "mother language"),
      kv("english", "fluent · IELTS 7.0"),
      kv("chinese", "HSK 4"),
      kv("arabic", "basic"),
    );
    return L;
  }

  function statsFor(e) {
    if (e.type === "project") {
      return [
        ["LANG", e.lang.split(" ")[0]],
        ["SINCE", e.since.slice(0, 4)],
      ];
    }
    if (e.type === "research") {
      return [
        ["PAPERS", SITE.publications.length],
        ["AWARDS", SITE.awards.length],
        ["TALKS", SITE.awards.filter((a) => a.talk).length],
      ];
    }
    return [
      ["REPOS", SITE.stats.repos],
      ["FOLLOWERS", SITE.stats.followers],
    ];
  }

  /* ── selection ─────────────────────────────────────── */

  function renderTerm(e) {
    const lines =
      e.type === "project" ? buildProject(e) :
      e.type === "research" ? buildResearch() :
      buildWhoami();
    term.innerHTML = lines
      .map((html, i) => {
        const delay = Math.min(i * 35, 900);
        if (html === "") return `<div class="gap"></div>`;
        if (html.startsWith("<div")) return `<div class="line block" style="animation-delay:${delay}ms">${html}</div>`;
        const cls = html.startsWith("<span class=\"user\"") || html.startsWith("<span class=\"chev\"") ? " prompt" : "";
        return `<div class="line${cls}" style="animation-delay:${delay}ms">${html}</div>`;
      })
      .join("");
    Portrait.mountAll(term);
    term.scrollTop = 0;
  }

  function renderStats(e) {
    sbStats.innerHTML = statsFor(e)
      .map(([k, v]) => `<span class="sb-stat"><span class="k">${k}</span><span class="v">${v}</span></span>`)
      .join("");
  }

  function select(i, opts = {}) {
    idx = (i + entries.length) % entries.length;
    const e = entries[idx];
    itemsEl.querySelectorAll(".card").forEach((c, j) => {
      c.classList.toggle("active", j === idx);
      c.setAttribute("aria-selected", j === idx ? "true" : "false");
    });
    tabFile.textContent = e.repo || e.title;
    announce.textContent = e.tagline ? `${e.title} — ${e.tagline}` : e.title;
    renderTerm(e);
    renderStats(e);
    if (opts.push !== false) {
      history.replaceState(null, "", "#" + e.id);
    }
    if (opts.rotate !== false) {
      snapTarget = rotFor(idx);
      snapping = true;
    }
  }

  function currentLink(e) {
    if (e.type === "project") return `https://github.com/${SITE.githubUser}/${e.repo}`;
    if (e.type === "research") return doiUrl(SITE.publications[0].doi);
    return SITE.github;
  }

  /* ── the wheel: cards on a circle ──────────────────── */

  const N = entries.length;
  const CARD_W = 150;

  entries.forEach((e, i) => {
    const b = document.createElement("button");
    b.className = "card";
    b.type = "button";
    b.setAttribute("role", "option");
    b.dataset.id = e.id;
    b.innerHTML = `<span class="glyph">${esc(e.glyph)}</span><span class="title">${esc(e.title)}</span>`;
    b.addEventListener("click", () => {
      if (dragMoved > 4) return; // was a drag, not a click
      if (i === idx) window.open(currentLink(e), "_blank", "noopener");
      else select(i);
    });
    itemsEl.appendChild(b);
  });

  const cards = [...itemsEl.children];

  let geo = null;
  let rot = 0;          // current rotation offset (rad)
  let vel = 0;          // angular velocity (rad/frame)
  let snapping = false;
  let snapTarget = 0;
  let lastUser = 0;
  let dragging = false;
  let dragMoved = 0;
  let dragY = 0;

  // angle of card k for a given rotation
  function angleOf(k, r) {
    return -geo.half + (k + 0.5) * geo.step + r;
  }
  // rotation that puts card k at the apex (angle 0)
  function rotFor(k) {
    return geo.half - (k + 0.5) * geo.step;
  }

  function measure() {
    const r = wheelEl.getBoundingClientRect();
    const H = Math.max(200, r.height);
    const W = Math.max(120, r.width);
    const R = Math.max(300, H * 0.9);
    const half = Math.asin(Math.min(0.9, Math.max(0.2, (H / 2 - 30) / R)));
    const cardH = cards[0] ? cards[0].offsetHeight : 96;
    const apexX = W - CARD_W / 2 - 18;
    geo = { W, H, R, half, step: (2 * half) / N, cx: apexX - R, cy: H / 2, cardH };
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    inkEl.width = Math.round(W * dpr);
    inkEl.height = Math.round(H * dpr);
    ictx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function clampRot(r) {
    return Math.max(rotFor(N - 1) - geo.step * 0.6, Math.min(rotFor(0) + geo.step * 0.6, r));
  }

  function nearestCard() {
    let best = 0, bestD = Infinity;
    for (let k = 0; k < N; k++) {
      const d = Math.abs(angleOf(k, rot));
      if (d < bestD) { bestD = d; best = k; }
    }
    return best;
  }

  function layoutCards() {
    const { R, cx, cy, cardH, half, step } = geo;
    for (let k = 0; k < N; k++) {
      const a = angleOf(k, rot);
      const c = cards[k];
      if (Math.abs(a) > half + step * 1.6) {
        c.style.visibility = "hidden";
        continue;
      }
      c.style.visibility = "visible";
      const front = Math.max(0, Math.cos((a / (half + step)) * Math.PI * 0.5));
      const x = cx + Math.cos(a) * R;
      const y = cy + Math.sin(a) * R;
      const s = 0.62 + 0.38 * front;
      c.style.opacity = (0.25 + 0.75 * front).toFixed(3);
      c.style.zIndex = Math.round(front * 100);
      c.style.transform =
        `translate(${(x - CARD_W / 2).toFixed(1)}px, ${(y - cardH / 2).toFixed(1)}px)` +
        ` rotate(${(a * 0.5).toFixed(4)}rad) scale(${s.toFixed(4)})`;
    }
    markEl.style.transform = `translate(${(cx + R + CARD_W / 2 + 6).toFixed(1)}px, ${(cy - 6).toFixed(1)}px)`;
  }

  /* ── ink: organic ring behind the wheel ────────────── */

  const t0 = performance.now();
  const seeds = Array.from({ length: 14 }, (_, i) => ({
    a: -1 + i * 0.16,
    r: (i % 2 ? 14 : -18) + (i * 7) % 9,
    s: 0.6 + ((i * 37) % 10) / 14,
  }));
  const tendrilSeed = Array.from({ length: N }, (_, i) => 0.5 + ((i * 53) % 10) / 12);

  function drawInk(t) {
    const { W, H, R, cx, cy, half, step } = geo;
    ictx.clearRect(0, 0, W, H);
    if (REDUCED) t = 0;
    const form = REDUCED ? 1 : Math.min(1, (t - t0) / 2800);
    const p = form < 1 ? 1 - Math.pow(1 - form, 3) : 1;

    ictx.strokeStyle = COL.dim;
    ictx.fillStyle = COL.dim;

    // wobbly multi-stroke ring
    const a0 = -half - 0.28, a1 = half + 0.28;
    for (let pass = 0; pass < 4; pass++) {
      ictx.globalAlpha = 0.09 + pass * 0.05;
      ictx.lineWidth = 1.2 + pass * 1.1;
      ictx.beginPath();
      const span = a0 + (a1 - a0) * p;
      for (let a = a0; a <= span; a += 0.02) {
        const wob =
          9 * Math.sin(a * 13 + pass * 2.1 + t / 1400) +
          5 * Math.sin(a * 31 - pass * 1.3 + t / 2100) +
          2.5 * Math.sin(a * 67 + t / 900);
        const x = cx + Math.cos(a) * (R + wob);
        const y = cy + Math.sin(a) * (R + wob);
        if (a === a0) ictx.moveTo(x, y);
        else ictx.lineTo(x, y);
      }
      ictx.stroke();
    }

    // dandelion hairs fanning outward all along the ring
    ictx.lineWidth = 0.7;
    const hairs = 90;
    for (let i = 0; i < hairs; i++) {
      const a = a0 + (i / hairs) * (a1 - a0) * p;
      const seedH = Math.sin(i * 127.3) * 0.5 + 0.5;
      const sway = Math.sin(t / 1500 + i * 0.9) * 0.05;
      const L = (26 + 60 * seedH) * p;
      const aa = a + sway;
      const wob = 9 * Math.sin(a * 13 + t / 1400) + 5 * Math.sin(a * 31 + t / 2100);
      const x0 = cx + Math.cos(aa) * (R + wob);
      const y0 = cy + Math.sin(aa) * (R + wob);
      const x1 = cx + Math.cos(aa + 0.06 * seedH) * (R + wob + L);
      const y1 = cy + Math.sin(aa + 0.06 * seedH) * (R + wob + L);
      const mx = cx + Math.cos(aa - 0.05) * (R + wob + L * 0.5);
      const my = cy + Math.sin(aa - 0.05) * (R + wob + L * 0.5);
      ictx.globalAlpha = 0.05 + 0.13 * seedH;
      ictx.beginPath();
      ictx.moveTo(x0, y0);
      ictx.quadraticCurveTo(mx, my, x1, y1);
      ictx.stroke();
      if (seedH > 0.72) {
        ictx.globalAlpha = 0.22;
        ictx.beginPath();
        ictx.arc(x1, y1, 1.4, 0, 7);
        ictx.fill();
      }
    }

    // tendrils reaching out to each card
    for (let k = 0; k < N; k++) {
      const a = angleOf(k, rot);
      if (Math.abs(a) > half + step) continue;
      const front = Math.max(0, Math.cos((a / (half + step)) * Math.PI * 0.5));
      const sway = Math.sin(t / 1300 + k * 1.7) * 0.06;
      const aa = a + sway;
      const L = (60 + 70 * tendrilSeed[k]) * p * (0.35 + 0.65 * front);
      const x0 = cx + Math.cos(aa) * R;
      const y0 = cy + Math.sin(aa) * R;
      const x1 = cx + Math.cos(aa + 0.05) * (R + L);
      const y1 = cy + Math.sin(aa + 0.05) * (R + L);
      const mx = cx + Math.cos(aa - 0.04) * (R + L * 0.5);
      const my = cy + Math.sin(aa - 0.04) * (R + L * 0.5);
      ictx.globalAlpha = 0.16 + 0.2 * front;
      ictx.lineWidth = 1;
      ictx.beginPath();
      ictx.moveTo(x0, y0);
      ictx.quadraticCurveTo(mx, my, x1, y1);
      ictx.stroke();
      // tip dot
      ictx.globalAlpha = 0.25 + 0.25 * front;
      ictx.beginPath();
      ictx.arc(x1, y1, 1.6, 0, 7);
      ictx.fill();
    }

    // drifting seed dots around the ring
    for (const sd of seeds) {
      const a = sd.a + Math.sin(t / 1700 * sd.s + sd.r) * 0.05;
      const rr = R + sd.r + Math.sin(t / 1100 + sd.a * 9) * 4;
      ictx.globalAlpha = 0.18 * p;
      ictx.beginPath();
      ictx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1.2, 0, 7);
      ictx.fill();
    }

    ictx.globalAlpha = 1;
  }

  /* ── wheel interaction ─────────────────────────────── */

  wheelEl.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    vel -= ev.deltaY * 0.00012;
    snapping = false;
    lastUser = performance.now();
  }, { passive: false });

  wheelEl.addEventListener("pointerdown", (ev) => {
    if (ev.target.closest(".card") && ev.button !== 0) return;
    dragging = true;
    dragMoved = 0;
    dragY = ev.clientY;
    vel = 0;
    snapping = false;
    wheelEl.classList.add("dragging");
    wheelEl.setPointerCapture(ev.pointerId);
  });

  wheelEl.addEventListener("pointermove", (ev) => {
    if (!dragging) return;
    const dy = ev.clientY - dragY;
    dragY = ev.clientY;
    dragMoved += Math.abs(dy);
    rot = clampRot(rot + dy / geo.R);
    vel = (dy / geo.R) * 0.9;
    lastUser = performance.now();
  });

  function endDrag() {
    dragging = false;
    wheelEl.classList.remove("dragging");
    lastUser = performance.now();
  }
  wheelEl.addEventListener("pointerup", endDrag);
  wheelEl.addEventListener("pointercancel", endDrag);

  let lastFrame = 0;
  function tick(t) {
    // 30fps on small screens: halves canvas work on phones
    if (window.innerWidth < 768 && t - lastFrame < 33) {
      requestAnimationFrame(tick);
      return;
    }
    lastFrame = t;
    const before = rot;
    if (!dragging) {
      if (snapping) {
        rot += (snapTarget - rot) * (REDUCED ? 1 : 0.14);
        if (Math.abs(snapTarget - rot) < 0.0004) { rot = snapTarget; snapping = false; }
      } else {
        rot = clampRot(rot + vel);
        vel *= 0.94;
        if (Math.abs(vel) < 0.0002 && t - lastUser > 140) {
          const k = nearestCard();
          if (k !== idx) select(k, { rotate: false });
          snapTarget = rotFor(k);
          snapping = true;
        }
      }
    }
    if (!REDUCED || inkDirty || rot !== before || dragging) {
      layoutCards();
      drawInk(t);
      inkDirty = false;
    }
    requestAnimationFrame(tick);
  }
  let inkDirty = true;
  window.addEventListener("zamo:theme", () => { inkDirty = true; });

  window.addEventListener("resize", () => {
    inkDirty = true;
    measure();
    rot = rotFor(idx);
    snapTarget = rot;
  });

  /* ── command line ──────────────────────────────────── */

  const cmdline = $("#cmdline");
  const cmdInput = $("#cmd-input");

  function openCmd() {
    cmdline.hidden = false;
    cmdInput.value = "";
    cmdInput.focus();
  }
  function closeCmd() {
    cmdline.hidden = true;
    cmdInput.blur();
  }

  function renderTermRaw(lines) {
    term.innerHTML = lines
      .map((html, i) =>
        html === "" ? `<div class="gap"></div>` : `<div class="line" style="animation-delay:${i * 25}ms">${html}</div>`
      )
      .join("");
    Portrait.mountAll(term);
  }

  function runCommand(raw) {
    const [cmd, ...args] = raw.trim().split(/\s+/);
    const arg = args.join(" ");
    switch ((cmd || "").toLowerCase()) {
      case "theme": {
        const t = cycleTheme(arg || null);
        renderTermRaw([...promptLines("~", null, `theme ${arg}`.trim()), `theme set to <span class="accent">${t}</span>`]);
        break;
      }
      case "go":
      case "e":
      case "open": {
        if (!arg && cmd === "open") { window.open(currentLink(entries[idx]), "_blank", "noopener"); break; }
        const q = (arg || "").toLowerCase();
        const i = entries.findIndex((e) => e.id.includes(q) || e.title.toLowerCase().includes(q));
        if (i >= 0) select(i);
        else renderTermRaw([...promptLines("~", null, raw), `<span class="hot">no such entry:</span> ${esc(arg)}`]);
        break;
      }
      case "github": window.open(SITE.github, "_blank", "noopener"); break;
      case "mail":
      case "email": location.href = "mailto:" + SITE.email; break;
      case "ls":
        renderTermRaw([...promptLines("~", null, "ls"), ...entries.map((e) => esc(e.title))]);
        break;
      case "whoami": select(0); break;
      case "help":
      case "?":
        renderTermRaw([
          ...promptLines("~", null, "help"),
          "theme [dark|paper|phosphor]   cycle or set the theme",
          "go &lt;name&gt;                   jump to an entry",
          "open                      open the current entry's link",
          "ls                        list entries",
          "github · email            shortcuts",
          "help                      this text",
        ]);
        break;
      case "q":
      case "quit": location.href = "../"; break;
      case "":
        break;
      default:
        renderTermRaw([...promptLines("~", null, raw), `<span class="hot">unknown command:</span> ${esc(cmd)} <span class="dim">— try help</span>`]);
    }
  }

  cmdInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") { runCommand(cmdInput.value); closeCmd(); }
    if (ev.key === "Escape") closeCmd();
    ev.stopPropagation();
  });

  /* ── keyboard ──────────────────────────────────────── */

  document.addEventListener("keydown", (ev) => {
    if (!cmdline.hidden || !isShortcutTarget(ev)) return;
    if (ev.key === "ArrowDown" || ev.key === "j") { select(idx + 1); ev.preventDefault(); }
    else if (ev.key === "ArrowUp" || ev.key === "k") { select(idx - 1); ev.preventDefault(); }
    else if (ev.key === "Enter") { window.open(currentLink(entries[idx]), "_blank", "noopener"); }
    else if (ev.key === ":") { openCmd(); ev.preventDefault(); }
  });

  /* ── local time in Beijing (handy before emailing) ─ */

  const clock = $("#sb-clock");
  function tickClock() {
    const time = new Date().toLocaleTimeString("en-GB", {
      timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit",
    });
    clock.textContent = `BEIJING · ${time} UTC+8`;
  }
  tickClock();
  setInterval(tickClock, 30000);

  /* ── deco readout jitter ───────────────────────────── */

  const readout = $("#deco-readout");
  if (!REDUCED) setInterval(() => {
    readout.textContent =
      `['pupil:u'] 0.${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}\n` +
      `0.50${String(Math.floor(Math.random() * 1e5)).padStart(5, "0")}\n` +
      `0.017${String(Math.floor(Math.random() * 1e5)).padStart(5, "0")}\nNone`;
  }, 900);

  /* ── live GitHub numbers (falls back to data.js) ───── */

  async function loadGitHub() {
    const KEY = "zamo.gh";
    let gh = null;
    try {
      const cached = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (cached && Date.now() - cached.at < 3600e3) gh = cached;
    } catch (e) {}
    if (!gh) {
      const api = `https://api.github.com/users/${SITE.githubUser}`;
      const [user, repos] = await Promise.all([
        fetch(api).then((r) => (r.ok ? r.json() : null)),
        fetch(`${api}/repos?per_page=100`).then((r) => (r.ok ? r.json() : null)),
      ]);
      if (!user || !Array.isArray(repos)) return; // rate-limited or offline
      gh = {
        at: Date.now(),
        followers: user.followers,
        repos: user.public_repos,
        pushed: Object.fromEntries(repos.map((r) => [r.name, r.pushed_at.slice(0, 10)])),
        langs: repos.filter((r) => !r.fork && r.language).map((r) => r.language),
      };
      try { sessionStorage.setItem(KEY, JSON.stringify(gh)); } catch (e) {}
    }
    SITE.stats.followers = gh.followers;
    SITE.stats.repos = gh.repos;
    for (const e of entries) if (e.repo && gh.pushed[e.repo]) e.pushed = gh.pushed[e.repo];
    const counts = {};
    for (const l of gh.langs) counts[l] = (counts[l] || 0) + 1;
    SITE.langs = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    renderStats(entries[idx]);
    // refresh dates on an open project; other pages pick up the new
    // numbers on the next selection (no need to replay the portrait intro)
    if (entries[idx].type === "project") renderTerm(entries[idx]);
  }

  /* ── boot ──────────────────────────────────────────── */

  $("#wheel-date").textContent = new Date().toISOString().slice(0, 10);
  measure();
  const hash = location.hash.slice(1).split("/")[0];
  const start = Math.max(0, entries.findIndex((e) => e.id === hash));
  rot = rotFor(start);
  snapTarget = rot;
  select(start, { push: false, rotate: false });
  requestAnimationFrame(tick);
  loadGitHub().catch(() => {});

  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1).split("/")[0];
    const i = entries.findIndex((e) => e.id === id);
    if (i >= 0 && i !== idx) select(i);
  });
})();
