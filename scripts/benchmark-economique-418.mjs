/**
 * Diagnostic externe, indépendant des scripts de test de régression historiques.
 * Version du moteur EcoSim : 4.18.0. Pas une validation causale.
 * Usage : node scripts/benchmark-economique.mjs
 * Crée results/benchmark-economique.json et results/benchmark-economique.csv.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = path.join(projectRoot,'dist');
const read = file => fs.readFileSync(path.join(siteRoot,file),'utf8');
const sandbox={console, Math, Number, Object, Map, Set, Date, JSON, Intl, Array, String, Boolean};
sandbox.window=sandbox;
const ctx=vm.createContext(sandbox);
for(const f of ['data.js','historical-audit-data.js','history.js','insee-projection.js','fiscal.js']) vm.runInContext(read(f),ctx,{filename:f});
let app=read('app.js');
const stop='  loadInitialState();\n  initTheme();';
assert.ok(app.includes(stop),'Le harnais doit être adapté à la nouvelle version');
app=app.slice(0,app.indexOf(stop))+'  window.__test={state,calculateProjection,categoryChangeLimits};\n})();';
vm.runInContext(app,ctx,{filename:'app.js'});
const {state,calculateProjection,categoryChangeLimits}=ctx.__test;
const D=ctx.ECOSIM_DATA,F=ctx.ECOSIM_FISCAL;
assert.equal(D.metadata.version,'4.18.0');
const reset=()=>{
 state.changes={};state.policyStartQuarter=1;state.policyStartQuarters={};
 state.model='consensus';state.euMode='current';state.cycle='normal';state.monetary='neutral';state.confidence='stable';
 state.structural=Object.fromEntries(Object.entries(D.structural.controls).map(([k,c])=>[k,c.value]));
 state.engines=Object.fromEntries(Object.entries(D.policyEngines.controls).map(([k,c])=>[k,c.value]));
 state.fiscal={...F.defaults};
};
const horizons=[1,2,3,5,10];
reset();const noReform=calculateProjection();
const priceIndex1=1+D.baseline.inflation[0]/100;
const shock2026=0.01*noReform.baseline[0].gdp;
const inputAt2025=shock2026/priceIndex1;
const profiles=['consensus','keynesian','supply','liberal','industrial','debtCrisis','stabilization','openEconomy','constrainedTransition'];
const configurations=[
 ['TVA +1 point de PIB',{'R_TVA': inputAt2025},'variante Mésange 2017 intégrée ; reproduction, non validation'],
 ['Education primaire +1 point de PIB',{'GF0901':inputAt2025},'poste EcoSim ciblé, NON équivalent à la dépense publique générique Mésange'],
 ['Investissement transports +1 point de PIB',{'GF0405':inputAt2025},'poste EcoSim ciblé, NON équivalent à la dépense publique générique Mésange'],
 ['Pensions +1 point de PIB',{'GF1002':inputAt2025},'prestation sociale ciblée, NON équivalent à la dépense publique générique Mésange'],
 ['Pensions -1 point de PIB',{'GF1002':-inputAt2025},'prestation sociale ciblée'],
];
const out=[];
for(const [label,changes,method] of configurations){
 for(const profile of profiles){
  reset();state.model=profile;state.changes={...changes};
  const calc=calculateProjection();
  for(const horizon of horizons){
   const p=calc.scenario[horizon-1],b=calc.baseline[horizon-1];
   const realGdpProxyPp=p.outputGap;
   assert.ok(Number.isFinite(realGdpProxyPp),`PIB invalide ${label} ${profile} ${horizon}`);
   out.push({scenario:label,profile,horizon,shockInputBn2025:inputAt2025,shockFirstYearBn:shock2026,
    realGdpGapPct:realGdpProxyPp,nominalGdpGapPct:(p.gdp/b.gdp-1)*100,
    publicDeficitGapBn:p.deficit-b.deficit,publicDebtGapBn:p.debt-b.debt,
    unemploymentGapPp:p.unemployment-b.unemployment,
    note:method});
  }
 }
}
const ref={
 'TVA +1 point de PIB':{1:-0.32,2:-0.66,3:-0.72,5:-0.81,10:-0.78},
 'Dépenses publiques génériques +1 point de PIB':{1:0.78,2:1.06,3:1.03,5:0.86,10:0.53}
};
const baselineCheck={
 year:D.BASE.year,modelGdpBn:D.BASE.gdp,modelDeficitBn:D.BASE.deficit,modelDebtBn:D.BASE.debt,
 modelDebtRatioLabel:D.BASE.debtRatio,modelDebtRatioCalculated:D.BASE.debt/D.BASE.gdp*100,
 modelSpendingMinusRevenue:D.BASE.spending-D.BASE.revenue,
 insee2025DeficitBn:152.5,insee2025DebtBn:3460.5,insee2025DebtRatioPct:115.7,
 insee2025DebtIncreaseBn:154.4,insee2025StockFlowDifferenceBn:154.4-152.5,
 note:'Écarts à documenter avant tout recalage ; 2025 au millésime Insee mai-août 2026.'
};
const file={engineVersion:D.metadata.version,date:'2026-10-11',method:'Écarts au scénario sans réforme ; outputGap est utilisé comme proxy du PIB en volume pour les seules variantes sans choc européen.',shockFirstYear2026Bn:shock2026,baselineCheck,reference:ref,rows:out,
 caveats:[
 'Seul le profil central est comparable aux valeurs Mésange de TVA et cette concordance est obtenue par construction.',
 'Les dépenses EcoSim sont sectorielles et ne reproduisent pas le panier 8/25/9/12/46 de Mésange.',
 'La projection du solde et de la dette dépend des règles de réaction et de prime de risque propres à EcoSim ; ne pas appeler ces valeurs validées.',
 'Pas de microdonnées, pas de reconstitution du choc et de l’environnement exogène de Mésange.',
 'Un point de PIB ex ante en 2026 est utilisé pour standardiser les grandeurs, non une hausse d’un point de taux de TVA.'
 ]};
fs.mkdirSync(path.join(projectRoot,'results'),{recursive:true});
fs.writeFileSync(path.join(projectRoot,'results/benchmark-economique.json'),JSON.stringify(file,null,2)+'\n');
const headers=['scenario','profile','horizon','shockFirstYearBn','realGdpGapPct','nominalGdpGapPct','publicDeficitGapBn','publicDebtGapBn','unemploymentGapPp'];
const rows=out.map(r=>headers.map(k=>String(r[k]).replaceAll('"','""')).map(v=>'"'+v+'"').join(','));
fs.writeFileSync(path.join(projectRoot,'results/benchmark-economique.csv'),[headers.join(','),...rows].join('\n')+'\n');
for(const [scenario] of configurations){
 const items=out.filter(x=>x.scenario===scenario&&x.profile==='consensus');
 console.log('\n'+scenario);console.log(items.map(r=>`${r.horizon}a: PIB volume ${r.realGdpGapPct.toFixed(3)}%, déficit Δ${r.publicDeficitGapBn.toFixed(2)} Md€`).join(' | '));
}
console.log('\nBASE',baselineCheck);
console.log(`${out.length} évaluations (5 scénarios x 9 profils x 5 horizons).`);
