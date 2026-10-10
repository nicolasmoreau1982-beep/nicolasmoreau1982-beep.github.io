import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {accounts, modelParameters, policyTimeline, runHistoricalDiagnostics, summarizeHistoricalDiagnostics} from "../scripts/historical-replay.mjs";
import {compareHistory, originSnapshot, policyLevel, simulateHistory} from "../scripts/historical-engine.mjs";
import {policyLevelAtQuarter, simulateQuarterlyHistory} from "../scripts/historical-quarterly-engine.mjs";

assert.equal(accounts.length, 23);
assert.equal(accounts[0].year, 2003);
assert.equal(accounts.at(-1).year, 2025);
assert.equal(accounts.at(-1).spending, 1714.1117);
assert.equal(accounts.at(-1).revenue, 1562.5197);
assert.ok(Math.abs(accounts.at(-1).spending - accounts.at(-1).revenue - 151.592) < 1e-8);
for (const year of [2005, 2010, 2015, 2020]) {
  const snapshot = originSnapshot(accounts, year);
  assert.equal(snapshot.year, year);
  assert.ok(snapshot.trainingYears.every((trainingYear) => trainingYear <= year));
}

const results = runHistoricalDiagnostics();
assert.deepEqual(results.map((item) => item.horizon), [5, 10, 15, 20]);
for (const item of results) {
  assert.equal(item.coverage, "incomplete");
  assert.equal(item.target.year, 2025);
  assert.equal(item.projection.length, item.horizon);
  assert.equal(item.compared.length, item.horizon);
  assert.ok(item.compared.every((row) => row.observed && row.error));
  for (const row of item.projection) {
    assert.ok(Math.abs(row.deficit - (row.spending - row.revenue)) < 1e-8);
    assert.ok(Number.isFinite(row.gdp) && Number.isFinite(row.debt));
  }
}
assert.equal(policyTimeline.events.filter((event) => event.instrument === "vat").length, 2);
assert.equal(policyTimeline.checks[0].modelInputBn, 6.7);
assert.equal(policyTimeline.checks[0].observedBn, 6.5);
assert.equal(results.find((item) => item.originYear === 2010).projection.find((row) => row.year === 2014).directSpending, 10.2);
assert.equal(results.find((item) => item.originYear === 2010).projection.find((row) => row.year === 2014).directRevenue, 6.7);
const conversion2019 = results.find((item) => item.originYear === 2010).projection.find((row) => row.year === 2019);
assert.equal(conversion2019.directRevenue, 6.7 - 20.4);
assert.ok(conversion2019.applied.some((event) => event.id === "cice_payroll_conversion_2019" && event.effectScope === "fiscal_only_macro_unestimated"));
assert.equal(summarizeHistoricalDiagnostics(results)[0].years, 5);
const ablated = summarizeHistoricalDiagnostics(runHistoricalDiagnostics({events: []}));
assert.ok(summarizeHistoricalDiagnostics(results)[1].mae.deficitRatio > ablated[1].mae.deficitRatio,
  "L'ablation doit révéler qu'un meilleur ajustement n'est pas automatique");
assert.ok(results[0].missingPolicies.some((event) => event.id === "energy_shields_2022"));
assert.ok(!results[0].missingPolicies.some((event) => event.id === "stimulus_2009"));
const quarterlyResults = runHistoricalDiagnostics({frequency: "quarterly"});
assert.deepEqual(quarterlyResults.map((item) => item.quarters.length), [20, 40, 60, 80]);
for (const item of quarterlyResults) for (const row of item.projection) {
  const period = item.quarters.filter((quarter) => quarter.year === row.year);
  assert.ok(Math.abs(period.reduce((sum, quarter) => sum + quarter.spending, 0) - row.spending) < 1e-8);
  assert.ok(Math.abs(period.reduce((sum, quarter) => sum + quarter.revenue, 0) - row.revenue) < 1e-8);
  assert.ok(Math.abs(period.reduce((sum, quarter) => sum + quarter.deficit, 0) - row.deficit) < 1e-8);
  assert.equal(period.at(-1).debt, row.debt);
}
const midYear = {id: "midyear", effectiveYear: 2014, effectiveQuarter: 3, endYear: 2015, endQuarter: 2,
  fiscalSide: "revenue", instrument: "tax", amountBn: 12, amountInformationYear: 2010};
