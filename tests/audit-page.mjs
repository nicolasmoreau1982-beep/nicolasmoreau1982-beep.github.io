import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {benchmark} from "../scripts/benchmark-research.mjs";
import {auditPolicyHistory} from "../scripts/policy-history.mjs";
import {vintageAudit} from "../scripts/vintage-audit.mjs";
import {runHistoricalDiagnostics} from "../scripts/historical-replay.mjs";
import {runComparableBenchmark} from "../scripts/comparable-insee-benchmark.mjs";
import {runCoreBacktest, runVat2014Sensitivity,
  runPayroll2019AccountingSensitivity} from "../scripts/core-historical-backtest.mjs";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const page = read("../dist/audit.html");
const home = read("../dist/index.html");
const script = read("../dist/audit.js");

assert.match(home, /href="audit\.html"/);
assert.match(page, /href="index\.html#workspace"/);
for (const id of ["verdict","provenance","methode","histoire","recherche","incertitude","reproduire","limites"]) {
  assert.match(page, new RegExp(`id="${id}"`));
  assert.match(page, new RegExp(`href="#${id}"`));
}
for (const id of ["modele", "profils", "politique", "fiscalite"]) {
  assert.match(page, new RegExp(`id="${id}"`));
}
assert.match(page, /Un simulateur conditionnel, pas une prévision officielle/);
assert.match(page, /Trois exercices distincts figurent ci-dessous/);
assert.match(page, /Aucune revue indépendante de ce banc n’a été réalisée/);
assert.match(page, /La couverture probabiliste des fourchettes EcoSim n’est pas établie/);
assert.match(page, /audit-status-explainer/);
assert.doesNotMatch(page, /\b(?:désormais|maintenant|auparavant|nouveaux contrôles)\b/i);
assert.ok(page.indexOf('src="history.js"') < page.indexOf('src="audit.js"'));
assert.ok(page.indexOf('src="historical-audit-data.js"') < page.indexOf('src="audit.js"'));
assert.match(page, /id="audit-year-body"/);
assert.match(page, /id="audit-frequency"/);
assert.match(page, /id="audit-quarter-body"/);
for (const id of ["audit-subsector-body", "audit-labour-body", "audit-population-body", "audit-tes-body"]) {
  assert.match(page, new RegExp(`id="${id}"`));
}
assert.match(script, /trajectory\.annual\.map/);
assert.match(script, /data\.quarterlyTrajectories/);
assert.match(script, /history\.report\[horizon\]/);
assert.match(page, /pas une validation indépendante/i);
assert.match(page, /pas des intervalles de confiance/i);
assert.match(page, /non représentable/i);
assert.match(page, /millésimes à ne pas mélanger/i);
assert.match(page, /1 562,5 Md€/);
assert.match(home, /audit\.html#provenance/);
assert.match(page, /id="fiscalite"/);
assert.match(page, /moteur fiscal expérimental/i);
assert.match(page, /paramètres légaux individuels non calculés/i);
assert.match(page, /id="banc-insee"/);
assert.match(page, /n’a pas fait l’objet d’une revue externe/);
for (const id of ["audit-triplet", "audit-comparable-case", "audit-comparable-year",
  "audit-comparable-origin", "audit-comparable-policies", "audit-comparable-missing",
  "audit-comparable-results", "audit-comparable-summary"]) {
  assert.match(page, new RegExp(`id="${id}"`));
}
assert.match(home, /audit\.html#audit-triplet/);
assert.match(home, /audit\.html#incertitude/);
assert.match(page, /id="moteur-principal-historique"/);
const coreReport = runCoreBacktest();
for (const row of coreReport.table) {
  const format = (value) => value.toFixed(2).replace(".", ",");
  for (const metric of ["gdpPct", "deficitRatio", "debtRatio", "unemployment"]) {
    assert.ok(page.includes(format(row.coreMae[metric])), `MAE moteur principal absente : ${row.horizon} ans, ${metric}`);
  }
}
assert.match(page, /id="core-debt-reconciliation"/);
for (const row of coreReport.debtDecomposition) {
  for (const key of ["debtErrorMaeBn", "cumulativeDeficitErrorMaeBn", "unmodelledStockFlowMaeBn"]) {
    assert.ok(page.includes(row[key].toFixed(1).replace(".", ",")),
      `Décomposition de dette absente : ${row.horizon} ans, ${key}`);
  }
}
assert.ok(page.includes("−0,638 Md€"));
assert.match(page, /id="nature-historique"/);
assert.match(page, /id="core-nature-comparison"/);
for (const row of coreReport.natureReference.table) {
  for (const metric of ["spendingBn", "revenueBn", "deficitRatio"]) {
    const aggregate = row.aggregateMae[metric].toFixed(1).replace(".", ",");
    const byNature = row.natureMae[metric].toFixed(1).replace(".", ",");
    assert.ok(page.includes(`${aggregate} / ${byNature}`),
      `Comparaison par nature absente : ${row.horizon} ans, ${metric}`);
  }
}
const coreVat = runVat2014Sensitivity().rows[0];
for (const value of [coreVat.withVatError.gdpPct, coreVat.withoutVatError.gdpPct]) {
  const formatted = `${value < 0 ? "−" : "+"}${Math.abs(value).toFixed(2).replace(".", ",")} %`;
  assert.ok(page.includes(formatted), `Sensibilité TVA du moteur principal absente : ${formatted}`);
}
const payrollErrors = runPayroll2019AccountingSensitivity().row;
for (const value of [payrollErrors.withFlowError.deficitRatio, payrollErrors.withoutFlowError.deficitRatio]) {
  const formatted = `${value < 0 ? "−" : "+"}${Math.abs(value).toFixed(2).replace(".", ",")} point`;
  assert.ok(page.includes(formatted), `Sensibilité comptable 2019 absente : ${formatted}`);
}
assert.match(page, /Aucun effet causal ni intervalle par levier/);
assert.match(script, /data\.cases\.find/);
const comparable = runComparableBenchmark();
for (const item of comparable.cases) {
  const first = item.rows[0];
  assert.ok(page.includes(`${item.originYear} → ${first.year}`));
  const gdpError = `${first.error.gdpPct < 0 ? "−" : "+"}${Math.abs(first.error.gdpPct).toFixed(2).replace(".", ",")} %`;
  assert.ok(page.includes(gdpError), `Écart Insee absent : ${item.id}`);
}

const historyContext = {window:{}};
vm.runInNewContext(read("../dist/history.js"), historyContext);
const report = historyContext.window.ECOSIM_HISTORY.report;
assert.deepEqual([1,3,5,10].map((horizon) => report[horizon].n), [18,16,14,9]);

const vat = benchmark().find((item) => item.id === "vat");
for (const row of vat.rows) {
  const format = (value) => (value < 0 ? "−" : "+") + Math.abs(value).toFixed(2).replace(".", ",");
  assert.ok(page.includes(format(row.ecosimRealPct)), `Résultat TVA EcoSim absent : ${row.horizon} ans`);
}
assert.ok(page.includes("+1,47 point"));
const policy = auditPolicyHistory();
assert.equal(policy.find((item) => item.id === "cice_2014").status, "non_representable");
assert.ok(page.includes("9,17 Md€"));
for (const vintage of vintageAudit()) assert.ok(page.includes(`${vintage.error.toFixed(1).replace(".", ",")} pt`));
const auditContext = {window: {}};
vm.runInNewContext(read("../dist/historical-audit-data.js"), auditContext);
const auditRows = auditContext.window.ECOSIM_HISTORICAL_AUDIT.trajectories;
const comparableWeb = auditContext.window.ECOSIM_HISTORICAL_AUDIT.comparableInsee;
assert.equal(comparableWeb.sourceVintage, comparable.sourceVintage);
assert.equal(comparableWeb.reviewedByIndependentParty, false);
assert.equal(comparableWeb.cases.length, comparable.cases.length);
for (const item of comparable.cases) {
  const exported = comparableWeb.cases.find((entry) => entry.id === item.id);
  assert.ok(exported, `Cas Insee non exporté : ${item.id}`);
  assert.equal(exported.eligibility, "not_eligible_for_policy_effect_validation");
  assert.equal(exported.origin.gdp, item.origin.gdp);
  assert.equal(exported.rows.length, item.rows.length);
  for (const row of item.rows) {
    const published = exported.rows.find((entry) => entry.year === row.year);
    assert.equal(JSON.stringify(published.error), JSON.stringify(row.error));
    assert.equal(published.observed.gdp, row.observed.gdp);
    assert.equal(published.predicted.applied.length, row.predicted.applied.length);
    assert.equal(JSON.stringify(published.uncovered.map((entry) => entry.id)), JSON.stringify(row.uncovered));
  }
}
assert.equal(auditContext.window.ECOSIM_HISTORICAL_AUDIT.labour.totals.unemployedK, 2451.2);
assert.equal(auditContext.window.ECOSIM_HISTORICAL_AUDIT.tes.rows.length, 17);
assert.equal(auditContext.window.ECOSIM_HISTORICAL_AUDIT.population.rows.length, 6);
for (const diagnostic of runHistoricalDiagnostics()) {
  assert.ok(page.includes(`${diagnostic.originYear} · ${diagnostic.horizon} ans`));
  const exported = auditRows.find((row) => row.originYear === diagnostic.originYear);
  assert.equal(exported.annual.length, diagnostic.horizon);
  const error = diagnostic.target.error;
  for (const key of ["gdpPct", "spendingBn", "revenueBn", "deficitRatio", "debtRatio"]) {
    assert.equal(exported.annual.at(-1).error[key], Math.round(error[key] * 100) / 100,
      `Écart de rejeu absent : ${diagnostic.originYear}, ${key}`);
  }
}

console.log("Annexe d’audit : navigation, provenance, avertissements et résultats chiffrés cohérents.");
