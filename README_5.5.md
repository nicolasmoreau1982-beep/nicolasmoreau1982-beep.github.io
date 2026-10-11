# EcoSim France 5.5.0 — Retraites par cohorte et témoin 2010–2011

**Date : 11 octobre 2026**  
**Base : EcoSim 5.4.0 — cœur macro du paquet 5.3.1 conservé**  
**Portée : module historique expérimental autonome ; pas une nouvelle simulation nationale des retraites.**

## 1. Ce qui est livré

- Nouveau calculateur pur `dist/cohort-retirement-550.js` : évolution mensuelle par année de naissance, mois de naissance, sexe et cinq situations : emploi temps plein, emploi temps partiel, chômage, inactivité hors retraite et retraite.
- Trois calendriers testables : **référence à 60 ans** ; **réforme initiale 2010** ; **calendrier accéléré fin 2011**. Calendrier vérifié contre [CNAV, circulaire du 1er août 2024](https://legislation.lassuranceretraite.fr/Documents/Circulaires/Pdf/circulaire_cnav_2024_25_01082024.pdf) et [CCSS juillet 2012, page relative à l'accélération](https://www.securite-sociale.fr/files/live/sites/SSFR/files/medias/CCSS/2012/RAPPORT/CCSS-RAPPORT-JUILLET_2012.pdf).
- `dist/data/retraites-2010-protocole-550.json` décrit les paramètres utilisés **avant réforme**, cohortes, pondérations et limites.
- `dist/data/retraites-2010-observations-550.json` contient **uniquement** les résultats « après réforme » publiés par [Insee Analyses 30, 5 janvier 2017](https://www.insee.fr/fr/statistiques/2546882), figure 3, avec les valeurs et le périmètre de l'étude.
- Scripts à deux étapes : `scripts/projeter-retraites-550.mjs` ne lit jamais le fichier des observations « après » ; `scripts/confronter-retraites-550.mjs` le lit seulement pour établir des écarts descriptifs.
- Tableau public `dist/retraites-cohortes-550.html`, disponible sans JavaScript.
- Sorties JSON de prédiction et de confrontation, CSV des écarts et des **1 080 états mensuels** (5 groupes de naissance × 2 sexes × 3 calendriers × 36 mois).
- Contrôles automatisés `scripts/test-cohort-550.mjs` : calendrier légal, conservation des personnes, monotonicité de la retraite, absence de paramètres « après réforme » dans le calculateur, bornes et entrées hostiles, budgets illustratifs et CSV mensuel.

## 2. Méthode : réelle politique, comportement simplifié

Les droits légaux sont différenciés par date de naissance. Les dates suivantes sont exprimées en **mois depuis la naissance** :

| Génération | Sans réforme | Réforme initiale | Calendrier accéléré |
|---|---:|---:|---:|
| Avant juillet 1951 | 720 | 720 | 720 |
| 1951 juillet–décembre | 720 | 724 | 724 |
| 1952 | 720 | 728 | 729 |
| 1953 | 720 | 732 | 734 |
| 1954 | 720 | 736 | 739 |
| 1955 | 720 | 740 | 744 |

Pour les **transitions de statut**, la distribution *avant réforme* de la figure 3 Insee fixe la composition initiale conditionnelle aux personnes non retraitées. Les transitions annuelles *avant réforme* de la figure 4 Insee servent à une approximation mensuelle des changements entre emploi, chômage et inactivité. Le risque mensuel de retraite est obtenu en faisant correspondre, par construction, la part de retraités **avant réforme** à la fin de la première année (à partir d'un état initial sans retraité), puis bloqué si l'âge légal n'est pas atteint.

Cette hypothèse de liquidation représente volontairement très mal certains aspects : déjà-retraités avant 60 ans, effets d'horizon, retours à l'emploi, indépendants, polypensionnés, carrières longues, durée d'assurance, taux plein, liquidation effective après ouverture des droits, retraite progressive, mortalité et durée de carrière. **Reproduire correctement l'âge légal ne signifie pas reproduire les parcours réels.**

Le calculateur offre en outre, à titre d'illustration seulement, un tableau de flux pour **100 000 individus fictifs** : pension mensuelle hypothétique 1 600 €, indemnisation chômage hypothétique 1 000 €, salaire mensuel hypothétique 2 200 €, cotisations hypothétiques de 25 %. Cette convention ne produit **aucun rendement national** et n'a **aucun effet sur la dette ou le déficit du moteur macro**. Additionner ces montants au moteur existant créerait un risque de double compte.

## 3. Résultat de la confrontation : limites bien visibles

La comparaison principale utilise deux cas simulés : 1951 second semestre et 1952, chacun pondéré à **50 % par convention**, sur un état pris à l'issue de **12 mois après 60 ans**. Cela ne recoupe **pas parfaitement** la population, les âges et le dispositif de pondération des estimations de l'Insee. Les chiffres suivants sont des écarts **descriptifs**, pas des erreurs causales directement comparables.

| Sexe et état | Effet modèle (points) | Effet Insee (points) | Différence descriptive (points) |
|---|---:|---:|---:|
| Hommes — temps plein | +14,7 | +14 | +0,7 |
| Hommes — temps partiel | +2,5 | +3 | −0,5 |
| Hommes — chômage | +1,9 | +7 | **−5,1** |
| Hommes — inactivité hors retraite | +6,9 | +3 | **+3,9** |
| Hommes — retraite | −26,0 | −27 | +1,0 |
| Femmes — temps plein | +7,7 | +9 | −1,3 |
| Femmes — temps partiel | +5,3 | +7 | −1,7 |
| Femmes — chômage | +1,2 | +6 | **−4,8** |
| Femmes — inactivité hors retraite | +5,4 | 0 | **+5,4** |
| Femmes — retraite | −19,6 | −22 | +2,4 |

**Enseignement principal :** une interdiction temporaire de liquider la retraite, combinée à la seule persistance dans le dernier état d'activité, ne reproduit pas le déplacement vers le chômage décrit par l'Insee. Il faudrait une modélisation indépendante des transitions et des dispositifs connexes, sans sélectionner après coup les paramètres qui reproduisent cette observation.

Les paramètres *avant réforme* et la mesure *après réforme* proviennent du même article Insee, publié en 2017, et l'exercice est construit en 2026 : c'est une séparation logicielle de l'information, **pas un test enregistré avant les observations ni une validation réellement hors-échantillon**. La population et l'horizon ne correspondent pas exactement, donc **aucun score de biais causal n'est revendiqué**.

## 4. Reproduction exacte des fichiers livrés

```sh
node scripts/projeter-retraites-550.mjs
node scripts/confronter-retraites-550.mjs
node scripts/test-cohort-550.mjs
node scripts/test-golden-540.mjs
bash scripts/run-tests-550.sh
```

**Le golden de la 5.3.1 ne doit jamais être actualisé silencieusement** pour rendre les nouveaux tests verts. Le test continue de comparer 6 scénarios × 30 ans × 11 variables = **1 980 valeurs**. Les **9 modules sources** figurant dans `fixtures/source-hashes-531.json` ont le même SHA-256 que ceux de 5.3.1, sauf l'étiquette de version. Les mesures expérimentales ne sont pas injectées au cœur macro : cette stabilité est intentionnelle.

Vérifications prévues : **23 suites JavaScript**, dont 466 projections et 84 128 contrôles numériques, navigateur Chromium sur accueil et pages historiques aux résolutions bureau/mobile, contrôles des liens, manifests SHA-256. Un test visuel ne constitue pas un audit RGAA ni un score Lighthouse en production.

## 5. Limites pour une future 5.6

Pour revendiquer une validation historique stricte de ce module, il faudrait notamment : représenter les différentes populations de l'étude à poids connus, les états à dates exactement identiques, construire des transitions à partir d'un corpus distinct de celui qui fournit l'observation, estimer des règles de liquidation et d'emploi suffisamment indépendantes et tester la robustesse d'une généralisation. Les valeurs budgétaires nationales, PIB et taux de chômage national ne sont **pas** déduits de ces estimations ciblées.

EcoSim France demeure un projet **personnel pédagogique**. Le seul canal de retour public reste [GitHub Issues](https://github.com/nicolasmoreau1982-beep/nicolasmoreau1982-beep.github.io/issues/new/choose).
