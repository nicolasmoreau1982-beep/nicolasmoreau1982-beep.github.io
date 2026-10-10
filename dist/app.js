(() => {
  "use strict";

  const D = window.ECOSIM_DATA;
  const H = window.ECOSIM_HISTORY;
  const F = window.ECOSIM_FISCAL;
  if (!F) throw new Error("Moteur fiscal manquant");
  const populationProjection = window.ECOSIM_INSEE_PROJECTION;
  if (!populationProjection?.rows?.length) throw new Error("Projection démographique Insee manquante");
  const populationByYear = new Map(populationProjection.rows.map((row) => [row.year, row]));
  const allCategories = [...D.spending, ...D.revenue];
  const byId = new Map(allCategories.map((item) => [item.id, item]));
  const fmt1 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmt2 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

  const state = {
    changes: {},
    model: "consensus",
    euMode: "current",
    cycle: "normal",
    monetary: "neutral",
    confidence: "stable",
    policyStartQuarter: 1,
    policyStartQuarters: {},
    structural: Object.fromEntries(Object.entries(D.structural.controls).map(([id, control]) => [id, control.value])),
    activeStructuralTab: "demography",
    engines: Object.fromEntries(Object.entries(D.policyEngines.controls).map(([id, control]) => [id, control.value])),
    fiscal: { ...F.defaults },
    activeEngine: "work",
    politicsView: "current",
    politicsModel: "consensus",
    politicsHorizon: 3,
    selectedPolitics: "technical",
    horizon: 3,
    activeBudget: "spending",
    chartMetric: "deficitRatio",
    search: "",
    modifiedOnly: false,
    name: "Mon scénario",
    collapsed: new Set([...D.spendingGroups, ...D.revenueGroups].map((group) => group.id)),
    undoStack: [],
    editSnapshot: null,
    projection: null
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const round = (value, precision = 3) => Math.round(value * 10 ** precision) / 10 ** precision;
  const signed = (value, suffix = "") => `${value > 0 ? "+" : value < 0 ? "−" : ""}${fmt1.format(Math.abs(value))}${suffix}`;
  const money = (value, digits = 1) => `${digits ? fmt1.format(value) : fmt0.format(value)} Md€`;
  const percent = (value) => `${fmt1.format(value)} %`;
  const changeFor = (id) => Number(state.changes[id] || 0);
  const categoryStartQuarter = (id) => state.policyStartQuarters[id] || state.policyStartQuarter;
  const categoryChangeLimits = (category) => {
    const limit = Math.max(10, Math.ceil(Math.abs(category.value) * 0.7 / 5) * 5);
    return { min: Math.max(-limit, -category.value), max: limit };
  };
  const projectionIndex = (horizon) => clamp(Number(horizon) - 1, 0, D.metadata.projectionYears - 1);

  function encodeState(payload) {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  }

  function decodeState(value) {
    const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((value.length + 3) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function serializableState() {
    return {
      version: D.metadata.version,
      name: state.name,
      model: state.model,
      euMode: state.euMode,
      cycle: state.cycle,
      monetary: state.monetary,
      confidence: state.confidence,
      policyStartQuarter: state.policyStartQuarter,
      policyStartQuarters: { ...state.policyStartQuarters },
      structural: { ...state.structural },
      engines: { ...state.engines },
      fiscal: { ...state.fiscal },
      changes: Object.fromEntries(Object.entries(state.changes).filter(([, value]) => Math.abs(value) > 0.0001))
    };
  }

  function clearScenarioLink() {
    if (location.hash.startsWith("#scenario=")) window.history.replaceState(null, "", location.pathname + location.search);
  }

  function applySerialized(payload) {
    if (!payload || typeof payload !== "object") return false;
    if (D.models[payload.model]) state.model = payload.model;
    if (D.euModes[payload.euMode]) state.euMode = payload.euMode;
    if (D.assumptions.cycle[payload.cycle]) state.cycle = payload.cycle;
    if (D.assumptions.monetary[payload.monetary]) state.monetary = payload.monetary;
    if (D.assumptions.confidence[payload.confidence]) state.confidence = payload.confidence;
    state.policyStartQuarter = [1, 2, 3, 4].includes(Number(payload.policyStartQuarter))
      ? Number(payload.policyStartQuarter) : 1;
    state.policyStartQuarters = {};
    if (payload.policyStartQuarters && typeof payload.policyStartQuarters === "object") {
      for (const [id, quarter] of Object.entries(payload.policyStartQuarters)) {
        if (byId.has(id) && !byId.get(id).locked && [1, 2, 3, 4].includes(Number(quarter))) {
          state.policyStartQuarters[id] = Number(quarter);
        }
      }
    }
    if (typeof payload.name === "string") state.name = payload.name.slice(0, 60);
    if (payload.structural && typeof payload.structural === "object") {
      Object.entries(D.structural.controls).forEach(([id, control]) => {
        const value = Number(payload.structural[id]);
        if (Number.isFinite(value)) state.structural[id] = clamp(value, control.min, control.max);
      });
    }
    if (payload.engines && typeof payload.engines === "object") {
      Object.entries(D.policyEngines.controls).forEach(([id, control]) => {
        const value = Number(payload.engines[id]);
        if (Number.isFinite(value)) state.engines[id] = clamp(value, control.min, control.max);
      });
    }
    state.fiscal = { ...F.defaults };
    if (payload.fiscal && typeof payload.fiscal === "object") {
      const candidate = { ...F.defaults };
      Object.entries(F.controls).forEach(([id, control]) => {
        if (payload.fiscal[id] === undefined) return;
        const value = Number(payload.fiscal[id]);
        if (Number.isFinite(value)) candidate[id] = clamp(value, control.min, control.max);
      });
      try { state.fiscal = F.validate(candidate); } catch { state.fiscal = { ...F.defaults }; }
    }
    if (payload.changes && typeof payload.changes === "object") {
      state.changes = {};
      Object.entries(payload.changes).forEach(([id, value]) => {
        const category = byId.get(id);
        const number = Number(value);
        if (category && !category.locked && Number.isFinite(number)) {
          const limits = categoryChangeLimits(category);
          state.changes[id] = clamp(number, limits.min, limits.max);
        }
      });
    }
    return true;
  }

  function parseScenarioImport(content) {
    const file = JSON.parse(content);
    const payload = file?.scenario && !Array.isArray(file.scenario) ? file.scenario : file;
    const knownFields = ["changes", "structural", "engines", "fiscal", "model", "euMode", "cycle", "monetary", "confidence"];
    if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      !knownFields.some((key) => Object.hasOwn(payload, key))) {
      throw new Error("Ce fichier ne contient pas de scénario EcoSim.");
    }
    if (payload.model && !D.models[payload.model]) throw new Error("Cadre économique inconnu dans ce fichier.");
    return {payload, version: file?.metadata?.version || payload.version || null};
  }

  function loadInitialState() {
    const hash = location.hash.match(/^#scenario=(.+)$/);
    if (hash) {
      try {
        if (applySerialized(decodeState(hash[1]))) return;
      } catch (error) {
        console.warn("Scénario URL illisible", error);
      }
    }
    try {
      const saved = localStorage.getItem("ecosim-france-scenario");
      if (saved) applySerialized(JSON.parse(saved));
    } catch (error) {
      console.warn("Sauvegarde locale indisponible", error);
    }
  }

  function baselineTrajectory() {
    const result = [];
    let gdp = D.BASE.gdp;
    let debt = D.BASE.debt;
    for (let index = 0; index < D.metadata.projectionYears; index += 1) {
      const nominalGrowth = (1 + D.baseline.realGrowth[index] / 100) * (1 + D.baseline.inflation[index] / 100) - 1;
      gdp *= 1 + nominalGrowth;
      const deficit = gdp * D.baseline.deficitRatio[index] / 100;
      debt += deficit;
      result.push({
        year: D.metadata.projectionStart + index,
        gdp,
        debt,
        debtRatio: debt / gdp * 100,
        deficit,
        deficitRatio: deficit / gdp * 100,
        growth: D.baseline.realGrowth[index],
        inflation: D.baseline.inflation[index],
        unemployment: D.baseline.unemployment[index]
      });
    }
    return result;
  }

  function effectiveProfile(modelKey = state.model) {
    const base = D.models[modelKey];
    const cycle = D.assumptions.cycle[state.cycle];
    const monetary = D.assumptions.monetary[state.monetary];
    const confidence = D.assumptions.confidence[state.confidence];
    return {
      ...base,
      spendScale: base.spendScale * cycle.spendScale * monetary.spendScale,
      taxScale: base.taxScale * cycle.taxScale * monetary.taxScale,
      supplyScale: base.supplyScale * cycle.supplyScale * confidence.investmentScale,
      decay: clamp(base.decay * monetary.decayScale, 0.42, 0.92),
      inflationBoost: (base.inflationBoost || 1) * cycle.inflationScale,
      assumptionRate: monetary.rateShock + confidence.riskShock,
      uncertainty: Math.max(0.18, base.uncertainty + confidence.uncertainty)
    };
  }

  function interpolateVariant(points, year) {
    const years = Object.keys(points).map(Number).sort((a, b) => a - b);
    if (year <= years[0]) return points[years[0]];
    if (year >= years.at(-1)) return points[years.at(-1)];
    const upper = years.find((value) => value >= year);
    const lower = years[years.indexOf(upper) - 1];
    return points[lower] + (points[upper] - points[lower]) * (year - lower) / (upper - lower);
  }

  function categoryPolicyImpact(category, delta, index, priceIndex, profile, baselineGdp = D.BASE.gdp,
    startQuarter = 1) {
    const exposure = index === 0 ? (5 - startQuarter) / 4 : 1;
    const age = index + 1 - (startQuarter - 1) / 4;
    if (category.id === "R_TVA") {
      // Variante Mésange : effet en volume du PIB et niveau des prix à la
      // consommation. La hausse de TVA n'est pas une baisse du déflateur PIB.
      const variant = D.researchVariants.vat;
      const fullAmount = delta * priceIndex;
      const amount = fullAmount * exposure;
      const realGdp = amount * interpolateVariant(variant.realGdpPct, age) * profile.taxScale;
      const cpiLevel = (elapsed) => elapsed <= 0 ? 0 : elapsed < 1
        ? elapsed * variant.cpiLevelPct[1] : interpolateVariant(variant.cpiLevelPct, elapsed);
      const cpiChange = cpiLevel(age) - cpiLevel(age - 1);
      return { demand: realGdp, supply: 0, inflation: 0,
        cpiPoints: cpiChange * fullAmount / baselineGdp * 100, amount };
    }
    const ramp = index === 0 ? category.lag : Math.min(1, category.lag + Math.max(0, age - 1) * (category.rampPerYear || 0.28));
    const persistentDemand = category.type === "spending" ? 0.55 : 0.45;
    const demandWeight = persistentDemand + (1 - persistentDemand) * profile.decay ** Math.max(0, age - 1);
    const strategic = profile.strategicBoost && ["GF0403", "GF0404", "GF0405", "GF0408", "GF0503"].includes(category.id)
      ? profile.strategicBoost
      : 1;
    const amount = delta * priceIndex * exposure;
    const direction = category.type === "spending" ? 1 : -1;
    const scale = category.type === "spending" ? profile.spendScale : profile.taxScale;
    const leakage = clamp(1 - (category.importShare || 0) * 0.22 * (profile.importLeakageScale || 1), 0.35, 1);
    const demand = direction * amount * category.multiplier * scale * ramp * demandWeight * leakage * strategic;
    const supplyMaturity = 1 - Math.exp(-age / 3.6);
    const supply = direction * amount * category.supply * profile.supplyScale * supplyMaturity * strategic;
    const inflation = direction * amount * category.inflation * (profile.inflationBoost || 1);
    return { demand, supply, inflation, cpiPoints: 0, amount };
  }

  function calculateStructuralTrajectory(profile) {
    const defaults = D.structural.demographics;
    const workforce = D.structural.workforce;
    const values = state.structural;
    const rows = [];
    let baselinePopulation = defaults.population;
    let population = defaults.population;
    const baselineCohorts = [];
    const scenarioCohorts = [];
    const baselineBirthCohorts = [];
    const scenarioBirthCohorts = [];
    const publicCohorts = [];
    const occupationCohorts = [];
    const trainingCohorts = [];
    const occupationControlIds = {
      military: "jobsMilitary",
      police: "jobsPolice",
      gendarmerie: "jobsGendarmerie",
      judiciary: "jobsJudiciary",
      prison: "jobsPrison",
      youthJustice: "jobsYouthJustice",
      education: "jobsEducation",
      stateAdmin: "jobsStateAdmin",
      hospital: "jobsHospital",
      firefighters: "jobsFirefighters",
      territorial: "jobsTerritorial"
    };
    const pensionPresentValue = (annualPayment, years) => {
      const rate = workforce.pension.discountRate;
      return years > 0 ? annualPayment * (1 - (1 + rate) ** -years) / rate : 0;
    };
    const rawCategoryA = values.publicCategoryA / 100;
    const rawCategoryB = values.publicCategoryB / 100;
    const categoryScale = rawCategoryA + rawCategoryB > 0.95 ? 0.95 / (rawCategoryA + rawCategoryB) : 1;
    const publicCategoryMix = {
      a: rawCategoryA * categoryScale,
      b: rawCategoryB * categoryScale
    };
    publicCategoryMix.c = Math.max(0.05, 1 - publicCategoryMix.a - publicCategoryMix.b);
    const baselineCategoryCost = Object.values(workforce.publicCategories)
      .reduce((sum, item) => sum + item.share / 100 * item.costWeight, 0);
    const categoryCostMultiplier = (publicCategoryMix.a * workforce.publicCategories.a.costWeight
      + publicCategoryMix.b * workforce.publicCategories.b.costWeight
      + publicCategoryMix.c * workforce.publicCategories.c.costWeight) / baselineCategoryCost;

    const publicCohortPosition = (cohort, index) => {
      const yearsPresent = index - cohort.start;
      const permanentRetention = 0.985 ** yearsPresent;
      const contractRetention = 0.82 ** yearsPresent;
      const careerYears = Math.max(1, Math.round(workforce.pension.averageRemainingCareer + Number(state.engines.retirementAge || 0)));
      const active = yearsPresent < careerYears;
      const permanent = active ? cohort.jobs * cohort.permanentShare * permanentRetention : 0;
      const contract = active ? cohort.jobs * (1 - cohort.permanentShare) * contractRetention : 0;
      const retiredYears = Math.max(0, yearsPresent - careerYears);
      const retired = !active && retiredYears < workforce.pension.paymentYears
        ? cohort.jobs * (cohort.permanentShare * 0.985 ** careerYears + (1 - cohort.permanentShare) * 0.82 ** careerYears) * 0.98 ** retiredYears
        : 0;
      return { permanent, contract, total: permanent + contract, retired, careerYears, retiredYears };
    };

    for (let index = 0; index < D.metadata.projectionYears; index += 1) {
      const age = index + 1;
      const referenceYear = D.metadata.projectionStart + index;
      const referenceStart = populationByYear.get(referenceYear);
      const referenceEnd = populationByYear.get(referenceYear + 1);
      if (!referenceStart || !referenceEnd) throw new Error(`Projection Insee absente en ${referenceYear}`);
      const baselineBirths = referenceStart.birthsK;
      const baselineDeaths = referenceStart.deathsK;
      const deaths = baselineDeaths * (1 - values.lifeExpectancy * 0.018);
      const fertilityResponse = D.structural.fertilityResponse;
      const childcarePlaces = clamp(Number(state.engines.childcarePlaces) || 0, 0, fertilityResponse.childcarePlacesForFullEffectK);
      const policyFertilityDelta = fertilityResponse.maxAdditionalChildrenPerWoman
        * childcarePlaces / fertilityResponse.childcarePlacesForFullEffectK
        * (age <= 1 ? 0 : 1 - Math.exp(-(age - 1) / fertilityResponse.maturationYears));
      const effectiveFertility = values.fertility + policyFertilityDelta;
      const births = baselineBirths * (effectiveFertility / defaults.fertility) * (population / baselinePopulation);
      baselinePopulation = referenceEnd.populationM;
      population += (births - deaths + values.economicMigration + values.otherMigration
        + referenceStart.adjustmentK) / 1000;
      baselineBirthCohorts.push(baselineBirths);
      scenarioBirthCohorts.push(births);

      baselineCohorts.push({ economic: defaults.economicMigration, other: defaults.otherMigration });
      scenarioCohorts.push({ economic: values.economicMigration, other: values.otherMigration });
      const cohortAccounting = (cohorts, targetIntegration) => cohorts.reduce((acc, cohort, cohortIndex) => {
        const yearsPresent = index - cohortIndex + 1;
        const economicEmployment = 0.78 + 0.04 * (1 - Math.exp(-yearsPresent / 2));
        const otherEmployment = 0.33 + (targetIntegration / 100 - 0.33) * (1 - Math.exp(-yearsPresent / 3));
        acc.people += cohort.economic + cohort.other;
        acc.employed += cohort.economic * economicEmployment + cohort.other * otherEmployment;
        const incomingEconomic = Math.max(0, cohort.economic);
        const incomingOther = Math.max(0, cohort.other);
        const outgoingEconomic = Math.max(0, -cohort.economic);
        const outgoingOther = Math.max(0, -cohort.other);
        acc.arrivals += incomingEconomic + incomingOther;
        acc.departures += outgoingEconomic + outgoingOther;
        acc.arrivalEmployment += incomingEconomic * economicEmployment + incomingOther * otherEmployment;
        acc.departureEmployment += outgoingEconomic * economicEmployment + outgoingOther * otherEmployment;
        acc.integrationCost += incomingOther * 0.004 * Math.exp(-(yearsPresent - 1) / 3);
        return acc;
      }, { people: 0, arrivals: 0, departures: 0, employed: 0, arrivalEmployment: 0, departureEmployment: 0, integrationCost: 0 });
      const baseMigration = cohortAccounting(baselineCohorts, defaults.immigrantEmployment);
      const scenarioMigration = cohortAccounting(scenarioCohorts, values.integration);
      const migrationRevenue = scenarioMigration.arrivalEmployment * 0.025;
      const migrationCost = scenarioMigration.arrivals * 0.014 + scenarioMigration.integrationCost;
      const departureTaxLoss = scenarioMigration.departureEmployment * 0.025;
      const departureServiceSavings = scenarioMigration.departures * 0.014;
      const migrationRevenueDelta = migrationRevenue - departureTaxLoss - baseMigration.arrivalEmployment * 0.025;
      const migrationSpendingDelta = migrationCost - departureServiceSavings
        - (baseMigration.arrivals * 0.014 + baseMigration.integrationCost);
      const migrationNet = migrationRevenue - migrationCost - departureTaxLoss + departureServiceSavings;
      const migrationFiscalDelta = migrationRevenueDelta - migrationSpendingDelta;
      const youthWorkerDelta = index >= 18
        ? scenarioBirthCohorts.slice(0, index - 17).reduce((sum, cohort, cohortIndex) => sum + (cohort - baselineBirthCohorts[cohortIndex]) * 0.70, 0)
        : 0;
      const employedDelta = scenarioMigration.employed - baseMigration.employed + youthWorkerDelta;
      const laborGdp = employedDelta * 0.085 * profile.supplyScale;

      publicCohorts.push({
        start: index,
        permanentShare: values.publicPermanentShare / 100,
        fpe: values.publicFpeNet,
        fpt: values.publicFptNet,
        fph: values.publicFphNet
      });
      const requestedMissionRecruitments = Object.fromEntries(Object.entries(occupationControlIds)
        .map(([occupation, controlId]) => [occupation, Number(values[controlId] || 0)]));
      if (index === 0) requestedMissionRecruitments.hospital += Number(state.engines.healthWorkforce || 0);
      // Les personnes inscrites en formation à France Travail peuvent aussi
      // relever du halo ou du sous-emploi : ne pas les ajouter comme un
      // quatrième stock indépendant au plafond annuel de recrutement.
      const recruitmentLimit = (workforce.pools.unemployedBIT * 0.08 + workforce.pools.halo * 0.03
        + workforce.pools.underemployment * 0.05);
      const missionRecruitments = Object.fromEntries(Object.entries(requestedMissionRecruitments)
        .map(([id, requested]) => [id, requested > 0
          ? Math.min(requested, workforce.publicOccupations[id].baseline * values.publicHiringCapacity / 100)
          : requested]));
      const requestedPublicHiring = Object.values(requestedMissionRecruitments).reduce((sum, value) => sum + Math.max(0, value), 0);
      const cappedHiring = Object.values(missionRecruitments).reduce((sum, value) => sum + Math.max(0, value), 0);
      const hiringScale = cappedHiring > recruitmentLimit ? recruitmentLimit / cappedHiring : 1;
      Object.keys(missionRecruitments).forEach((id) => {
        if (missionRecruitments[id] > 0) missionRecruitments[id] *= hiringScale;
      });
      const realizedPublicHiring = cappedHiring * hiringScale;
      occupationCohorts.push({
        start: index,
        jobs: missionRecruitments,
        healthShare: index === 0 && requestedMissionRecruitments.hospital
          && Math.sign(state.engines.healthWorkforce) === Math.sign(requestedMissionRecruitments.hospital)
          ? clamp(Math.abs(Number(state.engines.healthWorkforce || 0) / requestedMissionRecruitments.hospital), 0, 1)
          : 0
      });
      trainingCohorts.push({ start: index, training: values.trainingEntries, activation: values.activationPlaces });
      const publicByVersant = { fpe: 0, fpt: 0, fph: 0 };
      const publicMissionById = Object.fromEntries(Object.keys(workforce.publicOccupations).map((id) => [id, 0]));
      let publicPermanentDelta = 0;
      let publicContractDelta = 0;
      let publicMilitaryDelta = 0;
      let genericPayrollCost = 0;
      let missionPayrollCost = 0;
      let publicPensionCost = 0;
      let publicPensionContributionRevenue = 0;
      let healthWorkforceJobs = 0;
      let healthWorkforceCost = 0;
      const publicRetiredByMission = Object.fromEntries(Object.keys(workforce.publicOccupations).map((id) => [id, 0]));
      let lifetimeCommitment = 0;
      const salaryMultiplier = 1 + Number(state.engines.publicPayroll || 0) / 100;
      publicCohorts.forEach((cohort) => {
        const yearsPresent = index - cohort.start;
        Object.keys(publicByVersant).forEach((key) => {
          const position = publicCohortPosition({
            start: cohort.start,
            jobs: cohort[key],
            permanentShare: cohort.permanentShare
          }, index);
          publicByVersant[key] += position.total;
          publicPermanentDelta += position.permanent;
          publicContractDelta += position.contract;
          const annualEmployerCost = position.total * workforce.publicService[key].employerCost * categoryCostMultiplier * salaryMultiplier;
          genericPayrollCost += annualEmployerCost;
          publicPensionContributionRevenue += annualEmployerCost * workforce.pension.employerContributionShare[key];
          const annualPension = position.retired * workforce.publicService[key].employerCost
            * workforce.pension.pensionAccrualRate * salaryMultiplier;
          publicPensionCost += annualPension;
          const remainingCareer = Math.max(0, position.careerYears - yearsPresent);
          lifetimeCommitment += pensionPresentValue(annualEmployerCost, remainingCareer)
            + (remainingCareer > 0
              ? pensionPresentValue(annualEmployerCost * workforce.pension.pensionAccrualRate, workforce.pension.paymentYears)
                / (1 + workforce.pension.discountRate) ** remainingCareer
              : pensionPresentValue(annualPension, Math.max(0, workforce.pension.paymentYears - position.retiredYears)));
        });
      });
      occupationCohorts.forEach((cohort) => {
        const yearsPresent = index - cohort.start;
        Object.entries(workforce.publicOccupations).forEach(([id, occupation]) => {
          const careerYears = Math.max(1, Math.round(occupation.careerYears + (occupation.military ? 0 : Number(state.engines.retirementAge || 0))));
          const permanentShare = occupation.military ? 1
            : clamp(occupation.permanentShare + (values.publicPermanentShare - D.structural.controls.publicPermanentShare.value) / 100, 0, 1);
          const retainedPermanent = cohort.jobs[id] * permanentShare * occupation.retention ** yearsPresent;
          const retainedContract = occupation.military ? 0
            : cohort.jobs[id] * (1 - permanentShare) * 0.82 ** yearsPresent;
          const position = yearsPresent < careerYears ? retainedPermanent + retainedContract : 0;
          publicMissionById[id] += position;
          publicByVersant[occupation.versant] += position;
          if (occupation.military) publicMilitaryDelta += position;
          else {
            publicPermanentDelta += yearsPresent < careerYears ? retainedPermanent : 0;
            publicContractDelta += yearsPresent < careerYears ? retainedContract : 0;
          }
          const mixMultiplier = occupation.categoryMix ? categoryCostMultiplier : 1;
          const annualEmployerCost = position * occupation.employerCost * mixMultiplier * salaryMultiplier;
          missionPayrollCost += annualEmployerCost;
          const contributionRevenue = annualEmployerCost * (occupation.military
            ? workforce.pension.employerContributionShare.military
            : workforce.pension.employerContributionShare[occupation.versant]);
          publicPensionContributionRevenue += contributionRevenue;
          if (id === "hospital" && cohort.healthShare) {
            healthWorkforceJobs += position * cohort.healthShare;
            healthWorkforceCost += (annualEmployerCost - contributionRevenue) * cohort.healthShare;
          }
          const retiredYears = Math.max(0, yearsPresent - careerYears);
          const retired = yearsPresent >= careerYears && retiredYears < workforce.pension.paymentYears
            ? cohort.jobs[id] * (permanentShare * occupation.retention ** careerYears
              + (1 - permanentShare) * 0.82 ** careerYears) * 0.98 ** retiredYears
            : 0;
          publicRetiredByMission[id] += retired;
          const annualPension = retired * occupation.employerCost * occupation.pensionRate * salaryMultiplier;
          publicPensionCost += annualPension;
          if (id === "hospital" && cohort.healthShare) healthWorkforceCost += annualPension * cohort.healthShare;
          const remainingCareer = Math.max(0, careerYears - yearsPresent);
          lifetimeCommitment += pensionPresentValue(annualEmployerCost, remainingCareer)
            + (remainingCareer > 0
              ? pensionPresentValue(annualEmployerCost * occupation.pensionRate, workforce.pension.paymentYears)
                / (1 + workforce.pension.discountRate) ** remainingCareer
              : pensionPresentValue(annualPension, Math.max(0, workforce.pension.paymentYears - retiredYears)));
        });
      });
      const publicEmploymentDelta = Object.values(publicByVersant).reduce((sum, value) => sum + value, 0);
      const publicPayrollCost = genericPayrollCost + missionPayrollCost;

      let trainingEmploymentDelta = 0;
      let trainingPipeline = 0;
      trainingCohorts.forEach((cohort) => {
        const yearsPresent = index - cohort.start + 1;
        const graduationRamp = 1 - Math.exp(-yearsPresent / 1.25);
        const employmentRetention = 0.965 ** Math.max(0, yearsPresent - 1);
        const trainingMatches = cohort.training * (values.trainingMatch / 100) * graduationRamp * employmentRetention;
        const activationMatches = cohort.activation * 0.28 * graduationRamp * employmentRetention;
        trainingEmploymentDelta += trainingMatches + activationMatches;
        if (yearsPresent <= 2) trainingPipeline += cohort.training * (1 - graduationRamp * 0.72);
      });
      const trainingFiscalCost = values.trainingEntries * 0.012 + values.activationPlaces * 0.008;
      const workforceGdp = (publicEmploymentDelta * 0.076 + trainingEmploymentDelta * 0.071) * profile.supplyScale;

      const ramp = Math.min(1, age / 10);
      const publicEnergyInvestment = values.efficiency + values.nuclear * 0.45 + values.renewables * 0.10;
      const carbonRevenue = values.carbonTax * 0.30;
      const rawImportBillChange = values.fossilPrice / 100 * D.structural.energy.importBill
        - values.nuclear * ramp * 0.18
        - values.renewables * ramp * 0.08
        - values.efficiency * age * 0.16;
      const importBillChange = Math.max(-D.structural.energy.importBill, rawImportBillChange);
      const energyDemand = publicEnergyInvestment * profile.spendScale * (0.9 * profile.decay ** index + 0.18);
      const energySupply = (-importBillChange * 0.24 + values.efficiency * ramp * 0.12)
        * profile.supplyScale * (profile.energySupplyScale || 1);
      const energyInflation = values.fossilPrice * 0.018 + values.carbonTax * 0.004
        - values.nuclear * ramp * 0.009 - values.renewables * ramp * 0.004 - values.efficiency * ramp * 0.012;
      const rawEmissionsChange = -values.nuclear * ramp * 1.35 - values.renewables * ramp * 0.72
        - values.efficiency * age * 0.55 - values.fossilPrice * 0.10;
      const remainingEmissions = D.structural.energy.emissionsMt * 0.985 ** age;
      const emissionsChange = Math.max(-remainingEmissions * 0.85, rawEmissionsChange);
      const demographyFiscalCost = (births - baselineBirths) * 0.012 + values.lifeExpectancy * age * 0.22;

      rows.push({
        year: D.metadata.projectionStart + index,
        population,
        baselinePopulation,
        births,
        baselineBirths,
        effectiveFertility,
        policyFertilityDelta,
        age65Share: referenceEnd.age65SharePct + values.lifeExpectancy * 0.18
          - (population - baselinePopulation) / population * 20,
        age80Share: referenceEnd.age80M / referenceEnd.populationM * 100,
        cumulativeMigration: scenarioMigration.people,
        migrationRevenue,
        migrationCost,
        migrationNet,
        migrationRevenueDelta,
        migrationSpendingDelta,
        departureTaxLoss,
        departureServiceSavings,
        migrationFiscalDelta,
        demographyFiscalCost,
        employedDelta,
        laborGdp,
        publicByVersant,
        publicMissionById,
        publicRetiredByMission,
        requestedPublicHiring,
        realizedPublicHiring,
        publicHiringRate: requestedPublicHiring > 0 ? realizedPublicHiring / requestedPublicHiring : 1,
        publicEmploymentDelta,
        publicPermanentDelta,
        publicContractDelta,
        publicMilitaryDelta,
        publicCategoryMix,
        categoryCostMultiplier,
        publicPayrollCost,
        publicPensionCost,
        publicPensionContributionRevenue,
        healthWorkforceJobs,
        healthWorkforceCost,
        lifetimeCommitment,
        trainingEmploymentDelta,
        trainingPipeline,
        trainingFiscalCost,
        workforceGdp,
        publicEnergyInvestment,
        carbonRevenue,
        energyFiscalCost: publicEnergyInvestment - carbonRevenue,
        importBillChange,
        energyDemand,
        energySupply,
        energyInflation: energyInflation * (profile.energyInflationScale || 1),
        emissionsChange,
        gdpImpact: laborGdp + workforceGdp + energyDemand + energySupply
      });
    }
    return rows;
  }

  function allocateLaborMarket(structure, engine, index) {
    const pools = D.structural.workforce.pools;
    const healthWorkforce = engine.contributions.healthWorkforce || { jobs: 0 };
    const publicJobs = structure.publicEmploymentDelta;
    const trainedJobs = structure.trainingEmploymentDelta;
    const marketDemand = engine.jobs - healthWorkforce.jobs;
    const recruitablePool = pools.unemployedBIT + pools.halo * 0.34 + pools.underemployment * 0.28
      + Math.max(0, structure.trainingPipeline) + Math.max(0, structure.employedDelta) * 0.35;
    const positiveDemand = Math.max(0, publicJobs + trainedJobs + marketDemand);
    const pressureRatio = positiveDemand / Math.max(1, recruitablePool);
    const realizationRate = positiveDemand > 0 ? clamp(1.04 - pressureRatio * 0.24, 0.55, 1) : 1;
    const realizedMarketJobs = marketDemand >= 0 ? marketDemand * realizationRate : marketDemand;
    const netEmployment = publicJobs + trainedJobs + realizedMarketJobs;
    const hires = Math.max(0, netEmployment);
    const fromTraining = Math.min(hires, Math.max(0, trainedJobs));
    const afterTraining = Math.max(0, hires - fromTraining);
    const fromUnemployment = Math.min(pools.unemployedBIT, afterTraining * clamp(0.58 - pressureRatio * 0.16, 0.34, 0.58));
    const fromHalo = Math.min(pools.halo * 0.45, afterTraining * clamp(0.13 + pressureRatio * 0.06, 0.13, 0.22));
    const fromUnderemployment = Math.min(pools.underemployment * 0.55, afterTraining * 0.11);
    const fromMigration = Math.min(Math.max(0, structure.employedDelta), afterTraining * 0.10);
    const jobToJob = Math.max(0, hires - fromTraining - fromUnemployment - fromHalo - fromUnderemployment - fromMigration);
    const unemploymentChangeK = netEmployment >= 0 ? -fromUnemployment : Math.abs(netEmployment) * 0.72;
    const laborTension = Math.max(0, pressureRatio - 0.62);
    return {
      publicJobs,
      trainedJobs,
      marketDemand,
      realizedMarketJobs,
      realizationRate,
      netEmployment,
      recruitablePool,
      fromUnemployment,
      fromTraining,
      fromHalo,
      fromUnderemployment,
      fromMigration,
      jobToJob,
      unemploymentChangeK,
      laborTension,
      year: D.metadata.projectionStart + index
    };
  }

  function calculatePolicyEngineTrajectory(profile) {
    const rows = [];
    for (let index = 0; index < D.metadata.projectionYears; index += 1) {
      const age = index + 1;
      const totals = {
        fiscalCost: 0,
        demand: 0,
        supply: 0,
        jobs: 0,
        inflation: 0,
        emissions: 0,
        trade: 0,
        poverty: 0,
        uncertainty: 0,
        contributions: {}
      };
      Object.entries(D.policyEngines.controls).forEach(([id, control]) => {
        const delta = Number(state.engines[id]) - control.value;
        if (Math.abs(delta) < 0.0001) return;
        const effect = control.effects;
        let ramp = Math.min(1, (effect.lag ?? 0.6) + index * 0.16);
        const cohortRetention = id === "healthWorkforce"
          ? valuesForPublicRetention(state.structural.publicPermanentShare, index)
          : 1;
        if (id === "healthWorkforce") ramp = cohortRetention;
        const demandPersistence = 0.58 + 0.42 * profile.decay ** index;
        const supplyMaturity = 1 - Math.exp(-age / 3.2);
        const cumulativeScale = id === "productivity" ? 0.55 + age * 0.24 : 1;
        let demand = delta * (effect.demand || 0) * profile.spendScale * ramp * demandPersistence;
        let supply = delta * (effect.supply || 0) * profile.supplyScale * supplyMaturity * cumulativeScale;
        let trade = delta * (effect.trade || 0) * ramp;
        let uncertainty = Math.abs(delta) * (effect.uncertainty || 0.04);
        if (id === "tradeProtection" && !["breach", "euroExit"].includes(state.euMode)) {
          supply -= delta * 0.34 * supplyMaturity;
          trade -= delta * 0.28 * ramp;
          uncertainty += delta * 0.20;
        }
        if (id === "publicGuarantees") {
          uncertainty += delta * 0.025 * age;
        }
        const contribution = {
          fiscalCost: delta * (effect.fiscal || 0) * (id === "healthWorkforce" ? ramp : 1),
          demand,
          supply,
          jobs: delta * (effect.jobs || 0) * ramp,
          inflation: delta * (effect.inflation || 0) * ramp,
          emissions: delta * (effect.emissions || 0) * ramp,
          trade,
          poverty: delta * (effect.poverty || 0) * ramp,
          uncertainty
        };
        contribution.gdpImpact = contribution.demand + contribution.supply;
        totals.contributions[id] = contribution;
        Object.keys(contribution).forEach((key) => {
          if (key !== "gdpImpact" && key in totals) totals[key] += contribution[key];
        });
      });
      totals.gdpImpact = totals.demand + totals.supply;
      totals.year = D.metadata.projectionStart + index;
      rows.push(totals);
    }
    return rows;
  }

  function valuesForPublicRetention(permanentShare, yearsPresent) {
    const share = Number(permanentShare) / 100;
    return share * 0.985 ** yearsPresent + (1 - share) * 0.82 ** yearsPresent;
  }

  function calculateSocialOutlook(point, reference) {
    const change = (id) => Number(state.changes[id] || 0);
    const education = Object.entries(state.changes).reduce((sum, [id, value]) => sum + (id.startsWith("GF09") ? Number(value) : 0), 0);
    const health = Object.entries(state.changes).reduce((sum, [id, value]) => sum + (id.startsWith("GF07") ? Number(value) : 0), 0);
    const macro = clamp((point.unemployment - reference.unemployment) * 2.2
      + (point.inflation - reference.inflation) * 1.5
      - (point.gdp / reference.gdp - 1) * 100 * 0.9, -12, 12);
    const budget = {
      private: change("R_IR") * 0.10 + change("R_SOCIAL") * 0.035 - change("GF1004") * 0.12,
      public: change("R_IR") * 0.09 - state.engines.publicPayroll * 0.45,
      unemployed: -change("GF1005") * 0.30 - change("GF1007") * 0.12 - state.engines.youthIntegration * 0.10,
      independent: change("R_IS") * 0.09 + change("R_OTHERPROD") * 0.14,
      student: -education * 0.15 - state.engines.vocationalTraining * 0.12,
      retired: -change("GF1002") * 0.14 - state.engines.pensionIndex * 0.75 + state.engines.retirementAge * 0.2
    };
    const cells = [];
    D.social.ages.forEach((age) => {
      const lower = Number(age.id.split("-")[0].replace("+", ""));
      D.social.situations.forEach((situation) => {
        if (lower > situation.maxAge || (lower + (age.id === "75+" ? 20 : 9)) < situation.minAge) return;
        const ageFactor = lower >= 65 ? 0.80 : lower < 35 ? 1.15 : 1;
        const agePolicy = lower >= 65 ? -change("GF1002") * 0.05 : lower < 35 ? -education * 0.04 : 0;
        const discomfort = clamp((macro + budget[situation.id] + agePolicy
          + change("R_TVA") * 0.09 - health * 0.07) * ageFactor, -20, 20);
        const pressure = Math.max(0, discomfort) * age.mobilization * situation.mobilization;
        cells.push({ age: age.id, ageLabel: age.label, situation: situation.id,
          situationLabel: situation.label, discomfort, pressure, voteWeight: age.voteWeight });
      });
    });
    const weighted = cells.reduce((sum, cell) => sum + cell.discomfort * cell.voteWeight, 0);
    const weight = cells.reduce((sum, cell) => sum + cell.voteWeight, 0);
    const meanDiscomfort = weight ? weighted / weight : 0;
    const highestPressure = [...cells].sort((a, b) => b.pressure - a.pressure)[0];
    return {
      cells, meanDiscomfort, highestPressure,
      incumbentVoteSensitivity: [round(-meanDiscomfort * 0.05, 2), round(-meanDiscomfort * 0.25, 2)],
      note: "Indices relatifs hypothétiques ; pas une prévision de manifestation, de participation ni de résultat électoral."
    };
  }

  function calculateProjection(modelKey = state.model) {
    const baseline = baselineTrajectory();
    const profile = effectiveProfile(modelKey);
    const eu = D.euModes[state.euMode];
    const structural = calculateStructuralTrajectory(profile);
    const engines = calculatePolicyEngineTrajectory(profile);
    const scenario = [];
    let scenarioDebt = D.BASE.debt;
    let baselineDebtPrevious = D.BASE.debt;
    let priceIndex = 1;
    let institutionRealFactor = 1;
    let institutionPriceFactor = 1;
    let previousOutputGap = 0;
    let lastDebtRatio = D.BASE.debtRatio;

    for (let index = 0; index < D.metadata.projectionYears; index += 1) {
      priceIndex *= 1 + D.baseline.inflation[index] / 100;
      institutionRealFactor *= 1 + (eu.growthShock[index] || 0) / 100;

      let policyGdp = 0;
      let policyInflationBillions = 0;
      let policyCpiPoints = 0;
      let spendingChange = 0;
      let revenueChange = 0;
      let demandContribution = 0;
      let supplyContribution = 0;
      const structure = structural[index];
      const engine = engines[index];
      const healthContribution = engine.contributions.healthWorkforce;
      if (healthContribution) {
        const healthGdp = structure.healthWorkforceJobs * 0.076 * profile.supplyScale;
        engine.fiscalCost += structure.healthWorkforceCost - healthContribution.fiscalCost;
        engine.demand -= healthContribution.demand;
        engine.supply += healthGdp - healthContribution.supply;
        engine.gdpImpact += healthGdp - healthContribution.gdpImpact;
        engine.jobs += structure.healthWorkforceJobs - healthContribution.jobs;
        Object.assign(healthContribution, {
          fiscalCost: structure.healthWorkforceCost,
          demand: 0,
          supply: healthGdp,
          gdpImpact: healthGdp,
          jobs: structure.healthWorkforceJobs
        });
      }
      const labor = allocateLaborMarket(structure, engine, index);
      const cohortizedHealth = engine.contributions.healthWorkforce || { fiscalCost: 0, demand: 0, supply: 0, gdpImpact: 0, jobs: 0 };
      const fiscal = F.simulate(state.fiscal, baseline[index].year, priceIndex);

      Object.entries(state.changes).forEach(([id, deltaValue]) => {
        const delta = Number(deltaValue);
        if (!delta) return;
        const category = byId.get(id);
        if (!category || category.locked) return;
        const impact = categoryPolicyImpact(category, delta, index, priceIndex, profile, baseline[index].gdp,
          categoryStartQuarter(id));
        demandContribution += impact.demand;
        supplyContribution += impact.supply;
        policyGdp += impact.demand + impact.supply;
        policyInflationBillions += impact.inflation * (profile.decay ** index);
        policyCpiPoints += impact.cpiPoints;
        if (category.type === "spending") spendingChange += impact.amount;
        else revenueChange += impact.amount;
      });

      for (const [tax, categoryId] of Object.entries({
        ir: "R_IR", ifi: "R_OTHERWEALTH", inheritance: "R_SUCCESSION", floor: "R_OTHERWEALTH"
      })) {
        const amount = fiscal.deltaByTax[tax];
        if (Math.abs(amount) < 1e-9) continue;
        // La micro-simulation produit déjà un rendement nominal de l'année.
        // Le canal macro attend un choc en euros de la base 2025.
        const fiscalPolicyIndex = index - (state.fiscal.startYear - D.metadata.projectionStart);
        const impact = categoryPolicyImpact(byId.get(categoryId), amount / priceIndex,
          fiscalPolicyIndex, priceIndex, profile, baseline[index].gdp, 1);
        revenueChange += impact.amount;
        supplyContribution += impact.supply;
        policyGdp += impact.supply;
        policyInflationBillions += impact.inflation * (profile.decay ** index);
      }
      const fiscalDemand = fiscal.distributionDemandBn * profile.taxScale;
      demandContribution += fiscalDemand;
      policyGdp += fiscalDemand;

      policyGdp += structure.gdpImpact;
      demandContribution += structure.energyDemand;
      supplyContribution += structure.energySupply + structure.laborGdp + structure.workforceGdp;
      spendingChange += structure.publicEnergyInvestment + structure.demographyFiscalCost
        + structure.publicPayrollCost + structure.publicPensionCost + structure.trainingFiscalCost
        + structure.migrationSpendingDelta;
      revenueChange += structure.carbonRevenue + structure.migrationRevenueDelta
        + structure.publicPensionContributionRevenue;
      const engineGdp = engine.gdpImpact - cohortizedHealth.gdpImpact;
      const engineDemand = engine.demand - cohortizedHealth.demand;
      const engineSupply = engine.supply - cohortizedHealth.supply;
      policyGdp += engineGdp;
      demandContribution += engineDemand;
      supplyContribution += engineSupply;
      Object.entries(engine.contributions).forEach(([id, contribution]) => {
        if (id === "healthWorkforce") return;
        if (D.policyEngines.fiscalSide[id] === "revenue") revenueChange -= contribution.fiscalCost;
        else spendingChange += contribution.fiscalCost;
      });

      // Séquelle de capacité productive associée à la demande : hypothèse de
      // sensibilité, appliquée aux écarts de politique et jamais à la référence.
      const hysteresis = demandContribution * (profile.hysteresisScale || 0)
        * (1 - Math.exp(-(index + 1) / 4));
      policyGdp += hysteresis;
      supplyContribution += hysteresis;

      const sharedPriceShock = policyInflationBillions / baseline[index].gdp * 100 + structure.energyInflation
        + engine.inflation + labor.laborTension * 0.18;
      const extraInflation = clamp(sharedPriceShock + policyCpiPoints, -4.5, 6.5);
      const gdpDeflatorShock = clamp(sharedPriceShock, -4.5, 6.5);
      institutionPriceFactor *= 1 + ((eu.inflationShock[index] || 0) + gdpDeflatorShock) / 100;
      const scenarioGdp = Math.max(
        baseline[index].gdp * institutionRealFactor * institutionPriceFactor + policyGdp,
        baseline[index].gdp * 0.62
      );
      const outputGap = (institutionRealFactor - 1) * 100 + policyGdp / baseline[index].gdp * 100;
      const growth = D.baseline.realGrowth[index] + outputGap - previousOutputGap;
      previousOutputGap = outputGap;
      const inflation = D.baseline.inflation[index] + (eu.inflationShock[index] || 0) + extraInflation;
      const unemployment = clamp(D.baseline.unemployment[index] - 0.35 * outputGap + labor.unemploymentChangeK / 310, 3.2, 18);
      const revenueFeedback = (scenarioGdp - baseline[index].gdp - structure.laborGdp) * 0.48;
      const cyclicalSpending = (unemployment - D.baseline.unemployment[index]) * 3.1;

      const debtDifferencePrevious = scenarioDebt - baselineDebtPrevious;
      const previousBaselineRatio = index === 0 ? D.BASE.debtRatio : baseline[index - 1].debtRatio;
      const debtRisk = Math.max(0, lastDebtRatio - previousBaselineRatio) * 0.045 * profile.debtSensitivity;
      const riskPremium = Math.max(-0.20, eu.rateShock + profile.assumptionRate + debtRisk
        + Math.max(0, extraInflation) * (profile.inflationRiskScale || 0));
      const transmission = Math.min(1, 0.18 * (index + 1));
      const extraInterest = debtDifferencePrevious * D.baseline.policyRate[index] / 100
        + scenarioDebt * riskPremium / 100 * transmission;
      const directBalanceCost = spendingChange - revenueChange;
      const deficit = baseline[index].deficit + directBalanceCost - revenueFeedback + cyclicalSpending + extraInterest;
      scenarioDebt += deficit;
      const debtRatio = scenarioDebt / scenarioGdp * 100;
      const deficitRatio = deficit / scenarioGdp * 100;

      const policySize = Math.abs(demandContribution) + Math.abs(supplyContribution) + Math.abs(directBalanceCost) * 0.22;
      const longRunUncertainty = index < 10 ? 1 : 1 + (index - 9) * 0.065;
      const uncertaintyScale = (profile.uncertainty * (1 + index * 0.07) + eu.uncertainty * (1 + index * 0.09) + Math.min(1.2, engine.uncertainty / 240)) * longRunUncertainty;
      const baselineMacroRisk = index < 10 ? 0.001 + index * 0.0003 : 0.004 + (index - 9) * 0.0016;
      const modelGdpBand = Math.max(baseline[index].gdp * baselineMacroRisk, policySize * uncertaintyScale + baseline[index].gdp * eu.uncertainty * 0.006);
      const gdpBand = Math.max(modelGdpBand, baseline[index].gdp * H.stressFloor("gdpPct", index + 1) / 100);
      const fiscalStress = Math.abs(fiscal.totalBn) * (state.fiscal.wealthFloorEnabled ? 1.5 : 1);
      const deficitBand = Math.max(0.08 + Math.max(0, index - 9) * 0.07, (Math.abs(directBalanceCost) * profile.uncertainty + eu.uncertainty * 12 + fiscalStress) / scenarioGdp * 100 * (1 + index * 0.08), H.stressFloor("deficitRatio", index + 1));
      const debtBand = Math.max(0.25, (modelGdpBand / scenarioGdp * 100 + deficitBand) * Math.sqrt(index + 1), H.stressFloor("debtRatio", index + 1));

      scenario.push({
        year: baseline[index].year,
        gdp: scenarioGdp,
        debt: scenarioDebt,
        debtRatio,
        deficit,
        deficitRatio,
        growth,
        inflation,
        unemployment,
        directBalanceCost,
        spendingChange,
        revenueChange,
        revenueFeedback,
        extraInterest,
        demandContribution,
        supplyContribution,
        hysteresis,
        outputGap,
        riskPremium,
        structural: structure,
        engines: engine,
        labor,
        fiscal,
        bands: {
          gdp: gdpBand,
          deficitRatio: deficitBand,
          debtRatio: debtBand,
          growth: Math.max(0.12, modelGdpBand / baseline[index].gdp * 65),
          unemployment: Math.max(0.08, modelGdpBand / baseline[index].gdp * 28, H.stressFloor("unemployment", index + 1))
        }
      });
      baselineDebtPrevious = baseline[index].debt;
      lastDebtRatio = debtRatio;
    }

    scenario.forEach((point, index) => { point.social = calculateSocialOutlook(point, baseline[index]); });
    return { baseline, scenario, profile, eu, structural, engines };
  }

  function initializeControls() {
    const modelSelect = $("#model-select");
    modelSelect.innerHTML = Object.entries(D.models).map(([id, model]) => `<option value="${id}">${model.label}</option>`).join("");
    modelSelect.value = state.model;
    const politicsModelSelect = $("#politics-model-select");
    politicsModelSelect.innerHTML = modelSelect.innerHTML;
    politicsModelSelect.value = state.politicsModel;
    const euSelect = $("#eu-select");
    euSelect.innerHTML = Object.entries(D.euModes).map(([id, mode]) => `<option value="${id}">${mode.label}</option>`).join("");
    euSelect.value = state.euMode;
    $("#policy-start-quarter").value = String(state.policyStartQuarter);
    const assumptionSelects = [
      ["cycle-select", "cycle"],
      ["monetary-select", "monetary"],
      ["confidence-select", "confidence"]
    ];
    assumptionSelects.forEach(([elementId, key]) => {
      const select = $(`#${elementId}`);
      select.innerHTML = Object.entries(D.assumptions[key]).map(([id, item]) => `<option value="${id}">${item.label}</option>`).join("");
      select.value = state[key];
    });
    $("#scenario-name").value = state.name;
    renderSavedScenarios();
    renderPresets();
    renderSources();
    renderHistoryAudit();
    renderSectors();
    renderStructuralControls();
    renderFiscalControls();
    renderEngineSelector();
    renderEngineControls();
    renderPolitics();
    updateModelDescription();
    updateAssumptionDescription();
  }

  function renderPresets() {
    const icons = ["↗", "⚙", "◆", "=", "↓"];
    $("#preset-list").innerHTML = D.presets.map((preset, index) => `
      <button class="preset" data-preset="${preset.id}" title="${preset.description}">
        <span class="preset-icon">${icons[index]}</span>
        <span><strong>${preset.label}</strong><small>${preset.description}</small></span>
        <span class="preset-badge">${preset.badge}</span>
      </button>
    `).join("");
  }

  function renderSources() {
    $("#source-grid").innerHTML = D.sources.map((source) => `
      <a class="source-card" href="${source.url}" target="_blank" rel="noopener noreferrer">
        <span class="source-publisher">${source.publisher}</span>
        <span><strong>${source.title}</strong><p>${source.note}</p></span>
        <time>${source.date}</time>
      </a>
    `).join("");
  }

  function renderHistoryAudit() {
    const rows = H.horizons.map((horizon) => {
      const result = H.report[horizon];
      return `<tr><th scope="row">${horizon} an${horizon > 1 ? "s" : ""}</th><td>${result.n}</td><td>${fmt1.format(result.metrics.gdpPct.mae)} %</td><td>${fmt1.format(result.metrics.deficitRatio.mae)} pt</td><td>${fmt1.format(result.metrics.debtRatio.mae)} pt</td><td>${fmt1.format(result.metrics.unemployment.mae)} pt</td></tr>`;
    }).join("");
    $("#history-audit").innerHTML = `<div class="history-audit-scroll"><table><caption>Erreur absolue moyenne du prévisionniste témoin, calculée uniquement sur les années postérieures à chaque origine</caption><thead><tr><th>Horizon</th><th>Cas</th><th>PIB nominal</th><th>Déficit/PIB</th><th>Dette/PIB</th><th>Chômage</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const politicalProjectionCache = new Map();

  function politicalScenarioList() {
    return D.politicalScenarios[state.politicsView] || [];
  }

  function politicalScenarioById(id = state.selectedPolitics) {
    return politicalScenarioList().find((item) => item.id === id) || politicalScenarioList()[0];
  }

  function politicalScenarioInputs(scenario, modelKey = state.politicsModel) {
    return {
      changes: { ...scenario.changes },
      model: modelKey,
      euMode: scenario.euMode,
      cycle: "normal",
      monetary: "neutral",
      confidence: "stable",
      policyStartQuarter: 1,
      policyStartQuarters: {},
      structural: Object.fromEntries(Object.entries(D.structural.controls).map(([id, control]) => [id, scenario.structural[id] ?? control.value])),
      engines: Object.fromEntries(Object.entries(D.policyEngines.controls).map(([id, control]) => [id, scenario.engines[id] ?? control.value])),
      fiscal: { ...F.defaults }
    };
  }

  function calculatePoliticalProjection(scenario, modelKey = state.politicsModel) {
    const cacheKey = `${scenario.id}:${modelKey}`;
    const cached = politicalProjectionCache.get(cacheKey);
    if (cached) return cached;
    const snapshot = {
      changes: state.changes,
      model: state.model,
      euMode: state.euMode,
      cycle: state.cycle,
      monetary: state.monetary,
      confidence: state.confidence,
      policyStartQuarter: state.policyStartQuarter,
      policyStartQuarters: state.policyStartQuarters,
      structural: state.structural,
      engines: state.engines,
      fiscal: state.fiscal
    };
    Object.assign(state, politicalScenarioInputs(scenario, modelKey));
    let projection;
    try { projection = calculateProjection(); }
    finally { Object.assign(state, snapshot); }
    politicalProjectionCache.set(cacheKey, projection);
    return projection;
  }

  function politicalPoint(scenario, modelKey = state.politicsModel) {
    const index = projectionIndex(state.politicsHorizon);
    const projection = calculatePoliticalProjection(scenario, modelKey);
    return { point: projection.scenario[index], baseline: projection.baseline[index] };
  }

  function politicalSensitivity(scenario) {
    const points = Object.keys(D.models).map((modelKey) => politicalPoint(scenario, modelKey).point);
    return {
      deficit: [Math.min(...points.map((point) => point.deficitRatio)), Math.max(...points.map((point) => point.deficitRatio))],
      debt: [Math.min(...points.map((point) => point.debtRatio)), Math.max(...points.map((point) => point.debtRatio))]
    };
  }

  function politicalTranslationRows(scenario) {
    const rows = [];
    Object.entries(scenario.changes).forEach(([id, value]) => {
      const category = byId.get(id);
      if (!category) return;
      const direction = value > 0 ? "+" : "−";
      const kind = category.type === "spending" ? "Dépense" : "Recette";
      rows.push(`${kind} · ${category.label} : ${direction}${fmt1.format(Math.abs(value))} Md€/an`);
    });
    Object.entries(scenario.structural).forEach(([id, value]) => {
      const control = D.structural.controls[id];
      if (control) rows.push(`${control.kind === "assumption" ? "Hypothèse de contexte · " : "Mesure · "}${control.label} : ${controlText(id, value)}`);
    });
    Object.entries(scenario.engines).forEach(([id, value]) => {
      const control = D.policyEngines.controls[id];
      if (control) rows.push(`${control.kind === "assumption" ? "Hypothèse de réalisation · " : "Mesure · "}${control.label} : ${engineControlText(id, value)}`);
    });
    return rows;
  }

  function renderPoliticsList() {
    const scenarios = politicalScenarioList();
    if (!scenarios.some((item) => item.id === state.selectedPolitics)) state.selectedPolitics = scenarios[0]?.id;
    $("#politics-list").innerHTML = scenarios.map((scenario) => `
      <button class="politics-card ${scenario.id === state.selectedPolitics ? "is-active" : ""}" data-politics-id="${scenario.id}" style="--party-color:${scenario.color}">
        <span class="party-mark">${scenario.short}</span>
        <span class="party-copy"><strong>${scenario.name}</strong><small>${scenario.date}</small></span>
        <span class="confidence confidence-${scenario.confidenceKey}">${scenario.confidence}</span>
        ${scenario.seats ? `<b>${scenario.seats}<small> sièges</small></b>` : ""}
      </button>`).join("");
    $("#politics-list-note").textContent = state.politicsView === "current"
      ? "Effectifs officiels de l’Assemblée au 10 octobre 2026. Les non-inscrits sont exclus : ils n’ont pas de programme collectif."
      : "Une famille historique n’est pas un parti continu. Le noyau récurrent agrège seulement les engagements compatibles retrouvés depuis 2007.";
  }

  function renderPoliticsDetail() {
    const scenario = politicalScenarioById();
    if (!scenario) return;
    const { point, baseline } = politicalPoint(scenario);
    const sensitivity = politicalSensitivity(scenario);
    const emissions = point.structural.emissionsChange + point.engines.emissions;
    const poverty = 15.4 + point.engines.poverty;
    const translationUncertainty = { high: 1, medium: 1.25, low: 1.6 }[scenario.confidenceKey] || 1;
    const horizonCaveat = state.politicsHorizon > 10
      ? " À cet horizon structurel, une alternance, une crise, une innovation ou une modification des traités peut inverser la trajectoire."
      : "";
    const rows = politicalTranslationRows(scenario);
    $("#politics-detail").innerHTML = `
      <div class="politics-detail-head" style="--party-color:${scenario.color}">
        <span class="party-mark large">${scenario.short}</span>
        <div><small>${scenario.date}</small><h3>${scenario.name}</h3></div>
        <span class="confidence confidence-${scenario.confidenceKey}">confiance ${scenario.confidence}</span>
      </div>
      <p class="politics-summary">${scenario.summary}</p>
      <div class="politics-measures">${scenario.measures.map((item, index) => `<div><i>0${index + 1}</i><span>${item}</span></div>`).join("")}</div>
      <div class="politics-results">
        <div><small>Déficit</small><strong>${percent(point.deficitRatio)}</strong><span>${signed(point.deficitRatio - baseline.deficitRatio, " pt vs réf.")}</span></div>
        <div><small>Dette</small><strong>${percent(point.debtRatio)}</strong><span>± ${fmt1.format(point.bands.debtRatio * translationUncertainty)} pt</span></div>
        <div><small>Croissance</small><strong>${percent(point.growth)}</strong><span>${signed(point.growth - baseline.growth, " pt")}</span></div>
        <div><small>Chômage</small><strong>${percent(point.unemployment)}</strong><span>${signed(point.unemployment - baseline.unemployment, " pt")}</span></div>
        <div><small>Émissions</small><strong>${signed(emissions, " Mt")}</strong><span>écart CO₂e</span></div>
        <div><small>Pauvreté</small><strong>${percent(poverty)}</strong><span>${signed(point.engines.poverty, " pt")}</span></div>
      </div>
      <div class="politics-sensitivity"><strong>Écart entre les neuf lectures économiques</strong><p>Déficit : ${percent(sensitivity.deficit[0])} à ${percent(sensitivity.deficit[1])} du PIB · Dette : ${percent(sensitivity.debt[0])} à ${percent(sensitivity.debt[1])} du PIB. Ce sont des résultats sous hypothèses alternatives, pas un intervalle de confiance.</p></div>
      <div class="politics-explanation"><strong>Pourquoi ce résultat reste incertain</strong><p>${scenario.why}${horizonCaveat}</p></div>
      <details class="politics-mapping"><summary>Voir la traduction exacte (${rows.length} réglages)</summary><div>${rows.length ? rows.map((row) => `<span>${row}</span>`).join("") : "<span>Aucun réglage discrétionnaire : trajectoire de référence.</span>"}</div></details>
      <div class="politics-actions">
        <button class="button button-dark" data-apply-politics="${scenario.id}">Appliquer au simulateur</button>
        <span>${scenario.sources.map((source) => `<a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.label} ↗</a>`).join("")}</span>
      </div>`;
  }

  function renderPoliticsComparison() {
    const scenarios = politicalScenarioList();
    $("#politics-comparison-title").textContent = `Comparaison à ${state.politicsHorizon} an${state.politicsHorizon > 1 ? "s" : ""} · ${D.models[state.politicsModel].label}`;
    const header = `<div class="politics-compare-row is-head"><span>Scénario</span><span>Déficit</span><span>Dette</span><span>PIB vs réf.</span><span>Chômage</span><span>CO₂e</span></div>`;
    const body = scenarios.map((scenario) => {
      const { point, baseline } = politicalPoint(scenario);
      const gdpDelta = (point.gdp / baseline.gdp - 1) * 100;
      const emissions = point.structural.emissionsChange + point.engines.emissions;
      return `<button class="politics-compare-row ${scenario.id === state.selectedPolitics ? "is-selected" : ""}" data-politics-id="${scenario.id}" style="--party-color:${scenario.color}">
        <span><i></i><b>${scenario.short}</b><small>${scenario.confidence}</small></span>
        <span>${percent(point.deficitRatio)}</span><span>${percent(point.debtRatio)}</span><span>${signed(gdpDelta, " %")}</span><span>${percent(point.unemployment)}</span><span>${signed(emissions, " Mt")}</span>
      </button>`;
    }).join("");
    $("#politics-comparison").innerHTML = header + body;
  }

  function renderPolitics() {
    renderPoliticsList();
    renderPoliticsDetail();
    renderPoliticsComparison();
  }

  function applyPoliticalScenario(id) {
    const scenario = politicalScenarioById(id);
    if (!scenario) return;
    pushUndo();
    Object.assign(state, politicalScenarioInputs(scenario));
    state.name = scenario.name;
    $("#scenario-name").value = state.name;
    $("#model-select").value = state.model;
    $("#eu-select").value = state.euMode;
    $("#cycle-select").value = state.cycle;
    $("#monetary-select").value = state.monetary;
    $("#confidence-select").value = state.confidence;
    $("#policy-start-quarter").value = String(state.policyStartQuarter);
    updateModelDescription();
    updateAssumptionDescription();
    renderStructuralControls();
    renderEngineControls();
    renderFiscalControls();
    refreshAll(true);
    showToast(`Scénario « ${scenario.name} » appliqué et modifiable`);
    $("#simulator").scrollIntoView({ behavior: "smooth" });
  }

  function updateModelDescription() {
    const model = D.models[state.model];
    const eu = D.euModes[state.euMode];
    $("#model-description").textContent = `${model.description} ${eu.description}`;
    const coefficients = [
      `Demande dépenses ×${model.spendScale}`,
      `Demande prélèvements ×${model.taxScale}`,
      `Offre ×${model.supplyScale}`,
      `Persistance ${model.decay}`,
      `Sensibilité dette ×${model.debtSensitivity}`,
      `Incertitude exploratoire ${model.uncertainty}`
    ];
    if (model.strategicBoost) coefficients.push(`Postes stratégiques ×${model.strategicBoost}`);
    if (model.inflationBoost) coefficients.push(`Prix des mesures ×${model.inflationBoost}`);
    if (model.hysteresisScale) coefficients.push(`Séquelle de demande ×${model.hysteresisScale}`);
    if (model.importLeakageScale) coefficients.push(`Fuite importations ×${model.importLeakageScale}`);
    if (model.inflationRiskScale) coefficients.push(`Prix → taux +${model.inflationRiskScale} pt/pt`);
    if (model.energySupplyScale) coefficients.push(`Offre énergie ×${model.energySupplyScale}`);
    if (model.energyInflationScale) coefficients.push(`Prix énergie ×${model.energyInflationScale}`);
    $("#model-parameters").textContent = coefficients.join(" · ");
    const evidence = $("#model-evidence");
    evidence.replaceChildren(...(model.evidence || []).map((source) => {
      const link = document.createElement("a");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = source.label;
      return link;
    }));
  }

  function updateAssumptionDescription() {
    const items = [
      D.assumptions.cycle[state.cycle],
      D.assumptions.monetary[state.monetary],
      D.assumptions.confidence[state.confidence]
    ];
    $("#assumption-description").textContent = items.map((item) => item.description).join(" ");
  }

  function pushUndo() {
    state.undoStack.push({
      changes: { ...state.changes },
      model: state.model,
      euMode: state.euMode,
      cycle: state.cycle,
      monetary: state.monetary,
      confidence: state.confidence,
      policyStartQuarter: state.policyStartQuarter,
      policyStartQuarters: { ...state.policyStartQuarters },
      structural: { ...state.structural },
      engines: { ...state.engines },
      fiscal: { ...state.fiscal }
    });
    if (state.undoStack.length > 30) state.undoStack.shift();
    $("#undo-button").disabled = false;
  }

  function captureEditSnapshot() {
    if (!state.editSnapshot) {
      state.editSnapshot = {
        changes: { ...state.changes },
        model: state.model,
        euMode: state.euMode,
        cycle: state.cycle,
        monetary: state.monetary,
        confidence: state.confidence,
        policyStartQuarter: state.policyStartQuarter,
        policyStartQuarters: { ...state.policyStartQuarters },
        structural: { ...state.structural },
        engines: { ...state.engines },
        fiscal: { ...state.fiscal }
      };
    }
  }

  function commitEditSnapshot() {
    if (!state.editSnapshot) return;
    state.undoStack.push(state.editSnapshot);
    if (state.undoStack.length > 30) state.undoStack.shift();
    state.editSnapshot = null;
    $("#undo-button").disabled = false;
  }

  function setCategoryChange(id, rawValue, refreshList = false) {
    const category = byId.get(id);
    if (!category || category.locked) return;
    const limits = categoryChangeLimits(category);
    const value = clamp(Number(rawValue) || 0, limits.min, limits.max);
    if (Math.abs(value) < 0.01) {
      delete state.changes[id];
      delete state.policyStartQuarters[id];
    }
    else state.changes[id] = round(value, 1);
    refreshAll(refreshList);
  }

  function applyPreset(id) {
    const preset = D.presets.find((item) => item.id === id);
    if (!preset) return;
    pushUndo();
    state.changes = { ...preset.changes };
    state.policyStartQuarters = {};
    state.model = preset.model;
    clearScenarioLink();
    $("#model-select").value = state.model;
    updateModelDescription();
    refreshAll(true);
    showToast(`Scénario « ${preset.label} » appliqué`);
  }

  function refreshAll(refreshList = false) {
    state.projection = calculateProjection();
    updateSummary();
    updateResults();
    renderChart();
    updateDiagnostics();
    renderModelComparison();
    updateStructuralLab();
    updateEngineRoom();
    updateFiscalPanel();
    if (refreshList) renderCategories();
  }

  function renderFiscalControls() {
    const rows = Object.entries(F.controls).map(([id, control]) => {
      const current = state.fiscal[id];
      if (id === "wealthFloorEnabled") return `<label class="fiscal-field"><span>${control.label}</span>
        <select data-fiscal-control="${id}"><option value="0" ${current === 0 ? "selected" : ""}>Désactivé — droit actuel</option>
          <option value="1" ${current === 1 ? "selected" : ""}>Activé — simulation de proposition</option></select></label>`;
      return `<label class="fiscal-field"><span>${control.label}</span><span class="fiscal-input-wrap">
        <input type="number" min="${control.min}" max="${control.max}" step="${control.step}"
          value="${current}" data-fiscal-control="${id}" /><small>${control.unit}</small></span></label>`;
    });
    $("#fiscal-control-list").innerHTML = rows.join("");
  }

  function updateFiscalPanel() {
    const point = state.projection.scenario[projectionIndex(state.horizon)];
    const fiscal = point.fiscal;
    const byTax = fiscal.deltaByTax;
    $("#fiscal-year").textContent = String(point.year);
    $("#fiscal-total").textContent = `${signed(fiscal.totalBn, " Md€ / an")}`;
    $("#fiscal-breakdown").innerHTML = [
      ["IR", byTax.ir], ["IFI", byTax.ifi], ["Successions", byTax.inheritance],
      ["Impôt plancher proposé", byTax.floor]
    ].map(([label, value]) => `<div><span>${label}</span><strong>${signed(value, " Md€")}</strong></div>`).join("");
    $("#fiscal-groups").innerHTML = fiscal.groups.map((group) => `<tr><th scope="row">${group.label}</th>
      <td>${fmt0.format(group.winners)}</td><td>${fmt0.format(group.losers)}</td>
      <td>${signed(group.averageGainEuro, " €")}</td></tr>`).join("");
    $("#fiscal-wealth-groups").innerHTML = fiscal.wealthGroups.map((group) => `<tr><th scope="row">${group.label}</th>
      <td>${fmt0.format(group.winners)}</td><td>${fmt0.format(group.losers)}</td>
      <td>${signed(group.averageGainEuro, " €")}</td></tr>`).join("");
    const overlap = ["R_IR", "R_OTHERWEALTH", "R_SUCCESSION"].filter((id) =>
      Math.abs(changeFor(id)) > 0.001).length > 0;
    $("#fiscal-warning").textContent = `Échantillon synthétique : 41,5 millions de foyers-types pondérés, mais croisement revenu-patrimoine et successions non observés. L'assiette IR a été ajustée sur 2020–2022 ; le test hors échantillon 2023–2024 surestime encore l'IR net de 7,5 Md€ en moyenne. Les héritiers ne figurent pas dans les gagnants/perdants. Niveaux indicatifs au départ : IR simplifié 98,8 Md€ en règles 2026 contre 94,3 Md€ d'IR net Insee 2025 ; IFI 2,07 contre 2,71 Md€ Insee ; successions 23,88 contre 16,07 Md€ Insee. Les rendements de réformes ne sont pas validés.${overlap ? " Attention : un curseur de recette IR, patrimoine ou successions est aussi modifié ; les deux chocs s'additionnent." : ""}`;
  }

  function updateSummary() {
    const balance = -(state.projection?.scenario?.[0]?.directBalanceCost || 0);
    $("#direct-balance").textContent = `${balance >= 0 ? "+" : "−"}${money(Math.abs(balance))}`;
    $("#direct-balance").style.color = balance > 0 ? "var(--teal)" : balance < 0 ? "var(--coral)" : "";
    const bar = $("#balance-bar");
    const width = Math.min(50, Math.abs(balance) / 1.6);
    bar.style.width = `${width}%`;
    bar.style.left = balance >= 0 ? "50%" : `${50 - width}%`;
    bar.style.background = balance >= 0 ? "var(--teal)" : "var(--coral)";
    $("#balance-caption").textContent = balance > 0
      ? "Amélioration directe du solde avant effets macroéconomiques"
      : balance < 0
        ? "Dégradation directe du solde avant effets macroéconomiques"
        : "Scénario inchangé par rapport à la référence";
    const count = Object.values(state.changes).filter((value) => Math.abs(value) > 0.01).length;
    $("#changed-count").textContent = `${count} poste${count > 1 ? "s" : ""} modifié${count > 1 ? "s" : ""}`;
  }

  function controlText(id, value) {
    const control = D.structural.controls[id];
    const digits = control.step < 1 ? 2 : 0;
    const formatted = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
    return `${formatted}${control.unit}`;
  }

  function boundedControlValue(raw, control) {
    const value = Number(raw);
    if (!Number.isFinite(value)) return control.value;
    const bounded = clamp(value, control.min, control.max);
    return Number((control.min + Math.round((bounded - control.min) / control.step) * control.step).toFixed(4));
  }

  function structuralIdsForTab(tab) {
    return {
      demography: [],
      migration: [],
      employment: ["trainingEntries", "activationPlaces"],
      securityJobs: ["jobsMilitary", "jobsPolice", "jobsGendarmerie", "jobsJudiciary", "jobsPrison", "jobsYouthJustice"],
      serviceJobs: ["jobsEducation", "jobsStateAdmin", "jobsHospital", "jobsFirefighters", "jobsTerritorial", "publicFpeNet", "publicFptNet", "publicFphNet", "publicPermanentShare", "publicCategoryA", "publicCategoryB"],
      energy: ["nuclear", "renewables", "efficiency", "carbonTax"]
    }[tab] || [];
  }

  function structuralControlMarkup(id) {
    const control = D.structural.controls[id];
    return `
      <div class="structural-control">
        <div class="structural-control-heading"><label for="structural-${id}">${control.label}</label><div class="control-value-entry"><output id="output-${id}">${controlText(id, state.structural[id])}</output><input data-structural-number="${id}" type="number" min="${control.min}" max="${control.max}" step="${control.step}" value="${state.structural[id]}" aria-label="Saisir : ${control.label}" /></div></div>
        <input id="structural-${id}" data-structural-control="${id}" type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${state.structural[id]}" />
        <div class="structural-control-scale"><span>${controlText(id, control.min)}</span><span>réf. ${controlText(id, control.value)}</span><span>${controlText(id, control.max)}</span></div>
      </div>`;
  }

  function renderScenarioAssumptions() {
    const groups = [
      ["Démographie", ["fertility", "lifeExpectancy"]],
      ["Migration et insertion", ["economicMigration", "otherMigration", "integration"]],
      ["Marché du travail", ["trainingMatch", "publicHiringCapacity"]],
      ["Prix mondiaux", ["fossilPrice"]]
    ];
    $("#structural-assumption-list").innerHTML = groups.map(([title, ids]) => `
      <div class="structural-assumption-group"><h4>${title}</h4>${ids.map(structuralControlMarkup).join("")}</div>
    `).join("");
  }

  function updateDerivedPanel() {
    if (!state.projection) return;
    const index = projectionIndex(state.horizon);
    const structure = state.projection.scenario[index].structural;
    if (state.activeStructuralTab === "demography") {
      $("#derived-fertility").textContent = `${fmt2.format(structure.effectiveFertility)} enfant/femme`;
      $("#derived-births").textContent = `${fmt0.format(structure.births)} k/an`;
      $("#derived-population").textContent = `${fmt1.format(structure.population)} M`;
    } else if (state.activeStructuralTab === "migration") {
      $("#derived-migration-flow").textContent = `${fmt0.format(state.structural.economicMigration + state.structural.otherMigration)} k/an`;
      $("#derived-migration-revenue").textContent = money(structure.migrationRevenue);
      $("#derived-migration-cost").textContent = money(structure.migrationCost);
    }
  }

  function renderStructuralControls() {
    const ids = structuralIdsForTab(state.activeStructuralTab);
    const derived = {
      demography: `<div class="derived-panel"><strong>La démographie est un résultat</strong><p>Les naissances évoluent avec les hypothèses et, de façon exploratoire, avec les places de garde. La politique ne fixe pas un nombre d’enfants par femme.</p><dl><dt>Fécondité simulée</dt><dd id="derived-fertility">—</dd><dt>Naissances annuelles</dt><dd id="derived-births">—</dd><dt>Population</dt><dd id="derived-population">—</dd></dl><button class="button button-ghost" type="button" data-open-engine="education">Agir sur les places de garde →</button></div>`,
      migration: `<div class="derived-panel"><strong>Flux retenus et effets estimés</strong><p>Le solde migratoire est une hypothèse de scénario, pas un volume que l’État choisit exactement. Les recettes et coûts ci-dessous sont simulés.</p><dl><dt>Solde retenu · hypothèse</dt><dd id="derived-migration-flow">—</dd><dt>Recettes des cohortes</dt><dd id="derived-migration-revenue">—</dd><dt>Services et intégration</dt><dd id="derived-migration-cost">—</dd></dl><button class="button button-ghost" type="button" data-open-assumptions>Tester les flux en hypothèse →</button></div>`
    };
    $("#structural-control-list").innerHTML = ids.length ? ids.map(structuralControlMarkup).join("") : derived[state.activeStructuralTab] || "";
    const notes = {
      demography: "Fécondité et espérance de vie de référence : volet « Hypothèses de contexte ». Les places de garde peuvent modifier la natalité après un délai ; le coefficient est illustratif et non validé. Les enfants supplémentaires ne rejoignent l’emploi qu’après 18 ans.",
      migration: "Les soldes et le taux d’emploi après intégration sont des hypothèses avancées. « Autres motifs » regroupe famille, études et humanitaire ; les coûts et recettes simulés ne sont pas une valeur attribuée aux personnes.",
      employment: "Les entrées en formation et places d’accompagnement sont des décisions. Le taux de retour à l’emploi est une hypothèse avancée. Les viviers BIT, France Travail, halo et sous-emploi se recouvrent et ne sont pas additionnés.",
      securityJobs: "Armées, police, gendarmerie, juridictions, pénitentiaire et justice des mineurs ont chacun un coût, une durée de carrière et un taux de maintien propres. Une valeur négative représente des recrutements ou remplacements évités, jamais un licenciement automatique. Les réservistes sont exclus des emplois permanents.",
      serviceJobs: "Chaque réglage est un flux annuel supplémentaire suivi par cohorte. Les flux génériques et les métiers détaillés s’additionnent : évitez de saisir deux fois le même recrutement. La capacité de recrutement reste une hypothèse avancée ; les pensions et rémunérations sont suivies séparément.",
      energy: "Capacités et taxe carbone sont des choix de scénario. Le prix mondial des fossiles est une hypothèse avancée, non une décision française. Les plafonds simplifiés ne remplacent pas un modèle de réseau et de production."
    };
    $("#structural-disclaimer").textContent = notes[state.activeStructuralTab];
    renderScenarioAssumptions();
    updateDerivedPanel();
  }

  function updateStructuralLab() {
    const index = projectionIndex(state.horizon);
    const point = state.projection.scenario[index];
    const structure = point.structural;
    updateDerivedPanel();
    const baseline = state.projection.baseline[index];
    const popDelta = structure.population - structure.baselinePopulation;
    const birthDelta = structure.births - structure.baselineBirths;
    const gdpDelta = point.gdp - baseline.gdp;
    const unchanged = Object.entries(D.structural.controls).every(([id, control]) => Math.abs(state.structural[id] - control.value) < 0.001)
      && Object.entries(D.policyEngines.controls).every(([id, control]) => Math.abs(state.engines[id] - control.value) < 0.001)
      && Object.entries(F.defaults).every(([id, value]) => state.fiscal[id] === value);

    $("#story-horizon").textContent = `à ${state.horizon} an${state.horizon > 1 ? "s" : ""}`;
    $("#story-lead").textContent = unchanged && !Object.keys(state.changes).length && state.euMode === "current"
      ? "Vous êtes sur la trajectoire de référence : la population progresse encore grâce au solde migratoire, tandis que le vieillissement pèse progressivement sur la population active."
      : `À cet horizon, votre scénario porte le PIB à ${money(point.gdp)} (${signed(gdpDelta, " Md€")} face à la référence) et modifie le solde public direct de ${signed(-point.directBalanceCost, " Md€/an")} : dépenses ${signed(point.spendingChange, " Md€")}, recettes ${signed(point.revenueChange, " Md€")}.`;

    const populationText = Math.abs(birthDelta) < 1
      ? `La natalité reste proche de la référence. La population atteint ${fmt1.format(structure.population)} millions.`
      : `${signed(birthDelta, " k")} naissances par an par rapport à la référence ; la population atteint ${fmt1.format(structure.population)} millions (${signed(popDelta, " M")}). Les services liés aux âges changent de ${signed(structure.demographyFiscalCost, " Md€/an")}.`;
    const migrationText = `Les arrivées simulées génèrent ${money(structure.migrationRevenue)} de prélèvements et ${money(structure.migrationCost)} de services et d’intégration. Les sorties éventuelles réduisent recettes et dépenses ; le solde net des flux est ${signed(structure.migrationNet, " Md€")}.`;
    const publicText = Math.abs(structure.publicEmploymentDelta) < 0.1
      ? "Les effectifs publics suivent la référence : les départs et recrutements ordinaires sont implicitement remplacés."
      : `${signed(structure.publicEmploymentDelta, " k")} agents présents par rapport à la référence : ${signed(structure.publicMilitaryDelta, " k")} militaires, ${signed(structure.publicPermanentDelta, " k")} titulaires civils et ${signed(structure.publicContractDelta, " k")} contractuels. Rémunérations ${signed(structure.publicPayrollCost, " Md€")}/an, pensions ${signed(structure.publicPensionCost, " Md€")}/an et cotisations internes en recettes ${signed(structure.publicPensionContributionRevenue, " Md€")}/an.${structure.publicHiringRate < 0.999 ? ` Recrutements réalisés : ${fmt0.format(structure.publicHiringRate * 100)} % des demandes.` : ""}`;
    const energyDirection = structure.importBillChange > 0.05 ? "alourdit" : structure.importBillChange < -0.05 ? "allège" : "laisse presque inchangée";
    const energyText = `Le scénario ${energyDirection} la facture énergétique de ${money(Math.abs(structure.importBillChange))} et modifie les émissions de ${signed(structure.emissionsChange, " MtCO₂e")}.`;
    $("#story-reasons").innerHTML = `
      <div class="story-reason"><i>POP</i><div><strong>Population et âges</strong><span>${populationText}</span></div></div>
      <div class="story-reason"><i>PUB</i><div><strong>Fonction publique par cohorte</strong><span>${publicText}</span></div></div>
      <div class="story-reason"><i>EMP</i><div><strong>Emploi, formation et migration</strong><span>${migrationText} Le vivier permet de réaliser ${fmt0.format(point.labor.realizationRate * 100)} % des créations d’emploi privées simulées.</span></div></div>
      <div class="story-reason"><i>ENE</i><div><strong>Énergie, prix et importations</strong><span>${energyText}</span></div></div>`;
    $("#story-caveat").textContent = "Les viviers BIT, France Travail, halo, sous-emploi et formation se recouvrent. Compétences et localisation limitent les recrutements. Le lien exploratoire entre places de garde et fécondité n’est pas un coefficient causal validé ; chômage et natalité restent sensibles à d’autres facteurs non modélisés.";

    const outcomes = [
      ["Population", `${fmt1.format(structure.population)} M`, `${signed(popDelta, " M")} vs réf.`],
      ["Naissances", `${fmt0.format(structure.births)} k/an`, `${signed(birthDelta, " k")} vs réf.`],
      ["Chômage", percent(point.unemployment), `${signed(point.unemployment - baseline.unemployment, " pt")} vs réf.`],
      ["Agents publics", signed(structure.publicEmploymentDelta, " k"), "écart vs référence"],
      ["Coût public net annuel", signed(structure.publicPayrollCost + structure.publicPensionCost - structure.publicPensionContributionRevenue, " Md€"), "après cotisations internes"],
      ["Emploi net mobilisé", signed(point.labor.netEmployment, " k"), `${fmt0.format(point.labor.realizationRate * 100)} % réalisé`],
      ["Facture énergétique", signed(structure.importBillChange, " Md€"), "variation vs réf."],
      ["Émissions", signed(structure.emissionsChange, " Mt"), "CO₂e vs réf."]
    ];
    $("#structural-outcomes").innerHTML = outcomes.map(([label, value, note]) => `<div class="structural-outcome"><small>${label}</small><strong>${value}</strong><span>${note}</span></div>`).join("");

    const workforce = D.structural.workforce;
    const classFor = (value) => value > 0.01 ? "positive" : value < -0.01 ? "negative" : "";
    const publicRows = Object.entries(workforce.publicService).map(([key, item]) => {
      const delta = structure.publicByVersant[key];
      return `<div class="workforce-row"><span><strong>${item.short} · ${item.label}</strong><small>${fmt1.format(item.headcount / 1000)} M observés · coût calibré ${fmt0.format(item.employerCost * 1000)} k€/emploi</small></span><strong class="${classFor(delta)}">${signed(delta, " k")}</strong></div>`;
    }).join("");
    const missionRows = Object.entries(workforce.publicOccupations).map(([key, item]) => {
      const delta = structure.publicMissionById[key];
      const adjustedShare = clamp(item.permanentShare + (state.structural.publicPermanentShare - D.structural.controls.publicPermanentShare.value) / 100, 0, 1);
      const status = item.military ? "statut militaire" : `${fmt0.format(adjustedShare * 100)} % de titulaires dans les flux`;
      const career = Math.max(1, Math.round(item.careerYears + (item.military ? 0 : Number(state.engines.retirementAge || 0))));
      return `<div class="workforce-row"><span><strong>${item.short} · ${item.label}</strong><small>${fmt1.format(item.baseline)} k de référence · ${status} · carrière ${career} ans · retraités supplémentaires ${signed(structure.publicRetiredByMission[key], " k")}</small></span><strong class="${classFor(delta)}">${signed(delta, " k")}</strong></div>`;
    }).join("");
    const employmentRows = workforce.employmentTypes.map((item) => `<div class="workforce-row"><span><strong>${item.label}</strong><small>${item.note}</small></span><strong>${fmt1.format(item.value)} M</strong></div>`).join("");
    const categoryRows = [
      ["Catégorie A · conception/direction", structure.publicCategoryMix.a],
      ["Catégorie B · application", structure.publicCategoryMix.b],
      ["Catégorie C · exécution", structure.publicCategoryMix.c]
    ].map(([label, share]) => `<div class="workforce-row"><span><strong>${label}</strong><small>composition des nouveaux flux</small></span><strong>${fmt0.format(share * 100)} %</strong></div>`).join("");
    const pools = workforce.pools;
    const allocationRows = [
      ["Chômage BIT", `${fmt1.format(pools.unemployedBIT / 1000)} M`, `dont ${fmt0.format(point.labor.fromUnemployment)} k mobilisés`],
      ["Halo autour du chômage", `${fmt1.format(pools.halo / 1000)} M`, `dont ${fmt0.format(point.labor.fromHalo)} k mobilisés`],
      ["Sous-emploi", `${fmt1.format(pools.underemployment / 1000)} M`, `dont ${fmt0.format(point.labor.fromUnderemployment)} k mobilisés`],
      ["Formation · catégorie D", `${fmt0.format(pools.franceTravailTraining)} k`, `${fmt0.format(point.labor.fromTraining)} k vers l’emploi`],
      ["Mobilités emploi-emploi", `${fmt0.format(point.labor.jobToJob)} k`, "ne réduisent pas directement le chômage"],
      ["Emploi issu des migrations", `${fmt0.format(point.labor.fromMigration)} k`, "part des cohortes employées"]
    ].map(([label, value, note]) => `<div class="workforce-row"><span><strong>${label}</strong><small>${note}</small></span><strong>${value}</strong></div>`).join("");
    $("#workforce-detail").innerHTML = `
      <article class="workforce-panel workforce-panel-wide"><h3>Armées, sécurité, justice et services publics</h3><p>Effectifs de référence en milliers, provenant de millésimes 2024–2026 et de soldes recalés. À droite : écart d’agents en activité au ${point.year}. Recrutements réalisables cette année : ${fmt1.format(structure.realizedPublicHiring)} k sur ${fmt1.format(structure.requestedPublicHiring)} k demandés. Réservistes et pompiers volontaires ne sont pas assimilés à des emplois permanents.</p><div class="public-mission-grid">${missionRows}</div><div class="public-summary-grid"><div>${publicRows}</div><div>${categoryRows}<div class="workforce-row"><span><strong>Militaires</strong><small>armées et gendarmerie, hors titulaires civils</small></span><strong class="${classFor(structure.publicMilitaryDelta)}">${signed(structure.publicMilitaryDelta, " k")}</strong></div></div><div class="workforce-commitment"><small>Engagement actualisé à 40 ans</small><strong>${signed(structure.lifetimeCommitment, " Md€")}</strong><span>Rémunérations et pensions futures des cohortes ajoutées ou évitées. Cette année : pensions ${signed(structure.publicPensionCost, " Md€")}, cotisations internes en recettes ${signed(structure.publicPensionContributionRevenue, " Md€")}.</span></div></div></article>
      <article class="workforce-panel"><h3>Types d’emploi</h3><p>Photographie 2025 reconstituée. Les catégories publiques sont séparées des contrats privés.</p>${employmentRows}</article>
      <article class="workforce-panel"><h3>Viviers et transitions</h3><p>Les sources ne sont pas additives : le modèle applique des taux de disponibilité et d’appariement.</p>${allocationRows}</article>`;
  }

  function engineControlText(id, value) {
    const control = D.policyEngines.controls[id];
    const digits = control.step < 1 ? 1 : 0;
    return `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)}${control.unit}`;
  }

  function renderEngineSelector() {
    $("#engine-selector").innerHTML = D.policyEngines.groups.map((group) => `
      <button class="engine-tab ${group.id === state.activeEngine ? "is-active" : ""}" data-engine-tab="${group.id}" role="tab" aria-selected="${group.id === state.activeEngine}">
        <i>${group.icon}</i><span><strong>${group.label}</strong><small>${group.description}</small></span>
      </button>`).join("");
  }

  function renderEngineControls() {
    const group = D.policyEngines.groups.find((item) => item.id === state.activeEngine);
    const controls = Object.entries(D.policyEngines.controls).filter(([, control]) => control.group === state.activeEngine);
    $("#engine-kicker").textContent = `Moteur ${group.icon}`;
    $("#engine-active-title").textContent = group.label;
    $("#engine-description").textContent = `${group.description} Les résultats visés mais non directement pilotables sont séparés ci-dessous.`;
    const controlMarkup = ([id, control]) => `
      <div class="engine-control">
        <div class="engine-control-head"><label for="engine-${id}">${control.label}</label><div class="control-value-entry"><output id="engine-output-${id}">${engineControlText(id, state.engines[id])}</output><input data-engine-number="${id}" type="number" min="${control.min}" max="${control.max}" step="${control.step}" value="${state.engines[id]}" aria-label="Saisir : ${control.label}" /></div></div>
        <input id="engine-${id}" data-engine-control="${id}" type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${state.engines[id]}" />
        <div class="engine-control-scale"><span>${engineControlText(id, control.min)}</span><span>réf. ${engineControlText(id, control.value)}</span><span>${engineControlText(id, control.max)}</span></div>
      </div>`;
    const measures = controls.filter(([, control]) => control.kind !== "assumption");
    const assumptions = controls.filter(([, control]) => control.kind === "assumption");
    $("#engine-control-list").innerHTML = measures.map(controlMarkup).join("")
      + (assumptions.length ? `<details class="engine-assumptions"><summary>Hypothèses de réalisation <small>Avancé · résultats non garantis</small></summary><p>Ces valeurs décrivent un résultat possible des politiques et du contexte ; elles ne sont pas des décisions immédiatement exécutables.</p>${assumptions.map(controlMarkup).join("")}</details>` : "");
  }

  function updateEngineRoom() {
    const index = projectionIndex(state.horizon);
    const point = state.projection.scenario[index];
    const engine = point.engines;
    const active = Object.entries(D.policyEngines.controls).filter(([id, control]) => Math.abs(state.engines[id] - control.value) > 0.0001);
    const selectedIds = Object.entries(D.policyEngines.controls).filter(([, control]) => control.group === state.activeEngine).map(([id]) => id);
    const selected = selectedIds.map((id) => engine.contributions[id]).filter(Boolean);
    const selectedFiscal = selected.reduce((sum, item) => sum + item.fiscalCost, 0);
    const selectedGdp = selected.reduce((sum, item) => sum + item.gdpImpact, 0);
    const group = D.policyEngines.groups.find((item) => item.id === state.activeEngine);
    $("#engine-active-count").textContent = `${active.length} réglage${active.length > 1 ? "s" : ""} actif${active.length > 1 ? "s" : ""}`;
    $("#engine-story-title").textContent = active.length
      ? `${group.label} : les effets directs et les retours se séparent.`
      : "Le budget seul ne raconte pas toute l’histoire.";
    $("#engine-story-lead").textContent = selected.length
      ? `À ${state.horizon} an${state.horizon > 1 ? "s" : ""}, le moteur ${group.label.toLowerCase()} modifie directement le solde de ${signed(-selectedFiscal, " Md€/an")} et le niveau du PIB d’environ ${signed(selectedGdp, " Md€")}. Les autres moteurs actifs continuent d’agir en parallèle.`
      : active.length
        ? `Aucun réglage n’est actif dans ${group.label.toLowerCase()}, mais ${active.length} levier${active.length > 1 ? "s agissent" : " agit"} ailleurs dans le modèle.`
        : "Activez une mesure ou une hypothèse de réalisation pour distinguer coût, activité et effets différés.";

    const ranked = active.map(([id, control]) => ({ id, control, impact: engine.contributions[id] }))
      .filter((item) => item.impact)
      .sort((a, b) => (Math.abs(b.impact.gdpImpact) + Math.abs(b.impact.fiscalCost) * 0.4) - (Math.abs(a.impact.gdpImpact) + Math.abs(a.impact.fiscalCost) * 0.4))
      .slice(0, 4);
    $("#engine-mechanisms").innerHTML = ranked.length ? ranked.map(({ id, control, impact }) => {
      const meta = D.policyEngines.groups.find((item) => item.id === control.group);
      return `<div class="engine-mechanism"><i>${meta.icon}</i><div><strong>${control.label}</strong><span>Demande ${signed(impact.demand, " Md€")} · offre ${signed(impact.supply, " Md€")} · budget ${signed(-impact.fiscalCost, " Md€")}</span></div><b>PIB ${signed(impact.gdpImpact, " Md€")}</b></div>`;
    }).join("") : `<div class="engine-mechanism"><i>↗</i><div><strong>Chaînes causales prêtes</strong><span>Les résultats apparaîtront ici, classés par importance.</span></div><b>référence</b></div>`;

    let alert = "Le résultat central ne valorise pas directement la qualité du service public, la sécurité, le bien-être ou les pertes évitées : ces dimensions restent à lire avec les indicateurs physiques et l’incertitude.";
    const overlappingCategories = {
      prevention: ["GF07"], careEfficiency: ["GF07"], teacherResources: ["GF09"], vocationalTraining: ["GF09"],
      housingBuild: ["GF06"], socialHousing: ["GF06"], defenseCapacity: ["GF02"], publicSafety: ["GF03"],
      adaptation: ["GF05"], publicResearch: ["GF01", "GF09"], transportInfrastructure: ["GF04"],
      targetedTransfers: ["GF10"]
    };
    const overlap = active.filter(([id]) => (overlappingCategories[id] || []).some((prefix) =>
      Object.entries(state.changes).some(([categoryId, delta]) => categoryId.startsWith(prefix) && Math.abs(delta) > 0.001)));
    if (state.engines.tradeProtection > 0 && !["breach", "euroExit"].includes(state.euMode)) {
      alert = "Alerte UE : une protection commerciale nationale est incompatible avec la politique commerciale commune. Le modèle ajoute contentieux, représailles et incertitude tant que le cadre européen n’est pas renégocié ou rompu.";
    } else if (state.engines.publicGuarantees > 0) {
      alert = "Les garanties ne sont pas une dépense immédiate complète : le modèle comptabilise une perte attendue. En crise, l’appel de garantie peut toutefois transformer rapidement l’exposition en dette publique.";
    } else if (overlap.length) {
      alert = `Risque de double comptage : ${overlap.map(([, control]) => control.label).join(", ")} et des postes budgétaires proches sont modifiés ensemble. Les montants s’additionnent ; si le poste finance déjà ce levier, retirez l’un des deux réglages.`;
    } else if (active.length >= 8) {
      alert = "De nombreux moteurs sont activés simultanément : contraintes de main-d’œuvre, capacités administratives et risques de double comptage élargissent fortement la plage d’incertitude.";
    }
    $("#engine-alert").textContent = alert;

    const outcomes = [
      ["Solde public direct", signed(-engine.fiscalCost, " Md€"), "par an"],
      ["Niveau du PIB", signed(engine.gdpImpact, " Md€"), `en ${point.year}`],
      ["Emploi", signed(engine.jobs, " k"), "effet modélisé"],
      ["Inflation", signed(engine.inflation, " pt"), "écart annuel"],
      ["Solde extérieur", signed(engine.trade, " Md€"), "écart annuel"],
      ["Émissions", signed(engine.emissions, " Mt"), "CO₂e par an"],
      ["Pauvreté", percent(15.4 + engine.poverty), `${signed(engine.poverty, " pt")} vs 2024`]
    ];
    $("#engine-outcomes").innerHTML = outcomes.map(([label, value, note]) => `<div class="engine-outcome"><small>${label}</small><strong>${value}</strong><span>${note}</span></div>`).join("");
  }

  function updateMetricDelta(element, value, inverse = false, suffix = "") {
    element.textContent = `${signed(value, suffix)} vs référence`;
    element.classList.remove("good", "bad");
    if (Math.abs(value) < 0.03) return;
    const good = inverse ? value < 0 : value > 0;
    element.classList.add(good ? "good" : "bad");
  }

  function updateResults() {
    const index = projectionIndex(state.horizon);
    const item = state.projection.scenario[index];
    const baseline = state.projection.baseline[index];
    const longRunNote = $("#long-run-note");
    longRunNote.hidden = state.horizon <= 10;
    longRunNote.textContent = state.horizon > 10
      ? `Horizon structurel ${item.year} : ce n’est plus une prévision conjoncturelle. La fourchette et les hypothèses démographiques dominent le chiffre central.`
      : "";
    $("#metric-deficit").textContent = percent(-item.deficitRatio);
    updateMetricDelta($("#delta-deficit"), -(item.deficitRatio - baseline.deficitRatio), false, " pt");
    $("#sub-deficit").textContent = `${money(-item.deficit)} en ${item.year}`;
    $("#metric-debt").textContent = percent(item.debtRatio);
    updateMetricDelta($("#delta-debt"), item.debtRatio - baseline.debtRatio, true, " pt");
    $("#sub-debt").textContent = `${money(item.debt)} en ${item.year}`;
    $("#metric-growth").textContent = percent(item.growth);
    updateMetricDelta($("#delta-growth"), item.growth - baseline.growth, false, " pt");
    $("#sub-growth").textContent = `PIB ${money(item.gdp)} · inflation ${percent(item.inflation)}`;
    $("#metric-unemployment").textContent = percent(item.unemployment);
    updateMetricDelta($("#delta-unemployment"), item.unemployment - baseline.unemployment, true, " pt");
    $("#sub-unemployment").textContent = `Estimation annuelle ${item.year}`;
    updatePlainSummary(item, baseline);
    updateSocialLab(item.social);
    $("#journey-status").textContent = `${state.name || "Mon scénario"} · ${state.horizon} an${state.horizon > 1 ? "s" : ""}`;
    renderSavedComparison();
  }

  function updateSocialLab(social) {
    $("#social-discomfort").textContent = `${signed(social.meanDiscomfort, " pt")}`;
    const top = social.highestPressure;
    $("#social-pressure").textContent = top?.pressure > 0.05 ? `${top.ageLabel} · ${top.situationLabel}` : "Pas de hausse détectée";
    $("#social-pressure-detail").textContent = top?.pressure > 0.05
      ? `Pression indicative ${fmt1.format(top.pressure)} / 20 ; elle suppose une coordination qui n'est pas modélisée.`
      : "Aucun surcroît de pression dans ce scénario par rapport à la référence.";
    const bounds = [...social.incumbentVoteSensitivity].sort((a, b) => a - b);
    $("#social-vote").textContent = Math.abs(social.meanDiscomfort) < 0.05
      ? "Aucun écart modélisé"
      : `${signed(bounds[0], " pt")} à ${signed(bounds[1], " pt")}`;
    $("#social-matrix-head").innerHTML = `<tr><th scope="col">Âge</th>${D.social.situations.map((group) => `<th scope="col">${escapeHtml(group.label)}</th>`).join("")}</tr>`;
    $("#social-matrix-body").innerHTML = D.social.ages.map((age) => `<tr><th scope="row">${escapeHtml(age.label)}</th>${D.social.situations.map((group) => {
      const cell = social.cells.find((item) => item.age === age.id && item.situation === group.id);
      return cell ? `<td class="${cell.discomfort > 0.05 ? "social-risk" : cell.discomfort < -0.05 ? "social-relief" : ""}" title="Pression de mobilisation ${fmt1.format(cell.pressure)} sur 20">${signed(cell.discomfort, " pt")}</td>` : `<td aria-label="hors champ">—</td>`;
    }).join("")}</tr>`).join("");
  }

  function updatePlainSummary(item, baseline) {
    const deficitDelta = item.deficitRatio - baseline.deficitRatio;
    const debtDelta = item.debtRatio - baseline.debtRatio;
    const growthDelta = item.growth - baseline.growth;
    const unemploymentDelta = item.unemployment - baseline.unemployment;
    const fiscal = item.directBalanceCost;
    const demand = item.demandContribution;
    const supply = item.supplyContribution;
    const isReference = Math.abs(deficitDelta) < 0.03 && Math.abs(growthDelta) < 0.03 && Math.abs(debtDelta) < 0.05;
    const delayedQuarters = [...new Set(Object.entries(state.changes)
      .filter(([, value]) => Math.abs(Number(value)) > 0.01)
      .map(([id]) => categoryStartQuarter(id))
      .filter((quarter) => quarter > 1))].sort();
    const calendarNote = delayedQuarters.length
      ? ` Certaines mesures budgétaires débutent au ${delayedQuarters.map((quarter) => `T${quarter}`).join(" ou au ")} : seule leur période d'application en 2026 est comptée.`
      : "";

    if (isReference) {
      $("#plain-summary-title").textContent = "Votre scénario suit la trajectoire de référence.";
      $("#plain-summary-text").textContent = `À ${state.horizon} an${state.horizon > 1 ? "s" : ""}, aucune modification ne déplace sensiblement le déficit, la dette ou l’activité. Choisissez un préréglage ou modifiez un levier pour comparer.${calendarNote}`;
      return;
    }

    const budgetPhrase = deficitDelta < -0.15
      ? "le déficit public se réduit"
      : deficitDelta > 0.15
        ? "le déficit public augmente"
        : "le déficit reste proche de la référence";
    const activityPhrase = growthDelta > 0.12
      ? "l’activité accélère"
      : growthDelta < -0.12
        ? "l’activité ralentit"
        : "la croissance annuelle change peu";
    $("#plain-summary-title").textContent = `${budgetPhrase[0].toUpperCase()}${budgetPhrase.slice(1)} et ${activityPhrase}.`;

    const reasons = [];
    if (Math.abs(fiscal) > 2) reasons.push(fiscal > 0
      ? `les mesures coûtent directement environ ${money(fiscal)} par an avant retours économiques`
      : `les économies et recettes améliorent directement le solde d’environ ${money(-fiscal)} par an`);
    if (Math.abs(supply) > Math.abs(demand) * 0.65 && Math.abs(supply) > 2) reasons.push("les effets sur l’offre, le travail et la productivité deviennent déterminants");
    else if (Math.abs(demand) > 2) reasons.push("la demande intérieure explique l’essentiel de l’écart d’activité");
    if (Math.abs(unemploymentDelta) > 0.1) reasons.push(`le chômage est simulé ${unemploymentDelta < 0 ? "plus bas" : "plus haut"} de ${fmt1.format(Math.abs(unemploymentDelta))} point`);
    if (Math.abs(item.extraInterest) > 2) reasons.push("la charge d’intérêts amplifie progressivement le résultat");
    if (!reasons.length) reasons.push("plusieurs effets de faible ampleur se compensent");
    const caveat = state.horizon > 10 ? " À cet horizon, retenez surtout la direction et la fourchette, pas la décimale." : "";
    $("#plain-summary-text").textContent = `Pourquoi : ${reasons.slice(0, 3).join(" ; ")}.${calendarNote}${caveat}`;
  }

  function metricConfig(metric) {
    const configs = {
      deficitRatio: { label: "Solde public", unit: "% du PIB", invert: true, format: (v) => `${fmt1.format(-v)} %` },
      debtRatio: { label: "Dette publique", unit: "% du PIB", invert: false, format: (v) => `${fmt1.format(v)} %` },
      gdp: { label: "PIB nominal", unit: "Md€", invert: false, format: (v) => `${fmt0.format(v)} Md€` },
      unemployment: { label: "Taux de chômage", unit: "%", invert: false, format: (v) => `${fmt1.format(v)} %` }
    };
    return configs[metric];
  }

  function renderChart() {
    const metric = state.chartMetric;
    const config = metricConfig(metric);
    const scenario = state.projection.scenario;
    const baseline = state.projection.baseline;
    const width = 820;
    const height = 260;
    const padding = { top: 18, right: 20, bottom: 32, left: 54 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const lastIndex = scenario.length - 1;
    const values = scenario.flatMap((item, index) => [
      item[metric] - (item.bands[metric] || 0),
      item[metric] + (item.bands[metric] || 0),
      baseline[index][metric]
    ]);
    if (metric === "deficitRatio") values.push(3);
    let min = Math.min(...values);
    let max = Math.max(...values);
    const margin = Math.max((max - min) * 0.13, metric === "gdp" ? 40 : 0.4);
    min -= margin;
    max += margin;
    const x = (index) => padding.left + index * (plotWidth / Math.max(1, lastIndex));
    const y = (value) => padding.top + (max - value) / (max - min || 1) * plotHeight;
    const path = (items, getter) => items.map((item, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(getter(item, index)).toFixed(1)}`).join(" ");
    const top = scenario.map((item, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(item[metric] + (item.bands[metric] || 0)).toFixed(1)}`).join(" ");
    const bottom = [...scenario].reverse().map((item, reverseIndex) => {
      const index = lastIndex - reverseIndex;
      return `L${x(index).toFixed(1)},${y(item[metric] - (item.bands[metric] || 0)).toFixed(1)}`;
    }).join(" ");
    const ticks = Array.from({ length: 5 }, (_, index) => min + index * (max - min) / 4);
    const grid = ticks.map((tick) => `
      <line class="chart-grid" x1="${padding.left}" y1="${y(tick)}" x2="${width - padding.right}" y2="${y(tick)}" />
      <text class="chart-axis-label" x="${padding.left - 9}" y="${y(tick) + 3}" text-anchor="end">${metric === "gdp" ? fmt0.format(tick) : fmt1.format(metric === "deficitRatio" ? -tick : tick)}</text>
    `).join("");
    const years = scenario.map((item, index) => index % 5 === 0 || index === lastIndex ? `<text class="chart-axis-label" x="${x(index)}" y="${height - 8}" text-anchor="middle">${item.year}</text>` : "").join("");
    const ruleLine = metric === "deficitRatio" && 3 >= min && 3 <= max
      ? `<line class="chart-zero" x1="${padding.left}" y1="${y(3)}" x2="${width - padding.right}" y2="${y(3)}" /><text class="chart-axis-label" x="${width - padding.right}" y="${y(3) - 5}" text-anchor="end">seuil −3 %</text>`
      : "";
    const points = scenario.map((item, index) => `<circle class="chart-point" data-point="${index}" cx="${x(index)}" cy="${y(item[metric])}" r="3.5" tabindex="0"><title>${item.year} · ${config.format(item[metric])}</title></circle>`).join("");

    $("#chart-wrap").innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${config.label}, scénario comparé à la référence de 2026 à ${D.metadata.projectionEnd}">
        ${grid}${ruleLine}
        <path class="chart-band" d="${top} ${bottom} Z" />
        <path class="chart-baseline" d="${path(baseline, (item) => item[metric])}" />
        <path class="chart-scenario" d="${path(scenario, (item) => item[metric])}" />
        ${points}${years}
      </svg>
      <div class="chart-tooltip"></div>
    `;
    $("#chart-caption").textContent = `${config.label} · ${config.unit}. Bande exploratoire : sensibilité du modèle${metric === "growth" ? "; pas de plancher historique propre à la croissance annuelle." : " et plancher d'erreur historique d'un prévisionniste témoin ; au-delà de 10 ans, extrapolation non validée."}`;
    $("#chart-data-caption").textContent = `${config.label} : points de repère du scénario et de la référence`;
    $("#chart-data-body").replaceChildren(...[1, 3, 5, 10, 20, 30].map((horizon) => {
      const index = horizon - 1;
      const point = scenario[index];
      const reference = baseline[index];
      const difference = (metric === "deficitRatio" ? -1 : 1) * (point[metric] - reference[metric]);
      const unit = metric === "gdp" ? " Md€" : " pt";
      const row = document.createElement("tr");
      const cells = [String(point.year), config.format(point[metric]), config.format(reference[metric]),
        `${difference > 0 ? "+" : difference < 0 ? "−" : ""}${fmt1.format(Math.abs(difference))}${unit}`,
        `±${fmt1.format(point.bands[metric] || 0)}${unit}`];
      cells.forEach((value, position) => {
        const cell = document.createElement(position === 0 ? "th" : "td");
        if (position === 0) cell.scope = "row";
        cell.textContent = value;
        row.append(cell);
      });
      return row;
    }));

    const tooltip = $(".chart-tooltip", $("#chart-wrap"));
    $$(".chart-point", $("#chart-wrap")).forEach((point) => {
      const show = () => {
        const index = Number(point.dataset.point);
        tooltip.textContent = `${scenario[index].year} · ${config.format(scenario[index][metric])} (réf. ${config.format(baseline[index][metric])})`;
        tooltip.style.left = `${Number(point.getAttribute("cx")) / width * 100}%`;
        tooltip.style.top = `${Number(point.getAttribute("cy")) / height * 100}%`;
        tooltip.style.opacity = 1;
      };
      point.addEventListener("mouseenter", show);
      point.addEventListener("focus", show);
      point.addEventListener("mouseleave", () => { tooltip.style.opacity = 0; });
      point.addEventListener("blur", () => { tooltip.style.opacity = 0; });
    });
  }

  function updateDiagnostics() {
    const point2029 = state.projection.scenario[3];
    const point2035 = state.projection.scenario[9];
    const point2055 = state.projection.scenario[29];
    const euStatus = $("#eu-status");
    const euDetail = $("#eu-detail");
    if (["breach", "euroExit"].includes(state.euMode)) {
      euStatus.textContent = state.euMode === "euroExit" ? "Rupture majeure simulée" : "Contentieux probable";
      euDetail.textContent = D.euModes[state.euMode].description;
    } else if (point2029.deficitRatio <= 3) {
      euStatus.textContent = "Seuil de déficit respecté";
      euDetail.textContent = `Déficit simulé à ${percent(point2029.deficitRatio)} en 2029. La trajectoire européenne de dépenses nettes n’est pas évaluée : la conformité complète reste indéterminée.`;
    } else {
      euStatus.textContent = "Objectif 2029 non atteint";
      euDetail.textContent = `Écart de ${fmt1.format(point2029.deficitRatio - 3)} point(s) au seuil de 3 % en 2029. La trajectoire de dépenses nettes n’est pas évaluée.`;
    }

    const selectedDebtBand = state.projection.scenario[projectionIndex(state.horizon)].bands.debtRatio;
    $("#risk-status").textContent = selectedDebtBand < 8 ? "Déjà notable" : selectedDebtBand < 20 ? "Large" : "Très large";
    $("#risk-detail").textContent = `Dette centrale : ${percent(point2035.debtRatio)} à 10 ans, ${percent(point2055.debtRatio)} à 30 ans ; plage exploratoire à 30 ans ±${fmt1.format(point2055.bands.debtRatio)} points, extrapolée sans validation historique.`;

    const point = state.projection.scenario[2];
    const demand = Math.abs(point.demandContribution);
    const supply = Math.abs(point.supplyContribution);
    const interest = Math.abs(point.extraInterest);
    const structureUnchanged = Object.entries(D.structural.controls).every(([id, control]) => Math.abs(state.structural[id] - control.value) < 0.001);
    const enginesUnchanged = Object.entries(D.policyEngines.controls).every(([id, control]) => Math.abs(state.engines[id] - control.value) < 0.001);
    const fiscalUnchanged = Object.entries(F.defaults).every(([id, value]) => state.fiscal[id] === value);
    if (!Object.keys(state.changes).length && state.euMode === "current" && structureUnchanged && enginesUnchanged && fiscalUnchanged) {
      $("#mechanism-status").textContent = "Scénario de référence";
      $("#mechanism-detail").textContent = "Aucune mesure n’est appliquée : la trajectoire centrale reproduit exactement la référence.";
    } else if (interest > demand && interest > supply) {
      $("#mechanism-status").textContent = "Coût de financement";
      $("#mechanism-detail").textContent = "La charge d’intérêts et la prime de risque dominent l’écart à la référence.";
    } else if (supply > demand * 0.55) {
      $("#mechanism-status").textContent = "Capacité productive";
      $("#mechanism-detail").textContent = "Les effets retardés sur le travail, le capital et la productivité prennent de l’importance.";
    } else {
      $("#mechanism-status").textContent = "Demande intérieure";
      $("#mechanism-detail").textContent = "Consommation, activité immédiate et fuites par les importations expliquent l’essentiel de l’impact.";
    }
  }

  function renderModelComparison() {
    const index = projectionIndex(state.horizon);
    $("#comparison-title").textContent = `Une mesure, ${Object.keys(D.models).length} lectures`;
    const colors = ["#4055bf", "#d85e55", "#168b80", "#7d62c7", "#d89a38", "#a0476e", "#426987", "#75933d", "#a4652d"];
    const rows = Object.entries(D.models).map(([id, model], modelIndex) => {
      const point = calculateProjection(id).scenario[index];
      const growthWidth = clamp((point.growth + 1.5) / 4 * 100, 4, 100);
      const deficitWidth = clamp(point.deficitRatio / 8 * 100, 4, 100);
      const debtWidth = clamp((point.debtRatio - 80) / 70 * 100, 4, 100);
      return `
        <div class="comparison-row ${id === state.model ? "is-selected" : ""}" style="--model-color:${colors[modelIndex % colors.length]}">
          <div class="comparison-model"><i></i><span>${model.label}</span></div>
          <div class="comparison-cell"><small>Croissance</small><span>${percent(point.growth)}</span><span class="comparison-bar"><i style="--bar-width:${growthWidth}%"></i></span></div>
          <div class="comparison-cell"><small>Déficit</small><span>−${percent(point.deficitRatio)}</span><span class="comparison-bar"><i style="--bar-width:${deficitWidth}%"></i></span></div>
          <div class="comparison-cell"><small>Dette</small><span>${percent(point.debtRatio)}</span><span class="comparison-bar"><i style="--bar-width:${debtWidth}%"></i></span></div>
        </div>
      `;
    });
    $("#comparison-table").innerHTML = rows.join("");
    $("#comparison-horizon").textContent = `Horizon ${state.horizon} an${state.horizon > 1 ? "s" : ""}`;
  }

  function renderSectors() {
    const totalDeficit = -D.sectors.reduce((sum, sector) => sum + sector.balance, 0);
    const maxDeficit = Math.max(...D.sectors.map((sector) => Math.abs(sector.balance)));
    $("#sector-visual").innerHTML = `
      <div class="sector-visual-header">
        <small>Déficit consolidé 2025</small>
        <strong>−${money(totalDeficit)}</strong>
        <span>Somme des soldes des quatre sous-secteurs</span>
      </div>
      <div class="sector-bars">
        ${D.sectors.map((sector) => `
          <div class="sector-bar-row" style="--sector-color:${sector.color};--bar-width:${Math.max(2, Math.abs(sector.balance) / maxDeficit * 100)}%">
            <span>${sector.label}</span>
            <span class="sector-bar-track"><i></i></span>
            <strong>${signed(sector.balance, " Md€")}</strong>
          </div>
        `).join("")}
      </div>
    `;
    $("#sector-grid").innerHTML = D.sectors.map((sector) => `
      <article class="sector-card" style="--sector-color:${sector.color}">
        <div class="sector-card-heading"><h3>${sector.label}</h3><span>${sector.code}</span></div>
        <p>${sector.description}</p>
        <div class="sector-numbers">
          <div><small>Dépenses</small><strong>${money(sector.spending)}</strong></div>
          <div><small>Recettes</small><strong>${money(sector.revenue)}</strong></div>
          <div class="sector-balance"><small>Solde</small><strong>${signed(sector.balance, " Md€")}</strong></div>
        </div>
      </article>
    `).join("");
  }

  function categoryEffectLabel(category, delta) {
    if (category.id === "R_TVA" && !delta) return "Mésange 2017";
    if (!delta) return `×${fmt1.format(category.multiplier)}`;
    const profile = effectiveProfile();
    const impact = categoryPolicyImpact(category, delta, 2, 1.05, profile, D.BASE.gdp,
      categoryStartQuarter(category.id));
    const value = impact.demand + impact.supply;
    return `PIB ${signed(value, " Md€")}`;
  }

  function renderCategories() {
    const isSpending = state.activeBudget === "spending";
    const categories = isSpending ? D.spending : D.revenue;
    const groups = isSpending ? D.spendingGroups : D.revenueGroups;
    const query = state.search.trim().toLocaleLowerCase("fr");
    const matching = categories.filter((category) => {
      const matchesQuery = !query || category.label.toLocaleLowerCase("fr").includes(query) || category.id.toLowerCase().includes(query);
      const matchesModified = !state.modifiedOnly || Math.abs(changeFor(category.id)) > 0.01;
      return matchesQuery && matchesModified;
    });
    const html = groups.map((group) => {
      const children = matching.filter((category) => category.group === group.id);
      if (!children.length) return "";
      const allChildren = categories.filter((category) => category.group === group.id);
      const total = allChildren.reduce((sum, category) => sum + category.value, 0);
      const delta = allChildren.reduce((sum, category) => sum + changeFor(category.id), 0);
      const newTotal = total + delta;
      const effect = allChildren.reduce((sum, category) => {
        const change = changeFor(category.id);
        if (!change) return sum;
        const impact = categoryPolicyImpact(category, change, 2, 1.05, effectiveProfile(), D.BASE.gdp,
          categoryStartQuarter(category.id));
        return sum + impact.demand + impact.supply;
      }, 0);
      const collapsed = state.collapsed.has(group.id) && !query;
      return `
        <section class="group-block ${collapsed ? "is-collapsed" : ""}" data-group="${group.id}">
          <button class="group-header" data-toggle-group="${group.id}" style="--group-color:${group.color}">
            <span class="group-title"><span class="group-swatch"></span><span class="chevron">⌄</span>${group.label}</span>
            <span class="group-total">${money(total)}</span>
            <span class="group-delta">${delta ? signed(delta, " Md€") : "—"}</span>
            <span class="group-new">${money(newTotal)}</span>
            <span class="group-effect">${effect ? signed(effect, " Md€ PIB") : "—"}</span>
          </button>
          <div class="group-children">
            ${children.map(renderCategoryRow).join("")}
          </div>
        </section>
      `;
    }).join("");
    const emptyMessage = state.modifiedOnly
      ? "Aucun poste modifié dans cet onglet. Désactivez « Modifiés seulement » pour retrouver tout le budget."
      : `Aucun poste ne correspond à « ${escapeHtml(state.search)} ».`;
    $("#category-list").innerHTML = html || `<div class="empty-state">${emptyMessage}</div>`;
    const visibleGroups = groups.filter((group) => matching.some((category) => category.group === group.id));
    const allCollapsed = visibleGroups.length > 0 && visibleGroups.every((group) => state.collapsed.has(group.id));
    $("#expand-all").textContent = allCollapsed && !query ? "Tout déplier" : "Tout replier";
    $("#editor-footnote").textContent = isSpending
      ? "Détail COFOG 2024 provisoire, recalé proportionnellement sur le total Insee 2025. La charge de la dette est calculée par le moteur."
      : "Recettes observées en 2025 dans les comptes nationaux Insee. Certains sous-postes sont des regroupements pour éviter les doubles comptes.";
  }

  function renderCategoryRow(category) {
    const delta = changeFor(category.id);
    const limits = categoryChangeLimits(category);
    const newValue = category.value + delta;
    const effect = categoryEffectLabel(category, delta);
    let effectClass = "";
    if (delta) {
      const numerical = Number(effect.match(/[−+]?([0-9]+(?:,[0-9]+)?)/)?.[0]?.replace("−", "-").replace(",", ".") || 0);
      effectClass = numerical > 0 ? "good" : numerical < 0 ? "bad" : "";
    }
    return `
      <div class="category-row" data-category="${category.id}">
        <div class="category-name"><strong>${category.label}</strong><small>${category.id} · ${category.observedYear === 2025 ? "observé 2025" : "calibré 2025"}</small>
          ${delta && !category.locked ? `<label class="category-quarter-label">Début 2026 <select data-category-quarter="${category.id}" aria-label="Trimestre de début de ${category.label}">
            <option value="default" ${!state.policyStartQuarters[category.id] ? "selected" : ""}>Défaut (T${state.policyStartQuarter})</option>
            ${[1, 2, 3, 4].map((quarter) => `<option value="${quarter}" ${state.policyStartQuarters[category.id] === quarter ? "selected" : ""}>T${quarter}</option>`).join("")}
          </select></label>` : ""}
        </div>
        <div class="value-cell">${money(category.value)}</div>
        <div class="change-control">
          ${category.locked
            ? `<span class="locked-note">calculé automatiquement</span>`
            : `<input type="range" min="${limits.min}" max="${limits.max}" step="0.5" value="${delta}" data-range="${category.id}" aria-label="Variation de ${category.label}" />
               <input type="number" min="${limits.min}" max="${limits.max}" step="0.5" value="${delta}" data-number="${category.id}" aria-label="Variation en milliards d’euros de ${category.label}" />`}
        </div>
        <div class="new-value ${delta ? "changed" : ""}">${money(newValue)}</div>
        <div class="effect-cell ${effectClass}">${effect}</div>
      </div>
    `;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  function resetPolicyEngines() {
    pushUndo();
    state.engines = Object.fromEntries(Object.entries(D.policyEngines.controls).map(([id, control]) => [id, control.value]));
    renderEngineControls();
    refreshAll(false);
    showToast("Moteurs de politique publique réinitialisés");
  }

  function resetScenario() {
    pushUndo();
    state.changes = {};
    state.model = "consensus";
    state.euMode = "current";
    state.cycle = "normal";
    state.monetary = "neutral";
    state.confidence = "stable";
    state.policyStartQuarter = 1;
    state.policyStartQuarters = {};
    state.structural = Object.fromEntries(Object.entries(D.structural.controls).map(([id, control]) => [id, control.value]));
    state.engines = Object.fromEntries(Object.entries(D.policyEngines.controls).map(([id, control]) => [id, control.value]));
    state.fiscal = { ...F.defaults };
    clearScenarioLink();
    $("#model-select").value = state.model;
    $("#eu-select").value = state.euMode;
    $("#cycle-select").value = state.cycle;
    $("#monetary-select").value = state.monetary;
    $("#confidence-select").value = state.confidence;
    $("#policy-start-quarter").value = String(state.policyStartQuarter);
    updateModelDescription();
    updateAssumptionDescription();
    renderStructuralControls();
    renderEngineControls();
    renderFiscalControls();
    refreshAll(true);
    showToast("Scénario réinitialisé");
  }

  function undo() {
    const previous = state.undoStack.pop();
    if (!previous) return;
    state.changes = previous.changes;
    state.model = previous.model;
    state.euMode = previous.euMode;
    state.cycle = previous.cycle || "normal";
    state.monetary = previous.monetary || "neutral";
    state.confidence = previous.confidence || "stable";
    state.policyStartQuarter = previous.policyStartQuarter || 1;
    state.policyStartQuarters = { ...(previous.policyStartQuarters || {}) };
    state.structural = previous.structural ? { ...previous.structural } : Object.fromEntries(Object.entries(D.structural.controls).map(([id, control]) => [id, control.value]));
    state.engines = previous.engines ? { ...previous.engines } : Object.fromEntries(Object.entries(D.policyEngines.controls).map(([id, control]) => [id, control.value]));
    state.fiscal = previous.fiscal ? { ...previous.fiscal } : { ...F.defaults };
    $("#model-select").value = state.model;
    $("#eu-select").value = state.euMode;
    $("#cycle-select").value = state.cycle;
    $("#monetary-select").value = state.monetary;
    $("#confidence-select").value = state.confidence;
    $("#policy-start-quarter").value = String(state.policyStartQuarter);
    $("#undo-button").disabled = state.undoStack.length === 0;
    updateModelDescription();
    updateAssumptionDescription();
    renderStructuralControls();
    renderEngineControls();
    renderFiscalControls();
    refreshAll(true);
  }

  const scenarioLibraryKey = "ecosim-france-scenarios";

  function readScenarioLibrary() {
    try {
      const value = JSON.parse(localStorage.getItem(scenarioLibraryKey) || "[]");
      return Array.isArray(value) ? value.filter((item) => item && typeof item.id === "string" && item.scenario && typeof item.scenario === "object") : [];
    } catch (error) {
      return [];
    }
  }

  function renderSavedScenarios(selectedId = "") {
    const select = $("#saved-scenarios");
    const records = readScenarioLibrary();
    select.innerHTML = `<option value="">${records.length ? "Choisir un scénario…" : "Aucun scénario enregistré"}</option>`
      + records.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} · ${escapeHtml(item.savedAt)}</option>`).join("");
    select.value = selectedId;
    $("#load-scenario").disabled = !select.value;
    $("#delete-scenario").disabled = !select.value;
  }

  function renderSavedComparison() {
    const container = $("#saved-comparison");
    const saved = readScenarioLibrary().find((item) => item.id === $("#saved-scenarios").value);
    container.hidden = !saved || !state.projection;
    if (!saved || !state.projection) return;
    const currentPoint = state.projection.scenario[projectionIndex(state.horizon)];
    const snapshot = {
      name: state.name, changes: state.changes, model: state.model, euMode: state.euMode,
      cycle: state.cycle, monetary: state.monetary, confidence: state.confidence,
      policyStartQuarter: state.policyStartQuarter,
      policyStartQuarters: state.policyStartQuarters,
      structural: state.structural, engines: state.engines, fiscal: state.fiscal
    };
    let savedPoint;
    try {
      applySerialized(saved.scenario);
      savedPoint = calculateProjection().scenario[projectionIndex(state.horizon)];
    } finally {
      Object.assign(state, snapshot);
    }
    const row = (label, point) => `<tr><th scope="row">${escapeHtml(label)}</th><td>${percent(point.deficitRatio)}</td><td>${percent(point.debtRatio)}</td><td>${percent(point.unemployment)}</td></tr>`;
    container.innerHTML = `<table><caption>Comparer à ${state.horizon} an${state.horizon > 1 ? "s" : ""}</caption><thead><tr><th>Scénario</th><th>Déficit</th><th>Dette</th><th>Chômage</th></tr></thead><tbody>${row("En cours", currentPoint)}${row(saved.name, savedPoint)}</tbody></table>`;
  }

  function saveScenario() {
    state.name = $("#scenario-name").value.trim() || "Mon scénario";
    try {
      const serialized = serializableState();
      const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const item = { id, name: state.name, savedAt: new Date().toLocaleString("fr-FR"), scenario: serialized };
      const records = readScenarioLibrary();
      localStorage.setItem(scenarioLibraryKey, JSON.stringify([...records, item]));
      localStorage.setItem("ecosim-france-scenario", JSON.stringify(serialized));
      renderSavedScenarios(id);
      renderSavedComparison();
      showToast("Nouvelle copie du scénario enregistrée");
    } catch (error) {
      showToast("La sauvegarde locale est indisponible");
    }
  }

  function restoreScenario(payload) {
    pushUndo();
    state.name = "Mon scénario";
    state.model = "consensus";
    state.euMode = "current";
    state.cycle = "normal";
    state.monetary = "neutral";
    state.confidence = "stable";
    state.policyStartQuarter = 1;
    state.policyStartQuarters = {};
    state.changes = {};
    state.structural = Object.fromEntries(Object.entries(D.structural.controls).map(([id, control]) => [id, control.value]));
    state.engines = Object.fromEntries(Object.entries(D.policyEngines.controls).map(([id, control]) => [id, control.value]));
    state.fiscal = { ...F.defaults };
    applySerialized(payload);
    clearScenarioLink();
    $("#scenario-name").value = state.name;
    $("#model-select").value = state.model;
    $("#eu-select").value = state.euMode;
    $("#cycle-select").value = state.cycle;
    $("#monetary-select").value = state.monetary;
    $("#confidence-select").value = state.confidence;
    $("#policy-start-quarter").value = String(state.policyStartQuarter);
    updateModelDescription();
    updateAssumptionDescription();
    renderStructuralControls();
    renderEngineControls();
    renderFiscalControls();
    refreshAll(true);
  }

  function loadSavedScenario() {
    const item = readScenarioLibrary().find((record) => record.id === $("#saved-scenarios").value);
    if (!item) return;
    restoreScenario(item.scenario);
    showToast(`Scénario « ${state.name} » chargé`);
  }

  async function importScenarioFile(file) {
    if (!file) return;
    if (file.size > 2_000_000) {
      showToast("Fichier trop volumineux (limite : 2 Mo)");
      return;
    }
    try {
      const {payload, version} = parseScenarioImport(await file.text());
      restoreScenario(payload);
      showToast(version && version !== D.metadata.version
        ? "Scénario importé depuis une autre version : vérifiez les réglages"
        : "Scénario importé ; sauvegardez-le pour le conserver ici");
    } catch (error) {
      showToast(error instanceof SyntaxError ? "JSON illisible : import annulé" : error.message || "Import impossible");
    }
  }

  function deleteSavedScenario() {
    const selected = $("#saved-scenarios").value;
    const item = readScenarioLibrary().find((record) => record.id === selected);
    if (!item || !window.confirm(`Supprimer la copie enregistrée « ${item.name} » ?`)) return;
    try {
      localStorage.setItem(scenarioLibraryKey, JSON.stringify(readScenarioLibrary().filter((record) => record.id !== selected)));
      renderSavedScenarios();
      renderSavedComparison();
      showToast("Copie enregistrée supprimée");
    } catch (error) {
      showToast("Impossible de supprimer cette copie");
    }
  }

  function exportScenario(type) {
    const projectionRows = state.projection.scenario.map((item, index) => ({
      annee: item.year,
      pib_milliards: round(item.gdp, 2),
      croissance_reelle_pct: round(item.growth, 2),
      inflation_pct: round(item.inflation, 2),
      chomage_pct: round(item.unemployment, 2),
      deficit_milliards: round(item.deficit, 2),
      deficit_pct_pib: round(item.deficitRatio, 2),
      dette_milliards: round(item.debt, 2),
      dette_pct_pib: round(item.debtRatio, 2),
      population_millions: round(item.structural.population, 3),
      naissances_milliers: round(item.structural.births, 1),
      agents_publics_ecart_milliers: round(item.structural.publicEmploymentDelta, 1),
      agents_etat_ecart_milliers: round(item.structural.publicByVersant.fpe, 1),
      agents_territoriaux_ecart_milliers: round(item.structural.publicByVersant.fpt, 1),
      agents_hospitaliers_ecart_milliers: round(item.structural.publicByVersant.fph, 1),
      militaires_publics_ecart_milliers: round(item.structural.publicMilitaryDelta, 1),
      titulaires_publics_ecart_milliers: round(item.structural.publicPermanentDelta, 1),
      contractuels_publics_ecart_milliers: round(item.structural.publicContractDelta, 1),
      armees_ecart_milliers: round(item.structural.publicMissionById.military, 1),
      police_nationale_ecart_milliers: round(item.structural.publicMissionById.police, 1),
      gendarmerie_ecart_milliers: round(item.structural.publicMissionById.gendarmerie, 1),
      juridictions_ecart_milliers: round(item.structural.publicMissionById.judiciary, 1),
      administration_penitentiaire_ecart_milliers: round(item.structural.publicMissionById.prison, 1),
      justice_des_mineurs_ecart_milliers: round(item.structural.publicMissionById.youthJustice, 1),
      education_recherche_ecart_milliers: round(item.structural.publicMissionById.education, 1),
      autres_administrations_etat_ecart_milliers: round(item.structural.publicMissionById.stateAdmin, 1),
      hopitaux_publics_ecart_milliers: round(item.structural.publicMissionById.hospital, 1),
      pompiers_professionnels_ecart_milliers: round(item.structural.publicMissionById.firefighters, 1),
      autres_services_territoriaux_ecart_milliers: round(item.structural.publicMissionById.territorial, 1),
      recrutements_publics_categorie_a_pct: round(item.structural.publicCategoryMix.a * 100, 1),
      recrutements_publics_categorie_b_pct: round(item.structural.publicCategoryMix.b * 100, 1),
      recrutements_publics_categorie_c_pct: round(item.structural.publicCategoryMix.c * 100, 1),
      cout_annuel_emploi_public_milliards: round(item.structural.publicPayrollCost, 2),
      pensions_agents_ecart_milliards: round(item.structural.publicPensionCost, 2),
      cotisations_employeur_internes_recettes_milliards: round(item.structural.publicPensionContributionRevenue, 2),
      cout_public_net_annuel_milliards: round(item.structural.publicPayrollCost + item.structural.publicPensionCost - item.structural.publicPensionContributionRevenue, 2),
      recrutements_publics_demandes_milliers: round(item.structural.requestedPublicHiring, 2),
      recrutements_publics_realises_milliers: round(item.structural.realizedPublicHiring, 2),
      engagement_public_40_ans_milliards: round(item.structural.lifetimeCommitment, 2),
      formation_vers_emploi_milliers: round(item.structural.trainingEmploymentDelta, 1),
      emploi_net_mobilise_milliers: round(item.labor.netEmployment, 1),
      emploi_depuis_chomage_milliers: round(item.labor.fromUnemployment, 1),
      emploi_depuis_halo_milliers: round(item.labor.fromHalo, 1),
      mobilite_emploi_emploi_milliers: round(item.labor.jobToJob, 1),
      taux_realisation_emploi_pct: round(item.labor.realizationRate * 100, 1),
      solde_fiscal_cohortes_milliards: round(item.structural.migrationNet, 2),
      reforme_fiscale_recettes_milliards: round(item.fiscal.totalBn, 2),
      reforme_ir_milliards: round(item.fiscal.deltaByTax.ir, 2),
      reforme_ifi_milliards: round(item.fiscal.deltaByTax.ifi, 2),
      reforme_successions_milliards: round(item.fiscal.deltaByTax.inheritance, 2),
      reforme_impot_plancher_milliards: round(item.fiscal.deltaByTax.floor, 2),
      variation_depenses_directes_milliards: round(item.spendingChange, 2),
      variation_recettes_directes_milliards: round(item.revenueChange, 2),
      variation_solde_direct_milliards: round(-item.directBalanceCost, 2),
      facture_energetique_ecart_milliards: round(item.structural.importBillChange, 2),
      emissions_ecart_mtco2e: round(item.structural.emissionsChange, 2),
      moteurs_solde_direct_milliards: round(-item.engines.fiscalCost, 2),
      moteurs_pib_milliards: round(item.engines.gdpImpact, 2),
      moteurs_emploi_milliers: round(item.engines.jobs, 1),
      moteurs_inflation_points: round(item.engines.inflation, 2),
      moteurs_solde_exterieur_milliards: round(item.engines.trade, 2),
      moteurs_emissions_mtco2e: round(item.engines.emissions, 2),
      moteurs_pauvrete_points: round(item.engines.poverty, 2),
      mecontentement_moyen_ecart_indice: round(item.social.meanDiscomfort, 2),
      sensibilite_vote_sortant_basse_points: round(Math.min(...item.social.incumbentVoteSensitivity), 2),
      sensibilite_vote_sortant_haute_points: round(Math.max(...item.social.incumbentVoteSensitivity), 2),
      reference_deficit_pct_pib: round(state.projection.baseline[index].deficitRatio, 2),
      reference_dette_pct_pib: round(state.projection.baseline[index].debtRatio, 2)
    }));
    if (type === "link") {
      const url = `${location.origin}${location.pathname}#scenario=${encodeState(serializableState())}`;
      navigator.clipboard?.writeText(url).then(() => showToast("Lien du scénario copié"), () => showToast("Impossible de copier automatiquement"));
      return;
    }
    let content;
    let mime;
    let extension;
    if (type === "json") {
      content = JSON.stringify({ metadata: D.metadata, scenario: serializableState(), projection: projectionRows }, null, 2);
      mime = "application/json";
      extension = "json";
    } else {
      const headers = Object.keys(projectionRows[0]);
      content = [headers.join(";"), ...projectionRows.map((row) => headers.map((header) => String(row[header]).replace(".", ",")).join(";"))].join("\n");
      mime = "text/csv;charset=utf-8";
      extension = "csv";
    }
    const blob = new Blob([content], { type: mime });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `ecosim-${state.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "scenario"}.${extension}`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    showToast(`Export ${extension.toUpperCase()} généré`);
  }

  let toastTimer;
  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2400);
  }

  function bindEvents() {
    $("#fiscal-control-list").addEventListener("change", (event) => {
      const id = event.target?.dataset?.fiscalControl;
      if (!id || !F.controls[id]) return;
      const value = Number(event.target.value);
      const candidate = { ...state.fiscal, [id]: value };
      try { F.validate(candidate); } catch {
        event.target.value = String(state.fiscal[id]);
        showToast("Valeur fiscale hors limites");
        return;
      }
      pushUndo();
      state.fiscal = candidate;
      refreshAll();
    });
    $("#model-select").addEventListener("change", (event) => {
      pushUndo();
      state.model = event.target.value;
      updateModelDescription();
      refreshAll(true);
    });
    $("#eu-select").addEventListener("change", (event) => {
      pushUndo();
      state.euMode = event.target.value;
      updateModelDescription();
      refreshAll();
    });
    $("#policy-start-quarter").addEventListener("change", (event) => {
      pushUndo();
      state.policyStartQuarter = Number(event.target.value);
      refreshAll(true);
    });
    $("#category-list").addEventListener("change", (event) => {
      const id = event.target.dataset.categoryQuarter;
      if (!id) return;
      pushUndo();
      if (event.target.value === "default") delete state.policyStartQuarters[id];
      else state.policyStartQuarters[id] = Number(event.target.value);
      refreshAll(true);
    });
    [["cycle-select", "cycle"], ["monetary-select", "monetary"], ["confidence-select", "confidence"]].forEach(([elementId, key]) => {
      $(`#${elementId}`).addEventListener("change", (event) => {
        pushUndo();
        state[key] = event.target.value;
        updateAssumptionDescription();
        refreshAll(true);
      });
    });
    $("#scenario-name").addEventListener("input", (event) => {
      state.name = event.target.value;
      $("#journey-status").textContent = `${state.name || "Mon scénario"} · ${state.horizon} an${state.horizon > 1 ? "s" : ""}`;
    });
    $("#preset-list").addEventListener("click", (event) => {
      const preset = event.target.closest("[data-preset]");
      if (preset) applyPreset(preset.dataset.preset);
    });
    $("#reset-button").addEventListener("click", resetScenario);
    $("#mobile-controls-toggle").addEventListener("click", () => {
      const panel = $(".control-panel");
      const collapsed = panel.classList.toggle("is-mobile-collapsed");
      $("#mobile-controls-toggle").setAttribute("aria-expanded", collapsed ? "false" : "true");
      $("#mobile-controls-toggle").textContent = collapsed ? "Ouvrir les réglages" : "Fermer les réglages";
    });
    $("#undo-button").addEventListener("click", undo);
    $("#save-button").addEventListener("click", saveScenario);
    $("#saved-scenarios").addEventListener("change", () => {
      $("#load-scenario").disabled = !$("#saved-scenarios").value;
      $("#delete-scenario").disabled = !$("#saved-scenarios").value;
      renderSavedComparison();
    });
    $("#load-scenario").addEventListener("click", loadSavedScenario);
    $("#delete-scenario").addEventListener("click", deleteSavedScenario);
    $("#import-scenario").addEventListener("click", () => $("#import-scenario-file").click());
    $("#import-scenario-file").addEventListener("change", (event) => {
      importScenarioFile(event.target.files?.[0]);
      event.target.value = "";
    });
    $$("[data-horizon]").forEach((button) => button.addEventListener("click", () => {
      state.horizon = Number(button.dataset.horizon);
      $$("[data-horizon]").forEach((item) => item.classList.toggle("is-active", item === button));
      updateResults();
      renderModelComparison();
      updateStructuralLab();
      updateEngineRoom();
      updateFiscalPanel();
    }));
    $(".lab-tabs").addEventListener("click", (event) => {
      const button = event.target.closest("[data-structural-tab]");
      if (!button) return;
      state.activeStructuralTab = button.dataset.structuralTab;
      $$("[data-structural-tab]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
        item.setAttribute("aria-selected", item === button ? "true" : "false");
      });
      renderStructuralControls();
    });
    $("#structural-control-list").addEventListener("click", (event) => {
      if (event.target.closest("[data-open-assumptions]")) {
        const panel = $("#structural-assumptions");
        panel.open = true;
        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return;
      }
      const button = event.target.closest("[data-open-engine]");
      if (!button) return;
      state.activeEngine = button.dataset.openEngine;
      renderEngineSelector();
      renderEngineControls();
      updateEngineRoom();
      $("#engines").scrollIntoView({ behavior: "smooth" });
    });
    $(".structural-controls").addEventListener("pointerdown", (event) => {
      if (event.target.dataset.structuralControl || event.target.dataset.structuralNumber) captureEditSnapshot();
    });
    $(".structural-controls").addEventListener("focusin", (event) => {
      if (event.target.dataset.structuralControl || event.target.dataset.structuralNumber) captureEditSnapshot();
    });
    $(".structural-controls").addEventListener("input", (event) => {
      const id = event.target.dataset.structuralControl;
      if (!id) return;
      state.structural[id] = Number(event.target.value);
      const output = $(`#output-${id}`);
      if (output) output.textContent = controlText(id, state.structural[id]);
      const numeric = $(`[data-structural-number="${id}"]`);
      if (numeric) numeric.value = state.structural[id];
      refreshAll(false);
    });
    $(".structural-controls").addEventListener("change", (event) => {
      const id = event.target.dataset.structuralControl || event.target.dataset.structuralNumber;
      if (!id) return;
      if (event.target.dataset.structuralNumber) {
        state.structural[id] = boundedControlValue(event.target.value, D.structural.controls[id]);
        event.target.value = state.structural[id];
        $(`#structural-${id}`).value = state.structural[id];
        $(`#output-${id}`).textContent = controlText(id, state.structural[id]);
        refreshAll(false);
      }
      commitEditSnapshot();
    });
    $("#engine-selector").addEventListener("click", (event) => {
      const button = event.target.closest("[data-engine-tab]");
      if (!button) return;
      state.activeEngine = button.dataset.engineTab;
      renderEngineSelector();
      renderEngineControls();
      updateEngineRoom();
    });
    $("#engine-control-list").addEventListener("pointerdown", (event) => {
      if (event.target.dataset.engineControl || event.target.dataset.engineNumber) captureEditSnapshot();
    });
    $("#engine-control-list").addEventListener("focusin", (event) => {
      if (event.target.dataset.engineControl || event.target.dataset.engineNumber) captureEditSnapshot();
    });
    $("#engine-control-list").addEventListener("input", (event) => {
      const id = event.target.dataset.engineControl;
      if (!id) return;
      state.engines[id] = Number(event.target.value);
      const output = $(`#engine-output-${id}`);
      if (output) output.textContent = engineControlText(id, state.engines[id]);
      const numeric = $(`[data-engine-number="${id}"]`);
      if (numeric) numeric.value = state.engines[id];
      refreshAll(false);
    });
    $("#engine-control-list").addEventListener("change", (event) => {
      const id = event.target.dataset.engineControl || event.target.dataset.engineNumber;
      if (!id) return;
      if (event.target.dataset.engineNumber) {
        state.engines[id] = boundedControlValue(event.target.value, D.policyEngines.controls[id]);
        event.target.value = state.engines[id];
        $(`#engine-${id}`).value = state.engines[id];
        $(`#engine-output-${id}`).textContent = engineControlText(id, state.engines[id]);
        refreshAll(false);
      }
      commitEditSnapshot();
    });
    $("#reset-engines").addEventListener("click", resetPolicyEngines);
    $(".politics-tabs").addEventListener("click", (event) => {
      const button = event.target.closest("[data-politics-view]");
      if (!button) return;
      state.politicsView = button.dataset.politicsView;
      state.selectedPolitics = state.politicsView === "current" ? "technical" : D.politicalScenarios.historical[0].id;
      $$('[data-politics-view]').forEach((item) => {
        item.classList.toggle("is-active", item === button);
        item.setAttribute("aria-selected", item === button ? "true" : "false");
      });
      renderPolitics();
    });
    $$('[data-politics-horizon]').forEach((button) => button.addEventListener("click", () => {
      state.politicsHorizon = Number(button.dataset.politicsHorizon);
      $$('[data-politics-horizon]').forEach((item) => item.classList.toggle("is-active", item === button));
      renderPoliticsDetail();
      renderPoliticsComparison();
    }));
    $("#politics-model-select").addEventListener("change", (event) => {
      if (!D.models[event.target.value]) return;
      state.politicsModel = event.target.value;
      renderPoliticsDetail();
      renderPoliticsComparison();
    });
    $("#politics").addEventListener("click", (event) => {
      const apply = event.target.closest("[data-apply-politics]");
      if (apply) {
        applyPoliticalScenario(apply.dataset.applyPolitics);
        return;
      }
      const choice = event.target.closest("[data-politics-id]");
      if (!choice) return;
      state.selectedPolitics = choice.dataset.politicsId;
      renderPolitics();
    });
    $("#metric-switch").addEventListener("click", (event) => {
      const button = event.target.closest("[data-chart]");
      if (!button) return;
      state.chartMetric = button.dataset.chart;
      $$("[data-chart]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderChart();
    });
    $$("[data-budget-tab]").forEach((button) => button.addEventListener("click", () => {
      state.activeBudget = button.dataset.budgetTab;
      $$("[data-budget-tab]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
        item.setAttribute("aria-selected", item === button ? "true" : "false");
      });
      renderCategories();
    }));
    $("#category-search").addEventListener("input", (event) => {
      state.search = event.target.value;
      renderCategories();
    });
    $("#modified-only").addEventListener("change", (event) => {
      state.modifiedOnly = event.target.checked;
      if (state.modifiedOnly) {
        const categories = state.activeBudget === "spending" ? D.spending : D.revenue;
        categories.filter((category) => Math.abs(changeFor(category.id)) > 0.01).forEach((category) => state.collapsed.delete(category.group));
      }
      renderCategories();
    });
    $("#category-list").addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-toggle-group]");
      if (!toggle) return;
      const group = toggle.dataset.toggleGroup;
      if (state.collapsed.has(group)) state.collapsed.delete(group);
      else state.collapsed.add(group);
      renderCategories();
    });
    $("#category-list").addEventListener("input", (event) => {
      const id = event.target.dataset.range || event.target.dataset.number;
      if (!id) return;
      const row = event.target.closest("[data-category]");
      const pair = event.target.dataset.range ? $("[data-number]", row) : $("[data-range]", row);
      if (pair) pair.value = event.target.value;
      setCategoryChange(id, event.target.value, false);
      const category = byId.get(id);
      const delta = changeFor(id);
      $(".new-value", row).textContent = money(category.value + delta);
      $(".new-value", row).classList.toggle("changed", Boolean(delta));
      $(".effect-cell", row).textContent = categoryEffectLabel(category, delta);
    });
    $("#category-list").addEventListener("pointerdown", (event) => {
      if (event.target.dataset.range || event.target.dataset.number) captureEditSnapshot();
    });
    $("#category-list").addEventListener("focusin", (event) => {
      if (event.target.dataset.range || event.target.dataset.number) captureEditSnapshot();
    });
    $("#category-list").addEventListener("keydown", (event) => {
      if (event.target.dataset.range || event.target.dataset.number) captureEditSnapshot();
    });
    $("#category-list").addEventListener("change", (event) => {
      const id = event.target.dataset.range || event.target.dataset.number;
      if (!id) return;
      commitEditSnapshot();
      setCategoryChange(id, event.target.value, true);
    });
    $("#expand-all").addEventListener("click", () => {
      const groups = state.activeBudget === "spending" ? D.spendingGroups : D.revenueGroups;
      const allCollapsed = groups.every((group) => state.collapsed.has(group.id));
      groups.forEach((group) => {
        if (allCollapsed) state.collapsed.delete(group.id);
        else state.collapsed.add(group.id);
      });
      renderCategories();
    });
    $("#method-modal-button").addEventListener("click", () => $("#method-dialog").showModal());
    $("#export-button").addEventListener("click", () => $("#export-dialog").showModal());
    $("#mobile-export-button").addEventListener("click", () => $("#export-dialog").showModal());
    $("#export-dialog").addEventListener("click", (event) => {
      const option = event.target.closest("[data-export]");
      if (!option) return;
      exportScenario(option.dataset.export);
      $("#export-dialog").close();
    });
    $$("[data-scroll]").forEach((button) => button.addEventListener("click", (event) => {
      if (button.tagName === "A") event.preventDefault();
      $(`#${button.dataset.scroll}`)?.scrollIntoView({ behavior: "smooth" });
    }));
    const toggleTheme = () => {
      const current = document.documentElement.dataset.theme;
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("ecosim-theme", next); } catch { /* thème conservé pour cette session */ }
      renderChart();
    };
    $("#theme-toggle").addEventListener("click", toggleTheme);
    $("#mobile-theme-toggle").addEventListener("click", toggleTheme);
  }

  function initTheme() {
    try {
      const saved = localStorage.getItem("ecosim-theme");
      if (saved === "light" || saved === "dark") document.documentElement.dataset.theme = saved;
    } catch { /* le thème système reste disponible */ }
  }

  function initResponsiveUX() {
    const mobile = window.matchMedia("(max-width: 760px)");
    const apply = (isMobile) => {
      const panel = $(".control-panel");
      const button = $("#mobile-controls-toggle");
      if (isMobile) {
        panel.classList.add("is-mobile-collapsed");
        button.setAttribute("aria-expanded", "false");
        button.textContent = "Ouvrir les réglages";
      } else {
        panel.classList.remove("is-mobile-collapsed");
        button.setAttribute("aria-expanded", "true");
      }
    };
    apply(mobile.matches);
    mobile.addEventListener?.("change", (event) => apply(event.matches));
  }

  function initMobileMenu() {
    const button = $("#mobile-nav-toggle");
    const nav = $("#main-nav");
    const close = () => {
      nav.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Ouvrir le menu");
    };
    button.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    });
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a, button")) close();
    });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
    document.addEventListener("click", (event) => {
      if (!nav.contains(event.target) && !button.contains(event.target)) close();
    });
    window.matchMedia("(max-width: 760px)").addEventListener?.("change", (event) => {
      if (!event.matches) close();
    });
  }

  function initJourneyObserver() {
    if (!("IntersectionObserver" in window)) return;
    const ids = ["workspace", "structural", "politics", "budget"];
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      $$(".journey-inner [data-scroll]").forEach((button) => button.classList.toggle("is-active", button.dataset.scroll === visible.target.id));
    }, { rootMargin: "-25% 0px -60%", threshold: [0, 0.1, 0.35] });
    ids.forEach((id) => { const section = $(`#${id}`); if (section) observer.observe(section); });
  }

  loadInitialState();
  initTheme();
  initializeControls();
  initResponsiveUX();
  bindEvents();
  initMobileMenu();
  renderCategories();
  refreshAll(false);
  initJourneyObserver();
})();
