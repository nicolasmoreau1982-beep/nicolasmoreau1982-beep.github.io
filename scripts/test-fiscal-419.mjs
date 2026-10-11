/** Vérifications de règles fiscales stylisées. Ne valide PAS les rendements nationaux. */
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import path from 'node:path';
const require=createRequire(import.meta.url);
globalThis.window=globalThis;
const file=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist/fiscal.js');
require(file);
const F=globalThis.ECOSIM_FISCAL;
const base=F.simulate({...F.defaults},2026,1);
assert.ok(Math.abs(base.totalBn)<1e-9);
const reforms=[
 {name:'IR tranche basse à 0 %',config:{...F.defaults,irLowRate:0}},
 {name:'IR tranche basse à 20 %',config:{...F.defaults,irLowRate:20}},
 {name:'IR tranche haute à 65 %',config:{...F.defaults,irTopRate:65}},
 {name:'IFI seuil à 10 M€',config:{...F.defaults,ifiThresholdM:10}},
 {name:'Successions abattement à 500 k€',config:{...F.defaults,inheritanceAllowanceK:500}},
 {name:'Impôt plancher simulé à 2 %',config:{...F.defaults,wealthFloorEnabled:1}},
];
let checks=0;
for(const reform of reforms){
 const before=F.simulate({...reform.config,startYear:2030},2029,1);
 assert.ok(Math.abs(before.totalBn)<1e-9,`Effet avant application : ${reform.name}`);checks++;
 for(const year of [2026,2030,2040]){
  const after=F.simulate({...reform.config,startYear:year},year,1);
  assert.ok(Number.isFinite(after.totalBn),`Rendement non fini : ${reform.name}`);
  assert.ok(Math.abs(after.totalBn-Object.values(after.deltaByTax).reduce((s,v)=>s+v,0))<1e-7);
  assert.ok(after.groups.every(g=>Number.isFinite(g.averageGainEuro)));
  checks+=3;
 }
}
for(const rate of [0,11,20,30]){
 const ratePolicy=F.policyRules({...F.defaults,irLowRate:rate});
 assert.ok(ratePolicy.incomeTax.brackets.every(b=>Number.isFinite(b.rate)));
 checks++;
}
const irLower=F.simulate({...F.defaults,irLowRate:0},2026,1).deltaByTax.ir;
const irHigher=F.simulate({...F.defaults,irLowRate:20},2026,1).deltaByTax.ir;
assert.ok(irHigher>irLower,'Augmenter le taux marginal ne doit pas diminuer la recette synthétique IR');checks++;
const ifi=F.simulate({...F.defaults,ifiThresholdM:10},2026,1).deltaByTax.ifi;
assert.ok(ifi<=0,'Relever le seuil IFI doit réduire la recette du modèle');checks++;
console.log('TESTS FISCAUX 4.19 OK :',checks,'contrôles de calendrier, finitude, décomposition, monotonie de cas-types. Pas de validation nationale.');
