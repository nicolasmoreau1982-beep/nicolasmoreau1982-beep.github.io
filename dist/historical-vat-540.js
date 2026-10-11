/* EcoSim France 5.4 — calcul mécanique de prix TTC, distinct du coeur macro.
 * La transmission choisie est une HYPOTHÈSE EXOGÈNE, non un paramètre estimé.
 * Aucun import de résultats IPP/Insee : ce module ne peut pas s'entraîner sur l'observation.
 */
(function(root){
  'use strict';
  function priceShock(oldRatePct,newRatePct,passThrough){
    for(const [name,v] of Object.entries({oldRatePct,newRatePct,passThrough})) {
      if(typeof v!=='number'||!Number.isFinite(v))throw new TypeError(name+' doit être un nombre fini');
    }
    if(oldRatePct<0||newRatePct<0||oldRatePct>100||newRatePct>100||passThrough<0||passThrough>1)
      throw new RangeError('Taux ou transmission hors bornes conventionnelles');
    // Si le HT est constant, variation TTC=(1+t_new)/(1+t_old)-1.
    // L'hypothèse passThrough agit proportionnellement sur cette variation.
    const mechanicalPercent=100*((1+newRatePct/100)/(1+oldRatePct/100)-1);
    return Object.freeze({mechanicalPercent,scenarioPricePercent:mechanicalPercent*passThrough});
  }
  const api=Object.freeze({priceShock});
  root.ECOSIM_VAT_HISTORY_540=api;
})(typeof window!=='undefined'?window:globalThis);
