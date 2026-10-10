import fs from "node:fs";
import vm from "node:vm";
import {fileURLToPath} from "node:url";
import {compareHistory, simulateHistory} from "./historical-engine.mjs";
import {simulateQuarterlyHistory} from "./historical-quarterly-engine.mjs";
import {compareQuarterlyHistory, annualReconciliation} from "./insee-observations.mjs";

const root = new URL("../", import.meta.url);
const readJson = (path) => JSON.parse(fs.readFileSync(new URL(path, root), "utf8"));
const browserContext = {window: {}};
for (const path of ["dist/history.js", "dist/data.js"]) {
  vm.runInNewContext(fs.readFileSync(new URL(path, root), "utf8"), browserContext);
}
const H = browserContext.window.ECOSIM_HISTORY;
const D = browserContext.window.ECOSIM_DATA;
const historicalAccounts = readJson("research/historical-accounts.json");
export const policyTimeline = readJson("research/historical-policy-timeline.json");
const eventInventory = readJson("research/historical-event-inventory.json");
export const modelParameters = readJson("research/historical-parameters.json");
const accountRows = new Map(historicalAccounts.rows.map(([year, spending, revenue]) => [year, {spending, revenue}]));

export const accounts = H.rows.map((row) => {
  const values = accountRows.get(row.year);
  if (!values) throw new Error(`Compte public manquant en ${row.year}`);
  return {
    ...row,
    spending: values.spending,
    revenue: values.revenue,
    debt: row.gdp * row.debtRatio / 100,
    observedDeficitRatio: row.deficitRatio
  };
});
export const observedSourceReconciliation = annualReconciliation(accounts);

export function runHistoricalDiagnostics({origins = [2020, 2015, 2010, 2005], events = [...policyTimeline.events, ...eventInventory.events],
  context = {}, parameters = modelParameters, responses = {vat: D.researchVariants.vat.realGdpPct},
  informationSet = "retrospective", frequency = "annual"} = {}) {
  if (!["annual", "quarterly"].includes(frequency)) throw new Error("Fréquence historique inconnue");
  return origins.map((originYear) => {
    const horizon = H.rows.at(-1).year - originYear;
    const simulate = frequency === "quarterly" ? simulateQuarterlyHistory : simulateHistory;
    const projection = simulate({originYear, horizon, accounts, events, context, parameters, responses, informationSet});
    const compared = compareHistory(projection, accounts);
    return {originYear, horizon, informationSet, frequency, origin: projection.origin, projection: projection.rows,
      quarters: projection.quarters,
      comparedQuarters: frequency === "quarterly" ? compareQuarterlyHistory(projection) : undefined,
      compared,
      missingPolicies: projection.missingPolicies, excludedPolicies: projection.excludedPolicies,
      coverage: projection.coverage,
      target: compared.at(-1)};
  });
}

export function summarizeHistoricalDiagnostics(results) {
  return results.map((item) => {
    const available = item.compared.filter((row) => row.error);
    const meanAbsolute = (key) => available.reduce((sum, row) => sum + Math.abs(row.error[key]), 0) / available.length;
    const largest = (key) => available.reduce((previous, row) =>
      !previous || Math.abs(row.error[key]) > Math.abs(previous.error[key]) ? row : previous, null);
    return {originYear: item.originYear, years: available.length,
      mae: {gdpPct: meanAbsolute("gdpPct"), spendingBn: meanAbsolute("spendingBn"),
        revenueBn: meanAbsolute("revenueBn"), deficitRatio: meanAbsolute("deficitRatio"),
        debtRatio: meanAbsolute("debtRatio"), unemployment: meanAbsolute("unemployment")},
      largest: {gdpPct: largest("gdpPct")?.year, spendingBn: largest("spendingBn")?.year,
        revenueBn: largest("revenueBn")?.year, deficitRatio: largest("deficitRatio")?.year,
        debtRatio: largest("debtRatio")?.year}};
  });
}

export function summarizeQuarterlyDiagnostics(results) {
  return results.map((item) => {
    const available = (item.comparedQuarters || []).filter((row) => row.error);
    const meanAbsolute = (key) => available.length
      ? available.reduce((sum, row) => sum + Math.abs(row.error[key]), 0) / available.length : null;
    return {originYear: item.originYear, quarters: available.length,
      mae: {gdpPct: meanAbsolute("gdpPct"), spendingBn: meanAbsolute("spendingBn"),
        revenueBn: meanAbsolute("revenueBn"), deficitBn: meanAbsolute("deficitBn")}};
  });
}

