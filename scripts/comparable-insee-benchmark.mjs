// Banc d'observations communes Insee. Il évalue le prototype historique,
// JAMAIS le moteur principal 2026–2055 ni l'effet causal d'une réforme.
import fs from "node:fs";
import vm from "node:vm";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {compareHistory, simulateHistory} from "./historical-engine.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root));
const json = (path) => JSON.parse(read(path).toString("utf8"));
const frozen = json("research/insee-validation-annual.json");
const policy = json("research/historical-policy-timeline.json");
const inventory = json("research/historical-event-inventory.json");
const parameters = json("research/historical-parameters.json");
const context = {window: {}};
for (const path of ["dist/data.js", "dist/history.js"]) {
  vm.runInNewContext(read(path).toString("utf8"), context, {filename: path});
}
const D = context.window.ECOSIM_DATA;
const historicalUnemployment = new Map(context.window.ECOSIM_HISTORY.rows.map((row) => [row.year, row.unemployment]));
const eventCatalog = [...policy.events, ...inventory.events];

// Les quatre grandeurs macro-comptables sont du même gel Insee. Le chômage,
// exigé par le prototype historique, reste un contexte Eurostat distinct.
export const inseeAccounts = frozen.rows.map(([year, gdp, realGrowth, spending, revenue, debt, officialStockFlow]) => {
  const unemployment = historicalUnemployment.get(year);
  if (!Number.isFinite(unemployment)) throw new Error(`Chômage de contexte manquant en ${year}`);
  return {year, gdp, realGrowth, spending, revenue, debt, unemployment,
    deficitRatio: (spending - revenue) / gdp * 100, debtRatio: debt / gdp * 100,
    officialStockFlow};
});
const sha256 = (path) => createHash("sha256").update(read(path)).digest("hex");
const fixedCases = Object.freeze([
  {id: "vat_2014", originYear: 2013, endYear: 2016,
    name: "TVA 2014, avec CICE et autres politiques non identifiés entièrement"},
  {id: "cice_conversion_2019", originYear: 2018, endYear: 2020,
    name: "Bascule CICE/cotisations 2019, canal macro non identifié"},
  {id: "post_covid_2021", originYear: 2020, endYear: 2022,
    name: "Reprise post-Covid, soutiens et choc énergétique incomplets"}
]);
const meanAbsolute = (values) => values.reduce((sum, value) => sum + Math.abs(value), 0) / values.length;
const metrics = ["gdpPct", "spendingBn", "revenueBn", "deficitRatio", "debtRatio"];

