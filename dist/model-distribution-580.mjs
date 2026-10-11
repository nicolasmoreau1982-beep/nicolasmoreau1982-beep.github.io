/* EcoSim France — droits réservés sur les contributions originales protégeables.
   Droits de tiers et exceptions légales préservés ; voir https://github.com/nicolasmoreau1982-beep/nicolasmoreau1982-beep.github.io/blob/main/LICENSE. */
/**
 * EcoSim — atelier distributif 5.8 (échantillons saisis) : ciblage SMIC et abattement des pensions.
 * NON branche au moteur macroéconomique, NON calibré, données illustratives seulement.
 * Entrées : salaire horaire BRUT et nombre d'heures/an ; pensions déclarables
 * et revenu net imposable de référence fourni par le foyer.
 */
const finite = (v, name, min=0) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min) throw new RangeError(`${name} invalide`);
  return v;
};
const positive = (v, name) => {finite(v,name); if(v<=0)throw new RangeError(`${name} doit être positif`); return v;};
const sum = (arr,field) => arr.reduce((n,x)=>n+x[field],0);
const clamp = (n,lo,hi) => Math.min(hi,Math.max(lo,n));

/** Application du nouveau plancher, puis diffusion négociée OPTIONNELLE aux rémunérations > plancher.
 * spilloverStrength et spilloverDecay sont des HYPOTHÈSES, pas des estimations.
 * Basculer strength à 0 donne l'effet légal seul.
 * Population de salariés fournie et pondérée ; aucune extrapolation nationale implicite.
 */
export function simulateSmic({currentSmicHourly, risePercent, workers, spilloverStrength=0, spilloverDecay=0.5}) {
  positive(currentSmicHourly,'SMIC horaire');
  finite(risePercent,'hausse du SMIC'); if(risePercent>100)throw new RangeError('Hausse > 100 % hors périmètre');
  finite(spilloverStrength,'intensité de diffusion'); if(spilloverStrength>1)throw new RangeError('Diffusion > 1');
  positive(spilloverDecay,'distance de diffusion en multiples du SMIC');
  if(!Array.isArray(workers)||workers.length<1||workers.length>100000)throw new RangeError('Salariés absents ou trop nombreux');
  const newSmicHourly=currentSmicHourly*(1+risePercent/100),seen=new Set();
  let mandatoryCount=0, indirectCount=0;
  const rows=workers.map(w=>{
    if(!w||typeof w.id!=='string'||!w.id||seen.has(w.id))throw new RangeError('ID salarié invalide ou dupliqué');
    seen.add(w.id);
    finite(w.hourlyGross,`salaire ${w.id}`);positive(w.hoursPerYear,`heures ${w.id}`);positive(w.weight,`poids ${w.id}`);
    if(w.hoursPerYear>4000 || w.weight>1e7 || w.hourlyGross>100000)throw new RangeError(`Profil ${w.id} hors limites`);
    const eligible=w.eligible !== false;
    // Une base déjà illégale ne doit pas être attribuée à la réforme du SMIC.
    if (eligible && w.hourlyGross < currentSmicHourly - 1e-8)
      throw new RangeError(`Salaire ${w.id} sous le SMIC initial : corriger la base ou signaler le statut dérogatoire`);
    // Pour les apprentis/statuts dérogatoires, ne pas appliquer un plancher inapproprié.
    const mandatory=eligible&&w.hourlyGross<newSmicHourly ? newSmicHourly-w.hourlyGross:0;
    const relative=w.hourlyGross/currentSmicHourly;
    // Effet de diffusion seulement au-dessus du nouveau plancher, jamais double compté.
    const indirect=eligible && mandatory===0 && w.hourlyGross>=newSmicHourly
      ?w.hourlyGross*(risePercent/100)*spilloverStrength*Math.exp(-Math.max(0,relative-1)/spilloverDecay):0;
    const hourlyAfter=w.hourlyGross+mandatory+indirect;
    const annualBefore=w.hourlyGross*w.hoursPerYear;
    const annualAfter=hourlyAfter*w.hoursPerYear;
    if(mandatory>0)mandatoryCount+=w.weight;
    if(indirect>0)indirectCount+=w.weight;
    return {id:w.id,eligible,weight:w.weight,hourlyBefore:w.hourlyGross,hourlyAfter,
      mandatoryIncreaseHourly:mandatory,indirectIncreaseHourly:indirect,annualBefore,annualAfter,
      annualGrossDelta:annualAfter-annualBefore};
  });
  const totalWeight=sum(rows,'weight'), payBefore=rows.reduce((s,r)=>s+r.weight*r.annualBefore,0);
  const payAfter=rows.reduce((s,r)=>s+r.weight*r.annualAfter,0);
  return {kind:'simulation_smic_ciblee',currentSmicHourly,newSmicHourly,risePercent,
    scenario:{spilloverStrength,spilloverDecay},rows,
    totals:{weightedWorkers:totalWeight,mandatoryAffected:mandatoryCount,spilloverAffected:indirectCount,
      annualGrossPayBefore:payBefore,annualGrossPayAfter:payAfter,annualGrossPayDelta:payAfter-payBefore,
      annualGrossPayVariationPercent:payBefore?100*(payAfter-payBefore)/payBefore:0},
    limitations:'Population fournie non représentative; hausse brute sans cotisations patronales/nettes, productivité, marges, emploi ou élasticités. Diffusion facultative purement hypothétique; aucun effet macro automatiquement déduit.'};
}

