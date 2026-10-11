/** Corrections de l'audit « yeux neufs » : non régression des interfaces. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const release=JSON.parse(read('release-status-572.json'));
assert.equal(release.interfaceUXVersion,'5.8.5');
assert.equal(release.deliveryLabel,'5.7.2.11');
const home=read('index.html'), contact=read('contact-signalement.html'), audit=read('audit.html');
assert.match(home,/Confrontation historique : TVA restauration 2009/);
assert.match(home,/OpenFisca : protocole de comparaison externe \(non encore exécuté\)/);
assert.doesNotMatch(home,/Confrontation historique 5\.4/);
assert.doesNotMatch(audit,/Nouveau 5\.4/);
assert.match(home,/contact-signalement\.html#suivre/);
assert.match(contact,/id="suivre"/);
assert.match(contact,/commits\/main\.atom/);
assert.match(contact,/unique canal de signalement/);
assert.doesNotMatch(contact,/mailto:/i);
for(const name of ['fiscal-individuel-570.html','distribution-ciblee-580.html']){
 const html=read(name);
 assert.match(html,/href="tables-mobile-585\.css"/);
 assert.match(html,/class="[^"\n]*accessible-table-scroll" role="region"[^>]*tabindex="0"/);
 assert.match(html,/class="table-scroll-help"/);
}
assert.match(read('tables-mobile-585.css'),/focus-visible/);
const sitemap=read('sitemap.xml');
const unknown=['confidentialite.html','comprendre-budget-france.html','reforme-retraites.html','programmes-economiques-2027.html','reduire-deficit-public.html','dette-publique-france.html'];
for(const file of unknown){
 const entry=sitemap.match(new RegExp('<url><loc>https://nicolasmoreau1982-beep.github.io/'+file.replaceAll('.','\\.')+'<\\/loc>(.*?)<\\/url>'));
 assert.ok(entry,`${file} absent du sitemap`);
 const attendu = file==='confidentialite.html'?'2026-10-10':'2026-10-11';
 assert.match(entry[1],new RegExp('<lastmod>'+attendu+'<\/lastmod>'),`${file} : date de mise à jour non conforme à la preuve documentée`);
 if (file==='confidentialite.html') assert.match(read(file),/Mise à jour\s*:\s*10 octobre 2026/,'Date absente de la notice confidentialité');
 else assert.match(read(file),/type="application\/ld\+json"/,'Ajout de données structurées du 11 octobre non conservé');
}
for(const file of ['comprendre-budget-france.html','reforme-retraites.html','programmes-economiques-2027.html','reduire-deficit-public.html','dette-publique-france.html','glossaire.html'])
 assert.match(read(file),/type="application\/ld\+json"/,'Données structurées déjà publiées à conserver');
console.log('UX 5.8.5 : titres citoyens, flux public, droits de contact, tables clavier, SEO avec dates justifiées OK.');
