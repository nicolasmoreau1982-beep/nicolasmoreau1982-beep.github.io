import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {run,toCsv,toSobolCsv,FACTORS} from './sensibilite-globale-560.mjs';
import {makeHarness} from './core-harness-540.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run32=run({n:32,seed:1234567,cases:[{id:'test',label:'Test mixte',changes:{GF0901:8,R_IR:10}}]});
assert.deepEqual(run32,run({n:32,seed:1234567,cases:[{id:'test',label:'Test mixte',changes:{GF0901:8,R_IR:10}}]}),'Reproductibilité graine fixe');
assert.notDeepEqual(run32,run({n:32,seed:1234568,cases:[{id:'test',label:'Test mixte',changes:{GF0901:8,R_IR:10}}]}),'Graine différente');
assert.equal(run32.simulationsParScenario,32*7);
assert.equal(run32.scenarios[0].summaries.length,12);
assert.equal(run32.scenarios[0].sobol.length,60);
assert.equal(FACTORS.length,5);
for(const s of run32.scenarios[0].summaries){
 for(const k of ['central','p05','p50','p95','min','max'])assert.ok(Number.isFinite(s[k]),`${k} non fini`);
 assert.ok(s.min<=s.p05&&s.p05<=s.p50&&s.p50<=s.p95&&s.p95<=s.max,'Quantiles ordonnés');
}
for(const s of run32.scenarios[0].sobol)for(const key of ['first','total'])if(s[key]!==null)assert.ok(Number.isFinite(s[key]));
assert.match(toCsv(run32),/p05,mediane,p95/);
assert.match(toSobolCsv(run32),/premier_ordre_brut,total_brut/);
for(const n of [0,31,513,128.5])assert.throws(()=>run({n}),RangeError);
for(const seed of [-1,2**33,0.5])assert.throws(()=>run({n:16,seed}),RangeError);
const report=JSON.parse(fs.readFileSync(path.join(root,'dist/validation/sensibilite-globale-560.json')));
assert.equal(report.version,'5.6.0');assert.equal(report.factors.length,5);
assert.equal(report.scenarios.length,3);assert.equal(report.simulationsParScenario,report.n*7);
assert.equal(report.seed,0x5602026);
for(const s of report.scenarios){assert.equal(s.summaries.length,12);assert.equal(s.sobol.length,60);}
// Vérification de l'intégrité du moteur standard après toutes les expériences.
const h=makeHarness(path.join(root,'dist'));h.reset();const reference=h.calculateProjection();
assert.ok(reference.scenario.every((p,i)=>Math.abs(p.debt-reference.baseline[i].debt)<1e-8));
assert.equal(h.D.models.consensus.supplyScale,1);assert.equal(h.D.models.consensus.decay,0.72);assert.equal(h.D.models.consensus.debtSensitivity,1);
console.log('SENSIBILITÉ 5.6 OK : reproductibilité, contraintes, quantiles, Sobol, non-mutation, exports, graine.');
