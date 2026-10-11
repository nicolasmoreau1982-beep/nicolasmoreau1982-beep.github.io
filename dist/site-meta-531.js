/* EcoSim France — droits réservés sur les contributions originales protégeables.
   Droits de tiers et exceptions légales préservés ; voir https://github.com/nicolasmoreau1982-beep/nicolasmoreau1982-beep.github.io/blob/main/LICENSE. */
/* 5.3.1 : version affichée, distincte de la date d'une page d'audit. */
(() => {
  'use strict';
  const show = () => {
    for (const el of document.querySelectorAll('[data-ecosim-technical-version]')) {
      el.textContent = window.ECOSIM_TECHNICAL_VERSION || 'non disponible';
    }
    for (const el of document.querySelectorAll('[data-ecosim-version]')) {
      el.textContent = window.ECOSIM_VERSION || '5.5.0';
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, {once:true});
  else show();
})();
