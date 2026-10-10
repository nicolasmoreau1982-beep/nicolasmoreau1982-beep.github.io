(() => {
  "use strict";

  const D = window.ECOSIM_DATA;
  const allCategories = [...D.spending, ...D.revenue];
  const byId = new Map(allCategories.map((item) => [item.id, item]));
  const fmt1 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmt0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

  const state = {
    changes: {},
    model: "consensus",
    euMode: "current",
    cycle: "normal",
    monetary: "neutral",
    confidence: "stable",
    horizon: 3,
    activeBudget: "spending",
    chartMetric: "deficitRatio",
    search: "",
    name: "Mon scénario",
    collapsed: new Set(),
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
      changes: Object.fromEntries(Object.entries(state.changes).filter(([, value]) => Math.abs(value) > 0.0001))
    };
  }

  function applySerialized(payload) {
    if (!payload || typeof payload !== "object") return false;
    if (D.models[payload.model]) state.model = payload.model;
    if (D.euModes[payload.euMode]) state.euMode = payload.euMode;
    if (D.assumptions.cycle[payload.cycle]) state.cycle = payload.cycle;
    if (D.assumptions.monetary[payload.monetary]) state.monetary = payload.monetary;
    if (D.assumptions.confidence[payload.confidence]) state.confidence = payload.confidence;
    if (typeof payload.name === "string") state.name = payload.name.slice(0, 60);
    if (payload.changes && typeof payload.changes === "object") {
      state.changes = {};
      Object.entries(payload.changes).forEach(([id, value]) => {
        const category = byId.get(id);
        const number = Number(value);
        if (category && !category.locked && Number.isFinite(number)) {
          const limit = Math.max(10, Math.ceil(Math.abs(category.value) * 0.7 / 5) * 5);
          state.changes[id] = clamp(number, -limit, limit);
        }
      });
    }
    return true;
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
    for (let index = 0; index < 10; index += 1) {
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

  function categoryPolicyImpact(category, delta, index, priceIndex, profile) {
    const ramp = index === 0 ? category.lag : Math.min(1, category.lag + index * 0.28);
    const persistentDemand = category.type === "spending" ? 0.55 : 0.45;
    const demandWeight = persistentDemand + (1 - persistentDemand) * profile.decay ** index;
    const strategic = profile.strategicBoost && ["GF0403", "GF0404", "GF0405", "GF0408", "GF0503"].includes(category.id)
      ? profile.strategicBoost
      : 1;
    const amount = delta * priceIndex;
    const direction = category.type === "spending" ? 1 : -1;
    const scale = category.type === "spending" ? profile.spendScale : profile.taxScale;
    const leakage = 1 - (category.importShare || 0) * 0.22;
    const demand = direction * amount * category.multiplier * scale * ramp * demandWeight * leakage * strategic;
    const supplyMaturity = 1 - Math.exp(-(index + 1) / 3.6);
    const supply = direction * amount * category.supply * profile.supplyScale * supplyMaturity * strategic;
    const inflation = direction * amount * category.inflation * (profile.inflationBoost || 1);
    return { demand, supply, inflation, amount };
  }

  function calculateProjection(modelKey = state.model) {
    const baseline = baselineTrajectory();
    const profile = effectiveProfile(modelKey);
    const eu = D.euModes[state.euMode];
    const scenario = [];
    let scenarioDebt = D.BASE.debt;
    let baselineDebtPrevious = D.BASE.debt;
    let priceIndex = 1;
    let institutionRealFactor = 1;
    let institutionPriceFactor = 1;
    let previousOutputGap = 0;
    let lastDebtRatio = D.BASE.debtRatio;

    for (let index = 0; index < 10; index += 1) {
      priceIndex *= 1 + D.baseline.inflation[index] / 100;
      institutionRealFactor *= 1 + eu.growthShock[index] / 100;

      let policyGdp = 0;
      let policyInflationBillions = 0;
      let spendingChange = 0;
      let revenueChange = 0;
      let demandContribution = 0;
      let supplyContribution = 0;

      Object.entries(state.changes).forEach(([id, deltaValue]) => {
        const delta = Number(deltaValue);
        if (!delta) return;
        const category = byId.get(id);
        if (!category || category.locked) return;
        const impact = categoryPolicyImpact(category, delta, index, priceIndex, profile);
        demandContribution += impact.demand;
        supplyContribution += impact.supply;
        policyGdp += impact.demand + impact.supply;
        policyInflationBillions += impact.inflation * (profile.decay ** index);
        if (category.type === "spending") spendingChange += impact.amount;
        else revenueChange += impact.amount;
      });

      const extraInflation = clamp(policyInflationBillions / baseline[index].gdp * 100, -2.5, 2.5);
      institutionPriceFactor *= 1 + (eu.inflationShock[index] + extraInflation) / 100;
      const scenarioGdp = Math.max(
        baseline[index].gdp * institutionRealFactor * institutionPriceFactor + policyGdp,
        baseline[index].gdp * 0.62
      );
      const outputGap = (institutionRealFactor - 1) * 100 + policyGdp / baseline[index].gdp * 100;
      const growth = D.baseline.realGrowth[index] + outputGap - previousOutputGap;
      previousOutputGap = outputGap;
      const inflation = D.baseline.inflation[index] + eu.inflationShock[index] + extraInflation;
      const unemployment = clamp(D.baseline.unemployment[index] - 0.35 * outputGap, 3.2, 18);
      const revenueFeedback = (scenarioGdp - baseline[index].gdp) * 0.48;
      const cyclicalSpending = (unemployment - D.baseline.unemployment[index]) * 3.1;

      const debtDifferencePrevious = scenarioDebt - baselineDebtPrevious;
      const previousBaselineRatio = index === 0 ? D.BASE.debtRatio : baseline[index - 1].debtRatio;
      const debtRisk = Math.max(0, lastDebtRatio - previousBaselineRatio) * 0.045 * profile.debtSensitivity;
      const riskPremium = Math.max(-0.20, eu.rateShock + profile.assumptionRate + debtRisk);
      const transmission = Math.min(1, 0.18 * (index + 1));
      const extraInterest = debtDifferencePrevious * 0.021 + scenarioDebt * riskPremium / 100 * transmission;
      const directBalanceCost = spendingChange - revenueChange;
      const deficit = baseline[index].deficit + directBalanceCost - revenueFeedback + cyclicalSpending + extraInterest;
      scenarioDebt += deficit;
      const debtRatio = scenarioDebt / scenarioGdp * 100;
      const deficitRatio = deficit / scenarioGdp * 100;

      const policySize = Math.abs(demandContribution) + Math.abs(supplyContribution) + Math.abs(directBalanceCost) * 0.22;
      const uncertaintyScale = profile.uncertainty * (1 + index * 0.07) + eu.uncertainty * (1 + index * 0.09);
      const gdpBand = Math.max(1.4, policySize * uncertaintyScale + baseline[index].gdp * eu.uncertainty * 0.006);
      const deficitBand = Math.max(0.08, (Math.abs(directBalanceCost) * profile.uncertainty + eu.uncertainty * 12) / scenarioGdp * 100 * (1 + index * 0.08));
      const debtBand = Math.max(0.25, (gdpBand / scenarioGdp * 100 + deficitBand) * Math.sqrt(index + 1));

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
        outputGap,
        riskPremium,
        bands: {
          gdp: gdpBand,
          deficitRatio: deficitBand,
          debtRatio: debtBand,
          growth: Math.max(0.12, gdpBand / baseline[index].gdp * 65),
          unemployment: Math.max(0.08, gdpBand / baseline[index].gdp * 28)
        }
      });
      baselineDebtPrevious = baseline[index].debt;
      lastDebtRatio = debtRatio;
    }

    return { baseline, scenario, profile, eu };
  }

  function initializeControls() {
    const modelSelect = $("#model-select");
    modelSelect.innerHTML = Object.entries(D.models).map(([id, model]) => `<option value="${id}">${model.label}</option>`).join("");
    modelSelect.value = state.model;
    const euSelect = $("#eu-select");
    euSelect.innerHTML = Object.entries(D.euModes).map(([id, mode]) => `<option value="${id}">${mode.label}</option>`).join("");
    euSelect.value = state.euMode;
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
    renderPresets();
    renderSources();
    renderSectors();
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

  function updateModelDescription() {
    const model = D.models[state.model];
    const eu = D.euModes[state.euMode];
    $("#model-description").textContent = `${model.description} ${eu.description}`;
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
      confidence: state.confidence
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
        confidence: state.confidence
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
    const limit = Math.max(10, Math.ceil(Math.abs(category.value) * 0.7 / 5) * 5);
    const value = clamp(Number(rawValue) || 0, -limit, limit);
    if (Math.abs(value) < 0.01) delete state.changes[id];
    else state.changes[id] = round(value, 1);
    refreshAll(refreshList);
  }

  function applyPreset(id) {
    const preset = D.presets.find((item) => item.id === id);
    if (!preset) return;
    pushUndo();
    state.changes = { ...preset.changes };
    state.model = preset.model;
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
    if (refreshList) renderCategories();
  }

  function updateSummary() {
    let spending = 0;
    let revenue = 0;
    Object.entries(state.changes).forEach(([id, value]) => {
      const category = byId.get(id);
      if (!category) return;
      if (category.type === "spending") spending += Number(value);
      else revenue += Number(value);
    });
    const cost = spending - revenue;
    const balance = -cost;
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

  function updateMetricDelta(element, value, inverse = false, suffix = "") {
    element.textContent = `${signed(value, suffix)} vs référence`;
    element.classList.remove("good", "bad");
    if (Math.abs(value) < 0.03) return;
    const good = inverse ? value < 0 : value > 0;
    element.classList.add(good ? "good" : "bad");
  }

  function updateResults() {
    const index = ({ 1: 0, 3: 2, 5: 4, 10: 9 })[state.horizon];
    const item = state.projection.scenario[index];
    const baseline = state.projection.baseline[index];
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
    const x = (index) => padding.left + index * (plotWidth / 9);
    const y = (value) => padding.top + (max - value) / (max - min || 1) * plotHeight;
    const path = (items, getter) => items.map((item, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(getter(item, index)).toFixed(1)}`).join(" ");
    const top = scenario.map((item, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(item[metric] + (item.bands[metric] || 0)).toFixed(1)}`).join(" ");
    const bottom = [...scenario].reverse().map((item, reverseIndex) => {
      const index = 9 - reverseIndex;
      return `L${x(index).toFixed(1)},${y(item[metric] - (item.bands[metric] || 0)).toFixed(1)}`;
    }).join(" ");
    const ticks = Array.from({ length: 5 }, (_, index) => min + index * (max - min) / 4);
    const grid = ticks.map((tick) => `
      <line class="chart-grid" x1="${padding.left}" y1="${y(tick)}" x2="${width - padding.right}" y2="${y(tick)}" />
      <text class="chart-axis-label" x="${padding.left - 9}" y="${y(tick) + 3}" text-anchor="end">${metric === "gdp" ? fmt0.format(tick) : fmt1.format(metric === "deficitRatio" ? -tick : tick)}</text>
    `).join("");
    const years = scenario.map((item, index) => index % 2 === 0 || index === 9 ? `<text class="chart-axis-label" x="${x(index)}" y="${height - 8}" text-anchor="middle">${item.year}</text>` : "").join("");
    const ruleLine = metric === "deficitRatio" && 3 >= min && 3 <= max
      ? `<line class="chart-zero" x1="${padding.left}" y1="${y(3)}" x2="${width - padding.right}" y2="${y(3)}" /><text class="chart-axis-label" x="${width - padding.right}" y="${y(3) - 5}" text-anchor="end">seuil −3 %</text>`
      : "";
    const points = scenario.map((item, index) => `<circle class="chart-point" data-point="${index}" cx="${x(index)}" cy="${y(item[metric])}" r="3.5" tabindex="0"><title>${item.year} · ${config.format(item[metric])}</title></circle>`).join("");

    $("#chart-wrap").innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${config.label}, scénario comparé à la référence de 2026 à 2035">
        ${grid}${ruleLine}
        <path class="chart-band" d="${top} ${bottom} Z" />
        <path class="chart-baseline" d="${path(baseline, (item) => item[metric])}" />
        <path class="chart-scenario" d="${path(scenario, (item) => item[metric])}" />
        ${points}${years}
      </svg>
      <div class="chart-tooltip"></div>
    `;
    $("#chart-caption").textContent = `${config.label} · ${config.unit}. Bande de sensibilité du modèle « ${D.models[state.model].label} », ajustée au cycle, à la BCE et à la confiance.`;

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
    const euStatus = $("#eu-status");
    const euDetail = $("#eu-detail");
    if (["breach", "euroExit"].includes(state.euMode)) {
      euStatus.textContent = state.euMode === "euroExit" ? "Rupture majeure simulée" : "Contentieux probable";
      euDetail.textContent = D.euModes[state.euMode].description;
    } else if (point2029.deficitRatio <= 3) {
      euStatus.textContent = "Trajectoire 2029 compatible";
      euDetail.textContent = `Déficit simulé à ${percent(point2029.deficitRatio)} en 2029, sous le seuil de 3 %.`;
    } else {
      euStatus.textContent = "Objectif 2029 non atteint";
      euDetail.textContent = `Écart de ${fmt1.format(point2029.deficitRatio - 3)} point(s) au seuil de 3 % en 2029.`;
    }

    const uncertainty = effectiveProfile().uncertainty + D.euModes[state.euMode].uncertainty;
    $("#risk-status").textContent = uncertainty < 0.45 ? "Modérée" : uncertainty < 0.95 ? "Élevée" : "Très élevée";
    $("#risk-detail").textContent = `À dix ans, la dette centrale est ${percent(point2035.debtRatio)} avec une sensibilité d’environ ±${fmt1.format(point2035.bands.debtRatio)} points.`;

    const point = state.projection.scenario[2];
    const demand = Math.abs(point.demandContribution);
    const supply = Math.abs(point.supplyContribution);
    const interest = Math.abs(point.extraInterest);
    if (!Object.keys(state.changes).length && state.euMode === "current") {
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
    const index = ({ 1: 0, 3: 2, 5: 4, 10: 9 })[state.horizon];
    const colors = ["#4055bf", "#d85e55", "#168b80", "#7d62c7", "#d89a38"];
    const rows = Object.entries(D.models).map(([id, model], modelIndex) => {
      const point = calculateProjection(id).scenario[index];
      const growthWidth = clamp((point.growth + 1.5) / 4 * 100, 4, 100);
      const deficitWidth = clamp(point.deficitRatio / 8 * 100, 4, 100);
      const debtWidth = clamp((point.debtRatio - 80) / 70 * 100, 4, 100);
      return `
        <div class="comparison-row ${id === state.model ? "is-selected" : ""}" style="--model-color:${colors[modelIndex]}">
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
    if (!delta) return `×${fmt1.format(category.multiplier)}`;
    const profile = effectiveProfile();
    const impact = categoryPolicyImpact(category, delta, 2, 1.05, profile);
    const value = impact.demand + impact.supply;
    return `PIB ${signed(value, " Md€")}`;
  }

  function renderCategories() {
    const isSpending = state.activeBudget === "spending";
    const categories = isSpending ? D.spending : D.revenue;
    const groups = isSpending ? D.spendingGroups : D.revenueGroups;
    const query = state.search.trim().toLocaleLowerCase("fr");
    const matching = categories.filter((category) => !query || category.label.toLocaleLowerCase("fr").includes(query) || category.id.toLowerCase().includes(query));
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
        const impact = categoryPolicyImpact(category, change, 2, 1.05, effectiveProfile());
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
    $("#category-list").innerHTML = html || `<div class="empty-state">Aucun poste ne correspond à « ${escapeHtml(state.search)} ».</div>`;
    $("#editor-footnote").textContent = isSpending
      ? "Détail COFOG 2024 provisoire, recalé proportionnellement sur le total Insee 2025. La charge de la dette est calculée par le moteur."
      : "Recettes observées en 2025 dans les comptes nationaux Insee. Certains sous-postes sont des regroupements pour éviter les doubles comptes.";
  }

  function renderCategoryRow(category) {
    const delta = changeFor(category.id);
    const limit = Math.max(10, Math.ceil(Math.abs(category.value) * 0.7 / 5) * 5);
    const newValue = category.value + delta;
    const effect = categoryEffectLabel(category, delta);
    let effectClass = "";
    if (delta) {
      const numerical = Number(effect.match(/[−+]?([0-9]+(?:,[0-9]+)?)/)?.[0]?.replace("−", "-").replace(",", ".") || 0);
      effectClass = numerical > 0 ? "good" : numerical < 0 ? "bad" : "";
    }
    return `
      <div class="category-row" data-category="${category.id}">
        <div class="category-name"><strong>${category.label}</strong><small>${category.id} · ${category.observedYear === 2025 ? "observé 2025" : "calibré 2025"}</small></div>
        <div class="value-cell">${money(category.value)}</div>
        <div class="change-control">
          ${category.locked
            ? `<span class="locked-note">calculé automatiquement</span>`
            : `<input type="range" min="${-limit}" max="${limit}" step="0.5" value="${delta}" data-range="${category.id}" aria-label="Variation de ${category.label}" />
               <input type="number" min="${-limit}" max="${limit}" step="0.5" value="${delta}" data-number="${category.id}" aria-label="Variation en milliards d’euros de ${category.label}" />`}
        </div>
        <div class="new-value ${delta ? "changed" : ""}">${money(newValue)}</div>
        <div class="effect-cell ${effectClass}">${effect}</div>
      </div>
    `;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  function resetScenario() {
    pushUndo();
    state.changes = {};
    state.model = "consensus";
    state.euMode = "current";
    state.cycle = "normal";
    state.monetary = "neutral";
    state.confidence = "stable";
    $("#model-select").value = state.model;
    $("#eu-select").value = state.euMode;
    $("#cycle-select").value = state.cycle;
    $("#monetary-select").value = state.monetary;
    $("#confidence-select").value = state.confidence;
    updateModelDescription();
    updateAssumptionDescription();
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
    $("#model-select").value = state.model;
    $("#eu-select").value = state.euMode;
    $("#cycle-select").value = state.cycle;
    $("#monetary-select").value = state.monetary;
    $("#confidence-select").value = state.confidence;
    $("#undo-button").disabled = state.undoStack.length === 0;
    updateModelDescription();
    updateAssumptionDescription();
    refreshAll(true);
  }

  function saveScenario() {
    state.name = $("#scenario-name").value.trim() || "Mon scénario";
    try {
      localStorage.setItem("ecosim-france-scenario", JSON.stringify(serializableState()));
      showToast("Scénario sauvegardé dans ce navigateur");
    } catch (error) {
      showToast("La sauvegarde locale est indisponible");
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
    [["cycle-select", "cycle"], ["monetary-select", "monetary"], ["confidence-select", "confidence"]].forEach(([elementId, key]) => {
      $(`#${elementId}`).addEventListener("change", (event) => {
        pushUndo();
        state[key] = event.target.value;
        updateAssumptionDescription();
        refreshAll(true);
      });
    });
    $("#scenario-name").addEventListener("input", (event) => { state.name = event.target.value; });
    $("#preset-list").addEventListener("click", (event) => {
      const preset = event.target.closest("[data-preset]");
      if (preset) applyPreset(preset.dataset.preset);
    });
    $("#reset-button").addEventListener("click", resetScenario);
    $("#undo-button").addEventListener("click", undo);
    $("#save-button").addEventListener("click", saveScenario);
    $$("[data-horizon]").forEach((button) => button.addEventListener("click", () => {
      state.horizon = Number(button.dataset.horizon);
      $$("[data-horizon]").forEach((item) => item.classList.toggle("is-active", item === button));
      updateResults();
      renderModelComparison();
    }));
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
      state.collapsed.clear();
      renderCategories();
    });
    $("#method-modal-button").addEventListener("click", () => $("#method-dialog").showModal());
    $("#export-button").addEventListener("click", () => $("#export-dialog").showModal());
    $("#export-dialog").addEventListener("click", (event) => {
      const option = event.target.closest("[data-export]");
      if (!option) return;
      exportScenario(option.dataset.export);
      $("#export-dialog").close();
    });
    $$("[data-scroll]").forEach((button) => button.addEventListener("click", () => {
      $(`#${button.dataset.scroll}`)?.scrollIntoView({ behavior: "smooth" });
    }));
    $("#theme-toggle").addEventListener("click", () => {
      const current = document.documentElement.dataset.theme;
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("ecosim-theme", next);
      renderChart();
    });
  }

  function initTheme() {
    const saved = localStorage.getItem("ecosim-theme");
    if (saved) document.documentElement.dataset.theme = saved;
  }

  loadInitialState();
  initTheme();
  initializeControls();
  bindEvents();
  renderCategories();
  refreshAll(false);
})();
