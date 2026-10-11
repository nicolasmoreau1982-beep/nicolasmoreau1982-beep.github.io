# EcoSim France 4.21.1 — Correctifs de transparence et de présentation

**Version prête à publier sur GitHub Pages (correctif de la 4.21, sans changement des coefficients ni du moteur de calcul).**

## Modifications

1. **Comparateur politique :** un état de la provenance est affiché **dans la carte des résultats**, à côté du tableau de comparaison : 357 réglages, **0 correspondance exacte chiffrée**, **1 proposition localisée mais non équivalente**, **356 hypothèses non vérifiées individuellement**. Le compte provient du registre publié, et `scripts/sync-provenance-counter-4211.mjs` le synchronise au build. On ne présente pas une proposition liée comme un chiffrage officiel vérifié.
2. **Sensibilité économique :** la page `validation-economique-421.html` indique directement, juste avant le tableau, que les trois coefficients stressés à ±20 % **n'incluent ni les multiplicateurs de dépenses/prélèvements, ni leurs délais, ni les effets directs sur le PIB**. La plage ne constitue ni un intervalle de confiance ni une borne de l'incertitude économique.
3. **Provenance politique :** 18 tableaux enrichis d'un `<caption>` mentionnant le scénario ; en-tête et pied de page corrigés en version 4.21.1 dans **le générateur** `scripts/export-provenance-420.mjs` (les noms des exports 4.20 restent inchangés car leurs données n'ont pas changé).
4. **Partage de liens :** aperçu visuel `og-ecosim.png` (1200 × 630) avec `og:image` et `twitter:image` pour l'accueil, l'audit et les deux pages pédagogiques concernées.
5. **Sitemap :** `<lastmod>2026-10-11</lastmod>` uniquement pour les quatre pages réellement modifiées. Dates non inventées pour les guides non modifiés.
6. **Traçabilité :** empreinte de distribution calculée aussi sur les quatre pages HTML concernées et l'image de partage. Le script `stamp-build.mjs` normalise l'ancienne empreinte avant le hachage : résultat reproductible. Pied de page : **Version 4.21.1 · paquet b177a044830c**. L'empreinte n'est pas un hash Git.

## Validation

Tous les tests conservés passent : `test-regressions`, `test-mathematical` (**466 projections ; 84 128 contrôles numériques**), `test-fiscal-419`, `test-economique-419`, `test-transparence-420`, `test-validation-421`, `test-economie-inchangee-421` (**60 résultats économiques inchangés**). Le nouveau `test-presentation-4211.mjs` vérifie les compteurs, les légendes des tableaux, l'image de partage, le texte sur la sensibilité, les versions et les dates `lastmod`.

## Régénération des pages de présentation

```bash
node scripts/export-provenance-420.mjs
node scripts/preparer-validation-421.mjs
node scripts/sync-provenance-counter-4211.mjs
node scripts/stamp-build.mjs
node scripts/test-presentation-4211.mjs
```

**Attention :** la régénération du registre conserve le millésime de ses exportations (`provenance-politique-420`), parce que la liste des réglages et leur niveau de preuve sont inchangés. Le moteur reste `data.js` version `4.21.0` ; `4.21.1` est une révision de présentation/publication.

## Travail restant à faire

- Vérifier manuellement les propositions primaires attribuées aux formations, mesure par mesure, avec le passage exact, l'unité, le calendrier et les hypothèses d'extrapolation. **Aucune nouvelle source politique n'a été inventée** dans ce correctif.
- La plage de sensibilité économique reste partielle. Une future analyse devrait faire varier les multiplicateurs et d'autres hypothèses conjointement ; le présent correctif en expose simplement la limite.
- Un contrôle visuel mobile, au clavier et avec lecteur d'écran reste nécessaire après publication. Le correctif ne prouve pas la validité causale du modèle.

## Publication

Décompresser l'archive « site » à la racine du dossier GitHub Pages, en conservant les sous-dossiers `validation/`. Vérifier `Version 4.21.1` et `paquet b177a044830c` dans le pied de page, ainsi que l'adresse `/og-ecosim.png`.

---

# Historique de la base 4.21

# EcoSim France 4.21.0 — Validation fiscale ciblée et sensibilité économique

**Statut : prêt à publier sur GitHub Pages après contrôle visuel.**

Cette version conserve les scénarios politiques, le laboratoire social et les moteurs de la 4.20. Les multiplicateurs et les fonctions de projection macroéconomique n'ont pas été recalibrés.

## Contenu nouveau

