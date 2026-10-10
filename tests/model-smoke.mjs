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
