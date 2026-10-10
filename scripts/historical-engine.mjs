// Moteur de rejeu annuel. Aucune observation postérieure à l'origine n'entre
// dans une projection ; elles ne sont lues que par compareHistory().
const median = (numbers) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  if (!sorted.length) throw new Error("Série historique trop courte");
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const finite = (value, label) => {
  if (!Number.isFinite(value)) throw new Error(`${label} doit être un nombre fini`);
  return value;
};

const interpolate = (curve, age) => {
  const years = Object.keys(curve).map(Number).sort((a, b) => a - b);
  if (!years.length || years.some((year) => !Number.isInteger(year) || year < 1 || !Number.isFinite(curve[year]))) {
    throw new Error("Courbe de réponse invalide");
  }
  if (age < 1) return 0;
  if (age <= years[0]) return curve[years[0]];
  if (age >= years.at(-1)) return curve[years.at(-1)];
  const upper = years.find((year) => year >= age);
  const lower = years[years.indexOf(upper) - 1];
  return curve[lower] + (curve[upper] - curve[lower]) * (age - lower) / (upper - lower);
};

export function policyLevel(event, year) {
  const start = event.effectiveYear ?? event.year;
  if (!Number.isInteger(start) || year < start || (event.endYear !== undefined && year > event.endYear)) return 0;
  const schedule = event.annualAmountBn;
  if (schedule && typeof schedule === "object") {
    const known = Object.keys(schedule).map(Number).filter((item) => item <= year && item >= start).sort((a, b) => a - b);
    if (known.length) return finite(Number(schedule[known.at(-1)]), `${event.id} ${year}`);
  }
  return finite(Number(event.amountBn ?? event.observedIncrementBn), `${event.id} montant`);
}

export function originSnapshot(accounts, originYear, lookback = 5) {
  if (!Number.isInteger(lookback) || lookback < 2) throw new Error("Fenêtre historique invalide");
  const past = accounts.filter((row) => row.year <= originYear).sort((a, b) => a.year - b.year);
  const current = past.at(-1);
  if (!current || current.year !== originYear || past.length < 3) throw new Error(`Historique insuffisant en ${originYear}`);
  for (const row of past) {
    for (const key of ["gdp", "spending", "revenue", "debt", "unemployment", "realGrowth"]) finite(row[key], `${row.year}.${key}`);
    if (row.gdp <= 0 || row.spending <= 0 || row.revenue <= 0 || row.debt < 0) throw new Error(`Compte invalide en ${row.year}`);
  }
  const recent = past.slice(-lookback - 1);
  const nominalGrowth = [];
  const deflatorGrowth = [];
  const realSpendingGrowth = [];
  for (let index = 1; index < recent.length; index += 1) {
    const previous = recent[index - 1];
    const row = recent[index];
    if (row.year !== previous.year + 1) throw new Error(`Année manquante entre ${previous.year} et ${row.year}`);
    const gdpGrowth = row.gdp / previous.gdp - 1;
    const deflator = (1 + gdpGrowth) / (1 + row.realGrowth / 100) - 1;
    nominalGrowth.push(gdpGrowth);
    deflatorGrowth.push(deflator);
    realSpendingGrowth.push((row.spending / previous.spending) / (1 + deflator) - 1);
  }
  return {
    year: originYear,
    gdp: current.gdp,
    spending: current.spending,
    revenue: current.revenue,
    debt: current.debt,
    unemployment: current.unemployment,
    assumedNominalGrowth: median(nominalGrowth),
    assumedInflation: median(deflatorGrowth),
    assumedRealSpendingGrowth: median(realSpendingGrowth),
    trainingYears: recent.map((row) => row.year)
  };
}

