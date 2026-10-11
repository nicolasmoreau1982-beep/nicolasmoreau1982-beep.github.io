# EcoSim — Atelier distributif expérimental 5.8.0

Date de préparation : 11 octobre 2026. Livraison locale **5.7.2.6** incluant les diagnostics 5.8.1 après l’atelier 5.8.0, contenant le nouvel atelier **5.8.0**. Les résultats publics macro restent à la version **5.7.1**, le protocole OpenFisca existant reste en **5.7.2**. Ne pas confondre ces numéros : l'atelier 5.8 introduit une nouvelle possibilité d'exploration et **ne remplace pas le moteur macroéconomique**.

## Fonctionnalités

- Nouvelle page `dist/distribution-ciblee-580.html`, accessible depuis l'accueil, la salle des moteurs et la page fiscalité individuelle.
- **SMIC** : le salaire horaire des personnes soumises au plancher est porté seulement jusqu'au nouveau SMIC (`max(salaire, SMIC augmenté)`). Salaires supérieurs inchangés par défaut. Diffusion négociée facultative et distincte, explicitement hypothétique. Pondérations et temps de travail modifiables. Statuts dérogatoires pris en compte ; un salaire sous l'ancien plancher légal sans dérogation est refusé.
- **Référence du SMIC** : 12,31 € brut par heure depuis le 1er juin 2026 (métropole et régions concernées, hors Mayotte), vérifié dans la série Insee au 1er octobre 2026. Le prototype 5.7.3 utilisait encore le niveau de janvier 2026, 12,02 €. L'atelier utilise des euros **nominaux** tandis que le levier macro « Salaire minimum réel » prend un pourcentage en termes **réels** : un transfert du pourcentage depuis un curseur est un préremplissage de travail et non une égalité de concepts sans hypothèse d'inflation.
- **Pensions** : abattement fiscal de 10 % pour revenus 2025 imposés en 2026, minimum 454 €/titulaire et maximum 4 439 €/foyer. Réformes paramétrables (suppression au-dessus d'un seuil, suppression progressive, ou réduction du plafond au-dessus d'un seuil) avec deux critères de ciblage indépendants : RFR du foyer ou pensions déclarées totales du foyer. Le RFR est fixé exogènement ; le revenu imposable fourni est déjà net de l'abattement de référence. Le calcul IR EcoSim ordinaire ne simule pas tous les crédits et réductions.
- Les jeux présentés sont **fictifs**, éditables, pondérables (sans représentativité) et exportables en JSON portant la mention `EXEMPLE_NON_REPRESENTATIF`.
- Des fichiers autonomes séparent la nouvelle interface et le nouveau modèle (`dist/distribution-ciblee-580.mjs`, `dist/model-distribution-580.mjs`). L'ancien `dist/app.js` et les sources macro `dist/data.js`, `dist/fiscal.js` sont **strictement identiques** aux fichiers reçus.
- Ajout d'une explication dans le guide des programmes politiques : pas de recomputation des programmes fondée sur une population fictive.

## Raison du non-branchement national

Un revenu brut horaire supplémentaire n'est pas une hausse de la recette fiscale équivalente : il faut soustraire les interactions de cotisations sociales et exonérations, les effets sur les prix, la production, les prestations, les coûts employeurs, les négociations salariales et l'emploi. Un changement d'IR sur quelques foyers fictifs ne peut pas être multiplié par le nombre total de foyers du pays. Sans microdonnées pondérées **représentatives**, les nouveaux calculs ne sont ni des recettes APU en milliards ni des nouvelles trajectoires de dette.

Le lien de la salle des moteurs préremplit le pourcentage de SMIC seulement lorsque le curseur pertinent est visible. Le module ne récupère pas les scénarios sauvegardés ou les préférences de partis en arrière-plan ; aucun profil politique n'a été altéré.

## Vérifications

Depuis la racine :

```bash
node scripts/test-distribution-580.mjs
python scripts/test-browser-distribution-580.py
bash scripts/run-tests-510.sh
node scripts/test-source-inchangee-540.mjs
node scripts/test-golden-540.mjs
node scripts/test-release-572.mjs
(cd dist && sha256sum -c manifest-integrite-572.sha256)
```

Le test Chromium utilise `set_content` avec la logique ESM assemblée à partir des deux fichiers du module, car les navigations vers `file://` et le serveur HTTP local sont bloquées dans cet environnement de test. Cela vérifie l'interface et les événements, **pas** une navigation réseau authentique ni un déploiement GitHub Pages.

## Publication

- Ne pas supprimer les fichiers historiques ni remplacer aveuglément le workflow `.github/workflows/static.yml` du dépôt réel.
- Vérifier le diff avant de copier `dist/` dans la racine publique appropriée.
- Pour cette livraison : utiliser un sujet de commit de release `5.7.2.5` ou `Release v5.7.2.5`. `check-release-572.mjs` vérifie l'étiquette complète et l'empreinte.
- En cas de modification après génération du ZIP, refaire les étapes de construction dans cet ordre : `node scripts/stamp-build.mjs`, `node scripts/make-manifest-572.mjs`, tests, puis commit/déploiement.
- Aucun workflow OpenFisca réel n'a été exécuté par cette livraison.

## Données à acquérir avant couplage 5.8 dans les projections publiques

1. Distribution salariale représentative avec assiette SMIC, temps de travail, exemptions et poids.
2. Répartition de pensions par titulaire et revenus totaux par foyer, RFR, montants après déductions.
3. Exonérations de cotisations, charges patronales, barèmes réels et revenus non salariaux, comparaison OpenFisca.
4. Scénarios quantifiés de diffusion salariale, incertitude et calendrier.
5. Audit de la provenance des propositions politiques (SMIC net vs brut, hausse nominale vs réelle ; abattement pensions et définition de « riches »), puis recalculs APU après étalonnage.

## Sources officielles

- Insee, SMIC mensuel / horaire, série 000822484 : https://www.insee.fr/fr/statistiques/serie/000822484
- Gouvernement, SMIC au 1er juin 2026 : https://www.info.gouv.fr/actualite/le-smic-revalorise-le-1er-juin-2026
- DGFiP, pensions : https://www.impots.gouv.fr/particulier/pensions-retraites
- Dares, bénéficiaires revalorisation du 1er novembre 2024 (autre période et champ d'étude) : https://dares.travail-emploi.gouv.fr/publication/la-revalorisation-du-smic-au-1er-novembre-2024

## Révision des droits d’auteur

Voir `README_DROITS_580.md` et `LICENSE` : la livraison 5.7.2.5 ajoute uniquement des précisions sur les permissions et les contributions protégeables, sans licence libre générale ni modification du moteur historique.

## Extension 5.8.1

Lire `README_DISTRIBUTION_581.md` pour les deux formats CSV, les contrôles de provenance, le traitement local en mémoire, la suppression des petites cellules à l’export et le sens précis des pondérations. Le public continue de voir la version macro 5.7.1 et le contrôle OpenFisca 5.7.2 : aucune publication de résultat national 5.8 n’est revendiquée.
