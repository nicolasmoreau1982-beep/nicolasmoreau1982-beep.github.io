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
assert.match(home, /id="politics-model-select"[^>]*aria-describedby="politics-model-note"/);
assert.match(app, /politicsModelSelect\.innerHTML = modelSelect\.innerHTML/);
assert.match(app, /state\.politicsModel = event\.target\.value/);
assert.match(home, /id="visit-counter" hidden/);
assert.match(home, /id="app-error" role="alert" hidden/);
assert.match(home, /id="help-panel" role="region"[^>]*tabindex="-1" hidden/);
assert.equal((home.match(/class="help-dot"[^>]*aria-controls="help-panel"[^>]*aria-expanded="false"/g) || []).length, 2);
assert.match(app, /function initHelpAndAlerts\(/);
assert.match(app, /if \(error\) \{\s*\$\("#app-error-message"\)\.textContent = message;/);
assert.match(app, /Lien de scénario illisible : les réglages locaux ou de départ sont affichés/);
assert.match(styles, /\.app-error\[hidden\], \.help-panel\[hidden\] \{ display: none; \}/);
assert.match(styles, /\.field-label, \.model-description, \.calendar-control p,/);
assert.match(styles, /\.sector-card-heading span \{ font-size: 12px; line-height: 1\.5; \}/);
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
assert.match(styles, /\.top-actions \.mobile-nav-toggle, \.mobile-nav-action \{ display: none; \}/);
assert.match(styles, /@media \(max-width: 760px\)[\s\S]*?\.top-actions \.mobile-nav-toggle \{ display: grid;/);
assert.match(auditStyles, /grid-template-columns: minmax\(0, 1fr\)/);
assert.match(privacy, /id="privacy-share-title"/);
assert.match(privacy, /id="analytics-status"/);
assert.match(audit, /href="confidentialite\.html"/);
assert.doesNotMatch(read("../dist/robots.txt"), /sleekmouse9\.chatgpt\.site/);
assert.equal(fs.existsSync(new URL("../dist/sitemap.xml", import.meta.url)), true);

console.log("Parcours UX : navigation mobile, import, thèmes, audit et confidentialité contrôlés.");
