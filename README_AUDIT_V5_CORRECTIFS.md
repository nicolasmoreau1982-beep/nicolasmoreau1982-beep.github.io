# EcoSim France — correctifs audit v5 du 11 octobre 2026

## Périmètre et constat

Le décalage « 5.7.2 annoncée / 5.7.1 affichée » était **intentionnel dans le README 5.7.2** : le simulateur, son barème et ses résultats publics sont en 5.7.1 ; la validation OpenFisca et la correction des poids sont en 5.7.2. Réestampiller en aveugle le site `5.7.2` aurait été une fausse déclaration de mise à jour des résultats.

Le vrai défaut était l'absence de **convention explicite, publiquement visible et vérifiée au déploiement**.

## Livré

- `dist/release-status-572.json` : deux versions et état OpenFisca non exécuté ; publication honnête.
- `scripts/stamp-build.mjs` lit cette déclaration et produit `dist/build-info.js` avec `ECOSIM_VERSION` (publique), `ECOSIM_TECHNICAL_VERSION` et `ECOSIM_BUILD_ID`.
- `dist/verification-openfisca-571.html` explique désormais les deux versions sur la page, sans suggérer une vérification scientifique accomplie.
- `dist/scripts/check-release-572.mjs` vérifie versions, données fiscales, empreinte recomputée, périmètre sitemap et, pour un commit nommé comme une release (ex. `5.7.2` ou `Release v5.7.2`), concordance avec la version technique. Ne refuse pas des commits ordinaires de correction qui ne sont pas des releases.
- `dist/.github/workflows/controle-livraison-572.yml` : CI indépendante sur push, PR et lancement manuel.
- `dist/.github/workflows/static.yml` : **workflow de déploiement Pages bloquant**, qui vérifie version et manifeste avant d'envoyer l'artefact ; accepte les deux structures connues (racine ou `dist/`). **Comparer avec votre workflow courant avant de le remplacer** si vous l'avez personnalisé.
- `scripts/test-release-572.mjs` : cas positifs et négatifs, dont version, empreinte et commit falsifiés ; validité des 27 URL et ordre bloquant du contrôle CI.
- `scripts/make-manifest-572.mjs` : régénération du seul manifeste technique, préservation des manifestes historiques.

## Installation

Cette archive est un **paquet local, pas un commit poussé sur GitHub**. À partir du ZIP, publier les fichiers de `dist/` dans la racine de publication du dépôt, en préservant les chemins cachés `.github/workflows/`. **Ne pas mélanger une ancienne structure en `dist/` et une nouvelle structure racine** sans choisir explicitement la source de publication. Le workflow `static.yml` inclus détecte le cas où un `release-status-572.json` est présent à la racine ou sous `dist/` et publie le bon site.

Dans le répertoire contenant les scripts de développement :

```bash
node scripts/stamp-build.mjs
node scripts/make-manifest-572.mjs
bash scripts/run-tests-572.sh
```

Dans la distribution publiée (quel que soit son emplacement) :

```bash
node scripts/check-release-572.mjs
sha256sum -c manifest-integrite-572.sha256
```

Vérifier l'onglet Actions après le commit : le workflow de déploiement doit avoir exécuté la vérification **avant** `upload-pages-artifact`. Ne pas considérer le nouveau workflow indépendant comme une protection suffisante pour le déploiement.

## Choix conservés et points ouverts de l'audit

- **Contact GitHub uniquement : préservé.** Aucun mailto ni formulaire ajouté.
- **Mentions légales : aucune donnée personnelle ajoutée.** La page comporte déjà une description conditionnelle du régime de l'éditeur non professionnel ; le statut applicable et les éléments connus de l'hébergeur nécessitent une vérification humaine. Ne pas fabriquer une identité, un numéro de téléphone ou une conformité.
- **Sitemap : les six `lastmod` restent omis.** Il manque une date de dernière modification **significative** vérifiable pour ces pages dans l'archive sans historique Git. Google autorise l'omission : leur attribuer la date du jour artificiellement serait nuisible à la confiance dans les données. Renseigner ces dates après examen de l'historique éditorial réel, et revoir également l'exactitude des 21 dates déjà présentes.
- **Accessibilité : le test heuristique Playwright actuel trouve 314 contrôles (167 visibles) et zéro sans nom accessible.** Ce résultat ne remplace pas axe DevTools, Lighthouse ni une vérification RGAA.
- **JSON-LD, Search Console et domaine personnalisé : non modifiés** (décisions de publication, contenu et vérifications externes non couverts par cette correction).
- **OpenFisca réel : non exécuté ici.** L'exécution GitHub Actions demeure manuelle, les écarts indépendants restent à analyser.

La correction ne touche pas les équations du moteur macroéconomique, les tables du barème individuel ni les 56 foyers fiscaux. Les golden files historiques et leurs manifestes sont préservés.
