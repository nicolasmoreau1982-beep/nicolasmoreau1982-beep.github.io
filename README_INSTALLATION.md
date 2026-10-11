# EcoSim — Correctif accessibilité, sans modification du moteur

## Périmètre

Quatre pages HTML ont été raccordées à deux nouvelles ressources (`dist/accessibilite-ui.css` et `dist/accessibilite-ui.js`). Aucune équation ni donnée du moteur n'est modifiée.

### Prudence : ne pas remplacer aveuglément les HTML

Les HTML complets de ce ZIP proviennent de la copie de travail 5.8.5, et, pour `audit.html`, du correctif de mise en page précédent. Ils ne sont pas une copie certifiée de ton dépôt actuellement publié. **Privilégier le diff `MODIFICATIONS_MINIMALES.patch` : il ajoute uniquement une feuille CSS dans le `<head>` et un script à la fin du `<body>`.**

1. Copier `dist/accessibilite-ui.css` et `dist/accessibilite-ui.js` dans le `dist/` de ton dépôt.
2. Ajouter dans `<head>` des pages `index.html`, `audit.html`, `fiscal-individuel-570.html`, `distribution-ciblee-580.html` :

   `<link rel="stylesheet" href="accessibilite-ui.css" />`

3. Avant `</body>` des mêmes pages :

   `<script src="accessibilite-ui.js"></script>`

4. Ajouter les fichiers de test à `scripts/`, puis exécuter :

   `node scripts/test-accessibilite-ui.mjs`

   `python scripts/test-browser-accessibilite-ui.py` (Playwright Chromium installé)

   `node scripts/test-golden-540.mjs`

5. Régénérer **depuis ton dépôt à jour** le stamp et le manifeste selon ta chaîne habituelle (par exemple `node scripts/stamp-build.mjs` puis `node scripts/make-manifest-572.mjs`) et exécuter les tests CI avant publication.

Le patch ne crée aucun service, traceur ou cookie.

## Pourquoi ces deux ressources ?

- Focus clavier rendu visible, thèmes clair/sombre.
- Sur les onglets `role=tab`, flèches, Début et Fin : activation par les gestionnaires existants.
- Dans l'audit, les seuls tableaux réellement trop larges deviennent focusables (défilement horizontal au clavier, nom accessible).
- Réduction des animations si l'utilisateur la demande.
- Contraste du statut ocre `assumed` de l'audit renforcé (sur le fond clair, 4,42:1 → 6,66:1 selon les couleurs utilisées).

## Limites de la vérification

Lighthouse et axe-core ne sont pas installés dans l'environnement et le registre npm est inaccessible. Ce paquet **n'est pas une certification WCAG/RGAA**. Les tests sur téléphone physique, lecteur d'écran (NVDA/VoiceOver) et l'audit Lighthouse doivent encore être réalisés sur la version publique. L'analyse est fondée sur une archive de travail et non sur le dépôt distant exact.

## Contrôle supplémentaire recommandé, une fois publié

Servir localement le dossier public (`python3 -m http.server 8000 --directory dist`) puis, depuis un ordinateur disposant d'internet et d'un navigateur Chromium :

`npx @axe-core/cli http://localhost:8000/`

`npx lighthouse http://localhost:8000/ --only-categories=accessibility --chrome-flags="--headless" --output=html --output-path=lighthouse-ecosim.html`

Les audits doivent être réitérés sur l'atelier fiscal et la distribution (leurs URL HTML) et complétés manuellement au clavier et au lecteur d'écran.
