/* EcoSim 5.7 — IR individuel : périmètre simplifié clairement borné, revenu net imposable fourni. */
window.ECOSIM_FISCAL_INDIVIDUEL_570 = (() => {
  'use strict';
  const law = Object.freeze({
    incomeYear:2025, taxYear:2026,
    brackets:[{upper:11600,rate:0},{upper:29579,rate:.11},{upper:84577,rate:.30},{upper:181917,rate:.41},{upper:Infinity,rate:.45}],
    familyCapPerHalfPart:1807,
    decote:{single:897,couple:1483,rate:.4525,limitSingle:1982,limitCouple:3277},
    sources:[
      'https://bofip.impots.gouv.fr/bofip/2491-PGP.html/identifiant=BOI-IR-LIQ-20-10-20260407',
      'https://bofip.impots.gouv.fr/bofip/2494-PGP.html/identifiant=BOI-IR-LIQ-20-20-20-20260407',
      'https://www.economie.gouv.fr/particuliers/impots-et-fiscalite/gerer-mon-impot-sur-le-revenu/pouvez-vous-beneficier-de-la-decote-de-limpot-sur-le-revenu'
    ]
  });
  function progressive(income){let tax=0, lower=0;for(const b of law.brackets){tax+=Math.max(0,Math.min(income,b.upper)-lower)*b.rate;lower=b.upper;if(income<=lower)break;}return tax;}
  function calculate({netTaxableIncome, householdType='single', children=0}={}){
    if(typeof netTaxableIncome!=='number'||!Number.isFinite(netTaxableIncome)||netTaxableIncome<0||netTaxableIncome>100000000)
      throw new RangeError('Revenu net imposable invalide');
    if(!['single','couple'].includes(householdType)||!Number.isInteger(children)||children<0||children>3)
      throw new RangeError('Composition familiale hors périmètre');
    const baseParts=householdType==='couple'?2:1;
    const extraParts=Math.min(children,2)*.5+Math.max(0,children-2);
    const parts=baseParts+extraParts;
    const raw=parts*progressive(netTaxableIncome/parts);
    const withoutChildren=baseParts*progressive(netTaxableIncome/baseParts);
    const maxChildBenefit=extraParts*2*law.familyCapPerHalfPart;
    const cappedGross=Math.max(raw,withoutChildren-maxChildBenefit);
    const capApplied=cappedGross>raw+1e-8;
    const d=law.decote;
    const decoteBase=householdType==='couple'?d.couple:d.single;
    const decoteLimit=householdType==='couple'?d.limitCouple:d.limitSingle;
    const decote=cappedGross<decoteLimit?Math.min(cappedGross,Math.max(0,decoteBase-d.rate*cappedGross)):0;
    const afterDecote=Math.max(0,cappedGross-decote);
    return {netTaxableIncome,householdType,children,parts,grossUncapped:raw,grossAfterFamilyCap:cappedGross,capApplied,decote,afterDecote,
      // Cela reste avant crédit/réduction, seuil de mise en recouvrement, revenus particuliers, revenus étrangers.
      scope:'Barème 2026 sur revenus nets imposables 2025 ; QF général et décote ordinaire, sans autres dispositifs'};
  }
  return Object.freeze({law,progressive,calculate});
})();
