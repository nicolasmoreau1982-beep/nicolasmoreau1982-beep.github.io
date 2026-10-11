/** Inspection des fichiers de distribution pour quelques formats de secrets connus.
 * Ce contrôle NE parcourt PAS l'historique Git (absent de l'archive).
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const files=[];
function scan(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true})){
 const full=path.join(dir,f.name);
 if(f.isDirectory()) scan(full);
 else if(/\.(?:js|json|html|css|xml|txt|md)$/i.test(f.name)) files.push(full);
}}
scan(dist);
const patterns = [
 ['Clé privée PEM',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
 ['Jeton personnel GitHub',/\b(?:ghp_|github_pat_)[a-zA-Z0-9_]{16,}/],
 ['Identifiant AWS access key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
 ['Jeton Slack',/\bxox[baprs]-[A-Za-z0-9-]{22,}/],
 ['Jeton Stripe secret',/\bsk_live_[A-Za-z0-9]{16,}/],
];
let detected=0;
for(const f of files){const text=fs.readFileSync(f,'utf8');for(const [title,re] of patterns){if(re.test(text)){console.error(`Secret potentiel : ${title} dans ${path.relative(dist,f)}`);detected++;}}}
for(const f of fs.readdirSync(dist)) if(/^\.env(?:\.|$)/.test(f)) {console.error(`Fichier d'environnement publié : ${f}`); detected++;}
if(detected)process.exit(1);
console.log(`SCAN LOCAL 5.2 OK : ${files.length} fichiers de distribution inspectés ; historique Git non disponible`);
