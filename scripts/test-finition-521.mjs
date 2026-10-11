/** EcoSim 5.2.1 : pages éditoriales, 404, liens, et stratégie d'accessibilité. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const read=(f)=>fs.readFileSync(path.join(dist,f),'utf8');
const pages=['404.html','contact-signalement.html','informations-legales.html'];
for(const f of pages){
 const s=read(f);
 assert.match(s,/<html lang="fr"/);
 assert.match(s,/<h1>[^<]+<\/h1>/);
 assert.match(s,/<a class="skip-link" href="#main">/);
 assert.match(s,/<main id="main"/);
 assert.match(s,/<title>[^<]+ \| EcoSim France<\/title>/);
 assert.match(s,/href="index.html"/);
 for(const [,href] of s.matchAll(/(?:href|src)="([^"#?]+)"/g)) {
  if(/^https?:|^mailto:|^data:|^\/\//.test(href))continue;
  assert.ok(fs.existsSync(path.join(dist,href)),`${f} : lien manquant : ${href}`);
 }
}
assert.match(read('404.html'),/<meta name="robots" content="noindex,follow"/);
assert.match(read('contact-signalement.html'),/github\.com\/nicolasmoreau1982-beep\/nicolasmoreau1982-beep\.github\.io\/issues\/new/);
assert.match(read('contact-signalement.html'),/Un compte GitHub est nécessaire/);
assert.match(read('informations-legales.html'),/responsable publiquement identifié/i);
assert.match(read('informations-legales.html'),/non renseigné/i);
assert.match(read('a-propos.html'),/assistance d’outils d’intelligence artificielle/);
assert.match(read('index.html'),/<title>[^<]+ \| EcoSim France<\/title>/);
assert.match(read('index.html'),/Version 5\.3/);
assert.match(read('data.js'),/version: "5\.3\.0"/);
const sm=read('sitemap.xml');
for(const p of ['informations-legales.html','contact-signalement.html'])assert.ok(sm.includes(p),p);
assert.ok(!sm.includes('/404.html'));
assert.ok(sm.includes('/glossaire.html'));
const htmlPages=fs.readdirSync(dist).filter(x=>x.endsWith('.html')&&!x.startsWith('google'));
for(const f of htmlPages){
 const text=read(f);
 assert.match(text,/<title>[^<]+\| EcoSim France<\/title>/, `Marque : ${f}`);
 assert.ok(text.includes('contact-signalement.html'),`Lien de contact absent : ${f}`);
 assert.ok(text.includes('informations-legales.html'),`Lien légal absent : ${f}`);
}
console.log(`FINITIONS 5.2.1 OK : ${htmlPages.length} pages contrôlées, 404, signalement, informations éditoriales, marque et sitemap.`);
