import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const dataSource = fs.readFileSync(new URL("dist/data.js", root), "utf8");
const dataContext = { window: {} };
vm.runInNewContext(dataSource, dataContext, { filename: "data.js" });
vm.runInNewContext(fs.readFileSync(new URL("dist/history.js", root), "utf8"), dataContext, { filename: "history.js" });
vm.runInNewContext(fs.readFileSync(new URL("dist/insee-projection.js", root), "utf8"), dataContext, { filename: "insee-projection.js" });
vm.runInNewContext(fs.readFileSync(new URL("dist/fiscal.js", root), "utf8"), dataContext, { filename: "fiscal.js" });

const appSource = fs.readFileSync(new URL("dist/app.js", root), "utf8");
const start = appSource.indexOf("(() => {") + "(() => {".length;
const end = appSource.indexOf("  function initializeControls()");
assert.ok(start > 0 && end > start, "Le moteur doit pouvoir être isolé avant le rendu DOM");

const modelSource = `${appSource.slice(start, end)}
  globalThis.__ecosimTest = {
    state,
    calculateProjection,
    parseScenarioImport,
    resetStructural() {
      state.structural = Object.fromEntries(Object.entries(D.structural.controls).map(([id, control]) => [id, control.value]));
      state.engines = Object.fromEntries(Object.entries(D.policyEngines.controls).map(([id, control]) => [id, control.value]));
      state.fiscal = { ...window.ECOSIM_FISCAL.defaults };
      state.changes = {};
    }
  };`;
const modelContext = {
  window: dataContext.window,
  console,
  TextEncoder,
  TextDecoder,
  URL,
  location: { hash: "", origin: "http://localhost", pathname: "/" },
  localStorage: { getItem: () => null }
};
vm.runInNewContext(modelSource, modelContext, { filename: "app-model.js" });

const { state, calculateProjection, parseScenarioImport, resetStructural } = modelContext.__ecosimTest;
const data = dataContext.window.ECOSIM_DATA;
const finite = (value) => Number.isFinite(value);

assert.equal(parseScenarioImport(JSON.stringify({metadata: {version: data.metadata.version},
  scenario: {name: "Test", changes: {GF0405: 3}}})).payload.changes.GF0405, 3);
assert.equal(parseScenarioImport(JSON.stringify({engines: {childcarePlaces: 100}})).payload.engines.childcarePlaces, 100);
assert.throws(() => parseScenarioImport("{}"), /scénario EcoSim/);
assert.throws(() => parseScenarioImport(JSON.stringify({model: "modele_inconnu"})), /Cadre économique inconnu/);

resetStructural();
const baseline = calculateProjection();
assert.equal(baseline.scenario.length, 30);
assert.equal(Object.keys(data.models).length, 9, "Les nouveaux profils doivent être disponibles au moteur partagé");
for (const model of Object.keys(data.models)) {
  const unchanged = calculateProjection(model);
  for (const index of [0, 9, 29]) {
    for (const field of ["gdp", "deficit", "debt"]) {
      assert.ok(Math.abs(unchanged.scenario[index][field] - baseline.scenario[index][field]) < 1e-7,
        `${model} ne doit pas changer la trajectoire centrale sans mesure (${field}, ${index + 1} ans)`);
    }
  }
}

resetStructural();
state.changes.GF0405 = -10;
const centralCut = calculateProjection("consensus").scenario;
const crisisCut = calculateProjection("debtCrisis").scenario;
assert.ok(crisisCut[2].gdp < centralCut[2].gdp, "La consolidation en récession accentue la contraction");
assert.ok(crisisCut[9].hysteresis < 0, "La séquelle de capacité reste traçable dans la sortie");

resetStructural();
state.changes.GF0405 = 10;
const centralInvestment = calculateProjection("consensus").scenario;
const openInvestment = calculateProjection("openEconomy").scenario;
assert.ok(openInvestment[0].gdp < centralInvestment[0].gdp,
  "La fuite importée réduit l'effet intérieur d'une dépense supplémentaire");

