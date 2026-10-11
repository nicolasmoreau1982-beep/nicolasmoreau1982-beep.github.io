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
    debtRatio: 115.7,
    deficitRatio: 5.1,
    growth: 0.8,
    inflation: 0.9,
    unemployment: 7.9,
    unit: "Md€"
  };

  // Référence comptable : tableau Insee 3.201, révision du 28 août 2026.
  // Le ratio dette/PIB est recalculé sur les montants figés : 3 460,5 / 2 991,1.
  // Le ratio Eurostat 115,6 % de history.js est une autre série / millésime.
  const accountingVintage = {
    id: "insee-3.201-2026-08-28",
    source: "https://www.insee.fr/fr/statistiques/8988845",
    date: "2026-08-28",
    nature: "compte APU simplifié, base 2020",
    spending2025Bn: 1714.1117,
    revenue2025Bn: 1562.5197
  };

  // Hypothèses marginales exploratoires. Elles ne sont PAS des estimations causales.
  // Séparées du moteur pour analyse de sensibilité reproductible sans modifier le JS.
  const macroCoefficients = {
    unemploymentPpPerOutputGapPoint: 0.35,
    revenueBnPerNominalGdpBn: 0.48,
    cyclicalSpendingBnPerUnemploymentPoint: 3.1
  };

  const sources = [
    {
      id: "eurostat-historical-apu",
      publisher: "Eurostat",
      title: "Historique macroéconomique français 2003–2025",
      date: "extraction du 10 octobre 2026",
      url: "https://ec.europa.eu/eurostat/databrowser/view/gov_10a_main/default/table",
      note: "PIB (nama_10_gdp), solde APU (gov_10a_main), dette (gov_10dd_edpt1) et chômage (une_rt_a). Copie révisée dans history.js ; diagnostic rétrospectif reproductible."
    },
    {
      id: "insee-election-participation-2022",
      publisher: "Insee",
      title: "Vingt ans de participation électorale",
      date: "novembre 2022",
      url: "https://www.insee.fr/fr/statistiques/6658143",
      note: "La participation diffère fortement selon l'âge et le diplôme. Les pondérations sociales d'EcoSim restent des hypothèses, non des estimations issues de l'enquête."
    },
    {
      id: "cevipof-election-study",
      publisher: "CEVIPOF",
      title: "Enquêtes électorales françaises",
      date: "2022–2026",
      url: "https://www.sciencespo.fr/cevipof/fr/etudes-enquetes/",
      note: "Contexte empirique du vote et des attitudes politiques. EcoSim ne prédit aucun parti ni résultat électoral."
    },
    {
      id: "cor-2026",
      publisher: "COR",
      title: "Évolutions et perspectives des retraites",
      date: "juin 2026",
      url: "https://www.cor-retraites.fr/rapports-du-cor/rapport-annuel-cor-juin-2026-evolutions-perspectives-retraites-france",
      note: "Hypothèses démographiques, dépenses, ressources et solde du système de retraite."
    },
    {
      id: "insee-population-2070",
      publisher: "Insee",
      title: "Projections de population 2026–2070",
      date: "juin 2026",
      url: "https://www.insee.fr/fr/information/6536990",
      note: "Projection centrale par âge et sexe 2026–2056 utilisée pour la référence démographique. Les écarts de politique restent agrégés."
    },
    {
      id: "ec-dsm-2025",
      publisher: "Commission européenne",
      title: "Debt Sustainability Monitor 2025",
      date: "12 février 2026",
      url: "https://economy-finance.ec.europa.eu/publications/debt-sustainability-monitor-2025_en",
      note: "Méthode de soutenabilité et scénarios de dette à politique inchangée ; la France est classée à risque moyen terme élevé."
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
      id: "insee-public-employment-2024",
      publisher: "Insee · DGAFP",
      title: "L’emploi dans la fonction publique en 2024",
      date: "10 février 2026",
      url: "https://www.insee.fr/fr/statistiques/8732435",
      note: "5,877 millions d’agents : 2,587 M dans l’État, 2,039 M dans la territoriale et 1,250 M dans l’hospitalière ; 24 % de contractuels."
    },
    {
      id: "defense-workforce-2025",
      publisher: "Ministère des Armées",
      title: "Chiffres clés de la Défense 2025",
      date: "octobre 2025",
      url: "https://www.defense.gouv.fr/chiffres-cles-defense-2025",
      note: "264 000 personnels en 2024, dont près de 200 000 militaires et 64 000 civils ; réservistes comptés séparément."
    },
    {
      id: "police-workforce-2026",
      publisher: "Police nationale",
      title: "Effectifs de la Police nationale",
      date: "6 mars 2026",
      url: "https://www.police-nationale.interieur.gouv.fr/actualite/8-mars-legalite-professionnelle-femmeshommes-priorite-dans-police-nationale",
      note: "152 197 agents, tous corps confondus : actifs, administratifs, techniques, scientifiques et contractuels."
    },
    {
      id: "gendarmerie-workforce-2025",
      publisher: "Gendarmerie nationale",
      title: "Chiffres clés de la Gendarmerie nationale",
      date: "31 juillet 2025",
      url: "https://www.gendarmerie.interieur.gouv.fr/content/download/57235/file/dossier-GN-2025.pdf",
      note: "101 748 personnels d’active et civils, plus 38 622 réservistes opérationnels ; les réservistes ne sont pas assimilés à des emplois publics permanents."
    },
    {
      id: "justice-workforce-2025",
      publisher: "Ministère de la Justice",
      title: "Références statistiques Justice 2025",
      date: "29 avril 2026",
      url: "https://www.justice.gouv.fr/documentation/etudes-et-statistiques/references-statistiques-justice-2025",
      note: "93 128 ETP fin 2024 : 37 308 en justice judiciaire, 43 949 dans le pénitentiaire et 9 179 à la protection judiciaire de la jeunesse."
    },
    {
      id: "firefighters-workforce-2025",
      publisher: "Sécurité civile",
      title: "Statistiques des services d’incendie et de secours 2025",
      date: "20 avril 2026",
      url: "https://www.securite-civile.interieur.gouv.fr/actualites/actualites/statistiques-des-services-dincendie-et-de-secours",
      note: "44 303 professionnels, 13 377 militaires et 200 961 volontaires ; seul l’emploi professionnel est intégré comme poste public permanent."
    },
    {
      id: "insee-labour-market-2025",
      publisher: "Insee",
      title: "Une photographie du marché du travail en 2025",
      date: "mars 2026",
      url: "https://www.insee.fr/fr/statistiques/8901327",
      note: "Taux d’emploi de 69,3 % ; 72,8 % des emplois en CDI ou de fonctionnaire, 9,4 % en CDD ou intérim et 13,5 % d’indépendants."
    },
    {
      id: "insee-labour-constraints-2025",
      publisher: "Insee",
      title: "Situations contraintes sur le marché du travail",
      date: "2 juillet 2026",
      url: "https://www.insee.fr/fr/statistiques/8733069",
      note: "En moyenne en 2025 : 2,4 millions de chômeurs BIT, 1,8 million dans le halo et 1,3 million en sous-emploi."
    },
    {
      id: "dares-jobseekers-2026",
      publisher: "Dares · France Travail",
      title: "Inscrits à France Travail par catégorie",
      date: "2e trimestre 2026",
      url: "https://dares.travail-emploi.gouv.fr/donnees/les-inscrits-france-travail-consultez-la-datavisualisation",
      note: "5,802 millions en catégories A, B, C et 343 800 en catégorie D ; rupture de série liée à l’inscription automatique de nouveaux publics."
    },
    {
      id: "dares-training-2025",
      publisher: "Dares",
      title: "Formations des personnes en recherche d’emploi",
      date: "7 octobre 2026",
      url: "https://dares.travail-emploi.gouv.fr/donnees/les-formations-des-personnes-en-recherche-demploi-brest",
      note: "918 900 entrées en formation en 2025 ; une entrée est un flux annuel et non un stock de personnes disponibles."
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
      note: "Dette de Maastricht : 3 460,5 Md€. La série historique Eurostat indiquait 115,6 % du PIB ; le ratio calculé à partir du PIB figé dans EcoSim est 115,7 %."
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
      id: "insee-mesange-2017",
      publisher: "Insee · DG Trésor",
      title: "Mésange 2017 — variantes de fiscalité et de dépense publique",
      date: "mai 2017",
      url: "https://www.insee.fr/fr/statistiques/2848300",
      note: "Tableaux 4.1.1–4.1.5 : réponses du PIB et de l’emploi à des chocs permanents de 1 point de PIB. Le canal TVA de première année sert d’ancrage externe ; les autres canaux d’EcoSim ne sont pas validés par ce seul rapprochement."
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
    },
    {
      id: "assembly-groups-2026",
      publisher: "Assemblée nationale",
      title: "Groupes politiques de la XVIIe législature",
      date: "consulté le 10 octobre 2026",
      url: "https://www.assemblee-nationale.fr/dyn/les-groupes-politiques",
      note: "Noms et effectifs officiels des groupes. Les non-inscrits ne forment pas un programme collectif."
    },
    {
      id: "rn-programme-2024",
      publisher: "Rassemblement National",
      title: "Programme des législatives 2024",
      date: "juin 2024",
      url: "https://rassemblementnational.fr/documents/202406-programme.pdf",
      note: "Source primaire utilisée pour traduire les principales mesures du scénario RN."
    },
    {
      id: "nfp-programme-2024",
      publisher: "Nouveau Front populaire",
      title: "Programme et proposition macroéconomique",
      date: "juin 2024",
      url: "https://lafranceinsoumise.fr/wp-content/uploads/2024/06/RECIT-MACRO-FRONT-POPULAIRE-VF.pdf",
      note: "Source primaire commune aux groupes LFI, socialiste, écologiste et GDR, modulée par leurs déclarations propres."
    },
    {
      id: "horizons-manifesto",
      publisher: "Horizons",
      title: "Le manifeste",
      date: "version consultée en 2026",
      url: "https://horizonsleparti.fr/le-manifeste/",
      note: "Compétitivité, maîtrise des comptes, éducation, ordre et décarbonation."
    },
    {
      id: "political-archives-2007",
      publisher: "Vie publique",
      title: "Archives des programmes et discours électoraux",
      date: "2007–2022",
      url: "https://www.vie-publique.fr/discours/166209-programme-electoral-de-jean-marie-le-pen-president-du-front-national-et",
      note: "Point d’entrée documentaire pour reconstruire les lignes récurrentes sur vingt ans, sans fusionner les promesses contradictoires."
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
    effectSource: id === "R_TVA" ? "insee-mesange-2017" : null,
    importShare: 0.06,
    observedYear: 2025,
    source: "insee-accounts"
  }));

  // Mésange 2017, tableau 4.1.5 : hausse permanente de TVA procurant
  // 1 point de PIB de recette ex ante. Variantes de modèle, non observations.
  // L'année 30 prolonge vers la colonne « long terme » : non validée à 30 ans.
  const researchVariants = {
    vat: {
      source: "insee-mesange-2017",
      realGdpPct: { 1: -0.32, 2: -0.66, 3: -0.72, 5: -0.81, 10: -0.78, 30: -0.70 },
      cpiLevelPct: { 0: 0, 1: 1.48, 2: 1.58, 3: 1.52, 5: 1.30, 10: 0.89, 30: 0.76 }
    }
  };

  const models = {
    consensus: {
      label: "Hypothèse centrale",
      short: "Central",
      description: "Paramétrage central indicatif avec effets de demande, d’offre et de dette ; ses coefficients ne constituent pas une médiane estimée.",
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
    },
    debtCrisis: {
      label: "Consolidation en récession",
      short: "Crise de dette",
      description: "Analogie de la Grèce après 2010 : une coupe ou une hausse d'impôt peut contracter davantage l'activité et laisser des séquelles. Pour une récession, choisissez aussi « Activité déprimée » dans les hypothèses avancées ; aucune coupe n'est déclenchée automatiquement.",
      spendScale: 1.46,
      taxScale: 1.26,
      supplyScale: 0.90,
      decay: 0.82,
      debtSensitivity: 1.25,
      hysteresisScale: 0.22,
      uncertainty: 0.62,
      evidence: [{ label: "Évaluation ex post du FMI (Grèce, 2010)", url: "https://www.imf.org/en/publications/cr/issues/2016/12/31/greece-ex-post-evaluation-of-exceptional-access-under-the-2010-stand-by-arrangement-40639" }]
    },
    stabilization: {
      label: "Stabilisation inflationniste",
      short: "Stabilisation",
      description: "Analogie partielle de l'Argentine récente : priorité à l'ancrage budgétaire et à la désinflation, avec financement plus sensible aux tensions de prix. La France dans l'euro ne contrôle pas sa monnaie comme l'Argentine.",
      spendScale: 0.66,
      taxScale: 0.84,
      supplyScale: 1.12,
      decay: 0.58,
      debtSensitivity: 1.55,
      inflationBoost: 1.28,
      inflationRiskScale: 0.12,
      uncertainty: 0.68,
      evidence: [{ label: "Programme Argentine 2025, FMI", url: "https://www.imf.org/en/news/articles/2025/04/08/pr25095-argentina-imf-reaches-staff-level-agreement-with-argentina-on-a-48-month-eff" }]
    },
    openEconomy: {
      label: "Économie ouverte",
      short: "Ouverture",
      description: "Lecture inspirée de Mundell-Fleming : une part accrue de l'impulsion de demande fuit vers les importations, selon le poste touché et le cadre de change. L'euro reste le cadre de référence sauf choix distinct.",
      spendScale: 1,
      taxScale: 1,
      supplyScale: 1,
      decay: 0.72,
      debtSensitivity: 1,
      importLeakageScale: 2.20,
      uncertainty: 0.46,
      evidence: [{ label: "Multiplicateurs et régime de change, FMI", url: "https://www.imf.org/en/publications/wp/issues/2016/12/31/what-determines-government-spending-multipliers-25975" }]
    },
    constrainedTransition: {
      label: "Transition énergétique contrainte",
      short: "Transition",
      description: "L'investissement énergétique agit moins vite sur l'offre et les chocs de prix se transmettent davantage. Le mix de politiques et les capacités industrielles restent déterminants ; ce n'est pas une prévision climatique.",
      spendScale: 1,
      taxScale: 1,
      supplyScale: 1.10,
      decay: 0.72,
      debtSensitivity: 1,
      energySupplyScale: 0.62,
      energyInflationScale: 1.40,
      uncertainty: 0.58,
      evidence: [{ label: "Transition énergétique européenne, FMI", url: "https://www.elibrary.imf.org/view/journals/001/2026/046/article-A001-en.xml" }]
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

  const longRunYears = 20;
  const baseline = {
    realGrowth: [0.4, 0.9, 1.2, 1.2, 1.15, 1.1, 1.1, 1.05, 1.05, 1.0,
      ...Array.from({ length: longRunYears }, (_, index) => Math.max(0.58, 0.92 - index * 0.018))],
    inflation: [2.3, 1.9, 1.6, 1.8, 1.8, 1.8, 1.8, 1.8, 1.8, 1.8,
      ...Array.from({ length: longRunYears }, (_, index) => Math.min(2, 1.82 + index * 0.01))],
    unemployment: [8.3, 8.3, 8.0, 7.9, 7.8, 7.7, 7.6, 7.6, 7.5, 7.5,
      ...Array.from({ length: longRunYears }, (_, index) => Math.max(7.1, 7.48 - index * 0.02))],
    deficitRatio: [5.0, 4.4, 3.6, 2.9, 2.8, 2.7, 2.6, 2.6, 2.5, 2.5,
      ...Array.from({ length: longRunYears }, (_, index) => 2.5 + index * 0.035)],
    policyRate: [2.5, 2.3, 2.2, 2.2, 2.25, 2.3, 2.3, 2.3, 2.3, 2.3,
      ...Array.from({ length: longRunYears }, () => 2.4)]
  };

  const structural = {
    demographics: {
      population: 69.081996,
      fertility: 1.56,
      births: 630.843,
      deaths: 659.472,
      age65Share: 22.20441,
      netMigration: 150,
      economicMigration: 50,
      otherMigration: 100,
      immigrantEmployment: 62,
      totalEmployment: 69.3
    },
    // Sensibilité illustrative, non coefficient causal estimé : la recherche
    // documente le sens possible mais pas cet ordre de grandeur pour la France.
    fertilityResponse: {
      childcarePlacesForFullEffectK: 300,
      maxAdditionalChildrenPerWoman: 0.03,
      maturationYears: 3,
      source: "https://www.ined.fr/fr/publications/editions/document-travail/impact-family-policy-fertility-trends",
      status: "hypothese_exploratoire"
    },
    energy: {
      independence: 61,
      importBill: 57.7,
      emissionsMt: 363.4,
      electricityCarbonIntensity: 19.6,
      lifecycleElectricityEmissions: 15.7
    },
    workforce: {
      employment: 31.4,
      publicEmployment: 5.8767,
      publicService: {
        fpe: { label: "Fonction publique de l’État", short: "FPE", headcount: 2587.4, permanent: 1815.7, contractors: 600.5, other: 171.2, employerCost: 0.073, annualExit: 0.078 },
        fpt: { label: "Fonction publique territoriale", short: "FPT", headcount: 2039.4, permanent: 1417.6, contractors: 539.0, other: 82.8, employerCost: 0.055, annualExit: 0.091 },
        fph: { label: "Fonction publique hospitalière", short: "FPH", headcount: 1249.9, permanent: 827.0, contractors: 270.8, other: 152.2, employerCost: 0.064, annualExit: 0.086 }
      },
      publicCategories: {
        a: { label: "Catégorie A · conception et direction", share: 38.4, costWeight: 1.35 },
        b: { label: "Catégorie B · application", share: 22.1, costWeight: 1.0 },
        c: { label: "Catégorie C · exécution", share: 37.4, costWeight: 0.78 },
        unknown: { label: "Catégorie indéterminée", share: 2.0, costWeight: 1.0 }
      },
      publicOccupations: {
        military: { label: "Militaires des armées", short: "ARM", versant: "fpe", baseline: 200.0, employerCost: 0.090, retention: 0.94, careerYears: 18, pensionRate: 0.36, permanentShare: 0, military: true, categoryMix: false },
        police: { label: "Police nationale", short: "POL", versant: "fpe", baseline: 152.2, employerCost: 0.078, retention: 0.975, careerYears: 25, pensionRate: 0.31, permanentShare: 0.88, categoryMix: false },
        gendarmerie: { label: "Gendarmerie active", short: "GEN", versant: "fpe", baseline: 101.7, employerCost: 0.085, retention: 0.97, careerYears: 22, pensionRate: 0.35, permanentShare: 0, military: true, categoryMix: false },
        judiciary: { label: "Magistrats, greffes et juridictions", short: "JUD", versant: "fpe", baseline: 37.3, employerCost: 0.083, retention: 0.985, careerYears: 30, pensionRate: 0.28, permanentShare: 0.91, categoryMix: true },
        prison: { label: "Administration pénitentiaire", short: "PEN", versant: "fpe", baseline: 43.9, employerCost: 0.067, retention: 0.97, careerYears: 25, pensionRate: 0.31, permanentShare: 0.90, categoryMix: false },
        youthJustice: { label: "Protection judiciaire de la jeunesse", short: "PJJ", versant: "fpe", baseline: 9.2, employerCost: 0.064, retention: 0.975, careerYears: 27, pensionRate: 0.28, permanentShare: 0.82, categoryMix: true },
        education: { label: "Éducation, supérieur et recherche", short: "EDU", versant: "fpe", baseline: 1144.0, employerCost: 0.061, retention: 0.985, careerYears: 30, pensionRate: 0.28, permanentShare: 0.72, categoryMix: true },
        stateAdmin: { label: "Autres administrations et opérateurs de l’État", short: "ADM", versant: "fpe", baseline: 899.1, employerCost: 0.066, retention: 0.985, careerYears: 30, pensionRate: 0.28, permanentShare: 0.70, categoryMix: true },
        hospital: { label: "Hôpitaux et établissements médico-sociaux publics", short: "HOP", versant: "fph", baseline: 1249.9, employerCost: 0.064, retention: 0.982, careerYears: 28, pensionRate: 0.29, permanentShare: 0.66, categoryMix: true },
        firefighters: { label: "Sapeurs-pompiers professionnels", short: "SPP", versant: "fpt", baseline: 44.3, employerCost: 0.070, retention: 0.975, careerYears: 25, pensionRate: 0.31, permanentShare: 0.94, categoryMix: false },
        territorial: { label: "Autres services territoriaux", short: "TER", versant: "fpt", baseline: 1995.1, employerCost: 0.055, retention: 0.985, careerYears: 30, pensionRate: 0.28, permanentShare: 0.69, categoryMix: true }
      },
      employmentTypes: [
        { id: "privatePermanent", label: "Salariés privés en CDI", value: 17.0, note: "estimation cohérente avec l’enquête Emploi" },
        { id: "privateLimited", label: "CDD et intérim privés", value: 2.8, note: "emplois à durée limitée" },
        { id: "apprentices", label: "Alternance et stages", value: 1.1, note: "principalement les 15–24 ans" },
        { id: "independent", label: "Indépendants", value: 4.24, note: "13,5 % de l’emploi" },
        { id: "publicPermanent", label: "Fonctionnaires et militaires", value: 4.06, note: "trois versants" },
        { id: "publicOther", label: "Contractuels et autres agents publics", value: 1.82, note: "contrats, aidés et autres statuts" },
        { id: "otherEmployment", label: "Autres emplois et arrondis", value: 0.38, note: "sans contrat connu et écarts de champ" }
      ],
      pools: {
        unemployedBIT: 2425.7,
        halo: 1870.0,
        underemployment: 1260.4,
        franceTravailABC: 5801.5,
        franceTravailTraining: 343.8,
        annualTrainingEntries: 918.9,
        trainingEmploymentRate: 60.6
      },
      pension: {
        careerHorizon: 40,
        averageRemainingCareer: 22,
        pensionAccrualRate: 0.28,
        discountRate: 0.025,
        paymentYears: 18,
        employerContributionShare: { fpe: 0.28, fpt: 0.20, fph: 0.20, military: 0.38 }
      }
    },
    controls: {
      fertility: { label: "Fécondité hors nouvelles mesures", min: 1.0, max: 2.4, step: 0.01, value: 1.56, unit: " enfant/femme", kind: "assumption" },
      lifeExpectancy: { label: "Évolution exogène de l’espérance de vie", min: -3, max: 5, step: 0.5, value: 0, unit: " an", kind: "assumption" },
      economicMigration: { label: "Solde migratoire économique supposé", min: -50, max: 300, step: 5, value: 50, unit: " k/an", kind: "assumption" },
      otherMigration: { label: "Solde migratoire autres motifs supposé", min: -100, max: 300, step: 5, value: 100, unit: " k/an", kind: "assumption" },
      integration: { label: "Taux d’emploi des nouveaux arrivants supposé", min: 40, max: 80, step: 1, value: 62, unit: " %", kind: "assumption" },
      nuclear: { label: "Nucléaire supplémentaire en 2035", min: -10, max: 20, step: 1, value: 0, unit: " GW" },
      renewables: { label: "Renouvelables supplémentaires en 2035", min: -20, max: 80, step: 2, value: 0, unit: " GW" },
      efficiency: { label: "Rénovation et efficacité publiques", min: 0, max: 30, step: 1, value: 0, unit: " Md€/an" },
      fossilPrice: { label: "Choc extérieur sur les prix fossiles", min: -40, max: 100, step: 5, value: 0, unit: " %", kind: "assumption" },
      carbonTax: { label: "Signal-prix carbone supplémentaire", min: -30, max: 100, step: 5, value: 0, unit: " €/t" },
      publicFpeNet: { label: "Recrutements supplémentaires — État", min: -100, max: 100, step: 5, value: 0, unit: " k/an" },
      publicFptNet: { label: "Recrutements supplémentaires — collectivités", min: -100, max: 100, step: 5, value: 0, unit: " k/an" },
      publicFphNet: { label: "Recrutements supplémentaires — hôpitaux", min: -50, max: 100, step: 5, value: 0, unit: " k/an" },
      publicPermanentShare: { label: "Part de titulaires dans les flux", min: 20, max: 100, step: 5, value: 69, unit: " %" },
      publicCategoryA: { label: "Part de catégorie A dans les flux", min: 5, max: 75, step: 1, value: 38, unit: " %" },
      publicCategoryB: { label: "Part de catégorie B dans les flux", min: 5, max: 50, step: 1, value: 22, unit: " %" },
      publicHiringCapacity: { label: "Capacité de recrutement supposée par mission", min: 2, max: 15, step: 0.5, value: 6, unit: " % des effectifs", kind: "assumption" },
      trainingEntries: { label: "Entrées en formation supplémentaires", min: -400, max: 600, step: 25, value: 0, unit: " k/an" },
      trainingMatch: { label: "Taux d’accès à l’emploi après formation supposé", min: 35, max: 80, step: 1, value: 61, unit: " %", kind: "assumption" },
      activationPlaces: { label: "Accompagnement intensif supplémentaire", min: -300, max: 600, step: 25, value: 0, unit: " k/an" },
      jobsMilitary: { label: "Recrutements — armées", min: -8, max: 30, step: 1, value: 0, unit: " k/an" },
      jobsPolice: { label: "Recrutements — Police nationale", min: -5, max: 20, step: 1, value: 0, unit: " k/an" },
      jobsGendarmerie: { label: "Recrutements — Gendarmerie", min: -4, max: 20, step: 1, value: 0, unit: " k/an" },
      jobsJudiciary: { label: "Recrutements — magistrats et greffes", min: -1, max: 8, step: 0.5, value: 0, unit: " k/an" },
      jobsPrison: { label: "Recrutements — pénitentiaire", min: -2, max: 12, step: 0.5, value: 0, unit: " k/an" },
      jobsYouthJustice: { label: "Recrutements — justice des mineurs", min: -0.25, max: 4, step: 0.25, value: 0, unit: " k/an" },
      jobsEducation: { label: "Recrutements — éducation et recherche", min: -40, max: 80, step: 5, value: 0, unit: " k/an" },
      jobsStateAdmin: { label: "Recrutements — autres services de l’État", min: -35, max: 80, step: 5, value: 0, unit: " k/an" },
      jobsHospital: { label: "Recrutements — hôpitaux publics", min: -40, max: 100, step: 5, value: 0, unit: " k/an" },
      jobsFirefighters: { label: "Recrutements — pompiers professionnels", min: -2, max: 12, step: 0.5, value: 0, unit: " k/an" },
      jobsTerritorial: { label: "Recrutements — autres services territoriaux", min: -60, max: 100, step: 5, value: 0, unit: " k/an" }
    }
  };

  const policyEngines = {
    fiscalSide: {
      laborParticipation: "revenue",
      minimumWage: "revenue",
      pensionContribution: "revenue",
      tradeProtection: "revenue",
      fraudRecovery: "revenue",
      bankLevy: "revenue"
    },
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
      laborParticipation: { group: "work", label: "Variation supposée du taux d’activité", kind: "assumption", min: -5, max: 8, step: 0.5, value: 0, unit: " pt", effects: { fiscal: -4.5, demand: 0.8, supply: 11.5, jobs: 180, poverty: -0.10, lag: 0.50 } },
      productivity: { group: "work", label: "Gain annuel de productivité supposé", kind: "assumption", min: -1, max: 2.5, step: 0.1, value: 0, unit: " pt/an", effects: { fiscal: 0, demand: 0, supply: 22, jobs: -8, inflation: -0.12, trade: 2.4, lag: 0.30 } },
      minimumWage: { group: "work", label: "Salaire minimum réel", min: -10, max: 20, step: 1, value: 0, unit: " %", effects: { fiscal: -0.04, demand: 0.38, supply: -0.10, jobs: -3, inflation: 0.025, poverty: -0.035, lag: 0.85, uncertainty: 0.18 } },

      retirementAge: { group: "pensions", label: "Écart supposé d’âge effectif de départ", kind: "assumption", min: -3, max: 3, step: 0.5, value: 0, unit: " an", effects: { fiscal: -6.2, demand: -0.6, supply: 7.5, jobs: 75, poverty: 0.03, lag: 0.55 } },
      pensionIndex: { group: "pensions", label: "Indexation au-dessus des prix", min: -4, max: 4, step: 0.5, value: 0, unit: " pt", effects: { fiscal: 4.1, demand: 2.4, supply: 0, inflation: 0.025, poverty: -0.07, lag: 0.95 } },
      pensionContribution: { group: "pensions", label: "Cotisation retraite", min: -3, max: 5, step: 0.5, value: 0, unit: " pt", effects: { fiscal: -9.5, demand: -2.4, supply: -2.2, jobs: -18, inflation: 0.03, poverty: 0.02, lag: 0.90 } },

      prevention: { group: "health", label: "Prévention supplémentaire", min: 0, max: 15, step: 0.5, value: 0, unit: " Md€/an", effects: { fiscal: 1, demand: 0.78, supply: 0.22, jobs: 7, poverty: -0.015, lag: 0.45 } },
      careEfficiency: { group: "health", label: "Efficience des soins supposée", kind: "assumption", min: -10, max: 15, step: 1, value: 0, unit: " %", effects: { fiscal: -1.25, demand: -0.18, supply: 0.22, jobs: -1.5, lag: 0.35, uncertainty: 0.12 } },
      healthWorkforce: { group: "health", label: "Soignants publics supplémentaires", min: -30, max: 80, step: 5, value: 0, unit: " k", effects: { fiscal: 0.055, demand: 0.048, supply: 0.016, jobs: 1, lag: 0.70 } },

      teacherResources: { group: "education", label: "Moyens scolaires", min: -15, max: 25, step: 1, value: 0, unit: " Md€/an", effects: { fiscal: 1, demand: 0.86, supply: 0.24, jobs: 10, poverty: -0.02, lag: 0.55 } },
      vocationalTraining: { group: "education", label: "Formation professionnelle", min: -5, max: 20, step: 1, value: 0, unit: " Md€/an", effects: { fiscal: 1, demand: 0.72, supply: 0.42, jobs: 13, poverty: -0.03, lag: 0.42 } },
      childcarePlaces: { group: "education", label: "Programme de places de garde financées", min: 0, max: 300, step: 10, value: 0, unit: " k", effects: { fiscal: 0.018, demand: 0.018, supply: 0.038, jobs: 0.8, poverty: -0.004, lag: 0.62 } },

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
      fraudRecovery: { group: "administration", label: "Recouvrement supposé fraude et erreurs", kind: "assumption", min: 0, max: 25, step: 1, value: 0, unit: " Md€/an ciblés", effects: { fiscal: -0.70, demand: -0.16, supply: -0.03, lag: 0.80, uncertainty: 0.25 } },

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

  /* Scénarios politiques : traductions EcoSim, jamais des chiffrages officiels. */
  const politicalScenarios = {
    current: [
      {
        id: "technical", name: "Gouvernement technique", short: "TECH", seats: null, color: "#667085",
        confidence: "élevée", confidenceKey: "high", date: "Convention 2026",
        summary: "Trajectoire de référence sans mesure discrétionnaire ajoutée. L’ajustement du déficit prévu jusqu’en 2029 est une hypothèse macroéconomique exogène.",
        why: "Ce scénario sert de témoin conventionnel. La baisse du déficit inscrite dans la référence n’est pas reconstruite à partir de mesures votées poste par poste.",
        euMode: "current", changes: {}, structural: {}, engines: {},
        measures: ["Aucune nouvelle mesure chiffrée", "Hypothèses macroéconomiques de référence", "Correction budgétaire postulée jusqu’en 2029"],
        sources: [{ label: "Budget de l’État 2026", url: "https://www.budget.gouv.fr/reperes/loi_de_finances/articles/chiffres-cles-budget-etat-2026" }]
      },
      {
        id: "rn", name: "Rassemblement National", short: "RN", seats: 121, color: "#253b73",
        confidence: "moyenne", confidenceKey: "medium", date: "Programme 2024 + contre-budget 2026",
        summary: "Baisse de fiscalité sur l’énergie, priorité aux fonctions régaliennes, restriction migratoire, nucléaire et protection économique.",
        why: "Les économies annoncées et les effets juridiques de la préférence nationale sont très incertains ; la fourchette doit donc compter davantage que le point central.",
        euMode: "renegotiation",
        changes: { R_TVA: -10, R_PRODUCTS: -5, GF0201: 5, GF0301: 4, GF0303: 2, GF0102: -3, GF0505: -1, GF1004: 3 },
        structural: { economicMigration: 20, otherMigration: 25, nuclear: 8, renewables: -6 },
        engines: { tradeProtection: 5, fraudRecovery: 7, publicSafety: 5, defenseCapacity: 5, domesticDefense: 18, pensionIndex: 0.5 },
        evidence: {
          "engines.fraudRecovery": {"status": "related", "sourceTitle": "RN, campagne législative 2024", "locator": "Pour réaliser des économies : lutte contre les fraudes sociales et fiscales", "url": "https://rassemblementnational.fr/legislatives-2024", "note": "Orientation documentée, mais un niveau 7 EcoSim ne représente ni un rendement budgétaire ni un objectif officiel de contrôles."},
          "changes.R_TVA": {"status": "related", "sourceTitle": "RN, législatives 2024", "locator": "Pour soutenir le pouvoir d’achat : TVA sur les énergies", "url": "https://rassemblementnational.fr/legislatives-2024", "note": "Le document évoque la TVA sur certains produits énergétiques, pas une baisse générale de recettes TVA de 10 Md€ ; valeur EcoSim illustrative."},
          "structural.economicMigration": {"status": "related", "sourceTitle": "RN, législatives 2024", "locator": "Pour réduire l’immigration légale et illégale", "url": "https://rassemblementnational.fr/legislatives-2024", "note": "Orientation générale attestée, aucun flux migratoire chiffré équivalent au curseur EcoSim."},
          "structural.otherMigration": {"status": "related", "sourceTitle": "RN, législatives 2024", "locator": "Immigration légale et illégale", "url": "https://rassemblementnational.fr/legislatives-2024", "note": "Orientation générale documentée ; le flux des autres migrations et son volume ne sont pas sourcés."},
          "structural.nuclear": {"status": "related", "sourceTitle": "RN, programme législatif 2024", "locator": "Le besoin de projection : plan Marie Curie de relance du nucléaire", "url": "https://rassemblementnational.fr/documents/20240625-programme.pdf", "note": "Plan de relance nucléaire documenté, mais +8 unités d’EcoSim n’est ni un calendrier ni un nombre de réacteurs officiels."},
          "engines.defenseCapacity": {"status": "related", "sourceTitle": "RN, programme législatif 2024", "locator": "Le devoir de protection : préserver la trajectoire de LPM", "url": "https://rassemblementnational.fr/documents/20240625-programme.pdf", "note": "La trajectoire budgétaire de défense est mentionnée ; la valeur du moteur n’est pas chiffrée dans ces unités."},
          "engines.publicSafety": {"status": "related", "sourceTitle": "RN, législatives 2024", "locator": "Pour remettre la France en ordre", "url": "https://rassemblementnational.fr/legislatives-2024", "note": "Une orientation de sécurité est documentée, mais le coefficient du moteur EcoSim n’est pas une mesure officiellement calibrée."},
        },
        measures: ["TVA/accises énergie en baisse", "Immigration et prestations plus restrictives", "Sécurité, défense, nucléaire et contenu national"],
        sources: [{ label: "Programme législatif 2024", url: "https://rassemblementnational.fr/documents/202406-programme.pdf" }, { label: "Contre-budget 2026", url: "https://francaisdeletranger.rassemblementnational.fr/documents/GRN-CONTRE-BUDGET-2026.pdf" }]
      },
      {
        id: "epr", name: "Ensemble pour la République", short: "EPR", seats: 90, color: "#e7a72d",
        confidence: "moyenne", confidenceKey: "medium", date: "Continuité 2022–2026",
        summary: "Prolongement pro-européen des réformes d’offre, avec industrie, innovation, emploi, défense et modernisation administrative.",
        why: "Le groupe n’a pas publié un nouveau programme exhaustif homogène en 2026 ; la traduction prolonge les mesures et budgets défendus depuis 2022.",
        euMode: "current",
        changes: { R_OTHERPROD: -4, R_IS: -3, GF0201: 4, GF0404: 3, GF0408: 5, GF0904: 2 },
        structural: { nuclear: 5, renewables: 12, efficiency: 3, economicMigration: 70, integration: 66 },
        engines: { laborParticipation: 1, productivity: 0.3, industrialInvestment: 7, publicResearch: 4, digitalAdministration: 5, fraudRecovery: 4, defenseCapacity: 4 },
        measures: ["Fiscalité productive et emploi", "Réindustrialisation, nucléaire et innovation", "Défense et numérisation de l’État"],
        sources: [{ label: "Renaissance — conventions et propositions", url: "https://parti-renaissance.fr/" }]
      },
      {
        id: "lfi", name: "La France insoumise – NFP", short: "LFI", seats: 70, color: "#b52355",
        confidence: "moyenne", confidenceKey: "medium", date: "NFP 2024 + programme LFI",
        summary: "Relance sociale et écologique, hausse des services publics et des salaires, retraite plus précoce et fiscalité fortement progressive.",
        why: "Le programme chiffre un volume macroéconomique élevé, mais son calendrier, le rendement fiscal et la réaction européenne restent très sensibles.",
        euMode: "renegotiation",
        changes: { GF0703: 10, GF0901: 7, GF0902: 7, GF0904: 5, GF0601: 8, GF0405: 10, GF1007: 10, R_IR: 18, R_IS: 15, R_CAPITALLEVY: 8, R_HIGHINC: 6, R_EXCEPTIONAL: 8 },
        structural: { renewables: 35, efficiency: 12, carbonTax: 15, economicMigration: 70, otherMigration: 140, integration: 70 },
        engines: { minimumWage: 14, retirementAge: -2, pensionIndex: 1.5, teacherResources: 12, healthWorkforce: 55, socialHousing: 90, targetedTransfers: 12, publicResearch: 10, transportInfrastructure: 12, bankLevy: 6, fraudRecovery: 9 },
        evidence: {
          "changes.GF0703": {"status": "related", "sourceTitle": "La France insoumise, réponses à l’Ordre national des infirmiers", "locator": "Investissement en ressources humaines hospitalières", "url": "https://programme.lafranceinsoumise.fr/reponses-aux-associations/ordre-national-des-infirmiers/", "note": "L’orientation santé est documentée, mais +10 Md€ dans la ligne hospitalière est une convention EcoSim non équivalente au plan officiel."},
          "engines.healthWorkforce": {"status": "related", "sourceTitle": "La France insoumise, réponses à l’Ordre national des infirmiers", "locator": "Plan de recrutement pluriannuel : 100 000 soignants et médecins supplémentaires à l’hôpital", "url": "https://programme.lafranceinsoumise.fr/reponses-aux-associations/ordre-national-des-infirmiers/", "note": "Objectif national documenté ; les 55 milliers du curseur EcoSim ne représentent pas l’intégralité du plan, son calendrier ou ses coûts."},
          "engines.retirementAge": {"status": "related", "sourceTitle": "La France insoumise, octobre 2023", "locator": "Plan de revalorisation des retraites : retraite à 60 ans après 40 ans", "url": "https://lafranceinsoumise.fr/2023/10/24/revalorisation-des-pensions-retraite-tout%C2%B7es-dans-la-rue-ce-mardi-24-octobre/", "note": "La retraite à 60 ans est documentée, mais -2 ans dans EcoSim ne reproduit pas l’ensemble des conditions de carrière, ni les coûts."},
          "engines.pensionIndex": {"status": "related", "sourceTitle": "La France insoumise, octobre 2023", "locator": "Revalorisation de 10 % des pensions revendiquée", "url": "https://lafranceinsoumise.fr/2023/10/24/revalorisation-des-pensions-retraite-tout%C2%B7es-dans-la-rue-ce-mardi-24-octobre/", "note": "Revalorisation documentée, mais le +1,5 du curseur pensionIndex n’est pas équivalent à +10 % des pensions."},

          "engines.minimumWage": {
            status: "related",
            sourceValue: 14,
            sourceUnit: "% de hausse du SMIC net annoncé",
            modelUnit: "% de salaire minimum réel",
            sourceTitle: "NFP, proposition macroéconomique, juin 2024",
            locator: "p. 4, section « Augmenter fortement les salaires »",
            url: "https://lafranceinsoumise.fr/wp-content/uploads/2024/06/RECIT-MACRO-FRONT-POPULAIRE-VF.pdf#page=4",
            note: "Le document annonce +14 % du SMIC net, tandis que le levier EcoSim est +14 % de salaire minimum réel. L’inflation et le calendrier ne sont pas réconciliés : même chiffre, grandeur différente. Les effets économiques sont des hypothèses EcoSim."
          }
        },
        measures: ["SMIC, retraites et transferts revalorisés", "Services publics et planification écologique", "Impôts progressifs, capital et grandes entreprises"],
        sources: [{ label: "Proposition macroéconomique NFP", url: "https://lafranceinsoumise.fr/wp-content/uploads/2024/06/RECIT-MACRO-FRONT-POPULAIRE-VF.pdf" }, { label: "L’Avenir en commun", url: "https://programme.lafranceinsoumise.fr/category/programme/laec/" }]
      },
      {
        id: "soc", name: "Socialistes et apparentés", short: "SOC", seats: 68, color: "#d94b70",
        confidence: "moyenne", confidenceKey: "medium", date: "NFP + déclaration de groupe 2024",
        summary: "Pouvoir d’achat, services publics, logement et transition écologique, financés par une fiscalité plus progressive.",
        why: "La base NFP est commune, mais le scénario retient une intensité et une renégociation européenne plus graduelles.",
        euMode: "renegotiation",
        changes: { GF0703: 7, GF0901: 5, GF0902: 5, GF0601: 7, GF0405: 7, GF1006: 5, GF1007: 6, R_IR: 11, R_IS: 8, R_CAPITALLEVY: 5, R_HIGHINC: 3 },
        structural: { renewables: 28, efficiency: 10, carbonTax: 10, integration: 68 },
        engines: { minimumWage: 7, retirementAge: -1, pensionIndex: 0.5, teacherResources: 8, healthWorkforce: 35, socialHousing: 65, targetedTransfers: 8, publicResearch: 6, transportInfrastructure: 8 },
        evidence: {
          "engines.minimumWage": {"status": "related", "sourceTitle": "PS, déclaration du groupe, 22 juillet 2024", "locator": "Salaires : SMIC à 1 600 € nets", "url": "https://parti-socialiste.fr/vie-parlementaire/notre-declaration-politique-17eme-legislature/", "note": "Montant net documenté, mais le +7 du levier EcoSim est un pourcentage de salaire minimum réel : grandeur non équivalente."},
          "engines.socialHousing": {"status": "related", "sourceTitle": "PS, budget contre la vie chère", "locator": "Logement : 125 000 logements sociaux neufs en 2024", "url": "https://parti-socialiste.fr/vie-parlementaire/un-budget-contre-la-vie-chere-est-possible/", "note": "Volume de logements documenté ; le curseur EcoSim de logements ne reproduit ni l’année ni la ventilation ni le coût précis."},
          "changes.GF0703": {"status": "related", "sourceTitle": "PS, budget contre la vie chère", "locator": "Reconstruction de l’hôpital public", "url": "https://parti-socialiste.fr/vie-parlementaire/un-budget-contre-la-vie-chere-est-possible/", "note": "Orientation hospitalière documentée ; +7 Md€ est une ventilation pédagogique non attribuable officiellement au PS."},
          "engines.pensionIndex": {"status": "related", "sourceTitle": "PS, déclaration politique de juillet 2024", "locator": "Revaloriser les petites retraites", "url": "https://parti-socialiste.fr/vie-parlementaire/notre-declaration-politique-17eme-legislature/", "note": "La mesure documentée vise les petites pensions ; le levier agrégé de l’indice n’est pas équivalent."},
        },
        measures: ["Pouvoir d’achat et retraite révisée", "École, santé, logement et rail", "Fiscalité progressive et transition juste"],
        sources: [{ label: "Déclaration politique du groupe", url: "https://parti-socialiste.fr/vie-parlementaire/notre-declaration-politique-17eme-legislature/" }]
      },
      {
        id: "dr", name: "Droite Républicaine", short: "DR", seats: 47, color: "#3776b6",
        confidence: "faible", confidenceKey: "low", date: "Orientations LR 2024–2026",
        summary: "Réduction de la dépense, baisse des prélèvements productifs, travail et retraite plus tardive, sécurité, défense et nucléaire.",
        why: "Les économies sont ventilées par EcoSim faute de programme national actuel entièrement chiffré et consolidé.",
        euMode: "current",
        changes: { GF0103: -6, GF0401: -3, GF1007: -4, R_IS: -7, R_OTHERPROD: -6, R_SOCIAL: -5, GF0201: 4, GF0301: 4, GF0303: 2 },
        structural: { economicMigration: 45, otherMigration: 60, nuclear: 8, renewables: 6 },
        engines: { retirementAge: 1, laborParticipation: 1.5, careEfficiency: 7, digitalAdministration: 7, fraudRecovery: 6, publicSafety: 5, defenseCapacity: 5, productivity: 0.3 },
        measures: ["Économies de fonctionnement", "Charges et impôts productifs en baisse", "Travail, sécurité, défense et nucléaire"],
        sources: [{ label: "Les Républicains", url: "https://republicains.fr/" }]
      },
      {
        id: "eco", name: "Écologiste et Social", short: "EcoS", seats: 38, color: "#2d9b67",
        confidence: "moyenne", confidenceKey: "medium", date: "NFP 2024 + programme écologiste",
        summary: "Investissements climatiques, rénovation, rail et services publics, avec fiscalité progressive et sortie graduelle du nucléaire.",
        why: "Les gains climatiques sont mieux identifiés que les délais industriels et les besoins d’appoint du système électrique.",
        euMode: "renegotiation",
        changes: { GF0405: 12, GF0503: 8, GF0504: 4, GF0601: 8, GF0704: 4, GF0901: 4, GF1007: 5, R_IR: 9, R_CAPITALLEVY: 6, R_HIGHINC: 3, R_PRODUCTS: 5 },
        structural: { nuclear: -6, renewables: 52, efficiency: 18, carbonTax: 35 },
        engines: { adaptation: 8, agricultureTransition: 8, carbonSinks: 5, transportInfrastructure: 14, socialHousing: 65, targetedTransfers: 7, publicResearch: 6 },
        evidence: {
          "changes.GF0901": {"status": "related", "sourceTitle": "Les Écologistes, 10 piliers, juin 2024", "locator": "Pilier 5 : plan massif pour l’Éducation nationale", "url": "https://lesecologistes.fr/posts/3cyFgfScqsrMXIt3h2Bh6l/10-piliers-des-ecologistes-pour-changer-la-vie", "note": "La source ne donne pas une ventilation de +4 Md€ pour l’enseignement primaire ; montant purement EcoSim."},
          "structural.efficiency": {"status": "related", "sourceTitle": "Les Écologistes, 10 piliers, 10 juin 2024", "locator": "Pilier 1 : rénovation des bâtiments et logements", "url": "https://lesecologistes.fr/posts/3cyFgfScqsrMXIt3h2Bh6l/10-piliers-des-ecologistes-pour-changer-la-vie", "note": "Rénovation thermique documentée ; l’intensité du curseur d’efficacité énergétique est propre à EcoSim."},
          "structural.nuclear": {"status": "related", "sourceTitle": "Les Écologistes, 10 piliers, 10 juin 2024", "locator": "Pilier 1 : sortie programmée du nucléaire", "url": "https://lesecologistes.fr/posts/3cyFgfScqsrMXIt3h2Bh6l/10-piliers-des-ecologistes-pour-changer-la-vie", "note": "Orientation documentée ; -6 unités du curseur ne constitue pas un plan officiel de fermetures."},
          "engines.transportInfrastructure": {"status": "related", "sourceTitle": "Les Écologistes, 10 piliers, 10 juin 2024", "locator": "Pilier 1 : rail et transports de proximité", "url": "https://lesecologistes.fr/posts/3cyFgfScqsrMXIt3h2Bh6l/10-piliers-des-ecologistes-pour-changer-la-vie", "note": "Politique ferroviaire documentée ; le niveau 14 du moteur n’est pas un chiffrage exact."},
          "changes.GF0405": {"status": "related", "sourceTitle": "Les Écologistes, 10 piliers, 10 juin 2024", "locator": "Pilier 1 : rail et transports de proximité", "url": "https://lesecologistes.fr/posts/3cyFgfScqsrMXIt3h2Bh6l/10-piliers-des-ecologistes-pour-changer-la-vie", "note": "+12 Md€ est un choix de ventilation EcoSim, non une dépense chiffrée dans la source."},
          "changes.R_HIGHINC": {"status": "related", "sourceTitle": "Les Écologistes, 10 piliers, 10 juin 2024", "locator": "Pilier 2 : ISF climatique et fiscalité des plus riches", "url": "https://lesecologistes.fr/posts/3cyFgfScqsrMXIt3h2Bh6l/10-piliers-des-ecologistes-pour-changer-la-vie", "note": "La source cite la taxation des plus aisés ; +3 Md€ est un rendement supposé, non une estimation officielle."},
          "changes.GF0503": {"status": "related", "sourceTitle": "Les Écologistes, 10 piliers, 10 juin 2024", "locator": "Pilier 1 : plan climat et adaptation", "url": "https://lesecologistes.fr/posts/3cyFgfScqsrMXIt3h2Bh6l/10-piliers-des-ecologistes-pour-changer-la-vie", "note": "L’objectif climatique est documenté, mais l’affectation de +8 Md€ à cette ligne fonctionnelle n’est pas prouvée."},
        },
        measures: ["Rénovation, renouvelables et rail", "Biodiversité et adaptation", "Compensation sociale et impôts progressifs"],
        sources: [{ label: "Programme du Nouveau Front populaire", url: "https://lesecologistes.fr/posts/1Otm5ILXmpHTs3IQtYEcHC/le-programme-du-nouveau-front-populaire" }]
      },
      {
        id: "dem", name: "Les Démocrates", short: "DEM", seats: 37, color: "#e18a28",
        confidence: "faible", confidenceKey: "low", date: "Orientation sociale-libérale pro-UE",
        summary: "Équilibre des comptes, soutien aux PME, éducation, transition énergétique et intégration européenne.",
        why: "Le groupe rassemble des sensibilités différentes et ne dispose pas d’un programme budgétaire collectif exhaustif pour 2026.",
        euMode: "current",
        changes: { GF0901: 3, GF0904: 2, GF0408: 3, GF0103: -2, R_OTHERPROD: -2 },
        structural: { renewables: 18, nuclear: 3, efficiency: 5, integration: 68 },
        engines: { vocationalTraining: 4, childcarePlaces: 50, publicResearch: 4, digitalAdministration: 4, fraudRecovery: 3, industrialInvestment: 3 },
        measures: ["Éducation et formation", "PME, innovation et simplification", "Transition compatible avec l’UE"],
        sources: [{ label: "Mouvement Démocrate", url: "https://www.mouvementdemocrate.fr/" }]
      },
      {
        id: "hor", name: "Horizons & Indépendants", short: "HOR", seats: 35, color: "#345d79",
        confidence: "moyenne", confidenceKey: "medium", date: "Manifeste Horizons",
        summary: "État recentré, comptes maîtrisés, compétitivité, travail, éducation, ordre public et décarbonation technologique.",
        why: "Le manifeste fixe une direction plus qu’un budget détaillé ; EcoSim propose donc une traduction modérée.",
        euMode: "current",
        changes: { GF0103: -4, GF0401: -2, R_OTHERPROD: -4, GF0201: 3, GF0301: 3, GF0904: 3, GF0408: 4 },
        structural: { nuclear: 6, renewables: 14, efficiency: 4 },
        engines: { retirementAge: 0.5, laborParticipation: 1, productivity: 0.3, digitalAdministration: 7, careEfficiency: 5, publicSafety: 4, industrialInvestment: 5, publicResearch: 4 },
        measures: ["État moins dispendieux", "Travail, compétitivité et innovation", "Ordre, éducation et décarbonation"],
        sources: [{ label: "Manifeste Horizons", url: "https://horizonsleparti.fr/le-manifeste/" }]
      },
      {
        id: "liot", name: "Libertés, Indépendants, Outre-mer et Territoires", short: "LIOT", seats: 23, color: "#78a6aa",
        confidence: "faible", confidenceKey: "low", date: "Déclaration et positions de groupe",
        summary: "Services de proximité, territoires, collectivités, logement et infrastructures, avec une ligne budgétaire volontairement pluraliste.",
        why: "LIOT est un groupe composite : ce scénario est une moyenne de positions territoriales, pas un programme commun détaillé.",
        euMode: "current",
        changes: { GF0602: 5, GF0405: 5, GF0703: 4, GF0901: 3, GF0103: 2, GF1006: 2 },
        structural: { renewables: 10, efficiency: 4 },
        engines: { transportInfrastructure: 6, healthWorkforce: 20, housingBuild: 35, digitalAdministration: 2 },
        measures: ["Services publics de proximité", "Collectivités et outre-mer", "Transport, santé et logement"],
        sources: [{ label: "Groupe LIOT", url: "https://liot.assemblee-nationale.fr/" }]
      },
      {
        id: "gdr", name: "Gauche Démocrate et Républicaine", short: "GDR", seats: 17, color: "#b6323a",
        confidence: "moyenne", confidenceKey: "medium", date: "NFP + positions GDR/PCF",
        summary: "Hausse des salaires et des services publics, retraite plus précoce, investissements industriels publics et taxation du capital.",
        why: "Le groupe comprend une composante ultramarine autonome ; le scénario représente le noyau économique commun et non chaque député.",
        euMode: "renegotiation",
        changes: { GF0703: 9, GF0901: 6, GF0902: 6, GF0404: 8, GF0405: 7, GF1007: 8, R_IR: 13, R_IS: 12, R_CAPITALLEVY: 7, R_HIGHINC: 4 },
        structural: { nuclear: 3, renewables: 24, efficiency: 10, integration: 68 },
        engines: { minimumWage: 15, retirementAge: -2, pensionIndex: 1, publicPayroll: 5, industrialInvestment: 12, developmentBank: 15, bankLevy: 7, healthWorkforce: 45, teacherResources: 10 },
        measures: ["Salaires, pensions et services publics", "Plan industriel et financement public", "Capital, banques et hauts revenus davantage taxés"],
        sources: [{ label: "Groupe GDR", url: "https://groupe-communiste.assemblee-nationale.fr/" }]
      },
      {
        id: "udr", name: "Union des droites pour la République", short: "UDR", seats: 17, color: "#253253",
        confidence: "faible", confidenceKey: "low", date: "Orientation UDR 2024–2026",
        summary: "Baisse d’impôts et de dépenses, immigration réduite, sécurité, défense, nucléaire et préférence économique nationale.",
        why: "Le groupe est récent et son programme budgétaire consolidé reste incomplet ; l’incertitude de traduction est élevée.",
        euMode: "renegotiation",
        changes: { GF0103: -6, GF0102: -3, GF1007: -5, R_IR: -6, R_IS: -6, R_OTHERPROD: -5, GF0201: 4, GF0301: 4 },
        structural: { economicMigration: 15, otherMigration: 20, nuclear: 9, renewables: -2 },
        engines: { retirementAge: 0.5, laborParticipation: 1, digitalAdministration: 8, fraudRecovery: 7, publicSafety: 6, defenseCapacity: 5, tradeProtection: 3 },
        measures: ["Impôts et fonctionnement en baisse", "Immigration fortement réduite", "Régalien, nucléaire et souveraineté"],
        sources: [{ label: "Groupe UDR à l’Assemblée", url: "https://www2.assemblee-nationale.fr/instances/fiche/OMC_PO872880" }]
      }
    ],
    historical: [
      {
        id: "rn20", name: "Famille nationale-souverainiste", short: "RN · 20 ans", color: "#253b73", confidence: "faible", confidenceKey: "low", date: "Noyau récurrent 2007–2026",
        summary: "Préférence nationale, immigration basse, sécurité, protection commerciale, fiscalité énergie et souveraineté européenne.", why: "Les positions sur l’euro et certaines dépenses ont changé. Seul le noyau récurrent est cumulé.", euMode: "renegotiation",
        changes: { R_TVA: -9, R_PRODUCTS: -5, GF0201: 5, GF0301: 5, GF0303: 2, GF0102: -3, GF1004: 4 }, structural: { economicMigration: 5, otherMigration: 10, nuclear: 8, renewables: -5 }, engines: { tradeProtection: 7, publicSafety: 6, defenseCapacity: 5, domesticDefense: 22, fraudRecovery: 6 },
        measures: ["Noyau commun de cinq cycles électoraux", "Contradictions historiques exclues", "Ruptures UE testées en sensibilité"], sources: [{ label: "Archive 2007", url: "https://www.vie-publique.fr/discours/166209-programme-electoral-de-jean-marie-le-pen-president-du-front-national-et" }]
      },
      {
        id: "centre20", name: "Famille centrale pro-européenne", short: "Centre · 20 ans", color: "#d89a2b", confidence: "faible", confidenceKey: "low", date: "UDF–MoDem–Renaissance 2007–2026",
        summary: "Europe, équilibre budgétaire, investissement, innovation, compétitivité et réformes du travail.", why: "Cette lignée rassemble des partis distincts ; elle mesure une continuité thématique, pas une organisation unique.", euMode: "current",
        changes: { GF0103: -3, R_OTHERPROD: -4, R_IS: -3, GF0408: 5, GF0904: 4, GF0405: 3 }, structural: { nuclear: 4, renewables: 16, efficiency: 5, integration: 68 }, engines: { laborParticipation: 1, productivity: 0.3, digitalAdministration: 6, publicResearch: 5, industrialInvestment: 5, fraudRecovery: 4 },
        measures: ["Construction européenne", "Comptes publics et réformes d’offre", "Éducation, innovation et investissement"], sources: [{ label: "Archive centriste 2007", url: "https://www.vie-publique.fr/discours/166035-declaration-de-m-francois-bayrou-president-de-ludf-et-candidat-lel" }]
      },
      {
        id: "radicalleft20", name: "Famille gauche de rupture", short: "LFI · 20 ans", color: "#b52355", confidence: "faible", confidenceKey: "low", date: "PG–Front de gauche–LFI 2008–2026",
        summary: "Redistribution, retraite à 60 ans, services publics, planification écologique et renégociation européenne.", why: "Le périmètre et les chiffrages ont évolué ; les engagements récurrents sont appliqués à intensité médiane.", euMode: "renegotiation",
        changes: { GF0703: 9, GF0901: 7, GF0902: 7, GF0601: 8, GF0405: 9, GF1007: 9, R_IR: 16, R_IS: 13, R_CAPITALLEVY: 7, R_HIGHINC: 5 }, structural: { renewables: 34, efficiency: 13, carbonTax: 15, integration: 70 }, engines: { minimumWage: 14, retirementAge: -2, teacherResources: 11, healthWorkforce: 50, socialHousing: 80, targetedTransfers: 10, publicResearch: 9, bankLevy: 6 },
        measures: ["Redistribution et retraite à 60 ans", "Planification et services publics", "Renégociation européenne"], sources: [{ label: "Archives L’Avenir en commun", url: "https://programme.lafranceinsoumise.fr/category/programme/laec/" }]
      },
      {
        id: "ps20", name: "Famille social-démocrate", short: "PS · 20 ans", color: "#d94b70", confidence: "faible", confidenceKey: "low", date: "PS 2007–2026",
        summary: "Services publics, redistribution progressive, logement, emploi et transition écologique dans un cadre européen réformé.", why: "Seuls les engagements électoraux récurrents sont simulés, pas le bilan des gouvernements.", euMode: "current",
        changes: { GF0703: 6, GF0901: 5, GF0902: 5, GF0601: 6, GF0405: 6, GF1007: 6, R_IR: 10, R_IS: 6, R_CAPITALLEVY: 4 }, structural: { renewables: 25, efficiency: 9, carbonTax: 10 }, engines: { minimumWage: 5, retirementAge: -0.5, teacherResources: 7, healthWorkforce: 30, socialHousing: 55, targetedTransfers: 7, publicResearch: 6 },
        measures: ["Services publics et cohésion", "Fiscalité progressive", "Transition écologique européenne"], sources: [{ label: "Archive présidentielle 2012", url: "https://www.vie-publique.fr/discours/184914-declaration-de-m-francois-hollande-depute-ps-et-candidat-lelection" }]
      },
      {
        id: "right20", name: "Famille libérale-conservatrice", short: "UMP/LR · 20 ans", color: "#3776b6", confidence: "faible", confidenceKey: "low", date: "UMP–LR 2007–2026",
        summary: "Réduction des dépenses et charges, travail, retraite plus tardive, sécurité, défense et nucléaire.", why: "Les objectifs d’économies ont souvent été plus précis que leur ventilation ; EcoSim répartit prudemment l’effort.", euMode: "current",
        changes: { GF0103: -7, GF0401: -3, GF1007: -4, R_IS: -7, R_OTHERPROD: -7, R_SOCIAL: -5, GF0201: 4, GF0301: 4 }, structural: { economicMigration: 40, otherMigration: 55, nuclear: 8 }, engines: { retirementAge: 1, laborParticipation: 1.5, careEfficiency: 7, digitalAdministration: 7, publicSafety: 5, defenseCapacity: 5, productivity: 0.3 },
        measures: ["Dépense et charges réduites", "Travail et retraites", "Sécurité et nucléaire"], sources: [{ label: "Archives électorales", url: "https://www.vie-publique.fr/discours/165957-interview-de-m-nicolas-sarkozy-ministre-de-linterieur-et-de-lamenage" }]
      },
      {
        id: "greens20", name: "Famille écologiste", short: "Verts · 20 ans", color: "#2d9b67", confidence: "faible", confidenceKey: "low", date: "Verts–EELV–Écologistes 2007–2026",
        summary: "Sobriété, renouvelables, rénovation, rail, biodiversité, fiscalité écologique compensée et réduction du nucléaire.", why: "Le rythme de sortie du nucléaire et les instruments fiscaux ont varié ; la trajectoire retenue est médiane.", euMode: "current",
        changes: { GF0405: 11, GF0503: 8, GF0504: 4, GF0601: 7, GF1007: 5, R_PRODUCTS: 5, R_IR: 7, R_CAPITALLEVY: 4 }, structural: { nuclear: -7, renewables: 50, efficiency: 18, carbonTax: 35 }, engines: { adaptation: 8, agricultureTransition: 8, carbonSinks: 5, transportInfrastructure: 13, socialHousing: 55, targetedTransfers: 6 },
        measures: ["Sobriété et rénovation", "Renouvelables et nucléaire réduit", "Fiscalité écologique compensée"], sources: [{ label: "Les Écologistes", url: "https://lesecologistes.fr/" }]
      },
      {
        id: "communist20", name: "Famille communiste et GDR", short: "PCF/GDR · 20 ans", color: "#b6323a", confidence: "faible", confidenceKey: "low", date: "PCF–Front de gauche–GDR 2007–2026",
        summary: "Salaires et pensions, services publics, réindustrialisation publique, droits sociaux et taxation du capital.", why: "Les coalitions ont changé ; ce scénario isole les propositions économiques récurrentes.", euMode: "renegotiation",
        changes: { GF0703: 9, GF0901: 6, GF0902: 6, GF0404: 8, GF0405: 7, GF1007: 8, R_IR: 13, R_IS: 12, R_CAPITALLEVY: 7 }, structural: { nuclear: 3, renewables: 22, efficiency: 10 }, engines: { minimumWage: 15, retirementAge: -2, pensionIndex: 1, publicPayroll: 5, industrialInvestment: 12, developmentBank: 16, bankLevy: 7, healthWorkforce: 45 },
        measures: ["Salaires, retraites et services publics", "Réindustrialisation publique", "Capital et finance davantage taxés"], sources: [{ label: "Groupe GDR", url: "https://groupe-communiste.assemblee-nationale.fr/" }]
      }
    ]
  };

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

  const social = {
    ages: [
      { id: "18-24", label: "18–24 ans", mobilization: 1.0 },
      { id: "25-34", label: "25–34 ans", mobilization: 1.0 },
      { id: "35-44", label: "35–44 ans", mobilization: 0.88 },
      { id: "45-54", label: "45–54 ans", mobilization: 0.85 },
      { id: "55-64", label: "55–64 ans", mobilization: 0.72 },
      { id: "65-74", label: "65–74 ans", mobilization: 0.55 },
      { id: "75+", label: "75 ans et +", mobilization: 0.35 }
    ],
    situations: [
      { id: "private", label: "Salariés du privé", mobilization: 0.82, minAge: 18, maxAge: 74 },
      { id: "public", label: "Agents publics", mobilization: 0.95, minAge: 18, maxAge: 74 },
      { id: "unemployed", label: "Personnes sans emploi", mobilization: 0.58, minAge: 18, maxAge: 74 },
      { id: "independent", label: "Indépendants", mobilization: 0.62, minAge: 18, maxAge: 74 },
      { id: "student", label: "Étudiants", mobilization: 0.70, minAge: 18, maxAge: 34 },
      { id: "retired", label: "Retraités", mobilization: 0.65, minAge: 55, maxAge: 120 }
    ]
  };

  return {
    BASE,
    accountingVintage,
    macroCoefficients,
    sources,
    spendingGroups,
    spending,
    revenueGroups,
    revenue,
    researchVariants,
    models,
    assumptions,
    euModes,
    baseline,
    structural,
    policyEngines,
    presets,
    politicalScenarios,
    sectors,
    social,
    metadata: {
      snapshotDate: "10 octobre 2026",
      spendingDetailObservedYear: 2024,
      spendingDetailCalibratedYear: 2025,
      revenueObservedYear: 2025,
      projectionStart: 2026,
      projectionEnd: 2055,
      projectionYears: 30,
      longRunStart: 2036,
      version: "4.24.0"
    }
  };
})();
