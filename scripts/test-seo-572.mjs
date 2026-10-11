/** Contrôle des données structurées : aucune date ni FAQ fictive. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const guides=['comprendre-budget-france.html','reforme-retraites.html','programmes-economiques-2027.html','reduire-deficit-public.html','dette-publique-france.html'];
for(const file of guides){
 const s=fs.readFileSync(path.join(root,file),'utf8');
 const js=s.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
 assert.ok(js,`Article JSON-LD absent : ${file}`);
 const data=JSON.parse(js[1]);
 assert.equal(data['@type'],'Article');
 assert.equal(data.mainEntityOfPage['@id'],`https://nicolasmoreau1982-beep.github.io/${file}`);
 assert.ok(s.includes(data.headline),'Titre JSON-LD absent du HTML');
 assert.ok(s.includes('rel="canonical"'));
 assert.ok(!data.datePublished && !data.dateModified,'Date non vérifiée inventée');
}
const html=fs.readFileSync(path.join(root,'glossaire.html'),'utf8');
const block=html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
assert.ok(block,'DefinedTermSet absent');
const schema=JSON.parse(block[1]);
const terms=JSON.parse(fs.readFileSync(path.join(root,'data/glossary-520.json'),'utf8'));
assert.equal(schema['@type'],'DefinedTermSet');
assert.equal(schema.hasDefinedTerm.length,Object.keys(terms).length);
for(const [key,v] of Object.entries(terms)){
 const item=schema.hasDefinedTerm.find(x=>x.url.endsWith('#'+key));
 assert.equal(item?.name,v.title);
 assert.equal(item?.description,v.definition);
 assert.ok(html.includes(`id="${key}"`));
}
console.log('SEO 5.7.2 : 5 guides Article + glossaire DefinedTermSet cohérents, aucune date ni FAQ artificielle.');
