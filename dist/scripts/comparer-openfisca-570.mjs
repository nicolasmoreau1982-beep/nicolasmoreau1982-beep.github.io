/** Import OFFLINE d'observations OpenFisca préalablement calculées dans un environnement tiers.
 * Ne fabrique jamais de résultats OpenFisca. Vérifie correspondances et types.
 * Usage: node scripts/comparer-openfisca-570.mjs sortie-openfisca.json [rapport-differences.json]
 */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function compare(payload, eco){
 if(!payload||payload.source!=='openfisca-france'||!/^\d/.test(payload.packageVersion||'')||payload.period!=='2025'||!Array.isArray(payload.cases))throw new Error('Source OpenFisca, version et période obligatoires');
 const indexed=new Map(eco.cases.map(x=>[x.id,x]));const seen=new Set();const rows=[];
 for(const item of payload.cases){
  if(typeof item.id!=='string'||!indexed.has(item.id)||seen.has(item.id))throw new Error('ID OpenFisca inconnu ou répété');
  seen.add(item.id);const original=indexed.get(item.id);
  if(typeof item.netTaxableIncome!=='number'||!Number.isFinite(item.netTaxableIncome)||Math.abs(item.netTaxableIncome-original.netTaxableIncome)>.01||
   item.householdType!==original.householdType||item.children!==original.children)throw new Error(`Périmètre non aligné : ${item.id}`);
  if(!Number.isFinite(item.grossAfterFamilyCap)||!Number.isFinite(item.afterDecote))throw new Error('Montant OpenFisca non fini');
  rows.push({id:item.id,ecoGross:original.grossAfterFamilyCap,openFiscaGross:item.grossAfterFamilyCap,
   deltaGross:original.grossAfterFamilyCap-item.grossAfterFamilyCap,
   ecoAfterDecote:original.afterDecote,openFiscaAfterDecote:item.afterDecote,deltaAfterDecote:original.afterDecote-item.afterDecote});
 }
 return {source:'openfisca-france',packageVersion:payload.packageVersion,period:payload.period,count:rows.length,
    scope:'Confrontation de chiffres importés et alignés déclarativement ; les conventions de calcul sont à vérifier dans OpenFisca.',rows};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const source=process.argv[2];if(!source){console.error('OpenFisca non exécuté ici. Fournir un JSON OpenFisca externe validé et versionné.');process.exitCode=2;}
 else{const eco=JSON.parse(fs.readFileSync(path.join(root,'validation','fiscal-individuel-570.json')));
  const report=compare(JSON.parse(fs.readFileSync(source,'utf8')),eco);
  const dest=process.argv[3]||path.join(root,'comparaison-openfisca-570.json');fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n');
  console.log('Confrontation externe :',report.count,'cas. Rapport',dest);
 }
}
