# EcoSim France 5.4.0 — Validation historique initiale et scénarios de référence figés

**Date de livraison : 11 octobre 2026**  
**Base de développement : EcoSim 5.3.1, paquet `40219bdd801f`**  
**Périmètre : progression documentaire et testable, pas de modification des équations économiques centrales.**

## 1. Réalisation concrète

La 5.4 ajoute une première confrontation **partiellement comparable** à une réforme historique, celle de la TVA restauration de 2009, et un jeu de non-régression du véritable moteur macro EcoSim.

Nouveaux fichiers publiés :

- `validation-historique-540.html` : page de méthode statique accessible sans JavaScript, avec protocole, tableau et limites.
- `historical-vat-540.js` : changement exact de taux TVA et calcul mécanique d'un prix TTC, avec hypothèse de répercussion séparée.
- `data/tva-restauration-2009-protocole-540.json` : réforme et conventions explicites **sans valeurs observées**.
- `data/tva-restauration-2009-observations-540.json` : références externes séparées du calcul.
- `validation/tva-540-predictions-separees.json` : sortie du calcul AVANT l'étape de confrontation.
- `validation/tva-540-comparaison.json` et `.csv` : résultats, écarts descriptifs et sources.
- `validation/golden-531-for-540.json` : copie publique du fichier des trajectoires économiques 5.3.1 figées.

Code, documentation et tests dans `scripts/`, plus `fixtures/golden-531-for-540.json` et `fixtures/source-hashes-531.json`.

## 2. Historique exact de la mesure, mais pas du comportement des entreprises

