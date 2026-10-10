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
const annualNature = JSON.parse(read("research/insee-annual-nature.json"));
const historicalPolicy = JSON.parse(read("research/historical-policy-timeline.json"));
if (annualNature.sourceSha256 !== frozen.sources.accounts.sha256) {
  throw new Error("Millésimes Insee 3.201 incompatibles entre totaux et postes par nature");
}
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
export const natureAccounts = annualNature.rows;

const median = (numbers) => {
  const ordered = [...numbers].sort((a, b) => a - b);
  const half = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[half] : (ordered[half - 1] + ordered[half]) / 2;
};
const meanAbsolute = (values) => values.reduce((sum, value) => sum + Math.abs(value), 0) / values.length;

export function runCoreOrigin({originYear, horizon, observations = accounts, changes = {}, accountingFlows = {},
  baselineMode = "aggregate", natureObservations = natureAccounts}) {
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 10) throw new Error("Horizon invalide (1–10 ans)");
  if (!["aggregate", "nature_median_share"].includes(baselineMode)) throw new Error("Référence historique inconnue");
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) throw new Error("Réformes invalides");
  if (!accountingFlows || typeof accountingFlows !== "object" || Array.isArray(accountingFlows)) {
    throw new Error("Flux comptables invalides");
  }
  for (const [year, flow] of Object.entries(accountingFlows)) {
    if (!Number.isInteger(Number(year)) || Number(year) <= originYear || Number(year) > originYear + horizon
      || !flow || typeof flow !== "object" || Array.isArray(flow)
      || Object.keys(flow).some((key) => !["spendingBn", "revenueBn"].includes(key))
      || ![flow.spendingBn ?? 0, flow.revenueBn ?? 0].every(Number.isFinite)) {
      throw new Error(`Flux comptable invalide en ${year}`);
    }
  }
  const origin = originSnapshot(observations, originYear, 5);
  const targetRows = observations.filter((row) => row.year > originYear && row.year <= originYear + horizon);
  if (targetRows.length !== horizon || targetRows.some((row, index) => row.year !== originYear + index + 1)) {
    throw new Error(`Observations cibles incomplètes après ${originYear}`);
  }
  const past = observations.filter((row) => row.year <= originYear).slice(-5);
  const realGrowth = median(past.map((row) => row.realGrowth));
  const deflator = origin.assumedInflation * 100;
  const originDeficitRatio = (origin.spending - origin.revenue) / origin.gdp * 100;
  let referenceSpendingShare = origin.spending / origin.gdp;
  let referenceRevenueShare = origin.revenue / origin.gdp;
  let categoryShares = null;
  if (baselineMode === "nature_median_share") {
    const observedByYear = new Map(observations.filter((row) => row.year <= originYear)
      .map((row) => [row.year, row]));
    const natureByYear = new Map(natureObservations.filter((row) => row.year <= originYear)
      .map((row) => [row.year, row]));
    const training = origin.trainingYears.map((year) => {
      const account = observedByYear.get(year);
      const nature = natureByYear.get(year);
      if (!nature || !account || Math.abs(nature.totalSpendingBn - account.spending) > 0.00011
        || Math.abs(nature.totalRevenueBn - account.revenue) > 0.00011) {
        throw new Error(`Postes par nature incompatibles avec les comptes en ${year}`);
      }
      return {account, nature};
    });
    const shares = (side, categories) => Object.fromEntries(categories.map(({id}) => {
      const values = training.map(({account, nature}) => nature[side][id] / account.gdp);
      if (values.some((value) => !Number.isFinite(value))) throw new Error(`Catégorie historique absente : ${id}`);
      return [id, median(values)];
    }));
    categoryShares = {spending: shares("spending", annualNature.spendingCategories),
      revenue: shares("revenue", annualNature.revenueCategories)};
    referenceSpendingShare = Object.values(categoryShares.spending).reduce((sum, value) => sum + value, 0);
    referenceRevenueShare = Object.values(categoryShares.revenue).reduce((sum, value) => sum + value, 0);
  }
  const referenceDeficitRatio = (referenceSpendingShare - referenceRevenueShare) * 100;

  // Charger une copie isolée des mêmes fichiers et des mêmes fonctions que
  // scripts/simulate.mjs ; seules les données d'entrée sont remplacées.
  const context = {window: {}};
  for (const [name, source] of [
    ["dist/data.js", dataSource], ["dist/history.js", historySource],
    ["dist/insee-projection.js", populationSource], ["dist/fiscal.js", fiscalSource]
  ]) vm.runInNewContext(source, context, {filename: name});
  const D = context.window.ECOSIM_DATA;
  const categoryIds = new Set([...D.spending, ...D.revenue].filter((item) => !item.locked).map((item) => item.id));
  for (const [id, amount] of Object.entries(changes)) {
    if (!categoryIds.has(id) || !Number.isFinite(amount)) throw new Error(`Réforme non représentable : ${id}`);
  }
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
    deficitRatio: Array(horizon).fill(referenceDeficitRatio), policyRate: Array(horizon).fill(0)};
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
  const modelContext = {window: context.window, console, TextEncoder, TextDecoder, URL,
    historicalChanges: changes, historicalAccountingFlows: accountingFlows};
  vm.runInNewContext(`${appSource.slice(start, end)}\nObject.assign(state.changes, historicalChanges);\nglobalThis.coreResult = calculateProjection(state.model, historicalAccountingFlows);`,
    modelContext, {filename: "dist/app.js (moteur principal)"});
  const prediction = modelContext.coreResult.scenario;
  const naive = modelContext.coreResult.baseline;
  let previousObservedDebt = origin.debt;
  let cumulativeDeficitErrorBn = 0;
  let cumulativeObservedStockFlowBn = 0;
  const rows = prediction.map((point, index) => {
    const observed = targetRows[index];
    const observedDeficitBn = observed.spending - observed.revenue;
    const impliedStockFlowBn = observed.debt - previousObservedDebt - observedDeficitBn;
    previousObservedDebt = observed.debt;
    cumulativeDeficitErrorBn += point.deficit - observedDeficitBn;
    cumulativeObservedStockFlowBn += impliedStockFlowBn;
    const debtErrorBn = point.debt - observed.debt;
    const debtIdentityResidualBn = debtErrorBn - cumulativeDeficitErrorBn + cumulativeObservedStockFlowBn;
    if (Math.abs(debtIdentityResidualBn) > 1e-6) throw new Error(`Identité de dette rompue en ${observed.year}`);
    const actual = {gdp: observed.gdp, deficitRatio: (observed.spending - observed.revenue) / observed.gdp * 100,
      debtRatio: observed.debt / observed.gdp * 100, unemployment: observed.unemployment,
      spendingBn: observed.spending, revenueBn: observed.revenue, deficitBn: observedDeficitBn,
      debtBn: observed.debt};
    const error = (source) => ({gdpPct: (source.gdp / actual.gdp - 1) * 100,
      deficitRatio: source.deficitRatio - actual.deficitRatio,
      debtRatio: source.debtRatio - actual.debtRatio,
      unemployment: source.unemployment - actual.unemployment});
    return {year: observed.year, actual,
    referenceAccounts: {spendingBn: naive[index].gdp * referenceSpendingShare,
      revenueBn: naive[index].gdp * referenceRevenueShare},
    predicted: {
      gdp: point.gdp, deficitRatio: point.deficitRatio, debtRatio: point.debtRatio,
      unemployment: point.unemployment, directRevenueChangeBn: point.revenueChange,
      directSpendingChangeBn: point.spendingChange, deficitBn: point.deficit, debtBn: point.debt},
    debtAccounting: {debtErrorBn, cumulativeDeficitErrorBn, cumulativeObservedStockFlowBn,
      impliedStockFlowBn, officialStockFlowBn: observed.officialStockFlow,
      officialSourceGapBn: Number.isFinite(observed.officialStockFlow)
        ? impliedStockFlowBn - observed.officialStockFlow : null,
      identityResidualBn: debtIdentityResidualBn},
    error: error(point), naiveError: error(naive[index])};
  });
  return {originYear, horizon, inputs: {trainingYears: origin.trainingYears,
    assumedRealGrowthPct: realGrowth, assumedDeflatorPct: deflator,
    initialDeficitRatio: originDeficitRatio, initialUnemploymentPct: origin.unemployment,
    initialDebtBn: origin.debt, referenceDeficitRatio, baselineMode,
    referenceSpendingShare, referenceRevenueShare, categoryShares, changes, accountingFlows}, rows};
}

