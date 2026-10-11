/** Tests de la transparence économique EcoSim 4.19 — pas une validation causale. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'dist/validation/benchmark-419.json'),'utf8'));
assert.equal(data.version,'4.19.0');
assert.equal(data.accounting.vintage.date,'2026-08-28');
const a=data.accounting;
assert.ok(Math.abs((a.spending-a.revenue)-a.deficit)<0.0001);
assert.ok(Math.abs(a.debt/2991.1*100-a.debtRatio)<0.05);
assert.ok(Math.abs(data.proxies.reduce((s,p)=>s+p.share,0)-1)<1e-10);
for(const [share,nature] of [[0.08,'investissement public'],[0.25,'rémunérations publiques'],[0.09,'prestations en nature'],[0.12,'consommations intermédiaires']]){
 assert.ok(data.proxies.some(p=>p.nature===nature&&p.share===share));
}
assert.equal(data.central.length,25);
assert.equal(data.sensitivity.length,120);
assert.deepEqual([...new Set(data.sensitivity.map(s=>s.coefficientExperiment.split(' × ')[0]))].sort(),Object.keys(data.coefficients).sort());
for(const r of [...data.central,...data.sensitivity]){
 assert.ok(Number.isFinite(r.outputGap),`PIB non fini : ${r.scenario} ${r.horizon}`);
 assert.ok([1,2,3,5,10].includes(r.horizon));
}
for(const s of ['composite-proxy','tva','ir','cotisations']) {
 const rows=data.central.filter(x=>x.scenario===s);
 assert.equal(rows.length,5);
}
const cmp=data.central.find(x=>x.scenario==='composite-proxy'&&x.horizon===3);
const mes=data.central.find(x=>x.scenario==='mesange-reference'&&x.horizon===3);
assert.ok(Math.abs(cmp.outputGap-mes.outputGap)>0.1,'Benchmark trop proche par construction ?');
const audit=fs.readFileSync(path.join(root,'dist/audit.html'),'utf8');
assert.ok(audit.includes('benchmark-419-body')&&audit.includes('Panier composite EcoSim (proxy COFOG)'));
assert.ok(!audit.includes('Résultats pré-générés lors de la construction.'));
for(const filename of ['index.html','audit.html']) assert.ok(fs.existsSync(path.join(root,'dist',filename)));
console.log('TESTS ÉCONOMIQUES 4.19 OK : base août 2026, parts Mésange, 25 lignes centrales, 120 lignes de stress, documentation HTML.');
