# EcoSim France — version technique 5.7.2

**Date : 11 octobre 2026.** Base conservée : archive EcoSim 5.7.1. Aucun recalibrage économique, aucune modification de l'interface publique, des données micro de démonstration ni de l'impôt individuel EcoSim ; correction limitée au traitement des pondérations dans l'estimateur.

## Pourquoi cette version ?

La 5.7.1 avait préparé un exécuteur OpenFisca-France et un workflow GitHub, mais n'avait pas exécuté ce moteur réel. La 5.7.2 **durcit l'étape de confrontation**, avant toute interprétation : un JSON à source déclarée n'est pas une preuve suffisante.

### Nouvelles pièces

- `dist/openfisca-validation/run_openfisca_572.py` : exécuteur OpenFisca réel, 56 cas exacts et vérification préalable du schéma ; 8 variables nécessaires contrôlées ; provenance, date et SHA-256 brut du fichier d'entrée ; aucune sortie en cas d'échec. Les variables intermédiaires restent injectées, avec limites documentées.
- `dist/scripts/verifier-openfisca-572.mjs` : contrôle de la **complétude des 56 cas**, des huit sous-groupes (personne/couple, 0–3 enfants), des types et revenus, du SHA-256 des entrées, des variables d'entrée forcées, des identifiants, de la cohérence de décote. Calcule écarts absolus moyens, RMSE, médiane, 95e percentile, maxima et dix cas extrêmes, avec détail par composition.
- `dist/.github/workflows/openfisca-572.yml` : nouveau workflow manuel distinct de celui de 5.7.1. Installe le paquet officiel, archive la liste `pip freeze` et le SHA des cas, exécute et vérifie les sorties, publie les artefacts même si une étape échoue. **Ne masque pas les échecs** ; aucun « taux de réussite » pré-calculé.
- `scripts/test-openfisca-572.py`, `scripts/test-verifier-openfisca-572.mjs`, `scripts/run-tests-572.sh` : contrats stricts et cas négatifs, avec **faux moteur explicite**. La vraie concordance reste non évaluée.
- `dist/microdonnees-validation/estimer-572.mjs` : correction d'un défaut numérique préexistant : les poids positifs inférieurs à `1e-9` étaient ignorés et pouvaient donner 10 moyennes non définies. La nouvelle répartition par chevauchement exact des intervalles pondérés conserve la masse des foyers. L'ancien calculateur 5.7.1 reste intact pour conserver sa traçabilité. Aucune modification des 56 foyers de démonstration.
- `scripts/test-micro-572.mjs` : tests de poids très petits et fortement déséquilibrés.
- `dist/manifest-integrite-572.sha256` : empreintes des fichiers livrés.

## Comment l'utiliser sur GitHub

1. Déposer **le contenu du répertoire `dist/` à la racine du dépôt** (notamment `.github/workflows/openfisca-572.yml`, `openfisca-validation/`, `scripts/` et `validation/`). Ne pas conserver le dossier enveloppe `dist` dans le dépôt publié.
2. Aller à **Actions → EcoSim - confrontation OpenFisca 5.7.2 (revue requise) → Run workflow**.
3. Télécharger l'artefact `ecosim-confrontation-openfisca-572`.
4. Lire la version OpenFisca installée et le journal. Si le workflow aboutit, lire `rapport-confrontation-openfisca-572.json`, ses écarts globaux, par sous-groupe, et ses dix plus gros écarts. En cas d'échec, **ne pas conclure à une concordance**.

En local, si le package OpenFisca-France est déjà installé :

```bash
python openfisca-validation/run_openfisca_572.py \
  --cases validation/fiscal-individuel-570.json \
  --out sortie-openfisca-reelle-572.json
node scripts/verifier-openfisca-572.mjs \
  validation/fiscal-individuel-570.json \
  sortie-openfisca-reelle-572.json \
  rapport-confrontation-openfisca-572.json
```

Test local depuis l'archive extraite : `bash scripts/run-tests-572.sh`.

## État scientifique

**OpenFisca réel : NON EXÉCUTÉ DANS CETTE LIVRAISON.** Sans paquet exécutable dans l'environnement de construction, aucun chiffre indépendant n'a été calculé. Le comparateur est vérifié avec un **faux export dérivé d'EcoSim à seule fin de tester son fonctionnement** : ce test ne prouve rien sur la justesse des impôts.

En particulier, la relation entre **période de calcul OpenFisca 2025** et **barème fiscal EcoSim 2026 sur revenus 2025** doit être vérifiée, ainsi que la définition des variables `rni`, `nbptr`, `ir_plaf_qf` et `decote`. L'injection d'intermédiaires sans structure complète du foyer n'est pas une simulation de déclaration fiscale. Une concordance numérique éventuelle ne prouve ni la représentativité des microdonnées, ni un impact budgétaire national, ni la validité du moteur macro.

Le site public existant reste en affichage **5.7.1**, volontairement : ce paquet est un renforcement *technique* du processus de vérification, **pas une validation OpenFisca ni une mise à jour des résultats publics**. L'ancien workflow 5.7.1 reste présent pour préserver la rétrocompatibilité ; privilégier celui intitulé **5.7.2 (revue requise)**.

## Étape suivante

**Récupérer un vrai rapport OpenFisca et l'auditer**, relever les différences réglementaires/arrondis/périodes et corriger le modèle individuel uniquement sur preuves, avant d'envisager des données représentatives. Ne pas étendre artificiellement les 56 foyers synthétiques au niveau national.

---

## Addendum audit v5 — contrôle de la livraison

Une version publique 5.7.1 et une version technique 5.7.2 sont explicitement distinguées et vérifiées avant publication. Les fichiers livrables figurent dans `dist/`. Lire `README_AUDIT_V5_CORRECTIFS.md` pour le périmètre, l'intégration GitHub Pages et les points volontairement non modifiés.
