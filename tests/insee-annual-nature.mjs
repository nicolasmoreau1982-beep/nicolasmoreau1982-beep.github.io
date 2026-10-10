import assert from "node:assert/strict";
import fs from "node:fs";
import {natureAccounts, runCoreOrigin, runNatureCandidateBacktest} from "../scripts/core-historical-backtest.mjs";

const read = (name) => JSON.parse(fs.readFileSync(new URL(`../research/${name}`, import.meta.url), "utf8"));
const nature = read("insee-annual-nature.json");
const totals = read("insee-validation-annual.json");
assert.equal(nature.sourceSha256, totals.sources.accounts.sha256);
assert.equal(nature.rows.length, totals.rows.length);
assert.equal(nature.spendingCategories.length, 14);
assert.equal(nature.revenueCategories.length, 14);
for (const [index, row] of nature.rows.entries()) {
  const total = totals.rows[index];
  assert.equal(row.year, total[0]);
  assert.ok(Math.abs(row.totalSpendingBn - total[3]) < 0.00011);
  assert.ok(Math.abs(row.totalRevenueBn - total[4]) < 0.00011);
  assert.ok(Math.abs(Object.values(row.spending).reduce((a, b) => a + b, 0)
    - row.totalSpendingBn - row.spendingResidualBn) < 1e-7);
  assert.ok(Math.abs(Object.values(row.revenue).reduce((a, b) => a + b, 0)
    - row.totalRevenueBn - row.revenueResidualBn) < 1e-7);
  assert.ok(Math.abs(row.spendingResidualBn) <= 0.0011);
  assert.ok(Math.abs(row.revenueResidualBn) <= 0.0011);
}

const base = runCoreOrigin({originYear: 2013, horizon: 3, baselineMode: "nature_median_share"});
assert.equal(Object.keys(base.inputs.categoryShares.spending).length, 14);
assert.ok(base.rows.every((row) => Number.isFinite(row.referenceAccounts.spendingBn)));
const futureChanged = natureAccounts.map((row) => row.year > 2013
  ? {...row, spending: {...row.spending, S_D62: row.spending.S_D62 * 2}} : {...row});
const unchanged = runCoreOrigin({originYear: 2013, horizon: 3,
  baselineMode: "nature_median_share", natureObservations: futureChanged});
assert.deepEqual(JSON.parse(JSON.stringify(unchanged.rows.map((row) => row.predicted))),
  JSON.parse(JSON.stringify(base.rows.map((row) => row.predicted))),
  "Changer une catégorie observée après l'origine ne doit pas modifier la simulation");
assert.throws(() => runCoreOrigin({originYear: 2013, horizon: 1, baselineMode: "inconnu"}), /inconnue/);

const report = runNatureCandidateBacktest();
assert.equal(report.status, "exploratory_reference_candidate_not_adopted");
assert.deepEqual(report.table.map((row) => row.n), [6, 6, 6, 4]);
assert.ok(report.table[0].natureMae.spendingBn > report.table[0].aggregateMae.spendingBn,
  "La variante par nature ne doit pas être promue sans examen de son erreur à un an");
assert.equal(report.topCategoryErrors1Year[0].id, "S_D62");
console.log("Insee 3.201 par nature : 28 postes, totaux, anti-fuite et comparaison vérifiés.");
