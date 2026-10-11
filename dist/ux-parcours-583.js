/* EcoSim 5.8.3 — parcours de lecture uniquement, sans modification des projections. */
(() => {
  "use strict";
  const advanced = [...document.querySelectorAll("section[data-ux-advanced='true']")];
  const discovery = document.getElementById("ux-discovery");
  const expert = document.getElementById("ux-expert");
  const status = document.getElementById("ux-mode-status");
  if (!discovery || !expert || !status || !advanced.length) return;

  const targetsAdvanced = (hash) => {
    if (!hash || hash.startsWith('#scenario=')) return false;
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return false; }
    const node = document.getElementById(id);
    return Boolean(node?.closest("section[data-ux-advanced='true']"));
  };
  let mode = "expert";
  function setMode(next, reason = "user") {
    if (next !== "expert" && next !== "discovery") return;
    mode = next;
    const isExpert = mode === "expert";
    advanced.forEach(section => { section.hidden = !isExpert; });
    discovery.setAttribute("aria-pressed", String(!isExpert));
    expert.setAttribute("aria-pressed", String(isExpert));
    status.textContent = isExpert
      ? "Toutes les rubriques et tous les réglages sont accessibles."
      : "Parcours simplifié : scénario, trajectoire, comparaison. Les autres rubriques restent disponibles en mode Expert.";
    if (reason === "user" && !isExpert && advanced.some(section => {
      const box = section.getBoundingClientRect();
      return box.top < window.innerHeight && box.bottom > 0;
    })) {
      document.getElementById("ux-discovery")?.scrollIntoView({block:"start",behavior:"instant"});
    }
  }
  discovery.addEventListener("click", () => setMode("discovery"));
  expert.addEventListener("click", () => setMode("expert"));

  // IMPORTANT : la capture s'exécute avant les gestionnaires de défilement d'app.js.
  // Ainsi les raccourcis du menu et du sommaire rouvrent une section avancée masquée.
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest('[data-scroll], a[href^="#"]');
    if (!trigger) return;
    const hash = trigger.hasAttribute("data-scroll")
      ? `#${trigger.getAttribute("data-scroll")}` : trigger.getAttribute("href");
    if (targetsAdvanced(hash)) setMode("expert", "navigation");
  }, true);
  window.addEventListener("hashchange", () => {
    if (targetsAdvanced(location.hash)) setMode("expert", "navigation");
  });
  setMode(targetsAdvanced(location.hash) ? "expert" : "discovery", "initial");

  // Relier les termes réellement employés aux entrées du glossaire, sans toucher
  // au texte d'origine dans app.js ni convertir du texte HTML arbitraire via innerHTML.
  const glossary = [
    {re:/\b(millésimes?)\b/gi, id:"millesime"},
    {re:/\b(soldes recalés)\b/gi, id:"soldes-recales"},
    {re:/\b(titulaires dans les flux)\b/gi, id:"titulaires-flux"},
    {re:/\b(MAE\s+et\s+P80|MAE|P80)\b/gi, id:"maep80"},
    {re:/\b(output gap)\b/gi, id:"outputgap"}
  ];
  function decorate(node) {
    if (!node) return;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode(textNode) {
        if (!textNode.textContent?.trim() || textNode.parentElement?.closest('a, button, script, style, code, textarea'))
          return NodeFilter.FILTER_REJECT;
        return glossary.some(({re}) => { re.lastIndex=0; return re.test(textNode.textContent); })
          ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const texts = [];
    while(walker.nextNode()) texts.push(walker.currentNode);
    texts.forEach(textNode => {
      const input = textNode.textContent;
      const matches=[];
      glossary.forEach(({re,id}) => {
        re.lastIndex=0;
        for(const m of input.matchAll(re)) matches.push({start:m.index,end:m.index+m[0].length,id,text:m[0]});
      });
      matches.sort((a,b)=>a.start-b.start || b.end-a.end);
      let pos=0;
      const fragment=document.createDocumentFragment();
      matches.forEach(({start,end,id,text}) => {
        if(start<pos) return;
        if(start>pos) fragment.append(document.createTextNode(input.slice(pos,start)));
        const a=document.createElement('a');
        a.className='ux-glossary-link';
        a.href='glossaire.html#'+id;
        a.textContent=text;
        a.title='Lire la définition dans le glossaire';
        fragment.append(a);
        pos=end;
      });
      if(pos===0) return;
      if(pos<input.length) fragment.append(document.createTextNode(input.slice(pos)));
      textNode.replaceWith(fragment);
    });
  }
  const workforce = document.getElementById('workforce-detail');
  const check = () => {
    document.querySelectorAll('#workforce-detail .workforce-panel-wide > p, #workforce-detail .workforce-row small')
      .forEach(decorate);
  };
  if (workforce && typeof MutationObserver !== 'undefined') {
    new MutationObserver(check).observe(workforce,{childList:true,subtree:true});
    check();
  }
  // Documentation de la méthode : les termes s'y trouvent avant le premier calcul.
  document.querySelectorAll('#method-dialog .modal-body p').forEach(decorate);
})();
