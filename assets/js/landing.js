/* zamo.dev — landing page chrome (theme, command line, shortcuts) */

(() => {
  "use strict";

  const THEMES = ["dark", "paper", "phosphor"];
  const cmdline = document.getElementById("cmdline");
  const cmdInput = document.getElementById("cmd-input");

  function cycleTheme(name) {
    const cur = document.documentElement.dataset.theme;
    const next = name && THEMES.includes(name)
      ? name
      : THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("zamo.theme", next); } catch (e) {}
    window.dispatchEvent(new Event("zamo:theme"));
  }

  document.getElementById("theme-btn").addEventListener("click", () => cycleTheme());

  function openCmd() {
    cmdline.hidden = false;
    cmdInput.value = "";
    cmdInput.focus();
  }
  function closeCmd() {
    cmdline.hidden = true;
    cmdInput.blur();
  }

  cmdInput.addEventListener("keydown", (ev) => {
    ev.stopPropagation();
    if (ev.key === "Escape") closeCmd();
    if (ev.key !== "Enter") return;
    const v = cmdInput.value.trim().toLowerCase();
    closeCmd();
    if (v === "theme" || v.startsWith("theme ")) cycleTheme(v.split(" ")[1]);
    else if (v === "enter" || v === "e" || v === "site") location.href = "site/";
    else if (v === "github") window.open(SITE.github, "_blank");
  });

  document.addEventListener("keydown", (ev) => {
    if (!cmdline.hidden) return;
    if (ev.key === "Enter") location.href = "site/";
    else if (ev.key === ":") { openCmd(); ev.preventDefault(); }
  });
})();
