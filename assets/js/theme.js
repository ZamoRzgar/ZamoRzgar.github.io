/* zamo — shared theme switching (used by the landing page and the main site) */

const Theme = (() => {
  "use strict";

  const THEMES = ["dark", "paper", "phosphor"];

  // Set `name` if it is a known theme, otherwise move to the next one.
  function cycle(name) {
    const cur = document.documentElement.dataset.theme;
    const next = name && THEMES.includes(name)
      ? name
      : THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("zamo.theme", next); } catch (e) {}
    window.dispatchEvent(new Event("zamo:theme"));
    return next;
  }

  return { THEMES, cycle };
})();

/* Global single-key shortcuts must not fire while the user is typing,
   holding a modifier, or activating a focused button/link with Enter. */
function isShortcutTarget(ev) {
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
  const el = ev.target && ev.target.closest ? ev.target : null;
  if (!el) return true;
  if (el.closest("input, textarea, select, [contenteditable]")) return false;
  // a focused button/link already handles Enter itself
  if (ev.key === "Enter" && el.closest("a, button")) return false;
  return true;
}
