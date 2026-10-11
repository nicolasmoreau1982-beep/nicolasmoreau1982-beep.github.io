# EcoSim France 5.3.0 — Comparaison économique pluraliste

Base : version 5.2.1, incluant le durcissement 5.1 et les finitions 5.2.1.

## Nouveautés
- **Hypothèses communes** (par défaut, comportement historique) : même profil sélectionné pour toutes les formations.
- **Lecture doctrinale** : correspondances qualitatives sourcées et signalement explicite des cas sans rattachement à un profil ; en leur absence, repli central. Aucune formation n'a fourni les coefficients des profils EcoSim.
- **Neuf profils** : comparaison de toutes les formations sous neuf jeux d'hypothèses (plages non probabilistes) et tableau détaillé des neuf lectures pour le scénario sélectionné.
- Méthode autonome HTML `methodes-comparaison-politique-530.html`, consultable sans JavaScript ; correspondances techniques dans `political-profiles-530.js` ; tests spécifiques `test-politique-profils-530.mjs`.

## Garde-fous
- Aucun scénario politique chiffré, coefficient économique ni registre des 357 réglages modifié.
- Aucun parti automatiquement favorisé par une ré-estimation de coefficients.
- La lecture doctrinale est explicitement **éditoriale**, optionnelle et NON comparable à hypothèses constantes.
- Les profils de crise, économie ouverte et transition contrainte représentent des contextes, jamais des étiquettes partisanes.
- Si l'on applique un scénario avec la lecture doctrinale active, le profil du scénario exportable est cohérent avec le calcul affiché. En mode neuf profils, l'application reprend le profil commun (pour fournir un cas reproductible), et le tableau de sensibilité reste consultable.

## Vérification
Contrôles effectués dans le paquet 5.3 :
- 18 suites automatisées réussies (`scripts/run-tests-510.sh`), dont le nouvel audit des profils politiques ;
- 466 projections de 30 ans et 84 128 identités numériques ; 60 résultats de référence invariants par rapport au benchmark historique ;
- 19 scénarios documentés dans le fichier de correspondances : 8 associations exploratoires et 11 profils centraux de repli ;
- 357 réglages de programmes conservés : 0 correspondance chiffrée exacte, 23 propositions liées à une source, 334 hypothèses EcoSim non vérifiées individuellement ;
- navigation Chromium testée : modes commun/doctrinal/neuf profils, repli, application au simulateur, mobile 375 px ;
- audit heuristique de 314 contrôles (167 visibles au démarrage), aucun sans nom détecté ; ce n'est pas une certification WCAG/RGAA ;
- scan des secrets dans la distribution, non dans l'historique Git ;
- manifeste `dist/manifest-integrite-530.sha256` vérifié. Identifiant de paquet `bfb97652ff8e`.

Limites : il n'existe aucune estimation causale des neuf profils spécifiquement liée à une formation politique, ni de probabilité associée à l'une des neuf lectures. L'interface a été testée sur les résolutions indiquées, sans campagne Lighthouse complète ni lecteur d'écran réel.

### Déploiement
Décompresser `EcoSim_5.3_site_GitHubPages.zip` à la racine du site (les fichiers sont directement à la racine). La version complète contient `dist/` et `scripts/`, tests et rapports inclus. Publication effective sur GitHub non réalisée par ces archives.
