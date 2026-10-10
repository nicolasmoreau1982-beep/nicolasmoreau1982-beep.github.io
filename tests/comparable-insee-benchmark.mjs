import assert from "node:assert/strict";
import {inseeAccounts, runComparableBenchmark} from "../scripts/comparable-insee-benchmark.mjs";

assert.equal(inseeAccounts.length, 23);
assert.equal(inseeAccounts[0].year, 2003);
assert.equal(inseeAccounts.at(-1).year, 2025);
assert.equal(inseeAccounts.at(-1).gdp, 2991.056);
assert.equal(inseeAccounts.at(-1).debt, 3460.1);
for (const row of inseeAccounts) {
  assert.ok(Math.abs(row.deficitRatio - (row.spending - row.revenue) / row.gdp * 100) < 1e-10);
  assert.ok(Math.abs(row.debtRatio - row.debt / row.gdp * 100) < 1e-10);
}
const case2014 = inseeAccounts.find((row) => row.year === 2014);
const case2013 = inseeAccounts.find((row) => row.year === 2013);
const bridgeResidual2014 = case2014.debt - case2013.debt
  - (case2014.spending - case2014.revenue) - case2014.officialStockFlow;
assert.ok(Math.abs(bridgeResidual2014 + 0.638) < 0.002,
  "La discordance entre tableaux Insee doit être conservée, pas forcée à zéro");

const benchmark = runComparableBenchmark();
assert.equal(benchmark.reviewedByIndependentParty, false);
assert.match(benchmark.modelEvaluated, /prototype distinct/);
assert.deepEqual(benchmark.cases.map((item) => item.originYear), [2013, 2018, 2020]);
assert.deepEqual(benchmark.cases.map((item) => item.rows.length), [3, 2, 2]);
assert.ok(benchmark.cases.every((item) => item.eligibility === "not_eligible_for_policy_effect_validation"));
const vat = benchmark.cases[0];
assert.equal(vat.origin.gdp, case2013.gdp);
assert.equal(vat.origin.debt, case2013.debt);
assert.ok(vat.excludedPolicies.some((item) => item.id === "cice_accounts_2014_2022"));
assert.equal(vat.rows[0].predicted.directRevenue, 6.7);
assert.equal(vat.rows[0].predicted.directSpending, 0);
assert.equal(benchmark.vat2014YieldCheck.differenceBn, 0.20000000000000018);
assert.ok(benchmark.cases[1].missingPolicies.some((item) => item.id === "cice_conversion_macro_2019"));
assert.ok(benchmark.cases[2].missingPolicies.some((item) => item.id === "energy_shields_2022"));
for (const item of benchmark.cases) for (const row of item.rows) {
  assert.ok(Math.abs(row.predicted.deficit - (row.predicted.spending - row.predicted.revenue)) < 1e-8);
  assert.equal(row.coverage, "partial_not_causal");
  assert.ok(Number.isFinite(row.error.spendingBn) && Number.isFinite(row.error.debtRatio));
}

// Modifier les cibles futures ne doit jamais modifier les prévisions.
const corruptedFuture = inseeAccounts.map((row) => row.year > 2013
  ? {...row, gdp: row.gdp * 2, spending: row.spending * 2, revenue: row.revenue * 2,
    debt: row.debt * 2, deficitRatio: row.deficitRatio, debtRatio: row.debtRatio} : row);
const changed = runComparableBenchmark({accounts: corruptedFuture});
assert.equal(changed.cases[0].rows[0].predicted.gdp, vat.rows[0].predicted.gdp);
assert.notEqual(changed.cases[0].rows[0].error.gdpPct, vat.rows[0].error.gdpPct);

console.log("Banc Insee comparable : données, couverture, identité, anti-fuite et statut indépendant vérifiés.");
