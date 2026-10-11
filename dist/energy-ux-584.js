/* EcoSim 5.8.4 — préciser les variations énergétiques arrondies. Affichage seul. */
(() => {
  "use strict";
  const story = document.getElementById("story-reasons");
  const metrics = document.getElementById("structural-outcomes");
  if (!story || !metrics || typeof MutationObserver === "undefined") return;

  // signed() de app.js préserve le signe d'une valeur non nulle, même si elle
  // s'arrondit à 0,0. L'absence de signe signifie donc exactement zéro ici.
  const roundedZero = (raw, unit) => {
    const text = raw.replace(/[\s\u00a0\u202f]/g, "");
    const escaped = unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = text.match(new RegExp(`^([+−-]?)0(?:[,.]0+)?${escaped}$`));
    if (!m) return null;
    return m[1] === "+" ? "plus" : m[1] ? "moins" : "nul";
  };
  const label = (raw, unit, unitName) => {
    const sign = roundedZero(raw, unit);
    if (sign === null) return null;
    if (sign === "plus") return {text: `Hausse < 0,05 ${unitName}`, speech: `hausse inférieure à 0,05 ${unitName}, masquée par l’arrondi`};
    if (sign === "moins") return {text: `Baisse < 0,05 ${unitName}`, speech: `baisse inférieure à 0,05 ${unitName}, masquée par l’arrondi`};
    return {text: "Inchangé", speech: "aucune variation calculée"};
  };
  function upgradeStory() {
    const reason = [...story.querySelectorAll(".story-reason")]
      .find(el => el.querySelector("i")?.textContent.trim() === "ENE");
    const span = reason?.querySelector("span");
    if (!span || span.dataset.energyUx584 === "done") return;
    const text = span.textContent.trim();
    const m = text.match(/^Le scénario (alourdit|allège|laisse presque inchangée) la facture énergétique de (.+? Md€) et modifie les émissions de ([+−-]?[\d\s\u00a0\u202f,.]+ MtCO₂e)\.$/);
    if (!m) return;
    const [, direction, bill, emissions] = m;
    let billText = direction === "laisse presque inchangée"
      ? "Facture énergétique : variation inférieure à 0,05 Md€ par rapport à la référence (arrondi à 0,1 Md€)."
      : `Le scénario ${direction} la facture énergétique de ${bill}.`;
    const result = label(emissions, "MtCO₂e", "MtCO₂e");
    const emissionsText = result
      ? `Émissions : ${result.speech}.`
      : `Émissions : variation de ${emissions} par rapport à la référence.`;
    span.textContent = `${billText} ${emissionsText}`;
    span.dataset.energyUx584 = "done";
  }
  function upgradeMetrics() {
    for (const metric of metrics.querySelectorAll(".structural-outcome")) {
      if (metric.dataset.energyUx584 === "done") continue;
      const title = metric.querySelector("small")?.textContent.trim();
      if (title !== "Facture énergétique" && title !== "Émissions") continue;
      const value = metric.querySelector("strong");
      const explanation = metric.querySelector("span");
      if (!value) continue;
      const unit = title === "Facture énergétique" ? "Md€" : "Mt";
      const result = label(value.textContent.trim(), unit, title === "Émissions" ? "MtCO₂e" : "Md€");
      if (result) {
        value.textContent = result.text;
        value.setAttribute("aria-label", `${title}, écart par rapport à la référence : ${result.speech}`);
        value.classList.add("energy-ux-delta");
        if (explanation) explanation.textContent = "Écart simulé vs référence · précision 0,1";
      }
      metric.dataset.energyUx584 = "done";
    }
  }
  // app.js reconstruit ces deux conteneurs après chaque calcul.
  // Observer seulement leurs enfants directs évite les boucles d'observation.
  new MutationObserver(upgradeStory).observe(story, {childList: true});
  new MutationObserver(upgradeMetrics).observe(metrics, {childList: true});
  upgradeStory();
  upgradeMetrics();
})();
