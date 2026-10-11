/** Étape B : confronter les prédictions FIGÉES aux observations, sans retoucher les premières. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const protocol=JSON.parse(fs.readFileSync(path.join(dist,'data/tva-restauration-2009-protocole-540.json')));
const projections=JSON.parse(fs.readFileSync(path.join(dist,'validation/tva-540-predictions-separees.json')));
const observations=JSON.parse(fs.readFileSync(path.join(dist,'data/tva-restauration-2009-observations-540.json')));
assert.equal(projections.experimentId,observations.id);
assert.equal(projections.predictions.length,protocol.exAnteConventions.length);
const primary=observations.independentStudies.find(s=>s.id==='ipp-2018');
assert.equal(primary.horizonMonths,projections.horizonMonths);
const rows=projections.predictions.map(p=>({...p,observedPricePercent:primary.valuePercent,
  errorSignedPp:p.pricePercent-primary.valuePercent,
  errorAbsPp:Math.abs(p.pricePercent-primary.valuePercent)}));
const result={version:'5.4.0',method:'Confrontation descriptive de prix TTC, pas un backtest causal du moteur macro',
  stageASeparated:true,protocol,observations,rows,
  conclusion:'Une hypothèse de répercussion NON estimée ne permet ni d’expliquer le comportement ni de prédire la réforme. L’écart n’est qu’un contrôle d’ordre de grandeur sur un mécanisme partiellement comparable.',
  prohibit:['Ajuster après-coup le taux de pass-through au -1,9 %','Proclamer que le modèle macro a validé la réforme','Déduire rendement TVA, PIB ou emploi à partir de ces seuls prix']};
fs.writeFileSync(path.join(dist,'validation/tva-540-comparaison.json'),JSON.stringify(result,null,2)+'\n');
const f=['id','label','passThrough','pricePercent','observedPricePercent','errorSignedPp','errorAbsPp'];
const csv=s=>'"'+String(s??'').replaceAll('"','""')+'"';
fs.writeFileSync(path.join(dist,'validation/tva-540-comparaison.csv'),f.join(';')+'\n'+rows.map(r=>f.map(k=>csv(r[k])).join(';')).join('\n')+'\n');
console.log('Étape B TVA 5.4 :',rows.length,'confrontations, référence IPP',primary.valuePercent,'% (horizon',primary.horizonMonths,'mois)');
for(const r of rows)console.log(r.label,':',r.pricePercent.toFixed(3)+'%', 'écart signé',r.errorSignedPp.toFixed(3),'point(s)');
