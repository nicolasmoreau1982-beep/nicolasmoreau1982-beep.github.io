# EcoSim France 5.7.1 — Confrontation OpenFisca et microdonnées

Date : 11 octobre 2026. Base : version 5.7.0 ; **aucune équation macroéconomique recalibrée**.

## Livraisons réelles

1. **Exécuteur réel, non encore exécuté dans l'environnement de livraison :** `dist/openfisca-validation/run_openfisca_571.py` importe le véritable paquet `openfisca-france`, crée 56 simulations sur l'année de revenu 2025 et calcule `ir_brut`, `ir_plaf_qf` et `decote`. Il enregistre des valeurs réelles seulement si le paquet est disponible. Le package `openfisca-france` n'était pas disponible ici (résolution DNS interrompue), donc **aucune concordance numérique OpenFisca n'est prétendue**.
2. **Exécution sur GitHub Actions :** `.github/workflows/openfisca-571.yml` installé à la racine du dépôt, exécutable manuellement depuis l'onglet Actions. Il installe le paquet officiel, enregistre sa version, lance les cas, confronte les résultats aux chiffres EcoSim, calcule MAE/RMSE et dépose les trois rapports comme artefacts de run. Ce workflow **n'a pas été exécuté par l'auteur de la livraison**. Il peut découvrir des divergences ou des incompatibilités de version ; ne jamais afficher les résultats comme validés avant l'exécution et l'analyse du rapport.
3. **Calcul pondéré autonome :** `dist/microdonnees-validation/estimer-571.mjs`, avec JSON d'entrée propre (`foyer_fiscal`, revenu net imposable, enfants, poids strictement positifs, taux du barème alternatif), agrège les impôts avant/après et les variations par dix groupes pondérés de revenu fiscal du **foyer**.
4. **Démo uniquement fictive :** `dist/microdonnees-validation/demo-571.json` et `demo-resultats-571.json` utilisent les **56 foyers synthétiques** de la 5.7 avec des poids tous égaux à 1. Ces montants ne sont **pas** des recettes fiscales nationales. Les groupes ne sont pas des déciles de niveau de vie de l'Insee.
5. **Page publique :** `dist/verification-openfisca-571.html`, avec état exact de validation, méthode, limites, sources et instructions de déclenchement.

## OpenFisca : exécuter et lire le résultat

Option GitHub : publier les fichiers du dossier `dist` à la **racine du dépôt**, y compris `.github/workflows/openfisca-571.yml`, `scripts` et `openfisca-validation`, puis :

1. Aller à **Actions → EcoSim - verification OpenFisca independante → Run workflow**.
2. Examiner les messages de l'exécution (échec = **pas de validation**).
3. Télécharger l'artefact `ecosim-openfisca-comparaison-571` contenant `comparaison-openfisca-reelle-571.json`, `rapport-ecarts-openfisca-571.json` et `synthese-openfisca-571.json` lorsque l'exécution se termine correctement.
4. Contrôler les écarts, la version du paquet et la sémantique fiscale avant toute conclusion. Ne pas remplacer les résultats économiques du moteur central par ces valeurs.

Option locale Linux :

```bash
python3 -m venv .venv-openfisca
. .venv-openfisca/bin/activate
python -m pip install openfisca-france
python openfisca-validation/run_openfisca_571.py --cases validation/fiscal-individuel-570.json --out comparaison-openfisca-reelle-571.json
node scripts/comparer-openfisca-570.mjs comparaison-openfisca-reelle-571.json rapport-ecarts-openfisca-571.json
node scripts/auditer-ecarts-571.mjs rapport-ecarts-openfisca-571.json synthese-openfisca-571.json
```

**Convention délicate** : `rni` (revenu net imposable) et `nbptr` (nombre de parts) sont injectés directement dans les calculs OpenFisca pour reproduire le domaine de la 5.7. Cela ne constitue pas une déclaration fiscale complète. La comparaison utilise `ir_plaf_qf` pour l'impôt après plafonnement et `max(0, ir_plaf_qf-decote)` pour la grandeur après décote (les réductions/crédits et modalités de recouvrement n'y figurent pas). Ces conventions doivent être confirmées par l'exécution réelle et sa revue ; le moteur OpenFisca évolue dans le temps.

## Calcul pondéré autonome

```bash
node microdonnees-validation/estimer-571.mjs microdonnees-validation/demo-571.json demonstration.json
```

Structure JSON :

```json
{
  "source":{"name":"Nom de la source","description":"Origine, accès légal, limites"},
  "unit":"foyer_fiscal",
  "incomeYear":2025,
  "reformRates":[0,0.10,0.30,0.41,0.45],
  "households":[
    {"id":"foyer-anonyme-01","netTaxableIncome":30000,"householdType":"single","children":0,"weight":1.0}
  ]
}
```

Si des microdonnées réelles sont utilisées, documenter : sondage, couverture, redressement et représentativité, variables fiscales et unités statistiques, date, licences, autorisation d'accès, protection des données. **Ne pas inclure de fichiers personnels dans le dépôt ou dans le navigateur public.** La présence de champs déclaratifs `samplingDocumentation`, `weightDocumentation`, `legalAccessBasis` et `coverage` déclenche uniquement l'état **source déclarée, non vérifiée indépendamment** ; ce n'est pas une certification d'échantillon représentatif. Les gains/pertes par décile ne peuvent être interprétés comme nationaux sans données appropriées et un audit des pondérations et règles fiscales.

## Tests

- Les suites historiques (projections 466, identités 84 128, 6 scénarios gelés = 1 980 valeurs, contrôles sectoriels et fiscaux) passent sur la version 5.7.1 ;
- nouveaux tests de calcul pondéré, de validation des entrées et des dix groupes de foyers ;
- tests de plomberie d'OpenFisca **avec un faux module explicite** et tests de lecture de rapport : cela ne remplace pas une exécution du vrai moteur ;
- Chromium sur la nouvelle page à 1365×850 et 375×812 (chargement HTML/CSS en mémoire) ;
- manifeste SHA-256 des fichiers publiés ; archive ZIP testée.

## Sources

- [OpenFisca-France — code et documentation](https://github.com/openfisca/openfisca-france)
- [OpenFisca — SimulationBuilder](https://openfisca.org/doc/openfisca-python-api/simulations.html)
- [OpenFisca-France-Data (ERFS, FELIN)](https://github.com/openfisca/openfisca-france-data)
- [API publique OpenFisca](https://www.data.gouv.fr/dataservices/openfisca)

## Limites fondamentales

La 5.7.1 fournit **un protocole exécutable de comparaison** et une **capacité de simulation pondérée**, mais pas encore des résultats vérifiés directement par OpenFisca ni une estimation nationale représentative. Le moteur macro, la distribution des foyers-types et les politiques des groupes ne changent pas.
