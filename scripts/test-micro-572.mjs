import assert from 'node:assert/strict';
import fs from 'node:fs';
import { summarize } from '../dist/microdonnees-validation/estimer-572.mjs';
const fixture = JSON.parse(fs.readFileSync(new URL('../dist/microdonnees-validation/demo-571.json', import.meta.url)));
const usual = summarize(fixture);
assert.equal(usual.deciles.length, 10);
assert.ok(usual.deciles.every(d => d.foyersPonderes > 0 && Number.isFinite(d.meanDifference)));

for (const weight of [1e-11, 1e-6, 1]) {
  const data = structuredClone(fixture);
  data.households.forEach(h => h.weight=weight);
  const report=summarize(data);
  const weightSum=report.deciles.reduce((sum,d)=>sum+d.foyersPonderes,0);
  assert.ok(Math.abs(weightSum/report.totalWeight-1)<1e-10, 'Masse pondérée conservée');
  assert.ok(report.deciles.every(d => d.foyersPonderes>0 && Number.isFinite(d.meanDifference)));
  assert.ok(report.deciles.every(d => Number.isFinite(d.variation)));
}
const skew=structuredClone(fixture);
skew.households.forEach((h,i)=>h.weight=i===0?1e9:1e-4);
const result=summarize(skew);
assert.ok(result.deciles.every(g => g.foyersPonderes>0 && Number.isFinite(g.meanDifference)));
assert.ok(Math.abs(result.deciles.reduce((s,d)=>s+d.foyersPonderes,0)/result.totalWeight-1)<1e-10);
console.log('MICRO 5.7.2 : masses faibles et déséquilibrées testées ; conservation des poids et moyennes finies.');
