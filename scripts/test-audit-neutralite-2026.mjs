/** Garde-fou éditorial : l'audit présente EcoSim sans comparaison promotionnelle. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'dist', 'audit.html'), 'utf8');

assert.doesNotMatch(html, /Comparaison avec les simulateurs citoyens/i);
assert.match(html, /OpenFisca/);
assert.match(html, /id="incertitude"/);
assert.match(html, /id="recherche"/);
console.log('OK : page audit sans comparaison promotionnelle ; sources scientifiques conservées.');
