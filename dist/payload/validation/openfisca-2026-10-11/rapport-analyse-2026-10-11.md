# EcoSim France — Rapport de confrontation OpenFisca (première exécution)

**Date des résultats :** 2026-10-11T19:47:24.315096+00:00  
**Source :** artifact GitHub Actions `ecosim-confrontation-openfisca-572.zip` remis par l'éditeur.  
**Statut recommandé :** *Confrontation exécutée sur 56 cas, cohérence observée dans le périmètre testé, revue méthodologique encore nécessaire.*

## 1. Provenance et intégrité

- OpenFisca-France : `176.1.2` ; OpenFisca-Core : `44.7.1` ; Python : `3.11.17` (dépendances déclarées dans l'artifact).
- Date et période simulée OpenFisca : `2025` ; EcoSim : revenus 2025, barème déclaré pour 2026.
- Mode déclaré : `python_openfisca_direct`. Les variables intermédiaires `rni`, `nbptr`, `nbF`, `maries_ou_pacses`, `celibataire_ou_divorce` sont injectées ; cela ne correspond pas à un dossier fiscal complet recomposé depuis des personnes.
- Empreinte SHA-256 du jeu de références : `8e3122a86f64eff7d54462365f7e807eb2117205e907fbad87153f7335a1a8b5`.
- **Vérification supplémentaire indépendante du rapport :** cette empreinte correspond octet pour octet au fichier `dist/validation/fiscal-individuel-570.json` de l'archive EcoSim 5.8.4 disponible dans la conversation. L'identité des 56 identifiants et les montants de référence correspondent également.
- Le workflow est annoncé comme réussi par l'éditeur. L'artifact atteste des fichiers calculés, mais sans URL de run ni journal complet il ne constitue pas seul une preuve inviolable d'exécution en environnement tiers.

## 2. Résultats chiffrés

| Indicateur | Impôt brut après plafond familial | Impôt après décote |
|---|---:|---:|
| Nombre de foyers | 56 | 56 |
| Écart absolu moyen | 0.000189 € | 0.056453 € |
| Écart absolu maximal | 0.000937 € | 0.475000 € |
| Cas avec écart supérieur à 0,01 € | 0 | 10 |
| Cas avec écart supérieur à 1 € | 0 | 0 |

Les 56 cas représentent 8 configurations (célibataire ou couple, de 0 à 3 enfants) × 7 niveaux de revenu. Ces cas ne forment **pas** une distribution de population représentative.

## 3. Cas présentant les plus grands écarts (après décote)

*La différence est toujours EcoSim moins OpenFisca ; le signe négatif signifie qu'EcoSim affiche un montant inférieur.*

| Cas | EcoSim (€) | OpenFisca (€) | Différence (€) |
|---|---:|---:|---:|
| `couple-0-34200` | 274.525 | 275.000 | -0.475 |
| `single-2-34200` | 860.525 | 861.000 | -0.475 |
| `single-2-30000` | 189.470 | 189.000 | +0.470 |
| `couple-2-50000` | 945.580 | 946.000 | -0.420 |
| `single-3-50000` | 1531.580 | 1532.000 | -0.420 |
| `couple-1-50000` | 1872.275 | 1872.000 | +0.275 |
| `single-1-34200` | 1787.220 | 1787.000 | +0.220 |
| `single-0-17370` | 24.902 | 24.700 | +0.202 |
| `single-1-30000` | 1116.165 | 1116.000 | +0.165 |
| `couple-0-50000` | 2798.970 | 2799.000 | -0.030 |

## 4. Explication des écarts

- Tous les écarts sur le montant brut sont inférieurs à 0,001 € : ils sont compatibles avec de simples effets de précision en virgule flottante.
- Les 10 écarts supérieurs à 0,01 € concernent uniquement le montant **après décote**. Dans ces 10 cas, les valeurs sont réconciliées en arrondissant à l'euro la décote calculée par EcoSim avant soustraction.
- Cette simulation d'arrondi ramène l'écart absolu maximal à 0.000937 € et l'écart moyen à 0.000189 € sur les 56 cas. **C'est un diagnostic d'explication, pas une prescription réglementaire d'arrondi.** Avant de modifier EcoSim, vérifier les règles légales d'arrondi (et les éventuels propres choix du modèle OpenFisca) pour l'étape exacte concernée.

## 5. Limites à publier avec le résultat

1. Les variables intermédiaires des foyers sont **forcées**, donc la comparaison n'évalue pas l'intégralité des chemins de calcul depuis revenus bruts, prestations, personnes et déclarations réelles.
2. Vérifier formellement la concordance entre `period = 2025` dans OpenFisca et la convention revenus 2025 / déclaration 2026 d'EcoSim.
3. L'indicateur est un **impôt simplifié après décote**, pas le montant final dû sur un avis d'imposition complet (pas tous crédits, réductions, prélèvements, etc.).
4. Aucun résultat ne valide la représentativité des 56 cas, la micro-simulation nationale ni les effets macroéconomiques des politiques.
5. Conserver l'URL de l'exécution GitHub Actions, les logs et la version exacte du workflow dans le dossier de preuves.

## 6. Conclusion publiable

> La première confrontation exécutée à l'aide d'OpenFisca-France 176.1.2 porte sur 56 foyers fictifs dont les revenus nets imposables et caractéristiques fiscales intermédiaires sont alignés entre les deux moteurs. Aucun écart supérieur à un euro n'a été constaté. L'écart maximal après décote est de 0,475 euro ; l'écart brut maximal est inférieur à 0,001 euro. Les écarts significatifs à l'échelle du centime sont compatibles avec une différence d'arrondi de la décote. Le test confirme une forte cohérence **sur ce périmètre limité**, sans certifier un calcul fiscal de bout en bout ni une estimation nationale.

**État de suivi proposé :** remplacer la mention « OpenFisca non exécuté » par « Exécution réalisée le 11 octobre 2026 — rapport publié, portée limitée ». Maintenir « examen méthodologique nécessaire » et ne pas employer « validation fiscale complète ».

**Pièces :** artifact initial `ecosim-confrontation-openfisca-572.zip` ; détails 56 cas `EcoSim_OpenFisca_56_cas_2026-10-11.csv`.