/** Art. pension — règle ordinaire sur pensions déclarables : 10 %,
 * minimum de 454 €/titulaire, maximum de 4 439 €/foyer (revenus 2025).
 * Pensions éligibles ordinaires seulement, exclusions/frais spéciaux non modélisés.
 */
export function pensionAllowance(pensions,{rate=0.1,minPerPensioner=454,maxPerHousehold=4439}={}) {
  if(!Array.isArray(pensions)||pensions.length>10)throw new RangeError('Pensions invalides');
  finite(rate,'taux pension');if(rate>1)throw new RangeError('Taux pension > 100%');
  finite(minPerPensioner,'minimum pension');finite(maxPerHousehold,'plafond pension');
  return Math.min(maxPerHousehold,pensions.reduce((s,p,i)=>{
    finite(p,`pension ${i}`);
    return s+(p===0?0:Math.min(p,Math.max(p*rate,minPerPensioner)));
  },0));
}

/** Comparer l'impôt à l'état de référence : l'impôt est calculé à partir de
 * netTaxableIncome (revenu après déductions réelles/baseline fourni), pas à partir
 * des seules pensions. Le revenu fiscal de référence est fourni indépendamment.
 * Le revenu imposable réformé est ajusté UNIQUEMENT par la différence d'abattement.
 */
export function simulatePensionAllowance({households,reform,calculateIncomeTax}) {
  if(typeof calculateIncomeTax!=='function')throw new TypeError('Calculateur IR obligatoire');
  if(!Array.isArray(households)||households.length<1||households.length>100000)throw new RangeError('Foyers invalides');
  if(!reform||!['remove_above_rfr','phase_out_above_rfr','cap_above_rfr'].includes(reform.type))throw new RangeError('Type de réforme invalide');
  const targetMetric=reform.targetMetric || 'rfr';
  if(!['rfr','pensions_total'].includes(targetMetric))throw new RangeError('Critère de ciblage invalide');
  const threshold=finite(reform.rfrThreshold,'seuil de ciblage');
  const width=reform.type==='phase_out_above_rfr'?positive(reform.phaseOutWidth,'largeur de transition'):0;
  const cap=reform.type==='cap_above_rfr'?finite(reform.newCap,'nouveau plafond'):0;
  if(reform.type==='cap_above_rfr'&&cap>4439)throw new RangeError('Ce mode ne peut augmenter le plafond');
  const seen=new Set();
  const rows=households.map(h=>{
    if(!h||typeof h.id!=='string'||!h.id||seen.has(h.id))throw new RangeError('Identifiant de foyer invalide ou dupliqué');
    seen.add(h.id);
    positive(h.weight,'poids fiscal');if(h.weight>1e7)throw new RangeError('Pondération trop grande');finite(h.netTaxableIncome,'revenu net imposable initial');finite(h.referenceTaxIncome,'revenu fiscal de référence');
    const {householdType='single',children=0}=h;
    const initialAllowance=pensionAllowance(h.pensions);
    const targetMeasure=targetMetric==='rfr'?h.referenceTaxIncome:h.pensions.reduce((s,p)=>s+p,0);
    const exposure= targetMeasure>threshold ? reform.type==='phase_out_above_rfr'
      ?clamp((targetMeasure-threshold)/width,0,1):1 :0;
    let finalAllowance;
    if(reform.type==='cap_above_rfr')finalAllowance=initialAllowance-exposure*Math.max(0,initialAllowance-cap);
    else finalAllowance=initialAllowance*(1-exposure);
    // Le RFR sert à sélectionner les foyers ; on ne le recalculera pas après réforme
    // pour éviter une condition circulaire qui pourrait osciller autour du seuil.
    const taxableAfter=h.netTaxableIncome+initialAllowance-finalAllowance;
    const before=calculateIncomeTax({netTaxableIncome:h.netTaxableIncome,householdType,children}).afterDecote;
    const after=calculateIncomeTax({netTaxableIncome:taxableAfter,householdType,children}).afterDecote;
    return {id:h.id,weight:h.weight,referenceTaxIncome:h.referenceTaxIncome,targetMeasure,targetMetric,
      pensionDeclaredTotal:h.pensions.reduce((s,v)=>s+v,0),allowanceBefore:initialAllowance,
      allowanceAfter:finalAllowance,netTaxableIncomeBefore:h.netTaxableIncome,
      netTaxableIncomeAfter:taxableAfter,taxBefore:before,taxAfter:after,taxDelta:after-before,
      selectedFraction:exposure};
  });
  return {kind:'simulation_abattement_pensions',reform,rows,
    totals:{weightedHouseholds:sum(rows,'weight'),impotAvant:rows.reduce((s,r)=>s+r.weight*r.taxBefore,0),
      impotApres:rows.reduce((s,r)=>s+r.weight*r.taxAfter,0),
      differenceImpot:rows.reduce((s,r)=>s+r.weight*r.taxDelta,0),
      foyersAvecAbattementReduit:rows.reduce((s,r)=>s+r.weight*Number(r.allowanceAfter<r.allowanceBefore),0)},
    limitations:'Foyers fictifs, poids non représentatifs. Le ciblage sur les pensions totales concerne le foyer, pas chaque titulaire séparément. Sous-périmètre des pensions éligibles ordinaires, RFR exogène, calcul IR 5.7 simplifié (hors crédits, seuil de recouvrement et revenus spéciaux). Ni rendement national ni prélèvements sociaux.'};
}
