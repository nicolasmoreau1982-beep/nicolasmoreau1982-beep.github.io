/** Manifestes techniques : ne réécrit jamais les manifestes historiques. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
function walk(base){return fs.readdirSync(base,{withFileTypes:true}).flatMap(e=>{
 const f=path.join(base,e.name);
 return e.isDirectory()?walk(f):(/^manifest-integrite-\d+\.sha256$/.test(e.name)?[]:[f]);
});}
const lines=walk(dist).sort().map(f=>`${crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')}  ${path.relative(dist,f).split(path.sep).join('/')}`);
fs.writeFileSync(path.join(dist,'manifest-integrite-572.sha256'),lines.join('\n')+'\n');
console.log(`Manifeste 5.7.2 : ${lines.length} fichiers`);
