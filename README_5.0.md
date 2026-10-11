# EcoSim France 5.0 — Stabilisation et contrôle des interactions

Date de préparation : 11 octobre 2026. Base : EcoSim 4.25.0 (archive complète fournie dans la conversation).

## Archives

- `EcoSim_5.0_site_GitHubPages.zip` : fichiers prêts à copier **à la racine** du dépôt GitHub Pages.
- `EcoSim_5.0_code_et_tests.zip` : dossier `dist/`, dossier `scripts/` et cette documentation.

## Changements effectifs

1. **Détection d'éventuels doubles comptes entre modules** (`dist/quality-500.js`) : 9 familles de situations de recouvrement, dont aide sectorielle + ajout de capacité nucléaire/renouvelable, renovation + budget logement, transport, santé, petite enfance, fiscalité IS et carbone. Résultats affichés sous le module « Secteurs » et rafraîchis avec le scénario courant. **Une alerte n'est pas une preuve de double compte : aucune déduction n'est effectuée automatiquement.**
2. **Exercice énergétique physique séparé** (`dist/qualite-et-energie-500.html`, `dist/energy-balance-500.js`), fondé sur le bilan énergétique définitif SDES **2024** : consommation finale énergétique 1 499 TWh ; produits pétroliers, biocarburants compris, 624,2 TWh ; électricité finale 398 TWh ; environ 80 % du pétrole consommé à usage énergétique par les transports. Le visiteur choisit la proportion substituée dans les transports et ailleurs, ainsi que le rapport conventionnel d'électricité supplémentaire. Le modèle ne calcule ni GW nécessaires, ni émissions, ni coûts, ni échéances, ni effets macroéconomiques. **L'exercice n'alimente pas les projections 2026–2055.**
3. **Référentiel SDES structuré** (`dist/data/energy-reference-2024.json`), avec sources et limites ; test de cohérence entre source embarquée et calculateurs.
4. **Matrice des domaines validés ou encore exploratoires**, visible sans JavaScript sur la nouvelle page.
5. **Version du moteur 5.0.0** (`dist/data.js`), fichiers de distribution horodatés et empreinte (`build-info.js`). Export et import de scénarios existants inchangés.
6. **Tests indépendants** `scripts/test-quality-500.mjs` et `scripts/test-energy-500.mjs`, ajoutés aux tests de régression historiques.

## Ce que cette version ne prétend pas accomplir

- Elle **ne prouve pas l'absence de tout double compte**. Une vérification détaillée des enveloppes et des périmètres reste nécessaire.
- Elle **ne modélise pas encore physiquement l'électrification nationale** (parc automobile, pompes à chaleur, réseaux, capacités, calendriers). Elle offre un exercice de substitution borné.
- Elle **ne calibre pas des élasticités causales sectorielles** avec des études quasi expérimentales.
- Elle **n'ajoute pas de microsimulation fiscale nationale représentative** et ne valide pas les gagnants/perdants du pays.
- Elle **ne transforme pas les analyses historiques partielles en validation prédictive indépendante**.
- Les multipliers macroéconomiques centraux, les résultats existants et le registre politique restent inchangés sur le fond.

## Données et sources

- SDES, « Bilan énergétique de la France en 2024, données définitives », 26 janvier 2026 : https://www.statistiques.developpement-durable.gouv.fr/bilan-energetique-de-la-france-en-2024-synthese
- SDES, bilan complet (notamment produits pétroliers et consommation finale d'électricité) : https://portail.documentation.developpement-durable.gouv.fr/pub/MPDOUV00268844-bilan-energetique-france-pour-2024.html
- RTE 2025, seulement pour distinguer production électrique du concept de consommation finale : https://analysesetdonnees.rte-france.com/bilan-electrique-2025/consommation

N.B. Les périodes et les champs ne sont pas interchangeables : le référentiel physique SDES est de 2024, et la référence des finances publiques EcoSim est de 2025.

## Tester

```bash
node scripts/test-quality-500.mjs
node scripts/test-energy-500.mjs
node scripts/test-mathematical.mjs
node scripts/test-economie-inchangee-421.mjs
node scripts/test-regressions.mjs
node scripts/test-observations-425.mjs
node scripts/test-transparence-420.mjs
node scripts/test-presentation-4211.mjs
```

À l'issue de la préparation, les 14 scripts `scripts/test-*.mjs` passent, dont 466 projections sur 30 ans, 84 128 vérifications numériques, 60 résultats historiques inchangés, les tests de robustesse des liens et les scénarios sectoriels.

## Vérifier après publication

1. Pied de page de l'accueil : `Version 5.0` et empreinte de paquet.
2. Ouvrir `qualite-et-energie-500.html`, tester les trois curseurs et vérifier l'exercice 10 % du pétrole des transports : **49,9 TWh évités** et **15,0 TWh d'électricité illustrative** avec un ratio de 0,30.
3. Dans le simulateur, ajouter un soutien sectoriel aux renouvelables et un ajout structurel de GW renouvelables. Vérifier que l'alerte apparaît dans « Qualité », mais que la simulation n'est pas modifiée par l'alerte.
4. Vérifier un scénario sans changement : aucune alerte, référence budgétaire inchangée.
5. Tester le rendu mobile, la navigation clavier, l'annonce des mises à jour aux lecteurs d'écran et les Core Web Vitals. **Ces essais interactifs n'ont pas pu être certifiés dans l'environnement de construction.**

## Futurs travaux scientifiques distincts

Élasticités sectorielles issues d'évaluations indépendantes ; microdonnées représentatives sur la fiscalité ; modèle physique multi-secteurs avec bilans matière-énergie et capacités ; examen des doubles comptes entre tous les postes ; réplication d'évaluations historiques comparables ; revue extérieure par chercheurs et tests UX sur utilisateurs réels.
