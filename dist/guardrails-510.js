/* EcoSim 5.1 — Contrats de données, imports atomiques et invariants mathématiques.
 * Ce module ne modifie aucun coefficient ni paramètre économique.
 */
window.ECOSIM_GUARDRAILS = (() => {
  "use strict";
  const own = (obj, key) => Object.hasOwn(obj, key);
  const record = (obj) => obj !== null && typeof obj === "object" && !Array.isArray(obj) &&
    Object.prototype.toString.call(obj) === "[object Object]";
  const fail = (where) => { throw new RangeError(`Scénario invalide : ${where}`); };
  function numeric(raw, control, label) {
    // Refuser null/booléens/objets, même si Number(null) == 0.
    if (typeof raw !== "number" && !(typeof raw === "string" && raw.trim() &&
        /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw.trim()))) fail(label);
    const value = Number(raw);
    if (!Number.isFinite(value) || value < control.min || value > control.max) fail(label);
    if (control.step === 1 && !Number.isInteger(value)) fail(label);
    return value;
  }
  function validateGroup(raw, controls, label, defaults) {
    if (raw === undefined) return { ...defaults };
    if (!record(raw)) fail(label);
    const out = { ...defaults };
    for (const [id, value] of Object.entries(raw)) {
      if (!own(controls,id)) fail(`${label}.${id}`);
      out[id] = numeric(value,controls[id],`${label}.${id}`);
    }
    return out;
  }
  function normalizeScenario(payload, {D,F,S,byId,categoryChangeLimits}) {
    if (!record(payload)) fail("racine");
    const choices = {
      model:D.models, euMode:D.euModes, cycle:D.assumptions.cycle,
      monetary:D.assumptions.monetary, confidence:D.assumptions.confidence
    };
    const defaults = {model:"consensus",euMode:"current",cycle:"normal",monetary:"neutral",confidence:"stable"};
    const out = {};
    for (const [id, options] of Object.entries(choices)) {
      const value = own(payload,id) ? payload[id] : defaults[id];
      if (typeof value !== "string" || !own(options,value)) fail(id);
      out[id] = value;
    }
    out.name = own(payload,"name") ? payload.name : "Mon scénario";
    if (typeof out.name !== "string") fail("name");
    out.name = out.name.slice(0,60);
    out.policyStartQuarter = own(payload,"policyStartQuarter")
      ? numeric(payload.policyStartQuarter,{min:1,max:4,step:1},"policyStartQuarter") : 1;
    out.policyStartQuarters = {};
    if (own(payload,"policyStartQuarters")) {
      if (!record(payload.policyStartQuarters)) fail("policyStartQuarters");
      for (const [id,value] of Object.entries(payload.policyStartQuarters)) {
        if (!byId.has(id) || byId.get(id).locked) fail(`policyStartQuarters.${id}`);
        Object.defineProperty(out.policyStartQuarters,id,{value:numeric(value,{min:1,max:4,step:1},`policyStartQuarters.${id}`),writable:true,enumerable:true,configurable:true});
      }
    }
    const structControls = D.structural.controls, engineControls = D.policyEngines.controls;
    out.structural = validateGroup(payload.structural,structControls,"structural",
      Object.fromEntries(Object.entries(structControls).map(([id,c])=>[id,c.value])));
    out.engines = validateGroup(payload.engines,engineControls,"engines",
      Object.fromEntries(Object.entries(engineControls).map(([id,c])=>[id,c.value])));
    out.fiscal = F.validate(validateGroup(payload.fiscal,F.controls,"fiscal",F.defaults));
    if (own(payload,"sectoral") && !Array.isArray(payload.sectoral)) fail("sectoral");
    out.sectoral = S.normalize(payload.sectoral || []);
    out.changes = {};
    if (own(payload,"changes")) {
      if (!record(payload.changes)) fail("changes");
      for (const [id, raw] of Object.entries(payload.changes)) {
        const category = byId.get(id);
        if (!category || category.locked) fail(`changes.${id}`);
        out.changes[id] = numeric(raw,categoryChangeLimits(category),`changes.${id}`);
      }
    }
    return out;
  }
  function nearlyEqual(a,b) { return Math.abs(a-b) <= 1e-8*Math.max(1,Math.abs(a),Math.abs(b)); }
  const scalars = ["gdp","debt","debtRatio","deficit","deficitRatio","growth","inflation","unemployment",
    "directBalanceCost","spendingChange","revenueChange","revenueFeedback","extraInterest",
    "demandContribution","supplyContribution","hysteresis","outputGap","riskPremium"];
  function checkYear(p, b, previousDebt, referenceUnemployment, cyclicalCoefficient) {
    const year = p?.year;
    if (!Number.isInteger(year) || year !== b?.year || !Number.isFinite(previousDebt))
      throw new Error(`Intégrité moteur : année invalide (${year})`);
    for (const key of scalars) if (!Number.isFinite(p[key]))
      throw new Error(`Intégrité moteur : ${key} non fini en ${year}`);
    if (!Number.isFinite(b.deficit) || p.gdp <= 0 || p.unemployment < 3.2-1e-8 ||
      p.unemployment > 18+1e-8 || p.riskPremium < -0.20-1e-8 || p.riskPremium>5+1e-8)
      throw new Error(`Intégrité moteur : bornes incohérentes en ${year}`);
    const checks = {
      "coût direct": [p.directBalanceCost,p.spendingChange-p.revenueChange],
      "identité déficit": [p.deficit,b.deficit+p.directBalanceCost-p.revenueFeedback+
        (p.unemployment-referenceUnemployment)*cyclicalCoefficient+p.extraInterest],
      "identité dette": [p.debt,previousDebt+p.deficit],
      "ratio dette": [p.debtRatio,p.debt/p.gdp*100],
      "ratio déficit": [p.deficitRatio,p.deficit/p.gdp*100]
    };
    for (const [label,[actual,expected]] of Object.entries(checks))
      if (!nearlyEqual(actual,expected)) throw new Error(`Intégrité moteur : ${label} incohérent en ${year}`);
    if (!p.bands || Object.values(p.bands).some(v=>!Number.isFinite(v)||v<0))
      throw new Error(`Intégrité moteur : bandes invalides en ${year}`);
    return true;
  }
  function checkData(D) {
    const years=D?.metadata?.projectionYears;
    if(!Number.isInteger(years) || years<1 || years>100 ||
       D.metadata.projectionEnd-D.metadata.projectionStart+1!==years)
      throw new Error("Intégrité des données : horizon incohérent");
    const base=D.BASE;
    for (const key of ["spending","revenue","deficit","gdp","debt","debtRatio"])
      if(!Number.isFinite(base?.[key])) throw new Error(`Intégrité des données : ${key} invalide`);
    if(base.gdp<=0 || Math.abs((base.spending-base.revenue)-base.deficit)>0.02)
      throw new Error("Intégrité des données : identité APU 2025 incohérente");
    if(Math.abs(base.debt/base.gdp*100-base.debtRatio)>0.11)
      throw new Error("Intégrité des données : ratio de dette initial incohérent");
    for(const field of ["realGrowth","inflation","unemployment","deficitRatio","policyRate"]){
      const rows=D.baseline?.[field];
      if(!Array.isArray(rows) || rows.length!==years || rows.some(v=>!Number.isFinite(v)))
        throw new Error(`Intégrité des données : trajectoire ${field} invalide`);
    }
    const ids=new Set();
    for (const category of [...D.spending,...D.revenue]) {
      if(typeof category.id!=="string" || ids.has(category.id) ||
         !Number.isFinite(category.value))
        throw new Error(`Intégrité des données : poste budgétaire ${category.id} invalide`);
      ids.add(category.id);
    }
    for (const key of ["unemploymentPpPerOutputGapPoint","revenueBnPerNominalGdpBn","cyclicalSpendingBnPerUnemploymentPoint"])
      if(!Number.isFinite(D.macroCoefficients?.[key]) || D.macroCoefficients[key]<0)
        throw new Error(`Intégrité des données : coefficient ${key} invalide`);
    return true;
  }
  function checkProjection(result, years, initialDebt, referenceUnemployment, cyclicalCoefficient) {
    if (!result || result.scenario?.length !== years || result.baseline?.length !== years)
      throw new Error("Intégrité moteur : horizon non conforme");
    let previousDebt=initialDebt;
    for(let i=0;i<years;i++) {
      checkYear(result.scenario[i],result.baseline[i],previousDebt,referenceUnemployment[i],cyclicalCoefficient);
      previousDebt=result.scenario[i].debt;
    }
    return true;
  }
  return Object.freeze({normalizeScenario,checkData,checkYear,checkProjection});
})();