// Seul cas actuellement traduisible sans inventer d'assiette ou de calendrier :
// les deux hausses de TVA entrées au T1 2014, connues ex ante en 2013.
export function runVat2014Sensitivity({observations = accounts} = {}) {
  const events = historicalPolicy.events.filter((event) => event.instrument === "vat"
    && event.effectiveYear === 2014 && event.effectiveQuarter === 1
    && event.amountInformationYear <= 2013 && event.fiscalSide === "revenue");
  if (events.length !== 2 || events.some((event) => !Number.isFinite(event.amountBn))) {
    throw new Error("Catalogue TVA 2014 incomplet ou non daté");
  }
  const totalBn = events.reduce((sum, event) => sum + event.amountBn, 0);
  const firstYearDeflator = 1 + originSnapshot(observations, 2013, 5).assumedInflation;
  const withVat = runCoreOrigin({originYear: 2013, horizon: 3, observations,
    changes: {R_TVA: totalBn / firstYearDeflator}});
  const withoutVat = runCoreOrigin({originYear: 2013, horizon: 3, observations});
  const excludedEvents = historicalPolicy.events.filter((event) => {
    const startYear = event.effectiveYear ?? event.year;
    return startYear >= 2014 && startYear <= 2016 && !events.includes(event);
  }).map((event) => ({id: event.id, label: event.label, source: event.source,
    reason: event.warning || "Mesure non traduite dans le moteur principal"}));
  return {status: "retrospective_sensitivity_not_causal_validation",
    eventIds: events.map((event) => event.id), amountBn: totalBn,
    includedEvents: events.map((event) => ({id: event.id, label: event.label,
      amountBn: event.amountBn, amountStatus: event.amountStatus, source: event.source})),
    excludedEvents,
    mapping: "R_TVA, 6.7 nominal in first year 2014; then indexed by assumed deflator under engine convention",
    limitation: "2017 Mésange VAT response not available at 2013 origin; other simultaneous reforms and shocks absent",
    rows: withVat.rows.map((row, index) => ({year: row.year, observed: row.actual,
      withVat: row.predicted, withoutVat: withoutVat.rows[index].predicted,
      withVatError: row.error, withoutVatError: withoutVat.rows[index].error}))};
}

