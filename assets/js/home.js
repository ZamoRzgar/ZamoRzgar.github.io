/* zamo — landing: a live vim session on canvas + keyboard hands */

(() => {
  "use strict";

  /* ── code buffers shown in the editor ──────────────── */

  // Real excerpts from the repos (path + starting line number are accurate).
  const FILES = [
    {
      "path": "~/projects/gnn-fraud-detection/code/src/models.py",
      "lang": "py",
      "start": 343,
      "code": "    def forward(self, x, relation_edge_index, y=None, train_mask=None):\n        num_nodes = x.shape[0]\n        h = F.relu(self.input_proj(x))\n        h = F.dropout(h, p=self.dropout, training=self.training)\n        self._h = h  # kept for aux_loss()\n\n        views = []\n        for r, rel in enumerate(sorted(relation_edge_index)):\n            ei = self._filter_and_sample(\n                h,\n                relation_edge_index[rel],\n                self.sim_mlps[r] if self.use_filter else None,\n                num_nodes,\n                y,\n                train_mask,\n            )\n            agg = _dot_attention_aggregate(h, ei, self.attn_mats[r], num_nodes)\n            views.append(F.relu(agg + h))  # residual self-connection\n        hv = torch.stack(views, dim=1)  # [N, R, H]\n\n        alpha = torch.softmax(\n            hv @ self.rel_query / math.sqrt(hv.shape[-1]), dim=1\n        )  # [N, R]\n        z = (alpha.unsqueeze(-1) * hv).sum(dim=1)\n        z = F.dropout(z, p=self.dropout, training=self.training)\n        return self.classifier(z)"
    },
    {
      "path": "~/projects/Multi-agent-RCA-project/src/agents/judge.py",
      "lang": "py",
      "start": 47,
      "code": "        parsed_logs = input_data.get(\"parsed_logs\", {})\n        kg_facts = input_data.get(\"kg_facts\", {})\n        \n        logger.info(f\"Judging {len(hypotheses)} hypotheses\")\n        \n        # Score each hypothesis\n        scored_hypotheses = []\n        for hyp in hypotheses:\n            scores = self._score_hypothesis(hyp, parsed_logs, kg_facts)\n            scored_hypotheses.append({\n                \"hypothesis\": hyp,\n                \"scores\": scores,\n                \"total_score\": sum(scores.values())\n            })\n        \n        # Select best hypothesis\n        best = max(scored_hypotheses, key=lambda x: x[\"total_score\"])\n        \n        judgment = {\n            \"selected_hypothesis\": best[\"hypothesis\"],\n            \"all_scores\": scored_hypotheses,\n            \"reasoning\": self._generate_reasoning(scored_hypotheses),\n            \"confidence\": best[\"total_score\"] / len(self.scoring_criteria)\n        }\n        \n        return judgment"
    },
    {
      "path": "~/projects/live-ddos-map/frontend/src/hooks/useSocket.ts",
      "lang": "ts",
      "start": 18,
      "code": "  useEffect(() => {\n    // Create socket connection\n    const newSocket = io(SERVER_URL, {\n      transports: ['websocket', 'polling'],\n    });\n\n    // Connection event handlers\n    newSocket.on('connect', () => {\n      console.log('Connected to server');\n      setIsConnected(true);\n    });\n\n    newSocket.on('disconnect', () => {\n      console.log('Disconnected from server');\n      setIsConnected(false);\n    });\n\n    // Data event handlers\n    newSocket.on('initial_attacks', (initialAttacks: Attack[]) => {\n      console.log('Received initial attacks:', initialAttacks.length);\n      setAttacks(initialAttacks);\n    });\n\n    newSocket.on('new_attacks', (newAttacks: Attack[]) => {\n      console.log('Received new attacks:', newAttacks.length);\n      setAttacks(prev => {\n        // Remove old attacks (older than 5 minutes) and add new ones\n        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);\n        const filteredAttacks = prev.filter(attack => \n          new Date(attack.timestamp) > fiveMinutesAgo\n        );\n        return [...filteredAttacks, ...newAttacks];\n      });\n    });\n\n    newSocket.on('attack_stats', (newStats: AttackStats) => {\n      setStats(newStats);\n    });\n"
    }
  ];

  const INSERT_POOL = [
    "# tune the judge threshold",
    "# graph first, table second",
    "// render what the net sees",
    "# grounding beats guessing",
    "// every arc is a packet storm",
    "# let the agents argue",
  ];

  const MSG_POOL = [
    "1 line less; before #2  1 second ago",
    "1 more line",
    "2 lines yanked",
    "1 line less; after #4  2 seconds ago",
    "3 more lines",
  ];

  /* ── tiny regex highlighter ────────────────────────── */

  const KW = {
    py: "def class return import from for in if else elif not and or None True False self async await with as raise try except lambda super".split(" "),
    ts: "const let function return import from export interface type new if else for of async await as number string".split(" "),
  };

  function tokenize(line, lang) {
    const spans = [];
    const push = (a, b, role) => { if (a < b) spans.push([a, b, role]); };
    const commentAt = lang === "py" ? line.indexOf("#") : line.indexOf("//");
    const codeEnd = commentAt >= 0 ? commentAt : line.length;
    if (commentAt >= 0) push(commentAt, line.length, "comment");
    const re = /("""[\s\S]*?"""|'[^']*'|"[^"]*"|`[^`]*`)|(@\w+)|(\b\d[\d._e]*\b)|([A-Za-z_]\w*)/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      if (m.index >= codeEnd) break;
      const [full, str, dec, num, word] = m;
      const end = m.index + full.length;
      if (str) push(m.index, end, "string");
      else if (dec) push(m.index, end, "hot");
      else if (num) push(m.index, end, "cool");
      else if (word) {
        if (KW[lang].includes(word)) push(m.index, end, "kw");
        else if (/^[A-Z]/.test(word)) push(m.index, end, "type");
        else if (line[end] === "(") push(m.index, end, "fn");
      }
    }
    return spans;
  }

  /* ── colors ────────────────────────────────────────── */

  let COL = {};
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const g = (k) => cs.getPropertyValue(k).trim();
    COL = {
      bg: g("--bg"), fg: g("--fg"), dim: g("--dim"), faint: g("--faint"),
      accent: g("--accent"), hot: g("--hot"), cool: g("--cool"),
      panel: g("--bg2"), line: g("--line"),
    };
  }
  readColors();
  window.addEventListener("zamo:theme", readColors);

  const ROLE = () => ({
    comment: COL.faint, string: COL.accent, kw: COL.hot, type: COL.cool,
    fn: COL.fg, hot: COL.hot, cool: COL.cool, text: COL.dim,
  });

  /* ── vim wall ──────────────────────────────────────── */

  const wall = document.getElementById("wall");
  const wctx = wall.getContext("2d");
  const FONT = 14, LH = 21;
  let CW = 7.5; // char width, measured later

  const state = {
    file: 0,
    lines: [],
    cursor: { l: 4, c: 0 },
    top: 0,
    mode: "NORMAL",
    cmd: "",          // cmdline content (":" prefix shown by renderer)
    msg: "",
    split: null,      // {file, top} when a right split is open
    dirty: null,      // inserted text info for undo
  };

  function loadFile(i) {
    state.file = i;
    state.lines = FILES[i].code.split("\n");
    state.cursor = { l: Math.min(4, state.lines.length - 1), c: 0 };
    state.top = 0;
    state.dirty = null;
  }
  loadFile(0);

  let W = 0, H = 0, DPR = 1, rows = 0, cols = 0, paneW = 0, gutterW = 0;

  function resize() {
    DPR = Math.min(1.5, window.devicePixelRatio || 1);
    const r = wall.getBoundingClientRect();
    W = r.width; H = r.height;
    wall.width = Math.round(W * DPR);
    wall.height = Math.round(H * DPR);
    wctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    wctx.font = `${FONT}px "JetBrains Mono", ui-monospace, monospace`;
    CW = wctx.measureText("M").width;
    gutterW = CW * 5;
    rows = Math.floor((H - LH * 2) / LH); // leave room for status + cmdline
  }
  resize();
  window.addEventListener("resize", resize);

  function drawPane(x, w, fileIdx, top, cursor, active) {
    const f = FILES[fileIdx];
    const lines = fileIdx === state.file ? state.lines : f.code.split("\n");
    const roles = ROLE();
    wctx.save();
    wctx.beginPath();
    wctx.rect(x, 0, w, rows * LH + LH * 2);
    wctx.clip();

    // header: // — path —
    const hdr = (f.lang === "py" ? "#" : "//") + " — " + f.path + " —";
    wctx.fillStyle = COL.faint;
    wctx.textAlign = "left";
    wctx.fillText(hdr, x + gutterW, LH * 0.75);

    const codeCols = Math.floor((w - gutterW) / CW);
    for (let r = 0; r < rows; r++) {
      const li = top + r;
      const y = LH * (r + 1) + LH * 0.4;
      if (li >= lines.length) {
        wctx.fillStyle = COL.faint;
        wctx.textAlign = "left";
        wctx.fillText("~", x + 2, y);
        continue;
      }
      // line number
      wctx.fillStyle = COL.faint;
      wctx.textAlign = "right";
      wctx.fillText(String(li + (f.start || 1)), x + gutterW - CW, y);
      // code
      const text = lines[li];
      wctx.textAlign = "left";
      const spans = tokenize(text, f.lang);
      let si = 0;
      wctx.fillStyle = roles.text;
      const maxChars = codeCols;
      // draw span by span
      let pos = 0;
      const draw = (s, e, color) => {
        if (e <= 0 || s >= maxChars) return;
        wctx.fillStyle = color;
        wctx.fillText(text.slice(Math.max(0, s), Math.min(maxChars, e)), x + gutterW + Math.max(0, s) * CW, y);
      };
      for (const [a, b, role] of spans) {
        draw(pos, a, roles.text);
        draw(a, b, roles[role] || roles.text);
        pos = b;
      }
      draw(pos, text.length, roles.text);
    }

    // cursor
    if (active) {
      const cx = x + gutterW + cursor.c * CW;
      const cy = LH * (cursor.l - top + 1) + LH * 0.4 - FONT;
      if (cursor.l - top >= 0 && cursor.l - top < rows) {
        wctx.fillStyle = COL.fg;
        if (state.mode === "INSERT") {
          wctx.fillRect(cx, cy, 1.5, FONT + 4);
        } else {
          wctx.globalAlpha = 0.9;
          wctx.fillRect(cx, cy, CW, FONT + 4);
          wctx.globalAlpha = 1;
          const ch = (lines[cursor.l] || "")[cursor.c] || " ";
          wctx.fillStyle = COL.bg;
          wctx.textAlign = "left";
          wctx.fillText(ch, cx, cy + FONT);
        }
      }
    }

    // statusline
    const sy = rows * LH + LH * 1.4;
    wctx.fillStyle = COL.line;
    wctx.fillRect(x, sy - LH * 0.75, w, LH);
    const mode = active ? state.mode : "NORMAL";
    wctx.fillStyle = mode === "INSERT" ? COL.hot : COL.accent;
    const modeW = CW * (mode.length + 2);
    wctx.fillRect(x, sy - LH * 0.75, modeW, LH);
    wctx.fillStyle = COL.bg;
    wctx.textAlign = "center";
    wctx.fillText(mode, x + modeW / 2, sy - LH * 0.1);
    wctx.fillStyle = COL.dim;
    wctx.textAlign = "left";
    let shortPath = w < 420 ? f.path.split("/").pop() : f.path.replace("~/projects/", "~/p/");
    const maxPath = Math.max(6, Math.floor((w - modeW - 2 * CW) / CW) - 13);
    if (shortPath.length > maxPath) shortPath = "…" + shortPath.slice(-maxPath);
    wctx.fillText(shortPath, x + modeW + CW, sy - LH * 0.1);
    const pct = Math.round(((top + 1) / Math.max(1, lines.length - rows)) * 100);
    wctx.textAlign = "right";
    const ln = cursor.l + (f.start || 1);
    const posText = lines.length <= rows
      ? `${ln}:${cursor.c + 1} All`
      : `${ln}:${cursor.c + 1} ${isFinite(pct) ? Math.min(100, Math.max(1, pct)) : 1}%`;
    wctx.fillText(posText, x + w - CW, sy - LH * 0.1);
    wctx.restore();
  }

  function drawWall() {
    wctx.clearRect(0, 0, W, H);
    wctx.font = `${FONT}px "JetBrains Mono", ui-monospace, monospace`;
    wctx.textBaseline = "alphabetic";

    if (state.split) {
      const w2 = Math.floor(W * 0.42);
      drawPane(0, W - w2, state.file, state.top, state.cursor, true);
      // separator
      wctx.fillStyle = COL.line;
      wctx.fillRect(W - w2 - 1, 0, 1, rows * LH + LH * 2);
      drawPane(W - w2, w2, state.split.file, state.split.top, { l: 0, c: 0 }, false);
    } else {
      drawPane(0, W, state.file, state.top, state.cursor, true);
    }

    // cmdline
    const cy = rows * LH + LH * 2.35;
    wctx.textAlign = "left";
    if (state.cmd) {
      wctx.fillStyle = COL.fg;
      wctx.fillText(state.cmd, 0, cy);
      wctx.fillStyle = COL.fg;
      wctx.fillRect(state.cmd.length * CW, cy - FONT, CW, FONT + 3);
    } else if (state.msg) {
      wctx.fillStyle = COL.dim;
      wctx.fillText(state.msg, 0, cy);
    }
  }

  /* ── ghost typist ──────────────────────────────────── */

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function ensureVisible() {
    if (state.cursor.l < state.top + 2) state.top = Math.max(0, state.cursor.l - 2);
    if (state.cursor.l > state.top + rows - 3) state.top = Math.min(state.lines.length - 1, state.cursor.l - rows + 3);
    if (state.top < 0) state.top = 0;
  }

  async function typeCmd(cmd) {
    state.cmd = "";
    for (const ch of cmd) {
      state.cmd += ch;
      await wait(rnd(45, 110));
    }
    await wait(rnd(300, 700));
    state.cmd = "";
  }

  async function ghost() {
    for (;;) {
      const action = Math.random();
      if (action < 0.5) {
        // navigate
        const moves = Math.floor(rnd(2, 6));
        for (let i = 0; i < moves; i++) {
          const m = Math.random();
          if (m < 0.45) state.cursor.l = Math.max(0, Math.min(state.lines.length - 1, state.cursor.l + (Math.random() < 0.5 ? -1 : 1) * Math.floor(rnd(1, 4))));
          else if (m < 0.7) state.cursor.c = Math.floor(rnd(0, Math.max(1, (state.lines[state.cursor.l] || "").length)));
          else if (m < 0.8) state.cursor.l = 0;
          else if (m < 0.9) state.cursor.l = state.lines.length - 1;
          else state.cursor.c = 0;
          state.cursor.c = Math.min(state.cursor.c, Math.max(0, (state.lines[state.cursor.l] || "").length - 1));
          ensureVisible();
          await wait(rnd(180, 480));
        }
      } else if (action < 0.72) {
        // insert a comment, then maybe undo it
        const lang = FILES[state.file].lang;
        const pool = INSERT_POOL.filter((s) => s.startsWith(lang === "py" ? "#" : "//"));
        const text = pick(pool.length ? pool : INSERT_POOL);
        const indent = (state.lines[state.cursor.l].match(/^\s*/) || [""])[0];
        state.mode = "INSERT";
        const li = state.cursor.l;
        state.lines.splice(li + 1, 0, indent);
        state.cursor = { l: li + 1, c: indent.length };
        ensureVisible();
        await wait(rnd(200, 400));
        for (const ch of text) {
          const line = state.lines[state.cursor.l];
          state.lines[state.cursor.l] = line.slice(0, state.cursor.c) + ch + line.slice(state.cursor.c);
          state.cursor.c++;
          await wait(rnd(40, 120));
        }
        await wait(rnd(300, 800));
        state.mode = "NORMAL";
        state.cursor.c = Math.max(0, state.cursor.c - 1);
        if (Math.random() < 0.5) {
          await wait(rnd(1500, 3500));
          state.lines.splice(state.cursor.l, 1);
          state.cursor.l = Math.max(0, state.cursor.l - 1);
          state.msg = pick(MSG_POOL);
          ensureVisible();
          await wait(2200);
          state.msg = "";
        }
      } else if (action < 0.84) {
        // switch file
        const next = (state.file + 1) % FILES.length;
        await typeCmd(":e " + FILES[next].path.replace("~/projects/", "~/p/"));
        loadFile(next);
      } else if (action < 0.93) {
        // split on/off
        if (state.split) state.split = null;
        else state.split = { file: (state.file + 1) % FILES.length, top: Math.floor(rnd(0, 8)) };
        await wait(rnd(400, 900));
      } else {
        // idle wander with message
        state.msg = pick(MSG_POOL);
        await wait(1800);
        state.msg = "";
      }
      await wait(rnd(500, 1400));
    }
  }

  /* ── keyboard + hands ──────────────────────────────── */

  const kb = document.getElementById("kb");
  const kctx = kb.getContext("2d");
  let KW2 = 0, KH = 0;

  const ROWS = [
    ["esc", "`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "←"],
    ["⇥", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
    ["⌃", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "↩"],
    ["⇧", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "⇧"],
    ["", "", "", "space", "", "", ""],
  ];

  let keyPos = []; // {x, y, label}

  function resizeKb() {
    const r = kb.getBoundingClientRect();
    KW2 = r.width; KH = r.height;
    kb.width = Math.round(KW2 * DPR);
    kb.height = Math.round(KH * DPR);
    kctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    layoutKeys();
  }

  function layoutKeys() {
    keyPos = [];
    const unit = Math.min(KW2 / 17, KH / 7);
    const x0 = (KW2 - unit * 15) / 2;
    const y0 = KH * 0.08;
    ROWS.forEach((row, ri) => {
      let x = x0 + ri * unit * 0.3;
      const y = y0 + ri * unit * 1.1;
      for (const label of row) {
        const w = label === "space" ? unit * 5 : unit;
        keyPos.push({ x: x + w / 2, y, label, w, row: ri });
        x += w + unit * 0.12;
      }
    });
  }
  resizeKb();
  window.addEventListener("resize", resizeKb);

  const HOME = ["asdfg", "hjkl;'"];

  const hands = [
    { wrist: { x: 0, y: 0 }, fingers: [], label: "['hand0:u']", val: 0.4 },
    { wrist: { x: 0, y: 0 }, fingers: [], label: "['hand1:u']", val: 0.52 },
  ];

  function homeKeys(hi) {
    return keyPos.filter((k) => HOME[hi].includes(k.label));
  }

  function initHands() {
    hands[0].wrist = { x: KW2 * 0.38, y: KH * 1.02 };
    hands[1].wrist = { x: KW2 * 0.62, y: KH * 1.02 };
    hands.forEach((h, hi) => {
      const keys = homeKeys(hi);
      h.fingers = [];
      for (let f = 0; f < 5; f++) {
        const target = keys[Math.min(f + (hi ? 0 : 0), keys.length - 1)] || { x: KW2 / 2, y: KH / 2 };
        h.fingers.push({
          tip: { x: target.x, y: target.y + 30 },
          target: { x: target.x, y: target.y },
          spread: (f - 2) * 13,
          press: 0,
        });
      }
    });
  }

  function drawKb(t) {
    kctx.clearRect(0, 0, KW2, KH);
    kctx.font = `10px "JetBrains Mono", ui-monospace, monospace`;
    kctx.textAlign = "center";

    if (!hands[0].fingers.length && keyPos.length) initHands();

    // keys
    for (const k of keyPos) {
      if (!k.label) continue;
      kctx.fillStyle = COL.faint;
      kctx.fillText(k.label, k.x, k.y);
    }

    // hands
    hands.forEach((h, hi) => {
      const side = hi === 0 ? -1 : 1;
      h.val += (Math.random() - 0.5) * 0.004;
      h.val = Math.max(0.1, Math.min(0.95, h.val));
      kctx.fillStyle = COL.faint;
      kctx.textAlign = "left";
      kctx.fillText(`${h.label} ${h.val.toFixed(7)}`, h.wrist.x + side * 34 - 60, KH - 14);

      h.fingers.forEach((f, fi) => {
        // ease tip toward target
        f.tip.x += (f.target.x - f.tip.x) * 0.04;
        f.tip.y += (f.target.y - f.tip.y) * 0.04 + Math.sin(t / 900 + fi * 1.3) * 0.15;
        f.press *= 0.94;

        const base = { x: h.wrist.x + f.spread * 0.6, y: h.wrist.y };
        const midX = (base.x + f.tip.x) / 2 + f.spread * 0.9;
        const midY = (base.y + f.tip.y) / 2 + 10;

        kctx.strokeStyle = COL.faint;
        kctx.lineWidth = 1;
        kctx.beginPath();
        kctx.moveTo(base.x, base.y);
        kctx.quadraticCurveTo(midX, midY, f.tip.x, f.tip.y + f.press * 3);
        kctx.stroke();

        // knuckle + fingertip
        kctx.fillStyle = COL.faint;
        const qb = quadPoint(base, { x: midX, y: midY }, { x: f.tip.x, y: f.tip.y }, 0.5);
        kctx.beginPath(); kctx.arc(qb.x, qb.y, 1.4, 0, 7); kctx.fill();
        kctx.fillStyle = COL.dim;
        kctx.beginPath(); kctx.arc(f.tip.x, f.tip.y + f.press * 3, 1.8, 0, 7); kctx.fill();
      });
      kctx.textAlign = "center";
    });

    // occasionally retarget a finger along the home row
    if (Math.random() < 0.02 && keyPos.length) {
      const hi = Math.random() < 0.5 ? 0 : 1;
      const f = pick(hands[hi].fingers);
      const k = pick(homeKeys(hi));
      if (k) {
        f.target = { x: k.x, y: k.y - 4 };
        f.press = 1;
      }
    }
  }

  function quadPoint(p0, p1, p2, t) {
    const u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
    };
  }

  /* ── main loop ─────────────────────────────────────── */

  // Respect "reduce motion": draw a still frame and only redraw on change.
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function drawStill() {
    if (wall.width) drawWall();
    if (kb.width) drawKb(0);
  }

  let lastFrame = 0;
  function frame(t) {
    // 30fps on small screens: halves canvas work on phones
    if (window.innerWidth < 768 && t - lastFrame < 33) {
      requestAnimationFrame(frame);
      return;
    }
    lastFrame = t;
    if (wall.isConnected && wall.width) drawWall();
    if (kb.isConnected && kb.width) drawKb(t);
    requestAnimationFrame(frame);
  }
  // canvas text is measured with the web font, so re-measure once it loads
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { resize(); resizeKb(); if (REDUCED) drawStill(); });
  }

  if (REDUCED) {
    drawStill();
    window.addEventListener("resize", drawStill);
    window.addEventListener("zamo:theme", drawStill);
  } else {
    requestAnimationFrame(frame);
    ghost();
  }
})();
