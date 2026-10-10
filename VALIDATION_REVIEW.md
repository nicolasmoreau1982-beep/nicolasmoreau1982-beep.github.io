# Dossier pour évaluation externe — EcoSim

Statut au 10 octobre 2026 : **rejeu partiel exécuté ; aucune revue indépendante réalisée**. Ce dossier est destiné à une personne ou équipe sans participation au développement d'EcoSim. Les tests automatiques et le présent rapport rédigé par l'équipe de développement ne sont pas une expertise externe.

## Question évaluée et frontière

Peut-on comparer une prévision budgétaire faite avec les informations disponibles à une date donnée aux observations ultérieures de l'[Insee](https://www.insee.fr/fr/statistiques/8988845), sur la même définition de PIB, dépenses, recettes et dette ? **Oui, comme diagnostic de prévision du prototype historique.** Peut-on en déduire l'effet causal d'une réforme ou la précision du moteur principal 2026–2055 ? **Non.** Les réformes, les chocs et les états initiaux détaillés nécessaires ne sont pas tous présents ; le prototype [`scripts/historical-engine.mjs`](scripts/historical-engine.mjs) n'est pas le moteur web [`dist/app.js`](dist/app.js).

Les comptes annuels 2003–2025 sont gelés dans [`research/insee-validation-annual.json`](research/insee-validation-annual.json) : PIB nominal et croissance réelle des tableaux Insee 1.101/1.102, dépenses et recettes des APU du 3.201, dette Maastricht du 3.101 et ajustement stock-flux du 3.105. Les quatre empreintes SHA-256 et les lignes Excel sont enregistrées. [`scripts/verify-insee-validation.py`](scripts/verify-insee-validation.py) retélécharge les classeurs et vérifie les valeurs. **Réserve importante :** il s'agit du millésime révisé 2026, pas des publications disponibles lors de chaque origine. Le chômage utilisé en contexte par le prototype reste issu d'Eurostat ; ses écarts ne figurent pas dans le score commun Insee.

