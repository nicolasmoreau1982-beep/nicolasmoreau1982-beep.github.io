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
      id: "insee-accounts",
      publisher: "Insee",
      title: "Dépenses et recettes des administrations publiques en 2025",
      date: "28 août 2026",
      url: "https://www.insee.fr/fr/statistiques/8988845",
      note: "Comptes nationaux, base 2020 — totaux et recettes par nature."
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

  return {
    BASE,
    sources,
    spendingGroups,
    spending,
    revenueGroups,
    revenue,
    models,
    euModes,
    baseline,
    presets,
    metadata: {
      snapshotDate: "10 octobre 2026",
      spendingDetailObservedYear: 2024,
      spendingDetailCalibratedYear: 2025,
      revenueObservedYear: 2025,
      projectionStart: 2026,
      projectionEnd: 2035,
      version: "1.0.0"
    }
  };
})();
