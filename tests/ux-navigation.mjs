import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const home = read("../dist/index.html");
const audit = read("../dist/audit.html");
const privacy = read("../dist/confidentialite.html");
const app = read("../dist/app.js");
const styles = read("../dist/styles.css");
const auditStyles = read("../dist/audit.css");

for (const page of [home, audit, privacy]) {
  assert.match(page, /src="theme\.js"/);
  assert.match(page, /src="analytics\.js"/);
  assert.doesNotMatch(page, /sleekmouse9\.chatgpt\.site/);
}
assert.match(home, /id="mobile-nav-toggle"[^>]*aria-controls="main-nav"[^>]*aria-expanded="false"/);
assert.match(home, /id="mobile-export-button"/);
assert.match(home, /href="confidentialite\.html"/);
assert.match(home, /id="visit-counter" hidden/);
assert.match(styles, /\.visit-counter\[hidden\] \{ display: none; \}/);
assert.match(home, /id="import-scenario-file"[^>]*accept="\.json,application\/json"/);
assert.match(home, /id="chart-data-body"/);
assert.match(app, /function parseScenarioImport\(/);
assert.match(app, /function restoreScenario\(/);
assert.match(app, /function initMobileMenu\(/);
assert.match(app, /\$\("#chart-data-body"\)\.replaceChildren/);
assert.match(app, /function clearScenarioLink\(\)/);
assert.match(app, /history\.replaceState\(null, "", location\.pathname \+ location\.search\)/);
assert.match(styles, /\.topbar nav\.is-open/);
assert.match(auditStyles, /grid-template-columns: minmax\(0, 1fr\)/);
assert.match(privacy, /id="privacy-share-title"/);
assert.match(privacy, /id="analytics-status"/);
assert.match(audit, /href="confidentialite\.html"/);
assert.doesNotMatch(read("../dist/robots.txt"), /sleekmouse9\.chatgpt\.site/);
assert.equal(fs.existsSync(new URL("../dist/sitemap.xml", import.meta.url)), true);

console.log("Parcours UX : navigation mobile, import, thèmes, audit et confidentialité contrôlés.");
