# EcoSim France 4.22.0 — Changements, validation et limites

Date : 11 octobre 2026. Ce dossier est dérivé de l'archive complète EcoSim 4.21.1 fournie pour le projet.

## 1. Analyses de multiplicateurs

- La simulation centrale ne change pas : les coefficients par défaut de `data.js` et de `fiscal.js` ne sont pas recalibrés.
- Dans `app.js`, `calculateProjection(modelKey, directAccountingFlows, multiplierFactor)` accepte une transmission conventionnelle de 0,70, 1,00 ou 1,30. Elle est appliquée aux canaux de demande/offre des catégories budgétaires, au choc spécifique TVA et à la demande redistributive fiscale. Les montants budgétaires directs, moteurs structurels et autres moteurs politiques ne sont pas reparamétrés.
- Deux variantes isolées (dépenses et prélèvements) sont également testées à +/-30 % séparément afin de comparer leur influence sur PIB, déficit et dette.
- Ces trois scénarios et ces variations individuelles sont une analyse de sensibilité conventionnelle, **pas** des limites probabilistes ni une validation de modèles tiers.
- Le nouveau panneau sous les résultats ne calcule que lorsqu'il est ouvert ou lorsqu'on demande une mise à jour. Après modification d'un scénario, les anciens chiffres sont masqués pour éviter qu'on lise des résultats périmés.
- Le panneau indique les signes et plages sur quatre indicateurs ; il offre des exports CSV et JSON complets pour le scénario sélectionné. Tous les exports comprennent la version et l'empreinte de distribution.

## 2. Explication du déficit

La carte explique l'écart du déficit avec la référence par la somme exacte des composantes du moteur :

`effet direct - rétroaction des recettes + dépenses cycliques + intérêts supplémentaires`.

Elle affiche le résidu de l'identité. Ces quatre composantes sont **comptables** et ne prouvent pas une estimation causale.

## 3. Traçabilité politique

Le fichier `data.js` ajoute 22 entrées de rapprochement entre des réglages EcoSim et des propositions identifiables, par rapport à 4.21.1 qui contenait 1 entrée. Les 23 propositions reliées aux sources primaires sont **toutes marquées `related`** (orientation ou mesure documentée, paramètre ou montant non équivalent). Les 334 réglages restants sont `unverified`. Il n'y a toujours **aucune valeur chiffrée exactement attribuable à un parti et vérifiée**.

Les principales sources primaires utilisées sont :
- RN, législatives 2024 : https://rassemblementnational.fr/legislatives-2024
- RN, programme 2024 : https://rassemblementnational.fr/documents/20240625-programme.pdf
- LFI, retraite : https://lafranceinsoumise.fr/2023/10/24/revalorisation-des-pensions-retraite-tout%C2%B7es-dans-la-rue-ce-mardi-24-octobre/
- LFI, soins : https://programme.lafranceinsoumise.fr/reponses-aux-associations/ordre-national-des-infirmiers/
- PS, groupe parlementaire : https://parti-socialiste.fr/vie-parlementaire/notre-declaration-politique-17eme-legislature/
- PS, vie chère : https://parti-socialiste.fr/vie-parlementaire/un-budget-contre-la-vie-chere-est-possible/
- Les Écologistes, dix piliers : https://lesecologistes.fr/posts/3cyFgfScqsrMXIt3h2Bh6l/10-piliers-des-ecologistes-pour-changer-la-vie

Chaque rattachement comporte la source, le passage, et une explication de la non-équivalence. Aucun chiffre officiel n'a été inventé. Ces correspondances documentent principalement quatre formations et ne sont pas une revue systématique équilibrée de tous les partis.

## 4. Bancs de tests et résultats

- `node scripts/test-multiplicateurs-422.mjs` : 5 réformes, 3 intensités, 30 ans, 1 020 contrôles, 60 lignes d'export à 4 horizons.
- `node scripts/test-mathematical.mjs` : 466 projections de 30 ans et 84 128 contrôles numériques (tests archivés de la 4.18).
- `node scripts/test-regressions.mjs` : imports, scénarios, module social et pré-rendu.
- `node scripts/test-economie-inchangee-421.mjs` : 60 comparaisons identiques au benchmark 4.19.
- `node scripts/test-validation-421.mjs` : neuf cas fiscaux de référence et sensibilité préexistante.
- `node scripts/test-transparence-420.mjs` et `node scripts/test-presentation-4211.mjs` : cohérence du registre, légendes, liens, compteurs et page de partage.

Le générateur `node scripts/preparer-sensibilite-422.mjs` produit la page de résultats HTML pré-rendus à partir des sorties du moteur. Le générateur historique `scripts/benchmark-economique-419.mjs` cible le millésime de test 4.19 et ne doit pas être exécuté pour reconstruire la 4.22.

## 5. Publication GitHub Pages

Publier directement le **contenu** de l'archive `EcoSim_4.22_site_GitHubPages.zip` à la racine de GitHub Pages, comme dans les versions précédentes. Vérifier le pied de page `Version 4.22` et les nouvelles pages :
- `/sensibilite-multiplicateurs-422.html`
- `/provenance-politique.html`

Le numéro du paquet dans le pied de page est une empreinte calculée sur les fichiers de distribution, **pas** le hash GitHub.

## Limites non résolues

- Les ±30 % ne couvrent pas tous les coefficients et scénarios, encore moins l'incertitude totale.
- Les résultats du scénario actif sont simulés localement dans le navigateur, et non validés sur données réelles ex post.
- Les sources politiques documentent des orientations, **pas** la quantification des 357 réglages.
- Aucune campagne complète de test sur mobile physique ou lecteur d'écran n'a été effectuée dans cette révision. Tests visuels Chromium non concluants dans l'environnement.
- La conformité juridique de la mesure d'audience GoatCounter demeure à établir ; le code de cette fonction n'a pas été modifié.
