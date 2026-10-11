/* EcoSim — règles fiscales sélectionnées, datées ; population de démonstration NON représentative. */
window.ECOSIM_FISCAL = (() => {
  "use strict";

  const rules = Object.freeze({
    effectiveFrom: "2026-01-01",
    incomeReferenceYear: 2025,
    incomeTax: {
      brackets: [{ upper: 11600, rate: 0 }, { upper: 29579, rate: 0.11 },
        { upper: 84577, rate: 0.30 }, { upper: 181917, rate: 0.41 }, { upper: Infinity, rate: 0.45 }],
      source: "https://bofip.impots.gouv.fr/bofip/2491-PGP.html/identifiant=BOI-IR-LIQ-20-10-20260407"
    },
    realEstateWealthTax: {
      entryThreshold: 1300000,
      brackets: [{ upper: 800000, rate: 0 }, { upper: 1300000, rate: 0.005 },
        { upper: 2570000, rate: 0.007 }, { upper: 5000000, rate: 0.01 },
        { upper: 10000000, rate: 0.0125 }, { upper: Infinity, rate: 0.015 }],
      source: "https://www.impots.gouv.fr/particulier/calcul-de-lifi"
    },
    directInheritance: {
      allowance: 100000,
      brackets: [{ upper: 8072, rate: 0.05 }, { upper: 12109, rate: 0.10 },
        { upper: 15932, rate: 0.15 }, { upper: 552324, rate: 0.20 },
        { upper: 902838, rate: 0.30 }, { upper: 1805677, rate: 0.40 },
        { upper: Infinity, rate: 0.45 }],
      source: "https://www.impots.gouv.fr/particulier/questions/comment-dois-je-calculer-les-droits-de-succession"
    },
    wealthFloorProposal: {
      status: "proposition_non_en_vigueur",
      threshold: 100000000,
      rate: 0.02,
      source: "https://www.senat.fr/travaux-parlementaires/textes-legislatifs/la-loi-en-clair/proposition-de-loi-instaurant-un-impot-plancher-de-2-sur-le-patrimoine-des-ultrariches.html"
    }
  });

  const controls = Object.freeze({
    startYear: { label: "Entrée en vigueur", min: 2026, max: 2055, step: 1, value: 2026, unit: "" },
    irLowRate: { label: "IR · tranche à 11 %", min: 0, max: 30, step: 1, value: 11, unit: " %" },
    irTopRate: { label: "IR · tranche à 45 %", min: 30, max: 65, step: 1, value: 45, unit: " %" },
    ifiThresholdM: { label: "IFI · seuil d'entrée", min: 0.8, max: 10, step: 0.1, value: 1.3, unit: " M€" },
    ifiTopRate: { label: "IFI · dernière tranche", min: 0, max: 4, step: 0.1, value: 1.5, unit: " %" },
    inheritanceAllowanceK: { label: "Succession · abattement en ligne directe", min: 0, max: 500, step: 10, value: 100, unit: " k€" },
    wealthFloorEnabled: { label: "Impôt plancher ultra-riches (proposition)", min: 0, max: 1, step: 1, value: 0, unit: "" },
    wealthFloorThresholdM: { label: "Impôt plancher · seuil", min: 10, max: 1000, step: 10, value: 100, unit: " M€" },
    wealthFloorRate: { label: "Impôt plancher · taux", min: 0, max: 5, step: 0.1, value: 2, unit: " %" }
  });
  const defaults = Object.fromEntries(Object.entries(controls).map(([key, item]) => [key, item.value]));
  // Rapprochement empirique limité : part d'assiette effective ajustée sur les avis
  // DGFiP 2020–2022, puis transportée sur les foyers-types de 2024 (1541 Md€ de
  // revenus déclarés contre 1440,58 Md€ dans cet échantillon). Le test 2023–2024
  // reste hors ajustement et laisse une erreur moyenne de 7,55 Md€.
  const incomeTaxBaseFactor = 0.7731;

  // Foyers fiscaux TYPES, en euros 2025. `taxableIncome` est un PROXY de
  // revenu déclaré : ce n'est pas le revenu net imposable observé d'un foyer.
  // Pondérations synthétiques (41,5 M de foyers,
  // nombre DGFiP des déclarations 2025 sur revenus 2024), PAS microdonnées ERFS/HVP.
  // Le croisement revenu-patrimoine et la queue >100 M€ sont des hypothèses.
  const households = [
    ["modeste-1", 6500000, 5000, 1, 5000, 0, 0],
    ["modeste-2", 6000000, 10000, 1, 30000, 0, 0],
    ["modeste-3", 6000000, 18000, 1, 70000, 0, 0],
    ["intermediaire-1", 6000000, 22000, 2, 120000, 0, 0],
    ["intermediaire-2", 4990000, 32000, 1, 220000, 0, 0],
    ["intermediaire-3", 4000000, 42000, 2, 350000, 0, 0],
    ["intermediaire-4", 3000000, 55000, 2, 600000, 0, 0],
    ["aise-1", 2400000, 75000, 2, 1000000, 0, 0],
    ["aise-2", 1400000, 110000, 2, 2000000, 1000000, 0],
    ["aise-3", 700000, 160000, 2, 3000000, 1100000, 0],
    ["riche-1", 300000, 250000, 2, 5000000, 1200000, 15000],
    ["riche-2", 150000, 400000, 2, 8000000, 1600000, 30000],
    ["riche-3", 40000, 600000, 2, 20000000, 3000000, 120000],
    ["riche-4", 8200, 1000000, 2, 30000000, 1000000, 400000],
    ["ultra", 1800, 1000000, 2, 250000000, 30000000, 300000],
    ["patrimoine-eleve-revenu_modeste", 10000, 40000, 1, 5000000, 1500000, 5000]
  ].map(([id, weight, taxableIncome, parts, netWealth, taxableRealEstate, otherCoveredTaxes]) =>
    ({ id, weight, taxableIncome, parts, netWealth, taxableRealEstate, otherCoveredTaxes }));

  // Héritages-types en ligne directe, par part reçue. Fréquences purement
  // illustratives, indépendantes des foyers ci-dessus et NON observées.
  const inheritances = [
    { id: "part-200k", weight: 150000, amount: 200000 },
    { id: "part-500k", weight: 80000, amount: 500000 },
    { id: "part-2m", weight: 10000, amount: 2000000 },
    { id: "part-20m", weight: 1000, amount: 20000000 }
  ];

  function progressive(amount, brackets) {
    let lower = 0;
    let tax = 0;
    for (const bracket of brackets) {
      const slice = Math.max(0, Math.min(amount, bracket.upper) - lower);
      tax += slice * bracket.rate;
      lower = bracket.upper;
      if (amount <= lower) break;
    }
    return tax;
  }

  function validate(config) {
    if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("Réforme fiscale invalide");
    const normalized = { ...defaults };
    for (const [key, raw] of Object.entries(config)) {
      const value = key === "wealthFloorEnabled" && typeof raw === "boolean" ? Number(raw) : raw;
      const control = controls[key];
      if (!control || !Number.isFinite(value) || value < control.min || value > control.max ||
        (key === "startYear" && !Number.isInteger(value)) || (key === "wealthFloorEnabled" && ![0, 1].includes(value))) {
        throw new Error(`Paramètre fiscal invalide : ${key}`);
      }
      normalized[key] = value;
    }
    return normalized;
  }

  function policyRules(config = defaults) {
    const options = validate(config);
    return {
      ...rules,
      incomeTax: { ...rules.incomeTax, brackets: rules.incomeTax.brackets.map((b, i) =>
        ({ ...b, rate: i === 1 ? options.irLowRate / 100 : i === 4 ? options.irTopRate / 100 : b.rate })) },
      realEstateWealthTax: { ...rules.realEstateWealthTax, entryThreshold: options.ifiThresholdM * 1e6,
        brackets: rules.realEstateWealthTax.brackets.map((b, i) =>
          ({ ...b, rate: i === 5 ? options.ifiTopRate / 100 : b.rate })) },
      directInheritance: { ...rules.directInheritance, allowance: options.inheritanceAllowanceK * 1000 },
      wealthFloorProposal: { ...rules.wealthFloorProposal, threshold: options.wealthFloorThresholdM * 1e6,
        rate: options.wealthFloorRate / 100, enabled: Boolean(options.wealthFloorEnabled) }
    };
  }

  function incomeTax(income, parts, law) {
    return Math.max(0, parts * progressive(income / parts, law.incomeTax.brackets));
  }

  function realEstateWealthTax(wealth, law) {
    if (wealth <= law.realEstateWealthTax.entryThreshold) return 0;
    const amount = progressive(wealth, law.realEstateWealthTax.brackets);
    const factor = law.realEstateWealthTax.discountFactor || 1;
    const legalEntry = Math.abs(law.realEstateWealthTax.entryThreshold - 1300000 * factor) < 0.01;
    const discount = legalEntry && wealth >= 1300000 * factor && wealth < 1400000 * factor
      ? Math.max(0, 17500 * factor - 0.0125 * wealth) : 0;
    return Math.max(0, amount - discount);
  }

  function inheritanceTax(amount, law) {
    return progressive(Math.max(0, amount - law.directInheritance.allowance), law.directInheritance.brackets);
  }

  function householdTaxes(household, law, priceFactor = 1) {
    const ir = incomeTax(household.taxableIncome * incomeTaxBaseFactor * priceFactor, household.parts,
      { ...law, incomeTax: { ...law.incomeTax, brackets: law.incomeTax.brackets.map((b) =>
        ({ ...b, upper: b.upper * priceFactor })) } });
    const ifi = realEstateWealthTax(household.taxableRealEstate * priceFactor,
      { ...law, realEstateWealthTax: { ...law.realEstateWealthTax,
        entryThreshold: law.realEstateWealthTax.entryThreshold * priceFactor,
        discountFactor: priceFactor,
        brackets: law.realEstateWealthTax.brackets.map((b) => ({ ...b, upper: b.upper * priceFactor })) } });
    const wealth = household.netWealth * priceFactor;
    const floor = law.wealthFloorProposal.enabled && wealth > law.wealthFloorProposal.threshold * priceFactor
      ? Math.max(0, law.wealthFloorProposal.rate * wealth - ir - ifi - household.otherCoveredTaxes * priceFactor)
      : 0;
    return { ir, ifi, floor };
  }

  function simulate(config = defaults, year = 2026, priceFactor = 1) {
    const options = validate(config);
    if (!Number.isInteger(year) || year < 2026 || !Number.isFinite(priceFactor) || priceFactor <= 0) {
      throw new Error("Année ou indice de prix fiscal invalide");
    }
    const reform = year >= options.startYear ? policyRules(options) : policyRules(defaults);
    const reference = policyRules(defaults);
    const totals = { ir: 0, ifi: 0, inheritance: 0, floor: 0 };
    const referenceTotals = { ir: 0, ifi: 0, inheritance: 0, floor: 0 };
    const groups = ["modestes", "intermediaires", "aises", "riches", "ultra-riches"].map((label) =>
      ({ label, weight: 0, gainTotal: 0, winners: 0, losers: 0 }));
    const wealthGroups = ["< 150 k€", "150 k€ à 1,3 M€", "1,3 à 100 M€", "> 100 M€"].map((label) =>
      ({ label, weight: 0, gainTotal: 0, winners: 0, losers: 0 }));
    const recordGain = (group, gain, weight) => {
      group.weight += weight;
      group.gainTotal += gain * weight;
      if (gain > 0.01) group.winners += weight;
      if (gain < -0.01) group.losers += weight;
    };
    for (const household of households) {
      const oldTax = householdTaxes(household, reference, priceFactor);
      const newTax = householdTaxes(household, reform, priceFactor);
      for (const key of ["ir", "ifi", "floor"]) {
        totals[key] += newTax[key] * household.weight / 1e9;
        referenceTotals[key] += oldTax[key] * household.weight / 1e9;
      }
      const rank = household.taxableIncome < 30000 ? 0 : household.taxableIncome < 80000 ? 1
        : household.taxableIncome < 250000 ? 2 : household.netWealth < 100000000 ? 3 : 4;
      const group = groups[rank];
      const gain = oldTax.ir + oldTax.ifi + oldTax.floor - newTax.ir - newTax.ifi - newTax.floor;
      recordGain(group, gain, household.weight);
      const wealthRank = household.netWealth < 150000 ? 0 : household.netWealth < 1300000 ? 1
        : household.netWealth < 100000000 ? 2 : 3;
      recordGain(wealthGroups[wealthRank], gain, household.weight);
    }
    for (const event of inheritances) {
      const oldTax = inheritanceTax(event.amount * priceFactor,
        { ...reference, directInheritance: { ...reference.directInheritance, allowance: reference.directInheritance.allowance * priceFactor,
          brackets: reference.directInheritance.brackets.map((b) => ({ ...b, upper: b.upper * priceFactor })) } });
      const newTax = inheritanceTax(event.amount * priceFactor,
        { ...reform, directInheritance: { ...reform.directInheritance, allowance: reform.directInheritance.allowance * priceFactor,
          brackets: reform.directInheritance.brackets.map((b) => ({ ...b, upper: b.upper * priceFactor })) } });
      referenceTotals.inheritance += oldTax * event.weight / 1e9;
      totals.inheritance += newTax * event.weight / 1e9;
    }
    const deltaByTax = Object.fromEntries(Object.keys(totals).map((key) => [key, totals[key] - referenceTotals[key]]));
    // Propension à consommer illustrative par niveau de revenu, non estimée sur
    // cet échantillon. Les successions sont traitées séparément (bénéficiaires
    // absents des foyers-types). Ce canal sert uniquement à la sensibilité macro.
    const consumptionPropensity = [0.9, 0.75, 0.6, 0.45, 0.25];
    const distributionDemandBn = groups.reduce((sum, group, index) =>
      sum + group.gainTotal / 1e9 * consumptionPropensity[index], 0) - deltaByTax.inheritance * 0.45;
    return { year, active: year >= options.startYear, deltaByTax,
      totalBn: Object.values(deltaByTax).reduce((sum, value) => sum + value, 0),
      distributionDemandBn,
      groups: groups.map((group) => ({ ...group, averageGainEuro: group.weight ? group.gainTotal / group.weight : 0 })),
      wealthGroups: wealthGroups.map((group) => ({ ...group, averageGainEuro: group.weight ? group.gainTotal / group.weight : 0 })),
      sample: { taxUnits: households.reduce((sum, item) => sum + item.weight, 0),
        inheritanceEvents: inheritances.reduce((sum, item) => sum + item.weight, 0),
        referenceTotals, totals, ifiPayers: households.filter((item) => householdTaxes(item, reference).ifi > 0)
          .reduce((sum, item) => sum + item.weight, 0) },
      warning: "IR : assiette effective ajustée sur 2020–2022, mais erreur hors échantillon ~7,55 Md€ en 2023–2024. Foyers et successions synthétiques : effets de réforme non validés, sans comportement." };
  }

  return { rules, controls, defaults, incomeTaxBaseFactor, households, inheritances, progressive, policyRules,
    incomeTax, realEstateWealthTax, inheritanceTax, householdTaxes, validate, simulate };
})();
