/** Non-régression : indépendance politique déclarée, contact non inventé. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const about=read('a-propos.html'), legal=read('informations-legales.html');
const main=read('index.html');
assert.match(about, /id="neutralite-politique"/);
assert.match(about, /EcoSim est politiquement agnostique/);
assert.match(about, /n'est pas une garantie d'absence de biais/);
assert.match(about, /ni mandat institutionnel, ni autorité officielle/);
assert.match(legal, /Le projet est politiquement agnostique/);
assert.match(legal, /sans mandat ni autorité institutionnelle/);
assert.match(legal, /informations de contact légales exigibles/);
assert.match(main, /a-propos.html#neutralite-politique/);
assert.doesNotMatch(legal, /mailto:/i, 'Coordonnées non confirmées : ne rien publier au hasard');
console.log('UX 5.8.5 : projet personnel, démarche politiquement agnostique et coordonnées publiques non inventées OK.');
