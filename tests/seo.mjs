import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const base = "https://nicolasmoreau1982-beep.github.io/";
const pages = [
  ["../dist/index.html", base],
  ["../dist/audit.html", `${base}audit.html`],
  ["../dist/confidentialite.html", `${base}confidentialite.html`],
  ["../dist/comprendre-budget-france.html", `${base}comprendre-budget-france.html`],
  ["../dist/reforme-retraites.html", `${base}reforme-retraites.html`],
  ["../dist/programmes-economiques-2027.html", `${base}programmes-economiques-2027.html`],
  ["../dist/reduire-deficit-public.html", `${base}reduire-deficit-public.html`],
  ["../dist/dette-publique-france.html", `${base}dette-publique-france.html`],
  ["../dist/a-propos.html", `${base}a-propos.html`]
];
const sitemap = read("../dist/sitemap.xml");
for (const [path, url] of pages) {
  const html = read(path);
  assert.match(html, new RegExp(`<link rel="canonical" href="${url.replaceAll(".", "\\.")}" \\/>`));
  assert.ok(sitemap.includes(`<loc>${url}</loc>`), `${url} absent du sitemap`);
  assert.doesNotMatch(html, /<meta name="keywords"/i);
  assert.match(html, /<meta\s+name="description"/i);
  assert.match(html, /<h1[ >]/i);
  assert.match(html, /<title>[^<]+<\/title>/i);
}
assert.equal((sitemap.match(/<loc>/g) || []).length, pages.length);
const guidePaths = pages.slice(3).map(([path]) => path);
for (const path of guidePaths) {
  const html = read(path);
  assert.match(html, /href="index\.html#/);
  assert.match(html, /href="audit\.html/);
  assert.match(html, /href="https:\/\//);
  assert.match(html, /href="guides\.css"/);
  for (const [, target] of html.matchAll(/href="([a-z][^":?#]*\.html)(?:#[^"]*)?"/gi)) {
    assert.ok(fs.existsSync(new URL(`../dist/${target}`, import.meta.url)), `${path} : lien local manquant ${target}`);
  }
}

const home = read("../dist/index.html");
assert.match(home, /<title>Simulateur du budget et de la dette de la France — EcoSim<\/title>/);
assert.match(home, /les résultats pour 2026 et les années suivantes sont des simulations/);
assert.match(home, /Préparer la présidentielle 2027/);
assert.match(read("../dist/audit.html"), /<title>Méthodologie et fiabilité du simulateur — EcoSim France<\/title>/);
assert.match(read("../dist/confidentialite.html"), /<title>Confidentialité — EcoSim France<\/title>/);
assert.match(read("../dist/comprendre-budget-france.html"), /valeurs affichées pour 2026 résultent de la projection/);
assert.match(read("../dist/comprendre-budget-france.html"), /Budget de l'État<\/dt>/);
assert.match(read("../dist/comprendre-budget-france.html"), /Déficit public<\/dt>/);
assert.match(home, /href="comprendre-budget-france\.html">Je découvre le budget/);
for (const [, url] of pages.slice(3)) {
  assert.ok(home.includes(`href="${url.slice(base.length)}"`), `${url} absent des liens HTML d’accueil`);
}
const pensions = read("../dist/reforme-retraites.html");
const scenarioMatch = pensions.match(/href="index\.html#scenario=([A-Za-z0-9_-]+)"/);
assert.ok(scenarioMatch, "Lien de scénario retraite absent");
const scenario = JSON.parse(Buffer.from(scenarioMatch[1], "base64url").toString("utf8"));
assert.equal(scenario.engines.pensionIndex, 1);
const debt = read("../dist/dette-publique-france.html");
const debtScenarioMatch = debt.match(/href="index\.html#scenario=([A-Za-z0-9_-]+)"/);
assert.ok(debtScenarioMatch, "Lien de scénario dette absent");
const debtScenario = JSON.parse(Buffer.from(debtScenarioMatch[1], "base64url").toString("utf8"));
assert.equal(debtScenario.changes.R_IR, 5);
assert.match(debt, /choc comptable illustratif, pas un nouveau barème/);
const about = read("../dist/a-propos.html");
assert.match(about, /https:\/\/github\.com\/nicolasmoreau1982-beep\/nicolasmoreau1982-beep\.github\.io\/issues\/new\/choose/);
assert.match(about, /ne revendiquons donc pas une indépendance institutionnelle démontrée/);
const politics = home.slice(home.indexOf('<section class="politics-lab"'), home.indexOf('<section class="budget-editor"'));
for (const name of ["Rassemblement National", "Renaissance", "La France insoumise", "Parti socialiste",
  "Les Républicains", "Les Écologistes", "MoDem", "Horizons", "LIOT", "GDR", "UDR"]) {
  assert.ok(politics.includes(name), `${name} absent du HTML public`);
}
assert.match(home, /traductions partielles sont celles d’EcoSim, pas les chiffrages officiels/);
assert.match(home, /Présidentielle 2027 : comparer les orientations/);
assert.match(home, /pas les programmes individuels des candidats/);

const robots = read("../dist/robots.txt");
assert.equal(read("../dist/google3d20062100896a35.html").trim(), "google-site-verification: google3d20062100896a35.html");
assert.doesNotMatch(robots, /^Disallow:/m);
assert.ok(robots.includes(`Sitemap: ${base}sitemap.xml`));
assert.doesNotMatch(sitemap, /sleekmouse9\.chatgpt\.site/);
assert.doesNotMatch(sitemap, /EcoSimFrance\//);

const workflow = read("../.github/workflows/static.yml");
assert.match(workflow, /path:\s*['"]?\.\/dist['"]?/);
for (const [oldPath, url] of [
  ["../dist/EcoSimFrance/index.html", base],
  ["../dist/EcoSimFrance/audit.html", `${base}audit.html`],
  ["../dist/EcoSimFrance/confidentialite.html", `${base}confidentialite.html`]
]) {
  const redirect = read(oldPath);
  assert.ok(redirect.includes(`href="${url}"`));
  assert.match(redirect, /name="robots" content="noindex,follow"/);
  assert.match(redirect, /location\.search \+ location\.hash/);
}

console.log("SEO : pages canoniques, sitemap et formations politiques visibles contrôlés.");
