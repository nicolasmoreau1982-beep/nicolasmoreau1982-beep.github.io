import assert from "node:assert/strict";
import fs from "node:fs";
import {accounts, observedSourceReconciliation, runHistoricalDiagnostics, summarizeQuarterlyDiagnostics} from "../scripts/historical-replay.mjs";
import {annualReconciliation, quarterlyObservations, subsectorObservations} from "../scripts/insee-observations.mjs";

const read = (name) => JSON.parse(fs.readFileSync(new URL(`../research/${name}`, import.meta.url), "utf8"));
const population = read("insee-population-projection.json");
const labour = read("insee-labour-2025.json");
const tes = read("insee-tes-2024.json");

assert.equal(quarterlyObservations.length, 94);
assert.deepEqual([quarterlyObservations[0].year, quarterlyObservations[0].quarter], [2003, 1]);
assert.deepEqual([quarterlyObservations.at(-1).year, quarterlyObservations.at(-1).quarter], [2026, 2]);
assert.ok(quarterlyObservations.every((row) => Math.abs(row.revenue - row.spending - row.balance) < 0.011));
const reconciliation = annualReconciliation(accounts);
assert.deepEqual(reconciliation, observedSourceReconciliation);
assert.ok(Math.abs(reconciliation.find((row) => row.year === 2025).quarterlyMinusAnnual.spending - 0.5983) < 1e-6);
assert.ok(Math.abs(reconciliation.find((row) => row.year === 2024).subsectorMinusAnnual.spending - 0.119) < 1e-6);
assert.equal(subsectorObservations.at(-1).intraGovernmentTransfersSpending, 174.53);
assert.equal(subsectorObservations.at(-1).intraGovernmentTransfersRevenue, 174.53);

const diagnostics = runHistoricalDiagnostics({frequency: "quarterly"});
assert.equal(diagnostics[0].comparedQuarters.length, 20);
assert.deepEqual(summarizeQuarterlyDiagnostics(diagnostics).map((row) => row.quarters), [20, 40, 60, 80]);
assert.ok(diagnostics[0].comparedQuarters.every((row) => row.observed && row.error));
assert.equal(diagnostics[0].comparedQuarters.at(-1).observed.spending,
  quarterlyObservations.find((row) => row.year === 2025 && row.quarter === 4).spending);
assert.ok(diagnostics[0].comparedQuarters.some((row) => Math.abs(row.error.spendingBn) > 1),
  "La comparaison ne doit pas recalibrer artificiellement les trimestres simulés");

assert.equal(population.rows.length, 31);
assert.equal(population.agesBySex.length, 31);
assert.equal(population.agesBySex[0][1].length, 106);
for (const [index, [year, ages]] of population.agesBySex.entries()) {
  assert.equal(year, population.rows[index].year);
  assert.equal(ages.reduce((sum, [total]) => sum + total, 0), Math.round(population.rows[index].populationM * 1_000_000));
  assert.ok(ages.every(([total, female, male]) => total === female + male));
}
assert.equal(labour.totals.unemployedK, 2451.2);
assert.equal(labour.totals.haloK, 1925.6);
assert.equal(labour.totals.underemployedK, 1293.4);
assert.equal(labour.recruitmentAges15to64K.unemployedK, 2425.7);
assert.equal(labour.recruitmentAges15to64K.haloK, 1870);
assert.equal(labour.recruitmentAges15to64K.underemployedK, 1260.4);
assert.equal(labour.unemployedDiplomaUnknownK, 9);
assert.equal(tes.rows.length, 17);
assert.ok(tes.rows.every((row) => row.importShareOfProductResourcesPct >= 0 && row.importShareOfProductResourcesPct <= 100));
console.log("Insee : trimestres observés, sous-secteurs, âges, travail et TES réconciliés sans données futures dans le moteur.");
