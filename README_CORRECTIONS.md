# EcoSim France 4.18.0 — fiabilisation mathématique

Base de travail : **archive de la version 4.17** fournie dans cette conversation. L'archive n'altère pas ton dépôt GitHub : il faut déployer le contenu du dossier `dist/`.

## Correction du calcul de dette

La prime de risque dépendait de la différence entre le ratio dette/PIB du scénario et celui de référence. Dans un scénario très dégradé, une rétroaction explosive « dette → prime → intérêts → dette » produisait une prime illimitée, puis des valeurs `Infinity` à partir de la 29e année d'une combinaison extrême de réglages.

- Dans `dist/app.js`, une **borne numérique explicite de 5 points de taux supplémentaires** a été ajoutée pour la prime de risque, avec une borne inférieure conservée à −0,20 point.
- La borne supérieure est un **garde-fou de calcul**, et **non un coefficient estimé**, une recommandation économique ou une garantie de plausibilité.
- Lorsqu'elle est atteinte, l'interface avertit l'utilisateur que la trajectoire sort du domaine de validité du modèle.
- Un avertissement explicite signale également les cas où le stock simulé de dette devient négatif. En pareil cas, EcoSim **ne modélise pas les actifs financiers**, de sorte qu'il n'est plus pertinent de lire le montant comme une dette publique brute.
- Aucun multiplicateur fiscal ou macroéconomique n'a été recalibré silencieusement.

## Nouvelle suite de tests

`scripts/test-mathematical.mjs` évalue les **mêmes fonctions de calcul que celles du site**, sans dépendance externe ni réécriture du moteur. Les tests couvrent :

- Référence sans réforme, répété deux fois pour vérifier la stabilité des résultats.
- Solde direct : `variation des dépenses − variation des recettes`.
- Équation de déficit : référence + coût direct − rétroaction des recettes + dépense cyclique + intérêts supplémentaires.
- Stock de dette annuel, ratios dette/PIB et déficit/PIB.
- Finitude des valeurs centrales, indicateurs sociaux indirectement calculés, plages et indicateurs de base sur chacun des 30 ans.
- Chocs de recettes purement comptables, rejet des chocs `Infinity`, calendrier T1/T4.
- Variations individuelles minimale et maximale des postes budgétaires, des contrôles structurels, des moteurs publics et de l'atelier fiscal.
- Toutes les catégories et tous les contrôles simultanément à leur minimum ou à leur maximum.
- **9 profils économiques × 5 cadres européens**, avec des chocs conjoints.
- **64 combinaisons pseudo-aléatoires déterministes** de mesures, réglages structurels, moteurs et règles fiscales.
- Fiscalité sans réforme, avant entrée en vigueur et effet directionnel d'une hausse d'un taux d'impôt, ainsi que quelques cas élémentaires de monotonie.

### Résultat local

- `node scripts/test-regressions.mjs` : **OK** (tests 4.17 conservés).
- `node scripts/test-mathematical.mjs` : **OK : 466 projections × 30 ans ; 84 128 contrôles d'identités/relations numériques**.
- `node --check` sur les scripts JS/MJS : **OK**.

### Limites des contrôles

Les tests ne valident **ni les multiplicateurs, ni la causalité, ni les prévisions, ni la représentativité des foyers-types**. Ils prouvent seulement, sur les cas testés, la cohérence interne des calculs et l'absence de valeurs non finies. La dette négative et les ratios extrêmes sont signalés comme des domaines hors validité, non transformés artificiellement en trajectoires plausibles.

## Version et publication

- Interface : **4.18**, moteur : **4.18.0**.
- `dist/build-info.js` contient un identifiant reproductible de paquet calculé depuis les fichiers applicatifs JS/CSS ; ce n'est **pas** un SHA de commit Git.
- Pour reconstruire l'empreinte après toute modification des fichiers moteurs : `node scripts/stamp-build.mjs`.
- Les notes méthodologiques de `dist/audit.html` indiquent la limite numérique et la nature des nouveaux contrôles.
- Aucune recherche de performance mobile, ni nouvelle validation économique indépendante, ni vérification juridique de GoatCounter n'est comprise dans cette livraison.

### Installation GitHub Pages

Décompresser **`EcoSim_4.18_site_GitHubPages.zip`** et copier ses fichiers à la racine du répertoire GitHub Pages (au niveau de `index.html`). La version complète contient `dist/`, `scripts/` et ce document pour les tests locaux. Le fichier Google de vérification et le sitemap sont conservés.
