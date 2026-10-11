# EcoSim France 5.2.1 — Finitions et accessibilité

## Fichiers livrables

- `EcoSim_5.2.1_site_GitHubPages.zip` : fichiers de `dist/` à placer à la racine du site publié, sans dossier `dist`.
- `EcoSim_5.2.1_code_et_tests.zip` : `dist/`, les scripts et les tests, une notice de publication, et un modèle optionnel de GitHub Issue (`.github/ISSUE_TEMPLATE/correction.yml`).

## Changements

1. Une vraie `404.html` en français, avec `noindex`, liens d'aide et retour au simulateur. À la racine de l'artefact GitHub Pages.
2. Une page `contact-signalement.html` avec un lien vers les **Issues** du dépôt GitHub et des consignes de signalement. La possibilité de consulter la liste de tickets a été vérifiée en ligne. La création d'un ticket exige une connexion GitHub et n'a pas été testée avec un compte connecté.
3. Une page `informations-legales.html` qui explique ce qui est connu et **ce qui manque** : identité complète, statut et coordonnées de l'éditeur, coordonnées de l'hébergeur. Ce document **n'est pas une notice juridiquement complète**. Aucune identité ni adresse privée n'a été inventée.
4. Liens de signalement et d'information légale dans les pieds de page de toutes les pages publiques. La page `a-propos.html` explique l'assistance IA et oriente vers les précisions manquantes.
5. Harmonisation des éléments `<title>` avec le suffixe `| EcoSim France`. Ajout des deux nouvelles pages au sitemap, **pas** de la 404.
6. Moteur inchangé sauf la métadonnée de version `5.2.1`. Validations, importations et calculs hérités de 5.1 / 5.2 conservés.
7. Tests de noms accessibles sur la page dynamique dans Chromium, y compris les contrôles générés par le JavaScript, et contrôle du menu mobile à 375 px.
8. Contrôle SHA-256 du site, réémis après les tests qui régénèrent les jeux de résultats.

## Vérifications réalisées

- `bash scripts/run-tests-521.sh` : suites de non-régression, syntaxe JS, scanner de fichiers distribués, manifeste SHA-256.
- `python scripts/test-browser-520.py` : ouverture du simulateur en mémoire, menu mobile, fenêtre de glossaire au clavier, absence d'erreurs JavaScript à l'initialisation.
- `python scripts/audit-accessibilite-521.py` : heuristique de noms pour 311 contrôles après rendu, 164 initialement visibles ; aucun sans nom d'après les attributs ARIA, labels natifs, titres ou texte du bouton.
- Contrôle local des liens des nouvelles pages, de la marque et de la présence des nouvelles URL dans le sitemap.

**Limites** : il ne s'agit pas d'une évaluation RGAA/WCAG certifiée. Pas d'essai complet avec NVDA, VoiceOver, TalkBack, axe-core ni de score Lighthouse réel sur le site en production. L'environnement ne permet pas de récupérer axe-core depuis un CDN. Le scan de secrets porte sur les fichiers distribués, **pas l'historique Git**. Le canal de contact n'a pas d'alternative sans compte GitHub tant qu'une adresse publique n'est pas fournie.

## À faire par le propriétaire avant de qualifier la diffusion de complète

- Vérifier le régime juridique exact et compléter les coordonnées d'éditeur et d'hébergeur requises dans `informations-legales.html`. Ne pas publier son adresse personnelle sans vérifier les règles applicables à son statut.
- Si vous voulez activer le formulaire guidé des tickets, copier `.github/ISSUE_TEMPLATE/correction.yml` de l'archive **code et tests** dans le dépôt GitHub et valider son fonctionnement.
- Tester la création effective d'un ticket, dans une session GitHub connectée.
- Passer axe-core, Lighthouse/PageSpeed Insights, navigation clavier complète et lecteurs d'écran sur le **site publié**.
- Revoir GoatCounter et les informations de confidentialité du point de vue juridique avant de revendiquer la conformité.
- Scanner **l'historique Git** (par exemple avec Gitleaks) ; il n'est pas inclus dans cette archive.
- Faire tester les parcours principaux par quelques personnes qui ne connaissent pas le projet.

## Tests et modèle

Aucun coefficient économique n'a été modifié. La cohérence informatique n'équivaut pas à une validation causale des effets simulés.
