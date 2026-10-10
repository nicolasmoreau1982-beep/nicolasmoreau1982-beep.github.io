import fs from "node:fs";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root = new URL("../", import.meta.url);
const context = {window:{},console,TextEncoder,TextDecoder,URL};
for (const path of ["dist/data.js","dist/history.js","dist/insee-projection.js","dist/fiscal.js"]) {
  vm.runInNewContext(fs.readFileSync(new URL(path, root), "utf8"), context);
}
const source = fs.readFileSync(new URL("dist/app.js", root), "utf8");
const start = source.indexOf("(() => {") + "(() => {".length;
const end = source.indexOf("  function initializeControls()");
if (start < 1 || end < start) throw new Error("Moteur EcoSim introuvable");
vm.runInNewContext(`${source.slice(start,end)}\nglobalThis.model = {state,calculateProjection};`, context);
const {state,calculateProjection} = context.model;
const D = context.window.ECOSIM_DATA;
const baseline = calculateProjection().baseline;
const horizons = [1,3,5,10];
const shock = D.BASE.gdp / 100; // 1 point du PIB initial 2025, en Md€.

const cases = [
  {id:"vat",label:"Hausse de TVA",changes:{R_TVA:shock},comparability:"ancrage partiel",
    mesange:{1:-0.32,3:-0.72,5:-0.81,10:-0.78}},
  {id:"investment_proxy",label:"Dépense transport, proxy imparfait d'investissement public",
    changes:{GF0405:shock},comparability:"non équivalent",
    mesange:{1:1.31,3:1.22,5:0.93,10:0.57}},
  {id:"social_proxy",label:"Cotisations sociales agrégées, proxy imparfait des seules cotisations employeur",
    changes:{R_SOCIAL:-shock},comparability:"non équivalent",
    mesange:{1:0.20,3:0.76,5:0.97,10:1.29}}
];

export function benchmark() {
  const results = [];
  for (const item of cases) {
    state.changes = item.changes;
    const points = calculateProjection().scenario;
    results.push({id:item.id,label:item.label,comparability:item.comparability,
      rows:horizons.map((horizon) => {
        const index = horizon-1;
        const ecosimRealPct = points[index].outputGap;
        return {horizon,mesangeRealPct:item.mesange[horizon],ecosimRealPct,
          gapPoints:ecosimRealPct-item.mesange[horizon]};
      }),
      vatCpiYear1Points:item.id === "vat" ? points[0].inflation-baseline[0].inflation : null});
  }
  state.changes = {};
  return results;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log("Référence : Insee/DG Trésor, Mésange 2017, tableaux 4.1.1, 4.1.3 et 4.1.5.");
  console.log("Choc permanent de 1 % du PIB 2025 en Md€ constants de prix ; les définitions des chocs diffèrent.");
  for (const item of benchmark()) {
    console.log(`\n${item.label} — ${item.comparability}`);
    console.log("Année | Mésange PIB réel (%) | EcoSim écart de PIB réel (%) | Écart (pt)");
    for (const row of item.rows) console.log(`${row.horizon} | ${row.mesangeRealPct.toFixed(2)} | ${row.ecosimRealPct.toFixed(2)} | ${row.gapPoints.toFixed(2)}`);
    if (item.id === "vat") console.log(`TVA : effet sur l'inflation IPC à 1 an ${item.vatCpiYear1Points.toFixed(2)} pt ; niveau IPC Mésange +1,48 %.`);
  }
  console.log("La TVA est ancrée sur Mésange : proximité attendue, pas validation indépendante. Les deux autres variantes sont des proxys non comparables au sens strict.");
}
