/* EcoSim France 5.0 — table d'énergie physique illustrative.
 * Observations SDES 2024, France : NE PAS mélanger sans précaution
 * consommation finale de pétrole (y compris biocarburants), consommation finale
 * d'électricité, consommation finale totale et production électrique RTE.
 * Cette démonstration n'alimente PAS les prévisions macroéconomiques d'EcoSim.
 */
window.ECOSIM_ENERGY_500 = (() => {
  "use strict";
  const BASE = Object.freeze({year:2024, finalEnergyTWh:1499, oilProductsTWh:624.2, electricityFinalTWh:398,
    transportOilShare:0.80,
    source:"https://www.statistiques.developpement-durable.gouv.fr/bilan-energetique-de-la-france-en-2024-synthese",
    detailedSource:"https://portail.documentation.developpement-durable.gouv.fr/pub/MPDOUV00268844-bilan-energetique-france-pour-2024.html"});
  function calculate({transportPercent=0, otherPercent=0, electricRatio=0.30} = {}) {
    const valid = (v,min,max) => typeof v === "number" && Number.isFinite(v) && v>=min && v<=max;
    if (!valid(transportPercent,0,100)||!valid(otherPercent,0,100)||!valid(electricRatio,0.10,1))
      throw new RangeError("Hypothèses physiques hors plage");
    const transportOil = BASE.oilProductsTWh * BASE.transportOilShare;
    const otherOil = BASE.oilProductsTWh - transportOil;
    const transportAvoided = transportOil*transportPercent/100;
    const otherAvoided = otherOil*otherPercent/100;
    const avoided = transportAvoided+otherAvoided;
    const electricityExtra = avoided*electricRatio;
    return {transportOil,otherOil,transportAvoided,otherAvoided,oilAvoidedTWh:avoided,
      oilRemainingTWh:BASE.oilProductsTWh-avoided,electricityExtraTWh:electricityExtra,
      electricityIndicativeTotalTWh:BASE.electricityFinalTWh+electricityExtra,
      energyFinalIllustrationTWh:BASE.finalEnergyTWh-avoided+electricityExtra,
      assumptions:{transportPercent,otherPercent,electricRatio},
      limits:"Transfert d'usage et ratio électrique arbitraires, non calibrés. Sans modèle de flotte, chaleur, rendements, offres, émissions ni coûts. Les catégories SDES ont des périmètres différents et incluent des biocarburants."};
  }
  return Object.freeze({BASE,calculate});
})();
