# EcoSim France 5.1.0 — durcissement du moteur

**Base :** version 5.0.0 complète, conservée dans ce dossier comme historique. **Publication :** octobre 2026.

## Résumé des changements vérifiés

1. `dist/guardrails-510.js` : nouveau module de contrats. Il contrôle la cohérence de la base 2025, les 30 années de référence, les coefficients et l'unicité des identifiants budgétaires au chargement.
2. `dist/app.js` : chaque année de projection passe un contrôle d'intégrité (valeurs finies, coût budgétaire direct = dépenses - recettes, déficit, évolution de dette, ratios, chômage et prime de risque). La trajectoire complète est vérifiée une deuxième fois avant d'être présentée.
3. Import JSON / lien partagé : un scénario entier est validé et normalisé avant toute mutation d'état. Les clés de prototype, sélections inconnues, champs imbriqués inconnus, types numériques incompatibles, bornes dépassées, valeurs non finies et calendriers invalides sont rejetés. Les imports partiels sont construits à partir des valeurs par défaut, sans réutiliser des paramètres résiduels du scénario précédent.
4. `dist/sectoral.js` : rejette désormais `true`, `false`, `null` ou des objets comme nombres sectoriels (montants, dates, durées). Les chiffres valides continuent à être acceptés.
5. `dist/integrite-moteur-510.html` : nouvelle page lisible sans JavaScript, liée depuis l'accueil et l'audit. `dist/sitemap.xml` mis à jour.
6. `scripts/test-guardrails-510.mjs` : 40 cas hostiles et tests de mutation d'identités comptables, de valeurs non finies et de rejouabilité des scénarios anciens.
7. `scripts/run-tests-510.sh` : lance toutes les 15 suites de tests et la vérification de syntaxe JavaScript.
8. Traçabilité : version `5.1.0`, empreinte du paquet et fichier `manifest-integrite-510.sha256` (hash SHA-256 de chaque fichier de distribution, sauf le manifeste lui-même).

## Résultats observés

- **15 suites automatisées exécutées avec succès**, incluant les 466 projections mathématiques sur 30 ans et 84 128 identités numériques du banc existant.
- **60 résultats économiques historiques de référence identiques** aux résultats archivés : ni multiplicateurs ni paramètres centraux recalibrés.
- **69 contrôles ciblés de durcissement**, incluant 40 entrées hostiles ou malformées.
- Les exemples JSON 4.24 et 4.25 inclus dans `dist/examples/` sont réimportables.

## Compatibilité à connaître

La 5.1 rend la validation **plus stricte**. Un ancien JSON dont un montant sort désormais des bornes, un champ inconnu ou un type tel que `null` était auparavant silencieusement ignoré/corrigé, sera désormais **refusé**. C'est intentionnel pour ne pas obtenir silencieusement un scénario différent de celui envoyé. Les scénarios valides restent importables.

## Ce que la 5.1 ne garantit pas

- Pas de validation causale des multiplicateurs, de microsimulation représentative ni de certification scientifique.
- Le diagnostic transversal des doubles comptes demeure heuristique, il ne les élimine pas.
- Tests automatiques exécutés en Node.js, pas validation de la navigation réelle (mobile, clavier, lecteur d'écran).
- Chromium headless n'a pas renvoyé de DOM dans cet environnement : **aucun test visuel complet n'est revendiqué**.
- Aucun ajustement automatique des résultats économiques pour éviter de cacher une incohérence.

## Utiliser les archives

- `EcoSim_5.1_site_GitHubPages.zip` : extraire son contenu **à la racine** du dépôt GitHub Pages. Il contient notamment `index.html`, `app.js` et `guardrails-510.js`.
- `EcoSim_5.1_code_et_tests.zip` : arborescence `dist/`, `scripts/`, ce README, le journal de test et un manifeste.

### Commandes

```bash
bash scripts/run-tests-510.sh
node scripts/test-guardrails-510.mjs
sha256sum -c dist/manifest-integrite-510.sha256
```

Pour la vérification du manifeste, lancer la commande `sha256sum -c` **depuis le dossier `dist/`** ou remplacer la dernière ligne ci-dessus par :

```bash
(cd dist && sha256sum -c manifest-integrite-510.sha256)
```

Après publication, vérifier `Version 5.1`, le chargement du simulateur, l'import des exemples, puis une mesure budgétaire et une mesure sectorielle.
