/** Étape A : scénarios mécaniques. INTERDICTION d'ouvrir le fichier d'observations. */
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const protocolBytes=fs.readFileSync(path.join(dist,'data/tva-restauration-2009-protocole-540.json'));
const protocol=JSON.parse(protocolBytes);const ctx={};ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dist,'historical-vat-540.js'),'utf8'),ctx);
if(protocol.observationForbiddenForProjection!==true)throw Error('Séparation prédictions/observations manquante');
const predictions=protocol.exAnteConventions.map(c=>{
 const p=ctx.ECOSIM_VAT_HISTORY_540.priceShock(protocol.policy.oldVatRatePercent,protocol.policy.newVatRatePercent,c.share);
 return {id:c.id,label:c.label,passThrough:c.share,pricePercent:p.scenarioPricePercent,fullMechanicalPercent:p.mechanicalPercent};
});
const output={version:'5.4.0',experimentId:protocol.id,horizonMonths:protocol.horizonMonths,
 protocolSha256:crypto.createHash('sha256').update(protocolBytes).digest('hex'),
 chosenBeforeObservationFileRead:true,referenceCaseId:protocol.referenceCaseId,
 predictions,scopeNote:protocol.identificationLimit};
fs.writeFileSync(path.join(dist,'validation/tva-540-predictions-separees.json'),JSON.stringify(output,null,2)+'\n');
console.log('Étape A TVA 5.4 :',predictions.length,'scénarios figés SANS lire les observations');
