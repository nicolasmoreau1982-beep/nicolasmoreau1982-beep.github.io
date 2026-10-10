import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const dataContext = {window:{}};
vm.runInNewContext(fs.readFileSync(new URL("../dist/data.js", import.meta.url), "utf8"), dataContext);
vm.runInNewContext(fs.readFileSync(new URL("../dist/insee-projection.js", import.meta.url), "utf8"), dataContext);
vm.runInNewContext(fs.readFileSync(new URL("../dist/fiscal.js", import.meta.url), "utf8"), dataContext);
const controls = dataContext.window.ECOSIM_DATA.structural.controls;
const engineControls = dataContext.window.ECOSIM_DATA.policyEngines.controls;
const app = fs.readFileSync(new URL("../dist/app.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");

const start = app.indexOf("  function structuralIdsForTab(tab)");
const end = app.indexOf("  function structuralControlMarkup(id)", start);
assert.ok(start >= 0 && end > start);
const context = {};
vm.runInNewContext(`${app.slice(start, end)}\nglobalThis.ids = structuralIdsForTab;`, context);
const policyIds = ["demography","migration","employment","securityJobs","serviceJobs","energy"]
  .flatMap((tab) => context.ids(tab));
assert.equal(new Set(policyIds).size, policyIds.length, "Un réglage ne doit pas apparaître deux fois");
for (const id of policyIds) {
  assert.ok(controls[id], `Réglage inconnu : ${id}`);
  assert.notEqual(controls[id].kind, "assumption", `L'hypothèse ${id} est dans les décisions principales`);
}
const assumptionIds = Object.entries(controls).filter(([, control]) => control.kind === "assumption").map(([id]) => id);
const assumptionsCode = app.slice(app.indexOf("  function renderScenarioAssumptions()"), app.indexOf("  function updateDerivedPanel()"));
for (const id of assumptionIds) assert.ok(assumptionsCode.includes(`"${id}"`), `Hypothèse avancée absente : ${id}`);
assert.match(html, /id="structural-assumptions"/);
assert.match(html, /id="structural-assumption-list"/);
assert.match(app, /derived-births/);
assert.match(app, /derived-fertility/);
for (const id of ["laborParticipation","productivity","retirementAge","careEfficiency","fraudRecovery"]) {
  assert.equal(engineControls[id].kind, "assumption", `Résultat visé ${id} non distingué des mesures`);
}
assert.equal(engineControls.childcarePlaces.kind, undefined);
assert.match(app, /class="engine-assumptions"/);

console.log("Entrées : décisions, hypothèses avancées et résultats séparés dans l’IHM.");
