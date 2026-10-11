# EcoSim France 5.7.0 — Fiscalité individuelle et protocole OpenFisca

## Périmètre livré (11 octobre 2026)

La version 5.7 conserve sans modification les équations de dette, PIB et les mécanismes fiscaux **agrégés** de la 5.6.1. Elle ajoute un atelier indépendant d'impôt sur le revenu des personnes physiques pour le **barème 2026 des revenus nets imposables 2025** :

- barème progressif 0 / 11 / 30 / 41 / 45 % (11 600 / 29 579 / 84 577 / 181 917 €), vérifié au BOFiP ;
- quotient familial général pour une personne seule ou un couple soumis à imposition commune, de zéro à trois enfants à charge exclusive ;
- plafond ordinaire 2026 d'avantage fiscal de 1 807 € par demi-part supplémentaire ;
- décote : limite 1 982 € ou 3 277 € selon la déclaration, forfait 897 € ou 1 483 €, retrait de 45,25 % de l'impôt brut ;
- 56 cas synthétiques déterministes (2 compositions × 4 nombres d'enfants × 7 revenus), exports CSV / JSON ;
- exemples externes DGFiP : célibataire 19 300 € de salaires déclarés et couple 38 000 € (décote), célibataire revenu imposable 30 000 € (barème brut).

### Périmètre exclu

En particulier : revenus catégoriels, abattement de salaire (le revenu **net imposable** est déjà fourni), demi-parts spéciales, parent isolé, enfants en garde partagée, personnes invalides, plus de trois enfants, réductions et crédits d'impôt, seuil de mise en recouvrement, arrondis légaux du dossier fiscal, prélèvement à la source, salaires et pensions réels, non-résidents. Les résultats de cette page ne sont **pas le montant d'un avis d'impôt**. Ils ne sont pas propagés au moteur budgétaire national.

### OpenFisca — degré de validation exact

- L'API officielle OpenFisca-France et les concepts `simulation`, période fiscale et entités ont été documentés ;
- `openfisca-france` ne peut pas être installé dans cet environnement réseau fermé, et aucun calcul externe OpenFisca n'a été exécuté ;
- `scripts/comparer-openfisca-570.mjs` est un **comparateur hors ligne d'exports externes** qui exige un nom de source, une version, l'année 2025, le même revenu net imposable et la même composition familiale avant de calculer des écarts ;
- seul le comportement du comparateur a été testé, avec une entrée **synthétique déclarée comme telle**. **Aucune concordance numérique avec OpenFisca n'est revendiquée.**

#### Format facultatif d'une comparaison externe

Créer (dans un environnement OpenFisca installé ailleurs) un JSON avec :

```json
{
  "source":"openfisca-france",
  "packageVersion":"VERSION_RÉELLE_DU_PAQUET",
  "period":"2025",
  "cases":[
    {
      "id":"single-0-30000",
      "householdType":"single",
      "children":0,
      "netTaxableIncome":30000,
      "grossAfterFamilyCap":2103.99,
      "afterDecote":2103.99
    }
  ]
}
```

*Les chiffres ci-dessus illustrent la structure du fichier et proviennent du calcul EcoSim, **pas d'une sortie OpenFisca réelle**.* Enregistrer, par exemple, sous `sortie-openfisca.json`, puis exécuter :

```bash
node scripts/comparer-openfisca-570.mjs sortie-openfisca.json comparaison-openfisca.json
```

La comparaison ne devient probante que si les variables fiscales réellement exposées par la version installée d'OpenFisca correspondent à ces **mêmes notions** et que la provenance de chaque sortie est archivée. Cette conversion sémantique n'est pas automatiquement démontrée par le schéma d'import.

### Sources primaires

- Barème 2026 : https://bofip.impots.gouv.fr/bofip/2491-PGP.html/identifiant=BOI-IR-LIQ-20-10-20260407
- Plafond QF ordinaire : https://bofip.impots.gouv.fr/bofip/2494-PGP.html/identifiant=BOI-IR-LIQ-20-20-20-20260407
- Décote : https://www.economie.gouv.fr/particuliers/impots-et-fiscalite/gerer-mon-impot-sur-le-revenu/pouvez-vous-beneficier-de-la-decote-de-limpot-sur-le-revenu
- Exemples de déclaration 2026 : https://www.impots.gouv.fr/sites/default/files/media/1_metier/5_international/actualite/dossier-de-presse-dinr-revenus-2025_03_2026.pdf
- OpenFisca-France : https://github.com/openfisca/openfisca-france

## Fichiers

- `dist/fiscal-individuel-570.html` : calcul interactif, consultable sans serveurs tiers.
- `dist/fiscal-individuel-570.js` : moteur indépendant du cœur macro.
- `dist/validation/fiscal-individuel-570.json` et `.csv` : 56 cas reproductibles.
- `scripts/gen-fiscal-570.mjs` : génération déterministe.
- `scripts/test-fiscal-individuel-570.mjs` : références officielles, monotonie, invariants et validations.
- `scripts/comparer-openfisca-570.mjs` et son test : confrontation facultative hors ligne avec sorties externes effectivement obtenues.
- `scripts/test-browser-fiscal-570.py` : exercice navigateur de la page, ordinateur et mobile.
- `scripts/run-tests-570.sh` : campagne de non-régression et vérification du manifeste.

## Non-régression

Les 6 golden files de la version 5.3.1, soit 1 980 valeurs annuelles, et les neuf modules centraux historiques servent toujours de témoins. Les résultats économiques historiques ne sont pas recalibrés. Le moteur de la 5.6.1 conserve ses corrections statistiques. La 5.7 n'est **pas** une micro-simulation fiscale représentative de la France : la distribution des ménages, les rendements agrégés et la redistribution nationale ne sont pas estimés ici.
