import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url);
globalThis.window=globalThis;
require(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist/fiscal-individuel-570.js'));
const F=globalThis.ECOSIM_FISCAL_INDIVIDUEL_570;
// Sources : Service-public 2026 (30000 brut); dossier DGFiP 2026 (19300 et 38000 après déduction forfaitaire 10%).
// Les impôts après décote sont avant le seuil de recouvrement, les retenues et les autres réductions.
const cases=[
 {id:'celibataire-30000',income:30000,type:'single',children:0,kind:'grossAfterFamilyCap',expected:2103.99,tolerance:.011},
 {id:'celibataire-19300-salaire',income:17370,type:'single',children:0,kind:'afterDecote',expected:25,tolerance:.55},
 {id:'couple-38000-salaires',income:34200,type:'couple',children:0,kind:'afterDecote',expected:275,tolerance:.55},
 {id:'aucun-revenu',income:0,type:'single',children:0,kind:'afterDecote',expected:0,tolerance:1e-9},
 {id:'famille-avec-plafond',income:180000,type:'couple',children:2,kind:'capApplied',expected:true},
 {id:'revenu-modeste-decote',income:18000,type:'single',children:0,kind:'decotePositive',expected:true},
];
let count=0;
for (const t of cases){const o=F.calculate({netTaxableIncome:t.income,householdType:t.type,children:t.children});
 const actual=t.kind==='decotePositive'?o.decote>0:o[t.kind];
 if(typeof t.expected==='boolean')assert.equal(actual,t.expected,t.id);
 else assert.ok(Math.abs(actual-t.expected)<=t.tolerance,`${t.id}: attendu ${t.expected}, obtenu ${actual}`);
 count++;
}
for(const type of ['single','couple'])for(let kids=0;kids<=3;kids++)for(const income of [0,10000,18000,35000,100000,500000]){
 const r=F.calculate({netTaxableIncome:income,householdType:type,children:kids});
 assert.ok(r.afterDecote>=0&&r.grossAfterFamilyCap>=r.grossUncapped-1e-7);
 assert.ok(r.afterDecote<=r.grossAfterFamilyCap+1e-7);
 assert.ok(Number.isFinite(r.afterDecote));count++;
}
for(const obj of [{netTaxableIncome:NaN},{netTaxableIncome:-1},{netTaxableIncome:'20000'},
 {netTaxableIncome:20000,householdType:'other'},{netTaxableIncome:20000,children:4}]){
 assert.throws(()=>F.calculate(obj));count++;
}
console.log('IR INDIVIDUEL 5.7 :',count,'tests (barème, décote, plafonnement QF, domaines, finitude) OK. Pas de microsimulation nationale.');
