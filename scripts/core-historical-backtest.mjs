// Premier banc rétrospectif du moteur réellement exécuté par le site.
// Il ne prétend pas reconstruire les politiques historiques ni les millésimes
// de données disponibles aux dates d'origine.
import fs from "node:fs";
import vm from "node:vm";
import {fileURLToPath} from "node:url";
import {originSnapshot} from "./historical-engine.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");
const frozen = JSON.parse(read("research/insee-validation-annual.json"));
const dataSource = read("dist/data.js");
const historySource = read("dist/history.js");
const populationSource = read("dist/insee-projection.js");
const fiscalSource = read("dist/fiscal.js");
const appSource = read("dist/app.js");
const start = appSource.indexOf("(() => {") + "(() => {".length;
const end = appSource.indexOf("  function initializeControls()");
if (start < 1 || end <= start) throw new Error("Moteur principal introuvable dans dist/app.js");

const historyContext = {window: {}};
vm.runInNewContext(historySource, historyContext, {filename: "dist/history.js"});
const unemployment = new Map(historyContext.window.ECOSIM_HISTORY.rows.map((row) => [row.year, row.unemployment]));
export const accounts = frozen.rows.map(([year, gdp, realGrowth, spending, revenue, debt, officialStockFlow]) => ({
  year, gdp, realGrowth, spending, revenue, debt, officialStockFlow, unemployment: unemployment.get(year)
}));

const median = (numbers) => {
  const ordered = [...numbers].sort((a, b) => a - b);
  const half = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[half] : (ordered[half - 1] + ordered[half]) / 2;
};
const meanAbsolute = (values) => values.reduce((sum, value) => sum + Math.abs(value), 0) / values.length;

export function runCoreOrigin({originYear, horizon, observations = accounts}) {
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 10) throw new Error("Horizon invalide (1–10 ans)");
  const origin = originSnapshot(observations, originYear, 5);
  const targetRows = observations.filter((row) => row.year > originYear && row.year <= originYear + horizon);
  if (targetRows.length !== horizon || targetRows.some((row, index) => row.year !== originYear + index + 1)) {
    throw new Error(`Observations cibles incomplètes après ${originYear}`);
  }
  const past = observations.filter((row) => row.year <= originYear).slice(-5);
  const realGrowth = median(past.map((row) => row.realGrowth));
  const deflator = origin.assumedInflation * 100;
  const originDeficitRatio = (origin.spending - origin.revenue) / origin.gdp * 100;

  // Charger une copie isolée des mêmes fichiers et des mêmes fonctions que
  // scripts/simulate.mjs ; seules les données d'entrée sont remplacées.
  const context = {window: {}};
  for (const [name, source] of [
    ["dist/data.js", dataSource], ["dist/history.js", historySource],
    ["dist/insee-projection.js", populationSource], ["dist/fiscal.js", fiscalSource]
  ]) vm.runInNewContext(source, context, {filename: name});
  const D = context.window.ECOSIM_DATA;
  const demographicRows = context.window.ECOSIM_INSEE_PROJECTION.rows;
  D.BASE = {...D.BASE, year: originYear, gdp: origin.gdp, spending: origin.spending,
    revenue: origin.revenue, deficit: origin.spending - origin.revenue, debt: origin.debt,
    deficitRatio: originDeficitRatio, debtRatio: origin.debt / origin.gdp * 100,
    growth: origin.realGrowth, inflation: deflator, unemployment: origin.unemployment};
  D.metadata = {...D.metadata, projectionStart: originYear + 1,
    projectionEnd: originYear + horizon, projectionYears: horizon};
  D.baseline = {...D.baseline,
    realGrowth: Array(horizon).fill(realGrowth), inflation: Array(horizon).fill(deflator),
    unemployment: Array(horizon).fill(origin.unemployment),
    deficitRatio: Array(horizon).fill(originDeficitRatio), policyRate: Array(horizon).fill(0)};
  // Faute de cohortes historiques, la démographie projetée 2026 est décalée
  // uniquement pour satisfaire les entrées du moteur. Elle n'est pas évaluée.
  context.window.ECOSIM_INSEE_PROJECTION = {
    ...context.window.ECOSIM_INSEE_PROJECTION,
    rows: demographicRows.slice(0, horizon + 1).map((row, index) => ({...row, year: originYear + 1 + index}))
  };
  // Le micro-moteur fiscal refuse les dates < 2026. Aucune réforme fiscale
  // n'étant appliquée ici, son calcul neutre est évalué à son année minimale.
  const fiscal = context.window.ECOSIM_FISCAL;
  context.window.ECOSIM_FISCAL = {...fiscal,
    simulate: (config, year, priceFactor) => fiscal.simulate(config, Math.max(2026, year), priceFactor)};
  const modelContext = {window: context.window, console, TextEncoder, TextDecoder, URL};
  vm.runInNewContext(`${appSource.slice(start, end)}\nglobalThis.coreResult = calculateProjection();`,
    modelContext, {filename: "dist/app.js (moteur principal)"});
  const prediction = modelContext.coreResult.scenario;
  const naive = modelContext.coreResult.baseline;
  const rows = prediction.map((point, index) => {
    const observed = targetRows[index];
    const actual = {gdp: observed.gdp, deficitRatio: (observed.spending - observed.revenue) / observed.gdp * 100,
      debtRatio: observed.debt / observed.gdp * 100, unemployment: observed.unemployment};
    const error = (source) => ({gdpPct: (source.gdp / actual.gdp - 1) * 100,
      deficitRatio: source.deficitRatio - actual.deficitRatio,
      debtRatio: source.debtRatio - actual.debtRatio,
      unemployment: source.unemployment - actual.unemployment});
    return {year: observed.year, actual, predicted: {
      gdp: point.gdp, deficitRatio: point.deficitRatio, debtRatio: point.debtRatio,
      unemployment: point.unemployment}, error: error(point), naiveError: error(naive[index])};
  });
  return {originYear, horizon, inputs: {trainingYears: origin.trainingYears,
    assumedRealGrowthPct: realGrowth, assumedDeflatorPct: deflator,
    initialDeficitRatio: originDeficitRatio, initialUnemploymentPct: origin.unemployment,
    initialDebtBn: origin.debt}, rows};
}

