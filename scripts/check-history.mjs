import fs from "node:fs";
import vm from "node:vm";

const context = {window:{}};
vm.runInNewContext(fs.readFileSync(new URL("../dist/history.js", import.meta.url), "utf8"), context);
const local = context.window.ECOSIM_HISTORY.rows;
const root = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/";
const queries = {
  gdp:"nama_10_gdp?geo=FR&na_item=B1GQ&unit=CP_MEUR&sinceTimePeriod=2003",
  realGrowth:"nama_10_gdp?geo=FR&na_item=B1GQ&unit=CLV_PCH_PRE&sinceTimePeriod=2003",
  deficitRatio:"gov_10a_main?geo=FR&sector=S13&na_item=B9&unit=PC_GDP&sinceTimePeriod=2003",
  debtRatio:"gov_10dd_edpt1?geo=FR&sector=S13&na_item=GD&unit=PC_GDP&sinceTimePeriod=2003",
  unemployment:"une_rt_a?geo=FR&sex=T&age=Y15-74&unit=PC_ACT&sinceTimePeriod=2003"
};

async function series(query) {
  const response = await fetch(root + query, {signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error(`Eurostat : HTTP ${response.status}`);
  const data = await response.json();
  if (data.error || !data.dimension?.time?.category?.index) throw new Error("Réponse Eurostat inattendue");
  return Object.fromEntries(Object.entries(data.dimension.time.category.index)
    .map(([year,index]) => [Number(year),data.value[String(index)]]));
}

const remote = Object.fromEntries(await Promise.all(Object.entries(queries)
  .map(async ([metric,query]) => [metric,await series(query)])));
let differences = 0;
for (const row of local) {
  for (const metric of Object.keys(queries)) {
    const raw = remote[metric][row.year];
    const latest = metric === "gdp" ? raw / 1000 : metric === "deficitRatio" ? -raw : raw;
    if (!Number.isFinite(latest) || Math.abs(row[metric] - latest) > 0.051) {
      console.log(`${row.year} ${metric}: copie ${row[metric]}, Eurostat ${latest}`);
      differences += 1;
    }
  }
}
if (differences) {
  console.error(`${differences} écart(s) : vérifier les révisions avant toute mise à jour de dist/history.js.`);
  process.exitCode = 1;
} else console.log(`Copie historique conforme aux 5 séries Eurostat pour ${local.length} années.`);
