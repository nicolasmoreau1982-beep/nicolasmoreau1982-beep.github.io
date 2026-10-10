import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(read("../dist/data.js"), context, { filename: "data.js" });
const data = context.window.ECOSIM_DATA;
const scenarios = Object.values(data.politicalScenarios).flat();
const exact = [];
const related = [];

for (const scenario of scenarios) {
  for (const [key, evidence] of Object.entries(scenario.evidence || {})) {
    const [section, id] = key.split(".");
    assert.ok(["changes", "structural", "engines"].includes(section), `${scenario.id}: section inconnue`);
    assert.ok(Object.hasOwn(scenario[section], id), `${scenario.id}: preuve sans réglage ${key}`);
    assert.ok(["exact", "related"].includes(evidence.status), `${scenario.id}: statut de preuve inconnu`);
    if (evidence.status === "exact") {
      assert.equal(evidence.sourceValue, scenario[section][id], `${scenario.id}: valeur source différente du réglage ${key}`);
      assert.equal(evidence.sourceUnit, evidence.modelUnit, `${scenario.id}: grandeur source différente du modèle ${key}`);
      exact.push(`${scenario.id}.${key}`);
    } else {
      assert.notEqual(evidence.sourceUnit, evidence.modelUnit, `${scenario.id}: différence de grandeur non expliquée ${key}`);
      related.push(`${scenario.id}.${key}`);
    }
    assert.match(evidence.url, /^https:\/\//);
    assert.ok(evidence.locator && evidence.sourceTitle && evidence.note, `${scenario.id}: référence incomplète`);
  }
}

assert.deepEqual(exact, []);
assert.deepEqual(related, ["lfi.engines.minimumWage"]);
assert.match(read("../dist/app.js"), /scenario\.evidence\?\.\[row\.key\]/);
assert.match(read("../dist/app.js"), /if \(scenario\.euMode !== "current"\) rows\.push\(\{ key: "euMode"/);
assert.match(read("../dist/app.js"), /Valeur EcoSim non vérifiée dans une source précise/);
assert.match(read("../dist/audit.html"), /Traçabilité mesure par mesure/);
console.log("Programmes : aucune valeur exacte établie ; un rapprochement qualitatif sourcé et différencié.");
