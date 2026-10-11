/* EcoSim France 4.24 — Fiscalité / soutien sectoriel (exploratoire)
 * Les filières sont des regroupements pédagogiques, PAS une correspondance
 * comptable ou légale exhaustive avec NACE Rev. 2.1.
 * Les montants sont des flux publics ANNUELS saisis, et non des rendements
 * prédits à partir d'assiettes fiscales sectorielles observées.
 */
window.ECOSIM_SECTORAL = (() => {
  "use strict";
  const sectors = Object.freeze({
    renewables: {label:"Électricité renouvelable", group:"Énergie", delay:2, coefficient:0.20},
    nuclear: {label:"Nucléaire et filière industrielle", group:"Énergie", delay:5, coefficient:0.12},
    fossil: {label:"Extraction, raffinage et activités fossiles", group:"Énergie", delay:2, coefficient:0.10},
    grids: {label:"Réseaux électriques et stockage", group:"Énergie", delay:3, coefficient:0.18},
    automotive: {label:"Automobile et batteries", group:"Mobilité", delay:3, coefficient:0.18},
    transit: {label:"Rail et transports collectifs", group:"Mobilité", delay:3, coefficient:0.19},
    aviation: {label:"Aérien, maritime et logistique", group:"Mobilité", delay:3, coefficient:0.13},
    building: {label:"Bâtiment et rénovation", group:"Bâtiment", delay:2, coefficient:0.22},
    metals: {label:"Acier, ciment et métallurgie", group:"Industrie", delay:4, coefficient:0.16},
    chemical: {label:"Chimie et matériaux", group:"Industrie", delay:4, coefficient:0.15},
    manufacturing: {label:"Industrie manufacturière générale", group:"Industrie", delay:3, coefficient:0.17},
    agriculture: {label:"Agriculture et élevage", group:"Agriculture", delay:2, coefficient:0.14},
    food: {label:"Agroalimentaire", group:"Agriculture", delay:2, coefficient:0.15},
    digital: {label:"Numérique, logiciels et centres de données", group:"Services", delay:2, coefficient:0.19},
    health: {label:"Santé, pharmacie et biotechnologies", group:"Services", delay:4, coefficient:0.18},
    circular: {label:"Réparation, recyclage et économie circulaire", group:"Services", delay:2, coefficient:0.20}
  });
  const instruments = Object.freeze({
    credit: {label:"Crédit d'impôt ciblé", accounting:"revenue", sign:-1},
    levy: {label:"Prélèvement sectoriel", accounting:"revenue", sign:1},
    grant: {label:"Subvention ciblée", accounting:"spending", sign:1}
  });
  const START_MIN=2026, START_MAX=2035, MAX_MEASURES=8, MAX_EACH_BN=10, MAX_TOTAL_BN=30;
  function normalize(raw){
    if (!Array.isArray(raw) || raw.length > MAX_MEASURES) throw new RangeError("Nombre de mesures sectorielles invalide (maximum 8).");
    const result=[];
    for (const item of raw){
      if (!item || typeof item!=="object" || Array.isArray(item) ||
          typeof item.sector!=="string" || !Object.hasOwn(sectors,item.sector) ||
          typeof item.instrument!=="string" || !Object.hasOwn(instruments,item.instrument) ||
          !["accounting","exploratory"].includes(item.response)) throw new RangeError("Mesure sectorielle inconnue.");
      const amount=Number(item.amountBn), start=Number(item.startYear), duration=Number(item.durationYears);
      if (![amount,start,duration].every(Number.isFinite) || !(amount>=0.1 && amount<=MAX_EACH_BN) ||
        !Number.isInteger(start) || start<START_MIN || start>START_MAX ||
        !Number.isInteger(duration) || duration<1 || duration>15)
        throw new RangeError("Montant, année ou durée de mesure sectorielle invalide.");
      result.push({sector:item.sector,instrument:item.instrument,amountBn:Math.round(amount*10)/10,
        startYear:start,durationYears:duration,response:item.response});
    }
    // Plafond sur la somme annuelle de toutes les enveloppes, sans compensation
    // opportuniste entre impôts et subventions.
    for (let year=START_MIN;year<=START_MAX+14;year++){
      const gross=result.reduce((sum,item)=>sum+(year>=item.startYear && year<item.startYear+item.durationYears ? item.amountBn:0),0);
      if (gross>MAX_TOTAL_BN+1e-7) throw new RangeError("Enveloppes sectorielles cumulées > 30 Md€/an.");
    }
    return result;
  }
  function calculate(measures, year, profile, factors={spending:1,tax:1}){
    let revenueChange=0, spendingChange=0, demand=0, supply=0;
    const rows=[];
    for(const item of measures){
      if(year<item.startYear || year>=item.startYear+item.durationYears)continue;
      const instrument=instruments[item.instrument],sector=sectors[item.sector];
      const revenue=instrument.accounting==="revenue" ? item.amountBn*instrument.sign : 0;
      const spending=instrument.accounting==="spending" ? item.amountBn : 0;
      // Le crédit / soutien produit un signe positif ; un prélèvement, négatif.
      // Montants d'effet conventionnels, NON évaluations empiriques sectorielles.
      const direction=item.instrument==="levy"?-1:1;
      const yearsElapsed=year-item.startYear+1;
      const ramp=Math.max(0,Math.min(1,(yearsElapsed-sector.delay+1)/3));
      const response=item.response==="exploratory"
        ? direction*item.amountBn*sector.coefficient*ramp : 0;
      const demandPart=response*0.40*(item.instrument==="grant"?profile.spendScale*factors.spending:profile.taxScale*factors.tax);
      const supplyPart=response*0.60*profile.supplyScale;
      revenueChange+=revenue;spendingChange+=spending; demand+=demandPart;supply+=supplyPart;
      rows.push({sector:item.sector,instrument:item.instrument,revenueChange:revenue,spendingChange:spending,
        demand:demandPart,supply:supplyPart,gdpImpact:demandPart+supplyPart,amountBn:item.amountBn,
        response:item.response});
    }
    return {revenueChange,spendingChange,demand,supply,gdpImpact:demand+supply,rows};
  }
  return Object.freeze({sectors,instruments,normalize,calculate,MAX_MEASURES,MAX_EACH_BN,MAX_TOTAL_BN,START_MIN,START_MAX});
})();