// La bascule de cotisations n'est saisie ici que comme baisse de recettes
// annoncée pour 2019. Aucun emploi/PIB n'est inféré d'un coût comptable.
export function runPayroll2019AccountingSensitivity({observations = accounts} = {}) {
  const event = historicalPolicy.events.find((item) => item.id === "cice_payroll_conversion_2019");
  if (!event || event.effectiveYear !== 2019 || event.amountInformationYear > 2018
    || event.fiscalSide !== "revenue" || !event.fiscalOnly || !Number.isFinite(event.amountBn)) {
    throw new Error("Bascule de cotisations 2019 non représentable en comptabilité seule");
  }
  const withFlow = runCoreOrigin({originYear: 2018, horizon: 1, observations,
    accountingFlows: {2019: {revenueBn: event.amountBn}}});
  const withoutFlow = runCoreOrigin({originYear: 2018, horizon: 1, observations});
  const current = withFlow.rows[0];
  const reference = withoutFlow.rows[0];
  return {status: "accounting_only_sensitivity_not_full_cice_reform",
    event: {id: event.id, label: event.label, amountBn: event.amountBn,
      amountStatus: event.amountStatus, source: event.source},
    excluded: historicalPolicy.events.filter((item) => item.id === "cice_accounts_2014_2022")
      .map((item) => ({id: item.id, reason: "Coût CICE déjà présent en partie dans le déficit 2018 de départ ; "
        + "l'injecter en niveau produirait un double compte. Assiette et calendrier non reconstruits.", source: item.source})),
    limitation: "2019 only; no employment/GDP effect, no CICE spending overlap modelled, not a causal test",
    row: {year: 2019, observed: current.actual, withFlow: current.predicted,
      withoutFlow: reference.predicted, withFlowError: current.error,
      withoutFlowError: reference.error}};
}

