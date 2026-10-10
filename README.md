# EcoSim France

EcoSim France est un simulateur interactif, pluraliste et transparent des finances publiques françaises. Il couvre l’ensemble des administrations publiques : État, organismes divers d’administration centrale, collectivités territoriales et administrations de sécurité sociale.

## Lancer localement

Le projet est volontairement sans étape de compilation ni dépendance JavaScript.

```bash
python3 -m http.server 4173 --directory dist
```

Puis ouvrir `http://localhost:4173`.

## Données

- Total des dépenses, recettes et détail par nature : comptes des administrations publiques 2025, Insee, base 2020.
- PIB et croissance 2025 : comptes de la Nation, Insee.
- Dette fin 2025 : dette de Maastricht, Insee.
- Détail fonctionnel des dépenses : COFOG Eurostat 2024, recalé proportionnellement sur le total Insee 2025.
- Ancrage 2026–2028 : projections macroéconomiques de la Banque de France de septembre 2026.
- Trajectoire européenne : procédure concernant les déficits excessifs et recommandation du Conseil.
- Population, natalité et vieillissement : bilan démographique 2025 de l’Insee.
- Emploi public : Siasp 2024 Insee-DGAFP, ventilé entre État, territoriale, hospitalière, titulaires, contractuels et autres statuts.
- Marché du travail : enquête Emploi 2025 de l’Insee, chômage BIT, halo, sous-emploi, statuts d’emploi et statistiques Dares-France Travail.
- Emploi des immigrés : enquête Emploi 2025 de l’Insee ; motifs de séjour 2025 du ministère de l’Intérieur.
- Énergie : bilan énergétique 2024 du SDES et bilan électrique 2025 de RTE.

Toutes les sources cliquables, leurs dates et le statut des valeurs sont visibles dans l’application.

## Moteur

Le moteur est semi-structurel et déterministe. Il combine :

- multiplicateurs différenciés par instrument ;
- montée en charge et persistance ;
- effets d’offre retardés ;
- rétroaction du PIB sur les recettes ;
- réponse du chômage à l’écart d’activité ;
- allocation des créations d’emploi entre chômage, formation, halo, sous-emploi, migrations et mobilités emploi-emploi ;
- stabilisateurs automatiques ;
- stock de dette, charge d’intérêts et prime de risque ;
- scénarios institutionnels européens.

Cinq paramétrages économiques sont proposés : consensus empirique, lecture keynésienne, politique de l’offre, lecture libérale et réindustrialisation ciblée. Ils utilisent la même comptabilité et ne diffèrent que par des paramètres affichés et documentés.

La version 4.0 comprend :

- douze moteurs reliés : travail, retraites, santé, éducation, logement, industrie, climat, défense, administration, solidarités, innovation et finance ;
- trente-six leviers opérationnels avec coût direct, demande, offre, emploi, inflation, commerce extérieur, émissions et pauvreté ;
- des interactions institutionnelles, notamment pour la politique commerciale européenne et les garanties publiques ;
- une lecture automatique des mécanismes dominants et des risques de double comptage ;
- des exports enrichis avec les résultats des moteurs publics.
- un banc d’essai des onze groupes politiques de la XVIIe législature et d’un gouvernement technique conventionnel ;
- sept scénarios de familles politiques construits à partir des engagements récurrents de 2007 à 2026 ;
- une traduction intégralement visible des programmes vers les postes budgétaires, la démographie, l’énergie et les moteurs publics ;
- une comparaison à 1, 3, 5, 10, 20 et 30 ans avec sources et confiance de traduction séparée des hypothèses économiques ;
- une extrapolation 2036–2055 explicitement structurelle, fondée sur les projections démographiques Insee/COR et assortie d’une incertitude accélérée.

La version 4.2 simplifie l’utilisation avec un parcours en quatre étapes, une lecture automatique en langage courant, des réglages mobiles repliables, un budget compact par défaut et un filtre des seuls postes modifiés.

La version 4.3 ajoute un moteur d’emploi par cohortes : recrutements des trois fonctions publiques, titulaires et contractuels, coût employeur annuel, engagement actualisé à quarante ans, formation, accompagnement et viviers de main-d’œuvre. Les populations BIT, France Travail, halo et sous-emploi restent séparées pour éviter les doubles comptes.

## Structure

```text
dist/
  index.html   interface et documentation intégrée
  styles.css   design adaptatif et thème sombre
  data.js      données, sources, paramètres et préréglages
  app.js       moteur de projection et interactions
.openai/
  hosting.json configuration de déploiement Sites
tests/
  model-smoke.mjs tests des trajectoires, cohortes et scénarios politiques
```

## Limites

Ce simulateur produit des scénarios de sensibilité, pas des prévisions. Les fourchettes ne sont pas des intervalles de confiance statistiques. Les réactions de la BCE, des marchés, des partenaires commerciaux, des ménages et des entreprises ne peuvent pas être anticipées avec précision. À 20 ou 30 ans, la plage de sensibilité est plus informative que le point central.

