# EcoSim France — fichiers source corrigés directement

Ce ZIP contient des **fichiers édités** (HTML + test JavaScript), **aucun installateur Python**.

- `dist/audit.html` : retrait du paragraphe « Comparaison avec les simulateurs citoyens » et de ses liens. Sources scientifiques conservées.
- `scripts/test-audit-neutralite-2026.mjs` : test de non-régression éditoriale.

**Attention :** `audit.html` provient de l'archive 5.8.4 disponible lors de la préparation, pas du dépôt exact 5.8.4.1 (ni de ses éventuelles modifications ultérieures). Comparez ce fichier au vôtre avant de le remplacer si vous avez publié des changements depuis.

Pour publier sur le dépôt à partir de cette base : copier ces deux fichiers aux chemins indiqués, puis exécuter les outils Node.js **déjà présents** dans EcoSim afin de mettre à jour ses contrôles d'intégrité :

    node scripts/test-audit-neutralite-2026.mjs
    node scripts/stamp-build.mjs
    node scripts/make-manifest-572.mjs
    node scripts/test-finitions-531.mjs

Vérifier le diff Git, puis committer. Ne pas réutiliser le `build-info.js` ou le manifeste d'une ancienne livraison : ils sont calculés sur l'ensemble des fichiers réellement publiés. Aucun moteur de calcul n'a été modifié.
