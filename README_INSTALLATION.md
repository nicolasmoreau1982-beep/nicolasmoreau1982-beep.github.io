# EcoSim France — stabilisation documentaire et qualité 5.9.1

## Nature du correctif

**Additif, sans installateur Python ni modification du moteur.** Ce paquet est créé à partir des archives de travail disponibles, et non d'un clonage certifié du dernier commit public. Il n'écrase donc ni `dist/index.html`, ni `dist/app.js`, ni `dist/build-info.js`, ni `dist/release-status-572.json`.

### Ce que tu peux copier directement dans le dépôt actuel

- `dist/release-status-591.json` : nouveau manifeste de livraison, sans renumérotation du moteur 5.7.1.
- `dist/versions-591.html` : page de suivi des versions.
- `dist/verification-openfisca-591.html` : page lisible de confrontation fiscale.
- `dist/validation/openfisca-2026-10-11/*` : preuves calculées issues de l'artifact GitHub Actions du 11/10/2026 (56 cas synthétiques).
- `scripts/check-release-591.mjs`, `scripts/check-static-assets-591.mjs`, `scripts/test-desktop-ux-591.mjs` : vérifications sans dépendances npm.
- `.github/workflows/stabilisation-591.yml` : workflow à placer **à la racine du dépôt** (PAS dans `dist/.github/`).

Si `check-static-assets-591.mjs` est déjà présent et inchangé, inutile de le recopier. Si un workflow `check-static-assets-591.yml` existe déjà, le nouveau workflow exécute le même contrôle : conserver un seul job pour éviter les doublons.

### Rendre ces deux pages faciles à trouver

Depuis la racine du dépôt :

```bash
git apply --check MODIFICATION_CONTACT_MINIMALE.patch
git apply MODIFICATION_CONTACT_MINIMALE.patch
```

Le patch ajoute deux liens dans la section **Suivre les mises à jour** de `dist/contact-signalement.html`. Si la page a changé, `git apply --check` échouera et **ne modifiera rien**. Insère alors manuellement le contenu de `LIENS_A_INSERER_CONTACT.html` juste après les liens de suivi, sans remplacer le fichier HTML du dépôt. Le patch n'est pas un installateur et ne nécessite aucun script Python.

### Contrôles avant publication

```bash
node scripts/check-static-assets-591.mjs
node scripts/check-release-591.mjs
node scripts/test-desktop-ux-591.mjs
# conserver et exécuter les tests golden existants du dépôt, depuis leur bon emplacement
node scripts/stamp-build.mjs
node scripts/make-manifest-572.mjs
```

N'exécute les deux dernières commandes que si elles existent à la racine du dépôt (selon son organisation actuelle). Vérifie `git diff --check`, `git diff --stat`, puis publie après réussite du CI.

**URLs attendues après publication** :
- https://nicolasmoreau1982-beep.github.io/versions-591.html
- https://nicolasmoreau1982-beep.github.io/verification-openfisca-591.html
- https://nicolasmoreau1982-beep.github.io/release-status-591.json

## Portée des tests

Le contrôle du graphique est **structurel**. Lorsqu'il est installé il vérifie que le composant existant est utilisé, avec une seule référence CSS et JS. S'il n'est pas installé, il l'indique explicitement sans prétendre avoir validé les interactions. La vérification des curseurs et du clavier sous Chromium reste à faire **sur le commit exact** avant publication ; ce paquet ne prétend pas certifier la version en production.

La confrontation OpenFisca déjà réalisée sur 56 cas vérifie une cohérence numérique avec variables intermédiaires harmonisées, et non un calcul fiscal complet de bout en bout. L'URL précise du run GitHub Actions n'était pas incluse dans l'artifact. L'ancien statut 5.7.2 peut rester historique sans contredire l'exécution du 11 octobre.
