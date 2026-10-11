# EcoSim France — correction d'interface issue de l'audit (5.8.2)

**Préparation : 11 octobre 2026.** Révision de livraison technique **5.7.2.7**. Le moteur et les résultats publics restent en **5.7.1**, le protocole OpenFisca en **5.7.2**, et l'atelier de distributions SMIC/pensions en **5.8.1**. **5.8.2** désigne uniquement l'amélioration d'affichage des effectifs publics.

## Audit à l'origine du correctif

Dans le panneau **« Armées, sécurité, justice et services publics »**, l'étiquette « 0,0 k » est répétée à droite des métiers, sans réexplication locale qu'il s'agit d'un **écart d'effectifs par rapport à la référence**, et non d'un effectif réel nul. Les libellés « retraités supplémentaires 0,0 k » et « 0,0 k sur 0,0 k demandés » surchargent le panneau au scénario par défaut.

## Modifications visibles

- **Écart exactement nul** : affichage « **Inchangé** », texte accessible « aucun écart », police neutre et légende explicite sur la distinction entre références et variations.
- **Petit écart non nul affiché `+0,0 k` ou `−0,0 k` par l'ancien arrondi** : affichage « Hausse de moins de 50 agents » ou « Baisse de moins de 50 agents ». Le signe est **conservé** ; aucune petite variation n'est faussement décrite comme nulle.
- **Autres écarts** : chiffres signés, identiques à ceux rendus par le moteur, sans nouvelle approximation.
- **Retraités supplémentaires nuls** : sous-ligne redondante masquée. Une variation non nulle reste visible, renommée « écart de retraités » pour couvrir aussi les baisses.
- **Aucun recrutement demandé** : « Aucun recrutement supplémentaire demandé cette année » plutôt que « 0,0 k sur 0,0 k demandés » ; sinon les demandes et réalisations sont détaillées.
- **Accessibilité** : attributs `aria-label` expliquant la signification de chaque écart, avec l'année simulée.

Les effectifs de référence, statuts, carrières, coûts calibrés, catégorie A/B/C, règles de retraite, données de métiers et résultats budgétaires **ne changent pas**.

## Architecture et risques maîtrisés

Les fichiers historiques `dist/app.js` et `dist/styles.css` ne sont pas modifiés, pour respecter les empreintes gelées. L'extension `dist/workforce-ux-582.js` s'exécute **après** le moteur, et utilise un `MutationObserver` limité au panneau, car l'application reconstruit ce panneau à chaque modification du scénario. Une feuille séparée `dist/workforce-ux-582.css` introduit seulement les styles de lisibilité. La page `dist/index.html` charge les deux fichiers.

La règle de présentation « moins de 50 agents » provient de l'arrondi du moteur au dixième de millier (0,1 k = 100 agents), et **ne constitue pas une nouvelle donnée économique**. Le contrôle des empreintes historiques est préservé ; le manifeste de livraison courante doit être régénéré après intégration.

## Tests

```bash
node scripts/test-workforce-ux-582.mjs
python scripts/test-browser-workforce-582.py
bash scripts/run-tests-510.sh
node scripts/test-source-inchangee-540.mjs
node scripts/test-golden-540.mjs
node scripts/stamp-build.mjs
node scripts/make-manifest-572.mjs
(cd dist && sha256sum -c manifest-integrite-572.sha256)
node scripts/test-release-572.mjs
```

Les tests navigateur injectent localement les fichiers, vérifient le scénario par défaut, un **vrai changement d'horizon** et une projection d'essai avec écarts positifs/négatifs. Ils ne vérifient ni le déploiement GitHub Pages ni la conformité complète RGAA/axe.

## Déploiement

Publier l'archive complète sur le dépôt en conservant le fichier `LICENSE` à la racine. Ne pas modifier les manifestes historiques. Après les tests et le contrôle de cohérence de livraison, un commit **`5.7.2.7`** ou **`Release v5.7.2.7`** concorde avec `release-status-572.json`. Le site en ligne n'est **pas** modifié par cette archive.
