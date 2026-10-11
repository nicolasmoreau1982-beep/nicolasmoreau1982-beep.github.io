/** Tests des correctifs éditoriaux EcoSim 4.21.1. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const file=(f)=>fs.readFileSync(path.join(dist,f),'utf8');
const reg=JSON.parse(file('validation/provenance-politique-420.json'));
const index=file('index.html');
const prov=file('provenance-politique.html');
const econ=file('validation-economique-421.html');
const sitemap=file('sitemap.xml');
const counts=reg.counts;
assert.equal(counts.total,357); assert.equal(counts.exact,0); assert.ok(counts.related>=15); assert.equal(counts.unverified,counts.total-counts.related);
assert.match(index,new RegExp(`Provenance des ${counts.total} réglages du comparateur`));
assert.match(index,new RegExp(`${counts.related} sur ${counts.total} lié à une proposition localisée`));
assert.ok(index.includes(`aucun montant exact vérifié (${counts.exact}/${counts.total})`));
assert.ok(index.includes(`${counts.unverified} hypothèses sans preuve individuelle`));
assert.equal((prov.match(/<table>/g)||[]).length,18);
assert.equal((prov.match(/<caption>/g)||[]).length,18);
assert.ok(prov.includes('Version 4.22 · registre généré'));
assert.ok(prov.includes('EcoSim France · v4.22 · paquet'));
assert.ok(econ.includes('Les multiplicateurs de dépenses et de prélèvements'));
assert.ok(econ.includes('exclus de cette plage'));
assert.ok(econ.includes('Une plage étroite ne signifie donc pas une faible incertitude économique'));
for (const f of ['index.html','audit.html','provenance-politique.html','validation-economique-421.html','sensibilite-multiplicateurs-422.html']){
 const page=file(f);
 assert.match(page,/og:image/);
 assert.match(page,/https:\/\/nicolasmoreau1982-beep\.github\.io\/og-ecosim\.png/);
 const match=page.match(/(?:paquet <code[^>]*>|Paquet : <code>)([a-f0-9]{12})/i);
 assert.ok(match,`Paquet manquant : ${f}`);
 assert.equal(match[1],file('build-info.js').match(/[a-f0-9]{12}/)[0],`Empreinte incorrecte : ${f}`);
}
const img=fs.readFileSync(path.join(dist,'og-ecosim.png'));
assert.ok(img.length>5000 && img[0]===0x89 && img.slice(1,4).toString()==='PNG');
for(const page of ['/','/audit.html','/provenance-politique.html','/validation-economique-421.html','/sensibilite-multiplicateurs-422.html']) {
 const loc=`https://nicolasmoreau1982-beep.github.io${page}`;
 assert.ok(sitemap.includes(`<loc>${loc}</loc><lastmod>2026-10-11</lastmod>`));
}
assert.equal((sitemap.match(/<lastmod>/g)||[]).length,5);
console.log('PRÉSENTATION 4.21.1 OK : provenance, limites de sensibilité, captions, versions, métadonnées et sitemap.');
