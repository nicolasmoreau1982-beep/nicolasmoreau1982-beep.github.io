# EcoSim France — livraison 4.20.0

## Objet

La 4.20 privilégie deux améliorations de **transparence pédagogique** sans changer les valeurs des multiplicateurs, les coefficients fiscaux, les résultats des scénarios ou les règles de la 4.19 :

1. **Traçabilité mesure par mesure** dans le comparateur politique, consultable sans JavaScript et exportable.
2. **Contexte économique de référence** près des résultats, avec le benchmark Mésange 2017 et ses limites explicites.

Cette livraison n'apporte **aucune validation scientifique ou officielle des programmes politiques**. Les sources générales d'un parti ne sont pas présentées comme la justification exacte des montants EcoSim.

## 1. Provenance des scénarios

Le fichier `scripts/export-provenance-420.mjs` construit automatiquement à partir de `dist/data.js` :

- `dist/provenance-politique.html` : liste accessible, par scénario, avec chaque réglage, sa valeur, son statut documentaire et le lien précis vers une source **uniquement lorsqu'une correspondance a été déclarée** ;
- `dist/validation/provenance-politique-420.csv` : registre sous forme tabulaire ;
- `dist/validation/provenance-politique-420.json` : même registre avec métadonnées et sources générales séparées des preuves ligne à ligne.

**Constat dans la base 4.20 : 19 scénarios, 357 réglages (y compris quelques paramètres non monétaires), 0 correspondances exactes enregistrées, 1 proposition localisée mais non équivalente, 356 valeurs non vérifiées individuellement.** Cela décrit la couverture documentaire du code, non l'existence ou non de propositions publiques. Le moteur ne convertit pas une source générale en preuve individuelle, et le registre n'invente pas de localisation ou de date.

Les tests refusent une source individuelle orpheline, mal localisée ou liée à une option inexistante. La page 2027, l'audit, le sitemap et la fiche détaillée de chaque scénario renvoient au registre.

### Conséquence importante

Les scénarios politiques demeurent des **constructions pédagogiques d'EcoSim**, non des chiffrages officiels ou des versions complètes des programmes. Leur niveau de confiance éditorial (« élevé », « moyen » ou « faible ») ne signifie **pas** que leurs valeurs numériques sont vérifiées à la source.

Pour enrichir les sources, renseigner `scenario.evidence["changes.GF..."]` ou la clé du moteur concerné **après contrôle humain** de la source primaire : `status` (`exact` ou `related`), `url`, `sourceTitle`, `locator` et `note`. Le statut `exact` exige également le chiffre et son unité, et une correspondance réellement équivalente. Régénérer et contrôler le registre.

## 2. Benchmark économique présenté dans l'interface

Une note dépliable est disponible à proximité des quatre résultats principaux ; une autre est placée dans le comparateur politique. Elle rappelle, à **3 ans**, pour un choc composite de dépenses d'environ 1 point de PIB :

| | Effet sur le PIB de référence |
|---|---:|
| Panier proxy COFOG d'EcoSim 4.19 repris dans la 4.20 | +0,60 % |
| Mésange 2017, variante publiée | +1,03 % |
| Différence numérique entre ces sorties | 0,43 point de PIB |

**Les chocs ne sont pas strictement équivalents** : EcoSim utilise des catégories fonctionnelles comme proxys de natures de dépenses Mésange. Cette différence **ne prouve pas** que toutes les dépenses sont sous-estimées et **n'est pas** un facteur correctif automatique appliqué au scénario de l'utilisateur. La TVA reprend une variante Mésange par construction ; sa proximité n'est pas une validation indépendante.

Le benchmark `validation/benchmark-419.*` est **conservé sans modification** pour garantir la comparabilité avec la 4.19.

Source Mésange : DG Trésor / Insee, *Le modèle macroéconométrique Mésange : réestimation et nouveautés* (2017), section 4.1.2 : https://www.insee.fr/fr/statistiques/2848300

## 3. Tests et reproduction

Exécuter depuis la racine de l'archive complète :

```sh
node scripts/export-provenance-420.mjs
node scripts/test-transparence-420.mjs
node scripts/test-regressions.mjs
node scripts/test-economique-419.mjs
node scripts/test-fiscal-419.mjs
node scripts/test-mathematical.mjs
node scripts/stamp-build.mjs
```

Le test 4.20 confronte chaque réglage du registre aux objets réellement présents dans `data.js`, vérifie l'unicité de chaque clé, le statut des sources, la présence des liens dans les trois pages et la concordance des chiffres du benchmark avec `benchmark-419.json`.

### Ce qui n'a pas été testé

- Mesure Lighthouse ou audit manuel clavier/lecteur d'écran/mobile réel.
- Recalibrage macroéconomique ou validation causale indépendante.
- Vérification documentaire primaire de toutes les propositions politiques : **il reste beaucoup de travail avant de prétendre attribuer ces montants aux formations**.
- Mesure du consentement aux outils d'audience : aucune modification GoatCounter dans cette version.

## Fichiers

- **Modifiés** : `dist/data.js` (version seulement), `dist/index.html`, `dist/app.js`, `dist/audit.html`, `dist/styles.css`, `dist/programmes-economiques-2027.html`, `dist/sitemap.xml`, `dist/build-info.js`, `scripts/stamp-build.mjs`.
- **Ajoutés** : `dist/provenance-politique.html`, `dist/validation/provenance-politique-420.csv`, `dist/validation/provenance-politique-420.json`, `scripts/export-provenance-420.mjs`, `scripts/test-transparence-420.mjs`.
- **Inchangés** : calcul macro/fiscal et benchmark 4.19, données observées, autres moteurs.

## Publication GitHub Pages

Utiliser le ZIP `EcoSim_4.20_site_GitHubPages.zip` en remplaçant les fichiers publiés à la racine du dépôt (ou du répertoire GitHub Pages configuré). Vérifier que le pied de page mentionne **Version 4.20**, et que `provenance-politique.html` est consultable. Le second ZIP contient en outre les scripts de génération et de test. Le numéro de paquet est une empreinte de distribution et ne prétend pas être un hash de commit Git.
