import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const home = read("../dist/index.html");
const app = read("../dist/app.js");
const styles = read("../dist/styles.css");

assert.match(home, /id="active-scenario-name"/);
assert.match(home, /id="active-scenario-measures"/);
assert.match(home, /id="results-undo-button" disabled/);
assert.match(app, /function updateActiveScenario\(/);
assert.match(app, /\$\("#results-undo-button"\)\.addEventListener\("click", undo\)/);
assert.match(app, /function applyPreset\([\s\S]*?state\.structural = Object\.fromEntries\([\s\S]*?state\.fiscal = \{ \.\.\.F\.defaults \}/);
assert.match(app, /function undo\([\s\S]*?state\.name = previous\.name/);
assert.match(app, /class="category-mobile-detail"/);
assert.match(styles, /@media \(max-width: 760px\)[\s\S]*?\.category-mobile-detail \{ display: block/);
assert.match(home, /Laboratoire social expérimental/);
assert.doesNotMatch(home, /id="social-vote"|Sensibilité du vote sortant/);
assert.doesNotMatch(app, /sensibilite_vote_sortant_basse_points/);
assert.match(home, /<strong>Observé<\/strong>.*<strong>Modélisé<\/strong>.*<strong>Exploratoire<\/strong>/);
assert.match(app, /Signaler une erreur ↗/);

console.log("Crédibilité UX : scénario, annulation, mobile, statuts et prudence électorale vérifiés.");
