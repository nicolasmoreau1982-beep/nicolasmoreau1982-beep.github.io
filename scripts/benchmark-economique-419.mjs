/**
 * EcoSim 4.19 : benchmark de plausibilité + sensibilités, sans dépendance npm.
 * NE VALIDE PAS les effets causaux, les sources, ni les paramètres.
 * Le panier composite respecte les parts Mésange par NATURE, mais ses postes
 * de dépense COFOG sont seulement des correspondances pédagogiques imparfaites.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const sandbox={console,Math,Number,Object,Map,Set,Date,JSON,Intl,Array,String,Boolean};
sandbox.window=sandbox;
const ctx=vm.createContext(sandbox);
for(const f of ['data.js','historical-audit-data.js','history.js','insee-projection.js','fiscal.js','sectoral.js'])
  vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),ctx,{filename:f});
let app=fs.readFileSync(path.join(dist,'app.js'),'utf8');
const stop='  loadInitialState();\n  initTheme();';
assert.ok(app.includes(stop),'Bootstrap modifié : actualiser le test');
app=app.slice(0,app.indexOf(stop))+'  window.__ecoBenchmark = {state,calculateProjection};\n})();';
vm.runInContext(app,ctx,{filename:'app.js'});
const {state,calculateProjection}=ctx.__ecoBenchmark;
const D=ctx.ECOSIM_DATA,F=ctx.ECOSIM_FISCAL;
assert.equal(D.metadata.version,'4.19.0');
const near=(a,b,tol=0.005)=>Math.abs(a-b)<=tol;
assert.ok(near(D.BASE.spending-D.BASE.revenue,D.BASE.deficit,0.00001),'Identité budgétaire 2025');
assert.ok(near(D.spending.reduce((s,e)=>s+e.value,0),D.BASE.spending,0.001),'Détail dépenses 2025');
assert.ok(near(D.revenue.reduce((s,e)=>s+e.value,0),D.BASE.revenue,0.001),'Détail recettes 2025');
assert.ok(near(D.BASE.debt/D.BASE.gdp*100,D.BASE.debtRatio,0.05),'Ratio dette / PIB 2025');
assert.equal(D.accountingVintage.date,'2026-08-28');
const reset=()=>{
 state.changes={}; state.policyStartQuarter=1;state.policyStartQuarters={};
 state.model='consensus';state.euMode='current';state.cycle='normal';state.monetary='neutral';state.confidence='stable';
 state.structural=Object.fromEntries(Object.entries(D.structural.controls).map(([k,c])=>[k,c.value]));
 state.engines=Object.fromEntries(Object.entries(D.policyEngines.controls).map(([k,c])=>[k,c.value]));
 state.fiscal={...F.defaults};
};
reset();
const b=calculateProjection();
const firstYearGdp=b.baseline[0].gdp;
const firstYearShock=firstYearGdp/100;
const inputBn2025=firstYearShock/(1+D.baseline.inflation[0]/100);
const budgetProxies=[
 {nature:'investissement public',share:0.08,id:'GF0405',note:'transports : dépenses mixtes, pas investissement public isolé'},
 {nature:'rémunérations publiques',share:0.25,id:'GF0901',note:'enseignement primaire : dépenses mixtes, pas salaires isolés'},
 {nature:'prestations en nature',share:0.09,id:'GF0703',note:'hôpital : soins et fonctionnement confondus'},
 {nature:'consommations intermédiaires',share:0.12,id:'GF0103',note:'services généraux : agrégat fonctionnel, pas achats isolés'},
 {nature:'prestations en espèces (hors chômage)',share:0.425,id:'GF1002',note:'retraites : proxy des prestations en espèces'},
 {nature:'prestations en espèces (chômage)',share:0.035,id:'GF1005',note:'chômage : 3,5 % du choc total, conformément à la note Mésange'}
];
assert.ok(near(budgetProxies.reduce((x,p)=>x+p.share,0),1,1e-12),'Somme des parts Mésange = 100%');
const basket=Object.fromEntries(budgetProxies.map(x=>[x.id,inputBn2025*x.share]));
const sources={
 insee:{url:'https://www.insee.fr/fr/statistiques/8988845',date:'2026-08-28',table:'3.201'},
 mesange:{url:'https://www.tresor.economie.gouv.fr/Articles/88381f48-797c-4e76-8f03-ef78d0bff99e/files/1c29ff21-585d-488b-8f4b-497540e9fc62',year:2017,section:'4.1.2',note:'taux d’intérêt réel inchangé, choc permanent en volume sans financement'}
};
const scenarios=[
 {id:'composite-proxy',label:'Panier composite EcoSim (proxy COFOG)',changes:basket,compare:'Mésange : dépense publique générique',comparability:'partiel : parts nominales égales, nature économique non identique'},
 {id:'mesange-reference',label:'Mésange 2017 (référence publiée)',reference:true,compare:null,comparability:'modèle de recherche externe'},
 {id:'tva',label:'TVA +1 point de PIB de recettes',changes:{R_TVA:inputBn2025},compare:'TVA Mésange : coefficients importés dans EcoSim',comparability:'calibré par construction, pas indépendant'},
 {id:'ir',label:'IR +1 point de PIB de recettes',changes:{R_IR:inputBn2025},compare:null,comparability:'IR national simplifié, coefficients exploratoires'},
 {id:'cotisations',label:'Cotisations globales −1 point de PIB',changes:{R_SOCIAL:-inputBn2025},compare:'Mésange : cotisations employeurs',comparability:'non strictement comparable : assiette toutes cotisations vs employeurs seuls'}
];
const targets={
 'mesange-reference':{1:0.78,2:1.06,3:1.03,5:0.86,10:0.53},
 'tva':{1:-0.32,2:-0.66,3:-0.72,5:-0.81,10:-0.78},
 'cotisations':{1:0.20,2:0.55,3:0.76,5:0.97,10:1.29}
};
const horizons=[1,2,3,5,10];
const coefficients={...D.macroCoefficients};
function evaluate(scenario,coefficientExperiment='central',scale=1){
  if(scenario.reference) return horizons.map(h=>({scenario:scenario.id,coefficientExperiment,horizon:h,outputGap:targets[scenario.id][h],deltaDeficitBn:null,deltaDebtBn:null,referenceValue:targets[scenario.id][h]}));
  reset();state.changes={...scenario.changes};
  const result=calculateProjection();
  return horizons.map(h=>{
    const p=result.scenario[h-1],base=result.baseline[h-1];
    assert.ok(Number.isFinite(p.outputGap) && Number.isFinite(p.deficit),'Résultat non fini');
    return {scenario:scenario.id,coefficientExperiment,horizon:h,outputGap:p.outputGap,deltaDeficitBn:p.deficit-base.deficit,deltaDebtBn:p.debt-base.debt,
      referenceValue:targets[scenario.id]?.[h]??null};
  });
}
let rows=scenarios.flatMap(x=>evaluate(x));
const sensitivities=[];
for(const coef of Object.keys(coefficients)) {
  for(const scale of [0.8,1.2]) {
    D.macroCoefficients[coef]=coefficients[coef]*scale;
    for(const scenario of scenarios.filter(x=>!x.reference)) {
      const alt=evaluate(scenario,`${coef} × ${scale}`,scale);
      const central=rows.filter(r=>r.scenario===scenario.id);
      for(const rec of alt) {
        const base=central.find(r=>r.horizon===rec.horizon);
        sensitivities.push({...rec,centralOutputGap:base.outputGap,outputGapChange:rec.outputGap-base.outputGap});
      }
    }
    D.macroCoefficients[coef]=coefficients[coef];
  }
}
assert.deepEqual({...D.macroCoefficients},coefficients,'Coefficients originaux restitués');
for(const row of rows) if(row.referenceValue!=null && row.scenario!=='mesange-reference') row.deltaFromPublished=row.outputGap-row.referenceValue;
const result={version:'4.19.0',date:'2026-10-11',shockYear:2026,shockBn2026:firstYearShock,shockBn2025:inputBn2025,
 accounting:{vintage:D.accountingVintage,spending:D.BASE.spending,revenue:D.BASE.revenue,deficit:D.BASE.deficit,debt:D.BASE.debt,debtRatio:D.BASE.debtRatio,historicalEurostatDebtRatio:115.6},
 coefficients,shocks:scenarios,proxies:budgetProxies,referenceSources:sources,horizons,central:rows,sensitivity:sensitivities,
 caveats:['Les parts 8/25/9/12/46 sont conformes au panier Mésange, mais les postes COFOG sélectionnés ne représentent pas ces natures économiques avec précision.',
 'Écart de production EcoSim = proxy de la réponse du PIB en volume, pas volume chaîné observé.',
 'Sensibilités à ±20% choisies arbitrairement. Pas de bornes statistiques ni de validation causale.',
 'La réponse TVA est calibrée sur Mésange : la proximité ne constitue pas une validation indépendante.',
 'Le choc R_SOCIAL n’isole pas les cotisations patronales, et ne permet donc pas une comparaison causale avec Mésange.']};
const validation=path.join(dist,'validation');fs.mkdirSync(validation,{recursive:true});
fs.writeFileSync(path.join(validation,'benchmark-419.json'),JSON.stringify(result,null,2)+'\n');
const header=['scenario','coefficientExperiment','horizon','outputGap','deltaDeficitBn','deltaDebtBn','referenceValue','centralOutputGap','outputGapChange'];
const csvValue=v=>'"'+String(v??'').replaceAll('"','""')+'"';
fs.writeFileSync(path.join(validation,'benchmark-419.csv'),[header.join(','),...rows.concat(sensitivities).map(r=>header.map(k=>csvValue(r[k])).join(','))].join('\n')+'\n');
const htmlPath=path.join(dist,'audit.html');
let html=fs.readFileSync(htmlPath,'utf8');
const fmt=n=>Number.isFinite(n)?`${n>=0?'+':'−'}${Math.abs(n).toFixed(2).replace('.',',')} %`:'—';
const table=scenarios.map(s=>`              <tr><th scope="row">${s.label}</th>${[1,3,5,10].map(h=>{
  const r=rows.find(x=>x.scenario===s.id&&x.horizon===h);
  return `<td>${fmt(r.outputGap)}</td>`;
}).join('')}</tr>`).join('\n');
assert.match(html,/<!-- BENCHMARK419_START -->[\s\S]*<!-- BENCHMARK419_END -->/);
html=html.replace(/<!-- BENCHMARK419_START -->[\s\S]*?<!-- BENCHMARK419_END -->/,'<!-- BENCHMARK419_START -->\n'+table+'\n              <!-- BENCHMARK419_END -->');
fs.writeFileSync(htmlPath,html);
console.log('Benchmark 4.19 :',rows.length,'résultats de référence/central et',sensitivities.length,'tests de sensibilité, avec tableaux pré-générés.');
for(const scenario of scenarios){
  const one=rows.find(r=>r.scenario===scenario.id&&r.horizon===3);
  console.log('3 ans',scenario.id,one.outputGap.toFixed(3),'%');
}
