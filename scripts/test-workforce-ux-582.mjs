/** Revue 5.8.2 : l'amélioration des libellés n'altère aucun calcul économique. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(f)=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('dist/index.html');
const code=read('dist/workforce-ux-582.js');
assert.match(html,/<link rel="stylesheet" href="workforce-ux-582\.css"\s*\/>/);
assert.ok(html.indexOf('<script src="app.js"')<html.indexOf('<script src="workforce-ux-582.js"'), 'L’extension doit suivre le moteur.');
assert.match(code,/MutationObserver/);
assert.match(code,/Aucun recrutement supplémentaire demandé cette année/);
assert.match(code,/Hausse de moins de 50 agents/);
assert.match(code,/Baisse de moins de 50 agents/);
assert.match(code,/Écart d’agents en activité/);
assert.match(code,/isZero\(match\[1\]\)/);
// Vérification indépendante de l'intégrité historique du coeur macro.
const frozen=JSON.parse(read('fixtures/source-hashes-531.json'));
const hash=(t)=>crypto.createHash('sha256').update(t).digest('hex');
assert.equal(hash(read('dist/app.js')),frozen.files['app.js']);
assert.equal(hash(read('dist/styles.css')),read('dist/manifest-integrite-571.sha256').match(/^([a-f0-9]{64})  styles\.css$/m)?.[1]);
console.log('UX EFFECTIFS 5.8.2 : extension, libellés et empreintes macro inchangés.');
