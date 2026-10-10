import assert from "node:assert/strict";
import {accounts, runCoreBacktest, runCoreOrigin, runVat2014Sensitivity,
  runPayroll2019AccountingSensitivity} from "../scripts/core-historical-backtest.mjs";

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
assert.throws(() => runCoreOrigin({originYear: 2013, horizon: 1, changes: {R_UNKNOWN: 4}}), /non représentable/);
const vat = runVat2014Sensitivity();
assert.equal(vat.amountBn, 6.7);
assert.deepEqual(vat.eventIds, ["vat_normal_2014", "vat_intermediate_2014"]);
assert.equal(vat.includedEvents.length, 2);
assert.ok(vat.includedEvents.every((event) => event.source.startsWith("https://")));
assert.ok(vat.excludedEvents.some((event) => event.id === "cice_accounts_2014_2022"));
assert.ok(Math.abs(vat.rows[0].withVat.directRevenueChangeBn - 6.7) < 1e-8,
  "Le rendement ex ante de 2014 doit entrer dans le moteur à 6,7 Md€ nominaux");
assert.ok(vat.rows[0].withVat.deficitRatio < vat.rows[0].withoutVat.deficitRatio,
  "La hausse de TVA doit réduire le déficit simulé la première année");
assert.ok(vat.rows[0].withVat.gdp < vat.rows[0].withoutVat.gdp,
  "La hausse de TVA doit activer le canal PIB du moteur principal");
const vatChangedFuture = runVat2014Sensitivity({observations: changedFuture});
assert.equal(vatChangedFuture.rows[0].withVat.gdp, vat.rows[0].withVat.gdp,
  "Le rendement ex ante ne doit pas être ajusté avec le PIB futur observé");
assert.throws(() => runCoreOrigin({originYear: 2018, horizon: 1,
  accountingFlows: {2020: {revenueBn: -5}}}), /Flux comptable invalide/);
assert.throws(() => runCoreOrigin({originYear: 2018, horizon: 1,
  accountingFlows: {2019: {revenueBn: Infinity}}}), /Flux comptable invalide/);
const deferredFlow = runCoreOrigin({originYear: 2018, horizon: 2,
  accountingFlows: {2020: {spendingBn: 4}}});
const deferredNeutral = runCoreOrigin({originYear: 2018, horizon: 2});
assert.equal(deferredFlow.rows[0].predicted.deficitRatio, deferredNeutral.rows[0].predicted.deficitRatio);
assert.ok(Math.abs(deferredFlow.rows[1].predicted.directSpendingChangeBn - 4) < 1e-8);
const payroll = runPayroll2019AccountingSensitivity();
assert.equal(payroll.event.amountBn, -20.4);
assert.ok(payroll.excluded.some((event) => event.id === "cice_accounts_2014_2022"));
assert.ok(Math.abs(payroll.row.withFlow.directRevenueChangeBn + 20.4) < 1e-8);
assert.equal(payroll.row.withFlow.gdp, payroll.row.withoutFlow.gdp,
  "Un coût comptable sans canal macro ne doit pas créer artificiellement du PIB");
assert.equal(payroll.row.withFlow.unemployment, payroll.row.withoutFlow.unemployment);
assert.ok(Math.abs(payroll.row.withFlow.deficitRatio - payroll.row.withoutFlow.deficitRatio
  - 20.4 / payroll.row.withFlow.gdp * 100) < 1e-8);
const payrollFutureOnly = accounts.map((row) => row.year > 2018
  ? {...row, gdp: row.gdp * 1.5, spending: row.spending * 1.4,
    revenue: row.revenue * 0.9, debt: row.debt * 1.3, unemployment: row.unemployment + 3}
  : {...row});
const payrollChangedFuture = runPayroll2019AccountingSensitivity({observations: payrollFutureOnly});
assert.equal(payrollChangedFuture.row.withFlow.deficitRatio, payroll.row.withFlow.deficitRatio);
console.log("Rétrotest du moteur principal : origine, absence de fuite et scores vérifiés.");
