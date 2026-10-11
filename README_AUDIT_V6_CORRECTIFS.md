# EcoSim France — audit v6, correctif de livraison 5.7.2.2

Date : 11 octobre 2026. **Ce paquet local n'a pas été poussé sur GitHub** et n'exécute pas OpenFisca-France à distance.

## Politique de version

- Moteur / résultats publics : `5.7.1` (sans modification de calcul).
- Outillage / comparateur OpenFisca : `5.7.2`.
- Étiquette de **cette livraison corrective** : `5.7.2.2` (quatre composantes : la dernière est une révision de livraison, **pas** une version semver du moteur).
- Le fichier `release-status-572.json` contient désormais `deliveryLabel: "5.7.2.2"`. Le vérificateur refuse `5.7.2.1`, `5.7.2`, `5.7.2.999`, `5.7.3` lorsqu'ils sont des titres de commit de livraison. Il ne bloque pas les titres de commits de maintenance ordinaires.
- Lors de la **mise en ligne de ce paquet**, utiliser comme sujet du commit de publication `5.7.2.2` ou `Release v5.7.2.2`. Si un commit quelconque ne déclare pas être une livraison, son titre n'est pas assimilé à une étiquette : c'est un choix explicite pour ne pas empêcher les commits ordinaires.

## Changements

1. Accueil : « Version actuelle : 5.7.1 · livraison technique 5.7.2 » (lien vers le protocole de comparaison).
2. Message final de `scripts/run-tests-570.sh` : versions publique et technique séparées.
3. Contrôle renforcé : comparaison exacte de la révision complète du sujet de commit avec `deliveryLabel`, en plus du contrôle de la version technique, du moteur public, de l'empreinte et du manifeste.
4. Protocole OpenFisca : corrige le lien d'action public pour orienter vers **`EcoSim - confrontation OpenFisca 5.7.2 (revue requise)`**, et non l'ancien workflow de 5.7.1. **Aucune sortie du véritable OpenFisca n'a été produite dans ce paquet.**
5. Référencement : cinq guides reçoivent le JSON-LD `Article`, le glossaire le type `DefinedTermSet`, alimenté par les 18 définitions déjà publiées. Aucun auteur fictif, aucune date fictive, aucune FAQ inventée.
6. `lastmod` : les 6 dates manquantes sont laissées absentes, faute d'historique Git pouvant prouver une modification significative. Les tests ne figent plus arbitrairement la couverture à « 21 dates ». Les 21 dates existantes devraient elles aussi être vérifiées contre l'historique éditorial.
7. Contact : GitHub Issues seulement ; aucune adresse e-mail ni formulaire ajoutés. Mentions légales : aucune identité ou conformité supposée.

## Tests et vérifications locales

- `bash scripts/run-tests-510.sh` : réussi, y compris golden (1 980 valeurs), analyse fiscale et régressions.
- `node scripts/test-release-572.mjs` : positif et négatifs de version, empreinte, manifeste et cohérence sitemap.
- `node scripts/test-seo-572.mjs` : 5 articles + 18 termes de glossaire cohérents.
- `python scripts/test-browser-openfisca-571.py`, `python scripts/test-browser-fiscal-570.py` : Chromium ordinateur et mobile OK.
- Contrôle Chromium mobile ponctuel : accueil et six pages documentaires, aucun débordement horizontal détecté.
- `node scripts/check-release-572.mjs --commit-subject 'Release v5.7.2.2'` et `sha256sum -c manifest-integrite-572.sha256` à exécuter dans la distribution déployée.

## Publication

L'archive complète contient un dossier `dist/` et les outils de développement dans `scripts/`. Si, comme prévu par les README précédents, le dépôt GitHub Pages publie les fichiers du site depuis sa **racine**, y copier le *contenu* de `dist/` (et en particulier `.github/workflows/`, dossier caché) ; conserver les scripts de développement au bon niveau selon l'organisation réelle du dépôt. Vérifier le diff avec la branche actuelle avant commit. Ne pas remplacer un workflow Pages éventuellement personnalisé sans le comparer.

Exécuter les tests et l'empreinte à partir de la racine de l'archive :

```bash
node scripts/stamp-build.mjs
node scripts/make-manifest-572.mjs
bash scripts/run-tests-510.sh
node scripts/test-release-572.mjs
(cd dist && node scripts/check-release-572.mjs --commit-subject 'Release v5.7.2.2' && sha256sum -c manifest-integrite-572.sha256)
```

Attention : `stamp-build` et `make-manifest-572` font partie de la chaîne de construction ; l'ordre compte. Ne pas publier une archive testée puis remodifiée sans réexécuter ces étapes.

## OpenFisca : exécution encore nécessaire

Dans le dépôt contenant `.github/workflows/openfisca-572.yml` :

1. Onglet **Actions** → **EcoSim - confrontation OpenFisca 5.7.2 (revue requise)** → **Run workflow** (branche déployée).
2. Examiner les journaux Python et Node. Télécharger l'artefact `ecosim-confrontation-openfisca-572`, même en cas d'échec partiel.
3. Si le rapport complet existe, analyser la moyenne, le P95, les écarts maximaux, les 8 groupes et les 10 pires cas. Rapprocher les périodes et le traitement `rni/nbptr/nbF` avant toute publication d'une conclusion scientifique.
4. Publier un rapport sur le site **uniquement après revue**. Le simple déclenchement du workflow ne constitue pas une validation scientifique, et les artefacts GitHub Actions ne sont pas nécessairement accessibles aux visiteurs anonymes.

Le workflow **5.7.1** ancien reste dans l'archive pour historique ; privilégier **5.7.2**.

## Ce qui n'est pas fermé

- OpenFisca réel : aucune exécution ni résultat vérifié ici ; intégration GitHub requise pour lancer le workflow sur ton dépôt.
- 6 `lastmod` : dates éditoriales non attestées. Ne pas dater automatiquement du jour sans changement de contenu significatif.
- Axe / Lighthouse / RGAA : non exécutés, tests heuristiques existants distincts.
- Attestation effective de la transmission des informations d'éditeur à l'hébergeur : non vérifiée ; aucune attestation juridique revendiquée.
- Google Search Console : aucune inspection ni nouvelle soumission effectuée.