export function simulateHistory({originYear, horizon, accounts, events = [], responses = {}, context = {},
  parameters = {}, informationSet = "retrospective"}) {
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 50) throw new Error("Horizon invalide (1–50 ans)");
  if (!["retrospective", "origin"].includes(informationSet)) throw new Error("Jeu d'information inconnu");
  if (!Array.isArray(accounts) || !Array.isArray(events)) throw new Error("Comptes et événements attendus sous forme de listes");
  const origin = originSnapshot(accounts, originYear, parameters.lookback);
  const revenueElasticity = finite(parameters.revenueElasticity, "Élasticité des recettes");
  const unemploymentOkun = finite(parameters.unemploymentOkun, "Coefficient emploi-activité");
  const unemploymentCostSharePerPoint = finite(parameters.unemploymentCostSharePerPoint, "Stabilisateurs automatiques");
  if (revenueElasticity < 0 || unemploymentOkun < 0 || unemploymentCostSharePerPoint < 0) {
    throw new Error("Coefficients historiques négatifs invalides");
  }
  const rows = [];
  const missingPolicies = [];
  const excludedPolicies = [];
  let previous = origin;
  let baselineGdp = origin.gdp;
  let baselineSpending = origin.spending;
  let baselineRevenue = origin.revenue;
  let baselineUnemployment = origin.unemployment;
  let baselineDebt = origin.debt;
  for (let year = originYear + 1; year <= originYear + horizon; year += 1) {
    // Contexte exogène explicite : absent => tendance estimée avant l'origine.
    const annual = context[year] || {};
    if (informationSet === "origin" && context[year] && !(annual.knownByYear <= originYear)) {
      throw new Error(`Contexte ${year} inconnu à l'origine ${originYear}`);
    }
    const nominalGrowth = finite(annual.nominalGrowth ?? origin.assumedNominalGrowth, `${year}.nominalGrowth`);
    const inflation = finite(annual.inflation ?? origin.assumedInflation, `${year}.inflation`);
    const spendingRealGrowth = finite(annual.spendingRealGrowth ?? origin.assumedRealSpendingGrowth, `${year}.spendingRealGrowth`);
    if (nominalGrowth <= -1 || inflation <= -1 || spendingRealGrowth <= -1) throw new Error(`Croissance impossible en ${year}`);
    baselineGdp *= 1 + nominalGrowth;
    baselineSpending *= (1 + inflation) * (1 + spendingRealGrowth);
    baselineRevenue = origin.revenue * (baselineGdp / origin.gdp) ** revenueElasticity;
    baselineUnemployment += finite(annual.unemploymentChange ?? 0, `${year}.unemploymentChange`);

    let directSpending = 0;
    let directRevenue = 0;
    let policyGdp = 0;
    const applied = [];
    for (const event of events) {
      const start = event.effectiveYear ?? event.year;
      if (!Number.isInteger(start) || start > year) continue;
      if (["non_representable", "not_modelled"].includes(event.status) || !["spending", "revenue"].includes(event.fiscalSide)
        || (!event.fiscalOnly && !responses[event.instrument])) {
        if (start > originYear && !missingPolicies.some((item) => item.id === event.id)) {
          missingPolicies.push({id: event.id, year: start, reason: event.warning || "Mesure non représentée"});
        }
        continue;
      }
      if (informationSet === "origin" && !(event.amountInformationYear <= originYear)) {
        if (start > originYear && !excludedPolicies.some((item) => item.id === event.id)) {
          excludedPolicies.push({id: event.id, year: start, reason: "Montant non documenté comme connu à l'origine"});
        }
        continue;
      }
      // Le compte initial contient déjà le niveau des mesures entrées en vigueur
      // avant l'origine : n'ajouter que leur variation postérieure à celle-ci.
      const level = policyLevel(event, year) - policyLevel(event, originYear);
      if (event.fiscalSide === "spending") directSpending += level;
      else directRevenue += level;
      let gdpImpact = 0;
      if (!event.fiscalOnly) {
        for (let impulseYear = Math.max(start, originYear + 1); impulseYear <= year; impulseYear += 1) {
          const impulse = policyLevel(event, impulseYear) - policyLevel(event, impulseYear - 1);
          if (impulse) gdpImpact += impulse * interpolate(responses[event.instrument], year - impulseYear + 1);
        }
      }
      policyGdp += gdpImpact;
      if (level || gdpImpact) applied.push({id: event.id, directBn: level, gdpImpactBn: gdpImpact,
        effectScope: event.fiscalOnly ? "fiscal_only_macro_unestimated" : "fiscal_and_macro_variant",
        amountStatus: event.amountStatus ?? "unspecified"});
    }
    const gdp = baselineGdp + policyGdp;
    if (gdp <= 0) throw new Error(`PIB simulé non positif en ${year}`);
    const outputGap = policyGdp / baselineGdp * 100;
    const unemployment = Math.max(0, baselineUnemployment - unemploymentOkun * outputGap);
    const interestRate = finite(annual.interestRate ?? 0, `${year}.interestRate`);
    if (interestRate < 0) throw new Error(`Taux d'intérêt invalide en ${year}`);
    const extraInterest = (previous.debt - baselineDebt) * interestRate;
    const spending = baselineSpending + directSpending
      + (unemployment - baselineUnemployment) * baselineGdp * unemploymentCostSharePerPoint
      + extraInterest
      + finite(annual.spendingShockBn ?? 0, `${year}.spendingShockBn`);
    const revenue = baselineRevenue + directRevenue + (gdp - baselineGdp) * (origin.revenue / origin.gdp) * revenueElasticity
      + finite(annual.revenueShockBn ?? 0, `${year}.revenueShockBn`);
    const deficit = spending - revenue;
    const stockFlow = finite(annual.stockFlowAdjustmentBn ?? 0, `${year}.stockFlowAdjustmentBn`);
    const debt = previous.debt + deficit + stockFlow;
    baselineDebt += baselineSpending - baselineRevenue;
    const row = {year, gdp, spending, revenue, deficit, deficitRatio: deficit / gdp * 100,
      debt, debtRatio: debt / gdp * 100, unemployment, baselineGdp, policyGdp,
      directSpending, directRevenue, extraInterest, stockFlow, applied};
    rows.push(row);
    previous = row;
  }
  return {origin, rows, missingPolicies, excludedPolicies, informationSet, coverage: "incomplete",
    warning: "Diagnostic exploratoire : catalogue des politiques et chocs incomplet ; paramètres non estimés ni validés."};
}

export function compareHistory(projection, accounts) {
  const targets = new Map(accounts.map((row) => [row.year, row]));
  return projection.rows.map((row) => {
    const actual = targets.get(row.year);
    if (!actual) return {year: row.year, prediction: row, observed: null, error: null};
    return {year: row.year, prediction: row, observed: actual, error: {
      gdpPct: (row.gdp / actual.gdp - 1) * 100,
      spendingBn: row.spending - actual.spending,
      revenueBn: row.revenue - actual.revenue,
      deficitBn: row.deficit - (actual.spending - actual.revenue),
      deficitRatio: row.deficitRatio - actual.deficitRatio,
      debtRatio: row.debtRatio - actual.debtRatio,
      unemployment: row.unemployment - actual.unemployment
    }};
  });
}