assert.deepEqual([1, 2, 3, 4].map((quarter) => policyLevelAtQuarter(midYear, 2014, quarter)), [0, 0, 12, 12]);
const midYearProjection = simulateQuarterlyHistory({originYear: 2010, horizon: 6, accounts, events: [midYear],
  responses: {tax: {1: -0.5, 2: -0.25}}, parameters: modelParameters});
assert.deepEqual(midYearProjection.quarters.filter((row) => row.year === 2014).map((row) => row.directRevenue), [0, 0, 3, 3]);
assert.equal(midYearProjection.rows.find((row) => row.year === 2014).directRevenue, 6);
assert.equal(midYearProjection.rows.find((row) => row.year === 2014).policyGdp, -3);
assert.equal(midYearProjection.rows.find((row) => row.year === 2015).directRevenue, 6);
assert.equal(midYearProjection.rows.find((row) => row.year === 2016).directRevenue, 0);
const firstQuarter = simulateQuarterlyHistory({originYear: 2010, horizon: 4, accounts,
  events: [{...midYear, effectiveQuarter: 1, endYear: undefined}],
  responses: {tax: {1: -0.5}}, parameters: modelParameters});
assert.equal(firstQuarter.rows.at(-1).directRevenue, 12);
assert.equal(firstQuarter.rows.at(-1).policyGdp, -6);
const partialOrigin = simulateQuarterlyHistory({originYear: 2014, horizon: 1, accounts,
  events: [midYear], responses: {tax: {1: -0.5}}, parameters: modelParameters});
assert.equal(partialOrigin.rows[0].directRevenue, 0,
  "Une mesure déjà partiellement présente dans l'année d'origine utilise son exposition moyenne");
const scheduledQuarter = {...midYear, effectiveQuarter: 1, endYear: undefined, annualAmountBn: {2014: 10},
  quarterlyAmountBn: {"2014-Q3": 20}};
assert.equal(policyLevelAtQuarter(scheduledQuarter, 2015, 1), 20);
const scheduledProjection = simulateQuarterlyHistory({originYear: 2010, horizon: 4, accounts,
  events: [scheduledQuarter], responses: {tax: {1: -0.5}}, parameters: modelParameters});
assert.equal(scheduledProjection.rows.at(-1).directRevenue, 15);
assert.throws(() => policyLevelAtQuarter({...midYear, effectiveQuarter: 5}, 2014, 1), /effectiveQuarter/);

const auditContext = {window: {}};
vm.runInNewContext(fs.readFileSync(new URL("../dist/historical-audit-data.js", import.meta.url), "utf8"), auditContext);
const audit = auditContext.window.ECOSIM_HISTORICAL_AUDIT;
assert.equal(audit.trajectories.length, 4);
assert.deepEqual(Array.from(audit.trajectories, (item) => item.annual.length), [5, 10, 15, 20]);
assert.deepEqual(Array.from(audit.quarterlyTrajectories, (item) => item.quarters.length), [20, 40, 60, 80]);
assert.equal(audit.trajectories[0].annual.at(-1).error.debtRatio,
  Math.round(results[0].target.error.debtRatio * 100) / 100);
assert.equal(audit.quarterlyTrajectories[0].annual.at(-1).error.debtRatio,
  Math.round(quarterlyResults[0].target.error.debtRatio * 100) / 100);

const events = [{id: "test", effectiveYear: 2006, fiscalSide: "revenue", instrument: "test",
  amountBn: 10, annualAmountBn: {2006: 10, 2007: 20, 2008: 5}, endYear: 2008}];
assert.deepEqual([2005, 2006, 2007, 2008, 2009].map((year) => policyLevel(events[0], year)), [0, 10, 20, 5, 0]);
const base = simulateHistory({originYear: 2005, horizon: 4, accounts, events: [], parameters: modelParameters});
const withPolicy = simulateHistory({originYear: 2005, horizon: 4, accounts, events,
  responses: {test: {1: -0.5, 2: -0.25, 3: -0.1, 4: 0}}, parameters: modelParameters});
