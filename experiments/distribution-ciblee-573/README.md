# EcoSim France — prototype de ciblage SMIC / pensions (expérimental 5.7.3)

**Périmètre : recherche et validation, NON publié sur le site.** La version publique des résultats reste 5.7.1 et la livraison technique reste 5.7.2.2. Les tests existants, leur baseline et les fonctions macroéconomiques ne sont pas modifiés.

## Pourquoi cet essai ?

Dans `dist/data.js` le levier `minimumWage` vaut 0 % au départ. Dans `dist/app.js`, sa variation est directement multipliée par des coefficients agrégés (`effects.fiscal`, `demand`, `supply`, `jobs`...). Cela **ne signifie pas** que tous les salariés reçoivent +X %, mais les variables agrégées ne sont pas déduites d'une distribution des salaires. La procédure ne connaît donc ni la part des emplois « rattrapés » par le nouveau plancher ni la masse salariale effectivement concernée.

**Prototype `simulateSmic`** : à partir des salaires horaires bruts et des volumes annuels de travail, `salaire_après = max(salaire_avant, nouveau_SMIC)` pour les personnes éligibles. Le salaire qui dépasse le nouveau plancher reste invariant par défaut ; on peut activer séparément une diffusion salariale hypothétique décroissante avec la distance au SMIC, à **ne pas présenter comme une prédiction**. Les salaires des statuts dérogatoires sont marqués `eligible:false`.

Le SMIC est un plancher légal, pas un pourcentage obligatoire pour toutes les rémunérations. Les effets indirects résultent notamment de négociations, souvent retardées. Sources :
- Dares, « La revalorisation du Smic au 1er novembre 2024 », publiée en 2025 : 2,2 millions de bénéficiaires directs (12,4 % du champ secteur privé non agricole) : https://dares.travail-emploi.gouv.fr/publication/la-revalorisation-du-smic-au-1er-novembre-2024
- Insee, « Salaire minimum de croissance », juillet 2026 : SMIC brut horaire de 12,02 € au 1er janvier 2026 : https://www.insee.fr/fr/statistiques/8733087
- Rapport groupe d'experts Smic : la diffusion n'est ni intégrale ni instantanée : https://dares.travail-emploi.gouv.fr/sites/default/files/d43bdb403d9fb082671d8525a1a0ee19/Smic_rapport_2023.pdf

## Fiscalité pensions

À la déclaration 2026 des revenus 2025, l'abattement usuel est de **10 % des pensions admissibles**, avec un minimum de **454 € par titulaire** et un plafond de **4 439 € par foyer fiscal**. C'est un abattement **de revenu imposable**, pas une réduction du montant de la pension versée.

Source officielle : https://www.impots.gouv.fr/particulier/pensions-retraites

Trois types de réformes hypothétiques (elles ne sont PAS étiquetées « droit en vigueur ») :
1. `remove_above_rfr` : suppression complète de l'abattement si le RFR initial dépasse `rfrThreshold` : risque d'effet de seuil net.
2. `phase_out_above_rfr` : disparition linéaire de l'abattement entre `rfrThreshold` et `rfrThreshold + phaseOutWidth` ; éviter le saut, mais calculer un taux marginal implicite supplémentaire.
3. `cap_above_rfr` : abaissement du plafond à `newCap` pour les foyers dépassant `rfrThreshold`, sans suppression de 10 % sous ce nouveau plafond. Ce mode modélise le plafonnement, **pas** la suppression pour toutes les grosses pensions.

Le seuil choisi porte sur le **revenu fiscal de référence initial fourni** (indépendant des pensions), et le calcul IR est fait avec l'outil simplifié EcoSim `dist/fiscal-individuel-570.js`, sur le **revenu net imposable initial fourni**, ajusté uniquement par la différence d'abattement. Cela évite de confondre revenus de pension et autres revenus du foyer. Le RFR est **tenu exogène dans un scénario** pour éviter une condition circulaire.

La simulation ne comprend pas le régime de tous les produits retraite, certaines pensions particulières, l'impôt minimum, crédits/réductions, cotisations et prélèvements sociaux. Elle ne démontre PAS le rendement budgétaire national et ne doit pas être multipliée par 40 millions de foyers.

## Exécuter

Depuis la racine de l'archive :

```bash
node experiments/distribution-ciblee-573/test.mjs
node experiments/distribution-ciblee-573/demo.mjs > demonstration.json
```

Les jeux du fichier `demo.mjs` sont totalement **fictifs**. Les poids des salariés/foyers sont chacun 1 ; aucun découpage en déciles représentatifs n'est calculé.

## Étapes pour un futur couplage au moteur 5.8

1. Acquérir et documenter une distribution de salaire horaire brut par secteur, âge, temps partiel, statut dérogatoire, charges et pondérations (pas les 56 foyers fiscaux, qui ne constituent pas une distribution de salariés).
2. Refaire les calculs avec un état de référence stable et les plafonds d'exonérations patronales ; séparer brut, net, coûts employeur, recettes publiques, prestations et effets comportementaux.
3. Tester plusieurs fonctions de diffusion avec intervalles d'incertitude ; estimations Dares/Insee ; ne pas la rendre systématique.
4. Pour les pensions, récupérer les revenus fiscalement déclarés, la répartition par titulaire, le RFR et les autres revenus de chaque foyer ; définir l'année d'imposition et les exceptions.
5. Tester les seuils/discontinuités et effets de tranche, publier les gagnants/perdants par catégories fiscales, calibrer seulement alors des impacts macro agrégés.
6. Préserver les profils anciens, les golden files et **ne pas** rétro-remplacer leur série historique par un modèle nouvellement calibré sans changement explicite de version des résultats.

**Aucun parti ni candidat n'est attribué ici à une réforme exacte** : seuils, diffusion et montants de l'exemple sont des paramètres de simulation, pas des engagements politiques certifiés.
