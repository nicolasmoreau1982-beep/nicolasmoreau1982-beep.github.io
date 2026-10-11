/** Tests du prototype local (aucune écoute réseau en production). */
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {makeHarness} from '../scripts/core-harness-540.mjs';
import {createService,ApiFault} from './core.mjs';
import {createLocalServer} from './server.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const api=createService(root),h=makeHarness(path.join(root,'dist'));
const scenario={name:'Interopérabilité test',model:'consensus',engines:{minimumWage:10},fiscal:{irLowRate:11},changes:{R_IR:2},structural:{fertility:1.56},sectoral:[]};
const body={schemaVersion:'1.0',horizon:4,scenario};
assert.equal(api.openapi.openapi,'3.1.0');
for(const field of ['changes','structural','engines','fiscal','sectoral','policyStartQuarter','policyStartQuarters','monetary','confidence','model','euMode'])assert.ok(api.scenarioSchema.properties[field],`Contrat incomplet : ${field}`);
for(const group of ['engines','structural','fiscal'])assert.equal(Object.keys(api.scenarioSchema.properties[group].properties).length,Object.keys((group==='fiscal'?h.F.controls:group==='structural'?h.D.structural.controls:h.D.policyEngines.controls)).length);
const r=api.simulate(body);
assert.equal(r.status,'completed');assert.equal(r.results.scenario.length,4);
assert.equal(r.selectedYear,h.D.metadata.projectionStart+3);
assert.equal(h.applySerialized(scenario),true);const direct=h.calculateProjection();
assert.deepEqual(r.results.scenario,JSON.parse(JSON.stringify(direct.scenario.slice(0,4))));
assert.deepEqual(r.results.baseline,JSON.parse(JSON.stringify(direct.baseline.slice(0,4))));
const again=api.simulate(body);assert.deepEqual(r,again,'Même scénario = même réponse reproductible');
const different=api.simulate({schemaVersion:'1.0',scenario:{model:'consensus',changes:{R_IR:3}}});assert.notEqual(different.results.scenario[0].deficit,r.results.scenario[0].deficit);
const after=api.simulate(body);assert.deepEqual(r,after,'Aucune fuite entre requêtes');
const raw={metadata:{version:h.D.metadata.version},scenario:h.serializableState(),projection:[]};
const imported=api.simulate(raw);assert.equal(imported.status,'completed');
for(const [v,code] of [[{schemaVersion:'2.0',scenario},'UNSUPPORTED_SCHEMA'],[{schemaVersion:'1.0',scenario:{changes:{XXX:1}}},'UNKNOWN_PARAMETER'],[{schemaVersion:'1.0',scenario:{engines:{minimumWage:99}}},'INVALID_SCENARIO'],[{schemaVersion:'1.0',scenario:{engines:{minimumWage:null}}},'INVALID_FIELD'],[{schemaVersion:'1.0',scenario,horizon:31},'INVALID_HORIZON']]){
 assert.throws(()=>api.simulate(v), e=>e instanceof ApiFault && e.code===code,code);
}
const samples=path.join(root,'dist','examples');let n=0;
if(fs.existsSync(samples))for(const file of fs.readdirSync(samples).filter(f=>f.endsWith('.json')).slice(0,20)){
 const input=JSON.parse(fs.readFileSync(path.join(samples,file),'utf8'));
 assert.equal(api.simulate(input).status,'completed',file);n++;
}
const server=createLocalServer(root);
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try {
 const base=`http://127.0.0.1:${server.address().port}`;
 const meta=await fetch(base+'/v1/metadata');assert.equal(meta.status,200);
 const publicDoc=await fetch(base+'/openapi.json');assert.equal((await publicDoc.json()).openapi,'3.1.0');
 const ok=await fetch(base+'/v1/simulations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});assert.equal(ok.status,200);
 assert.equal((await ok.json()).results.scenario.length,4);
 const bad=await fetch(base+'/v1/simulations',{method:'POST',headers:{'content-type':'application/json'},body:'{bad'});
 assert.equal(bad.status,400);assert.equal((await bad.json()).error.code,'INVALID_JSON');
 const invalid=await fetch(base+'/v1/simulations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({schemaVersion:'1.0',scenario:{engines:{minimumWage:90}}})});assert.equal(invalid.status,422);
}finally{server.close();}
console.log(`API 5.9 EXPÉRIMENTALE : OK, même moteur, import IHM compatible, ${n} exemple(s), HTTP local, aucun déploiement.`);
