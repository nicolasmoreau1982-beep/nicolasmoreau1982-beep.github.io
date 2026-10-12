/* Validation de traçabilité : ne modifie aucun fichier. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root,'dist');
const read = p => readFileSync(path.join(dist,p),'utf8');
const delivery = JSON.parse(read('release-status-591.json'));
assert.equal(delivery.delivery.label,'5.9.1');
assert.equal(delivery.components.enginePublic,'5.7.1');
assert.equal(delivery.components.fiscalTechnicalHistorical,'5.7.2');
const buildInfo = read('build-info.js');
assert.match(buildInfo,/ECOSIM_VERSION\s*=\s*["']5\.7\.1["']/);
assert.match(buildInfo,/ECOSIM_TECHNICAL_VERSION\s*=\s*["']5\.7\.2["']/);
const report = JSON.parse(read(delivery.fiscalExternalComparison.report));
assert.equal(report.count,56);
assert.equal(report.packageVersion,'176.1.2');
assert.equal(report.afterDecote.casesAboveOneEuro,0);
assert.ok(report.afterDecote.maximumAbsoluteEuro<=0.475001);
assert.equal(report.inputFileSHA256,delivery.fiscalExternalComparison.inputReferenceSha256);
const csv = read(delivery.fiscalExternalComparison.casesCsv).replace(/^\uFEFF/,'').trimEnd().split(/\r?\n/);
assert.equal(csv.length,57,'56 lignes de résultats + en-tête');
assert.equal(new Set(csv.slice(1).map(line=>line.split(';')[0])).size,56);
for (const file of ['versions-591.html','verification-openfisca-591.html']) {
  assert.ok(existsSync(path.join(dist,file)));
  const html=read(file);
  assert.match(html,/<h1>/);assert.match(html,/5\.9\.1|OpenFisca/);
}
assert.match(read('versions-591.html'),/release-status-591\.json/);
assert.match(read('verification-openfisca-591.html'),/variables fiscales intermédiaires/);
console.log('OK : manifeste 5.9.1, séparation moteur 5.7.1, 56 preuves OpenFisca, pages publiques.');