const main = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (main) {
  const arguments_ = process.argv.slice(2);
  const inputIndex = arguments_.indexOf("--inputs");
  const custom = inputIndex >= 0 ? JSON.parse(fs.readFileSync(arguments_[inputIndex + 1], "utf8")) : {};
  if (arguments_.includes("--blind")) custom.informationSet = "origin";
  if (arguments_.includes("--quarterly")) custom.frequency = "quarterly";
  const results = runHistoricalDiagnostics(custom);
  const ablation = arguments_.includes("--ablate")
    ? summarizeHistoricalDiagnostics(runHistoricalDiagnostics({...custom, events: []})) : null;
  if (arguments_.includes("--json")) {
    process.stdout.write(`${JSON.stringify({status: "incomplete", source: historicalAccounts.source,
      quarterlyObservedSource: "research/insee-quarterly-observed.json",
      observedSourceReconciliation,
      policySource: "research/historical-policy-timeline.json", policyChecks: policyTimeline.checks,
      note: `Écarts exploratoires, pas validation d'EcoSim : mesures et chocs incomplets, CICE comptable projeté au PLF 2019 et réponse macro non estimée.${custom.frequency === "quarterly" ? " Flux de référence simulés synthétiques ; cible trimestrielle Insee CVS-CJO observée, sans harmonisation annuelle forcée." : ""}`,
      summary: summarizeHistoricalDiagnostics(results), quarterlySummary: custom.frequency === "quarterly"
        ? summarizeQuarterlyDiagnostics(results) : null, ablationWithoutPolicies: ablation, results}, null, 2)}\n`);
  } else {
    console.log(`Rejeu 2005/2010/2015/2020 → 2025 · ${custom.frequency === "quarterly" ? "calcul trimestriel, comparaison annuelle" : "calcul annuel"} · ${custom.informationSet === "origin" ? "sans entrées futures" : "rétrospectif"} · diagnostic INCOMPLET, non une validation du moteur EcoSim 2025.`);
    console.log("Origine | PIB écart % | Dépenses écart Md€ | Recettes écart Md€ | Déficit écart pt | Dette écart pt | Mesures absentes du calcul");
    for (const item of results) {
      const error = item.target.error;
      const fmt = (number) => number.toFixed(1).padStart(7);
      const absent = [...item.missingPolicies, ...item.excludedPolicies].map((event) => event.id);
      console.log(`${item.originYear} (${item.horizon} ans) | ${fmt(error.gdpPct)} | ${fmt(error.spendingBn)} | ${fmt(error.revenueBn)} | ${fmt(error.deficitRatio)} | ${fmt(error.debtRatio)} | ${absent.join(", ") || "aucune identifiée (inventaire incomplet)"}`);
    }
    if (arguments_.includes("--annual")) {
      console.log("\nÉcarts annuels (simulé − observé ; déficit et dette en points de PIB) :");
      console.log("Départ | Année | PIB % | Dép. Md€ | Rec. Md€ | Déficit pt | Dette pt | Chômage pt");
      for (const item of results) for (const {year, error} of item.compared) {
        if (!error) continue;
        const fmt = (value) => value.toFixed(1).padStart(7);
        console.log(`${item.originYear} | ${year} | ${fmt(error.gdpPct)} | ${fmt(error.spendingBn)} | ${fmt(error.revenueBn)} | ${fmt(error.deficitRatio)} | ${fmt(error.debtRatio)} | ${fmt(error.unemployment)}`);
      }
      console.log("\nErreur absolue moyenne sur les années de chaque trajectoire :");
      for (const item of summarizeHistoricalDiagnostics(results)) {
        console.log(`${item.originYear} (${item.years} ans) : PIB ${item.mae.gdpPct.toFixed(1)} %, dépenses ${item.mae.spendingBn.toFixed(1)} Md€, recettes ${item.mae.revenueBn.toFixed(1)} Md€, déficit ${item.mae.deficitRatio.toFixed(1)} pt, dette ${item.mae.debtRatio.toFixed(1)} pt.`);
      }
    }
    if (custom.frequency === "quarterly" && arguments_.includes("--quarters")) {
      console.log("\nÉcarts trimestriels (simulé − Insee CVS-CJO, Md€ ; déficit positif = besoin de financement) :");
      console.log("Départ | Trimestre | Dépenses | Recettes | Déficit | PIB");
      for (const item of results) for (const row of item.comparedQuarters) {
        if (!row.error) continue;
        const fmt = (value) => value.toFixed(1).padStart(7);
        console.log(`${item.originYear} | ${row.year}-T${row.quarter} | ${fmt(row.error.spendingBn)} | ${fmt(row.error.revenueBn)} | ${fmt(row.error.deficitBn)} | ${fmt(row.error.gdpBn)}`);
      }
      console.log("\nErreur absolue moyenne trimestrielle :");
      for (const item of summarizeQuarterlyDiagnostics(results)) {
        console.log(`${item.originYear} (${item.quarters} T) : dépenses ${item.mae.spendingBn.toFixed(1)} Md€, recettes ${item.mae.revenueBn.toFixed(1)} Md€, déficit ${item.mae.deficitBn.toFixed(1)} Md€, PIB ${item.mae.gdpPct.toFixed(1)} %.`);
      }
    }
    if (ablation) {
      console.log("\nAblation indicative : erreur absolue moyenne avec mesures / sans aucune mesure (points de déficit/PIB). L'absence de politique n'est pas un contrefactuel historique.");
      for (const [index, item] of summarizeHistoricalDiagnostics(results).entries()) {
        console.log(`${item.originYear} : ${item.mae.deficitRatio.toFixed(2)} / ${ablation[index].mae.deficitRatio.toFixed(2)} pt`);
      }
    }
    console.log(custom.informationSet === "origin"
      ? "Mode sans entrées futures : seuls les événements datés connus à l'origine sont autorisés ; les comptes initiaux restent des séries révisées, pas des millésimes publiés alors."
      : "Les montants TVA sont ex ante ; le CICE provient d'une projection PLF 2019, sa bascule d'un chiffrage ex ante 2019. Effets macro CICE non estimés. L'écart n'est pas une mesure de précision prédictive.");
    console.log("Données : montants APU Insee révisés 2003–2025 (tableau 3.201), PIB/dette/chômage Eurostat révisés ; aucun choc exogène futur n'est injecté.");
    if (custom.frequency === "quarterly") {
      console.log("Attention : référence simulée ventilée à partir d'hypothèses annuelles ; comparaison trimestrielle désormais disponible avec les comptes Insee CVS-CJO, sans validation causale ni harmonisation annuelle forcée.");
    }
  }
}
