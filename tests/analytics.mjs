import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../dist/analytics.js", import.meta.url), "utf8");
assert.match(source, /const GOATCOUNTER_SITE = "";/);

function run(siteCode, hostname, fetchResponse = { ok: true, json: async () => ({ count: "1 234" }) }) {
  const appended = [];
  const requests = [];
  const counter = { hidden: true };
  const count = { textContent: "" };
  const status = { textContent: "Mesure désactivée" };
  const elements = { "visit-counter": counter, "visit-counter-count": count, "analytics-status": status };
  const document = {
    referrer: "https://example.org/article?private=1#secret",
    getElementById: (id) => elements[id] || null,
    createElement: () => ({ dataset: {}, listeners: {}, addEventListener(event, handler) { this.listeners[event] = handler; } }),
    head: { append: (script) => appended.push(script) },
  };
  const location = { hostname, pathname: "/audit.html", search: "?private=1", hash: "#scenario-secret" };
  const context = { document, location, URL, window: {}, fetch: async (url) => { requests.push(url); return fetchResponse; } };
  const configured = source.replace('const GOATCOUNTER_SITE = "";', `const GOATCOUNTER_SITE = ${JSON.stringify(siteCode)};`);
  vm.runInNewContext(configured, context);
  return { appended, requests, counter, count, status, window: context.window };
}

let result = run("", "nicolasmoreau1982-beep.github.io");
assert.equal(result.appended.length, 0, "un compte absent ne doit rien charger");
assert.equal(result.requests.length, 0);
assert.equal(result.counter.hidden, true);

result = run("ecosimfrance", "localhost");
assert.equal(result.appended.length, 0, "pas de suivi en prévisualisation locale");

result = run("ecosimfrance", "nicolasmoreau1982-beep.github.io");
assert.equal(result.appended.length, 1);
assert.equal(result.appended[0].src, "https://gc.zgo.at/count.js");
assert.equal(result.appended[0].dataset.goatcounter, "https://ecosimfrance.goatcounter.com/count");
assert.equal(result.window.goatcounter.path(), "/audit.html");
assert.equal(result.window.goatcounter.referrer(), "https://example.org");
assert.equal(result.status.textContent, "GoatCounter configuré");
await result.appended[0].listeners.load();
assert.deepEqual(result.requests, ["https://ecosimfrance.goatcounter.com/counter/TOTAL.json"]);
assert.equal(result.counter.hidden, false);
assert.equal(result.count.textContent, "1 234");

result = run("ecosimfrance", "nicolasmoreau1982-beep.github.io", { ok: false });
await result.appended[0].listeners.load();
assert.equal(result.counter.hidden, true, "un compteur indisponible reste masqué");

result = run("https://bad.example/count", "nicolasmoreau1982-beep.github.io");
assert.equal(result.appended.length, 0, "un code invalide ne doit pas injecter d'URL");

console.log("Audience : désactivation par défaut, domaine, confidentialité et compteur réel contrôlés.");
