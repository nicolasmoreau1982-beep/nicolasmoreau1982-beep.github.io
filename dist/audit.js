(() => {
  const body = document.getElementById("backtest-body");
  const history = window.ECOSIM_HISTORY;
  if (!body || !history) {
    if (body) body.textContent = "Historique indisponible.";
    return;
  }

  const format = (number) => number.toLocaleString("fr-FR", {minimumFractionDigits:2,maximumFractionDigits:2});
  const metrics = ["gdpPct","deficitRatio","debtRatio","unemployment"];
  body.replaceChildren(...history.horizons.map((horizon) => {
    const result = history.report[horizon];
    const row = document.createElement("tr");
    const heading = document.createElement("th");
    heading.scope = "row";
    heading.textContent = `${horizon} an${horizon > 1 ? "s" : ""}`;
    row.append(heading);
    const cases = document.createElement("td");
    cases.textContent = String(result.n);
    row.append(cases);
    for (const metric of metrics) {
      const cell = document.createElement("td");
      const values = result.metrics[metric];
      cell.textContent = `${format(values.mae)} / ${format(values.p80)}`;
      row.append(cell);
    }
    return row;
  }));
})();

(() => {
  const data = window.ECOSIM_HISTORICAL_AUDIT?.comparableInsee;
  const caseSelect = document.getElementById("audit-comparable-case");
  const yearSelect = document.getElementById("audit-comparable-year");
  const results = document.getElementById("audit-comparable-results");
  if (!caseSelect || !yearSelect || !results) return;
  if (!data?.cases?.length) {
    results.replaceChildren(Object.assign(document.createElement("tr"), {textContent: "Banc Insee indisponible."}));
    return;
  }
  const originTitle = document.getElementById("audit-comparable-origin-title");
  const originBody = document.getElementById("audit-comparable-origin");
  const assumptions = document.getElementById("audit-comparable-assumptions");
  const policyTitle = document.getElementById("audit-comparable-policy-title");
  const policyList = document.getElementById("audit-comparable-policies");
  const missingList = document.getElementById("audit-comparable-missing");
  const caption = document.getElementById("audit-comparable-caption");
  const summary = document.getElementById("audit-comparable-summary");
  const number = (value, digits = 1) => value.toLocaleString("fr-FR", {minimumFractionDigits: digits, maximumFractionDigits: digits});
  const signed = (value, digits = 1) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${number(Math.abs(value), digits)}`;
  const node = (tag, content) => Object.assign(document.createElement(tag), {textContent: content});
  const appendSource = (item, source) => {
    if (!source) return;
    const link = node("a", "Source ↗");
    link.href = source;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    item.append(document.createTextNode(" · "), link);
  };
  const caseOptions = data.cases.map((item) => {
    const option = node("option", `${item.originYear} · ${item.name}`);
    option.value = item.id;
    return option;
  });
  caseSelect.replaceChildren(...caseOptions);
  const populateYears = () => {
    const selected = data.cases.find((item) => item.id === caseSelect.value);
    yearSelect.replaceChildren(...selected.rows.map((row) => {
      const option = node("option", `${row.year} · T+${row.year - selected.originYear}`);
      option.value = String(row.year);
      return option;
    }));
    render();
  };
  const render = () => {
    const selected = data.cases.find((item) => item.id === caseSelect.value);
    const row = selected?.rows.find((item) => String(item.year) === yearSelect.value);
    if (!row) return;
    originTitle.textContent = `${selected.originYear} · comptes de départ`;
    const originFields = [["PIB", selected.origin.gdp], ["Dépenses", selected.origin.spending],
      ["Recettes", selected.origin.revenue], ["Dette", selected.origin.debt]];
    originBody.replaceChildren(...originFields.flatMap(([label, value]) => [node("dt", label), node("dd", `${number(value)} Md€`)]));
    assumptions.textContent = `Hypothèses à T : croissance nominale ${number(selected.origin.assumedNominalGrowth * 100, 2)} %, croissance du déflateur du PIB ${number(selected.origin.assumedInflation * 100, 2)} %, croissance réelle des dépenses ${number(selected.origin.assumedRealSpendingGrowth * 100, 2)} % ; tendances estimées sur ${selected.origin.trainingYears[0]}–${selected.origin.trainingYears.at(-1)}.`;
    policyTitle.textContent = `${row.predicted.applied.length} mesure${row.predicted.applied.length > 1 ? "s" : ""} injectée${row.predicted.applied.length > 1 ? "s" : ""} en ${row.year}`;
    policyList.replaceChildren(...(row.predicted.applied.length ? row.predicted.applied.map((policy) => {
      const side = policy.fiscalSide === "revenue" ? "recettes" : policy.fiscalSide === "spending" ? "dépenses" : "budget";
      const item = node("li", `${policy.label} · variation directe ${signed(policy.directBn)} Md€ de ${side} · ${policy.amountStatus.replaceAll("_", " ")}`);
      appendSource(item, policy.source);
      const scope = policy.effectScope === "fiscal_and_macro_variant" ? "Canal macro TVA repris de Mésange." : "Effet sur le PIB et l’emploi non estimé.";
      item.append(node("small", `${scope} ${policy.warning || ""}`));
      return item;
    }) : [node("li", "Aucune mesure chiffrée injectée : cela ne signifie pas qu’aucune politique n’a été appliquée.")]));
    missingList.replaceChildren(...(row.uncovered.length ? row.uncovered.map((missing) => {
      const item = node("li", `${missing.label} : ${missing.reason}`);
      appendSource(item, missing.source);
      return item;
    }) : [node("li", "Aucun manque chiffré dans cet inventaire partiel ; les autres politiques et chocs ne sont pas garantis couverts.")]));
    caption.textContent = `${selected.originYear} → ${row.year} · prototype historique moins comptes Insee, gel ${data.sourceVintage}`;
    const metrics = [
      ["PIB nominal", row.observed.gdp, row.predicted.gdp, row.error.gdpPct, "Md€", "% du PIB observé"],
      ["Dépenses", row.observed.spending, row.predicted.spending, row.error.spendingBn, "Md€", "Md€"],
      ["Recettes", row.observed.revenue, row.predicted.revenue, row.error.revenueBn, "Md€", "Md€"],
      ["Déficit / PIB", row.observed.deficit / row.observed.gdp * 100,
        row.predicted.deficit / row.predicted.gdp * 100, row.error.deficitRatio, "%", "pt"],
      ["Dette / PIB", row.observed.debt / row.observed.gdp * 100,
        row.predicted.debt / row.predicted.gdp * 100, row.error.debtRatio, "%", "pt"]
    ];
    results.replaceChildren(...metrics.map(([label, observed, predicted, error, unit, errorUnit]) => {
      const line = document.createElement("tr");
      const heading = node("th", label);
      heading.scope = "row";
      line.append(heading, node("td", `${number(observed)} ${unit}`),
        node("td", `${number(predicted)} ${unit}`), node("td", `${signed(error, 2)} ${errorUnit}`));
      return line;
    }));
    summary.textContent = `Ce cas est incomplet et inéligible à la validation de l’effet des politiques. Ajustement stock-flux observé de la dette : ${signed(row.observed.observedStockFlow)} Md€ (tableau Insee 3.105 : ${row.observed.officialStockFlow === null ? "indisponible" : `${signed(row.observed.officialStockFlow)} Md€`}). Aucun intervalle statistique ni score du moteur principal n’est déduit de ces cinq écarts.`;
  };
  caseSelect.addEventListener("change", populateYears);
  yearSelect.addEventListener("change", render);
  populateYears();
})();

(() => {
  const data = window.ECOSIM_HISTORICAL_AUDIT;
  if (!data?.population || !data?.labour || !data?.tes) return;
  const format = (value, digits = 1) => value.toLocaleString("fr-FR", {minimumFractionDigits: digits, maximumFractionDigits: digits});
  const cell = (tag, content) => {const element = document.createElement(tag); element.textContent = content; return element;};
  const table = (id, rows) => {
    const body = document.getElementById(id);
    if (!body) return;
    body.replaceChildren(...rows.map((values) => {
      const tr = document.createElement("tr");
      tr.append(...values.map((value, index) => cell(index === 0 ? "th" : "td", value)));
      tr.firstChild.scope = "row";
      return tr;
    }));
  };
  table("audit-population-body", data.population.rows.map((row) => [String(row.year),
    format(row.populationM, 2), format(row.age65SharePct, 1), format(row.age80M, 2),
    format(row.birthsK, 0), format(row.deathsK, 0)]));
  table("audit-labour-body", [...data.labour.ages.map((row) => [row.age,
    format(row.unemployedK), format(row.haloK), format(row.underemployedK)]),
  ["Total", format(data.labour.totals.unemployedK), format(data.labour.totals.haloK),
    format(data.labour.totals.underemployedK)]]);
  table("audit-diploma-body", [...data.labour.diplomas.map((row) => [row.diploma, format(row.unemployedK)]),
    ["Diplôme non renseigné", format(data.labour.unemployedDiplomaUnknownK)]]);
  table("audit-tes-body", data.tes.rows.map((row) => [row.label, format(row.domesticProductionBn),
    format(row.importsBn), format(row.importShareOfProductResourcesPct)]));
})();

(() => {
  const data = window.ECOSIM_HISTORICAL_AUDIT;
  const frequencySelect = document.getElementById("audit-frequency");
  const originSelect = document.getElementById("audit-origin");
  const metricSelect = document.getElementById("audit-metric");
  const body = document.getElementById("audit-year-body");
  const caption = document.getElementById("audit-year-caption");
  const summary = document.getElementById("audit-year-summary");
  const quarterLedger = document.getElementById("audit-quarter-ledger");
  const quarterBody = document.getElementById("audit-quarter-body");
  const quarterMetric = document.getElementById("audit-quarter-metric");
  const quarterCaption = document.getElementById("audit-quarter-caption");
  const quarterSummary = document.getElementById("audit-quarter-summary");
  if (!body || !frequencySelect || !originSelect || !metricSelect || !caption || !summary || !quarterLedger || !quarterBody || !quarterMetric || !quarterCaption || !quarterSummary) return;
  if (!data || data.status !== "incomplete") {
    body.textContent = "Données du rejeu indisponibles.";
    return;
  }
  const metrics = {
    deficitRatio: {label: "Déficit / PIB", unit: "pt", error: "deficitRatio"},
    debtRatio: {label: "Dette / PIB", unit: "pt", error: "debtRatio"},
    spending: {label: "Dépenses", unit: "Md€", error: "spendingBn"},
    revenue: {label: "Recettes", unit: "Md€", error: "revenueBn"},
    gdp: {label: "PIB nominal", unit: "Md€", error: "gdpPct"},
    unemployment: {label: "Chômage", unit: "pt", error: "unemployment"}
  };
  const format = (value) => value.toLocaleString("fr-FR", {minimumFractionDigits: 1, maximumFractionDigits: 1});
  const cell = (tag, value) => { const node = document.createElement(tag); node.textContent = value; return node; };
  const render = () => {
    const frequency = frequencySelect.value;
    const trajectories = frequency === "quarterly" ? data.quarterlyTrajectories : data.trajectories;
    const trajectory = trajectories?.find((item) => String(item.originYear) === originSelect.value);
    const metric = metrics[metricSelect.value];
    if (!trajectory || !metric) return;
    caption.textContent = `${metric.label} : observé, simulé et écart annuel (calcul ${frequency === "quarterly" ? "trimestriel" : "annuel"})`;
    body.replaceChildren(...trajectory.annual.map((row) => {
      const tr = document.createElement("tr");
      const observed = row.observed[metricSelect.value];
      const simulated = row.prediction[metricSelect.value];
      const difference = metricSelect.value === "gdp" ? simulated - observed : row.error[metric.error];
      tr.append(cell("th", String(row.year)), cell("td", `${format(observed)} ${metric.unit}`),
        cell("td", `${format(simulated)} ${metric.unit}`),
        cell("td", `${difference > 0 ? "+" : ""}${format(difference)} ${metric.unit}`));
      tr.firstChild.scope = "row";
      return tr;
    }));
    const mae = trajectory.summary.mae[metric.error];
    const maeUnit = metricSelect.value === "gdp" ? "% du PIB observé" : metric.unit;
    summary.textContent = `Départ ${trajectory.originYear} · ${trajectory.annual.length} années · erreur absolue moyenne : ${format(mae)} ${maeUnit}. Les origines se chevauchent et la couverture des politiques est incomplète.`;
    quarterLedger.hidden = frequency !== "quarterly";
    if (frequency === "quarterly") {
      const chosen = quarterMetric.value;
      const qLabel = {gdp: "PIB nominal", spending: "Dépenses", revenue: "Recettes", deficit: "Déficit"}[chosen];
      quarterCaption.textContent = `${qLabel} trimestriel en Md€ : observé Insee, simulé, écart`;
      quarterBody.replaceChildren(...(trajectory.quarters || []).map((row) => {
        const tr = document.createElement("tr");
        const observed = row.observed?.[chosen];
        const simulated = row.prediction[chosen];
        const difference = observed === undefined ? null : simulated - observed;
        tr.append(cell("th", `${row.year} · T${row.quarter}`),
          cell("td", observed === undefined ? "—" : format(observed)),
          cell("td", format(simulated)),
          cell("td", difference === null ? "—" : `${difference > 0 ? "+" : ""}${format(difference)}`));
        tr.firstChild.scope = "row";
        return tr;
      }));
      const comparable = (trajectory.quarters || []).filter((row) => row.observed?.[chosen] !== undefined);
      const mae = comparable.reduce((total, row) => total + Math.abs(row.prediction[chosen] - row.observed[chosen]), 0) / comparable.length;
      quarterSummary.textContent = `${comparable.length} trimestres observés · écart absolu moyen ${format(mae)} Md€. Cible Insee CVS-CJO ; trajectoire simulée incomplète, non validée causalement.`;
    }
  };
  frequencySelect.addEventListener("change", render);
  originSelect.addEventListener("change", render);
  metricSelect.addEventListener("change", render);
  quarterMetric.addEventListener("change", render);
  render();
})();

(() => {
  const data = window.ECOSIM_HISTORICAL_AUDIT;
  const select = document.getElementById("audit-subsector-year");
  const body = document.getElementById("audit-subsector-body");
  const note = document.getElementById("audit-subsector-note");
  if (!data?.subsectors || !select || !body || !note) return;
  const format = (value) => value.toLocaleString("fr-FR", {minimumFractionDigits: 1, maximumFractionDigits: 1});
  select.replaceChildren(...data.subsectors.slice().reverse().map((row) => {
    const option = document.createElement("option");
    option.value = String(row.year);
    option.textContent = String(row.year);
    return option;
  }));
  const cell = (tag, content) => {const element = document.createElement(tag); element.textContent = content; return element;};
  const render = () => {
    const row = data.subsectors.find((item) => String(item.year) === select.value);
    if (!row) return;
    const sectors = [["État", row.state], ["Organismes centraux (ODAC)", row.centralAgencies],
      ["Administrations locales", row.local], ["Sécurité sociale", row.socialSecurity],
      ["APU consolidées", row.consolidated]];
    body.replaceChildren(...sectors.map(([label, values]) => {
      const tr = document.createElement("tr");
      tr.append(cell("th", label), cell("td", format(values.spending)),
        cell("td", format(values.revenue)), cell("td", format(values.spending - values.revenue)));
      tr.firstChild.scope = "row";
      return tr;
    }));
    const reconciliation = data.sourceReconciliation.find((item) => item.year === row.year);
    const annualGap = reconciliation?.subsectorMinusAnnual?.spending ?? 0;
    note.textContent = `Transferts internes retranchés : ${format(row.intraGovernmentTransfersSpending)} Md€ côté dépenses et ${format(row.intraGovernmentTransfersRevenue)} Md€ côté recettes. Écart 3.215 − 3.201 sur les dépenses : ${format(annualGap)} Md€ ; résidu de consolidation : ${format(row.consolidationResidual)} Md€. Ces écarts publiés ne sont pas corrigés artificiellement.`;
  };
  select.addEventListener("change", render);
  render();
})();
