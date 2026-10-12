/* Fermer le menu natif <details> sans piéger le clavier ; aucune donnée collectée. */
(() => {
  "use strict";
  const menu = document.getElementById("nav-explorer");
  if (!menu) return;
  document.addEventListener("click", (event) => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.open) {
      menu.open = false;
      menu.querySelector("summary")?.focus();
    }
  });
  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) menu.open = false;
  });
})();
