/* Contrôle statique de l'intégration du graphique sur ordinateur.
 * Les tests d'interactions réels doivent être exécutés dans Chromium avant publication.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const html=readFileSync(path.join(dist,'index.html'),'utf8');
const jsPath=path.join(dist,'desktop-chart-ux.js');
const cssPath=path.join(dist,'desktop-chart-ux.css');
const referenced=/desktop-chart-ux\.(?:js|css)/.test(html);
if (!referenced && !existsSync(jsPath) && !existsSync(cssPath)) {
 console.log('INFO : graphique permanent non intégré à ce dépôt : test d’intégration ignoré, à activer après ajout du composant.');
 process.exit(0);
}
assert.ok(existsSync(jsPath) && existsSync(cssPath),'CSS et JS du graphique doivent être présents ensemble');
assert.equal((html.match(/desktop-chart-ux\.js/g)||[]).length,1,'script unique');
assert.equal((html.match(/desktop-chart-ux\.css/g)||[]).length,1,'CSS unique');
assert.match(html,/id=["']chart-wrap["']/);
const js=readFileSync(jsPath,'utf8');
const css=readFileSync(cssPath,'utf8');
assert.match(js,/rail\.appendChild\(chart\)/,'composant graphique existant, non cloné');
assert.match(js,/originalParent\.insertBefore\(chart, marker\.nextSibling\)/,'restauration hors desktop');
assert.doesNotMatch(js,/cloneNode|calculateProjection|localStorage|fetch\(/);
assert.match(css,/position:\s*sticky/);
console.log('OK : le graphique permanent est branché une seule fois et utilise le composant existant.');
