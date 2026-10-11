# EcoSim France — correctifs 4.17.0

Base : archive EcoSim.zip reçue (4.16.0). Version produite localement : **4.17.0**. Empreinte du paquet (code JS/CSS, **pas un commit Git**) : `555831d7707d`.

## Corrections livrées

- **Import et liens de partage** : validation stricte des cinq choix de profils avec `Object.hasOwn`, avant toute mutation ; rejet des valeurs héritées (`constructor`, `__proto__`, `toString`), et garde-fous pour les sauvegardes locales malformées.
- **Laboratoire social conservé** : calcul d'exposition distinct de la mobilisation hypothétique. La carte de tête classe sur l'exposition et indique les ex æquo ; suppression de `voteWeight` et `incumbentVoteSensitivity` ; disparition de la moyenne électorale non représentative et des suffixes « pt » ; plage min/max des cellules à la place ; suppression du différentiel TVA par âge inventé sans microdonnées. Contributions détaillées dans chaque cellule (info-bulle) et pour le profil le plus exposé ; tableau pédagogique des coefficients.
- **Atelier fiscal** : les tableaux de gains et pertes précisent que les foyers sont synthétiques et non représentatifs, sans toucher aux règles fiscales.
- **Audit scientifique** : les trois tableaux initialement « Chargement des résultats… » sont pré-générés en HTML. Les sélections continuent de fonctionner avec JS ; exemples accessibles sans JS.
- **Accessibilité et lisibilité** : étiquette pour la recherche budgétaire, message `<noscript>`, rehausse d'une partie des tailles de police trop petites et ajustement des contrastes des couleurs teal/coral en mode clair.
- **Vie privée** : polices système à la place des requêtes Google Fonts ; clarification sur l'activation de GoatCounter (l'outil n'a pas été désactivé). Aucune garantie juridique de conformité n'est revendiquée.
- **Métadonnées/version** : version 4.17.0, empreinte de paquet visible (il ne s'agit **pas** d'un hash de commit), version et identifiant inclus dans les exports ; Twitter summary card et données structurées WebApplication ; correction du dernier « ton navigateur ».

## Publication

**Seuls les fichiers du dossier `dist/` constituent le site statique**. Copiez son contenu à la racine de la branche/dossier publié par GitHub Pages (ou utilisez votre déploiement habituel). Ne créez pas un sous-dossier `dist` supplémentaire à la racine publique s'il n'était pas utilisé auparavant.

Le ZIP complet contient également `scripts/`, utiles pour la vérification locale :

```sh
node scripts/test-regressions.mjs
node scripts/prerender-audit.mjs
node scripts/stamp-build.mjs
```

Exécuter `stamp-build.mjs` après toute modification des fichiers JS/CSS du moteur, puis publier le contenu de `dist/`. L'empreinte correspond à un hachage des fichiers applicatifs JS/CSS, **pas** à l'identifiant SHA d'un commit GitHub.

## Validation réalisée

- `node --check` sur tous les JavaScript de la distribution : OK.
- Cas isolés testés : profil valide, sept sélections malformées (refusées sans modification d'état), pensions −10 Md€, TVA +10 Md€ (égalité d'exposition non artificiellement départagée), IR +10 Md€.
- Aucun identifiant HTML dupliqué dans les pages inspectées. Les trois tableaux de l'audit sont pré-rendus.
- Contrastes texte sur fond clair (thèmes clair) : teal 5,35:1 et coral 5,66:1 sur le fond des cartes ; vérification arithmétique des deux couleurs seulement.

## Limites restantes

- **Pas de campagne de tests de navigateur de bout en bout réussie** dans cet environnement : Chromium ne s'est pas lancé correctement. Vérifiez visuellement le rendu mobile, les tableaux et les exportations après publication.
- Pas de validation scientifique nouvelle des multiplicateurs, des pondérations sociales, des chiffres politiques ou des foyers-types. Les tableaux restent pédagogiques et conditionnels, et ne sont pas une estimation nationale ou un pronostic.
- Les « coefficients consultables » du laboratoire ont été ajoutés, mais **ils ne sont pas encore éditables par l'utilisateur**. L'ajout de réglages comportementaux éditables demanderait un protocole de partage/export versionné afin d'éviter que deux liens conduisent à des conclusions différentes.
- La provenance détaillée et la vérification ligne par ligne de chaque chiffrage politique restent à réaliser avec des sources primaires.
- La configuration de consentement éventuel pour GoatCounter reste à examiner séparément.
