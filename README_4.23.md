# EcoSim France 4.23.0 — Confrontation aux évaluations empiriques

Date : 11 octobre 2026. Cette livraison est dérivée du code complet EcoSim 4.22.0.

## Ce qui change

- Nouvelle page `/evaluations-empiriques-423.html`, accessible sans JavaScript, reliée depuis l'accueil et l'audit, ajoutée au sitemap.
- Un banc reproductible `scripts/evaluer-empirique-423.mjs` exécute le même moteur `app.js` que le site sur quatre exemples : +1 % du PIB de dépenses de services généraux COFOG, TVA nationale +10 Md€, pensions −10 Md€, cotisations −18 Md€. Les résultats, à 1, 3, 5 et 10 ans, sont dans `dist/validation/empirique-423.{json,csv}`.
- Quatre publications externes sont citées à partir de leurs pages officielles : dépenses publiques (Insee, 2013), TVA dans la restauration (IPP, 2018), retraites 2010 (Insee, 2017) et CICE (France Stratégie, 2020).
- Le protocole documente pour chaque étude la métrique de l'évaluation, le choc EcoSim approximatif et **la non-équivalence des politiques**.
- Tous les coefficients du modèle central sont inchangés ; les variantes 4.22 et les scénarios politiques sont préservés.
- Numéro de version et empreinte de distribution mis à jour ; données de publication pré-rendues.

## Résultat scientifique — lire impérativement

**0 comparaison strictement équivalente ; 1 partielle ; 3 non équivalentes.** Cette version constitue un **audit de couverture empirique et de comparabilité**, pas une validation causale. Nous ne calculons **aucun taux d'erreur causal** à partir d'indicateurs qui n'ont pas la même définition. Le résultat de la réforme TVA dans la restauration ne doit pas être soustrait d'une projection de TVA nationale ; de même, une coupe de pensions en milliards ne reproduit pas un recul de l'âge légal.

La confrontation à l'estimation SVAR des dépenses publiques reste partielle : elle porte sur achats de biens/services, tandis que le levier EcoSim GF0103 est COFOG (services généraux). L'absence de significativité à trois ans dans l'étude ne se compare pas à un point prévisionnel isolé sans écart-type.

## Reproduction

Sans dépendance npm :

```bash
node scripts/evaluer-empirique-423.mjs
python3 scripts/preparer-empirique-423.py
node scripts/stamp-build.mjs
node scripts/test-empirique-423.mjs
node scripts/test-mathematical.mjs
node scripts/test-regressions.mjs
node scripts/test-multiplicateurs-422.mjs
```

**Important :** `scripts/benchmark-economique-419.mjs` est un générateur historique destiné à la version 4.19 ; il n'est pas compatible avec la reconstruction directe de la 4.23. Le générateur du registre politique doit être lancé **avant** `stamp-build.mjs` car il reconstruit son pied de page avec un marqueur de paquet.

## Suite scientifique nécessaire

Pour une validation causale honnête, il faut modéliser intégralement au moins une vraie réforme (champ, population, calendrier, financement), utiliser une grandeur comparable et un horizon identique, puis confronter les résultats à une étude non utilisée pour le calibrage. Il faudra, par exemple, un module de TVA par secteur et répercussion sur les prix, ou un module retraite par cohorte, avant de tester les évaluations correspondantes.

## Hors périmètre

Tests navigateur interactif, performance mobile, examen juridique et validation empirique indépendante complète. Le suivi GoatCounter est inchangé.
