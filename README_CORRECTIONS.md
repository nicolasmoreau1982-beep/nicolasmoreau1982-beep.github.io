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
