/** Tests de cohérence de la publication transparente EcoSim 4.20. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=x=>fs.readFileSync(path.join(root,'dist',x),'utf8');
const require=createRequire(import.meta.url);
globalThis.window=globalThis;
require(path.join(root,'dist/data.js'));
const D=globalThis.ECOSIM_DATA;
assert.equal(D.metadata.version,'4.23.0');
const reg=JSON.parse(file('validation/provenance-politique-420.json'));
assert.equal(reg.version,'4.23.0');
const expectedScenarios=Object.values(D.politicalScenarios).flat().length;
assert.equal(reg.scenarios.length,expectedScenarios);
assert.equal(reg.rows.length,reg.counts.total);
assert.equal(reg.rows.filter(x=>x.status==='exact').length,reg.counts.exact);
assert.equal(reg.rows.filter(x=>x.status==='related').length,reg.counts.related);
assert.equal(reg.rows.filter(x=>x.status==='unverified').length,reg.counts.unverified);
assert.equal(reg.counts.total,reg.counts.exact+reg.counts.related+reg.counts.unverified);
const keys=new Set();
for(const row of reg.rows){
 const id=[row.period,row.scenarioId,row.key].join(':');
 assert.ok(!keys.has(id),`Double enregistrement : ${id}`);
 keys.add(id);
 const scenario=D.politicalScenarios[row.period].find(x=>x.id===row.scenarioId);
 assert.ok(scenario,`Groupe inconnu : ${id}`);
 const [kind,...rest]=row.key.split('.');
 const key=rest.join('.');
 assert.equal(kind==='euMode'?scenario.euMode:scenario[kind][key],row.value,id);
 if(row.status==='unverified')assert.equal(row.sourceUrl,null,id);
 else {
  assert.ok(/^https?:\/\//.test(row.sourceUrl));
  assert.ok(row.sourceLocator && row.sourceTitle,id);
 }
}
const benchmark=JSON.parse(file('validation/benchmark-419.json'));
const value=benchmark.central.find(r=>r.scenario==='composite-proxy'&&r.horizon===3).outputGap;
const reference=benchmark.central.find(r=>r.scenario==='mesange-reference'&&r.horizon===3).outputGap;
assert.equal(value.toFixed(2),'0.60');
assert.equal(reference.toFixed(2),'1.03');
for (const f of ['index.html','audit.html','programmes-economiques-2027.html']) {
 const html=file(f);
 assert.ok(html.includes('provenance-politique.html'),`Lien registre manquant : ${f}`);
}
const index=file('index.html');
assert.ok(index.includes('Version 4.23'));
assert.ok(index.includes('benchmark-context')&&index.includes('+0,60 %')&&index.includes('+1,03 %'));
assert.ok(index.includes('Les chiffres sont des hypothèses EcoSim') || index.includes('les chiffres sont des hypothèses EcoSim') || index.includes('les chiffres sont des hypothèses'));
const audit=file('audit.html');
assert.ok(audit.includes('id="provenance-420"')&&audit.includes('17'));
const page=file('provenance-politique.html');
assert.equal((page.match(/class="provenance-scenario"/g)||[]).length,expectedScenarios);
assert.equal((page.match(/class="prov-scroll"/g)||[]).length,expectedScenarios-1); // témoin sans réglage
assert.ok(!page.includes('Chargement des résultats'));
assert.ok(file('sitemap.xml').includes('provenance-politique.html'));
assert.equal(file('validation/provenance-politique-420.csv').trim().split('\n').length,1+reg.rows.length);
const app=file('app.js');
assert.ok(app.includes('Registre exhaustif de ce scénario'));
assert.ok(!app.includes('incumbentVoteSensitivity'));
console.log(`TRANSPARENCE 4.20 OK : ${reg.scenarios.length} scénarios, ${reg.counts.total} réglages, ${reg.counts.related} liés, ${reg.counts.unverified} non vérifiés ; référence Mésange concordante.`);
