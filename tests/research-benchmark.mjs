import assert from "node:assert/strict";
import {benchmark} from "../scripts/benchmark-research.mjs";

const results = benchmark();
assert.equal(results.length, 3);
const vat = results[0];
assert.equal(vat.id,"vat");
assert.ok(Math.abs(vat.rows[0].ecosimRealPct + 0.32) < 0.03);
assert.ok(Math.abs(vat.rows[1].ecosimRealPct + 0.72) < 0.07);
assert.ok(Math.abs(vat.vatCpiYear1Points - 1.48) < 0.05);
for (const item of results) for (const row of item.rows) {
  assert.ok(Number.isFinite(row.ecosimRealPct));
  assert.ok(Number.isFinite(row.gapPoints));
}
console.log("Variantes de recherche : ancrage TVA et écarts des proxies contrôlés.");
