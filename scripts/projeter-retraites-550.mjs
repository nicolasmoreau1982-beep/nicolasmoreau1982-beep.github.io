import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const protocolPath=path.join(root,'dist/data/retraites-2010-protocole-550.json');
const protocolText=fs.readFileSync(protocolPath,'utf8'),p=JSON.parse(protocolText);
const ctx={};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'dist/cohort-retirement-550.js'),'utf8'),ctx);
const engine=ctx.EcoSimCohort550;
const scenarios=p.cohorts.flatMap(cohort=>['men','women'].map(sex=>{
 const result=engine.compare({...cohort,sex,months:12});
 return JSON.parse(JSON.stringify({...cohort,sex,legalAgeMonths:result.after.ageMonths,
   baseline:result.before,reform:result.after,effect:result.changes,budgetIllustration:result.budgetIllustration}));
}));
const heldout=Object.fromEntries(['men','women'].map(sex=>{
 const rows=p.observationComparisonCohorts.map(c=>({...engine.compare({...c,sex,months:12}),weight:c.weight}));
 const total=rows.reduce((s,r)=>s+r.weight,0);
 const avg=(field)=>Object.fromEntries(engine.KEYS.map(k=>[k,rows.reduce((s,r)=>s+r[field][k]*r.weight,0)/total]));
 return [sex,{before:avg('before'),after:avg('after'),effect:avg('changes')}];
}));
const result={version:p.version,sourceProtocolHash:crypto.createHash('sha256').update(protocolText).digest('hex'),
 generatedAt:'reproductible-sans-horodatage', noObservedInputs:true,months:12,scenarios,heldout};
// 1 080 lignes de trajectoire : 5 générations × 2 sexes × 3 calendriers × 36 mois.
const cols=['birthYear','birthMonth','sex','mode','legalAgeMonths','ageMonths',...engine.KEYS];
const monthly=[cols.join(',')];
for(const cohort of p.cohorts)for(const sex of ['men','women'])for(const mode of ['baseline','reform2010','reform']){
 const result=engine.run({...cohort,sex,mode,months:36});
 for(const row of result.history){
  const o={birthYear:cohort.birthYear,birthMonth:cohort.birthMonth,sex,mode,legalAgeMonths:result.legalAgeMonths,...row};
  monthly.push(cols.map(k=>String(o[k])).join(','));
 }
}
fs.mkdirSync(path.join(root,'dist/validation'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/validation/retraites-550-trajectoires-mensuelles.csv'),monthly.join('\n')+'\n');
fs.writeFileSync(path.join(root,'dist/validation/retraites-550-predictions-separees.json'),JSON.stringify(result,null,2)+'\n');
console.log('5.5 étape A : 10 simulations cohortes/sexe et deux synthèses — observations après réforme NON LUES');
