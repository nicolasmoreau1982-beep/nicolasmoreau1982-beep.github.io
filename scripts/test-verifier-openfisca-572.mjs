/** Cas externalisés simulés localement UNIQUEMENT pour tester le validateur. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { verify } from '../dist/scripts/verifier-openfisca-572.mjs';

const bytes = fs.readFileSync(new URL('../dist/validation/fiscal-individuel-570.json', import.meta.url));
const eco = JSON.parse(bytes);
const sha = crypto.createHash('sha256').update(bytes).digest('hex');
function parts(c) {
  return (c.householdType === 'couple' ? 2 : 1) + Math.min(c.children, 2) * .5 + Math.max(c.children - 2, 0);
}
// Les chiffres sont des nombres factices du moteur EcoSim : ne JAMAIS les publier comme sorties OpenFisca.
const fixture = {
  source: 'openfisca-france', schemaVersion: '5.7.2', execution: 'python_openfisca_direct',
  status: 'calcule_non_revu', packageVersion: '999.1.0', period: '2025',
  incomeYear: 2025, taxYearEcoSim: 2026, generatedUTC: '2026-10-11T12:00:00+00:00',
  inputFileSHA256: sha,
  cases: eco.cases.map(c => ({
    id: c.id, householdType: c.householdType, children: c.children,
    netTaxableIncome: c.netTaxableIncome, openfiscaIrBrut: c.grossUncapped,
    grossAfterFamilyCap: c.grossAfterFamilyCap, openfiscaDecote: c.decote,
    afterDecote: c.afterDecote,
    overrides: {
      rni: c.netTaxableIncome, nbptr: parts(c), nbF: c.children,
      maries_ou_pacses: c.householdType === 'couple',
      celibataire_ou_divorce: c.householdType === 'single',
    },
  })),
};
const result = verify(eco, fixture, bytes);
assert.equal(result.count, 56);
assert.equal(result.groups.length, 8);
assert.equal(result.worstCases.length, 10);
assert.ok(result.gross.maximumAbsoluteEuro < 1e-7);
assert.equal(result.status, 'comparaison_calculée_à_revoir');
function reject(mutator, regex) {
  const bad = structuredClone(fixture); mutator(bad);
  assert.throws(() => verify(eco, bad, bytes), regex);
}
reject(v => v.cases.pop(), /incomplet/);
reject(v => v.cases[1].id = v.cases[0].id, /dupliqué/);
reject(v => v.inputFileSHA256 = '0'.repeat(64), /empreinte/i);
reject(v => v.cases[2].netTaxableIncome++, /configuration/i);
reject(v => v.cases[2].overrides.nbptr += .5, /intermédiaires/);
reject(v => v.cases[3].openfiscaDecote += 4, /décote incohérente/);
reject(v => v.cases[4].afterDecote = null, /non fini/);
reject(v => v.period = '2024', /Métadonnées/);
reject(v => v.execution = 'fixture', /Métadonnées/);
reject(v => v.packageVersion = 'TEST_SEULEMENT', /Métadonnées/);
reject(v => v.cases[0].id = 'faux-foyer', /absent/);
const diff = structuredClone(fixture);
diff.cases[3].grossAfterFamilyCap += 15;
diff.cases[3].afterDecote += 15;
const report = verify(eco, diff, bytes);
assert.equal(report.gross.casesAboveTenEuro, 1);
assert.equal(report.afterDecote.casesAboveTenEuro, 1);
assert.equal(report.groups.reduce((s, x) => s + x.count, 0), 56);
const workflow = fs.readFileSync(new URL('../dist/.github/workflows/openfisca-572.yml', import.meta.url), 'utf8');
assert.match(workflow, /workflow_dispatch/);
assert.match(workflow, /run_openfisca_572\.py/);
assert.match(workflow, /verifier-openfisca-572\.mjs/);
console.log('VÉRIFICATEUR 5.7.2 : 56 cas, empreintes, complétude, 8 groupes, 11 rejets et écarts synthétiques OK. Aucun calcul OpenFisca réel.');
