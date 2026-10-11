/** Contrôle de notice de droits, sans prétention de certification juridique. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const notice=read('LICENSE');
assert.ok(!fs.existsSync(path.join(dist,'NOTICE-DROITS.txt')),'Ne pas publier un doublon du fichier LICENSE');
assert.match(notice,/NON une\s+licence libre/);
assert.match(notice,/sortie purement générée/i);
assert.match(notice,/licences propres/i);
assert.match(notice,/exceptions légales/i);
assert.match(notice,/GitHub Issues/);
assert.doesNotMatch(notice,/mailto:/i);
const legal=read('dist/informations-legales.html');
assert.match(legal,/id="reutilisation"/);
assert.ok(legal.includes('https://github.com/nicolasmoreau1982-beep/nicolasmoreau1982-beep.github.io/blob/main/LICENSE'),'Lien direct vers le LICENSE GitHub manquant');
assert.match(legal,/Insee/);
assert.match(legal,/intelligence artificielle/);
assert.match(legal,/exception légale/);
assert.match(read('dist/index.html'),/informations-legales\.html#reutilisation/);
assert.match(read('dist/a-propos.html'),/informations-legales\.html#reutilisation/);
for(const name of ['site-meta-531.js','distribution-ciblee-580.mjs','model-distribution-580.mjs']) {
 const js=read('dist/'+name);
 assert.ok(js.includes('https://github.com/nicolasmoreau1982-beep/nicolasmoreau1982-beep.github.io/blob/main/LICENSE'),name);
}
assert.equal(JSON.parse(read('dist/release-status-572.json')).deliveryLabel,'5.7.2.11');
const pages=fs.readdirSync(dist).filter(x=>x.endsWith('.html')&&!x.startsWith('google'));
for(const page of pages){
 const html=read('dist/'+page);
 assert.equal((html.match(/class="rights-notice"/g)||[]).length,1,`${page} : mention de droits absente ou dupliquée`);
 assert.match(html,/© 2026 EcoSim France/);
 assert.match(html,/informations-legales\.html#reutilisation/);
 assert.ok(html.indexOf('class="rights-notice"')<html.indexOf('</footer>'),`${page} : droits hors footer`);
}
assert.match(legal,/Propriété intellectuelle et réutilisation/);
assert.match(legal,/GitHub Issues/);
assert.doesNotMatch(legal,/href="NOTICE-DROITS\.txt"/);
console.log(`DROITS OK : ${pages.length} pages portent une mention visible, LICENSE GitHub unique et GitHub Issues uniquement.`);