// Deux références simples sont éprouvées sur les mêmes origines. La médiane
// des parts de PIB par poste n'est PAS une estimation d'effet de politique.
export function runNatureCandidateBacktest({observations = accounts, natureObservations = natureAccounts,
  origins = [2005, 2010, 2013, 2015, 2018, 2020], horizons = [1, 3, 5, 10]} = {}) {
  const latest = Math.max(...observations.map((row) => row.year));
  const cases = origins.flatMap((originYear) => horizons
    .filter((horizon) => originYear + horizon <= latest)
    .map((horizon) => ({originYear, horizon,
      aggregate: runCoreOrigin({originYear, horizon, observations}),
      nature: runCoreOrigin({originYear, horizon, observations,
        natureObservations, baselineMode: "nature_median_share"})})));
  const error = (row, metric) => {
    if (metric === "spendingBn") return row.referenceAccounts.spendingBn - row.actual.spendingBn;
    if (metric === "revenueBn") return row.referenceAccounts.revenueBn - row.actual.revenueBn;
    return row.error[metric];
  };
  const metrics = ["spendingBn", "revenueBn", "deficitRatio", "debtRatio"];
  const table = horizons.map((horizon) => {
    const selected = cases.filter((item) => item.horizon === horizon);
    const score = (mode) => Object.fromEntries(metrics.map((metric) => [metric,
      selected.length ? meanAbsolute(selected.map((item) => error(item[mode].rows.at(-1), metric))) : null]));
    return {horizon, n: selected.length, aggregateMae: score("aggregate"), natureMae: score("nature")};
  });
  const oneYear = cases.filter((item) => item.horizon === 1);
  const observedNature = new Map(natureObservations.map((row) => [row.year, row]));
  const categoryErrors = [
    ...annualNature.spendingCategories.map((item) => ({...item, side: "spending"})),
    ...annualNature.revenueCategories.map((item) => ({...item, side: "revenue"}))
  ].map(({id, label, side}) => {
    const errors = oneYear.map((item) => {
      const actual = observedNature.get(item.originYear + 1);
      if (!actual || !Number.isFinite(actual[side][id])) throw new Error(`Cible par nature absente : ${id}`);
      const point = item.nature.rows[0];
      return point.predicted.gdp * item.nature.inputs.categoryShares[side][id] - actual[side][id];
    });
    return {id, label, side, n: errors.length, maeBn: meanAbsolute(errors)};
  }).sort((left, right) => right.maeBn - left.maeBn);
  return {status: "exploratory_reference_candidate_not_adopted",
    method: "median of each 3.201 transaction share of nominal GDP over origin's past 3–6 years; projected with the same GDP path",
    sourceSha256: annualNature.sourceSha256,
    limitation: "revised 2026 accounts, no historical vintages, categories by nature not COFOG, no policy or shock attribution",
    table, topCategoryErrors1Year: categoryErrors.slice(0, 8), cases};
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
  const debtDecomposition = horizons.map((horizon) => {
    const endpoints = cases.filter((item) => item.horizon === horizon).map((item) => item.rows.at(-1).debtAccounting);
    const mae = (key) => endpoints.length ? meanAbsolute(endpoints.map((item) => item[key])) : null;
    return {horizon, n: endpoints.length, debtErrorMaeBn: mae("debtErrorBn"),
      cumulativeDeficitErrorMaeBn: mae("cumulativeDeficitErrorBn"),
      unmodelledStockFlowMaeBn: mae("cumulativeObservedStockFlowBn")};
  });
  return {status: "core_engine_retrospective_baseline_only_not_validated",
    engine: "dist/app.js:calculateProjection (same function as web and Python)",
    asOf: frozen.asOf,
    informationSet: "revised_2026_observations_at_origin; not original publication vintages",
    calibration: "No adapter coefficients fitted to target years; main-engine coefficients may reflect later history",
    policyCoverage: "baseline none; separate VAT 2014 sensitivity only; other policies not translated",
    demographicCoverage: "2026 reference shifted for no-policy runtime only; no historical cohort validation",
    rateAssumption: "policyRate=0 for baseline comparison; debt stock-flow adjustments not modelled",
    debtAccountingMethod: "debt error Bn = cumulative simulated-minus-observed deficit Bn - cumulative implied observed stock-flow Bn; implied stock-flow uses same frozen GDP/accounts/debt tables, official series shown separately",
    scoreEligibility: "diagnostic_only_not_out_of_sample_or_causal_validation",
    table, debtDecomposition, cases, natureReference: runNatureCandidateBacktest({observations, origins, horizons}),
    vat2014: runVat2014Sensitivity({observations}),
    payroll2019: runPayroll2019AccountingSensitivity({observations})};
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
    process.stdout.write("Dette (Md€), MAE par horizon : écart final / erreurs de déficit cumulées / stock-flux observés non prévus\n");
    for (const row of result.debtDecomposition) {
      process.stdout.write(`${String(row.horizon).padStart(3)} ${String(row.n).padStart(2)}  `
        + `${row.debtErrorMaeBn?.toFixed(1) ?? "–"} / ${row.cumulativeDeficitErrorMaeBn?.toFixed(1) ?? "–"} / `
        + `${row.unmodelledStockFlowMaeBn?.toFixed(1) ?? "–"}\n`);
    }
    const nature = result.natureReference;
    process.stdout.write("Référence par nature (MAE agrégée / par nature), dépenses Md€ / recettes Md€ / déficit pt\n");
    for (const row of nature.table) {
      const pair = (metric) => `${row.aggregateMae[metric]?.toFixed(1) ?? "–"}/${row.natureMae[metric]?.toFixed(1) ?? "–"}`;
      process.stdout.write(`${String(row.horizon).padStart(3)} ${String(row.n).padStart(2)}  `
        + `${pair("spendingBn")} / ${pair("revenueBn")} / ${pair("deficitRatio")}\n`);
    }
    const vat = result.vat2014.rows[0];
    process.stdout.write(`TVA 2014, sensibilité : ${result.vat2014.amountBn.toFixed(1)} Md€ ex ante ; `
      + `écart de PIB 2014 avec/sans : ${vat.withVatError.gdpPct.toFixed(2)}/${vat.withoutVatError.gdpPct.toFixed(2)} %.\n`);
    const payroll = result.payroll2019.row;
    process.stdout.write(`Cotisations 2019, comptabilité seule : ${result.payroll2019.event.amountBn.toFixed(1)} Md€ de recettes ; `
      + `écart déficit/PIB avec/sans : ${payroll.withFlowError.deficitRatio.toFixed(2)}/${payroll.withoutFlowError.deficitRatio.toFixed(2)} pt.\n`);
    process.stdout.write("Attention : données révisées 2026, autres politiques absentes, pas de test causal ni de vrai hors-échantillon.\n");
  }
}
