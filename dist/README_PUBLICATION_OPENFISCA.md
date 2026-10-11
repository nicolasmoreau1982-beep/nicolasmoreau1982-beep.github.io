# EcoSim France — publication de la première confrontation OpenFisca

**Patch ciblé de contenu, pour la base de code de l'utilisateur (5.8.4.1 annoncée)** — 11 octobre 2026.

Ce ZIP **n'est pas** un remplacement du site complet ni une nouvelle version du moteur. Il évite d'écraser les modifications de la 5.8.4.1 en travaillant *sur ton checkout exact*.

## Intégration

1. Télécharge ou clone **ton dépôt GitHub à jour**, branche `main`, sur ton ordinateur.
2. Décompresse **ce ZIP** dans un dossier séparé.
3. Depuis Linux Mint, lance :

   ```bash
   python3 /chemin/vers/EcoSim_OpenFisca_publication_patch/appliquer-openfisca.py /chemin/vers/ton/depot
   ```

   Le script repère le dossier `dist/` si celui-ci contient les pages du site. Il **vérifie d'abord l'empreinte SHA-256 des 56 cas**. Si les données diffèrent, il refuse la publication (pas de faux benchmark).
4. Vérifie les modifications (`git diff --stat` puis `git diff`), et teste :

   ```bash
   cd /chemin/vers/ton/depot
   ( cd dist && node scripts/test-publication-openfisca-572.mjs && node scripts/check-release-572.mjs && sha256sum -c manifest-integrite-572.sha256 )
   node scripts/test-golden-540.mjs
   node scripts/test-fiscal-individuel-570.mjs
   ```

   Adapter `dist` si le site est déjà à la racine. Le script tente lui-même les étapes d'estampillage et de manifeste lorsqu'elles existent à la racine du dépôt.
5. Committe et publie ces changements, **sans remplacer les autres fichiers** de ta branche et sans déclarer de nouvelle version du moteur. Le statut de diffusion garde l'étiquette existante : le nouvel identifiant SHA de paquet atteste de cette publication documentaire. Si tu utilises une nouvelle étiquette de livraison, applique la convention de version de ton dépôt avant le commit.
6. Vérifie les URLs publiques listées ci-dessous, **après** la réussite de GitHub Pages. Ne lance Google Search Console qu'après cette publication.

### Pages et fichiers visibles

- `https://nicolasmoreau1982-beep.github.io/verification-openfisca-571.html` — rapport lisible, résultats et avertissements.
- `https://nicolasmoreau1982-beep.github.io/fiscal-individuel-570.html` — atelier fiscal, annonce du benchmark.
- `https://nicolasmoreau1982-beep.github.io/validation/openfisca-2026-10-11/rapport-confrontation-openfisca-572.json` — données détaillées.
- `https://nicolasmoreau1982-beep.github.io/validation/openfisca-2026-10-11/rapport-analyse-2026-10-11.md` — analyse et limites.
- `https://nicolasmoreau1982-beep.github.io/validation/openfisca-2026-10-11/comparaison-56-foyers.csv` — 56 comparaisons.

## Résultats et limites

Artifact reçu : `ecosim-confrontation-openfisca-572.zip` (SHA-256 `0bf3ebd842963cb40969f421522d38f23075caa6a6f8f1e6d2a6acdb770ffd31`).

| Mesure | Résultat |
|---|---:|
| Cas fictifs présents | 56/56 |
| OpenFisca-France | 176.1.2 |
| Écart maximum sur IR brut après QF | 0,0009375 € |
| Écart maximum après décote | 0,475 € |
| Écart moyen après décote | 0,056453 € |
| Cas avec écart supérieur à 1 € | 0 |

**Réserve principale :** les variables intermédiaires sont forcées, pas reconstruites indépendamment. Ce n'est ni une vérification de déclaration complète, ni une extrapolation nationale. La différence d'arrondi de décote explique les principaux écarts, mais les règles fiscales applicables restent à confronter. Conserver l'URL exacte et les logs du run GitHub si possible : ils ne sont pas dans l'artifact reçu.

## Google Search Console — après déploiement

1. Ouvre <https://search.google.com/search-console> et sélectionne la propriété `https://nicolasmoreau1982-beep.github.io/`.
2. Dans **Indexation → Sitemaps**, vérifie que `https://nicolasmoreau1982-beep.github.io/sitemap.xml` est accessible. Si besoin, soumets `sitemap.xml`. Pas besoin de recharger un fichier à Google.
3. Dans **Inspection de l'URL**, colle successivement :
   - `https://nicolasmoreau1982-beep.github.io/verification-openfisca-571.html`
   - `https://nicolasmoreau1982-beep.github.io/fiscal-individuel-570.html`

   Pour chaque page : **Tester l'URL en direct**, puis **Demander une indexation** si la page est accessible.
4. Suis **Indexation → Pages** et **Performances → Résultats de recherche**. Le statut « sitemap traité » ne garantit ni classement ni indexation immédiate.

Ne soumets pas séparément les fichiers CSV ou JSON : les deux pages HTML suffisent pour rendre le rapport découvrable.

### Ce qui n'est PAS fait automatiquement

- Pas de commit GitHub, pas de déploiement et pas d'envoi à Search Console.
- Pas d'accès au journal exact du workflow (lien du run à fournir pour compléter la provenance).
- Pas de changement des calculs, barèmes ou sorties macroéconomiques.
