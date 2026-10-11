import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const pred=JSON.parse(fs.readFileSync(path.join(root,'dist/validation/retraites-550-predictions-separees.json')));
const obs=JSON.parse(fs.readFileSync(path.join(root,'dist/data/retraites-2010-observations-550.json')));
if(!pred.noObservedInputs)throw Error('Prédiction non séparée');
const labels={fullTime:'Emploi temps plein',partTime:'Emploi temps partiel',unemployed:'Chômage',inactive:'Inactivité hors retraite',retired:'Retraite'};
const rows=[];
for(const sex of ['men','women'])for(const [key,label]of Object.entries(labels)){
 const predicted=pred.heldout[sex].after[key]*100,observed=obs.heldOutAfter[sex][key]*100;
 const estimatedEffect=pred.heldout[sex].effect[key]*100,observedEffect=obs.heldOutEffectPoints[sex][key];
 rows.push({sex,status:key,label,estimatedPostPct:predicted,observedPostPct:observed,
 descriptivePostGapPoints:predicted-observed,
 estimatedEffectPoints:estimatedEffect,observedEffectPoints:observedEffect,
 descriptiveEffectGapPoints:estimatedEffect-observedEffect});
}
const out={version:pred.version,predictionProtocolHash:pred.sourceProtocolHash,
 observedPublication:obs.publication,fullyComparable:false,
 note:'Les poids de cohorte, l’âge exact et les exclusions de l’Insee ne sont pas reconstitués. Ces écarts NE sont PAS des erreurs prédictives causales.',rows};
fs.writeFileSync(path.join(root,'dist/validation/retraites-550-confrontation.json'),JSON.stringify(out,null,2)+'\n');
const columns=['sex','status','estimatedPostPct','observedPostPct','descriptivePostGapPoints','estimatedEffectPoints','observedEffectPoints','descriptiveEffectGapPoints'];
fs.writeFileSync(path.join(root,'dist/validation/retraites-550-confrontation.csv'),columns.join(',')+'\n'+rows.map(r=>columns.map(c=>String(r[c])).join(',')).join('\n')+'\n');
console.log('5.5 étape B : 10 écarts descriptifs de niveaux et 10 écarts descriptifs d’effets');
