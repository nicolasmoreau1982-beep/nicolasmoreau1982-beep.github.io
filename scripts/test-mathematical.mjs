/**
 * EcoSim — tests numériques et comptables, sans DOM ni dépendance npm.
 * Exécute le moteur réellement distribué (data, fiscal, projections, app),
 * en arrêtant uniquement le bootstrap de l'interface, pas les calculs.
 * Tests de cohérence interne : ils NE VALIDENT PAS les élasticités ni les causalités.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root,'dist',name),'utf8');
const sandbox = {console, Math, Number, Object, Map, Set, Date, JSON, Intl, Array, String, Boolean};
sandbox.window = sandbox;
const context = vm.createContext(sandbox);
for (const file of ['data.js','historical-audit-data.js','history.js','insee-projection.js','fiscal.js','sectoral.js']) {
  vm.runInContext(read(file),context,{filename:file});
}
let app = read('app.js');
const bootstrap = '  loadInitialState();\n  initTheme();';
assert.ok(app.includes(bootstrap), 'bootstrap introuvable, mettre à jour le harnais');
app = app.slice(0,app.indexOf(bootstrap)) +
  '  window.__testEngine = {state, calculateProjection, baselineTrajectory, categoryPolicyImpact, effectiveProfile, calculateStructuralTrajectory, calculatePolicyEngineTrajectory, categoryChangeLimits};\n})();';
vm.runInContext(app,context,{filename:'app.js'});
const {state, calculateProjection, baselineTrajectory, categoryPolicyImpact, effectiveProfile, categoryChangeLimits} = context.__testEngine;
const D = context.ECOSIM_DATA;
const F = context.ECOSIM_FISCAL;
const defaultState = () => {
  state.changes = {};
  state.policyStartQuarter = 1;
  state.policyStartQuarters = {};
  state.model = 'consensus';
  state.euMode = 'current';
  state.cycle = 'normal';
  state.monetary = 'neutral';
  state.confidence = 'stable';
  state.structural = Object.fromEntries(Object.entries(D.structural.controls).map(([id,c])=>[id,c.value]));
  state.engines = Object.fromEntries(Object.entries(D.policyEngines.controls).map(([id,c])=>[id,c.value]));
  state.fiscal = {...F.defaults};
  state.sectoral = [];
};
let assertions = 0;
let projections = 0;
function near(actual, expected, msg, abs = 1e-7) {
  assertions++;
  assert.ok(Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual-expected) <= abs*Math.max(1,Math.abs(expected)),
    `${msg} : ${actual} ≠ ${expected}`);
}
function projection(label,options={}) {
  projections++;
  const result = calculateProjection();
  assert.equal(result.scenario.length,D.metadata.projectionYears,`${label} : horizon`);
  assert.equal(result.baseline.length,D.metadata.projectionYears,`${label} : référence`);
  let prevDebt=D.BASE.debt;
  let prevBaseDebt=D.BASE.debt;
  for(let i=0;i<result.scenario.length;i++) {
    const p=result.scenario[i], b=result.baseline[i];
    for(const field of ['gdp','growth','inflation','unemployment','deficit','debt','debtRatio','deficitRatio',
      'directBalanceCost','spendingChange','revenueChange','revenueFeedback','extraInterest','demandContribution',
      'supplyContribution','riskPremium','outputGap']) {
      assert.ok(Number.isFinite(p[field]),`${label} ${p.year} : ${field} invalide = ${p[field]}`);
    }
    for(const [key,v] of Object.entries(p.bands)) {
      assert.ok(Number.isFinite(v) && v>=0,`${label} ${p.year} bande ${key} invalide`);
    }
    assert.ok(p.gdp>0,`${label} ${p.year} : PIB doit rester positif`);
    assert.ok(p.unemployment>=3.2-1e-9 && p.unemployment<=18+1e-9,`${label} chômage hors bornes`);
    assert.ok(p.riskPremium>=-0.20-1e-9 && p.riskPremium<=5+1e-9,`${label} prime de risque hors bornes`);
    near(p.directBalanceCost,p.spendingChange-p.revenueChange,`${label} ${p.year} coût direct`);
    near(p.deficit,b.deficit+p.directBalanceCost-p.revenueFeedback+
      (p.unemployment-D.baseline.unemployment[i])*3.1+p.extraInterest,`${label} ${p.year} identité déficit`);
    near(p.debt,prevDebt+p.deficit,`${label} ${p.year} stock dette`);
    near(p.debtRatio,p.debt/p.gdp*100,`${label} ${p.year} ratio dette`);
    near(p.deficitRatio,p.deficit/p.gdp*100,`${label} ${p.year} ratio déficit`);
    near(b.debt,prevBaseDebt+b.deficit,`${label} ${b.year} référence stock dette`);
    prevDebt=p.debt;prevBaseDebt=b.debt;
  }
  return result;
}
function capture(r) {return r.scenario.map(p=>[p.year,p.gdp,p.debt,p.deficit,p.growth,p.unemployment]);}
const baseline=()=>{defaultState();return projection('sans réforme');};
const base=baseline();
for (let i=0;i<base.scenario.length;i++) {
  for (const field of ['gdp','debt','deficit','debtRatio','deficitRatio','growth','inflation','unemployment']) {
    near(base.scenario[i][field],base.baseline[i][field],`référence nulle ${i} ${field}`);
  }
}
assert.deepEqual(capture(projection('répétabilité')),capture(base),'répétabilité : aucune dépendance cachée');
// Test analytique isolé : un flux comptable de recette n'injecte pas artificiellement de PIB à la date du flux.
defaultState();
const direct=calculateProjection('consensus',{2026:{revenueBn:10,spendingBn:0}});
near(direct.scenario[0].directBalanceCost,-10,'flux 2026 de recette');
near(direct.scenario[0].gdp,direct.baseline[0].gdp,'flux direct sans multiplicateur');
near(direct.scenario[0].deficit,direct.baseline[0].deficit-10,'flux direct en année 1');
assert.throws(()=>calculateProjection('consensus',{2026:{revenueBn:Infinity}}),/Flux comptable invalide/);
// Application T4 : un quart du choc budgétaire en année 1, sans changer l'année pleine suivante.
defaultState();
state.changes={GF0101:10};
const t1=projection('trimestre T1');
state.policyStartQuarter=4;
const t4=projection('trimestre T4');
near(t4.scenario[0].directBalanceCost,t1.scenario[0].directBalanceCost*0.25,'T4 : prorata année 1');
near(t4.scenario[1].directBalanceCost,t1.scenario[1].directBalanceCost,'T4 : année pleine');
// Scénarios fonctionnels représentatifs.
for(const [name,changes] of [['TVA +10',{R_TVA:10}],['IR +10',{R_IR:10}],['pensions -10',{GF1002:-10}],
 ['éducation +10',{GF0901:10}],['mélange recettes-dépenses',{R_TVA:8,R_IR:-6,GF1002:-8,GF0101:12}]]) {
 defaultState();state.changes=changes;projection(name);
}
// Limites unitaires de TOUTES les catégories et de TOUS les contrôles indépendamment.
for(const category of [...D.spending,...D.revenue].filter(c=>!c.locked)) {
 const limits=categoryChangeLimits(category);
 for(const [edge,value] of [['min',limits.min],['max',limits.max]]) {
  defaultState();state.changes={[category.id]:value};projection(`${category.id} ${edge}`);
 }
}
for(const [domain,controls] of [['structural',D.structural.controls],['engines',D.policyEngines.controls],['fiscal',F.controls]]) {
 for(const [id,c] of Object.entries(controls)) {
  for(const edge of ['min','max']) {
   defaultState();state[domain][id]=c[edge];projection(`${domain}.${id} ${edge}`);
  }
 }
}
// Tous les réglages aux limites, y compris des configurations fortement improbables :
// ce test établit une stabilité NUMÉRIQUE, et non une plausibilité économique.
for(const edge of ['min','max']) {
 defaultState();
 for(const cat of [...D.spending,...D.revenue].filter(c=>!c.locked)) state.changes[cat.id]=categoryChangeLimits(cat)[edge];
 for(const [domain,controls] of [['structural',D.structural.controls],['engines',D.policyEngines.controls],['fiscal',F.controls]])
   for(const [id,c] of Object.entries(controls)) state[domain][id]=c[edge];
 const result=projection(`tous réglages ${edge}`);
 if(edge==='min')assert.ok(result.scenario.some(x=>x.riskPremiumCapped),'le cas extrême doit signaler sa saturation');
}
// Croisements profils × cadres européens, et combinaisons contrôlées (graine déterministe).
for(const model of Object.keys(D.models))for(const euMode of Object.keys(D.euModes)) {
 defaultState();state.model=model;state.euMode=euMode;
 state.changes={R_TVA:10, GF1002:-10};
 projection(`${model}/${euMode}`);
}
let seed=0x5eeda8;
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/0x100000000;};
const categories=[...D.spending,...D.revenue].filter(c=>!c.locked);
for(let trial=0;trial<64;trial++) {
 defaultState();
 state.model=Object.keys(D.models)[Math.floor(rand()*Object.keys(D.models).length)];
 state.euMode=Object.keys(D.euModes)[Math.floor(rand()*Object.keys(D.euModes).length)];
 state.policyStartQuarter=1+Math.floor(rand()*4);
 for(let j=0;j<7;j++) {
  const c=categories[Math.floor(rand()*categories.length)];
  const limits=categoryChangeLimits(c);
  state.changes[c.id]=limits.min+rand()*(limits.max-limits.min);
 }
 for(const [domain,controls] of [['structural',D.structural.controls],['engines',D.policyEngines.controls],['fiscal',F.controls]]) {
  const ids=Object.keys(controls);
  for(let j=0;j<6;j++) {
   const id=ids[Math.floor(rand()*ids.length)];const c=controls[id];
   state[domain][id]=c.min+(c.max-c.min)*rand();
  }
 }
 // L'atelier fiscal exige certains paramètres entiers ou booléens ; normaliser exactement comme l'UI.
 state.fiscal.startYear=Math.round(state.fiscal.startYear);
 state.fiscal.wealthFloorEnabled=Number(state.fiscal.wealthFloorEnabled >= 0.5);
 state.fiscal=F.validate(state.fiscal);
 projection(`combinatoire #${trial+1}`);
}
// Règles fiscales : aucun effet à réglages identiques, bilan des taxes et monotonie d'un cas élémentaire.
const same=F.simulate({...F.defaults},2026,1);
near(same.totalBn,0,'fiscal zéro réforme');
near(Object.values(same.deltaByTax).reduce((a,b)=>a+b,0),0,'somme fiscal zéro');
const before=F.simulate({...F.defaults,irLowRate:15,startYear:2030},2029,1);
near(before.totalBn,0,'réforme fiscale avant entrée en vigueur');
const after=F.simulate({...F.defaults,irLowRate:15,startYear:2030},2030,1);
assert.ok(after.deltaByTax.ir>=0,'hausse du taux IR ne doit pas réduire la recette calculée à assiette inchangée');
for(const income of [0,5000,30000,100000,1000000]) {
 const low=F.incomeTax(income,1,F.policyRules(F.defaults));
 const high=F.incomeTax(income+1000,1,F.policyRules(F.defaults));
 assert.ok(high>=low,`IR non monotone pour ${income}`);
}
console.log(`TESTS MATHÉMATIQUES OK : ${projections} projections (30 ans chacune), ${assertions} identités numériques, référence contrôlée, flux datés, T4, contrôles min/max, 45 profils-cadres, 64 scénarios croisés, fiscalité.`);
