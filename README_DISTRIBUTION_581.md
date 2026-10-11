# EcoSim France — 5.8.1 : diagnostics de distributions importées

Préparé le 11 octobre 2026. Livraison technique **5.7.2.6** ; module exploratoire **5.8.1**. Le simulateur macroéconomique public reste **5.7.1** et le protocole OpenFisca **5.7.2**. Cette évolution ne change pas les valeurs du moteur historique ni les programmes politiques.

## Fonctionnement

Sur `distribution-ciblee-580.html`, les deux sous-ateliers SMIC et pensions peuvent recevoir un CSV local, en complément des profils fictifs. L'utilisateur décrit la **source**, son **année** et son **champ**. Ces trois informations sont **déclaratives** et ne certifient aucune représentativité ; le module ne dispose d'aucune clé de provenance officielle, ne calibre pas automatiquement les poids et ne télécharge aucune microdonnée. Les exemples fournis sont purement fictifs.

Les données sont chargées uniquement en mémoire dans l'onglet de navigation. Aucun appel réseau n'est effectué par l'import. **Ne pas importer de données personnelles, de fichiers sous restriction d'accès, ni de microdonnées confidentielles** dans une application web publique. Le contrôle de confidentialité des exports est élémentaire, et ne remplace pas une expertise de divulgation statistique.

### Salaires : `id;hourlyGross;hoursPerYear;weight;eligible`

- `id` : identifiant artificiel, sans nom, sans NIR, sans informations directement identifiantes.
- `hourlyGross` : **taux brut horaire retenu dans l'assiette de comparaison au SMIC**, en euros nominaux. Il peut différer de la rémunération brute totale : la Dares indique que certaines primes et majorations en sont exclues. Ne pas remplacer mécaniquement le taux par salaire annuel / toutes les heures.
- `hoursPerYear` : volume annuel des heures rémunérées couvertes par le scénario.
- `weight` : poids positif associé à la personne. Le nombre de lignes n'est pas un effectif France.
- `eligible` : `1` pour un SMIC ordinaire, `0` si dérogation ; le modèle ne reconstitue **pas** les différents barèmes dérogatoires.

Exemple fourni : `dist/examples/distribution-salaires-581-exemple.csv`.

### Pensions : `id;pensions;netTaxableIncome;referenceTaxIncome;householdType;children;weight`

- `pensions` : montants imposables déclarables de chaque titulaire séparés par `|`, ex. `18000|12000`.
- `netTaxableIncome` : revenu net imposable de référence du **foyer fiscal**, déjà **après** l'abattement pension initial.
- `referenceTaxIncome` : RFR déclaré du foyer ; il reste exogène lorsque la réforme modifie l'abattement.
- `householdType` : `single` ou `couple` ; `children` est un entier entre 0 et 20.
- `weight` : poids du **foyer fiscal** (à ne pas confondre avec les ménages Insee).

Exemple fourni : `dist/examples/distribution-foyers-581-exemple.csv`. Les champs ne garantissent pas, à eux seuls, la cohérence réelle d'une déclaration fiscale. Les crédits, revenus particuliers, recouvrements et prestations sont hors périmètre.

## Diagnostics 5.8.1

Le module refuse les colonnes absentes ou supplémentaires, les identifiants dupliqués, les montants ou poids invalides, plus de 10 000 enregistrements et les fichiers de plus de 1,5 Mo. Les CSV français à `;` et les CSV anglais à `,` sont pris en charge ; les nombres décimaux acceptent le point ou la virgule lorsque le champ est correctement encadré.

- Effectifs de lignes, somme des poids, concentration du poids maximal.
- **Taille effective de Kish** : \((\sum_i w_i)^2/\sum_i w_i^2\), indicateur de dispersion des poids et non pas intervalle de confiance.
- SMIC : ventilation par multiples du SMIC initial et calcul direct / diffusion hypothétique.
- Pensions : ventilation par RFR **avant réforme** et variation d'impôt dans chaque tranche.
- Totaux affichés : uniquement la population **importée**, avec les poids fournis. **Pas de calcul national**, pas de recettes APU, pas de montant pour l'ensemble de la France.

Les exports JSON des CSV importés ne contiennent pas de lignes individuelles ou d'identifiants. Pour limiter une fuite par déduction, les cellules correspondant à **moins de cinq observations** sont masquées et les totaux monétaires généraux ne sont pas exportés. Cette suppression simple ne garantit pas l'anonymat : ne pas diffuser un export d'origine confidentielle sans audit de divulgation.

## Pourquoi aucune estimation nationale ?

Même un fichier pondéré et une source institutionnelle ne garantissent pas la représentativité d'une réforme donnée. Pour aller plus loin il faut (1) un champ de couverture vérifié et compatible, (2) des années cohérentes et un calcul de l'assiette exacte, (3) des poids calibrés et leurs cibles documentées, (4) un lien entre bénéficiaires, fiscalité et cotisations, (5) une estimation des intervalles d'incertitude, (6) une validation externe exécutée (OpenFisca et données officielles). Les données individuelles ERFS accessibles sous contrôle d'accès via CASD ne sont **pas fournies** dans cette archive.

La Dares indiquait 12,4 % de bénéficiaires directs de la revalorisation du **1er novembre 2024** dans son champ privé non agricole, un taux qui **ne s'applique pas automatiquement** aux hausses de 2026 ni à l'ensemble des salariés.

Sources :
- Dares, bénéficiaires directs au 1er novembre 2024 : https://dares.travail-emploi.gouv.fr/publication/la-revalorisation-du-smic-au-1er-novembre-2024
- Dares, assiette légale de comparaison : https://dares.travail-emploi.gouv.fr/publication/combien-de-salaries-sont-remuneres-au-smic
- CASD, accès contrôlé à ERFS : https://www.casd.eu/source/enquete-revenus-fiscaux-et-sociaux/

## Vérifier avant publication

```bash
node scripts/test-distribution-581.mjs
python scripts/test-browser-distribution-580.py
python scripts/test-browser-distribution-581.py
bash scripts/run-tests-510.sh
node scripts/test-source-inchangee-540.mjs
node scripts/test-golden-540.mjs
(cd dist && sha256sum -c manifest-integrite-572.sha256)
node scripts/test-release-572.mjs
```

Le test navigateur est exécuté avec Chromium et une page locale `set_content`, en injectant les modules : il couvre les interactions dans le navigateur mais ne certifie pas le déploiement réseau GitHub Pages. Ne pas modifier les historiques ou rafraîchir les données officielles artificiellement.

Pour le déploiement, conserver le workflow GitHub Pages existant et faire un diff. Après tout changement de fichiers `dist/` : `node scripts/stamp-build.mjs`, `node scripts/make-manifest-572.mjs`, puis tests et commit avec **`5.7.2.6`** ou **`Release v5.7.2.6`**. Ne pas confondre étiquette de livraison technique et version publique du moteur.
