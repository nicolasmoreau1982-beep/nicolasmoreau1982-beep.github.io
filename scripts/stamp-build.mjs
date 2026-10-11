/* Identifiant reproductible de distribution locale, différent d'un hash de commit Git. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const h=crypto.createHash('sha256');
for (const f of ['app.js','data.js','fiscal.js','sectoral.js','guardrails-510.js','sectoral-observations.js','quality-500.js','energy-balance-500.js','data/energy-reference-2024.json','data/sectoral-observations-2023.json','styles.css']) {
 h.update(f+'\0');h.update(fs.readFileSync(path.join(dist,f)));
}
// Inclure les pages éditoriales et l'aperçu de partage, sans boucler sur l'empreinte déjà imprimée.
for (const f of ['index.html','audit.html','provenance-politique.html','validation-economique-421.html','sensibilite-multiplicateurs-422.html','evaluations-empiriques-423.html','fiscalite-sectorielle-424.html','donnees-sectorielles-425.html','qualite-et-energie-500.html','integrite-moteur-510.html']) {
 let source=fs.readFileSync(path.join(dist,f),'utf8');
 source=source.replace(/(paquet <code[^>]*>)[a-f0-9]{12}/gi,'$1PAQUET_A_REMPLACER')
   .replace(/(Paquet : <code>)[a-f0-9]{12}/gi,'$1PAQUET_A_REMPLACER');
 h.update(f+'\0');h.update(source);
}
h.update('og-ecosim.png\0');h.update(fs.readFileSync(path.join(dist,'og-ecosim.png')));
const build=h.digest('hex').slice(0,12);
fs.writeFileSync(path.join(dist,'build-info.js'),`/* Empreinte locale du paquet, pas un commit Git. */\nwindow.ECOSIM_BUILD_ID = "${build}";\n`);
for (const file of ['index.html','audit.html','provenance-politique.html','validation-economique-421.html','sensibilite-multiplicateurs-422.html','evaluations-empiriques-423.html','fiscalite-sectorielle-424.html','donnees-sectorielles-425.html','qualite-et-energie-500.html','integrite-moteur-510.html']) {
 const p=path.join(dist,file);
 let s=fs.readFileSync(p,'utf8');
 s=s.replaceAll('PAQUET_A_REMPLACER',build)
   .replace(/(Paquet : <code>)[a-f0-9]{12}/gi,(_,head)=>head+build)
   .replace(/(paquet <code[^>]*>)[a-f0-9]{12}/gi,(_,head)=>head+build);
 fs.writeFileSync(p,s);
}
console.log('Identifiant du paquet:',build);