- `dist/validation-economique-421.html` : nouvelle page pédagogique **statique**, lisible sans JavaScript, contenant des tests fiscaux référencés, un tableau de sensibilité du déficit et les limites d'interprétation.
- `scripts/validation-fiscale-421.mjs` : neuf tests comparant les fonctions fiscales à des cas de barème tirés du BOFiP (IR 2026 sur revenus 2025, calcul **brut**), du BOFiP (IFI), et de Service-Public (succession en ligne directe). Les neuf cas concordent à moins de 0,01 €.
- `scripts/sensibilite-economique-421.mjs` : quatre scénarios de ±10 Md€, quatre horizons 1/3/5/10 ans, trois coefficients et deux variations unilatérales de ±20 %, soit **16 résultats centraux + 96 variantes** ; classement des coefficients selon l'effet sur le déficit, et bornes sur dette et déficit.
- `scripts/preparer-validation-421.mjs` : génération reproductible de la page depuis les fichiers JSON testés (pas de chiffres publiés retapés).
- `scripts/test-validation-421.mjs` et `scripts/test-economie-inchangee-421.mjs` : vérifications de la publication, des cas fiscaux et **60 comparaisons** avec les trajectoires du benchmark archivé en 4.19.
- Quatre fichiers publiés dans `dist/validation/` : `fiscal-externe-421.json/.csv` et `sensibilite-421.json/.csv`.
- Liens ajoutés depuis l'accueil et l'audit ; sitemap actualisé ; identité de publication mise à jour.
- Source de la grille d'IR modifiée vers le BOFiP du 7 avril 2026 (le texte précédent était une FAQ présentant encore les anciens seuils, alors que les paramètres d'EcoSim étaient déjà corrects).

## Résultats à ne pas surinterpréter

### Fiscalité

Les neuf cas confirment la bonne implémentation de **ces calculs isolés** : IR brut de situations simples sans décote ni plafonnement du quotient familial, IFI simple avec décote, succession directe sans donations antérieures. **Ils ne valident pas** les impôts nets, les microdonnées synthétiques, les rendements nationaux ou les distributions de gagnants/perdants. Aucune exécution autonome d'OpenFisca-France n'a été réalisée.

Références :
- https://bofip.impots.gouv.fr/bofip/2491-PGP.html/identifiant=BOI-IR-LIQ-20-10-20260407
- https://bofip.impots.gouv.fr/bofip/11319-PGP.html/identifiant=BOI-PAT-IFI-40-10-20180608
- https://www.service-public.gouv.fr/particuliers/vosdroits/F14198

### Économie

Les variations portent sur **trois coefficients** : chômage en fonction de l'écart de production, recettes en fonction du PIB nominal, dépenses cycliques en fonction du chômage. Aucun ne rétroagit directement sur l'écart de PIB dans le modèle actuel : c'est donc le **déficit et la dette** qu'il faut utiliser pour caractériser leur sensibilité, pas le PIB. Les plages ±20 % sont conventionnelles et les coefficients changent **un par un**. Ce ne sont ni des intervalles de confiance ni des bornes sur les effets économiques réels.

À 3 ans sur le profil central, les écarts de déficit (Md€ par rapport à la référence) sont :

| Scénario | Central | Min stress | Max stress |
|---|---:|---:|---:|
| Enseignement primaire +10 Md€/an | +5,04 | +3,90 | +6,17 |
| Pensions −10 Md€/an | −8,36 | −8,87 | −7,84 |
| TVA +10 Md€/an | −7,02 | −7,77 | −6,27 |
| IR +10 Md€/an | −7,78 | −8,40 | −7,16 |

Cette plage reflète les hypothèses testées à coefficients modifiés isolément ; elle n'indique rien sur la fréquence statistique des résultats.

## Tests exécutés

```bash
node scripts/test-regressions.mjs
node scripts/test-mathematical.mjs
node scripts/test-fiscal-419.mjs
node scripts/test-economique-419.mjs
node scripts/test-transparence-420.mjs
node scripts/validation-fiscale-421.mjs
node scripts/sensibilite-economique-421.mjs
node scripts/preparer-validation-421.mjs
node scripts/test-validation-421.mjs
node scripts/test-economie-inchangee-421.mjs
node scripts/stamp-build.mjs
```

Les suites antérieures passent : 466 projections sur 30 ans, 84 128 contrôles numériques, tests d'import et fiscaux, registre de 357 réglages, et benchmark Mésange inchangé.

Le projet conserve `validation/benchmark-419.*` comme **référence historique archivée** et `validation/provenance-politique-420.*` comme registre publié de la 4.20, car leurs données et les hypothèses politiques sous-jacentes n'ont pas changé. Pour les comparaisons 4.21, utiliser les nouveaux fichiers `validation/*-421.*`.

## Limites des contrôles

Les tests ne démontrent aucune validité causale du moteur, ne constituent pas une contre-expertise scientifique et ne mesurent pas les performances ou l'accessibilité en navigateur mobile réel. Le rendu dans un navigateur interactif doit être vérifié après publication.

## Déploiement

Décompresser **l'archive site** dans le dossier publié par GitHub Pages, en conservant les sous-dossiers. Les fichiers de `dist/` sont directement à la racine du ZIP site. L'archive complète contient `dist/`, `scripts/` et ce README.
