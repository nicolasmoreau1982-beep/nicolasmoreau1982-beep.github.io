# EcoSim France 5.2.0 — Expérience utilisateur et contrôles de livraison

**Base conservée :** archive complète EcoSim 5.1.0. Publication proposée : 11 octobre 2026.

## Ce que change la version 5.2

1. **Navigation progressive** : un sommaire regroupé en *Créer / Approfondir / Comparer / Comprendre* relie les sections existantes sur la **même page**, donc aucun réglage du scénario n’est perdu. Il reste visible sans JavaScript ; il est replié au premier affichage sur les petits écrans lorsque JavaScript fonctionne.
2. **Glossaire** : une page `glossaire.html` consultable sans JavaScript contenant 18 définitions et des exemples simples ; neuf boutons d’aide en contexte ouvrent une fenêtre native `<dialog>` refermable par Échap et ramenant le focus au bouton initiateur. Données de définition exportées dans `data/glossary-520.json`.
3. **Accessibilité** : lien direct à chaque grande rubrique, noms explicites des boutons d’aide, focus visible, lecture au clavier, absence de débordement horizontal sur le viewport mobile testé à 375 px, prise en compte de `prefers-reduced-motion` dans les déplacements pilotés par `app.js`.
4. **Traçabilité** : version 5.2.0, identifiant reproductible de paquet, sitemap actualisé et empreintes SHA-256 recalculées sur les fichiers distribués.
5. **Contrôles éditoriaux et sécurité** : test statique du glossaire / sommaire / ressources, scanner local de signatures courantes de secrets, tests optionnels de comportement dans Chromium.

## État de la version 5.1

Les protections introduites en 5.1 (imports atomiques, valeurs invalides, contrôles de référence et d’identités comptables année par année) restent actives. Les 15 suites héritées ont réussi dans la base avant modifications. Elles ont de nouveau réussi après intégration, avec le nouveau test UX en plus. Les 60 sorties de simulation comparées à la référence économique archivée sont inchangées.

## Tests réellement effectués

- `bash scripts/run-tests-520.sh` : tests économiques et fiscaux, import hostile, contrôle de version, scanner local de secrets, manifeste. **16 suites `test-*.mjs`** au total (15 héritées + 1 UX).
- `python scripts/test-browser-520.py` : essai Chromium **en mémoire**, sans serveur local accessible ni chargement réel par le réseau, à **1365×850** et **375×812**. Initialisation du moteur, menu mobile, glossaire modal et navigation clavier testés. Aucun débordement horizontal détecté à 375 px dans ce contrôle. Il ne couvre pas tous les formulaires ni les lecteurs d’écran.
- `node scripts/report-performance-520.mjs` : inventaire des tailles des principaux assets, **pas un audit Lighthouse**.
- `node scripts/check-secrets-520.mjs` : reconnaissance de quelques formats de jetons parmi les fichiers publiés. **L’historique du dépôt Git n'est pas dans l'archive** et n'a pas été audité. Le scan ne garantit pas l'absence de secrets ; pour cela, exécuter Gitleaks sur le dépôt complet, historique inclus.

## Ce qui n’a PAS été modifié

- Aucune modification volontaire des données Insee ou des coefficients économiques.
- Pas de nouveau moteur, pas de changement de résultats macros, pas de suppression du laboratoire social ou de l’atelier fiscal.
- Pas de découpage de la page en sous-applications, ce qui nécessiterait une refonte de l’état partagé et de son import/export.

## Restant à faire / limites

- Pas de mesure en conditions réelles (Lighthouse, LCP/INP/CLS, connexions mobiles) ; le chargement HTTP local a été bloqué par l’environnement, donc le test Chromium utilise le DOM et les scripts injectés directement.
- Pas d'audit WCAG exhaustif, test de lecteur d’écran ou de performance de bas de gamme Android ; à effectuer sur le site déployé.
- Pas de revue humaine de l'intégralité des sources politiques ni de validation causale des multiplicateurs.
- Le scanner de secrets n’inspecte pas l'historique Git public (non inclus dans le ZIP).

## Fichiers / publication

- `EcoSim_5.2_site_GitHubPages.zip` : contenu direct à décompresser **à la racine** de GitHub Pages ; n’effacer ni le fichier de validation Search Console ni les répertoires liés.
- `EcoSim_5.2_code_et_tests.zip` : `dist/`, `scripts/`, `README_5.1.md`, `README_5.2.md`, logs des tests.

### Vérification après publication

1. Vérifier que le pied de page affiche **Version 5.2** et l'empreinte du ZIP.
2. Ouvrir « Explorer EcoSim » sur smartphone, cliquer « Laboratoire social », revenir aux résultats sans perdre les changements.
3. Ouvrir une aide « ? », la refermer par **Échap** puis vérifier que le focus revient au bouton d’origine.
4. Importer un ancien scénario valide, modifier le budget et exporter.
5. Mesurer via PageSpeed Insights les performances mobiles de l’URL publique ; mesurer la navigation clavier avec un vrai navigateur et, si possible, un lecteur d’écran.

### Commandes

```bash
bash scripts/run-tests-520.sh
RUN_BROWSER_520=1 bash scripts/run-tests-520.sh
node scripts/report-performance-520.mjs
(cd dist && sha256sum -c manifest-integrite-520.sha256)
```
