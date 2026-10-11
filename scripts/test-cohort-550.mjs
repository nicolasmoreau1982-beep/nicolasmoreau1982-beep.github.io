import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..');
const code=fs.readFileSync(path.join(root,'dist/cohort-retirement-550.js'),'utf8');
const protocol=JSON.parse(fs.readFileSync(path.join(root,'dist/data/retraites-2010-protocole-550.json')));
const ctx={};vm.createContext(ctx);vm.runInContext(code,ctx);
const M=ctx.EcoSimCohort550;
const cases=[[1950,12,720],[1951,6,720],[1951,7,724],[1952,1,729],[1953,12,734],[1954,1,739],[1955,1,744],[1960,1,744]];
for(const [y,m,age]of cases){assert.equal(M.legalAgeMonths(y,m),age);assert.equal(M.legalAgeMonths(y,m,'baseline'),720)}
for(const [y,m]of [[1951,10],[1952,6],[1953,6],[1954,6],[1955,6]])for(const sex of ['men','women']){
 const a=M.run({birthYear:y,birthMonth:m,sex,months:60,mode:'baseline'});
 const b=M.run({birthYear:y,birthMonth:m,sex,months:60,mode:'reform'});
 const c=M.compare({birthYear:y,birthMonth:m,sex});
 for(const result of [a,b]){
  assert.equal(result.history.length,60);
  for(const row of result.history){
    M.checkState(row);
    for(const key of M.KEYS)assert.ok(row[key]>=0&&row[key]<=1);
  }
  for(let i=1;i<60;i++)assert.ok(result.history[i].retired>=result.history[i-1].retired-1e-12);
 }
 assert.ok(c.after.retired<=c.before.retired+1e-11);
 const budget=c.budgetIllustration;
 assert.ok(budget.pensionSavedEur>=-1e-7);
 assert.ok(Number.isFinite(budget.illustrativeNetEur));
 if(y===1951){for(let i=0;i<4;i++)assert.equal(b.history[i].retired,0);assert.ok(b.history[4].retired>0)}
}
assert.equal(M.legalAgeMonths(1951,10,'reform'),724);
for(const [y,age] of [[1952,728],[1953,732],[1954,736],[1955,740],[1956,744]])assert.equal(M.legalAgeMonths(y,6,'reform2010'),age);
assert.throws(()=>M.legalAgeMonths(1952,13));
assert.throws(()=>M.legalAgeMonths(1952,1,'fake'));
assert.throws(()=>M.run({birthYear:1952,birthMonth:6,sex:'other'}));
assert.throws(()=>M.run({birthYear:1952,birthMonth:6,months:1000}));
assert.throws(()=>M.budget([{...M.run({birthYear:1952,birthMonth:6,months:1}).history[0]}],[{...M.run({birthYear:1952,birthMonth:6,months:1}).history[0]}],{contributionRate:2}));
// Source heldout : la routine de prédiction NE DOIT PAS importer le fichier d'observations.
const script=fs.readFileSync(path.join(root,'scripts/projeter-retraites-550.mjs'),'utf8');
assert.ok(!script.includes('retraites-2010-observations-550.json'));
assert.ok(!code.includes('0.38')&&!code.includes('0.32')); // valeurs après réforme, fig.3
const predictions=JSON.parse(fs.readFileSync(path.join(root,'dist/validation/retraites-550-predictions-separees.json')));
const comparison=JSON.parse(fs.readFileSync(path.join(root,'dist/validation/retraites-550-confrontation.json')));
assert.equal(predictions.noObservedInputs,true);
assert.equal(predictions.scenarios.length,10);
const trajectoryLines=fs.readFileSync(path.join(root,'dist/validation/retraites-550-trajectoires-mensuelles.csv'),'utf8').trim().split('\n');
assert.equal(trajectoryLines.length,1081);
// Vérifier que le protocole publié et les paramètres du moteur concordent.
for(const sex of ['men','women'])for(const key of M.KEYS){
 assert.equal(M.PRE_REFORM[sex][key],protocol.beforeAtAge60[sex][key]);
}

assert.equal(comparison.rows.length,10);
for(const row of comparison.rows){assert.ok(Number.isFinite(row.descriptiveEffectGapPoints));}
// Contrôle négatif : toute erreur de masse devient détectable.
assert.throws(()=>M.checkState({fullTime:.5,partTime:.5,unemployed:.5,inactive:0,retired:0}));
console.log('COHORTES 5.5 : 8 calendriers, 10 séries mensuelles sur 60 mois, conservation de masse, budget illustratif, fichier tenu à l’écart, corruption détectée.');
