/* EcoSim 5.8.2 — lisibilité des écarts d'effectifs. Présentation uniquement ; aucun calcul modifié. */
(() => {
  "use strict";
  const root = document.getElementById("workforce-detail");
  if (!root || typeof MutationObserver === "undefined") return;

  const clean = (value) => value.replace(/[\u00a0\u202f\s]/g, "").trim();
  const isZero = (value) => /^0(?:[,.]0+)?k$/.test(clean(value));
  const isPositiveRoundedZero = (value) => /^\+0(?:[,.]0+)?k$/.test(clean(value));
  const isNegativeRoundedZero = (value) => /^[−-]0(?:[,.]0+)?k$/.test(clean(value));
  function interpretation(raw) {
    if (isZero(raw)) return { text: "Inchangé", speech: "aucun écart", kind: "zero" };
    if (isPositiveRoundedZero(raw)) return { text: "Hausse de moins de 50 agents", speech: "hausse positive, inférieure à 50 agents (arrondi)", kind: "small" };
    if (isNegativeRoundedZero(raw)) return { text: "Baisse de moins de 50 agents", speech: "baisse, inférieure à 50 agents (arrondi)", kind: "small" };
    return { text: raw, speech: raw.replace(/^\+/, "plus ").replace(/^[−-]/, "moins "), kind: "number" };
  }
  function upgrade() {
    const panel = root.querySelector(".workforce-panel-wide");
    if (!panel || panel.dataset.workforceUx582 === "done") return;
    panel.dataset.workforceUx582 = "done";
    const introduction = panel.querySelector(":scope > p");
    const year = introduction?.textContent.match(/au (20\d{2})\b/)?.[1] || "l’horizon choisi";
    if (introduction) {
      introduction.textContent = introduction.textContent.replace(
        /Recrutements réalisables cette année : ([\d\s\u00a0\u202f,.]+) k sur ([\d\s\u00a0\u202f,.]+) k demandés\./,
        (_whole, realized, requested) => {
          if (isZero(requested + " k")) return "Aucun recrutement supplémentaire demandé cette année.";
          if (isZero(realized + " k")) return `Aucun recrutement supplémentaire réalisable sur ${requested.trim()} k demandés cette année.`;
          return `Recrutements : ${realized.trim()} k réalisables sur ${requested.trim()} k demandés cette année.`;
        }
      );
    }
    // Les catégories A/B/C sont des pourcentages de composition, pas des écarts d'agents.
    // Ne traiter que les valeurs numériques portant réellement l'unité « k ».
    const rows = [...panel.querySelectorAll(".public-mission-grid .workforce-row, .public-summary-grid .workforce-row")]
      .filter((row) => /\s*k$/.test(row.querySelector(":scope > strong")?.textContent.trim() || ""));
    let unchanged = 0;
    rows.forEach((row) => {
      const value = row.querySelector(":scope > strong");
      if (!value) return;
      const outcome = interpretation(value.textContent.trim());
      value.textContent = outcome.text;
      value.classList.add("workforce-ux-delta");
      if (outcome.kind === "zero") {
        unchanged++;
        value.classList.add("workforce-ux-zero");
      } else if (outcome.kind === "small") value.classList.add("workforce-ux-small");
      value.setAttribute("aria-label", `Écart d’agents en activité en ${year} par rapport à la référence : ${outcome.speech}`);
      const note = row.querySelector("span > small");
      if (!note) return;
      // Les écarts de retraités non nuls restent visibles ; seul le bruit des zéros disparaît.
      const match = note.textContent.match(/ · retraités supplémentaires ([+−-]?[\d\s\u00a0\u202f,.]+ k)$/);
      if (match) {
        note.textContent = isZero(match[1])
          ? note.textContent.slice(0, -match[0].length)
          : note.textContent.slice(0, -match[0].length) + ` · écart de retraités : ${interpretation(match[1]).text.toLowerCase()}`;
      }
    });
    const legend = document.createElement("p");
    legend.className = "workforce-ux-legend";
    if (rows.length && unchanged === rows.length) {
      legend.textContent = `Effectifs publics inchangés dans ce scénario en ${year}. Sous chaque métier : effectif de référence. À droite : variation simulée (« Inchangé » signifie aucun écart).`;
    } else {
      legend.textContent = `Sous chaque métier : effectif de référence. À droite : variation simulée en ${year} (un signe + signifie une hausse, un signe − une baisse ; « Inchangé » signifie aucun écart).`;
    }
    panel.querySelector(".public-mission-grid")?.before(legend);
  }

  // app.js reconstruit le panneau à chaque projection : améliorer la nouvelle version sans
  // modifier le moteur ni les fichiers historiques à empreintes figées.
  new MutationObserver(upgrade).observe(root, { childList: true });
  upgrade();
})();
