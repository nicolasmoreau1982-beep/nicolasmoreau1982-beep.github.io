/**
 * EcoSim 4.23 — confrontation documentaire et illustrations de chocs.
 * L'étude empirique indépendante n'est PAS un backtest causal du modèle.
 * Un rapprochement non équivalent ne doit JAMAIS produire de verdict numérique.
 * Node.js standard ; ne modifie aucun coefficient.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const ctx=vm.createContext({console,Math,Number,Object,Map,Set,Date,JSON,Intl,Array,String,Boolean});ctx.window=ctx;
for(const f of ['data.js','historical-audit-data.js','history.js','insee-projection.js','fiscal.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),ctx,{filename:f});
let source=fs.readFileSync(path.join(dist,'app.js'),'utf8');
const stop='  loadInitialState();\n  initTheme();';
assert.ok(source.includes(stop),'Bootstrap changed: review harness');
source=source.slice(0,source.indexOf(stop))+'  window.__eval423={state,calculateProjection};\n})();';
vm.runInContext(source,ctx,{filename:'app.js'});
const {state,calculateProjection}=ctx.__eval423;
const D=ctx.ECOSIM_DATA,F=ctx.ECOSIM_FISCAL;
assert.equal(D.metadata.version,'4.23.0');
function reset(){
 state.changes={};state.policyStartQuarter=1;state.policyStartQuarters={};
 state.model='consensus';state.euMode='current';state.cycle='normal';state.monetary='neutral';state.confidence='stable';
 state.structural=Object.fromEntries(Object.entries(D.structural.controls).map(([k,c])=>[k,c.value]));
 state.engines=Object.fromEntries(Object.entries(D.policyEngines.controls).map(([k,c])=>[k,c.value]));
 state.fiscal={...F.defaults};
}
reset();
const baseline=calculateProjection();
const gdp2026=baseline.baseline[0].gdp;
const onePctGdp2026=gdp2026/100;
const realToBase2025=1+D.baseline.inflation[0]/100;
const shockBase2025=onePctGdp2026/realToBase2025;
// Source references are primary publication pages, not copied PDFs.
const studies=[
 {id:'public-consumption-2013',theme:'Dépenses publiques en biens et services',publisher:'Insee',year:2013,
  title:'Quelle taille et quelle évolution du multiplicateur de dépenses publiques en France (1980–2010) ?',
  authors:'G. Cléaud, M. Lemoine et P.-A. Pionnier',
  url:'https://www.insee.fr/fr/statistiques/1381077',method:'Estimation SVAR et tests de robustesse, 1980–2010',
  reported:'Multiplicateur statistiquement significatif, proche de 1 à l’impact ; non significatif après environ 3 ans.',
  observedQuantity:'multiplicateur de dépenses en biens et services à court terme',
  ecosimCase:'public-services-proxy',comparability:'partielle',
  limitation:'GF0103 est une catégorie fonctionnelle COFOG de services généraux : elle ne mesure pas exclusivement les achats de biens et services du champ empirique ; horizons, définition du PIB et contexte diffèrent.',
  quantitativeVerdict:'interdit',conclusion:'Confrontation d’ordre de grandeur et de persistance seulement. Aucune confirmation/invalidité statistique du moteur.'},
 {id:'restaurant-vat-2009',theme:'TVA ciblée sur la restauration',publisher:'Institut des politiques publiques (IPP)',year:2018,
  title:'Qui a bénéficié de la baisse de la TVA dans la restauration en 2009 ?',authors:'Y. Benzarti et D. Carloni',
  url:'https://www.ipp.eu/note-ipp-n32-qui-a-beneficie-de-la-baisse-de-la-tva-dans-la-restauration-en-2009/',
  method:'Évaluation ex post de la réforme sectorielle entrée en vigueur en juillet 2009',
  reported:'Prix consommateurs −1,9 % après 30 mois ; la baisse a surtout bénéficié aux entreprises propriétaires.',
  observedQuantity:'transmission de la TVA sectorielle aux prix, salaires et marges',
  ecosimCase:'nationwide-vat-illustration',comparability:'non équivalente',
  limitation:'EcoSim teste ici un supplément national de recettes TVA, pas une baisse ciblée du taux de restauration ; pas de module de transmission aux prix et marges sectoriels.',
  quantitativeVerdict:'interdit',conclusion:'Ne valide ni n’invalide le choc TVA national du moteur. Indique une hétérogénéité de transmission que le modèle ne capture pas.'},
 {id:'retirement-2010',theme:'Relèvement de l’âge légal de retraite',publisher:'Insee',year:2017,
  title:'Report de l’âge de la retraite et taux d’emploi des séniors : le cas de la réforme de 2010',
  authors:'Y. Dubois et M. Koubi',url:'https://www.insee.fr/fr/statistiques/2546882',
  method:'Comparaison quasi-expérimentale de générations concernées et de générations témoins',
  reported:'Pour les générations concernées, emploi à 60 ans : +17 points (hommes), +16 points (femmes) ; chômage : +7 et +6 points.',
  observedQuantity:'probabilité individuelle d’emploi et de chômage des 60 ans',
  ecosimCase:'pension-budget-illustration',comparability:'non équivalente',
  limitation:'Un retrait budgétaire de 10 Md€ n’équivaut pas à décaler un âge légal ; EcoSim n’est pas estimé par cohorte, carrière et droit à pension.',
  quantitativeVerdict:'interdit',conclusion:'Rappelle la nécessité de différencier emploi et chômage seniors, mécanismes que ce scénario agrégé ne peut pas reproduire.'},
 {id:'cice-2013-2016',theme:'Crédit d’impôt compétitivité emploi',publisher:'France Stratégie',year:2020,
  title:'Évaluation du CICE : synthèse des travaux d’approfondissement',authors:'France Stratégie, TEPP et OFCE',
  url:'https://www.strategie-plan.gouv.fr/publications/evaluation-credit-dimpot-competitivite-lemploi-synthese-travaux-dapprofondissement',
  method:'Microéconométrie d’entreprises et analyse macrosectorielle',
  reported:'Environ 100 000 emplois créés ou préservés selon l’évaluation micro ; 18 Md€ de coût annuel en 2016, forte incertitude.',
  observedQuantity:'emploi de firmes exposées à un crédit ciblé sur les bas salaires',
  ecosimCase:'contribution-illustration',comparability:'non équivalente',
  limitation:'Une baisse agrégée de recettes de cotisations n’est pas un crédit d’impôt ciblé sur la masse salariale sous 2,5 SMIC ; pas de firmes ni de dispositif temporel CICE.',
  quantitativeVerdict:'interdit',conclusion:'Met en évidence un ciblage et un financement qui doivent être modélisés avant un vrai benchmark.'}
];
const cases=[
 {id:'public-services-proxy',label:'Dépenses de services généraux +1 % du PIB (proxy COFOG)',changes:{GF0103:shockBase2025},unit:'1 point de PIB la 1re année, conversion en Md€ base 2025'},
 {id:'nationwide-vat-illustration',label:'Recettes nationales de TVA +10 Md€/an',changes:{R_TVA:10},unit:'10 Md€ base 2025 par an'},
 {id:'pension-budget-illustration',label:'Dépenses de pensions −10 Md€/an',changes:{GF1002:-10},unit:'−10 Md€ base 2025 par an'},
 {id:'contribution-illustration',label:'Recettes de cotisations −18 Md€/an',changes:{R_SOCIAL:-18},unit:'−18 Md€ base 2025 par an'}
];
const horizons=[1,3,5,10];
const records=[];
for(const test of cases){
 reset();state.changes={...test.changes};
 const result=calculateProjection();
 for(const year of horizons){
  const p=result.scenario[year-1],b=result.baseline[year-1];
  const row={caseId:test.id,label:test.label,horizon:year,
   deltaGdpPct:100*(p.gdp/b.gdp-1),deltaDeficitBn:p.deficit-b.deficit,
   deltaDebtBn:p.debt-b.debt,deltaUnemploymentPp:p.unemployment-b.unemployment,
   comparability:studies.find(s=>s.ecosimCase===test.id).comparability};
  assert.ok(Object.values(row).filter(v=>typeof v==='number').every(Number.isFinite));
  records.push(row);
 }
}
reset();
const result={version:'4.23.0',date:'2026-10-11',baselineVintage:D.accountingVintage?.id,
 sourcePolicy:'Liens directs vers résumés scientifiques officiels ; aucune estimation inventée.',
 decisionRule:'Aucun rapprochement ne permet un test causal point à point, faute de correspondance de choc et/ou de métrique.',
 shock2026ForOnePercentGdpBn:onePctGdp2026,shockInputBase2025Bn:shockBase2025,
 studies,cases,records,
 caveats:['Les séries étudiées sont historiques (1980–2016) et ne sont pas automatiquement transportables à 2026.',
 'Les paramètres centraux ne sont pas modifiés ni calibrés sur les travaux cités.',
 'GF0103 appartient à une classification fonctionnelle COFOG, non à un compte économique d’achats publics.',
 'Aucune simulation nationale TVA, pension ou cotisation ne reconstitue la réforme microéconomique citée.',
 'Les chiffres issus des études sont des estimations de leurs auteurs, pas des résultats EcoSim.']};
const outDir=path.join(dist,'validation');fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'empirique-423.json'),JSON.stringify(result,null,2)+'\n');
const head=['caseId','label','horizon','deltaGdpPct','deltaDeficitBn','deltaDebtBn','deltaUnemploymentPp','comparability'];
const csv=v=>'"'+String(v??'').replaceAll('"','""')+'"';
fs.writeFileSync(path.join(outDir,'empirique-423.csv'),[head.join(';'),...records.map(r=>head.map(f=>csv(r[f])).join(';'))].join('\n')+'\n');
assert.equal(studies.length,4);
assert.equal(records.length,16);
assert.ok(studies.every(s=>s.quantitativeVerdict==='interdit'&&s.url.startsWith('https://')));
assert.equal(studies.filter(s=>s.comparability==='partielle').length,1);
assert.equal(studies.filter(s=>s.comparability==='non équivalente').length,3);
console.log('VALIDATION DOCUMENTAIRE 4.23 OK : 4 études, 4 chocs illustratifs, 16 lignes, 0 prétention causale.');
for(const row of records.filter(r=>r.horizon===1||r.horizon===3))console.log(row.caseId,row.horizon,row.deltaGdpPct.toFixed(3)+'%','deficit',row.deltaDeficitBn.toFixed(3)+'Md€');
