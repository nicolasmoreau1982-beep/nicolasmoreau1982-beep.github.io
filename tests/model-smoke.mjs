import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const dataSource = fs.readFileSync(new URL("dist/data.js", root), "utf8");
const dataContext = { window: {} };
vm.runInNewContext(dataSource, dataContext, { filename: "data.js" });

const appSource = fs.readFileSync(new URL("dist/app.js", root), "utf8");
const start = appSource.indexOf("(() => {") + "(() => {".length;
const end = appSource.indexOf("  function initializeControls()");
assert.ok(start > 0 && end > start, "Le moteur doit pouvoir être isolé avant le rendu DOM");

const modelSource = `${appSource.slice(start, end)}
  globalThis.__ecosimTest = {
    state,
    calculateProjection,
    resetStructural() {
      state.structural = Object.fromEntries(Object.entries(D.structural.controls).map(([id, control]) => [id, control.value]));
      state.engines = Object.fromEntries(Object.entries(D.policyEngines.controls).map(([id, control]) => [id, control.value]));
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

const { state, calculateProjection, resetStructural } = modelContext.__ecosimTest;
const data = dataContext.window.ECOSIM_DATA;
const finite = (value) => Number.isFinite(value);

resetStructural();
const baseline = calculateProjection();
assert.equal(baseline.scenario.length, 30);
assert.ok(baseline.scenario.every((row) => [row.gdp, row.debt, row.deficit, row.unemployment].every(finite)));
assert.ok(baseline.scenario.every((row) => Math.abs(row.structural.publicEmploymentDelta) < 1e-9));
assert.ok(baseline.scenario.every((row) => Math.abs(row.social.meanDiscomfort) < 1e-9));
assert.equal(
  Number(Object.values(data.structural.workforce.publicOccupations).reduce((sum, item) => sum + item.baseline, 0).toFixed(1)),
  Number((data.structural.workforce.publicEmployment * 1000).toFixed(1)),
  "Le détail par mission doit se recaler sur l'emploi public total"
);

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