export function runCoreBacktest({observations = accounts, origins = [2005, 2010, 2013, 2015, 2018, 2020],
  horizons = [1, 3, 5, 10]} = {}) {
  const latest = Math.max(...observations.map((row) => row.year));
  const cases = origins.flatMap((originYear) => horizons
    .filter((horizon) => originYear + horizon <= latest)
    .map((horizon) => runCoreOrigin({originYear, horizon, observations})));
  const metrics = ["gdpPct", "deficitRatio", "debtRatio", "unemployment"];
  const table = horizons.map((horizon) => {
    const selected = cases.filter((item) => item.horizon === horizon);
    const score = (key) => Object.fromEntries(metrics.map((metric) =>
      [metric, selected.length ? meanAbsolute(selected.map((item) => item.rows.at(-1)[key][metric])) : null]));
    return {horizon, n: selected.length, coreMae: score("error"), naiveMae: score("naiveError")};
  });
  return {status: "core_engine_retrospective_baseline_only_not_validated",
    engine: "dist/app.js:calculateProjection (same function as web and Python)",
    asOf: frozen.asOf,
    informationSet: "revised_2026_observations_at_origin; not original publication vintages",
    calibration: "No adapter coefficients fitted to target years; main-engine coefficients may reflect later history",
    policyCoverage: "none; historical fiscal and spending policies not translated to dated categories",
    demographicCoverage: "2026 reference shifted for no-policy runtime only; no historical cohort validation",
    rateAssumption: "policyRate=0 for baseline comparison; debt stock-flow adjustments not modelled",
    scoreEligibility: "diagnostic_only_not_out_of_sample_or_causal_validation",
    table, cases};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const result = runCoreBacktest();
  if (process.argv.includes("--json")) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else {
    process.stdout.write("Moteur principal, trajectoire sans réforme — MAE rétrospective (diagnostic non validant)\n");
    process.stdout.write("ans  n  PIB% (moteur/témoin)  déficit pt  dette pt  chômage pt\n");
    for (const row of result.table) {
      const pair = (metric) => `${row.coreMae[metric]?.toFixed(2) ?? "–"}/${row.naiveMae[metric]?.toFixed(2) ?? "–"}`;
      process.stdout.write(`${String(row.horizon).padStart(3)} ${String(row.n).padStart(2)}  ${pair("gdpPct")}  ${pair("deficitRatio")}  ${pair("debtRatio")}  ${pair("unemployment")}\n`);
    }
    process.stdout.write("Attention : données révisées 2026, politiques absentes, pas de test causal ni de vrai hors-échantillon.\n");
  }
}
