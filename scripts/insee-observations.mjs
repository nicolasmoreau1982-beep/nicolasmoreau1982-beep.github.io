import fs from "node:fs";

const read = (name) => JSON.parse(fs.readFileSync(new URL(`../research/${name}`, import.meta.url), "utf8"));
export const quarterlySource = read("insee-quarterly-observed.json");
export const subsectorSource = read("insee-subsectors.json");
export const quarterlyObservations = quarterlySource.rows;
export const subsectorObservations = subsectorSource.rows;

const quarterKey = (row) => `${row.year}-Q${row.quarter}`;
const quarterMap = new Map(quarterlyObservations.map((row) => [quarterKey(row), row]));

if (quarterMap.size !== quarterlyObservations.length) throw new Error("Trimestres Insee dupliqués");
for (const row of quarterlyObservations) {
  if (![row.spending, row.revenue, row.gdp, row.interest, row.publicCompensation].every(Number.isFinite)
    || Math.abs(row.revenue - row.spending - row.balance) > 0.011) {
    throw new Error(`Trimestre Insee invalide ${quarterKey(row)}`);
  }
}

// Le comparateur lit les observations *après* la projection ; elles ne peuvent
// donc pas servir implicitement de données d'entrée au rejeu.
export function compareQuarterlyHistory(projection) {
  return projection.quarters.map((prediction) => {
    const observed = quarterMap.get(quarterKey(prediction));
    if (!observed) return {year: prediction.year, quarter: prediction.quarter, observed: null, prediction, error: null};
    return {year: prediction.year, quarter: prediction.quarter, observed, prediction,
      error: {spendingBn: prediction.spending - observed.spending,
        revenueBn: prediction.revenue - observed.revenue,
        deficitBn: prediction.deficit + observed.balance,
        gdpBn: prediction.gdp - observed.gdp,
        gdpPct: (prediction.gdp / observed.gdp - 1) * 100}};
  });
}

export function annualReconciliation(annualAccounts) {
  const accountMap = new Map(annualAccounts.map((row) => [row.year, row]));
  const subsectorMap = new Map(subsectorObservations.map((row) => [row.year, row]));
  return [...accountMap].map(([year, annual]) => {
    const quarters = quarterlyObservations.filter((row) => row.year === year);
    const subsector = subsectorMap.get(year);
    if (quarters.length !== 4) return {year, status: "quarters_incomplete"};
    const sum = (key) => quarters.reduce((total, row) => total + row[key], 0);
    return {year, status: "compared", quarterlyMinusAnnual: {
      spending: sum("spending") - annual.spending,
      revenue: sum("revenue") - annual.revenue,
      deficit: sum("spending") - sum("revenue") - (annual.spending - annual.revenue)},
    subsectorMinusAnnual: subsector ? {
      spending: subsector.consolidated.spending - annual.spending,
      revenue: subsector.consolidated.revenue - annual.revenue} : null,
    consolidationResidual: subsector?.consolidationResidual ?? null};
  });
}
