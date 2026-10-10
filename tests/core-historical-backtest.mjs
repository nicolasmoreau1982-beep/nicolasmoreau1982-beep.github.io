import assert from "node:assert/strict";
import {accounts, runCoreBacktest, runCoreOrigin} from "../scripts/core-historical-backtest.mjs";

const one = runCoreOrigin({originYear: 2013, horizon: 3});
assert.deepEqual(Array.from(one.rows, (row) => row.year), [2014, 2015, 2016]);
assert.ok(one.rows.every((row) => Object.values(row.error).every(Number.isFinite)));
assert.ok(one.rows.every((row) => Math.abs(row.predicted.gdp - row.actual.gdp) > 0.01),
  "Le calcul ne doit pas copier les cibles futures");

const changedFuture = accounts.map((row) => row.year > 2013
  ? {...row, gdp: row.gdp * 1.5, spending: row.spending * 1.4,
    revenue: row.revenue * 0.9, debt: row.debt * 1.3, unemployment: row.unemployment + 3}
  : {...row});
const altered = runCoreOrigin({originYear: 2013, horizon: 3, observations: changedFuture});
assert.deepEqual(JSON.parse(JSON.stringify(altered.rows.map((row) => row.predicted))),
  JSON.parse(JSON.stringify(one.rows.map((row) => row.predicted))),
  "Modifier les observations futures ne doit pas modifier la prévision");
assert.notDeepEqual(JSON.stringify(altered.rows.map((row) => row.error)), JSON.stringify(one.rows.map((row) => row.error)));

const report = runCoreBacktest();
assert.equal(report.status, "core_engine_retrospective_baseline_only_not_validated");
assert.deepEqual(report.table.map((row) => row.horizon), [1, 3, 5, 10]);
assert.deepEqual(report.table.map((row) => row.n), [6, 6, 6, 4]);
for (const row of report.table) {
  for (const key of ["gdpPct", "deficitRatio", "debtRatio", "unemployment"]) {
    assert.ok(Number.isFinite(row.coreMae[key]));
    assert.ok(Math.abs(row.coreMae[key] - row.naiveMae[key]) < 1e-8,
      "Sans politique ni choc nouveau, le moteur central doit égaler sa trajectoire témoin");
  }
}
assert.throws(() => runCoreOrigin({originYear: 2025, horizon: 1}), /incomplètes/);
console.log("Rétrotest du moteur principal : origine, absence de fuite et scores vérifiés.");
