# EcoSim France 4.24.0 — Fiscalité sectorielle et soutien industriel

## Livrables

- `EcoSim_4.24_site_GitHubPages.zip` : décompresser **à la racine** du dépôt GitHub Pages.
- `EcoSim_4.24_code_et_tests.zip` : même site sous `dist/`, plus scripts et dossier d'exemples.
- La section « Cibler une filière, pas toute l'économie » est sur l'accueil, accessible par « Secteurs ».
- `fiscalite-sectorielle-424.html` : description autonome sans JavaScript.

## Périmètre

16 regroupements pédagogiques : renouvelables, nucléaire, fossiles, réseaux/stockage, automobile/batteries, rail/transports collectifs, aérien/maritime/logistique, bâtiment/rénovation, acier/ciment, chimie, manufacturier général, agriculture/élevage, agroalimentaire, numérique, santé/biotech, réparation/recyclage.

3 instruments : crédit d'impôt ciblé (**recettes -**), prélèvement sectoriel (**recettes +**), subvention ciblée (**dépenses +**). Les montants sont directement saisis en Md€ par an : l'outil **ne connaît pas** les bases imposables propres aux industries.

Option économique : « Comptable uniquement » (par défaut) ou « Effet PIB exploratoire » avec coefficients explicites (0,10–0,22 avant coefficients de profil), délais fictifs selon les filières, sans création automatique d'emplois/GW/émissions.

## Garde-fous

- Jusqu'à 8 mesures, 10 Md€/an par mesure, 30 Md€/an cumulés, départ 2026–2035, durée 1–15 ans.
- Chaque flux sectoriel est ajouté UNE SEULE FOIS dans la comptabilité du moteur. Un avertissement apparaît si la même politique pourrait être saisie via un autre levier : **la détection exhaustive des doubles comptes n'est pas possible**.
- Import/export JSON, liens partagés, sauvegardes, Undo et comparaison avec les scénarios sauvegardés préservent `scenario.sectoral`. Les imports des versions antérieures gardent une liste vide par défaut.
- Les comparaisons politiques préexistantes n'acquièrent pas automatiquement de politiques sectorielles.
- Trois exemples JSON neutres téléchargeables depuis la page pédagogique.
- Les 60 trajectoires de référence de l'ancien benchmark sont inchangées en l'absence de mesures sectorielles.

## Commandes de vérification

```bash
node scripts/test-sectoral-424.mjs
node scripts/test-regressions.mjs
node scripts/test-mathematical.mjs
node scripts/test-fiscal-419.mjs
node scripts/test-multiplicateurs-422.mjs
node scripts/test-economie-inchangee-421.mjs
node scripts/test-transparence-420.mjs
node scripts/test-presentation-4211.mjs
```

Le rendu Chromium n'a pas pu être validé dans cet environnement (navigation locale bloquée administrativement). Après publication, vérifier la page sur ordinateur et téléphone, l'ajout/retrait, l'export puis le réimport.

## Sources contextuelles

- Eurostat, NACE Rev. 2.1 (utilisée pour les statistiques à partir de 2025) : https://ec.europa.eu/eurostat/web/nace
- Commission européenne, Clean Industrial Deal State Aid Framework (CISAF) : https://competition-policy.ec.europa.eu/about/contribution-clean-just-and-competitive-transition/clean-industrial-deal-state-aid-framework-cisaf_en

**La classification sectorielle et les coefficients EcoSim 4.24 sont exploratoires, pas une microsimulation fiscale nationale ni une évaluation juridique des aides d'État.**
