import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { execFileSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL("dist/fiscal.js", root), "utf8"), context);
const F = context.window.ECOSIM_FISCAL;
assert.equal(F.rules.effectiveFrom, "2026-01-01");
assert.equal(F.rules.wealthFloorProposal.status, "proposition_non_en_vigueur");
assert.equal(F.incomeTax(11600, 1, F.rules), 0);
assert.equal(F.incomeTax(12000, 1, F.rules), 44);
assert.equal(F.realEstateWealthTax(1300000, F.rules), 0);
assert.ok(Math.abs(F.realEstateWealthTax(1310000, F.rules) - 1445) < 1e-7);
assert.equal(F.inheritanceTax(100000, F.rules), 0);
assert.ok(F.inheritanceTax(200000, F.rules) > 0);
assert.throws(() => F.validate({ irTopRate: 200 }), /Paramètre fiscal invalide/);
assert.throws(() => F.validate({ wealthFloorEnabled: 2 }), /Paramètre fiscal invalide/);
assert.equal(F.validate({ wealthFloorEnabled: true }).wealthFloorEnabled, 1);

const reference = F.simulate();
assert.equal(reference.totalBn, 0);
assert.equal(reference.sample.taxUnits, 41500000);
assert.equal(reference.groups.reduce((sum, group) => sum + group.weight, 0), 41500000);
assert.equal(reference.wealthGroups.reduce((sum, group) => sum + group.weight, 0), 41500000);
assert.equal(reference.sample.ifiPayers, 201800);
const redistribution = F.simulate({ ...F.defaults, irLowRate: 5, irTopRate: 50 });
assert.ok(redistribution.groups[0].winners > 0);
assert.ok(redistribution.groups[3].losers > 0);
assert.ok(redistribution.distributionDemandBn > 0);
const floor = F.simulate({ ...F.defaults, wealthFloorEnabled: 1 });
assert.ok(floor.deltaByTax.floor > 0);
assert.equal(floor.groups[4].losers, 1800);
assert.equal(floor.wealthGroups[3].losers, 1800);
assert.ok(F.simulate({ ...F.defaults, wealthFloorEnabled: 1, irTopRate: 50 }).deltaByTax.floor
  < floor.deltaByTax.floor, "Une hausse de l'IR doit réduire l'impôt plancher différentiel");
assert.equal(F.simulate({ ...F.defaults, irTopRate: 50, startYear: 2030 }, 2026).totalBn, 0);
assert.ok(F.simulate({ ...F.defaults, irTopRate: 50, startYear: 2030 }, 2030).totalBn > 0);

function simulate(input) {
  return JSON.parse(execFileSync("node", ["scripts/simulate.mjs"], {
    cwd: new URL("../", import.meta.url), input: JSON.stringify(input), encoding: "utf8"
  }));
}
const noReform = simulate({});
const macro = simulate({ fiscal: { wealthFloorEnabled: 1 } });
const dated = simulate({ fiscal: { wealthFloorEnabled: 1, startYear: 2030 } });
assert.equal(noReform.scenario[0].fiscal.totalBn, 0);
assert.equal(dated.scenario[0].fiscal.totalBn, 0);
assert.ok(dated.scenario[4].fiscal.totalBn > 0);
assert.ok(Math.abs(macro.scenario[0].revenueChange - macro.scenario[0].fiscal.totalBn) < 1e-8);
assert.ok(macro.scenario[0].fiscal.distributionDemandBn < 0);
assert.ok(macro.scenario[0].deficit < noReform.scenario[0].deficit);
assert.equal(macro.assumptions.fiscal.wealthFloorEnabled, 1);
const ui = fs.readFileSync(new URL("dist/index.html", root), "utf8");
for (const id of ["fiscal", "fiscal-control-list", "fiscal-total", "fiscal-groups", "fiscal-wealth-groups", "fiscal-warning"]) {
  assert.match(ui, new RegExp(`id="${id}"`));
}
assert.ok(ui.indexOf('src="fiscal.js"') < ui.indexOf('src="app.js"'));
const app = fs.readFileSync(new URL("dist/app.js", root), "utf8");
assert.match(app, /distributionDemandBn \* profile\.taxScale/);
assert.match(app, /fiscal: \{ \.\.\.state\.fiscal \}/);
console.log("Fiscalité : barèmes, seuils, impôt plancher différentiel, pondérations et remontée macro vérifiés.");
