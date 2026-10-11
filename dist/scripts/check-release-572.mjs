/**
 * Contrôle non mutateur de la livraison EcoSim.
 * Fonctionne dans dist/ (archive de développement) ou à la racine GitHub Pages.
 * Usage CI : node scripts/check-release-572.mjs
 * Usage test : node scripts/check-release-572.mjs --commit-subject 'Release 5.7.2'
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root,name),'utf8');
const versions = JSON.parse(read('release-status-572.json'));
for (const key of ['publicVersion','technicalVersion']) {
  assert.match(versions[key], /^\d+\.\d+\.\d+$/, `Version invalide: ${key}`);
}
assert.equal(versions.schemaVersion, versions.technicalVersion, 'Version du schéma différente de la version technique');
assert.match(versions.deliveryLabel, /^\d+\.\d+\.\d+(?:\.\d+)?$/, 'Étiquette de livraison invalide');
assert.ok(versions.deliveryLabel === versions.technicalVersion ||
  versions.deliveryLabel.startsWith(versions.technicalVersion + '.'),
  'Étiquette de livraison hors de la version technique');
const build = read('build-info.js');
const value = (key) => {
  const m = build.match(new RegExp(`^window\\.${key} = "([^"]+)";`, 'm'));
  assert.ok(m, `Champ ${key} absent de build-info.js`);
  return m[1];
};
assert.equal(value('ECOSIM_VERSION'), versions.publicVersion, 'Version publique du stamp incorrecte');
assert.equal(value('ECOSIM_TECHNICAL_VERSION'), versions.technicalVersion, 'Version technique du stamp incorrecte');
assert.match(value('ECOSIM_BUILD_ID'), /^[a-f0-9]{12}$/, 'Identifiant de paquet invalide');
const source = read('data.js');
const dataVersion = source.match(/version: "(\d+\.\d+\.\d+)"/);
assert.ok(dataVersion, 'Version source de data.js absente');
assert.equal(dataVersion[1], versions.publicVersion, 'Version des résultats fiscaux non alignée sur la version publique');
const normal = (s) => s.replace(/(paquet <code[^>]*>)[a-f0-9]{12}/gi,'$1PAQUET_A_REMPLACER')
 .replace(/(Paquet : <code>)[a-f0-9]{12}/gi,'$1PAQUET_A_REMPLACER');
function walk(base) {
  return fs.readdirSync(base,{withFileTypes:true}).flatMap(e => {
    const full=path.join(base,e.name);
    return e.isDirectory()?walk(full):[full];
  });
}
const listed=read('manifest-integrite-572.sha256').trim().split('\n').map(line=>{
 const m=line.match(/^[a-f0-9]{64}  (.+)$/);assert.ok(m, 'Format du manifeste invalide');return m[1];
});
const all=listed.filter(f=>f!=='build-info.js' && !/google[0-9a-f]+\.html$/i.test(path.basename(f))).map(f=>path.join(root,f));
for(const f of all)assert.ok(fs.existsSync(f),`Fichier du manifeste manquant : ${f}`);
const h=crypto.createHash('sha256');
for(const f of all.sort()){
 const relative=path.relative(root,f).split(path.sep).join('/');
 h.update(relative+'\0');
 if(f.endsWith('.html')) h.update(normal(fs.readFileSync(f,'utf8')));
 else if(relative==='validation/sensibilite-globale-561.json') h.update(read(relative).replace(/"buildId": (null|"[a-f0-9]{12}")/,'"buildId": "EXCLUDED_FROM_HASH"'));
 else h.update(fs.readFileSync(f));
}
assert.equal(value('ECOSIM_BUILD_ID'), h.digest('hex').slice(0,12),'Empreinte de distribution incorrecte : relancer stamp-build avant livraison');
const map=read('sitemap.xml');
assert.equal((map.match(/<loc>/g)||[]).length,28,'28 pages du sitemap attendues, vérifier manuellement');
assert.equal(versions.distributionModuleVersion,'5.8.1','Version atelier distributif non déclarée');
assert.match(read('distribution-ciblee-580.html'),/module-dist-introuvable|Atelier distributif expérimental 5\.8|Module expérimental 5\.8/, 'Module distributif 5.8 absent');
assert.ok(!map.includes('<lastmod>2026-10-12</lastmod>'),'Dernière modification future : données douteuses');
const argv=process.argv;
let subject;
if(argv.includes('--commit-subject')){
 const i=argv.indexOf('--commit-subject');subject=argv[i+1];
 assert.ok(subject,'Argument --commit-subject manquant');
}else{
 try {subject=execFileSync('git',['log','-1','--format=%s'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}
 catch {subject=null;}
}
if (subject) {
 // Accepte une étiquette de release 3 ou 4 chiffres, mais ne valide jamais
 // seulement le préfixe "5.7.2" du sujet "5.7.2.999".
 // Les commits de maintenance sans numéro explicite restent autorisés.
 const match = subject.match(/^(?:(?:release|livraison)\s+)?v?(\d+\.\d+\.\d+(?:\.\d+)?)(?=$|[\s:;—–-])/i);
 if (match) {
   assert.equal(match[1], versions.deliveryLabel,
     `Commit de livraison « ${subject} » ≠ étiquette déclarée ${versions.deliveryLabel}`);
   assert.equal(match[1].split('.').slice(0, 3).join('.'), versions.technicalVersion,
     'Commit de livraison hors de la version technique');
 }
}

console.log(`Livraison OK — publique ${versions.publicVersion} · technique ${versions.technicalVersion} · révision ${versions.deliveryLabel} · paquet ${value('ECOSIM_BUILD_ID')}${subject?' · commit '+subject:''}`);
