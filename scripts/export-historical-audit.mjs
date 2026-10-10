import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {observedSourceReconciliation, policyTimeline, runHistoricalDiagnostics, summarizeHistoricalDiagnostics} from "./historical-replay.mjs";
import {quarterlySource, subsectorObservations, subsectorSource} from "./insee-observations.mjs";
import {runComparableBenchmark} from "./comparable-insee-benchmark.mjs";

const destination = new URL("../dist/historical-audit-data.js", import.meta.url);
const readResearch = (name) => JSON.parse(fs.readFileSync(new URL(`../research/${name}`, import.meta.url), "utf8"));
const labour = readResearch("insee-labour-2025.json");
const tes = readResearch("insee-tes-2024.json");
const population = readResearch("insee-population-projection.json");
const policyInventory = readResearch("historical-event-inventory.json");
const policyById = new Map([...policyTimeline.events, ...policyInventory.events].map((event) => [event.id, event]));
const comparable = runComparableBenchmark();
const results = runHistoricalDiagnostics();
const quarterlyResults = runHistoricalDiagnostics({frequency: "quarterly"});
const round = (value) => Math.round(value * 100) / 100;
const exportTrajectories = (input) => input.map((result) => ({
  originYear: result.originYear,
  summary: summarizeHistoricalDiagnostics([result])[0],
  annual: result.compared.map(({year, observed, prediction, error}) => ({
    year,
    observed: {gdp: round(observed.gdp), spending: round(observed.spending),
      revenue: round(observed.revenue), deficitRatio: round(observed.deficitRatio),
      debtRatio: round(observed.debtRatio), unemployment: round(observed.unemployment)},
    prediction: {gdp: round(prediction.gdp), spending: round(prediction.spending),
      revenue: round(prediction.revenue), deficitRatio: round(prediction.deficitRatio),
      debtRatio: round(prediction.debtRatio), unemployment: round(prediction.unemployment)},
    error: Object.fromEntries(Object.entries(error).map(([key, value]) => [key, round(value)]))
  })),
  quarters: result.comparedQuarters?.map(({year, quarter, observed, prediction, error}) => ({year, quarter,
    observed: observed && {gdp: round(observed.gdp), spending: round(observed.spending),
      revenue: round(observed.revenue), deficit: round(-observed.balance),
      interest: round(observed.interest), publicCompensation: round(observed.publicCompensation)},
    prediction: {gdp: round(prediction.gdp), spending: round(prediction.spending),
      revenue: round(prediction.revenue), deficit: round(prediction.deficit), debt: round(prediction.debt),
      directSpending: round(prediction.directSpending), directRevenue: round(prediction.directRevenue)},
    error: error && Object.fromEntries(Object.entries(error).map(([key, value]) => [key, round(value)]))
  }))
}));
const payload = {
  status: "incomplete",
  informationSet: "retrospective",
  policyChecks: policyTimeline.checks,
  source: "https://www.insee.fr/fr/statistiques/8988845",
  quarterlyObservedSource: quarterlySource.sourcePage,
  quarterlyObservedPublished: quarterlySource.published,
  subsectorSource: subsectorSource.sourcePage,
  sourceReconciliation: observedSourceReconciliation.map((row) => ({...row,
    quarterlyMinusAnnual: row.quarterlyMinusAnnual && Object.fromEntries(
      Object.entries(row.quarterlyMinusAnnual).map(([key, value]) => [key, round(value)])),
    subsectorMinusAnnual: row.subsectorMinusAnnual && Object.fromEntries(
      Object.entries(row.subsectorMinusAnnual).map(([key, value]) => [key, round(value)]))})),
  subsectors: subsectorObservations.map((row) => ({...row,
    consolidationResidual: round(row.consolidationResidual)})),
  labour: {sourcePages: labour.sourcePages, totals: labour.totals,
    recruitmentAges15to64K: labour.recruitmentAges15to64K,
    ages: labour.ages, diplomas: labour.diplomas, unemployedDiplomaUnknownK: labour.unemployedDiplomaUnknownK},
  tes: {sourcePage: tes.sourcePage, rows: tes.rows},
  population: {sourcePage: population.sourcePage, rows: population.rows.filter((row) =>
    [2026, 2027, 2030, 2040, 2050, 2056].includes(row.year))},
  comparableInsee: {
    sourceVintage: comparable.sourceVintage,
    reviewedByIndependentParty: comparable.reviewedByIndependentParty,
    modelEvaluated: comparable.modelEvaluated,
    informationSet: comparable.informationSet,
    sourcePages: Object.fromEntries(Object.entries(comparable.sourceFiles).map(([key, source]) => [key, source.page])),
    cases: comparable.cases.map((item) => ({
      id: item.id, name: item.name, originYear: item.originYear, eligibility: item.eligibility,
      origin: {gdp: item.origin.gdp, spending: item.origin.spending, revenue: item.origin.revenue,
        debt: item.origin.debt, assumedNominalGrowth: item.origin.assumedNominalGrowth,
        assumedInflation: item.origin.assumedInflation,
        assumedRealSpendingGrowth: item.origin.assumedRealSpendingGrowth,
        trainingYears: item.origin.trainingYears},
      rows: item.rows.map((row) => ({
        year: row.year,
        observed: row.observed, predicted: {...row.predicted,
          applied: row.predicted.applied.map((applied) => ({...applied,
            label: policyById.get(applied.id)?.label || applied.id,
            fiscalSide: policyById.get(applied.id)?.fiscalSide || null,
            source: policyById.get(applied.id)?.source || null,
            warning: policyById.get(applied.id)?.warning || null}))},
        error: row.error, noPolicyError: row.noPolicyError,
        uncovered: row.uncovered.map((id) => ({id,
          label: policyById.get(id)?.label || id,
          reason: [...item.missingPolicies, ...item.excludedPolicies].find((entry) => entry.id === id)?.reason ||
            policyById.get(id)?.warning || "Effet non chiffré",
          source: policyById.get(id)?.source || null}))
      }))
    }))
  },
  trajectories: exportTrajectories(results),
  quarterlyTrajectories: exportTrajectories(quarterlyResults)
};
fs.writeFileSync(destination, `// Généré par node scripts/export-historical-audit.mjs ; ne pas éditer à la main.\nwindow.ECOSIM_HISTORICAL_AUDIT = ${JSON.stringify(payload)};\n`);
console.log(`Audit annuel et trimestriel exporté : ${fileURLToPath(destination)} (${payload.trajectories.reduce((sum, item) => sum + item.annual.length, 0)} cibles annuelles par mode).`);
