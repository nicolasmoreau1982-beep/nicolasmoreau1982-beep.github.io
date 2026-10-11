/* Extension non intrusive du moteur historique 5.7.1 : préremplissage de l'atelier 5.8. */
(() => {
  'use strict';
  const link=document.getElementById('smic-distribution-link');
  if(!link)return;
  link.addEventListener('click',()=>{
    // L'état interne du modèle macro demeure inaccessible par conception ;
    // seul un curseur visible est utilisé, sinon le lien reste sans paramètre.
    const slider=document.querySelector('[data-engine-control="minimumWage"]');
    const value=slider?Number(slider.value):NaN;
    link.href=Number.isFinite(value)&&value>=0&&value<=100
      ?`distribution-ciblee-580.html?smicRise=${encodeURIComponent(value)}#smic`
      :'distribution-ciblee-580.html#smic';
  });
})();
