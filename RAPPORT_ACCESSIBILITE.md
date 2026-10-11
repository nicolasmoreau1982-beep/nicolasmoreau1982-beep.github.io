# EcoSim — Audit ciblé d'accessibilité et correctifs locaux

**Base de code :** dernière archive complète 5.8.5 disponible dans cette conversation, incluant localement le correctif de navigation précédent ; page Audit reprise depuis le correctif réparant sa grille. Cette base peut différer du dépôt actuellement publié. **Aucun déploiement GitHub effectué.**

## Résultats effectivement observés

| Vérification | Résultat | Portée |
| --- | --- | --- |
| Chromium / arbre d'accessibilité du simulateur | 152 contrôles/liens accessibles examinés, aucun nom vide | Viewports 320 et 390 px, chargement en mémoire ; un passage bureau complet n'a pas abouti |
| Débordement horizontal global simulateur | Aucun lors des deux essais mobile | 320 et 390 px, pas un test physique |
| HTML statique | 1 H1, 1 `main`, 1 lien d'évitement sur chacune des 4 pages | Accueil, atelier fiscal, distribution, audit |
| Formulaires visibles dans le HTML | Aucune absence d'étiquette détectée sur ces quatre pages | Analyse structurelle, pas validation axe |
| Liens internes `#ancre` | Aucun lien cassé détecté sur les quatre pages | Analyse HTML statique |
| Grand tableau audit | Focus clavier, `role=region`, nom accessible après identification d'un débordement | Test Chromium avec table de contrôle représentative |
| Onglets | Flèches, `Home`, `End` et gestion du focus fonctionnent | Test Chromium sur onglets de contrôle |
| Contraste statut audit ocre sur fond clair | Amélioré de 4,42:1 à 6,66:1 | Ratio calculé sur la paire de couleurs CSS |
| Golden test | 1 980 valeurs conservées | 6 scénarios / 2026–2055 |
| Tests de finition existants | Réussis sur la copie de travail | N'incluent pas une validation Lighthouse |

## Correctifs livrés

- `accessibilite-ui.css` : focus clavier visible, couleurs claires/sombres, mouvement réduit, contraste du statut `assumed`.
- `accessibilite-ui.js` : déplacement aux flèches dans les ensembles d'onglets existants, accès au défilement horizontal des grands tableaux de l'audit **uniquement lorsqu'ils débordent**.
- 4 pages HTML : chargement des deux ressources ; **aucune modification du moteur**.
- Tests JS statiques et test Chromium isolé des interactions.

## Restent à vérifier

**Axe-core et Lighthouse n'ont PAS été exécutés** : leurs dépendances ne sont pas disponibles dans l'environnement hors réseau. Sont donc encore ouverts : audit WCAG/RGAA global, contrastes exhaustifs sur tous les états, lecteur d'écran NVDA/VoiceOver, focus au cours de chaque modal, test sur téléphone physique, zoom 200/400 %, et vérification des tableaux et scénarios réellement calculés sur le déploiement courant.

Les modifications ci-dessus sont une amélioration testée, **pas une certification d'accessibilité**.
