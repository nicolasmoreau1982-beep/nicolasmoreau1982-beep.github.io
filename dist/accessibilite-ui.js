/* EcoSim — confort clavier complémentaire. Ne touche pas au moteur. */
(() => {
  'use strict';

  function visible(element) {
    return !!element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
  }

  // Les grandes tables de l'audit sont scrollables à la souris : rendre aussi
  // leur défilement possible au clavier, sans ajouter 25 arrêts inutiles.
  function enhanceAuditTables() {
    for (const wrap of document.querySelectorAll('.audit-table-wrap')) {
      const overflows = visible(wrap) && wrap.scrollWidth > wrap.clientWidth + 2;
      if (overflows) {
        wrap.setAttribute('tabindex', '0');
        wrap.setAttribute('role', 'region');
        if (!wrap.hasAttribute('aria-label')) {
          const table = wrap.querySelector('table');
          const caption = table?.querySelector('caption')?.textContent.trim();
          const section = wrap.closest('section');
          const heading = section?.querySelector('h2,h3')?.textContent.trim();
          wrap.setAttribute('aria-label', `Tableau : ${(caption || heading || 'données de l’audit').slice(0, 110)}. Défilement horizontal`);
        }
      } else if (wrap.getAttribute('data-a11y-static') !== 'true') {
        wrap.removeAttribute('tabindex');
        wrap.removeAttribute('role');
        wrap.removeAttribute('aria-label');
      }
    }
  }

  function tabs(group) {
    return [...group.querySelectorAll('[role="tab"]')].filter(visible);
  }
  function rovingTabs(group, active) {
    const items = tabs(group);
    if (!items.length) return;
    const selected = active || items.find(t => t.getAttribute('aria-selected') === 'true') || items[0];
    for (const t of items) t.tabIndex = t === selected ? 0 : -1;
  }

  document.addEventListener('keydown', (event) => {
    const tab = event.target.closest?.('[role="tab"]');
    const group = tab?.closest('[role="tablist"]');
    if (!group || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const items = tabs(group);
    const current = items.indexOf(tab);
    if (current < 0 || !items.length) return;
    event.preventDefault();
    let next = current;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else next = (current + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + items.length) % items.length;
    const target = items[next];
    rovingTabs(group, target);
    target.focus();
    target.click(); // Réutilise les gestionnaires existants, sans doubler le moteur.
  });
  document.addEventListener('click', event => {
    const group = event.target.closest?.('[role="tab"]')?.closest('[role="tablist"]');
    if (group) queueMicrotask(() => rovingTabs(group, group.contains(document.activeElement) && document.activeElement.getAttribute("role") === "tab" ? document.activeElement : undefined));
  });
  document.addEventListener('focusin', event => {
    const group = event.target.closest?.('[role="tab"]')?.closest('[role="tablist"]');
    if (group) rovingTabs(group, event.target);
  });

  function init() {
    for (const group of document.querySelectorAll('[role="tablist"]')) rovingTabs(group);
    enhanceAuditTables();
    if (document.querySelector('.audit-table-wrap')) {
      let pending = false;
      const schedule = () => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => { pending = false; enhanceAuditTables(); });
      };
      window.addEventListener('resize', schedule, {passive:true});
      const main = document.querySelector('.audit-content');
      if (main) new MutationObserver(schedule).observe(main, {childList:true, subtree:true});
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
