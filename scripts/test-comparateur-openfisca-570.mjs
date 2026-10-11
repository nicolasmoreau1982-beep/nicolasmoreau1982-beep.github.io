import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {compare} from './comparer-openfisca-570.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const eco=JSON.parse(fs.readFileSync(path.join(root,'dist','validation','fiscal-individuel-570.json')));
const e=eco.cases[0];
const payload={source:'openfisca-france',packageVersion:'0.0.0-fixture-synthetique',period:'2025',
 cases:[{id:e.id,netTaxableIncome:e.netTaxableIncome,householdType:e.householdType,children:e.children,grossAfterFamilyCap:12,afterDecote:9}]};
const out=compare(payload,eco);assert.equal(out.rows[0].deltaGross,e.grossAfterFamilyCap-12);
assert.throws(()=>compare({...payload,source:'autre'},eco));
assert.throws(()=>compare({...payload,cases:[{...payload.cases[0],children:2}]},eco));
assert.throws(()=>compare({...payload,cases:[{...payload.cases[0],afterDecote:Infinity}]},eco));
assert.throws(()=>compare({...payload,cases:[...payload.cases,...payload.cases]},eco));
assert.throws(()=>compare({...payload,packageVersion:''},eco));
console.log('Comparateur OpenFisca 5.7 : schéma externe et alignement contrôlés (données synthétiques de test, PAS OpenFisca réel).');
