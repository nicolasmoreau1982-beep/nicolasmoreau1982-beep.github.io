/** Contrôle de l'intégrité des rapports 4.21, distinct de leur validité externe. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const load=f=>fs.readFileSync(path.join(root,'dist',f),'utf8');
const fiscal=JSON.parse(load('validation/fiscal-externe-421.json'));
const econ=JSON.parse(load('validation/sensibilite-421.json'));
assert.equal(fiscal.version,'4.21.0');assert.equal(econ.version,'4.21.0');
assert.equal(fiscal.cases.length,9);
for(const row of fiscal.cases){
 assert.ok(row.source.startsWith('https://'));
 assert.ok(Math.abs(row.actual-row.expected)<0.011);
}
assert.ok(fiscal.coverageLimits.some(x=>x.includes('OpenFisca')));
assert.equal(econ.scenarios.length,4);assert.equal(econ.central.length,16);assert.equal(econ.variants.length,96);
assert.equal(econ.summary.length,16);
assert.deepEqual(Object.keys(econ.coefficients).sort(),['cyclicalSpendingBnPerUnemploymentPoint','revenueBnPerNominalGdpBn','unemploymentPpPerOutputGapPoint']);
for(const row of econ.summary){
 assert.ok(Number.isFinite(row.centralDeficitBn));
 assert.ok(row.minDeficitStressBn<=row.centralDeficitBn+1e-9);
 assert.ok(row.maxDeficitStressBn>=row.centralDeficitBn-1e-9);
 assert.equal(row.coefficientRank.length,3);
 assert.equal(row.outputGapUnaffectedByTheseCoefficients,true);
 assert.ok(row.coefficientRank.every(x=>Number.isFinite(x.maxAbsDeficitChangeBn)));
}
for(const [file,pattern] of [
 ['index.html','validation-economique-421.html'],
 ['audit.html','id="validation-421"'],
 ['sitemap.xml','validation-economique-421.html'],
 ['validation-economique-421.html','cas fiscaux']
]) assert.ok(load(file).toLowerCase().includes(pattern.toLowerCase()),`${file} absent : ${pattern}`);
const html=load('validation-economique-421.html');
assert.equal((html.match(/Source officielle ↗/g)||[]).length,9);
assert.equal((html.match(/Stable dans ce test/g)||[]).length,4);
assert.ok(!html.includes('Chargement des résultats'));
for(const f of ['fiscal-externe-421','sensibilite-421']){
 assert.ok(load(`validation/${f}.csv`).trim().split('\n').length>2);
}
console.log('VALIDATION 4.21 OK : 9 cas fiscaux, 16 valeurs centrales, 96 variantes et tables HTML statiques cohérentes.');
