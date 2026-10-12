ECOSIM 5.9.1 — REPARATION CIBLEE DU MENU EXPLORER

Origine : l'audit du 12 octobre 2026 signale que dist/index.html référence
nav-explorer.css et nav-explorer.js mais que les fichiers sont absents du site.

Le ZIP contient les DEUX VRAIS fichiers CSS et JS du correctif de navigation
préparé précédemment. Aucun fichier HTML ancien n'est inclus.

A COPIER DANS TON DEPOT (en conservant l'arborescence) :
  dist/nav-explorer.css
  dist/nav-explorer.js
  scripts/check-static-assets-591.mjs
  .github/workflows/check-static-assets-591.yml

IMPORTANT : ces fichiers sont destinés au dépôt dont la racine contient
« dist » et « scripts ». Si GitHub Pages publie le contenu de dist/,
les ressources doivent être accessibles à :
  https://nicolasmoreau1982-beep.github.io/nav-explorer.css
  https://nicolasmoreau1982-beep.github.io/nav-explorer.js

Le contrôle automatisé parcourt les pages HTML de dist/ et vérifie que les
fichiers locaux référencés par <script src> et <link href> existent.
Il ne charge rien depuis internet et n'installe aucune dépendance.

CONTROLE LOCAL :
  node scripts/check-static-assets-591.mjs
  node --check dist/nav-explorer.js

Avant un commit, régénérer les empreintes par la procédure de build habituelle
(et exécuter les tests déjà présents dans le dépôt). La présence de nouveaux
fichiers dans dist/ peut modifier la distribution ou le manifeste.

SUR GITHUB PAGES APRES PUBLICATION :
  1. Tester directement les deux URL ci-dessus (HTTP 200 attendu).
  2. Ouvrir la console réseau du navigateur ; aucun 404 nav-explorer.
  3. Ouvrir Explorer, cliquer hors du menu, réouvrir, presser Echap : il se ferme.

METADONNEES : ne pas réécrire ECOSIM_VERSION = 5.7.1 ni
ECOSIM_TECHNICAL_VERSION = 5.7.2, qui décrivent le moteur.
Le site et les livraisons peuvent être en 5.9.1 sans changement de moteur.
Pour une traçabilité complète, ajouter ensuite un champ de version de site
et un registre de livraison distinct ; ne pas modifier release-status-572.json
comme s'il s'agissait de la version du moteur.

OPENFISCA : le protocole de 56 cas a été exécuté, mais la preuve sur le site
n'est pas vérifiée par ce patch. Ne pas prétendre à une certification fiscale.

AUCUNE modification d'équation, de données économiques, de la page d'accueil,
de la page d'audit, du footer, ni de l'intégration AdSense/analytics.

LIMITES DE VALIDATION : la version déployée 5.9.1 n'est pas disponible ici sous
forme d'archive complète. Les tests sont exécutés sur une copie de travail
locale antérieure enrichie des ressources manquantes ; vérifier les résultats
du CI sur TON dépôt après intégration.