Le [tableau Insee 3.105](https://www.insee.fr/fr/statistiques/8988843) permet de ne plus attribuer mécaniquement toute variation de dette au seul déficit. Entre 3.101, 3.201 et 3.105, une discordance de −0,638 Md€ subsiste en 2014 après arrondis : elle est conservée et contrôlée, non forcée à zéro.

## Protocole préétabli

- Origines 2013, 2018 et 2020 ; observations suivantes jusqu'en 2016, 2020 et 2022. Comptes initiaux et cibles pris dans le même gel Insee.
- Uniquement les montants de mesures documentés comme connus à l'origine sont injectés (`informationSet: "origin"`). Les observations futures ne servent qu'au calcul d'erreur. Les projections sont identiques si l'on modifie artificiellement les cibles futures : test anti-fuite. **Mais la courbe TVA vient de Mésange 2017, après l'origine 2013** : ce contrôle ne constitue donc pas une prévision strictement réalisable en 2013.
- Deux calculs sur les **mêmes** origines et années : mesures encodées, puis aucune mesure encodée. Le second n'est **pas** la France contrefactuelle sans politique ; il sert d'ablation logicielle.
- Erreurs signées annuelles et erreurs absolues moyennes séparées pour PIB nominal (%), dépenses et recettes (Md€), déficit/PIB et dette/PIB (points). Ne jamais optimiser le seul déficit : dépenses et recettes peuvent comporter des erreurs qui se compensent.
- Catalogue des réformes non représentées et statut de chaque rendement (`ex ante`, projection, observé). Si une réforme simultanée ou un choc majeur manque, le cas est **inéligible à la validation de l'effet politique**.
- L'incertitude du moteur web n'est pas testée par ce banc : ses bandes exploratoires ne sont pas des intervalles de couverture statistique.

Exécution hors réseau :

```bash
node scripts/comparable-insee-benchmark.mjs
node scripts/comparable-insee-benchmark.mjs --json
node tests/comparable-insee-benchmark.mjs
```

Contrôle des classeurs officiels, avec accès réseau : `python3 scripts/verify-insee-validation.py`. La sortie JSON donne aussi les empreintes SHA-256 du code et des paramètres employés ; le dépôt doit être remis à l'évaluateur sous une révision figée avant toute réestimation.

## Premiers résultats reproductibles

| Départ → observation | PIB nominal simulé − Insee | Dépenses | Recettes | Déficit/PIB | Dette/PIB | Couverture |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 2013 → 2014 | −0,14 % | +17,0 Md€ | +1,5 Md€ | +0,73 pt | +2,36 pt | TVA saisie ; CICE exclu car son montant archivé n'est connu que plus tard. |
| 2018 → 2019 | −1,02 % | −6,6 Md€ | −7,1 Md€ | +0,05 pt | +0,68 pt | Bascule comptable CICE/cotisations ; effet PIB/emploi non modélisé. |
| 2020 → 2021 | −5,09 % | −38,4 Md€ | −70,2 Md€ | +1,69 pt | +7,39 pt | Soutiens Covid et rebond incomplets. |

Sur l'origine 2013, l'erreur absolue moyenne de déficit/PIB pour 2014–2016 est de **1,89 pt avec** la TVA encodée contre **2,09 pt sans** ; celle du PIB nominal est de **0,60 % contre 0,43 %**. Une métrique s'améliore, l'autre se détériore. Cela interdit un jugement global ou causal. Le rendement TVA utilisé était de 6,7 Md€ ex ante, contre **6,5 Md€ attribués par [l'Insee](https://www.insee.fr/fr/statistiques/fichier/1288733/ECOFRA15.pdf)** à la hausse en 2014 : l'écart de 0,2 Md€ contrôle l'ordre de grandeur du rendement, pas l'effet sur la croissance.

Les autres années et les séries avec/sans mesures figurent dans la sortie `--json`. Le rendement attribué par l'Insee vient par ailleurs d'une publication en ancienne base et n'est pas une ligne directe du tableau 3.201 révisé. Aucun cas du catalogue actuel ne satisfait le critère strict « mêmes réformes pertinentes entièrement représentées, même jeu d'information d'origine, mêmes cibles ». **Ne pas publier un score de précision causale ni un classement face aux concurrents à partir de ces chiffres.**

## Mandat à confier à l'évaluateur indépendant

1. Vérifier les sources et périmètres des quatre classeurs, des mesures et des années, puis reproduire les chiffres dans un code distinct. Noter les révisions et la discordance 2014 sans les effacer.
2. Auditer les exclusions : CICE, bascule de cotisations, autres mesures 2018–2019, aides Covid et énergie. Décider quels cas sont réellement comparables ; un cas incomplet doit être déclaré non concluant.
3. Évaluer **le moteur principal** seulement lorsqu'un adaptateur historique utilise ses mêmes équations, ses catégories datées et les états de départ historiques. Comparer ce moteur à une persistance naïve et aux variantes publiées de [Mésange](https://www.insee.fr/fr/information/3605738) pour des chocs de définition identique, sans compter sa variante TVA déjà reprise comme test indépendant.
4. Geler paramètres et critères avant une période de test hors ajustement ; publier erreurs par grandeur, horizon et régime, et la fréquence réelle de couverture des bandes annoncées. Utiliser des millésimes disponibles à l'origine pour un véritable exercice de prévision.
5. Fournir un avis signé indiquant affiliation, conflits d'intérêts, version examinée, fichiers recalculés, anomalies, cas rejetés et limites. Le développeur peut répondre séparément ; il ne doit pas modifier l'avis.

| État de la revue externe | Évaluateur | Révision/empreintes | Avis public |
| --- | --- | --- | --- |
| **À réaliser** | Aucun mandaté | Empreintes produites par `--json` | Aucun |
