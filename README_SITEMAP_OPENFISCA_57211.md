# EcoSim — Livraison 5.7.2.11 : sitemap et OpenFisca

Date : 11 octobre 2026. Résultats publics 5.7.1 et atelier UX 5.8.5 conservés.

## Six dates `lastmod` complétées, preuves utilisées

- `confidentialite.html` → **2026-10-10** : son propre contenu éditorial porte « Mise à jour : 10 octobre 2026 ». Cette date est déclarée par la page ; l'archive fournie ne permet pas de vérifier le commit exact d'origine.
- `comprendre-budget-france.html`, `reforme-retraites.html`, `programmes-economiques-2027.html`, `reduire-deficit-public.html`, `dette-publique-france.html` → **2026-10-11** : une comparaison entre le paquet source 5.7.1 et le paquet actuel confirme l'ajout de données structurées `application/ld+json`, réalisé lors de la livraison 5.7.2.2 du 11 octobre. Google considère les changements de données structurées comme significatifs pour `lastmod` (voir Google Search Central).

Ces dates ne sont **pas** déduites des dates de création du ZIP ni appliquées aveuglément à toutes les pages. `lastmod` reste facultatif ; leur ajout ici est justifié par ces indices. Les tests de livraison vérifient dorénavant **28 URL et 28 dates**, avec date spécifique pour la confidentialité.

## Après publication

1. Reporter `dist/` dans la racine réellement publiée par GitHub Pages et mettre à jour le workflow sous `.github/workflows/`. Utiliser un commit de livraison intitulé **`5.7.2.11`**.
2. Ouvrir Google Search Console → propriété du site → « Sitemaps » → soumettre de nouveau `sitemap.xml` si une nouvelle soumission est souhaitée. **Non fait dans cette archive** : accès propriétaire requis. Une resoumission est facultative lorsque le sitemap est déjà découvert ; Google peut le relire automatiquement.
3. GitHub → dépôt → **Actions** → **EcoSim - confrontation OpenFisca 5.7.2 (revue requise)** → **Run workflow** → branche `main` → **Run workflow**.
4. Télécharger l'artifact `ecosim-confrontation-openfisca-572`, inspecter les sorties, les versions et le rapport. En cas d'échec, vérifier les logs et conserver l'échec documenté. **Une exécution réussie ne prouve pas l'absence d'écarts.**
5. Examiner la comparaison des 56 foyers, les hypothèses et la version exacte d'OpenFisca, puis seulement après validation mettre à jour le statut `openFiscaIndependentExecution` et la page de vérification. **Ne pas annoncer une validation externe sans exécution réelle.**

### Statut exact de cette livraison

- `lastmod` : **fichiers modifiés et tests prêts**, non publiés à ce stade.
- Search Console : **non exécuté**, pas d'accès propriétaire.
- OpenFisca réel : **non déclenché**, accès au workflow distant non connecté ; le paquet n'inclut aucun benchmark inventé.
