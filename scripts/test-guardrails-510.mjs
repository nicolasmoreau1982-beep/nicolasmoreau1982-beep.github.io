/** EcoSim 5.1 — tests négatifs des imports, mutation d'invariants et rejouabilité. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>fs.readFileSync(path.join(root,'dist',f),'utf8');
const c=vm.createContext({console,Math,Number,Object,Map,Set,Date,JSON,Intl,Array,String,Boolean});c.window=c;
for(const f of ['data.js','historical-audit-data.js','history.js','insee-projection.js','fiscal.js',
 'sectoral-observations.js','sectoral.js','guardrails-510.js'])vm.runInContext(read(f),c,{filename:f});
let app=read('app.js');const stop='  loadInitialState();\n  initTheme();';
assert.ok(app.includes(stop));app=app.slice(0,app.indexOf(stop))+
  '  window.__guardTest={state,applySerialized,parseScenarioImport,serializableState,calculateProjection};\n})();';
vm.runInContext(app,c,{filename:'app.js'});
const T=c.__guardTest,G=c.ECOSIM_GUARDRAILS,D=c.ECOSIM_DATA;
let checks=0;
const snapshot=()=>JSON.stringify(T.serializableState());
const initial=snapshot();
const reject=(x,label)=>{
 const before=snapshot();
 assert.equal(T.applySerialized(x),false,`${label} doit être rejeté`);
 assert.equal(snapshot(),before,`${label} ne doit rien modifier`);checks++;
};
const valid=JSON.parse(initial);
assert.equal(T.applySerialized(valid),true);
assert.equal(snapshot(),initial);
const invalidScenarios=[
 null, [], 42, 'scenario', {model:'constructor'}, {model:'__proto__'},
 {model:'toString'}, {euMode:'constructor'}, {policyStartQuarter:5},
 {policyStartQuarter:1.2}, {policyStartQuarter:false},
 {changes:null},{changes:[]},{changes:{R_IR:Infinity}},
 {changes:{R_IR:NaN}},{changes:{R_IR:false}},{changes:{R_IR:null}},
 {changes:{R_IR:'1e999'}},{changes:{R_IR:'hello'}},
 {changes:{R_IR:{value:4}}},
 {changes:JSON.parse('{"__proto__":4}')},
 {changes:{R_TVA:1e100}}, {changes:{NOT_AN_ID:1}},
 {engines:[]},{engines:{childcarePlaces:null}},
 {engines:{childcarePlaces:'oops'}},{engines:{badControl:3}},
 {structural:{invalid:4}},{structural:{fertility:true}},
 {fiscal:{startYear:2026.6}},{fiscal:{wealthFloorEnabled:2}},
 {sectoral:{}},{sectoral:[{sector:'constructor',instrument:'credit',amountBn:1,startYear:2026,durationYears:3,response:'accounting'}]},
 {sectoral:[{sector:'health',instrument:'grant',amountBn:true,startYear:2026,durationYears:3,response:'accounting'}]},
 {sectoral:[{sector:'health',instrument:'grant',amountBn:1,startYear:2026,durationYears:true,response:'accounting'}]},
 {policyStartQuarters:{GF0101:6}},{policyStartQuarters:{INVALID:1}},
 {name:{value:'object'}},{cycle:3},{confidence:'not-a-profile'}
];
for(const [i,x] of invalidScenarios.entries())reject(x,`cas invalide ${i}`);
// Import complet JSON, y compris celui du site, sans fuite de réglages d'un scénario précédent.
const mini={model:'consensus',changes:{R_IR:4},name:'Fichier de contrôle'};
assert.equal(T.applySerialized(mini),true);
assert.equal(T.state.changes.R_IR,4);
assert.equal(T.applySerialized({model:'consensus',changes:{}}),true);
assert.equal(Object.keys(T.state.changes).length,0);checks+=2;
const parsed=T.parseScenarioImport(JSON.stringify({metadata:{version:'4.25.0'},scenario:valid}));
assert.equal(parsed.version,'4.25.0');assert.equal(T.applySerialized(parsed.payload),true);
assert.equal(snapshot(),initial);checks+=3;
// Une entrée issue d'un export 4.23 doit rester lisible.
const files=path.join(root,'dist','examples');
if(fs.existsSync(files))for(const f of fs.readdirSync(files).filter(x=>x.endsWith('.json'))){
 const raw=JSON.parse(fs.readFileSync(path.join(files,f),'utf8'));
 const payload=raw.scenario??raw;
 assert.equal(T.applySerialized(payload),true,`Compatibilité exemple ${f}`);checks++;
}
assert.equal(T.applySerialized(valid),true);
// Tous les défauts numériques et comptables volontairement injectés doivent être détectés.
const P=T.calculateProjection(),p=P.scenario[0],b=P.baseline[0];
const prev=D.BASE.debt, u=D.baseline.unemployment[0], cy=D.macroCoefficients.cyclicalSpendingBnPerUnemploymentPoint;
assert.equal(G.checkYear(p,b,prev,u,cy),true);
for(const [key,value] of [['debt',p.debt+3],['debtRatio',p.debtRatio+0.2],
 ['deficit',p.deficit+0.5],['directBalanceCost',p.directBalanceCost+1],
 ['gdp',NaN],['unemployment',Infinity],['riskPremium',7]]){
 assert.throws(()=>G.checkYear({...p,[key]:value},b,prev,u,cy),/Intégrité moteur/,`Mutation ${key}`);checks++;
}
assert.throws(()=>G.checkYear({...p,bands:{...p.bands,gdp:-1}},b,prev,u,cy),/bandes invalides/);checks++;
assert.throws(()=>G.checkProjection({...P,scenario:P.scenario.slice(1)},D.metadata.projectionYears,prev,D.baseline.unemployment,cy),/horizon/);checks++;
const bad=JSON.parse(JSON.stringify(D));bad.baseline.policyRate[0]=NaN;
assert.throws(()=>G.checkData(bad),/trajectoire policyRate/);checks++;
const bad2=JSON.parse(JSON.stringify(D));bad2.BASE.deficit=999;
assert.throws(()=>G.checkData(bad2),/identité APU/);checks++;
// Commutateurs valides et scénario enregistré doivent être idempotents.
for(const model of Object.keys(D.models)){
 T.state.model=model;
 const x=snapshot();
 assert.equal(T.applySerialized(JSON.parse(x)),true);
 assert.equal(snapshot(),x,`${model} round trip`);checks++;
}
assert.ok(read('index.html').includes('src="guardrails-510.js"'));
assert.equal(D.metadata.version,'5.1.0');
console.log(`DURCISSEMENT 5.1 OK : ${checks} contrôles ciblés, ${invalidScenarios.length} scénarios hostiles, invariants corrompus détectés et imports atomiques.`);
