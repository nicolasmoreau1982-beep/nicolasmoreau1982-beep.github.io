# EcoSim 5.9.1 — Compte rendu des vérifications du paquet

**12 octobre 2026.** Contrôles exécutés sur **une copie de l'archive 5.8.5 avec les composants de navigation et de graphique réintroduits**, et sur les nouvelles sources de stabilisation 5.9.1. **Pas de clone vérifié du dernier commit 5.9.1** ; ces résultats ne prouvent pas l'état de production.

| Vérification | Résultat |
| --- | --- |
| Registre de livraison + format et cohérence du rapport OpenFisca | **OK** |
| Import des résultats OpenFisca | **OK** : 56 lignes CSV et 56 identifiants distincts, source JSON cohérente |
| Références CSS/JS locales à résoudre | **OK** : 35 pages, 178 références dans la copie avec graphique |
| Graphique permanent intégré une seule fois (structure) | **OK** dans la copie avec les deux assets du correctif antérieur |
| Golden 5.4 | **OK** : 6 scénarios, 1 980 valeurs de 2026–2055 ; corruption détectée |
| Correction ciblée des liens « Suivre les mises à jour » | **OK** : `git apply --check` puis `git apply` sur la copie de travail |
| Vérifications interactives en navigateur sur copie locale (scroll, curseurs, Échap, focus) | **Non exécutées** : Chromium bloque l'accès local et les URL interceptées (`ERR_BLOCKED_BY_ADMINISTRATOR`) |
| Vérification HTTP du site 5.9.1 en production | **Non certifiée** : cache web / accès direct non fiable |

## Contrôle fonctionnel desktop à effectuer sur le vrai site après publication

1. Sur ordinateur, ouvre le simulateur à **1600×900**, puis **1366×768**.
2. Descends dans la liste des réglages : le **vrai graphique** doit rester visible à droite sans masquer les curseurs.
3. Modifie une valeur d'un poste budgétaire, vérifie que la ligne du graphique et l'indication du scénario changent **immédiatement**, sans recharger la page.
4. Change l'indicateur **Déficit, Dette, PIB, Chômage** ; l'état actif et la courbe doivent changer, sans graphique dupliqué.
5. Teste les raccourcis clavier `Tab`, `Entrée` et `Échap` dans le menu « Explorer » et les onglets.
6. Réduis la largeur sous **1 280 px** : le graphique doit retrouver sa position dans les résultats, sans affichage flottant superposé.
7. Ouvre les pages `versions-591.html` et `verification-openfisca-591.html` ; télécharge le CSV. Exécute les trois commandes Node et vérifie GitHub Actions.

## Limites scientifiques et de provenance

La comparaison OpenFisca n'est pas une vérification fiscale de bout en bout. Elle harmonise des variables intermédiaires. Il manque le lien précis vers le run GitHub et les logs complets. Les indicateurs nationaux et macroéconomiques ne sont pas validés par ce jeu de 56 cas.