resetStructural();
state.changes.R_TVA = 10;
const centralInflation = calculateProjection("consensus").scenario;
const stabilizationInflation = calculateProjection("stabilization").scenario;
assert.ok(stabilizationInflation[0].riskPremium > centralInflation[0].riskPremium,
  "La stabilisation rend le financement sensible au choc d'inflation supplémentaire");

resetStructural();
state.structural.efficiency = 10;
const centralEnergy = calculateProjection("consensus").scenario[4].structural;
const constrainedEnergy = calculateProjection("constrainedTransition").scenario[4].structural;
assert.ok(constrainedEnergy.energySupply < centralEnergy.energySupply,
  "Les contraintes énergétiques ralentissent les gains d'offre");
assert.ok(Math.abs(constrainedEnergy.energyInflation) > Math.abs(centralEnergy.energyInflation),
  "Le canal prix de l'énergie varie également");

resetStructural();
const demographicProjection = dataContext.window.ECOSIM_INSEE_PROJECTION.rows;
for (const row of baseline.scenario) {
  const target = demographicProjection.find((item) => item.year === row.year + 1);
  assert.ok(Math.abs(row.structural.population - target.populationM) < 1e-6,
    `La référence démographique doit suivre l'Insee au 1er janvier ${row.year + 1}`);
  assert.ok(Math.abs(row.structural.age65Share - target.age65SharePct) < 1e-6);
}
assert.ok(baseline.scenario.every((row) => [row.gdp, row.debt, row.deficit, row.unemployment].every(finite)));
assert.ok(baseline.scenario.every((row) => Math.abs(row.structural.publicEmploymentDelta) < 1e-9));
assert.ok(baseline.scenario.every((row) => Math.abs(row.social.meanDiscomfort) < 1e-9));
assert.equal(data.structural.controls.fertility.kind, "assumption");
assert.equal(data.structural.controls.economicMigration.kind, "assumption");
assert.equal(data.structural.controls.fossilPrice.kind, "assumption");
assert.equal(
  Number(Object.values(data.structural.workforce.publicOccupations).reduce((sum, item) => sum + item.baseline, 0).toFixed(1)),
  Number((data.structural.workforce.publicEmployment * 1000).toFixed(1)),
  "Le détail par mission doit se recaler sur l'emploi public total"
);

resetStructural();
state.engines.childcarePlaces = 300;
const childcareScenario = calculateProjection();
assert.equal(childcareScenario.scenario[0].structural.births, baseline.scenario[0].structural.births,
  "Aucun effet natalité immédiat des places de garde");
assert.ok(childcareScenario.scenario[4].structural.births > baseline.scenario[4].structural.births,
  "La politique de garde doit agir sur les naissances avec délai");
assert.ok(childcareScenario.scenario[4].structural.policyFertilityDelta > 0);
assert.ok(childcareScenario.scenario[4].structural.policyFertilityDelta <= data.structural.fertilityResponse.maxAdditionalChildrenPerWoman);
assert.ok(childcareScenario.scenario[20].structural.employedDelta > baseline.scenario[20].structural.employedDelta,
  "Les cohortes supplémentaires n'entrent dans le travail qu'après 18 ans");

resetStructural();
state.structural.fertility = 1.30;
const lowerFertility = calculateProjection();
assert.ok(lowerFertility.scenario[2].structural.births < baseline.scenario[2].structural.births,
  "L'hypothèse avancée de fécondité reste un test de sensibilité");

resetStructural();
state.changes.GF0405 = 10;
const investmentScenario = calculateProjection();
assert.notEqual(investmentScenario.scenario[2].unemployment, baseline.scenario[2].unemployment,
  "Le chômage doit rester une sortie réagissant à la politique");
state.policyStartQuarter = 3;
const delayedInvestment = calculateProjection();
assert.ok(Math.abs(delayedInvestment.scenario[0].spendingChange - investmentScenario.scenario[0].spendingChange / 2) < 1e-9,
  "Une mesure entrant en juillet doit peser six mois la première année");
assert.ok(Math.abs(delayedInvestment.scenario[1].spendingChange - investmentScenario.scenario[1].spendingChange) < 1e-9,
  "Une mesure permanente pèse une année pleine à partir de l'année suivante");
