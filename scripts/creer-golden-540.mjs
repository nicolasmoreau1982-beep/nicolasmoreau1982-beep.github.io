/** EXECUTION EXCEPTIONNELLE AVANT CHANGEMENT : figer les valeurs de la 5.3.1.
 * Ne JAMAIS inclure dans la suite de tests ni régénérer automatiquement la fixture.
 * Permet uniquement le bootstrap initial vérifiable depuis le zip original 5.3.1.
 */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {makeHarness} from './core-harness-540.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dist=path.join(root,'dist');
if(!process.argv.includes('--initial-freeze-531'))throw Error('Gel 5.3.1 réservé au bootstrap vérifié : --initial-freeze-531');
const h=makeHarness(dist);if(h.D.metadata.version!=='5.3.1')throw Error('La source de référence doit être EXACTEMENT 5.3.1');
const cases=[
 {id:'aucune-reforme',name:'Sans réforme (consensus)',changes:{}},
 {id:'tva-10',name:'Recettes TVA +10 Md€/an',changes:{R_TVA:10}},
 {id:'education-10',name:'Éducation primaire +10 Md€/an',changes:{GF0901:10}},
 {id:'retraite-10',name:'Pensions -10 Md€/an',changes:{GF1002:-10}},
 {id:'panier-fiscal',name:'Mix de dépenses et recettes',changes:{R_IR:5,R_TVA:-3,GF0103:4,GF1002:-2}},
 {id:'contexte-industrie',name:'Hypothèses de transmission industrielle',model:'industrial',changes:{GF0405:6,R_IS:-2}}
];
function digest(name){return crypto.createHash('sha256').update(fs.readFileSync(path.join(dist,name))).digest('hex');}
const fields=['year','gdp','debt','deficit','debtRatio','deficitRatio','unemployment','inflation','growth','outputGap','directBalanceCost'];
const results=[];
for(const sc of cases){
 h.reset();h.state.model=sc.model??'consensus';h.state.changes={...sc.changes};
 const v=h.calculateProjection();
 results.push({id:sc.id,name:sc.name,model:h.state.model,changes:sc.changes,
   rows:v.scenario.map(r=>Object.fromEntries(fields.map(k=>[k,r[k]]))) });
}
const archive={
 sourceVersion:'5.3.1',sourcePackage:'40219bdd801f',referencePublishedOn:'2026-10-11',
 sourceFilesSha256:{'app.js':digest('app.js'),'data.js':digest('data.js'),'guardrails-510.js':digest('guardrails-510.js')},
 fields,projectionYears:30,modelInputs:'Scénarios décrits individuellement ; tout autre réglage au défaut du moteur 5.3.1.',
 purpose:'Fixture de non-régression : elle ne mesure aucune validité causale ou prévisionnelle.',cases:results
};
const file=path.join(root,'fixtures','golden-531-for-540.json');
fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(archive,null,2)+'\n');
console.log('Golden 5.3.1 figé :',results.length,'scénarios,',results.length*30,'lignes,',fields.length,'champs ; sha :',archive.sourceFilesSha256['app.js']);
