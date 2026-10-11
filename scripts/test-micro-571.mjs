import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {summarize} from '../dist/microdonnees-validation/estimer-571.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const d=JSON.parse(fs.readFileSync(path.join(root,'microdonnees-validation/demo-571.json'),'utf8'));
const a=summarize(d);
assert.equal(a.status,'demonstration_not_representative');assert.equal(a.nRows,56);
assert.equal(a.deciles.length,10);
assert.ok(Math.abs(a.deciles.reduce((s,x)=>s+x.variation,0)-a.totals.difference)<1e-6);
assert.ok(Math.abs(a.deciles.reduce((s,x)=>s+x.foyersPonderes,0)-a.totalWeight)<1e-6);
assert.ok(a.totals.difference<0,'Une baisse du taux à 11% doit réduire le rendement sur cet échantillon');
const z=structuredClone(d);z.reformRates=[0,.11,.30,.41,.45];assert.ok(Math.abs(summarize(z).totals.difference)<1e-6);
for(const edit of [x=>x.households[0].weight=0, x=>x.households[0].id=x.households[1].id,
  x=>x.households[0].netTaxableIncome=-1, x=>x.unit='person',x=>x.source=null,
  x=>x.reformRates=[0,0,0,0]]){
 const bad=structuredClone(d);edit(bad);assert.throws(()=>summarize(bad));
}
const claimed=structuredClone(d);claimed.source={...claimed.source,samplingDocumentation:'document',weightDocumentation:'document',legalAccessBasis:'document',coverage:'document'};
assert.equal(summarize(claimed).status,'source_declared_not_independently_verified');
console.log('MICRODONNEES 5.7.1 : agrégation et reforme vérifiées; données fictives jamais dites représentatives.');