assert.deepEqual(withPolicy.rows.map((row) => row.directRevenue), [10, 20, 5, 0]);
assert.equal(withPolicy.rows[0].policyGdp, -5);
assert.equal(withPolicy.rows[1].policyGdp, -7.5);
assert.equal(withPolicy.rows[2].policyGdp, 4);
assert.equal(withPolicy.rows[3].policyGdp, 5.25);
assert.ok(withPolicy.rows[0].revenue > base.rows[0].revenue);
const preExisting = simulateHistory({originYear: 2006, horizon: 3, accounts, events,
  responses: {test: {1: -0.5, 2: -0.25, 3: -0.1}}, parameters: modelParameters});
assert.deepEqual(preExisting.rows.map((row) => row.directRevenue), [10, -5, -10],
  "Les variations d'une mesure préexistante sont calculées par rapport au niveau présent à l'origine");
const withInterest = simulateHistory({originYear: 2005, horizon: 2, accounts, events,
  responses: {test: {1: -0.5, 2: -0.25}}, parameters: modelParameters,
  context: {2007: {interestRate: 0.04}}});
assert.equal(withInterest.rows[0].extraInterest, 0);
assert.ok(Math.abs(withInterest.rows[1].extraInterest) > 0, "La dette supplémentaire doit affecter les intérêts l'année suivante");

const changedFuture = accounts.map((row) => row.year > 2005
  ? {...row, gdp: row.gdp * 50, spending: row.spending * 50, debt: row.debt * 50} : row);
const unchanged = simulateHistory({originYear: 2005, horizon: 4, accounts: changedFuture, events,
  responses: {test: {1: -0.5, 2: -0.25, 3: -0.1, 4: 0}}, parameters: modelParameters});
assert.deepEqual(unchanged.rows, withPolicy.rows, "Aucune observation future ne doit entrer dans la projection");
const unchangedQuarterly = simulateQuarterlyHistory({originYear: 2005, horizon: 4, accounts: changedFuture,
  events: [midYear], responses: {tax: {1: -0.5}}, parameters: modelParameters});
const referenceQuarterly = simulateQuarterlyHistory({originYear: 2005, horizon: 4, accounts,
  events: [midYear], responses: {tax: {1: -0.5}}, parameters: modelParameters});
assert.deepEqual(unchangedQuarterly.rows, referenceQuarterly.rows,
  "Le rejeu trimestriel ne doit pas lire les comptes postérieurs à l'origine");
const differentComparison = compareHistory(withPolicy, changedFuture);
assert.notEqual(differentComparison[0].error.gdpPct, compareHistory(withPolicy, accounts)[0].error.gdpPct);

const blind = simulateHistory({originYear: 2010, horizon: 5, accounts, events: [{...events[0], effectiveYear: 2012,
  amountInformationYear: 2013}], responses: {test: {1: -0.5}}, parameters: modelParameters,
  informationSet: "origin"});
assert.ok(blind.rows.every((row) => row.directRevenue === 0 && row.policyGdp === 0));
assert.deepEqual(blind.excludedPolicies.map((item) => item.id), ["test"]);
assert.throws(() => simulateHistory({originYear: 2005, horizon: 1, accounts, parameters: modelParameters,
  informationSet: "origin", context: {2006: {nominalGrowth: 0.02, knownByYear: 2007}}}), /inconnu à l'origine/);
assert.throws(() => simulateQuarterlyHistory({originYear: 2005, horizon: 1, accounts,
  parameters: modelParameters, informationSet: "origin",
  context: {2006: {quarters: {3: {spendingShockBn: 2}}, knownByYear: 2007}}}), /inconnu à l'origine/);

assert.throws(() => simulateHistory({originYear: 2005, horizon: 0, accounts, parameters: modelParameters}), /Horizon invalide/);
assert.throws(() => simulateHistory({originYear: 2005, horizon: 1, accounts, parameters: modelParameters,
  context: {2006: {nominalGrowth: -1.1}}}), /Croissance impossible/);
console.log("Rejeu historique : horizons 5/10/15/20, mesures variables, comptabilité et anti-fuite vérifiés.");
