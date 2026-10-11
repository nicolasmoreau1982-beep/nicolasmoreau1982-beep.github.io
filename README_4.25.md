# EcoSim France 4.25.0 — Statistiques sectorielles et encadrement des hypothèses

## Livrables

- `EcoSim_4.25_site_GitHubPages.zip` : contenu de `dist/` **à la racine** du dépôt GitHub Pages.
- `EcoSim_4.25_code_et_tests.zip` : code public sous `dist/`, tests et script de génération des données statiques.
- Le nouveau mode est dans **Secteurs → Modélisation → « + Effet exploratoire encadré ... »**.
- Page autonome : `donnees-sectorielles-425.html` ; observations transparentes : `data/sectoral-observations-2023.json`.

## Données réelles utilisées

France, Insee Ésane **2023** (publication du **18 septembre 2025**). Valeur ajoutée, investissement corporel brut et emploi en équivalent temps plein. Sources :

1. https://www.insee.fr/fr/statistiques/2015432 (industrie),
2. https://www.insee.fr/fr/statistiques/2015813 (manufacturier),
3. https://www.insee.fr/fr/statistiques/2498421 (secteurs marchands).

Les 16 filières EcoSim ne sont pas des secteurs Ésane exclusifs. Les 16 lignes correspondent à seulement 12 proxys réutilisés, dont certains couvrent davantage d'activités. **On ne doit jamais additionner ces 16 valeurs.** Pour l'agriculture, aucun proxy Ésane non agricole n'est approprié. Pour le raffinage, l'investissement est couvert par le secret statistique. Les chiffres 2023 ne représentent pas des assiettes fiscales 2026 ni la totalité de l'économie française.

## Comportement 4.25

Trois modes coexistent dans l'import JSON `scenario.sectoral[].response` :

- `accounting` : seul le flux public direct est comptabilisé (inchangé) ;
- `exploratory` : coefficient économique conventionnel historique de 4.24 (**inchangé** pour les imports existants) ;
- `contextual` : facteur d'intensité d'investissement observée, puis plafond conventionnel partagé par **proxy statistique**, pour limiter les amplitudes du PIB exploratoire.

Mode `contextual` : `intensité = investissements_corporels_2023 / valeur_ajoutée_2023`, puis facteur de réaction illustratif `clamp(sqrt(intensité / 0,200894...), 0,75, 1,25)` ; choc de PIB conventionnel soumis à une limite d'amplitude égale à **15 % de l'investissement 2023 du proxy**, répartie au prorata des effets absolus si plusieurs mesures occupent ce même proxy. Cela empêche de compter la « capacité » du même grand secteur deux fois dans ce mode, sans prétendre détecter tous les doubles comptes. Ce plafond porte sur un **proxy de choc économique** : ce n'est pas une équation d'investissement privé estimée. Sans observation d'investissement pertinente, `contextual` = `accounting` pour la réponse macro (le flux fiscal subsiste).

**Ces paramètres (0,75, 1,25, 15 %) ne sont ni calibrés économétriquement ni validés comme causalité fiscale.** La 4.25 ajoute des **ordres de grandeur observés et des garde-fous**, pas une prédiction sectorielle de croissance, emploi, GW, pétrole ou CO₂. Les coefficients centraux et les projections sans mesure sectorielle restent inchangés.

Pour estimer une véritable élasticité au crédit d'impôt ou au prélèvement sectoriel, il faut des données longitudinales entreprise par entreprise, la description du dispositif, les groupes exposés et témoins, la chronologie de la politique et une stratégie d'identification causale. Ces données ne sont pas fournies par Ésane agrégé 2023.

## Regénération et tests

```bash
python3 scripts/build-observations-425.py
node scripts/stamp-build.mjs
node scripts/test-observations-425.mjs
node scripts/test-sectoral-424.mjs
node scripts/test-regressions.mjs
node scripts/test-mathematical.mjs
node scripts/test-economie-inchangee-421.mjs
```

Les tests vérifieront les proxys, le partage du plafond entre renouvelables et nucléaire, les valeurs extrêmes, la durée des mesures, l'import/export, les identités comptables et l'absence de changements sur la trajectoire de référence. Les tests Chromium et lecteur d'écran ne sont pas réalisés dans cet environnement ; vérifier le comportement visuel après la mise en ligne.

## Contrôle du déploiement

Vérifier `Version 4.25`, le nouvel onglet du menu Secteurs, le chargement de `sectoral-observations.js` avant `sectoral.js` et la disponibilité de `/donnees-sectorielles-425.html`. Vérifier que les exemples 4.24 restent importables et que les autres modules demeurent identiques.
