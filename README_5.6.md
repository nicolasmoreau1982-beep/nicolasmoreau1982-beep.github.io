# EcoSim France 5.6.0 — Incertitude conjointe et sensibilité globale

**Date :** 11 octobre 2026. **Socle :** 5.5.0. **Objet :** nouvelle expérience expérimentale, sans modification des hypothèses du cœur économique standard ni des trajectoires de référence.

## Fonctionnalités livrées

- **Analyse Monte Carlo conjointe** sur les cinq paramètres de transmission du moteur : dépenses, prélèvements, échelle des effets d'offre, persistance des effets de demande et réaction de la prime de risque à la dette.
- **Méthode pick-and-freeze, estimateurs de Jansen** des indices de premier ordre et d'effet total, à l'horizon 1, 5 et 10 ans. Les résultats bruts ne sont pas maquillés par écrêtage à l'intervalle [0,1] : à faible échantillon, les indices peuvent sortir de cet intervalle.
- **Graine aléatoire fixe**, distributions **uniformes indépendantes conventionnelles**, N=64 paires de matrices A/B, 448 exécutions du vrai cœur EcoSim par scénario et 1 344 exécutions au total sur trois expériences. N est configurable (puissance de deux entre 16 et 512) : augmenter N nécessite un temps de calcul significatif.
- **Trois scénarios fictifs** : éducation +10 Md€/an ; TVA +10 Md€/an ; éducation +8, énergie +6, IR +10 Md€/an. Ces cas ne sont associés à aucun parti.
- **Écarts à la référence** du PIB (%), ratio dette/PIB (points), déficit (Md€), chômage (points) ; quantiles Q05, médiane, Q95 et résultat central séparé. Les quantiles représentent *cet échantillonnage conditionnel*, **pas une probabilité que les résultats économiques futurs se situent dans la plage**.
- Nouvelle page non-JS `dist/sensibilite-globale-560.html`, reliée au bloc transparence de l'accueil ; trois exports dans `dist/validation/` (`sensibilite-globale-560.json`, `.csv`, `sensibilite-sobol-560.csv`).
- Nouveau code exécutable `scripts/sensibilite-globale-560.mjs`, tests `scripts/test-sensibilite-560.mjs` et `scripts/run-tests-560.sh`.

## Exemple de résultats en 2030 (horizon 5 ans)

| Mesure fictive | Écart PIB central (%) | Q05–Q95 des écarts de PIB (%) | Écart dette/PIB central (pt) | Q05–Q95 (pt) |
|---|---:|---:|---:|---:|
| Éducation +10 Md€ | +0,345 | +0,263 à +0,438 | +0,365 | +0,022 à +0,693 |
| TVA +10 Md€ | −0,258 | −0,329 à −0,187 | −0,766 | −0,999 à −0,534 |
| Mix dépenses/IR | +0,364 | +0,237 à +0,509 | −0,584 | −1,101 à −0,108 |

Les résultats sont **des écarts à une trajectoire EcoSim sans réforme**, non des variations du PIB par rapport à l'année antérieure. Les valeurs sont arrondies pour cette documentation, les exports préservent la précision numérique.

## Interprétation scientifique

Les amplitudes testées sont **conventionnelles** : dépenses et impôts ×0,70 à ×1,30 ; offre ×0,80 à ×1,20 ; persistance ×0,84 à ×1,16 ; dette ×0,70 à ×1,30. Ces intervalles ne sont pas des estimations statistiques ni des bornes issues directement d'études françaises. Une recherche Insee sur les multiplicateurs ([Cléaud, Lemoine et Pionnier, 2013](https://www.insee.fr/fr/statistiques/1381077)) justifie l'intérêt d'étudier les incertitudes, **mais n'est pas utilisée pour prétendre calibrer ces distributions**.

La méthode de Jansen correspond à l'approche de sensibilité globale avec entrées indépendantes (voir [présentation méthodologique, Statistics and Computing 2024](https://link.springer.com/article/10.1007/s11222-024-10398-5)). Elle révèle comment la variance *du modèle* se répartit selon *les entrées choisies* ; elle ne révèle pas les causalités économiques réelles.

**Précautions :** N=64 paires est une petite taille d'échantillon ; indices Sobol de premier ordre et d'effet total potentiellement bruités et contradictoires. Aucun score de confiance, aucun classement politique, aucun posterior bayésien, aucune calibration causale. Les paramètres économiques peuvent être corrélés en réalité mais sont ici tirés indépendamment ; le risque d'ignorance structurelle n'est pas représenté. La méthode ne fait pas varier les paramètres démographiques, le moteur de cohorte des retraites ni les assiettes fiscales. Les simulations sont pré-calculées sur trois scénarios ; l'analyse n'est **pas un calcul interactif du scénario courant de l'utilisateur**.

## Vérifications et reproduction

```bash
node scripts/sensibilite-globale-560.mjs
node scripts/test-sensibilite-560.mjs
bash scripts/run-tests-560.sh
# Expérience plus lourde, facultative, hors build livré :
ECOSIM_SENSITIVITY_N=128 node scripts/sensibilite-globale-560.mjs
```

L'expérience utilise `scripts/core-harness-540.mjs` : c'est le vrai `calculateProjection()` de `dist/app.js`, chargé avec les vrais modules. Elle restaure les coefficients après chaque tirage. Les neuf modules historiques protégés restent identiques à la 5.3.1, sauf l'étiquette de version dans `data.js`. La suite `test-golden-540.mjs` compare les six scénarios figés depuis la 5.3.1 : 6 × 30 × 11 = **1 980 valeurs inchangées**.

Les versions précédentes des études TVA 2009 et retraites par cohorte 2010–2011 restent archivées et indépendantes. La 5.6 **ne corrige pas** la sous-estimation du chômage observée avec le moteur de cohortes 5.5.

**Cadre éditorial :** EcoSim France est un projet personnel pédagogique. Signalement : [GitHub Issues](https://github.com/nicolasmoreau1982-beep/nicolasmoreau1982-beep.github.io/issues/new/choose), sans adresse e-mail supplémentaire.
