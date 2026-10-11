/** EcoSim 4.24 — registre sectoriel, robustesse, flux et absence de doublons internes. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>fs.readFileSync(path.join(root,'dist',f),'utf8');
const ctx=vm.createContext({console,Math,Number,Object,Map,Set,Date,JSON,Intl,Array,String,Boolean});ctx.window=ctx;
for(const f of ['data.js','historical-audit-data.js','history.js','insee-projection.js','fiscal.js','sectoral.js','guardrails-510.js','political-profiles-530.js'])
 vm.runInContext(read(f),ctx,{filename:f});
let src=read('app.js');const stop='  loadInitialState();\n  initTheme();';
assert.ok(src.includes(stop));src=src.slice(0,src.indexOf(stop))+'  window.__sectorTest={state,calculateProjection,serializableState,applySerialized};\n})();';
vm.runInContext(src,ctx,{filename:'app.js'});
const S=ctx.ECOSIM_SECTORAL,D=ctx.ECOSIM_DATA,{state,calculateProjection,serializableState,applySerialized}=ctx.__sectorTest;
assert.equal(D.metadata.version,'5.7.0');assert.equal(Object.keys(S.sectors).length,16);
assert.equal(Object.keys(S.instruments).length,3);
const base=calculateProjection();
for(let i=0;i<30;i++) assert.equal(base.scenario[i].sectoral.revenueChange,0);
const mk=(sector,instrument,amountBn=2,startYear=2026,durationYears=3,response='accounting')=>({sector,instrument,amountBn,startYear,durationYears,response});
const credit=mk('renewables','credit');state.sectoral=S.normalize([credit]);
const p=calculateProjection();
assert.equal(p.scenario[0].sectoral.revenueChange,-2);
assert.equal(p.scenario[0].sectoral.spendingChange,0);
assert.equal(p.scenario[0].sectoral.gdpImpact,0);
assert.ok(Math.abs((p.scenario[0].deficit-base.scenario[0].deficit)-2)<1e-8);
assert.equal(p.scenario[3].sectoral.revenueChange,0,'expiration en 2029');
const levy=mk('metals','levy',3);const grant=mk('digital','grant',4);
state.sectoral=S.normalize([credit,levy,grant]);const mix=calculateProjection();
assert.equal(mix.scenario[0].sectoral.revenueChange,1); // -2+3
assert.equal(mix.scenario[0].sectoral.spendingChange,4);
assert.ok(Math.abs(mix.scenario[0].directBalanceCost-(base.scenario[0].directBalanceCost+3))<1e-8);
const examples=['constructor','__proto__','toString'];
for(const sector of examples)assert.throws(()=>S.normalize([mk(sector,'credit')]),{name:'RangeError'});
for(const instrument of examples)assert.throws(()=>S.normalize([mk('nuclear',instrument)]),{name:'RangeError'});
for(const amount of [0,10.1,Infinity,NaN,-3])assert.throws(()=>S.normalize([mk('nuclear','credit',amount)]),{name:'RangeError'});
assert.throws(()=>S.normalize(Array.from({length:9},()=>mk('renewables','credit'))),{name:'RangeError'});
assert.throws(()=>S.normalize(Array.from({length:4},()=>mk('renewables','credit',10))),{name:'RangeError'});
// avant 2026, crédits et durées impossibles, données intégrées validées avant mutation
const before=JSON.stringify(serializableState());
assert.equal(applySerialized({model:'consensus',sectoral:[mk('constructor','credit')]}),false);
assert.equal(JSON.stringify(serializableState()),before);
assert.equal(applySerialized({...serializableState(),sectoral:[mk('health','grant',3,2030,5,'exploratory')]}),true);
assert.equal(state.sectoral.length,1);
assert.equal(state.sectoral[0].sector,'health');
const future=calculateProjection();assert.equal(future.scenario[0].sectoral.spendingChange,0);
assert.equal(future.scenario[4].sectoral.spendingChange,3);
assert.equal(future.scenario[4].sectoral.gdpImpact,0,'délai industriel santé');
assert.ok(future.scenario[7].sectoral.gdpImpact>0);
assert.equal(applySerialized({model:'consensus',changes:{}}),true);
assert.equal(state.sectoral.length,0,'anciens imports doivent réinitialiser le module');
let projections=0;
for(const profile of Object.keys(D.models)){
 state.model=profile;
 for(const sector of ['renewables','nuclear','building','agriculture','digital']){
  state.sectoral=S.normalize([mk(sector,'credit',10,2026,15,'exploratory'),mk('fossil','levy',8,2026,15,'accounting')]);
  const out=calculateProjection();projections++;
  assert.equal(out.scenario.length,30);
  for(const item of out.scenario){
   assert.ok([item.gdp,item.debt,item.deficit,item.unemployment,item.sectoral.gdpImpact].every(Number.isFinite));
   assert.ok(Math.abs(item.deficitRatio-item.deficit/item.gdp*100)<1e-8);
  }
 }
}
// Pas de recalcul gratuit des émissions ou GW en plus du moteur énergétique.
const zero=base.scenario[0].structural.emissionsChange;
assert.equal(p.scenario[0].structural.emissionsChange,zero);
const html=read('index.html');assert.ok(html.includes('id="sectoral-fiscal"'));
assert.ok(html.includes('sectoral.js'));
assert.ok(read('fiscalite-sectorielle-424.html').includes('NACE Rev. 2.1'));
console.log(`SECTORIEL 4.24 OK : 16 filières, 3 instruments, ${projections} projections croisées sur 30 ans, imports, fenêtres, plafonds et comptabilité.`);
