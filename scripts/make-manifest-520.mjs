/** Empreintes de la distribution active ; ignorent les manifests pour éviter toute boucle. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(!/^manifest-integrite-\d+\.sha256$/.test(e.name))files.push(p);}}
walk(dist);
const text=files.sort().map(f=>`${crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')}  ${path.relative(dist,f).split(path.sep).join('/')}`).join('\n')+'\n';
// Ne pas écraser les manifests archivés 5.1–5.3.1 avec la distribution actuelle.
fs.writeFileSync(path.join(dist,'manifest-integrite-571.sha256'),text);
console.log(`Manifeste 5.7.1 : ${files.length} fichiers vérifiables`);
