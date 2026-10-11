/** EcoSim 5.8.3 — parcours grand public sans toucher aux modules économiques historiques. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const read=n=>fs.readFileSync(path.join(dir,n),'utf8');
const h=read('index.html');
const pages=JSON.parse(read('data/glossary-520.json'));
const state=JSON.parse(read('release-status-572.json'));
assert.equal(state.interfaceUXVersion,'5.8.5');
assert.equal(state.deliveryLabel,'5.7.2.11');
assert.ok(h.indexOf('id="ux-reading-mode"')<0,'Pas de conteneur de formulaire redondant');
assert.match(h,/id="ux-discovery" aria-pressed="true"/);
assert.match(h,/id="ux-expert" aria-pressed="false"/);
assert.match(h,/id="ux-mode-status" role="status"/);
const indexes=[...h.matchAll(/<button type="button" data-scroll="([^"]+)"/g)].map(m=>m[1]);
assert.ok(indexes.includes('workspace')&&indexes.includes('results')&&indexes.includes('politics'));
for(const id of indexes)assert.ok(h.includes('id="'+id+'"'),`Index vers une cible inconnue: ${id}`);
for(const id of ['structural','social','engines','budget','fiscal','sectoral-fiscal','qualite-500','perimeters'])
  assert.match(h,new RegExp(`id="${id}" data-ux-advanced="true"`),`Section avancée ${id}`);
assert.ok(!h.includes('04 bis'));
const hero=h.slice(h.indexOf('<section class="hero"'),h.indexOf('</section>',h.indexOf('<section class="hero"')));
assert.doesNotMatch(hero,/current-version-531|technical-release-note/,'Les versions sont réservées au pied de page');
assert.match(h,/footer[\s\S]*current-version-531/,'Versions publiques/techniques toujours traçables');
assert.match(hero,/ux-methodology-details/,'Sources et validations restent consultables');
assert.equal(Object.keys(pages).length,21);
for(const id of ['maep80','outputgap','millesime','soldes-recales','titulaires-flux']){
 assert.ok(pages[id]&&read('glossaire.html').includes('id="'+id+'"'));
}
assert.match(read('ux-parcours-583.js'),/MutationObserver/);
assert.match(read('ux-parcours-583.css'),/\[hidden\]/);
console.log('UX 5.8.3 OK : modes de lecture, 8 raccourcis, 21 entrées, traçabilité hors hero et moteurs non modifiés.');