assert.ok(delayedInvestment.scenario[0].gdp < investmentScenario.scenario[0].gdp);
state.policyStartQuarter = 1;
state.policyStartQuarters = {GF0405: 3};
const individuallyScheduled = calculateProjection();
assert.ok(Math.abs(individuallyScheduled.scenario[0].spendingChange - delayedInvestment.scenario[0].spendingChange) < 1e-9,
  "Un poste peut avoir son propre trimestre distinct du défaut global");
state.policyStartQuarters = {};
resetStructural();
state.changes.R_TVA = 10;
const vatJanuary = calculateProjection();
state.policyStartQuarter = 3;
const vatJuly = calculateProjection();
assert.ok(vatJuly.scenario[0].inflation < vatJanuary.scenario[0].inflation,
  "Le choc de prix TVA doit aussi être décalé dans le calendrier");
state.policyStartQuarter = 1;
state.changes.GF0405 = 10;
state.policyStartQuarters = {GF0405: 3, R_TVA: 4};
const staggered = calculateProjection();
assert.ok(Math.abs(staggered.scenario[0].spendingChange - delayedInvestment.scenario[0].spendingChange) < 1e-9);
assert.ok(Math.abs(staggered.scenario[0].revenueChange - vatJanuary.scenario[0].revenueChange / 4) < 1e-9);
state.policyStartQuarters = {};

resetStructural();
state.structural.jobsMilitary = 10;
state.structural.jobsPolice = 5;
state.structural.jobsPrison = 1;
const securityHiring = calculateProjection();
const securityYear10 = securityHiring.scenario[9].structural;
assert.ok(securityYear10.publicMissionById.military > securityYear10.publicMissionById.police);
assert.ok(securityYear10.publicMissionById.police > securityYear10.publicMissionById.prison);
assert.ok(securityYear10.publicMilitaryDelta > 0);
assert.ok(securityYear10.publicPermanentDelta > securityYear10.publicContractDelta);
assert.ok(securityYear10.publicPayrollCost > 0 && securityYear10.lifetimeCommitment > 0);

resetStructural();
state.structural.jobsPolice = 10;
state.structural.publicPermanentShare = 20;
const temporaryPolice = calculateProjection().scenario[9].structural;
state.structural.publicPermanentShare = 100;
const permanentPolice = calculateProjection().scenario[9].structural;
assert.ok(permanentPolice.publicPermanentDelta > temporaryPolice.publicPermanentDelta);
assert.ok(permanentPolice.publicEmploymentDelta > temporaryPolice.publicEmploymentDelta);

resetStructural();
state.structural.jobsPolice = 10;
const policeOnly = calculateProjection().scenario[0];
state.engines.publicPayroll = 10;
const policeWithPayRise = calculateProjection().scenario[0];
assert.ok(policeWithPayRise.structural.publicPayrollCost > policeOnly.structural.publicPayrollCost);
assert.ok(policeOnly.directBalanceCost > 0, "Le coût des policiers doit être présent dans le solde direct");

resetStructural();
state.engines.prevention = 10;
state.engines.bankLevy = 10;
const balancedGross = calculateProjection().scenario[0];
assert.ok(Math.abs(balancedGross.spendingChange - 10) < 0.001);
assert.ok(Math.abs(balancedGross.revenueChange - 10) < 0.001);
assert.ok(Math.abs(balancedGross.directBalanceCost) < 0.001);

resetStructural();
state.structural.jobsPolice = 20;
state.structural.publicHiringCapacity = 2;
const limitedPolice = calculateProjection().scenario[0].structural;
assert.ok(limitedPolice.realizedPublicHiring < limitedPolice.requestedPublicHiring);
assert.ok(limitedPolice.publicMissionById.police <= data.structural.workforce.publicOccupations.police.baseline * 0.02 + 0.0001);

resetStructural();
state.structural.economicMigration = -50;
state.structural.otherMigration = -100;
const outwardMigration = calculateProjection().scenario[0].structural;
assert.ok(outwardMigration.migrationRevenue >= 0 && outwardMigration.migrationCost >= 0);
assert.ok(outwardMigration.departureTaxLoss > 0 && outwardMigration.departureServiceSavings > 0);

