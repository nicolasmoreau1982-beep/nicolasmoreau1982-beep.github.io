import {originSnapshot} from "./historical-engine.mjs";

const finite = (value, label) => {
  if (!Number.isFinite(value)) throw new Error(`${label} doit être un nombre fini`);
  return value;
};
const quarterIndex = (year, quarter) => year * 4 + quarter - 1;
const checkedQuarter = (value, label) => {
  if (!Number.isInteger(value) || value < 1 || value > 4) throw new Error(`${label} doit être compris entre 1 et 4`);
  return value;
};
const medianCurve = (curve, age) => {
  const years = Object.keys(curve).map(Number).sort((a, b) => a - b);
  if (!years.length || years.some((year) => !Number.isInteger(year) || year < 1 || !Number.isFinite(curve[year]))) {
    throw new Error("Courbe de réponse invalide");
  }
  if (age <= years[0]) return curve[years[0]];
  if (age >= years.at(-1)) return curve[years.at(-1)];
  const upper = years.find((year) => year >= age);
  const lower = years[years.indexOf(upper) - 1];
  return curve[lower] + (curve[upper] - curve[lower]) * (age - lower) / (upper - lower);
};
const quarterShares = (annualGrowth) => {
  const factor = (1 + annualGrowth) ** 0.25;
  const weights = [1, factor, factor ** 2, factor ** 3];
  const total = weights.reduce((sum, value) => sum + value, 0);
  return weights.map((weight) => weight / total);
};

// Le montant est un *rythme annuel* en Md€. Chaque trimestre actif comptabilise
// un quart de ce rythme ; une hausse en T3 ne compte donc que six mois en année 1.
export function policyLevelAtQuarter(event, year, quarter) {
  checkedQuarter(quarter, "Trimestre demandé");
  const startYear = event.effectiveYear ?? event.year;
  if (!Number.isInteger(startYear)) return 0;
  const start = quarterIndex(startYear, checkedQuarter(event.effectiveQuarter ?? 1, `${event.id}.effectiveQuarter`));
  const end = event.endYear === undefined ? Infinity
    : quarterIndex(event.endYear, checkedQuarter(event.endQuarter ?? 4, `${event.id}.endQuarter`));
  const at = quarterIndex(year, quarter);
  if (end < start) throw new Error(`${event.id} : fin antérieure à l'entrée en vigueur`);
  if (at < start || at > end) return 0;
  let latest = start;
  let value = event.amountBn ?? event.observedIncrementBn;
  for (const [yearText, amount] of Object.entries(event.annualAmountBn || {})) {
    const scheduledYear = Number(yearText);
    if (!Number.isInteger(scheduledYear)) throw new Error(`${event.id} : année de calendrier invalide`);
    const index = Math.max(start, quarterIndex(scheduledYear, 1));
    if (scheduledYear >= startYear && index <= at && index >= latest) {
      latest = index;
      value = amount;
    }
  }
  for (const [date, amount] of Object.entries(event.quarterlyAmountBn || {})) {
    const match = /^(\d{4})-Q([1-4])$/.exec(date);
    if (!match) throw new Error(`${event.id} : date trimestrielle invalide ${date}`);
    const index = quarterIndex(Number(match[1]), Number(match[2]));
    if (index >= start && index <= at && index >= latest) {
      latest = index;
      value = amount;
    }
  }
  return finite(Number(value), `${event.id} ${year}-T${quarter}`);
}

