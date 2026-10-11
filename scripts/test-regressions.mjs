import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
globalThis.window=globalThis;
require(path.join(root,'dist/data.js'));
require(path.join(root,'dist/sectoral.js'));
const D=globalThis.ECOSIM_DATA;
const src=fs.readFileSync(path.join(root,'dist/app.js'),'utf8');
function functionCode(name){
 const marker=`  function ${name}(`, start=src.indexOf(marker);
 assert.ok(start>=0,`fonction ${name} manquante`);
 let open=src.indexOf('{',start), depth=0;
 for(let i=open;i<src.length;i++){
   // Braces in strings can foil scanning; these functions contain no JS template literal braces.
   if(src[i]==='{')depth++;
   if(src[i]==='}' && --depth===0 && (i>=open)){return src.slice(start,i+1);}
 }
 throw Error('accolade manquante');
}
// Isoler les fonctions dans leur contexte réel de données / structures, sans serveur.
const globals={D,S:globalThis.ECOSIM_SECTORAL, F:{defaults:{},controls:{},validate:x=>x}, byId:new Map([...D.spending,...D.revenue].map(x=>[x.id,x])), state:{
 model:'consensus',euMode:'current',cycle:'normal',monetary:'neutral',confidence:'stable',
 changes:{},engines:Object.fromEntries(Object.entries(D.policyEngines.controls).map(([k,v])=>[k,v.value])),
 structural:Object.fromEntries(Object.entries(D.structural.controls).map(([k,v])=>[k,v.value])),fiscal:{},sectoral:[],policyStartQuarter:1,policyStartQuarters:{}
}, clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),
 categoryChangeLimits:()=>({min:-100,max:100}),
};
const ctx=vm.createContext(globals);
const optionCode=src.slice(src.indexOf('  const hasOwnOption ='),src.indexOf('\n  function parseScenarioImport('));
vm.runInContext(optionCode,ctx);
const valid=JSON.parse('{"model":"consensus","euMode":"current","cycle":"normal","monetary":"neutral","confidence":"stable"}');
assert.equal(vm.runInContext('applySerialized',ctx)(valid),true);
for(const [field, name] of [['model','constructor'],['model','__proto__'],['model','toString'],['euMode','toString'],['cycle','constructor'],['monetary','__proto__'],['confidence','constructor']]){
 const before=JSON.stringify(globals.state);
 assert.equal(vm.runInContext('applySerialized',ctx)({...valid,[field]:name}),false,`${field}=${name} aurait dû être rejeté`);
 assert.equal(JSON.stringify(globals.state),before,`état corrompu pour ${field}=${name}`);
}
const socialFunction=src.slice(src.indexOf('  function calculateSocialOutlook('),src.indexOf('\n  function calculateProjection('));
vm.runInContext(socialFunction,ctx);
const calc=vm.runInContext('calculateSocialOutlook',ctx);
const reference={gdp:3000,unemployment:7,inflation:2};
function scenario(changes){globals.state.changes=changes;return calc({...reference},reference);}
const baseline=scenario({});
assert.equal(baseline.highestExposureValue,0);
const pension=scenario({GF1002:-10});
assert.equal(pension.highestExposure.situation,'retired','retraités doivent être exposés par pensions');
assert.ok(pension.highestExposure.exposure>0,'pensions : exposition positive');
const vat=scenario({R_TVA:10});
assert.ok(vat.cells.length>10);
assert.equal(new Set(vat.cells.map(x=>x.exposure.toFixed(4))).size,1,'TVA ne devrait pas créer un classement par âge inventé');
assert.equal(vat.equalExposureCount,vat.cells.length,'TVA : toutes les cellules éligibles doivent être à égalité');
const ir=scenario({R_IR:10});
assert.equal(ir.highestExposure.situation,'private','IR : vérifier situation conventionnelle du salarié privé');
assert.ok(!src.includes('incumbentVoteSensitivity'),'résultat électoral résiduel');
assert.ok(!src.includes('voteWeight'),'poids électoral résiduel');
const html=fs.readFileSync(path.join(root,'dist/audit.html'),'utf8');
for(const id of ['backtest-body','audit-comparable-results','audit-year-body']){
 const match=html.match(new RegExp(`<tbody id="${id}">([\\s\\S]*?)<\\/tbody>`));
 assert.ok(match?.[1].includes('<tr>') || match?.[1].includes('<tr '),id+' non pré-rendu');
 assert.ok(!match[1].includes('Chargement des résultats'),id+' placeholder');
}
console.log('TESTS OK : profils valides et 7 cas invalides, pensions −10 Md€, TVA +10 Md€, IR +10 Md€, aucun voteWeight, audit pré-rendu.');
