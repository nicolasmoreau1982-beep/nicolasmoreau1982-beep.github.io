// Compte GoatCounter du site public ; voir PUBLICATION.md pour les réglages
// du compteur public et les vérifications de confidentialité.
// Remettre une chaîne vide ici désactive entièrement la mesure d'audience.
const GOATCOUNTER_SITE = "nicolasmoreau1982-beep";
const ECOSIM_PUBLIC_HOST = "nicolasmoreau1982-beep.github.io";

(function initAudienceMeasurement() {
  const status = document.getElementById("analytics-status");
  const code = GOATCOUNTER_SITE.trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(code) || location.hostname !== ECOSIM_PUBLIC_HOST) {
    return;
  }

  if (status) status.textContent = "GoatCounter configuré";

  // Les réglages du scénario sont dans le fragment de l'URL : ne jamais le
  // transmettre à l'outil d'audience, ni transmettre les paramètres de requête.
  window.goatcounter = {
    no_onload: true,
    no_events: true,
    path: () => location.pathname,
    referrer: () => {
      try { return document.referrer ? new URL(document.referrer).origin : ""; }
      catch { return ""; }
    },
  };

  const script = document.createElement("script");
  script.async = true;
  script.referrerPolicy = "origin";
  script.src = "https://gc.zgo.at/count.js";
  script.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
  script.addEventListener("load", async () => {
    // count.js ajoute toujours location.search au champ q, y compris quand
    // path() retire la requête. Le chargement automatique est donc désactivé ;
    // on supprime q avant l'unique comptage manuel.
    if (typeof window.goatcounter.get_data !== "function" || typeof window.goatcounter.count !== "function") return;
    const getData = window.goatcounter.get_data;
    window.goatcounter.get_data = function withoutQuery(vars) {
      const data = getData(vars);
      delete data.q;
      return data;
    };
    window.goatcounter.count();

    const counter = document.getElementById("visit-counter");
    const count = document.getElementById("visit-counter-count");
    if (!counter || !count) return;

    try {
      const response = await fetch(`https://${code}.goatcounter.com/counter/TOTAL.json`);
      if (!response.ok) return;
      const data = await response.json();
      if (typeof data.count !== "string" || !/^[\d\s.,]+$/.test(data.count)) return;
      count.textContent = data.count;
      counter.hidden = false;
    } catch {
      // Le compteur reste invisible si le service, la permission ou le réseau échoue.
    }
  });
  document.head.append(script);
})();
