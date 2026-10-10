import fs from "node:fs";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root = new URL("../", import.meta.url);
const events = JSON.parse(fs.readFileSync(new URL("research/policy-events.json", root), "utf8"));
const context = {window:{},console,TextEncoder,TextDecoder,URL};
for (const path of ["dist/data.js","dist/history.js","dist/insee-projection.js","dist/fiscal.js"]) vm.runInNewContext(fs.readFileSync(new URL(path, root), "utf8"), context);
const source = fs.readFileSync(new URL("dist/app.js", root), "utf8");
const start = source.indexOf("(() => {") + "(() => {".length;
const end = source.indexOf("  function initializeControls()");
if (start < 1 || end < start) throw new Error("Moteur EcoSim introuvable");
vm.runInNewContext(`${source.slice(start,end)}\nglobalThis.model = {state,calculateProjection};`, context);
const D = context.window.ECOSIM_DATA;
const H = context.window.ECOSIM_HISTORY;

export function auditPolicyHistory() {
  return events.cases.map((item) => {
    if (item.status === "non_representable") return {id:item.id,status:item.status,reason:item.warning};
    const origin = H.rows.find((row) => row.year === item.baseYear);
    if (!origin) throw new Error(`PIB historique absent pour ${item.baseYear}`);
    const equivalent2025Bn = item.observedIncrementBn / origin.gdp * D.BASE.gdp;
    context.model.state.changes = {R_TVA:equivalent2025Bn};
    const predicted = context.model.calculateProjection().scenario[0].outputGap;
    context.model.state.changes = {};
    return {id:item.id,status:item.status,observedIncrementBn:item.observedIncrementBn,
      equivalent2025Bn,ecosimRealGdpPct:predicted,
      historicalModelEstimateRealGdpPct:item.contemporaryModelEstimateRealGdpPct,
      reason:item.warning};
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const item of auditPolicyHistory()) {
    if (item.status === "non_representable") console.log(`${item.id}: non testable — ${item.reason}`);
    else console.log(`${item.id}: choc comptable ${item.observedIncrementBn} Md€ en 2014, équivalent ${item.equivalent2025Bn.toFixed(2)} Md€ sur PIB 2025 ; EcoSim ${item.ecosimRealGdpPct.toFixed(2)} % de PIB réel à 1 an, estimation de modèle publiée à l'époque ${item.historicalModelEstimateRealGdpPct.toFixed(2)} %. Comparaison de modèles, pas effet observé.`);
  }
}
