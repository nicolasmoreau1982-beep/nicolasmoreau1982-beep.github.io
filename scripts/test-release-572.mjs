/** Régressions de livraison — version publique ≠ version technique intentionnellement. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const prog=path.join(dist,'scripts/check-release-572.mjs');
function run(subject){return spawnSync(process.execPath,[prog,'--commit-subject',subject],{encoding:'utf8',cwd:root});}
assert.equal(run('5.7.2').status,0,run('5.7.2').stderr);
assert.equal(run('Release v5.7.2').status,0);
assert.equal(run('Corriger les textes').status,0,'Commit de maintenance non bloquant');
assert.notEqual(run('5.7.3').status,0,'Commit de livraison différent rejeté');
const build=path.join(dist,'build-info.js');const orig=fs.readFileSync(build,'utf8');
try{
 fs.writeFileSync(build,orig.replace('ECOSIM_VERSION = "5.7.1"','ECOSIM_VERSION = "5.7.2"'));
 assert.notEqual(run('5.7.2').status,0,'Version publique incorrecte rejetée');
}finally{fs.writeFileSync(build,orig);}
try{
 fs.writeFileSync(build,orig.replace(/ECOSIM_BUILD_ID = "[a-f0-9]{12}"/,'ECOSIM_BUILD_ID = "aaaaaaaaaaaa"'));
 assert.notEqual(run('5.7.2').status,0,'Empreinte incorrecte rejetée');
}finally{fs.writeFileSync(build,orig);}
const map=fs.readFileSync(path.join(dist,'sitemap.xml'),'utf8');
const urls=[...map.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/url>/g)];
assert.equal(urls.length,27,'27 URL attendues dans le sitemap');
for (const [,url,lastmod] of urls){
 assert.ok(url.startsWith('https://nicolasmoreau1982-beep.github.io/'),`Site inattendu ${url}`);
 if(lastmod)assert.match(lastmod,/^\d{4}-\d\d-\d\d$/,'Format de date sitemap');
}
assert.equal(urls.filter(x=>!x[2]).length,6,'6 pages sans date de modification significative vérifiée');
const deploy=fs.readFileSync(path.join(dist,'.github/workflows/static.yml'),'utf8');
assert.ok(deploy.indexOf('node scripts/check-release-572.mjs')<deploy.indexOf('actions/upload-pages-artifact@v3'),'Le contrôle doit précéder l’upload Pages');
assert.ok(deploy.indexOf('sha256sum -c manifest-integrite-572.sha256')<deploy.indexOf('actions/upload-pages-artifact@v3'),'Le manifeste doit être validé avant publication');
console.log('LIVRAISON 5.7.2 : versions distinctes, commit de release incohérent bloqué, fausse empreinte rejetée, sitemap cohérent.');
