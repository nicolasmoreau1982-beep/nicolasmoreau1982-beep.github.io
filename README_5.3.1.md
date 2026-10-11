# EcoSim France 5.3.1 — Finitions de publication et transparence

Base : EcoSim 5.3.0. Cette version **ne modifie ni les formules économiques ni les programmes chiffrés des groupes politiques**. Les archives reprennent les travaux 5.1 à 5.3.

## Choix éditorial

EcoSim France est **un projet personnel à vocation pédagogique**. Les limites de simulation, les sources et les contrôles restent publiés, sans surcharger l'interface d'avertissements redondants. **GitHub Issues reste le seul canal de signalement public** : ni e-mail ni formulaire tiers n'ont été créés ou configurés. Un compte GitHub est nécessaire pour ouvrir un ticket.

## Changements

1. Accueil : la « nouveauté 5.1 » est présentée comme un contrôle *introduit en 5.1* et non comme la version courante. Le bandeau affiche désormais « Version actuelle : 5.3.1 » et renvoie de façon concise au registre des 357 réglages, aux évaluations empiriques et aux méthodes du comparateur politique.
2. Version : `build-info.js` définit `ECOSIM_VERSION` et l'empreinte de paquet ; `site-meta-531.js` synchronise les badges courants. Les titres et URL des **audits historiques** conservent leurs numéros d'origine.
3. Contact : la page de signalement explique le fonctionnement des tickets GitHub, la nature personnelle du projet et les précautions relatives aux données personnelles. Aucun nouveau canal de contact.
4. À propos : précise le caractère personnel et pédagogique du projet.
5. Informations légales : coordonnées de GitHub, Inc. reprises de la déclaration officielle de GitHub, rappel du régime d'anonymat de l'éditeur non professionnel prévu à l'article 1er-1, II, de la LCEN, **sans revendiquer que les conditions sont satisfaites**. La notice reste à contrôler juridiquement selon la situation réelle de l'éditeur et de l'hébergeur.
6. Sitemap : les dates `lastmod` sont mises à jour uniquement pour la page méthode 5.3 et À propos modifiées le 11 octobre 2026 ; les dates inconnues des autres pages restent absentes. **Ne pas inventer des dates** pour gonfler le SEO.
7. Script `scripts/test-finitions-531.mjs` : vérifie version, GitHub seul, liens, sitemap, mentions et contenu du paquet. `scripts/test-browser-531.py` : parcours clavier, contrôle heuristique des noms accessibles et absence d'erreurs JavaScript sous Chromium desktop et mobile.

## Vérifications

Lancer `bash scripts/run-tests-531.sh` depuis la racine de la version complète.

- **19 suites Node**, incluant le nouveau test 5.3.1 ; 466 projections de 30 ans et 84 128 contrôles numériques dans la suite mathématique.
- **60 trajectoires économiques de référence** comparées avec le benchmark historique : identiques.
- **357 réglages politiques** inchangés, 19 scénarios et neuf profils économiques préservés.
- **Chromium hors réseau** : 1365×850 et 375×812 ; 314 contrôles inspectés, aucun sans nom dans le contrôle heuristique, clavier du glossaire et du menu vérifié, aucune erreur JavaScript ou débordement global aux tailles testées.
- Liens locaux et empreintes SHA-256 de la distribution vérifiés ; test de secrets statiques dans les fichiers distribués (pas dans l'historique Git).

Ces tests ne constituent pas un audit RGAA, un passage complet **axe-core**, un test avec un vrai lecteur d'écran ni un **rapport Lighthouse sur le site en production**. Ces deux derniers demandent une validation externe après déploiement. Les tests en mémoire ne produisent pas des mesures représentatives des Core Web Vitals de GitHub Pages.

## Publication et limites

- Décompresser `EcoSim_5.3.1_site_GitHubPages.zip` **à la racine du dépôt GitHub Pages**.
- L'archive `EcoSim_5.3.1_code_et_tests.zip` contient le même site sous `dist/`, les scripts, les tests, les comptes rendus et la documentation.
- Une fois publié, consulter `/`, `/informations-legales.html`, `/contact-signalement.html`, `/methodes-comparaison-politique-530.html`, `/sitemap.xml` ; soumettre ou inspecter ces URL dans Google Search Console si souhaité.
- Aucun changement de nom de domaine, aucun e-mail acheté, aucune modification du compte GitHub et aucun dépôt effectué automatiquement. **L'éditeur conserve la maîtrise de la publication.**
- L'éligibilité à l'anonymat légal et les modalités de communication des éléments d'identification à l'hébergeur ne sont **pas vérifiées** par le code.
