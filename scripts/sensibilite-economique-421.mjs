/** Stress test ±20 % autour des coefficients propres à EcoSim ; PAS une calibration ni un intervalle de confiance. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const ctx=vm.createContext({console,Math,Number,Object,Map,Set,Date,JSON,Intl,Array,String,Boolean});ctx.window=ctx;
for(const name of ['data.js','historical-audit-data.js','history.js','insee-projection.js','fiscal.js'])
 vm.runInContext(fs.readFileSync(path.join(dist,name),'utf8'),ctx,{filename:name});
let source=fs.readFileSync(path.join(dist,'app.js'),'utf8');
const stop='  loadInitialState();\n  initTheme();';
assert.ok(source.includes(stop),'Bootstrap déplacé : adapter le banc de sensibilité');
source=source.slice(0,source.indexOf(stop))+'  window.__sensitivity={state,calculateProjection};\n})();';
vm.runInContext(source,ctx,{filename:'app.js'});
const {state,calculateProjection}=ctx.__sensitivity;
const D=ctx.ECOSIM_DATA,F=ctx.ECOSIM_FISCAL;
assert.equal(D.metadata.version,'4.21.0');
const original={...D.macroCoefficients};
const horizons=[1,3,5,10];
const scenarios=[
 {id:'education10',label:'Enseignement primaire +10 Md€/an',changes:{GF0901:10}},
 {id:'pensions-10',label:'Pensions −10 Md€/an',changes:{GF1002:-10}},
 {id:'tva10',label:'TVA +10 Md€/an',changes:{R_TVA:10}},
 {id:'ir10',label:'IR +10 Md€/an',changes:{R_IR:10}}
];
const reset=()=>{
 state.changes={};state.model='consensus';state.euMode='current';state.cycle='normal';state.monetary='neutral';state.confidence='stable';
 state.policyStartQuarter=1;state.policyStartQuarters={};
 state.structural=Object.fromEntries(Object.entries(D.structural.controls).map(([k,c])=>[k,c.value]));
 state.engines=Object.fromEntries(Object.entries(D.policyEngines.controls).map(([k,c])=>[k,c.value]));
 state.fiscal={...F.defaults};
};
const simulate=s=>{reset();state.changes={...s.changes};const out=calculateProjection();
 return horizons.map(h=>{
  const p=out.scenario[h-1],b=out.baseline[h-1];
  assert.ok(Number.isFinite(p.outputGap)&&Number.isFinite(p.deficit)&&Number.isFinite(p.debt));
  return {horizon:h,outputGapPp:p.outputGap,deltaDeficitBn:p.deficit-b.deficit,deltaDebtBn:p.debt-b.debt,deltaUnemploymentPp:p.unemployment-b.unemployment};
 });};
const central=scenarios.flatMap(s=>simulate(s).map(r=>({scenario:s.id,...r})));
const variants=[];
for(const coefficient of Object.keys(original)){
 for(const factor of [0.8,1.2]){
  D.macroCoefficients[coefficient]=original[coefficient]*factor;
  for(const s of scenarios){
   for(const record of simulate(s)) variants.push({scenario:s.id,coefficient,factor,...record});
  }
  D.macroCoefficients[coefficient]=original[coefficient];
 }
}
for(const k of Object.keys(original))assert.equal(D.macroCoefficients[k],original[k]);
const summary=[];
for(const s of scenarios){
 for(const h of horizons){
  const center=central.find(x=>x.scenario===s.id&&x.horizon===h);
  const stress=variants.filter(x=>x.scenario===s.id&&x.horizon===h);
  const all=[center.deltaDeficitBn,...stress.map(x=>x.deltaDeficitBn)];
  const min=Math.min(...all),max=Math.max(...all);
  const sign=x=>Math.abs(x)<0.01?'near-zero':x>0?'positive':'negative';
  const signs=[...new Set(all.map(sign))];
  const influences=Object.keys(original).map(coefficient=>{
   const matches=stress.filter(x=>x.coefficient===coefficient);
   return {coefficient,maxAbsDeficitChangeBn:Math.max(...matches.map(r=>Math.abs(r.deltaDeficitBn-center.deltaDeficitBn)))};
  }).sort((a,b)=>b.maxAbsDeficitChangeBn-a.maxAbsDeficitChangeBn);
  summary.push({scenario:s.id,horizon:h,centralOutputGapPp:center.outputGapPp,
    centralDeficitBn:center.deltaDeficitBn,minDeficitStressBn:min,maxDeficitStressBn:max,
    centralDebtBn:center.deltaDebtBn,minDebtStressBn:Math.min(center.deltaDebtBn,...stress.map(x=>x.deltaDebtBn)),
    maxDebtStressBn:Math.max(center.deltaDebtBn,...stress.map(x=>x.deltaDebtBn)),
    signStable:signs.length===1,signs,mostSensitiveForDeficit:influences[0].coefficient,coefficientRank:influences,
    outputGapUnaffectedByTheseCoefficients:stress.every(r=>Math.abs(r.outputGapPp-center.outputGapPp)<1e-9)});
 }
}
const output={version:'4.21.0',date:'2026-10-11',horizons,model:'consensus',euMode:'current',
 stressMultipliers:[0.8,1.2],coefficients:original,scenarios,central,variants,summary,
 limitations:['Variation d’un seul coefficient à la fois, pas d’interactions simultanées entre coefficients.',
 'Bornes ±20 % conventionnelles : ni intervalle de confiance ni borne statistique.',
 'Les trois coefficients étudiés agissent sur le chômage, les recettes et les stabilisateurs, non directement sur le PIB : l’écart de PIB est inchangé par construction dans ce test.',
 'Un signe stable dans ce banc ne prouve pas le signe de l’effet dans l’économie réelle.']};
fs.writeFileSync(path.join(dist,'validation','sensibilite-421.json'),JSON.stringify(output,null,2)+'\n');
const cols=['scenario','horizon','centralOutputGapPp','centralDeficitBn','minDeficitStressBn','maxDeficitStressBn','centralDebtBn','minDebtStressBn','maxDebtStressBn','signStable','mostSensitiveForDeficit'];
const q=x=>'"'+String(x).replaceAll('"','""')+'"';
fs.writeFileSync(path.join(dist,'validation','sensibilite-421.csv'),[cols.join(','),...summary.map(r=>cols.map(c=>q(r[c])).join(','))].join('\n')+'\n');
console.log(`SENSIBILITÉ 4.21 : ${central.length} résultats centraux et ${variants.length} résultats stress ; ${summary.filter(r=>!r.signStable).length} cas à signe instable.`);
