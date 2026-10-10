// Facultatif : renseigner le code du site GoatCounter après création du compte
// et vérification de la configuration de confidentialité (voir PUBLICATION.md).
// Un code vide ne charge aucun service de mesure d'audience.
const GOATCOUNTER_SITE = "";
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
    path: () => location.pathname,
    referrer: () => {
      try { return document.referrer ? new URL(document.referrer).origin : ""; }
      catch { return ""; }
    },
  };

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://gc.zgo.at/count.js";
  script.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
  script.addEventListener("load", async () => {
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
