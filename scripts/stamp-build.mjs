/* Identifiant reproductible de distribution locale, différent d'un hash de commit Git. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const h=crypto.createHash('sha256');
for (const f of ['app.js','data.js','fiscal.js','styles.css']) {
 h.update(f+'\0');h.update(fs.readFileSync(path.join(dist,f)));
}
const build=h.digest('hex').slice(0,12);
fs.writeFileSync(path.join(dist,'build-info.js'),`/* Empreinte locale du paquet, pas un commit Git. */\nwindow.ECOSIM_BUILD_ID = "${build}";\n`);
for (const file of ['index.html','audit.html']) {
 const p=path.join(dist,file);
 let s=fs.readFileSync(p,'utf8');
 s=s.replaceAll('PAQUET_A_REMPLACER',build)
   .replace(/(Paquet : <code>)[a-f0-9]{12}/gi,(_,head)=>head+build)
   .replace(/(paquet <code[^>]*>)[a-f0-9]{12}/gi,(_,head)=>head+build);
 fs.writeFileSync(p,s);
}
console.log('Identifiant du paquet:',build);
