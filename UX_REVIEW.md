# Revue UX d'EcoSim — règles classiques

Cette grille remplace le protocole de test avec des participants. Elle applique les [dix heuristiques d'utilisabilité de Nielsen](https://www.nngroup.com/articles/ten-usability-heuristics/) à la première visite d'EcoSim. C'est une **revue du code et des contenus**, pas un test avec des personnes, une mesure de réussite des tâches ou une certification d'accessibilité. Les constats ci-dessous sont vérifiables dans `dist/index.html`, `dist/app.js` et `dist/styles.css` ; le rendu visuel sur appareils réels reste à contrôler.

## Parcours visé

Un visiteur doit pouvoir comprendre ce que simule le site, faire **un seul changement**, lire son effet à un an puis à cinq ans, et savoir que le résultat est une simulation conditionnelle plutôt qu'une prévision officielle. Les réglages experts ne doivent pas être nécessaires pour ce premier parcours.

## Grille heuristique

| Principe | Ce qui existe dans EcoSim | Point à vérifier ou améliorer |
| --- | --- | --- |
| 1. Visibilité de l'état du système | Résultats recalculés, nom du scénario, horizon sélectionné et messages `aria-live`. Les erreurs utilisent désormais un bandeau persistant distinct du toast de confirmation. | Vérifier que tout changement annonce clairement **ce qui a été modifié**, **par rapport à quelle référence** et **à quel horizon**. |
| 2. Correspondance avec le monde réel | Guide « Comprendre le budget », montants en Md€, définitions du déficit et de la dette. | Employer d'abord les mots usuels ; expliquer « administrations publiques », « profil économique » et « bande de sensibilité » près de leur premier usage. |
| 3. Contrôle et liberté | Boutons « Annuler la dernière action » et « Tout réinitialiser », scénarios enregistrés, import/export ; suppression d'une copie avec confirmation. | Vérifier que l'annulation reste accessible après les actions importantes et que ses limites sont compréhensibles. |
| 4. Cohérence et conventions | Navigation en quatre étapes, mêmes familles de couleurs et de boutons, pages de guides reliées au simulateur. | Garder les mêmes mots pour une même grandeur sur les cartes, tableaux, graphiques et guides ; ne pas confondre « budget de l'État » et « finances publiques ». |
| 5. Prévention des erreurs | Bornes des contrôles et validation des scénarios importés. | Décrire les bornes et unités avant saisie ; vérifier qu'un lien de scénario illisible ou une importation refusée laisse les réglages précédents intacts et donne une explication utile. |
| 6. Reconnaissance plutôt que mémorisation | Préréglages, libellés, guide d'entrée et aides « ? » ouvrables par clic, toucher, Entrée ou Espace. Le panneau possède un bouton « Fermer » et se ferme avec Échap. | Vérifier son annonce et son ordre de focus avec un lecteur d'écran sur appareil réel. |
| 7. Souplesse et efficacité | Premier réglage simple, puis catégories détaillées et options avancées repliées. | Conserver un chemin court pour débuter sans retirer les options expertes ; vérifier que les liens des guides ouvrent bien l'outil au bon endroit. |
| 8. Esthétique et sobriété | L'accueil met en avant une action principale et le guide « Je découvre » ; une partie des réglages est masquée au départ. Les textes secondaires clés ont été relevés à 12 px sur téléphone. | Vérifier visuellement la lisibilité et les débordements sur petits écrans ; les tableaux denses et certains micro-libellés restent à examiner. |
| 9. Reconnaître et corriger les erreurs | Les imports invalides, liens de scénario illisibles et erreurs de stockage/copie affichent un bandeau persistant avec une action conseillée ; il reste jusqu'à fermeture. | Vérifier à la main les chemins d'erreur dans les navigateurs ciblés et la restitution du message par lecteur d'écran. |
| 10. Aide et documentation | Guides thématiques, audit, sources et page « À propos ». | Depuis chaque résultat important, permettre d'accéder à l'explication correspondante en un lien, sans exiger la lecture de tout l'audit. |

## Accessibilité : contrôle complémentaire

Les [WCAG 2.2 du W3C](https://www.w3.org/WAI/WCAG22/quickref/) complètent ces heuristiques. Le code contient déjà un lien d'évitement, des libellés pour plusieurs champs et un contour `:focus-visible`. Cela **ne démontre pas** la conformité : il reste à vérifier contraste des textes et contrôles, navigation intégrale au clavier, ordre de tabulation, accès aux aides sur écran tactile et lecture des résultats par lecteur d'écran. Aucun score ou niveau WCAG n'est revendiqué ici.

## Ordre de correction recommandé

Les trois premières corrections issues de cette revue sont **implémentées dans le code** : augmentation ciblée des tailles sur mobile, erreurs persistantes, aides « ? » actionnables sans survol. Il reste à :

1. Contrôler le rendu réel sur petits téléphones, notamment les tableaux et les libellés encore très compacts.
2. Parcourir les erreurs d'import, de lien, de stockage et de copie dans les navigateurs ciblés.
3. Vérifier au clavier et avec un lecteur d'écran le panneau d'aide, les messages d'erreur, l'ordre de tabulation et les contrastes.
4. Repasser le parcours débutant de bout en bout et documenter les problèmes observés.

Les tests automatiques (`node tests/ux-navigation.mjs` et `node tests/seo.mjs`) contrôlent des éléments de structure, pas l'utilisabilité vécue. Cette grille n'affirme pas que toutes les règles sont déjà satisfaites.
