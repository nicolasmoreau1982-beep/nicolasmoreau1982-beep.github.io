import fs from "node:fs";
import {fileURLToPath} from "node:url";

const source = new URL("../research/insee-population-projection.json", import.meta.url);
const destination = new URL("../dist/insee-projection.js", import.meta.url);
const data = JSON.parse(fs.readFileSync(source, "utf8"));
if (data.rows.length !== 31 || data.rows[0].year !== 2026 || data.rows.at(-1).year !== 2056) {
  throw new Error("Projection démographique 2026–2056 incomplète");
}
const payload = {sourcePage: data.sourcePage, published: data.published, scenario: data.scenario,
  rows: data.rows};
fs.writeFileSync(destination, `// Généré par node scripts/export-insee-projection.mjs ; ne pas éditer à la main.\nwindow.ECOSIM_INSEE_PROJECTION = ${JSON.stringify(payload)};\n`);
console.log(`Projection démographique Insee exportée : ${fileURLToPath(destination)}.`);
