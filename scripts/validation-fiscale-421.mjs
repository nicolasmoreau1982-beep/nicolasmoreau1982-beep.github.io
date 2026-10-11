/** Cas fiscaux publics : comparaison ciblée des BARÈMES SIMPLIFIÉS, sans OpenFisca ni microdonnées. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const require=createRequire(import.meta.url);
globalThis.window=globalThis;
require(path.join(dist,'fiscal.js'));
const F=globalThis.ECOSIM_FISCAL;
const law=F.policyRules(F.defaults);
const sources={
 ir:'https://bofip.impots.gouv.fr/bofip/2491-PGP.html/identifiant=BOI-IR-LIQ-20-10-20260407',
 ifi:'https://bofip.impots.gouv.fr/bofip/11319-PGP.html/identifiant=BOI-PAT-IFI-40-10-20180608',
 succession:'https://www.service-public.gouv.fr/particuliers/vosdroits/F14198'
};
// Les valeurs attendues sont des cas indépendants, figés à partir des barèmes officiels.
// IMPORTANT : IR = impôt BRUT avant plafonnement du QF, décote et réductions.
const fixtures=[
 {id:'ir-11600',label:'IR brut · célibataire, 11 600 € imposables',tax:'IR brut',input:{netTaxableIncome:11600,parts:1},expected:0,source:sources.ir},
 {id:'ir-30000',label:'IR brut · célibataire, 30 000 € imposables',tax:'IR brut',input:{netTaxableIncome:30000,parts:1},expected:2103.99,source:sources.ir},
 {id:'ir-32000',label:'IR brut · célibataire, 32 000 € imposables',tax:'IR brut',input:{netTaxableIncome:32000,parts:1},expected:2703.99,source:sources.ir},
 {id:'ir-couple-84000',label:'IR brut · 84 000 € imposables, 2 parts',tax:'IR brut',input:{netTaxableIncome:84000,parts:2},expected:11407.98,source:sources.ir},
 {id:'ifi-seuil',label:'IFI · patrimoine immobilier taxable 1 300 000 €',tax:'IFI',input:{realEstateWealth:1300000},expected:0,source:sources.ifi},
 {id:'ifi-bo-fip-1374000',label:'IFI · exemple officiel à 1 374 000 € après décote',tax:'IFI',input:{realEstateWealth:1374000},expected:2693,source:sources.ifi},
 {id:'ifi-1500000',label:'IFI · patrimoine immobilier taxable 1 500 000 €',tax:'IFI',input:{realEstateWealth:1500000},expected:3900,source:sources.ifi},
 {id:'succession-100000',label:'Succession · héritier direct, part reçue de 100 000 €',tax:'Succession',input:{inheritanceShare:100000},expected:0,source:sources.succession},
 {id:'succession-150000',label:'Succession · héritier direct, part reçue de 150 000 €',tax:'Succession',input:{inheritanceShare:150000},expected:8194.35,source:sources.succession}
];
const results=fixtures.map(c=>{
 const result=c.tax==='IR brut'?F.incomeTax(c.input.netTaxableIncome,c.input.parts,law):
   c.tax==='IFI'?F.realEstateWealthTax(c.input.realEstateWealth,law):F.inheritanceTax(c.input.inheritanceShare,law);
 const delta=result-c.expected;
 assert.ok(Math.abs(delta)<0.011,`${c.id} : attendu ${c.expected}, obtenu ${result}`);
 return {...c,actual:result,delta,status:'conforme sur ce cas'};
});
assert.deepEqual(law.incomeTax.brackets.slice(0,4).map(x=>x.upper),[11600,29579,84577,181917]);
assert.equal(law.realEstateWealthTax.entryThreshold,1300000);
assert.equal(law.directInheritance.allowance,100000);
const file={version:'4.21.0',checkedAt:'2026-10-11',referenceYear:2025,taxYear:2026,
 scope:'Cas officiels pour barèmes progressifs partiels, pas calcul d’impôt net ni micro-simulation représentative',
 cases:results,coverageLimits:[
 'L’impôt sur le revenu calculé est brut : pas de décote, plafonnement du quotient familial, crédits, réductions, ni revenus à régime particulier.',
 'Les foyers-types d’EcoSim sont synthétiques et leurs pondérations ne sont pas une population représentative.',
 'IFI : cas simples avant réductions, dons, plafonnement et corrections particulières.',
 'Successions : cas directs isolés sans donations antérieures, situations familiales particulières ni reconstitution d’actif.',
 'Aucune confrontation autonome à OpenFisca n’a été exécutée.']};
fs.mkdirSync(path.join(dist,'validation'),{recursive:true});
fs.writeFileSync(path.join(dist,'validation','fiscal-externe-421.json'),JSON.stringify(file,null,2)+'\n');
const header=['id','tax','expected_eur','calculated_eur','delta_eur','source'];
const q=x=>'"'+String(x).replaceAll('"','""')+'"';
fs.writeFileSync(path.join(dist,'validation','fiscal-externe-421.csv'),[header.join(','),...results.map(x=>[x.id,x.tax,x.expected,x.actual,x.delta,x.source].map(q).join(','))].join('\n')+'\n');
console.log(`FISCAL 4.21 : ${results.length} cas officiels comparés, 0 écart (> 0,01 €) dans ce périmètre simplifié.`);
