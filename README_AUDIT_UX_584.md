# EcoSim France — Suite de l’audit UX, livraison 5.8.4

Date : 11 octobre 2026. Source de travail : archive complète `EcoSim_5.8.3_correctifs_audit_UX_5728.zip`, non le site distant. Version de livraison : **5.7.2.9**. Version moteur public : **5.7.1**, moteur OpenFisca/validation : **5.7.2**, interface : **5.8.4**.

## Réponse aux trois résidus de l’audit

### 1. Panneau énergie — corrigé

Une nouvelle extension `dist/energy-ux-584.js`, accompagnée d’un style léger `dist/energy-ux-584.css`, reformule la narration « Énergie, prix et importations » et les deux indicateurs « Facture énergétique » / « Émissions ».

- Une facture affichée à `0,0 Md€` dont la valeur absolue calculée est inférieure à `0,05 Md€` devient « variation inférieure à 0,05 Md€ » (précision de l’affichage au dixième), sans inventer un zéro exact.
- Les **émissions** calculées exactement nulles deviennent « aucune variation calculée » dans la narration, « Inchangé » dans la carte.
- Un écart réel positif mais arrondi à `+0,0` devient « hausse inférieure à 0,05 » dans l’unité de la carte. Un écart négatif `−0,0` devient « baisse inférieure à 0,05 ».
- Les écarts `+1,2`, `−1,2`, etc. conservent leur signe et leur valeur ; les unités restent explicites.
- Après recalcul ou changement d’horizon, un `MutationObserver` applique de nouveau les libellés à la vue reconstruite par le moteur.

Cette extension n’est pas un nouveau calcul énergétique. `dist/app.js` et `dist/energy-balance-500.js` restent **octet par octet identiques** à ceux de la 5.8.3.

### 2. Non-régression UX — ajoutée à la CI

`dist/scripts/test-ux-sentinelle-584.mjs` s’exécute dans les **deux workflows GitHub Actions** avant publication ou validation du manifeste. Il vérifie :

- présence et ordre de chargement des extensions 5.8.2 / 5.8.3 / 5.8.4 ;
- absence de régression sur « Aucun recrutement supplémentaire demandé », les modes Découverte/Expert, les liens de navigation et le sticky ;
- existence du `LICENSE` à la racine du dépôt, présence des liens juridiques ;
- **tests dynamiques** par DOM simulé des zéros exacts, signes `+` / `−` cachés par l’arrondi et valeurs non nulles de l’énergie ;
- étiquette de livraison `5.7.2.9`.

`node scripts/test-ux-584.mjs` intègre cette sentinelle à `run-tests-510.sh` et contrôle les empreintes de plusieurs modules hérités de 5.8.3 (les données et le fiscal ne sont pas abusivement comparés à leur empreinte de 5.3.1).

### 3. Navigation et accessibilité — vérification complémentaire, non certification

`python scripts/test-browser-ux-584.py` construit **en mémoire** le HTML réel de la page en y incorporant les scripts et styles locaux. Cela évite la navigation réseau, bloquée dans l’environnement de test.

Contrôles Chromium réussis aux largeurs **1350 px** et **390 px** : initialisation de la page et des projections sans erreur JavaScript, sticky placé sous l’en-tête (72 px sur ordinateur, 62 px sur mobile simulé), aucun débordement horizontal global, mode Découverte actif par défaut, réouverture d’une rubrique avancée par lien ancré, recalcul après changement d’horizon, mise en forme des valeurs énergétiques.

Inspection des éléments non ignorés dans l’arbre d’accessibilité Chromium : **231 éléments interactifs nommés** sur la page explorée en bureau/Expert, **213 en mobile simulé/Expert**, **aucun sans nom accessible détecté**. Ce contrôle ne mesure **ni contraste ni conformité RGAA**, ni les interactions d’un lecteur d’écran, ni l’accessibilité sur un vrai téléphone.

## Vérifications

- Suite générale `bash scripts/run-tests-510.sh` : **réussie** après ajout de la sentinelle (statistique, fiscalité, golden, moteur, tous tests `test-*.mjs` et syntaxe JS).
- Test d’empreinte et estampillage : `node scripts/stamp-build.mjs` puis `node scripts/make-manifest-572.mjs`; `sha256sum -c` et contrôle de livraison **réussis**.
- **129 fichiers** recensés dans le manifeste de livraison 5.7.2.
- `LICENSE` reste à la racine du dépôt GitHub, **pas dans le site public**. Les mentions du site pointent vers ce fichier.
- Aucune confrontation réelle OpenFisca supplémentaire n’a été effectuée.

## Ce qui reste à faire

1. Lancer un **audit axe-core + Lighthouse** sur le véritable site déployé (l’outil axe n’était pas disponible dans cet environnement), avec corrections selon les résultats.
2. Vérifier le parcours sur un **téléphone physique**, notamment les tableaux fiscaux denses et les interactions tactiles.
3. Continuer à simplifier les autres `0,0` de pure différence dans les cartes et explications, sans transformer systématiquement les variations arrondies en zéros exacts.
4. Après publication : vérifier l’empreinte du site effectivement servi, la présence du `LICENSE` à la racine du dépôt, le workflow CI et l’affichage énergie dans un scénario modifié.

## Publication

La présente archive est un projet préparé localement. **Aucune modification n’a été poussée sur GitHub**. Pour publier, intégrer le contenu de `dist/` au répertoire réellement servi par GitHub Pages, conserver `LICENSE` à la racine du dépôt, ainsi que les scripts de développement/CI appropriés. Les fichiers `dist/.github/workflows/` doivent être reportés dans `.github/workflows/` à la racine du dépôt GitHub. Vérifier les éventuels changements concurrents avant remplacement.

Le titre suggéré du commit est `5.7.2.9`, cohérent avec `deliveryLabel` ; le simulateur et sa méthode demeurent transparents, les résultats macroéconomiques historiques ne sont pas recalculés.
