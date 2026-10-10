#!/usr/bin/env node
// Diagnostic ex post conditionnel : droit du barème, revenus et effectifs de l'année connus.
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const observed = JSON.parse(fs.readFileSync(new URL("research/fiscal-history.json", root), "utf8"));
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL("dist/fiscal.js", root), "utf8"), context);
const fiscal = context.window.ECOSIM_FISCAL;
const syntheticIncomeBn = fiscal.households.reduce((sum, home) => sum + home.taxableIncome * home.weight / 1e9, 0);
const syntheticUnitsM = fiscal.households.reduce((sum, home) => sum + home.weight / 1e6, 0);
const rules = new Map(observed.incomeTaxBrackets.rows.map((row) => [row.year, row]));

export function modelIncomeTax(row, taxableShare) {
  if (!Number.isFinite(taxableShare) || taxableShare <= 0 || taxableShare > 1.5) throw new Error("Part d'assiette invalide");
  const rule = rules.get(row.year);
  if (!rule) throw new Error(`Barème historique manquant : ${row.year}`);
  const brackets = [...rule.upper, Infinity].map((upper, index) =>
    ({ upper, rate: [0, 0.11, 0.30, 0.41, 0.45][index] }));
  const incomeScale = row.declaredIncomeBn / syntheticIncomeBn * taxableShare;
  const unitScale = row.taxUnitsM / syntheticUnitsM;
  return fiscal.households.reduce((sum, home) => sum + fiscal.progressive(
    home.taxableIncome * incomeScale / home.parts, brackets) * home.parts * home.weight * unitScale / 1e9, 0);
}

export function evaluate(share, years, datasetRows = observed.dgfipIncomeYear.rows) {
  const rows = datasetRows.filter((row) => years.includes(row.year));
  if (rows.length !== years.length) throw new Error("Série de rétrotest incomplète");
  const errors = rows.map((row) => modelIncomeTax(row, share) - row.netIncomeTaxBn);
  return { maeBn: errors.reduce((sum, error) => sum + Math.abs(error), 0) / rows.length,
    rmseBn: Math.sqrt(errors.reduce((sum, error) => sum + error ** 2, 0) / rows.length) };
}

export function fitShare(datasetRows = observed.dgfipIncomeYear.rows) {
  // Un seul paramètre identifiable sur les années d'apprentissage. Aucun point de validation n'entre ici.
  const train = observed.split.fitYears;
  let best = { share: 0, rmseBn: Infinity };
  for (let i = 4000; i <= 11000; i++) {
    const share = i / 10000;
    const score = evaluate(share, train, datasetRows).rmseBn;
    if (score < best.rmseBn) best = { share, rmseBn: score };
  }
  return best;
}

export function backtest() {
  const fit = fitShare();
  const rows = observed.dgfipIncomeYear.rows.map((row) => ({
    year: row.year, split: observed.split.fitYears.includes(row.year) ? "ajustement" : "validation",
    observedBn: row.netIncomeTaxBn, beforeBn: modelIncomeTax(row, 1), afterBn: modelIncomeTax(row, fit.share),
    errorBeforeBn: modelIncomeTax(row, 1) - row.netIncomeTaxBn,
    errorAfterBn: modelIncomeTax(row, fit.share) - row.netIncomeTaxBn
  }));
  const validation = evaluate(fit.share, observed.split.holdoutYears);
  const noFit = evaluate(1, observed.split.holdoutYears);
  const wealthTaxRows = observed.dgfipWealthTax.rows.map((row) => {
    const observedBn = row.bins.reduce((sum, [countK, , taxK]) => sum + countK * taxK / 1000, 0);
    const modeledBn = row.bins.reduce((sum, [countK, wealthK]) => sum +
      countK * fiscal.realEstateWealthTax(wealthK * 1000, fiscal.rules) / 1e6, 0);
    return { year: row.year, observedBn, modeledBn, errorBn: modeledBn - observedBn };
  });
  return { taxableShare: fit.share, inputRatioForCurrentSample: fit.share * observed.dgfipIncomeYear.rows.at(-1).declaredIncomeBn / syntheticIncomeBn,
    train: evaluate(fit.share, observed.split.fitYears), validation, noFitValidation: noFit, rows, wealthTaxRows,
    accountRows: observed.insee.rows.map((row) => ({ year: row.year,
      irNetForBudgetBn: row.irBeforeCreditsBn - row.irCreditsDeductedBn - row.irCreditsRefundedBn,
      wealthTaxBn: row.wealthTaxBn, inheritanceBn: row.inheritanceBn })) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL(`file://${process.argv[1]}`))) {
  const result = backtest();
  if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`Part d'assiette effective ajustée 2020–2022 : ${result.taxableShare}; facteur des foyers actuels : ${result.inputRatioForCurrentSample.toFixed(4)}`);
    console.table(result.rows.map((row) => ({ Année: row.year, Bloc: row.split,
      Observé: row.observedBn.toFixed(1), Brut: row.beforeBn.toFixed(1),
      Corrigé: row.afterBn.toFixed(1), Écart: row.errorAfterBn.toFixed(1) })));
    console.log(`Validation 2023–2024 : MAE ${result.validation.maeBn.toFixed(2)} Md€, RMSE ${result.validation.rmseBn.toFixed(2)} Md€ ; sans ajustement MAE ${result.noFitValidation.maeBn.toFixed(2)} Md€.`);
    console.log("IFI, barème appliqué aux patrimoines moyens DGFiP de quatre tranches marginales (aucun ajustement) :");
    console.table(result.wealthTaxRows.map((row) => ({ Année: row.year,
      Observé: row.observedBn.toFixed(2), Modèle: row.modeledBn.toFixed(2), Écart: row.errorBn.toFixed(2) })));
    console.log("Attention : ce test conditionnel ne valide ni les rendements de réformes, ni le solde public.");
  }
}
