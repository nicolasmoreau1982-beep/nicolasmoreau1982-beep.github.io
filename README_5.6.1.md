# EcoSim France 5.6.1 — Correctif de fiabilité statistique

**Date :** 11 octobre 2026  
**Base :** EcoSim France 5.6.0  
**Version :** 5.6.1  
**Empreinte de paquet (locale, pas commit Git) :** `d7dbc8e854cd`

## Objet

La 5.6 présentait, sur les 180 indices estimés du rapport archivé, **180 dépassements de l'indice de premier ordre par rapport à l'effet total** (`S₁ > ST`) et des premiers ordres positifs pour des facteurs sans effet mécanique. Cette anomalie a été identifiée par un audit externe puis confirmée sur les fichiers publiés. Elle affecte la **lecture des indices de Sobol**, non les équations du moteur macroéconomique.

La version 5.6.1 corrige **l'outil statistique** et publie explicitement le résidu d'incertitude.

## Modifications

1. **Tirages :** remplacement du LCG par `xoshiro128**`, initialisé par quatre états `splitmix32`, avec deux flux pseudo-aléatoires séparés pour les matrices A et B. Algorithme et graine dans le rapport ; cela n'implique pas une indépendance mathématique parfaite.
2. **Estimateurs :** effet de premier ordre par **covariance centrée de type Saltelli** : `mean((Y_B-mu)*(Y_Ci-Y_A))/V`, effet total par **Jansen** : `mean((Y_A-Y_Ci)^2)/(2V)`. Matrice hybride C = A avec colonne i de B. Estimations brutes, sans écrêtage ni correction arbitraire des biais.
3. **Contrôle synthétique :** fonction à un facteur, fonctions additives, interaction de deux facteurs, et paramètre entièrement inactif. Contrôle à 64, 256 et 2 048 paires sans passer par le moteur macro.
4. **Bootstrap descriptif :** 96 rééchantillonnages de paires par indice dans la campagne publiée. Les bornes ne sont **pas** des intervalles de prévision ni une validation économique.
5. **Diagnostic public :** nombre de violations `S₁ > ST`, nombre de facteurs mécaniquement inactifs, amplitude des indices de premier ordre de ces facteurs, durée mesurée et coût en projections.
6. **Traçabilité :** l'ancien rapport `sensibilite-globale-560.*` et `sensibilite-sobol-560.csv` est conservé, la page 5.6 contient un avertissement. La nouvelle page `sensibilite-globale-561.html` pointe vers les trois exports `*-561`.
7. **Manifeste :** `manifest-integrite-561.sha256` et empreinte de paquet injectée dans le JSON. Pour éviter une référence circulaire, le champ d'empreinte est normalisé uniquement lors du calcul de cette empreinte ; le manifeste SHA-256 vérifie ensuite les octets réels des fichiers.

## Campagne 5.6.1 publiée

| Mesure | Valeur |
|---|---:|
| Scénarios fictifs | 3 (éducation, TVA, mixte) |
| Paires A/B par scénario | **128** |
| Paramètres simultanés | 5 |
| Projections sur 30 ans | **2 688** |
| Indices estimés | **180** |
| Dépassements `S₁ > ST` | **32** (contre 180 en 5.6) |
| Facteurs structurellement inactifs | **84** |
| Plus grand premier ordre pour un facteur inactif | **0** |
| Rééchantillonnages bootstrap par indice | **96** |
| Temps de la campagne dans cet environnement | **34,103 secondes** |

Les **32 dépassements restants ne sont pas masqués**. La précision des indices n'est pas suffisante pour publier un classement des paramètres au centième près. Les tirages uniformes sont des **hypothèses conventionnelles**, non des distributions calibrées par des études françaises. Des campagnes avec davantage de paires et plusieurs graines sont nécessaires avant toute hiérarchisation quantitative forte.

Le script `scripts/generer-sensibilite-561.mjs` lance chaque scénario dans **un processus séparé**, afin de maîtriser l'utilisation mémoire du harnais et de conserver les **mêmes matrices A/B** entre scénarios. Les campagnes à 256 paires peuvent être plus coûteuses et doivent être exécutées dans un environnement disposant de ressources suffisantes.

## Reproduire

Depuis le ZIP code et tests :

```bash
bash scripts/run-tests-561.sh
# Réexécute l'analyse et remplace les 3 nouveaux rapports, sans toucher aux archives :
ECOSIM_SENSITIVITY_N=128 ECOSIM_SENSITIVITY_BOOTSTRAP=96 node scripts/generer-sensibilite-561.mjs
python scripts/preparer-page-sensibilite-561.py
node scripts/stamp-build.mjs
node scripts/make-manifest-520.mjs
(cd dist && sha256sum -c manifest-integrite-561.sha256)
```

Les quantiles et les indices sont reproductibles à graine et N identiques ; **la durée mesurée** ne l'est pas. Régénérer les exports modifie nécessairement les octets temporels et peut donc changer l'empreinte du paquet : versionner le rapport et le manifeste en conséquence.

## Non-régression et limites

- Les **466 projections mathématiques** historiques et **84 128 contrôles numériques** restent validés par les scripts hérités.
- Les **six scénarios gelés**, soit **1 980 valeurs**, restent conformes à la référence 5.3.1.
- Les neuf modules économiques surveillés restent identiques à l'archive originale 5.3.1, hors numéro de version dans `data.js`.
- Le module retraites 5.5, la fiscalité sectorielle et le comparateur politique ne sont pas modifiés.
- Tests de fonctions synthétiques et de coins extrêmes ; Chromium à 1365 et 375 px ; contrôle des noms accessibles heuristique sur l'accueil. Ce n'est **pas** un audit RGAA/Lighthouse complet.
- Pas de recalibrage économique, pas de causalité démontrée par les indices, pas de distribution bayésienne estimée ni de probabilités de prévision.

## Publication

Déployer le contenu de l'archive « site GitHub Pages » à la racine du dépôt. Le rapport corrigé est visible à `sensibilite-globale-561.html`. L'URL de la 5.6 reste accessible en tant qu'archive explicitement dépréciée.

## Suite

Le chantier **5.7 — fiscalité / OpenFisca** peut commencer sans ambiguïté sur le statut de ce diagnostic ; une comparaison par décile national restera conditionnée à l'accès à un jeu de données représentatif adapté.
