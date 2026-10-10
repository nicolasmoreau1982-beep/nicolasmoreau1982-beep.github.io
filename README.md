# EcoSim France

EcoSim France est un simulateur interactif, pluraliste et transparent des finances publiques françaises. Il couvre l’ensemble des administrations publiques : État, organismes divers d’administration centrale, collectivités territoriales et administrations de sécurité sociale.

## Lancer localement

Le site est sans étape de compilation ni dépendance JavaScript. Node.js est nécessaire pour l'interface Python et les tests.

Les étapes de mise en ligne, référencement, audience et publicité sont détaillées dans [PUBLICATION.md](PUBLICATION.md).

```bash
python3 -m http.server 4173 --directory dist
```

Puis ouvrir `http://localhost:4173`.

L’annexe d’audit est accessible depuis le simulateur ou directement à `http://localhost:4173/audit.html`. Elle distingue données observées, recalages et hypothèses, affiche le témoin historique de `dist/history.js`, 50 comparaisons annuelles pour chacun des deux pas du rejeu et 200 comparaisons trimestrielles aux comptes Insee, ainsi que les sous-secteurs publics, les viviers de travail, la démographie, les échanges et les limites des modèles. L’ajout de cette page ne publie pas le site.

Le compte annuel intégré est rapproché du tableau Insee 3.201 actualisé en août 2026 : 1 714,1 Md€ de dépenses, 1 562,5 Md€ de recettes et 151,6 Md€ de déficit en 2025. Une publication de mai 2026 affichait un autre millésime (152,5 Md€ de déficit). Les trimestres CVS-CJO et le tableau des sous-secteurs peuvent présenter de petits écarts à l'annuel ; ils sont affichés, pas masqués. Voir [MODEL_AUDIT.md](MODEL_AUDIT.md).

La même simulation est accessible depuis Python :

```bash
python3 ecosim.py
python3 ecosim.py mon-scenario.json
python3 ecosim.py mon-scenario.json --complet
```

`mon-scenario.json` peut contenir, par exemple, `{"structural":{"jobsPolice":5},"engines":{"publicPayroll":2},"changes":{"R_IR":3}}`. Dans un script Python : `from ecosim import simulate; resultat = simulate({"structural": {"jobsPolice": 5}})`. Le calcul reste dans le moteur JavaScript partagé avec le site : l'interface Python ne crée pas une seconde version des équations.

Pour tester une réforme de barème plutôt qu'une recette imposée, utiliser `{"fiscal":{"irLowRate":5,"irTopRate":50,"wealthFloorEnabled":1}}`. Les sorties annuelles comprennent `fiscal.deltaByTax`, `fiscal.groups`, `fiscal.distributionDemandBn` et le résultat macro-budgétaire. Les réglages fiscaux sont également dans l'atelier « Fiscalité » du site.

## Données

- Total des dépenses, recettes et détail par nature : comptes des administrations publiques 2025, Insee, base 2020.
- PIB et croissance 2025 : comptes de la Nation, Insee.
- Dette fin 2025 : dette de Maastricht, Insee.
- Détail fonctionnel des dépenses : COFOG Eurostat 2024, recalé proportionnellement sur le total Insee 2025.
- Ancrage 2026–2028 : projections macroéconomiques de la Banque de France de septembre 2026.
- Trajectoire européenne : procédure concernant les déficits excessifs et recommandation du Conseil.
- Population, natalité et vieillissement : bilan démographique 2025 et projection centrale Insee 2026–2056 par âge et sexe ; cette dernière est une hypothèse conditionnelle, pas une observation future.
- Emploi public : Siasp 2024 Insee-DGAFP, ventilé entre État, territoriale, hospitalière, titulaires, contractuels et autres statuts.
- Marché du travail : enquête Emploi 2025 de l’Insee, chômage BIT, halo, sous-emploi, statuts d’emploi et statistiques Dares-France Travail.
- Emploi des immigrés : enquête Emploi 2025 de l’Insee ; motifs de séjour 2025 du ministère de l’Intérieur.
- Énergie : bilan énergétique 2024 du SDES et bilan électrique 2025 de RTE.

Toutes les sources cliquables, leurs dates et le statut des valeurs sont visibles dans l’application.

## Moteur

Le moteur est semi-structurel et déterministe. Il combine :

- multiplicateurs différenciés par instrument ;
- montée en charge et persistance ;
- effets d’offre retardés ;
- rétroaction du PIB sur les recettes ;
- réponse du chômage à l’écart d’activité ;
- allocation des créations d’emploi entre chômage, formation, halo, sous-emploi, migrations et mobilités emploi-emploi ;
- stabilisateurs automatiques ;
- stock de dette, charge d’intérêts et prime de risque ;
- scénarios institutionnels européens.

