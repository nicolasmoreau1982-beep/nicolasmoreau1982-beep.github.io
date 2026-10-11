/** Régression 5.4 contre six trajectoires réellement gelées depuis la distribution 5.4.0. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';import {makeHarness} from './core-harness-540.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const golden=JSON.parse(fs.readFileSync(path.join(root,'fixtures/golden-531-for-540.json')));
assert.equal(golden.sourceVersion,'5.3.1');assert.equal(golden.sourcePackage,'40219bdd801f');
assert.equal(golden.cases.length,6);assert.equal(golden.projectionYears,30);
const h=makeHarness(path.join(root,'dist'));
assert.equal(h.D.metadata.version,'5.4.0');
let checks=0;
function assertValue(a,b,label){
 assert.ok(typeof a==='number'&&Number.isFinite(a) && typeof b==='number'&&Number.isFinite(b),label+': pas numérique');
 assert.ok(Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(b)),label+': dérive '+a+' != '+b);checks++;
}
for(const sc of golden.cases){
 h.reset();h.state.model=sc.model;h.state.changes={...sc.changes};
 const current=h.calculateProjection();assert.equal(current.scenario.length,30);
 for(let i=0;i<30;i++)for(const field of golden.fields)
   assertValue(current.scenario[i][field],sc.rows[i][field],sc.id+' '+(2026+i)+' '+field);
}
// Test négatif explicite : une corruption artificielle de la fixture doit être détectée.
const changed=structuredClone(golden.cases[0].rows[0]);changed.debt+=0.1;
assert.throws(()=>assertValue(changed.debt,golden.cases[0].rows[0].debt,'mutation'),/dérive/);
console.log('GOLDEN 5.4 OK :',golden.cases.length,'scénarios,',checks,'valeurs 2026–2055, référence 5.3.1, corruption détectée.');
