/*
 * France, comptes APU et macroéconomie, millésime consulté le 10 octobre 2026.
 * Eurostat : nama_10_gdp (B1GQ, CP_MEUR et CLV_PCH_PRE), gov_10a_main (B9, PC_GDP),
 * gov_10dd_edpt1 (GD, PC_GDP), une_rt_a (Y15-74, PC_ACT).
 * https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/
 * Les chiffres révisés ne sont PAS des millésimes disponibles à chaque origine.
 */
window.ECOSIM_HISTORY = (() => {
  const rows = [
    [2003,1622.3,4.1,65.4,8.5,1.0],[2004,1696.1,3.6,66.9,8.9,2.9],
    [2005,1762.0,3.5,68.2,8.9,1.9],[2006,1846.0,2.7,65.4,8.9,2.7],
    [2007,1937.9,3.0,65.5,8.0,2.5],[2008,1990.0,3.5,69.8,7.4,0.4],
    [2009,1935.8,7.4,84.1,9.1,-2.8],[2010,1996.1,7.2,86.3,9.3,2.0],
    [2011,2062.1,5.3,88.7,9.2,2.4],[2012,2088.3,5.2,91.7,9.8,0.2],
    [2013,2120.4,4.9,94.6,10.3,0.8],[2014,2153.7,4.6,96.2,10.3,1.0],
    [2015,2201.4,3.9,97.0,10.4,1.1],[2016,2231.8,3.8,98.1,10.1,0.9],
    [2017,2291.7,3.4,98.8,9.4,2.1],[2018,2355.4,2.3,98.5,9.1,1.6],
    [2019,2432.2,2.4,98.2,8.5,2.0],[2020,2318.3,8.9,114.9,8.1,-7.4],
    [2021,2508.1,6.6,112.8,7.9,6.9],[2022,2654.0,4.7,111.4,7.3,2.7],
    [2023,2833.8,5.4,109.5,7.4,1.6],[2024,2935.2,5.8,112.6,7.4,1.5],
    [2025,2991.1,5.1,115.6,7.7,0.8]
  ].map(([year,gdp,deficitRatio,debtRatio,unemployment,realGrowth]) =>
    Object.freeze({year,gdp,deficitRatio,debtRatio,unemployment,realGrowth}));

  const horizons = [1,3,5,10];
  const metrics = ["gdpPct","deficitRatio","debtRatio","unemployment"];
  const median = (values) => {
    const sorted = [...values].sort((a,b) => a-b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
  };
  const quantile80 = (values) => {
    const sorted = [...values].sort((a,b) => a-b);
    return sorted[Math.ceil(sorted.length * 0.8)-1];
  };

  // Prévision témoin figée avant la cible : médiane de 5 croissances nominales,
  // déficit et chômage persistants, dette = stock initial + déficits futurs.
  function forecast(observations, originYear, horizon) {
    if (!Number.isInteger(horizon) || horizon < 1) throw new Error("Horizon invalide");
    const past = observations.filter((row) => row.year <= originYear);
    if (past.length < 5 || past.at(-1).year !== originYear) throw new Error("Historique insuffisant");
    const current = past.at(-1);
    const growths = past.slice(1).map((row,index) => row.gdp / past[index].gdp - 1);
    const nominalGrowth = median(growths.slice(-5));
    let gdp = current.gdp;
    let debt = current.gdp * current.debtRatio / 100;
    for (let year = 0; year < horizon; year += 1) {
      gdp *= 1 + nominalGrowth;
      debt += gdp * current.deficitRatio / 100;
    }
    return {gdp,deficitRatio:current.deficitRatio,debtRatio:debt / gdp * 100,unemployment:current.unemployment};
  }

  function backtest(observations = rows) {
    const result = {};
    for (const horizon of horizons) {
      const errors = Object.fromEntries(metrics.map((metric) => [metric,[]]));
      const cases = [];
      for (const origin of observations) {
        if (origin.year < 2007) continue;
        const observed = observations.find((row) => row.year === origin.year + horizon);
        if (!observed) continue;
        const predicted = forecast(observations, origin.year, horizon);
        const error = {
          gdpPct: Math.abs(predicted.gdp / observed.gdp - 1) * 100,
          deficitRatio: Math.abs(predicted.deficitRatio - observed.deficitRatio),
          debtRatio: Math.abs(predicted.debtRatio - observed.debtRatio),
          unemployment: Math.abs(predicted.unemployment - observed.unemployment)
        };
        for (const metric of metrics) errors[metric].push(error[metric]);
        cases.push({origin:origin.year,target:observed.year,error});
      }
      result[horizon] = {n:cases.length,cases,
        metrics:Object.fromEntries(metrics.map((metric) => [metric,{
          mae:errors[metric].reduce((sum,value) => sum+value,0) / errors[metric].length,
          p80:quantile80(errors[metric])
        }]))};
    }
    return result;
  }

  const report = backtest();
  const envelope = (metric, horizon) => Math.max(...horizons.filter((value) => value <= horizon)
    .map((value) => report[value].metrics[metric].p80));
  function stressFloor(metric, horizon) {
    if (!metrics.includes(metric) || horizon < 1) throw new Error("Métrique ou horizon invalide");
    if (horizon >= 10) return envelope(metric, 10) * horizon / 10;
    const upper = horizons.find((value) => value >= horizon);
    if (upper === horizon) return envelope(metric, upper);
    const lower = horizons[horizons.indexOf(upper)-1];
    const low = envelope(metric, lower);
    const high = envelope(metric, upper);
    return low + (high-low) * (horizon-lower)/(upper-lower);
  }

  return {rows,horizons,forecast,backtest,report,stressFloor,
    source:"Eurostat, séries révisées 2003–2025, extraction du 10 octobre 2026"};
})();
