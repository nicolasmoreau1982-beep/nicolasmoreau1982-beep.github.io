/** Test intégré automatiquement par run-tests-510.sh, sans dépendance tierce. */
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
execFileSync(process.execPath,[path.join(dist,'scripts/test-ux-sentinelle-584.mjs')],{stdio:'inherit'});
const frozen=JSON.parse(fs.readFileSync(path.join(root,'fixtures/source-hashes-531.json'),'utf8'));
const sha=name=>crypto.createHash('sha256').update(fs.readFileSync(path.join(dist,name))).digest('hex');
// Empreintes du paquet 5.8.3 de référence ; les versions plus anciennes avaient
// déjà modifié data.js et fiscal.js par rapport à la golden initiale 5.3.1.
const source583={
  'data.js':'74f65edb5928d2749caf0cb21ca01dfab113fcb054161cc6255db938033f9e74',
  'fiscal.js':'696ab1bef801ecb57528b1e6821c32ab1d58bf813f09fc4e050aa103bbe27014',
  'energy-balance-500.js':'fedb0457d31bdd2d6ee1d3a8f385213a4b66e05050ad439ad78d37a5069a661e'
};
assert.equal(sha('app.js'),frozen.files['app.js'],'Moteur économique d’origine modifié');
for(const [name,expected] of Object.entries(source583))
  assert.equal(sha(name),expected,`Module modifié depuis 5.8.3: ${name}`);
console.log('UX 5.8.4 : code historique inchangé, sentinelles OK.');