export function runComparableBenchmark({accounts = inseeAccounts} = {}) {
  const events = eventCatalog;
  const cases = fixedCases.map((definition) => {
    const inputs = {originYear: definition.originYear, horizon: definition.endYear - definition.originYear,
      accounts, parameters, responses: {vat: D.researchVariants.vat.realGdpPct},
      informationSet: "origin"};
    const withPolicy = simulateHistory({...inputs, events});
    const noPolicy = simulateHistory({...inputs, events: []});
    const withRows = compareHistory(withPolicy, accounts);
    const noRows = compareHistory(noPolicy, accounts);
    const rows = withRows.map((result, index) => {
      const current = result.observed;
      const previous = accounts.find((item) => item.year === current.year - 1);
      const uncovered = [...withPolicy.missingPolicies, ...withPolicy.excludedPolicies]
        .filter((item) => item.year <= current.year).map((item) => item.id);
      return {year: current.year,
        observed: {gdp: current.gdp, spending: current.spending, revenue: current.revenue,
          deficit: current.spending - current.revenue, debt: current.debt,
          observedStockFlow: current.debt - previous.debt - (current.spending - current.revenue),
          officialStockFlow: current.officialStockFlow},
        predicted: {gdp: result.prediction.gdp, spending: result.prediction.spending,
          revenue: result.prediction.revenue, deficit: result.prediction.deficit,
          debt: result.prediction.debt, directSpending: result.prediction.directSpending,
          directRevenue: result.prediction.directRevenue,
          applied: result.prediction.applied},
        error: Object.fromEntries(metrics.map((metric) => [metric, result.error[metric]])),
        noPolicyError: Object.fromEntries(metrics.map((metric) => [metric, noRows[index].error[metric]])),
        coverage: "partial_not_causal", uncovered};
    });
    const score = (field) => Object.fromEntries(metrics.map((metric) =>
      [metric, meanAbsolute(rows.map((row) => row[field][metric]))]));
    return {...definition, origin: withPolicy.origin, rows,
      maeWithEncodedPolicies: score("error"), maeWithoutEncodedPolicies: score("noPolicyError"),
      missingPolicies: withPolicy.missingPolicies, excludedPolicies: withPolicy.excludedPolicies,
      eligibility: "not_eligible_for_policy_effect_validation"};
  });
  const vat = policy.checks.find((item) => item.id === "vat_2014_total");
  if (!vat) throw new Error("Contrôle TVA 2014 manquant");
  return {status: "partial_historical_diagnostic_not_independently_reviewed",
    reviewedByIndependentParty: false,
    modelEvaluated: "scripts/historical-engine.mjs — prototype distinct du moteur principal dist/app.js",
    informationSet: "origin_only_for_input_amounts_and_context",
    sourceVintage: frozen.asOf,
    sourceFiles: frozen.sources,
    codeSha256: Object.fromEntries(["scripts/historical-engine.mjs", "scripts/comparable-insee-benchmark.mjs",
      "research/insee-validation-annual.json", "research/historical-policy-timeline.json",
      "research/historical-parameters.json", "dist/data.js"].map((path) => [path, sha256(path)])),
    caveats: [
      "Les observations Insee 2026 utilisées au départ sont révisées ex post, pas des millésimes connus à l'origine.",
      "La réponse TVA vient de Mésange 2017 : elle n'était pas disponible à l'origine 2013, même si le rendement ex ante l'était.",
      "Les mesures et chocs manquants empêchent d'attribuer les écarts aux politiques encodées.",
      "Le chômage contextuel vient d'Eurostat ; ne pas le traiter comme cible Insee homogène.",
      "La dette simulée suppose un ajustement stock-flux nul ; les écarts de dette incluent les ajustements publiés par l'Insee.",
      "La comparaison avec/sans mesures n'est pas un contrefactuel causal, et aucune variante du moteur principal n'est validée ici."
    ],
    vat2014YieldCheck: {exAnteInputBn: vat.modelInputBn, inseeAttributedBn: vat.observedBn,
      differenceBn: vat.modelInputBn - vat.observedBn, source: vat.source,
      interpretation: "contrôle de rendement seulement, pas test de l'effet PIB/emploi"},
    cases};
}

const main = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (main) {
  const result = runComparableBenchmark();
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    console.log("Banc Insee 2003–2025 · prototype de rejeu, NON validation du moteur principal ni revue indépendante.");
    console.log("Origine | Année | PIB écart % | Dépenses Md€ | Recettes Md€ | Déficit pt | Dette pt | Mesures absentes/exclues");
    for (const item of result.cases) for (const row of item.rows) {
      const e = row.error;
      console.log(`${item.originYear} | ${row.year} | ${e.gdpPct.toFixed(2)} | ${e.spendingBn.toFixed(1)} | ${e.revenueBn.toFixed(1)} | ${e.deficitRatio.toFixed(2)} | ${e.debtRatio.toFixed(2)} | ${row.uncovered.join(", ") || "inventaire non exhaustif"}`);
    }
    console.log(`TVA 2014 : input ex ante ${result.vat2014YieldCheck.exAnteInputBn} Md€ ; Insee attribue ${result.vat2014YieldCheck.inseeAttributedBn} Md€ ; écart ${result.vat2014YieldCheck.differenceBn.toFixed(1)} Md€.`);
    console.log("Attention : la réponse TVA de Mésange 2017 est postérieure à l'origine 2013 ; il ne s'agit pas d'une vraie prévision à millésime d'époque.");
    console.log("Aucun de ces cas ne permet d'estimer l'effet causal d'une réforme ni de classer EcoSim face aux autres modèles.");
  }
}