Neuf paramétrages économiques sont proposés : hypothèse centrale, lecture keynésienne, politique de l’offre, lecture libérale, réindustrialisation ciblée, consolidation en récession, stabilisation inflationniste, économie ouverte et transition énergétique contrainte. Ils utilisent la même comptabilité et ne diffèrent que par des paramètres affichés ; leurs coefficients sont des hypothèses de sensibilité, pas des médianes économétriques estimées. Les analogies avec la Grèce et l'Argentine ne sont ni des reconstitutions historiques ni des politiques appliquées automatiquement.

### Profils économiques supplémentaires (version 4.14)

Les quatre nouveaux profils agissent sur des canaux différents du moteur : séquelles différées d'un choc de demande lors d'une consolidation en récession ; financement plus sensible à l'inflation supplémentaire dans une stabilisation ; fuite accrue de la demande par les importations dans une économie ouverte ; effet d'offre énergétique moins rapide et pression sur les prix plus forte dans une transition contrainte. Les coefficients sont visibles dans l'IHM et les formules, sources et limites figurent dans [l'annexe d'audit](dist/audit.html#profils). Ils n'ont pas été ajustés sur l'histoire grecque ou argentine. Pour tester une coupe budgétaire, il faut la saisir séparément ; choisir le profil ne change aucun poste à lui seul. Pour une analogie grecque, associer le profil « Consolidation en récession » à l'hypothèse avancée « Activité déprimée ».

La version 4.0 comprend :

- douze moteurs reliés : travail, retraites, santé, éducation, logement, industrie, climat, défense, administration, solidarités, innovation et finance ;
- trente-six leviers opérationnels avec coût direct, demande, offre, emploi, inflation, commerce extérieur, émissions et pauvreté ;
- des interactions institutionnelles, notamment pour la politique commerciale européenne et les garanties publiques ;
- une lecture automatique des mécanismes dominants et des risques de double comptage ;
- des exports enrichis avec les résultats des moteurs publics.
- un banc d’essai des onze groupes politiques de la XVIIe législature et d’un gouvernement technique conventionnel ;
- sept scénarios de familles politiques construits à partir des engagements récurrents de 2007 à 2026 ;
- une traduction intégralement visible des programmes vers les postes budgétaires, la démographie, l’énergie et les moteurs publics ;
- une comparaison à 1, 3, 5, 10, 20 et 30 ans avec sources et confiance de traduction séparée des hypothèses économiques ;
- une extrapolation 2036–2055 explicitement structurelle, fondée sur les projections démographiques Insee/COR et assortie d’une incertitude accélérée.

Dans le comparateur politique, le lecteur choisit maintenant une des neuf lectures économiques **commune à tous les programmes**. Le détail d'un programme montre aussi la plage de déficit et de dette obtenue sous les neuf profils ; ce n'est pas un intervalle de confiance. « Appliquer au simulateur » reprend le profil affiché et les mêmes mesures que l'aperçu. Les anciens champs `model` propres aux partis, jamais utilisés dans le calcul, ont été retirés pour ne pas suggérer qu'une théorie économique différente serait imposée à chaque groupe. Cela ne rend ni les chiffrages des programmes ni les coefficients du moteur empiriquement validés.

La version 4.2 simplifie l’utilisation avec un parcours en quatre étapes, une lecture automatique en langage courant, des réglages mobiles repliables, un budget compact par défaut et un filtre des seuls postes modifiés.

La version 4.3 ajoute un moteur d’emploi par cohortes : recrutements des trois fonctions publiques, titulaires et contractuels, coût employeur annuel, engagement actualisé à quarante ans, formation, accompagnement et viviers de main-d’œuvre. Les populations BIT, France Travail, halo et sous-emploi restent séparées pour éviter les doubles comptes.

La version 4.4 distingue les recrutements et carrières des armées, de la Police nationale, de la Gendarmerie, des juridictions, du pénitentiaire, de la justice des mineurs, de l’éducation-recherche, des autres administrations de l’État, des hôpitaux publics, des sapeurs-pompiers professionnels et des autres services territoriaux. Les militaires sont séparés des titulaires civils ; les réservistes et pompiers volontaires ne sont pas comptés comme emplois publics permanents.

La version 4.5 réconcilie le résumé avec le solde direct du moteur, sépare les variations de dépenses et de recettes, relie la titularisation et les rémunérations aux recrutements, fait passer les cohortes d'agents vers des pensions simplifiées, borne les embauches et les effets énergétiques, et ajoute une saisie numérique aux curseurs. Elle permet d'enregistrer plusieurs scénarios locaux et d'en comparer un avec le scénario en cours. Une interface Python partage exactement le même moteur que le site. Le diagnostic européen précise que la trajectoire des dépenses nettes n'est pas encore calculée.

La version 4.6 ajoute une matrice exploratoire des réactions sociales selon sept classes d'âge et six situations. Elle affiche un indice de mécontentement relatif, une pression de mobilisation potentielle et une fourchette de sensibilité du vote sortant. Ces poids sont des hypothèses explicites, non des probabilités ou des prévisions électorales ; ils ne rétroagissent pas automatiquement sur le PIB ou le budget.