resetStructural();
state.changes.R_TVA = 10;
const taxReaction = calculateProjection().scenario[2].social;
assert.ok(taxReaction.meanDiscomfort > 0);
assert.ok(taxReaction.cells.some((cell) => cell.pressure > 0));
assert.ok(taxReaction.incumbentVoteSensitivity.every((value) => value < 0));

resetStructural();
state.structural.efficiency = 30;
const energyLimit = calculateProjection().scenario[29].structural;
assert.ok(energyLimit.importBillChange >= -data.structural.energy.importBill);
assert.ok(energyLimit.emissionsChange >= -data.structural.energy.emissionsMt);

resetStructural();
state.structural.publicFpeNet = 40;
state.structural.publicFptNet = 20;
state.structural.publicFphNet = 25;
state.structural.publicPermanentShare = 75;
state.structural.trainingEntries = 150;
state.structural.activationPlaces = 100;
const expansion = calculateProjection();
const year10 = expansion.scenario[9];
const year30 = expansion.scenario[29];
assert.ok(year10.structural.publicByVersant.fpe > year10.structural.publicByVersant.fpt);
assert.ok(year10.structural.publicPermanentDelta > year10.structural.publicContractDelta);
assert.ok(year30.structural.publicPayrollCost > year10.structural.publicPayrollCost);
assert.ok(year30.structural.lifetimeCommitment > 0);
assert.ok(year10.labor.fromUnemployment >= 0 && year10.labor.jobToJob >= 0);
assert.ok(year10.labor.realizationRate >= 0.55 && year10.labor.realizationRate <= 1);

resetStructural();
state.structural.publicFphNet = -50;
const contraction = calculateProjection();
assert.ok(contraction.scenario[29].structural.publicByVersant.fph < 0);
assert.ok(contraction.scenario[29].structural.publicPayrollCost < 0);
assert.ok(contraction.scenario.every((row) => [row.gdp, row.debt, row.deficit, row.unemployment, row.structural.lifetimeCommitment].every(finite)));

resetStructural();
state.engines.healthWorkforce = 50;
const healthHiring = calculateProjection();
assert.ok(healthHiring.scenario[0].structural.publicByVersant.fph >= 49.9);
assert.ok(healthHiring.scenario[0].structural.publicMissionById.hospital >= 49.9);
assert.ok(healthHiring.scenario[0].spendingChange > 3 && healthHiring.scenario[0].spendingChange < 4.5, "Les soignants ne doivent pas être comptés deux fois");
assert.ok(healthHiring.scenario[27].structural.publicMissionById.hospital > 0);
assert.ok(Math.abs(healthHiring.scenario[28].structural.publicMissionById.hospital) < 0.0001);
assert.ok(healthHiring.scenario[28].structural.publicPensionCost > 0);
assert.ok(healthHiring.scenario.every((row) => Math.abs(row.directBalanceCost - row.spendingChange + row.revenueChange) < 1e-8));

for (const family of Object.values(data.politicalScenarios)) {
  for (const scenario of family) {
    resetStructural();
    state.changes = { ...scenario.changes };
    state.model = "consensus";
    state.euMode = scenario.euMode;
    state.structural = Object.fromEntries(Object.entries(data.structural.controls).map(([id, control]) => [id, scenario.structural[id] ?? control.value]));
    state.engines = Object.fromEntries(Object.entries(data.policyEngines.controls).map(([id, control]) => [id, scenario.engines[id] ?? control.value]));
    const projection = calculateProjection();
    assert.ok(projection.scenario.every((row) => [row.gdp, row.debtRatio, row.deficitRatio, row.unemployment, row.labor.realizationRate].every(finite)), `${scenario.id} produit une valeur non finie`);
  }
}

console.log(JSON.stringify({
  years: baseline.scenario.length,
  year10PublicJobsK: Number(year10.structural.publicEmploymentDelta.toFixed(1)),
  year10AnnualCostBn: Number(year10.structural.publicPayrollCost.toFixed(1)),
  year30CommitmentBn: Number(year30.structural.lifetimeCommitment.toFixed(1)),
  year10JobRealizationPct: Number((year10.labor.realizationRate * 100).toFixed(1))
}));
