import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const base = "https://nicolasmoreau1982-beep.github.io/";
const pages = [
  ["../dist/index.html", base],
  ["../dist/audit.html", `${base}audit.html`],
  ["../dist/confidentialite.html", `${base}confidentialite.html`]
];
const sitemap = read("../dist/sitemap.xml");
for (const [path, url] of pages) {
  const html = read(path);
  assert.match(html, new RegExp(`<link rel="canonical" href="${url.replaceAll(".", "\\.")}" \\/>`));
  assert.ok(sitemap.includes(`<loc>${url}</loc>`), `${url} absent du sitemap`);
  assert.doesNotMatch(html, /<meta name="keywords"/i);
}

const home = read("../dist/index.html");
const politics = home.slice(home.indexOf('<section class="politics-lab"'), home.indexOf('<section class="budget-editor"'));
for (const name of ["Rassemblement National", "Renaissance", "La France insoumise", "Parti socialiste",
  "Les Républicains", "Les Écologistes", "MoDem", "Horizons", "LIOT", "GDR", "UDR"]) {
  assert.ok(politics.includes(name), `${name} absent du HTML public`);
}
assert.match(home, /traductions partielles sont celles d’EcoSim, pas les chiffrages officiels/);
assert.match(home, /Présidentielle 2027 : comparer les orientations/);
assert.match(home, /pas les programmes individuels des candidats/);

const robots = read("../dist/robots.txt");
assert.doesNotMatch(robots, /^Disallow:/m);
assert.ok(robots.includes(`Sitemap: ${base}sitemap.xml`));
assert.doesNotMatch(sitemap, /sleekmouse9\.chatgpt\.site/);
assert.doesNotMatch(sitemap, /EcoSimFrance\//);

const workflow = read("../.github/workflows/static.yml");
assert.match(workflow, /path:\s*['"]?\.\/dist['"]?/);

console.log("SEO : pages canoniques, sitemap et formations politiques visibles contrôlés.");