// Comptes annuels observés à l'origine ; les quatre flux de référence d'une
// année sont synthétiques et somment exactement à la projection annuelle.
export function simulateQuarterlyHistory({originYear, horizon, accounts, events = [], responses = {}, context = {},
  parameters = {}, informationSet = "retrospective"}) {
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 50) throw new Error("Horizon invalide (1–50 ans)");
  if (!["retrospective", "origin"].includes(informationSet)) throw new Error("Jeu d'information inconnu");
  if (!Array.isArray(events)) throw new Error("Événements attendus sous forme de liste");
  const origin = originSnapshot(accounts, originYear, parameters.lookback);
  const revenueElasticity = finite(parameters.revenueElasticity, "Élasticité des recettes");
  const unemploymentOkun = finite(parameters.unemploymentOkun, "Coefficient emploi-activité");
  const unemploymentCostSharePerPoint = finite(parameters.unemploymentCostSharePerPoint, "Stabilisateurs automatiques");
  if (revenueElasticity < 0 || unemploymentOkun < 0 || unemploymentCostSharePerPoint < 0) {
    throw new Error("Coefficients historiques négatifs invalides");
  }
  const rows = [];
  const quarters = [];
  const missingPolicies = [];
  const excludedPolicies = [];
  const policyImpulses = new Map();
  let baselineGdpYear = origin.gdp;
  let baselineSpendingYear = origin.spending;
  let baselineUnemployment = origin.unemployment;
  let baselineDebt = origin.debt;
  let debt = origin.debt;

  for (let year = originYear + 1; year <= originYear + horizon; year += 1) {
    const annual = context[year] || {};
    if (informationSet === "origin" && context[year] && !(annual.knownByYear <= originYear)) {
      throw new Error(`Contexte ${year} inconnu à l'origine ${originYear}`);
    }
    const nominalGrowth = finite(annual.nominalGrowth ?? origin.assumedNominalGrowth, `${year}.nominalGrowth`);
    const inflation = finite(annual.inflation ?? origin.assumedInflation, `${year}.inflation`);
    const spendingRealGrowth = finite(annual.spendingRealGrowth ?? origin.assumedRealSpendingGrowth, `${year}.spendingRealGrowth`);
    const interestRate = finite(annual.interestRate ?? 0, `${year}.interestRate`);
    if (nominalGrowth <= -1 || inflation <= -1 || spendingRealGrowth <= -1 || interestRate < 0) {
      throw new Error(`Croissance ou taux impossible en ${year}`);
    }
    baselineGdpYear *= 1 + nominalGrowth;
    baselineSpendingYear *= (1 + inflation) * (1 + spendingRealGrowth);
    const revenueYear = origin.revenue * (baselineGdpYear / origin.gdp) ** revenueElasticity;
    const gdpShares = quarterShares(nominalGrowth);
    const spendingShares = quarterShares((1 + inflation) * (1 + spendingRealGrowth) - 1);
    const revenueShares = quarterShares(nominalGrowth);
    const annualQuarters = [];
    for (let quarter = 1; quarter <= 4; quarter += 1) {
      const key = `${year}-Q${quarter}`;
      const quarterContext = annual.quarters?.[quarter] || {};
      const index = quarterIndex(year, quarter);
      const baselineGdp = baselineGdpYear * gdpShares[quarter - 1];
      const baselineSpending = baselineSpendingYear * spendingShares[quarter - 1];
      const baselineRevenue = revenueYear * revenueShares[quarter - 1];
      baselineUnemployment += finite(annual.unemploymentChange ?? 0, `${year}.unemploymentChange`) / 4;
      let directSpending = 0;
      let directRevenue = 0;
      let policyGdp = 0;
      const applied = [];
      for (const event of events) {
        const startYear = event.effectiveYear ?? event.year;
        if (!Number.isInteger(startYear)) continue;
        const start = quarterIndex(startYear, checkedQuarter(event.effectiveQuarter ?? 1, `${event.id}.effectiveQuarter`));
        if (index < start) continue;
        if (["non_representable", "not_modelled"].includes(event.status) || !["spending", "revenue"].includes(event.fiscalSide)
          || (!event.fiscalOnly && !responses[event.instrument])) {
          if (start > quarterIndex(originYear, 4) && !missingPolicies.some((item) => item.id === event.id)) {
            missingPolicies.push({id: event.id, year: startYear, quarter: event.effectiveQuarter ?? 1,
              reason: event.warning || "Mesure non représentée"});
          }
          continue;
        }
        if (informationSet === "origin" && !(event.amountInformationYear <= originYear)) {
          if (start > quarterIndex(originYear, 4) && !excludedPolicies.some((item) => item.id === event.id)) {
            excludedPolicies.push({id: event.id, year: startYear, quarter: event.effectiveQuarter ?? 1,
              reason: "Montant non documenté comme connu à l'origine"});
          }
          continue;
        }
        const level = policyLevelAtQuarter(event, year, quarter);
        // Une mesure démarrée en T3 de l'année d'origine n'a contribué que
        // six mois au compte initial : comparer au niveau *moyen* de cette
        // année, pas au rythme observé seulement en T4.
        const originExposure = [1, 2, 3, 4].reduce((sum, item) =>
          sum + policyLevelAtQuarter(event, originYear, item), 0) / 4;
        const direct = (level - originExposure) / 4;
        if (event.fiscalSide === "spending") directSpending += direct;
        else directRevenue += direct;
        let gdpImpact = 0;
        if (!event.fiscalOnly) {
          const previousLevel = policyLevelAtQuarter(event, quarter === 1 ? year - 1 : year, quarter === 1 ? 4 : quarter - 1);
          const impulse = level - previousLevel;
          if (impulse) {
            const impulses = policyImpulses.get(event.id) || [];
            impulses.push({index, amount: impulse});
            policyImpulses.set(event.id, impulses);
          }
          for (const item of policyImpulses.get(event.id) || []) {
            gdpImpact += item.amount * medianCurve(responses[event.instrument], (index - item.index + 1) / 4) / 4;
          }
        }
        policyGdp += gdpImpact;
        if (direct || gdpImpact) applied.push({id: event.id, directBn: direct, gdpImpactBn: gdpImpact,
          effectScope: event.fiscalOnly ? "fiscal_only_macro_unestimated" : "fiscal_and_macro_variant",
          amountStatus: event.amountStatus ?? "unspecified"});
      }
      const gdp = baselineGdp + policyGdp;
      if (gdp <= 0) throw new Error(`PIB simulé non positif en ${key}`);
      const outputGap = policyGdp / baselineGdp * 100;
      const unemployment = Math.max(0, baselineUnemployment - unemploymentOkun * outputGap);
      const extraInterest = (debt - baselineDebt) * interestRate / 4;
      const spending = baselineSpending + directSpending
        + (unemployment - baselineUnemployment) * baselineGdp * unemploymentCostSharePerPoint
        + extraInterest + finite(annual.spendingShockBn ?? 0, `${year}.spendingShockBn`) / 4
        + finite(quarterContext.spendingShockBn ?? 0, `${key}.spendingShockBn`);
      const revenue = baselineRevenue + directRevenue
        + policyGdp * (origin.revenue / origin.gdp) * revenueElasticity
        + finite(annual.revenueShockBn ?? 0, `${year}.revenueShockBn`) / 4
        + finite(quarterContext.revenueShockBn ?? 0, `${key}.revenueShockBn`);
      const deficit = spending - revenue;
      const stockFlow = finite(annual.stockFlowAdjustmentBn ?? 0, `${year}.stockFlowAdjustmentBn`) / 4
        + finite(quarterContext.stockFlowAdjustmentBn ?? 0, `${key}.stockFlowAdjustmentBn`);
      debt += deficit + stockFlow;
      baselineDebt += baselineSpending - baselineRevenue;
      const row = {year, quarter, gdp, spending, revenue, deficit, debt, unemployment,
        baselineGdp, policyGdp, directSpending, directRevenue, extraInterest, stockFlow, applied};
      quarters.push(row);
      annualQuarters.push(row);
    }
    const sum = (key) => annualQuarters.reduce((total, item) => total + item[key], 0);
    const appliedMap = new Map();
    for (const quarter of annualQuarters) for (const item of quarter.applied) {
      const prior = appliedMap.get(item.id) || {...item, directBn: 0, gdpImpactBn: 0};
      prior.directBn += item.directBn;
      prior.gdpImpactBn += item.gdpImpactBn;
      appliedMap.set(item.id, prior);
    }
    const gdp = sum("gdp");
    const deficit = sum("deficit");
    rows.push({year, gdp, spending: sum("spending"), revenue: sum("revenue"), deficit,
      deficitRatio: deficit / gdp * 100, debt, debtRatio: debt / gdp * 100,
      unemployment: sum("unemployment") / 4, baselineGdp: sum("baselineGdp"), policyGdp: sum("policyGdp"),
      directSpending: sum("directSpending"), directRevenue: sum("directRevenue"),
      extraInterest: sum("extraInterest"), stockFlow: sum("stockFlow"), applied: [...appliedMap.values()]});
  }
  return {origin, rows, quarters, missingPolicies, excludedPolicies, informationSet,
    frequency: "quarterly_synthetic_baseline", coverage: "incomplete",
    warning: "Flux trimestriels de référence ventilés à partir de comptes annuels, non observations trimestrielles ; réponses macro non estimées à cette fréquence."};
}
