import fs from "node:fs";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const context = {window:{}};
vm.runInNewContext(fs.readFileSync(new URL("../dist/history.js", import.meta.url), "utf8"), context);
const observed = new Map(context.window.ECOSIM_HISTORY.rows.map((row) => [row.year,row.realGrowth]));

// Chiffres transcrits des publications datées, sans réestimation rétrospective.
const vintages = [
  {published:"décembre 2019",year:2020,forecast:1.1,
    source:"https://publications.banque-france.fr/projections-macroeconomiques-decembre-2019"},
  {published:"décembre 2022",year:2023,forecast:0.3,
    source:"https://www.banque-france.fr/fr/publications-et-statistiques/publications/projections-macroeconomiques-decembre-2022"},
  {published:"décembre 2023",year:2024,forecast:0.9,
    source:"https://www.banque-france.fr/fr/publications-et-statistiques/publications/projections-macroeconomiques-decembre-2023"},
  {published:"décembre 2023",year:2025,forecast:1.3,
    source:"https://www.banque-france.fr/fr/publications-et-statistiques/publications/projections-macroeconomiques-decembre-2023"}
];

export function vintageAudit() {
  return vintages.map((item) => ({...item,observed:observed.get(item.year),
    error:Math.abs(item.forecast-observed.get(item.year))}));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log("Prévisions d'époque Banque de France vs croissance réelle Eurostat révisée (en points de %).");
  for (const row of vintageAudit()) console.log(`${row.published} → ${row.year}: prévu ${row.forecast.toFixed(1)}, observé ${row.observed.toFixed(1)}, écart ${row.error.toFixed(1)} | ${row.source}`);
  console.log("Ce contrôle porte sur les prévisions BDF, pas sur EcoSim : EcoSim n'existait pas à ces dates.");
}
