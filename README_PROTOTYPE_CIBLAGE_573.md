# EcoSim — expérimentation complémentaire sur SMIC et pensions

La base publique 5.7.1 / technique 5.7.2.2 est **strictement conservée**.

Les ajouts se trouvent dans `experiments/distribution-ciblee-573/` :

- `model.mjs` : SMIC individuel (plancher légal + diffusion facultative) ; abattement de 10 % sur pensions (suppression ciblée, progressive, ou plafond ciblé).
- `test.mjs` : tests des règles, cas fiscaux et erreurs.
- `demo.mjs` et `demo-resultats.json` : quatre situations fiscales et six niveaux de salaire fictifs ; résultats de démonstration.
- `README.md` : hypothèses, limites et conditions d'un futur branchement macroéconomique.

Exécution depuis la racine de l'archive :

```bash
node experiments/distribution-ciblee-573/test.mjs
node experiments/distribution-ciblee-573/demo.mjs
```

`tests_projet.log` : trace des tests de non-régression déjà passés sur le paquet complet.

**IMPORTANT :** Prototype non publié sur le site, **aucune mesure politique nouvelle intégrée aux profils des partis**, pas de données représentatives ni de chiffrage budgétaire national. La chaîne macro reste inchangée en attente d'étalonnage. Aucun résultat OpenFisca réel n'est revendiqué.