### Contrôle rétrospectif (version 4.7)

`dist/history.js` fige 23 observations annuelles françaises 2003–2025 : PIB nominal et croissance réelle, déficit et dette des APU en part de PIB, chômage. Elles proviennent des séries Eurostat [PIB `nama_10_gdp`](https://ec.europa.eu/eurostat/databrowser/view/nama_10_gdp/default/table), [solde `gov_10a_main`](https://ec.europa.eu/eurostat/databrowser/view/gov_10a_main/default/table), [dette `gov_10dd_edpt1`](https://ec.europa.eu/eurostat/databrowser/view/gov_10dd_edpt1/default/table) et [chômage `une_rt_a`](https://ec.europa.eu/eurostat/databrowser/view/une_rt_a/default/table), extraites le 10 octobre 2026. Il s’agit de séries *révisées*, non des publications disponibles à chaque date passée.

Le prévisionniste témoin, volontairement simple et intégralement reproductible, prédit depuis chaque origine 2007–2024 la croissance nominale médiane récente, maintient le déficit et le chômage de l’origine, puis cumule le déficit dans la dette. Les erreurs absolues moyennes et leurs 80es centiles sont calculés aux horizons 1, 3, 5 et 10 ans, crises comprises. Le moteur impose désormais que ses bandes sur le PIB, le déficit, la dette et le chômage ne soient pas plus étroites que ces erreurs historiques de référence ; entre horizons elles sont interpolées, au-delà de dix ans elles sont extrapolées linéairement à titre de *stress* non validé. `node scripts/backtest.mjs` régénère le diagnostic ; `node tests/history-backtest.mjs` vérifie notamment l’absence de lecture d’années futures et la monotonie des planchers.

`node scripts/check-history.mjs` compare sans écriture la copie figée aux séries Eurostat actuelles et signale les révisions éventuelles ; une mise à jour doit être examinée et faite manuellement.

**Ce test ne valide pas les coefficients causaux des réformes ni la trajectoire centrale actuelle** : le témoin historique n’est pas le moteur EcoSim. Ses origines se chevauchent, le faible nombre de cas à dix ans et les révisions des séries interdisent de présenter le 80e centile comme un intervalle de confiance ou une garantie de couverture. Une validation de politique publique demanderait des chocs identifiés, des millésimes de données et une comparaison hors échantillon avec d’autres modèles.

### Références scientifiques et politiques passées (version 4.8)

Le canal TVA reprend, aux horizons publiés, la variante de hausse de TVA de 1 point de PIB du [modèle Mésange 2017 (Insee/DG Trésor)](https://www.insee.fr/fr/statistiques/2848300) : trajectoire du PIB réel et niveau des prix à la consommation. Le moteur distingue désormais ce choc IPC du déflateur du PIB ; auparavant une hausse de TVA faisait baisser l’inflation simulée. Il s’agit d’un **ancrage sur un autre modèle, pas d’une validation indépendante**. Les autres postes fiscaux gardent des coefficients exploratoires.

`node scripts/benchmark-research.mjs` compare trois chocs normalisés aux variantes publiées de Mésange et indique quand le levier EcoSim n'est qu'un proxy non équivalent. `node scripts/policy-history.mjs` reprend le relèvement de TVA de 2014 et explique pourquoi le CICE ne peut pas encore être traité comme une baisse uniforme des cotisations. `node scripts/vintage-audit.mjs` confronte quelques prévisions *publiées à l'époque* par la Banque de France aux réalisations : cela évalue les limites de la prévision, pas le moteur EcoSim. Sources, chiffres, comparaison avec les autres simulateurs et lacunes prioritaires sont détaillés dans [MODEL_AUDIT.md](MODEL_AUDIT.md).

### Rejeu historique paramétrable (prototype)

`node scripts/historical-replay.mjs --annual` repart des comptes des APU en 2005, 2010, 2015 et 2020, simule jusqu'en 2025 et affiche **chaque année** le résultat comparé aux séries historiques ; sans option, il affiche les écarts finaux. `--json` restitue les trajectoires, observations, écarts, erreurs absolues moyennes, hypothèses estimées avant chaque origine et mesures non représentées. `--inputs chemin/vers/entrees.json` accepte des `events`, un `context` annuel, des `parameters`, des `responses` et des `origins` supplémentaires ; les mesures peuvent changer de niveau chaque année via `annualAmountBn` ou s'arrêter via `endYear`. Le calcul pur est dans `scripts/historical-engine.mjs`, les dépenses/recettes annuelles exactes dans `research/historical-accounts.json` (Insee 3.201 actualisé en août 2026) et le calendrier utilisé dans `research/historical-policy-timeline.json`. `node scripts/export-historical-audit.mjs` régénère les 50 lignes consultables dans l'annexe web.

`node scripts/historical-replay.mjs --quarterly --annual --quarters` calcule **quatre flux par an**, compare chaque trimestre aux comptes Insee CVS-CJO et reconstitue aussi les cibles annuelles. Chaque événement peut préciser `effectiveQuarter` et `endQuarter` (1–4) ; `quarterlyAmountBn` permet un changement de rythme annuel en cours d'année, par exemple `{"2014-Q3":20}`. Un montant annuel de 12 Md€ démarrant au T3 compte 3 Md€ en T3 et 3 Md€ en T4, soit 6 Md€ la première année. Les dettes et intérêts sont mis à jour chaque trimestre. Les comptes initiaux et les hypothèses macro restent annuels : **la référence simulée trimestrielle est synthétique**, tandis que les cibles observées viennent du [classeur Insee courant en base 2020](https://www.insee.fr/fr/statistiques/9035065?sommaire=9007859), et non de l'ancienne page en base 2010 arrêtée. Les sommes CVS-CJO ne sont pas forcées sur le compte annuel brut : en 2025, dépenses et recettes trimestrielles cumulées le dépassent d'environ 0,60 Md€ chacune. `--json` expose `comparedQuarters`, `quarterlySummary` et `observedSourceReconciliation`. Ce diagnostic n'est ni une validation causale ni un backtest du moteur principal.

`node scripts/historical-replay.mjs --ablate` donne en plus, pour chaque origine, l'erreur avec les mesures encodées et sans elles. La suppression de ces quelques mesures n'est pas un vrai contrefactuel ; elle sert à vérifier que leur ajout ne produit pas automatiquement un meilleur ajustement.

Le mode par défaut est un **rejeu rétrospectif** : deux rendements TVA 2014 ex ante, les dépenses CICE annuelles en comptabilité nationale selon le PLF 2019 et la baisse de cotisations 2019 sont renseignés. Le CICE et sa bascule n'ont que leur impact comptable : leurs effets sur l'activité et l'emploi restent non estimés. Les 2,5 + 4,2 Md€ de TVA ex ante sont comparés au rendement global ex post Insee de 6,5 Md€, sans recalage artificiel. La baisse de cotisations 2019 est maintenue à -20,4 Md€ nominaux ensuite, hypothèse grossière faute d'assiette annuelle ; le CICE disparaît après 2022 faute de série de résidus. Avec `--blind`, seules les entrées portant `amountInformationYear` antérieur ou égal à l'origine sont admises ; un contexte annuel externe doit porter `knownByYear` et être connu dès l'origine. Cela empêche d'injecter discrètement une croissance future constatée dans le calcul. Ce n'est toutefois **pas un vrai test sur millésimes d'époque** : les comptes initiaux proviennent de séries révisées en 2026. L'inventaire partiel des mesures importantes non encore chiffrées est dans `research/historical-event-inventory.json`.

Exemple de schéma pour un événement fictif, à placer dans un fichier JSON puis à passer à `--inputs` (il remplace alors le catalogue par défaut) : `{"events":[{"id":"exemple","effectiveYear":2016,"fiscalSide":"spending","instrument":"publicInvestment","amountBn":4,"annualAmountBn":{"2017":6,"2018":2},"endYear":2018}],"responses":{"publicInvestment":{"1":0.6,"2":0.5,"3":0.3}}}`. Les montants sont en Md€ nominaux annuels, et la réponse est en Md€ de PIB par Md€ de mesure. Les hypothèses par défaut sont documentées dans `research/historical-parameters.json`. Aucune politique fictive n'est incluse dans le rejeu publié.

**Ce n'est pas encore un backtest valide du moteur principal.** Le rejeu est un module expérimental distinct, utilisant la réponse TVA agrégée déjà ancrée sur Mésange. Les mesures codées ne couvrent qu'une fraction des réformes et chocs ; les tendances de dépenses et de PIB sont extrapolées uniquement à partir des années précédant le départ. Les observations futures servent exclusivement à calculer l'écart, pas à construire la trajectoire. Les écarts publiés dans l'annexe d'audit quantifient ce prototype incomplet, pas la qualité prédictive d'EcoSim. Il manque notamment les catégories historiques fines, les taux et échéances de dette, les mesures sociales/fiscales datées, les chocs extérieurs et une démographie par cohortes. `node tests/historical-replay.mjs` vérifie notamment la variation et l'expiration des mesures, l'identité du déficit, l'export web et l'absence de fuite des observations futures.

### Banc à données communes Insee et revue externe (octobre 2026)

`node scripts/comparable-insee-benchmark.mjs` (`--json` pour les lignes détaillées) rejoue le **prototype historique**, avec et sans les mesures encodées, depuis 2013, 2018 et 2020. Les comptes de départ et les cibles annuelles PIB/dépenses/recettes/dette viennent du même gel des tableaux Insee 1.101/1.102, 3.201, 3.101 et 3.105 en base 2020, archivé dans `research/insee-validation-annual.json` avec empreintes des quatre classeurs. `python3 scripts/verify-insee-validation.py` vérifie les sources en ligne ; `node tests/comparable-insee-benchmark.mjs` contrôle notamment l'absence de fuite des cibles futures. Le chômage contextuel reste issu d'une série Eurostat distincte et ne figure pas dans ce score commun.

Le rendement TVA utilisé pour 2014 est 6,7 Md€ ex ante, contre 6,5 Md€ attribués par l'Insee ex post. Le rejeu 2013→2014 donne un écart de −0,14 % de PIB nominal, +17,0 Md€ de dépenses, +1,5 Md€ de recettes, +0,73 point de déficit/PIB et +2,36 points de dette/PIB. **Ce n'est ni un effet causal de la TVA ni une véritable prévision faite en 2013** : le montant CICE archivé n'était pas connu à l'origine, d'autres politiques agissaient et la courbe de réponse TVA de Mésange utilisée ici n'a été publiée qu'en 2017. Les cas 2019 et 2021–2022 restent eux aussi incomplets. La dette observée ne suit pas simplement déficit cumulé : le tableau 3.105 publie les ajustements stock-flux, avec une discordance inter-tableaux d'environ −0,64 Md€ en 2014 qui n'est pas effacée.

Le protocole, les chiffres, les exclusions et le mandat proposé à un expert extérieur figurent dans [VALIDATION_REVIEW.md](VALIDATION_REVIEW.md). **Aucune évaluation indépendante n'a encore eu lieu** : le dossier la rend possible, il ne s'y substitue pas. Le moteur principal n'est toujours pas validé historiquement : un premier adaptateur de sa **trajectoire sans réforme** existe désormais, mais les catégories, politiques et cohortes historiques restent à renseigner avant tout classement de fiabilité.

`node scripts/core-historical-backtest.mjs` (`--json` pour les cas annuels) charge la fonction `calculateProjection` de `dist/app.js`, celle de l'IHM et de l'interface Python, en remplaçant l'état de départ par les comptes Insee gelés et la référence macro par une extrapolation médiane des seules années antérieures. Sur six départs 2005–2020, les MAE à 1/3/5 ans sont respectivement **1,46/3,53/7,30 %** pour le PIB nominal, **0,94/2,13/3,58 points** pour le déficit/PIB et **2,83/8,31/12,44 points** pour la dette/PIB. Le moteur égale exactement le témoin naïf : sans mesure, son calcul central retourne sa référence. Les tests vérifient que modifier les observations futures ne modifie pas la prévision. **Ce n'est pas un vrai hors-échantillon** : les comptes sont révisés en 2026 et les coefficients du moteur peuvent refléter l'histoire ultérieure. Le module fiscal est neutre avant 2026, la démographie 2026 est seulement décalée pour permettre l'exécution, les politiques/chocs historiques ne sont pas encodés dans ce tableau et les ajustements stock-flux manquent. Ce premier résultat ne valide donc aucun levier ni aucune bande d'incertitude. Voir l'[annexe d'audit](dist/audit.html#histoire).

Le même banc ajoute **séparément** une sensibilité TVA 2014 : les deux rendements *ex ante* datés de 2012 (2,5 et 4,2 Md€) sont sommés en `R_TVA` pour un départ 2013. À T+1, l'écart de PIB nominal simulé moins Insee est −0,04 % avec TVA contre +0,06 % sans elle ; ces chiffres ne sont **ni l'effet causal observé de la TVA ni une prévision émise en 2013**. La réponse PIB/IPC du moteur provient de Mésange 2017, la catégorie TVA est agrégée et les autres réformes/chocs de 2014 manquent. CICE, bascule de cotisations et autres événements restent explicitement exclus de ce raccord au moteur principal faute d'assiette, de chronologie et de canal macro adaptés.

Dans l'[annexe d'audit de l'IHM](dist/audit.html#audit-triplet), un sélecteur montre pour chaque cas le triplet comptes initiaux à T → mesures réellement encodées → comptes Insee observés à T+1 et au-delà, avec les écarts par indicateur, les politiques exclues et leurs sources. La [section incertitude](dist/audit.html#incertitude) sépare explicitement erreur de prévision, effet causal d'une réforme et stress de long terme ; elle n'attribue pas de couverture statistique aux bandes du moteur principal. `node scripts/export-historical-audit.mjs` régénère ces données affichées depuis le banc de calcul, et `node tests/audit-page.mjs` en contrôle la concordance.

### Nouveaux contrôles Insee (octobre 2026)

`research/insee-quarterly-observed.json` fige 94 trimestres 2003T1–2026T2 du compte des APU en base 2020 : dépenses, recettes, capacité/besoin de financement, PIB, intérêts et rémunérations publiques. Seuls les quatre premiers agrégats sont pour l'instant comparés au rejeu ; les deux derniers attendent un modèle de dépenses par nature. `research/insee-subsectors.json` fige 23 années de comptes État, ODAC, administrations locales et sécurité sociale. Le total APU est **consolidé** : en 2025, 174,53 Md€ de transferts internes sont retranchés des dépenses brutes des sous-secteurs et autant des recettes. Le tableau 3.215 et le 3.201 diffèrent encore de 0,119 Md€ sur les dépenses 2024, ce qui est conservé dans l'audit.

`research/insee-population-projection.json` contient 31 années (2026–2056), pour chaque âge de 0 à 104 ans et 105 ans ou plus, femmes et hommes, ainsi que naissances, décès, solde migratoire et ajustement statistique. Le moteur principal utilise désormais cette **référence** pour les naissances, décès, effectifs et part des 65 ans ou plus ; le scénario sans mesure retombe sur la projection Insee. La population affichée pour une année simulée est l'effectif au 1er janvier suivant. Les effets d'un changement de politique sur toute la pyramide des âges et sur les dépenses de santé/retraite ne sont pas encore cohorte par cohorte : le coefficient fiscal démographique reste exploratoire.

### Atelier fiscal (version 4.13, expérimental)

`dist/fiscal.js` est un moteur séparé du calcul macro. Il conserve une photographie datée du barème IR 2026 (revenus 2025), du barème IFI et des successions **en ligne directe**. L'impôt plancher de 2 % au-delà de 100 M€ est une **proposition**, désactivée par défaut et simplifiée. On peut modifier les taux de deux tranches IR, le seuil et la tranche supérieure de l'IFI, l'abattement de succession, les paramètres du plancher et l'année de départ. Le scénario de référence prolonge les règles 2026 en euros constants ; il ne connaît pas les futures lois.

Le calcul passe sur **16 foyers fiscaux-types pondérés**, totalisant 41,5 millions de foyers, avec revenu, parts, patrimoine net et patrimoine immobilier ; les successions sont 4 événements-types distincts. Ces poids et surtout le croisement revenu × patrimoine sont **construits**, non tirés d'un échantillon représentatif. Le [rétrotest IR 2020–2024](dist/audit.html#fiscalite) applique les barèmes historiques et les revenus/effectifs DGFiP de chaque année. Un seul facteur d'assiette, ajusté sur 2020–2022 et gelé pour 2023–2024, réduit l'erreur de niveau mais laisse **7,55 Md€ d'erreur absolue moyenne hors ajustement** (+7,5 à +7,6 Md€). Le niveau IR simplifié actuel est de 98,8 Md€ en règles 2026, contre 94,3 Md€ d'IR net Insee 2025 (années et périmètres différents). L'IFI reste à 2,07 contre 2,71 Md€ Insee, les successions à 23,88 contre 16,07 Md€ Insee. Un contrôle IFI séparé avec les patrimoines moyens DGFiP par tranche marginale surestime l'impôt net de 0,24 à 0,34 Md€ entre 2018 et 2025 ; il ne calibre pas les foyers-types. Les successions **ne sont pas rétrotestées** faute d'assiettes historiques et de parenté. Les écarts de recettes d'une réforme sont envoyés au moteur macro ; les gagnants/perdants sont affichés par revenu **et** patrimoine, et les gains/pertes par revenu alimentent un canal de consommation avec propensions **hypothétiques**. Cela n'est **pas** une estimation fiable de rendement, de redistribution nationale ou de croissance. Le cas des patrimoines de plus de 100 M€ est particulièrement fragile.

Le calcul reproductible est `node scripts/fiscal-backtest.mjs` (`--json` pour les chiffres détaillés). Les séries et leurs sources sont dans `research/fiscal-history.json` ; `python3 scripts/verify-fiscal-source.py` contrôle les classeurs officiels Insee et DGFiP archivés (réseau et `xlrd` requis). Les avis IR DGFiP sont par **année de revenu**, ceux de l'Insee par **année comptable** : on ne les additionne pas ni ne les substitue directement.

`research/legal-coverage-2026.json` sépare les dispositions codées des blocs manquants dans la LFI 2026, la LFSS 2026 et le droit fiscal permanent. Il ne constitue **pas** une transcription exhaustive de ces textes. Les barèmes de prestations, cotisations et exonérations sociales individuels ne sont pas encore calculés ; il faut des textes consolidés, décrets d'application, données de foyers représentatives et comptes exécutés pour aller plus loin. Ne cumulez pas un réglage fiscal et un changement du poste de recettes correspondant sans vouloir explicitement additionner deux mesures.

`research/insee-labour-2025.json` ventile chômage BIT, halo et sous-emploi par âge, et chômage par diplôme, issus de l'enquête Emploi 2025. Les totaux tous âges sont 2 451,2 ; 1 925,6 ; 1 293,4 milliers de personnes. Le plafond indicatif de recrutement utilise les effectifs **15–64 ans** après retrait explicite des 65 ans ou plus (2 425,7 ; 1 870,0 ; 1 260,4 k) ; les inscrits en formation à France Travail ne sont plus ajoutés comme quatrième stock indépendant, car ils peuvent recouper les précédents. Les croisements fins servent à l'audit, **pas** encore à déterminer qui peut devenir policier, soignant ou enseignant. `research/insee-tes-2024.json` conserve production et importations de 17 produits. Sa part d'importations est descriptive, non un multiplicateur ou une fuite marginale imputable automatiquement à un poste COFOG.

Pour rafraîchir ces copies figées depuis les classeurs officiels, installer `xlrd` uniquement pour l'import XLS (`python3 -m pip install xlrd`), puis lancer `python3 scripts/import-insee-observations.py`, `node scripts/export-insee-projection.mjs` et `node scripts/export-historical-audit.mjs`. Les empreintes SHA-256 des fichiers sources sont conservées dans les JSON. **Comparer les différences et la date de publication avant d'accepter un nouveau millésime** ; le moteur de calcul et l'interface Python n'ont aucune dépendance réseau à l'exécution. Les pages web chargent par ailleurs des polices externes et peuvent, après configuration explicite, charger GoatCounter pour les statistiques de visite.

### Mesures, hypothèses et résultats (version 4.10)

L’interface distingue les **mesures publiques** des **hypothèses de contexte** et des **résultats**. Chômage, naissances et population sont calculés ; fécondité de fond, espérance de vie, soldes migratoires, prix fossiles et capacité de recrutement sont dans un volet avancé. Dans les moteurs, productivité, taux d’activité, âge effectif de départ, efficience des soins et fraude recouvrée sont aussi repliés comme hypothèses de réalisation, non comme décisions directement garanties. Une sensibilité illustrative relie les places de garde aux naissances avec délai, plafonnée à +0,03 enfant par femme pour 300 000 places supplémentaires. Son sens s’appuie sur une [étude de l’Ined](https://www.ined.fr/fr/publications/editions/document-travail/impact-family-policy-fertility-trends), mais son coefficient n’est pas estimé ni validé pour la France. Les autres réactions démographiques aux politiques restent à développer.

L'IHM et l'interface Python acceptent `policyStartQuarter` (1 à 4, défaut 1) pour **les variations des postes de dépenses et recettes** à partir de 2026. Chaque poste modifié peut aussi préciser son propre trimestre via l'interface ou `policyStartQuarters`, par exemple `{"R_TVA":3,"GF0405":4}`. Un départ en juillet réduit de moitié le coût direct et l'exposition macro de la mesure en première année ; à partir de 2027, une mesure permanente compte en année pleine. Les autres moteurs (démographie, emploi public, énergie, etc.) conservent leur pas annuel : il ne faut pas lire cette option comme une conversion trimestrielle intégrale du simulateur principal.

### Parcours et portabilité des scénarios (version 4.15)

L'IHM web peut maintenant **réimporter** le JSON qu'elle exporte, ainsi qu'un objet de réglages EcoSim sans enveloppe. L'import vérifie la structure, refuse les fichiers de plus de 2 Mo, repart des valeurs par défaut avant d'appliquer les réglages et signale un autre numéro de version. Il n'enregistre pas automatiquement la copie importée : utilisez « Sauvegarder » pour la garder dans ce navigateur. Si un ancien lien `#scenario=` était ouvert, le chargement d'un autre scénario retire ce fragment pour éviter qu'un rafraîchissement ne rétablisse silencieusement les anciens réglages.

La navigation mobile permet d'accéder à toutes les rubriques, à l'export et au changement de thème. Un tableau de repères donne les valeurs du graphique sans survol, notamment sur téléphone ou au clavier. Le thème choisi est repris dans le simulateur, l'audit et la page de confidentialité ; l'audit ne déborde plus horizontalement sur téléphone. Les anciens liens canoniques et le sitemap pointant vers Sites ont été retirés lors de cette passe. Cette passe ne constitue **pas** le rétrotest complet du moteur principal ; seul un premier diagnostic de sa référence sans réforme a été ajouté depuis.

### Référencement de la publication GitHub Pages

Les URL canoniques et le sitemap pointent désormais vers `https://nicolasmoreau1982-beep.github.io/`. Le dépôt renommé publie `dist/` à la racine via GitHub Actions ; `dist/robots.txt` y devient le fichier de contrôle de l'hôte et indique le sitemap. La page d'accueil décrit en HTML les scénarios politiques présents, avec leurs noms et leur caractère expérimental ; elle n'utilise pas de balise `meta keywords`, ignorée par Google. Soumettre le sitemap dans Search Console et vérifier le rendu des pages ; voir [PUBLICATION.md](PUBLICATION.md). Aucun classement ni délai d'indexation n'est garanti.

EcoSim vise aussi à aider à préparer la **présidentielle 2027**, mais la version actuelle ne compare pas encore les programmes propres aux candidats : elle explore des groupes et familles politiques. Un futur mode « candidats » devra lier chaque mesure à un programme ou une déclaration datée, expliciter sa traduction dans les paramètres, distinguer les mesures non simulables et mettre à jour le statut des candidatures sans anticiper la liste officielle.

Le compte GoatCounter `nicolasmoreau1982-beep` est configuré pour mesurer les visites sur le domaine public. Un compteur discret apparaît dans le pied de page si le total réel est accessible ; il reste masqué en cas d'échec et aucune mesure n'est chargée en prévisualisation locale. Le réglage du compteur public et la vérification CNIL figurent dans [PUBLICATION.md](PUBLICATION.md#audience-et-publicité). La [page de confidentialité](dist/confidentialite.html) indique l'état de configuration et les services contactés.

## Structure

```text
dist/
  index.html   interface et documentation intégrée
  audit.html, audit.css, audit.js   annexe publique d'audit et tableaux historiques
  historical-audit-data.js         export déterministe du rejeu annuel et trimestriel
  styles.css   design adaptatif et thème sombre
  data.js      données, sources, paramètres et préréglages
  history.js   observations Eurostat et contrôle rétrospectif
  insee-projection.js projection démographique Insee condensée pour le navigateur
  fiscal.js    moteur fiscal expérimental : règles datées et foyers-types
  app.js       moteur de projection et interactions
  analytics.js intégration GoatCounter limitée au domaine public
  confidentialite.html, robots.txt, sitemap.xml  confidentialité et référencement
ecosim.py      interface Python en ligne de commande et importable
PUBLICATION.md guide de mise en ligne, référencement, audience et publicité
MODEL_AUDIT.md références scientifiques, benchmarks et limites
research/policy-events.json   mesures historiques partiellement reconstruites
research/historical-accounts.json   montants APU historiques Insee 2003–2025
research/historical-policy-timeline.json calendrier TVA/CICE/bascule du rejeu
research/historical-parameters.json hypothèses du rejeu daté
research/historical-event-inventory.json mesures historiques identifiées non chiffrées
research/insee-*.json comptes trimestriels, sous-secteurs, population, travail et TES
research/legal-coverage-2026.json inventaire partiel de couverture LFI/LFSS et droit fiscal
scripts/
  simulate.mjs adaptateur du moteur web pour Python et scripts
  backtest.mjs diagnostic rétrospectif reproductible
  check-history.mjs contrôle de dérive des séries Eurostat
  benchmark-research.mjs comparaison à Mésange
  policy-history.mjs reconstitution partielle de 2014
  vintage-audit.mjs prévisions d'époque vs réalisations
  historical-engine.mjs moteur annuel de rejeu (prototype distinct)
  historical-quarterly-engine.mjs moteur trimestriel du rejeu (flux de base synthétiques)
  historical-replay.mjs diagnostics datés 5/10/15/20 ans
  insee-observations.mjs rapprochement des comptes Insee observés
  import-insee-observations.py import traçable des classeurs officiels
  export-insee-projection.mjs projection condensée pour le simulateur
  export-historical-audit.mjs export des tableaux observé/simulé pour le site statique
.openai/
  hosting.json configuration de déploiement Sites
tests/
  model-smoke.mjs tests des trajectoires, cohortes et scénarios politiques
  fiscal-engine.mjs tests des règles et de la remontée macro
  inputs-classification.mjs séparation des décisions, hypothèses et résultats
  history-backtest.mjs tests du contrôle historique
  research-benchmark.mjs, policy-history.mjs, vintage-audit.mjs tests des audits
  test_python_smoke.py vérification de l'interface Python
  historical-replay.mjs tests du rejeu daté et anti-fuite
  insee-observations.mjs contrôle des nouvelles séries Insee
```

## Limites

Ce simulateur produit des scénarios de sensibilité, pas des prévisions. Les coefficients sectoriels sont des hypothèses explicites et n'ont pas été estimés conjointement ni validés par rétrospective historique. Les fourchettes ne sont pas des intervalles de confiance statistiques. La référence démographique suit une pyramide des âges Insee, mais les écarts induits par les politiques ne sont pas encore recalculés âge par âge ; l'énergie n'est pas simulée heure par heure. Les capacités de recrutement et les pensions publiques sont des proxys transparents, pas des comptes actuariels. Le diagnostic européen ne vérifie pas la trajectoire de dépense nette. Les réactions de la BCE, des marchés, des partenaires commerciaux, des ménages et des entreprises ne peuvent pas être anticipées avec précision. À 20 ou 30 ans, la plage de sensibilité est plus informative que le point central.
