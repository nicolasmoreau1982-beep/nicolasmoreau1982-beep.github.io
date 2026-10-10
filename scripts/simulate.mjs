import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const dataContext = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL("dist/data.js", root), "utf8"), dataContext);
vm.runInNewContext(fs.readFileSync(new URL("dist/history.js", root), "utf8"), dataContext);
vm.runInNewContext(fs.readFileSync(new URL("dist/insee-projection.js", root), "utf8"), dataContext);
vm.runInNewContext(fs.readFileSync(new URL("dist/fiscal.js", root), "utf8"), dataContext);
const appSource = fs.readFileSync(new URL("dist/app.js", root), "utf8");
const start = appSource.indexOf("(() => {") + "(() => {".length;
const end = appSource.indexOf("  function initializeControls()");
if (start < 1 || end < start) throw new Error("Moteur JavaScript introuvable");
const modelContext = { window: dataContext.window, console, TextEncoder, TextDecoder, URL };
vm.runInNewContext(`${appSource.slice(start, end)}\nglobalThis.ecosim = { state, calculateProjection };`, modelContext);

const D = dataContext.window.ECOSIM_DATA;
const { state, calculateProjection } = modelContext.ecosim;
const source = fs.readFileSync(0, "utf8").trim();
const input = source ? JSON.parse(source) : {};
if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Le scénario doit être un objet JSON");

for (const [key, choices] of [
  ["model", D.models], ["euMode", D.euModes],
  ["cycle", D.assumptions.cycle], ["monetary", D.assumptions.monetary], ["confidence", D.assumptions.confidence]
]) {
  if (input[key] === undefined) continue;
  if (!Object.hasOwn(choices, input[key])) throw new Error(`Valeur inconnue pour ${key}: ${input[key]}`);
  state[key] = input[key];
}
if (input.policyStartQuarter !== undefined) {
  if (![1, 2, 3, 4].includes(input.policyStartQuarter)) {
    throw new Error("policyStartQuarter doit être un entier de 1 à 4");
  }
  state.policyStartQuarter = input.policyStartQuarter;
}
if (input.policyStartQuarters !== undefined) {
  if (!input.policyStartQuarters || typeof input.policyStartQuarters !== "object" || Array.isArray(input.policyStartQuarters)) {
    throw new Error("policyStartQuarters doit être un objet");
  }
  const categories = new Map([...D.spending, ...D.revenue].map((item) => [item.id, item]));
  for (const [id, quarter] of Object.entries(input.policyStartQuarters)) {
    if (!categories.has(id) || categories.get(id).locked || ![1, 2, 3, 4].includes(quarter)) {
      throw new Error(`Trimestre invalide pour ${id}`);
    }
    state.policyStartQuarters[id] = quarter;
  }
}

function applyControls(key, definitions) {
  if (input[key] === undefined) return;
  if (!input[key] || typeof input[key] !== "object" || Array.isArray(input[key])) throw new Error(`${key} doit être un objet`);
  for (const [id, raw] of Object.entries(input[key])) {
    const control = definitions[id];
    if (!control) throw new Error(`Réglage inconnu : ${id}`);
    const value = Number(raw);
    if (!Number.isFinite(value) || value < control.min || value > control.max) {
      throw new Error(`${id} doit être compris entre ${control.min} et ${control.max}`);
    }
    state[key][id] = value;
  }
}
applyControls("structural", D.structural.controls);
applyControls("engines", D.policyEngines.controls);
if (input.fiscal !== undefined) {
  if (!input.fiscal || typeof input.fiscal !== "object" || Array.isArray(input.fiscal)) {
    throw new Error("fiscal doit être un objet");
  }
  state.fiscal = dataContext.window.ECOSIM_FISCAL.validate({ ...state.fiscal, ...input.fiscal });
}

if (input.changes !== undefined) {
  if (!input.changes || typeof input.changes !== "object" || Array.isArray(input.changes)) throw new Error("changes doit être un objet");
  const byId = new Map([...D.spending, ...D.revenue].map((item) => [item.id, item]));
  for (const [id, raw] of Object.entries(input.changes)) {
    const category = byId.get(id);
    if (!category || category.locked) throw new Error(`Poste inconnu ou verrouillé : ${id}`);
    const value = Number(raw);
    const limit = Math.max(10, Math.ceil(Math.abs(category.value) * 0.7 / 5) * 5);
    if (!Number.isFinite(value) || value < Math.max(-limit, -category.value) || value > limit) {
      throw new Error(`Variation invalide pour ${id} : entre ${Math.max(-limit, -category.value)} et ${limit} Md€`);
    }
    state.changes[id] = value;
  }
}

const projection = calculateProjection();
const output = {
  metadata: D.metadata,
  assumptions: {
    model: state.model, euMode: state.euMode, cycle: state.cycle,
    monetary: state.monetary, confidence: state.confidence,
    policyStartQuarter: state.policyStartQuarter,
    policyStartQuarters: state.policyStartQuarters,
    structural: state.structural, engines: state.engines, fiscal: state.fiscal, changes: state.changes
  },
  baseline: projection.baseline,
  scenario: projection.scenario
};
process.stdout.write(`${JSON.stringify(output)}\n`);
