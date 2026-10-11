# EcoSim France — réponse à l’audit « yeux neufs » / 5.8.5

Date de préparation : 11 octobre 2026. Archive source : `EcoSim_5.8.4_correctif_audit_UX_5729.zip` ; livraison préparée : **5.7.2.10**, interface : **5.8.5** ; résultats du simulateur public toujours **5.7.1**.

## Périmètre et choix éditoriaux

EcoSim est présenté comme un **projet personnel et pédagogique, sans mandat ni légitimité institutionnelle revendiqués**. Il est **politiquement agnostique**, sans soutien à un parti, un candidat ou une ligne idéologique. Ce positionnement n’est pas une certification d’absence de biais : les hypothèses, les paramètres et les scénarios restent auditables.

L’auteur a accepté le principe de publier sa civilité, son identité d’éditeur et une adresse électronique ; **les valeurs exactes ne sont pas connues ou confirmées dans ce dossier**. Elles **n’ont pas été devinées ni publiées**. La page légale explicite ce statut temporaire ; compléter et valider les coordonnées avant déploiement si cette information doit être publique. Le flux Atom n’est **pas** un nouveau canal de contact, mais un moyen de suivre les mises à jour sans compte GitHub. GitHub Issues reste le canal public de signalement tant que l'adresse dédiée n'est pas confirmée et que l'auteur n'en décide pas autrement.

## Changements livrés dans le paquet

1. **Accueil citoyen :** la ligne de transparence donne des noms de démarches compréhensibles (TVA restauration, retraites par cohortes, sensibilité, fiscalité, OpenFisca) au lieu d’une succession de numéros de version.
2. **Audit :** disparition de la bannière obsolète « Nouveau 5.4 », sans supprimer les numéros de versions utiles sur les pages techniques.
3. **Contact / suivi :** bloc « Suivre les mises à jour sans compte », avec historique des commits et flux Atom de la branche `main`. Pas de `mailto:` inventé.
4. **Tableaux fiscaux et distributifs :** régions horizontales accessibles au clavier (`role="region"`, nom accessible et `tabindex="0"`), indication visible sur mobile et contour de focus. Le contenu et les calculs ne changent pas.
5. **Non-régression :** tests `test-ux-sentinelle-584.mjs`, `test-citoyen-585.mjs` et `test-neutralite-585.mjs` lancés distinctement par les workflows GitHub Actions *avant* publication. Détection correcte du dossier racine ou de `dist/`. Le workflow précédent avait une commande YAML repliée : corrigé ici.
6. **À propos / informations légales :** statut personnel et démarche politiquement agnostique affichés, avec réserve explicite sur les biais possibles.

## Doutes d'estampillage 5.8.4 : examen des pièces locales

L’archive source 5.8.4 contient `build-info.js` avec **`ace1dcbdfae5`**, et `release-status-572.json` avec **`deliveryLabel: 5.7.2.9`** et `energyUXVersion: 5.8.4`. L’empreinte `37ce54354aff` et le libellé 5.7.2.8 appartiennent à l’ancienne archive 5.8.3. Cela établit la **cohérence du paquet local**, pas celle du site déployé : les accès web aux fichiers GitHub/Pages ont échoué pendant cette préparation.

Pour comparer **après publication** le paquet local, la branche `main` et GitHub Pages :

```bash
node scripts/verifier-site-publie-585.mjs
```

Le script ne modifie aucun fichier et renvoie un code d’erreur si les empreintes/livraisons ne sont pas concordantes ou si le service est inaccessible. Cela permet de constater une divergence, non de prouver immédiatement qu’un cache en est la cause. Il faudra comparer branche de publication, action Pages et réponses HTTP si un écart persiste.

## Éléments UX réellement vérifiés

- Sommaire orienté actions et comportement sticky : vérifiés sous Chromium en mode bureau (1 350 px) et mobile simulé (390 px) ; les liens rouvrent les panneaux masqués par le mode Découverte.
- Glossaire : 21 définitions uniques dont `MAE/P80`, `output gap`, `millésimes`, `soldes recalés`, `titulaires dans les flux` ; l’extension `ux-parcours-583.js` pose des liens pour ces termes. Le test n’assure **pas que chaque terme technique possible** de l’ensemble du simulateur dispose d’une définition.
- Version publique/technique : retirée du premier écran et conservée dans le pied de page, les pages de méthode et le `release-status`.
- Panneau énergie (5.8.4) : distinctions des zéros exacts, écarts arrondis, et variations significatives ; sentinelles dynamiques sans modification des résultats.
- Tableaux fiscal et distributif : tests Chromium à **320, 390 et 1 350 px** pour la navigation horizontale, la visibilité des indications et le focus possible ; ces tests ne constituent pas une certification d’accessibilité.

## Tests et limites

- Suite complète de tests `bash scripts/run-tests-510.sh` : **réussie**, y compris les valeurs historiques gelées (1 980 points) et les sentinelles UX.
- `node scripts/stamp-build.mjs` : sortie **`aa9a76651e8d`**, obtenue de façon reproductible en deux exécutions.
- `node scripts/make-manifest-572.mjs` : **132 fichiers** du paquet public. `sha256sum -c manifest-integrite-572.sha256` lancé depuis `dist/` : OK.
- `node dist/scripts/check-release-572.mjs --commit-subject 'Release 5.7.2.10'` : OK.
- Aucun axe-core ni Lighthouse complet et aucun test sur téléphone physique n’ont été exécutés. Les contrôles de nom accessible Chromium ne suffisent pas à certifier une conformité WCAG/RGAA.
- Aucun résultat national, donnée économique, pondération ou confrontation OpenFisca indépendante n’a été modifié.
- **Six `lastmod` restent volontairement absents** : aucune date significative et vérifiable n’a été trouvée dans l’historique fourni. Les inventer affaiblirait la traçabilité. JSON-LD sur les cinq guides et le glossaire conservé.

## Publier sans perdre les protections

Intégrer `dist/` dans le répertoire réellement servi par Pages, mais conserver `LICENSE` à la racine du dépôt, ainsi que les scripts de test hors publication. Reporter les workflows `dist/.github/workflows/*.yml` dans **`.github/workflows/` à la racine GitHub**. Utiliser le titre de commit de livraison **`5.7.2.10`**. Ne pas annoncer la livraison publique sans vérifier son exécution par GitHub Actions, puis lancer le vérificateur de site après le déploiement.
