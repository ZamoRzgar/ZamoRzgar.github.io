/* zamo — landing page chrome (theme, command line, shortcuts) */

(() => {
  "use strict";

  const SITE_URL = "portfolio/";
  const cmdline = document.getElementById("cmdline");
  const cmdInput = document.getElementById("cmd-input");

  document.getElementById("theme-btn").addEventListener("click", () => Theme.cycle());

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
    if (v === "theme" || v.startsWith("theme ")) Theme.cycle(v.split(" ")[1]);
    else if (v === "enter" || v === "e" || v === "site") location.href = SITE_URL;
    else if (v === "github") window.open(SITE.github, "_blank", "noopener");
  });

  document.addEventListener("keydown", (ev) => {
    if (!cmdline.hidden || !isShortcutTarget(ev)) return;
    if (ev.key === "Enter") location.href = SITE_URL;
    else if (ev.key === ":") { openCmd(); ev.preventDefault(); }
  });
})();
