/** Résultats déterministes EcoSim seulement. Aucun résultat OpenFisca inventé. */
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);globalThis.window=globalThis;
require(path.join(root,'dist','fiscal-individuel-570.js'));
const F=globalThis.ECOSIM_FISCAL_INDIVIDUEL_570;
const cases=[];
for(const householdType of ['single','couple'])for(const children of [0,1,2,3])for(const netTaxableIncome of [12000,17370,30000,34200,50000,100000,180000]){
 const id=`${householdType}-${children}-${netTaxableIncome}`;
 cases.push({id,...F.calculate({householdType,children,netTaxableIncome})});
}
const data={version:'5.7.1',taxYear:2026,incomeYear:2025,status:'comparaison_officielle_partielle',
 openFiscaStatus:'non_execute_dependance_indisponible',sourceUrls:F.law.sources,
 count:cases.length, note:'IR sur revenu NET imposable déclaré par utilisateur. Tests officiels ciblés ; OpenFisca non installé sur cet environnement. Foyers de démonstration non représentatifs.',cases};
fs.mkdirSync(path.join(root,'dist','validation'),{recursive:true});
fs.writeFileSync(path.join(root,'dist','validation','fiscal-individuel-570.json'),JSON.stringify(data,null,2)+'\n');
const cols=['id','householdType','children','netTaxableIncome','parts','grossUncapped','grossAfterFamilyCap','decote','afterDecote'];
fs.writeFileSync(path.join(root,'dist','validation','fiscal-individuel-570.csv'),[cols.join(','),...cases.map(c=>cols.map(k=>JSON.stringify(c[k])).join(','))].join('\n')+'\n');
console.log('Cas fiscaux 5.7 générés :',cases.length);
