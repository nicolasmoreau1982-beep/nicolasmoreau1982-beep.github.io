/*
 * EcoSim France — jeu de données embarqué.
 *
 * Les montants de dépenses fonctionnelles détaillées viennent de la COFOG
 * Eurostat 2024 (millions d'euros) et sont recalés sur le total Insee 2025.
 * Les recettes viennent des comptes des APU Insee 2025, base 2020.
 */

window.ECOSIM_DATA = (() => {
  const BASE = {
    year: 2025,
    gdp: 2991.1,
    spending: 1714.1117,
    revenue: 1562.5197,
    deficit: 151.592,
    debt: 3460.5,
    debtRatio: 115.6,
    deficitRatio: 5.1,
    growth: 0.8,
    inflation: 0.9,
    unemployment: 7.9,
    unit: "Md€"
  };

  const sources = [
    {
      id: "cor-2026",
      publisher: "COR",
      title: "Évolutions et perspectives des retraites",
      date: "juin 2026",
      url: "https://www.cor-retraites.fr/rapports-du-cor/rapport-annuel-cor-juin-2026-evolutions-perspectives-retraites-france",
      note: "Hypothèses démographiques, dépenses, ressources et solde du système de retraite."
    },
    {
      id: "drees-health-2024",
      publisher: "DREES",
      title: "Les dépenses de santé en 2024",
      date: "septembre 2025",
      url: "https://data.drees.solidarites-sante.gouv.fr/explore/dataset/comptes_de_la_sante_partage_volume_prix/table/",
      note: "Comptes de la santé et 8,7 Md€ de dépenses de prévention en 2024."
    },
    {
      id: "education-2024",
      publisher: "DEPP",
      title: "La dépense intérieure d’éducation en 2024",
      date: "23 septembre 2025",
      url: "https://www.education.gouv.fr/depp/en-2024-1971-milliards-d-euros-consacres-l-education-soit-68-du-pib-452853",
      note: "197,1 Md€, soit 6,8 % du PIB ; coût par élève et répartition des financeurs."
    },
    {
      id: "housing-2025",
      publisher: "SDES",
      title: "Rapport du compte du logement 2025",
      date: "14 septembre 2026",
      url: "https://www.statistiques.developpement-durable.gouv.fr/rapport-du-compte-du-logement-2025?dossier=1055&rubrique=",
      note: "621 Md€ de dépense de logement et construction neuve toujours dégradée en 2025."
    },
    {
      id: "trade-2025",
      publisher: "Insee",
      title: "Solde des échanges extérieurs en 2025",
      date: "29 mai 2026",
      url: "https://www.insee.fr/fr/statistiques/2830252",
      note: "Solde extérieur de −14,4 Md€ : énergie −44,4 Md€, services +60,6 Md€."
    },
    {
      id: "productivity-2026",
      publisher: "Insee",
      title: "Les gains de productivité français",
      date: "juin 2026",
      url: "https://blog.insee.fr/les-gains-de-productivite-francais-en-partie-retrouves/",
      note: "Productivité encore sous sa tendance d’avant-crise et retard manufacturier de 5,6 points en 2025."
    },
    {
      id: "climate-2025",
      publisher: "Ministère de la Transition écologique",
      title: "Baromètre des émissions 2025",
      date: "13 janvier 2026",
      url: "https://www.ecologie.gouv.fr/presse/barometre-citepa-baisse-emissions-gaz-effet-serre-france-se-poursuit-2025-laction-climatique",
      note: "Estimation de 363,4 MtCO₂e hors puits en 2025 ; baisse annuelle estimée à 1,6 %."
    },
    {
      id: "public-service-2025",
      publisher: "DGAFP",
      title: "Rapport annuel sur l’état de la fonction publique",
      date: "23 octobre 2025",
      url: "https://www.fonction-publique.gouv.fr/toutes-les-publications/rapport-annuel-sur-letat-de-la-fonction-publique-edition-2025",
      note: "Effectifs, rémunérations, temps de travail, mobilité et santé des trois versants."
    },
    {
      id: "poverty-2024",
      publisher: "Insee",
      title: "Pauvreté et redistribution",
      date: "9 juillet 2026",
      url: "https://www.insee.fr/fr/statistiques/5759045",
      note: "Taux de pauvreté de 15,4 % en 2024 ; les prestations le réduisent de 6,9 points."
    },
    {
      id: "insee-demography-2025",
      publisher: "Insee",
      title: "Bilan démographique 2025",
      date: "janvier 2026",
      url: "https://www.insee.fr/fr/statistiques/8719824",
      note: "69,1 millions d’habitants au 1er janvier 2026, 645 000 naissances, fécondité à 1,56 et 22 % de 65 ans ou plus."
    },
    {
      id: "insee-immigrant-employment",
      publisher: "Insee",
      title: "Emploi des immigrés en 2025",
      date: "22 juin 2026",
      url: "https://www.insee.fr/fr/statistiques/4195420",
      note: "Taux d’emploi observé de 61,9 % pour les immigrés de 15 à 64 ans ; résultats très variables selon âge, diplôme et durée de séjour."
    },
    {
      id: "interior-immigration-2025",
      publisher: "Ministère de l’Intérieur",
      title: "Titres de séjour en 2025",
      date: "juillet 2026",
      url: "https://www.immigration.interieur.gouv.fr/documentation/etudes-et-statistiques/titres-de-sejour-en-2025-protections-subsidiaires-ont-plus-que-double.html",
      note: "Primo-délivrances par motif. Un titre de séjour est un flux administratif, pas un solde migratoire."
    },
    {
      id: "oecd-fiscal-migration",
      publisher: "OCDE",
      title: "Impact budgétaire de l’immigration",
      date: "2021",
      url: "https://www.oecd.org/fr/publications/2021/10/international-migration-outlook-2021_ea4f9277/full-report/component-8.html",
      note: "Méthodes de ventilation des recettes et dépenses ; l’impact dépend d’abord de l’âge, de l’emploi, des salaires et des conventions comptables."
    },
    {
      id: "energy-balance-2024",
      publisher: "SDES",
      title: "Bilan énergétique de la France 2024",
      date: "4 mars 2026",
      url: "https://www.statistiques.developpement-durable.gouv.fr/bilan-energetique-de-la-france-pour-2024",
      note: "Indépendance énergétique de 61 % et facture énergétique extérieure de 57,7 Md€."
    },
    {
      id: "rte-2025",
      publisher: "RTE",
      title: "Bilan électrique 2025",
      date: "février 2026",
      url: "https://analysesetdonnees.rte-france.com/bilan-electrique-2025/synthese",
      note: "Production électrique, capacités, échanges et intensité carbone de 19,6 gCO₂e/kWh."
    },
    {
      id: "insee-accounts",
      publisher: "Insee",
      title: "Dépenses et recettes des administrations publiques en 2025",
      date: "28 août 2026",
      url: "https://www.insee.fr/fr/statistiques/8988845",
      note: "Comptes nationaux, base 2020 — totaux, recettes par nature et sous-secteurs."
    },
    {
      id: "insee-deficit",
      publisher: "Insee",
      title: "Déficit public 2025 : 5,1 % du PIB",
      date: "27 mars 2026",
      url: "https://www.insee.fr/fr/statistiques/8956575",
      note: "Déficit, dépenses, recettes et prélèvements obligatoires."
    },
    {
      id: "insee-gdp",
      publisher: "Insee",
      title: "Les comptes de la Nation en 2025",
      date: "29 mai 2026",
      url: "https://www.insee.fr/fr/statistiques/8996855",
      note: "PIB 2025 : 2 991,1 Md€ ; croissance en volume : 0,8 %."
    },
    {
      id: "insee-debt",
      publisher: "Insee",
      title: "Dette publique au quatrième trimestre 2025",
      date: "27 mars 2026",
      url: "https://www.insee.fr/fr/statistiques/8955019",
      note: "Dette de Maastricht : 3 460,5 Md€, soit 115,6 % du PIB."
    },
    {
      id: "eurostat-cofog",
      publisher: "Eurostat",
      title: "Dépenses publiques par fonction — COFOG",
      date: "mise à jour 16 septembre 2026",
      url: "https://ec.europa.eu/eurostat/databrowser/view/gov_10a_exp/default/table?lang=fr",
      note: "Dernier détail fonctionnel disponible pour la France : 2024, provisoire."
    },
    {
      id: "budget-2026",
      publisher: "Direction du Budget",
      title: "Les chiffres clés du budget de l’État pour 2026",
      date: "27 février 2026",
      url: "https://www.budget.gouv.fr/reperes/loi_de_finances/articles/chiffres-cles-budget-etat-2026",
      note: "LFI 2026 — périmètre État, distinct des administrations publiques."
    },
    {
      id: "bdf-forecast",
      publisher: "Banque de France",
      title: "Projections macroéconomiques intermédiaires — septembre 2026",
      date: "15 septembre 2026",
      url: "https://www.banque-france.fr/fr/publications-et-statistiques/publications/projections-macroeconomiques-intermediaires-septembre-2026",
      note: "Ancrage macroéconomique 2026–2028."
    },
    {
      id: "eu-edp",
      publisher: "Conseil de l’Union européenne",
      title: "Procédure concernant les déficits excessifs — France",
      date: "mise à jour 2026",
      url: "https://www.consilium.europa.eu/fr/policies/excessive-deficit-procedure/",
      note: "Fin du déficit excessif attendue en 2029 et plafonds de dépense nette."
    },
    {
      id: "ecb-multipliers",
      publisher: "BCE",
      title: "Comparing fiscal multipliers across models and countries in Europe",
      date: "mars 2015",
      url: "https://www.ecb.europa.eu/pub/pdf/scpwps/ecbwp1760.en.pdf",
      note: "Comparaison de quinze modèles macroéconomiques européens."
    },
    {
      id: "imf-france",
      publisher: "FMI",
      title: "The Impact of Coordinated Europe-Wide Fiscal Stimulus",
      date: "2009",
      url: "https://www.elibrary.imf.org/view/journals/002/2009/233/article-A003-en.xml",
      note: "Ordres de grandeur pour investissement, transferts ciblés et baisses d’impôts en France."
    }
  ];

  const spendingGroups = [
    { id: "GF01", label: "Services publics généraux", color: "#5067d9" },
    { id: "GF02", label: "Défense", color: "#40526e" },
    { id: "GF03", label: "Ordre et sécurité publics", color: "#8a5bc9" },
    { id: "GF04", label: "Affaires économiques", color: "#e09040" },
    { id: "GF05", label: "Environnement", color: "#2c9b73" },
    { id: "GF06", label: "Logement et équipements collectifs", color: "#21a7a1" },
    { id: "GF07", label: "Santé", color: "#d64d70" },
    { id: "GF08", label: "Culture, loisirs et cultes", color: "#bd6a9e" },
    { id: "GF09", label: "Enseignement", color: "#3488c9" },
    { id: "GF10", label: "Protection sociale", color: "#e35f46" }
  ];

  const rawSpending = [
    ["GF0101", "Institutions, finances, fiscalité et affaires étrangères", 42.8184],
    ["GF0102", "Aide économique extérieure", 4.8809],
    ["GF0103", "Services généraux", 53.7804],
    ["GF0104", "Recherche fondamentale", 19.8805],
    ["GF0105", "R&D des services publics généraux", 0.0061],
    ["GF0106", "Autres services publics généraux", 0.8666],
    ["GF0107", "Charge et opérations de la dette", 58.8702],
    ["GF0108", "Transferts généraux entre administrations", 0.0001],
    ["GF0201", "Défense militaire", 47.7019],
    ["GF0202", "Défense civile", 0.2286],
    ["GF0203", "Aide militaire extérieure", 2.0066],
    ["GF0204", "R&D de défense", 1.6820],
    ["GF0205", "Autres dépenses de défense", 2.5800],
    ["GF0301", "Police", 28.8962],
    ["GF0302", "Services d’incendie et de secours", 7.9374],
    ["GF0303", "Justice", 8.2950],
    ["GF0304", "Administration pénitentiaire", 5.1198],
    ["GF0305", "R&D de sécurité publique", 0],
    ["GF0306", "Autres dépenses de sécurité", 1.8646],
    ["GF0401", "Économie, commerce et emploi", 45.2569],
    ["GF0402", "Agriculture, forêt et pêche", 6.1987],
    ["GF0403", "Énergie", 15.4608],
    ["GF0404", "Industrie, mines et construction", 1.6254],
    ["GF0405", "Transports", 60.6889],
    ["GF0406", "Communications", 1.6211],
    ["GF0407", "Autres activités économiques", 11.1830],
    ["GF0408", "R&D économique", 21.4287],
    ["GF0409", "Autres affaires économiques", 2.6093],
    ["GF0501", "Gestion des déchets", 15.8624],
    ["GF0502", "Gestion des eaux usées", 5.2000],
    ["GF0503", "Lutte contre la pollution", 4.2686],
    ["GF0504", "Biodiversité et paysages", 1.6784],
    ["GF0505", "R&D environnementale", 1.7598],
    ["GF0506", "Autres dépenses environnementales", 1.5159],
    ["GF0601", "Développement du logement", 8.4150],
    ["GF0602", "Aménagement des territoires", 27.2299],
    ["GF0603", "Approvisionnement en eau", 2.8478],
    ["GF0604", "Éclairage public", 1.8192],
    ["GF0605", "R&D logement et équipements", 0],
    ["GF0606", "Autres équipements collectifs", 1.8167],
    ["GF0701", "Médicaments et dispositifs médicaux", 43.7146],
    ["GF0702", "Soins ambulatoires", 91.7890],
    ["GF0703", "Services hospitaliers", 109.3381],
    ["GF0704", "Santé publique et prévention", 7.9583],
    ["GF0705", "R&D en santé", 6.7083],
    ["GF0706", "Autres dépenses de santé", 1.6479],
    ["GF0801", "Sports et loisirs", 15.5686],
    ["GF0802", "Culture", 18.9630],
    ["GF0803", "Audiovisuel et édition", 7.5604],
    ["GF0804", "Cultes et vie communautaire", 0.7442],
    ["GF0805", "R&D culture et loisirs", 0],
    ["GF0806", "Autres dépenses culturelles", 0.2315],
    ["GF0901", "Enseignement préélémentaire et primaire", 42.1764],
    ["GF0902", "Enseignement secondaire", 63.7789],
    ["GF0903", "Enseignement post-secondaire non supérieur", 1.1564],
    ["GF0904", "Enseignement supérieur", 12.3079],
    ["GF0905", "Enseignement non classé par niveau", 8.6223],
    ["GF0906", "Services auxiliaires de l’enseignement", 20.0229],
    ["GF0907", "R&D dans l’enseignement", 0],
    ["GF0908", "Autres dépenses d’enseignement", 0.5747],
    ["GF1001", "Maladie et invalidité", 83.8989],
    ["GF1002", "Vieillesse et retraites", 391.9543],
    ["GF1003", "Survivants et pensions de réversion", 40.6083],
    ["GF1004", "Famille et enfants", 66.7114],
    ["GF1005", "Chômage", 48.5209],
    ["GF1006", "Aides au logement", 21.1467],
    ["GF1007", "Exclusion sociale", 36.4608],
    ["GF1008", "R&D en protection sociale", 0],
    ["GF1009", "Autres dépenses de protection sociale", 3.7276]
  ];

  const spending2024Total = 1671.7938;
  const scaleTo2025 = BASE.spending / spending2024Total;

  const effectForSpending = (id) => {
    const group = id.slice(0, 4);
    const defaults = {
      GF01: { multiplier: 0.72, supply: 0.08, inflation: 0.10, lag: 0.85, importShare: 0.12 },
      GF02: { multiplier: 0.70, supply: 0.12, inflation: 0.12, lag: 0.78, importShare: 0.22 },
      GF03: { multiplier: 0.76, supply: 0.10, inflation: 0.09, lag: 0.88, importShare: 0.08 },
      GF04: { multiplier: 0.95, supply: 0.26, inflation: 0.11, lag: 0.70, importShare: 0.23 },
      GF05: { multiplier: 0.98, supply: 0.28, inflation: 0.09, lag: 0.66, importShare: 0.19 },
      GF06: { multiplier: 1.08, supply: 0.24, inflation: 0.16, lag: 0.60, importShare: 0.13 },
      GF07: { multiplier: 0.90, supply: 0.14, inflation: 0.10, lag: 0.88, importShare: 0.10 },
      GF08: { multiplier: 0.82, supply: 0.10, inflation: 0.08, lag: 0.86, importShare: 0.10 },
      GF09: { multiplier: 0.92, supply: 0.32, inflation: 0.07, lag: 0.80, importShare: 0.08 },
      GF10: { multiplier: 0.55, supply: 0.03, inflation: 0.08, lag: 0.95, importShare: 0.11 }
    };
    const overrides = {
      GF0104: { multiplier: 1.02, supply: 0.44, lag: 0.62 },
      GF0105: { multiplier: 1.00, supply: 0.38, lag: 0.62 },
      GF0107: { multiplier: 0.05, supply: 0, inflation: 0, lag: 1, locked: true },
      GF0108: { multiplier: 0, supply: 0, locked: true },
      GF0204: { multiplier: 0.82, supply: 0.30, lag: 0.64 },
      GF0403: { multiplier: 1.02, supply: 0.36, inflation: 0.16, lag: 0.65 },
      GF0404: { multiplier: 1.06, supply: 0.38, lag: 0.64 },
      GF0405: { multiplier: 1.18, supply: 0.40, lag: 0.58 },
      GF0408: { multiplier: 1.05, supply: 0.45, lag: 0.60 },
      GF0503: { multiplier: 0.96, supply: 0.34, lag: 0.62 },
      GF0601: { multiplier: 1.15, supply: 0.28, inflation: 0.20, lag: 0.58 },
      GF0704: { multiplier: 0.96, supply: 0.24, lag: 0.82 },
      GF0705: { multiplier: 1.00, supply: 0.42, lag: 0.62 },
      GF0901: { multiplier: 0.94, supply: 0.34, lag: 0.78 },
      GF0902: { multiplier: 0.94, supply: 0.36, lag: 0.76 },
      GF0904: { multiplier: 0.98, supply: 0.42, lag: 0.72 },
      GF1002: { multiplier: 0.40, supply: 0, lag: 0.97 },
      GF1004: { multiplier: 0.68, supply: 0.08, lag: 0.98 },
      GF1005: { multiplier: 0.78, supply: 0.04, lag: 0.99 },
      GF1007: { multiplier: 0.76, supply: 0.10, lag: 0.98 }
    };
    return { ...defaults[group], ...(overrides[id] || {}) };
  };

  const spending = rawSpending.map(([id, label, value2024]) => ({
    id,
    type: "spending",
    group: id.slice(0, 4),
    label,
    value: value2024 * scaleTo2025,
    observedYear: 2024,
    calibratedYear: 2025,
    source: "eurostat-cofog",
    ...effectForSpending(id)
  }));

  const revenueGroups = [
    { id: "R_PROD", label: "Impôts sur la production et les importations", color: "#4e6dd9" },
    { id: "R_INC", label: "Revenus et patrimoine", color: "#825ec8" },
    { id: "R_SOC", label: "Cotisations sociales", color: "#d95d69" },
    { id: "R_CAP", label: "Impôts en capital", color: "#bc754b" },
    { id: "R_SALES", label: "Production et ventes publiques", color: "#26998a" },
    { id: "R_PROP", label: "Revenus de la propriété", color: "#2c879e" },
    { id: "R_TRANS", label: "Autres transferts", color: "#647286" },
    { id: "R_ADJ", label: "Ajustements comptables", color: "#9a8f84" }
  ];

  const revenue = [
    ["R_TVA", "Taxe sur la valeur ajoutée (TVA)", "R_PROD", 208.821, 0.46, 0.04, 0.18],
    ["R_IMPORT", "Droits et impôts sur les importations", "R_PROD", 3.577, 0.34, 0.08, 0.22],
    ["R_PRODUCTS", "Accises et autres impôts sur les produits", "R_PROD", 128.056, 0.38, 0.05, 0.20],
    ["R_PAYROLL", "Impôts sur salaires et main-d’œuvre", "R_PROD", 60.077, 0.67, 0.20, 0.08],
    ["R_OTHERPROD", "Autres impôts sur la production", "R_PROD", 72.724, 0.62, 0.23, 0.08],
    ["R_PRODADJ", "Consolidations et ajustements D2", "R_PROD", -2.863, 0.20, 0, 0],
    ["R_CSG", "Contribution sociale généralisée (CSG)", "R_INC", 156.583, 0.55, 0.11, 0.06],
    ["R_CRDS", "Contribution au remboursement de la dette sociale", "R_INC", 9.270, 0.50, 0.08, 0.05],
    ["R_CAPITALLEVY", "Prélèvements sociaux sur le capital", "R_INC", 14.406, 0.46, 0.18, 0.04],
    ["R_IR", "Impôt sur le revenu net des crédits", "R_INC", 94.310, 0.56, 0.15, 0.04],
    ["R_IS", "Impôt sur les sociétés net des crédits", "R_INC", 59.344, 0.70, 0.34, 0.03],
    ["R_CSB", "Contribution sociale sur les bénéfices", "R_INC", 1.151, 0.68, 0.31, 0.03],
    ["R_PHARMA", "Remises pharmaceutiques", "R_INC", 11.592, 0.42, 0.12, 0.03],
    ["R_EXCEPTIONAL", "Contribution exceptionnelle des grandes entreprises", "R_INC", 7.520, 0.74, 0.28, 0.03],
    ["R_HIGHINC", "Contribution différentielle sur les hauts revenus", "R_INC", 0.369, 0.36, 0.10, 0.02],
    ["R_OTHERINC", "Autres impôts courants sur le revenu", "R_INC", 28.804, 0.48, 0.15, 0.03],
    ["R_OTHERWEALTH", "Autres impôts courants sur le patrimoine", "R_INC", 6.573, 0.40, 0.12, 0.03],
    ["R_SOCIAL", "Cotisations sociales nettes", "R_SOC", 498.736, 0.66, 0.23, 0.05],
    ["R_DONATION", "Droits sur les donations", "R_CAP", 4.982, 0.18, 0.04, 0.01],
    ["R_SUCCESSION", "Droits sur les successions", "R_CAP", 16.070, 0.18, 0.04, 0.01],
    ["R_OTHERCAP", "Autres impôts en capital", "R_CAP", 0.629, 0.22, 0.05, 0.01],
    ["R_MARKET", "Ventes publiques et production marchande", "R_SALES", 82.561, 0.36, 0.06, 0.04],
    ["R_OWN", "Production publique pour emploi propre", "R_SALES", 32.832, 0.20, 0.03, 0.02],
    ["R_COPAY", "Paiements partiels des ménages", "R_SALES", 14.659, 0.44, 0.07, 0.06],
    ["R_PRODSUB", "Subventions de production reçues", "R_SALES", 0.883, 0.18, 0.02, 0.01],
    ["R_INTEREST", "Intérêts reçus", "R_PROP", 3.473, 0.15, 0.02, 0],
    ["R_DIVIDENDS", "Dividendes, loyers et autres revenus", "R_PROP", 19.509, 0.20, 0.05, 0],
    ["R_CURTRANS", "Autres transferts courants reçus", "R_TRANS", 23.257, 0.24, 0.03, 0.01],
    ["R_CAPTRANS", "Transferts en capital reçus", "R_TRANS", 11.290, 0.28, 0.05, 0.01],
    ["R_UNCOLLECTED", "Impôts dus non recouvrables", "R_ADJ", -6.675, 0.10, 0, 0]
  ].map(([id, label, group, value, multiplier, supply, inflation]) => ({
    id,
    type: "revenue",
    group,
    label,
    value,
    multiplier,
    supply,
    inflation,
    lag: 0.96,
    importShare: 0.06,
    observedYear: 2025,
    source: "insee-accounts"
  }));

  const models = {
    consensus: {
      label: "Consensus empirique",
      short: "Médiane",
      description: "Médiane prudente des résultats empiriques, avec effets de demande, d’offre et de dette.",
      spendScale: 1,
      taxScale: 1,
      supplyScale: 1,
      decay: 0.72,
      debtSensitivity: 1,
      uncertainty: 0.34
    },
    keynesian: {
      label: "Lecture keynésienne",
      short: "Demande",
      description: "Poids plus élevé à la demande, aux contraintes de liquidité et aux effets récessifs d’une consolidation.",
      spendScale: 1.28,
      taxScale: 1.14,
      supplyScale: 0.86,
      decay: 0.80,
      debtSensitivity: 0.78,
      uncertainty: 0.42
    },
    supply: {
      label: "Politique de l’offre",
      short: "Offre",
      description: "Effets renforcés du capital productif, de la recherche et des prélèvements sur le travail et l’entreprise.",
      spendScale: 0.80,
      taxScale: 1.22,
      supplyScale: 1.55,
      decay: 0.62,
      debtSensitivity: 1.06,
      uncertainty: 0.43
    },
    liberal: {
      label: "Lecture libérale",
      short: "Marché",
      description: "Éviction plus forte, sensibilité accrue à la dette et gains d’offre plus importants en cas de baisse des impôts.",
      spendScale: 0.64,
      taxScale: 1.34,
      supplyScale: 1.38,
      decay: 0.56,
      debtSensitivity: 1.32,
      uncertainty: 0.48
    },
    industrial: {
      label: "Réindustrialisation ciblée",
      short: "Industrie",
      description: "Soutien plus fort à l’énergie, aux transports, à l’industrie et à la R&D, avec risque de tensions sur les prix.",
      spendScale: 0.96,
      taxScale: 0.94,
      supplyScale: 1.45,
      decay: 0.75,
      debtSensitivity: 1.04,
      uncertainty: 0.50,
      strategicBoost: 1.30,
      inflationBoost: 1.18
    }
  };

  const assumptions = {
    cycle: {
      recession: {
        label: "Activité déprimée",
        description: "Capacités inutilisées et ménages davantage contraints.",
        spendScale: 1.24,
        taxScale: 1.14,
        inflationScale: 0.72,
        supplyScale: 1.02
      },
      normal: {
        label: "Cycle normal",
        description: "Économie proche de son rythme potentiel.",
        spendScale: 1,
        taxScale: 1,
        inflationScale: 1,
        supplyScale: 1
      },
      tension: {
        label: "Capacités sous tension",
        description: "Une part plus forte de l’impulsion se transmet aux prix et aux importations.",
        spendScale: 0.72,
        taxScale: 0.88,
        inflationScale: 1.42,
        supplyScale: 1.08
      }
    },
    monetary: {
      accommodative: {
        label: "BCE accommodante",
        description: "Les taux réagissent peu à l’impulsion budgétaire.",
        spendScale: 1.16,
        taxScale: 1.06,
        decayScale: 1.08,
        rateShock: -0.18
      },
      neutral: {
        label: "BCE neutre",
        description: "Réaction monétaire conforme au scénario central.",
        spendScale: 1,
        taxScale: 1,
        decayScale: 1,
        rateShock: 0
      },
      restrictive: {
        label: "BCE restrictive",
        description: "Hausse des taux et éviction plus marquée de la demande privée.",
        spendScale: 0.80,
        taxScale: 1.08,
        decayScale: 0.90,
        rateShock: 0.42
      }
    },
    confidence: {
      trusted: {
        label: "Confiance élevée",
        description: "Trajectoire jugée crédible par les prêteurs et les agents privés.",
        riskShock: -0.15,
        investmentScale: 1.08,
        uncertainty: -0.06
      },
      stable: {
        label: "Confiance stable",
        description: "Pas de choc autonome de confiance.",
        riskShock: 0,
        investmentScale: 1,
        uncertainty: 0
      },
      fragile: {
        label: "Confiance fragile",
        description: "Attentisme privé et prime de risque supplémentaire.",
        riskShock: 0.38,
        investmentScale: 0.86,
        uncertainty: 0.22
      }
    }
  };

  const euModes = {
    current: {
      label: "Cadre européen actuel",
      description: "Euro, règles budgétaires réformées et trajectoire de correction vers 2029.",
      growthShock: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      inflationShock: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      rateShock: 0,
      uncertainty: 0
    },
    derogation: {
      label: "Dérogation négociée",
      description: "Flexibilité temporaire obtenue par négociation, sans rupture juridique.",
      growthShock: [0.08, 0.06, 0.03, 0, 0, 0, 0, 0, 0, 0],
      inflationShock: [0.04, 0.03, 0.01, 0, 0, 0, 0, 0, 0, 0],
      rateShock: 0.05,
      uncertainty: 0.06
    },
    renegotiation: {
      label: "Renégociation des traités",
      description: "Négociation longue, incertitude temporaire et maintien dans l’euro pendant la transition.",
      growthShock: [-0.12, -0.18, -0.08, 0.02, 0.05, 0.05, 0.04, 0.03, 0.02, 0.02],
      inflationShock: [0.15, 0.12, 0.08, 0.04, 0.02, 0, 0, 0, 0, 0],
      rateShock: 0.25,
      uncertainty: 0.35
    },
    breach: {
      label: "Non-respect unilatéral",
      description: "Contentieux, crédibilité affaiblie et hausse supposée de la prime de risque.",
      growthShock: [-0.28, -0.35, -0.18, -0.08, 0, 0.03, 0.03, 0.02, 0, 0],
      inflationShock: [0.25, 0.20, 0.12, 0.06, 0.03, 0, 0, 0, 0, 0],
      rateShock: 0.70,
      uncertainty: 0.70
    },
    euroExit: {
      label: "Sortie de l’euro",
      description: "Scénario de rupture extrême : conversion monétaire, dépréciation, inflation et tensions financières.",
      growthShock: [-3.2, -1.4, 0.2, 0.8, 0.7, 0.4, 0.2, 0.1, 0.1, 0.1],
      inflationShock: [6.5, 4.2, 2.4, 1.5, 0.9, 0.6, 0.4, 0.3, 0.2, 0.2],
      rateShock: 3.2,
      uncertainty: 2.25
    }
  };

  const baseline = {
    realGrowth: [0.4, 0.9, 1.2, 1.2, 1.15, 1.1, 1.1, 1.05, 1.05, 1.0],
    inflation: [2.3, 1.9, 1.6, 1.8, 1.8, 1.8, 1.8, 1.8, 1.8, 1.8],
    unemployment: [8.3, 8.3, 8.0, 7.9, 7.8, 7.7, 7.6, 7.6, 7.5, 7.5],
    deficitRatio: [5.0, 4.4, 3.6, 2.9, 2.8, 2.7, 2.6, 2.6, 2.5, 2.5],
    policyRate: [2.5, 2.3, 2.2, 2.2, 2.25, 2.3, 2.3, 2.3, 2.3, 2.3]
  };

  const structural = {
    demographics: {
      population: 69.1,
      fertility: 1.56,
      births: 645,
      deaths: 651,
      age65Share: 22,
      netMigration: 180,
      economicMigration: 55,
      otherMigration: 125,
      immigrantEmployment: 62,
      totalEmployment: 69.3
    },
    energy: {
      independence: 61,
      importBill: 57.7,
      electricityCarbonIntensity: 19.6,
      lifecycleElectricityEmissions: 15.7
    },
    controls: {
      fertility: { label: "Fécondité", min: 1.0, max: 2.4, step: 0.01, value: 1.56, unit: " enfant/femme" },
      lifeExpectancy: { label: "Écart d’espérance de vie", min: -3, max: 5, step: 0.5, value: 0, unit: " an" },
      economicMigration: { label: "Solde migratoire économique", min: -50, max: 300, step: 5, value: 55, unit: " k/an" },
      otherMigration: { label: "Autres motifs — proxy", min: -100, max: 300, step: 5, value: 125, unit: " k/an" },
      integration: { label: "Emploi après intégration", min: 40, max: 80, step: 1, value: 62, unit: " %" },
      nuclear: { label: "Nucléaire supplémentaire en 2035", min: -10, max: 20, step: 1, value: 0, unit: " GW" },
      renewables: { label: "Renouvelables supplémentaires en 2035", min: -20, max: 80, step: 2, value: 0, unit: " GW" },
      efficiency: { label: "Rénovation et efficacité publiques", min: 0, max: 30, step: 1, value: 0, unit: " Md€/an" },
      fossilPrice: { label: "Choc sur les prix fossiles importés", min: -40, max: 100, step: 5, value: 0, unit: " %" },
      carbonTax: { label: "Signal-prix carbone supplémentaire", min: -30, max: 100, step: 5, value: 0, unit: " €/t" }
    }
  };

  const policyEngines = {
    groups: [
      { id: "work", label: "Travail", icon: "EMP", description: "Participation, productivité et salaires." },
      { id: "pensions", label: "Retraites", icon: "RET", description: "Âge, indexation et cotisations." },
      { id: "health", label: "Santé", icon: "SAN", description: "Prévention, efficience et soignants." },
      { id: "education", label: "Éducation", icon: "EDU", description: "École, formation et petite enfance." },
      { id: "housing", label: "Logement", icon: "LOG", description: "Offre, logement social et aides." },
      { id: "industry", label: "Industrie", icon: "IND", description: "Investissement, contenu local et commerce." },
      { id: "climate", label: "Climat", icon: "CLI", description: "Adaptation, agriculture et puits carbone." },
      { id: "defense", label: "Défense", icon: "DEF", description: "Capacités, sécurité et achats domestiques." },
      { id: "administration", label: "Administration", icon: "ADM", description: "Rémunérations, numérique et fraude." },
      { id: "social", label: "Solidarités", icon: "SOC", description: "Transferts ciblés et inclusion." },
      { id: "innovation", label: "Innovation", icon: "R&D", description: "Recherche, transport et diffusion numérique." },
      { id: "finance", label: "Finance", icon: "FIN", description: "Garanties et banque publique." }
    ],
    controls: {
      laborParticipation: { group: "work", label: "Taux d’activité", min: -5, max: 8, step: 0.5, value: 0, unit: " pt", effects: { fiscal: -4.5, demand: 0.8, supply: 11.5, jobs: 180, poverty: -0.10, lag: 0.50 } },
      productivity: { group: "work", label: "Productivité annuelle", min: -1, max: 2.5, step: 0.1, value: 0, unit: " pt/an", effects: { fiscal: 0, demand: 0, supply: 22, jobs: -8, inflation: -0.12, trade: 2.4, lag: 0.30 } },
      minimumWage: { group: "work", label: "Salaire minimum réel", min: -10, max: 20, step: 1, value: 0, unit: " %", effects: { fiscal: -0.04, demand: 0.38, supply: -0.10, jobs: -3, inflation: 0.025, poverty: -0.035, lag: 0.85, uncertainty: 0.18 } },

      retirementAge: { group: "pensions", label: "Âge effectif de départ", min: -3, max: 3, step: 0.5, value: 0, unit: " an", effects: { fiscal: -6.2, demand: -0.6, supply: 7.5, jobs: 75, poverty: 0.03, lag: 0.55 } },
      pensionIndex: { group: "pensions", label: "Indexation au-dessus des prix", min: -4, max: 4, step: 0.5, value: 0, unit: " pt", effects: { fiscal: 4.1, demand: 2.4, supply: 0, inflation: 0.025, poverty: -0.07, lag: 0.95 } },
      pensionContribution: { group: "pensions", label: "Cotisation retraite", min: -3, max: 5, step: 0.5, value: 0, unit: " pt", effects: { fiscal: -9.5, demand: -2.4, supply: -2.2, jobs: -18, inflation: 0.03, poverty: 0.02, lag: 0.90 } },

      prevention: { group: "health", label: "Prévention supplémentaire", min: 0, max: 15, step: 0.5, value: 0, unit: " Md€/an", effects: { fiscal: 1, demand: 0.78, supply: 0.22, jobs: 7, poverty: -0.015, lag: 0.45 } },
      careEfficiency: { group: "health", label: "Efficience des soins", min: -10, max: 15, step: 1, value: 0, unit: " %", effects: { fiscal: -1.25, demand: -0.18, supply: 0.22, jobs: -1.5, lag: 0.35, uncertainty: 0.12 } },
      healthWorkforce: { group: "health", label: "Soignants supplémentaires", min: -30, max: 80, step: 5, value: 0, unit: " k", effects: { fiscal: 0.055, demand: 0.048, supply: 0.016, jobs: 1, lag: 0.70 } },

      teacherResources: { group: "education", label: "Moyens scolaires", min: -15, max: 25, step: 1, value: 0, unit: " Md€/an", effects: { fiscal: 1, demand: 0.86, supply: 0.24, jobs: 10, poverty: -0.02, lag: 0.55 } },
      vocationalTraining: { group: "education", label: "Formation professionnelle", min: -5, max: 20, step: 1, value: 0, unit: " Md€/an", effects: { fiscal: 1, demand: 0.72, supply: 0.42, jobs: 13, poverty: -0.03, lag: 0.42 } },
      childcarePlaces: { group: "education", label: "Places de garde supplémentaires", min: 0, max: 300, step: 10, value: 0, unit: " k", effects: { fiscal: 0.018, demand: 0.018, supply: 0.038, jobs: 0.8, poverty: -0.004, lag: 0.62 } },

      housingBuild: { group: "housing", label: "Logements supplémentaires", min: -100, max: 350, step: 10, value: 0, unit: " k/an", effects: { fiscal: 0.035, demand: 0.12, supply: 0.03, jobs: 1.1, inflation: -0.003, poverty: -0.002, lag: 0.55 } },
      socialHousing: { group: "housing", label: "Dont logements sociaux", min: 0, max: 150, step: 5, value: 0, unit: " k/an", effects: { fiscal: 0.075, demand: 0.10, supply: 0.022, jobs: 1.25, inflation: -0.003, poverty: -0.009, lag: 0.48 } },
      housingAid: { group: "housing", label: "Aides au logement", min: -10, max: 15, step: 0.5, value: 0, unit: " Md€/an", effects: { fiscal: 1, demand: 0.68, supply: -0.03, inflation: 0.018, poverty: -0.08, lag: 0.94 } },

      industrialInvestment: { group: "industry", label: "Investissement industriel public", min: -10, max: 40, step: 1, value: 0, unit: " Md€/an", effects: { fiscal: 1, demand: 0.88, supply: 0.38, jobs: 7, emissions: -0.04, trade: 0.20, lag: 0.48 } },
      localContent: { group: "industry", label: "Contenu France/UE des achats", min: 0, max: 60, step: 5, value: 0, unit: " %", effects: { fiscal: 0.025, demand: 0.11, supply: 0.035, jobs: 0.9, inflation: 0.003, trade: 0.055, lag: 0.70 } },
      tradeProtection: { group: "industry", label: "Protection commerciale supplémentaire", min: 0, max: 20, step: 1, value: 0, unit: " %", effects: { fiscal: -0.32, demand: 0.12, supply: -0.22, jobs: -2, inflation: 0.06, trade: -0.22, lag: 0.72, uncertainty: 0.30 } },

      adaptation: { group: "climate", label: "Adaptation climatique", min: 0, max: 25, step: 1, value: 0, unit: " Md€/an", effects: { fiscal: 1, demand: 0.82, supply: 0.16, jobs: 6, emissions: -0.02, lag: 0.52 } },
      agricultureTransition: { group: "climate", label: "Transition agricole", min: -5, max: 20, step: 1, value: 0, unit: " Md€/an", effects: { fiscal: 1, demand: 0.70, supply: 0.12, jobs: 5, emissions: -0.45, trade: 0.06, lag: 0.48 } },
      carbonSinks: { group: "climate", label: "Puits carbone additionnels", min: -10, max: 30, step: 1, value: 0, unit: " MtCO₂e/an", effects: { fiscal: 0.25, demand: 0.12, supply: 0.025, jobs: 1.5, emissions: -1, lag: 0.30 } },

      defenseCapacity: { group: "defense", label: "Capacités militaires", min: -15, max: 35, step: 1, value: 0, unit: " Md€/an", effects: { fiscal: 1, demand: 0.66, supply: 0.09, jobs: 5, trade: 0.05, lag: 0.64 } },
      publicSafety: { group: "defense", label: "Sécurité et justice", min: -10, max: 20, step: 1, value: 0, unit: " Md€/an", effects: { fiscal: 1, demand: 0.76, supply: 0.06, jobs: 10, lag: 0.72 } },
      domesticDefense: { group: "defense", label: "Achats de défense domestiques", min: 0, max: 80, step: 5, value: 0, unit: " %", effects: { fiscal: 0.018, demand: 0.095, supply: 0.03, jobs: 0.7, inflation: 0.002, trade: 0.045, lag: 0.68 } },

      publicPayroll: { group: "administration", label: "Rémunération publique réelle", min: -8, max: 15, step: 0.5, value: 0, unit: " %", effects: { fiscal: 3.5, demand: 2.1, supply: 0.10, inflation: 0.035, poverty: -0.025, lag: 0.94 } },
      digitalAdministration: { group: "administration", label: "Transformation numérique", min: 0, max: 15, step: 0.5, value: 0, unit: " Md€/an", effects: { fiscal: 0.72, demand: 0.62, supply: 0.28, jobs: -2, lag: 0.38 } },
      fraudRecovery: { group: "administration", label: "Recouvrement fraude et erreurs", min: 0, max: 25, step: 1, value: 0, unit: " Md€/an ciblés", effects: { fiscal: -0.70, demand: -0.16, supply: -0.03, lag: 0.80, uncertainty: 0.25 } },

      targetedTransfers: { group: "social", label: "Transferts sociaux ciblés", min: -15, max: 25, step: 1, value: 0, unit: " Md€/an", effects: { fiscal: 1, demand: 0.78, supply: 0.02, inflation: 0.012, poverty: -0.11, lag: 0.96 } },
      disabilityInclusion: { group: "social", label: "Autonomie et handicap", min: -5, max: 20, step: 1, value: 0, unit: " Md€/an", effects: { fiscal: 1, demand: 0.58, supply: 0.26, jobs: 6, poverty: -0.05, lag: 0.62 } },
      youthIntegration: { group: "social", label: "Insertion des jeunes", min: -5, max: 15, step: 1, value: 0, unit: " Md€/an", effects: { fiscal: 1, demand: 0.64, supply: 0.34, jobs: 12, poverty: -0.045, lag: 0.52 } },

      publicResearch: { group: "innovation", label: "Recherche publique", min: -10, max: 30, step: 1, value: 0, unit: " Md€/an", effects: { fiscal: 1, demand: 0.82, supply: 0.58, jobs: 5, trade: 0.11, lag: 0.34 } },
      transportInfrastructure: { group: "innovation", label: "Infrastructures de transport", min: -10, max: 35, step: 1, value: 0, unit: " Md€/an", effects: { fiscal: 1, demand: 1.02, supply: 0.36, jobs: 8, emissions: -0.06, trade: 0.08, lag: 0.45 } },
      digitalDiffusion: { group: "innovation", label: "Diffusion numérique et IA", min: 0, max: 25, step: 1, value: 0, unit: " Md€/an", effects: { fiscal: 1, demand: 0.80, supply: 0.48, jobs: -1, trade: 0.10, lag: 0.36, uncertainty: 0.16 } },

      publicGuarantees: { group: "finance", label: "Garanties publiques nouvelles", min: 0, max: 150, step: 5, value: 0, unit: " Md€", effects: { fiscal: 0.02, demand: 0.12, supply: 0.06, jobs: 1.2, lag: 0.52, uncertainty: 0.35 } },
      developmentBank: { group: "finance", label: "Financement public long terme", min: -10, max: 50, step: 1, value: 0, unit: " Md€/an", effects: { fiscal: 0.30, demand: 0.42, supply: 0.32, jobs: 4, trade: 0.05, lag: 0.42 } },
      bankLevy: { group: "finance", label: "Prélèvement financier", min: -5, max: 15, step: 0.5, value: 0, unit: " Md€/an", effects: { fiscal: -1, demand: -0.22, supply: -0.12, jobs: -1, lag: 0.82, uncertainty: 0.12 } }
    }
  };

  const presets = [
    {
      id: "investment",
      label: "Relance par l’investissement",
      badge: "+30 Md€",
      description: "Transports, logement, recherche, universités et prévention.",
      model: "keynesian",
      changes: { GF0405: 9, GF0601: 6, GF0104: 4, GF0904: 4, GF0704: 3, GF0503: 4 }
    },
    {
      id: "supply",
      label: "Choc d’offre",
      badge: "−28 Md€ d’impôts",
      description: "Baisse des prélèvements sur le travail et les entreprises, recherche renforcée.",
      model: "supply",
      changes: { R_SOCIAL: -15, R_IS: -8, R_OTHERPROD: -5, GF0408: 4, GF0904: 2 }
    },
    {
      id: "industrial",
      label: "Réindustrialisation",
      badge: "+24 Md€",
      description: "Énergie, industrie, transport, R&D et droits d’importation ciblés.",
      model: "industrial",
      changes: { GF0403: 6, GF0404: 5, GF0405: 4, GF0408: 6, GF0503: 3, R_IMPORT: 4 }
    },
    {
      id: "redistribution",
      label: "Redistribution ciblée",
      badge: "financée",
      description: "Prestations ciblées financées par les hauts revenus, le capital et les sociétés.",
      model: "consensus",
      changes: { GF1004: 5, GF1006: 4, GF1007: 5, R_IR: 5, R_IS: 5, R_CAPITALLEVY: 3, R_HIGHINC: 1 }
    },
    {
      id: "consolidation",
      label: "Consolidation graduelle",
      badge: "−35 Md€",
      description: "Économies étalées et hausse de recettes diversifiée.",
      model: "consensus",
      changes: { GF0101: -3, GF0103: -3, GF0401: -2, GF0706: -2, GF1002: -7, GF1009: -2, R_TVA: 5, R_IR: 4, R_IS: 3, R_OTHERPROD: 4 }
    }
  ];

  const sectors = [
    {
      id: "state",
      code: "S13111",
      label: "État",
      spending: 607.730,
      revenue: 479.6272,
      balance: -128.1028,
      color: "#4055bf",
      description: "Ministères, budget général, budgets annexes et comptes spéciaux dans le périmètre des comptes nationaux."
    },
    {
      id: "odac",
      code: "S13112",
      label: "Opérateurs centraux",
      spending: 142.2659,
      revenue: 140.1141,
      balance: -2.1518,
      color: "#7d62c7",
      description: "Universités, organismes de recherche, France Compétences et autres organismes divers d’administration centrale."
    },
    {
      id: "local",
      code: "S1313",
      label: "Administrations locales",
      spending: 335.4818,
      revenue: 319.9269,
      balance: -15.5549,
      color: "#268f88",
      description: "Communes, intercommunalités, départements, régions et organismes locaux."
    },
    {
      id: "social",
      code: "S1314",
      label: "Sécurité sociale",
      spending: 803.1640,
      revenue: 797.3815,
      balance: -5.7825,
      color: "#d85e55",
      description: "Régimes d’assurance sociale, hôpitaux et organismes dépendant des assurances sociales."
    }
  ];

  return {
    BASE,
    sources,
    spendingGroups,
    spending,
    revenueGroups,
    revenue,
    models,
    assumptions,
    euModes,
    baseline,
    structural,
    policyEngines,
    presets,
    sectors,
    metadata: {
      snapshotDate: "10 octobre 2026",
      spendingDetailObservedYear: 2024,
      spendingDetailCalibratedYear: 2025,
      revenueObservedYear: 2025,
      projectionStart: 2026,
      projectionEnd: 2035,
      version: "3.0.0"
    }
  };
})();
