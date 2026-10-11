# EcoSim France 5.8.3 — suite de l'audit UX du 11 octobre 2026

**Périmètre** : correctif de présentation de l'archive EcoSim 5.8.2, sans modification des équations macroéconomiques, du calcul fiscal historique ou de l'atelier distributif 5.8.1. Livraison technique **5.7.2.8** ; résultats publics **5.7.1**, outillage de validation **5.7.2**.

## Évolutions

1. **Navigation sticky orientée actions.** La barre de parcours existante devient une navigation en 8 entrées : essayer une mesure, lire la trajectoire, comparer pour 2027, population/énergie, budget, fiscalité, méthode et glossaire. Les liens pointent vers les sections existantes. Le sommaire détaillé reste accessible sous « Voir toutes les rubriques ».
2. **Modes Découverte / Expert.** La vue Découverte est active par défaut pour montrer le scénario, les résultats et la comparaison. Les huit rubriques détaillées sont masquées *visuellement*, non supprimées. Le mode Expert les réaffiche. Un lien direct, une navigation interne ou un lien ancré vers une rubrique masquée bascule automatiquement en Expert. Sans JavaScript, les rubriques ne sont pas masquées.
3. **Versions hors du premier écran.** Le numéro public et le numéro technique restent dans le pied de page ainsi que dans `build-info.js` et les pages de contrôle. Les longues références scientifiques du hero restent accessibles dans un panneau dépliable. Aucune source supprimée.
4. **Glossaire dans les contextes utiles.** Les expressions « millésimes », « soldes recalés » et « titulaires dans les flux » deviennent des liens explicites vers leurs définitions depuis le tableau dynamique d'effectifs ; les termes MAE, P80 et output gap présents dans la documentation méthodologique sont également liés. Trois entrées pédagogiques ont été ajoutées (18 → 21), avec JSON-LD aligné. Aucune définition ajoutée par génération automatique lors du chargement.
5. **Numérotation homogène.** Les sections principales du simulateur passent à une séquence lisible, sans « 04 bis ». Les identifiants HTML, les réglages et les routes internes restent identiques.
6. **Correction de 5.8.2 préservée** : les écarts d'effectifs nuls sont toujours présentés comme « Inchangé », les petits écarts arrondis sont explicités et les demandes de recrutement nulles ont une formulation compréhensible.

## Fichiers principaux

- `dist/index.html` : navigation, lecture, contenu du premier écran, séquence des rubriques.
- `dist/ux-parcours-583.js` et `dist/ux-parcours-583.css` : extension dédiée, sans changement d'`app.js`.
- `dist/glossaire.html` et `dist/data/glossary-520.json` : définitions, ancres et données structurées cohérentes.
- `dist/release-status-572.json` : périmètre et numéro de livraison.
- `scripts/test-ux-parcours-583.mjs` et `scripts/test-browser-583.py` : contrôles statiques et scénarios navigateur.
- `scripts/test-ux-520.mjs`, `scripts/test-release-572.mjs`, `scripts/test-droits-580.mjs` : assertions adaptées à la livraison et aux 21 entrées du glossaire.

## Vérifications

- Chromium en mémoire, bureau **1365×850** et viewport mobile simulé **375×812** : modes, accès aux sections masquées, liens profonds, terminologie dans le panneau des emplois, ouverture du dialogue de glossaire, absence d'erreur JavaScript, absence de débordement horizontal significatif sur le mobile de test.
- Tests unitaires statiques du parcours, données structurées et livraison technique.
- Test Golden : **1 980** valeurs économiques de référence conservées (tolérance historique), modules `app.js`, `fiscal.js`, `data.js`, `political-profiles-530.js`, `sectoral.js`, `model-distribution-580.mjs` comparés par empreintes avec l'archive 5.8.2.
- Contrôle complet `sha256sum -c manifest-integrite-572.sha256` après recalcul du stamp ; manifeste de la 5.7.2.8.
- Le lancement du `run-tests-510.sh` global a été **interrompu par la limite de temps de l'environnement** à l'étape coûteuse de sensibilité 5.6. Les tests précédents avaient réussi ; les tests suivants ont été exécutés individuellement et réussis. Cela ne permet pas de revendiquer un nouveau passage intégral du script en une seule invocation.

## Limites / étapes suivantes

- Le test mobile est une **simulation Chromium**, pas un essai sur téléphone physique.
- Aucun test axe-core ou Lighthouse complet : accessibilité, contraste réel et lecture d'écran doivent encore être audités.
- Les tableaux denses de la fiscalité individuelle n'ont pas été refondus en cartes mobiles dans cette livraison.
- Le tri des avertissements économiques est volontairement conservateur : les limites scientifiques ne sont ni effacées, ni réécrites.
- L'exécution indépendante OpenFisca réelle n'a pas été déclenchée par cette livraison.
- **Non déployé sur GitHub**. Décompresser l'archive puis publier la distribution en suivant la configuration existante du dépôt ; vérifier le workflow GitHub Pages et le `LICENSE` à la racine.
