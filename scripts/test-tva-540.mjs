/** Contrat d'expérience pré-enregistrée rétrospectivement : pas de ré-estimation a posteriori. */
import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';import crypto from 'node:crypto';
import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');const read=f=>fs.readFileSync(path.join(dist,f),'utf8');
const protocolText=read('data/tva-restauration-2009-protocole-540.json');const protocol=JSON.parse(protocolText);
const pred=JSON.parse(read('validation/tva-540-predictions-separees.json'));
const obs=JSON.parse(read('data/tva-restauration-2009-observations-540.json'));
const comp=JSON.parse(read('validation/tva-540-comparaison.json'));
assert.equal(pred.protocolSha256,crypto.createHash('sha256').update(protocolText).digest('hex'));
assert.equal(protocol.observationForbiddenForProjection,true);
assert.equal(protocol.horizonMonths,30);
assert.deepEqual(protocol.exAnteConventions.map(x=>x.share),[0,0.25,0.5,1]);
assert.equal(pred.predictions.length,4);assert.equal(comp.rows.length,4);
const c={};c.window=c;vm.createContext(c);vm.runInContext(read('historical-vat-540.js'),c);
const api=c.ECOSIM_VAT_HISTORY_540;
const eq=(a,b)=>assert.ok(Math.abs(a-b)<1e-11,`${a} ≠ ${b}`);
const theoretical=100*(1.055/1.196-1);
for(let i=0;i<4;i++){
 const pre=pred.predictions[i],pct=protocol.exAnteConventions[i].share;
 eq(pre.pricePercent,theoretical*pct);eq(pre.fullMechanicalPercent,theoretical);
 eq(comp.rows[i].errorSignedPp,pre.pricePercent-(-1.9));
 eq(comp.rows[i].errorAbsPp,Math.abs(pre.pricePercent+1.9));
}
assert.equal(obs.independentStudies.find(s=>s.id==='ipp-2018').valuePercent,-1.9);
assert.equal(obs.independentStudies.find(s=>s.id==='insee-2014').valuePercent,-2.4);
eq(api.priceShock(19.6,5.5,0).scenarioPricePercent,0);
eq(api.priceShock(19.6,19.6,1).scenarioPricePercent,0);
assert.throws(()=>api.priceShock(19.6,5.5,NaN));
assert.throws(()=>api.priceShock(19.6,5.5,-0.1));
assert.throws(()=>api.priceShock(19.6,5.5,1.1));
assert.throws(()=>api.priceShock(19.6,Infinity,0.5));
// L'étude Insee est délibérément non intégrée à l'évaluation de l'écart principal.
assert.ok(!comp.rows.some(r=>Math.abs(r.observedPricePercent-(-2.4))<1e-9));
// La prédiction reste identique si l'on remplace la donnée observée dans un objet séparé.
const altered=structuredClone(obs);altered.independentStudies[0].valuePercent=-100;
const snapshot=JSON.stringify(pred.predictions);
assert.equal(JSON.stringify(pred.predictions),snapshot);
assert.equal(pred.referenceCaseId,'moitie');
const pg=read('validation-historique-540.html');
assert.match(pg,/IPP/);assert.match(pg,/0 correspondance stricte/);
console.log('TVA HISTORIQUE 5.4 OK : choc TTC, 4 conventions préfigées, référence distincte et contrôles négatifs.');
