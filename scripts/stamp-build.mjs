/* Identifiant SHA-256 stable de la distribution 5.3. Pas un commit Git. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
function walk(base){const out=[];for(const entry of fs.readdirSync(base,{withFileTypes:true})){
 const name=path.join(base,entry.name);if(entry.isDirectory())out.push(...walk(name));else out.push(name);
}return out;}
const all=walk(dist).filter(p=> !/^manifest-integrite-\d+\.sha256$/.test(path.basename(p)) && path.basename(p)!=='build-info.js' && !/google[0-9a-f]+\.html$/i.test(path.basename(p)));
const normal=(s)=>s.replace(/(paquet <code[^>]*>)[a-f0-9]{12}/gi,'$1PAQUET_A_REMPLACER')
 .replace(/(Paquet : <code>)[a-f0-9]{12}/gi,'$1PAQUET_A_REMPLACER');
const h=crypto.createHash('sha256');
for(const f of all.sort()){
 const relative=path.relative(dist,f).split(path.sep).join('/');
 h.update(relative+'\0');
 if(f.endsWith('.html'))h.update(normal(fs.readFileSync(f,'utf8')));
 else h.update(fs.readFileSync(f));
}
const id=h.digest('hex').slice(0,12);
fs.writeFileSync(path.join(dist,'build-info.js'),`/* Empreinte locale du paquet, pas un commit Git. */\nwindow.ECOSIM_BUILD_ID = "${id}";\nwindow.ECOSIM_VERSION = "5.4.0";\n`);
for(const f of all.filter(f=>f.endsWith('.html'))){
 let s=fs.readFileSync(f,'utf8');
 s=s.replace(/(paquet <code[^>]*>)[a-f0-9]{12}/gi,(_m,p)=>p+id)
 .replace(/(Paquet : <code>)[a-f0-9]{12}/gi,(_m,p)=>p+id)
 .replaceAll('PAQUET_A_REMPLACER',id);
 fs.writeFileSync(f,s);
}
console.log('Version 5.4.0 — identifiant de paquet :',id);
