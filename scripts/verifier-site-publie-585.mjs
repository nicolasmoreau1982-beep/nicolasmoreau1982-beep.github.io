/**
 * Diagnostic ponctuel APRES le déploiement GitHub Pages.
 * Ne modifie rien et n'est PAS exécuté pendant le build/CI local.
 * Node >= 22 : node scripts/verifier-site-publie-585.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const local=path.join(root,'dist');
const site='https://nicolasmoreau1982-beep.github.io';
const raw='https://raw.githubusercontent.com/nicolasmoreau1982-beep/nicolasmoreau1982-beep.github.io/main';
const manifest=JSON.parse(fs.readFileSync(path.join(local,'release-status-572.json'),'utf8'));
const idFrom=txt=>txt.match(/window\.ECOSIM_BUILD_ID\s*=\s*"([a-f0-9]{12})"/)?.[1];
const expected=idFrom(fs.readFileSync(path.join(local,'build-info.js'),'utf8'));
if(!expected)throw new Error('Empreinte locale absente');
async function retrieve(base,rel){
 const url=`${base}/${rel}?verif=${Date.now()}`;
 const r=await fetch(url,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
 if(!r.ok)throw new Error(`HTTP ${r.status} : ${url}`);
 return r.text();
}
async function compare(label,base){
 const [stamp,status]=await Promise.all([retrieve(base,'build-info.js'),retrieve(base,'release-status-572.json')]);
 const id=idFrom(stamp),rel=JSON.parse(status);
 console.log(`${label} : paquet=${id??'introuvable'} · livraison=${rel.deliveryLabel}`);
 if(id!==expected||rel.deliveryLabel!==manifest.deliveryLabel)
  throw new Error(`${label} divergent : attendu paquet=${expected}, livraison=${manifest.deliveryLabel}`);
}
let failures=0;
console.log(`Archive locale : paquet=${expected} · livraison=${manifest.deliveryLabel}`);
try{await compare('GitHub Pages',site);}catch(e){failures++;console.error('GitHub Pages :',e.message);}
let repoFound=false;
for(const prefix of ['dist/','']){
 try{
  await compare(`GitHub main/${prefix||'(racine)'}`,raw+(prefix?'/'+prefix.slice(0,-1):''));
  repoFound=true;break;
 }catch(e){
  console.log(`Dépot main/${prefix||'(racine)'} : ${e.message}`);
 }
}
if(!repoFound){failures++;console.error('Impossible de confirmer la version de la branche main.');}
if(failures){
 console.error('DIVERGENCE ou accès distant impossible : contrôler déploiement, branche, chemin et éventuelle propagation/cache.');
 process.exitCode=1;
}else console.log('OK : archive, dépôt main et site public annoncent le même paquet et la même livraison.');
