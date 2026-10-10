import assert from "node:assert/strict";
import {auditPolicyHistory} from "../scripts/policy-history.mjs";

const rows = auditPolicyHistory();
assert.equal(rows.length,2);
assert.equal(rows[0].id,"vat_2014");
assert.ok(rows[0].equivalent2025Bn > 9 && rows[0].equivalent2025Bn < 10);
assert.ok(rows[0].ecosimRealGdpPct < 0);
assert.ok(Math.abs(rows[0].ecosimRealGdpPct - rows[0].historicalModelEstimateRealGdpPct) < 0.04);
assert.equal(rows[1].status,"non_representable");
assert.equal(rows[1].ecosimRealGdpPct,undefined,"Le CICE ne doit pas recevoir un résultat abusif");
console.log("Reconstitution partielle 2014 et refus explicite du proxy CICE contrôlés.");
