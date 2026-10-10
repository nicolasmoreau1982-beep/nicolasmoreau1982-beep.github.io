import assert from "node:assert/strict";
import {vintageAudit} from "../scripts/vintage-audit.mjs";

const rows = vintageAudit();
assert.equal(rows.length,4);
assert.ok(rows.every((row) => row.year > Number(row.published.slice(-4))));
assert.equal(rows[0].observed,-7.4);
assert.equal(rows[2].observed,1.5);
assert.equal(rows[3].observed,0.8);
assert.ok(rows.every((row) => Number.isFinite(row.error) && row.error >= 0));
console.log("Millésimes de prévision vérifiés.");
