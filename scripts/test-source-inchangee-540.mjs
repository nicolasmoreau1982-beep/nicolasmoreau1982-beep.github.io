/* Protection par SHA-256 du coeur de la distribution 5.3.1 archivée. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const frozen=JSON.parse(fs.readFileSync(path.join(root,'fixtures/source-hashes-531.json')));
assert.equal(frozen.frozenVersion,'5.3.1');
function sha(x){return crypto.createHash('sha256').update(x).digest('hex');}
for(const [f,expected] of Object.entries(frozen.files)){
 let content=fs.readFileSync(path.join(root,'dist',f),'utf8');
 if(f==='data.js'){
  assert.ok(content.includes('version: "5.4.0"'));
  content=content.replace('version: "5.4.0"','version: "5.3.1"');
 }
 assert.equal(sha(content),expected,`${f}: code de référence 5.3.1 modifié`);
}
console.log('SOURCE 5.4 OK :',Object.keys(frozen.files).length,'modules historiques inchangés (hormis étiquette version dans data.js).');
