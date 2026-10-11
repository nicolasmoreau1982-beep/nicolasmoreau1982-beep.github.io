/** EcoSim 4.22 : variations de transmission économique, cas normaux et stabilité. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const ctx=vm.createContext({console,Math,Number,Object,Map,Set,Date,JSON,Intl,Array,String,Boolean});ctx.window=ctx;
for(const filename of ['data.js','historical-audit-data.js','history.js','insee-projection.js','fiscal.js','sectoral.js','guardrails-510.js','political-profiles-530.js'])
  vm.runInContext(fs.readFileSync(path.join(dist,filename),'utf8'),ctx,{filename});
let src=fs.readFileSync(path.join(dist,'app.js'),'utf8');
const stop='  loadInitialState();\n  initTheme();';
assert.ok(src.includes(stop),'Bootstrap modifié : mettre à jour le banc de test');
src=src.slice(0,src.indexOf(stop))+'  window.__test422={state,calculateProjection,calculateMultiplierAnalysis422};\n})();';
vm.runInContext(src,ctx,{filename:'app.js'});
const {state,calculateProjection}=ctx.__test422;
const D=ctx.ECOSIM_DATA,F=ctx.ECOSIM_FISCAL;
assert.equal(D.metadata.version,'5.6.1');
const cases=[
 {key:'education+10',label:'Éducation +10 Md€',changes:{GF0901:10}},
 {key:'pensions-10',label:'Pensions −10 Md€',changes:{GF1002:-10}},
 {key:'TVA+10',label:'TVA +10 Md€',changes:{R_TVA:10}},
 {key:'IR+10',label:'IR +10 Md€',changes:{R_IR:10}},
 {key:'mixte',label:'Mixte',changes:{GF0901:4,R_TVA:6,GF1002:-3}}
];
const horizons=[1,3,5,10];
const variants=[{label:'atténuée',factor:0.7},{label:'centrale',factor:1},{label:'renforcée',factor:1.3}];
let checks=0;
const records=[];
const changesBefore=JSON.stringify(state.changes);
for(const cas of cases){
 state.changes={...cas.changes};
 for(const variant of variants){
  const out=calculateProjection('consensus',null,variant.factor);
  assert.equal(out.scenario.length,30);
  for(let i=0;i<30;i++){
   const p=out.scenario[i],b=out.baseline[i];
   assert.ok([p.gdp,p.debt,p.deficit,p.revenueFeedback,p.cyclicalSpending,p.directBalanceCost,p.extraInterest].filter(v=>v!==undefined).every(Number.isFinite));
   const cyclical=(p.unemployment-D.baseline.unemployment[i])*D.macroCoefficients.cyclicalSpendingBnPerUnemploymentPoint;
   const components=p.directBalanceCost-p.revenueFeedback+cyclical+p.extraInterest;
   assert.ok(Math.abs(components-(p.deficit-b.deficit))<1e-7,`Décomposition ${cas.key}, ${i+1}`);
   checks+=2;
  }
  for(const horizon of horizons){
   const p=out.scenario[horizon-1],b=out.baseline[horizon-1];
   records.push({scenario:cas.key,label:cas.label,variant:variant.label,factor:variant.factor,horizon,
    gdpDeltaPct:(p.gdp/b.gdp-1)*100,deficitDeltaBn:p.deficit-b.deficit,debtDeltaBn:p.debt-b.debt,
    unemploymentDeltaPp:p.unemployment-b.unemployment});
  }
 }
}
state.changes={...cases[0].changes};
assert.throws(()=>calculateProjection('consensus',null,Infinity), {name:"RangeError"});
assert.throws(()=>calculateProjection('consensus',null,0), {name:"RangeError"});
// Aucune réforme ne doit créer de différence pour le facteur de transmission.
state.changes={};
const reference=variants.map(v=>calculateProjection('consensus',null,v.factor));
for(let i=0;i<30;i++)for(let j=1;j<reference.length;j++){
 assert.ok(Math.abs(reference[j].scenario[i].deficit-reference[0].scenario[i].deficit)<1e-9);
 assert.ok(Math.abs(reference[j].scenario[i].gdp-reference[0].scenario[i].gdp)<1e-9);
 checks+=2;
}
assert.equal(D.politicalScenarios.current.flatMap(s=>Object.values(s.evidence||{})).filter(e=>e.status==='exact').length,0);
assert.ok(D.politicalScenarios.current.flatMap(s=>Object.values(s.evidence||{})).filter(e=>e.status==='related').length>=20);
assert.ok(JSON.stringify(state.changes)==='{}');
const out={version:D.metadata.version,date:'2026-10-11',method:'Variation conventionnelle des multiplicateurs des postes budgétaires et fiscaux (pas de modification des moteurs structurels).',
 factors:variants,thresholds:'La stabilité du signe dans trois variantes arbitraires ne constitue pas une probabilité ni une validation empirique.',scenarios:cases,records};
const folder=path.join(dist,'validation');fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(path.join(folder,'multiplicateurs-422.json'),JSON.stringify(out,null,2)+'\n');
const fields=['scenario','label','variant','factor','horizon','gdpDeltaPct','deficitDeltaBn','debtDeltaBn','unemploymentDeltaPp'];
const escape=v=>'"'+String(v??'').replaceAll('"','""')+'"';
fs.writeFileSync(path.join(folder,'multiplicateurs-422.csv'),[fields.join(';'),...records.map(r=>fields.map(c=>escape(r[c])).join(';'))].join('\n')+'\n');
console.log(`TESTS 4.22 OK : ${cases.length} scénarios × ${variants.length} variantes × 30 ans ; ${checks} vérifications et ${records.length} résultats exportés.`);
