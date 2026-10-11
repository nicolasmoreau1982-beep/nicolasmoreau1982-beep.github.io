# EcoSim France — 4.19.0 — Modifications et limites

## Objet

Fiabiliser l'ancrage comptable, publier une comparaison externe non calibrée des dépenses et rendre testables trois coefficients de rétroaction. **Pas de prétention à une validation causale.** Aucun multiplicateur de politique n'a été modifié pour mieux coller à une cible institutionnelle.

## Comptes 2025

La 4.18 utilisait **déjà** les chiffres du tableau Insee 3.201 actualisé le **28 août 2026**, soit **1 714,1117 Md€** de dépenses, **1 562,5197 Md€** de recettes et **151,592 Md€** de déficit. Ils sont conservés. Le ratio initial de dette passe de **115,6 %** à **115,7 %**, calculé sur 3 460,5 Md€ de dette / 2 991,1 Md€ de PIB.

La série historique `history.js` conserve son **115,6 % Eurostat** distinct. On ne mélange pas avec la publication Insee Première du 29 mai (1 714,2 / 1 561,7 / 152,5 Md€), dont le champ et le millésime sont différents. Cette réconciliation est décrite dans l'audit.

La règle simplifiée `dette_t = dette_(t−1) + déficit_t` est maintenue ; les ajustements stock-flux réels ne sont pas simulés. Le rapprochement mai 2026 fait état d'un écart de 1,9 Md€ en 2025 (augmentation brute de dette de 154,4 Md€ pour déficit de 152,5 Md€).

## Comparaison Mésange

Le benchmark simule en 2026 un choc **permanent non financé de 1 point du PIB de référence**, converti en euros 2025 pour les curseurs. Le panier reproduit les poids de la variante Mésange 2017 : **8 %** investissement, **25 %** rémunérations, **9 %** prestations en nature, **12 %** consommations intermédiaires, **46 %** prestations en espèces (dont **3,5 % du choc total** au chômage). Les postes disponibles dans EcoSim sont toutefois classés par **fonction COFOG** ; transports / enseignement primaire / hôpitaux / services généraux / retraites / chômage ne constituent **pas** une répartition exactement équivalente par nature économique. C'est un panier proxy, non une reproduction de l'expérience Mésange.

| Scénario | PIB 1 an | PIB 3 ans | PIB 5 ans | PIB 10 ans |
|---|---:|---:|---:|---:|
| Panier composite EcoSim (proxy COFOG) | +0,595 % | +0,597 % | +0,535 % | +0,472 % |
| Mésange 2017 (référence publiée) | +0,780 % | +1,030 % | +0,860 % | +0,530 % |
| TVA +1 point de PIB de recettes | -0,320 % | -0,705 % | -0,775 % | -0,708 % |
| IR +1 point de PIB de recettes | -0,567 % | -0,481 % | -0,424 % | -0,368 % |
| Cotisations globales −1 point de PIB | +0,681 % | +0,596 % | +0,538 % | +0,479 % |

L'effet affiché est l'indicateur `outputGap` d'EcoSim, approximation d'un écart de niveau de PIB réel ; ce n'est pas une série de volumes chaînés. L'effet TVA est inspiré de Mésange par construction : **une proximité ne constitue pas une validation indépendante**. Le choc de cotisations porte sur toutes les cotisations `R_SOCIAL` et non uniquement sur celles des employeurs ; il **n'est pas strictement comparable** au choc de la DG Trésor.

## Trois hypothèses auditables

`data.js` expose désormais `macroCoefficients` :
- `unemploymentPpPerOutputGapPoint = 0.35` (chômage selon l'écart de production),
- `revenueBnPerNominalGdpBn = 0.48` (recettes indirectes par euro de PIB nominal),
- `cyclicalSpendingBnPerUnemploymentPoint = 3.1` (dépenses conjoncturelles par point de chômage).

Leur valeur centrale n'a pas changé. Le benchmark modifie **chaque coefficient isolément de −20 % à +20 %**, compare plusieurs réformes et restaure la valeur d'origine. Ces limites sont choisies pour illustrer la sensibilité du modèle ; elles ne sont **pas des intervalles de confiance** et n'impliquent pas que les paramètres aient été estimés économétriquement.

## Commandes pour reproduire

Depuis la racine du code complet, avec Node.js :

```sh
node scripts/benchmark-economique-419.mjs
node scripts/test-economique-419.mjs
node scripts/test-fiscal-419.mjs
node scripts/test-regressions.mjs
node scripts/test-mathematical.mjs
node scripts/stamp-build.mjs
```

Les sorties du benchmark sont publiées dans `dist/validation/benchmark-419.csv` et `.json`. La table de résultats est pré-générée dans `dist/audit.html` et lisible sans JavaScript.

## Fichiers modifiés

- `dist/data.js` : millésime comptable, ratio, coefficients centralisés, version.
- `dist/app.js` : récupération des trois coefficients dans les données (aucun changement de valeur).
- `dist/index.html` : version et ratio harmonisés.
- `dist/audit.html` : nouveau chapitre de benchmark, sources et clarification des millésimes.
- `dist/build-info.js` : empreinte du paquet recalculée.
- `scripts/benchmark-economique-419.mjs` : 25 observations centrales/référence et 120 tests de sensibilité.
- `scripts/test-economique-419.mjs` : assertions comptables et vérification du benchmark.
- `scripts/test-fiscal-419.mjs` : 66 contrôles ciblés sur la fiscalité simplifiée.
- `dist/validation/` : résultats bruts reproductibles.

## Limites

- Les élasticités ne sont pas estimées causalement ; les chocs Mésange et EcoSim ne sont pas identiques au sens de la comptabilité par nature.
- Le modèle fiscal fonctionne sur 16 foyers-types synthétiques, sans échantillon national représentatif.
- Aucun backtest historique indépendant ou test de l'expérience sur navigateur mobile n'est ajouté à cette livraison.
- Les séries historiques Eurostat et le compte d'août ne sont pas recalibrés artificiellement pour afficher la même valeur sur tous les indicateurs.

## Sources primaires

- https://www.insee.fr/fr/statistiques/8988845 (tableau 3.201, août 2026)
- https://www.insee.fr/fr/statistiques/8997691 (Insee Première, mai 2026)
- https://www.tresor.economie.gouv.fr/Articles/88381f48-797c-4e76-8f03-ef78d0bff99e/files/1c29ff21-585d-488b-8f4b-497540e9fc62 (Mésange 2017, sections 4.1.2 et 4.1.3)
