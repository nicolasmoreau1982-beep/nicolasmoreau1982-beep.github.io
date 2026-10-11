/** Inventaire en octets des principaux fichiers livrés ; PAS de score PageSpeed ou Lighthouse. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
let total=0;let count=0;
for(const name of ['index.html','styles.css','app.js','data.js','historical-audit-data.js','fiscal.js','sectoral.js','guardrails-510.js','glossary-520.js','glossaire.html']){
 const bytes=fs.statSync(path.join(dist,name)).size;count++;total+=bytes;
 console.log(`${(bytes/1024).toFixed(1).padStart(7)} KiB  ${name}`);
}
console.log(`TOTAL (${count} fichiers listés) : ${(total/1024).toFixed(1)} KiB non compressés ; ni poids transféré ni mesure du rendu mobile.`);
