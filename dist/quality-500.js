/* EcoSim 5.0 : revue heuristique des risques de recouvrement entre leviers.
 * Ces alertes ne démontrent PAS qu'un montant est effectivement compté deux fois.
 * Elles ne changent jamais l'état ni le moteur macroéconomique.
 */
window.ECOSIM_QUALITY = (() => {
  "use strict";
  const has = (obj, key) => Object.hasOwn(obj || {}, key);
  const nonZero = (obj, key, reference = 0) =>
    Number.isFinite(Number(obj?.[key])) && Math.abs(Number(obj[key]) - reference) > 1e-6;
  const sector = (state, ...keys) => (state.sectoral || []).some(row => keys.includes(row.sector));
  const policy = (state, key, data) =>
    nonZero(state.engines, key, data?.policyEngines?.controls?.[key]?.value ?? 0);
  const structural = (state, key, data) =>
    nonZero(state.structural, key, data?.structural?.controls?.[key]?.value ?? 0);
  function inspect(state = {}, data = {}) {
    const alerts = [];
    const add = (code, title, reason, paths) => alerts.push({code, title, reason, paths, severity:"à vérifier"});
    const sec = state.sectoral || [];
    const counts = {};
    for (const row of sec) counts[row.sector] = (counts[row.sector] || 0) + 1;
    for (const [key, count] of Object.entries(counts)) {
      if (count > 1) add("same-sector-"+key,"Plusieurs mesures sur une même filière", `${count} mesures visent la filière ${data?.sectoral?.sectors?.[key]?.label || key}. Vérifier que leurs assiettes et bénéficiaires sont distincts.`,["sectoral"]);
    }
    if (sector(state,"renewables") && structural(state,"renewables",data))
      add("enr","Renouvelables financés dans deux modules","Les GW structurels et les aides sectorielles pourraient renvoyer aux mêmes projets ; les GW ne sont pas automatiquement causés par les aides.",["structural","sectoral"]);
    if (sector(state,"nuclear") && structural(state,"nuclear",data))
      add("nuclear","Nucléaire financé dans deux modules","Le financement fiscal et l'ajout de capacité nucléaire doivent correspondre à des hypothèses distinctes ou être explicitement liés.",["structural","sectoral"]);
    if (sector(state,"building") && (structural(state,"efficiency",data) || nonZero(state.changes,"GF0601")))
      add("building","Rénovation du bâtiment dans plusieurs leviers","Vérifier si la subvention sectorielle, la rénovation structurelle et les dépenses de logement couvrent la même enveloppe.",["structural","budget","sectoral"]);
    if (sector(state,"transit","automotive") && (policy(state,"transportInfrastructure",data) || nonZero(state.changes,"GF0405")))
      add("transport","Transports dans plusieurs moteurs","Vérifier la séparation des investissements budgétaires et des aides sectorielles.",["budget","engines","sectoral"]);
    if (sector(state,"fossil") && structural(state,"carbonTax",data))
      add("carbon","Prélèvements fossiles et carbone","Le signal-prix carbone et un prélèvement sectoriel peuvent viser les mêmes assiettes ; les identifier.",["structural","sectoral"]);
    if (sec.some(row => row.instrument === "credit" || row.instrument === "levy") && nonZero(state.changes,"R_IS"))
      add("corporate-tax","Fiscalité des entreprises à deux niveaux","La variation globale d'IS et les crédits/prélèvements sectoriels peuvent avoir des assiettes communes.",["budget","sectoral"]);
    if (sector(state,"health") && (policy(state,"healthWorkforce",data) || nonZero(state.changes,"GF0703")))
      add("health","Santé dans plusieurs modules","Vérifier que les recrutements hospitaliers et les dépenses de santé ne comprennent pas la même enveloppe de soutien sectoriel.",["engines","budget","sectoral"]);
    if (policy(state,"childcarePlaces",data) && (nonZero(state.changes,"GF1004") || nonZero(state.changes,"GF0901")))
      add("childcare","Petite enfance et dépenses sociales/éducatives","Vérifier que les coûts de places de garde ne sont pas également ajoutés aux catégories budgétaires générales.",["budget","engines"]);
    return {count: alerts.length, alerts, note:"Détection indicative à partir des curseurs actifs : aucune correction ou déduction automatique n'est effectuée."};
  }
  return Object.freeze({inspect});
})();
