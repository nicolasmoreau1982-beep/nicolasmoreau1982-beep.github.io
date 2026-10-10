import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = {window:{}};
vm.runInNewContext(fs.readFileSync(new URL("../dist/history.js", import.meta.url), "utf8"), context);
const H = context.window.ECOSIM_HISTORY;
assert.equal(H.rows.length, 23);
assert.equal(H.rows[0].year, 2003);
assert.equal(H.rows.at(-1).year, 2025);
assert.deepEqual(Array.from(H.horizons), [1,3,5,10]);

const original = H.forecast(H.rows, 2015, 5);
const corruptedFuture = H.rows.map((row) => row.year > 2015 ? {...row,gdp:row.gdp * 99,debtRatio:999} : row);
const unchanged = H.forecast(corruptedFuture, 2015, 5);
assert.equal(original.gdp, unchanged.gdp, "La prévision ne doit pas lire des observations futures");
assert.equal(original.debtRatio, unchanged.debtRatio);

for (const horizon of H.horizons) {
  const result = H.report[horizon];
  assert.equal(result.n, 2025 - (2007 + horizon) + 1);
  assert.equal(result.cases[0].origin, 2007);
  assert.equal(result.cases.at(-1).target, 2025);
  for (const metric of Object.values(result.metrics)) {
    assert.ok(Number.isFinite(metric.mae) && metric.mae >= 0);
    assert.ok(Number.isFinite(metric.p80) && metric.p80 >= 0);
  }
}
for (const metric of ["gdpPct","deficitRatio","debtRatio","unemployment"]) {
  let previous = 0;
  for (let horizon = 1; horizon <= 30; horizon += 1) {
    const value = H.stressFloor(metric, horizon);
    assert.ok(value >= previous - 1e-10, `Plancher non monotone : ${metric}, ${horizon}`);
    previous = value;
  }
}
console.log(JSON.stringify(Object.fromEntries(H.horizons.map((horizon) => [horizon,{
  cases:H.report[horizon].n,
  gdpMaePct:Number(H.report[horizon].metrics.gdpPct.mae.toFixed(2)),
  debtMaePoints:Number(H.report[horizon].metrics.debtRatio.mae.toFixed(2))
}]))));
