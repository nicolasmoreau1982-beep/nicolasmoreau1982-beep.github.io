import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {xoshiro128ss,matrices,indices,bootstrapIndices,FACTORS,toCsv,toSobolCsv,run} from './sensibilite-globale-561.mjs';
import {makeHarness} from './core-harness-540.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const rand=xoshiro128ss(42),rand2=xoshiro128ss(42),rand3=xoshiro128ss(43);
assert.deepEqual(Array.from({length:100},rand),Array.from({length:100},rand2));
assert.notDeepEqual(Array.from({length:10},xoshiro128ss(42)),Array.from({length:10},rand3));
const dims=Array.from({length:5},(_,i)=>({id:String(i),lo:0,hi:1}));
for(const n of [64,256,2048]){
 const {A,B}=matrices(n,0x5602026,dims);
 const calc=fn=>{
  const ya=A.map(fn),yb=B.map(fn);return dims.map((_,i)=>{
   const yc=A.map((a,j)=>{const z=a.slice();z[i]=B[j][i];return fn(z);});
   return indices(ya,yb,yc);
  });
 };
 const linear=calc(x=>x[0]);
 assert.equal(linear[1].first,0);assert.equal(linear[1].total,0);
 if(n>=256){assert.ok(Math.abs(linear[0].first-1)<0.17);assert.ok(Math.abs(linear[0].total-1)<0.17);}
 const additive=calc(x=>x[0]+x[1]);
 if(n===2048)for(const i of [0,1]){
  assert.ok(Math.abs(additive[i].first-0.5)<0.09,`additif S ${i} : ${additive[i].first}`);
  assert.ok(Math.abs(additive[i].total-0.5)<0.09,`additif ST ${i} : ${additive[i].total}`);
 }
 const interaction=calc(x=>x[0]*x[1]);
 if(n===2048){for(const i of [0,1])assert.ok(interaction[i].total>interaction[i].first-0.03);
   assert.equal(interaction[2].first,0);assert.equal(interaction[2].total,0);}
}
const boot=bootstrapIndices([0,1,2,3],[0,1,2,3],[0,1,2,3],{seed:42,replicates:128});
assert.equal(boot.firstLow,0);assert.equal(boot.totalHigh,0);
assert.throws(()=>bootstrapIndices([0],[0],[0],{replicates:-2}),RangeError);
const report=JSON.parse(fs.readFileSync(path.join(ROOT,'dist/validation/sensibilite-globale-561.json'),'utf8'));
assert.equal(report.version,'5.6.1');assert.equal(report.prng.startsWith('xoshiro128**'),true);
assert.equal(report.n,128);assert.equal(report.scenarios.length,3);assert.equal(report.scenarios[0].sobol.length,60);
assert.equal(report.projectionsTotales,21*report.n);
assert.equal(report.diagnostics.facteursStructurellementInactifs,84);
assert.equal(report.diagnostics.maxAbsPremierOrdreInactif,0);
assert.ok(report.diagnostics.violationsPremierSuperieurTotal<100,'indices trop instables');
assert.ok(report.scenarios.every(sc=>sc.sobol.every(s=>s.first===null || Number.isFinite(s.first))));
assert.match(toCsv(report),/p05,mediane,p95/);assert.match(toSobolCsv(report),/structurellement_inactif/);
assert.ok(fs.readFileSync(path.join(ROOT,'dist/sensibilite-globale-560.html'),'utf8').includes('ARCHIVE SCIENTIFIQUE'));
assert.ok(fs.readFileSync(path.join(ROOT,'dist/sensibilite-globale-561.html'),'utf8').includes('S₁'));
const h=makeHarness(path.join(ROOT,'dist'));
for(const x of [[.7,.7,.8,.84,.7],[1.3,1.3,1.2,1.16,1.3]]){
 h.reset();h.state.changes={GF0901:8,R_IR:10};
 const p=h.D.models.consensus;const orig={supplyScale:p.supplyScale,decay:p.decay,debtSensitivity:p.debtSensitivity};
 try{p.supplyScale=orig.supplyScale*x[2];p.decay=orig.decay*x[3];p.debtSensitivity=orig.debtSensitivity*x[4];
 const results=h.calculateProjection('consensus',null,{spending:x[0],tax:x[1]});
 assert.equal(results.scenario.length,30);for(const year of results.scenario){assert.ok(Number.isFinite(year.debt));assert.ok(Number.isFinite(year.gdp));}
 }finally{Object.assign(p,orig);}
}
assert.throws(()=>run({n:2049}),RangeError);assert.throws(()=>run({n:513}),RangeError);
console.log('STATISTIQUE 5.6.1 OK : Xoshiro, fonctions synthétiques, facteurs nuls, bootstrap, extrêmes, archives, résultats et stabilité.');
