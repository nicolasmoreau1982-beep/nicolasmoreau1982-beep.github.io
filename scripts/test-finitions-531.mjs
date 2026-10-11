/** Tests dédiés à la finition 5.3.1 : éditorial, version, liens, sitemap et métadonnées. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const read=n=>fs.readFileSync(path.join(dist,n),'utf8');
const main=read('index.html');
const contact=read('contact-signalement.html');
const legal=read('informations-legales.html');
const map=read('sitemap.xml');
const build=read('build-info.js');
const metas=read('site-meta-531.js');
assert.match(read('data.js'),/version: "5\.3\.1"/);
assert.match(build,/ECOSIM_VERSION = "5\.3\.1"/);
assert.match(main,/Version actuelle : <strong data-ecosim-version>5\.3\.1<\/strong>/);
assert.match(main,/data-ecosim-version>5\.3\.1<\/span> · paquet/);
assert.match(main,/hero-transparence-531/);
assert.match(main,/provenance-politique\.html/);
assert.match(main,/evaluations-empiriques-423\.html/);
assert.match(main,/Intégrité du moteur : contrôles 5\.1/);
assert.doesNotMatch(main,/Nouveau : intégrité et sécurité du moteur 5\.1/);
assert.match(metas,/querySelectorAll\('\[data-ecosim-version\]'\)/);
assert.match(contact,/GitHub est nécessaire/);
assert.match(contact,/unique canal de signalement/);
assert.match(contact,/projet personnel/);
assert.doesNotMatch(contact,/mailto:/i);
assert.doesNotMatch(contact,/id="email-contact"/i);
assert.match(legal,/projet personnel à vocation pédagogique/);
assert.match(legal,/88 Colin P\. Kelly Jr\. St\./);
assert.match(legal,/docs\.github\.com/);
assert.match(legal,/article 1er-1, II, de la LCEN/);
assert.match(legal,/Cette notice ne constitue pas une attestation de conformité juridique/);
assert.match(map,/methodes-comparaison-politique-530\.html<\/loc><lastmod>2026-10-11/);
assert.equal((map.match(/<lastmod>/g)||[]).length,15);
assert.doesNotMatch(map,/404\.html/);
for (const f of fs.readdirSync(dist).filter(x=>x.endsWith('.html')&&!x.startsWith('google'))) {
 const html=read(f);
 assert.match(html,/site-meta-531\.js/,f);
 for (const [_,target] of html.matchAll(/(?:href|src)="([^"#?]+)"/g)) {
   if (/^(?:https?:|mailto:|data:|\/\/)/i.test(target)) continue;
   assert.ok(fs.existsSync(path.join(dist,target)),`${f}: lien manquant ${target}`);
 }
}
for (const a of ['app.js','fiscal.js','guardrails-510.js','sectoral.js','political-profiles-530.js','energy-balance-500.js']) {
 assert.ok(fs.statSync(path.join(dist,a)).size>100,`Moteur absent : ${a}`);
}
assert.ok(fs.statSync(path.join(dist,'manifest-integrite-531.sha256')).size>2000);
console.log('FINITION 5.3.1 OK : GitHub uniquement, versions, publication pédagogique, audit, sitemap, liens et moteur présent.');
