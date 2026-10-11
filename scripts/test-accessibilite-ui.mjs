import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const dist=path.resolve('dist');
for (const file of ['index.html','audit.html','fiscal-individuel-570.html','distribution-ciblee-580.html']) {
 const html=fs.readFileSync(path.join(dist,file),'utf8');
 assert.match(html, /href="accessibilite-ui\.css"/);
 assert.match(html, /src="accessibilite-ui\.js"/);
 assert.match(html, /class="skip-link"/);
 assert.match(html, /<main\s+id="main"/);
}
const js=fs.readFileSync(path.join(dist,'accessibilite-ui.js'),'utf8');
const css=fs.readFileSync(path.join(dist,'accessibilite-ui.css'),'utf8');
for(const part of ['ArrowRight','Home','End','aria-label','tabindex','audit-table-wrap']) assert.ok(js.includes(part));
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /focus-visible/);
console.log('Accessibilité : présence des ressources, clavier, focus et réduction du mouvement OK');
