/** Tests de traçabilité empirique 4.23 : ne prétend pas valider causalement le moteur. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=f=>fs.readFileSync(path.join(root,'dist',f),'utf8');
const doc=JSON.parse(file('validation/empirique-423.json'));
const html=file('evaluations-empiriques-423.html');
const csv=file('validation/empirique-423.csv');
const index=file('index.html'),audit=file('audit.html'),sitemap=file('sitemap.xml');
assert.equal(doc.version,'4.23.0');assert.equal(doc.studies.length,4);assert.equal(doc.cases.length,4);assert.equal(doc.records.length,16);
assert.equal(doc.studies.filter(s=>s.comparability==='partielle').length,1);
assert.equal(doc.studies.filter(s=>s.comparability==='non équivalente').length,3);
assert.ok(doc.studies.every(s=>s.quantitativeVerdict==='interdit'));
assert.equal(new Set(doc.studies.map(s=>s.url)).size,4);
assert.ok(doc.studies.every(s=>html.includes(s.url)&&html.includes(s.limitation)));
assert.match(html,/Aucun écart de prédiction ou taux d'erreur causal n'est calculé/);
assert.ok(html.includes('<caption>') && html.includes('<th scope="col">'));
assert.ok(html.includes('0 correspondance stricte'));
assert.ok(csv.split(/\r?\n/).filter(Boolean).length===17);
for(const r of doc.records){
 assert.ok([1,3,5,10].includes(r.horizon));
 for(const k of ['deltaGdpPct','deltaDeficitBn','deltaDebtBn','deltaUnemploymentPp'])assert.ok(Number.isFinite(r[k]));
}
for(const f of [index,audit,sitemap])assert.ok(f.includes('evaluations-empiriques-423.html'));
assert.ok(index.includes('Version <span data-ecosim-version>5.3.1</span>'));
const build=file('build-info.js').match(/\b[a-f0-9]{12}\b/)?.[0];
assert.ok(build);
assert.ok(html.includes('paquet <code>'+build+'</code>'));
assert.ok(file('provenance-politique.html').includes('data-ecosim-version'));
console.log('ÉVALUATION 4.23 OK : 4 études indépendantes, 0 correspondance stricte, 16 résultats calculés, sources, page et exports cohérents.');
