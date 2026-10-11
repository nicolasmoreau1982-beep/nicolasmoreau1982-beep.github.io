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
