/** CI sans dépendance externe : exercices UX + cohérence HTML, après reconstruction du rendu. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(dist,file),'utf8');
const html = read('index.html');
const release = JSON.parse(read('release-status-572.json'));
assert.equal(release.interfaceUXVersion, '5.8.3');
assert.equal(release.workforceUXVersion, '5.8.2');
assert.equal(release.energyUXVersion, '5.8.4');
assert.equal(release.deliveryLabel, '5.7.2.9');
for (const filename of ['workforce-ux-582.js','ux-parcours-583.js','energy-ux-584.js']) {
  assert.ok(html.includes(`src="${filename}"`), `Extension non chargée : ${filename}`);
  assert.ok(html.indexOf('src="app.js"') < html.indexOf(`src="${filename}"`), 'Extension avant le moteur');
}
assert.ok(html.includes('href="energy-ux-584.css"'), 'CSS énergie non chargé');
assert.match(read('workforce-ux-582.js'), /Aucun recrutement supplémentaire demandé cette année/);
assert.match(read('workforce-ux-582.js'), /Inchangé/);
assert.match(html, /id="ux-discovery" aria-pressed="true"/);
assert.match(html, /id="ux-expert" aria-pressed="false"/);
assert.match(read('ux-parcours-583.js'), /setMode\(targetsAdvanced\(location\.hash\)/);
assert.match(read('ux-parcours-583.css'), /\[hidden\]/);
const nav = html.match(/<nav class="v52-quick-nav"[\s\S]*?<\/nav>/)?.[0];
assert.ok(nav && nav.includes('href="#workspace"') && nav.includes('href="#results"') && nav.includes('href="#politics"'));
assert.match(read('styles.css'), /\.journey-bar\s*\{\s*position:\s*sticky/);
assert.match(html, /href="informations-legales\.html#reutilisation"/);
assert.match(read('informations-legales.html'), /blob\/main\/LICENSE/);
// LICENSE reste dans le dépôt GitHub, pas dans les fichiers du site public.
// Le contrôle CI s'exécute soit dans dist/, soit à la racine du dépôt.
const licensePath = [path.join(dist, 'LICENSE'), path.join(dist, '..', 'LICENSE')].find(fs.existsSync);
assert.ok(licensePath, 'LICENSE absent de la racine du dépôt (publication interdite)');
assert.match(fs.readFileSync(licensePath,'utf8'), /droits réservés/i);

const callbacks = [];
class MutationObserver {constructor(cb){this.callback=cb;callbacks.push(cb);} observe() {}}
function metric(title, raw) {
  const strong = {textContent:raw, setAttribute(key,value){this[key]=value;}, classList:{add() {}}};
  const note={textContent:'variation vs réf.'};
  const small={textContent:title};
  return {dataset:{}, strong, note, querySelector(sel) {return ({strong,span:note,small})[sel] || null;}};
}
function exercise(text, bill, emissions) {
  const span={textContent:text,dataset:{}};
  const reason={querySelector(sel){return sel==='i'?{textContent:'ENE'}:sel==='span'?span:null;}};
  const rows=[metric('Facture énergétique',bill),metric('Émissions',emissions)];
  const story={querySelectorAll(sel) {assert.equal(sel,'.story-reason'); return [reason];}};
  const metrics={querySelectorAll(sel){assert.equal(sel,'.structural-outcome');return rows;}};
  const code=read('energy-ux-584.js');
  const context={document:{getElementById(id){return id==='story-reasons'?story:id==='structural-outcomes'?metrics:null;}},MutationObserver};
  callbacks.length=0;
  vm.runInNewContext(code,context,{filename:'energy-ux-584.js',timeout:2000});
  assert.equal(callbacks.length,2,'Observateurs de projection manquants');
  return {span,rows,refresh(){rows[0].dataset={};span.dataset={};callbacks[0]();callbacks[1]();}};
}
let x=exercise('Le scénario laisse presque inchangée la facture énergétique de 0,0 Md€ et modifie les émissions de 0,0 MtCO₂e.','0,0 Md€','0,0 Mt');
assert.match(x.span.textContent, /variation inférieure à 0,05 Md€/);
assert.match(x.span.textContent, /aucune variation calculée/);
assert.equal(x.rows[0].strong.textContent,'Inchangé');
assert.equal(x.rows[1].strong.textContent,'Inchangé');
assert.match(x.rows[1].strong['aria-label'],/écart par rapport à la référence/);
x=exercise('Le scénario alourdit la facture énergétique de 0,1 Md€ et modifie les émissions de +0,0 MtCO₂e.','+0,0 Md€','+0,0 Mt');
assert.match(x.span.textContent, /alourdit.*0,1 Md€/);
assert.match(x.span.textContent, /hausse inférieure à 0,05 MtCO₂e/);
assert.match(x.rows[0].strong.textContent,/Hausse < 0,05 Md€/);
assert.match(x.rows[1].strong.textContent,/Hausse < 0,05 MtCO₂e/);
x=exercise('Le scénario allège la facture énergétique de 2,4 Md€ et modifie les émissions de −0,0 MtCO₂e.','−1,1 Md€','−0,0 Mt');
assert.match(x.span.textContent,/allège.*2,4 Md€/);
assert.match(x.span.textContent,/baisse inférieure à 0,05 MtCO₂e/);
assert.equal(x.rows[0].strong.textContent,'−1,1 Md€');
assert.match(x.rows[1].strong.textContent,/Baisse < 0,05 MtCO₂e/);
x=exercise('Le scénario allège la facture énergétique de 2,4 Md€ et modifie les émissions de −1,2 MtCO₂e.','−1,1 Md€','−1,2 Mt');
assert.match(x.span.textContent,/−1,2 MtCO₂e/);
assert.equal(x.rows[0].strong.textContent,'−1,1 Md€');
assert.equal(x.rows[1].strong.textContent,'−1,2 Mt');
console.log('UX 5.8.4 : contrôles sentinelles CI OK (énergie nulle, arrondis +/−, vraies variations, parcours et droit d’auteur).');
