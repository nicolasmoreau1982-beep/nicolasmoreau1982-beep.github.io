import fs from "node:fs";
import vm from "node:vm";

const context = {window:{}};
vm.runInNewContext(fs.readFileSync(new URL("../dist/history.js", import.meta.url), "utf8"), context);
const H = context.window.ECOSIM_HISTORY;
console.log(H.source);
console.log("Horizon | Cas | PIB nominal MAE / P80 (%) | Déficit MAE / P80 (pt) | Dette MAE / P80 (pt) | Chômage MAE / P80 (pt)");
for (const horizon of H.horizons) {
  const result = H.report[horizon];
  const cell = (metric) => `${result.metrics[metric].mae.toFixed(2)} / ${result.metrics[metric].p80.toFixed(2)}`;
  console.log(`${horizon} an(s) | ${result.n} | ${cell("gdpPct")} | ${cell("deficitRatio")} | ${cell("debtRatio")} | ${cell("unemployment")}`);
}
console.log("Attention : pseudo-hors-échantillon sur données révisées ; ce témoin n'est pas le moteur causal d'EcoSim.");
