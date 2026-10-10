import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { backtest, evaluate, fitShare, modelIncomeTax } from "../scripts/fiscal-backtest.mjs";

const root = new URL("../", import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL("research/fiscal-history.json", root), "utf8"));
const result = backtest();
assert.deepEqual(data.split.fitYears, [2020, 2021, 2022]);
assert.deepEqual(data.split.holdoutYears, [2023, 2024]);
assert.equal(result.rows.length, 5);
assert.ok(Math.abs(fitShare().share - 0.7227) < 0.0001);
assert.ok(result.validation.maeBn > 7 && result.validation.maeBn < 8);
assert.ok(result.validation.maeBn < result.noFitValidation.maeBn);
assert.equal(result.accountRows.find((row) => row.year === 2025).irNetForBudgetBn, 94.31);

const poisoned = data.dgfipIncomeYear.rows.map((row) => row.year >= 2023
  ? { ...row, netIncomeTaxBn: 10000 } : row);
assert.equal(fitShare(poisoned).share, result.taxableShare, "Une réalisation future ne doit pas affecter l'ajustement");
const original = data.dgfipIncomeYear.rows.find((row) => row.year === 2024).netIncomeTaxBn;
const trainingOnly = evaluate(result.taxableShare, data.split.fitYears);
assert.ok(trainingOnly.rmseBn < 2.5);
assert.equal(original, 92);
assert.ok(modelIncomeTax(data.dgfipIncomeYear.rows.at(-1), result.taxableShare) > original);
assert.equal(result.wealthTaxRows.length, 8);
assert.ok(result.wealthTaxRows.every((row) => row.errorBn > 0.15 && row.errorBn < 0.4));
assert.ok(Math.abs(result.wealthTaxRows.at(-1).observedBn - 2.33372) < 0.001);

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL("dist/fiscal.js", root), "utf8"), context);
const fiscal = context.window.ECOSIM_FISCAL;
assert.ok(Math.abs(fiscal.incomeTaxBaseFactor - result.inputRatioForCurrentSample) < 0.00005);
assert.ok(Math.abs(fiscal.simulate().sample.referenceTotals.ir - 98.824) < 0.01);
assert.ok(fiscal.simulate().sample.referenceTotals.inheritance > 23);
console.log("Fiscalité : rétrotest 2020–2024, séparation apprentissage/validation et rapprochement 3.217 vérifiés.");