Au **1er juillet 2009**, le taux TVA est passé **de 19,6 % à 5,5 %** pour la restauration sur place concernée. Boissons alcoolisées exclues et ventes à emporter antérieurement au taux réduit non affectées. Source : [Insee, Quantin et al. (2015)](https://www.insee.fr/fr/statistiques/1381051).

Pour une vente éligible à **prix HT identique**, la baisse mécanique du TTC serait :

`100 × [(1 + 0,055) / (1 + 0,196) − 1] = −11,7893 %`.

**Ce calcul n'est pas une prévision du prix effectivement facturé.** Les hypothèses de répercussion 0, 25, 50 et 100 % sont des conventions définies explicitement et non estimées à partir des résultats externes.

| Transmission conventionnelle | Baisse de prix TTC calculée | Estimation IPP à 30 mois | Écart signé, points |
|---|---:|---:|---:|
| 0 % | 0,000 % | −1,900 % | +1,900 |
| 25 % | −2,947 % | −1,900 % | −1,047 |
| 50 % | −5,895 % | −1,900 % | −3,995 |
| 100 % | −11,789 % | −1,900 % | −9,889 |

**Références indépendantes :**

- [IPP, Benzarti et Carloni (2018)](https://www.ipp.eu/note-ipp-n32-qui-a-beneficie-de-la-baisse-de-la-tva-dans-la-restauration-en-2009/) : baisse de prix estimée à **−1,9 % après trente mois** dans les restaurants avec service à table.
- [Insee, Sillard et Lafféter (2014)](https://www.insee.fr/fr/statistiques/1381057) : baisse de **−2,4 % à long terme**, catégorie plus large restauration/cafés. Champ et horizon différents, **pas utilisée pour les écarts principaux**.

### Protocole et discipline des données

1. Le script `projeter-tva-540.mjs` lit **uniquement** le protocole JSON et le calculateur pur. Il ne lit **jamais** le fichier d'observations.
2. Les quatre prédictions, leur horizon et le SHA-256 du protocole sont enregistrés.
3. `confronter-tva-540.mjs` lit ensuite le fichier d'observations et calcule des **écarts descriptifs**.
4. Le rapport publie toutes les hypothèses, sans choisir après coup celle qui ressemble le plus à l'IPP.

**Limite importante :** les auteurs de cette version travaillaient en 2026, connaissant une étude publiée en 2018. Il s'agit d'une **séparation informatique des fichiers**, pas d'une véritable expérience pré-enregistrée historiquement, ni d'un test hors-échantillon crédible de l'élasticité prix. Aucun multiplicateur macro, rendement de TVA, marge ou emploi n'est validé par cet exercice.

## 3. Fichier « golden » de non-régression de la 5.3.1

- 6 scénarios : sans réforme ; TVA +10 Md€ ; éducation +10 Md€ ; pensions −10 Md€ ; panier fiscal ; investissement sous profil industriel.
- 30 années par scénario (2026 à 2055) ; **180 lignes et 11 grandeurs** par ligne, soit **1 980 comparaisons numériques**.
- Source originale : véritable moteur de l'archive `EcoSim_5.3.1_code_et_tests.zip` avant toute intervention de la 5.4.
- Empreintes SHA-256 de neuf fichiers d'origine, archivées séparément ; l'assertion compare ces modules à ceux de la 5.4. Seul le champ `data.js.metadata.version` passe à `5.4.0`.
- Test négatif : modification artificielle d'une valeur gelée doit être détectée.

**Attention :** le `golden file` contrôle la stabilité du code, **pas la justesse économique**. Il faut le conserver et ne jamais l'actualiser silencieusement pour faire passer un test.

## 4. Reproduire

Depuis l'archive complète, avec Node.js récent :

```sh
node scripts/projeter-tva-540.mjs
node scripts/confronter-tva-540.mjs
node scripts/test-tva-540.mjs
node scripts/test-golden-540.mjs
node scripts/test-source-inchangee-540.mjs
bash scripts/run-tests-540.sh
```

Ne relancer `creer-golden-540.mjs --initial-freeze-531` **que** depuis les sources ORIGINALES de la 5.3.1, jamais comme moyen de mettre à jour une fixture qui échoue. Le script refuse d'ailleurs une version qui n'est pas `5.3.1`.

Le moteur central, les 12 moteurs de politique publique, les profils politiques, les 16 secteurs et les imports/exports restent ceux de la 5.3.1. Le chantier TVA est un **exercice historique autonome**, non un nouvel instrument d'impôt sectoriel injecté au moteur de dette.

## 5. Domaine réellement couvert et limites scientifiques

| Dimension | Statut 5.4 |
|---|---|
| Exactitude de la formule TTC pour une vente taxable | Vérifiée mathématiquement |
| Dates et taux historiques, exclusions majeures | Documentés avec sources |
| Comparaison de l'ordre de grandeur prix IPP à 30 mois | Partielle ; écarts descriptifs |
| Même panier complet, même contrôle contrefactuel IPP | **Non** |
| Réaction aux prix estimée indépendamment des résultats | **Non** |
| Recettes budgétaires, emploi, salaires et marges historiques | **Non** |
| Validation causale des multiplicateurs macro EcoSim | **Non** |
| Prévision authentique hors-échantillon ou ante 2009 | **Non** |
| Non-régression 5.3.1 → 5.4 du moteur central | 6 scénarios et 9 modules contrôlés |

Les **quatre confrontations macro de la 4.23 conservent 0 correspondance stricte**. La nouvelle étude ne doit pas devenir un « premier succès validé » fictif : seul un changement de taux exact est reproduit, pas un comportement. La suite scientifique demande une assiette historique mesurée, une identification des prix et un dispositif/test indépendant sans fuite d'informations.

## 6. Publication

Le ZIP **Site GitHub Pages** déploie tous les fichiers à la racine. La page documentaire est accessible à `validation-historique-540.html` et depuis l'accueil. Les anciennes pages d'audit sont conservées. Version attendue : `5.4.0`, avec empreinte de paquet dans `build-info.js`.

**Contact :** le seul canal reste les GitHub Issues. Aucune adresse email ou formalité institutionnelle ajoutée.

## 7. Vérification navigateur et réserves

Les 22 suites JavaScript sont automatisées ; le navigateur Chromium est testé aux tailles bureau/mobile. La page historique a également été vérifiée sans JavaScript sur 1365 et 375 pixels. Ce contrôle de fumée ne constitue ni Lighthouse public, ni audit RGAA complet. Les scripts n'ont pas téléchargé les données de recherche : les chiffres des articles sont transcrits de leurs publications indiquées, avec sources et limitations détaillées.
