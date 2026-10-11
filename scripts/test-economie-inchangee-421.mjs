/** Vérifie que les coefficients économiques et les trajectoires 4.19 n'ont pas bougé dans la 4.21. */
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const dist=path.join(root,'dist');
const historical=JSON.parse(fs.readFileSync(path.join(dist,'validation/benchmark-419.json'),'utf8'));
const sandbox={console,Math,Number,Object,Map,Set,Date,JSON,Intl,Array,String,Boolean};sandbox.window=sandbox;
const ctx=vm.createContext(sandbox);
for(const file of ['data.js','historical-audit-data.js','history.js','insee-projection.js','fiscal.js','sectoral.js','guardrails-510.js','political-profiles-530.js'])vm.runInContext(fs.readFileSync(path.join(dist,file),'utf8'),ctx,{filename:file});
let app=fs.readFileSync(path.join(dist,'app.js'),'utf8');const marker='  loadInitialState();\n  initTheme();';assert.ok(app.includes(marker));
app=app.slice(0,app.indexOf(marker))+'  window.__oldBenchmark={state,calculateProjection};\n})();';vm.runInContext(app,ctx,{filename:'app.js'});
const {state,calculateProjection}=ctx.__oldBenchmark;const D=ctx.ECOSIM_DATA,F=ctx.ECOSIM_FISCAL;
assert.deepEqual(JSON.parse(JSON.stringify(D.macroCoefficients)),historical.coefficients);
function reset(){state.changes={};state.model='consensus';state.euMode='current';state.cycle='normal';state.monetary='neutral';state.confidence='stable';state.policyStartQuarter=1;state.policyStartQuarters={};state.structural=Object.fromEntries(Object.entries(D.structural.controls).map(([k,c])=>[k,c.value]));state.engines=Object.fromEntries(Object.entries(D.policyEngines.controls).map(([k,c])=>[k,c.value]));state.fiscal={...F.defaults};}
let checks=0;
for(const s of historical.shocks.filter(s=>!s.reference)){
 reset();state.changes=JSON.parse(JSON.stringify(s.changes));const p=calculateProjection();
 for(const h of historical.horizons){
  const expected=historical.central.find(x=>x.scenario===s.id&&x.horizon===h);
  const r=p.scenario[h-1],b=p.baseline[h-1];
  for(const [metric,actual] of [['outputGap',r.outputGap],['deltaDeficitBn',r.deficit-b.deficit],['deltaDebtBn',r.debt-b.debt]]){
   assert.ok(Math.abs(actual-expected[metric])<1e-7,`${s.id} ${h} ${metric} a changé`);checks++;
  }
 }
}
console.log(`NEUTRALITÉ ÉCONOMIQUE 4.21 : ${checks} comparaisons de trajectoire identiques à la référence archivée 4.19.`);
